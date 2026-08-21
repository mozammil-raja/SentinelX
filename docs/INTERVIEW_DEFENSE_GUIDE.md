# SentinelX — College Placement Interview Defense Guide

This guide prepares you to present, demonstrate, and defend **SentinelX** in technical placement interviews for **Software Engineering, Backend Engineering, Full-Stack, and Data/Risk Analytics** roles.

---

## 🎯 1. The Core Definition of SentinelX

> **"SentinelX is an explainable transaction-risk detection simulator. It does not attempt to prove whether a user is good or evil; rather, it evaluates: *'How risky is this incoming transaction, given the available context? Should this transaction be trusted?'*"**

---

## 🏛️ 2. The 3 Core Detection Dimensions

When presenting your architecture, explain that SentinelX evaluates transaction risk across **three distinct dimensions**:

| Dimension | Core Question | Real-World Scenario | Technology Used |
| :--- | :--- | :--- | :--- |
| **Dimension A: Behavioral Anomaly** | *"Does this transaction look abnormal for this specific customer?"* | **Sarah Khan (Compromised Account / ATO):** An unexpected ₹19,500 spend from a new device in Mumbai when she normally spends ₹500–₹3k in Delhi. | PostgreSQL Behavioral Baselines + Polymorphic Rule Strategy Engine |
| **Dimension B: Transaction Velocity** | *"Is this transaction part of suspicious frequency/burst activity?"* | **Automated Script Client (Card Testing):** 6 rapid transactions fired within $< 1$ second to test card numbers or drain funds. | Redis 7 In-Memory Sorted Sets (`ZSET`) + Atomic Lua Sliding Window |
| **Dimension C: Relationship / Network Risk** | *"Is this transaction connected to entities previously associated with suspicious activity?"* | **Fraud Ring Syndicate:** Multiple accounts sharing the exact same physical hardware or cards linked to previously flagged entities. | Graph Traversal (BFS relationship exploration across accounts, cards, and devices) |

---

## 🎬 3. The 2-Minute Live Demo Script

Follow this exact 4-step sequence during your interview screen-share:

### Step 1: Baseline Clean Transaction (15s)
1. Point to **Sarah Khan** in the Customer Profile grid.
2. *"Notice Sarah's baseline: typical spend ₹500–₹3,000 in Delhi using an iPhone."*
3. With clean settings ($Amount = ₹1,200$), click **Simulate Payment & Evaluate Risk**.
4. **Point to Result:** *"The verdict is **ALLOW (0 / 100 Risk Score)** with $< 15\text{ms}$ latency. Zero risk rules fired because the payment matches Sarah's normal behavioral pattern."*

### Step 2: Dimension A — Behavioral Anomaly Simulation (30s)
1. Check **`[x] Unusual Amount`** (auto-bumps amount to ₹19,500).
2. Check **`[x] New / Untrusted Device`** (+25 pts).
3. Click **Simulate Payment & Evaluate Risk**.
4. **Point to Result:** *"The verdict changes to **BLOCK (75 / 100 Risk Score)**. Notice the explainability card: it cites `+50 pts` because ₹19,500 is significantly above her ₹3k baseline, and `+25 pts` for an unrecognized SHA-256 device fingerprint."*

### Step 3: Interactive "What-If" Sensitivity Analysis (30s)
1. Scroll to the **"What-If" Studio** below the result.
2. Uncheck **Untrusted Device** (*"What if Sarah verified this new phone with her bank?"*).
3. **Point to Result:** *"The score dynamically recalculates from 75 down to 50, shifting the verdict from `BLOCK` to `REVIEW` (routing the transaction to a manual analyst queue rather than a hard rejection)."*

### Step 4: Dimension B — Redis Velocity Burst Simulation (30s)
1. Select **Automated Script Client** or check **`[x] Rapid Transaction Velocity`**.
2. Click **Simulate Payment & Evaluate Risk**.
3. **Point to Result:** *"The simulator fires 6 rapid payments in $< 1\text{s}$. The Redis Sorted Set sliding-window counter immediately trips `RULE_01: High Velocity (+40 pts)` in RAM."*

