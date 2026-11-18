/**
 * Design tokens. Calm teal for trust, warm amber for "act now", soft surfaces
 * that read well in a bright clinic or a dark room at 3 a.m.
 */
import { useColorScheme } from 'react-native';

import { brand } from './brand';

const palettes = {
  light: {
    bg: '#F6F8F7',
    card: '#FFFFFF',
    chip: '#EAEFED',
    border: '#E2E8E5',
    text: '#0B1F1C',
    muted: '#4B5E59',
    subtle: '#8A9A96',
    primarySoft: '#DDF1EE',
    danger: '#C2410C',
    dangerBg: '#FFEDD5',
    warn: '#B45309',
    warnBg: '#FEF3C7',
    success: '#047857',
    successBg: '#D1FAE5',
  },
  dark: {
    bg: '#0A100F',
    card: '#121A19',
    chip: '#1B2524',
    border: '#24302E',
    text: '#EEF5F3',
    muted: '#A3B5B0',
    subtle: '#6B7D79',
    primarySoft: '#123430',
    danger: '#FB923C',
    dangerBg: '#3A1A0A',
    warn: '#FBBF24',
    warnBg: '#3A2C08',
    success: '#34D399',
    successBg: '#0B3326',
  },
} as const;

export type Palette = Record<keyof (typeof palettes)['light'], string> & { primary: string; primaryText: string; accent: string };

export function usePalette(): Palette {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return { ...palettes[scheme], ...brand.colors, ...(scheme === 'dark' ? { primary: '#2DD4BF', primaryText: '#04201C' } : null) };
}

export const radius = { sm: 10, md: 16, lg: 22, pill: 999 } as const;
export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
