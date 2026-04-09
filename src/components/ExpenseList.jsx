import { AnimatePresence, motion } from 'framer-motion';
import { Trash2, ChevronDown, ChevronUp, Pencil, Clock } from 'lucide-react';
import { useState } from 'react';
import { computeExpenseBreakdown } from '../utils/calculations';
import { USERS, CATEGORIES } from '../utils/constants';
import { formatDate } from '../utils/date';

const SHORT = (n) => n.replace('El ', '');

export default function ExpenseList({ expenses, onDelete, onEdit }) {
  if (expenses.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 px-6 py-12 text-center dark:border-gray-600">
        <p className="text-sm text-gray-400 dark:text-gray-500">No expenses yet</p>
        <p className="mt-1 text-xs text-gray-300 dark:text-gray-600">Add one above to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
        Expenses ({expenses.length})
      </h2>
      <AnimatePresence mode="popLayout">
        {expenses.map((expense) => (
          <ExpenseCard key={expense.id} expense={expense} onDelete={onDelete} onEdit={onEdit} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ExpenseCard({ expense, onDelete, onEdit }) {
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const breakdown = computeExpenseBreakdown(expense);

  const payers = USERS.filter((u) => (expense.paidBy[u] || 0) > 0);
  const payerSummary = payers.map((u) => `${SHORT(u)} ${expense.paidBy[u].toFixed(0)}`).join(' · ');

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
        className="flex w-full items-start gap-3 p-3.5 text-left transition active:bg-gray-50 sm:p-4 dark:active:bg-gray-700/50"
      >
        {/* Left: category emoji badge */}
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-700">
          <span className="text-xl leading-none">
            {CATEGORIES.find((c) => c.id === expense.category)?.emoji ?? '📦'}
          </span>
        </div>

        {/* Middle: info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-white">
              {expense.item}
            </h3>
            <span className="shrink-0 text-xs font-bold text-gray-500 dark:text-gray-400">
              {expense.amount >= 1000 ? `${(expense.amount / 1000).toFixed(1)}k` : expense.amount.toFixed(0)}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {payerSummary}
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex gap-1">
              {USERS.map((u) => {
                const isIn = expense.participants.includes(u);
                return (
                  <span key={u} className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold leading-none ${isIn ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300' : 'bg-gray-100 text-gray-300 dark:bg-gray-700 dark:text-gray-600'}`}>
                    {SHORT(u).charAt(0)}
                  </span>
                );
              })}
            </div>
            {expense.addedBy && (
              <span className="text-[10px] font-medium text-primary-500 dark:text-primary-400">
                {SHORT(expense.addedBy)}
              </span>
            )}
            <span className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500">
              <Clock size={9} />{formatDate(expense.createdAt)}
            </span>
          </div>
        </div>

        {/* Right: chevron */}
        <div className="pt-1 text-gray-300 dark:text-gray-600">
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Expanded breakdown */}
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="border-t border-gray-100 px-3.5 pb-3 pt-3 sm:px-4 dark:border-gray-700">
              {/* Breakdown table */}
              <div className="mb-3 rounded-xl bg-gray-50 p-2.5 dark:bg-gray-700/40">
                <div className="grid grid-cols-4 gap-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  <span>Who</span>
                  <span className="text-right">Share</span>
                  <span className="text-right">Paid</span>
                  <span className="text-right">Net</span>
                </div>
                {USERS.map((user) => {
                  const b = breakdown[user];
                  return (
                    <div key={user} className="mt-1 grid grid-cols-4 gap-1 text-xs">
                      <span className="font-medium text-gray-700 dark:text-gray-300">{SHORT(user)}</span>
                      <span className="text-right text-gray-500 dark:text-gray-400">{b.share.toFixed(2)}</span>
                      <span className="text-right text-gray-500 dark:text-gray-400">{b.paid.toFixed(2)}</span>
                      <span className={`text-right font-bold ${b.net > 0.005 ? 'text-emerald-600 dark:text-emerald-400' : b.net < -0.005 ? 'text-red-500 dark:text-red-400' : 'text-gray-400'}`}>
                        {b.net > 0 ? '+' : ''}{b.net.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button onClick={() => onEdit(expense)} className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white text-xs font-medium text-gray-600 transition active:scale-95 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">
                  <Pencil size={13} /> Edit
                </button>
                <button onClick={handleDelete} className={`flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl text-xs font-medium transition active:scale-95 ${confirmDelete ? 'bg-red-500 text-white' : 'border border-red-200 bg-white text-red-500 hover:bg-red-50 dark:border-red-800 dark:bg-gray-700 dark:text-red-400 dark:hover:bg-red-900/20'}`}>
                  <Trash2 size={13} /> {confirmDelete ? 'Tap to confirm' : 'Delete'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
