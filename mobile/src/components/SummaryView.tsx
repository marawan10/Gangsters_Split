import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { MessageCircle, TrendingUp, Wallet } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { computeNetBalances, computeSettlements } from '../lib/calculations';
import { radius, spacing, typography } from '../theme';
import { Card } from './ui';

function balanceEmoji(bal: number) {
  if (bal > 100) return '🤑';
  if (bal > 0.005) return '😎';
  if (bal < -100) return '😭';
  if (bal < -0.005) return '💸';
  return '😌';
}

export function SummaryView() {
  const { expenses, userNames, archiveAll, t, sn } = useApp();
  const c = useTheme();
  if (expenses.length === 0) return null;

  const balances = computeNetBalances(expenses, userNames);
  const settlements = computeSettlements(balances);
  const balanceSum = Object.values(balances).reduce((a, b) => a + b, 0);
  const isBalanced = Math.abs(balanceSum) < 0.02;
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const perPersonPaid: Record<string, number> = {};
  userNames.forEach((u) => {
    perPersonPaid[u] = expenses.reduce((sum, e) => sum + (e.paidBy[u] || 0), 0);
  });

  function buildShareText() {
    const lines = [`💰 *${t('appName')}*`, '', `*${t('waTotalPaid')}*`];
    userNames.forEach((user) => {
      lines.push(`💳 ${sn(user)}: ${perPersonPaid[user].toFixed(2)}`);
    });
    lines.push(`📊 ${t('total')}: ${totalExpenses.toFixed(2)}`, '', `*${t('waBalances')}*`);
    userNames.forEach((user) => {
      const bal = balances[user];
      lines.push(`${balanceEmoji(bal)} ${sn(user)}: ${bal > 0 ? '+' : ''}${bal.toFixed(2)}`);
    });
    if (settlements.length > 0) {
      lines.push('', `*${t('waSettlement')}*`);
      settlements.forEach((s) =>
        lines.push(`➡️ ${t('waPays', { from: sn(s.from), to: sn(s.to), amount: s.amount.toFixed(2) })}`),
      );
    }
    return lines.join('\n');
  }

  function handleShare() {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(buildShareText())}`;
    Linking.openURL(url);
    archiveAll();
  }

  return (
    <View>
      <Card>
        <View style={styles.row}>
          <TrendingUp size={16} color={c.textMuted} />
          <Text style={[typography.micro, { color: c.textMuted, textTransform: 'uppercase' }]}>{t('overview')}</Text>
        </View>
        <View style={[styles.statsRow, { marginTop: spacing.md }]}>
          <StatBox label={t('total')} value={totalExpenses.toFixed(0)} highlight />
          {userNames.map((u) => (
            <StatBox key={u} label={sn(u)} value={perPersonPaid[u].toFixed(0)} />
          ))}
        </View>
      </Card>

      <Card>
        <View style={styles.balanceHeader}>
          <View style={styles.row}>
            <Wallet size={18} color={c.accent} />
            <Text style={[typography.subtitle, { color: c.text }]}>{t('balances')}</Text>
          </View>
          <Pressable onPress={handleShare} style={[styles.waBtn, { backgroundColor: c.whatsapp }]}>
            <MessageCircle size={14} color="#fff" />
            <Text style={styles.waText}>{t('share')}</Text>
          </Pressable>
        </View>

        <View style={styles.balanceGrid}>
          {userNames.map((user) => {
            const bal = balances[user];
            const positive = bal > 0.005;
            const negative = bal < -0.005;
            return (
              <View
                key={user}
                style={[
                  styles.balanceCell,
                  {
                    backgroundColor: positive ? c.successSoft : negative ? c.dangerSoft : c.bgMuted,
                    borderColor: positive ? c.success + '30' : negative ? c.danger + '30' : c.inputBorder,
                  },
                ]}
              >
                <Text style={{ fontSize: 28, opacity: 0.25, position: 'absolute', bottom: 0, right: 4 }}>
                  {balanceEmoji(bal)}
                </Text>
                <Text style={[typography.caption, { color: c.textSecondary }]}>{sn(user)}</Text>
                <Text
                  style={[
                    typography.title,
                    {
                      color: positive ? c.success : negative ? c.danger : c.textMuted,
                      fontSize: 22,
                    },
                  ]}
                >
                  {bal > 0 ? '+' : ''}
                  {bal.toFixed(0)}
                </Text>
                <Text style={[typography.micro, { color: c.textMuted }]}>
                  {positive ? t('getsBack') : negative ? t('owes') : t('settled')}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={[styles.verifiedRow, { backgroundColor: c.bgMuted }]}>
          <Text style={[typography.caption, { color: isBalanced ? c.success : c.warning }]}>
            {isBalanced ? t('verified') : t('offBy', { amount: Math.abs(balanceSum).toFixed(2) })}
          </Text>
          <Text style={[typography.caption, { color: c.textMuted }]}>
            {expenses.length} {expenses.length !== 1 ? t('item_other') : t('item_one')}
          </Text>
        </View>
      </Card>

      {settlements.length > 0 && (
        <Card>
          <Text style={[typography.micro, { color: c.textMuted, marginBottom: spacing.md, textTransform: 'uppercase' }]}>
            {t('settlementPlan')}
          </Text>
          {settlements.map((s) => (
            <View key={`${s.from}-${s.to}`} style={[styles.settleRow, { backgroundColor: c.bgMuted }]}>
              <Text style={[typography.caption, { color: c.danger, fontWeight: '700' }]}>{sn(s.from)}</Text>
              <Text style={{ color: c.textMuted }}>→</Text>
              <Text style={[typography.caption, { color: c.success, fontWeight: '700' }]}>{sn(s.to)}</Text>
              <Text style={[typography.subtitle, { color: c.text, marginLeft: 'auto' }]}>{s.amount.toFixed(0)}</Text>
            </View>
          ))}
        </Card>
      )}
    </View>
  );
}

function StatBox({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  const c = useTheme();
  return (
    <View style={[styles.statBox, { backgroundColor: highlight ? c.accentSoft : c.bgMuted }]}>
      <Text style={[typography.micro, { color: highlight ? c.accent : c.textMuted }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[typography.subtitle, { color: c.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statBox: { flex: 1, minWidth: 70, borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  balanceHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  waBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md },
  waText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  balanceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  balanceCell: {
    width: '47%',
    flexGrow: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    alignItems: 'center',
    overflow: 'hidden',
  },
  verifiedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.sm,
  },
  settleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
});
