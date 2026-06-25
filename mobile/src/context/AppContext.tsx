import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, I18nManager, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import type { Expense, IdentityClaim, Lang, Member } from '../lib/types';
import { generateId } from '../lib/id';
import {
  ADMIN_NAME,
  DARK_KEY,
  DEFAULT_MEMBERS,
  DEVICE_ID_KEY,
  IDENTITY_KEY,
  LANG_KEY,
  memberNames,
} from '../lib/constants';
import { computeNetBalances, computeSettlements } from '../lib/calculations';
import { shortName, translate } from '../lib/i18n';
import {
  addExpenseToDb,
  addMember,
  addSettlement,
  archiveExpense,
  claimIdentity,
  clearAllExpensesFromDb,
  deleteExpenseFromDb,
  releaseIdentityClaim,
  removeMember,
  subscribeArchive,
  subscribeExpenses,
  subscribeIdentityClaims,
  subscribeMembers,
  subscribeSettlements,
  updateExpenseInDb,
} from '../lib/firebase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface AppContextValue {
  currentUser: string | null;
  members: Member[];
  userNames: string[];
  expenses: Expense[];
  archive: Expense[];
  settlements: import('../lib/types').Settlement[];
  isAdmin: boolean;
  lang: Lang;
  isRTL: boolean;
  isDark: boolean;
  spendPopup: string | null;
  editingExpense: Expense | null;
  formMode: 'quick' | 'trip';
  t: (key: string, vars?: Record<string, string>) => string;
  sn: (name: string) => string;
  pickIdentity: (user: string) => Promise<string | null>;
  releaseIdentityClaim: (memberId: string) => Promise<void>;
  isMemberSelectable: (member: Member) => boolean;
  identityClaims: Record<string, IdentityClaim>;
  deviceId: string;
  toggleDark: () => void;
  toggleLang: () => void;
  setFormMode: (mode: 'quick' | 'trip') => void;
  addExpense: (expense: Expense) => void;
  submitTrip: (items: Expense[]) => void;
  updateExpense: (expense: Expense) => void;
  deleteExpense: (id: string) => void;
  archiveAll: () => void;
  startEdit: (expense: Expense) => void;
  cancelEdit: () => void;
  handleReset: () => Promise<void>;
  dismissSpendPopup: () => void;
  addGroupMember: (name: string, instapayUser?: string, instapayUrl?: string) => Promise<string | null>;
  removeGroupMember: (id: string) => Promise<string | null>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>(DEFAULT_MEMBERS);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [archive, setArchive] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<import('../lib/types').Settlement[]>([]);
  const [lang, setLang] = useState<Lang>('en');
  const [isDark, setIsDark] = useState(false);
  const [spendPopup, setSpendPopup] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [formMode, setFormMode] = useState<'quick' | 'trip'>('quick');
  const [ready, setReady] = useState(false);
  const [deviceId, setDeviceId] = useState('');
  const [identityClaims, setIdentityClaims] = useState<Record<string, IdentityClaim>>({});

  const prevExpenseCount = useRef(0);
  const initialLoad = useRef(true);
  const spendPopupShown = useRef(new Set<number>());

  const userNames = useMemo(() => memberNames(members), [members]);
  const isAdmin = currentUser === ADMIN_NAME;
  const isRTL = lang === 'ar';

  const t = useCallback(
    (key: string, vars?: Record<string, string>) => translate(lang, key, vars),
    [lang],
  );
  const sn = useCallback((name: string) => shortName(lang, name), [lang]);

  useEffect(() => {
    (async () => {
      let storedDeviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
      if (!storedDeviceId) {
        storedDeviceId = generateId();
        await AsyncStorage.setItem(DEVICE_ID_KEY, storedDeviceId);
      }
      setDeviceId(storedDeviceId);

      const [identity, dark, storedLang] = await Promise.all([
        AsyncStorage.getItem(IDENTITY_KEY),
        AsyncStorage.getItem(DARK_KEY),
        AsyncStorage.getItem(LANG_KEY),
      ]);
      if (identity) setCurrentUser(identity);
      if (dark !== null) setIsDark(dark === 'true');
      if (storedLang === 'ar' || storedLang === 'en') {
        setLang(storedLang);
        I18nManager.allowRTL(true);
        I18nManager.forceRTL(storedLang === 'ar');
      }
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    const unsub1 = subscribeExpenses((list) => {
      if (initialLoad.current) {
        initialLoad.current = false;
        prevExpenseCount.current = list.length;
        setExpenses(list);
        return;
      }
      if (list.length > prevExpenseCount.current && currentUser) {
        const newest = list[0];
        if (newest?.addedBy && newest.addedBy !== currentUser) {
          Notifications.scheduleNotificationAsync({
            content: {
              title: t('appName'),
              body: t('notifAdded', {
                who: sn(newest.addedBy),
                item: newest.item,
                amount: newest.amount.toFixed(0),
              }),
            },
            trigger: null,
          });
        }
      }
      prevExpenseCount.current = list.length;
      setExpenses(list);
    });
    const unsub2 = subscribeArchive(setArchive);
    const unsub3 = subscribeSettlements(setSettlements);
    const unsub4 = subscribeMembers(setMembers);
    const unsub5 = subscribeIdentityClaims(setIdentityClaims);
    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      unsub5();
    };
  }, [ready, currentUser, t, sn]);

  useEffect(() => {
    const SIX_HOURS = 6 * 60 * 60 * 1000;
    function archiveExpired() {
      const cutoff = Date.now() - SIX_HOURS;
      expenses.forEach((e) => {
        if (e.createdAt <= cutoff) archiveExpense(e);
      });
    }
    archiveExpired();
    const id = setInterval(archiveExpired, 60_000);
    return () => clearInterval(id);
  }, [expenses]);

  useEffect(() => {
    if (!expenses.length) return;
    const todayTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
    const threshold = Math.floor(todayTotal / 100) * 100;
    if (threshold >= 400 && !spendPopupShown.current.has(threshold)) {
      spendPopupShown.current.add(threshold);
      setSpendPopup(t('spendingPopup', { amount: String(threshold) }));
      setTimeout(() => setSpendPopup(null), 4000);
    }
  }, [expenses, t]);

  const isMemberSelectable = useCallback(
    (member: Member) => {
      const claim = identityClaims[member.id];
      if (!claim) return true;
      return claim.deviceId === deviceId;
    },
    [identityClaims, deviceId],
  );

  const pickIdentity = useCallback(
    async (user: string): Promise<string | null> => {
      let activeDeviceId = deviceId;
      if (!activeDeviceId) {
        activeDeviceId = (await AsyncStorage.getItem(DEVICE_ID_KEY)) ?? '';
        if (!activeDeviceId) {
          activeDeviceId = generateId();
          await AsyncStorage.setItem(DEVICE_ID_KEY, activeDeviceId);
        }
        setDeviceId(activeDeviceId);
      }

      const member = members.find((m) => m.name === user);
      if (!member) return t('identityError');

      const claim = identityClaims[member.id];
      if (claim && claim.deviceId !== activeDeviceId) return t('identityTaken');

      const result = await claimIdentity(member.id, member.name, activeDeviceId);
      if (result === 'taken') return t('identityTaken');
      if (result === 'error') return t('identityError');

      await AsyncStorage.setItem(IDENTITY_KEY, user);
      setCurrentUser(user);
      void Notifications.requestPermissionsAsync();
      return null;
    },
    [deviceId, members, identityClaims, t],
  );

  const releaseIdentityClaimForMember = useCallback(async (memberId: string) => {
    await releaseIdentityClaim(memberId);
  }, []);

  const toggleDark = useCallback(() => {
    setIsDark((d) => {
      const next = !d;
      AsyncStorage.setItem(DARK_KEY, String(next));
      return next;
    });
  }, []);

  const toggleLang = useCallback(() => {
    setLang((l) => {
      const next: Lang = l === 'en' ? 'ar' : 'en';
      AsyncStorage.setItem(LANG_KEY, next);
      I18nManager.forceRTL(next === 'ar');
      return next;
    });
  }, []);

  const addExpense = useCallback((expense: Expense) => {
    addExpenseToDb(expense);
  }, []);

  const submitTrip = useCallback((items: Expense[]) => {
    items.forEach((e) => addExpenseToDb(e));
    setFormMode('quick');
  }, []);

  const updateExpense = useCallback((updated: Expense) => {
    updateExpenseInDb(updated);
    setEditingExpense(null);
  }, []);

  const deleteExpense = useCallback(
    (id: string) => {
      const expense = expenses.find((e) => e.id === id);
      if (expense) deleteExpenseFromDb(expense);
      setEditingExpense((cur) => (cur?.id === id ? null : cur));
    },
    [expenses],
  );

  const archiveAll = useCallback(() => {
    setEditingExpense(null);
    const balances = computeNetBalances(expenses, userNames);
    const plan = computeSettlements(balances);
    plan.forEach((s) => {
      addSettlement({
        from: s.from,
        to: s.to,
        amount: s.amount,
        status: 'pending',
        createdAt: Date.now(),
      });
    });
    expenses.forEach((e) => archiveExpense(e));
  }, [expenses, userNames]);

  const handleReset = useCallback(async () => {
    setEditingExpense(null);
    await clearAllExpensesFromDb();
  }, []);

  const addGroupMember = useCallback(
    async (name: string, instapayUser?: string, instapayUrl?: string) => {
      const trimmed = name.trim();
      if (!trimmed) return t('adminErrName');
      if (members.some((m) => m.name.toLowerCase() === trimmed.toLowerCase())) {
        return t('adminErrDuplicate');
      }
      const colorIdx = members.length % 6;
      const colors = ['#6366F1', '#8B5CF6', '#EC4899', '#14B8A6', '#F59E0B', '#3B82F6'];
      const member: Member = {
        id: generateId().slice(0, 8),
        name: trimmed,
        color: colors[colorIdx],
        ...(instapayUser
          ? {
              instapay: {
                username: instapayUser,
                url: instapayUrl || `https://ipn.eg/S/${instapayUser}/instapay`,
              },
            }
          : {}),
      };
      await addMember(member);
      return null;
    },
    [members, t],
  );

  const removeGroupMember = useCallback(
    async (id: string) => {
      const member = members.find((m) => m.id === id);
      if (!member) return null;
      if (member.isAdmin || member.name === ADMIN_NAME) return t('adminCannotRemoveAdmin');
      await removeMember(id);
      return null;
    },
    [members, t],
  );

  const value: AppContextValue = {
    currentUser,
    members,
    userNames,
    expenses,
    archive,
    settlements,
    isAdmin,
    lang,
    isRTL,
    isDark,
    spendPopup,
    editingExpense,
    formMode,
    t,
    sn,
    pickIdentity,
    releaseIdentityClaim: releaseIdentityClaimForMember,
    isMemberSelectable,
    identityClaims,
    deviceId,
    toggleDark,
    toggleLang,
    setFormMode,
    addExpense,
    submitTrip,
    updateExpense,
    deleteExpense,
    archiveAll,
    startEdit: setEditingExpense,
    cancelEdit: () => setEditingExpense(null),
    handleReset,
    dismissSpendPopup: () => setSpendPopup(null),
    addGroupMember,
    removeGroupMember,
  };

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F6FB' }}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
