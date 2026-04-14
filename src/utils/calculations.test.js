import { describe, it, expect } from 'vitest';
import {
  splitEvenly,
  computeExpenseBreakdown,
  computeNetBalances,
  computeSettlements,
  applySettledToBalances,
  getDashboardBalanceSoundKind,
} from './calculations';

const M = 'El Maro';
const K = 'El Kemo';
const B = 'El Back';

// ─────────────────────────────────────────────────────────
// splitEvenly
// ─────────────────────────────────────────────────────────

describe('splitEvenly', () => {
  it('splits evenly divisible amounts', () => {
    expect(splitEvenly(90, 3)).toEqual([30, 30, 30]);
    expect(splitEvenly(100, 2)).toEqual([50, 50]);
    expect(splitEvenly(60, 3)).toEqual([20, 20, 20]);
  });

  it('distributes remainder cents (100 / 3)', () => {
    const shares = splitEvenly(100, 3);
    expect(shares).toEqual([33.34, 33.33, 33.33]);
    expect(shares.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 2);
  });

  it('distributes 2 remainder cents (200 / 3)', () => {
    const shares = splitEvenly(200, 3);
    expect(shares).toEqual([66.67, 66.67, 66.66]);
    expect(shares.reduce((a, b) => a + b, 0)).toBeCloseTo(200, 2);
  });

  it('handles single person', () => {
    expect(splitEvenly(150, 1)).toEqual([150]);
  });

  it('handles zero count', () => {
    expect(splitEvenly(100, 0)).toEqual([]);
  });

  it('handles small amounts (1 / 3)', () => {
    const shares = splitEvenly(1, 3);
    expect(shares.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 2);
  });

  it('handles large amounts (99999.99 / 3)', () => {
    const shares = splitEvenly(99999.99, 3);
    expect(shares.reduce((a, b) => a + b, 0)).toBeCloseTo(99999.99, 2);
  });
});

// ─────────────────────────────────────────────────────────
// computeExpenseBreakdown
// ─────────────────────────────────────────────────────────

describe('computeExpenseBreakdown', () => {
  it('basic 3-way split, one payer', () => {
    const expense = {
      amount: 90,
      participants: [M, K, B],
      paidBy: { [M]: 90 },
    };
    const r = computeExpenseBreakdown(expense);

    expect(r[M]).toEqual({ share: 30, paid: 90, net: 60 });
    expect(r[K]).toEqual({ share: 30, paid: 0, net: -30 });
    expect(r[B]).toEqual({ share: 30, paid: 0, net: -30 });

    expect(r[M].net + r[K].net + r[B].net).toBeCloseTo(0, 2);
  });

  it('2-way split (one person excluded)', () => {
    const expense = {
      amount: 224,
      participants: [M, K],
      paidBy: { [K]: 224 },
    };
    const r = computeExpenseBreakdown(expense);

    expect(r[M]).toEqual({ share: 112, paid: 0, net: -112 });
    expect(r[K]).toEqual({ share: 112, paid: 224, net: 112 });
    expect(r[B]).toEqual({ share: 0, paid: 0, net: 0 });

    expect(r[M].net + r[K].net + r[B].net).toBeCloseTo(0, 2);
  });

  it('non-participant payer (loan case)', () => {
    const expense = {
      amount: 200,
      participants: [M, K],
      paidBy: { [B]: 200 },
    };
    const r = computeExpenseBreakdown(expense);

    expect(r[M]).toEqual({ share: 100, paid: 0, net: -100 });
    expect(r[K]).toEqual({ share: 100, paid: 0, net: -100 });
    expect(r[B]).toEqual({ share: 0, paid: 200, net: 200 });

    expect(r[M].net + r[K].net + r[B].net).toBeCloseTo(0, 2);
  });

  it('multiple payers', () => {
    const expense = {
      amount: 90,
      participants: [M, K, B],
      paidBy: { [M]: 50, [K]: 40 },
    };
    const r = computeExpenseBreakdown(expense);

    expect(r[M]).toEqual({ share: 30, paid: 50, net: 20 });
    expect(r[K]).toEqual({ share: 30, paid: 40, net: 10 });
    expect(r[B]).toEqual({ share: 30, paid: 0, net: -30 });

    expect(r[M].net + r[K].net + r[B].net).toBeCloseTo(0, 2);
  });

  it('uneven split with remainder cents (100 / 3)', () => {
    const expense = {
      amount: 100,
      participants: [M, K, B],
      paidBy: { [M]: 100 },
    };
    const r = computeExpenseBreakdown(expense);

    expect(r[M].share + r[K].share + r[B].share).toBeCloseTo(100, 2);
    expect(r[M].net + r[K].net + r[B].net).toBeCloseTo(0, 2);
  });

  it('single participant', () => {
    const expense = {
      amount: 50,
      participants: [K],
      paidBy: { [M]: 50 },
    };
    const r = computeExpenseBreakdown(expense);

    expect(r[M]).toEqual({ share: 0, paid: 50, net: 50 });
    expect(r[K]).toEqual({ share: 50, paid: 0, net: -50 });
    expect(r[B]).toEqual({ share: 0, paid: 0, net: 0 });
  });

  // ── YOUR EXACT SCENARIO ──────────────────────────────────
  it('full scenario: transportation + food (user example)', () => {
    const expense1 = {
      amount: 150,
      participants: [M, K, B],
      paidBy: { [B]: 150 },
    };
    const expense2 = {
      amount: 224,
      participants: [M, K],
      paidBy: { [K]: 224 },
    };

    const b1 = computeExpenseBreakdown(expense1);
    const b2 = computeExpenseBreakdown(expense2);

    // Expense 1: 150 / 3 = 50 each
    expect(b1[M].share).toBe(50);
    expect(b1[K].share).toBe(50);
    expect(b1[B].share).toBe(50);
    expect(b1[B].net).toBe(100);

    // Expense 2: 224 / 2 = 112 each
    expect(b2[M].share).toBe(112);
    expect(b2[K].share).toBe(112);
    expect(b2[B].share).toBe(0);
    expect(b2[K].net).toBe(112);

    // Combined nets
    const maroNet = b1[M].net + b2[M].net;
    const kemoNet = b1[K].net + b2[K].net;
    const backNet = b1[B].net + b2[B].net;

    expect(maroNet).toBe(-162);
    expect(kemoNet).toBe(62);
    expect(backNet).toBe(100);
    expect(maroNet + kemoNet + backNet).toBeCloseTo(0, 2);
  });
});

