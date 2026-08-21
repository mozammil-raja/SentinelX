# SentinelX — Real-Time Financial Fraud & Risk Decisioning Platform

[![Java 21 LTS](https://img.shields.io/badge/Java-21%20LTS-orange.svg?style=flat&logo=openjdk)](https://openjdk.org/)
[![Spring Boot 3.4.x](https://img.shields.io/badge/Spring%20Boot-3.4.x-brightgreen.svg?style=flat&logo=springboot)](https://spring.io/projects/spring-boot)
[![Next.js 16](https://img.shields.io/badge/Next.js-16%20(App%20Router)-black.svg?style=flat&logo=next.js)](https://nextjs.org/)
[![PostgreSQL 16](https://img.shields.io/badge/PostgreSQL-16-blue.svg?style=flat&logo=postgresql)](https://www.postgresql.org/)
[![Redis 7](https://img.shields.io/badge/Redis-7%20In--Memory-red.svg?style=flat&logo=redis)](https://redis.io/)
[![Tests Passing](https://img.shields.io/badge/Tests-59%20Passing-success.svg?style=flat)]()
[![SLA Latency](https://img.shields.io/badge/Engine%20Latency-%3C%2015ms-blueviolet.svg?style=flat)]()

**SentinelX** is an enterprise-grade, high-throughput Financial Fraud & Risk Decisioning Platform. It evaluates incoming financial transactions synchronously in real time ($< 15\text{ms}$ rule engine execution, $< 50\text{ms}$ end-to-end SLA) to emit definitive risk verdicts: **`ALLOW`**, **`REVIEW`**, or **`BLOCK`**.

Built around core Computer Science design principles: **Polymorphic Strategy Rule Engine**, **Redis Sorted Sets (`ZSET`) Sliding Window Velocity**, **2-Hop Bipartite Graph Syndicate Traversal**, **Header-Based Idempotency**, **Distributed Concurrency Locking**, and **Zero-Impact AI Shadow Scoring**.

---

## 📚 Technical Documentation Suite

Comprehensive engineering specifications are organized in the [`docs/`](./docs) directory:

| Document | Description |
| :--- | :--- |
| 🏛️ **[Architecture & Technical Design Specification](./docs/ARCHITECTURE_SPECIFICATION.md)** | High-Level and Low-Level Design (HLD/LLD), component architecture, sequence diagrams, and database schemas. |
| 📖 **[REST API Reference Guide](./docs/API_REFERENCE.md)** | Complete endpoint specifications, JSON request/response schemas, cURL examples, and error codes. |
| 🛡️ **[Fraud Detection Taxonomy & Strategy Matrix](./docs/FRAUD_DETECTION_TAXONOMY.md)** | Threat models, mathematical criteria, and weight configurations for rules `RULE_01` through `RULE_07`. |
| 🚀 **[Operations & Deployment Runbook](./docs/OPERATIONS_AND_DEPLOYMENT_RUNBOOK.md)** | Infrastructure setup, environment configuration, database seeding, and disaster recovery procedures. |

---

## 🏛️ System Architecture

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

## 🚀 Key Subsystems

* **Dynamic Strategy Rule Engine (`RiskRule`)**: Decoupled, polymorphic rule strategies evaluated against an in-memory cache with dynamic runtime weight re-configuration.
* **Redis Sliding Window Velocity (`ZSET` + Atomic Lua)**: High-performance $O(\log N)$ frequency tracking across 5-minute rolling windows with automatic database fallback.
* **Graph Syndicate & Fraud Ring Engine**: Sub-millisecond 2-hop **Breadth-First Search (BFS)** graph traversal uncovering accounts that share physical devices or cards with banned fraudsters.
* **Historical Replay & Backtesting Simulation Studio**: Non-persisted dry-run scoring engine testing candidate rule strategies against a 250-transaction benchmark matrix.
* **Enterprise Idempotency & Distributed Concurrency Locks**: Prevents duplicate charges via `Idempotency-Key` headers and serializes concurrent user requests via Redis mutex locks.
* **AI Risk Copilot & Shadow Scoring**: Generates natural language reasoning for held review cases and benchmarks zero-shot AI fraud scoring in the background.

---

## 📊 Core Fraud Detection Strategies

| Rule ID | Rule Strategy | Default Weight | Mechanism |
| :--- | :--- | :---: | :--- |
| **`RULE_01`** | **High Velocity (5m)** | `+40 pts` | Redis `ZSET` Sliding Window Log ($> 5$ txns in 300s). |
| **`RULE_02`** | **New Untrusted Device** | `+25 pts` | SHA-256 client device fingerprint verification. |
| **`RULE_03`** | **High-Value Transaction** | `+50 pts` | Monetary spend deviation threshold ($> \$10,000$). |
| **`RULE_04`** | **Rapid IP Change (Geo Hop)** | `+60 pts` | IP subnet transition within 30 minutes. |
| **`RULE_05`** | **Blacklisted Merchant** | `+80 pts` | High-risk sanctioned merchant watchlist match. |
| **`RULE_06`** | **User Risk Tier** | `+30 pts` | Account risk profile baseline (`HIGH` / `CRITICAL`). |
| **`RULE_07`** | **Syndicate Fraud Ring** | `+75 pts` | 2-Hop BFS graph traversal on shared hardware & cards. |

---

## 🛠️ Quick Start Guide

### 1. Launch Infrastructure
```bash
docker compose up -d
```

### 2. Start Spring Boot Backend
```bash
cd sentinelx-backend
./mvnw spring-boot:run
```
* Interactive OpenAPI Swagger UI: `http://localhost:8080/swagger-ui.html`

### 3. Start Next.js Frontend Dashboard
```bash
cd sentinelx-frontend
npm install
npm run dev
```
* Live Dashboard: `http://localhost:3000`

---

## 🧪 Verification & Test Suite

```bash
# Execute 59 automated unit, integration, and benchmark tests
cd sentinelx-backend
./mvnw test

# Execute Next.js linter and production build
cd ../sentinelx-frontend
npm run lint && npm run build
```
