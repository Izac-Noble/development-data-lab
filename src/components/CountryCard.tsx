import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { getIndicatorDefinition } from '../data/indicators';
import { fetchIndicatorSeries } from '../services/api';
import { formatNumber, fullNumber } from '../services/format';
import type { CountryProfile, IndicatorObservation, IndicatorSeries } from '../types';

/** Headline stats shown for every country, all from the World Bank. */
const KEY_STATS = ['SP.POP.TOTL', 'NY.GDP.PCAP.CD', 'SP.DYN.LE00.IN'];
const SLOW_NOTICE_MS = 8000;

type StatState = { status: 'loading' } | { status: 'ready'; latest?: IndicatorObservation } | { status: 'error' };

function useLatestValues(countryCode: string, indicatorIds: string[]) {
  const [stats, setStats] = useState<Record<string, StatState>>({});
  const key = indicatorIds.join(',');

  useEffect(() => {
    let isMounted = true;
    setStats(Object.fromEntries(indicatorIds.map((id) => [id, { status: 'loading' }])));
    indicatorIds.forEach((id) => {
      fetchIndicatorSeries(countryCode, id)
        .then((series) => {
          if (isMounted) {
            setStats((current) => ({ ...current, [id]: { status: 'ready', latest: series.observations[0] } }));
          }
        })
        .catch(() => {
          if (isMounted) {
            setStats((current) => ({ ...current, [id]: { status: 'error' } }));
          }
        });
    });
    return () => {
      isMounted = false;
    };
    // `key` (the joined ids) stands in for `indicatorIds`, whose array identity changes every render.
  }, [countryCode, key]);

  return stats;
}

export function CountryCard({
  country,
  currentSeries,
  onOpenDashboard,
}: {
  country: CountryProfile;
  /** The dashboard's currently selected indicator, shown as an extra stat when it isn't a headline one. */
  currentSeries: IndicatorSeries | null;
  onOpenDashboard: () => void;
}) {
  const extraIndicator =
    currentSeries && !KEY_STATS.includes(currentSeries.indicator.id) ? currentSeries.indicator.id : undefined;
  const stats = useLatestValues(country.code, extraIndicator ? [...KEY_STATS, extraIndicator] : KEY_STATS);
  const stillLoading = Object.values(stats).some((state) => state.status === 'loading');
  const [slow, setSlow] = useState(false);

  // World Bank can take 10-30s for a country it hasn't served recently; say so instead of looking stuck.
  useEffect(() => {
    setSlow(false);
    if (!stillLoading) {
      return undefined;
    }
    const timer = window.setTimeout(() => setSlow(true), SLOW_NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [stillLoading, country.code]);

  return (
    <aside className="country-card" aria-label={`${country.name} summary`} aria-live="polite">
      <div className="country-card-header">
        <span className="country-card-flag" aria-hidden="true">
          {country.flag}
        </span>
        <div>
          <h3>{country.name}</h3>
          <p>{country.officialName}</p>
        </div>
      </div>

      <dl className="country-card-stats">
        {Object.entries(stats).map(([id, state]) => {
          const indicator = getIndicatorDefinition(id);
          return (
            <div key={id}>
              <dt>{indicator.shortName}</dt>
              <dd>
                {state.status === 'loading' && <span className="stat-loading">Loading…</span>}
                {state.status === 'error' && <span className="stat-missing">Unavailable</span>}
                {state.status === 'ready' &&
                  (state.latest ? (
                    <>
                      <strong>{formatNumber(state.latest.value, indicator.unit)}</strong>
                      <span>{state.latest.year}</span>
                    </>
                  ) : (
                    <span className="stat-missing">No data</span>
                  ))}
              </dd>
            </div>
          );
        })}
      </dl>
      {slow && stillLoading && (
        <p className="country-card-note" role="status">
          World Bank can take up to 30 seconds for a country it hasn&apos;t served recently. Results are cached after.
        </p>
      )}

      <dl className="country-card-facts">
        <div>
          <dt>Region</dt>
          <dd>{country.region}</dd>
        </div>
        <div>
          <dt>Income group</dt>
          <dd>{country.incomeGroup}</dd>
        </div>
        <div>
          <dt>Capital</dt>
          <dd>{country.capital}</dd>
        </div>
        <div>
          <dt>Currency</dt>
          <dd>{country.currency}</dd>
        </div>
        {country.languages && (
          <div>
            <dt>Languages</dt>
            <dd>{country.languages.slice(0, 3).join(', ')}</dd>
          </div>
        )}
        {country.areaKm2 !== undefined && (
          <div>
            <dt>Area</dt>
            <dd>{fullNumber(country.areaKm2)} km²</dd>
          </div>
        )}
      </dl>

      <button type="button" className="run-button country-card-action" onClick={onOpenDashboard}>
        Open in dashboard
        <ArrowRight size={16} />
      </button>
    </aside>
  );
}
