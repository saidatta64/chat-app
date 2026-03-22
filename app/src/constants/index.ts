export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

console.log('🔗 Mobile API URL:', API_URL);

export const theme = {
  bgPage: '#0F1117',
  bgPrimary: '#0D0F14',
  bgSecondary: '#151823',
  bgTertiary: '#1A1F2B',
  bgHover: '#222633',
  textPrimary: '#E6EAF2',
  textSecondary: '#8B93A7',
  accent: '#6366F1',
  accentSoft: 'rgba(99, 102, 241, 0.18)',
  bubbleSent: 'rgba(99, 102, 241, 0.22)',
  bubbleSentBorder: 'rgba(99, 102, 241, 0.35)',
  bubbleReceived: '#1A1F2B',
  border: '#222633',
  success: '#34D399',
  successBg: 'rgba(52, 211, 153, 0.12)',
  error: '#F87171',
  errorBg: 'rgba(248, 113, 113, 0.12)',
  warning: '#FBBF24',
  warningBg: 'rgba(251, 191, 36, 0.12)',
};

export const TOAST_DURATION = {
  SUCCESS: 3000,
  ERROR: 5000,
};
