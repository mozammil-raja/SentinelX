package com.sentinelx.backend.rule;

import com.sentinelx.backend.dto.TransactionRequest;
import com.sentinelx.backend.entity.Device;
import com.sentinelx.backend.entity.Rule;
import com.sentinelx.backend.entity.User;

/**
 * Strategy interface defining a pluggable fraud detection rule.
 * 
 * <p>Implementations of this interface encapsulate the logic for a single fraud detection
 * pattern (e.g., velocity limits, device trust checks, merchant blacklists). Each strategy
 * parses its polymorphic {@link Rule#getConditionJson()} configuration and returns a
 * {@link RuleResult} containing the decision and penalty score contribution.</p>
 */
public interface RiskRule {

    /**
     * Returns the unique identifier of the rule this strategy handles (e.g. "RULE_01").
     *
     * @return Rule ID string matching the {@link Rule#getId()} stored in PostgreSQL
     */
    String getRuleId();

    /**
     * Evaluates a transaction against the strategy's domain criteria and database configuration.
     *
     * @param request    The incoming transaction payload
     * @param user       The user initiating the transaction
     * @param device     The resolved client device (may be null if unrecognized)
     * @param ruleConfig The database rule entity containing condition JSON and weight
     * @param context    Shared evaluation context with pre-fetched user history
     * @return RuleResult indicating whether the rule triggered and its score contribution
     */
    RuleResult evaluate(TransactionRequest request, User user, Device device, Rule ruleConfig, EvaluationContext context);
}
