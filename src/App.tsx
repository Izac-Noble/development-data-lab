import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
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
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { COUNTRIES, DEFAULT_COMPARE_COUNTRIES, DEFAULT_COUNTRY } from './data/countries';
import { DEFAULT_INDICATOR, INDICATORS } from './data/indicators';
import { fetchIndicatorSeries, fetchSourceStatuses } from './services/api';
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

function App() {
  const [route, setRoute] = useState<RoutePath>(getRoute());
  const [selectedCountry, setSelectedCountry] = useState(DEFAULT_COUNTRY);
  const [selectedIndicator, setSelectedIndicator] = useState(DEFAULT_INDICATOR);
  const [startYear, setStartYear] = useState(1960);
  const [endYear, setEndYear] = useState(Math.min(2023, currentYear));
  const [series, setSeries] = useState<IndicatorSeries | null>(null);
  const [compareSeries, setCompareSeries] = useState<IndicatorSeries[]>([]);
  const [sourceStatuses, setSourceStatuses] = useState<SourceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [compareLoading, setCompareLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handlePopState = () => setRoute(getRoute());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

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
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCountry, selectedIndicator, startYear, endYear]);

  useEffect(() => {
    let isMounted = true;
    setCompareLoading(true);

    Promise.all(
      DEFAULT_COMPARE_COUNTRIES.map((countryCode) =>
        fetchIndicatorSeries(countryCode, selectedIndicator, startYear, endYear),
      ),
    )
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
        if (isMounted) {
          setCompareLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedIndicator, startYear, endYear]);

  useEffect(() => {
    fetchSourceStatuses().then(setSourceStatuses).catch(() => setSourceStatuses([]));
  }, []);

  const navigate = (path: RoutePath) => {
    window.history.pushState({}, '', path);
    setRoute(path);
  };

  const refreshData = () => {
    setSeries(null);
    setLoading(true);
    fetchIndicatorSeries(selectedCountry, selectedIndicator, startYear, endYear)
      .then(setSeries)
      .catch((nextError: Error) => setError(nextError.message))
      .finally(() => setLoading(false));
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
          <MapView selectedCountry={selectedCountry} onCountryChange={setSelectedCountry} />
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
            : 'World Bank data and bundled country metadata are active.'}
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
          {COUNTRIES.map((country) => (
            <option key={country.code} value={country.code}>
              {country.flag} {country.name} ({country.code})
            </option>
          ))}
        </select>
        <ChevronDown size={16} />
      </label>
      <label className="field wide">
        <span>Indicator</span>
        <select value={selectedIndicator} onChange={(event) => onIndicatorChange(event.target.value)}>
          {INDICATORS.map((indicator) => (
            <option key={indicator.id} value={indicator.id}>
              {indicator.name} · {indicator.id}
            </option>
          ))}
        </select>
        <ChevronDown size={16} />
      </label>
      <div className="range-fields">
        <label className="field small">
          <span>Start</span>
          <input
            type="number"
            min="1960"
            max={endYear}
            value={startYear}
            onChange={(event) => onStartYearChange(Number(event.target.value))}
          />
        </label>
        <label className="field small">
          <span>End</span>
          <input
            type="number"
            min={startYear}
            max={currentYear}
            value={endYear}
            onChange={(event) => onEndYearChange(Number(event.target.value))}
          />
        </label>
      </div>
      <button className="run-button" type="button" onClick={onRefresh} disabled={loading}>
        <RefreshCw size={16} className={loading ? 'spin' : ''} />
        Run
      </button>
    </section>
  );
}

function DashboardView({
  series,
  compareSeries,
  sourceStatuses,
  loading,
  compareLoading,
  error,
}: {
  series: IndicatorSeries | null;
  compareSeries: IndicatorSeries[];
  sourceStatuses: SourceStatus[];
  loading: boolean;
  compareLoading: boolean;
  error: string | null;
}) {
  return (
    <div className="view-stack">
      {error && <ErrorBanner message={error} />}
      <div className="dashboard-grid">
        <CountryPanel series={series} loading={loading} />
        <IndicatorPanel series={series} loading={loading} />
        <SourceTrace statuses={sourceStatuses} />
      </div>
      <ComparisonStrip series={compareSeries} loading={compareLoading} />
      <ObservationTable observations={series?.observations ?? []} countryName={series?.country.name ?? ''} />
    </div>
  );
}

