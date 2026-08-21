# SentinelX — Operations & Deployment Runbook

This runbook defines deployment procedures, configuration parameters, and disaster recovery policies for running SentinelX.

---

## 1. Environment Configuration Matrix

The backend is configured via standard Spring Boot environment variables.

| Property | Default Value | Description |
| :--- | :--- | :--- |
| `DB_HOST` | `localhost` | PostgreSQL host. |
| `DB_PORT` | `5433` | PostgreSQL port (configured to avoid standard 5432 conflicts). |
| `DB_NAME` | `sentinelx` | Target database name. |
| `DB_USER` | `sentinel_user` | PostgreSQL credentials. |
| `DB_PASSWORD` | `sentinel_password` | PostgreSQL credentials. |
| `REDIS_HOST` | `localhost` | Redis in-memory acceleration host. |
| `REDIS_PORT` | `6379` | Redis port. |
| `GEMINI_API_KEY` | `""` *(Optional)* | Google Gemini API key for live AI shadow scoring (falls back to local semantic AI if omitted). |

---

## 2. Infrastructure Setup (Docker Compose)

Launch the persistence and cache topology:
```bash
docker compose up -d
```

### Verification
```bash
# Verify PostgreSQL connectivity
docker exec -it sentinelx-postgres pg_isready -U sentinel_user -d sentinelx

# Verify Redis connectivity
docker exec -it sentinelx-redis redis-cli ping
# Output: PONG
```

---

## 3. Application Lifecycle & Startup

### Backend Application (Spring Boot 3.4.x / Java 21)
```bash
cd sentinelx-backend
./mvnw spring-boot:run
```
* **Port**: `8080`
* **Swagger UI**: `http://localhost:8080/swagger-ui.html`
* **Database Seeding**: The backend automatically seeds baseline users (`usr_1001`, `usr_1002`, `usr_1003`), trusted devices, and rules `RULE_01`–`RULE_07` on initial startup via `DatabaseSeeder.java`.

### Frontend Application (Next.js 16)
```bash
cd sentinelx-frontend
npm install
npm run dev
```
* **Port**: `3000`
* **Real-time SSE Connection**: Subscribes automatically to `http://localhost:8080/api/v1/decisions/stream`.

---

## 4. Disaster Recovery & Graceful Degradation

### Redis Outage Behavior (Circuit Breaker)
* **Design Policy**: Payment checkouts must **never fail** if the Redis cache tier experiences an outage.
* **Fallback Flow**: If Redis times out ($> 2000\text{ms}$) or the connection is refused, `VelocityService.java` catches the exception, emits an operational warning log, and automatically falls back to execute SQL history counts on PostgreSQL.
* **Restoration**: Once Redis connectivity is restored, sliding window operations automatically resume with zero application restarts.

---

## 5. Verification & Test Execution

Run the complete test suite across all subsystems:

```bash
# Execute 54 automated unit, integration, and benchmark tests
cd sentinelx-backend
./mvnw test

# Execute Next.js TypeScript compilation & ESLint audit
cd ../sentinelx-frontend
npm run lint && npm run build
```
