# SentinelX

Real-time fraud & risk decisioning platform: a synchronous transaction ingestion API with a
PostgreSQL-backed dynamic rule engine.

## Structure

- `sentinelx-backend/` — Spring Boot 3.x (Java 21) risk engine, REST API, PostgreSQL persistence, Redis sliding window velocity.
- `sentinelx-frontend/` — Next.js 16 (App Router) dashboard.
- `docker-compose.yml` — local PostgreSQL + Redis.

## Quick Start

```bash
# 1. Start infrastructure
docker compose up -d

# 2. Run the backend (seeds mock users, devices, and rules)
cd sentinelx-backend
./mvnw spring-boot:run

# 3. Run the frontend
cd ../sentinelx-frontend
npm install
npm run dev
```

## API

### Transactions
- `POST /api/v1/transactions` — ingest a transaction and return a real-time risk decision.
- `GET /api/v1/transactions?page=0&size=50` — list recent transactions.
- `GET /api/v1/transactions/{id}` — get a transaction by ID.

### Rules Management
- `GET /api/v1/rules` — list dynamic fraud rules.
- `GET /api/v1/rules/{id}` — get a rule by ID.
- `PUT /api/v1/rules/{id}/toggle` — dynamically enable/disable a rule.
- `PUT /api/v1/rules/{id}` — update a rule's weight or JSON condition.
- `POST /api/v1/rules` — register a dynamic fraud detection rule.

### Baseline Fraud Detection Strategies
1. **`RULE_01` (High Velocity)**: Detects bursts of transactions in sliding time windows via Redis Sorted Sets (ZSET) (+40 pts).
2. **`RULE_02` (New Device)**: Flags transactions from unrecognized or untrusted client device fingerprints (+25 pts).
3. **`RULE_03` (High-Value Transaction)**: Flags monetary amounts exceeding threshold ($10,000 USD normalized) (+50 pts).
4. **`RULE_04` (Rapid IP Change)**: Flags rapid IP address changes within 30 minutes, indicating VPN proxy hops (+60 pts).
5. **`RULE_05` (Blacklisted Merchant)**: Blocks transactions with flagged high-risk merchant IDs (+80 pts).
6. **`RULE_06` (User Risk Tier)**: Evaluates customer baseline risk segment (HIGH: +30 pts, CRITICAL: +60 pts).

### Analyst Review Queue
- `GET /api/v1/reviews?status=PENDING` — list pending review queue cases.
- `GET /api/v1/reviews/{id}` — inspect review case details.
- `POST /api/v1/reviews/{id}/resolve` — authoritatively resolve review (APPROVED / REJECTED) and elevate device trust.

### Real-Time Streaming & Velocity Telemetry
- `GET /api/v1/decisions/stream` — Server-Sent Events (SSE) live decision broadcast feed.
- `GET /api/v1/velocity/user/{userId}?window=300` — inspect customer sliding window velocity.
- `GET /api/v1/velocity/ip/{ipAddress}?window=300` — inspect IP burst frequency.
- `GET /api/v1/velocity/device/{fingerprint}?window=300` — inspect device burst frequency.
- `GET /api/v1/velocity/health` — Redis in-memory acceleration health status.

## Decision Thresholds

- `ALLOW`: risk score < 30 (Approved immediately)
- `REVIEW`: 30 ≤ risk score < 70 (Enqueued to manual review queue)
- `BLOCK`: risk score ≥ 70 (Blocked immediately)

## Tests

```bash
cd sentinelx-backend && ./mvnw test   # Automated unit & integration tests, H2 in-memory
cd sentinelx-frontend && npm run lint && npm run build
```
