export type NoteColor = 'default' | 'yellow' | 'green' | 'blue' | 'pink' | 'purple';

export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  color: NoteColor;
  is_pinned: boolean;
  is_archived: boolean;
  is_deleted: boolean;
  is_private?: boolean;
  private_password_hash?: string;
  created_at: number;
  updated_at: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  created_at: number;
  photo_url?: string;
  is_admin?: boolean;
  is_google?: boolean;
}

export type ViewSection = 'all' | 'pinned' | 'archive' | 'trash' | 'private';

export type ThemePreference = 'light' | 'dark' | 'system';

export interface ColorOption {
  id: NoteColor;
  name: string;
  lightBg: string;
  lightBorder: string;
  darkBg: string;
  darkBorder: string;
  lightText: string;
  darkText: string;
}

export const NOTE_COLORS: ColorOption[] = [
  {
    id: 'default',
    name: 'Default',
    lightBg: '#ffffff',
    lightBorder: '#e2e8f0',
    darkBg: '#1e293b',
    darkBorder: '#334155',
    lightText: '#1e293b',
    darkText: '#f8fafc',
  },
  {
    id: 'yellow',
    name: 'Soft Yellow',
    lightBg: '#fef9c3',
    lightBorder: '#fde047',
    darkBg: '#292310',
    darkBorder: '#5e480f',
    lightText: '#422006',
    darkText: '#fef08a',
  },
  {
    id: 'green',
    name: 'Soft Green',
    lightBg: '#dcfce7',
    lightBorder: '#bbf7d0',
    darkBg: '#11291b',
    darkBorder: '#1a5c36',
    lightText: '#064e3b',
    darkText: '#bbf7d0',
  },
  {
    id: 'blue',
    name: 'Soft Blue',
    lightBg: '#dbeafe',
    lightBorder: '#bfdbfe',
    darkBg: '#12283e',
    darkBorder: '#1b5387',
    lightText: '#1e3a8a',
    darkText: '#bfdbfe',
  },
  {
    id: 'pink',
    name: 'Soft Pink',
    lightBg: '#fce7f3',
    lightBorder: '#fbcfe8',
    darkBg: '#2e1624',
    darkBorder: '#6b264e',
    lightText: '#831843',
    darkText: '#fbcfe8',
  },
  {
    id: 'purple',
    name: 'Soft Purple',
    lightBg: '#f3e8ff',
    lightBorder: '#e9d5ff',
    darkBg: '#231633',
    darkBorder: '#552a82',
    lightText: '#581c87',
    darkText: '#e9d5ff',
  },
];

export interface UserSettings {
  defaultColor: NoteColor;
  theme: ThemePreference;
  floating_add_button_enabled: boolean;
  view_mode: 'grid' | 'list';
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export interface WebsiteSettings {
  website_name: string;
  logo: string | null;
  favicon: string | null;
  primary_color: string;
  firebase_config: FirebaseConfig;
}
