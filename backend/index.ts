// Standalone API for Note.
// Deploy to any Node host (Render, Railway, Heroku, Fly.io, Vercel, etc.).
// The frontend (static SPA) is hosted separately on Netlify / Vercel / Render /
// InfinityFree. The backend is OPTIONAL - it only serves site branding for
// advanced setups. The core app works fully without it (Firebase + localStorage).
//
// Env vars:
//   PORT            - listen port (default 3000)
//   CORS_ORIGINS    - comma-separated list of allowed frontend origins (default *)
//   DATA_DIR        - where JSON data files are stored (default ./data)
//
// Endpoints:
//   GET  /api/health
//   GET  /api/settings
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const allowedOrigins = (process.env.CORS_ORIGINS || '*')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.includes('*') ? true : allowedOrigins,
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));

// Data storage
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'website_settings.json');
const PUBLIC_DIR = path.join(process.cwd(), 'public');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DEFAULT_WEBSITE_SETTINGS = {
  website_name: 'Note',
  logo: '/assets/logo.png' as string | null,
  favicon: '/favicon.png' as string | null,
  primary_color: '#c15f3c',
};

function getStoredSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const content = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      return { ...DEFAULT_WEBSITE_SETTINGS, ...JSON.parse(content) };
    }
  } catch (e) {
    console.error('Failed reading settings file', e);
  }
  return DEFAULT_WEBSITE_SETTINGS;
}

// === PUBLIC API ===
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.get('/api/settings', (req, res) => {
  res.json(getStoredSettings());
});

// Serve uploaded/static brand files (logo, favicon).
app.use('/assets', express.static(path.join(PUBLIC_DIR, 'assets')));
app.use('/favicon.png', express.static(path.join(PUBLIC_DIR, 'favicon.png')));
app.use('/logo.png', express.static(path.join(PUBLIC_DIR, 'logo.png')));

// 404 for unknown API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Note API server running on port ${PORT}`);
});