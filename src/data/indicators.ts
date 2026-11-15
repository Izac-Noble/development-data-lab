import type { DataProvider, IndicatorDefinition } from '../types';

export const PROVIDER_LABELS: Record<DataProvider, string> = {
  'world-bank': 'World Bank',
  unesco: 'UNESCO UIS',
  owid: 'Our World in Data',
  who: 'WHO',
};

export const INDICATORS: IndicatorDefinition[] = [
  {
    id: 'SP.POP.TOTL',
    provider: 'world-bank',
    name: 'Population, total',
    shortName: 'Population',
    unit: 'people',
    source: 'World Bank WDI',
    description: 'Total population based on the de facto definition of population.',
    sourceUrl: 'https://data.worldbank.org/indicator/SP.POP.TOTL',
  },
  {
    id: 'NY.GDP.PCAP.CD',
    provider: 'world-bank',
    name: 'GDP per capita',
    shortName: 'GDP per capita',
    unit: 'current US$',
    source: 'World Bank WDI',
    description: 'Gross domestic product divided by midyear population.',
    sourceUrl: 'https://data.worldbank.org/indicator/NY.GDP.PCAP.CD',
  },
  {
    id: 'SP.DYN.LE00.IN',
    provider: 'world-bank',
    name: 'Life expectancy at birth',
    shortName: 'Life expectancy',
    unit: 'years',
    source: 'World Bank WDI',
    description: 'Number of years a newborn infant would live if mortality patterns stayed constant.',
    sourceUrl: 'https://data.worldbank.org/indicator/SP.DYN.LE00.IN',
  },
  {
    id: 'SE.PRM.ENRR',
    provider: 'world-bank',
    name: 'School enrollment, primary',
    shortName: 'Primary enrollment',
    unit: '% gross',
    source: 'World Bank WDI',
    description: 'Gross enrollment ratio for primary education.',
    sourceUrl: 'https://data.worldbank.org/indicator/SE.PRM.ENRR',
  },
  {
    id: 'SH.XPD.CHEX.PC.CD',
    provider: 'world-bank',
    name: 'Health expenditure per capita',
    shortName: 'Health spend',
    unit: 'current US$',
    source: 'World Bank WDI',
    description: 'Current health expenditure per person.',
    sourceUrl: 'https://data.worldbank.org/indicator/SH.XPD.CHEX.PC.CD',
  },
  {
    id: 'CR.1',
    provider: 'unesco',
    name: 'Primary completion rate',
    shortName: 'Primary completion',
    unit: '%',
    source: 'UNESCO UIS',
    description: 'Share of children a few years above primary graduation age who completed primary school.',
    sourceUrl: 'https://databrowser.uis.unesco.org/',
  },
  {
    id: 'ROFST.1.CP',
    provider: 'unesco',
    name: 'Out-of-school rate, primary',
    shortName: 'Out-of-school rate',
    unit: '%',
    source: 'UNESCO UIS',
    description: 'Share of primary-school-age children who are not enrolled in school.',
    sourceUrl: 'https://databrowser.uis.unesco.org/',
  },
  {
    id: 'LR.AG15T24',
    provider: 'unesco',
    name: 'Youth literacy rate (15-24)',
    shortName: 'Youth literacy',
    unit: '%',
    source: 'UNESCO UIS',
    description: 'Share of people aged 15-24 who can read and write a short simple statement.',
    sourceUrl: 'https://databrowser.uis.unesco.org/',
  },
  {
    id: 'XGDP.FSGOV',
    provider: 'unesco',
    name: 'Government education spending',
    shortName: 'Education spend',
    unit: '% of GDP',
    source: 'UNESCO UIS',
    description: 'General government expenditure on education as a share of GDP.',
    sourceUrl: 'https://databrowser.uis.unesco.org/',
  },
  {
    id: 'life-expectancy',
    provider: 'owid',
    name: 'Life expectancy (long-run)',
    shortName: 'Life expectancy',
    unit: 'years',
    source: 'Our World in Data',
    description: 'Period life expectancy at birth, combining UN and historical estimates.',
    sourceUrl: 'https://ourworldindata.org/grapher/life-expectancy',
  },
  {
    id: 'child-mortality',
    provider: 'owid',
    name: 'Child mortality rate',
    shortName: 'Child mortality',
    unit: '%',
    source: 'Our World in Data',
    description: 'Share of newborns who die before reaching age five.',
    sourceUrl: 'https://ourworldindata.org/grapher/child-mortality',
  },
  {
    id: 'co-emissions-per-capita',
    provider: 'owid',
    name: 'CO2 emissions per capita',
    shortName: 'CO2 per capita',
    unit: 'tonnes',
    source: 'Our World in Data',
    description: 'Fossil and industry carbon dioxide emissions per person.',
    sourceUrl: 'https://ourworldindata.org/grapher/co-emissions-per-capita',
  },
  {
    id: 'WHOSIS_000001',
    provider: 'who',
    requiresBackend: true,
    name: 'Life expectancy at birth (WHO)',
    shortName: 'Life expectancy',
    unit: 'years',
    source: 'WHO Global Health Observatory',
    description: 'WHO life expectancy estimates, both sexes.',
    sourceUrl: 'https://www.who.int/data/gho/data/indicators/indicator-details/GHO/life-expectancy-at-birth-(years)',
  },
];

export const DEFAULT_INDICATOR = 'SP.POP.TOTL';

/** Indicators usable in the current mode (WHO needs the backend because it blocks browser requests). */
export function availableIndicators(hasBackend: boolean): IndicatorDefinition[] {
  return INDICATORS.filter((indicator) => hasBackend || !indicator.requiresBackend);
}

export function getIndicatorDefinition(id: string): IndicatorDefinition {
  return INDICATORS.find((indicator) => indicator.id === id) ?? INDICATORS[0];
}
