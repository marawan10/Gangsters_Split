import { initializeApp } from 'firebase/app';
import {
  getDatabase,
  ref,
  push,
  set,
  remove,
  onValue,
  query,
  orderByChild,
} from 'firebase/database';

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

function parseSnapshot(snapshot) {
  const data = snapshot.val();
  if (!data) return [];
  return Object.entries(data)
    .map(([fbKey, expense]) => ({ ...expense, fbKey }))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function subscribeExpenses(callback) {
  const q = query(expensesRef, orderByChild('createdAt'));
  return onValue(q, (snapshot) => callback(parseSnapshot(snapshot)));
}

export function subscribeArchive(callback) {
  const q = query(archiveRef, orderByChild('createdAt'));
  return onValue(q, (snapshot) => callback(parseSnapshot(snapshot)));
}

export function addExpenseToDb(expense) {
  const newRef = push(expensesRef);
  return set(newRef, expense);
}

export function updateExpenseInDb(expense) {
  if (!expense.fbKey) return Promise.resolve();
  const { fbKey, ...data } = expense;
  return set(ref(db, `expenses/${fbKey}`), data);
}

export function deleteExpenseFromDb(expense) {
  if (!expense.fbKey) return Promise.resolve();
  return remove(ref(db, `expenses/${expense.fbKey}`));
}

export function archiveExpense(expense) {
  if (!expense.fbKey) return Promise.resolve();
  const { fbKey, ...data } = expense;
  const archiveItemRef = push(archiveRef);
  return set(archiveItemRef, { ...data, archivedAt: Date.now() }).then(() =>
    remove(ref(db, `expenses/${fbKey}`)),
  );
}

export function deleteArchivedExpense(expense) {
  if (!expense.fbKey) return Promise.resolve();
  return remove(ref(db, `archive/${expense.fbKey}`));
}

export function clearAllExpensesFromDb() {
  return set(expensesRef, null);
}

// --- Settlements ---

export function subscribeSettlements(callback) {
  const q = query(settlementsRef, orderByChild('createdAt'));
  return onValue(q, (snapshot) => {
    const data = snapshot.val();
    if (!data) { callback([]); return; }
    callback(
      Object.entries(data)
        .map(([fbKey, s]) => ({ ...s, fbKey }))
        .sort((a, b) => b.createdAt - a.createdAt),
    );
  });
}

export function addSettlement(settlement) {
  const newRef = push(settlementsRef);
  return set(newRef, settlement);
}

export function updateSettlementStatus(fbKey, status) {
  const updates = { status };
  if (status === 'sent') updates.sentAt = Date.now();
  if (status === 'settled') updates.settledAt = Date.now();
  const sRef = ref(db, `settlements/${fbKey}`);
  return onValue(sRef, (snap) => {
    const current = snap.val();
    if (current) set(sRef, { ...current, ...updates });
  }, { onlyOnce: true });
}
