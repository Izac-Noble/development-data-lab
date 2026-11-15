import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getCountryProfile } from '../data/countries';
import { clearSeriesCache, fetchCountryMetadata, fetchIndicatorSeries, fetchIndicatorSeriesBatch } from './api';
import { resetSourceStatuses, useSourceStatuses } from './sourceStatus';
import { renderHook } from '@testing-library/react';

describe('api adapters', () => {
  beforeEach(() => clearSeriesCache());

  it('normalizes World Bank observations into descending years', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => [
          {},
          [
            { date: '2022', value: 20 },
            { date: '2023', value: 30 },
            { date: '2021', value: null },
          ],
        ],
      })),
    );

    const series = await fetchIndicatorSeries('UGA', 'SP.POP.TOTL', 2021, 2023);

    expect(series.country.name).toBe('Uganda');
    expect(series.indicator.id).toBe('SP.POP.TOTL');
    expect(series.observations).toEqual([
      expect.objectContaining({ year: 2023, value: 30 }),
      expect.objectContaining({ year: 2022, value: 20 }),
    ]);
  });

  it('marks WHO as backend-only in frontend-only mode', () => {
    resetSourceStatuses();
    const { result } = renderHook(() => useSourceStatuses());

    expect(result.current.find((source) => source.id === 'who')?.fetchStatus).toBe('inactive');
    expect(result.current.find((source) => source.id === 'unesco')?.fetchStatus).toBe('idle');
  });

  it('labels unknown country codes instead of substituting another country', () => {
    const profile = getCountryProfile('xyz');

    expect(profile.code).toBe('XYZ');
    expect(profile.name).toBe('XYZ');
  });
});

describe('api adapters with a backend', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('loads REST Countries details through the backend and reports their status', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://backend.test');
    vi.resetModules();
    const api = await import('./api');
    const statusStore = await import('./sourceStatus');
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => ({
        ok: true,
        json: async () => ({
          code: url.slice(-3),
          name: 'Formal World Bank Name',
          languages: ['English', 'Swahili'],
          areaKm2: 241550,
          metadataSources: ['bundled', 'world-bank', 'rest-countries'],
          restCountriesStatus: 'success',
        }),
      })),
    );
    const { result } = renderHook(() => statusStore.useSourceStatuses());

    const data = await api.fetchCountryMetadata(['UGA', 'KEN']);

    expect(vi.mocked(fetch).mock.calls.map(([url]) => url)).toEqual([
      'http://backend.test/api/countries/UGA',
      'http://backend.test/api/countries/KEN',
    ]);
    expect(data.UGA).toEqual({ languages: ['English', 'Swahili'], areaKm2: 241550 });
    await vi.waitFor(() =>
      expect(result.current.find((source) => source.id === 'rest-countries')?.fetchStatus).toBe('success'),
    );
  });

  it('fetches World Bank directly and batched even when a backend is configured', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://backend.test');
    vi.resetModules();
    const api = await import('./api');
    api.clearSeriesCache();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => [{}, [{ countryiso3code: 'ETH', date: '2023', value: 1 }]] })),
    );

    const [ethiopia] = await api.fetchIndicatorSeriesBatch(['ETH', 'KEN'], 'SP.POP.TOTL');

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fetch).mock.calls[0][0]).toContain('https://api.worldbank.org/v2/country/ETH;KEN/');
    expect(ethiopia.country.name).toBe('Ethiopia');
  });

  it('uses the backend for WHO, whose API blocks browser requests', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://backend.test');
    vi.resetModules();
    const api = await import('./api');
    api.clearSeriesCache();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ observations: [{ year: 2021, value: 63.5, unit: 'years', source: 'WHO', sourceId: 'WHOSIS_000001', sourceUrl: '', note: '' }] }),
      })),
    );

    const series = await api.fetchIndicatorSeries('UGA', 'WHOSIS_000001');

    expect(vi.mocked(fetch).mock.calls[0][0]).toBe('http://backend.test/api/who/UGA/WHOSIS_000001');
    expect(series.observations[0].value).toBe(63.5);
  });
});

