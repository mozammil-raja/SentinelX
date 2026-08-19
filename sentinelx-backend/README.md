# SentinelX Backend Service

The core high-throughput risk scoring and fraud evaluation engine built on Java 21 and Spring Boot 4.1.0.

## Features
- **Real-Time Risk Decisioning**: Sub-millisecond evaluation with pluggable rules.
- **REST Ingestion API**: `POST /api/v1/transactions` with strict Jakarta Validation.
- **Dynamic Rule Engine**: Strategy-pattern rules loaded from PostgreSQL at runtime.
- **PostgreSQL Persistence**: ACID transaction records, device fingerprints, and immutable audit logs.
- **In-Memory H2 Testing**: Zero-dependency automated test execution via `@ActiveProfiles("test")`.

## Quick Start

### 1. Build and Run Tests
```bash
./mvnw clean test
```

### 2. Run Backend Locally
```bash
./mvnw spring-boot:run
```

## API Endpoints
- `POST /api/v1/transactions`: Synchronous ingestion & risk scoring.
- `GET /api/v1/transactions?page=0&size=50`: Paginated transaction inquiry.
- `GET /api/v1/transactions/{id}`: Single transaction details.
- `GET /api/v1/rules`: Retrieve all configured fraud rules.
- `GET /api/v1/rules/{id}`: Retrieve a single rule.
- `PUT /api/v1/rules/{id}/toggle`: Toggle a rule's active state.
- `PUT /api/v1/rules/{id}`: Update rule weight, description, or condition JSON.
