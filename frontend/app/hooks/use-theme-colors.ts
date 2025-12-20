/**
 * Hook to access theme colors in components
 * Provides type-safe access to CSS custom properties
 */

import { useTheme } from './use-theme';

export interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  'card-foreground': string;
  primary: string;
  'primary-foreground': string;
  secondary: string;
  'secondary-foreground': string;
  muted: string;
  'muted-foreground': string;
  accent: string;
  'accent-foreground': string;
  destructive: string;
  'destructive-foreground': string;
  border: string;
  input: string;
  ring: string;
  success: string;
  'success-foreground': string;
  warning: string;
  'warning-foreground': string;
  info: string;
  'info-foreground': string;
}

export function useThemeColors(): ThemeColors {
  const { theme } = useTheme();

  // Get computed styles from document root
  const getCSSVariable = (name: string): string => {
    if (typeof window === 'undefined') return '';
    return getComputedStyle(document.documentElement)
      .getPropertyValue(`--${name}`)
      .trim() || '';
  };

  return {
    background: getCSSVariable('background'),
    foreground: getCSSVariable('foreground'),
    card: getCSSVariable('card'),
    'card-foreground': getCSSVariable('card-foreground'),
    primary: getCSSVariable('primary'),
    'primary-foreground': getCSSVariable('primary-foreground'),
    secondary: getCSSVariable('secondary'),
    'secondary-foreground': getCSSVariable('secondary-foreground'),
    muted: getCSSVariable('muted'),
    'muted-foreground': getCSSVariable('muted-foreground'),
    accent: getCSSVariable('accent'),
    'accent-foreground': getCSSVariable('accent-foreground'),
    destructive: getCSSVariable('destructive'),
    'destructive-foreground': getCSSVariable('destructive-foreground'),
    border: getCSSVariable('border'),
    input: getCSSVariable('input'),
    ring: getCSSVariable('ring'),
    success: getCSSVariable('success'),
    'success-foreground': getCSSVariable('success-foreground'),
    warning: getCSSVariable('warning'),
    'warning-foreground': getCSSVariable('warning-foreground'),
    info: getCSSVariable('info'),
    'info-foreground': getCSSVariable('info-foreground'),
  };
}

