import React, { type ReactNode } from 'react';
import { Text, Linking } from 'react-native';
import { theme } from '../constants';

export function getDateKey(d: string | Date): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(date.getDate()).padStart(2, '0')}`;
}

export function formatDateLabel(d: string | Date): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const tk = getDateKey(today);
  const yk = getDateKey(yesterday);
  const k = getDateKey(date);

  if (k === tk) return 'Today';
  if (k === yk) return 'Yesterday';

  return date.toLocaleDateString([], {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatTime(d: string | Date): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Linkify helper for React Native: splits text into segments and makes URLs tappable.
 * Returns an array of <Text> nodes (safe to render inside a parent <Text> or as children).
 */
export function linkify(
  text: string | null | undefined,
  keyPrefix = 'link',
): Array<ReactNode> {
  if (text === null || text === undefined) {
    return [<Text key={`${keyPrefix}-null`}>{''}</Text>];
  }

  const str = String(text);
  if (str.length === 0) return [<Text key={`${keyPrefix}-empty`}>{''}</Text>];

  const urlPattern = /(https?:\/\/[^\s<>\"]+)|(www\.[^\s<>\"]+)|(youtu\.be\/[^\s<>\"]+)/gi;
  const parts: Array<ReactNode> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null = null;
  let counter = 0;

  try {
    while ((match = urlPattern.exec(str)) !== null) {
      if (match.index === lastIndex && match[0].length === 0) {
        urlPattern.lastIndex++;
        continue;
      }

      if (match.index > lastIndex) {
        parts.push(
          <Text key={`${keyPrefix}-text-${counter++}`}>{str.slice(lastIndex, match.index)}</Text>,
        );
      }

      let href = match[0];
      if (!/^https?:\/\//i.test(href)) {
        href = `https://${href}`;
      }

      const display = match[0];
      const key = `${keyPrefix}-link-${counter++}-${match.index}`;

      parts.push(
        <Text
          key={key}
          style={{ color: theme.accent, textDecorationLine: 'underline' }}
          onPress={() => {
            Linking.openURL(href).catch((err) => console.warn('Failed to open URL:', href, err));
          }}
        >
          {display}
        </Text>,
      );

      lastIndex = urlPattern.lastIndex;
    }
  } catch (err) {
    console.error('linkify parse error', err);
    return [<Text key={`${keyPrefix}-error`}>{str}</Text>];
  }

  if (lastIndex < str.length) {
    parts.push(<Text key={`${keyPrefix}-text-${counter++}-end`}>{str.slice(lastIndex)}</Text>);
  }

  if (parts.length === 0) return [<Text key={`${keyPrefix}-plain`}>{str}</Text>];
  return parts;
}
