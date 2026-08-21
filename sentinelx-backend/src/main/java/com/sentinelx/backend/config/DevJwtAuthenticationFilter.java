package com.sentinelx.backend.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Base64;
import java.util.List;

/**
 * JWT and Development Demo Authentication Filter for SentinelX.
 * 
 * <p>Supports:
 * 1. 1-Click Demo Analyst mode tokens ('dev_analyst_token', 'dev_admin_token') for local evaluation and demos.
 * 2. OAuth 2.0 JWT ID tokens forwarded from NextAuth.js frontend with payload inspection.</p>
 */
@Component
public class DevJwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(DevJwtAuthenticationFilter.class);
    private final ObjectMapper objectMapper;
    private final Environment environment;

    @Value("${sentinelx.auth.demo-tokens-enabled:true}")
    private boolean demoTokensEnabled;

    public DevJwtAuthenticationFilter(ObjectMapper objectMapper, Environment environment) {
        this.objectMapper = objectMapper;
        this.environment = environment;
    }

    private boolean isDevOrDemoAllowed() {
        if (!demoTokensEnabled) {
            return false;
        }
        String[] activeProfiles = environment.getActiveProfiles();
        if (activeProfiles == null || activeProfiles.length == 0) {
            return true; // default profile
        }
        return Arrays.stream(activeProfiles).anyMatch(p -> 
            p.equalsIgnoreCase("dev") || p.equalsIgnoreCase("local") || 
            p.equalsIgnoreCase("test") || p.equalsIgnoreCase("default")
        );
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        if (authHeader != null && authHeader.startsWith("Bearer ") && isDevOrDemoAllowed()) {
            String token = authHeader.substring(7).trim();

            if ("dev_analyst_token".equalsIgnoreCase(token)) {
                // 1-Click Demo Analyst Login
                UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                        "analyst@sentinelx.io",
                        null,
                        List.of(new SimpleGrantedAuthority("ROLE_ANALYST"))
                );
                SecurityContextHolder.getContext().setAuthentication(auth);
                log.debug("Authenticated via Demo Analyst token: analyst@sentinelx.io");
            } else if ("dev_admin_token".equalsIgnoreCase(token)) {
                // 1-Click Demo Admin Login
                UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                        "admin@sentinelx.io",
                        null,
                        List.of(new SimpleGrantedAuthority("ROLE_ANALYST"), new SimpleGrantedAuthority("ROLE_ADMIN"))
                );
                SecurityContextHolder.getContext().setAuthentication(auth);
                log.debug("Authenticated via Demo Admin token: admin@sentinelx.io");
            } else if (token.contains(".")) {
                // Parse JWT payload (Google ID token or signed standard JWT in dev/demo mode)
                try {
                    String[] parts = token.split("\\.");
                    if (parts.length >= 2) {
                        byte[] decoded = Base64.getUrlDecoder().decode(parts[1]);
                        JsonNode claims = objectMapper.readTree(new String(decoded, StandardCharsets.UTF_8));
                        
                        // Verify token expiration if 'exp' claim is present
                        if (claims.has("exp")) {
                            long expSeconds = claims.get("exp").asLong();
                            long nowSeconds = System.currentTimeMillis() / 1000;
                            if (nowSeconds > expSeconds) {
                                log.warn("Rejected expired JWT token (exp: {}, now: {})", expSeconds, nowSeconds);
                                filterChain.doFilter(request, response);
                                return;
                            }
                        }

                        String email = claims.has("email") ? claims.get("email").asText() : null;

                        if (email != null && !email.isBlank()) {
                            UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                                    email,
                                    null,
                                    List.of(new SimpleGrantedAuthority("ROLE_ANALYST"))
                            );
                            SecurityContextHolder.getContext().setAuthentication(auth);
                            log.debug("Authenticated via OAuth JWT for: {}", email);
                        }
                    }
                } catch (Exception e) {
                    log.warn("Failed to parse JWT payload: {}", e.getMessage());
                }
            }
        }

        filterChain.doFilter(request, response);
    }
}
