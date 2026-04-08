import { USERS } from './constants';

/**
 * Round to 2 decimal places using banker-safe rounding.
 */
function round2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Split an amount among N people, distributing remainder cents
 * so the shares ALWAYS sum to exactly the original amount.
 *
 * Returns array of N share values (each rounded to 2 decimals).
 *
 * Example: splitEvenly(100, 3) → [33.34, 33.33, 33.33]
 */
export function splitEvenly(amount, count) {
  if (count <= 0) return [];
  const baseShare = Math.floor((amount * 100) / count) / 100;
  const totalBase = round2(baseShare * count);
  const remainderCents = Math.round((amount - totalBase) * 100);

  return Array.from({ length: count }, (_, i) =>
    i < remainderCents ? round2(baseShare + 0.01) : baseShare,
  );
}

/**
 * Compute per-person breakdown for a single expense.
 *
 * Returns object keyed by user name: { share, paid, net }
 *   share: what they owe (0 if not participant)
 *   paid:  what they paid
 *   net:   paid − share  (positive = owed back, negative = owes)
 *
 * The shares are distributed with remainder cents so they always
 * sum to exactly the expense amount (no rounding leak).
 *
 * Non-participant payers: if someone paid but is NOT a participant,
 * their share is 0, so their full payment becomes a positive net
 * (participants owe them back proportionally). This naturally
 * handles the "loan" case.
 */
export function computeExpenseBreakdown(expense) {
  const { amount, participants, paidBy } = expense;
  const participantList = participants.filter((p) => USERS.includes(p));
  const shares = splitEvenly(amount, participantList.length);

  const shareMap = {};
  participantList.forEach((user, i) => {
    shareMap[user] = shares[i];
  });

  const breakdown = {};
  USERS.forEach((user) => {
    const share = shareMap[user] ?? 0;
    const paid = round2(paidBy[user] || 0);
    breakdown[user] = {
      share,
      paid,
      net: round2(paid - share),
    };
  });

  return breakdown;
}

/**
 * Aggregate net balances across all expenses.
 * Returns { Maro: number, Kimo: number, Elbak: number }
 */
export function computeNetBalances(expenses) {
  const balances = {};
  USERS.forEach((u) => (balances[u] = 0));

  expenses.forEach((expense) => {
    const breakdown = computeExpenseBreakdown(expense);
    USERS.forEach((u) => {
      balances[u] = round2(balances[u] + breakdown[u].net);
    });
  });

  return balances;
}

/**
 * Produce minimal settlement transactions from net balances.
 * Uses greedy algorithm: pair largest debtor with largest creditor.
 *
 * Returns array of { from, to, amount }.
 */
export function computeSettlements(balances) {
  const debtors = [];
  const creditors = [];

  Object.entries(balances).forEach(([user, balance]) => {
    if (balance < -0.005) debtors.push({ user, amount: round2(-balance) });
    else if (balance > 0.005) creditors.push({ user, amount: round2(balance) });
  });

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const settlements = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const transfer = round2(Math.min(debtors[i].amount, creditors[j].amount));
    if (transfer > 0.005) {
      settlements.push({
        from: debtors[i].user,
        to: creditors[j].user,
        amount: transfer,
      });
    }
    debtors[i].amount = round2(debtors[i].amount - transfer);
    creditors[j].amount = round2(creditors[j].amount - transfer);

    if (debtors[i].amount < 0.005) i++;
    if (creditors[j].amount < 0.005) j++;
  }

  return settlements;
}
