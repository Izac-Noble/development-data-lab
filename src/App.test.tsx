import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const worldBankPayload = [
  {},
  [
    { date: '2023', value: 45905417 },
    { date: '2022', value: 43733763 },
    { date: '2021', value: 41724118 },
  ],
];

describe('Development Data Lab app', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => worldBankPayload,
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
});
