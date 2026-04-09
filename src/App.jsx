import { useState, useEffect, useCallback, useRef } from 'react';
import { RotateCcw, Sparkles } from 'lucide-react';
import ExpenseForm from './components/ExpenseForm';
import ExpenseList from './components/ExpenseList';
import Summary from './components/Summary';
import DarkModeToggle from './components/DarkModeToggle';
import { loadExpenses, saveExpenses, clearExpenses } from './utils/storage';

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
  const [expenses, setExpenses] = useState(loadExpenses);
  const [dark, toggleDark] = useDarkMode();
  const [editingExpense, setEditingExpense] = useState(null);
  useIntroSound();

  useEffect(() => {
    saveExpenses(expenses);
  }, [expenses]);

  const addExpense = useCallback((expense) => {
    setExpenses((prev) => [expense, ...prev]);
  }, []);

  const updateExpense = useCallback((updated) => {
    setExpenses((prev) =>
      prev.map((e) => (e.id === updated.id ? updated : e)),
    );
    setEditingExpense(null);
  }, []);

  const deleteExpense = useCallback((id) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    setEditingExpense((cur) => (cur?.id === id ? null : cur));
  }, []);

  const startEdit = useCallback((expense) => {
    setEditingExpense(expense);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingExpense(null);
  }, []);

  function handleReset() {
    if (window.confirm('Delete all expenses? This cannot be undone.')) {
      setExpenses([]);
      setEditingExpense(null);
      clearExpenses();
    }
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
        <ExpenseForm
          onAdd={addExpense}
          onUpdate={updateExpense}
          editingExpense={editingExpense}
          onCancelEdit={cancelEdit}
        />
        <Summary expenses={expenses} />
        <ExpenseList
          expenses={expenses}
          onDelete={deleteExpense}
          onEdit={startEdit}
        />
      </main>

      {/* Footer */}
      <footer className="pb-6 pt-2 text-center text-[11px] text-gray-400 dark:text-gray-600">
        El Maro &middot; El Kemo &middot; El Back
      </footer>
    </div>
  );
}
