package com.sentinelx.backend.service;

import com.sentinelx.backend.dto.DecisionResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Service managing real-time Server-Sent Events (SSE) subscriptions and decision broadcasts.
 * 
 * <p>Enables the Next.js frontend to receive live-streaming transaction verdicts
 * over standard HTTP without polling.</p>
 */
@Slf4j
@Service
public class DecisionStreamService {

    private static final Long EMITTER_TIMEOUT_MS = 30 * 60 * 1000L; // 30 minutes
    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    /**
     * Subscribes a new HTTP client to the live transaction decision event stream.
     *
     * @return An active {@link SseEmitter}
     */
    public SseEmitter subscribe() {
        SseEmitter emitter = new SseEmitter(EMITTER_TIMEOUT_MS);

        emitter.onCompletion(() -> {
            emitters.remove(emitter);
            log.debug("SSE client completed. Active clients: {}", emitters.size());
        });

        emitter.onTimeout(() -> {
            emitters.remove(emitter);
            log.debug("SSE client timed out. Active clients: {}", emitters.size());
        });

        emitter.onError(e -> {
            emitters.remove(emitter);
            log.debug("SSE client error: {}. Active clients: {}", e.getMessage(), emitters.size());
        });

        emitters.add(emitter);
        log.info("New SSE client subscribed. Total active clients: {}", emitters.size());

        // Send initial handshake event
        try {
            emitter.send(SseEmitter.event()
                    .name("INIT")
                    .data("Connected to SentinelX Decision Stream"));
        } catch (IOException e) {
            emitters.remove(emitter);
            log.warn("Failed to send initial handshake to SSE client: {}", e.getMessage());
        }

        return emitter;
    }

    /**
     * Broadcasts a real-time transaction decision verdict to all connected dashboard clients.
     *
     * @param decision The scored decision response payload
     */
    public void broadcast(DecisionResponse decision) {
        if (emitters.isEmpty()) {
            return;
        }

        log.debug("Broadcasting decision {} to {} active SSE clients", decision.getDecisionId(), emitters.size());
        List<SseEmitter> deadEmitters = new CopyOnWriteArrayList<>();

        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event()
                        .name("DECISION")
                        .data(decision));
            } catch (Exception e) {
                deadEmitters.add(emitter);
            }
        }

        if (!deadEmitters.isEmpty()) {
            emitters.removeAll(deadEmitters);
            log.debug("Cleaned up {} dead SSE connections. Remaining: {}", deadEmitters.size(), emitters.size());
        }
    }

    /**
     * Periodic heartbeat/keep-alive ping every 25 seconds to prevent browser/proxy connection drops.
     */
    @Scheduled(fixedRate = 25000)
    public void sendHeartbeat() {
        if (emitters.isEmpty()) {
            return;
        }

        List<SseEmitter> deadEmitters = new CopyOnWriteArrayList<>();
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event()
                        .name("PING")
                        .data("keep-alive"));
            } catch (Exception e) {
                deadEmitters.add(emitter);
            }
        }

        if (!deadEmitters.isEmpty()) {
            emitters.removeAll(deadEmitters);
        }
    }

    /**
     * Returns the current number of active streaming subscribers.
     *
     * @return Count of connected clients
     */
    public int getActiveSubscriberCount() {
        return emitters.size();
    }
}
