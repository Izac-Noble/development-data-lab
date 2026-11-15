import { findCountryProfile, getCountryProfile } from '../data/countries';
import { getIndicatorDefinition } from '../data/indicators';
import type { CountryProfile, IndicatorDefinition, IndicatorObservation, IndicatorSeries, SourceStatus } from '../types';
import { recordSourceResult } from './sourceStatus';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '';

/**
 * Series are always fetched for the full available range and sliced locally, so changing
 * the year range never costs a network round trip.
 */
const FULL_RANGE_START = 1960;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const STORAGE_PREFIX = 'ddl:series:v2:';
const COUNTRY_META_KEY = 'ddl:countries:v1';
const COUNTRY_META_TTL_MS = 24 * 60 * 60 * 1000;

interface WorldBankRow {
  countryiso3code?: string;
  value: number | null;
  date: string;
}

interface UnescoResponse {
  hints?: Array<{ message: string }>;
  records?: Array<{ geoUnit: string; year: number; value: number | null; qualifier?: string | null }>;
}

interface WorldBankCountryRow {
  id: string;
  region?: { value?: string };
  incomeLevel?: { value?: string };
  capitalCity?: string;
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

const RETRY_DELAYS_MS = [400, 1200];
const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);
/** World Bank occasionally stalls a request indefinitely; a fresh attempt usually answers quickly. */
const REQUEST_TIMEOUT_MS = 25_000;

/**
 * fetch() with a per-attempt timeout and retries for temporary upstream failures (World Bank in
 * particular returns intermittent 502s and sometimes stalls). Client errors such as 404 are
 * returned straight away.
 */
async function fetchWithRetry(url: string): Promise<Response> {
  for (let attempt = 0; ; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!RETRYABLE_STATUSES.has(response.status) || attempt >= RETRY_DELAYS_MS.length) {
        return response;
      }
    } catch (error) {
      if (attempt >= RETRY_DELAYS_MS.length) {
        throw controller.signal.aborted ? new Error('Request timed out') : error;
      }
    } finally {
      clearTimeout(timer);
    }
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
  }
}

/** A series covering every available year, before slicing to the user's range. */
type FullSeries = IndicatorSeries;

/** In-flight and settled requests, shared by every caller so duplicates collapse into one. */
const memoryCache = new Map<string, Promise<FullSeries>>();

function cacheKey(countryCode: string, indicatorId: string): string {
  return `${API_BASE_URL || 'direct'}:${countryCode}:${indicatorId}`;
}

function readStored(key: string): FullSeries | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) {
      return undefined;
    }
    const entry = JSON.parse(raw) as { savedAt: number; series: FullSeries };
    if (Date.now() - entry.savedAt > CACHE_TTL_MS) {
      localStorage.removeItem(STORAGE_PREFIX + key);
      return undefined;
    }
    return entry.series;
  } catch {
    return undefined;
  }
}

function writeStored(key: string, series: FullSeries) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify({ savedAt: Date.now(), series }));
  } catch {
    // Storage full or unavailable: the in-memory cache still works.
  }
}

/** Stores a pending request; failures are evicted so the next call retries. */
function remember(key: string, request: Promise<FullSeries>): Promise<FullSeries> {
  const tracked = request.then(
    (series) => {
      if (series.observations.length > 0) {
        writeStored(key, series);
      }
      return series;
    },
    (error: unknown) => {
      memoryCache.delete(key);
      throw error;
    },
  );
  memoryCache.set(key, tracked);
  return tracked;
}

function cached(key: string): Promise<FullSeries> | undefined {
  const pending = memoryCache.get(key);
  if (pending) {
    return pending;
  }
  const stored = readStored(key);
  if (stored) {
    recordSourceResult(stored.indicator.provider, 'success', 'Served from local cache (refreshes every 6 hours)');
    const resolved = Promise.resolve(stored);
    memoryCache.set(key, resolved);
    return resolved;
  }
  return undefined;
}

/** Drops cached data for one series so the next fetch goes to the network (used by "Run"). */
export function invalidateSeries(countryCode: string, indicatorId: string) {
  const key = cacheKey(countryCode, indicatorId);
  memoryCache.delete(key);
  try {
    localStorage.removeItem(STORAGE_PREFIX + key);
  } catch {
    // Ignore unavailable storage.
  }
}

