import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Code2,
  Database,
  Download,
  ExternalLink,
  FlaskConical,
  Globe2,
  Layers,
  Map,
  RefreshCw,
  Search,
  TableProperties,
} from 'lucide-react';
import { CountryCard } from './components/CountryCard';
import { WorldMap } from './components/WorldMap';
import {
  COUNTRIES,
  COUNTRIES_BY_REGION,
  DEFAULT_COMPARE_COUNTRIES,
  DEFAULT_COUNTRY,
  getCountryProfile,
} from './data/countries';
import { availableIndicators, DEFAULT_INDICATOR, PROVIDER_LABELS } from './data/indicators';
import {
  fetchIndicatorSeries,
  fetchIndicatorSeriesBatch,
  fetchCountryMetadata,
  invalidateSeries,
} from './services/api';
import { useSourceStatuses } from './services/sourceStatus';
import { compactNumber, formatNumber, formatYearRange, fullNumber } from './services/format';
import type { CountryProfile, IndicatorObservation, IndicatorSeries, SourceStatus } from './types';

type RoutePath = '/' | '/explore' | '/compare' | '/map' | '/sources';

const routes: Array<{ path: RoutePath; label: string; icon: typeof Database }> = [
  { path: '/', label: 'Dashboard', icon: Database },
  { path: '/explore', label: 'Data Explorer', icon: Search },
  { path: '/compare', label: 'Comparisons', icon: Layers },
  { path: '/map', label: 'Map', icon: Map },
  { path: '/sources', label: 'Data Sources', icon: BookOpen },
];

const currentYear = new Date().getFullYear();
const MIN_YEAR = 1960;
const COMPARISON_COLORS = ['#0f7a4f', '#2563eb', '#8b5cf6', '#d97706'];

const TrendChart = lazy(() => import('./components/Charts').then((module) => ({ default: module.TrendChart })));
const Sparkline = lazy(() => import('./components/Charts').then((module) => ({ default: module.Sparkline })));
const SPINNER_DELAY_MS = 150;
const OBSERVATION_PAGE_SIZE = 10;
const HAS_BACKEND = Boolean(import.meta.env.VITE_API_BASE_URL);
const INDICATOR_OPTIONS = availableIndicators(HAS_BACKEND);
const INDICATOR_GROUPS = Object.entries(PROVIDER_LABELS)
  .map(([provider, label]) => ({ label, indicators: INDICATOR_OPTIONS.filter((item) => item.provider === provider) }))
  .filter((group) => group.indicators.length > 0);

