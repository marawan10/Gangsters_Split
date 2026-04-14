import { USERS } from './constants';

/**
 * Round to 2 decimal places using banker-safe rounding.
 */
export function round2(n) {
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
 * Apply completed (settled) peer-to-peer payments to expense net balances.
 * `from` paid `to` → debtor net increases, creditor net decreases.
 * Then computeSettlements(adjusted) matches what is still owed without
 * subtracting historical settled amounts from a newly recomputed minimal path.
 */
export function applySettledToBalances(balances, settlements) {
  const out = {};
  USERS.forEach((u) => {
    out[u] = round2(balances[u] ?? 0);
  });
  (settlements || [])
    .filter((s) => s.status === 'settled')
    .forEach((s) => {
      if (!USERS.includes(s.from) || !USERS.includes(s.to)) return;
      out[s.from] = round2(out[s.from] + s.amount);
      out[s.to] = round2(out[s.to] - s.amount);
    });
  return out;
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

/**
 * Dashboard-aligned sound hint: uses expense net + recorded settlements (like Dashboard cards).
 * 'owes' = you still owe someone; 'rich' = someone still owes you; null = all clear (no debt, no pending flow).
 */
export function getDashboardBalanceSoundKind(expenses, archive, settlements, user) {
  const all = [...expenses, ...archive];
  if (all.length === 0) return null;

  const balancesAfterSettled = applySettledToBalances(
    computeNetBalances(all),
    settlements,
  );
  const rawSettlementPlan = computeSettlements(balancesAfterSettled);

  const others = USERS.filter((u) => u !== user);
  let anyIOwe = false;
  let anyTheyOwe = false;

  for (const other of others) {
    const rawFromMe = rawSettlementPlan
      .filter((s) => s.from === user && s.to === other)
      .reduce((sum, s) => sum + s.amount, 0);
    const rawToMe = rawSettlementPlan
      .filter((s) => s.from === other && s.to === user)
      .reduce((sum, s) => sum + s.amount, 0);

    const iOwe = Math.max(0, Math.round(rawFromMe * 100) / 100);
    const theyOwe = Math.max(0, Math.round(rawToMe * 100) / 100);

    const pendingSettlement = (settlements || []).find(
      (s) => s.status !== 'settled' &&
        ((s.from === user && s.to === other) ||
          (s.from === other && s.to === user)),
    );

    const hasDebt = iOwe > 0.005 || theyOwe > 0.005;
    const allClear = !hasDebt && !pendingSettlement;
    if (allClear) continue;

    if (iOwe > 0.005) anyIOwe = true;
    if (theyOwe > 0.005) anyTheyOwe = true;
    if (pendingSettlement && !hasDebt) {
      if (pendingSettlement.from === user) anyIOwe = true;
      else anyTheyOwe = true;
    }
  }

  if (!anyIOwe && !anyTheyOwe) return null;
  if (anyIOwe) return 'owes';
  return 'rich';
}
