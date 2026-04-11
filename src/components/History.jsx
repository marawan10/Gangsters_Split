import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Archive, ChevronDown, ChevronUp, MessageCircle, Trash2 } from 'lucide-react';
import { USERS, CATEGORIES } from '../utils/constants';
import { computeNetBalances, computeSettlements } from '../utils/calculations';
import { deleteArchivedExpense } from '../utils/firebase';
import { useLanguage } from '../utils/i18n';

function groupByDate(items) {
  const groups = {};
  items.forEach((item) => {
    const d = new Date(item.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });
  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, expenses]) => ({ date, expenses }));
}

function getBalanceEmoji(bal) {
  if (bal > 100) return '🤑';
  if (bal > 0.005) return '😎';
  if (bal < -100) return '😭';
  if (bal < -0.005) return '💸';
  return '😌';
}

function shareGroup(expenses, dateLabel, t, shortName) {
  const balances = computeNetBalances(expenses);
  const settlements = computeSettlements(balances);
  const total = expenses.reduce((s, e) => s + e.amount, 0);

  const lines = [`💰 *${t('appName')} — ${dateLabel}*`, ''];

  lines.push(`*${t('waTotalPaid')}*`);
  USERS.forEach((u) => {
    const paid = expenses.reduce((s, e) => s + (e.paidBy[u] || 0), 0);
    lines.push(`💳 ${shortName(u)}: ${paid.toFixed(2)}`);
  });
  lines.push(`📊 ${t('total')}: ${total.toFixed(2)}`);

  lines.push('', `*${t('waBalances')}*`);
  USERS.forEach((u) => {
    const bal = balances[u];
    const sign = bal > 0 ? '+' : '';
    lines.push(`${getBalanceEmoji(bal)} ${shortName(u)}: ${sign}${bal.toFixed(2)}`);
  });

  if (settlements.length > 0) {
    lines.push('', `*${t('waSettlement')}*`);
    settlements.forEach((s) => lines.push(`➡️ ${t('waPays', { from: shortName(s.from), to: shortName(s.to), amount: s.amount.toFixed(2) })}`));
  }

  const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(lines.join('\n'))}`;
  window.open(url, '_blank');
}

function formatGroupDate(dateStr, t) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (dateStr === today) return t('today');

  const months = t('months');
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

export default function History({ archive }) {
  const [open, setOpen] = useState(false);
  const { t, shortName } = useLanguage();

  if (archive.length === 0) return null;

  const groups = groupByDate(archive);
  const totalSpent = archive.reduce((sum, e) => sum + e.amount, 0);

  const perPersonPaid = {};
  USERS.forEach((u) => {
    perPersonPaid[u] = archive.reduce((sum, e) => sum + (e.paidBy[u] || 0), 0);
  });

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition active:bg-gray-50 dark:active:bg-gray-700/50"
      >
        <div className="flex items-center gap-2">
          <Archive size={15} className="text-gray-400 dark:text-gray-500" />
          <span className="text-sm font-semibold text-gray-900 dark:text-white">{t('history')}</span>
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-200 text-[10px] font-bold text-gray-500 dark:bg-gray-700 dark:text-gray-400">{archive.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold tabular-nums text-gray-400 dark:text-gray-500">{totalSpent.toFixed(0)}</span>
          {open ? <ChevronUp size={16} className="text-gray-300 dark:text-gray-600" /> : <ChevronDown size={16} className="text-gray-300 dark:text-gray-600" />}
        </div>
      </button>

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
              {/* Per-person paid + total */}
              <div className="mb-3 flex gap-1.5">
                {USERS.map((u) => (
                  <div key={u} className="flex-1 rounded-xl bg-gray-50 p-2.5 text-center dark:bg-gray-700/50">
                    <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500">{shortName(u)}</p>
                    <p className="text-sm font-bold text-gray-700 dark:text-gray-200">{perPersonPaid[u].toFixed(0)}</p>
                  </div>
                ))}
                <div className="flex-1 rounded-xl bg-primary-50 p-2.5 text-center dark:bg-primary-900/20">
                  <p className="text-[10px] font-medium text-primary-500 dark:text-primary-400">{t('total')}</p>
                  <p className="text-sm font-bold text-primary-700 dark:text-primary-300">{totalSpent.toFixed(0)}</p>
                </div>
              </div>

              {/* Grouped by date */}
              <div className="max-h-80 space-y-3 overflow-y-auto">
                {groups.map((group) => {
                  const dateLabel = formatGroupDate(group.date, t);
                  const groupTotal = group.expenses.reduce((s, e) => s + e.amount, 0);
                  return (
                  <div key={group.date}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                          {dateLabel}
                        </p>
                        <span className="text-[10px] font-bold tabular-nums text-gray-300 dark:text-gray-600">{groupTotal.toFixed(0)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => shareGroup(group.expenses, dateLabel, t, shortName)}
                          className="flex h-6 items-center gap-1 rounded-lg bg-[#25D366] px-2 text-[10px] font-semibold text-white transition active:scale-95"
                        >
                          <MessageCircle size={10} /> {t('send')}
                        </button>
                        <DeleteGroupBtn expenses={group.expenses} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      {group.expenses.map((expense) => {
                        const cat = CATEGORIES.find((c) => c.id === expense.category);
                        return (
                          <div
                            key={expense.fbKey}
                            className="flex items-center gap-2.5 rounded-lg bg-gray-50 px-2.5 py-2 dark:bg-gray-700/40"
                          >
                            <span className="text-base leading-none">{cat?.emoji ?? '📦'}</span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-medium text-gray-700 dark:text-gray-300">
                                {expense.item}
                              </p>
                              {expense.addedBy && (
                                <p className="text-[10px] text-gray-400 dark:text-gray-500">
                                  {t('by')} {shortName(expense.addedBy)}
                                </p>
                              )}
                            </div>
                            <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                              {expense.amount.toFixed(0)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DeleteGroupBtn({ expenses }) {
  const [confirm, setConfirm] = useState(false);
  const { t } = useLanguage();

  function handleDelete() {
    if (confirm) {
      expenses.forEach((e) => deleteArchivedExpense(e));
    } else {
      setConfirm(true);
      setTimeout(() => setConfirm(false), 3000);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      className={`flex h-6 items-center gap-1 rounded-lg px-2 text-[10px] font-semibold transition active:scale-95 ${
        confirm
          ? 'bg-red-500 text-white'
          : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
      }`}
    >
      <Trash2 size={10} /> {confirm ? t('sure') : ''}
    </button>
  );
}
