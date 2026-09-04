// Standalone backend API for Qnote.
// Deploy this to any Node host (Render, Railway, Heroku, Fly.io, Vercel, etc.).
// The frontend (static SPA) is hosted separately on Netlify / InfinityFree.
//
// Env vars:
//   PORT            - listen port (default 3000)
//   CORS_ORIGINS    - comma-separated list of allowed frontend origins (default *)
//   ADMIN_USERNAME  - admin login (default admin@notes.local)
//   ADMIN_PASSWORD  - admin login password (default admin123)
//   DATA_DIR        - where JSON data files are stored (default ./data)
//
// Endpoints:
//   GET  /api/health
//   GET  /api/settings
//   POST /api/notes/private/hash-password
//   POST /api/notes/private/verify-password
//   POST /api/admin/login
//   POST /api/admin/logout
//   GET  /api/admin/me
//   GET  /api/admin/settings
//   POST /api/admin/settings
//   POST /api/admin/upload-asset
//   POST /api/admin/change-password
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

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
const ADMIN_FILE = path.join(DATA_DIR, 'admin_account.json');
const PUBLIC_DIR = path.join(process.cwd(), 'public');
const ASSET_UPLOAD_DIR = path.join(PUBLIC_DIR, 'assets', 'uploads');

for (const dir of [DATA_DIR, ASSET_UPLOAD_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Firebase config from env (recommended) with sensible defaults
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: process.env.FIREBASE_API_KEY || 'AIzaSyBw1vhpCHelRkv8BMnCcemQ-50xZyMCdc0',
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'note-site-je.firebaseapp.com',
  projectId: process.env.FIREBASE_PROJECT_ID || 'note-site-je',
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'note-site-je.firebasestorage.app',
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '1011717430011',
  appId: process.env.FIREBASE_APP_ID || '1:1011717430011:web:ec41c01ffc09014d422e5e',
};

const DEFAULT_WEBSITE_SETTINGS = {
  website_name: 'Qnote',
  logo: '/assets/logo.png' as string | null,
  favicon: '/favicon.png' as string | null,
  primary_color: '#c15f3c',
  firebase_config: DEFAULT_FIREBASE_CONFIG,
};

function getStoredSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const content = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      return { ...DEFAULT_WEBSITE_SETTINGS, firebase_config: DEFAULT_FIREBASE_CONFIG, ...JSON.parse(content) };
    }
  } catch (e) {
    console.error('Failed reading settings file', e);
  }
  return DEFAULT_WEBSITE_SETTINGS;
}

function saveStoredSettings(settings: any) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed saving settings file', e);
  }
}

// Admin auth
function hashAdminPassword(password: string, salt?: string): string {
  const s = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, s, 100000, 32, 'sha256').toString('hex');
  return `${s}:${hash}`;
}

function verifyAdminPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [s, expected] = storedHash.split(':');
  const actual = crypto.pbkdf2Sync(password, s, 100000, 32, 'sha256').toString('hex');
  return actual === expected;
}

let adminSessionTokens = new Set<string>();

function getAdminAccount() {
  try {
    if (fs.existsSync(ADMIN_FILE)) {
      const data = JSON.parse(fs.readFileSync(ADMIN_FILE, 'utf-8'));
      if (process.env.ADMIN_USERNAME || process.env.ADMIN_PASSWORD) {
        data.username = process.env.ADMIN_USERNAME || data.username;
        if (process.env.ADMIN_PASSWORD) {
          data.passwordHash = hashAdminPassword(process.env.ADMIN_PASSWORD);
        }
      }
      return data;
    }
  } catch {}

  const defaultAdmin = {
    username: process.env.ADMIN_USERNAME || 'admin@notes.local',
    passwordHash: hashAdminPassword(process.env.ADMIN_PASSWORD || 'admin123'),
  };
  try {
    fs.writeFileSync(ADMIN_FILE, JSON.stringify(defaultAdmin, null, 2));
  } catch {}
  return defaultAdmin;
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Admin authentication token required' });
  }
  const token = authHeader.split(' ')[1];
  if (!adminSessionTokens.has(token)) {
    return res.status(403).json({ error: 'Forbidden: Invalid or expired admin session token' });
  }
  next();
}

// === PUBLIC API ===
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.get('/api/settings', (req, res) => {
  res.json(getStoredSettings());
});

app.post('/api/notes/private/hash-password', (req, res) => {
  const { password } = req.body;
  if (!password || typeof password !== 'string' || password.length < 1) {
    return res.status(400).json({ error: 'Password string is required' });
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
  res.json({ hash: `${salt}:${hash}` });
});

app.post('/api/notes/private/verify-password', (req, res) => {
  const { password, storedHash } = req.body;
  if (!password || !storedHash) {
    return res.status(400).json({ error: 'Password and storedHash are required' });
  }
  if (typeof storedHash !== 'string' || !storedHash.includes(':')) {
    return res.json({ verified: false });
  }
  const [salt, expected] = storedHash.split(':');
  const actual = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
  res.json({ verified: actual === expected });
});

// === ADMIN API ===
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  const admin = getAdminAccount();
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  if (username.trim().toLowerCase() === admin.username.toLowerCase() && verifyAdminPassword(password, admin.passwordHash)) {
    const token = 'adm_' + crypto.randomBytes(32).toString('hex');
    adminSessionTokens.add(token);
    return res.json({ success: true, token, user: { username: admin.username, role: 'admin' } });
  }
  return res.status(401).json({ error: 'Invalid admin credentials' });
});

