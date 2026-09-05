// Central API configuration.
// The frontend is a static SPA (hosted on Netlify / InfinityFree) and the
// backend is a separate Express API. Set VITE_API_URL at build time to point
// to your deployed backend base URL, e.g. https://your-api.onrender.com
// (no trailing slash). All endpoints live under /api on the backend.
const VITE_API_URL: string = (import.meta.env.VITE_API_URL as string)?.replace(/\/+$/, '') || '';

// Guest private-note password is stored locally until the user signs in,
// after which it is migrated to Firebase.
export const GUEST_PRIVATE_PASSWORD_KEY = 'note_guest_private_password_v1';

// Build the full API base: relative ("/api") when no backend URL is set,
// otherwise "<backend-url>/api".
function apiBase(): string {
  if (!VITE_API_URL) return '/api';
  return VITE_API_URL.endsWith('/api') ? VITE_API_URL : `${VITE_API_URL}/api`;
}

export function apiUrl(path: string): string {
  return `${apiBase()}${path.startsWith('/') ? path : `/${path}`}`;
}
