import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Loads data from an API call, with reload and optional polling.
 * `loader` should be stable for the given `deps`.
 */
export function useApiData(loader, deps = [], { pollMs = 0, enabled = true } = {}) {
  const [state, setState] = useState({ data: null, error: null, loading: enabled });
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const seq = useRef(0);

  const reload = useCallback(async () => {
    const id = ++seq.current;
    setState((s) => ({ ...s, loading: true }));
    try {
      const data = await loaderRef.current();
      if (id === seq.current) setState({ data, error: null, loading: false });
      return data;
    } catch (error) {
      if (id === seq.current) setState((s) => ({ data: s.data, error, loading: false }));
      return null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    reload();
    if (!pollMs) return undefined;
    const timer = setInterval(reload, pollMs);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, pollMs, reload, ...deps]);

  return { ...state, reload, setData: (data) => setState((s) => ({ ...s, data })) };
}

/** Re-renders every `ms` so countdowns stay current. */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}
