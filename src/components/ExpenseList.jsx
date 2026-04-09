import { AnimatePresence, motion } from 'framer-motion';
import { Trash2, ChevronDown, ChevronUp, Pencil, Clock } from 'lucide-react';
import { useState } from 'react';
import { computeExpenseBreakdown } from '../utils/calculations';
import { USERS } from '../utils/constants';
import { formatDate } from '../utils/date';

export default function ExpenseList({ expenses, onDelete, onEdit }) {
  if (expenses.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center text-gray-400 dark:border-gray-600 dark:text-gray-500">
        No expenses yet. Add one above!
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400">
        Expenses ({expenses.length})
      </h2>
      <AnimatePresence mode="popLayout">
        {expenses.map((expense) => (
          <ExpenseCard
            key={expense.id}
            expense={expense}
            onDelete={onDelete}
            onEdit={onEdit}
          />
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
  const payerSummary = payers
    .map((u) => `${shortName(u)} ${expense.paidBy[u].toFixed(0)}`)
    .join(', ');

  function handleDelete() {
    if (confirmDelete) {
      onDelete(expense.id);
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, y: -10 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
    >
      {/* Main row */}
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold text-gray-900 dark:text-white">
              {expense.item}
            </h3>
            <span className="shrink-0 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-700 dark:bg-gray-700 dark:text-gray-200">
              {expense.amount.toFixed(2)}
            </span>
          </div>

          {/* At-a-glance: who paid */}
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Paid by {payerSummary}
          </p>

          {/* Participants pills */}
          <div className="mt-1.5 flex flex-wrap gap-1">
            {USERS.map((u) => {
              const isIn = expense.participants.includes(u);
              return (
                <span
                  key={u}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    isIn
                      ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300'
                      : 'bg-gray-50 text-gray-300 line-through dark:bg-gray-700/50 dark:text-gray-600'
                  }`}
                >
                  {shortName(u)}
                </span>
              );
            })}
          </div>

          {/* Date */}
          <p className="mt-1.5 flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500">
            <Clock size={10} />
            {formatDate(expense.createdAt)}
          </p>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            onClick={() => setOpen((o) => !o)}
            className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            aria-label="Toggle details"
          >
            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <button
            onClick={() => onEdit(expense)}
            className="rounded-lg p-2 text-gray-400 transition hover:bg-primary-50 hover:text-primary-500 dark:hover:bg-primary-900/20 dark:hover:text-primary-400"
            aria-label="Edit expense"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={handleDelete}
            className={`rounded-lg px-2 py-2 text-sm font-medium transition ${
              confirmDelete
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400'
            }`}
            aria-label={confirmDelete ? 'Confirm delete' : 'Delete expense'}
          >
            {confirmDelete ? (
              <span className="flex items-center gap-1 text-xs">
                <Trash2 size={14} /> Sure?
              </span>
            ) : (
              <Trash2 size={16} />
            )}
          </button>
        </div>
      </div>

      {/* Expandable breakdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-gray-100 px-4 pb-4 pt-3 dark:border-gray-700">
              <div className="grid grid-cols-4 gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                <span>Person</span>
                <span className="text-right">Share</span>
                <span className="text-right">Paid</span>
                <span className="text-right">Net</span>
              </div>
              {USERS.map((user) => {
                const b = breakdown[user];
                return (
                  <div
                    key={user}
                    className="mt-1.5 grid grid-cols-4 gap-2 text-sm"
                  >
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {shortName(user)}
                    </span>
                    <span className="text-right text-gray-600 dark:text-gray-400">
                      {b.share.toFixed(2)}
                    </span>
                    <span className="text-right text-gray-600 dark:text-gray-400">
                      {b.paid.toFixed(2)}
                    </span>
                    <span
                      className={`text-right font-semibold ${
                        b.net > 0.005
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : b.net < -0.005
                            ? 'text-red-500 dark:text-red-400'
                            : 'text-gray-400'
                      }`}
                    >
                      {b.net > 0 ? '+' : ''}
                      {b.net.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function shortName(name) {
  return name.replace('El ', '');
}
