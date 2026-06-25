import React, { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { Archive, ChevronDown, ChevronUp, MessageCircle, Trash2 } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { computeNetBalances, computeSettlements } from '../lib/calculations';
import { CATEGORIES } from '../lib/constants';
import { formatGroupDate } from '../lib/date';
import { deleteArchivedExpense } from '../lib/firebase';
import type { Expense } from '../lib/types';
import { radius, spacing, typography } from '../theme';
import { Card } from './ui';
import { ScalePressable } from './motion';

const HISTORY_SCROLL_MAX = 320;

function groupByDate(items: Expense[]) {
  const groups: Record<string, Expense[]> = {};
  items.forEach((item) => {
    const d = new Date(item.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });
  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, expenses]) => ({ date, expenses }));
}

export function HistoryView() {
  const { archive, userNames, t, sn } = useApp();
  const c = useTheme();
  const [open, setOpen] = useState(false);
  if (archive.length === 0) return null;

  const groups = groupByDate(archive);
  const totalSpent = archive.reduce((sum, e) => sum + e.amount, 0);

  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <ScalePressable onPress={() => setOpen((o) => !o)} style={styles.header}>
        <View style={styles.row}>
          <Archive size={16} color={c.textMuted} />
          <Text style={[typography.subtitle, { color: c.text }]}>{t('history')}</Text>
          <View style={[styles.badge, { backgroundColor: c.accentSoft }]}>
            <Text style={[typography.micro, { color: c.accent }]}>{archive.length}</Text>
          </View>
        </View>
        <View style={styles.row}>
          <Text style={[typography.caption, { color: c.textMuted }]}>{totalSpent.toFixed(0)}</Text>
          {open ? <ChevronUp size={16} color={c.textMuted} /> : <ChevronDown size={16} color={c.textMuted} />}
        </View>
      </ScalePressable>

      {open && (
        <Animated.View
          entering={FadeInDown.duration(280).springify().damping(18)}
          layout={Layout.springify()}
          style={[styles.bodyWrap, { borderTopColor: c.cardBorder }]}
        >
          <ScrollView
            style={{ maxHeight: HISTORY_SCROLL_MAX }}
            contentContainerStyle={styles.body}
            nestedScrollEnabled
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
          >
            {groups.map((group, gi) => {
              const dateLabel = formatGroupDate(group.date, t);
              const groupTotal = group.expenses.reduce((s, e) => s + e.amount, 0);
              return (
                <Animated.View
                  key={group.date}
                  entering={FadeInDown.delay(gi * 40).duration(250)}
                  style={{ marginBottom: spacing.md }}
                >
                  <View style={styles.groupHeader}>
                    <Text style={[typography.micro, { color: c.textMuted, textTransform: 'uppercase' }]}>
                      {dateLabel} · {groupTotal.toFixed(0)}
                    </Text>
                    <View style={styles.row}>
                      <Pressable
                        onPress={() => shareGroup(group.expenses, dateLabel, userNames, t, sn)}
                        style={[styles.waSmall, { backgroundColor: c.whatsapp }]}
                      >
                        <MessageCircle size={10} color="#fff" />
                        <Text style={styles.waSmallText}>{t('send')}</Text>
                      </Pressable>
                      <DeleteGroupBtn expenses={group.expenses} />
                    </View>
                  </View>
                  {group.expenses.map((expense) => {
                    const cat = CATEGORIES.find((ct) => ct.id === expense.category);
                    return (
                      <View key={expense.fbKey} style={[styles.itemRow, { backgroundColor: c.bgMuted }]}>
                        <Text>{cat?.emoji ?? '📦'}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={[typography.caption, { color: c.text }]} numberOfLines={1}>
                            {expense.item}
                          </Text>
                          {expense.addedBy && (
                            <Text style={[typography.micro, { color: c.textMuted }]}>
                              {t('by')} {sn(expense.addedBy)}
                            </Text>
                          )}
                        </View>
                        <Text style={[typography.caption, { color: c.text, fontWeight: '700' }]}>
                          {expense.amount.toFixed(0)}
                        </Text>
                      </View>
                    );
                  })}
                </Animated.View>
              );
            })}
          </ScrollView>
        </Animated.View>
      )}
    </Card>
  );
}

function shareGroup(
  expenses: Expense[],
  dateLabel: string,
  userNames: string[],
  t: (k: string, v?: Record<string, string>) => string,
  sn: (n: string) => string,
) {
  const balances = computeNetBalances(expenses, userNames);
  const settlements = computeSettlements(balances);
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const lines = [`💰 *${t('appName')} — ${dateLabel}*`, '', `*${t('waTotalPaid')}*`];
  userNames.forEach((u) => {
    const paid = expenses.reduce((s, e) => s + (e.paidBy[u] || 0), 0);
    lines.push(`💳 ${sn(u)}: ${paid.toFixed(2)}`);
  });
  lines.push(`📊 ${t('total')}: ${total.toFixed(2)}`, '', `*${t('waBalances')}*`);
  userNames.forEach((u) => {
    const bal = balances[u];
    lines.push(`${sn(u)}: ${bal > 0 ? '+' : ''}${bal.toFixed(2)}`);
  });
  if (settlements.length > 0) {
    lines.push('', `*${t('waSettlement')}*`);
    settlements.forEach((s) =>
      lines.push(`➡️ ${t('waPays', { from: sn(s.from), to: sn(s.to), amount: s.amount.toFixed(2) })}`),
    );
  }
  Linking.openURL(`https://api.whatsapp.com/send?text=${encodeURIComponent(lines.join('\n'))}`);
}

function DeleteGroupBtn({ expenses }: { expenses: Expense[] }) {
  const [confirm, setConfirm] = useState(false);
  const { t } = useApp();
  const c = useTheme();

  function handleDelete() {
    if (confirm) expenses.forEach((e) => deleteArchivedExpense(e));
    else {
      setConfirm(true);
      setTimeout(() => setConfirm(false), 3000);
    }
  }

  return (
    <Pressable
      onPress={handleDelete}
      style={[styles.delBtn, { backgroundColor: confirm ? c.danger : c.bgMuted }]}
    >
      <Trash2 size={10} color={confirm ? '#fff' : c.textMuted} />
      {confirm && <Text style={[typography.micro, { color: '#fff' }]}>{t('sure')}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  bodyWrap: { borderTopWidth: 1 },
  body: { padding: spacing.lg, paddingTop: spacing.md },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  waSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  waSmallText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  delBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    marginLeft: spacing.xs,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: 4,
  },
});
