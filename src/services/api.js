import { useState, useEffect } from 'react';

// Simple fetch function for ANY URL
const fetchFromUrl = async (url) => {
  try {
    console.log(`Fetching from: ${url}`);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`Success:`, data);
    return data;
  } catch (error) {
    console.error(`Error fetching from ${url}:`, error);
    throw error;
  }
};

// React hook for any URL
export const useApi = (url) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!url) return;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await fetchFromUrl(url);
        setData(result);
      } catch (err) {
        setError(err.message);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [url]);

  const refetch = async () => {
    if (!url) return;
    try {
      setLoading(true);
      setError(null);
      const result = await fetchFromUrl(url);
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, refetch };
};

// Generic API builders for different data sources
export const buildApiUrl = {
  // UNESCO Education Data
  unesco: (countryCode, indicators = ['CR.1', 'CR.2', 'CR.3']) => 
    `https://api.uis.unesco.org/api/public/data/indicators?${indicators.map(i => `indicator=${i}`).join('&')}&geoUnit=${countryCode}`,
  
  // WHO Health Data  
  // who: (countryCode, indicator = 'WHOSIS_000001') =>
  //   `https://ghoapi.azureedge.net/api/${indicator}?$filter=SpatialDim eq '${countryCode}'`,
  
  // World Bank Data
  worldBank: (countryCode, indicator = 'SP.POP.TOTL', startYear = 2010, endYear = 2023) =>
    `https://api.worldbank.org/v2/country/${countryCode}/indicator/${indicator}?format=json&date=${startYear}:${endYear}`,
  
  // REST Countries (for country info)
  countryInfo: (countryCode) =>
    `https://restcountries.com/v3.1/alpha/${countryCode}`,
};

// Generic hooks for different data types
export const useCountryData = (countryCode) => {
  const url = countryCode ? buildApiUrl.countryInfo(countryCode) : null;
  return useApi(url);
};

export const useEducationData = (countryCode, indicators) => {
  const url = countryCode ? buildApiUrl.unesco(countryCode, indicators) : null;
  return useApi(url);
};

// export const useHealthData = (countryCode, indicator) => {
//   const url = countryCode ? buildApiUrl.who(countryCode, indicator) : null;
//   return useApi(url);
// };

export const useEconomicData = (countryCode, indicator, startYear, endYear) => {
  const url = countryCode ? buildApiUrl.worldBank(countryCode, indicator, startYear, endYear) : null;
  return useApi(url);
};

// Country codes 
export const COUNTRY_CODES = {
  'UGA': 'Uganda',
  'USA': 'United States',
  'GBR': 'United Kingdom', 
  'KEN': 'Kenya',
  'TZA': 'Tanzania',
  'RWA': 'Rwanda',
  'ETH': 'Ethiopia',
  'GHA': 'Ghana',
  'NGA': 'Nigeria',
  'ZAF': 'South Africa',
  'EGY': 'Egypt',
  'MAR': 'Morocco',
  'DEU': 'Germany',
  'FRA': 'France',
  'JPN': 'Japan',
  'CHN': 'China',
  'IND': 'India',
  'BRA': 'Brazil'
};

// Direct API functions
export const api = {
  get: (url) => fetchFromUrl(url),
  buildUrl: buildApiUrl,
  countries: COUNTRY_CODES
};

// Fallback mechanism for hooks
export const useApiWithFallback = (url, fallbackData = null) => {
  const { data, loading, error } = useApi(url);
  
  if (error && fallbackData) {
    return { data: fallbackData, loading: false, error: null };
  }
  
  return { data, loading, error };
};

export default api;