// ─────────────────────────────────────────────────────────
// computeNetBalances
// ─────────────────────────────────────────────────────────

describe('computeNetBalances', () => {
  it('single expense', () => {
    const expenses = [{
      amount: 150,
      participants: [M, K, B],
      paidBy: { [B]: 150 },
    }];
    const bal = computeNetBalances(expenses);

    expect(bal[M]).toBe(-50);
    expect(bal[K]).toBe(-50);
    expect(bal[B]).toBe(100);
  });

  it('multiple expenses — user scenario', () => {
    const expenses = [
      { amount: 150, participants: [M, K, B], paidBy: { [B]: 150 } },
      { amount: 224, participants: [M, K], paidBy: { [K]: 224 } },
    ];
    const bal = computeNetBalances(expenses);

    expect(bal[M]).toBe(-162);
    expect(bal[K]).toBe(62);
    expect(bal[B]).toBe(100);
    expect(bal[M] + bal[K] + bal[B]).toBeCloseTo(0, 2);
  });

  it('balances sum to zero with tricky amounts', () => {
    const expenses = [
      { amount: 100, participants: [M, K, B], paidBy: { [M]: 100 } },
      { amount: 77, participants: [M, B], paidBy: { [B]: 77 } },
      { amount: 33, participants: [K], paidBy: { [M]: 33 } },
    ];
    const bal = computeNetBalances(expenses);
    const sum = bal[M] + bal[K] + bal[B];

    expect(Math.abs(sum)).toBeLessThan(0.02);
  });

  it('no expenses returns all zeros', () => {
    const bal = computeNetBalances([]);
    expect(bal).toEqual({ [M]: 0, [K]: 0, [B]: 0 });
  });
});

// ─────────────────────────────────────────────────────────
// computeSettlements
// ─────────────────────────────────────────────────────────

describe('applySettledToBalances', () => {
  it('leaves balances unchanged when there are no settlements', () => {
    const bal = { [M]: -100, [K]: 40, [B]: 60 };
    expect(applySettledToBalances(bal, [])).toEqual(bal);
    expect(applySettledToBalances(bal, null)).toEqual(bal);
  });

  it('full prior round settled + new 3-way expense → each debtor still owes full new share to creditor', () => {
    const archive = [
      { amount: 414, participants: [M, K, B], paidBy: { [B]: 414 } },
    ];
    const active = [
      { amount: 2000, participants: [M, K, B], paidBy: { [B]: 2000 } },
    ];
    const all = [...archive, ...active];
    const settled = [
      { from: M, to: B, amount: 138, status: 'settled', fbKey: 'a' },
      { from: K, to: B, amount: 138, status: 'settled', fbKey: 'b' },
    ];
    const shares = splitEvenly(2000, 3);
    const adj = applySettledToBalances(computeNetBalances(all), settled);
    const plan = computeSettlements(adj);
    const mToB = plan
      .filter((s) => s.from === M && s.to === B)
      .reduce((sum, s) => sum + s.amount, 0);
    const kToB = plan
      .filter((s) => s.from === K && s.to === B)
      .reduce((sum, s) => sum + s.amount, 0);
    expect(mToB).toBeCloseTo(shares[0], 2);
    expect(kToB).toBeCloseTo(shares[1], 2);
  });

  it('after apply, net balances still sum to ~0', () => {
    const expenses = [
      { amount: 150, participants: [M, K, B], paidBy: { [B]: 150 } },
      { amount: 224, participants: [M, K], paidBy: { [K]: 224 } },
    ];
    const settled = [
      { from: M, to: B, amount: 50, status: 'settled', fbKey: 'x' },
      { from: M, to: K, amount: 112, status: 'settled', fbKey: 'y' },
    ];
    const adj = applySettledToBalances(computeNetBalances(expenses), settled);
    const sum = adj[M] + adj[K] + adj[B];
    expect(Math.abs(sum)).toBeLessThan(0.02);
  });
});

