export function formatNumber(value: number | undefined, unit?: string): string {
  if (value === undefined || Number.isNaN(value)) {
    return 'No data';
  }

  if (unit === 'people') {
    return compactNumber(value);
  }

  if (unit === 'current US$') {
    return `$${compactNumber(value)}`;
  }

  if (unit === '% gross' || unit === '%') {
    return `${value.toFixed(1)}%`;
  }

  if (unit === '% of GDP') {
    return `${value.toFixed(1)}% of GDP`;
  }

  if (unit === 'tonnes') {
    return `${value.toFixed(2)} t`;
  }

  if (unit === 'years') {
    return `${value.toFixed(1)} years`;
  }

  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function compactNumber(value: number): string {
  return new Intl.NumberFormat('en', {
    notation: 'compact',
    // Large values compact to "1.34M"; small ones (rates, years) keep one decimal.
    maximumFractionDigits: Math.abs(value) >= 1000 ? 2 : 1,
  }).format(value);
}

export function fullNumber(value: number | undefined): string {
  if (value === undefined || Number.isNaN(value)) {
    return 'No data';
  }

  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function formatYearRange(startYear: number, endYear: number): string {
  return `${startYear} - ${endYear}`;
}
