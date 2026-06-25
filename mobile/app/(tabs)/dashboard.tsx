import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader, SpendPopup } from '../../src/components/AppHeader';
import { DashboardView } from '../../src/components/DashboardView';
import { useTheme } from '../../src/context/ThemeContext';
import { spacing } from '../../src/theme';

export default function DashboardScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { backgroundColor: c.bg }]}>
      <AppHeader />
      <SpendPopup />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        <DashboardView />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.lg },
});
