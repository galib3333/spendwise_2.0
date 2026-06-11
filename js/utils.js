// ===== CONSTANTS =====
export const EXPENSE_CATS = [
  {id:'food',name:'Food & Dining',icon:'🍽️',color:'#fdcb6e'},
  {id:'transport',name:'Transport',icon:'🚗',color:'#74b9ff'},
  {id:'bills',name:'Bills & Utilities',icon:'💡',color:'#e17055'},
  {id:'entertainment',name:'Entertainment',icon:'🎬',color:'#fd79a8'},
  {id:'health',name:'Health',icon:'🏥',color:'#00b894'},
  {id:'shopping',name:'Shopping',icon:'🛍️',color:'#a29bfe'},
  {id:'education',name:'Education',icon:'📚',color:'#6c5ce7'},
  {id:'rent',name:'Rent',icon:'🏠',color:'#e17055'},
  {id:'groceries',name:'Groceries',icon:'🛒',color:'#00b894'},
  {id:'subscriptions',name:'Subscriptions',icon:'📱',color:'#fd79a8'},
  {id:'personal',name:'Personal Care',icon:'💇',color:'#fdcb6e'},
  {id:'other-exp',name:'Other Expense',icon:'📦',color:'#9aa0b0'}
];
export const INCOME_CATS = [
  {id:'salary',name:'Salary',icon:'💰',color:'#00b894'},
  {id:'freelance',name:'Freelance',icon:'💻',color:'#74b9ff'},
  {id:'investment',name:'Investment',icon:'📈',color:'#a29bfe'},
  {id:'business',name:'Business',icon:'🏢',color:'#fdcb6e'},
  {id:'gift',name:'Gift',icon:'🎁',color:'#fd79a8'},
  {id:'other-inc',name:'Other Income',icon:'💎',color:'#9aa0b0'}
];
export const ALL_CATS = [...EXPENSE_CATS, ...INCOME_CATS];
export const PAYMENT_LABELS = {cash:'Cash',card:'Debit Card',credit:'Credit Card',upi:'UPI',bank:'Bank Transfer',wallet:'Digital Wallet'};

// ===== HELPERS =====
export function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,8); }
export function fmt(n, currency) { return currency + Number(n||0).toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2}); }
export function fmtShort(n, currency) { return currency + Number(n||0).toLocaleString('en-IN', {maximumFractionDigits:0}); }
export function today() { return new Date().toISOString().slice(0,10); }
export function getWeekStart(d) { const dt=new Date(d); const day=dt.getDay(); dt.setDate(dt.getDate()-day); return dt; }
export function getCat(id) { return ALL_CATS.find(c=>c.id===id) || {name:'Unknown',icon:'❓',color:'#9aa0b0'}; }

export function getWeekDates(date) {
  const start = getWeekStart(new Date(date));
  const dates = [];
  for(let i=0;i<7;i++) { const d=new Date(start); d.setDate(d.getDate()+i); dates.push(d.toISOString().slice(0,10)); }
  return dates;
}

export function getMonthDates(year, month) {
  const dates = [];
  const days = new Date(year, month+1, 0).getDate();
  for(let i=1;i<=days;i++) dates.push(`${year}-${String(month+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`);
  return dates;
}

// ===== CSV ESCAPING =====
export function escapeCSV(val) {
  const s = String(val == null ? '' : val);
  if(s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

// ===== VALIDATION =====
export function validateTransaction(data) {
  const errors = [];
  if(!data.amount || isNaN(data.amount) || data.amount <= 0) errors.push('Amount must be a positive number');
  if(!data.date || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) errors.push('Invalid date format');
  if(!data.category) errors.push('Category is required');
  if(!['expense','income'].includes(data.type)) errors.push('Invalid transaction type');
  if(data.payment && !Object.keys(PAYMENT_LABELS).includes(data.payment) && data.payment !== 'auto') errors.push('Invalid payment method');
  return errors;
}

export function validateBudget(data) {
  const errors = [];
  if(!data.category) errors.push('Category is required');
  if(!data.limit || isNaN(data.limit) || data.limit <= 0) errors.push('Budget limit must be a positive number');
  return errors;
}

export function validateGoal(data) {
  const errors = [];
  if(!data.name || !data.name.trim()) errors.push('Goal name is required');
  if(!data.target || isNaN(data.target) || data.target <= 0) errors.push('Target amount must be a positive number');
  if(data.current != null && (isNaN(data.current) || data.current < 0)) errors.push('Current amount cannot be negative');
  return errors;
}

export function validateRecurring(data) {
  const errors = [];
  if(!data.amount || isNaN(data.amount) || data.amount <= 0) errors.push('Amount must be a positive number');
  if(!data.description || !data.description.trim()) errors.push('Description is required');
  if(!data.frequency || !['weekly','biweekly','monthly','quarterly','yearly'].includes(data.frequency)) errors.push('Invalid frequency');
  if(!data.category) errors.push('Category is required');
  if(!data.startDate || !/^\d{4}-\d{2}-\d{2}$/.test(data.startDate)) errors.push('Invalid start date');
  if(!data.nextDate || !/^\d{4}-\d{2}-\d{2}$/.test(data.nextDate)) errors.push('Invalid next date');
  return errors;
}

export function sanitizeImportData(data) {
  if(!data || typeof data !== 'object') return null;
  const clean = {};
  if(Array.isArray(data.transactions)) {
    clean.transactions = data.transactions.filter(t => {
      return t && typeof t === 'object' && t.id && t.amount && t.date && t.type && t.category;
    }).map(t => ({
      id: String(t.id),
      type: ['expense','income'].includes(t.type) ? t.type : 'expense',
      amount: Math.max(0, Number(t.amount) || 0),
      date: String(t.date).slice(0,10),
      category: String(t.category),
      payment: String(t.payment || 'cash'),
      description: String(t.description || '').slice(0, 200),
      tags: Array.isArray(t.tags) ? t.tags.map(tag => String(tag).slice(0, 30)).slice(0, 10) : [],
      recurring: !!t.recurring,
      frequency: t.frequency || null
    }));
  }
  if(Array.isArray(data.budgets)) {
    clean.budgets = data.budgets.filter(b => b && b.category && b.limit).map(b => ({
      id: String(b.id),
      category: String(b.category),
      limit: Math.max(0, Number(b.limit) || 0)
    }));
  }
  if(Array.isArray(data.savingsGoals)) {
    clean.savingsGoals = data.savingsGoals.filter(g => g && g.name && g.target).map(g => ({
      id: String(g.id),
      name: String(g.name).slice(0, 100),
      target: Math.max(0, Number(g.target) || 0),
      current: Math.max(0, Number(g.current) || 0),
      date: g.date || null,
      createdAt: g.createdAt || null
    }));
  }
  if(Array.isArray(data.recurringList)) {
    clean.recurringList = data.recurringList.filter(r => r && r.amount && r.description).map(r => ({
      id: String(r.id),
      amount: Math.max(0, Number(r.amount) || 0),
      description: String(r.description).slice(0, 100),
      frequency: ['weekly','biweekly','monthly','quarterly','yearly'].includes(r.frequency) ? r.frequency : 'monthly',
      category: String(r.category || 'other-exp'),
      startDate: String(r.startDate || today()),
      nextDate: String(r.nextDate || today()),
      active: r.active !== false
    }));
  }
  return clean;
}
