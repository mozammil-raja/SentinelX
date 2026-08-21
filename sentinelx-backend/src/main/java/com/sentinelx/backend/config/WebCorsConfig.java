package com.sentinelx.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Centralized Cross-Origin Resource Sharing (CORS) security configuration.
 * 
 * <p>Restricts allowed origins to trusted frontend hosts (defaulting to http://localhost:3000)
 * while allowing standard REST verbs and headers.</p>
 */
@Configuration
public class WebCorsConfig implements WebMvcConfigurer {

    @Value("${sentinelx.cors.allowed-origins:http://localhost:3000,http://localhost:3001}")
    private String[] allowedOrigins;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(allowedOrigins)
                .allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600);
    }
}
