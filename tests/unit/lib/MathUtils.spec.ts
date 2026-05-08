import { describe, it, expect } from 'vitest';
import { MathUtils } from '../../../src/shared/utils/decimalUtils';

describe('MathUtils (Decimal.js)', () => {
  it('should add numbers correctly', () => {
    expect(MathUtils.add(0.1, 0.2)).toBe(0.3);
    expect(MathUtils.add('1000', '2000')).toBe(3000);
    expect(MathUtils.add(undefined as any, 5)).toBe(5);
  });

  it('should subtract numbers correctly', () => {
    expect(MathUtils.sub(0.3, 0.1)).toBe(0.2);
    expect(MathUtils.sub('2000', '1000')).toBe(1000);
  });

  it('should multiply numbers correctly', () => {
    expect(MathUtils.mul(0.1, 0.2)).toBe(0.02);
    expect(MathUtils.mul('10', '20')).toBe(200);
  });

  it('should divide numbers correctly', () => {
    expect(MathUtils.div(0.3, 0.1)).toBe(3);
    expect(MathUtils.div('100', '4')).toBe(25);
    expect(MathUtils.div(10, 0)).toBe(10); // Safety default in implementation: b || 1
  });

  it('should round grams to 2 decimal places', () => {
    expect(MathUtils.roundGram(1.234)).toBe(1.23);
    expect(MathUtils.roundGram(1.235)).toBe(1.24); // ROUND_HALF_UP
  });

  it('should round to integer for Rupiah', () => {
    expect(MathUtils.roundInt(1500.6)).toBe(1501);
    expect(MathUtils.roundInt(1500.4)).toBe(1500);
  });
});
