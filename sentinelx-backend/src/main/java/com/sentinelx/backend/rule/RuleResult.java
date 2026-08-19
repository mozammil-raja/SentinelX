package com.sentinelx.backend.rule;

/**
 * Encapsulates the execution outcome of an individual {@link RiskRule} strategy.
 * 
 * @param triggered         Whether the rule's specific risk condition was met
 * @param scoreContribution The numerical score penalty added to the overall risk score
 * @param ruleId            The unique identifier of the rule (e.g. "RULE_01")
 * @param ruleName          The human-readable title of the rule
 * @param reason            A detailed explanation of why the rule fired or passed
 */
public record RuleResult(
        boolean triggered,
        int scoreContribution,
        String ruleId,
        String ruleName,
        String reason
) {
    /**
     * Factory method creating a passing (untriggered) rule result.
     *
     * @param ruleId   Rule identifier
     * @param ruleName Rule name
     * @return Untriggered RuleResult with 0 score contribution
     */
    public static RuleResult notTriggered(String ruleId, String ruleName) {
        return new RuleResult(false, 0, ruleId, ruleName, "Condition not met");
    }

    /**
     * Factory method creating a triggered rule result with a penalty score.
     *
     * @param ruleId            Rule identifier
     * @param ruleName          Rule name
     * @param scoreContribution Score penalty to contribute
     * @param reason            Explanation of the trigger
     * @return Triggered RuleResult
     */
    public static RuleResult triggered(String ruleId, String ruleName, int scoreContribution, String reason) {
        return new RuleResult(true, scoreContribution, ruleId, ruleName, reason);
    }
}
