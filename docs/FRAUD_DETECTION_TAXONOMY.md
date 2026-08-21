# SentinelX — Fraud Detection Taxonomy & Strategy Specification

This document specifies the fraud threat models, detection algorithms, and deterministic risk penalty formulations implemented in SentinelX.

---

## 1. Threat Taxonomy & Attack Vectors

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SENTINELX THREAT MATRIX                         │
├───────────────────────┬──────────────────────┬─────────────────────────┤
│ Threat Vector         │ Primary Strategy     │ Operational Mechanism   │
├───────────────────────┼──────────────────────┼─────────────────────────┤
│ Velocity Botnet       │ RULE_01              │ Redis ZSET Sliding Log  │
│ Account Takeover (ATO)│ RULE_02 + RULE_06    │ Hardware Hash Trust     │
│ Spend Outlier Spike   │ RULE_03              │ Normalized Value Bound  │
│ VPN / Proxy Hop       │ RULE_04              │ Geolocation Transition  │
│ Sanctioned Merchant   │ RULE_05              │ Watchlist Intersection  │
│ Risk Segment Tiering  │ RULE_06              │ Baseline Profile Audit  │
│ Multi-Account Ring    │ RULE_07              │ 2-Hop Graph BFS Traversal│
└───────────────────────┴──────────────────────┴─────────────────────────┘
```

---

## 2. Core Detection Strategies

### `RULE_01: High Velocity Burst` (Default Weight: `40 pts`)
* **Objective**: Intercepts automated credential stuffing, card testing, and scripted cashout bursts.
* **Mechanism**: Executes an atomic Redis Lua sliding-window query across the active rolling window ($W = 300\text{ seconds}$).
* **Condition**:
  $$\text{Count}(T \in [t_{\text{now}} - W, t_{\text{now}}]) > L \quad (\text{Default } L = 5)$$

---

### `RULE_02: New Untrusted Device` (Default Weight: `25 pts`)
* **Objective**: Identifies sessions originating from unrecognized client hardware footprints.
* **Mechanism**: Verifies the incoming `deviceFingerprint` (SHA-256 hash of client hardware attributes) against the customer's registered trusted device registry in PostgreSQL.
* **Condition**:
  $$\text{Device}(U, D) \notin \text{TrustedDevices}(U)$$

---

### `RULE_03: High-Value Spend Deviation` (Default Weight: `50 pts`)
* **Objective**: Flags transactions deviating substantially from standard retail baselines.
* **Mechanism**: Normalizes currency to USD and evaluates whether the payment amount exceeds the high-risk ceiling.
* **Condition**:
  $$\text{Amount}_{\text{USD}} \ge \$10,000.00$$

---

### `RULE_04: Rapid IP Geolocation Hop` (Default Weight: `60 pts`)
* **Objective**: Flags impossible travel anomalies and dynamic VPN proxy tunneling.
* **Mechanism**: Compares the current transaction's IP address against the customer's prior transaction within a bounded window ($\Delta t \le 30\text{ minutes}$).
* **Condition**:
  $$\text{IP}_{\text{current}} \neq \text{IP}_{\text{last}} \quad \land \quad (t_{\text{current}} - t_{\text{last}}) < 1800\text{s}$$

---

### `RULE_05: Blacklisted Merchant Watchlist` (Default Weight: `80 pts`)
* **Objective**: Blocks payments routed to known high-risk, illegal, or watchlisted merchant IDs.
* **Mechanism**: Evaluates exact-match intersection against the sanctioned merchant set.
* **Condition**:
  $$\text{MerchantID} \in \{\text{"mer\_black\_1"}, \text{"mer\_black\_2"}, \dots\}$$

---

### `RULE_06: Baseline Customer Risk Tier` (Default Weight: `30 pts`)
* **Objective**: Adjusts the sensitivity baseline based on the customer's historical risk profile.
* **Condition**:
  $$\text{Penalty} = \begin{cases} +30\text{ pts} & \text{if Risk Segment } = \text{"HIGH"} \\ +60\text{ pts} & \text{if Risk Segment } = \text{"CRITICAL"} \\ 0\text{ pts} & \text{otherwise} \end{cases}$$

---

### `RULE_07: Graph Syndicate / Shared Infrastructure` (Default Weight: `75 pts`)
* **Objective**: Catches organized cybercrime syndicates where multiple accounts share physical hardware or payment cards.
* **Mechanism**: Runs an in-memory 2-hop Breadth-First Search (`BFS`) across the entity relationship graph.
* **Condition**:
  $$\exists B \in \text{BlockedUsers} \quad \text{such that} \quad \text{Dist}(U_{\text{current}}, B) \le 2\text{ Hops}$$

---

## 3. Score Aggregation & Verdict Formulation

The final composite risk score ($S$) is the bounded summation of all triggered rule penalties:
$$S = \min\left(100, \sum_{i=1}^{7} W_i \cdot \mathbb{I}(\text{Rule}_i \text{ triggered})\right)$$

### Operational Thresholds
$$\text{Verdict} = \begin{cases} 
\mathbf{ALLOW} & \text{if } S < 30 \quad (\text{Approved synchronously in } < 15\text{ms}) \\
\mathbf{REVIEW} & \text{if } 30 \le S < 70 \quad (\text{Enqueued for analyst review + AI Copilot}) \\
\mathbf{BLOCK} & \text{if } S \ge 70 \quad (\text{Payment rejected immediately})
\end{cases}$$
