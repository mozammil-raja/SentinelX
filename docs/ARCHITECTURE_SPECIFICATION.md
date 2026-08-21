# SentinelX — Architecture & Technical Design Specification

## 1. System Overview & Engineering Principles

SentinelX is a synchronous, high-throughput Financial Fraud & Risk Decisioning Platform engineered in **Java 21 LTS (Spring Boot 3.4.x)** and backed by **PostgreSQL 16** and an **in-memory Redis 7 acceleration layer**.

The system evaluates inbound payment transactions in real time ($< 15\text{ms}$ rule engine execution, $< 50\text{ms}$ end-to-end SLA) to emit deterministic operational verdicts:
* **`ALLOW`** ($\text{Score} < 30$): Approved synchronously.
* **`REVIEW`** ($30 \le \text{Score} < 70$): Held for human-in-the-loop analyst review with GenAI reasoning synthesis.
* **`BLOCK`** ($\text{Score} \ge 70$): High-confidence fraud rejected immediately.

---

## 2. High-Level Architecture (HLD)

```mermaid
graph TD
    Client[Client Gateway / Next.js Dashboard] -->|POST /api/v1/transactions| Gateway[Transaction Ingestion Controller]
    
    subgraph "Core Decisioning Pipeline (< 15ms)"
        Gateway --> Idempotency[Idempotency Engine: Redis Key-Value 24h TTL]
        Idempotency --> Mutex[Distributed Concurrency Lock: Redis SET NX PX 5000]
        Mutex --> Context[Context Builder: Transaction History Pre-fetch]
        Context --> Engine[Rule Engine: Polymorphic Strategy Router]
        
        Engine --> R1[RULE_01: Redis ZSET Sliding Window Velocity]
        Engine --> R2[RULE_02: Client Device Fingerprint Trust Verification]
        Engine --> R3[RULE_03: High-Value Spend Deviation]
        Engine --> R4[RULE_04: Geolocation / IP Subnet Hop]
        Engine --> R5[RULE_05: Blacklisted Merchant Watchlist]
        Engine --> R6[RULE_06: Baseline Customer Risk Tiering]
        Engine --> R7[RULE_07: 2-Hop Bipartite Graph Syndicate Traversal]
        
        R1 & R2 & R3 & R4 & R5 & R6 & R7 --> Aggregator[Penalty Aggregator & Score Normalizer]
        Aggregator --> DecisionLogic{Verdict Classifier}
        
        DecisionLogic -->|Score < 30| AllowVerdict[ALLOW: Clean Execution]
        DecisionLogic -->|30 <= Score < 70| ReviewVerdict[REVIEW: Queue Routing + AI Copilot]
        DecisionLogic -->|Score >= 70| BlockVerdict[BLOCK: Fraud Interception]
        
        ReviewVerdict --> AICopilot[AiRiskCopilotService: GenAI Synthesis]
        AICopilot --> ReviewQueueDB[(PostgreSQL: review_queue)]
        
        AllowVerdict & ReviewVerdict & BlockVerdict --> DecisionDB[(PostgreSQL: decisions)]
        AllowVerdict & ReviewVerdict & BlockVerdict --> VelocityUpdate[VelocityService: Atomic Lua Sliding Window Update]
        VelocityUpdate --> RedisVelocity[(Redis 7 ZSET)]
    end
    
    subgraph "Asynchronous Event & Telemetry Stream"
        AllowVerdict & ReviewVerdict & BlockVerdict --> SSEStream[DecisionStreamService: Real-Time SSE Feed]
        SSEStream --> NextDashboard[Next.js Real-Time Monitor]
        
        Aggregator -.->|Async Non-Blocking Worker| GeminiShadow[Gemini AI Shadow Scoring Router]
        GeminiShadow -.-> SSEStream
    end
```

---

## 3. Low-Level Design (LLD) & Core Subsystems

### 3.1 Polymorphic Strategy Rule Engine
The rule engine utilizes the **GoF Strategy Pattern** to decouple individual detection heuristics from the evaluation pipeline.

* **Strategy Interface**: `com.sentinelx.backend.rule.RiskRule`
  ```java
  public interface RiskRule {
      String getRuleId();
      RuleResult evaluate(TransactionRequest request, User user, Device device, Rule ruleConfig, EvaluationContext context);
  }
  ```
* **Thread-Safe Rule Cache**: Rules are pre-cached in a `ConcurrentHashMap<String, Rule>` to ensure $O(1)$ memory lookups during execution without hitting relational storage for every transaction.
* **Dynamic Hot-Reloading**: Rule weights and active states can be modified at runtime via `PUT /api/v1/rules/{id}` without requiring application restarts.

---

### 3.2 Redis Sliding Window Log Velocity Engine
To prevent velocity botnets and card testing attacks, SentinelX uses an in-memory **Sliding Window Log algorithm** implemented on Redis Sorted Sets (`ZSET`).

