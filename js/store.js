// ===== CENTRALIZED STATE MANAGEMENT =====

const STORAGE_PREFIX = 'sw_';
const listeners = new Map();

let state = {
  transactions: [],
  budgets: [],
  savingsGoals: [],
  recurringList: [],
  settings: { currency:'৳', theme:'dark', dateFormat:'YYYY-MM-DD' }
};

// ===== PERSISTENCE =====
function load(key, def) {
  try { return JSON.parse(localStorage.getItem(STORAGE_PREFIX + key)) || def; }
  catch { return def; }
}

function save(key, val) {
  try { localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(val)); }
  catch(e) { console.warn('Storage save failed:', e); }
}

export function initStore() {
  state.transactions = load('transactions', []);
  state.budgets = load('budgets', []);
  state.savingsGoals = load('savings', []);
  state.recurringList = load('recurring', []);
  state.settings = load('settings', state.settings);
}

function persist() {
  save('transactions', state.transactions);
  save('budgets', state.budgets);
  save('savings', state.savingsGoals);
  save('recurring', state.recurringList);
  save('settings', state.settings);
}

// ===== SUBSCRIPTION SYSTEM =====
export function subscribe(key, fn) {
  if(!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key).add(fn);
  return () => listeners.get(key).delete(fn);
}

function notify(key) {
  if(listeners.has(key)) listeners.get(key).forEach(fn => fn(state[key]));
  // Also notify wildcard listeners
  if(listeners.has('*')) listeners.get('*').forEach(fn => fn(state));
}

// ===== GETTERS =====
export function getTransactions() { return state.transactions; }
export function getBudgets() { return state.budgets; }
export function getSavingsGoals() { return state.savingsGoals; }
export function getRecurringList() { return state.recurringList; }
export function getSettings() { return state.settings; }

// ===== TRANSACTIONS =====
export function addTransaction(data) {
  state.transactions.push(data);
  persist(); notify('transactions');
}

export function updateTransaction(id, data) {
  const idx = state.transactions.findIndex(t => t.id === id);
  if(idx >= 0) {
    state.transactions[idx] = { ...state.transactions[idx], ...data };
    persist(); notify('transactions');
    return true;
  }
  return false;
}

export function deleteTransaction(id) {
  const idx = state.transactions.findIndex(t => t.id === id);
  if(idx >= 0) {
    const removed = state.transactions.splice(idx, 1)[0];
    persist(); notify('transactions');
    return removed;
  }
  return null;
}

export function restoreTransaction(item) {
  if(item && item.id) {
    state.transactions.push(item);
    persist(); notify('transactions');
  }
}

// ===== BUDGETS =====
export function addBudget(data) {
  state.budgets.push(data);
  persist(); notify('budgets');
}

export function updateBudget(id, data) {
  const idx = state.budgets.findIndex(b => b.id === id);
  if(idx >= 0) {
    state.budgets[idx] = { ...state.budgets[idx], ...data };
    persist(); notify('budgets');
    return true;
  }
  return false;
}

export function deleteBudget(id) {
  const removed = state.budgets.find(b => b.id === id);
  state.budgets = state.budgets.filter(b => b.id !== id);
  persist(); notify('budgets');
  return removed;
}

// ===== SAVINGS GOALS =====
export function addGoal(data) {
  state.savingsGoals.push(data);
  persist(); notify('savingsGoals');
}

export function updateGoal(id, data) {
  const idx = state.savingsGoals.findIndex(g => g.id === id);
  if(idx >= 0) {
    state.savingsGoals[idx] = { ...state.savingsGoals[idx], ...data };
    persist(); notify('savingsGoals');
    return true;
  }
  return false;
}

export function deleteGoal(id) {
  const removed = state.savingsGoals.find(g => g.id === id);
  state.savingsGoals = state.savingsGoals.filter(g => g.id !== id);
  persist(); notify('savingsGoals');
  return removed;
}

// ===== RECURRING =====
export function addRecurring(data) {
  state.recurringList.push(data);
  persist(); notify('recurringList');
}

export function updateRecurring(id, data) {
  const idx = state.recurringList.findIndex(r => r.id === id);
  if(idx >= 0) {
    state.recurringList[idx] = { ...state.recurringList[idx], ...data };
    persist(); notify('recurringList');
    return true;
  }
  return false;
}

export function deleteRecurring(id) {
  const removed = state.recurringList.find(r => r.id === id);
  state.recurringList = state.recurringList.filter(r => r.id !== id);
  persist(); notify('recurringList');
  return removed;
}

export function toggleRecurringActive(id) {
  const r = state.recurringList.find(x => x.id === id);
  if(r) { r.active = !r.active; persist(); notify('recurringList'); }
}

// ===== SETTINGS =====
export function updateSettings(key, value) {
  state.settings[key] = value;
  persist(); notify('settings');
}

// ===== BULK OPERATIONS =====
export function addBulkTransactions(items) {
  state.transactions.push(...items);
  persist(); notify('transactions');
}

export function replaceAllData(data) {
  if(data.transactions) state.transactions = data.transactions;
  if(data.budgets) state.budgets = data.budgets;
  if(data.savingsGoals) state.savingsGoals = data.savingsGoals;
  if(data.recurringList) state.recurringList = data.recurringList;
  persist();
  notify('transactions'); notify('budgets'); notify('savingsGoals'); notify('recurringList');
}

export function clearAllData() {
  state.transactions = [];
  state.budgets = [];
  state.savingsGoals = [];
  state.recurringList = [];
  persist();
  notify('transactions'); notify('budgets'); notify('savingsGoals'); notify('recurringList');
}