function CountryPanel({ series, loading }: { series: IndicatorSeries | null; loading: boolean }) {
  const latest = series?.observations[0];
  const country = series?.country;

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
          </dl>
          <div className="mini-map" aria-label={`${country?.name} location preview`}>
            <div className="map-grid" />
            <span
              className="country-pin"
              style={country ? mapPosition(country.latitude, country.longitude) : undefined}
            />
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
      .sort((a, b) => a.year - b.year)
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
            {delta !== undefined && <em>{delta >= 0 ? '+' : ''}{compactNumber(delta)} from previous year</em>}
          </div>
          <div className="chart-frame">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData} margin={{ top: 10, right: 18, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="#dde5dc" vertical={false} />
                <XAxis dataKey="year" tickLine={false} axisLine={false} stroke="#667085" />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  stroke="#667085"
                  tickFormatter={(value) => compactNumber(Number(value))}
                  width={56}
                />
                <Tooltip
                  formatter={(value) => [formatNumber(Number(value), series?.indicator.unit), series?.indicator.shortName]}
                  labelFormatter={(label) => `Year ${label}`}
                  contentStyle={{ borderRadius: 8, border: '1px solid #d5ded7' }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#0f7a4f"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
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
  const inactiveCount = statuses.filter((source) => source.fetchStatus === 'inactive' || source.fetchStatus === 'error').length;

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
      {inactiveCount > 0 && (
        <div className="notice">
          <CircleAlert size={17} />
          <div>
            <strong>Some sources are optional or inactive.</strong>
            <p>Core World Bank indicators remain available in frontend-only mode.</p>
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
  const data = [...series.observations]
    .sort((a, b) => a.year - b.year)
    .slice(-12)
    .map((observation) => ({ year: observation.year, value: observation.value }));
  const colors = ['#0f7a4f', '#2563eb', '#8b5cf6', '#d97706'];

  return (
    <article className="comparison-card" style={{ borderColor: colors[index % colors.length] }}>
      <div className="comparison-top">
        <strong>
          <span className="dot" style={{ background: colors[index % colors.length] }} />
          {series.country.name}
        </strong>
        <span>{formatNumber(latest?.value, series.indicator.unit)}</span>
      </div>
      <ResponsiveContainer width="100%" height={92}>
        <LineChart data={data} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
          <Line type="monotone" dataKey="value" stroke={colors[index % colors.length]} strokeWidth={2} dot={false} />
          <YAxis hide domain={['dataMin', 'dataMax']} />
          <XAxis hide dataKey="year" />
        </LineChart>
      </ResponsiveContainer>
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
  const visibleRows = observations.filter((observation) => String(observation.year).includes(query)).slice(0, 50);

  return (
    <section className="panel full-width">
      <div className="panel-heading">
        <div>
          <h3>Indicator observations {countryName ? `(${countryName})` : ''}</h3>
          <p>Raw values used by the chart and comparison cards</p>
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
          {INDICATORS.map((indicator) => (
            <button
              key={indicator.id}
              type="button"
              className={indicator.id === selectedIndicator ? 'indicator-card selected' : 'indicator-card'}
              onClick={() => onIndicatorChange(indicator.id)}
            >
              <span>{indicator.id}</span>
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
}: {
  selectedCountry: string;
  onCountryChange: (countryCode: string) => void;
}) {
  return (
    <div className="view-stack">
      <section className="panel full-width map-view">
        <div className="panel-heading">
          <div>
            <h3>Country map</h3>
            <p>Select a country to update the dashboard controls.</p>
          </div>
        </div>
        <div className="atlas">
          <div className="atlas-grid" />
          {COUNTRIES.map((country) => (
            <button
              key={country.code}
              type="button"
              className={country.code === selectedCountry ? 'atlas-pin active' : 'atlas-pin'}
              style={mapPosition(country.latitude, country.longitude)}
              onClick={() => onCountryChange(country.code)}
              title={country.name}
            >
              <span>{country.flag}</span>
              <strong>{country.code}</strong>
            </button>
          ))}
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
  const labels = {
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

function mapPosition(latitude: number, longitude: number): { left: string; top: string } {
  return {
    left: `${((longitude + 180) / 360) * 100}%`,
    top: `${((90 - latitude) / 180) * 100}%`,
  };
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
