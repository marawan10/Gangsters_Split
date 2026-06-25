import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { generateId } from '../lib/id';
import * as Haptics from 'expo-haptics';
import { AlertCircle, Check, PlusCircle, ShoppingCart, Trash2, X } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import type { Expense } from '../lib/types';
import { radius, spacing, typography } from '../theme';
import { Card, Input, Label, PrimaryButton } from './ui';

interface TripItem {
  id: string;
  name: string;
  amount: string;
  forWhom: string[];
}

function emptyItem(users: string[]): TripItem {
  return { id: generateId(), name: '', amount: '', forWhom: [...users] };
}

export function ShoppingTripView() {
  const { userNames, currentUser, submitTrip, t, sn } = useApp();
  const c = useTheme();
  const [payer, setPayer] = useState(currentUser || userNames[0] || '');
  const [items, setItems] = useState<TripItem[]>(() => [emptyItem(userNames)]);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (currentUser) setPayer(currentUser);
  }, [currentUser]);

  useEffect(() => {
    setItems((prev) =>
      prev.map((i) => ({
        ...i,
        forWhom: i.forWhom.filter((u) => userNames.includes(u)),
      })),
    );
  }, [userNames]);

  const validItems = items.filter(
    (i) => i.name.trim() && parseFloat(i.amount) > 0 && i.forWhom.length > 0,
  );
  const totalAmount = items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);

  function validate() {
    const errs: string[] = [];
    if (validItems.length === 0) errs.push(t('errTripEmpty'));
    items.forEach((i, idx) => {
      const amt = parseFloat(i.amount) || 0;
      if (i.name.trim() && amt <= 0) errs.push(t('errTripAmount', { n: String(idx + 1) }));
      if (amt > 0 && !i.name.trim()) errs.push(t('errTripName', { n: String(idx + 1) }));
      if ((i.name.trim() || amt > 0) && i.forWhom.length === 0) {
        errs.push(t('errTripFor', { n: String(idx + 1) }));
      }
    });
    return errs;
  }

  function handleSubmit() {
    const errs = validate();
    if (errs.length) {
      setErrors(errs);
      return;
    }
    const expenses: Expense[] = validItems.map((i) => ({
      id: generateId(),
      item: i.name.trim(),
      category: 'shopping',
      amount: parseFloat(i.amount),
      participants: [...i.forWhom],
      paidBy: { [payer]: parseFloat(i.amount) },
      totalPaid: parseFloat(i.amount),
      addedBy: currentUser!,
      createdAt: Date.now(),
    }));
    submitTrip(expenses);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setItems([emptyItem(userNames)]);
    setErrors([]);
  }

  return (
    <Card>
      <Text style={[typography.subtitle, { color: c.text, marginBottom: spacing.md }]}>{t('shoppingTrip')}</Text>

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

      <Label>{t('whoWentShopping')}</Label>
      <View style={styles.chipRow}>
        {userNames.map((user) => (
          <Pressable
            key={user}
            onPress={() => setPayer(user)}
            style={[
              styles.payerBtn,
              {
                backgroundColor: payer === user ? c.accentSoft : c.bgMuted,
                borderColor: payer === user ? c.accent : c.inputBorder,
              },
            ]}
          >
            {payer === user && <Check size={14} color={c.accent} />}
            <Text style={[typography.caption, { color: payer === user ? c.accent : c.textMuted }]}>{sn(user)}</Text>
          </Pressable>
        ))}
      </View>

      <Label>{t('items')}</Label>
      {items.map((item, idx) => (
        <View key={item.id} style={[styles.itemCard, { backgroundColor: c.bgMuted }]}>
          <View style={styles.itemTop}>
            <Text style={[typography.caption, { color: c.textMuted }]}>{idx + 1}.</Text>
            <Input
              value={item.name}
              onChangeText={(v) =>
                setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, name: v } : i)))
              }
              placeholder={t('itemName')}
              style={{ flex: 1 }}
            />
            <Input
              value={item.amount}
              onChangeText={(v) =>
                setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, amount: v } : i)))
              }
              keyboardType="decimal-pad"
              placeholder="0"
              style={{ width: 72 }}
            />
            {items.length > 1 && (
              <Pressable onPress={() => setItems((prev) => prev.filter((i) => i.id !== item.id))}>
                <Trash2 size={16} color={c.danger} />
              </Pressable>
            )}
          </View>
          <View style={styles.forRow}>
            <Text style={[typography.micro, { color: c.textMuted }]}>{t('forLabel')}</Text>
            {userNames.map((user) => {
              const active = item.forWhom.includes(user);
              return (
                <Pressable
                  key={user}
                  onPress={() =>
                    setItems((prev) =>
                      prev.map((i) => {
                        if (i.id !== item.id) return i;
                        const has = i.forWhom.includes(user);
                        return {
                          ...i,
                          forWhom: has ? i.forWhom.filter((u) => u !== user) : [...i.forWhom, user],
                        };
                      }),
                    )
                  }
                  style={[
                    styles.forChip,
                    { backgroundColor: active ? c.accentSoft : c.bgElevated },
                  ]}
                >
                  {active ? <Check size={10} color={c.accent} /> : <X size={10} color={c.textMuted} />}
                  <Text style={[typography.micro, { color: active ? c.accent : c.textMuted }]}>{sn(user)}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}

      <Pressable
        onPress={() => setItems((prev) => [...prev, emptyItem(userNames)])}
        style={[styles.addItemBtn, { borderColor: c.inputBorder }]}
      >
        <PlusCircle size={16} color={c.textMuted} />
        <Text style={[typography.caption, { color: c.textMuted }]}>{t('addItem')}</Text>
      </Pressable>

      <View style={{ marginTop: spacing.lg }}>
        <PrimaryButton
          label={t('addNItems', {
            n: String(validItems.length),
            s: validItems.length !== 1 ? 's' : '',
            total: totalAmount.toFixed(0),
          })}
          onPress={handleSubmit}
          icon={<ShoppingCart size={18} color="#fff" />}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  errorBox: { borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md, gap: spacing.xs },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  payerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    flexGrow: 1,
    justifyContent: 'center',
  },
  itemCard: { borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  itemTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  forRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs },
  forChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
});
