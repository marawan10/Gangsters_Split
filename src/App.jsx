import { useState, useEffect, useCallback, useRef } from 'react';
import { RotateCcw, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import ExpenseForm from './components/ExpenseForm';
import ShoppingTrip from './components/ShoppingTrip';
import ExpenseList from './components/ExpenseList';
import Summary from './components/Summary';
import History from './components/History';
import DarkModeToggle from './components/DarkModeToggle';
import { USERS } from './utils/constants';
import {
  subscribeExpenses,
  subscribeArchive,
  addExpenseToDb,
  updateExpenseInDb,
  deleteExpenseFromDb,
  archiveExpense,
  clearAllExpensesFromDb,
} from './utils/firebase';

const IDENTITY_KEY = 'gangsters-identity';
const SHORT = (n) => n.replace('El ', '');

function useIntroSound() {
  const played = useRef(false);

  useEffect(() => {
    if (played.current) return;

    const audio = document.createElement('audio');
    audio.src = '/sound.mp3';
    audio.preload = 'auto';
    audio.playsInline = true;
    audio.setAttribute('playsinline', '');
    audio.style.display = 'none';
    document.body.appendChild(audio);

    const events = ['touchend', 'click', 'keydown'];

    function play() {
      if (played.current) return;
      played.current = true;
      audio.play().catch(() => {});
      cleanup();
    }

    function cleanup() {
      events.forEach((evt) =>
        window.removeEventListener(evt, play, true),
      );
    }

    events.forEach((evt) =>
      window.addEventListener(evt, play, { once: true, capture: true }),
    );

    return () => {
      cleanup();
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
  const [dark, toggleDark] = useDarkMode();
  const [editingExpense, setEditingExpense] = useState(null);
  const [formMode, setFormMode] = useState('quick');
  useIntroSound();

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
          const title = 'Gangsters Split';
          const body = `${SHORT(newest.addedBy)} added ${newest.item} — ${newest.amount.toFixed(0)}`;
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body, icon: '/icon.png' });
          }
        }
      }
      prevExpenseCount.current = list.length;
      setExpenses(list);
    });
    const unsub2 = subscribeArchive(setArchive);
    return () => { unsub1(); unsub2(); };
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
    expenses.forEach((e) => archiveExpense(e));
  }, [expenses]);

  const startEdit = useCallback((expense) => {
    setEditingExpense(expense);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingExpense(null);
  }, []);

  function handleReset() {
    if (window.confirm('Delete all expenses? This cannot be undone.')) {
      setEditingExpense(null);
      clearAllExpensesFromDb();
    }
  }

  if (!currentUser) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 text-center dark:bg-gray-900">
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
            Gangsters Split
          </h1>
          <p className="mb-8 text-sm text-gray-500 dark:text-gray-400">
            Who are you?
          </p>
          <div className="space-y-3">
            {USERS.map((user) => (
              <button
                key={user}
                onClick={() => pickIdentity(user)}
                className="flex h-14 w-full items-center justify-center rounded-2xl border border-gray-200 bg-white text-base font-semibold text-gray-900 shadow-sm transition active:scale-[0.97] hover:border-primary-400 hover:bg-primary-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:hover:border-primary-600 dark:hover:bg-primary-900/20"
              >
                {user}
              </button>
            ))}
          </div>
          <p className="mt-6 text-[11px] text-gray-400 dark:text-gray-600">
            You only pick this once
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 text-gray-900 transition-colors dark:bg-gray-900 dark:text-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-gray-200/80 bg-white/80 backdrop-blur-xl dark:border-gray-700/80 dark:bg-gray-900/80">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900/40">
              <Sparkles size={18} className="text-primary-600 dark:text-primary-400" />
            </div>
            <h1 className="text-base font-bold tracking-tight sm:text-lg">
              Gangsters Split
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500">
              {SHORT(currentUser)}
            </span>
            {expenses.length > 0 && (
              <button
                onClick={handleReset}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-red-200 bg-white px-3 text-xs font-medium text-red-600 transition active:scale-95 hover:bg-red-50 dark:border-red-800 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <RotateCcw size={13} />
                Reset
              </button>
            )}
            <DarkModeToggle dark={dark} onToggle={toggleDark} />
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto w-full max-w-2xl flex-1 space-y-4 px-3 py-4 sm:space-y-6 sm:px-6 sm:py-6">
        {/* Mode toggle */}
        {!editingExpense && (
          <div className="flex rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
            <button
              type="button"
              onClick={() => setFormMode('quick')}
              className={`flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg text-xs font-medium transition ${
                formMode === 'quick'
                  ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              Quick Add
            </button>
            <button
              type="button"
              onClick={() => setFormMode('trip')}
              className={`flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg text-xs font-medium transition ${
                formMode === 'trip'
                  ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              🛒 Shopping Trip
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
      </main>

      {/* Footer */}
      <footer className="pb-6 pt-2 text-center text-[11px] text-gray-400 dark:text-gray-600">
        El Maro &middot; El Kemo &middot; El Back
      </footer>
    </div>
  );
}
