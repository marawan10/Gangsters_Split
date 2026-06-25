export type ThemeMode = 'light' | 'dark';

export const palette = {
  light: {
    bg: '#F4F6FB',
    bgElevated: '#FFFFFF',
    bgMuted: '#EEF1F8',
    card: '#FFFFFF',
    cardBorder: 'rgba(99, 102, 241, 0.08)',
    text: '#0F172A',
    textSecondary: '#64748B',
    textMuted: '#94A3B8',
    accent: '#6366F1',
    accentSoft: '#EEF2FF',
    accentGradient: ['#6366F1', '#8B5CF6'] as const,
    success: '#10B981',
    successSoft: '#ECFDF5',
    danger: '#EF4444',
    dangerSoft: '#FEF2F2',
    warning: '#F59E0B',
    warningSoft: '#FFFBEB',
    tabBar: '#FFFFFF',
    tabBarBorder: 'rgba(15, 23, 42, 0.06)',
    shadow: 'rgba(99, 102, 241, 0.12)',
    inputBg: '#F8FAFC',
    inputBorder: '#E2E8F0',
    overlay: 'rgba(15, 23, 42, 0.4)',
    whatsapp: '#25D366',
  },
  dark: {
    bg: '#0B0D14',
    bgElevated: '#141824',
    bgMuted: '#1A1F2E',
    card: '#161B28',
    cardBorder: 'rgba(139, 92, 246, 0.15)',
    text: '#F1F5F9',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    accent: '#818CF8',
    accentSoft: 'rgba(99, 102, 241, 0.15)',
    accentGradient: ['#818CF8', '#A78BFA'] as const,
    success: '#34D399',
    successSoft: 'rgba(16, 185, 129, 0.12)',
    danger: '#F87171',
    dangerSoft: 'rgba(239, 68, 68, 0.12)',
    warning: '#FBBF24',
    warningSoft: 'rgba(245, 158, 11, 0.12)',
    tabBar: '#0F1219',
    tabBarBorder: 'rgba(255, 255, 255, 0.06)',
    shadow: 'rgba(0, 0, 0, 0.4)',
    inputBg: '#1A1F2E',
    inputBorder: '#2D3548',
    overlay: 'rgba(0, 0, 0, 0.6)',
    whatsapp: '#25D366',
  },
};

export type ThemeColors = (typeof palette)[keyof typeof palette];

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  full: 999,
};

export const typography = {
  hero: { fontSize: 28, fontWeight: '800' as const, letterSpacing: -0.5 },
  title: { fontSize: 20, fontWeight: '700' as const, letterSpacing: -0.3 },
  subtitle: { fontSize: 15, fontWeight: '600' as const },
  body: { fontSize: 14, fontWeight: '400' as const },
  caption: { fontSize: 12, fontWeight: '500' as const },
  micro: { fontSize: 10, fontWeight: '600' as const, letterSpacing: 0.3 },
};
