# SentinelX

Real-time fraud & risk decisioning platform: a synchronous transaction ingestion API with a
PostgreSQL-backed dynamic rule engine.

## Structure

- `sentinelx-backend/` — Spring Boot 4 (Java 21) risk engine, REST API, PostgreSQL persistence.
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

- `POST /api/v1/transactions` — ingest a transaction and return a risk decision.
- `GET /api/v1/transactions?page=0&size=50` — list recent transactions.
- `GET /api/v1/transactions/{id}` — get a transaction.
- `GET /api/v1/rules` — list fraud rules.
- `GET /api/v1/rules/{id}` — get a rule.
- `PUT /api/v1/rules/{id}/toggle` — enable/disable a rule.
- `PUT /api/v1/rules/{id}` — update a rule's weight/condition.

## Decision thresholds

- `ALLOW`: score < 30
- `REVIEW`: 30 ≤ score < 70
- `BLOCK`: score ≥ 70

## Tests

```bash
cd sentinelx-backend && ./mvnw test   # 15 tests, H2 in-memory
cd sentinelx-frontend && npm run lint && npm run build
```
