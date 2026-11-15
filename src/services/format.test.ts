import { describe, expect, it } from 'vitest';
import { compactNumber, formatNumber } from './format';

describe('formatNumber', () => {
  it('formats the units used by every source', () => {
    expect(formatNumber(38.712, '%')).toBe('38.7%');
    expect(formatNumber(4.86, '% of GDP')).toBe('4.9% of GDP');
    expect(formatNumber(0.1479, 'tonnes')).toBe('0.15 t');
    expect(formatNumber(68.3, 'years')).toBe('68.3 years');
    expect(formatNumber(undefined, '%')).toBe('No data');
  });

  it('keeps a decimal on small (including negative) changes', () => {
    expect(compactNumber(-4.21)).toBe('-4.2');
    expect(compactNumber(0.6)).toBe('0.6');
    expect(compactNumber(1_340_000)).toBe('1.34M');
  });
});
