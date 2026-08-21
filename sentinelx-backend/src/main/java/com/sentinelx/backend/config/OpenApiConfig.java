package com.sentinelx.backend.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * OpenAPI 3.0 specification & Swagger UI configuration for SentinelX.
 */
@Configuration
public class OpenApiConfig {

    private static final String SECURITY_SCHEME_NAME = "BearerAuth";

    @Bean
    public OpenAPI sentinelxOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("SentinelX Real-Time Fraud & Risk Decisioning API")
                        .description("High-throughput synchronous fraud scoring, dynamic rule engine, sliding-window velocity telemetry, and backtesting simulation engine.")
                        .version("1.0.0 LTS")
                        .contact(new Contact()
                                .name("SentinelX Core Risk Team")
                                .email("security@sentinelx.io"))
                        .license(new License().name("Apache 2.0").url("https://sentinelx.io/license")))
                .addSecurityItem(new SecurityRequirement().addList(SECURITY_SCHEME_NAME))
                .components(new Components()
                        .addSecuritySchemes(SECURITY_SCHEME_NAME, new SecurityScheme()
                                .name(SECURITY_SCHEME_NAME)
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("Enter standard Google OAuth2 JWT token or SentinelX Dev 1-Click token (e.g. 'dev_analyst_token', 'dev_admin_token')")));
    }
}
