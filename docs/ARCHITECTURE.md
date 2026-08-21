# SentinelX — System Architecture & Low-Level Design (LLD)

This document details the architectural decisions, database schemas, class relationships, and execution flow of SentinelX.

---

## 1. High-Level System Architecture

```mermaid
graph TD
    Client[Next.js 16 Client / Payment Gateway] -->|POST /api/v1/transactions| Ingestion[TransactionController]
    
    subgraph "Spring Boot Scoring Pipeline (< 15ms)"
        Ingestion --> Idempotency[IdempotencyService: Redis Check]
        Idempotency --> DistributedLock[DistributedLockService: Mutex Lock]
        DistributedLock --> PreFetch[ContextBuilder: Historical Txn Pre-fetch]
        PreFetch --> RuleEngine[RuleEngine: Concurrent Strategy Evaluator]
        
        RuleEngine --> R1[RULE_01: Redis Sliding Window Velocity]
        RuleEngine --> R2[RULE_02: Client Device Trust Check]
        RuleEngine --> R3[RULE_03: High-Value Threshold Check]
        RuleEngine --> R4[RULE_04: Rapid IP Geolocation Hop]
        RuleEngine --> R5[RULE_05: Blacklisted Merchant Watchlist]
        RuleEngine --> R6[RULE_06: Baseline Customer Risk Segment]
        RuleEngine --> R7[RULE_07: 2-Hop Graph Syndicate Traversal]
        
        R1 & R2 & R3 & R4 & R5 & R6 & R7 --> Aggregator[Penalty Aggregator & Score Normalizer]
        Aggregator --> DecisionEngine{Score Evaluation}
        
        DecisionEngine -->|< 30| AllowFlow[Verdict: ALLOW]
        DecisionEngine -->|30 - 69| ReviewFlow[Verdict: REVIEW]
        DecisionEngine -->|>= 70| BlockFlow[Verdict: BLOCK]
        
        ReviewFlow --> AICopilot[AiRiskCopilotService: GenAI Synthesis]
        AICopilot --> ReviewQueueDB[(PostgreSQL: review_queue)]
        
        AllowFlow & ReviewFlow & BlockFlow --> DecisionDB[(PostgreSQL: decisions)]
        AllowFlow & ReviewFlow & BlockFlow --> VelocityRecorder[VelocityService: Atomic Lua Update]
        VelocityRecorder --> RedisCache[(Redis 7 ZSET)]
    end
    
    subgraph "Real-Time Telemetry & SSE Broadcast"
        AllowFlow & ReviewFlow & BlockFlow --> StreamService[DecisionStreamService]
        StreamService -->|SSE Stream: text/event-stream| LiveDashboard[Next.js Live Dashboard]
    end
```

---

## 2. Database Entity-Relationship Diagram (PostgreSQL)

```mermaid
erDiagram
    USERS ||--o{ TRANSACTIONS : "initiates"
    USERS ||--o{ DEVICES : "owns"
    USERS ||--o{ DECISIONS : "evaluated_for"
    TRANSACTIONS ||--|| DECISIONS : "generates"
    TRANSACTIONS ||--o| REVIEW_QUEUE : "enqueued_in"
    DECISIONS ||--o| REVIEW_QUEUE : "audited_in"
    
    USERS {
        string id PK "e.g. usr_1001"
        string email UK
        string risk_segment "LOW, MEDIUM, HIGH, CRITICAL"
        timestamp created_at
    }
    
    DEVICES {
        string id PK
        string user_id FK
        string fingerprint "SHA-256 hash"
        string ip_address
        string os
        string browser
        boolean is_trusted
        timestamp first_seen
        timestamp last_seen
    }
    
    TRANSACTIONS {
        string id PK "e.g. txn_..."
        string user_id FK
        numeric amount "Decimal(15,2)"
        string currency "USD, EUR, GBP"
        string merchant_id
        string card_bin
        string ip_address
        string device_fingerprint
        timestamp created_at
    }
    
    RULES {
        string id PK "e.g. RULE_01"
        string name
        string description
        string condition_json
        integer weight "e.g. 40"
        integer version
        boolean is_active
        string created_by
    }
    
    DECISIONS {
        string id PK "e.g. dec_..."
        string transaction_id FK
        string user_id FK
        integer final_score "0 - 100"
        string decision "ALLOW, REVIEW, BLOCK"
        string fired_rules "JSON Array"
        integer evaluation_time_ms
        integer gemini_score
        string gemini_category
        text gemini_reasoning
        string gemini_verdict
        double gemini_confidence
        timestamp created_at
    }
    
    REVIEW_QUEUE {
        bigserial id PK
        string transaction_id FK
        string decision_id FK
        string status "PENDING, APPROVED, REJECTED"
        text ai_analysis "Copilot Reasoning"
        string reviewer_id
        text reviewer_notes
        timestamp reviewed_at
        timestamp created_at
    }
```

---

## 3. Core Class Design & Design Patterns

### A. Strategy Pattern Class Structure

```mermaid
classDiagram
    class RiskRule {
        <<interface>>
        +getRuleId() String
        +evaluate(request, user, device, ruleConfig, context) RuleResult
    }
    
    class HighVelocityRule {
        -VelocityService velocityService
        +evaluate() RuleResult
    }
    class NewDeviceRule {
        +evaluate() RuleResult
    }
    class HighValueRule {
        +evaluate() RuleResult
    }
    class GeoHopRule {
        +evaluate() RuleResult
    }
    class BlacklistedMerchantRule {
        +evaluate() RuleResult
    }
    class UserRiskTierRule {
        +evaluate() RuleResult
    }
    class SyndicateFraudRule {
        -GraphSyndicateService graphSyndicateService
        +evaluate() RuleResult
    }
    
    class RuleEngine {
        -Map~String, RiskRule~ ruleMap
        -RuleRepository ruleRepository
        -ConcurrentHashMap inMemoryRuleCache
        +evaluate(request, user, device, context) EvaluationReport
    }
    
    RiskRule <|.. HighVelocityRule
    RiskRule <|.. NewDeviceRule
    RiskRule <|.. HighValueRule
    RiskRule <|.. GeoHopRule
    RiskRule <|.. BlacklistedMerchantRule
    RiskRule <|.. UserRiskTierRule
    RiskRule <|.. SyndicateFraudRule
    RuleEngine o-- RiskRule
```

---

## 4. Key Request Flows

### Ingestion Flow (`POST /api/v1/transactions`)
1. Client submits JSON payload with optional `Idempotency-Key` header.
2. `TransactionController` validates DTO constraints (`@Valid`).
3. `IdempotencyService` checks Redis cache: if key exists, returns cached verdict immediately ($< 1\text{ms}$).
4. `DistributedLockService` acquires atomic mutex lock on `userId` (`SET NX PX 5000`).
5. `RiskService` loads `User` and `Device` records.
6. `RuleEngine` evaluates active rules (`RULE_01` to `RULE_07`) against `EvaluationContext`.
7. Aggregator computes total risk score ($0$–$100$) and assigns verdict (`ALLOW`, `REVIEW`, `BLOCK`).
8. If `REVIEW`, `AiRiskCopilotService` synthesizes multi-signal correlation and routes to `review_queue`.
9. `VelocityService` executes atomic Redis Lua sliding-window update.
10. `DecisionStreamService` broadcasts event to connected SSE subscribers.
11. `IdempotencyService` caches decision in Redis (24h TTL).
12. `DistributedLockService` safely releases user mutex lock via Lua script.
13. Returns `DecisionResponse` to client with execution latency ($< 15\text{ms}$).
