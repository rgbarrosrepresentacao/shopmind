import { SEED_DATA } from './seed';

export function generateSKU(prefix = 'SKU-E2E'): string {
  return `${prefix}-${Date.now().toString().slice(-6)}`;
}

export function generateEAN(prefix = '7890000'): string {
  return `${prefix}${Date.now().toString().slice(-6)}`;
}

export const TestData = SEED_DATA;
