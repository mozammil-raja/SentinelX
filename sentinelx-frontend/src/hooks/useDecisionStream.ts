'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE_URL, DecisionResponse } from '@/lib/api';

export type StreamStatus = 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED';

export function useDecisionStream() {
  const [decisions, setDecisions] = useState<DecisionResponse[]>([]);
  const [status, setStatus] = useState<StreamStatus>('CONNECTING');
  const [lastPing, setLastPing] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectRef = useRef<() => void>(() => {});

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = `${API_BASE_URL}/api/v1/decisions/stream`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.addEventListener('open', () => {
      setStatus('CONNECTED');
    });

    es.addEventListener('INIT', () => {
      setStatus('CONNECTED');
    });

    es.addEventListener('DECISION', (event) => {
      try {
        const payload: DecisionResponse = JSON.parse(event.data);
        setDecisions((prev) => [payload, ...prev.slice(0, 49)]); // Keep latest 50
      } catch (err) {
        console.error('Failed to parse SSE decision event:', err);
      }
    });

    es.addEventListener('PING', () => {
      setLastPing(new Date().toLocaleTimeString());
    });

    es.addEventListener('error', () => {
      setStatus('DISCONNECTED');
      es.close();

      // Exponential auto-reconnect attempt after 3s
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      reconnectTimeoutRef.current = setTimeout(() => {
        setStatus('CONNECTING');
        connectRef.current();
      }, 3000);
    });
  }, []);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  const clearDecisions = useCallback(() => {
    setDecisions([]);
  }, []);

  return {
    status,
    decisions,
    lastPing,
    clearDecisions,
    reconnect: connect,
  };
}
