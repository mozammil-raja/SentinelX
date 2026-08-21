package com.sentinelx.backend.controller;

import com.sentinelx.backend.service.DecisionStreamService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * REST controller exposing real-time Server-Sent Events (SSE) streaming endpoints.
 * 
 * <p>Clients establish a persistent HTTP stream via {@code GET /api/v1/decisions/stream}
 * to receive live transaction verdicts as they are scored by the dynamic rule engine.</p>
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/decisions")
@RequiredArgsConstructor
public class DecisionStreamController {

    private final DecisionStreamService decisionStreamService;

    /**
     * Establishes a persistent Server-Sent Events (SSE) connection.
     *
     * @return SseEmitter streaming real-time decision payloads
     */
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public ResponseEntity<SseEmitter> streamDecisions() {
        log.info("Client requested SSE decision stream connection");
        SseEmitter emitter = decisionStreamService.subscribe();

        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.CACHE_CONTROL, "no-cache, no-transform");
        headers.set("X-Accel-Buffering", "no"); // Prevents Nginx/proxy buffering

        return ResponseEntity.ok()
                .headers(headers)
                .body(emitter);
    }
}
