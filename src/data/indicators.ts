import type { IndicatorDefinition } from '../types';

export const INDICATORS: IndicatorDefinition[] = [
  {
    id: 'SP.POP.TOTL',
    name: 'Population, total',
    shortName: 'Population',
    unit: 'people',
    source: 'World Bank WDI',
    description: 'Total population based on the de facto definition of population.',
    sourceUrl: 'https://data.worldbank.org/indicator/SP.POP.TOTL',
  },
  {
    id: 'NY.GDP.PCAP.CD',
    name: 'GDP per capita',
    shortName: 'GDP per capita',
    unit: 'current US$',
    source: 'World Bank WDI',
    description: 'Gross domestic product divided by midyear population.',
    sourceUrl: 'https://data.worldbank.org/indicator/NY.GDP.PCAP.CD',
  },
  {
    id: 'SP.DYN.LE00.IN',
    name: 'Life expectancy at birth',
    shortName: 'Life expectancy',
    unit: 'years',
    source: 'World Bank WDI',
    description: 'Number of years a newborn infant would live if mortality patterns stayed constant.',
    sourceUrl: 'https://data.worldbank.org/indicator/SP.DYN.LE00.IN',
  },
  {
    id: 'SE.PRM.ENRR',
    name: 'School enrollment, primary',
    shortName: 'Primary enrollment',
    unit: '% gross',
    source: 'World Bank WDI',
    description: 'Gross enrollment ratio for primary education.',
    sourceUrl: 'https://data.worldbank.org/indicator/SE.PRM.ENRR',
  },
  {
    id: 'SH.XPD.CHEX.PC.CD',
    name: 'Health expenditure per capita',
    shortName: 'Health spend',
    unit: 'current US$',
    source: 'World Bank WDI',
    description: 'Current health expenditure per person.',
    sourceUrl: 'https://data.worldbank.org/indicator/SH.XPD.CHEX.PC.CD',
  },
];

export const DEFAULT_INDICATOR = 'SP.POP.TOTL';

export function getIndicatorDefinition(id: string): IndicatorDefinition {
  return INDICATORS.find((indicator) => indicator.id === id) ?? INDICATORS[0];
}
