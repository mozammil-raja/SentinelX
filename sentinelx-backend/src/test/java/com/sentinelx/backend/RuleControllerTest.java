package com.sentinelx.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sentinelx.backend.controller.RuleController;
import com.sentinelx.backend.dto.RuleRequest;
import com.sentinelx.backend.entity.Rule;
import com.sentinelx.backend.exception.GlobalExceptionHandler;
import com.sentinelx.backend.repository.RuleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * HTTP and Controller integration test suite verifying the dynamic RuleController REST endpoints.
 */
@SpringBootTest
@ActiveProfiles("test")
class RuleControllerTest {

    @Autowired
    private RuleRepository ruleRepository;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        RuleController controller = new RuleController(ruleRepository);
        MappingJackson2HttpMessageConverter converter = new MappingJackson2HttpMessageConverter(objectMapper);

        this.mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setMessageConverters(converter)
                .build();
    }

    @Test
    @DisplayName("HTTP 200: Successfully fetch all dynamic rules")
    void testGetAllRules() throws Exception {
        mockMvc.perform(get("/api/v1/rules"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(5))))
                .andExpect(jsonPath("$[0].id", notNullValue()));
    }

    @Test
    @DisplayName("HTTP 200: Successfully fetch specific rule by ID")
    void testGetRuleById() throws Exception {
        mockMvc.perform(get("/api/v1/rules/RULE_01"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is("RULE_01")))
                .andExpect(jsonPath("$.name", is("High Velocity (5m)")));
    }

    @Test
    @DisplayName("HTTP 200: Successfully toggle rule active state on/off")
    void testToggleRule() throws Exception {
        Rule rule = ruleRepository.findById("RULE_02").orElseThrow();
        boolean originalStatus = Boolean.TRUE.equals(rule.getIsActive());

        // Toggle
        mockMvc.perform(put("/api/v1/rules/RULE_02/toggle"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isActive", is(!originalStatus)));

        // Revert toggle
        mockMvc.perform(put("/api/v1/rules/RULE_02/toggle"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isActive", is(originalStatus)));
    }

    @Test
    @DisplayName("HTTP 200: Successfully update rule weight and parameters")
    void testUpdateRule() throws Exception {
        Rule original = ruleRepository.findById("RULE_01").orElseThrow();

        RuleRequest updateRequest = RuleRequest.builder()
                .name("High Velocity (5m) Updated")
                .description("Updated velocity description")
                .conditionJson("{\"window\": 300, \"limit\": 7}")
                .weight(45)
                .isActive(true)
                .build();

        try {
            mockMvc.perform(put("/api/v1/rules/RULE_01")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(updateRequest)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.weight", is(45)))
                    .andExpect(jsonPath("$.name", is("High Velocity (5m) Updated")));
        } finally {
            RuleRequest restore = RuleRequest.builder()
                    .name(original.getName())
                    .description(original.getDescription())
                    .conditionJson(original.getConditionJson())
                    .weight(original.getWeight())
                    .isActive(original.getIsActive())
                    .build();

            mockMvc.perform(put("/api/v1/rules/RULE_01")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(restore)));
        }
    }
}
