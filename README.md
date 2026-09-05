# Note - Notes App

A clean, distraction-free notes app with private notes, Google sign-in, and
Firebase sync. It is a PWA: installable on Android/iOS and works offline.

```
note/
  frontend/   Static SPA (React + Vite)   deploy to Vercel / Netlify / Render / InfinityFree
  backend/    OPTIONAL Express API        deploy to Render / Railway (only needed for advanced branding)
```

## Why keep `src/`, `public/`, etc.?

Those are the **source files needed to build the site** (`dist/`). You never
upload `src/` to InfinityFree - your build command produces `dist/`:

```
cd frontend
npm install
VITE_FIREBASE_* vars... npm run build   # produces frontend/dist/
```

`dist/` is what gets uploaded to InfinityFree (or served automatically when you
deploy to Vercel/Netlify/Render, which build it for you).

## Features

- PWA: installable, works offline (service worker caches the app shell).
- Private notes: guests set a password (PBKDF2-hashed) stored locally; on
  Google sign-in the notes AND password migrate to Firebase and sync across
  devices.
- Google Sign-In and note storage use Firebase (Firestore) directly from the
  frontend - no Node backend required for normal usage.
- All configuration is build-time env vars (`.env`), so anyone can point the
  app at their own Firebase + Firebase Rules without an admin panel.

---

## 1. One-click / simple deploys (choose one)

### Vercel
1. Push this repo to GitHub, then in Vercel: **New Project -> Import repo**.
2. Set **Root Directory** to `frontend`. Framework preset is auto-detected
   (Vite). Set the `VITE_FIREBASE_*` env vars in the project settings, then
   **Deploy**. Done.

### Netlify
1. **New site from Git -> Import an existing project**.
2. Set **Base directory** to `frontend`. Build command: `npm run build`,
   publish directory: `dist`. Set the `VITE_FIREBASE_*` env vars first.
   (`netlify.toml` is included to auto-detect.)

### Render (static)
1. **New -> Static Site -> connect repo -> directory `frontend`**.
2. Build command `npm install && npm run build`, publish directory `dist`.
   Set `VITE_FIREBASE_*` env vars. (`frontend/render.yaml` included.)

### InfinityFree (manual, free)
1. Build locally: `cd frontend && npm install && npm run build`.
2. Upload the **contents of `frontend/dist/`** to your `htdocs` folder
   (includes `.htaccess`, `_redirects`, PWA `sw.js`, icons, assets).
3. `.htaccess` handles SPA routing.

> To use a different Firebase project (recommended!), set these env vars at
> build time (in the host or your `.env`):
> `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
> `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`,
> `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`,
> and optionally `VITE_WEBSITE_NAME`, `VITE_LOGO`, `VITE_FAVICON`,
> `VITE_PRIMARY_COLOR`.

## 2. OPTIONAL backend (`backend/`)

Only useful for serving site branding/settings from a server instead of env
vars. The core app runs fine without it.

**Render:**
1. New Web Service -> connect repo, root directory `backend`.
2. Build `npm install && npm run build` - Start `npm start`.
3. Set `CORS_ORIGINS="https://your-frontend-url"` if you want to lock it down.

**Locally:** `cd backend && npm install && npm run dev` (port 3000).

## 3. Firebase setup (required for sync + sign-in)

1. Create a Firebase project (or reuse the default demo one).
2. Enable **Authentication -> Google** provider.
3. Enable **Firestore Database**.
4. Apply the security rules in `rules.firebase`:
   Console -> Firestore Database -> Rules -> paste rules -> Publish.
   (Rules lock every user to their own notes.)

## Private notes

- **Guest:** notes + password are stored only in the browser's localStorage
  (hashed). Nothing leaves the device until sign-in.
- **Signed-in:** on Google sign-in, guest notes (including the password hash)
  are migrated to Firebase and stay synced across your devices.

## Commands

**frontend/** - `npm run dev` | `npm run build` | `npm run lint`
**backend/** - `npm run dev` | `npm run build` | `npm start`
**Local** - `cd frontend && npm install && npm run dev`