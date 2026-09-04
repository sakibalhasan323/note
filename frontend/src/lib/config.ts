// Central API configuration.
// The frontend is a static SPA (hosted on Netlify / InfinityFree) and the
// backend is a separate Express API. Set VITE_API_URL at build time to point
// to your deployed backend, e.g. https://your-api.onrender.com
const DEFAULT_API_URL = '/api';

export const API_URL: string = (import.meta.env.VITE_API_URL as string)?.replace(/\/+$/, '') || DEFAULT_API_URL;

// Guest private-note password is stored locally until the user signs in,
// after which it is migrated to Firebase.
export const GUEST_PRIVATE_PASSWORD_KEY = 'note_guest_private_password_v1';

export function apiUrl(path: string): string {
  return `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
