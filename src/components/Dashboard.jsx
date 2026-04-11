import { motion } from 'framer-motion';
import { Copy, CheckCircle, Clock, Send } from 'lucide-react';
import { USERS, INSTAPAY } from '../utils/constants';
import { computeNetBalances, computeSettlements } from '../utils/calculations';
import { updateSettlementStatus, addSettlement } from '../utils/firebase';
import { useLanguage } from '../utils/i18n';
import { useState } from 'react';

export default function Dashboard({ currentUser, expenses, archive, settlements }) {
  const { t, shortName } = useLanguage();

  const allExpenses = [...expenses, ...archive];
  const balances = computeNetBalances(allExpenses);
  const rawSettlementPlan = computeSettlements(balances);

  const settledAmounts = {};
  USERS.forEach((a) => USERS.forEach((b) => {
    if (a !== b) settledAmounts[`${a}→${b}`] = 0;
  }));
  settlements.filter((s) => s.status === 'settled').forEach((s) => {
    settledAmounts[`${s.from}→${s.to}`] = (settledAmounts[`${s.from}→${s.to}`] || 0) + s.amount;
  });

  const others = USERS.filter((u) => u !== currentUser);

  const debts = others.map((other) => {
    const rawFromMe = rawSettlementPlan
      .filter((s) => s.from === currentUser && s.to === other)
      .reduce((sum, s) => sum + s.amount, 0);
    const rawToMe = rawSettlementPlan
      .filter((s) => s.from === other && s.to === currentUser)
      .reduce((sum, s) => sum + s.amount, 0);

    const paidByMe = settledAmounts[`${currentUser}→${other}`] || 0;
    const paidToMe = settledAmounts[`${other}→${currentUser}`] || 0;

    const iOwe = Math.max(0, Math.round((rawFromMe - paidByMe) * 100) / 100);
    const theyOwe = Math.max(0, Math.round((rawToMe - paidToMe) * 100) / 100);

    const pendingSettlement = settlements.find(
      (s) => s.status !== 'settled' &&
        ((s.from === currentUser && s.to === other) ||
         (s.from === other && s.to === currentUser)),
    );

    return { other, iOwe, theyOwe, pendingSettlement };
  });

  const totalPaid = allExpenses.reduce(
    (sum, e) => sum + (e.paidBy[currentUser] || 0), 0,
  );
  const totalSpent = allExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Greeting */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          👋 {t('dashGreeting', { name: shortName(currentUser) })}
        </h2>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {t('dashSubtitle')}
        </p>
      </div>

      {/* Debt cards */}
      {debts.map((d) => (
        <DebtCard
          key={d.other}
          currentUser={currentUser}
          debt={d}
          t={t}
          shortName={shortName}
        />
      ))}

      {/* All-time stats */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          {t('dashStats')}
        </h3>
        <div className="flex gap-2">
          <div className="flex-1 rounded-xl bg-gray-50 p-2.5 text-center dark:bg-gray-700/50">
            <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500">{t('dashYouPaid')}</p>
            <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{totalPaid.toFixed(0)}</p>
          </div>
          <div className="flex-1 rounded-xl bg-primary-50 p-2.5 text-center dark:bg-primary-900/20">
            <p className="text-[10px] font-medium text-primary-500 dark:text-primary-400">{t('dashGroupTotal')}</p>
            <p className="text-sm font-bold text-primary-700 dark:text-primary-300">{totalSpent.toFixed(0)}</p>
          </div>
          <div className="flex-1 rounded-xl bg-gray-50 p-2.5 text-center dark:bg-gray-700/50">
            <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500">{t('dashExpenses')}</p>
            <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{allExpenses.length}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function DebtCard({ currentUser, debt, t, shortName }) {
  const { other, iOwe, theyOwe, pendingSettlement } = debt;
  const [confirmSent, setConfirmSent] = useState(false);
  const [copied, setCopied] = useState(false);

  const pay = INSTAPAY[other] || {};
  const hasDirectLink = !!pay.url;

  function handleCopyIpa() {
    if (!pay.username) return;
    navigator.clipboard.writeText(`${pay.username}@instapay`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const hasDebt = iOwe > 0.005 || theyOwe > 0.005;
  if (!hasDebt && !pendingSettlement) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">{shortName(other)}</span>
          <span className="text-xs font-medium text-gray-400">✅ {t('dashAllClear')}</span>
        </div>
      </div>
    );
  }

  const status = pendingSettlement?.status;
  const iAmDebtor = pendingSettlement?.from === currentUser;

  async function handleMarkSent() {
    if (confirmSent) {
      if (pendingSettlement) {
        updateSettlementStatus(pendingSettlement.fbKey, 'sent');
      } else if (iOwe > 0.005) {
        await addSettlement({
          from: currentUser,
          to: other,
          amount: iOwe,
          status: 'sent',
          createdAt: Date.now(),
          sentAt: Date.now(),
        });
      }
      setConfirmSent(false);
    } else {
      setConfirmSent(true);
      setTimeout(() => setConfirmSent(false), 3000);
    }
  }

  function handleConfirmReceived() {
    if (!pendingSettlement) return;
    updateSettlementStatus(pendingSettlement.fbKey, 'settled');
  }

  return (
    <div className={`overflow-hidden rounded-2xl border shadow-sm ${
      iOwe > 0.005
        ? 'border-red-200 bg-red-50/30 dark:border-red-800 dark:bg-red-900/10'
        : theyOwe > 0.005
          ? 'border-emerald-200 bg-emerald-50/30 dark:border-emerald-800 dark:bg-emerald-900/10'
          : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
    }`}>
      <div className="p-4">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-bold text-gray-900 dark:text-white">{shortName(other)}</span>
          {iOwe > 0.005 ? (
            <span className="rounded-lg bg-red-100 px-2.5 py-1 text-xs font-bold text-red-600 dark:bg-red-900/30 dark:text-red-400">
              {t('dashYouOwe')} {iOwe.toFixed(0)}
            </span>
          ) : theyOwe > 0.005 ? (
            <span className="rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
              {t('dashOwesYou')} {theyOwe.toFixed(0)}
            </span>
          ) : null}
        </div>

        {/* Status row */}
        {pendingSettlement && (
          <div className={`mb-3 flex items-center gap-2 rounded-xl p-2.5 text-xs font-medium ${
            status === 'sent'
              ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300'
              : 'bg-gray-100 text-gray-500 dark:bg-gray-700/50 dark:text-gray-400'
          }`}>
            {status === 'pending' && (
              <><Clock size={13} /> {iAmDebtor ? t('dashNotSentYet') : t('dashWaitingFor', { name: shortName(pendingSettlement.from) })}</>
            )}
            {status === 'sent' && (
              <><Send size={13} /> {iAmDebtor ? t('dashYouSent') : t('dashSentBy', { name: shortName(pendingSettlement.from) })}</>
            )}
          </div>
        )}

        {/* IPA address for copy (only when no direct link) */}
        {iOwe > 0.005 && !hasDirectLink && (
          <div className="mb-3 flex items-center justify-between rounded-xl bg-gray-100 px-3 py-2 dark:bg-gray-700/50">
            <span className="text-xs font-mono font-medium text-gray-600 dark:text-gray-300">{pay.username}@instapay</span>
            <button
              onClick={handleCopyIpa}
              className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold transition active:scale-95 ${
                copied
                  ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'bg-white text-gray-500 shadow-sm dark:bg-gray-600 dark:text-gray-300'
              }`}
            >
              {copied ? <><CheckCircle size={10} /> {t('dashCopied')}</> : <><Copy size={10} /> {t('dashCopy')}</>}
            </button>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          {iOwe > 0.005 && (
            <a
              href={hasDirectLink ? pay.url : `https://play.google.com/store/apps/details?id=com.egyptianbanks.instapay`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-primary-600 text-xs font-semibold text-white shadow-sm transition active:scale-95 hover:bg-primary-700"
            >
              💳 {hasDirectLink ? t('dashPayInstapay') : t('dashOpenInstapay')}
            </a>
          )}

          {iOwe > 0.005 && (!pendingSettlement || (iAmDebtor && status === 'pending')) && (
            <button
              onClick={handleMarkSent}
              className={`flex h-10 flex-1 items-center justify-center gap-2 rounded-xl text-xs font-semibold transition active:scale-95 ${
                confirmSent
                  ? 'bg-emerald-500 text-white'
                  : 'border border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
              }`}
            >
              <CheckCircle size={14} /> {confirmSent ? t('dashTapConfirm') : t('dashISentIt')}
            </button>
          )}

          {pendingSettlement && !iAmDebtor && status === 'sent' && (
            <button
              onClick={handleConfirmReceived}
              className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 text-xs font-semibold text-white shadow-sm transition active:scale-95 hover:bg-emerald-600"
            >
              <CheckCircle size={14} /> {t('dashConfirmReceived')}
            </button>
          )}

          {theyOwe > 0.005 && !pendingSettlement && (
            <div className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-gray-100 text-xs font-medium text-gray-400 dark:bg-gray-700/50 dark:text-gray-500">
              <Clock size={13} /> {t('dashWaiting')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
