export type SourceStatusState = 'success' | 'partial' | 'inactive' | 'error';

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
}

export interface IndicatorDefinition {
  id: string;
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