app.post('/api/admin/logout', requireAdmin, (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    adminSessionTokens.delete(token);
  }
  res.json({ success: true });
});

app.get('/api/admin/me', requireAdmin, (req, res) => {
  const admin = getAdminAccount();
  res.json({ username: admin.username, role: 'admin' });
});

app.post('/api/admin/change-password', requireAdmin, (req, res) => {
  const { currentPassword, newPassword, newUsername } = req.body;
  const admin = getAdminAccount();
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Both current and new password required' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }
  if (!verifyAdminPassword(currentPassword, admin.passwordHash)) {
    return res.status(400).json({ error: 'Incorrect current password' });
  }
  admin.passwordHash = hashAdminPassword(newPassword);
  if (newUsername !== undefined) {
    if (typeof newUsername !== 'string' || !newUsername.includes('@')) {
      return res.status(400).json({ error: 'A valid admin email is required' });
    }
    admin.username = newUsername.trim().toLowerCase();
  }
  fs.writeFileSync(ADMIN_FILE, JSON.stringify(admin, null, 2));
  res.json({ success: true, message: 'Password updated successfully' });
});

app.get('/api/admin/settings', requireAdmin, (req, res) => {
  res.json(getStoredSettings());
});

app.post('/api/admin/upload-asset', requireAdmin, (req, res) => {
  const { dataUrl, assetType } = req.body;
  if (typeof dataUrl !== 'string' || typeof assetType !== 'string') {
    return res.status(400).json({ error: 'Image data and asset type are required' });
  }
  const match = dataUrl.match(/^data:(image\/(png|jpeg|jpg|webp|gif|svg\+xml));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) {
    return res.status(400).json({ error: 'Only PNG, JPEG, WEBP, GIF, and SVG images are supported' });
  }
  if (assetType !== 'logo' && assetType !== 'favicon') {
    return res.status(400).json({ error: 'Invalid asset type' });
  }
  const extensionByMime: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
  };
  const mimeType = match[1];
  const imageBuffer = Buffer.from(match[3], 'base64');
  const maxBytes = assetType === 'favicon' ? 512 * 1024 : 2 * 1024 * 1024;
  if (imageBuffer.length > maxBytes) {
    return res.status(400).json({ error: `${assetType} file exceeds the ${maxBytes / 1024}KB limit` });
  }
  const filename = `${assetType}-${crypto.randomBytes(12).toString('hex')}.${extensionByMime[mimeType]}`;
  fs.writeFileSync(path.join(ASSET_UPLOAD_DIR, filename), imageBuffer);
  res.json({ success: true, url: `/assets/uploads/${filename}` });
});

app.post('/api/admin/settings', requireAdmin, (req, res) => {
  const { website_name, logo, favicon, primary_color, firebase_config } = req.body;
  const current = getStoredSettings();

  if (website_name !== undefined) {
    if (typeof website_name !== 'string' || website_name.trim().length === 0) {
      return res.status(400).json({ error: 'Website name cannot be empty' });
    }
    current.website_name = website_name.trim();
  }

  if (primary_color !== undefined) {
    if (typeof primary_color !== 'string' || !/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(primary_color)) {
      return res.status(400).json({ error: 'Valid hex color required (e.g. #c15f3c)' });
    }
    current.primary_color = primary_color;
  }

  if (logo !== undefined) {
    if (logo === null || logo === '') {
      current.logo = null;
    } else if (typeof logo === 'string') {
      if (logo.startsWith('data:image/') || logo.startsWith('http://') || logo.startsWith('https://') || logo.startsWith('/')) {
        if (logo.length > 3 * 1024 * 1024) {
          return res.status(400).json({ error: 'Logo file size exceeds 2MB limit' });
        }
        current.logo = logo;
      } else {
        return res.status(400).json({ error: 'Invalid logo format. Must be an image file.' });
      }
    }
  }

  if (favicon !== undefined) {
    if (favicon === null || favicon === '') {
      current.favicon = null;
    } else if (typeof favicon === 'string') {
      if (favicon.startsWith('data:image/') || favicon.startsWith('http://') || favicon.startsWith('https://') || favicon.startsWith('/')) {
        if (favicon.length > 1 * 1024 * 1024) {
          return res.status(400).json({ error: 'Favicon file size exceeds 500KB limit' });
        }
        current.favicon = favicon;
      } else {
        return res.status(400).json({ error: 'Invalid favicon format. Must be an image file.' });
      }
    }
  }

  if (firebase_config !== undefined && typeof firebase_config === 'object') {
    current.firebase_config = {
      apiKey: firebase_config.apiKey || current.firebase_config?.apiKey || '',
      authDomain: firebase_config.authDomain || current.firebase_config?.authDomain || '',
      projectId: firebase_config.projectId || current.firebase_config?.projectId || '',
      storageBucket: firebase_config.storageBucket || current.firebase_config?.storageBucket || '',
      messagingSenderId: firebase_config.messagingSenderId || current.firebase_config?.messagingSenderId || '',
      appId: firebase_config.appId || current.firebase_config?.appId || '',
    };
  }

  saveStoredSettings(current);
  res.json({ success: true, settings: current });
});

// Serve uploaded assets and static brand files (logo, favicon).
app.use('/assets', express.static(path.join(PUBLIC_DIR, 'assets')));
app.use('/favicon.png', express.static(path.join(PUBLIC_DIR, 'favicon.png')));
app.use('/logo.png', express.static(path.join(PUBLIC_DIR, 'logo.png')));

// 404 for unknown API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Qnote API server running on port ${PORT}`);
});
