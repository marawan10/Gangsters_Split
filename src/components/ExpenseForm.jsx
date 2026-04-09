import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusCircle, Check, X, Info, AlertCircle, Save } from 'lucide-react';
import { USERS } from '../utils/constants';
import { splitEvenly } from '../utils/calculations';

const emptyPaidBy = Object.fromEntries(USERS.map((u) => [u, '']));

export default function ExpenseForm({ onAdd, onUpdate, editingExpense, onCancelEdit }) {
  const [item, setItem] = useState('');
  const [amount, setAmount] = useState('');
  const [participants, setParticipants] = useState([...USERS]);
  const [paidBy, setPaidBy] = useState({ ...emptyPaidBy });
  const [errors, setErrors] = useState([]);
  const formRef = useRef(null);

  const isEditing = !!editingExpense;

  useEffect(() => {
    if (editingExpense) {
      setItem(editingExpense.item);
      setAmount(String(editingExpense.amount));
      setParticipants([...editingExpense.participants]);
      const pb = { ...emptyPaidBy };
      USERS.forEach((u) => {
        if (editingExpense.paidBy[u]) pb[u] = String(editingExpense.paidBy[u]);
      });
      setPaidBy(pb);
      setErrors([]);
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [editingExpense]);

  function resetForm() {
    setItem('');
    setAmount('');
    setParticipants([...USERS]);
    setPaidBy({ ...emptyPaidBy });
    setErrors([]);
  }

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

  // Build split preview data
  const showPreview = totalAmount > 0 && participants.length > 0 && totalPaid > 0;
  const previewShares = showPreview ? splitEvenly(totalAmount, participants.length) : [];
  const previewData = showPreview
    ? USERS.map((u) => {
        const idx = participants.indexOf(u);
        const share = idx >= 0 ? previewShares[idx] : 0;
        const paid = parseFloat(paidBy[u]) || 0;
        return { user: u, share, paid, net: Math.round((paid - share) * 100) / 100 };
      })
    : [];

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

    if (isEditing) {
      onUpdate({
        ...editingExpense,
        item: item.trim(),
        amount: totalAmount,
        participants: [...participants],
        paidBy: paidByNumeric,
        totalPaid,
      });
    } else {
      onAdd({
        id: crypto.randomUUID(),
        item: item.trim(),
        amount: totalAmount,
        participants: [...participants],
        paidBy: paidByNumeric,
        totalPaid,
        createdAt: Date.now(),
      });
    }

    resetForm();
  }

  function handleCancel() {
    resetForm();
    onCancelEdit();
  }

  return (
    <motion.form
      ref={formRef}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className={`rounded-2xl border p-6 shadow-sm ${
        isEditing
          ? 'border-primary-300 bg-primary-50/30 dark:border-primary-700 dark:bg-primary-900/10'
          : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
      }`}
    >
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {isEditing ? 'Edit Expense' : 'Add Expense'}
        </h2>
        {isEditing && (
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-lg px-3 py-1 text-xs font-medium text-gray-500 transition hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
        )}
      </div>

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
              {participants.map((p) => p.replace('El ', '')).join(', ')}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Who paid */}
      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Who paid?
        </label>
        <p className="mb-2 text-xs text-gray-400 dark:text-gray-500">
          Enter how much each person paid. Multiple payers allowed.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {USERS.map((user) => (
            <div key={user} className="flex items-center gap-2">
              <span className="w-16 text-sm font-medium text-gray-600 dark:text-gray-400">
                {user.replace('El ', '')}
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
                participating — treated as a loan.
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Paid vs total mismatch */}
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
                  Paid ({totalPaid.toFixed(2)}) ≠ amount (
                  {totalAmount.toFixed(2)}). Split is based on the amount.
                </span>
              </motion.div>
            )}
        </AnimatePresence>
      </div>

      {/* Split preview before submit */}
      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-700/50"
          >
            <p className="mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
              Preview
            </p>
            <div className="grid grid-cols-4 gap-1 text-[11px] font-medium text-gray-400 dark:text-gray-500">
              <span>Who</span>
              <span className="text-right">Share</span>
              <span className="text-right">Paid</span>
              <span className="text-right">Net</span>
            </div>
            {previewData.map((d) => (
              <div
                key={d.user}
                className="grid grid-cols-4 gap-1 text-xs"
              >
                <span className="font-medium text-gray-600 dark:text-gray-300">
                  {d.user.replace('El ', '')}
                </span>
                <span className="text-right text-gray-500 dark:text-gray-400">
                  {d.share.toFixed(2)}
                </span>
                <span className="text-right text-gray-500 dark:text-gray-400">
                  {d.paid.toFixed(2)}
                </span>
                <span
                  className={`text-right font-semibold ${
                    d.net > 0.005
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : d.net < -0.005
                        ? 'text-red-500 dark:text-red-400'
                        : 'text-gray-400'
                  }`}
                >
                  {d.net > 0 ? '+' : ''}
                  {d.net.toFixed(2)}
                </span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="submit"
        className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition focus:outline-none focus:ring-4 ${
          isEditing
            ? 'bg-amber-500 hover:bg-amber-600 focus:ring-amber-200 dark:focus:ring-amber-800'
            : 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-200 dark:focus:ring-primary-800'
        }`}
      >
        {isEditing ? (
          <>
            <Save size={18} /> Save Changes
          </>
        ) : (
          <>
            <PlusCircle size={18} /> Add Expense
          </>
        )}
      </button>
    </motion.form>
  );
}
