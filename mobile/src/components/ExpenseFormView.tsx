import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { generateId } from '../lib/id';
import * as Haptics from 'expo-haptics';
import { AlertCircle, Check, PlusCircle, Save, X } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { splitEvenly } from '../lib/calculations';
import { CATEGORIES } from '../lib/constants';
import type { Expense } from '../lib/types';
import { radius, spacing, typography } from '../theme';
import { Card, Chip, Input, Label, PrimaryButton } from './ui';

export function ExpenseFormView() {
  const {
    userNames,
    currentUser,
    editingExpense,
    addExpense,
    updateExpense,
    cancelEdit,
    t,
    sn,
  } = useApp();
  const c = useTheme();

  const [category, setCategory] = useState<(typeof CATEGORIES)[0] | null>(null);
  const [item, setItem] = useState('');
  const [amount, setAmount] = useState('');
  const [participants, setParticipants] = useState<string[]>([...userNames]);
  const [paidBy, setPaidBy] = useState<Record<string, string>>(() =>
    Object.fromEntries(userNames.map((u) => [u, ''])),
  );
  const [errors, setErrors] = useState<string[]>([]);

  const isEditing = !!editingExpense;
  const isOthers = category?.id === 'others';

  useEffect(() => {
    setParticipants((p) => p.filter((u) => userNames.includes(u)));
    setPaidBy((pb) => {
      const next = { ...pb };
      userNames.forEach((u) => {
        if (!(u in next)) next[u] = '';
      });
      return next;
    });
  }, [userNames]);

  useEffect(() => {
    if (!editingExpense) return;
    const match =
      CATEGORIES.find((cat) => cat.label === editingExpense.item || cat.id === editingExpense.category) ||
      CATEGORIES.find((cat) => cat.id === 'others');
    setCategory(match || null);
    setItem(editingExpense.item);
    setAmount(String(editingExpense.amount));
    setParticipants([...editingExpense.participants]);
    const pb = Object.fromEntries(userNames.map((u) => [u, '']));
    userNames.forEach((u) => {
      if (editingExpense.paidBy[u]) pb[u] = String(editingExpense.paidBy[u]);
    });
    setPaidBy(pb);
    setErrors([]);
  }, [editingExpense, userNames]);

  const totalAmount = parseFloat(amount) || 0;
  const paidEntries = userNames
    .map((u) => ({ user: u, amount: parseFloat(paidBy[u]) || 0 }))
    .filter((e) => e.amount > 0);
  const totalPaid = paidEntries.reduce((s, e) => s + e.amount, 0);
  const nonParticipantPayers = paidEntries.filter((e) => !participants.includes(e.user));
  const showPreview = totalAmount > 0 && participants.length > 0 && totalPaid > 0;
  const previewShares = showPreview ? splitEvenly(totalAmount, participants.length) : [];

  function resetForm() {
    setCategory(null);
    setItem('');
    setAmount('');
    setParticipants([...userNames]);
    setPaidBy(Object.fromEntries(userNames.map((u) => [u, ''])));
    setErrors([]);
  }

  function validate() {
    const errs: string[] = [];
    if (!category) errs.push(t('errCategory'));
    if (isOthers && !item.trim()) errs.push(t('errItemName'));
    if (totalAmount <= 0) errs.push(t('errAmount'));
    if (participants.length === 0) errs.push(t('errParticipant'));
    if (totalPaid === 0) errs.push(t('errWhoPaid'));
    return errs;
  }

  function handleSubmit() {
    const errs = validate();
    if (errs.length) {
      setErrors(errs);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    const finalItem = isOthers ? item.trim() : category!.label;
    const paidByNumeric: Record<string, number> = {};
    userNames.forEach((u) => {
      const v = parseFloat(paidBy[u]);
      if (v > 0) paidByNumeric[u] = v;
    });
    const base = {
      item: finalItem,
      category: category!.id,
      amount: totalAmount,
      participants: [...participants],
      paidBy: paidByNumeric,
      totalPaid,
    };
    if (isEditing) {
      updateExpense({ ...editingExpense!, ...base });
    } else {
      addExpense({
        id: generateId(),
        ...base,
        addedBy: currentUser!,
        createdAt: Date.now(),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    resetForm();
  }

  return (
    <Card style={isEditing ? { borderColor: c.accent } : undefined}>
      <View style={styles.header}>
        <Text style={[typography.subtitle, { color: c.text }]}>
          {isEditing ? t('editExpense') : t('addExpense')}
        </Text>
        {isEditing && (
          <Pressable onPress={() => { resetForm(); cancelEdit(); }}>
            <X size={18} color={c.textMuted} />
          </Pressable>
        )}
      </View>

      {errors.length > 0 && (
        <View style={[styles.errorBox, { backgroundColor: c.dangerSoft }]}>
          {errors.map((err, i) => (
            <View key={i} style={styles.errorRow}>
              <AlertCircle size={14} color={c.danger} />
              <Text style={[typography.caption, { color: c.danger }]}>{err}</Text>
            </View>
          ))}
        </View>
      )}

      <Label>{t('category')}</Label>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
        {CATEGORIES.map((cat) => (
          <Pressable
            key={cat.id}
            onPress={() => {
              setCategory(cat);
              if (cat.id !== 'others') setItem('');
            }}
            style={[
              styles.catBtn,
              {
                backgroundColor: category?.id === cat.id ? c.accentSoft : c.bgMuted,
                borderColor: category?.id === cat.id ? c.accent : c.inputBorder,
              },
            ]}
          >
            <Text style={{ fontSize: 24 }}>{cat.emoji}</Text>
            <Text style={[typography.micro, { color: category?.id === cat.id ? c.accent : c.textMuted }]}>
              {t('cat_' + cat.id)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {isOthers && (
        <View style={{ marginTop: spacing.md }}>
          <Label>{t('itemName')}</Label>
          <Input value={item} onChangeText={setItem} placeholder={t('itemPlaceholder')} />
        </View>
      )}

      <View style={{ marginTop: spacing.md }}>
        <Label>{t('totalAmount')}</Label>
        <Input value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" />
      </View>

      <View style={{ marginTop: spacing.md }}>
        <Label>{t('whosIncluded')}</Label>
        <View style={styles.chipRow}>
          {userNames.map((user) => {
            const active = participants.includes(user);
            return (
              <Pressable
                key={user}
                onPress={() =>
                  setParticipants((p) =>
                    p.includes(user) ? p.filter((u) => u !== user) : [...p, user],
                  )
                }
                style={[
                  styles.participantBtn,
                  {
                    backgroundColor: active ? c.accentSoft : c.bgMuted,
                    borderColor: active ? c.accent : c.inputBorder,
                  },
                ]}
              >
                {active ? <Check size={14} color={c.accent} /> : <X size={14} color={c.textMuted} />}
                <Text style={[typography.caption, { color: active ? c.accent : c.textMuted }]}>{sn(user)}</Text>
              </Pressable>
            );
          })}
        </View>
        {totalAmount > 0 && participants.length > 0 && (
          <Text style={[typography.caption, { color: c.accent, textAlign: 'center', marginTop: spacing.sm }]}>
            {totalAmount.toFixed(2)} ÷ {participants.length} = {(totalAmount / participants.length).toFixed(2)} {t('each')}
          </Text>
        )}
      </View>

      <View style={{ marginTop: spacing.md }}>
        <Label>{t('whoPaid')}</Label>
        {userNames.map((user) => (
          <View key={user} style={[styles.paidRow, { backgroundColor: c.bgMuted }]}>
            <Text style={[typography.caption, { color: c.text, width: 56, textAlign: 'center' }]}>{sn(user)}</Text>
            <Input
              value={paidBy[user]}
              onChangeText={(v) => setPaidBy((p) => ({ ...p, [user]: v }))}
              keyboardType="decimal-pad"
              placeholder="0"
              style={{ flex: 1 }}
            />
          </View>
        ))}
        {nonParticipantPayers.length > 0 && (
          <Text style={[typography.caption, { color: c.warning, marginTop: spacing.sm }]}>
            {nonParticipantPayers.map((e) => sn(e.user)).join(', ')}{' '}
            {nonParticipantPayers.length === 1 ? t('loanWarning_one') : t('loanWarning_many')}
          </Text>
        )}
      </View>

      {showPreview && (
        <View style={[styles.previewRow, { marginTop: spacing.md }]}>
          {userNames.map((user) => {
            const idx = participants.indexOf(user);
            const share = idx >= 0 ? previewShares[idx] : 0;
            const paid = parseFloat(paidBy[user]) || 0;
            const net = Math.round((paid - share) * 100) / 100;
            return (
              <View
                key={user}
                style={[
                  styles.previewCell,
                  {
                    backgroundColor:
                      net > 0.005 ? c.successSoft : net < -0.005 ? c.dangerSoft : c.bgMuted,
                  },
                ]}
              >
                <Text style={[typography.micro, { color: c.textMuted }]}>{sn(user)}</Text>
                <Text
                  style={[
                    typography.subtitle,
                    {
                      color: net > 0.005 ? c.success : net < -0.005 ? c.danger : c.textMuted,
                    },
                  ]}
                >
                  {net > 0 ? '+' : ''}
                  {net.toFixed(2)}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      <View style={{ marginTop: spacing.lg }}>
        <PrimaryButton
          label={isEditing ? t('saveChanges') : t('addExpense')}
          onPress={handleSubmit}
          icon={isEditing ? <Save size={18} color="#fff" /> : <PlusCircle size={18} color="#fff" />}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  errorBox: { borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md, gap: spacing.xs },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  catScroll: { marginBottom: spacing.sm },
  catBtn: {
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    marginRight: spacing.sm,
    minWidth: 68,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  participantBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    minWidth: '45%',
    flexGrow: 1,
    justifyContent: 'center',
  },
  paidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  previewRow: { flexDirection: 'row', gap: spacing.xs },
  previewCell: { flex: 1, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center' },
});
