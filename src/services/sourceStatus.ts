import { useSyncExternalStore } from 'react';
import type { SourceStatus, SourceStatusState } from '../types';

export type SourceId =
  | 'world-bank'
  | 'world-bank-countries'
  | 'rest-countries'
  | 'unesco'
  | 'owid'
  | 'who'
  | 'country-catalog';

const HAS_BACKEND = Boolean(import.meta.env.VITE_API_BASE_URL);

/** Every source the app can use, in display order, with its state before any request runs. */
function initialStatuses(): SourceStatus[] {
  const idle = (id: SourceId, name: string, detail: string, freshness: string): SourceStatus => ({
    id,
    name,
    detail,
    freshness,
    fetchStatus: 'idle',
    lastFetched: 'Not requested yet',
    note: 'Loads when an indicator from this source is selected.',
  });

  return [
    idle('world-bank', 'World Bank WDI', 'Population, GDP, health and education indicators', 'Live API'),
    idle('world-bank-countries', 'World Bank countries', 'Live region, income group and capital', 'Live API'),
    HAS_BACKEND
      ? idle('rest-countries', 'REST Countries', 'Languages, currency, area, borders (v5)', 'Backend API')
      : {
          id: 'rest-countries',
          name: 'REST Countries',
          detail: 'Languages, currency, area, borders',
          freshness: 'Backend only',
          fetchStatus: 'inactive',
          lastFetched: 'Not configured',
          note: 'Requires an API key, which must stay on the backend (REST_COUNTRIES_API_KEY).',
        },
    idle('unesco', 'UNESCO UIS', 'Education: completion, out-of-school, literacy, spending', 'Live API'),
    idle('owid', 'Our World in Data', 'Long-run life expectancy, child mortality, CO2', 'Live API'),
    HAS_BACKEND
      ? idle('who', 'WHO GHO', 'Health indicators through the backend', 'Backend API')
      : {
          id: 'who',
          name: 'WHO GHO',
          detail: 'Health indicators',
          freshness: 'Backend only',
          fetchStatus: 'inactive',
          lastFetched: 'Not configured',
          note: 'The WHO API blocks browser requests; set VITE_API_BASE_URL to use the backend.',
        },
    {
      id: 'country-catalog',
      name: 'Country catalog',
      detail: 'Bundled fallback metadata',
      freshness: 'Static',
      fetchStatus: 'success',
      lastFetched: 'Bundled with app',
      note: 'Used instantly and whenever a live source is unavailable.',
    },
  ];
}

let statuses = initialStatuses();
const listeners = new Set<() => void>();

export function recordSourceResult(id: SourceId, fetchStatus: SourceStatusState, note: string) {
  statuses = statuses.map((status) =>
    status.id === id ? { ...status, fetchStatus, note, lastFetched: new Date().toISOString() } : status,
  );
  listeners.forEach((listener) => listener());
}

export function resetSourceStatuses() {
  statuses = initialStatuses();
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSourceStatuses(): SourceStatus[] {
  return useSyncExternalStore(subscribe, () => statuses);
}
