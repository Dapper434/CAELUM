import { useCallback, useEffect, useRef, useState } from 'react';
import { getForecastRun, isRunActive, runForecast } from '../lib/api/forecast';

export const FORECAST_POLL_MS = 3000;

/**
 * Starts a forecast run and polls GET /forecast/runs/{job_id} until it
 * succeeds or fails. `onSucceeded(run)` fires once per finished job.
 * Polling stops on unmount, on a 404 and on any other error.
 */
export function useForecastRun({ onSucceeded, pollMs = FORECAST_POLL_MS } = {}) {
  const [run, setRun] = useState(null);
  const [error, setError] = useState(null);
  const [starting, setStarting] = useState(false);
  const timer = useRef(null);
  const alive = useRef(true);
  const onSucceededRef = useRef(onSucceeded);
  onSucceededRef.current = onSucceeded;

  const stop = () => { clearTimeout(timer.current); timer.current = null; };
  useEffect(() => { alive.current = true; return () => { alive.current = false; stop(); }; }, []);

  const track = useCallback((job) => {
    if (!alive.current) return;
    setRun(job);
    if (isRunActive(job)) {
      stop();
      timer.current = setTimeout(async () => {
        try {
          const next = await getForecastRun(job.job_id);
          track(next);
        } catch (err) {
          if (!alive.current) return;
          setError(err.status === 404
            ? { code: 'not_found', message: 'The forecast job could not be found any more (it may have been cleared after a redeploy). Run the forecast again.' }
            : err);
          setRun(null);
        }
      }, pollMs);
    } else if (job?.status === 'succeeded') {
      onSucceededRef.current?.(job);
    }
  }, [pollMs]);

  const start = useCallback(async (facilityId) => {
    stop();
    setError(null); setStarting(true);
    try {
      track(await runForecast(facilityId));
    } catch (err) {
      if (alive.current) setError(err);
    } finally {
      if (alive.current) setStarting(false);
    }
  }, [track]);

  return { run, error, start, active: starting || isRunActive(run) };
}
