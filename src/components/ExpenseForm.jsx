import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusCircle, Check, X, Info, AlertCircle, Save } from 'lucide-react';
import { USERS, CATEGORIES } from '../utils/constants';
import { splitEvenly } from '../utils/calculations';

const SHORT = (n) => n.replace('El ', '');
const emptyPaidBy = Object.fromEntries(USERS.map((u) => [u, '']));

export default function ExpenseForm({ onAdd, onUpdate, editingExpense, onCancelEdit, currentUser }) {
  const [category, setCategory] = useState(null);
  const [item, setItem] = useState('');
  const [amount, setAmount] = useState('');
  const [participants, setParticipants] = useState([...USERS]);
  const [paidBy, setPaidBy] = useState({ ...emptyPaidBy });
  const [errors, setErrors] = useState([]);
  const formRef = useRef(null);

  const isEditing = !!editingExpense;
  const isOthers = category?.id === 'others';

  useEffect(() => {
    if (editingExpense) {
      const match = CATEGORIES.find((c) => c.label === editingExpense.item || c.id === editingExpense.category);
      setCategory(match || CATEGORIES.find((c) => c.id === 'others'));
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
    setCategory(null);
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
    if (!category) errs.push('Select a category.');
    if (isOthers && !item.trim()) errs.push('Enter an item name.');
    if (totalAmount <= 0) errs.push('Enter an amount greater than 0.');
    if (participants.length === 0) errs.push('Select at least one participant.');
    if (totalPaid === 0) errs.push('Enter who paid.');
    return errs;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (errs.length > 0) { setErrors(errs); return; }
    setErrors([]);

    const finalItem = isOthers ? item.trim() : category.label;
    const paidByNumeric = {};
    USERS.forEach((u) => {
      const v = parseFloat(paidBy[u]);
      if (v > 0) paidByNumeric[u] = v;
    });

    const base = {
      item: finalItem,
      category: category.id,
      amount: totalAmount,
      participants: [...participants],
      paidBy: paidByNumeric,
      totalPaid,
    };

    if (isEditing) {
      onUpdate({ ...editingExpense, ...base });
    } else {
      onAdd({ id: crypto.randomUUID(), ...base, addedBy: currentUser, createdAt: Date.now() });
    }
    resetForm();
  }

  function handleCancel() { resetForm(); onCancelEdit(); }

  const inputCls = 'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-500 dark:focus:ring-primary-800';

  return (
    <motion.form
      ref={formRef}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className={`rounded-2xl border p-4 shadow-sm sm:p-6 ${
        isEditing
          ? 'border-primary-300 bg-primary-50/30 dark:border-primary-700 dark:bg-primary-900/10'
          : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
      }`}
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
          {isEditing ? 'Edit Expense' : 'Add Expense'}
        </h2>
        {isEditing && (
          <button type="button" onClick={handleCancel} className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 transition active:scale-95 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700">
            Cancel
          </button>
        )}
      </div>

      {/* Errors */}
      <AnimatePresence>
        {errors.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-4 overflow-hidden rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
            {errors.map((err, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
                <AlertCircle size={13} className="shrink-0" />{err}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category selector */}
      <div className="mb-4">
        <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Category</label>
        <div className="grid grid-cols-5 gap-1.5">
          {CATEGORIES.map((cat) => {
            const active = category?.id === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => { setCategory(cat); if (cat.id !== 'others') setItem(''); }}
                className={`flex flex-col items-center gap-0.5 rounded-xl border px-1 py-2 text-center transition active:scale-95 ${
                  active
                    ? 'border-primary-400 bg-primary-50 dark:border-primary-600 dark:bg-primary-900/30'
                    : 'border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-700'
                }`}
              >
                <span className="text-lg leading-none">{cat.emoji}</span>
                <span className={`text-[10px] font-medium leading-tight ${active ? 'text-primary-700 dark:text-primary-300' : 'text-gray-500 dark:text-gray-400'}`}>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Item name — only for "Others" */}
      <AnimatePresence>
        {isOthers && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-4 overflow-hidden">
            <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Item name</label>
            <input type="text" value={item} onChange={(e) => setItem(e.target.value)} placeholder="e.g. Dinner, Uber, Groceries" className={inputCls} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Amount */}
      <div className="mb-4">
        <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Total amount</label>
        <input type="number" min="0" step="0.01" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className={inputCls} />
      </div>

      {/* Participants */}
      <div className="mb-4">
        <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
          Who's included?
        </label>
        <div className="flex gap-2">
          {USERS.map((user) => {
            const active = participants.includes(user);
            return (
              <button
                key={user}
                type="button"
                onClick={() => toggleParticipant(user)}
                className={`flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border text-sm font-medium transition active:scale-95 ${
                  active
                    ? 'border-primary-400 bg-primary-50 text-primary-700 dark:border-primary-600 dark:bg-primary-900/30 dark:text-primary-300'
                    : 'border-gray-200 bg-gray-50 text-gray-400 line-through dark:border-gray-600 dark:bg-gray-700 dark:text-gray-500'
                }`}
              >
                {active ? <Check size={14} /> : <X size={14} />}
                {SHORT(user)}
              </button>
            );
          })}
        </div>

        <AnimatePresence>
          {totalAmount > 0 && participants.length > 0 && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-2 text-center text-xs text-primary-600 dark:text-primary-400">
              {totalAmount.toFixed(2)} ÷ {participants.length} = <span className="font-bold">{shareEach.toFixed(2)} each</span>
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Who paid */}
      <div className="mb-4">
        <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Who paid?</label>
        <div className="space-y-2">
          {USERS.map((user) => (
            <div key={user} className="flex items-center gap-3">
              <span className="w-14 text-right text-sm font-medium text-gray-600 dark:text-gray-400">{SHORT(user)}</span>
              <input type="number" min="0" step="0.01" inputMode="decimal" value={paidBy[user]} onChange={(e) => handlePaidChange(user, e.target.value)} placeholder="0" className={inputCls} />
            </div>
          ))}
        </div>

        {/* Warnings */}
        <AnimatePresence>
          {nonParticipantPayers.length > 0 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-2.5 flex items-start gap-2 overflow-hidden rounded-xl bg-amber-50 p-2.5 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
              <Info size={13} className="mt-0.5 shrink-0" />
              <span>{nonParticipantPayers.map((e) => SHORT(e.user)).join(', ')} paid but {nonParticipantPayers.length === 1 ? "isn't" : "aren't"} included — treated as a loan.</span>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {totalPaid > 0 && totalAmount > 0 && Math.abs(totalPaid - totalAmount) > 0.01 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-2.5 flex items-start gap-2 overflow-hidden rounded-xl bg-blue-50 p-2.5 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
              <Info size={13} className="mt-0.5 shrink-0" />
              <span>Paid ({totalPaid.toFixed(2)}) ≠ amount ({totalAmount.toFixed(2)}).</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Preview */}
      <AnimatePresence>
        {showPreview && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-4 overflow-hidden rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-700/40">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Preview</p>
            <div className="space-y-1">
              {previewData.map((d) => (
                <div key={d.user} className="flex items-center justify-between text-xs">
                  <span className="font-medium text-gray-600 dark:text-gray-300">{SHORT(d.user)}</span>
                  <div className="flex items-center gap-4">
                    <span className="w-14 text-right text-gray-400">owes {d.share.toFixed(2)}</span>
                    <span className={`w-16 text-right font-semibold ${d.net > 0.005 ? 'text-emerald-600 dark:text-emerald-400' : d.net < -0.005 ? 'text-red-500 dark:text-red-400' : 'text-gray-400'}`}>
                      {d.net > 0 ? '+' : ''}{d.net.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit */}
      <button type="submit" className={`inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white shadow-sm transition active:scale-[0.98] focus:outline-none focus:ring-4 ${isEditing ? 'bg-amber-500 hover:bg-amber-600 focus:ring-amber-200 dark:focus:ring-amber-800' : 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-200 dark:focus:ring-primary-800'}`}>
        {isEditing ? <><Save size={18} /> Save Changes</> : <><PlusCircle size={18} /> Add Expense</>}
      </button>
    </motion.form>
  );
}
