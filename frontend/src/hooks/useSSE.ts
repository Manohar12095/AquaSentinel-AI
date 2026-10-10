import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/appStore';

export function useSSE() {
  const { setSseConnected, updateStation, addAlert, setDashboard, dataMode } =
    useAppStore();
  const esRef = useRef<EventSource | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let retryDelay = 1000;

    function connect() {
      if (esRef.current) {
        esRef.current.close();
      }

      const baseUrl = import.meta.env.VITE_API_URL || '/api';
      const url = `${baseUrl}/stream?mode=${dataMode}`;
      const es = new EventSource(url);
      esRef.current = es;

      es.onopen = () => {
        setSseConnected(true);
        retryDelay = 1000;
      };

      es.onerror = () => {
        setSseConnected(false);
        es.close();
        // Exponential back-off: max 30s
        retryRef.current = setTimeout(() => {
          retryDelay = Math.min(retryDelay * 2, 30000);
          connect();
        }, retryDelay);
      };

      es.addEventListener('reading', (e) => {
        try {
          const data = JSON.parse(e.data);
          // Update the station's latest_readings
          updateStation({
            id: data.station_id,
            last_reading_at: data.ts,
            latest_readings: { ...data.readings },
          } as Parameters<typeof updateStation>[0]);
        } catch {}
      });

      es.addEventListener('station_status', (e) => {
        try {
          const data = JSON.parse(e.data);
          updateStation({ id: data.station_id, status: data.status });
        } catch {}
      });

      es.addEventListener('alert', (e) => {
        try {
          const alert = JSON.parse(e.data);
          addAlert(alert);
        } catch {}
      });

      es.addEventListener('dashboard', (e) => {
        try {
          const summary = JSON.parse(e.data);
          setDashboard(summary);
        } catch {}
      });
    }

    connect();

    return () => {
      if (retryRef.current) clearTimeout(retryRef.current);
      esRef.current?.close();
      setSseConnected(false);
    };
  }, [dataMode, setSseConnected, updateStation, addAlert, setDashboard]);
}
