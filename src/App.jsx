import { useState, useEffect, useCallback, useRef } from 'react';
import { RotateCcw, Sparkles, Home, Receipt } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ExpenseForm from './components/ExpenseForm';
import ShoppingTrip from './components/ShoppingTrip';
import ExpenseList from './components/ExpenseList';
import Summary from './components/Summary';
import History from './components/History';
import Dashboard from './components/Dashboard';
import DarkModeToggle from './components/DarkModeToggle';
import LanguageToggle from './components/LanguageToggle';
import { USERS } from './utils/constants';
import { useLanguage } from './utils/i18n';
import { computeSettlements, computeNetBalances } from './utils/calculations';
import {
  subscribeExpenses,
  subscribeArchive,
  subscribeSettlements,
  addExpenseToDb,
  updateExpenseInDb,
  deleteExpenseFromDb,
  archiveExpense,
  addSettlement,
  clearAllExpensesFromDb,
} from './utils/firebase';

const IDENTITY_KEY = 'gangsters-identity';

const SOUND_ORIGINAL = '/sound.mp3';
const SOUND_RICH = '/sound-bahgat.mp3';
const SOUND_OWES = '/3adel-shakal.mp3';

/** Net balance: positive = others owe you (rich) → Bahgat; negative = you owe → 3adel. */
function pickDashboardBalanceSound(expenses, archive, user) {
  const all = [...expenses, ...archive];
  if (all.length === 0) return null;
  const bal = computeNetBalances(all)[user] || 0;
  if (bal > 0.005) return SOUND_RICH;
  if (bal < -0.005) return SOUND_OWES;
  return null;
}

/**
 * Dashboard: autoplay balance sound once (rich = Bahgat, owes = 3adel). May be blocked until user gesture on some browsers.
 * Identity: silent (avoids double sound with dashboard). Expenses: classic intro once on first gesture.
 */
function useBalanceAndIntroSounds({ currentUser, tab, expenses, archive }) {
  const balanceSoundDone = useRef(false);
  const balancePlayInFlight = useRef(false);
  const classicIntroDone = useRef(false);
  const dashboardAutoplayStarted = useRef(false);

  const tabRef = useRef(tab);
  const userRef = useRef(currentUser);
  const expensesRef = useRef(expenses);
  const archiveRef = useRef(archive);
  tabRef.current = tab;
  userRef.current = currentUser;
  expensesRef.current = expenses;
  archiveRef.current = archive;

  useEffect(() => {
    if (!currentUser || tab !== 'dashboard') return;
    if (dashboardAutoplayStarted.current) return;

    const all = [...expenses, ...archive];
    if (all.length === 0) return;

    const src = pickDashboardBalanceSound(expenses, archive, currentUser);
    dashboardAutoplayStarted.current = true;

    if (!src) {
      balanceSoundDone.current = true;
      return;
    }

    balancePlayInFlight.current = true;
    const audio = document.createElement('audio');
    audio.src = src;
    audio.preload = 'auto';
    audio.playsInline = true;
    audio.setAttribute('playsinline', '');
    audio.style.display = 'none';
    document.body.appendChild(audio);

    audio
      .play()
      .then(() => {
        balanceSoundDone.current = true;
        balancePlayInFlight.current = false;
      })
      .catch(() => {
        balancePlayInFlight.current = false;
      });
  }, [currentUser, tab, expenses, archive]);

  useEffect(() => {
    const audio = document.createElement('audio');
    audio.preload = 'auto';
    audio.playsInline = true;
    audio.setAttribute('playsinline', '');
    audio.style.display = 'none';
    document.body.appendChild(audio);

    const events = ['touchend', 'click', 'keydown'];
    let detached = false;

    function detachAll() {
      if (detached) return;
      detached = true;
      events.forEach((evt) =>
        window.removeEventListener(evt, onGesture, true),
      );
    }

    function onGesture() {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const u = userRef.current;
          const tb = tabRef.current;

          if (!u) return;

          if (tb === 'expenses') {
            if (classicIntroDone.current) {
              detachAll();
              return;
            }
            classicIntroDone.current = true;
            audio.src = SOUND_ORIGINAL;
            audio.play().catch(() => {});
            detachAll();
            return;
          }

          if (tb === 'dashboard') {
            if (balanceSoundDone.current || balancePlayInFlight.current) {
              detachAll();
              return;
            }
            const src = pickDashboardBalanceSound(
              expensesRef.current,
              archiveRef.current,
              u,
            );
            balanceSoundDone.current = true;
            if (src) {
              audio.src = src;
              audio.play().catch(() => {});
            }
            detachAll();
            return;
          }

          detachAll();
        });
      });
    }

    events.forEach((evt) =>
      window.addEventListener(evt, onGesture, { capture: true }),
    );

    return () => {
      detachAll();
      audio.remove();
    };
  }, []);
}

