import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, CheckCircle, AlertTriangle, TrendingUp, MessageCircle } from 'lucide-react';
import { computeNetBalances, computeSettlements } from '../utils/calculations';
import { USERS } from '../utils/constants';

const SHORT = (n) => n.replace('El ', '');

export default function Summary({ expenses }) {
  const balances = computeNetBalances(expenses);
  const settlements = computeSettlements(balances);

  if (expenses.length === 0) return null;

  const balanceSum = Object.values(balances).reduce((a, b) => a + b, 0);
  const isBalanced = Math.abs(balanceSum) < 0.02;
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalPaid = expenses.reduce((sum, e) => sum + e.totalPaid, 0);
  const hasMismatch = Math.abs(totalPaid - totalExpenses) > 0.01;

  const perPersonPaid = {};
  USERS.forEach((u) => {
    perPersonPaid[u] = expenses.reduce((sum, e) => sum + (e.paidBy[u] || 0), 0);
  });

  function buildShareText() {
    const lines = ['💰 *Gangsters Split*', ''];

    lines.push('*Total paid per person:*');
    USERS.forEach((user) => {
      lines.push(`💳 ${user}: ${perPersonPaid[user].toFixed(2)}`);
    });
    lines.push(`📊 Total: ${totalExpenses.toFixed(2)}`);

    lines.push('');
    lines.push('*Balances:*');
    USERS.forEach((user) => {
      const bal = balances[user];
      const sign = bal > 0 ? '+' : '';
      const emoji = getBalanceEmoji(bal);
      lines.push(`${emoji} ${user}: ${sign}${bal.toFixed(2)}`);
    });

    if (settlements.length > 0) {
      lines.push('', '*Settlement:*');
      settlements.forEach((s) => lines.push(`➡️ ${s.from} pays ${s.to} → ${s.amount.toFixed(2)}`));
    }
    return lines.join('\n');
  }

  function handleWhatsAppShare() {
    const text = buildShareText();
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 sm:space-y-4">
      {/* Stats */}
      <div className="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm sm:p-4 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-2.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          <TrendingUp size={14} /> Overview
        </h2>
        <div className="flex gap-2">
          <StatBox label="Total" value={totalExpenses.toFixed(0)} highlight />
          {USERS.map((u) => (
            <StatBox key={u} label={SHORT(u)} value={perPersonPaid[u].toFixed(0)} />
          ))}
        </div>
      </div>

      {/* Balances */}
      <div className="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm sm:p-5 dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-3 flex items-center justify-between sm:mb-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 sm:text-lg dark:text-white">
            <Wallet size={18} /> Balances
          </h2>
          <button onClick={handleWhatsAppShare} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 text-xs font-medium text-emerald-700 transition active:scale-95 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/40">
            <MessageCircle size={13} /> WhatsApp
          </button>
        </div>

        {/* Balance cards — always 3 columns */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {USERS.map((user) => {
            const bal = balances[user];
            const positive = bal > 0.005;
            const negative = bal < -0.005;
            const emoji = getBalanceEmoji(bal);
            return (
              <div key={user} className={`relative overflow-hidden rounded-xl border p-2.5 text-center sm:p-4 ${positive ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20' : negative ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20' : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-700/50'}`}>
                <span className="pointer-events-none absolute -bottom-1 -right-1 text-3xl opacity-20 sm:text-4xl">{emoji}</span>
                <p className="text-[11px] font-medium text-gray-500 sm:text-sm dark:text-gray-400">{SHORT(user)}</p>
                <p className={`mt-0.5 text-lg font-bold sm:mt-1 sm:text-2xl ${positive ? 'text-emerald-600 dark:text-emerald-400' : negative ? 'text-red-500 dark:text-red-400' : 'text-gray-400'}`}>
                  {bal > 0 ? '+' : ''}{bal.toFixed(0)}
                </p>
                <p className="mt-0.5 text-[10px] text-gray-500 sm:text-xs dark:text-gray-400">
                  {positive ? 'gets back' : negative ? 'owes' : 'settled'}
                </p>
              </div>
            );
          })}
        </div>

        {/* Integrity badge */}
        <div className="mt-2.5 flex items-center justify-between rounded-lg bg-gray-50 px-2.5 py-1.5 sm:mt-3 sm:px-3 sm:py-2 dark:bg-gray-700/50">
          <div className="flex items-center gap-1.5 text-[11px]">
            {isBalanced ? (
              <><CheckCircle size={12} className="text-emerald-500" /><span className="text-emerald-600 dark:text-emerald-400">Verified ✓</span></>
            ) : (
              <><AlertTriangle size={12} className="text-amber-500" /><span className="text-amber-600 dark:text-amber-400">Off by {Math.abs(balanceSum).toFixed(2)}</span></>
            )}
          </div>
          <span className="text-[11px] text-gray-400 dark:text-gray-500">{expenses.length} item{expenses.length !== 1 ? 's' : ''}</span>
        </div>

        {hasMismatch && (
          <div className="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 p-2 text-[11px] text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
            <AlertTriangle size={12} className="mt-0.5 shrink-0" />
            <span>Paid ({totalPaid.toFixed(2)}) ≠ amounts ({totalExpenses.toFixed(2)})</span>
          </div>
        )}
      </div>

      {/* Settlements */}
      {settlements.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm sm:p-5 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-3 text-base font-semibold text-gray-900 sm:text-lg dark:text-white">Settlement</h2>
          <div className="space-y-2">
            {settlements.map((s, i) => (
              <motion.div key={`${s.from}-${s.to}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }} className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3 dark:bg-gray-700/50">
                <span className="text-sm font-semibold text-red-500 dark:text-red-400">{SHORT(s.from)}</span>
                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-gray-300 dark:text-gray-600"><path d="M4 12h16m-4-4 4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
                <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{SHORT(s.to)}</span>
                <span className="ml-auto text-base font-bold text-gray-900 sm:text-lg dark:text-white">{s.amount.toFixed(2)}</span>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function getBalanceEmoji(balance) {
  if (balance > 100) return '🤑';
  if (balance > 0.005) return '😎';
  if (balance < -100) return '😭';
  if (balance < -0.005) return '💸';
  return '😌';
}

function StatBox({ label, value, highlight }) {
  return (
    <div className={`flex-1 rounded-xl p-2.5 text-center sm:p-3 ${highlight ? 'bg-primary-50 dark:bg-primary-900/20' : 'bg-gray-50 dark:bg-gray-700/50'}`}>
      <p className={`text-[10px] font-medium sm:text-[11px] ${highlight ? 'text-primary-500 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500'}`}>{label}</p>
      <p className={`mt-0.5 text-sm font-bold sm:text-base ${highlight ? 'text-primary-700 dark:text-primary-300' : 'text-gray-800 dark:text-gray-200'}`}>{value}</p>
    </div>
  );
}
