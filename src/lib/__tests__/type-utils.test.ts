import { describe, it, expect } from 'vitest';
import { getErrorMessage, isSortable, parseJSON, isNotNull } from '../type-utils';

describe('type-utils', () => {
  describe('getErrorMessage', () => {
    it('extracts message from Error object', () => {
      const error = new Error('Test error');
      expect(getErrorMessage(error)).toBe('Test error');
    });

    it('returns string error as-is', () => {
      expect(getErrorMessage('String error')).toBe('String error');
    });

    it('returns default message for unknown error', () => {
      expect(getErrorMessage(null)).toBe('An unknown error occurred');
      expect(getErrorMessage(undefined)).toBe('An unknown error occurred');
      expect(getErrorMessage(123)).toBe('An unknown error occurred');
    });
  });

  describe('isSortable', () => {
    it('returns true for strings', () => {
      expect(isSortable('test')).toBe(true);
    });

    it('returns true for numbers', () => {
      expect(isSortable(123)).toBe(true);
      expect(isSortable(0)).toBe(true);
    });

    it('returns false for other types', () => {
      expect(isSortable(null)).toBe(false);
      expect(isSortable(undefined)).toBe(false);
      expect(isSortable({})).toBe(false);
      expect(isSortable([])).toBe(false);
    });
  });

  describe('parseJSON', () => {
    it('parses valid JSON', () => {
      const result = parseJSON<{ name: string }>('{"name":"test"}');
      expect(result).toEqual({ name: 'test' });
    });

    it('returns null for invalid JSON', () => {
      expect(parseJSON('invalid')).toBe(null);
      expect(parseJSON('')).toBe(null);
    });
  });

  describe('isNotNull', () => {
    it('returns true for valid values', () => {
      expect(isNotNull('test')).toBe(true);
      expect(isNotNull(0)).toBe(true);
      expect(isNotNull(false)).toBe(true);
      expect(isNotNull({})).toBe(true);
    });

    it('returns false for null and undefined', () => {
      expect(isNotNull(null)).toBe(false);
      expect(isNotNull(undefined)).toBe(false);
    });

    it('filters arrays correctly', () => {
      const arr = [1, null, 2, undefined, 3];
      const filtered = arr.filter(isNotNull);
      expect(filtered).toEqual([1, 2, 3]);
    });
  });
});
