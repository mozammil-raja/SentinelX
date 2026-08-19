package com.sentinelx.backend.controller;

import com.sentinelx.backend.dto.RuleRequest;
import com.sentinelx.backend.entity.Rule;
import com.sentinelx.backend.exception.ResourceNotFoundException;
import com.sentinelx.backend.repository.RuleRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for dynamic fraud rule management.
 * 
 * <p>Enables viewing, updating weights, and toggling active states of dynamic rules
 * evaluated in real-time by the {@link com.sentinelx.backend.rule.RuleEngine}.</p>
 */
@RestController
@RequestMapping("/api/v1/rules")
@CrossOrigin(origins = "*")
public class RuleController {

    private final RuleRepository ruleRepository;
    private final com.sentinelx.backend.rule.RuleEngine ruleEngine;

    public RuleController(RuleRepository ruleRepository, com.sentinelx.backend.rule.RuleEngine ruleEngine) {
        this.ruleRepository = ruleRepository;
        this.ruleEngine = ruleEngine;
    }

    /**
     * Retrieves all dynamic fraud rules configured in PostgreSQL.
     *
     * @return List of all Rule entities
     */
    @GetMapping
    public ResponseEntity<List<Rule>> getAllRules() {
        List<Rule> rules = ruleRepository.findAll();
        return ResponseEntity.ok(rules);
    }

    /**
     * Retrieves a specific dynamic rule by ID.
     *
     * @param id Rule identifier (e.g. "RULE_01")
     * @return Rule entity
     */
    @GetMapping("/{id}")
    public ResponseEntity<Rule> getRuleById(@PathVariable String id) {
        Rule rule = ruleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Rule not found with ID: " + id));
        return ResponseEntity.ok(rule);
    }

    /**
     * Toggles a rule's active state (enabled/disabled) at runtime.
     *
     * @param id Rule identifier (e.g. "RULE_05")
     * @return Updated Rule entity
     */
    @PutMapping("/{id}/toggle")
    public ResponseEntity<Rule> toggleRuleActive(@PathVariable String id) {
        Rule rule = ruleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Rule not found with ID: " + id));
        rule.setIsActive(!Boolean.TRUE.equals(rule.getIsActive()));
        Rule saved = ruleRepository.save(rule);
        if (ruleEngine != null) {
            ruleEngine.refreshRules();
        }
        return ResponseEntity.ok(saved);
    }

    /**
     * Updates an existing rule's configuration parameters, weight, or description.
     *
     * @param id      Rule identifier
     * @param request Validated rule update payload
     * @return Updated Rule entity
     */
    @PutMapping("/{id}")
    public ResponseEntity<Rule> updateRule(@PathVariable String id, @Valid @RequestBody RuleRequest request) {
        Rule rule = ruleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Rule not found with ID: " + id));

        rule.setName(request.getName());
        rule.setDescription(request.getDescription());
        rule.setConditionJson(request.getConditionJson());
        rule.setWeight(request.getWeight());
        if (request.getIsActive() != null) {
            rule.setIsActive(request.getIsActive());
        }

        Rule updated = ruleRepository.save(rule);
        if (ruleEngine != null) {
            ruleEngine.refreshRules();
        }
        return ResponseEntity.ok(updated);
    }

}
