import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { getDateKey, formatDateLabel, formatTime, extractFirstHttpUrl, linkify } from './formatting';

// Mock react-native
vi.mock('react-native', () => {
  const React = require('react');
  const Text = ({ children, onPress, style }: any) => {
    // Return a react element representation to inspect in tests
    return React.createElement('Text', { onPress, style }, children);
  };
  const Linking = {
    openURL: vi.fn().mockImplementation(() => Promise.resolve(true)),
  };
  return { Text, Linking };
});

import { Linking } from 'react-native';

describe('formatting utils', () => {
  describe('getDateKey', () => {
    it('should format Date objects and ISO strings to YYYY-MM-DD', () => {
      const date = new Date(2026, 5, 21); // June 21, 2026 (month is 0-indexed)
      expect(getDateKey(date)).toBe('2026-06-21');
      expect(getDateKey('2026-06-21T01:54:27Z')).toBe('2026-06-21');
    });
  });

  describe('formatDateLabel', () => {
    it('should return Today for current date', () => {
      const today = new Date();
      expect(formatDateLabel(today)).toBe('Today');
    });

    it('should return Yesterday for previous date', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(formatDateLabel(yesterday)).toBe('Yesterday');
    });

    it('should return formatted date for older dates', () => {
      const older = new Date(2025, 11, 25);
      expect(formatDateLabel(older)).toMatch(/25\/12\/2025|12\/25\/2025/); // depending on locale/runtime
    });
  });

  describe('formatTime', () => {
    it('should format dates to short time string', () => {
      const time = new Date(2026, 5, 21, 14, 30); // 2:30 PM
      const formatted = formatTime(time);
      expect(formatted).toMatch(/02:30|14:30|2:30/);
    });
  });

  describe('extractFirstHttpUrl', () => {
    it('should extract first HTTP/HTTPS url', () => {
      expect(extractFirstHttpUrl('Check https://example.com/test')).toBe('https://example.com/test');
      expect(extractFirstHttpUrl('Check http://example.com first, then http://other.com')).toBe('http://example.com');
      expect(extractFirstHttpUrl('No URL here')).toBeNull();
      expect(extractFirstHttpUrl(null)).toBeNull();
      expect(extractFirstHttpUrl(undefined)).toBeNull();
    });
  });

  describe('linkify', () => {
    it('should handle null, undefined, empty string', () => {
      const resNull: any = linkify(null);
      expect(resNull).toHaveLength(1);
      expect(resNull[0].props.children).toBe('');

      const resEmpty: any = linkify('');
      expect(resEmpty).toHaveLength(1);
      expect(resEmpty[0].props.children).toBe('');
    });

    it('should return single text node for plain text', () => {
      const res: any = linkify('Hello world');
      expect(res).toHaveLength(1);
      expect(res[0].props.children).toBe('Hello world');
    });

    it('should split text and add tappable elements for URLs', () => {
      const res: any = linkify('Visit https://google.com for search');
      expect(res).toHaveLength(3);
      
      // Before URL
      expect(res[0].props.children).toBe('Visit ');
      
      // The URL link component
      const linkComponent: any = res[1];
      expect(linkComponent.props.children).toBe('https://google.com');
      expect(linkComponent.props.style).toHaveProperty('textDecorationLine', 'underline');
      
      // After URL
      expect(res[2].props.children).toBe(' for search');
    });

    it('should support www. prefixed URLs', () => {
      const res: any = linkify('Check www.example.com');
      expect(res).toHaveLength(2);
      expect(res[0].props.children).toBe('Check ');
      expect(res[1].props.children).toBe('www.example.com');
    });

    it('should call Linking.openURL on link press', () => {
      vi.clearAllMocks();
      const res: any = linkify('Go to https://openai.com');
      const linkComponent: any = res[1];
      
      // Simulate press
      linkComponent.props.onPress();
      expect(Linking.openURL).toHaveBeenCalledWith('https://openai.com');
    });
  });
});
