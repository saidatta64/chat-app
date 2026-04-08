const DEFAULT_API_URL = 'https://chat-app-1-a804.onrender.com';

// Keep Render URL as the source of truth so stale local env values
// cannot accidentally point the mobile app to an older backend.
export const API_URL = DEFAULT_API_URL.replace(/\/+$/, '');

console.log('🔗 Mobile API URL:', API_URL);

export const theme = {
  bgPage: '#0B141A',
  bgPrimary: '#111B21',
  bgSecondary: '#202C33',
  bgTertiary: '#2A3942',
  bgHover: '#233138',
  textPrimary: '#E9EDEF',
  textSecondary: '#8696A0',
  accent: '#00A884',
  accentSoft: 'rgba(0, 168, 132, 0.18)',
  bubbleSent: '#005C4B',
  bubbleSentBorder: '#005C4B',
  bubbleReceived: '#202C33',
  border: '#2A3942',
  success: '#25D366',
  successBg: 'rgba(37, 211, 102, 0.12)',
  error: '#F15C6D',
  errorBg: 'rgba(241, 92, 109, 0.12)',
  warning: '#FFD279',
  warningBg: 'rgba(255, 210, 121, 0.12)',
};

export const TOAST_DURATION = {
  SUCCESS: 3000,
  ERROR: 5000,
};
