import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusCircle, Check, X, Info, AlertCircle } from 'lucide-react';
import { USERS } from '../utils/constants';

const emptyPaidBy = Object.fromEntries(USERS.map((u) => [u, '']));

export default function ExpenseForm({ onAdd }) {
  const [item, setItem] = useState('');
  const [amount, setAmount] = useState('');
  const [participants, setParticipants] = useState([...USERS]);
  const [paidBy, setPaidBy] = useState({ ...emptyPaidBy });
  const [errors, setErrors] = useState([]);

  function toggleParticipant(user) {
    setParticipants((prev) =>
      prev.includes(user) ? prev.filter((u) => u !== user) : [...prev, user],
    );
  }

  function handlePaidChange(user, value) {
    setPaidBy((prev) => ({ ...prev, [user]: value }));
  }

  const totalAmount = parseFloat(amount) || 0;
  const shareEach =
    participants.length > 0 ? totalAmount / participants.length : 0;

  const paidEntries = USERS.map((u) => ({
    user: u,
    amount: parseFloat(paidBy[u]) || 0,
  })).filter((e) => e.amount > 0);
  const totalPaid = paidEntries.reduce((s, e) => s + e.amount, 0);

  const nonParticipantPayers = paidEntries.filter(
    (e) => !participants.includes(e.user),
  );

  function validate() {
    const errs = [];
    if (!item.trim()) errs.push('Enter an item name.');
    if (totalAmount <= 0) errs.push('Enter a total amount greater than 0.');
    if (participants.length === 0)
      errs.push('Select at least one participant.');
    if (totalPaid === 0) errs.push('Enter who paid (at least one person).');
    return errs;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    setErrors([]);

    const paidByNumeric = {};
    USERS.forEach((u) => {
      const v = parseFloat(paidBy[u]);
      if (v > 0) paidByNumeric[u] = v;
    });

    onAdd({
      id: crypto.randomUUID(),
      item: item.trim(),
      amount: totalAmount,
      participants: [...participants],
      paidBy: paidByNumeric,
      totalPaid,
      createdAt: Date.now(),
    });

    setItem('');
    setAmount('');
    setParticipants([...USERS]);
    setPaidBy({ ...emptyPaidBy });
    setErrors([]);
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
    >
      <h2 className="mb-5 text-lg font-semibold text-gray-900 dark:text-white">
        Add Expense
      </h2>

      {/* Validation errors */}
      <AnimatePresence>
        {errors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 overflow-hidden rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20"
          >
            {errors.map((err, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400"
              >
                <AlertCircle size={14} className="shrink-0" />
                {err}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Item name
          </label>
          <input
            type="text"
            value={item}
            onChange={(e) => setItem(e.target.value)}
            placeholder="e.g. Dinner, Uber, Groceries"
            className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:ring-primary-800"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Total amount
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:ring-primary-800"
          />
        </div>
      </div>

      {/* Participants */}
      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Who used / benefited from this?
        </label>
        <p className="mb-2 text-xs text-gray-400 dark:text-gray-500">
          Tap to include or exclude. Cost is split equally among selected
          people.
        </p>
        <div className="flex flex-wrap gap-2">
          {USERS.map((user) => {
            const active = participants.includes(user);
            return (
              <button
                key={user}
                type="button"
                onClick={() => toggleParticipant(user)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                  active
                    ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                    : 'border-gray-300 bg-gray-100 text-gray-400 line-through hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-500 dark:hover:bg-gray-600'
                }`}
              >
                {active ? (
                  <Check size={14} className="text-primary-500" />
                ) : (
                  <X size={14} className="text-gray-400" />
                )}
                {user}
              </button>
            );
          })}
        </div>

        {/* Live split preview */}
        <AnimatePresence>
          {totalAmount > 0 && participants.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 overflow-hidden rounded-lg bg-primary-50 px-3 py-2 text-xs text-primary-700 dark:bg-primary-900/20 dark:text-primary-300"
            >
              Split {totalAmount.toFixed(2)} ÷ {participants.length} ={' '}
              <span className="font-bold">{shareEach.toFixed(2)} each</span>
              {' → '}
              {participants.join(', ')}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Who paid */}
      <div className="mb-5">
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Who paid?
        </label>
        <p className="mb-2 text-xs text-gray-400 dark:text-gray-500">
          Enter how much each person paid. Multiple payers allowed.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {USERS.map((user) => (
            <div key={user} className="flex items-center gap-2">
              <span className="w-14 text-sm font-medium text-gray-600 dark:text-gray-400">
                {user}
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={paidBy[user]}
                onChange={(e) => handlePaidChange(user, e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:ring-primary-800"
              />
            </div>
          ))}
        </div>

        {/* Non-participant payer warning */}
        <AnimatePresence>
          {nonParticipantPayers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 flex items-start gap-2 overflow-hidden rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
            >
              <Info size={14} className="mt-0.5 shrink-0" />
              <span>
                {nonParticipantPayers.map((e) => e.user).join(', ')} paid but{' '}
                {nonParticipantPayers.length === 1 ? "isn't" : "aren't"}{' '}
                participating — this is treated as a loan that participants owe
                back.
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Paid vs total mismatch info */}
        <AnimatePresence>
          {totalPaid > 0 &&
            totalAmount > 0 &&
            Math.abs(totalPaid - totalAmount) > 0.01 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 flex items-start gap-2 overflow-hidden rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
              >
                <Info size={14} className="mt-0.5 shrink-0" />
                <span>
                  Total paid ({totalPaid.toFixed(2)}) ≠ expense amount (
                  {totalAmount.toFixed(2)}). The split is based on the expense
                  amount; the difference will show in net balances.
                </span>
              </motion.div>
            )}
        </AnimatePresence>
      </div>

      <button
        type="submit"
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-200 dark:focus:ring-primary-800"
      >
        <PlusCircle size={18} />
        Add Expense
      </button>
    </motion.form>
  );
}