export function clearSeriesCache() {
  memoryCache.clear();
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(STORAGE_PREFIX))
      .forEach((key) => localStorage.removeItem(key));
  } catch {
    // Ignore unavailable storage.
  }
}

export async function fetchIndicatorSeries(
  countryCode: string,
  indicatorId: string,
  startYear = FULL_RANGE_START,
  endYear = new Date().getFullYear(),
): Promise<IndicatorSeries> {
  const key = cacheKey(countryCode, indicatorId);
  const full = await (cached(key) ?? remember(key, fetchFullSeries(countryCode, indicatorId)));
  return sliceSeries(full, startYear, endYear);
}

/**
 * Fetches several countries for one indicator. In frontend-only mode the World Bank API
 * returns them all in a single request; already-cached countries are not requested again.
 */
export async function fetchIndicatorSeriesBatch(
  countryCodes: string[],
  indicatorId: string,
  startYear = FULL_RANGE_START,
  endYear = new Date().getFullYear(),
): Promise<IndicatorSeries[]> {
  const missing = countryCodes.filter((code) => !cached(cacheKey(code, indicatorId)));
  const indicator = getIndicatorDefinition(indicatorId);

  if (missing.length > 1 && canBatchDirectly(indicator)) {
    const batch = fetchFromProvider(indicator, missing);
    missing.forEach((code) => {
      remember(
        cacheKey(code, indicatorId),
        batch.then((byCountry) => byCountry.get(code) ?? emptySeries(code, indicatorId)),
      );
    });
  }

  return Promise.all(
    countryCodes.map((code) => fetchIndicatorSeries(code, indicatorId, startYear, endYear)),
  );
}

/** World Bank goes through the backend when one is configured; UNESCO and OWID allow browser requests. */
/**
 * World Bank, UNESCO and OWID all allow browser requests, so they are always fetched directly, even
 * with a backend: proxying adds a hop, loses batching, and queues behind the browser's
 * six-connection limit for the backend's origin. Only WHO (blocks browsers) uses the backend.
 */
function canBatchDirectly(indicator: IndicatorDefinition): boolean {
  return indicator.provider !== 'who';
}

async function fetchFullSeries(countryCode: string, indicatorId: string): Promise<FullSeries> {
  const indicator = getIndicatorDefinition(indicatorId);

  if (indicator.provider === 'who') {
    const byCountry = await withStatus('who', [countryCode], () => fetchWhoFromBackend(countryCode, indicatorId));
    return byCountry.get(countryCode) ?? emptySeries(countryCode, indicatorId);
  }

  const byCountry = await fetchFromProvider(indicator, [countryCode]);
  return byCountry.get(countryCode) ?? emptySeries(countryCode, indicatorId);
}

/** One direct request for any number of countries, reported to the Source trace. */
function fetchFromProvider(indicator: IndicatorDefinition, countryCodes: string[]): Promise<Map<string, FullSeries>> {
  switch (indicator.provider) {
    case 'unesco':
      return withStatus('unesco', countryCodes, () => fetchUnesco(countryCodes, indicator));
    case 'owid':
      return withStatus('owid', countryCodes, () => fetchOwid(countryCodes, indicator));
    default:
      return withStatus('world-bank', countryCodes, () => fetchWorldBankDirect(countryCodes, indicator.id));
  }
}

async function withStatus(
  sourceId: IndicatorDefinition['provider'],
  countryCodes: string[],
  request: () => Promise<Map<string, FullSeries>>,
): Promise<Map<string, FullSeries>> {
  try {
    const byCountry = await request();
    const withData = countryCodes.filter((code) => (byCountry.get(code)?.observations.length ?? 0) > 0);
    const indicatorId = byCountry.values().next().value?.indicator.id ?? '';
    if (withData.length === countryCodes.length) {
      recordSourceResult(sourceId, 'success', `${indicatorId}: data for ${countryCodes.join(', ')}`);
    } else {
      const without = countryCodes.filter((code) => !withData.includes(code));
      recordSourceResult(sourceId, 'partial', `${indicatorId}: no data for ${without.join(', ')}`);
    }
    return byCountry;
  } catch (error) {
    recordSourceResult(sourceId, 'error', error instanceof Error ? error.message : 'Request failed');
    throw error;
  }
}

