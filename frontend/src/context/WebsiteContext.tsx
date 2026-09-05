import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { WebsiteSettings } from '../types';
import { DEFAULT_FIREBASE_CONFIG } from '../lib/firebase';
import { apiUrl } from '../lib/config';

interface WebsiteContextType {
  settings: WebsiteSettings;
  isLoading: boolean;
  reloadSettings: () => Promise<void>;
}

// Branding and Firebase config are configured with build-time environment
// variables (VITE_WEBSITE_NAME, VITE_LOGO, ..., VITE_FIREBASE_*) so no admin
// panel is needed. A serving backend's public /api/settings is used only as a
// fallback when no VITE_* override is provided.
const DEFAULT_SETTINGS: WebsiteSettings = {
  website_name: (import.meta.env.VITE_WEBSITE_NAME as string) || 'Note',
  logo: (import.meta.env.VITE_LOGO as string) || '/assets/logo.png',
  favicon: (import.meta.env.VITE_FAVICON as string) || '/assets/favicon.png',
  primary_color: (import.meta.env.VITE_PRIMARY_COLOR as string) || '#c15f3c',
  firebase_config: DEFAULT_FIREBASE_CONFIG,
};

const WebsiteContext = createContext<WebsiteContextType | undefined>(undefined);

export const WebsiteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<WebsiteSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  const applyBranding = useCallback((currentSettings: WebsiteSettings) => {
    // Apply website title
    if (typeof document !== 'undefined') {
      document.title = `${currentSettings.website_name} - Clean & Simple Notes`;

      // Update og:title
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute('content', `${currentSettings.website_name} - Clean & Simple Notes`);

      // Update primary color CSS variable
      if (currentSettings.primary_color) {
        document.documentElement.style.setProperty('--primary', currentSettings.primary_color);
      }

      // Update favicon if set
      if (currentSettings.favicon) {
        let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.getElementsByTagName('head')[0].appendChild(link);
        }
        link.href = currentSettings.favicon;
      }
    }
  }, []);

  const hasEnvBranding =
    !!import.meta.env.VITE_WEBSITE_NAME ||
    !!import.meta.env.VITE_LOGO ||
    !!import.meta.env.VITE_FAVICON ||
    !!import.meta.env.VITE_PRIMARY_COLOR;

  const reloadSettings = useCallback(async () => {
    // Env configuration always wins; the backend is optional.
    if (hasEnvBranding) {
      setSettings(DEFAULT_SETTINGS);
      applyBranding(DEFAULT_SETTINGS);
      setIsLoading(false);
      return;
    }
    try {
      const res = await fetch(apiUrl('/settings'));
      if (res.ok) {
        const data = await res.json();
        const merged: WebsiteSettings = {
          ...DEFAULT_SETTINGS,
          ...data,
          website_name: data.website_name || DEFAULT_SETTINGS.website_name,
          logo: data.logo ?? null,
          favicon: data.favicon ?? null,
          primary_color: data.primary_color || DEFAULT_SETTINGS.primary_color,
          firebase_config: DEFAULT_FIREBASE_CONFIG,
        };
        setSettings(merged);
        applyBranding(merged);
      } else {
        applyBranding(DEFAULT_SETTINGS);
      }
    } catch (err) {
      console.warn('Could not fetch server settings, using env defaults', err);
      applyBranding(DEFAULT_SETTINGS);
    } finally {
      setIsLoading(false);
    }
  }, [applyBranding, hasEnvBranding]);

  useEffect(() => {
    reloadSettings();
  }, [reloadSettings]);

  return (
    <WebsiteContext.Provider value={{ settings, isLoading, reloadSettings }}>
      {children}
    </WebsiteContext.Provider>
  );
};

export const useWebsite = () => {
  const ctx = useContext(WebsiteContext);
  if (!ctx) throw new Error('useWebsite must be used within a WebsiteProvider');
  return ctx;
};