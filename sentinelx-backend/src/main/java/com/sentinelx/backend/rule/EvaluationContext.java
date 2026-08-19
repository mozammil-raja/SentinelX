package com.sentinelx.backend.rule;

import com.sentinelx.backend.entity.Transaction;
import lombok.Builder;
import lombok.Getter;

import java.util.Collections;
import java.util.List;

/**
 * Shared runtime evaluation context passed across all rule strategy executions.
 * 
 * <p>Pre-fetches and caches shared historical data (e.g., user transaction history)
 * so that multiple rules (velocity checks, geolocation hop, etc.) do not issue redundant
 * queries to PostgreSQL.</p>
 */
@Getter
@Builder
public class EvaluationContext {

    /**
     * Chronologically descending list of recent historical transactions for the user within a bounded window.
     */
    @Builder.Default
    private final List<Transaction> recentTransactions = Collections.emptyList();

    /**
     * The single most recent historical transaction executed by the user (if any), for O(1) state checks.
     */
    private final Transaction lastTransaction;
}