---

## 🛡️ 4. Top Placement Interview Questions & Defensible Answers

### Q1: "What does SentinelX actually detect?"
**Answer:**
> *"SentinelX evaluates individual payment transactions for fraud risk. It doesn't label a customer as fraudulent. Instead, it combines transaction characteristics with behavioral baselines, real-time velocity, and entity relationship signals to determine whether the current transaction should be allowed, reviewed, or blocked."*

---

### Q2: "Why didn't you use Machine Learning (e.g. XGBoost, Random Forest)?"
**Answer:**
> *"In consumer payments and banking, regulatory auditability and explainability are paramount. A weighted polymorphic rule engine allows explicit, non-repudiable audit logs citing the exact reasons a transaction was flagged, and enables risk teams to adjust weights dynamically without model retraining. I architected the pipeline with clean DTOs so an ML model can easily be plugged in as an asynchronous shadow scorer."*

---

### Q3: "Why did you use Redis and what is the Sliding Window Log?"
**Answer:**
> *"Velocity rules require fast access to recent transaction counts within a rolling time window (e.g. last 5 minutes).*
> *If we queried PostgreSQL using `SELECT COUNT(*) WHERE created_at > NOW() - 5 min` for thousands of concurrent transactions, disk I/O would bottleneck the payment gateway.*
> *Redis Sorted Sets (`ZSET`) solve this in RAM:*
> 1. *Each transaction timestamp is added as the score via an atomic Lua script.*
> 2. *Stale records older than $(now - 300s)$ are evicted in $O(\log N + M)$ time.*
> 3. *The active count is returned via `ZCARD` in $< 1\text{ms}$."*

---

### Q4: "What happens if Redis goes down?"
**Answer:**
> *"I built a graceful fallback in `VelocityService.java`. If the Redis connection check fails, the backend catches the exception and queries the indexed PostgreSQL transaction history, ensuring payments never fail silently."*

---

### Q5: "How does the graph traversal work for syndicate detection?"
**Answer:**
> *"I represent relationships between accounts, hardware devices, and payment cards as a bipartite graph. Rather than claiming BFS 'detects fraud,' BFS is an algorithm for traversing relationships: it identifies whether the current transaction is connected to previously flagged or blocked entities within 2 hops, generating an additional network-risk signal."*

---

### Q6: "How do you handle idempotency and prevent double charges?"
**Answer:**
> *"I implemented Header-Based Idempotency using Redis. When a request includes an `Idempotency-Key` header, the gateway checks if a cached response exists for that key. If found, it returns the prior decision immediately without re-executing the rule pipeline or charging the user twice."*

---

### Q7: "Why did you use customer behavioral baselines instead of static limits?"
**Answer:**
> *"Static limits produce high false positives. ₹10,000 may be normal for a business executive but suspicious for a student. By establishing baseline spend ranges (`typicalSpendMin`/`typicalSpendMax`), typical locations, and trusted devices, SentinelX evaluates behavioral **deviations** rather than blanket thresholds."*

---

### Q8: "Is this a real banking fraud system?"
**Answer:**
> *"No. It is an educational prototype and interactive simulation laboratory designed to model real-world fraud engineering principles. All customer profiles, transaction records, and risk signals are synthetic so that the entire decisioning lifecycle remains observable, testable, and explainable."*

---

## 📊 Tech Stack Summary for Your Resume

- **Backend:** Java 21 LTS, Spring Boot 3.4.x, Spring Data JPA, Hibernate, OpenAPI Swagger.
- **In-Memory Caching & Velocity:** Redis 7 (Sorted Sets `ZSET`, Lua Scripting, Sliding Window Log).
- **Database:** PostgreSQL 16 (Relational schemas, indexes, transaction audit logging).
- **Frontend:** Next.js 16 (App Router), React, TypeScript, Tailwind CSS, Lucide Icons.
- **Key Concepts:** Polymorphic Strategy Pattern, Idempotency, Distributed Concurrency Locking, Behavioral Baselines, Relationship Graph Traversal.
