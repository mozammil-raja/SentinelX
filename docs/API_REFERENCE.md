# SentinelX — REST API Developer Reference Specification

Base URL: `http://localhost:8080`  
OpenAPI 3.0 Interactive Documentation: `http://localhost:8080/swagger-ui.html`  
Raw OpenAPI JSON Schema: `http://localhost:8080/v3/api-docs`

---

## 1. Transaction Ingestion & Scoring

### `POST /api/v1/transactions`
Ingests a real-time financial transaction payload, executes the dynamic rule engine, and returns an authoritative risk verdict within $< 15\text{ms}$.

#### Request Headers
| Header | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `Content-Type` | `string` | Yes | `application/json` |
| `Idempotency-Key` | `string` | No | Unique client UUID for request deduplication (24h cache TTL). |

#### Request Body
```json
{
  "userId": "usr_1001",
  "email": "alice@example.com",
  "amount": 125.50,
  "currency": "USD",
  "merchantId": "mer_safe_store",
  "cardBin": "411111",
  "ipAddress": "198.51.100.10",
  "deviceFingerprint": "fp_alice_iphone15_sha256",
  "os": "iOS",
  "browser": "Safari"
}
```

#### Response Body (`200 OK`)
```json
{
  "decisionId": "dec_1708362000000_a1b2",
  "transactionId": "txn_8920192839",
  "userId": "usr_1001",
  "finalScore": 0,
  "decision": "ALLOW",
  "firedRules": [],
  "evaluationTimeMs": 6,
  "geminiScore": 0,
  "geminiCategory": "CLEAN",
  "geminiReasoning": "Standard legitimate transaction profile with consistent device and IP characteristics.",
  "geminiVerdict": "ALLOW",
  "geminiConfidence": 0.96,
  "timestamp": "2026-08-21T11:00:00Z"
}
```

#### cURL Example
```bash
curl -X POST http://localhost:8080/api/v1/transactions \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: e6c8f6e8-23ab-4e5a-9a99-4d693f18e11a" \
  -d '{
    "userId": "usr_1001",
    "email": "alice@example.com",
    "amount": 125.50,
    "currency": "USD",
    "merchantId": "mer_safe_store",
    "cardBin": "411111",
    "ipAddress": "198.51.100.10",
    "deviceFingerprint": "fp_alice_iphone15_sha256",
    "os": "iOS",
    "browser": "Safari"
  }'
```

---

## 2. Dynamic Rule Management

### `GET /api/v1/rules`
Lists all active and inactive fraud detection heuristics and weights.

#### Response Body (`200 OK`)
```json
[
  {
    "id": "RULE_01",
    "name": "High Velocity (5m)",
    "description": "Triggers if user makes more than 5 transactions in 5 minutes",
    "conditionJson": "{\"window\": 300, \"limit\": 5}",
    "weight": 40,
    "version": 1,
    "isActive": true,
    "createdBy": "system"
  },
  {
    "id": "RULE_07",
    "name": "Syndicate Fraud Ring",
    "description": "Graph analysis: Triggers if account shares hardware devices or cards with blocked fraudsters",
    "conditionJson": "{\"maxHops\": 2, \"inspectDevices\": true, \"inspectCards\": true}",
    "weight": 75,
    "version": 1,
    "isActive": true,
    "createdBy": "system"
  }
]
```

### `PUT /api/v1/rules/{id}/toggle`
Dynamically toggles a rule between active and inactive states.

#### Response Body (`200 OK`)
```json
{
  "id": "RULE_01",
  "name": "High Velocity (5m)",
  "weight": 40,
  "isActive": false,
  "version": 2
}
```

---

## 3. Compliance & Review Queue

### `GET /api/v1/reviews?status=PENDING`
Returns pending transactions requiring manual analyst review ($30 \le \text{score} < 70$).

### `POST /api/v1/reviews/{id}/resolve`
Authoritatively resolves a compliance case and updates device trust.

#### Request Body
```json
{
  "status": "APPROVED",
  "reviewerId": "analyst@sentinelx.io",
  "reviewerNotes": "Customer verified via secondary out-of-band challenge."
}
```

---

## 4. Graph Syndicate & Fraud Ring Explorer

### `GET /api/v1/graph/network/{userId}`
Queries the 2-hop entity relationship network for a specific customer.

#### Response Body (`200 OK`)
```json
{
  "focusUserId": "usr_1001",
  "totalNodes": 6,
  "totalEdges": 5,
  "hasBlockedConnections": false,
  "nodes": [
    { "id": "usr:usr_1001", "label": "usr_1001", "type": "USER", "isBlocked": false, "riskScore": 10 },
    { "id": "dev:fp_alice_iphone15_sha256", "label": "Device: fp_alice...", "type": "DEVICE", "isBlocked": false }
  ],
  "edges": [
    { "source": "usr:usr_1001", "target": "dev:fp_alice_iphone15_sha256", "relationship": "USED_DEVICE", "weight": 1 }
  ],
  "syndicateAnalysis": {
    "syndicateDetected": false,
    "degreesOfSeparation": 0,
    "explanation": "No shared infrastructure connections with blocked accounts detected."
  }
}
```

---

## 5. Real-Time Telemetry & SSE

### `GET /api/v1/decisions/stream`
Opens a persistent HTTP Server-Sent Events (SSE) stream emitting real-time transaction scoring verdicts.
* **Content-Type**: `text/event-stream`
* **Heartbeat**: 25-second keep-alive ping event (`PING` event with `data: keep-alive`).