function App() {
  const [route, setRoute] = useState<RoutePath>(getRoute());
  const [selectedCountry, setSelectedCountry] = useState(DEFAULT_COUNTRY);
  const [selectedIndicator, setSelectedIndicator] = useState(DEFAULT_INDICATOR);
  const [startYear, setStartYear] = useState(MIN_YEAR);
  const [endYear, setEndYear] = useState(currentYear);
  const [series, setSeries] = useState<IndicatorSeries | null>(null);
  const [compareSeries, setCompareSeries] = useState<IndicatorSeries[]>([]);
  const sourceStatuses = useSourceStatuses();
  const [liveProfiles, setLiveProfiles] = useState<Record<string, Partial<CountryProfile>>>({});
  const [loading, setLoading] = useState(true);
  const [compareLoading, setCompareLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const handlePopState = () => setRoute(getRoute());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // The comparison batch runs first so the main series (usually one of the comparison
  // countries) is served from the same single World Bank request.
  useEffect(() => {
    let isMounted = true;
    const showSpinner = window.setTimeout(() => isMounted && setCompareLoading(true), SPINNER_DELAY_MS);

    fetchIndicatorSeriesBatch(DEFAULT_COMPARE_COUNTRIES, selectedIndicator, startYear, endYear)
      .then((results) => {
        if (isMounted) {
          setCompareSeries(results);
        }
      })
      .catch(() => {
        if (isMounted) {
          setCompareSeries([]);
        }
      })
      .finally(() => {
        window.clearTimeout(showSpinner);
        if (isMounted) {
          setCompareLoading(false);
        }
      });

    return () => {
      isMounted = false;
      window.clearTimeout(showSpinner);
    };
  }, [selectedIndicator, startYear, endYear]);

  useEffect(() => {
    let isMounted = true;
    setError(null);
    // Cached data resolves almost instantly; only show a spinner if the network is involved.
    const showSpinner = window.setTimeout(() => isMounted && setLoading(true), SPINNER_DELAY_MS);

    fetchIndicatorSeries(selectedCountry, selectedIndicator, startYear, endYear)
      .then((nextSeries) => {
        if (isMounted) {
          setSeries(nextSeries);
        }
      })
      .catch((nextError: Error) => {
        if (isMounted) {
          setError(nextError.message);
          setSeries(null);
        }
      })
      .finally(() => {
        window.clearTimeout(showSpinner);
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
      window.clearTimeout(showSpinner);
    };
  }, [selectedCountry, selectedIndicator, startYear, endYear, refreshKey]);

  // Live details (World Bank classification, plus REST Countries facts via the backend) for the
  // selected country only; the bundled catalog shows until they arrive.
  useEffect(() => {
    let isMounted = true;
    fetchCountryMetadata([selectedCountry]).then((profiles) => {
      if (isMounted) {
        setLiveProfiles((current) => ({ ...current, ...profiles }));
      }
    });
    return () => {
      isMounted = false;
    };
  }, [selectedCountry]);

  const navigate = (path: RoutePath) => {
    window.history.pushState({}, '', path);
    setRoute(path);
  };

  const refreshData = () => {
    invalidateSeries(selectedCountry, selectedIndicator);
    setSeries(null);
    setLoading(true);
    setRefreshKey((key) => key + 1);
  };

  return (
    <div className="app-shell">
      <Sidebar activeRoute={route} onNavigate={navigate} />
      <main className="workspace">
        <TopBar />
        <ControlBar
          selectedCountry={selectedCountry}
          selectedIndicator={selectedIndicator}
          startYear={startYear}
          endYear={endYear}
          loading={loading}
          onCountryChange={setSelectedCountry}
          onIndicatorChange={setSelectedIndicator}
          onStartYearChange={setStartYear}
          onEndYearChange={setEndYear}
          onRefresh={refreshData}
        />
        {route === '/' && (
          <DashboardView
            series={series}
            compareSeries={compareSeries}
            sourceStatuses={sourceStatuses}
            liveProfiles={liveProfiles}
            loading={loading}
            compareLoading={compareLoading}
            error={error}
          />
        )}
        {route === '/explore' && (
          <ExplorerView
            series={series}
            selectedIndicator={selectedIndicator}
            loading={loading}
            error={error}
            onIndicatorChange={setSelectedIndicator}
          />
        )}
        {route === '/compare' && (
          <CompareView
            compareSeries={compareSeries}
            selectedIndicator={selectedIndicator}
            loading={compareLoading}
          />
        )}
        {route === '/map' && (
          <MapView
            selectedCountry={selectedCountry}
            onCountryChange={setSelectedCountry}
            series={series}
            liveProfiles={liveProfiles}
            onOpenDashboard={() => navigate('/')}
          />
        )}
        {route === '/sources' && <SourcesView sourceStatuses={sourceStatuses} />}
      </main>
    </div>
  );
}

function Sidebar({ activeRoute, onNavigate }: { activeRoute: RoutePath; onNavigate: (path: RoutePath) => void }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true">
          <FlaskConical size={27} />
        </div>
        <div>
          <h1>Development Data Lab</h1>
          <p>open data · learn · build</p>
        </div>
      </div>
      <nav className="sidebar-nav" aria-label="Primary navigation">
        {routes.map((item) => {
          const Icon = item.icon;
          const isActive = activeRoute === item.path;
          return (
            <button
              key={item.path}
              type="button"
              className={isActive ? 'nav-item active' : 'nav-item'}
              onClick={() => onNavigate(item.path)}
            >
              <Icon size={17} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="sidebar-section">
        <span className="sidebar-label">Recently viewed</span>
        <div className="recent-item">
          <span className="dot green" />
          Uganda · Population
        </div>
        <div className="recent-item">
          <span className="dot blue" />
          Kenya · GDP per capita
        </div>
        <div className="recent-item">
          <span className="dot orange" />
          Rwanda · Life expectancy
        </div>
      </div>
      <div className="sidebar-card">
        <span className="sidebar-label">Mode</span>
        <strong>{import.meta.env.VITE_API_BASE_URL ? 'Backend connected' : 'Frontend only'}</strong>
        <p>
          {import.meta.env.VITE_API_BASE_URL
            ? 'Typed API endpoints are available.'
            : 'World Bank, UNESCO and Our World in Data load directly in the browser.'}
        </p>
      </div>
    </aside>
  );
}

function TopBar() {
  return (
    <header className="topbar">
      <div>
        <p className="topbar-kicker">Public development indicators</p>
        <h2>Country learning workspace</h2>
      </div>
      <div className="topbar-actions">
        <a href="https://data.worldbank.org/" target="_blank" rel="noreferrer">
          <BookOpen size={17} />
          Docs
        </a>
        <a href="https://github.com/Izac-Noble/development-data-lab#optional-backend" target="_blank" rel="noreferrer" aria-label="API documentation">
          <Code2 size={17} />
          API
        </a>
        <a href="https://github.com/Izac-Noble/development-data-lab" target="_blank" rel="noreferrer">
          <Globe2 size={17} />
          GitHub
        </a>
        <div className="avatar" aria-label="Development Data Lab">
          DL
        </div>
      </div>
    </header>
  );
}

function ControlBar({
  selectedCountry,
  selectedIndicator,
  startYear,
  endYear,
  loading,
  onCountryChange,
  onIndicatorChange,
  onStartYearChange,
  onEndYearChange,
  onRefresh,
}: {
  selectedCountry: string;
  selectedIndicator: string;
  startYear: number;
  endYear: number;
  loading: boolean;
  onCountryChange: (code: string) => void;
  onIndicatorChange: (code: string) => void;
  onStartYearChange: (year: number) => void;
  onEndYearChange: (year: number) => void;
  onRefresh: () => void;
}) {
  return (
    <section className="control-bar" aria-label="Data controls">
      <label className="field">
        <span>Country</span>
        <select value={selectedCountry} onChange={(event) => onCountryChange(event.target.value)}>
          {COUNTRIES_BY_REGION.map((group) => (
            <optgroup key={group.region} label={group.region}>
              {group.countries.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.flag} {country.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <ChevronDown size={16} />
      </label>
      <label className="field wide">
        <span>Indicator</span>
        <select value={selectedIndicator} onChange={(event) => onIndicatorChange(event.target.value)}>
          {INDICATOR_GROUPS.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.indicators.map((indicator) => (
                <option key={indicator.id} value={indicator.id}>
                  {indicator.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <ChevronDown size={16} />
      </label>
      <div className="range-fields">
        <label className="field small">
          <span>Start</span>
          <YearInput value={startYear} min={MIN_YEAR} max={endYear} onCommit={onStartYearChange} />
        </label>
        <label className="field small">
          <span>End</span>
          <YearInput value={endYear} min={startYear} max={currentYear} onCommit={onEndYearChange} />
        </label>
      </div>
      <button className="run-button" type="button" onClick={onRefresh} disabled={loading}>
        <RefreshCw size={16} className={loading ? 'spin' : ''} />
        Run
      </button>
    </section>
  );
}

/**
 * Year field that only reports a value once editing finishes (blur or Enter), so partial
 * input like "20" never triggers a fetch. Out-of-range or non-numeric input is reverted.
 */
function YearInput({
  value,
  min,
  max,
  onCommit,
}: {
  value: number;
  min: number;
  max: number;
  onCommit: (year: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = () => {
    const year = Number(draft);
    if (Number.isInteger(year) && year >= min && year <= max) {
      if (year !== value) {
        onCommit(year);
      }
    } else {
      setDraft(String(value));
    }
  };

  return (
    <input
      type="number"
      min={min}
      max={max}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          commit();
        }
      }}
    />
  );
}

function DashboardView({
  series,
  compareSeries,
  sourceStatuses,
  liveProfiles,
  loading,
  compareLoading,
  error,
}: {
  series: IndicatorSeries | null;
  compareSeries: IndicatorSeries[];
  sourceStatuses: SourceStatus[];
  liveProfiles: Record<string, Partial<CountryProfile>>;
  loading: boolean;
  compareLoading: boolean;
  error: string | null;
}) {
  return (
    <div className="view-stack">
      {error && <ErrorBanner message={error} />}
      <div className="dashboard-grid">
        <CountryPanel series={series} loading={loading} liveProfiles={liveProfiles} />
        <IndicatorPanel series={series} loading={loading} />
        <SourceTrace statuses={sourceStatuses} />
      </div>
      <ComparisonStrip series={compareSeries} loading={compareLoading} />
      <ObservationTable observations={series?.observations ?? []} countryName={series?.country.name ?? ''} />
    </div>
  );
}

function CountryPanel({
  series,
  loading,
  liveProfiles,
}: {
  series: IndicatorSeries | null;
  loading: boolean;
  liveProfiles: Record<string, Partial<CountryProfile>>;
}) {
  const latest = series?.observations[0];
  const country = series ? { ...series.country, ...liveProfiles[series.country.code] } : undefined;

  return (
    <section className="panel country-panel">
      {loading && !country ? (
        <LoadingBlock label="Loading country profile" />
      ) : (
        <>
          <div className="panel-heading compact">
            <div>
              <h3>
                <span className="flag">{country?.flag}</span>
                {country?.name ?? 'Country'}
              </h3>
              <p>{country?.officialName}</p>
            </div>
          </div>
          <dl className="facts">
            <div>
              <dt>Region</dt>
              <dd>{country?.region}</dd>
            </div>
            <div>
              <dt>Income group</dt>
              <dd>{country?.incomeGroup}</dd>
            </div>
            <div>
              <dt>Capital</dt>
              <dd>{country?.capital}</dd>
            </div>
            <div>
              <dt>Latest value</dt>
              <dd>{formatNumber(latest?.value, series?.indicator.unit)}</dd>
            </div>
            {country?.languages && (
              <div>
                <dt>Languages</dt>
                <dd>{country.languages.slice(0, 3).join(', ')}</dd>
              </div>
            )}
            {country?.areaKm2 !== undefined && (
              <div>
                <dt>Area</dt>
                <dd>{fullNumber(country.areaKm2)} km²</dd>
              </div>
            )}
            {country?.languages && (
              <div>
                <dt>Currency</dt>
                <dd>{country.currency}</dd>
              </div>
            )}
            {country?.borders && (
              <div>
                <dt>Borders</dt>
                <dd>{country.landlocked ? 'Landlocked · ' : ''}{country.borders.length ? country.borders.join(', ') : 'None'}</dd>
              </div>
            )}
          </dl>
          <div className="mini-map">
            {country && <WorldMap countries={COUNTRIES} selectedCountry={country.code} variant="focus" />}
          </div>
          <a className="text-link" href={series?.indicator.sourceUrl} target="_blank" rel="noreferrer">
            View source profile
            <ArrowRight size={15} />
          </a>
        </>
      )}
    </section>
  );
}

function IndicatorPanel({ series, loading }: { series: IndicatorSeries | null; loading: boolean }) {
  const chartData = useMemo(() => {
    return [...(series?.observations ?? [])]
      .reverse()
      .map((observation) => ({
        year: observation.year,
        value: observation.value,
      }));
  }, [series]);
  const latest = series?.observations[0];
  const previous = series?.observations[1];
  const delta = latest && previous ? latest.value - previous.value : undefined;

  return (
    <section className="panel indicator-panel">
      <div className="panel-heading">
        <div>
          <h3>{series?.indicator.name ?? 'Indicator'}</h3>
          <p>
            {series?.indicator.id} · {series?.indicator.source}
          </p>
        </div>
        <button
          className="ghost-button"
          type="button"
          onClick={() => downloadCsv(series?.observations ?? [], `${series?.country.code}-${series?.indicator.id}.csv`)}
          disabled={!series?.observations.length}
        >
          <Download size={15} />
          CSV
        </button>
      </div>
      {loading ? (
        <LoadingBlock label="Loading indicator series" />
      ) : (
        <>
          <div className="metric-line">
            <strong>{formatNumber(latest?.value, series?.indicator.unit)}</strong>
            <span>{latest ? latest.year : 'No year'}</span>
            {delta !== undefined && previous && (
              <em>
                {delta >= 0 ? '+' : ''}
                {compactNumber(delta)} {latest && previous.year === latest.year - 1 ? 'from previous year' : `since ${previous.year}`}
              </em>
            )}
          </div>
          <div className="chart-frame">
            <Suspense fallback={<div className="chart-placeholder" style={{ height: 260 }} />}>
              <TrendChart data={chartData} unit={series?.indicator.unit} label={series?.indicator.shortName} />
            </Suspense>
          </div>
          <p className="source-note">
            Source: <a href={series?.indicator.sourceUrl}>{series?.indicator.source}</a>
          </p>
        </>
      )}
    </section>
  );
}

function SourceTrace({ statuses }: { statuses: SourceStatus[] }) {
  const failed = statuses.filter((source) => source.fetchStatus === 'error');
  const backendOnly = statuses.filter((source) => source.fetchStatus === 'inactive');

  return (
    <section className="panel source-trace">
      <div className="panel-heading compact">
        <div>
          <h3>Source trace</h3>
          <p>Fetch state for active and optional sources</p>
        </div>
      </div>
      <div className="source-list">
        {statuses.map((source) => (
          <article key={source.id} className="source-row">
            <div className="source-icon">
              <Database size={16} />
            </div>
            <div>
              <strong>{source.name}</strong>
              <span>{source.detail}</span>
            </div>
            <StatusPill status={source.fetchStatus} />
          </article>
        ))}
      </div>
      {(failed.length > 0 || backendOnly.length > 0) && (
        <div className="notice">
          <CircleAlert size={17} />
          <div>
            {failed.length > 0 ? (
              <>
                <strong>{failed.map((source) => source.name).join(', ')} failed.</strong>
                <p>Cached or bundled data is shown where available. Press Run to retry.</p>
              </>
            ) : (
              <>
                <strong>
                  {backendOnly.map((source) => source.name).join(' and ')} {backendOnly.length > 1 ? 'need' : 'needs'} the
                  backend.
                </strong>
                <p>They need an API key or block browser requests. All other sources work without it.</p>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function ComparisonStrip({ series, loading }: { series: IndicatorSeries[]; loading: boolean }) {
  return (
    <section className="panel full-width">
      <div className="panel-heading">
        <div>
          <h3>Compare: {series[0]?.indicator.name ?? 'Indicator'}</h3>
          <p>{series[0] ? formatYearRange(series[0].observations.at(-1)?.year ?? 1960, series[0].observations[0]?.year ?? currentYear) : 'Loading range'}</p>
        </div>
      </div>
      {loading ? (
        <div className="comparison-grid">
          {DEFAULT_COMPARE_COUNTRIES.map((countryCode) => (
            <LoadingBlock key={countryCode} label={`Loading ${countryCode}`} />
          ))}
        </div>
      ) : (
        <div className="comparison-grid">
          {series.map((item, index) => (
            <ComparisonCard key={item.country.code} series={item} index={index} />
          ))}
          <div className="add-card">
            <span>+</span>
            <strong>Add country</strong>
            <p>Extend the comparison set in code or through a future selector.</p>
          </div>
        </div>
      )}
    </section>
  );
}

function ComparisonCard({ series, index }: { series: IndicatorSeries; index: number }) {
  const latest = series.observations[0];
  // Observations are already sorted newest-first; take the latest 12 and flip to chronological.
  const data = series.observations
    .slice(0, 12)
    .reverse()
    .map((observation) => ({ year: observation.year, value: observation.value }));
  const color = COMPARISON_COLORS[index % COMPARISON_COLORS.length];

  return (
    <article className="comparison-card" style={{ borderColor: color }}>
      <div className="comparison-top">
        <strong>
          <span className="dot" style={{ background: color }} />
          {series.country.name}
        </strong>
        <span>{formatNumber(latest?.value, series.indicator.unit)}</span>
      </div>
      <Suspense fallback={<div className="chart-placeholder" style={{ height: 92 }} />}>
        <Sparkline data={data} color={color} />
      </Suspense>
    </article>
  );
}

function ObservationTable({
  observations,
  countryName,
}: {
  observations: IndicatorObservation[];
  countryName: string;
}) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const matchingRows = useMemo(
    () => observations.filter((observation) => String(observation.year).includes(query)),
    [observations, query],
  );
  const pageCount = Math.max(1, Math.ceil(matchingRows.length / OBSERVATION_PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const firstRow = currentPage * OBSERVATION_PAGE_SIZE;
  const visibleRows = matchingRows.slice(firstRow, firstRow + OBSERVATION_PAGE_SIZE);

  // New data or a new search starts again at the most recent years.
  useEffect(() => setPage(0), [observations, query]);

  return (
    <section className="panel full-width">
      <div className="panel-heading">
        <div>
          <h3>Indicator observations {countryName ? `(${countryName})` : ''}</h3>
          <p>Most recent years first, {OBSERVATION_PAGE_SIZE} per page</p>
        </div>
        <label className="table-search">
          <Search size={16} />
          <input
            type="search"
            placeholder="Search year"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>
      {visibleRows.length === 0 ? (
        <EmptyState title="No observations found" detail="Try another indicator, country, or year range." />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Year</th>
                <th>Value</th>
                <th>Unit</th>
                <th>Source</th>
                <th>Source ID</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={`${row.sourceId}-${row.year}`}>
                  <td>{row.year}</td>
                  <td>{fullNumber(row.value)}</td>
                  <td>{row.unit}</td>
                  <td>{row.source}</td>
                  <td>
                    <a href={row.sourceUrl} target="_blank" rel="noreferrer">
                      {row.sourceId}
                      <ExternalLink size={13} />
                    </a>
                  </td>
                  <td>{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {pageCount > 1 && (
            <div className="table-pager">
              <span>
                Showing {firstRow + 1}–{firstRow + visibleRows.length} of {matchingRows.length}
              </span>
              <div>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => setPage(currentPage - 1)}
                  disabled={currentPage === 0}
                  aria-label="Newer years"
                >
                  <ChevronLeft size={15} />
                  Newer
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => setPage(currentPage + 1)}
                  disabled={currentPage >= pageCount - 1}
                  aria-label="Older years"
                >
                  Older
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function ExplorerView({
  series,
  selectedIndicator,
  loading,
  error,
  onIndicatorChange,
}: {
  series: IndicatorSeries | null;
  selectedIndicator: string;
  loading: boolean;
  error: string | null;
  onIndicatorChange: (indicator: string) => void;
}) {
  return (
    <div className="view-stack">
      {error && <ErrorBanner message={error} />}
      <section className="panel full-width">
        <div className="panel-heading">
          <div>
            <h3>Indicator explorer</h3>
            <p>Pick an indicator, inspect its definition, and review the returned observations.</p>
          </div>
        </div>
        <div className="indicator-grid">
          {INDICATOR_OPTIONS.map((indicator) => (
            <button
              key={indicator.id}
              type="button"
              className={indicator.id === selectedIndicator ? 'indicator-card selected' : 'indicator-card'}
              onClick={() => onIndicatorChange(indicator.id)}
            >
              <span>
                {PROVIDER_LABELS[indicator.provider]} · {indicator.id}
              </span>
              <strong>{indicator.name}</strong>
              <p>{indicator.description}</p>
            </button>
          ))}
        </div>
      </section>
      <IndicatorPanel series={series} loading={loading} />
      <ObservationTable observations={series?.observations ?? []} countryName={series?.country.name ?? ''} />
    </div>
  );
}

function CompareView({
  compareSeries,
  selectedIndicator,
  loading,
}: {
  compareSeries: IndicatorSeries[];
  selectedIndicator: string;
  loading: boolean;
}) {
  const rows = compareSeries.map((item) => ({
    country: item.country,
    latest: item.observations[0],
    indicator: item.indicator,
  }));
  const maxValue = Math.max(...rows.map((row) => row.latest?.value ?? 0), 1);

  return (
    <div className="view-stack">
      <ComparisonStrip series={compareSeries} loading={loading} />
      <section className="panel full-width">
        <div className="panel-heading">
          <div>
            <h3>Country comparison table</h3>
            <p>{selectedIndicator} across the default East Africa comparison set</p>
          </div>
        </div>
        {loading ? (
          <LoadingBlock label="Loading comparison table" />
        ) : (
          <div className="comparison-table">
            {rows.map((row) => (
              <div key={row.country.code} className="comparison-row">
                <strong>
                  {row.country.flag} {row.country.name}
                </strong>
                <div className="bar-track">
                  <span style={{ width: `${((row.latest?.value ?? 0) / maxValue) * 100}%` }} />
                </div>
                <span>{formatNumber(row.latest?.value, row.indicator.unit)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MapView({
  selectedCountry,
  onCountryChange,
  series,
  liveProfiles,
  onOpenDashboard,
}: {
  selectedCountry: string;
  onCountryChange: (countryCode: string) => void;
  series: IndicatorSeries | null;
  liveProfiles: Record<string, Partial<CountryProfile>>;
  onOpenDashboard: () => void;
}) {
  const country = { ...getCountryProfile(selectedCountry), ...liveProfiles[selectedCountry] };
  const currentSeries = series?.country.code === selectedCountry ? series : null;

  return (
    <div className="view-stack">
      <section className="panel full-width map-view">
        <div className="panel-heading">
          <div>
            <h3>Country map</h3>
            <p>Click any country (or dot, for small island states) to see its key stats.</p>
          </div>
        </div>
        <div className="map-layout">
          <div className="atlas">
            <WorldMap countries={COUNTRIES} selectedCountry={selectedCountry} onCountryChange={onCountryChange} />
          </div>
          <CountryCard country={country} currentSeries={currentSeries} onOpenDashboard={onOpenDashboard} />
        </div>
      </section>
    </div>
  );
}

function SourcesView({ sourceStatuses }: { sourceStatuses: SourceStatus[] }) {
  return (
    <div className="view-stack">
      <section className="panel full-width">
        <div className="panel-heading">
          <div>
            <h3>Data sources</h3>
            <p>Use this page to understand what is live, what is optional, and what needs revalidation.</p>
          </div>
        </div>
        <div className="sources-table">
          {sourceStatuses.map((source) => (
            <article key={source.id} className="source-card">
              <div>
                <strong>{source.name}</strong>
                <p>{source.detail}</p>
              </div>
              <StatusPill status={source.fetchStatus} />
              <dl>
                <div>
                  <dt>Freshness</dt>
                  <dd>{source.freshness}</dd>
                </div>
                <div>
                  <dt>Last fetched</dt>
                  <dd>{formatSourceDate(source.lastFetched)}</dd>
                </div>
                <div>
                  <dt>Note</dt>
                  <dd>{source.note}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatusPill({ status }: { status: SourceStatus['fetchStatus'] }) {
  const labels: Record<SourceStatus['fetchStatus'], string> = {
    idle: 'Ready',
    success: 'Success',
    partial: 'Partial',
    inactive: 'Inactive',
    error: 'Error',
  };

  return <span className={`status-pill ${status}`}>{labels[status]}</span>;
}

function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="loading-block" role="status">
      <Activity size={18} className="spin" />
      <span>{label}</span>
    </div>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="empty-state">
      <TableProperties size={28} />
      <strong>{title}</strong>
      <p>{detail}</p>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="error-banner" role="alert">
      <CircleAlert size={19} />
      <div>
        <strong>Data request failed</strong>
        <p>{message}</p>
      </div>
    </div>
  );
}

function getRoute(): RoutePath {
  const path = window.location.pathname;
  if (path === '/explore' || path === '/compare' || path === '/map' || path === '/sources') {
    return path;
  }
  return '/';
}

function downloadCsv(observations: IndicatorObservation[], fileName: string) {
  const rows = [
    ['year', 'value', 'unit', 'source', 'source_id', 'note'],
    ...observations.map((row) => [row.year, row.value, row.unit, row.source, row.sourceId, row.note]),
  ];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function formatSourceDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default App;
