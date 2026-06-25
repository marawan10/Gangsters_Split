import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import * as Haptics from 'expo-haptics';
import { CheckCircle, Clock, Copy, Send } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import {
  applySettledToBalances,
  computeNetBalances,
  computeSettlements,
  getPairSettlementUiState,
} from '../lib/calculations';
import { buildInstapayPayUrl, getMemberInstapay } from '../lib/constants';
import { addSettlement, updateSettlementStatus } from '../lib/firebase';
import { radius, spacing, typography } from '../theme';
import { Avatar, Card, Subtitle, Title } from './ui';
import { FadeInView, StaggerIn } from './motion';

export function DashboardView() {
  const { currentUser, expenses, archive, settlements, members, userNames, t, sn } = useApp();
  const c = useTheme();
  if (!currentUser) return null;

  const allExpenses = [...expenses, ...archive];
  const balancesAfterSettled = applySettledToBalances(
    computeNetBalances(allExpenses, userNames),
    settlements,
    userNames,
  );
  const rawSettlementPlan = computeSettlements(balancesAfterSettled);
  const others = userNames.filter((u) => u !== currentUser);

  const debts = others.map((other) => {
    const rawFromMe = rawSettlementPlan
      .filter((s) => s.from === currentUser && s.to === other)
      .reduce((sum, s) => sum + s.amount, 0);
    const rawToMe = rawSettlementPlan
      .filter((s) => s.from === other && s.to === currentUser)
      .reduce((sum, s) => sum + s.amount, 0);
    const iOwe = Math.max(0, Math.round(rawFromMe * 100) / 100);
    const theyOwe = Math.max(0, Math.round(rawToMe * 100) / 100);
    const state = getPairSettlementUiState(currentUser, other, iOwe, theyOwe, settlements);
    return { other, iOwe, theyOwe, ...state };
  });

  const totalPaid = allExpenses.reduce((sum, e) => sum + (e.paidBy[currentUser] || 0), 0);
  const totalSpent = allExpenses.reduce((sum, e) => sum + e.amount, 0);
  const member = members.find((m) => m.name === currentUser);

  return (
    <View>
      <FadeInView>
        <Card accent>
          <View style={styles.greetRow}>
            <Avatar name={currentUser} color={member?.color} size={48} />
            <View style={{ flex: 1 }}>
              <Title>{t('dashGreeting', { name: sn(currentUser) })} 👋</Title>
              <Subtitle>{t('dashSubtitle')}</Subtitle>
            </View>
          </View>
          <Text style={[typography.micro, { color: c.textMuted, marginTop: spacing.md, lineHeight: 16 }]}>
            {t('dashHint')}
          </Text>
        </Card>
      </FadeInView>

      {debts.map((d, i) => (
        <StaggerIn key={d.other} index={i + 1}>
          <DebtCard debt={d} />
        </StaggerIn>
      ))}

      <FadeInView delay={debts.length * 60 + 120}>
        <Card>
        <Text style={[typography.micro, { color: c.textMuted, marginBottom: spacing.md, textTransform: 'uppercase' }]}>
          {t('dashStats')}
        </Text>
        <View style={styles.statsRow}>
          <StatBox label={t('dashYouPaid')} value={totalPaid.toFixed(0)} />
          <StatBox label={t('dashGroupTotal')} value={totalSpent.toFixed(0)} highlight />
          <StatBox label={t('dashExpenses')} value={String(allExpenses.length)} />
        </View>
        </Card>
      </FadeInView>
    </View>
  );
}

