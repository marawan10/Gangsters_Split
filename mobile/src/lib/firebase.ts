import { initializeApp } from 'firebase/app';
import {
  getDatabase,
  ref,
  push,
  set,
  get,
  remove,
  onValue,
  query,
  orderByChild,
} from 'firebase/database';
import type { Expense, IdentityClaim, Member, Settlement } from './types';
import { DEFAULT_MEMBERS } from './constants';

const firebaseConfig = {
  apiKey: 'AIzaSyBj_cn4SVjIA8uTGy7MWSZVvr33OUnpBqM',
  authDomain: 'gangsters-split.firebaseapp.com',
  databaseURL: 'https://gangsters-split-default-rtdb.firebaseio.com',
  projectId: 'gangsters-split',
  storageBucket: 'gangsters-split.firebasestorage.app',
  messagingSenderId: '37932676523',
  appId: '1:37932676523:web:6bdef29c85c391e71f0eee',
  measurementId: 'G-DJ6NEDN5YB',
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const expensesRef = ref(db, 'expenses');
const archiveRef = ref(db, 'archive');
const settlementsRef = ref(db, 'settlements');
const membersRef = ref(db, 'config/members');
const identityClaimsRef = ref(db, 'settlements/_identityClaims');

function isInternalKey(fbKey: string) {
  return fbKey.startsWith('_');
}

function parseExpenseSnapshot(snapshot: { val: () => Record<string, Expense> | null }) {
  const data = snapshot.val();
  if (!data) return [];
  return Object.entries(data)
    .filter(([fbKey]) => !isInternalKey(fbKey))
    .map(([fbKey, expense]) => ({ ...expense, fbKey }))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function subscribeExpenses(callback: (list: Expense[]) => void) {
  const q = query(expensesRef, orderByChild('createdAt'));
  return onValue(q, (snapshot) => callback(parseExpenseSnapshot(snapshot)));
}

export function subscribeArchive(callback: (list: Expense[]) => void) {
  const q = query(archiveRef, orderByChild('createdAt'));
  return onValue(q, (snapshot) => callback(parseExpenseSnapshot(snapshot)));
}

export function addExpenseToDb(expense: Expense) {
  const newRef = push(expensesRef);
  return set(newRef, expense);
}

export function updateExpenseInDb(expense: Expense) {
  if (!expense.fbKey) return Promise.resolve();
  const { fbKey, ...data } = expense;
  return set(ref(db, `expenses/${fbKey}`), data);
}

export function deleteExpenseFromDb(expense: Expense) {
  if (!expense.fbKey) return Promise.resolve();
  return remove(ref(db, `expenses/${expense.fbKey}`));
}

export function archiveExpense(expense: Expense) {
  if (!expense.fbKey) return Promise.resolve();
  const { fbKey, ...data } = expense;
  const archiveItemRef = push(archiveRef);
  return set(archiveItemRef, { ...data, archivedAt: Date.now() }).then(() =>
    remove(ref(db, `expenses/${fbKey}`)),
  );
}

export function deleteArchivedExpense(expense: Expense) {
  if (!expense.fbKey) return Promise.resolve();
  return remove(ref(db, `archive/${expense.fbKey}`));
}

export function clearAllExpensesFromDb() {
  return set(expensesRef, null);
}

export function subscribeSettlements(callback: (list: Settlement[]) => void) {
  const q = query(settlementsRef, orderByChild('createdAt'));
  return onValue(q, (snapshot) => {
    const data = snapshot.val();
    if (!data) {
      callback([]);
      return;
    }
    callback(
      Object.entries(data)
        .filter(([fbKey]) => !isInternalKey(fbKey))
        .map(([fbKey, s]) => ({ ...(s as Settlement), fbKey }))
        .sort((a, b) => b.createdAt - a.createdAt),
    );
  });
}

export function addSettlement(settlement: Omit<Settlement, 'fbKey'>) {
  const newRef = push(settlementsRef);
  return set(newRef, settlement);
}

export async function updateSettlementStatus(fbKey: string, status: Settlement['status']) {
  const sRef = ref(db, `settlements/${fbKey}`);
  const snap = await get(sRef);
  const current = snap.val() as Settlement | null;
  if (!current) return;
  const next: Settlement = { ...current, status };
  if (status === 'sent') next.sentAt = Date.now();
  if (status === 'settled') next.settledAt = Date.now();
  return set(sRef, next);
}

let membersSeeded = false;

function parseMembers(data: unknown): Member[] {
  if (!data) return [];
  const raw = Array.isArray(data) ? data : Object.values(data as Record<string, Member>);
  return raw.filter(
    (m): m is Member =>
      !!m && typeof m === 'object' && typeof (m as Member).name === 'string' && !!(m as Member).id,
  );
}

export function subscribeMembers(callback: (members: Member[]) => void) {
  return onValue(
    membersRef,
    (snapshot) => {
      const parsed = parseMembers(snapshot.val());
      if (parsed.length > 0) {
        callback(parsed);
        return;
      }
      if (!membersSeeded) {
        membersSeeded = true;
        void set(membersRef, DEFAULT_MEMBERS);
      }
      callback(DEFAULT_MEMBERS);
    },
    (error) => {
      console.warn('subscribeMembers error', error);
      callback(DEFAULT_MEMBERS);
    },
  );
}

function getMembersList(data: unknown): Member[] {
  const parsed = parseMembers(data);
  return parsed.length > 0 ? parsed : [...DEFAULT_MEMBERS];
}

export function addMember(member: Member) {
  return get(membersRef).then((snap) => {
    const list = getMembersList(snap.val());
    return set(membersRef, [...list, member]);
  });
}

export function updateMember(memberId: string, updates: Partial<Member>) {
  return get(membersRef).then((snap) => {
    const list = getMembersList(snap.val());
    const next = list.map((m) => (m.id === memberId ? { ...m, ...updates } : m));
    return set(membersRef, next);
  });
}

export function removeMember(memberId: string) {
  return get(membersRef).then((snap) => {
    const list = getMembersList(snap.val());
    return Promise.all([
      set(
        membersRef,
        list.filter((m) => m.id !== memberId),
      ),
      releaseIdentityClaim(memberId),
    ]);
  });
}

function parseIdentityClaims(data: unknown): Record<string, IdentityClaim> {
  if (!data || typeof data !== 'object') return {};
  const claims: Record<string, IdentityClaim> = {};
  for (const [key, value] of Object.entries(data as Record<string, IdentityClaim>)) {
    if (value?.memberId && value?.name && value?.deviceId) {
      claims[key] = value;
    }
  }
  return claims;
}

export function subscribeIdentityClaims(callback: (claims: Record<string, IdentityClaim>) => void) {
  return onValue(identityClaimsRef, (snapshot) => {
    callback(parseIdentityClaims(snapshot.val()));
  });
}

export async function claimIdentity(
  memberId: string,
  name: string,
  deviceId: string,
): Promise<'ok' | 'taken' | 'error'> {
  const claimRef = ref(db, `settlements/_identityClaims/${memberId}`);
  try {
    const snap = await get(claimRef);
    const current = snap.val() as IdentityClaim | null;
    if (current && current.deviceId !== deviceId) return 'taken';
    if (!current) {
      await set(claimRef, { memberId, name, deviceId, claimedAt: Date.now() });
    }
    return 'ok';
  } catch (error) {
    console.warn('claimIdentity failed', error);
    return 'error';
  }
}

export function releaseIdentityClaim(memberId: string) {
  return remove(ref(db, `settlements/_identityClaims/${memberId}`));
}
