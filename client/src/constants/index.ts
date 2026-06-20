export const API_URL = (
  ((import.meta as any).env?.VITE_API_URL as string | undefined)?.trim() ||
  'https://chat-app-1-a804.onrender.com'
).replace(/\/+$/, '');

export const MESSAGES_PAGE_SIZE = 50;

console.log('🔗 Frontend API URL:', API_URL);
