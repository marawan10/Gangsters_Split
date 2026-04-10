import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusCircle, Trash2, ShoppingCart, Check, X, AlertCircle } from 'lucide-react';
import { USERS } from '../utils/constants';

const SHORT = (n) => n.replace('El ', '');

function emptyItem() {
  return { id: crypto.randomUUID(), name: '', amount: '', forWhom: [...USERS] };
}

export default function ShoppingTrip({ onSubmitTrip, currentUser }) {
  const [payer, setPayer] = useState(currentUser || USERS[0]);
  const [items, setItems] = useState([emptyItem()]);
  const [errors, setErrors] = useState([]);

  function addItem() {
    setItems((prev) => [...prev, emptyItem()]);
  }

  function removeItem(id) {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((i) => i.id !== id)));
  }

  function updateItem(id, field, value) {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)),
    );
  }

  function toggleForWhom(itemId, user) {
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== itemId) return i;
        const has = i.forWhom.includes(user);
        return { ...i, forWhom: has ? i.forWhom.filter((u) => u !== user) : [...i.forWhom, user] };
      }),
    );
  }

  const validItems = items.filter((i) => i.name.trim() && parseFloat(i.amount) > 0 && i.forWhom.length > 0);
  const totalAmount = items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);

  const perPerson = {};
  USERS.forEach((u) => (perPerson[u] = 0));
  validItems.forEach((i) => {
    const amt = parseFloat(i.amount) || 0;
    const share = amt / i.forWhom.length;
    i.forWhom.forEach((u) => (perPerson[u] += share));
  });

  function validate() {
    const errs = [];
    if (validItems.length === 0) errs.push('Add at least one item with a name, amount, and who it\'s for.');
    items.forEach((i, idx) => {
      const amt = parseFloat(i.amount) || 0;
      if (i.name.trim() && amt <= 0) errs.push(`Item ${idx + 1}: enter an amount.`);
      if (amt > 0 && !i.name.trim()) errs.push(`Item ${idx + 1}: enter a name.`);
      if ((i.name.trim() || amt > 0) && i.forWhom.length === 0) errs.push(`Item ${idx + 1}: select who it's for.`);
    });
    return errs;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (errs.length > 0) { setErrors(errs); return; }
    setErrors([]);

    const expenses = validItems.map((i) => ({
      id: crypto.randomUUID(),
      item: i.name.trim(),
      category: 'shopping',
      amount: parseFloat(i.amount),
      participants: [...i.forWhom],
      paidBy: { [payer]: parseFloat(i.amount) },
      totalPaid: parseFloat(i.amount),
      addedBy: currentUser,
      createdAt: Date.now(),
    }));

    onSubmitTrip(expenses);
    setItems([emptyItem()]);
    setErrors([]);
  }

  const inputCls = 'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-500 dark:focus:ring-primary-800';

  return (
    <motion.form
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6 dark:border-gray-700 dark:bg-gray-800"
    >
      <div className="mb-4 flex items-center gap-2.5">
        <ShoppingCart size={18} className="text-primary-600 dark:text-primary-400" />
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Shopping Trip</h2>
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

      {/* Who went shopping */}
      <div className="mb-4">
        <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Who went shopping?</label>
        <div className="flex gap-2">
          {USERS.map((user) => (
            <button
              key={user}
              type="button"
              onClick={() => setPayer(user)}
              className={`flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border text-sm font-medium transition active:scale-95 ${
                payer === user
                  ? 'border-primary-400 bg-primary-50 text-primary-700 dark:border-primary-600 dark:bg-primary-900/30 dark:text-primary-300'
                  : 'border-gray-200 bg-gray-50 text-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-500'
              }`}
            >
              {payer === user && <Check size={14} />}
              {SHORT(user)}
            </button>
          ))}
        </div>
      </div>

      {/* Items list */}
      <div className="mb-4 space-y-3">
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Items</label>
        {items.map((item, idx) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-700/40"
          >
            <div className="mb-2 flex gap-2">
              <input
                type="text"
                value={item.name}
                onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                placeholder={`Item ${idx + 1}`}
                className={inputCls}
              />
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={item.amount}
                onChange={(e) => updateItem(item.id, 'amount', e.target.value)}
                placeholder="0"
                className={`${inputCls} w-24 shrink-0`}
              />
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-300 transition active:scale-95 hover:bg-red-50 hover:text-red-400 dark:text-gray-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            {/* For whom */}
            <div className="flex gap-1.5">
              {USERS.map((user) => {
                const active = item.forWhom.includes(user);
                return (
                  <button
                    key={user}
                    type="button"
                    onClick={() => toggleForWhom(item.id, user)}
                    className={`flex h-8 flex-1 items-center justify-center gap-1 rounded-lg text-[11px] font-medium transition active:scale-95 ${
                      active
                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                        : 'bg-gray-200/60 text-gray-400 line-through dark:bg-gray-600 dark:text-gray-500'
                    }`}
                  >
                    {active ? <Check size={10} /> : <X size={10} />}
                    {SHORT(user)}
                  </button>
                );
              })}
            </div>
          </motion.div>
        ))}

        <button
          type="button"
          onClick={addItem}
          className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-gray-300 text-xs font-medium text-gray-400 transition active:scale-[0.98] hover:border-primary-400 hover:text-primary-500 dark:border-gray-600 dark:text-gray-500 dark:hover:border-primary-600 dark:hover:text-primary-400"
        >
          <PlusCircle size={14} /> Add item
        </button>
      </div>

      {/* Live summary */}
      <AnimatePresence>
        {totalAmount > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-4 overflow-hidden rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-700/40">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Breakdown — {SHORT(payer)} paid {totalAmount.toFixed(0)}
            </p>
            <div className="space-y-1">
              {USERS.map((u) => {
                const owes = Math.round(perPerson[u] * 100) / 100;
                const paid = u === payer ? totalAmount : 0;
                const net = Math.round((paid - owes) * 100) / 100;
                return (
                  <div key={u} className="flex items-center justify-between text-xs">
                    <span className="font-medium text-gray-600 dark:text-gray-300">{SHORT(u)}</span>
                    <div className="flex items-center gap-4">
                      <span className="w-14 text-right text-gray-400">owes {owes.toFixed(0)}</span>
                      <span className={`w-16 text-right font-semibold ${net > 0.005 ? 'text-emerald-600 dark:text-emerald-400' : net < -0.005 ? 'text-red-500 dark:text-red-400' : 'text-gray-400'}`}>
                        {net > 0 ? '+' : ''}{net.toFixed(0)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit */}
      <button
        type="submit"
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary-600 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98] hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-200 dark:focus:ring-primary-800"
      >
        <ShoppingCart size={18} /> Add {validItems.length} item{validItems.length !== 1 ? 's' : ''} · {totalAmount.toFixed(0)}
      </button>
    </motion.form>
  );
}
