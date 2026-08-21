package com.sentinelx.backend.controller;

import com.sentinelx.backend.dto.RuleRequest;
import com.sentinelx.backend.dto.RuleResponse;
import com.sentinelx.backend.entity.Rule;
import com.sentinelx.backend.exception.ResourceNotFoundException;
import com.sentinelx.backend.repository.RuleRepository;
import com.sentinelx.backend.rule.RuleEngine;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

/**
 * REST controller for dynamic fraud rule management.
 * 
 * <p>Enables viewing, updating weights, and toggling active states of dynamic rules
 * evaluated in real-time by the {@link RuleEngine}.</p>
 */
@RestController
@RequestMapping("/api/v1/rules")
public class RuleController {

    private final RuleRepository ruleRepository;
    private final RuleEngine ruleEngine;

    public RuleController(RuleRepository ruleRepository, RuleEngine ruleEngine) {
        this.ruleRepository = ruleRepository;
        this.ruleEngine = ruleEngine;
    }

    /**
     * Retrieves all dynamic fraud rules configured in PostgreSQL.
     *
     * @return List of all Rule presentation DTOs
     */
    @GetMapping
    public ResponseEntity<List<RuleResponse>> getAllRules() {
        List<Rule> rules = ruleRepository.findAll();
        List<RuleResponse> responses = rules.stream()
                .map(RuleResponse::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(responses);
    }

    /**
     * Retrieves a specific dynamic rule by ID.
     *
     * @param id Rule identifier (e.g. "RULE_01")
     * @return Rule presentation DTO
     */
    @GetMapping("/{id}")
    public ResponseEntity<RuleResponse> getRuleById(@PathVariable String id) {
        Rule rule = ruleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Rule not found with ID: " + id));
        return ResponseEntity.ok(RuleResponse.fromEntity(rule));
    }

    /**
     * Toggles a rule's active state (enabled/disabled) at runtime.
     *
     * @param id Rule identifier (e.g. "RULE_05")
     * @return Updated Rule presentation DTO
     */
    @PutMapping("/{id}/toggle")
    public ResponseEntity<RuleResponse> toggleRuleActive(@PathVariable String id) {
        Rule rule = ruleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Rule not found with ID: " + id));
        rule.setIsActive(!Boolean.TRUE.equals(rule.getIsActive()));
        Rule saved = ruleRepository.save(rule);
        ruleEngine.refreshRules();
        return ResponseEntity.ok(RuleResponse.fromEntity(saved));
    }

    /**
     * Updates an existing rule's configuration parameters, weight, or description.
     *
     * @param id      Rule identifier
     * @param request Validated rule update payload
     * @return Updated Rule presentation DTO
     */
    @PutMapping("/{id}")
    public ResponseEntity<RuleResponse> updateRule(@PathVariable String id, @Valid @RequestBody RuleRequest request) {
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
        ruleEngine.refreshRules();
        return ResponseEntity.ok(RuleResponse.fromEntity(updated));
    }

    /**
     * Creates and registers a new dynamic fraud detection rule.
     *
     * @param request Validated rule creation payload
     * @return Created Rule presentation DTO with HTTP 201
     */
    @PostMapping
    public ResponseEntity<RuleResponse> createRule(@Valid @RequestBody RuleRequest request) {
        String ruleId = request.getRuleId();
        if (ruleId == null || ruleId.isBlank()) {
            ruleId = "RULE_" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        }

        if (ruleRepository.existsById(ruleId)) {
            throw new IllegalArgumentException("A rule with ID '" + ruleId + "' already exists. Use PUT /api/v1/rules/" + ruleId + " to update it.");
        }

        Rule rule = Rule.builder()
                .id(ruleId)
                .name(request.getName())
                .description(request.getDescription())
                .conditionJson(request.getConditionJson())
                .weight(request.getWeight())
                .version(1)
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .createdBy("analyst")
                .build();

        Rule saved = ruleRepository.save(rule);
        ruleEngine.refreshRules();
        return ResponseEntity.status(org.springframework.http.HttpStatus.CREATED).body(RuleResponse.fromEntity(saved));
    }
}
