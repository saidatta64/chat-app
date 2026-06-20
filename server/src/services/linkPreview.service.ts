import { cacheGet, cacheSet } from './cache.service';

/**
 * Fetches Open Graph / Twitter Card metadata for link previews (chat messages).
 * Uses a mobile-style User-Agent because some hosts (e.g. Instagram) omit og:image for generic bots.
 */

export interface LinkPreviewData {
  url: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  siteName?: string;
  isVideo?: boolean;
}

const URL_IN_TEXT =
  /(https?:\/\/[^\s<>"]+)/i;

const FETCH_TIMEOUT_MS = 9000;
const LINK_PREVIEW_CACHE_TTL_SECONDS = 60 * 60 * 24; // 24 hours

const FETCH_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  Accept: 'text/html,application/xhtml+xml',
  'Accept-Language': 'en-US,en;q=0.9',
};

function decodeHtmlEntities(raw: string): string {
  let s = raw
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

  s = s.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
    String.fromCodePoint(parseInt(hex, 16)),
  );
  s = s.replace(/&#(\d+);/g, (_, num) =>
    String.fromCodePoint(parseInt(num, 10)),
  );
  return s;
}

function extractMetaContent(html: string, attrs: RegExp[]): string | undefined {
  for (const attrRe of attrs) {
    const re = new RegExp(
      `<meta[^>]+${attrRe.source}[^>]*content=(["'])([^"']*)\\1`,
      'i'
    );
    const m = html.match(re);
    if (m?.[2]) return decodeHtmlEntities(m[2].trim());
    const re2 = new RegExp(
      `<meta[^>]+content=(["'])([^"']*)\\1[^>]+${attrRe.source}`,
      'i'
    );
    const m2 = html.match(re2);
    if (m2?.[2]) return decodeHtmlEntities(m2[2].trim());
  }
  return undefined;
}

function extractOgType(html: string): string | undefined {
  return extractMetaContent(html, [/property=["']og:type["']/i, /name=["']og:type["']/i]);
}

function extractTitle(html: string): string | undefined {
  const og = extractMetaContent(html, [/property=["']og:title["']/i, /name=["']og:title["']/i]);
  if (og) return og;
  const tw = extractMetaContent(html, [/name=["']twitter:title["']/i]);
  if (tw) return tw;
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return m?.[1] ? decodeHtmlEntities(m[1].trim()) : undefined;
}

function extractDescription(html: string): string | undefined {
  const og = extractMetaContent(html, [/property=["']og:description["']/i, /name=["']og:description["']/i]);
  if (og) return og;
  return extractMetaContent(html, [/name=["']twitter:description["']/i]);
}

function extractImage(html: string, baseUrl: string): string | undefined {
  const og = extractMetaContent(html, [/property=["']og:image["']/i, /name=["']og:image["']/i]);
  const tw = extractMetaContent(html, [/name=["']twitter:image["']/i, /name=["']twitter:image:src["']/i]);
  const raw = og || tw;
  if (!raw) return undefined;
  try {
    return new URL(raw, baseUrl).href;
  } catch {
    return raw;
  }
}

function extractSiteName(html: string, pageUrl: URL): string | undefined {
  const og = extractMetaContent(html, [/property=["']og:site_name["']/i]);
  if (og) return og;
  return pageUrl.hostname.replace(/^www\./, '');
}

function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.localhost')) return true;
  if (h === '0.0.0.0') return true;
  if (h.endsWith('.local')) return true;
  if (h === '127.0.0.1' || h.startsWith('127.')) return true;
  if (h === '::1') return true;
  if (h.endsWith('.onion')) return true;
  const ipv4 = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (ipv4) {
    const [, a, b] = ipv4;
    const ai = parseInt(a, 10);
    const bi = parseInt(b, 10);
    if (ai === 10) return true;
    if (ai === 127) return true;
    if (ai === 0) return true;
    if (ai === 169 && bi === 254) return true;
    if (ai === 192 && bi === 168) return true;
    if (ai === 172 && bi >= 16 && bi <= 31) return true;
  }
  return false;
}

export function extractFirstHttpUrl(text: string): string | null {
  if (!text || typeof text !== 'string') return null;
  const m = text.match(URL_IN_TEXT);
  return m ? m[1] : null;
}

export function isUrlSafeForFetch(urlString: string): boolean {
  let u: URL;
  try {
    u = new URL(urlString);
  } catch {
    return false;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
  if (isBlockedHost(u.hostname)) return false;
  return true;
}

function guessIsVideo(pageUrl: URL, ogType: string | undefined, html: string): boolean {
  const p = pageUrl.pathname.toLowerCase();
  if (/\/reel\//i.test(p) || /\/reels\//i.test(p)) return true;
  if (/\/watch\?/i.test(p) || /youtu\.be\//i.test(pageUrl.hostname)) return true;
  if (ogType && /video/i.test(ogType)) return true;
  if (/property=["']og:type["'][^>]+content=["']video/i.test(html)) return true;
  return false;
}

export async function fetchLinkPreview(urlString: string): Promise<LinkPreviewData | null> {
  const trimmed = urlString.trim();
  if (!trimmed || !isUrlSafeForFetch(trimmed)) return null;

  const cached = await cacheGet<LinkPreviewData>('link-preview', trimmed);
  if (cached?.url) return cached;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(trimmed, {
      method: 'GET',
      redirect: 'follow',
      headers: FETCH_HEADERS,
      signal: controller.signal,
    });

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      const pageUrl = new URL(trimmed);
      const minimal = {
        url: trimmed,
        siteName: pageUrl.hostname.replace(/^www\./, ''),
        isVideo: guessIsVideo(pageUrl, undefined, ''),
      };
      await cacheSet('link-preview', trimmed, minimal, LINK_PREVIEW_CACHE_TTL_SECONDS);
      return minimal;
    }

    const html = await res.text();
    const finalUrl = res.url || trimmed;
    let pageUrl: URL;
    try {
      pageUrl = new URL(finalUrl);
    } catch {
      pageUrl = new URL(trimmed);
    }

    const title = extractTitle(html);
    const description = extractDescription(html);
    const imageUrl = extractImage(html, finalUrl);
    const siteName = extractSiteName(html, pageUrl);
    const ogType = extractOgType(html);
    const isVideo = guessIsVideo(pageUrl, ogType, html);

    if (!title && !description && !imageUrl) {
      const minimal = {
        url: finalUrl,
        siteName: siteName || pageUrl.hostname.replace(/^www\./, ''),
        isVideo,
      };
      await cacheSet('link-preview', trimmed, minimal, LINK_PREVIEW_CACHE_TTL_SECONDS);
      return minimal;
    }

    const preview = {
      url: finalUrl,
      title,
      description,
      imageUrl,
      siteName,
      isVideo,
    };
    await cacheSet('link-preview', trimmed, preview, LINK_PREVIEW_CACHE_TTL_SECONDS);
    return preview;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
