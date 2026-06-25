import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader, SpendPopup } from '../../src/components/AppHeader';
import { ExpenseFormView } from '../../src/components/ExpenseFormView';
import { ExpenseListView } from '../../src/components/ExpenseListView';
import { HistoryView } from '../../src/components/HistoryView';
import { ShoppingTripView } from '../../src/components/ShoppingTripView';
import { SummaryView } from '../../src/components/SummaryView';
import { useApp } from '../../src/context/AppContext';
import { useTheme } from '../../src/context/ThemeContext';
import { radius, spacing, typography } from '../../src/theme';

export default function ExpensesScreen() {
  const { editingExpense, formMode, setFormMode, t } = useApp();
  const c = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { backgroundColor: c.bg }]}>
      <AppHeader />
      <SpendPopup />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        {!editingExpense && (
          <View style={styles.modeToggle}>
            <ModeBtn
              label={`⚡ ${t('quickAdd')}`}
              active={formMode === 'quick'}
              onPress={() => setFormMode('quick')}
            />
            <ModeBtn
              label={`🛒 ${t('shoppingTrip')}`}
              active={formMode === 'trip'}
              onPress={() => setFormMode('trip')}
            />
          </View>
        )}

        {formMode === 'quick' || editingExpense ? <ExpenseFormView /> : <ShoppingTripView />}
        <SummaryView />
        <ExpenseListView />
        <HistoryView />
      </ScrollView>
    </View>
  );
}

function ModeBtn({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const c = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.modeBtn,
        {
          backgroundColor: active ? c.accentSoft : c.card,
          borderColor: active ? c.accent : c.cardBorder,
        },
      ]}
    >
      <Text style={[typography.caption, { color: active ? c.accent : c.textMuted, fontWeight: '600' }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.lg },
  modeToggle: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  modeBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
});