describe('series cache and batching', () => {
  const rowsFor = (url: string) => {
    const countries = /country\/([^/]+)\/indicator/.exec(url)?.[1].split(';') ?? [];
    return [
      {},
      countries.flatMap((code) => [
        { countryiso3code: code, date: '2023', value: 3 },
        { countryiso3code: code, date: '2010', value: 2 },
      ]),
    ];
  };

  beforeEach(() => {
    clearSeriesCache();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => ({ ok: true, json: async () => rowsFor(url) })),
    );
  });

  it('fetches several countries in one request and splits them by country', async () => {
    const results = await fetchIndicatorSeriesBatch(['UGA', 'KEN'], 'SP.POP.TOTL');

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fetch).mock.calls[0][0]).toContain('/country/UGA;KEN/');
    expect(results.map((series) => series.country.code)).toEqual(['UGA', 'KEN']);
    expect(results[1].observations).toHaveLength(2);
  });

  it('shares in-flight requests and serves year ranges from cache', async () => {
    const [first, second] = await Promise.all([
      fetchIndicatorSeries('UGA', 'SP.POP.TOTL', 1960, 2025),
      fetchIndicatorSeries('UGA', 'SP.POP.TOTL', 2020, 2025),
    ]);
    const third = await fetchIndicatorSeries('UGA', 'SP.POP.TOTL', 2000, 2015);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(first.observations.map((o) => o.year)).toEqual([2023, 2010]);
    expect(second.observations.map((o) => o.year)).toEqual([2023]);
    expect(third.observations.map((o) => o.year)).toEqual([2010]);
  });

  it('only requests countries that are not cached yet', async () => {
    await fetchIndicatorSeries('UGA', 'SP.POP.TOTL');
    await fetchIndicatorSeriesBatch(['UGA', 'KEN', 'TZA'], 'SP.POP.TOTL');

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(vi.mocked(fetch).mock.calls[1][0]).toContain('/country/KEN;TZA/');
  });

  it('survives a reload through localStorage', async () => {
    await fetchIndicatorSeries('UGA', 'SP.POP.TOTL');
    vi.resetModules();
    const fresh = await import('./api');

    const series = await fresh.fetchIndicatorSeries('UGA', 'SP.POP.TOTL');

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(series.observations).toHaveLength(2);
  });

  it('retries temporary upstream errors such as World Bank 502s', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 502 } as Response);

    const series = await fetchIndicatorSeries('UGA', 'SP.POP.TOTL');

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(series.observations).toHaveLength(2);
  });

  it('abandons a stalled request after the timeout and retries it', async () => {
    vi.useFakeTimers();
    const stalled = (_url: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      });
    vi.mocked(fetch).mockImplementationOnce(stalled as typeof fetch);

    const pending = fetchIndicatorSeries('UGA', 'SP.POP.TOTL');
    await vi.advanceTimersByTimeAsync(25_000 + 400);
    const series = await pending;
    vi.useRealTimers();

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(series.observations).toHaveLength(2);
  });

  it('fails fast on non-retryable errors and does not cache the failure', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 500 } as Response);

    await expect(fetchIndicatorSeries('UGA', 'SP.POP.TOTL')).rejects.toThrow('HTTP 500');
    expect(fetch).toHaveBeenCalledTimes(1);
    const series = await fetchIndicatorSeries('UGA', 'SP.POP.TOTL');

    expect(series.observations).toHaveLength(2);
  });
});

describe('additional sources', () => {
  beforeEach(() => {
    clearSeriesCache();
    resetSourceStatuses();
  });

  it('batches UNESCO countries and records a live status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          hints: [],
          records: [
            { geoUnit: 'UGA', year: 2020, value: 40.5, qualifier: null },
            { geoUnit: 'KEN', year: 2020, value: 80.1, qualifier: 'UIS_EST' },
            { geoUnit: 'KEN', year: 2019, value: null },
          ],
        }),
      })),
    );
    const { result } = renderHook(() => useSourceStatuses());

    const [uganda, kenya] = await fetchIndicatorSeriesBatch(['UGA', 'KEN'], 'CR.1');

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fetch).mock.calls[0][0]).toContain('indicator=CR.1&geoUnit=UGA&geoUnit=KEN');
    expect(uganda.observations).toEqual([expect.objectContaining({ year: 2020, value: 40.5, note: 'Reported' })]);
    expect(kenya.observations).toEqual([expect.objectContaining({ year: 2020, value: 80.1, note: 'UIS_EST' })]);
    await vi.waitFor(() => expect(result.current.find((s) => s.id === 'unesco')?.fetchStatus).toBe('success'));
  });

  it('parses Our World in Data CSV, including entity names with commas', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        text: async () =>
          'entity,code,year,life_expectancy_0\nUganda,UGA,1990,47.2\nUganda,UGA,2023,68.3\n"Korea, Republic of",KOR,2023,84\n',
      })),
    );

    const series = await fetchIndicatorSeries('UGA', 'life-expectancy');

    expect(vi.mocked(fetch).mock.calls[0][0]).toContain('/grapher/life-expectancy.csv?country=UGA');
    expect(series.observations.map((o) => [o.year, o.value])).toEqual([
      [2023, 68.3],
      [1990, 47.2],
    ]);
  });

  it('reports a source error when an upstream request fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500 })));
    const { result } = renderHook(() => useSourceStatuses());

    await expect(fetchIndicatorSeries('UGA', 'child-mortality')).rejects.toThrow('HTTP 500');

    await vi.waitFor(() => expect(result.current.find((s) => s.id === 'owid')?.fetchStatus).toBe('error'));
  });

  it('loads live country metadata in one request and caches it', async () => {
    localStorage.removeItem('ddl:countries:v1');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => [{}, [{ id: 'UGA', region: { value: 'Sub-Saharan Africa ' }, incomeLevel: { value: 'Low income' }, capitalCity: 'Kampala' }]],
      })),
    );

    const first = await fetchCountryMetadata(['UGA']);
    const second = await fetchCountryMetadata(['UGA']);

    expect(first.UGA).toEqual({ region: 'Sub-Saharan Africa', incomeGroup: 'Low income', capital: 'Kampala' });
    expect(second).toEqual(first);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

