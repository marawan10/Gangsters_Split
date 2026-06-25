import React from 'react';
import { useApp } from '../context/AppContext';
import { palette, type ThemeColors } from '../theme';

const ThemeContext = React.createContext<ThemeColors>(palette.light);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { isDark } = useApp();
  const colors: ThemeColors = isDark ? palette.dark : palette.light;
  return <ThemeContext.Provider value={colors}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return React.useContext(ThemeContext);
}
