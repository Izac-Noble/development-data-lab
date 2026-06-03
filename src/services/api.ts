import { getCountryProfile } from '../data/countries';
import { getIndicatorDefinition } from '../data/indicators';
import type { CountryProfile, IndicatorObservation, IndicatorSeries, SourceStatus } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '';

interface WorldBankRow {
  indicator?: { id?: string; value?: string };
  country?: { id?: string; value?: string };
  value: number | null;
  date: string;
}

interface BackendSeriesResponse {
  country?: CountryProfile;
  indicator?: {
    id: string;
    name: string;
    shortName?: string;
    unit: string;
    source: string;
    description?: string;
    sourceUrl?: string;
  };
  observations: IndicatorObservation[];
  status?: SourceStatus;
}

export async function fetchCountryProfile(code: string): Promise<CountryProfile> {
  if (!API_BASE_URL) {
    return getCountryProfile(code);
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/countries/${code}`);
    if (!response.ok) {
      throw new Error(`Country metadata returned HTTP ${response.status}`);
    }

    return response.json();
  } catch {
    return getCountryProfile(code);
  }
}

export async function fetchIndicatorSeries(
  countryCode: string,
  indicatorId: string,
  startYear = 1960,
  endYear = new Date().getFullYear(),
): Promise<IndicatorSeries> {
  if (API_BASE_URL) {
    try {
      const params = new URLSearchParams({
        start_year: String(startYear),
        end_year: String(endYear),
      });
      const response = await fetch(
        `${API_BASE_URL}/api/world-bank/${countryCode}/${indicatorId}?${params.toString()}`,
      );
      if (!response.ok) {
        throw new Error(`World Bank endpoint returned HTTP ${response.status}`);
      }
      const payload: BackendSeriesResponse = await response.json();
      const indicator = getIndicatorDefinition(indicatorId);
      return {
        country: payload.country ?? getCountryProfile(countryCode),
        indicator: {
          ...indicator,
          ...payload.indicator,
          shortName: payload.indicator?.shortName ?? indicator.shortName,
          description: payload.indicator?.description ?? indicator.description,
          sourceUrl: payload.indicator?.sourceUrl ?? indicator.sourceUrl,
        },
        observations: payload.observations,
        status:
          payload.status ??
          buildSourceStatus('world-bank', 'World Bank', 'WDI', 'success', 'Backend fetch succeeded'),
      };
    } catch {
      return fetchWorldBankDirect(countryCode, indicatorId, startYear, endYear);
    }
  }

  return fetchWorldBankDirect(countryCode, indicatorId, startYear, endYear);
}

export async function fetchSourceStatuses(): Promise<SourceStatus[]> {
  if (API_BASE_URL) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sources/status`);
      if (response.ok) {
        return response.json();
      }
    } catch {
      return localSourceStatuses();
    }
  }

  return localSourceStatuses();
}

async function fetchWorldBankDirect(
  countryCode: string,
  indicatorId: string,
  startYear: number,
  endYear: number,
): Promise<IndicatorSeries> {
  const country = getCountryProfile(countryCode);
  const indicator = getIndicatorDefinition(indicatorId);
  const url = `https://api.worldbank.org/v2/country/${countryCode}/indicator/${indicatorId}?format=json&date=${startYear}:${endYear}&per_page=200`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`World Bank returned HTTP ${response.status}`);
  }

  const payload = (await response.json()) as [unknown, WorldBankRow[]];
  const rows = Array.isArray(payload?.[1]) ? payload[1] : [];
  const observations = normalizeWorldBankRows(rows, indicator.id, indicator.unit, indicator.sourceUrl);

  return {
    country,
    indicator,
    observations,
    status: buildSourceStatus(
      'world-bank',
      'World Bank',
      `WDI (${indicator.id})`,
      observations.length > 0 ? 'success' : 'partial',
      observations.length > 0 ? 'Direct fetch succeeded' : 'No observations returned',
    ),
  };
}

function normalizeWorldBankRows(
  rows: WorldBankRow[],
  sourceId: string,
  unit: string,
  sourceUrl: string,
): IndicatorObservation[] {
  return rows
    .filter((row) => row.value !== null)
    .map((row) => ({
      year: Number(row.date),
      value: Number(row.value),
      unit,
      source: 'World Bank WDI',
      sourceId,
      sourceUrl,
      note: 'Estimate',
    }))
    .filter((row) => Number.isFinite(row.year) && Number.isFinite(row.value))
    .sort((a, b) => b.year - a.year);
}

function buildSourceStatus(
  id: string,
  name: string,
  detail: string,
  fetchStatus: SourceStatus['fetchStatus'],
  note: string,
): SourceStatus {
  return {
    id,
    name,
    detail,
    freshness: fetchStatus === 'success' ? 'Current response' : 'Check source',
    fetchStatus,
    lastFetched: new Date().toISOString(),
    note,
  };
}

function localSourceStatuses(): SourceStatus[] {
  return [
    {
      id: 'world-bank',
      name: 'World Bank',
      detail: 'World Development Indicators',
      freshness: 'Live API',
      fetchStatus: 'success',
      lastFetched: new Date().toISOString(),
      note: 'Primary source for default indicators.',
    },
    {
      id: 'country-catalog',
      name: 'Country catalog',
      detail: 'Bundled metadata',
      freshness: 'Static',
      fetchStatus: 'success',
      lastFetched: 'Bundled with app',
      note: 'Keeps frontend-only mode reliable.',
    },
    {
      id: 'rest-countries',
      name: 'REST Countries',
      detail: 'Optional backend enrichment',
      freshness: 'Backend only',
      fetchStatus: API_BASE_URL ? 'partial' : 'inactive',
      lastFetched: API_BASE_URL ? new Date().toISOString() : 'Not configured',
      note: 'Use the FastAPI backend when browser requests are blocked.',
    },
    {
      id: 'who',
      name: 'WHO',
      detail: 'Optional health indicators',
      freshness: 'Backend only',
      fetchStatus: API_BASE_URL ? 'partial' : 'inactive',
      lastFetched: API_BASE_URL ? new Date().toISOString() : 'Not configured',
      note: 'Available through the typed backend endpoint.',
    },
    {
      id: 'unesco',
      name: 'UNESCO UIS',
      detail: 'Education source under review',
      freshness: 'Inactive',
      fetchStatus: 'inactive',
      lastFetched: 'Not active',
      note: 'Current endpoint needs revalidation before production use.',
    },
  ];
}
