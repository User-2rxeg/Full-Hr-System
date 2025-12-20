/**
 * Theme utility functions for consistent styling
 */

/**
 * Get theme-aware class names for common patterns
 */
export function getThemeClass(pattern: 'card' | 'button' | 'input' | 'badge' | 'alert'): string {
  const baseClasses = {
    card: 'bg-card text-card-foreground border-border rounded-xl shadow-sm',
    button: 'font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
    input: 'border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring',
    badge: 'px-2 py-1 text-xs font-medium rounded-full',
    alert: 'rounded-lg border p-4',
  };

  return baseClasses[pattern];
}

/**
 * Get status variant classes
 */
export function getStatusClasses(
  variant: 'success' | 'warning' | 'error' | 'info' | 'default'
): { bg: string; text: string; border: string } {
  const variants = {
    success: {
      bg: 'bg-success/10 dark:bg-success/20',
      text: 'text-success dark:text-success',
      border: 'border-success/20 dark:border-success/30',
    },
    warning: {
      bg: 'bg-warning/10 dark:bg-warning/20',
      text: 'text-warning dark:text-warning',
      border: 'border-warning/20 dark:border-warning/30',
    },
    error: {
      bg: 'bg-destructive/10 dark:bg-destructive/20',
      text: 'text-destructive dark:text-destructive',
      border: 'border-destructive/20 dark:border-destructive/30',
    },
    info: {
      bg: 'bg-info/10 dark:bg-info/20',
      text: 'text-info dark:text-info',
      border: 'border-info/20 dark:border-info/30',
    },
    default: {
      bg: 'bg-muted',
      text: 'text-muted-foreground',
      border: 'border-border',
    },
  };

  return variants[variant];
}

/**
 * Check if current theme is dark mode
 */
export function isDarkMode(): boolean {
  if (typeof window === 'undefined') return false;
  return document.documentElement.classList.contains('dark');
}

/**
 * Get theme-aware text color class
 */
export function getTextColorClass(
  variant: 'default' | 'muted' | 'primary' | 'secondary' | 'destructive'
): string {
  const classes = {
    default: 'text-foreground',
    muted: 'text-muted-foreground',
    primary: 'text-primary',
    secondary: 'text-secondary-foreground',
    destructive: 'text-destructive',
  };

  return classes[variant];
}

/**
 * Get theme-aware background color class
 */
export function getBackgroundColorClass(
  variant: 'default' | 'card' | 'muted' | 'accent' | 'primary'
): string {
  const classes = {
    default: 'bg-background',
    card: 'bg-card',
    muted: 'bg-muted',
    accent: 'bg-accent',
    primary: 'bg-primary',
  };

  return classes[variant];
}

