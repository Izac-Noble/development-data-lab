export type SourceStatusState = 'idle' | 'success' | 'partial' | 'inactive' | 'error';

export type DataProvider = 'world-bank' | 'unesco' | 'owid' | 'who';

export interface CountryProfile {
  code: string;
  name: string;
  officialName: string;
  flag: string;
  region: string;
  incomeGroup: string;
  capital: string;
  currency: string;
  latitude: number;
  longitude: number;
  /** ISO 3166-1 numeric code, used to match the country's outline on the map. */
  isoNumeric?: string;
  /** Optional live facts from REST Countries (backend with API key only). */
  subregion?: string;
  population?: number;
  areaKm2?: number;
  languages?: string[];
  landlocked?: boolean;
  borders?: string[];
}

export interface IndicatorDefinition {
  id: string;
  provider: DataProvider;
  /** Only reachable through the optional backend (the upstream API blocks browser requests). */
  requiresBackend?: boolean;
  name: string;
  shortName: string;
  unit: string;
  source: string;
  description: string;
  sourceUrl: string;
}

export interface IndicatorObservation {
  year: number;
  value: number;
  unit: string;
  source: string;
  sourceId: string;
  sourceUrl: string;
  note: string;
}

export interface IndicatorSeries {
  country: CountryProfile;
  indicator: IndicatorDefinition;
  observations: IndicatorObservation[];
  status: SourceStatus;
}

export interface SourceStatus {
  id: string;
  name: string;
  detail: string;
  freshness: string;
  fetchStatus: SourceStatusState;
  lastFetched: string;
  note?: string;
}
