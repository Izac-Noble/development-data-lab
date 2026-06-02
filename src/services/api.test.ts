import { describe, expect, it, vi } from 'vitest';
import { fetchIndicatorSeries, fetchSourceStatuses } from './api';

describe('api adapters', () => {
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

  it('reports inactive optional sources in frontend-only mode', async () => {
    const statuses = await fetchSourceStatuses();

    expect(statuses.find((source) => source.id === 'unesco')?.fetchStatus).toBe('inactive');
    expect(statuses.find((source) => source.id === 'world-bank')?.fetchStatus).toBe('success');
  });
});
