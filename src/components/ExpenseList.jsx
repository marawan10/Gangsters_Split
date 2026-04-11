import { AnimatePresence, motion } from 'framer-motion';
import { Trash2, ChevronDown, ChevronUp, Pencil, Clock } from 'lucide-react';
import { useState } from 'react';
import { computeExpenseBreakdown } from '../utils/calculations';
import { USERS, CATEGORIES } from '../utils/constants';
import { formatDateLocalized } from '../utils/date';
import { useLanguage } from '../utils/i18n';

export default function ExpenseList({ expenses, onDelete, onEdit }) {
  const { t, shortName } = useLanguage();
  if (expenses.length === 0) return null;

  return (
    <section>
      <h2 className="mb-2.5 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-200 text-[10px] font-bold text-gray-500 dark:bg-gray-700 dark:text-gray-400">{expenses.length}</span>
        {t('activeExpenses')}
      </h2>
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {expenses.map((expense) => (
            <ExpenseCard key={expense.id} expense={expense} onDelete={onDelete} onEdit={onEdit} />
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}

function ExpenseCard({ expense, onDelete, onEdit }) {
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const breakdown = computeExpenseBreakdown(expense);
  const { t, lang } = useLanguage();

  const payers = USERS.filter((u) => (expense.paidBy[u] || 0) > 0);
  const payerSummary = payers.map((u) => `${shortName(u)} ${expense.paidBy[u].toFixed(0)}`).join(' · ');

  function handleDelete() {
    if (confirmDelete) { onDelete(expense.id); }
    else { setConfirmDelete(true); setTimeout(() => setConfirmDelete(false), 3000); }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, y: -8 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
    >
      {/* Top section: tappable to expand */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition active:bg-gray-50 sm:px-4 dark:active:bg-gray-700/50"
      >
        {/* Left: category emoji badge */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-lg dark:bg-gray-700">
          {CATEGORIES.find((c) => c.id === expense.category)?.emoji ?? '📦'}
        </div>

        {/* Middle: info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-white">
              {expense.item}
            </h3>
            <span className="shrink-0 text-sm font-bold tabular-nums text-gray-900 dark:text-white">
              {expense.amount >= 1000 ? `${(expense.amount / 1000).toFixed(1)}k` : expense.amount.toFixed(0)}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[11px] text-gray-500 dark:text-gray-400">{payerSummary}</span>
            <span className="text-gray-300 dark:text-gray-600">·</span>
            <div className="flex gap-0.5">
              {USERS.map((u) => {
                const isIn = expense.participants.includes(u);
                return (
                  <span key={u} className={`inline-flex h-4 items-center rounded px-1 text-[9px] font-bold leading-none ${isIn ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300' : 'bg-gray-100 text-gray-300 dark:bg-gray-700 dark:text-gray-600'}`}>
                    {shortName(u).charAt(0)}
                  </span>
                );
              })}
            </div>
            {expense.addedBy && (
              <>
                <span className="text-gray-300 dark:text-gray-600">·</span>
                <span className="text-[10px] text-gray-400 dark:text-gray-500">
                  {t('by')} {shortName(expense.addedBy)}
                </span>
              </>
            )}
            <span className="text-gray-300 dark:text-gray-600">·</span>
            <span className="flex items-center gap-0.5 text-[10px] text-gray-400 dark:text-gray-500">
              <Clock size={8} />{formatDateLocalized(expense.createdAt, t)}
            </span>
          </div>
        </div>

        {/* Right: chevron */}
        <div className="text-gray-300 dark:text-gray-600">
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Expanded breakdown */}
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="border-t border-gray-100 px-3.5 pb-3 pt-3 sm:px-4 dark:border-gray-700">
              {/* Breakdown — card per person */}
              <div className="mb-3 flex gap-1.5">
                {USERS.map((user) => {
                  const b = breakdown[user];
                  return (
                    <div key={user} className={`flex-1 rounded-xl p-2 text-center ${b.net > 0.005 ? 'bg-emerald-50 dark:bg-emerald-900/20' : b.net < -0.005 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-gray-700/50'}`}>
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400">{shortName(user)}</p>
                      <p className={`text-sm font-bold ${b.net > 0.005 ? 'text-emerald-600 dark:text-emerald-400' : b.net < -0.005 ? 'text-red-500 dark:text-red-400' : 'text-gray-400'}`}>
                        {b.net > 0 ? '+' : ''}{b.net.toFixed(2)}
                      </p>
                      <p className="text-[9px] text-gray-400 dark:text-gray-500">{b.share > 0 ? `${t('owes')} ${b.share.toFixed(0)}` : '—'}</p>
                    </div>
                  );
                })}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button onClick={() => onEdit(expense)} className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white text-xs font-medium text-gray-600 transition active:scale-95 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">
                  <Pencil size={12} /> {t('edit')}
                </button>
                <button onClick={handleDelete} className={`flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl text-xs font-medium transition active:scale-95 ${confirmDelete ? 'bg-red-500 text-white' : 'border border-red-200 bg-white text-red-500 hover:bg-red-50 dark:border-red-800 dark:bg-gray-700 dark:text-red-400 dark:hover:bg-red-900/20'}`}>
                  <Trash2 size={12} /> {confirmDelete ? t('confirm') : t('delete')}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