function seriesByCountry(
  countryCodes: string[],
  indicator: IndicatorDefinition,
  observationsFor: (code: string) => IndicatorObservation[],
): Map<string, FullSeries> {
  return new Map(
    countryCodes.map((code) => {
      const observations = observationsFor(code)
        .filter((row) => Number.isFinite(row.year) && Number.isFinite(row.value))
        .sort((a, b) => b.year - a.year);
      return [
        code,
        {
          country: getCountryProfile(code),
          indicator,
          observations,
          status: buildSourceStatus(
            indicator.provider,
            indicator.source,
            indicator.id,
            observations.length > 0 ? 'success' : 'partial',
            observations.length > 0 ? 'Live response' : 'No observations returned',
          ),
        },
      ];
    }),
  );
}

async function fetchUnesco(countryCodes: string[], indicator: IndicatorDefinition): Promise<Map<string, FullSeries>> {
  const params = new URLSearchParams({ indicator: indicator.id });
  countryCodes.forEach((code) => params.append('geoUnit', code));
  const response = await fetchWithRetry(`https://api.uis.unesco.org/api/public/data/indicators?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`UNESCO UIS returned HTTP ${response.status}`);
  }
  const payload = (await response.json()) as UnescoResponse;
  const records = payload.records ?? [];
  if (records.length === 0 && payload.hints?.length) {
    throw new Error(payload.hints[0].message);
  }

  return seriesByCountry(countryCodes, indicator, (code) =>
    records
      .filter((record) => record.geoUnit === code && record.value !== null)
      .map((record) => ({
        year: record.year,
        value: Number(record.value),
        unit: indicator.unit,
        source: indicator.source,
        sourceId: indicator.id,
        sourceUrl: indicator.sourceUrl,
        note: record.qualifier || 'Reported',
      })),
  );
}

async function fetchOwid(countryCodes: string[], indicator: IndicatorDefinition): Promise<Map<string, FullSeries>> {
  const params = new URLSearchParams({ country: countryCodes.join('~'), csvType: 'filtered', useColumnShortNames: 'true' });
  const response = await fetchWithRetry(`https://ourworldindata.org/grapher/${indicator.id}.csv?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Our World in Data returned HTTP ${response.status}`);
  }
  // Columns: entity, code, year, value. Entity names may contain commas, so read from the right.
  const rows = (await response.text())
    .trim()
    .split('\n')
    .slice(1)
    .map((line) => line.split(',').slice(-3))
    .map(([code, year, value]) => ({ code, year: Number(year), value: value === '' ? NaN : Number(value) }));

  return seriesByCountry(countryCodes, indicator, (code) =>
    rows
      .filter((row) => row.code === code)
      .map((row) => ({
        year: row.year,
        value: row.value,
        unit: indicator.unit,
        source: indicator.source,
        sourceId: indicator.id,
        sourceUrl: indicator.sourceUrl,
        note: 'Estimate',
      })),
  );
}

async function fetchWhoFromBackend(countryCode: string, indicatorId: string): Promise<Map<string, FullSeries>> {
  const response = await fetchWithRetry(`${API_BASE_URL}/api/who/${countryCode}/${indicatorId}`);
  if (!response.ok) {
    throw new Error(`WHO endpoint returned HTTP ${response.status}`);
  }
  const payload: BackendSeriesResponse = await response.json();
  const indicator = getIndicatorDefinition(indicatorId);
  const series: FullSeries = {
    // Prefer the bundled profile: the backend only carries full metadata for a few countries.
    country: findCountryProfile(countryCode) ?? payload.country ?? getCountryProfile(countryCode),
    indicator: {
      ...indicator,
      ...payload.indicator,
      shortName: payload.indicator?.shortName ?? indicator.shortName,
      description: payload.indicator?.description ?? indicator.description,
      sourceUrl: payload.indicator?.sourceUrl ?? indicator.sourceUrl,
    },
    observations: payload.observations,
    status: payload.status ?? buildSourceStatus('who', indicator.source, indicatorId, 'success', 'Backend fetch succeeded'),
  };
  return new Map([[countryCode, series]]);
}