function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('gangsters-dark');
    if (stored !== null) return stored === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('gangsters-dark', String(dark));
  }, [dark]);

  return [dark, () => setDark((d) => !d)];
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(
    () => localStorage.getItem(IDENTITY_KEY) || null,
  );
  const [expenses, setExpenses] = useState([]);
  const [archive, setArchive] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [dark, toggleDark] = useDarkMode();
  const [editingExpense, setEditingExpense] = useState(null);
  const [formMode, setFormMode] = useState('quick');
  const [tab, setTab] = useState('dashboard');
  const [spendPopup, setSpendPopup] = useState(null);
  const spendPopupShown = useRef(new Set());
  const { t, isRTL, shortName } = useLanguage();
  useBalanceAndIntroSounds({ currentUser, tab, expenses, archive });

  function pickIdentity(user) {
    localStorage.setItem(IDENTITY_KEY, user);
    setCurrentUser(user);
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  const prevExpenseCount = useRef(0);
  const initialLoad = useRef(true);

  useEffect(() => {
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
          const title = t('appName');
          const body = t('notifAdded', { who: shortName(newest.addedBy), item: newest.item, amount: newest.amount.toFixed(0) });
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body, icon: '/icon.png' });
          }
        }
      }
      prevExpenseCount.current = list.length;
      setExpenses(list);
    });
    const unsub2 = subscribeArchive(setArchive);
    const unsub3 = subscribeSettlements(setSettlements);
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [currentUser]);

  useEffect(() => {
    const SIX_HOURS = 6 * 60 * 60 * 1000;

    function archiveExpired() {
      const cutoff = Date.now() - SIX_HOURS;
      expenses.forEach((e) => {
        if (e.createdAt <= cutoff) {
          archiveExpense(e);
        }
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
      setSpendPopup(t('spendingPopup', { amount: threshold.toString() }));
      setTimeout(() => setSpendPopup(null), 4000);
    }
  }, [expenses, t]);

  const addExpense = useCallback((expense) => {
    addExpenseToDb(expense);
  }, []);

  const submitTrip = useCallback((expenses) => {
    expenses.forEach((e) => addExpenseToDb(e));
    setFormMode('quick');
  }, []);

  const updateExpense = useCallback((updated) => {
    updateExpenseInDb(updated);
    setEditingExpense(null);
  }, []);

  const deleteExpense = useCallback((id) => {
    const expense = expenses.find((e) => e.id === id);
    if (expense) deleteExpenseFromDb(expense);
    setEditingExpense((cur) => (cur?.id === id ? null : cur));
  }, [expenses]);

  const archiveAll = useCallback(() => {
    setEditingExpense(null);
    const balances = computeNetBalances(expenses);
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
  }, [expenses]);

  const startEdit = useCallback((expense) => {
    setEditingExpense(expense);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingExpense(null);
  }, []);

  function handleReset() {
    if (window.confirm(t('confirmReset'))) {
      setEditingExpense(null);
      clearAllExpensesFromDb();
    }
  }

  if (!currentUser) {
    return (
      <div dir={isRTL ? 'rtl' : 'ltr'} className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 text-center dark:bg-gray-900">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm"
        >
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100 dark:bg-primary-900/40">
              <Sparkles size={32} className="text-primary-600 dark:text-primary-400" />
            </div>
          </div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
            {t('appName')}
          </h1>
          <p className="mb-8 text-sm text-gray-500 dark:text-gray-400">
            {t('whoAreYou')}
          </p>
          <div className="space-y-3">
            {USERS.map((user) => (
              <button
                key={user}
                onClick={() => pickIdentity(user)}
                className="flex h-14 w-full items-center justify-center rounded-2xl border border-gray-200 bg-white text-base font-semibold text-gray-900 shadow-sm transition active:scale-[0.97] hover:border-primary-400 hover:bg-primary-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:hover:border-primary-600 dark:hover:bg-primary-900/20"
              >
                {shortName(user)}
              </button>
            ))}
          </div>
          <p className="mt-6 text-[11px] text-gray-400 dark:text-gray-600">
            {t('pickOnce')}
          </p>
          <div className="mt-4 flex justify-center">
            <LanguageToggle />
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="flex min-h-screen flex-col bg-gray-50 text-gray-900 transition-colors dark:bg-gray-900 dark:text-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-gray-200/80 bg-white/80 backdrop-blur-xl dark:border-gray-700/80 dark:bg-gray-900/80">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <img src="/icon.png" alt="" className="h-7 w-7 rounded-lg" />
            <h1 className="text-base font-bold tracking-tight sm:text-lg">
              {t('appName')}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500">
              {shortName(currentUser)}
            </span>
            {expenses.length > 0 && (
              <button
                onClick={handleReset}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-red-200 bg-white px-3 text-xs font-medium text-red-600 transition active:scale-95 hover:bg-red-50 dark:border-red-800 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <RotateCcw size={13} />
                {t('reset')}
              </button>
            )}
            <LanguageToggle />
            <DarkModeToggle dark={dark} onToggle={toggleDark} />
          </div>
        </div>
      </header>

      {/* Spending popup */}
      <AnimatePresence>
        {spendPopup && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed inset-x-0 top-16 z-50 mx-auto w-fit max-w-xs cursor-pointer rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-center text-sm font-bold text-amber-800 shadow-lg dark:border-amber-700 dark:bg-amber-900/80 dark:text-amber-200"
            onClick={() => setSpendPopup(null)}
          >
            😂 {spendPopup}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main */}
      <main className="mx-auto w-full max-w-2xl flex-1 space-y-4 px-3 py-4 pb-20 sm:space-y-6 sm:px-6 sm:py-6">
        {tab === 'dashboard' ? (
          <Dashboard
            currentUser={currentUser}
            expenses={expenses}
            archive={archive}
            settlements={settlements}
          />
        ) : (
          <>
            {/* Mode toggle */}
            {!editingExpense && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormMode('quick')}
                  className={`flex h-10 flex-1 items-center justify-center gap-2 rounded-2xl border text-sm font-medium transition active:scale-[0.97] ${
                    formMode === 'quick'
                      ? 'border-primary-400 bg-primary-50 text-primary-700 shadow-sm dark:border-primary-600 dark:bg-primary-900/30 dark:text-primary-300'
                      : 'border-gray-200 bg-white text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400'
                  }`}
                >
                  ⚡ {t('quickAdd')}
                </button>
                <button
                  type="button"
                  onClick={() => setFormMode('trip')}
                  className={`flex h-10 flex-1 items-center justify-center gap-2 rounded-2xl border text-sm font-medium transition active:scale-[0.97] ${
                    formMode === 'trip'
                      ? 'border-primary-400 bg-primary-50 text-primary-700 shadow-sm dark:border-primary-600 dark:bg-primary-900/30 dark:text-primary-300'
                      : 'border-gray-200 bg-white text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400'
                  }`}
                >
                  🛒 {t('shoppingTrip')}
                </button>
              </div>
            )}

            {formMode === 'quick' || editingExpense ? (
              <ExpenseForm
                onAdd={addExpense}
                onUpdate={updateExpense}
                editingExpense={editingExpense}
                onCancelEdit={cancelEdit}
                currentUser={currentUser}
              />
            ) : (
              <ShoppingTrip onSubmitTrip={submitTrip} currentUser={currentUser} />
            )}
            <Summary expenses={expenses} onArchiveAll={archiveAll} />
            <ExpenseList
              expenses={expenses}
              onDelete={deleteExpense}
              onEdit={startEdit}
            />
            <History archive={archive} />
          </>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200/80 bg-white/90 backdrop-blur-xl dark:border-gray-700/80 dark:bg-gray-900/90">
        <div className="mx-auto flex max-w-2xl">
          <button
            onClick={() => setTab('dashboard')}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition ${
              tab === 'dashboard'
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-gray-400 dark:text-gray-500'
            }`}
          >
            <Home size={20} />
            {t('tabDashboard')}
          </button>
          <button
            onClick={() => setTab('expenses')}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition ${
              tab === 'expenses'
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-gray-400 dark:text-gray-500'
            }`}
          >
            <Receipt size={20} />
            {t('tabExpenses')}
          </button>
        </div>
      </nav>
    </div>
  );
}
