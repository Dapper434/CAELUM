import { useMemo } from 'react';
import { listFacilities } from '../lib/api/facilities';
import { useApiData } from './useApiData';

/** id → facility name lookup for tables that only carry ids. */
export function useFacilityNames() {
  const { data } = useApiData(() => listFacilities(), []);
  return useMemo(() => {
    const map = Object.fromEntries((data || []).map((f) => [f.id, f.name]));
    return (id) => (id ? map[id] || `${id.slice(0, 8)}…` : '—');
  }, [data]);
}