async function fetchWorldBankDirect(
  countryCodes: string[],
  indicatorId: string,
): Promise<Map<string, FullSeries>> {
  const indicator = getIndicatorDefinition(indicatorId);
  const endYear = new Date().getFullYear();
  const perPage = Math.max(200, countryCodes.length * (endYear - FULL_RANGE_START + 1));
  const url =
    `https://api.worldbank.org/v2/country/${countryCodes.join(';')}/indicator/${indicatorId}` +
    `?format=json&date=${FULL_RANGE_START}:${endYear}&per_page=${perPage}`;

  const response = await fetchWithRetry(url);
  if (!response.ok) {
    throw new Error(`World Bank returned HTTP ${response.status}`);
  }

  const payload = (await response.json()) as [unknown, WorldBankRow[]];
  const rows = Array.isArray(payload?.[1]) ? payload[1] : [];
  const rowsByCountry = new Map<string, WorldBankRow[]>();
  rows.forEach((row) => {
    // Single-country responses may omit the code; attribute them to the requested country.
    const code = row.countryiso3code || (countryCodes.length === 1 ? countryCodes[0] : '');
    if (code) {
      rowsByCountry.set(code, [...(rowsByCountry.get(code) ?? []), row]);
    }
  });

  return seriesByCountry(countryCodes, indicator, (code) =>
    normalizeWorldBankRows(rowsByCountry.get(code) ?? [], indicator.id, indicator.unit, indicator.sourceUrl),
  );
}

function sliceSeries(full: FullSeries, startYear: number, endYear: number): IndicatorSeries {
  const observations = full.observations.filter(
    (observation) => observation.year >= startYear && observation.year <= endYear,
  );
  if (observations.length > 0 || full.observations.length === 0) {
    return { ...full, observations };
  }
  return {
    ...full,
    observations,
    status: { ...full.status, fetchStatus: 'partial', note: 'No observations in the selected years' },
  };
}

function emptySeries(countryCode: string, indicatorId: string): FullSeries {
  const indicator = getIndicatorDefinition(indicatorId);
  return {
    country: getCountryProfile(countryCode),
    indicator,
    observations: [],
    status: buildSourceStatus(indicator.provider, indicator.source, indicatorId, 'partial', 'No observations returned'),
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
    }));
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

/**
 * Live region, income group and capital: from the World Bank country API (keyless) in the browser,
 * or from the backend, which adds REST Countries facts. Cached per country for a day; the bundled
 * catalog is shown until this arrives or if it fails.
 */
export async function fetchCountryMetadata(countryCodes: string[]): Promise<Record<string, Partial<CountryProfile>>> {
  const stored = readCountryMetadataCache();
  const missing = countryCodes.filter((code) => !stored[code]);
  if (missing.length === 0) {
    recordSourceResult('world-bank-countries', 'success', 'Served from local cache (refreshes daily)');
    return pick(stored, countryCodes);
  }

  const fetched = API_BASE_URL
    ? await fetchCountryMetadataFromBackend(missing)
    : await fetchCountryMetadataFromWorldBank(missing);
  writeCountryMetadataCache({ ...stored, ...fetched });
  return pick({ ...stored, ...fetched }, countryCodes);
}

function pick<T>(record: Record<string, T>, keys: string[]): Record<string, T> {
  return Object.fromEntries(keys.filter((key) => key in record).map((key) => [key, record[key]]));
}

function countryMetadataKey(): string {
  return `${COUNTRY_META_KEY}:${API_BASE_URL || 'direct'}`;
}

function readCountryMetadataCache(): Record<string, Partial<CountryProfile>> {
  try {
    const raw = localStorage.getItem(countryMetadataKey());
    if (!raw) {
      return {};
    }
    const entry = JSON.parse(raw) as { savedAt: number; data: Record<string, Partial<CountryProfile>> };
    return Date.now() - entry.savedAt < COUNTRY_META_TTL_MS ? entry.data : {};
  } catch {
    return {};
  }
}

function writeCountryMetadataCache(data: Record<string, Partial<CountryProfile>>) {
  try {
    const existing = localStorage.getItem(countryMetadataKey());
    // Keep the original timestamp so the whole cache still refreshes daily.
    const savedAt = existing ? (JSON.parse(existing) as { savedAt: number }).savedAt : Date.now();
    localStorage.setItem(countryMetadataKey(), JSON.stringify({ savedAt, data }));
  } catch {
    // Storage unavailable: data is still returned.
  }
}

