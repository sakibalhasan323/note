import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

// Middleware for JSON with generous limit for base64 logos
app.use(express.json({ limit: '10mb' }));

// Data storage for website settings
const DATA_DIR = path.join(process.cwd(), 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'website_settings.json');
const ADMIN_FILE = path.join(DATA_DIR, 'admin_account.json');

if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (e) {
    console.error('Could not create data directory', e);
  }
}

// Initial default settings
const DEFAULT_WEBSITE_SETTINGS = {
  website_name: 'Note',
  logo: null as string | null,
  favicon: null as string | null,
  primary_color: '#6366f1',
  firebase_config: {
    apiKey: "AIzaSyBw1vhpCHelRkv8BMnCcemQ-50xZyMCdc0",
    authDomain: "note-site-je.firebaseapp.com",
    projectId: "note-site-je",
    storageBucket: "note-site-je.firebasestorage.app",
    messagingSenderId: "1011717430011",
    appId: "1:1011717430011:web:ec41c01ffc09014d422e5e"
  }
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

function saveStoredSettings(settings: any) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed saving settings file', e);
  }
}

// Admin account configuration
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
      return data;
    }
  } catch {}
  
  // Default admin: admin@notes.local / admin123
  const defaultAdmin = {
    username: 'admin@notes.local',
    passwordHash: hashAdminPassword('admin123'),
  };
  try {
    fs.writeFileSync(ADMIN_FILE, JSON.stringify(defaultAdmin, null, 2));
  } catch {}
  return defaultAdmin;
}

// Middleware: Admin Authorization
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

// === PUBLIC API ROUTES ===
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.get('/api/settings', (req, res) => {
  const settings = getStoredSettings();
  res.json(settings);
});

// Server-side password hashing helper for private notes
app.post('/api/notes/private/hash-password', (req, res) => {
  const { password } = req.body;
  if (!password || typeof password !== 'string' || password.length < 1) {
    return res.status(400).json({ error: 'Password string is required' });
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
  res.json({ hash: `${salt}:${hash}` });
});

// Server-side password verification for private notes
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
  const verified = actual === expected;
  res.json({ verified });
});

// === ADMIN API ROUTES ===
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  const admin = getAdminAccount();
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  if (username.trim().toLowerCase() === admin.username.toLowerCase() && verifyAdminPassword(password, admin.passwordHash)) {
    const token = 'adm_' + crypto.randomBytes(32).toString('hex');
    adminSessionTokens.add(token);
    return res.json({
      success: true,
      token,
      user: { username: admin.username, role: 'admin' }
    });
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
  const { currentPassword, newPassword } = req.body;
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
  fs.writeFileSync(ADMIN_FILE, JSON.stringify(admin, null, 2));
  res.json({ success: true, message: 'Password updated successfully' });
});

// Admin website settings get
app.get('/api/admin/settings', requireAdmin, (req, res) => {
  res.json(getStoredSettings());
});

// Admin website settings update
app.post('/api/admin/settings', requireAdmin, (req, res) => {
  const { website_name, logo, favicon, primary_color, firebase_config } = req.body;
  const current = getStoredSettings();

  // Validate website name
  if (website_name !== undefined) {
    if (typeof website_name !== 'string' || website_name.trim().length === 0) {
      return res.status(400).json({ error: 'Website name cannot be empty' });
    }
    current.website_name = website_name.trim();
  }

  // Validate primary color
  if (primary_color !== undefined) {
    if (typeof primary_color !== 'string' || !/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(primary_color)) {
      return res.status(400).json({ error: 'Valid hex color required (e.g. #6366f1)' });
    }
    current.primary_color = primary_color;
  }

  // Validate logo (must be null or valid data URI or URL)
  if (logo !== undefined) {
    if (logo === null || logo === '') {
      current.logo = null;
    } else if (typeof logo === 'string') {
      if (logo.startsWith('data:image/') || logo.startsWith('http://') || logo.startsWith('https://') || logo.startsWith('/')) {
        // Size validation (~2MB max)
        if (logo.length > 3 * 1024 * 1024) {
          return res.status(400).json({ error: 'Logo file size exceeds 2MB limit' });
        }
        current.logo = logo;
      } else {
        return res.status(400).json({ error: 'Invalid logo format. Must be an image file.' });
      }
    }
  }

  // Validate favicon
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

  // Update Firebase config if provided
  if (firebase_config !== undefined && typeof firebase_config === 'object') {
    current.firebase_config = {
      apiKey: firebase_config.apiKey || current.firebase_config?.apiKey || '',
      authDomain: firebase_config.authDomain || current.firebase_config?.authDomain || '',
      projectId: firebase_config.projectId || current.firebase_config?.projectId || '',
      storageBucket: firebase_config.storageBucket || current.firebase_config?.storageBucket || '',
      messagingSenderId: firebase_config.messagingSenderId || current.firebase_config?.messagingSenderId || '',
      appId: firebase_config.appId || current.firebase_config?.appId || ''
    };
  }

  saveStoredSettings(current);
  res.json({ success: true, settings: current });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
