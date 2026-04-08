import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Wallet,
  CheckCircle,
  AlertTriangle,
  Copy,
  Check,
} from 'lucide-react';
import { computeNetBalances, computeSettlements } from '../utils/calculations';
import { USERS } from '../utils/constants';

export default function Summary({ expenses }) {
  const balances = computeNetBalances(expenses);
  const settlements = computeSettlements(balances);
  const [copied, setCopied] = useState(false);

  if (expenses.length === 0) return null;

  const balanceSum = Object.values(balances).reduce((a, b) => a + b, 0);
  const isBalanced = Math.abs(balanceSum) < 0.02;

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalPaid = expenses.reduce((sum, e) => sum + e.totalPaid, 0);
  const hasMismatch = Math.abs(totalPaid - totalExpenses) > 0.01;

  function buildShareText() {
    const lines = ['💰 *Gangsters Split*', ''];

    lines.push('*Balances:*');
    USERS.forEach((user) => {
      const bal = balances[user];
      const sign = bal > 0 ? '+' : '';
      const label =
        bal > 0.005 ? '🟢' : bal < -0.005 ? '🔴' : '⚪';
      lines.push(`${label} ${user}: ${sign}${bal.toFixed(2)}`);
    });

    if (settlements.length > 0) {
      lines.push('');
      lines.push('*Settlement:*');
      settlements.forEach((s) => {
        lines.push(`➡️ ${s.from} pays ${s.to} → ${s.amount.toFixed(2)}`);
      });
    }

    return lines.join('\n');
  }

  async function handleCopy() {
    const text = buildShareText();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Net balances */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
            <Wallet size={20} />
            Net Balances
          </h2>
          <button
            onClick={handleCopy}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              copied
                ? 'border-emerald-300 bg-emerald-50 text-emerald-600 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.span
                  key="check"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-1"
                >
                  <Check size={14} /> Copied!
                </motion.span>
              ) : (
                <motion.span
                  key="copy"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-1"
                >
                  <Copy size={14} /> Share
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {USERS.map((user) => {
            const bal = balances[user];
            const positive = bal > 0.005;
            const negative = bal < -0.005;
            return (
              <div
                key={user}
                className={`rounded-xl border p-4 text-center transition ${
                  positive
                    ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20'
                    : negative
                      ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                      : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-700/50'
                }`}
              >
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {user}
                </p>
                <p
                  className={`mt-1 text-2xl font-bold ${
                    positive
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : negative
                        ? 'text-red-500 dark:text-red-400'
                        : 'text-gray-400'
                  }`}
                >
                  {bal > 0 ? '+' : ''}
                  {bal.toFixed(2)}
                </p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {positive
                    ? 'gets money back'
                    : negative
                      ? 'owes money'
                      : 'settled'}
                </p>
              </div>
            );
          })}
        </div>

        {/* Balance integrity check */}
        <div className="mt-3 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-700/50">
          <div className="flex items-center gap-2 text-xs">
            {isBalanced ? (
              <>
                <CheckCircle size={14} className="text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400">
                  Balances verified (sum = 0)
                </span>
              </>
            ) : (
              <>
                <AlertTriangle size={14} className="text-amber-500" />
                <span className="text-amber-600 dark:text-amber-400">
                  Imbalance of {Math.abs(balanceSum).toFixed(2)} detected
                </span>
              </>
            )}
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {expenses.length} expense{expenses.length !== 1 ? 's' : ''}
          </span>
        </div>

        {hasMismatch && (
          <div className="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>
              Total paid across all expenses ({totalPaid.toFixed(2)}) doesn't
              match total expense amounts ({totalExpenses.toFixed(2)}). Some
              expenses may have mismatched paid values.
            </span>
          </div>
        )}
      </div>

      {/* Settlement suggestions */}
      {settlements.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Settlement Plan
          </h2>
          <div className="space-y-2">
            {settlements.map((s, i) => (
              <motion.div
                key={`${s.from}-${s.to}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3 dark:bg-gray-700/50"
              >
                <span className="font-semibold text-red-500 dark:text-red-400">
                  {s.from}
                </span>
                <span className="text-xs text-gray-400">pays</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {s.to}
                </span>
                <span className="ml-auto text-lg font-bold text-gray-900 dark:text-white">
                  {s.amount.toFixed(2)}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
