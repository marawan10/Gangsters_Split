import type { Expense, Settlement } from './types';

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function splitEvenly(amount: number, count: number): number[] {
  if (count <= 0) return [];
  const baseShare = Math.floor((amount * 100) / count) / 100;
  const totalBase = round2(baseShare * count);
  const remainderCents = Math.round((amount - totalBase) * 100);
  return Array.from({ length: count }, (_, i) =>
    i < remainderCents ? round2(baseShare + 0.01) : baseShare,
  );
}

export function computeExpenseBreakdown(expense: Expense, users: string[]) {
  const { amount, participants, paidBy } = expense;
  const participantList = participants.filter((p) => users.includes(p));
  const shares = splitEvenly(amount, participantList.length);
  const shareMap: Record<string, number> = {};
  participantList.forEach((user, i) => {
    shareMap[user] = shares[i];
  });
  const breakdown: Record<string, { share: number; paid: number; net: number }> = {};
  users.forEach((user) => {
    const share = shareMap[user] ?? 0;
    const paid = round2(paidBy[user] || 0);
    breakdown[user] = { share, paid, net: round2(paid - share) };
  });
  return breakdown;
}

export function computeNetBalances(expenses: Expense[], users: string[]) {
  const balances: Record<string, number> = {};
  users.forEach((u) => (balances[u] = 0));
  expenses.forEach((expense) => {
    const breakdown = computeExpenseBreakdown(expense, users);
    users.forEach((u) => {
      balances[u] = round2(balances[u] + breakdown[u].net);
    });
  });
  return balances;
}

export function applySettledToBalances(
  balances: Record<string, number>,
  settlements: Settlement[] | null | undefined,
  users: string[],
) {
  const out: Record<string, number> = {};
  users.forEach((u) => {
    out[u] = round2(balances[u] ?? 0);
  });
  (settlements || [])
    .filter((s) => s.status === 'settled')
    .forEach((s) => {
      if (!users.includes(s.from) || !users.includes(s.to)) return;
      out[s.from] = round2(out[s.from] + s.amount);
      out[s.to] = round2(out[s.to] - s.amount);
    });
  return out;
}

const STALE_SENT_TOL = 0.02;

export function getPairSettlementUiState(
  currentUser: string,
  other: string,
  iOwe: number,
  theyOwe: number,
  settlements: Settlement[] | null | undefined,
) {
  const list = settlements || [];
  const pendingOutboundAll = list.filter(
    (s) => s.status !== 'settled' && s.from === currentUser && s.to === other,
  );
  const pendingInboundAll = list.filter(
    (s) => s.status !== 'settled' && s.from === other && s.to === currentUser,
  );
  const rawSentOutboundTotal = round2(
    pendingOutboundAll.filter((s) => s.status === 'sent').reduce((sum, s) => sum + s.amount, 0),
  );
  const staleOutboundSent = rawSentOutboundTotal > iOwe + STALE_SENT_TOL;
  const rawInboundSentTotal = round2(
    pendingInboundAll.filter((s) => s.status === 'sent').reduce((sum, s) => sum + s.amount, 0),
  );
  const staleInboundSent = rawInboundSentTotal > theyOwe + STALE_SENT_TOL;
  const pairHasDebt = iOwe > 0.005 || theyOwe > 0.005;
  let pendingOutbound: Settlement[];
  let pendingInbound: Settlement[];
  if (!pairHasDebt) {
    pendingOutbound = [];
    pendingInbound = [];
  } else {
    pendingOutbound = staleOutboundSent
      ? pendingOutboundAll.filter((s) => s.status !== 'sent')
      : pendingOutboundAll;
    pendingInbound = staleInboundSent
      ? pendingInboundAll.filter((s) => s.status !== 'sent')
      : pendingInboundAll;
  }
  const sentOutboundTotal = round2(
    pendingOutbound.filter((s) => s.status === 'sent').reduce((sum, s) => sum + s.amount, 0),
  );
  const additionalIOwe = Math.max(0, round2(iOwe - sentOutboundTotal));
  return { pendingOutbound, pendingInbound, sentOutboundTotal, additionalIOwe };
}

export function computeSettlements(balances: Record<string, number>) {
  const debtors: { user: string; amount: number }[] = [];
  const creditors: { user: string; amount: number }[] = [];
  Object.entries(balances).forEach(([user, balance]) => {
    if (balance < -0.005) debtors.push({ user, amount: round2(-balance) });
    else if (balance > 0.005) creditors.push({ user, amount: round2(balance) });
  });
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);
  const settlements: { from: string; to: string; amount: number }[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const transfer = round2(Math.min(debtors[i].amount, creditors[j].amount));
    if (transfer > 0.005) {
      settlements.push({ from: debtors[i].user, to: creditors[j].user, amount: transfer });
    }
    debtors[i].amount = round2(debtors[i].amount - transfer);
    creditors[j].amount = round2(creditors[j].amount - transfer);
    if (debtors[i].amount < 0.005) i++;
    if (creditors[j].amount < 0.005) j++;
  }
  return settlements;
}

export function getDashboardBalanceSoundKind(
  expenses: Expense[],
  archive: Expense[],
  settlements: Settlement[] | null | undefined,
  user: string,
  users: string[],
): 'owes' | 'rich' | null {
  const all = [...expenses, ...archive];
  if (all.length === 0) return null;
  const balancesAfterSettled = applySettledToBalances(computeNetBalances(all, users), settlements, users);
  const rawSettlementPlan = computeSettlements(balancesAfterSettled);
  const others = users.filter((u) => u !== user);
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
    const { pendingOutbound, pendingInbound } = getPairSettlementUiState(
      user,
      other,
      iOwe,
      theyOwe,
      settlements,
    );
    const anyRelevantPending = pendingOutbound.length > 0 || pendingInbound.length > 0;
    const hasDebt = iOwe > 0.005 || theyOwe > 0.005;
    const allClear = !hasDebt && !anyRelevantPending;
    if (allClear) continue;
    if (iOwe > 0.005) anyIOwe = true;
    if (theyOwe > 0.005) anyTheyOwe = true;
    if (anyRelevantPending && !hasDebt) {
      const iAmDebtorSide = pendingOutbound.length > 0;
      if (iAmDebtorSide) anyIOwe = true;
      else anyTheyOwe = true;
    }
  }
  if (!anyIOwe && !anyTheyOwe) return null;
  if (anyIOwe) return 'owes';
  return 'rich';
}
