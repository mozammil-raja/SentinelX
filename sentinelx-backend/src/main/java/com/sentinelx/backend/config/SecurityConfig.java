package com.sentinelx.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Enterprise Spring Security configuration for SentinelX.
 * 
 * <p>Enforces stateless JWT/OAuth2 authentication while maintaining open access
 * for high-throughput public payment ingestion and live SSE monitor feeds.</p>
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final DevJwtAuthenticationFilter devJwtAuthenticationFilter;

    public SecurityConfig(DevJwtAuthenticationFilter devJwtAuthenticationFilter) {
        this.devJwtAuthenticationFilter = devJwtAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // 1. Disable CSRF for stateless REST API architecture
                .csrf(AbstractHttpConfigurer::disable)
                // 2. Enable CORS with defaults from WebCorsConfig
                .cors(Customizer.withDefaults())
                // 3. Enforce stateless session policy
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // 4. Authorization rules
                .authorizeHttpRequests(auth -> auth
                        // Preflight OPTIONS requests always permitted
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // Public Ingestion, Telemetry & OpenAPI Documentation
                        .requestMatchers(HttpMethod.POST, "/api/v1/transactions").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/decisions/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/velocity/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/transactions/**").permitAll()
                        .requestMatchers("/api/v1/backtest/**").permitAll()
                        .requestMatchers("/api/v1/graph/**").permitAll()
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()

                        // Read-Only Rule & Queue inquiries permitted for live monitoring
                        .requestMatchers(HttpMethod.GET, "/api/v1/rules/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/reviews/**").permitAll()

                        // Protected Administrative / Analyst Actions (Require ROLE_ANALYST / Authentication)
                        .requestMatchers(HttpMethod.PUT, "/api/v1/rules/**").hasAnyRole("ANALYST", "ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/v1/rules/**").hasAnyRole("ANALYST", "ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/v1/reviews/*/resolve").hasAnyRole("ANALYST", "ADMIN")

                        // Any other request requires authentication
                        .anyRequest().authenticated()
                )
                // 5. Add custom JWT/Demo authentication filter before standard password filter
                .addFilterBefore(devJwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