describe('computeSettlements', () => {
  it('simple two-person settlement', () => {
    const settlements = computeSettlements({ [M]: 50, [K]: -50, [B]: 0 });

    expect(settlements).toHaveLength(1);
    expect(settlements[0]).toEqual({ from: K, to: M, amount: 50 });
  });

  it('user scenario settlement', () => {
    const settlements = computeSettlements({ [M]: -162, [K]: 62, [B]: 100 });

    expect(settlements).toHaveLength(2);

    const totalFromMaro = settlements
      .filter((s) => s.from === M)
      .reduce((sum, s) => sum + s.amount, 0);
    expect(totalFromMaro).toBe(162);

    const totalToBack = settlements
      .filter((s) => s.to === B)
      .reduce((sum, s) => sum + s.amount, 0);
    expect(totalToBack).toBe(100);

    const totalToKemo = settlements
      .filter((s) => s.to === K)
      .reduce((sum, s) => sum + s.amount, 0);
    expect(totalToKemo).toBe(62);
  });

  it('all settled returns empty', () => {
    expect(computeSettlements({ [M]: 0, [K]: 0, [B]: 0 })).toEqual([]);
  });

  it('settlement amounts balance out', () => {
    const balances = { [M]: -80, [K]: 30, [B]: 50 };
    const settlements = computeSettlements(balances);

    const totalSettled = settlements.reduce((sum, s) => sum + s.amount, 0);
    expect(totalSettled).toBe(80);
  });
});

// ─────────────────────────────────────────────────────────
// Zero-sum invariant (the CRITICAL property for money apps)
// ─────────────────────────────────────────────────────────

describe('zero-sum invariant', () => {
  const scenarios = [
    {
      name: 'equal split, single payer',
      expenses: [{ amount: 300, participants: [M, K, B], paidBy: { [M]: 300 } }],
    },
    {
      name: 'uneven 100/3 split',
      expenses: [{ amount: 100, participants: [M, K, B], paidBy: { [K]: 100 } }],
    },
    {
      name: '2-person split with outside payer',
      expenses: [{ amount: 200, participants: [M, K], paidBy: { [B]: 200 } }],
    },
    {
      name: 'multiple payers, partial overlap',
      expenses: [{ amount: 150, participants: [M, B], paidBy: { [M]: 100, [K]: 50 } }],
    },
    {
      name: 'many expenses combined',
      expenses: [
        { amount: 150, participants: [M, K, B], paidBy: { [B]: 150 } },
        { amount: 224, participants: [M, K], paidBy: { [K]: 224 } },
        { amount: 100, participants: [M, K, B], paidBy: { [M]: 60, [K]: 40 } },
        { amount: 50, participants: [B], paidBy: { [M]: 50 } },
        { amount: 33, participants: [M, K, B], paidBy: { [B]: 33 } },
      ],
    },
  ];

  scenarios.forEach(({ name, expenses }) => {
    it(`balances sum to ≈0: ${name}`, () => {
      const bal = computeNetBalances(expenses);
      const sum = Object.values(bal).reduce((a, b) => a + b, 0);
      expect(Math.abs(sum)).toBeLessThan(0.02);
    });
  });
});

describe('getDashboardBalanceSoundKind', () => {
  it('returns null with no expenses', () => {
    expect(getDashboardBalanceSoundKind([], [], [], M)).toBeNull();
  });

  it('returns owes when user net owes from expenses', () => {
    const ex = [{ amount: 300, participants: [M, K, B], paidBy: { [B]: 300 } }];
    expect(getDashboardBalanceSoundKind(ex, [], [], M)).toBe('owes');
    expect(getDashboardBalanceSoundKind(ex, [], [], B)).toBe('rich');
  });

  it('returns null when settled transfers match plan (all clear)', () => {
    const ex = [{ amount: 300, participants: [M, K, B], paidBy: { [B]: 300 } }];
    const plan = computeSettlements(computeNetBalances(ex));
    const settled = plan.map((s) => ({
      ...s,
      status: 'settled',
      fbKey: 'x',
    }));
    expect(getDashboardBalanceSoundKind(ex, [], settled, M)).toBeNull();
    expect(getDashboardBalanceSoundKind(ex, [], settled, B)).toBeNull();
  });
});
