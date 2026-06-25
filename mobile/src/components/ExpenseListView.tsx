import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronDown, ChevronUp, Clock, Pencil, Trash2 } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { computeExpenseBreakdown } from '../lib/calculations';
import { CATEGORIES } from '../lib/constants';
import { formatDateLocalized } from '../lib/date';
import type { Expense } from '../lib/types';
import { radius, spacing, typography } from '../theme';
import { SectionHeader } from './ui';
import { StaggerIn } from './motion';

export function ExpenseListView() {
  const { expenses, t } = useApp();
  if (expenses.length === 0) return null;
  return (
    <View>
      <SectionHeader title={t('activeExpenses')} count={expenses.length} />
      {expenses.map((expense, i) => (
        <StaggerIn key={expense.id} index={i}>
          <ExpenseCard expense={expense} />
        </StaggerIn>
      ))}
    </View>
  );
}

function ExpenseCard({ expense }: { expense: Expense }) {
  const { userNames, deleteExpense, startEdit, t, sn } = useApp();
  const c = useTheme();
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const breakdown = computeExpenseBreakdown(expense, userNames);
  const cat = CATEGORIES.find((ct) => ct.id === expense.category);
  const payers = userNames
    .filter((u) => (expense.paidBy[u] || 0) > 0)
    .map((u) => `${sn(u)} ${expense.paidBy[u].toFixed(0)}`)
    .join(' · ');

  function handleDelete() {
    if (confirmDelete) deleteExpense(expense.id);
    else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  }

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
      <Pressable onPress={() => setOpen((o) => !o)} style={styles.top}>
        <View style={[styles.emojiBox, { backgroundColor: c.bgMuted }]}>
          <Text style={{ fontSize: 20 }}>{cat?.emoji ?? '📦'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text style={[typography.subtitle, { color: c.text, flex: 1 }]} numberOfLines={1}>
              {expense.item}
            </Text>
            <Text style={[typography.subtitle, { color: c.text }]}>
              {expense.amount >= 1000 ? `${(expense.amount / 1000).toFixed(1)}k` : expense.amount.toFixed(0)}
            </Text>
          </View>
          <Text style={[typography.micro, { color: c.textMuted, marginTop: 4 }]} numberOfLines={2}>
            {payers} · {expense.addedBy ? `${t('by')} ${sn(expense.addedBy)}` : ''} · {formatDateLocalized(expense.createdAt, t)}
          </Text>
        </View>
        {open ? <ChevronUp size={16} color={c.textMuted} /> : <ChevronDown size={16} color={c.textMuted} />}
      </Pressable>

      {open && (
        <View style={[styles.expanded, { borderTopColor: c.cardBorder }]}>
          <View style={styles.breakdownRow}>
            {userNames.map((user) => {
              const b = breakdown[user];
              return (
                <View
                  key={user}
                  style={[
                    styles.breakdownCell,
                    {
                      backgroundColor:
                        b.net > 0.005 ? c.successSoft : b.net < -0.005 ? c.dangerSoft : c.bgMuted,
                    },
                  ]}
                >
                  <Text style={[typography.micro, { color: c.textMuted }]}>{sn(user)}</Text>
                  <Text
                    style={[
                      typography.caption,
                      {
                        fontWeight: '700',
                        color: b.net > 0.005 ? c.success : b.net < -0.005 ? c.danger : c.textMuted,
                      },
                    ]}
                  >
                    {b.net > 0 ? '+' : ''}
                    {b.net.toFixed(2)}
                  </Text>
                </View>
              );
            })}
          </View>
          <View style={styles.actions}>
            <Pressable onPress={() => startEdit(expense)} style={[styles.actionBtn, { borderColor: c.inputBorder }]}>
              <Pencil size={12} color={c.textSecondary} />
              <Text style={[typography.caption, { color: c.textSecondary }]}>{t('edit')}</Text>
            </Pressable>
            <Pressable
              onPress={handleDelete}
              style={[
                styles.actionBtn,
                { borderColor: confirmDelete ? c.danger : c.inputBorder, backgroundColor: confirmDelete ? c.danger : 'transparent' },
              ]}
            >
              <Trash2 size={12} color={confirmDelete ? '#fff' : c.danger} />
              <Text style={[typography.caption, { color: confirmDelete ? '#fff' : c.danger }]}>
                {confirmDelete ? t('confirm') : t('delete')}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.sm, overflow: 'hidden' },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  emojiBox: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  expanded: { borderTopWidth: 1, padding: spacing.md },
  breakdownRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
  breakdownCell: { flex: 1, borderRadius: radius.sm, padding: spacing.sm, alignItems: 'center' },
  actions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
});
