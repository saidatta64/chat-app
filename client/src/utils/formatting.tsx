import React from 'react';

export function extractFirstHttpUrl(text: string | null | undefined): string | null {
  if (text == null) return null;
  const m = String(text).match(/(https?:\/\/[^\s<>"]+)/i);
  return m ? m[1] : null;
}

export function hostnameOnly(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function formatTime(d: string): string {
  return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function getDateKey(d: string): string {
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function formatDateLabel(d: string): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const tk = getDateKey(today.toISOString());
  const yk = getDateKey(yesterday.toISOString());
  const k = getDateKey(d);
  if (k === tk) return 'Today';
  if (k === yk) return 'Yesterday';
  return new Date(d).toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Turn URLs in text into clickable links (https, http, www., youtu.be)
export function linkify(text: string): React.ReactNode[] {
  if (!text || typeof text !== 'string') return [text];
  const urlPattern = /(https?:\/\/[^\s<>"]+)|(www\.[^\s<>"]+)|(youtu\.be\/[^\s<>"]+)/gi;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(urlPattern.source, urlPattern.flags);
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIndex) {
      parts.push(text.slice(lastIndex, m.index));
    }
    let href = m[0];
    if (!/^https?:\/\//i.test(href)) href = `https://${href}`;
    parts.push(
      <a key={m.index} href={href} target="_blank" rel="noopener noreferrer" className="message-link">
        {m[0]}
      </a>
    );
    lastIndex = re.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length ? parts : [text];
}