async function fetchCountryMetadataFromWorldBank(
  countryCodes: string[],
): Promise<Record<string, Partial<CountryProfile>>> {
  try {
    const response = await fetchWithRetry(
      `https://api.worldbank.org/v2/country/${countryCodes.join(';')}?format=json&per_page=${countryCodes.length}`,
    );
    if (!response.ok) {
      throw new Error(`World Bank country API returned HTTP ${response.status}`);
    }
    const payload = (await response.json()) as [unknown, WorldBankCountryRow[]];
    const data: Record<string, Partial<CountryProfile>> = {};
    (Array.isArray(payload?.[1]) ? payload[1] : []).forEach((row) => {
      data[row.id] = {
        ...(row.region?.value?.trim() ? { region: row.region.value.trim() } : {}),
        ...(row.incomeLevel?.value?.trim() ? { incomeGroup: row.incomeLevel.value.trim() } : {}),
        ...(row.capitalCity?.trim() ? { capital: row.capitalCity.trim() } : {}),
      };
    });
    recordSourceResult('world-bank-countries', 'success', `Live metadata for ${Object.keys(data).join(', ')}`);
    return data;
  } catch (error) {
    recordSourceResult(
      'world-bank-countries',
      'error',
      `${error instanceof Error ? error.message : 'Request failed'}; showing bundled metadata`,
    );
    return {};
  }
}

/**
 * Live sources only add facts. Names, flags and coordinates stay as bundled, so labels match the
 * selector and map (World Bank's formal names such as "Congo, Dem. Rep." would otherwise leak in).
 */
const LIVE_FACT_FIELDS = [
  'region',
  'incomeGroup',
  'capital',
  'currency',
  'subregion',
  'population',
  'areaKm2',
  'languages',
  'landlocked',
  'borders',
] as const;

function pickLiveFacts(source: Partial<CountryProfile>): Partial<CountryProfile> {
  return Object.fromEntries(
    LIVE_FACT_FIELDS.filter((field) => source[field] !== undefined).map((field) => [field, source[field]]),
  ) as Partial<CountryProfile>;
}

interface BackendCountryResponse extends Partial<CountryProfile> {
  metadataSources?: string[];
  restCountriesStatus?: 'success' | 'no-data' | 'error' | 'not-configured';
}

/**
 * With a backend, country details come from it: World Bank classification plus REST Countries v5
 * facts when REST_COUNTRIES_API_KEY is set there (the key never reaches the browser).
 */
async function fetchCountryMetadataFromBackend(
  countryCodes: string[],
): Promise<Record<string, Partial<CountryProfile>>> {
  const results = await Promise.all(
    countryCodes.map(async (code) => {
      try {
        const response = await fetchWithRetry(`${API_BASE_URL}/api/countries/${code}`);
        return response.ok ? ((await response.json()) as BackendCountryResponse) : undefined;
      } catch {
        return undefined;
      }
    }),
  );

  const data: Record<string, Partial<CountryProfile>> = {};
  results.forEach((result, index) => {
    if (result) {
      data[countryCodes[index]] = pickLiveFacts(result);
    }
  });

  const received = results.filter((result): result is BackendCountryResponse => Boolean(result));
  const fromWorldBank = received.filter((result) => result.metadataSources?.includes('world-bank')).length;
  recordSourceResult(
    'world-bank-countries',
    fromWorldBank > 0 ? 'success' : 'error',
    fromWorldBank > 0 ? `Live metadata for ${fromWorldBank} countries (via backend)` : 'Backend could not reach World Bank',
  );

  const restStatuses = received.map((result) => result.restCountriesStatus);
  const restOk = restStatuses.filter((status) => status === 'success').length;
  if (restOk > 0) {
    recordSourceResult(
      'rest-countries',
      restOk === countryCodes.length ? 'success' : 'partial',
      `Details for ${restOk} of ${countryCodes.length} countries`,
    );
  } else if (restStatuses.includes('error')) {
    recordSourceResult('rest-countries', 'error', 'Request failed; check REST_COUNTRIES_API_KEY on the backend');
  } else {
    recordSourceResult('rest-countries', 'inactive', 'Add REST_COUNTRIES_API_KEY to dashboard-backend/.env');
  }
  return data;
}

