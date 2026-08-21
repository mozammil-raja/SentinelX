package com.sentinelx.backend;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SecurityControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("Security: Public transaction ingestion succeeds without auth token")
    void testPublicIngestionPermitted() throws Exception {
        String payload = """
                {
                    "userId": "usr_sec_public",
                    "email": "public@example.com",
                    "amount": 25.00,
                    "currency": "USD",
                    "merchantId": "mer_safe",
                    "ipAddress": "198.51.100.1"
                }
                """;

        mockMvc.perform(post("/api/v1/transactions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Security: Rule toggle without token returns 403 Forbidden")
    void testRuleToggleProtectedWithoutAuth() throws Exception {
        mockMvc.perform(put("/api/v1/rules/RULE_01/toggle"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Security: Rule toggle with Demo Analyst token succeeds with 200 OK")
    void testRuleToggleWithAnalystToken() throws Exception {
        mockMvc.perform(put("/api/v1/rules/RULE_01/toggle")
                        .header("Authorization", "Bearer dev_analyst_token"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Security: Rule toggle with invalid malformed bearer token returns 403 Forbidden")
    void testRuleToggleWithInvalidTokenReturnsForbidden() throws Exception {
        mockMvc.perform(put("/api/v1/rules/RULE_01/toggle")
                        .header("Authorization", "Bearer invalid_malformed_token_xyz"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Security: Review resolve without token returns 403 Forbidden")
    void testReviewResolveProtectedWithoutAuth() throws Exception {
        mockMvc.perform(post("/api/v1/reviews/999/resolve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "status": "APPROVED",
                                    "reviewerId": "anon",
                                    "notes": "unauthorized attempt"
                                }
                                """))
                .andExpect(status().isForbidden());
    }
}
