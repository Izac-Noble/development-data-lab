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

  if (unit === '% gross') {
    return `${value.toFixed(1)}%`;
  }

  if (unit === 'years') {
    return `${value.toFixed(1)} years`;
  }

  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function compactNumber(value: number): string {
  return new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: value >= 1000 ? 2 : 0,
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
