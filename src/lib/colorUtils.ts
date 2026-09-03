import { NoteColor } from '../types';

export function getNoteStyle(color: NoteColor, isDark: boolean): {
  background: string;
  borderColor: string;
  titleColor: string;
  bodyColor: string;
  mutedColor: string;
  isCustomColor: boolean;
} {
  const isDefault = !color || color === 'default';

  if (isDefault) {
    return {
      background: isDark ? '#111827' : '#ffffff',
      borderColor: isDark ? '#1f2937' : '#e2e8f0',
      titleColor: isDark ? '#f8fafc' : '#0f172a',
      bodyColor: isDark ? '#cbd5e1' : '#334155',
      mutedColor: isDark ? '#64748b' : '#94a3b8',
      isCustomColor: false,
    };
  }

  const lightMap: Record<Exclude<NoteColor, 'default'>, { bg: string; border: string; text: string; subtext: string; muted: string }> = {
    yellow: { bg: '#fef08a', border: '#facc15', text: '#713f12', subtext: '#854d0e', muted: '#a16207' },
    green: { bg: '#bbf7d0', border: '#86efac', text: '#14532d', subtext: '#166534', muted: '#15803d' },
    blue: { bg: '#bfdbfe', border: '#93c5fd', text: '#1e3a8a', subtext: '#1d4ed8', muted: '#2563eb' },
    pink: { bg: '#fbcfe8', border: '#f472b6', text: '#831843', subtext: '#9d174d', muted: '#be185d' },
    purple: { bg: '#e9d5ff', border: '#c084fc', text: '#581c87', subtext: '#6b21a8', muted: '#7e22ce' },
  };

  const darkMap: Record<Exclude<NoteColor, 'default'>, { bg: string; border: string; text: string; subtext: string; muted: string }> = {
    yellow: { bg: '#261f0d', border: '#59400e', text: '#fef08a', subtext: '#fef9c3', muted: '#eab308' },
    green: { bg: '#0b2316', border: '#14512e', text: '#bbf7d0', subtext: '#dcfce7', muted: '#22c55e' },
    blue: { bg: '#0d2136', border: '#164573', text: '#bfdbfe', subtext: '#dbeafe', muted: '#3b82f6' },
    pink: { bg: '#2b1121', border: '#601e45', text: '#fbcfe8', subtext: '#fce7f3', muted: '#ec4899' },
    purple: { bg: '#1e1030', border: '#4b2071', text: '#e9d5ff', subtext: '#f3e8ff', muted: '#a855f7' },
  };

  const colorMap = isDark ? darkMap : lightMap;
  const chosen = colorMap[color as Exclude<NoteColor, 'default'>] || colorMap.yellow;
  return {
    background: chosen.bg,
    borderColor: chosen.border,
    titleColor: chosen.text,
    bodyColor: chosen.subtext,
    mutedColor: chosen.muted,
    isCustomColor: true,
  };
}

export function formatNoteDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 1) {
    const mins = Math.max(1, Math.round(diffMs / (1000 * 60)));
    return `${mins}m ago`;
  }
  if (diffHours < 24 && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diffHours < 48) {
    return 'Yesterday';
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
