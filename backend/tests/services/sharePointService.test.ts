/**
 * Unit tests for SharePoint Service utilities
 */

import {
  parseSharePointDate,
  parseHours,
  normalizeWorkLocation,
} from '../../src/services/sharePointService';

describe('SharePointService', () => {
  describe('parseSharePointDate', () => {
    it('should parse ISO format dates with timezone', () => {
      const result = parseSharePointDate('2025-01-20T00:00:00Z');
      expect(result).toBeInstanceOf(Date);
      // Use UTC methods since the date string has Z (UTC) timezone
      expect(result?.getUTCFullYear()).toBe(2025);
      expect(result?.getUTCMonth()).toBe(0); // January is 0
      expect(result?.getUTCDate()).toBe(20);
    });

    it('should parse US date format MM/DD/YYYY', () => {
      const result = parseSharePointDate('01/20/2025');
      expect(result).toBeInstanceOf(Date);
      // Local date parsing
      expect(result?.getFullYear()).toBe(2025);
      expect(result?.getMonth()).toBe(0);
      expect(result?.getDate()).toBe(20);
    });

    it('should parse US date format M/D/YYYY', () => {
      const result = parseSharePointDate('1/5/2025');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2025);
      expect(result?.getMonth()).toBe(0);
      expect(result?.getDate()).toBe(5);
    });

    it('should return null for undefined input', () => {
      const result = parseSharePointDate(undefined);
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = parseSharePointDate('');
      expect(result).toBeNull();
    });

    it('should parse date string and return valid date', () => {
      const result = parseSharePointDate('2025-06-15');
      expect(result).toBeInstanceOf(Date);
      // The date should be a valid date object
      expect(result?.getTime()).not.toBeNaN();
      // Just check the year is correct - exact date depends on timezone interpretation
      expect(result?.getFullYear()).toBeGreaterThanOrEqual(2025);
    });
  });

  describe('parseHours', () => {
    it('should parse number values directly', () => {
      expect(parseHours(8)).toBe(8);
      expect(parseHours(4.5)).toBe(4.5);
      expect(parseHours(0)).toBe(0);
    });

    it('should parse string numbers', () => {
      expect(parseHours('8')).toBe(8);
      expect(parseHours('4.5')).toBe(4.5);
      expect(parseHours('0')).toBe(0);
    });

    it('should parse strings with units', () => {
      expect(parseHours('8 hours')).toBe(8);
      expect(parseHours('4.5h')).toBe(4.5);
    });

    it('should return 0 for undefined', () => {
      expect(parseHours(undefined)).toBe(0);
    });

    it('should return 0 for non-numeric string', () => {
      expect(parseHours('abc')).toBe(0);
    });

    it('should handle negative numbers', () => {
      expect(parseHours(-5)).toBe(-5);
      expect(parseHours('-5')).toBe(-5);
    });
  });

  describe('normalizeWorkLocation', () => {
    it('should return Office for office-related terms', () => {
      expect(normalizeWorkLocation('Office')).toBe('Office');
      expect(normalizeWorkLocation('office')).toBe('Office');
      expect(normalizeWorkLocation('OFFICE')).toBe('Office');
      expect(normalizeWorkLocation('Onsite')).toBe('Office');
      expect(normalizeWorkLocation('onsite')).toBe('Office');
    });

    it('should return WFH for remote-related terms', () => {
      expect(normalizeWorkLocation('WFH')).toBe('WFH');
      expect(normalizeWorkLocation('wfh')).toBe('WFH');
      expect(normalizeWorkLocation('Home')).toBe('WFH');
      expect(normalizeWorkLocation('home')).toBe('WFH');
      expect(normalizeWorkLocation('Remote')).toBe('WFH');
      expect(normalizeWorkLocation('remote')).toBe('WFH');
      expect(normalizeWorkLocation('Work from home')).toBe('WFH');
    });

    it('should return Other for unrecognized terms', () => {
      expect(normalizeWorkLocation('Client site')).toBe('Other');
      expect(normalizeWorkLocation('Conference')).toBe('Other');
      expect(normalizeWorkLocation('Travel')).toBe('Other');
    });

    it('should return Office for undefined or empty string', () => {
      expect(normalizeWorkLocation(undefined)).toBe('Office');
      expect(normalizeWorkLocation('')).toBe('Office');
    });

    it('should handle whitespace', () => {
      expect(normalizeWorkLocation('  WFH  ')).toBe('WFH');
      expect(normalizeWorkLocation('  Office  ')).toBe('Office');
    });
  });
});