function StatBox({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  const c = useTheme();
  return (
    <View style={[styles.statBox, { backgroundColor: highlight ? c.accentSoft : c.bgMuted }]}>
      <Text style={[typography.micro, { color: highlight ? c.accent : c.textMuted }]}>{label}</Text>
      <Text style={[typography.subtitle, { color: c.text, marginTop: 4 }]}>{value}</Text>
    </View>
  );
}

function DebtCard({
  debt,
}: {
  debt: {
    other: string;
    iOwe: number;
    theyOwe: number;
    pendingOutbound: import('../lib/types').Settlement[];
    pendingInbound: import('../lib/types').Settlement[];
    sentOutboundTotal: number;
    additionalIOwe: number;
  };
}) {
  const { currentUser, members, t, sn } = useApp();
  const c = useTheme();
  const {
    other,
    iOwe,
    theyOwe,
    pendingOutbound,
    pendingInbound,
    sentOutboundTotal,
    additionalIOwe,
  } = debt;
  const [confirmSent, setConfirmSent] = useState(false);
  const [copied, setCopied] = useState(false);
  const [payFlash, setPayFlash] = useState(false);

  const pay = getMemberInstapay(members, other);
  const hasDirectLink = !!pay?.url;
  const hasOutboundPending = pendingOutbound.some((s) => s.status === 'pending');
  const hasOutboundSent = pendingOutbound.some((s) => s.status === 'sent');
  const inboundSent = pendingInbound.find((s) => s.status === 'sent');
  const hasPairFlow = pendingOutbound.length > 0 || pendingInbound.length > 0;
  const hasDebt = iOwe > 0.005 || theyOwe > 0.005;
  const member = members.find((m) => m.name === other);

  if (!hasDebt && !hasPairFlow) {
    return (
      <Card>
        <View style={styles.debtHeader}>
          <View style={styles.nameRow}>
            <Avatar name={other} color={member?.color} size={32} />
            <Text style={[typography.subtitle, { color: c.text }]}>{sn(other)}</Text>
          </View>
          <Text style={[typography.caption, { color: c.success }]}>✅ {t('dashAllClear')}</Text>
        </View>
      </Card>
    );
  }

  const borderColor =
    iOwe > 0.005 ? c.danger + '40' : theyOwe > 0.005 ? c.success + '40' : c.cardBorder;
  const bgTint = iOwe > 0.005 ? c.dangerSoft : theyOwe > 0.005 ? c.successSoft : c.card;

  async function handleMarkSent() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (confirmSent) {
      const toActivate = pendingOutbound.filter((s) => s.status === 'pending');
      if (toActivate.length > 0) {
        toActivate.forEach((s) => s.fbKey && updateSettlementStatus(s.fbKey, 'sent'));
      } else if (additionalIOwe > 0.005 && currentUser) {
        await addSettlement({
          from: currentUser,
          to: other,
          amount: additionalIOwe,
          status: 'sent',
          createdAt: Date.now(),
          sentAt: Date.now(),
        });
      }
      setConfirmSent(false);
    } else {
      setConfirmSent(true);
      setTimeout(() => setConfirmSent(false), 3000);
    }
  }

  function handleCopy() {
    if (!pay?.username) return;
    Clipboard.setString(`${pay.username}@instapay`);
    setCopied(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => setCopied(false), 2000);
  }

  function handlePay() {
    const url = hasDirectLink
      ? buildInstapayPayUrl(pay!.url, additionalIOwe)
      : 'https://play.google.com/store/apps/details?id=com.egyptianbanks.instapay';
    if (hasDirectLink && additionalIOwe > 0.005) {
      Clipboard.setString(additionalIOwe.toFixed(2));
      setPayFlash(true);
      setTimeout(() => setPayFlash(false), 3500);
    }
    Linking.openURL(url);
  }

  const showPayAndMarkSent = additionalIOwe > 0.005 || hasOutboundPending;

  return (
    <Card style={{ borderColor, backgroundColor: bgTint }}>
      <View style={styles.debtHeader}>
        <View style={styles.nameRow}>
          <Avatar name={other} color={member?.color} size={36} />
          <Text style={[typography.subtitle, { color: c.text }]}>{sn(other)}</Text>
        </View>
        {iOwe > 0.005 ? (
          <View style={[styles.pill, { backgroundColor: c.dangerSoft }]}>
            <Text style={[typography.caption, { color: c.danger, fontWeight: '700' }]}>
              {t('dashYouOwe')} {iOwe.toFixed(0)}
            </Text>
          </View>
        ) : theyOwe > 0.005 ? (
          <View style={[styles.pill, { backgroundColor: c.successSoft }]}>
            <Text style={[typography.caption, { color: c.success, fontWeight: '700' }]}>
              {t('dashOwesYou')} {theyOwe.toFixed(0)}
            </Text>
          </View>
        ) : null}
      </View>

      {hasOutboundPending && (
        <View style={[styles.statusBox, { backgroundColor: c.bgMuted }]}>
          <Clock size={14} color={c.textMuted} />
          <Text style={[typography.caption, { color: c.textSecondary }]}>{t('dashNotSentYet')}</Text>
        </View>
      )}
      {hasOutboundSent && (
        <View style={[styles.statusBox, { backgroundColor: c.warningSoft }]}>
          <Send size={14} color={c.warning} />
          <Text style={[typography.caption, { color: c.warning }]}>
            {t('dashYouSent')} ({sentOutboundTotal.toFixed(0)})
            {additionalIOwe > 0.005 ? ` · ${t('dashStillToSend', { amount: additionalIOwe.toFixed(0) })}` : ''}
          </Text>
        </View>
      )}
      {inboundSent && (
        <View style={[styles.statusBox, { backgroundColor: c.warningSoft }]}>
          <Send size={14} color={c.warning} />
          <Text style={[typography.caption, { color: c.warning }]}>
            {t('dashSentBy', { name: sn(inboundSent.from) })}
          </Text>
        </View>
      )}

      {additionalIOwe > 0.005 && !hasDirectLink && pay?.username && (
        <Pressable onPress={handleCopy} style={[styles.copyRow, { backgroundColor: c.bgMuted }]}>
          <Text style={[typography.caption, { color: c.text, fontFamily: 'monospace' }]}>
            {pay.username}@instapay
          </Text>
          <View style={styles.copyBtn}>
            {copied ? <CheckCircle size={12} color={c.success} /> : <Copy size={12} color={c.textMuted} />}
            <Text style={[typography.micro, { color: copied ? c.success : c.textMuted }]}>
              {copied ? t('dashCopied') : t('dashCopy')}
            </Text>
          </View>
        </Pressable>
      )}

      <View style={styles.actions}>
        {additionalIOwe > 0.005 && (
          <Pressable onPress={handlePay} style={[styles.actionBtn, { backgroundColor: c.accent }]}>
            <Text style={styles.actionBtnText}>
              💳 {hasDirectLink ? t('dashPayInstapay') : t('dashOpenInstapay')}
            </Text>
          </Pressable>
        )}
        {showPayAndMarkSent && (
          <Pressable
            onPress={handleMarkSent}
            style={[
              styles.actionBtn,
              { backgroundColor: confirmSent ? c.success : c.successSoft, borderWidth: confirmSent ? 0 : 1, borderColor: c.success },
            ]}
          >
            <CheckCircle size={14} color={confirmSent ? '#fff' : c.success} />
            <Text style={[styles.actionBtnText, { color: confirmSent ? '#fff' : c.success }]}>
              {confirmSent ? t('dashTapConfirm') : t('dashISentIt')}
            </Text>
          </Pressable>
        )}
        {hasOutboundSent && (
          <View style={[styles.actionBtn, { backgroundColor: c.warningSoft }]}>
            <Clock size={14} color={c.warning} />
            <Text style={[typography.caption, { color: c.warning }]}>
              {t('dashWaitingConfirm', { name: sn(other) })}
            </Text>
          </View>
        )}
        {inboundSent && (
          <Pressable
            onPress={() => inboundSent.fbKey && updateSettlementStatus(inboundSent.fbKey, 'settled')}
            style={[styles.actionBtn, { backgroundColor: c.success }]}
          >
            <CheckCircle size={14} color="#fff" />
            <Text style={styles.actionBtnText}>{t('dashConfirmReceived')}</Text>
          </Pressable>
        )}
        {theyOwe > 0.005 && !inboundSent && (
          <View style={[styles.actionBtn, { backgroundColor: c.bgMuted }]}>
            <Clock size={14} color={c.textMuted} />
            <Text style={[typography.caption, { color: c.textMuted }]}>{t('dashWaiting')}</Text>
          </View>
        )}
      </View>
      {payFlash && (
        <Text style={[typography.micro, { color: c.accent, textAlign: 'center', marginTop: spacing.sm }]}>
          {t('dashPayAmountCopied')}
        </Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  greetRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statBox: { flex: 1, borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  debtHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pill: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.sm },
  statusBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.sm },
  copyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.sm },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actions: { gap: spacing.sm },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    minHeight: 44,
  },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
