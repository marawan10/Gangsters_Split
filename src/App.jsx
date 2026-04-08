import { useState, useEffect, useCallback, useRef } from 'react';
import { RotateCcw, Sparkles } from 'lucide-react';
import ExpenseForm from './components/ExpenseForm';
import ExpenseList from './components/ExpenseList';
import Summary from './components/Summary';
import DarkModeToggle from './components/DarkModeToggle';
import { loadExpenses, saveExpenses, clearExpenses } from './utils/storage';

function useIntroSound() {
  const audioRef = useRef(null);
  const played = useRef(false);

  useEffect(() => {
    if (played.current) return;

    // Pre-create and load the audio element (required by iOS Safari)
    const audio = new Audio('/sound.mp3');
    audio.preload = 'auto';
    audio.volume = 0.5;
    audio.load();
    audioRef.current = audio;

    function play() {
      if (played.current) return;
      played.current = true;
      audioRef.current?.play().catch(() => {});
      cleanup();
    }

    function cleanup() {
      ['click', 'touchstart', 'keydown'].forEach((evt) =>
        window.removeEventListener(evt, play, true),
      );
    }

    ['click', 'touchstart', 'keydown'].forEach((evt) =>
      window.addEventListener(evt, play, { once: true, capture: true }),
    );

    return cleanup;
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
  useIntroSound();

  useEffect(() => {
    saveExpenses(expenses);
  }, [expenses]);

  const addExpense = useCallback((expense) => {
    setExpenses((prev) => [expense, ...prev]);
  }, []);

  const deleteExpense = useCallback((id) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }, []);

  function handleReset() {
    if (window.confirm('Delete all expenses? This cannot be undone.')) {
      setExpenses([]);
      clearExpenses();
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 transition-colors dark:bg-gray-900 dark:text-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/80 backdrop-blur-lg dark:border-gray-700 dark:bg-gray-900/80">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles size={22} className="text-primary-500" />
            <h1 className="text-lg font-bold tracking-tight">
              Gangsters Split
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {expenses.length > 0 && (
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:border-red-800 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <RotateCcw size={14} />
                Reset
              </button>
            )}
            <DarkModeToggle dark={dark} onToggle={toggleDark} />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        <ExpenseForm onAdd={addExpense} />
        <Summary expenses={expenses} />
        <ExpenseList expenses={expenses} onDelete={deleteExpense} />
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-gray-400 dark:text-gray-600">
        El Maro &middot; El Kemo &middot; El Back
      </footer>
    </div>
  );
}
