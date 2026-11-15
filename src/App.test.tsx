import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { clearSeriesCache } from './services/api';

const yearlyValues = [
  { date: '2023', value: 45905417 },
  { date: '2022', value: 43733763 },
  { date: '2021', value: 41724118 },
];

/** Mimics the World Bank API: one row per requested country (A;B;C) and year. */
function worldBankResponse(url: string) {
  const countries = /country\/([^/]+)\/indicator/.exec(url)?.[1].split(';') ?? [];
  return [{}, countries.flatMap((code) => yearlyValues.map((row) => ({ ...row, countryiso3code: code })))];
}

/** World Bank indicator requests (country-metadata requests are counted separately). */
const worldBankCalls = () =>
  vi.mocked(fetch).mock.calls.filter(([url]) => String(url).includes('worldbank') && String(url).includes('/indicator/'));

describe('Development Data Lab app', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
    clearSeriesCache();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => ({
        ok: true,
        json: async () => worldBankResponse(url),
      })),
    );
  });

  it('renders the renamed learning dashboard without debug UI', async () => {
    render(<App />);

    expect(screen.getByText('Development Data Lab')).toBeInTheDocument();
    expect(screen.queryByText(/debug/i)).not.toBeInTheDocument();
    expect((await screen.findAllByText('Uganda')).length).toBeGreaterThan(0);
    expect(await screen.findByText('Indicator observations (Uganda)')).toBeInTheDocument();
  });

  it('lets learners switch indicators from the explorer route', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /Data Explorer/i }));
    await user.click(screen.getByRole('button', { name: /GDP per capita/i }));

    await waitFor(() => {
      expect(screen.getAllByText('GDP per capita').length).toBeGreaterThan(0);
    });
  });

  it('loads the dashboard with a single World Bank request', async () => {
    render(<App />);
    await screen.findByRole('cell', { name: '2021' });

    expect(worldBankCalls()).toHaveLength(1);
    expect(String(worldBankCalls()[0][0])).toContain('/country/UGA;KEN;TZA;RWA/');
    // Plus one background request for live country metadata covering every catalog country.
    const metadataCalls = vi.mocked(fetch).mock.calls.filter(([url]) => /\/v2\/country\/[A-Z;]+\?/.test(String(url)));
    expect(metadataCalls).toHaveLength(1);
  });

  it('applies a committed year range locally without refetching', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('cell', { name: '2021' });
    const callsBefore = worldBankCalls().length;

    const startInput = screen.getByLabelText('Start');
    await user.clear(startInput);
    await user.type(startInput, '2022');
    expect(screen.getByRole('cell', { name: '2021' })).toBeInTheDocument();

    await user.keyboard('{Enter}');
    await waitFor(() => {
      expect(screen.queryByRole('cell', { name: '2021' })).not.toBeInTheDocument();
    });
    expect(screen.getByRole('cell', { name: '2022' })).toBeInTheDocument();
    expect(worldBankCalls()).toHaveLength(callsBefore);
  });

  it('refetches from the network when Run is pressed', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('cell', { name: '2021' });
    const callsBefore = worldBankCalls().length;

    await user.click(screen.getByRole('button', { name: /Run/ }));

    await waitFor(() => expect(worldBankCalls()).toHaveLength(callsBefore + 1));
    expect(String(worldBankCalls().at(-1)?.[0])).toContain('/country/UGA/');
  });

  it('reverts an out-of-range year instead of fetching it', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Indicator observations (Uganda)');

    const startInput = screen.getByLabelText('Start') as HTMLInputElement;
    await user.clear(startInput);
    await user.type(startInput, '1800');
    await user.tab();

    expect(startInput.value).toBe('1960');
  });

  it('draws the full catalog on the map, selects from it and shows a country card', async () => {
    const user = userEvent.setup();
    window.history.pushState({}, '', '/map');
    const { container } = render(<App />);

    const map = await screen.findByRole('img', { name: /World map of countries/i });
    expect(map.querySelectorAll('path.land.interactive').length).toBeGreaterThan(150);
    expect(map.querySelectorAll('circle.island-dot').length).toBeGreaterThan(20);
    expect(screen.getByRole('complementary', { name: 'Uganda summary' })).toBeInTheDocument();

    const kenya = [...container.querySelectorAll('path.land')].find((path) => path.textContent === 'Kenya')!;
    await user.click(kenya);

    expect(await screen.findByRole('complementary', { name: 'Kenya summary' })).toBeInTheDocument();
    expect(kenya).toHaveClass('selected');
    expect((screen.getByLabelText('Country') as HTMLSelectElement).value).toBe('KEN');
    await waitFor(() => expect(screen.getByText('Population').closest('div')).toHaveTextContent('2023'));
  });

  it('zooms the map with the buttons and resets it', async () => {
    const user = userEvent.setup();
    window.history.pushState({}, '', '/map');
    const { container } = render(<App />);
    await screen.findByRole('img', { name: /World map of countries/i });
    const layer = () => (container.querySelector('.zoom-layer') as SVGGElement).style.transform;

    expect(screen.getByRole('button', { name: 'Zoom out' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(layer()).toContain('scale(1.75)');

    await user.click(screen.getByRole('button', { name: 'Reset map view' }));
    expect(layer()).toContain('scale(1)');
  });

  it('shows observations ten at a time with paging', async () => {
    const user = userEvent.setup();
    const manyYears = Array.from({ length: 25 }, (_, index) => ({ date: String(2024 - index), value: 1000 + index }));
    vi.mocked(fetch).mockImplementation(async (url) => {
      const countries = /country\/([^/?]+)/.exec(String(url))?.[1].split(';') ?? [];
      return {
        ok: true,
        json: async () =>
          String(url).includes('/indicator/')
            ? [{}, countries.flatMap((code) => manyYears.map((row) => ({ ...row, countryiso3code: code })))]
            : [{}, []],
      } as Response;
    });
    render(<App />);
    await screen.findByRole('cell', { name: '2024' });

    expect(screen.getAllByRole('row')).toHaveLength(11); // header + 10
    expect(screen.getByText('Showing 1–10 of 25')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Older years' }));
    expect(screen.getByRole('cell', { name: '2014' })).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: '2024' })).not.toBeInTheDocument();
    expect(screen.getByText('Showing 11–20 of 25')).toBeInTheDocument();
  });
});

