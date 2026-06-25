import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppLogo } from './AppLogo';
import { PopIn } from './motion';
import { Moon, RotateCcw, Sun, Languages } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing, typography } from '../theme';

export function AppHeader() {
  const { currentUser, expenses, isDark, toggleDark, toggleLang, lang, handleReset, t, sn } = useApp();
  const c = useTheme();
  const insets = useSafeAreaInsets();

  function onReset() {
    Alert.alert(t('reset'), t('confirmReset'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('reset'), style: 'destructive', onPress: handleReset },
    ]);
  }

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + spacing.sm, backgroundColor: c.bgElevated, borderBottomColor: c.tabBarBorder }]}>
      <PopIn delay={0}>
        <AppLogo size={40} />
      </PopIn>
      <View style={{ flex: 1 }}>
        <Text style={[typography.subtitle, { color: c.text }]}>{t('appName')}</Text>
        {currentUser && (
          <Text style={[typography.micro, { color: c.textMuted }]}>{sn(currentUser)}</Text>
        )}
      </View>
      <View style={styles.actions}>
        {expenses.length > 0 && (
          <Pressable onPress={onReset} style={[styles.iconBtn, { backgroundColor: c.dangerSoft }]}>
            <RotateCcw size={16} color={c.danger} />
          </Pressable>
        )}
        <Pressable onPress={toggleLang} style={[styles.iconBtn, { backgroundColor: c.bgMuted }]}>
          <Languages size={16} color={c.textSecondary} />
          <Text style={[typography.micro, { color: c.textSecondary }]}>{lang.toUpperCase()}</Text>
        </Pressable>
        <Pressable onPress={toggleDark} style={[styles.iconBtn, { backgroundColor: c.bgMuted }]}>
          {isDark ? <Sun size={16} color={c.warning} /> : <Moon size={16} color={c.accent} />}
        </Pressable>
      </View>
    </View>
  );
}

export function SpendPopup() {
  const { spendPopup, dismissSpendPopup } = useApp();
  const c = useTheme();
  if (!spendPopup) return null;
  return (
    <Animated.View entering={FadeInDown.springify().damping(14)}>
      <Pressable onPress={dismissSpendPopup} style={[styles.popup, { backgroundColor: c.warningSoft, borderColor: c.warning }]}>
      <Text style={[typography.caption, { color: c.warning, fontWeight: '700', textAlign: 'center' }]}>
        😂 {spendPopup}
      </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  logo: {
    width: 40,
    height: 40,
  },
  actions: { flexDirection: 'row', gap: spacing.sm },
  iconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  popup: {
    position: 'absolute',
    top: 100,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 100,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    elevation: 8,
  },
});