* **Data Structure**: Redis key `sentinelx:velocity:user:{userId}` where member is `transactionId` and score is epoch millisecond timestamp.
* **Atomic Lua Script**:
  ```lua
  local key = KEYS[1]
  local now = tonumber(ARGV[1])
  local windowSeconds = tonumber(ARGV[2])
  local txnId = ARGV[3]
  local clearBefore = now - (windowSeconds * 1000)

  -- 1. Evict expired entries outside active window
  redis.call('ZREMRANGEBYSCORE', key, '-inf', clearBefore)
  -- 2. Insert current transaction timestamp
  redis.call('ZADD', key, now, txnId)
  -- 3. Set rolling expiration TTL
  redis.call('EXPIRE', key, windowSeconds * 2)
  -- 4. Return total active events in window
  return redis.call('ZCARD', key)
  ```
* **Complexity**: $O(\log N + M)$ where $M$ is the count of expired entries evicted.
* **Fail-Safe Fallback**: If Redis is unreachable, the engine gracefully degrades to query PostgreSQL transaction history over a bounded SQL window.

---

### 3.3 Graph Syndicate & Fraud Ring Engine
Detects multi-account collusion networks by modeling entities as nodes in a bipartite graph.

* **Graph Representation**:
  * **Nodes**: `USER`, `DEVICE`, `IP`, `CARD`
  * **Edges**: `USED_DEVICE`, `SHARED_IP`, `USED_CARD`
* **Algorithm**: 2-hop **Breadth-First Search (BFS)** traversal:
  $$\text{User A} \xrightarrow{\text{USED\_DEVICE}} \text{Device Fingerprint} \xrightarrow{\text{USED\_DEVICE}} \text{User B (BLOCKED)}$$
* **Complexity**: $O(V + E)$ bounded to max-depth 2, executing in $< 1\text{ms}$ in-memory.

---

### 3.4 Idempotency & Distributed Concurrency Locking
* **Idempotency**: Clients supply an optional `Idempotency-Key` HTTP header. If the key exists in Redis (`sentinelx:idempotency:{key}`, 24h TTL), SentinelX immediately returns the cached `DecisionResponse` with zero duplicate database mutations or false velocity increments.
* **Distributed Mutex Lock**: Uses Redis `SET sentinelx:lock:user:{userId} {token} NX PX 5000` to serialize concurrent requests originating from the same customer ID, preventing parallel threshold evasion.

---

## 4. Database Schema Specification (PostgreSQL 16)

```mermaid
erDiagram
    USERS ||--o{ TRANSACTIONS : "initiates"
    USERS ||--o{ DEVICES : "owns"
    USERS ||--o{ DECISIONS : "evaluated_for"
    TRANSACTIONS ||--|| DECISIONS : "generates"
    TRANSACTIONS ||--o| REVIEW_QUEUE : "enqueued_in"
    DECISIONS ||--o| REVIEW_QUEUE : "audited_in"
    
    USERS {
        varchar(50) id PK "usr_1001"
        varchar(100) email UK
        varchar(20) risk_segment "LOW, MEDIUM, HIGH, CRITICAL"
        timestamptz created_at
    }
    
    DEVICES {
        varchar(50) id PK
        varchar(50) user_id FK
        varchar(128) fingerprint "SHA-256 hash"
        varchar(45) ip_address
        varchar(50) os
        varchar(50) browser
        boolean is_trusted
        timestamptz first_seen
        timestamptz last_seen
    }
    
    TRANSACTIONS {
        varchar(50) id PK "txn_..."
        varchar(50) user_id FK
        numeric(15_2) amount
        varchar(3) currency "USD"
        varchar(50) merchant_id
        varchar(6) card_bin
        varchar(45) ip_address
        varchar(128) device_fingerprint
        timestamptz created_at
    }
    
    RULES {
        varchar(50) id PK "RULE_01"
        varchar(100) name
        text description
        varchar(4000) condition_json
        integer weight
        integer version
        boolean is_active
        varchar(50) created_by
    }
    
    DECISIONS {
        varchar(50) id PK "dec_..."
        varchar(50) transaction_id FK
        varchar(50) user_id FK
        integer final_score "0 - 100"
        varchar(15) decision "ALLOW, REVIEW, BLOCK"
        varchar(4000) fired_rules "JSON Array"
        integer evaluation_time_ms
        integer gemini_score
        varchar(50) gemini_category
        text gemini_reasoning
        varchar(15) gemini_verdict
        double_precision gemini_confidence
        timestamptz created_at
    }
    
    REVIEW_QUEUE {
        bigserial id PK
        varchar(50) transaction_id FK
        varchar(50) decision_id FK
        varchar(20) status "PENDING, APPROVED, REJECTED"
        text ai_analysis
        varchar(100) reviewer_id
        text reviewer_notes
        timestamptz reviewed_at
        timestamptz created_at
    }
```
