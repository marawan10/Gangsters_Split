import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../src/components/AppHeader';
import { AdminView } from '../../src/components/AdminView';
import { useApp } from '../../src/context/AppContext';
import { useTheme } from '../../src/context/ThemeContext';
import { spacing } from '../../src/theme';

export default function AdminScreen() {
  const { isAdmin } = useApp();
  const c = useTheme();
  const insets = useSafeAreaInsets();

  if (!isAdmin) return <Redirect href="/(tabs)/dashboard" />;

  return (
    <View style={[styles.screen, { backgroundColor: c.bg }]}>
      <AppHeader />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <AdminView />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.lg },
});
