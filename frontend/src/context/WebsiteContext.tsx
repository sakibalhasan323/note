import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { WebsiteSettings, FirebaseConfig } from '../types';
import { DEFAULT_FIREBASE_CONFIG, initFirebase } from '../lib/firebase';
import { apiUrl } from '../lib/config';

interface WebsiteContextType {
  settings: WebsiteSettings;
  isLoading: boolean;
  updateSettings: (newSettings: Partial<WebsiteSettings>, adminToken: string) => Promise<boolean>;
  reloadSettings: () => Promise<void>;
}

const DEFAULT_SETTINGS: WebsiteSettings = {
  website_name: 'Qnote',
  logo: '/assets/logo.png',
  favicon: '/assets/favicon.png',
  primary_color: '#c15f3c',
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

  const reloadSettings = useCallback(async () => {
    try {
      const res = await fetch(apiUrl('/settings'));
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        applyBranding(data);
        if (data.firebase_config) {
          initFirebase(data.firebase_config);
        }
      }
    } catch (err) {
      console.warn('Could not fetch server settings, using defaults', err);
      applyBranding(DEFAULT_SETTINGS);
    } finally {
      setIsLoading(false);
    }
  }, [applyBranding]);

  useEffect(() => {
    reloadSettings();
  }, [reloadSettings]);

  const updateSettings = async (newSettings: Partial<WebsiteSettings>, adminToken: string): Promise<boolean> => {
    try {
      const res = await fetch(apiUrl('/admin/settings'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify(newSettings),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Update failed' }));
        throw new Error(errorData.error || 'Failed to update settings');
      }

      const data = await res.json();
      if (data.settings) {
        setSettings(data.settings);
        applyBranding(data.settings);
        if (data.settings.firebase_config) {
          initFirebase(data.settings.firebase_config);
        }
      }
      return true;
    } catch (err: any) {
      console.error('Failed to update website settings', err);
      throw err;
    }
  };

  return (
    <WebsiteContext.Provider value={{ settings, isLoading, updateSettings, reloadSettings }}>
      {children}
    </WebsiteContext.Provider>
  );
};

export const useWebsite = () => {
  const ctx = useContext(WebsiteContext);
  if (!ctx) throw new Error('useWebsite must be used within a WebsiteProvider');
  return ctx;
};
