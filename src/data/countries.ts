import type { CountryProfile } from '../types';
import { COUNTRY_CATALOG } from './countries.generated';

/** Every World Bank economy with a REST Countries record (215). Regenerate with `npm run generate:countries`. */
export const COUNTRIES: CountryProfile[] = COUNTRY_CATALOG;

/** Catalog grouped by World Bank region, for the country selector. */
export const COUNTRIES_BY_REGION: Array<{ region: string; countries: CountryProfile[] }> = Object.entries(
  COUNTRIES.reduce<Record<string, CountryProfile[]>>((groups, country) => {
    (groups[country.region] ??= []).push(country);
    return groups;
  }, {}),
)
  .map(([region, countries]) => ({ region, countries }))
  .sort((a, b) => a.region.localeCompare(b.region));

const BY_CODE = new Map(COUNTRIES.map((country) => [country.code, country]));

export const DEFAULT_COUNTRY = 'UGA';
export const DEFAULT_COMPARE_COUNTRIES = ['UGA', 'KEN', 'TZA', 'RWA'];

export function findCountryProfile(code: string): CountryProfile | undefined {
  return BY_CODE.get(code.toUpperCase());
}

/** Bundled profile for `code`, or a clearly-labelled placeholder (never another country). */
export function getCountryProfile(code: string): CountryProfile {
  return findCountryProfile(code) ?? unknownCountryProfile(code);
}

function unknownCountryProfile(code: string): CountryProfile {
  const normalized = code.toUpperCase();
  return {
    code: normalized,
    name: normalized,
    officialName: normalized,
    flag: '',
    region: 'Unknown',
    incomeGroup: 'Unknown',
    capital: 'Unknown',
    currency: 'Unknown',
    latitude: 0,
    longitude: 0,
  };
}
