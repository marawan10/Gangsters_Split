import { AnimatePresence, motion } from 'framer-motion';
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { computeExpenseBreakdown } from '../utils/calculations';
import { USERS } from '../utils/constants';

export default function ExpenseList({ expenses, onDelete }) {
  if (expenses.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center text-gray-400 dark:border-gray-600 dark:text-gray-500">
        No expenses yet. Add one above!
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence mode="popLayout">
        {expenses.map((expense) => (
          <ExpenseCard
            key={expense.id}
            expense={expense}
            onDelete={onDelete}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ExpenseCard({ expense, onDelete }) {
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const breakdown = computeExpenseBreakdown(expense);

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
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-gray-900 dark:text-white">
            {expense.item}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Total:{' '}
            <span className="font-medium text-gray-700 dark:text-gray-200">
              {expense.amount.toFixed(2)}
            </span>
            {Math.abs(expense.totalPaid - expense.amount) > 0.01 && (
              <span className="ml-2 text-amber-600 dark:text-amber-400">
                (paid: {expense.totalPaid.toFixed(2)})
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setOpen((o) => !o)}
            className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            aria-label="Toggle details"
          >
            {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
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
              <Trash2 size={18} />
            )}
          </button>
        </div>
      </div>

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
                      {user}
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
