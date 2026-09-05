import React, { useEffect, useState } from 'react';
import { LogIn, LogOut, Save, KeyRound } from 'lucide-react';
import { FirebaseConfig, WebsiteSettings } from '../types';
import { apiUrl } from '../lib/config';

const emptySettings: WebsiteSettings = {
  website_name: 'Qnote',
  logo: '/assets/logo.png',
  favicon: '/favicon.png',
  primary_color: '#c15f3c',
  firebase_config: {
    apiKey: '',
    authDomain: '',
    storageBucket: '',
    projectId: '',
    messagingSenderId: '',
    appId: '',
  },
};

export const AdminPage: React.FC = () => {
  const [token, setToken] = useState(() => sessionStorage.getItem('note_admin_token') || '');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [settings, setSettings] = useState<WebsiteSettings>(emptySettings);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [currentAdminPassword, setCurrentAdminPassword] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [uploadingAsset, setUploadingAsset] = useState<'logo' | 'favicon' | null>(null);

  const loadSettings = async (adminToken: string) => {
    const response = await fetch(apiUrl('/admin/settings'), {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (!response.ok) throw new Error('Admin session is invalid or expired.');
    setSettings(await response.json());
  };

  useEffect(() => {
    if (!token) return;
    loadSettings(token).catch(() => {
      sessionStorage.removeItem('note_admin_token');
      setToken('');
    });
  }, [token]);

  const login = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch(apiUrl('/admin/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Login failed.');
      sessionStorage.setItem('note_admin_token', result.token);
      setToken(result.token);
      setPassword('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof WebsiteSettings, value: string) => {
    setSettings((current) => ({ ...current, [field]: value }));
  };

  const updateFirebase = (field: keyof FirebaseConfig, value: string) => {
    setSettings((current) => ({
      ...current,
      firebase_config: { ...current.firebase_config, [field]: value },
    }));
  };

  const uploadBrandAsset = async (field: 'logo' | 'favicon', file?: File) => {
    if (!file) return;
    setError('');
    setMessage('');
    setUploadingAsset(field);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Could not read image file.'));
        reader.readAsDataURL(file);
      });
      const response = await fetch(apiUrl('/admin/upload-asset'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ dataUrl, assetType: field }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Upload failed.');
      updateField(field, result.url);
      setMessage(`${field === 'logo' ? 'Logo' : 'Favicon'} uploaded. Save settings to publish it.`);
    } catch (err: any) {
      setError(err.message || 'Upload failed.');
    } finally {
      setUploadingAsset(null);
    }
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    const response = await fetch(apiUrl('/admin/settings'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(settings),
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error || 'Could not save settings.');
      return;
    }
    setSettings(result.settings);
    setMessage('Settings saved.');
  };

  const logout = async () => {
    await fetch(apiUrl('/admin/logout'), { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    sessionStorage.removeItem('note_admin_token');
    setToken('');
  };

  const changeAdminPassword = async () => {
    setError('');
    setMessage('');
    const response = await fetch(apiUrl('/admin/change-password'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ currentPassword: currentAdminPassword, newPassword: newAdminPassword, newUsername: newAdminUsername || undefined }),
    });
    const result = await response.json();
    if (!response.ok) setError(result.error || 'Could not change admin credentials.');
    else { setMessage('Admin credentials updated.'); setCurrentAdminPassword(''); setNewAdminPassword(''); }
  };

  const inputClass = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500';

  if (!token) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <form onSubmit={login} className="w-full max-w-sm bg-white rounded-xl border border-slate-200 p-6 shadow-lg">
          <h1 className="text-xl font-bold text-slate-900">Note Admin</h1>
          <p className="mt-1 mb-5 text-sm text-slate-500">Sign in to manage website settings.</p>
          <div className="space-y-3">
            <input className={inputClass} type="email" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Admin email" required />
            <input className={inputClass} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50" disabled={loading}>
              <LogIn className="mr-2 inline h-4 w-4" />{loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 flex items-center justify-between">
          <div><h1 className="text-2xl font-bold">Note Admin</h1><p className="text-sm text-slate-500">Website configuration</p></div>
          <button onClick={logout} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><LogOut className="mr-1 inline h-4 w-4" />Logout</button>
        </header>
        <form onSubmit={save} className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <label className="block text-sm font-medium">Website name<input className={inputClass + ' mt-1'} value={settings.website_name} onChange={(e) => updateField('website_name', e.target.value)} /></label>
          <label className="block text-sm font-medium">Primary color<div className="mt-1 flex gap-2"><input type="color" className="h-10 w-12 rounded-lg border border-slate-300 bg-white p-1" value={settings.primary_color} onChange={(e) => updateField('primary_color', e.target.value)} /><input className={inputClass} value={settings.primary_color} onChange={(e) => updateField('primary_color', e.target.value)} /></div></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium">Logo URL<input className={inputClass + ' mt-1'} value={settings.logo || ''} onChange={(e) => updateField('logo', e.target.value)} placeholder="https://... or /assets/uploads/logo.png" /><input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" className="mt-2 w-full text-xs" disabled={uploadingAsset !== null} onChange={(e) => uploadBrandAsset('logo', e.target.files?.[0])} /><span className="text-[11px] text-slate-500">Max 2MB. Files are stored in public/assets/uploads.</span></label>
            <label className="text-sm font-medium">Favicon URL<input className={inputClass + ' mt-1'} value={settings.favicon || ''} onChange={(e) => updateField('favicon', e.target.value)} placeholder="https://... or /assets/uploads/favicon.png" /><input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" className="mt-2 w-full text-xs" disabled={uploadingAsset !== null} onChange={(e) => uploadBrandAsset('favicon', e.target.files?.[0])} /><span className="text-[11px] text-slate-500">Max 512KB. Files are stored in public/assets/uploads.</span></label>
          </div>
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4"><h2 className="mb-3 font-semibold">Brand preview</h2><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg text-lg font-bold text-white" style={{ backgroundColor: settings.primary_color }}>N</div>{settings.logo && <img src={settings.logo} alt="Logo preview" className="h-10 w-10 rounded-lg object-contain bg-white" />}<div><p className="font-semibold">{settings.website_name || 'Qnote'}</p><p className="text-xs text-slate-500">Preview of your header branding</p></div></div></section>
          <section><h2 className="mb-3 font-semibold">Firebase web configuration</h2><div className="grid gap-3 sm:grid-cols-2">{(Object.keys(settings.firebase_config) as (keyof FirebaseConfig)[]).map((field) => <label key={field} className="text-xs font-medium text-slate-600">{field}<input className={inputClass + ' mt-1'} value={settings.firebase_config[field]} onChange={(e) => updateFirebase(field, e.target.value)} /></label>)}</div></section>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-emerald-600">{message}</p>}
          <button className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white"><Save className="mr-2 inline h-4 w-4" />Save settings</button>
        </form>
        <form onSubmit={(event) => { event.preventDefault(); changeAdminPassword(); }} className="mt-5 space-y-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div><h2 className="font-semibold">Admin credentials</h2><p className="text-xs text-slate-500">Only required when changing the admin login.</p></div>
          <input className={inputClass} type="email" value={newAdminUsername} onChange={(e) => setNewAdminUsername(e.target.value)} placeholder="New admin email (optional)" />
          <input className={inputClass} type="password" required value={currentAdminPassword} onChange={(e) => setCurrentAdminPassword(e.target.value)} placeholder="Current admin password" />
          <input className={inputClass} type="password" required minLength={6} value={newAdminPassword} onChange={(e) => setNewAdminPassword(e.target.value)} placeholder="New admin password" />
          <button type="submit" className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold"><KeyRound className="mr-2 inline h-4 w-4" />Update credentials</button>
        </form>
      </div>
    </main>
  );
};
