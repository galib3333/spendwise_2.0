// ===== DATA LAYER =====
const EXPENSE_CATS = [
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
const INCOME_CATS = [
  {id:'salary',name:'Salary',icon:'💰',color:'#00b894'},
  {id:'freelance',name:'Freelance',icon:'💻',color:'#74b9ff'},
  {id:'investment',name:'Investment',icon:'📈',color:'#a29bfe'},
  {id:'business',name:'Business',icon:'🏢',color:'#fdcb6e'},
  {id:'gift',name:'Gift',icon:'🎁',color:'#fd79a8'},
  {id:'other-inc',name:'Other Income',icon:'💎',color:'#9aa0b0'}
];
const ALL_CATS = [...EXPENSE_CATS, ...INCOME_CATS];
const PAYMENT_LABELS = {cash:'Cash',card:'Debit Card',credit:'Credit Card',upi:'UPI',bank:'Bank Transfer',wallet:'Digital Wallet'};

function loadData(key, def) { try { return JSON.parse(localStorage.getItem('sw_'+key)) || def; } catch { return def; } }
function saveData(key, val) { localStorage.setItem('sw_'+key, JSON.stringify(val)); }
let transactions = loadData('transactions', []);
let budgets = loadData('budgets', []);
let savingsGoals = loadData('savings', []);
let recurringList = loadData('recurring', []);
let settings = loadData('settings', {currency:'₹',theme:'dark',dateFormat:'YYYY-MM-DD'});

function persist() {
  saveData('transactions', transactions);
  saveData('budgets', budgets);
  saveData('savings', savingsGoals);
  saveData('recurring', recurringList);
  saveData('settings', settings);
}

// ===== UTILITIES =====
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,8); }
function fmt(n) { return settings.currency + Number(n||0).toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2}); }
function fmtShort(n) { return settings.currency + Number(n||0).toLocaleString('en-IN', {maximumFractionDigits:0}); }
function today() { return new Date().toISOString().slice(0,10); }
function getWeekStart(d) { const dt=new Date(d); const day=dt.getDay(); dt.setDate(dt.getDate()-day); return dt; }
function sameDay(a,b) { return a.slice(0,10)===b.slice(0,10); }
function getCat(id) { return ALL_CATS.find(c=>c.id===id) || {name:'Unknown',icon:'❓',color:'#9aa0b0'}; }
function getWeekDates(date) {
  const start = getWeekStart(new Date(date));
  const dates = [];
  for(let i=0;i<7;i++) { const d=new Date(start); d.setDate(d.getDate()+i); dates.push(d.toISOString().slice(0,10)); }
  return dates;
}
function getMonthDates(year, month) {
  const dates = [];
  const days = new Date(year, month+1, 0).getDate();
  for(let i=1;i<=days;i++) dates.push(`${year}-${String(month+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`);
  return dates;
}

// ===== THEME =====
function applyTheme() {
  document.documentElement.setAttribute('data-theme', settings.theme);
  document.getElementById('themeToggle').classList.toggle('active', settings.theme==='dark');
}
function toggleTheme() {
  settings.theme = settings.theme==='dark' ? 'light' : 'dark';
  applyTheme(); persist();
}

// ===== NAVIGATION =====
let currentPage = 'dashboard';
function navigate(page) {
  currentPage = page;
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.page===page));
  renderPage();
  toggleSidebar(false);
}
function toggleSidebar(force) {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('overlay');
  const open = force !== undefined ? force : !sb.classList.contains('open');
  sb.classList.toggle('open', open);
  ov.classList.toggle('show', open);
}

// ===== CATEGORIES SELECT =====
function populateCategorySelect(selectEl, type) {
  const cats = type==='income' ? INCOME_CATS : EXPENSE_CATS;
  selectEl.innerHTML = cats.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');
}

// ===== TRANSACTIONS CRUD =====
let transType = 'expense';
function setTransType(type) {
  transType = type;
  document.querySelectorAll('#typeTabs .tab').forEach((t,i) => t.classList.toggle('active', (i===0&&type==='expense')||(i===1&&type==='income')));
  populateCategorySelect(document.getElementById('txCategory'), type);
}
function openAddTransaction() {
  document.getElementById('modalTitle').textContent = 'Add Transaction';
  document.getElementById('txId').value = '';
  document.getElementById('txAmount').value = '';
  document.getElementById('txDate').value = today();
  document.getElementById('txDesc').value = '';
  document.getElementById('txTags').value = '';
  document.getElementById('txRecurring').checked = false;
  document.getElementById('recurringOptions').classList.add('hidden');
  setTransType('expense');
  document.getElementById('txSaveBtn').textContent = 'Save Transaction';
  openModal('transactionModal');
}
function openEditTransaction(id) {
  const t = transactions.find(x=>x.id===id);
  if(!t) return;
  document.getElementById('modalTitle').textContent = 'Edit Transaction';
  document.getElementById('txId').value = t.id;
  document.getElementById('txAmount').value = t.amount;
  document.getElementById('txDate').value = t.date;
  document.getElementById('txDesc').value = t.description||'';
  document.getElementById('txTags').value = (t.tags||[]).join(', ');
  document.getElementById('txRecurring').checked = !!t.recurring;
  document.getElementById('recurringOptions').classList.toggle('hidden', !t.recurring);
  if(t.recurring) document.getElementById('txFreq').value = t.frequency||'monthly';
  setTransType(t.type);
  document.getElementById('txCategory').value = t.category;
  document.getElementById('txPayment').value = t.payment||'cash';
  document.getElementById('txSaveBtn').textContent = 'Update Transaction';
  openModal('transactionModal');
}
function saveTransaction() {
  const amount = parseFloat(document.getElementById('txAmount').value);
  const date = document.getElementById('txDate').value;
  if(!amount || !date) return alert('Please fill amount and date');
  const cat = document.getElementById('txCategory').value;
  const payment = document.getElementById('txPayment').value;
  const desc = document.getElementById('txDesc').value.trim();
  const tags = document.getElementById('txTags').value.split(',').map(t=>t.trim()).filter(Boolean);
  const isRecurring = document.getElementById('txRecurring').checked;
  const freq = document.getElementById('txFreq').value;
  const id = document.getElementById('txId').value;
  if(id) {
    const idx = transactions.findIndex(t=>t.id===id);
    if(idx>=0) transactions[idx] = {...transactions[idx], type:transType, amount, date, category:cat, payment, description:desc, tags, recurring:isRecurring, frequency:freq};
  } else {
    transactions.push({id:uid(), type:transType, amount, date, category:cat, payment, description:desc, tags, recurring:isRecurring, frequency:freq});
  }
  persist(); closeModal('transactionModal'); renderPage();
}
function deleteTransaction(id) {
  if(!confirm('Delete this transaction?')) return;
  transactions = transactions.filter(t=>t.id!==id);
  persist(); renderPage();
}

// ===== BUDGETS =====
function openAddBudget() {
  document.getElementById('budgetEditId').value = '';
  document.getElementById('budgetAmount').value = '';
  const sel = document.getElementById('budgetCategory');
  populateCategorySelect(sel, 'expense');
  const used = budgets.map(b=>b.category);
  Array.from(sel.options).forEach(o => { if(used.includes(o.value)) o.disabled=true; });
  openModal('budgetModal');
}
function openEditBudget(id) {
  const b = budgets.find(x=>x.id===id);
  if(!b) return;
  document.getElementById('budgetEditId').value = b.id;
  const sel = document.getElementById('budgetCategory');
  populateCategorySelect(sel, 'expense');
  sel.value = b.category;
  document.getElementById('budgetAmount').value = b.limit;
  openModal('budgetModal');
}
function saveBudget() {
  const cat = document.getElementById('budgetCategory').value;
  const limit = parseFloat(document.getElementById('budgetAmount').value);
  if(!limit) return alert('Please enter a budget amount');
  const id = document.getElementById('budgetEditId').value;
  if(id) {
    const idx = budgets.findIndex(b=>b.id===id);
    if(idx>=0) budgets[idx] = {...budgets[idx], category:cat, limit};
  } else {
    if(budgets.find(b=>b.category===cat)) return alert('Budget already exists for this category');
    budgets.push({id:uid(), category:cat, limit});
  }
  persist(); closeModal('budgetModal'); renderPage();
}
function deleteBudget(id) {
  if(!confirm('Delete this budget?')) return;
  budgets = budgets.filter(b=>b.id!==id);
  persist(); renderPage();
}

// ===== SAVINGS GOALS =====
function openAddGoal() {
  document.getElementById('goalEditId').value = '';
  document.getElementById('goalName').value = '';
  document.getElementById('goalTarget').value = '';
  document.getElementById('goalCurrent').value = '0';
  document.getElementById('goalDate').value = '';
  openModal('savingsModal');
}
function openEditGoal(id) {
  const g = savingsGoals.find(x=>x.id===id);
  if(!g) return;
  document.getElementById('goalEditId').value = g.id;
  document.getElementById('goalName').value = g.name;
  document.getElementById('goalTarget').value = g.target;
  document.getElementById('goalCurrent').value = g.current;
  document.getElementById('goalDate').value = g.date||'';
  openModal('savingsModal');
}
function saveGoal() {
  const name = document.getElementById('goalName').value.trim();
  const target = parseFloat(document.getElementById('goalTarget').value);
  const current = parseFloat(document.getElementById('goalCurrent').value)||0;
  const date = document.getElementById('goalDate').value;
  if(!name || !target) return alert('Please fill name and target');
  const id = document.getElementById('goalEditId').value;
  if(id) {
    const idx = savingsGoals.findIndex(g=>g.id===id);
    if(idx>=0) savingsGoals[idx] = {...savingsGoals[idx], name, target, current, date};
  } else {
    savingsGoals.push({id:uid(), name, target, current, date, createdAt:today()});
  }
  persist(); closeModal('savingsModal'); renderPage();
}
function deleteGoal(id) {
  if(!confirm('Delete this goal?')) return;
  savingsGoals = savingsGoals.filter(g=>g.id!==id);
  persist(); renderPage();
}

// ===== RECURRING =====
function openAddRecurring() {
  document.getElementById('recEditId').value = '';
  document.getElementById('recAmount').value = '';
  document.getElementById('recDesc').value = '';
  document.getElementById('recStart').value = today();
  document.getElementById('recNext').value = today();
  populateCategorySelect(document.getElementById('recCategory'), 'expense');
  openModal('recurringModal');
}
function openEditRecurring(id) {
  const r = recurringList.find(x=>x.id===id);
  if(!r) return;
  document.getElementById('recEditId').value = r.id;
  document.getElementById('recAmount').value = r.amount;
  document.getElementById('recDesc').value = r.description;
  document.getElementById('recFreq').value = r.frequency;
  document.getElementById('recStart').value = r.startDate;
  document.getElementById('recNext').value = r.nextDate;
  populateCategorySelect(document.getElementById('recCategory'), 'expense');
  document.getElementById('recCategory').value = r.category;
  openModal('recurringModal');
}
function saveRecurring() {
  const amount = parseFloat(document.getElementById('recAmount').value);
  const desc = document.getElementById('recDesc').value.trim();
  const freq = document.getElementById('recFreq').value;
  const cat = document.getElementById('recCategory').value;
  const start = document.getElementById('recStart').value;
  const next = document.getElementById('recNext').value;
  if(!amount || !desc) return alert('Please fill all fields');
  const id = document.getElementById('recEditId').value;
  if(id) {
    const idx = recurringList.findIndex(r=>r.id===id);
    if(idx>=0) recurringList[idx] = {...recurringList[idx], amount, description:desc, frequency:freq, category:cat, startDate:start, nextDate:next};
  } else {
    recurringList.push({id:uid(), amount, description:desc, frequency:freq, category:cat, startDate:start, nextDate:next, active:true});
  }
  persist(); closeModal('recurringModal'); renderPage();
}
function deleteRecurring(id) {
  if(!confirm('Delete this recurring item?')) return;
  recurringList = recurringList.filter(r=>r.id!==id);
  persist(); renderPage();
}
function toggleRecurring(id) {
  const r = recurringList.find(x=>x.id===id);
  if(r) { r.active = !r.active; persist(); renderPage(); }
}

// ===== MODALS =====
function openModal(id) { document.getElementById(id).classList.add('show'); }
function closeModal(id) { document.getElementById(id).classList.remove('show'); }
document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', e => { if(e.target===m) m.classList.remove('show'); });
});

// ===== CALCULATIONS =====
function getExpenses(range, start, end) {
  return transactions.filter(t => t.type==='expense' && t.date >= start && t.date <= end);
}
function getIncome(range, start, end) {
  return transactions.filter(t => t.type==='income' && t.date >= start && t.date <= end);
}
function sumByCategory(items) {
  const map = {};
  items.forEach(t => { map[t.category] = (map[t.category]||0) + t.amount; });
  return Object.entries(map).map(([cat,val]) => ({category:cat, amount:val})).sort((a,b)=>b.amount-a.amount);
}
function sumByDay(items) {
  const map = {};
  items.forEach(t => { map[t.date] = (map[t.date]||0) + t.amount; });
  return Object.entries(map).sort((a,b) => a[0].localeCompare(b[0]));
}
function sumByMonth(items) {
  const map = {};
  items.forEach(t => { const m=t.date.slice(0,7); map[m]=(map[m]||0)+t.amount; });
  return Object.entries(map).sort((a,b)=>a[0].localeCompare(b[0]));
}
function sumByPayment(items) {
  const map = {};
  items.forEach(t => { map[t.payment] = (map[t.payment]||0)+t.amount; });
  return Object.entries(map).map(([k,v])=>({payment:k,amount:v})).sort((a,b)=>b.amount-a.amount);
}

// ===== CHART DRAWING =====
function drawPieChart(canvasId, data, total) {
  const canvas = document.getElementById(canvasId);
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.parentElement.clientWidth;
  const h = 220;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  ctx.scale(dpr, dpr);
  ctx.clearRect(0,0,w,h);
  if(!data.length) { ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--text3'); ctx.font='14px '+getComputedStyle(document.body).fontFamily; ctx.textAlign='center'; ctx.fillText('No data yet',w/2,h/2); return; }
  const cx = h/2, cy = h/2, r = Math.min(cx,cy)-20;
  let start = -Math.PI/2;
  data.forEach((d,i) => {
    const angle = (d.amount/total)*Math.PI*2;
    ctx.beginPath();
    ctx.moveTo(cx,cy);
    ctx.arc(cx,cy,r,start,start+angle);
    ctx.closePath();
    ctx.fillStyle = getCat(d.category).color;
    ctx.fill();
    if(angle > 0.15) {
      const mid = start + angle/2;
      const tx = cx + Math.cos(mid)*(r*0.6);
      const ty = cy + Math.sin(mid)*(r*0.6);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px ' + getComputedStyle(document.body).fontFamily;
      ctx.textAlign = 'center';
      ctx.fillText(Math.round(d.amount/total*100)+'%', tx, ty);
    }
    start += angle;
  });
  ctx.beginPath();
  ctx.arc(cx,cy,r*0.45,0,Math.PI*2);
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg2');
  ctx.fill();
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text');
  ctx.font = 'bold 16px ' + getComputedStyle(document.body).fontFamily;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(fmt(total), cx, cy-8);
  ctx.font = '11px ' + getComputedStyle(document.body).fontFamily;
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text3');
  ctx.fillText('Total', cx, cy+10);
}

function drawBarChart(canvasId, data, labels, color) {
  const canvas = document.getElementById(canvasId);
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.parentElement.clientWidth;
  const h = 200;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  ctx.scale(dpr, dpr);
  ctx.clearRect(0,0,w,h);
  if(!data.length) { ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--text3'); ctx.font='14px '+getComputedStyle(document.body).fontFamily; ctx.textAlign='center'; ctx.fillText('No data yet',w/2,h/2); return; }
  const maxVal = Math.max(...data, 1);
  const barW = Math.min(40, (w-60)/data.length - 8);
  const chartH = h - 50;
  const startX = 40;
  data.forEach((v,i) => {
    const x = startX + i*(barW+8) + 4;
    const barH = (v/maxVal)*chartH;
    const y = h - 30 - barH;
    const grad = ctx.createLinearGradient(x,y,x,h-30);
    grad.addColorStop(0, color);
    grad.addColorStop(1, color+'44');
    ctx.fillStyle = grad;
    roundRect(ctx, x, y, barW, barH, 4);
    ctx.fill();
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text3');
    ctx.font = '9px ' + getComputedStyle(document.body).fontFamily;
    ctx.textAlign = 'center';
    ctx.fillText(labels[i], x+barW/2, h-14);
    if(v>0) {
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text2');
      ctx.font = '9px ' + getComputedStyle(document.body).fontFamily;
      ctx.fillText(fmtShort(v), x+barW/2, y-6);
    }
  });
}
function roundRect(ctx,x,y,w,h,r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r);
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r);
  ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.closePath();
}

function drawLineChart(canvasId, data, labels, color) {
  const canvas = document.getElementById(canvasId);
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.parentElement.clientWidth;
  const h = 200;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  ctx.scale(dpr, dpr);
  ctx.clearRect(0,0,w,h);
  if(data.length < 2) { ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--text3'); ctx.font='14px '+getComputedStyle(document.body).fontFamily; ctx.textAlign='center'; ctx.fillText('Need more data',w/2,h/2); return; }
  const maxVal = Math.max(...data, 1);
  const chartH = h - 50;
  const startX = 40;
  const stepX = (w - 60) / (data.length - 1);
  const pts = data.map((v,i) => ({x: startX + i*stepX, y: h - 30 - (v/maxVal)*chartH}));
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  pts.forEach((p,i) => { if(i>0) ctx.lineTo(p.x, p.y); });
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.stroke();
  const grad = ctx.createLinearGradient(0,0,0,h);
  grad.addColorStop(0, color+'33');
  grad.addColorStop(1, color+'00');
  ctx.lineTo(pts[pts.length-1].x, h-30);
  ctx.lineTo(pts[0].x, h-30);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();
  pts.forEach((p,i) => {
    ctx.beginPath();
    ctx.arc(p.x,p.y,4,0,Math.PI*2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p.x,p.y,2,0,Math.PI*2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    if(i%Math.max(1,Math.floor(data.length/7))===0) {
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text3');
      ctx.font = '9px ' + getComputedStyle(document.body).fontFamily;
      ctx.textAlign = 'center';
      ctx.fillText(labels[i], p.x, h-14);
    }
  });
}

// ===== RENDER PAGES =====
function renderPage() {
  const main = document.getElementById('mainContent');
  switch(currentPage) {
    case 'dashboard': renderDashboard(); break;
    case 'transactions': renderTransactions(); break;
    case 'weekly': renderWeekly(); break;
    case 'monthly': renderMonthly(); break;
    case 'yearly': renderYearly(); break;
    case 'budgets': renderBudgets(); break;
    case 'recurring': renderRecurring(); break;
    case 'savings': renderSavings(); break;
    case 'export': renderExport(); break;
    case 'settings': renderSettings(); break;
    default: renderDashboard();
  }
}

// ===== DASHBOARD =====
function calcHealthScore() {
  const t = today();
  const now = new Date();
  const monthStart = t.slice(0,7) + '-01';
  const monthEnd = new Date(now.getFullYear(), now.getMonth()+1, 0).toISOString().slice(0,10);
  const lastMonth = new Date(now.getFullYear(), now.getMonth()-1, 1);
  const lmStart = lastMonth.toISOString().slice(0,7) + '-01';
  const lmEnd = new Date(lastMonth.getFullYear(), lastMonth.getMonth()+1, 0).toISOString().slice(0,10);

  const thisMonthExp = getExpenses('month', monthStart, monthEnd);
  const lastMonthExp = getExpenses('month', lmStart, lmEnd);
  const thisMonthInc = getIncome('month', monthStart, monthEnd);
  const lastMonthInc = getIncome('month', lmStart, lmEnd);
  const totalExp = thisMonthExp.reduce((s,x)=>s+x.amount, 0);
  const totalInc = thisMonthInc.reduce((s,x)=>s+x.amount, 0);
  const totalExpLast = lastMonthExp.reduce((s,x)=>s+x.amount, 0);
  const totalIncLast = lastMonthInc.reduce((s,x)=>s+x.amount, 0);

  let score = 50;

  if(totalInc > 0) {
    const savingsRate = Math.max(0, (totalInc - totalExp) / totalInc);
    score += savingsRate * 30;
  }

  const budgetScore = budgets.reduce((acc, b) => {
    const spent = thisMonthExp.filter(e => e.category === b.category).reduce((s,x)=>s+x.amount, 0);
    const ratio = spent / b.limit;
    if(ratio <= 0.8) return acc + 1;
    if(ratio <= 1.0) return acc + 0.5;
    return acc;
  }, 0);
  if(budgets.length > 0) score += (budgetScore / budgets.length) * 10;

  if(totalExpLast > 0) {
    const expChange = (totalExp - totalExpLast) / totalExpLast;
    if(expChange < -0.1) score += 5;
    else if(expChange > 0.2) score -= 5;
  }

  if(transactions.length === 0) score = 0;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function getScoreGrade(score) {
  if(score >= 85) return { grade:'A', color:'var(--green)', msg:'Excellent financial health. Keep it up!' };
  if(score >= 70) return { grade:'B', color:'var(--green)', msg:'Good standing. Small tweaks could make it better.' };
  if(score >= 50) return { grade:'C', color:'var(--yellow)', msg:'Fair. Some areas need attention this month.' };
  if(score >= 30) return { grade:'D', color:'var(--orange)', msg:'Needs improvement. Review your spending habits.' };
  return { grade:'F', color:'var(--red)', msg:'Critical. Time to take control of your finances.' };
}

function getDashboardInsights() {
  const t = today();
  const now = new Date();
  const monthStart = t.slice(0,7) + '-01';
  const monthEnd = new Date(now.getFullYear(), now.getMonth()+1, 0).toISOString().slice(0,10);
  const lastMonth = new Date(now.getFullYear(), now.getMonth()-1, 1);
  const lmStart = lastMonth.toISOString().slice(0,7) + '-01';
  const lmEnd = new Date(lastMonth.getFullYear(), lastMonth.getMonth()+1, 0).toISOString().slice(0,10);

  const thisMonthExp = getExpenses('month', monthStart, monthEnd);
  const lastMonthExp = getExpenses('month', lmStart, lmEnd);
  const totalExp = thisMonthExp.reduce((s,x)=>s+x.amount, 0);
  const totalExpLast = lastMonthExp.reduce((s,x)=>s+x.amount, 0);
  const insights = [];

  if(totalExpLast > 0) {
    const change = ((totalExp - totalExpLast) / totalExpLast * 100);
    if(Math.abs(change) > 5) {
      const dir = change > 0 ? 'up' : 'down';
      insights.push({
        text: `Overall spending is <strong>${dir === 'up' ? 'up' : 'down'} ${Math.abs(change).toFixed(0)}%</strong> vs last month`,
        color: dir === 'up' ? 'var(--red)' : 'var(--green)',
        change: `${dir === 'up' ? '+' : '-'}${Math.abs(change).toFixed(0)}%`,
        changeColor: dir === 'up' ? 'var(--red)' : 'var(--green)'
      });
    }
  }

  const thisCats = sumByCategory(thisMonthExp);
  const lastCats = sumByCategory(lastMonthExp);
  const lastCatMap = Object.fromEntries(lastCats.map(c => [c.category, c.amount]));
  for(const cat of thisCats.slice(0, 3)) {
    const lastAmt = lastCatMap[cat.category] || 0;
    if(lastAmt > 0) {
      const catChange = ((cat.amount - lastAmt) / lastAmt * 100);
      if(Math.abs(catChange) > 15) {
        const info = getCat(cat.category);
        insights.push({
          text: `<strong>${info.name}</strong> spending ${catChange > 0 ? 'increased' : 'decreased'} ${Math.abs(catChange).toFixed(0)}% — ${fmt(lastAmt)} → ${fmt(cat.amount)}`,
          color: catChange > 0 ? 'var(--red)' : 'var(--green)',
          change: `${catChange > 0 ? '+' : '-'}${Math.abs(catChange).toFixed(0)}%`,
          changeColor: catChange > 0 ? 'var(--red)' : 'var(--green)'
        });
      }
    }
  }

  if(thisMonthExp.length > 0) {
    const topExp = thisMonthExp.reduce((max, x) => x.amount > max.amount ? x : max, thisMonthExp[0]);
    const topCat = getCat(topExp.category);
    insights.push({
      text: `Largest expense: <strong>${topExp.description || topCat.name}</strong> at ${fmt(topExp.amount)}`,
      color: 'var(--accent)',
      change: '',
      changeColor: ''
    });
  }

  const daysInMonth = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
  const dayOfMonth = now.getDate();
  const daysLeft = daysInMonth - dayOfMonth;
  if(totalExpLast > 0 && daysLeft > 0) {
    const dailyAvg = totalExp / dayOfMonth;
    const projected = dailyAvg * daysInMonth;
    if(projected > totalExpLast * 1.15) {
      insights.push({
        text: `At current pace, you'll spend <strong>${fmt(projected)}</strong> by month end (${((projected/totalExpLast - 1)*100).toFixed(0)}% over last month)`,
        color: 'var(--orange)',
        change: 'PROJECTED',
        changeColor: 'var(--orange)'
      });
    }
  }

  return insights;
}

function getDashboardPrompts() {
  const t = today();
  const now = new Date();
  const monthStart = t.slice(0,7) + '-01';
  const monthEnd = new Date(now.getFullYear(), now.getMonth()+1, 0).toISOString().slice(0,10);
  const prompts = [];

  const upcomingRecurring = recurringList.filter(r => r.active && r.nextDate <= t);
  const futureRecurring = recurringList.filter(r => r.active && r.nextDate > t && r.nextDate <= new Date(now.getTime() + 7*86400000).toISOString().slice(0,10));
  if(upcomingRecurring.length > 0) {
    const total = upcomingRecurring.reduce((s,r)=>s+r.amount, 0);
    prompts.push({
      icon: '🔄',
      bg: 'var(--blue)',
      title: 'Due Now',
      text: `${upcomingRecurring.length} recurring charge${upcomingRecurring.length>1?'s':''} — ${fmt(total)}`
    });
  } else if(futureRecurring.length > 0) {
    const total = futureRecurring.reduce((s,r)=>s+r.amount, 0);
    prompts.push({
      icon: '📅',
      bg: 'var(--yellow)',
      title: 'Coming Up',
      text: `${futureRecurring.length} charge${futureRecurring.length>1?'s':''} in 7 days — ${fmt(total)}`
    });
  }

  const thisMonthExp = getExpenses('month', monthStart, monthEnd);
  const totalExp = thisMonthExp.reduce((s,x)=>s+x.amount, 0);
  budgets.forEach(b => {
    const spent = thisMonthExp.filter(e => e.category === b.category).reduce((s,x)=>s+x.amount, 0);
    const ratio = spent / b.limit;
    if(ratio >= 0.85 && ratio < 1.0) {
      const info = getCat(b.category);
      prompts.push({
        icon: info.icon,
        bg: 'var(--yellow)',
        title: 'Budget Warning',
        text: `${info.name}: ${Math.round(ratio*100)}% used — ${fmt(b.limit - spent)} left`
      });
    } else if(ratio >= 1.0) {
      const info = getCat(b.category);
      prompts.push({
        icon: info.icon,
        bg: 'var(--red)',
        title: 'Over Budget',
        text: `${info.name}: ${fmt(spent)} of ${fmt(b.limit)} — ${fmt(spent - b.limit)} over`
      });
    }
  });

  savingsGoals.forEach(g => {
    const pct = g.target > 0 ? (g.current / g.target) * 100 : 0;
    if(pct >= 80 && pct < 100) {
      prompts.push({
        icon: '🎯',
        bg: 'var(--green)',
        title: 'Goal Almost There',
        text: `"${g.name}" is ${Math.round(pct)}% — ${fmt(g.target - g.current)} to go`
      });
    } else if(pct >= 100) {
      prompts.push({
        icon: '🎉',
        bg: 'var(--green)',
        title: 'Goal Reached',
        text: `You hit your "${g.name}" target!`
      });
    }
  });

  const daysInMonth = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
  const dayOfMonth = now.getDate();
  if(dayOfMonth > 5 && totalExp === 0) {
    prompts.push({
      icon: '💸',
      bg: 'var(--accent)',
      title: 'No Activity',
      text: `No expenses logged this month yet — ${daysInMonth - dayOfMonth} days left`
    });
  }

  return prompts;
}

function drawHealthRing(canvasId, score) {
  const canvas = document.getElementById(canvasId);
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const size = 100;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = size + 'px';
  canvas.style.height = size + 'px';
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, size, size);

  const cx = size / 2, cy = size / 2, r = 40, lw = 7;
  const startAngle = -Math.PI / 2;
  const pct = score / 100;

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg4').trim();
  ctx.lineWidth = lw;
  ctx.stroke();

  if(score > 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle, startAngle + pct * Math.PI * 2);
    const grade = getScoreGrade(score);
    ctx.strokeStyle = grade.color;
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    ctx.stroke();
  }
}

function renderDashboard() {
  const t = today();
  const now = new Date();
  const monthStart = t.slice(0,7) + '-01';
  const monthEnd = new Date(now.getFullYear(), now.getMonth()+1, 0).toISOString().slice(0,10);

  const thisMonthExp = getExpenses('month', monthStart, monthEnd);
  const thisMonthInc = getIncome('month', monthStart, monthEnd);
  const totalExp = thisMonthExp.reduce((s,x)=>s+x.amount, 0);
  const totalInc = thisMonthInc.reduce((s,x)=>s+x.amount, 0);
  const savings = totalInc - totalExp;

  const score = calcHealthScore();
  const { grade, color: scoreColor, msg } = getScoreGrade(score);
  const insights = getDashboardInsights();
  const prompts = getDashboardPrompts();
  const catData = sumByCategory(thisMonthExp);

  const main = document.getElementById('mainContent');
  main.innerHTML = `
    <div class="fade-in">
      <div class="header">
        <div>
          <h2>Dashboard</h2>
          <p class="text-sm text-muted">${now.toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</p>
        </div>
      </div>

      <div class="health-score">
        <div class="health-ring">
          <canvas id="healthRing"></canvas>
          <div class="score-text">
            <span class="score-num" style="color:${scoreColor}">${score}</span>
            <span class="score-label">Score</span>
          </div>
        </div>
        <div class="health-info">
          <div class="health-grade">Grade: <span style="color:${scoreColor}">${grade}</span></div>
          <div class="health-message">${msg}</div>
        </div>
      </div>

      ${prompts.length ? `
        <div class="prompts-grid">
          ${prompts.map(p => `
            <div class="prompt-card">
              <div class="prompt-icon" style="background:${p.bg}22;color:${p.bg}">${p.icon}</div>
              <div class="prompt-text">
                <div class="prompt-title">${p.title}</div>
                <div class="prompt-value">${p.text}</div>
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${insights.length ? `
        <div class="insights-panel">
          <div class="insights-header">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            Insights
          </div>
          ${insights.map(i => `
            <div class="insight-row">
              <div class="insight-dot" style="background:${i.color}"></div>
              <div class="insight-text">${i.text}</div>
              ${i.change ? `<div class="insight-change" style="color:${i.changeColor}">${i.change}</div>` : ''}
            </div>
          `).join('')}
        </div>
      ` : ''}

      <div class="cards-grid" style="grid-template-columns:repeat(3,1fr)">
        <div class="card">
          <div class="card-label">💰 Monthly Income</div>
          <div class="card-value green">${fmt(totalInc)}</div>
        </div>
        <div class="card">
          <div class="card-label">💸 Monthly Expenses</div>
          <div class="card-value red">${fmt(totalExp)}</div>
        </div>
        <div class="card">
          <div class="card-label">📊 Net Savings</div>
          <div class="card-value ${savings>=0?'green':'red'}">${fmt(savings)}</div>
        </div>
      </div>

      <div class="grid-3">
        <div class="panel">
          <div class="panel-header">
            <h3>Spending Breakdown</h3>
            <span class="text-sm text-muted">This month</span>
          </div>
          <div class="chart-split" style="display:flex;gap:20px;align-items:center;flex-wrap:wrap">
            <div class="chart-container" style="flex:1;min-width:180px;max-width:240px">
              <canvas id="dashPie"></canvas>
            </div>
            <div style="flex:1;min-width:200px">
              ${catData.length ? catData.map(c => `
                <div class="flex flex-center flex-between mb-8">
                  <div class="flex flex-center gap-8">
                    <div style="width:10px;height:10px;border-radius:50%;background:${getCat(c.category).color}"></div>
                    <span class="text-sm">${getCat(c.category).icon} ${getCat(c.category).name}</span>
                  </div>
                  <span class="text-sm" style="font-weight:600">${fmt(c.amount)}</span>
                </div>
              `).join('') : '<p class="text-muted text-sm">No expenses this month</p>'}
            </div>
          </div>
        </div>
        <div class="panel">
          <div class="panel-header">
            <h3>Monthly Trend</h3>
          </div>
          <div class="chart-container">
            <canvas id="dashBar"></canvas>
          </div>
        </div>
      </div>
    </div>
  `;
  setTimeout(() => {
    drawHealthRing('healthRing', score);
    drawPieChart('dashPie', catData, totalExp);
    const last6 = [];
    const labels = [];
    for(let i=5;i>=0;i--) {
      const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
      const ms = d.toISOString().slice(0,7) + '-01';
      const me = new Date(d.getFullYear(), d.getMonth()+1, 0).toISOString().slice(0,10);
      last6.push(getExpenses('m', ms, me).reduce((s,x)=>s+x.amount, 0));
      labels.push(d.toLocaleDateString('en-US',{month:'short'}));
    }
    drawBarChart('dashBar', last6, labels, '#6c5ce7');
  }, 50);
}

// ===== TRANSACTIONS PAGE =====
function renderTransactions() {
  const sorted = [...transactions].sort((a,b)=>b.date.localeCompare(a.date));
  const main = document.getElementById('mainContent');
  main.innerHTML = `
    <div class="fade-in">
      <div class="header">
        <h2>Transactions</h2>
        <div class="header-actions">
          <div class="search-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" class="input" id="searchInput" placeholder="Search transactions..." oninput="filterTransactions()" style="width:220px">
          </div>
          <select class="input" id="filterType" onchange="filterTransactions()" style="width:130px">
            <option value="all">All Types</option>
            <option value="expense">Expenses</option>
            <option value="income">Income</option>
          </select>
          <select class="input" id="filterCat" onchange="filterTransactions()" style="width:150px">
            <option value="all">All Categories</option>
            ${ALL_CATS.map(c=>`<option value="${c.id}">${c.icon} ${c.name}</option>`).join('')}
          </select>
          <select class="input" id="filterPayment" onchange="filterTransactions()" style="width:150px">
            <option value="all">All Payments</option>
            ${Object.entries(PAYMENT_LABELS).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}
          </select>
          <button class="btn btn-primary" onclick="openAddTransaction()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add
          </button>
        </div>
      </div>
      <div class="panel">
        <div class="tx-table-wrapper">
          <table class="tx-table table" id="txTable">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Payment</th>
                <th>Tags</th>
                <th class="text-right">Amount</th>
                <th style="width:80px"></th>
              </tr>
            </thead>
            <tbody id="txBody"></tbody>
          </table>
        </div>
        <div id="txEmpty" class="empty-state hidden">
          <p>No transactions found</p>
        </div>
      </div>
    </div>
  `;
  filterTransactions();
}
function filterTransactions() {
  const search = (document.getElementById('searchInput')?.value||'').toLowerCase();
  const type = document.getElementById('filterType')?.value||'all';
  const cat = document.getElementById('filterCat')?.value||'all';
  const pay = document.getElementById('filterPayment')?.value||'all';
  let filtered = [...transactions].sort((a,b)=>b.date.localeCompare(a.date));
  if(type!=='all') filtered = filtered.filter(t=>t.type===type);
  if(cat!=='all') filtered = filtered.filter(t=>t.category===cat);
  if(pay!=='all') filtered = filtered.filter(t=>t.payment===pay);
  if(search) filtered = filtered.filter(t => (t.description||'').toLowerCase().includes(search) || (t.tags||[]).some(tag=>tag.toLowerCase().includes(search)) || getCat(t.category).name.toLowerCase().includes(search));
  
  const tbody = document.getElementById('txBody');
  const empty = document.getElementById('txEmpty');
  if(!filtered.length) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  tbody.innerHTML = filtered.map(t => {
    const cat = getCat(t.category);
    const payLabel = PAYMENT_LABELS[t.payment]||t.payment;
    return `
      <tr>
        <td class="text-sm">${t.date}</td>
        <td>
          <div class="flex flex-center gap-8">
            <div class="transaction-icon" style="background:${cat.color}22;color:${cat.color};font-size:0.9rem">${cat.icon}</div>
            <div>
              <div style="font-weight:500">${t.description || cat.name}</div>
              ${t.recurring ? '<span class="recurring-badge">🔄 Recurring</span>' : ''}
            </div>
          </div>
        </td>
        <td><span class="tag tag-${t.category}">${cat.name}</span></td>
        <td class="text-sm text-muted">${payLabel}</td>
        <td>${(t.tags||[]).map(tag=>`<span class="tag tag-other" style="margin-right:4px">${tag}</span>`).join('')}</td>
        <td class="text-right" style="font-weight:600;color:${t.type==='expense'?'var(--red)':'var(--green)'}">
          ${t.type==='expense'?'-':'+'} ${fmt(t.amount)}
        </td>
        <td>
          <div class="flex gap-8" style="justify-content:flex-end">
            <button class="btn btn-ghost btn-sm btn-icon" onclick="openEditTransaction('${t.id}')" title="Edit">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn btn-ghost btn-sm btn-icon" onclick="deleteTransaction('${t.id}')" title="Delete">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ===== WEEKLY REPORT =====
function renderWeekly() {
  const t = new Date();
  const weekDates = getWeekDates(t);
  const weekStart = weekDates[0];
  const weekEnd = weekDates[6];
  const exp = getExpenses('week', weekStart, weekEnd);
  const inc = getIncome('week', weekStart, weekEnd);
  const totalExp = exp.reduce((s,t)=>s+t.amount,0);
  const totalInc = inc.reduce((s,t)=>s+t.amount,0);
  const dailyExp = sumByDay(exp);
  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const dailyData = weekDates.map(d => exp.filter(t=>t.date===d).reduce((s,t)=>s+t.amount,0));
  const dailyLabels = weekDates.map(d => { const dt=new Date(d+'T00:00:00'); return dayNames[dt.getDay()]; });
  const catData = sumByCategory(exp);
  
  const main = document.getElementById('mainContent');
  main.innerHTML = `
    <div class="fade-in">
      <div class="header">
        <div>
          <h2>Weekly Report</h2>
          <p class="text-sm text-muted">${new Date(weekStart+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})} — ${new Date(weekEnd+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</p>
        </div>
      </div>
      <div class="cards-grid">
        <div class="card"><div class="card-label">💸 Total Spent</div><div class="card-value red">${fmt(totalExp)}</div></div>
        <div class="card"><div class="card-label">💰 Income</div><div class="card-value green">${fmt(totalInc)}</div></div>
        <div class="card"><div class="card-label">📊 Transactions</div><div class="card-value accent">${exp.length + inc.length}</div></div>
        <div class="card"><div class="card-label">📈 Avg/Day</div><div class="card-value yellow">${fmt(totalExp/7)}</div></div>
      </div>
      <div class="grid-2">
        <div class="panel">
          <div class="panel-header"><h3>Daily Spending</h3></div>
          <canvas id="weeklyBar"></canvas>
        </div>
        <div class="panel">
          <div class="panel-header"><h3>By Category</h3></div>
          <div class="chart-split" style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
            <div style="flex:1;min-width:140px;max-width:200px">
              <canvas id="weeklyPie"></canvas>
            </div>
            <div style="flex:1;min-width:160px">
              ${catData.map(c=>`
                <div class="flex flex-center flex-between mb-8">
                  <div class="flex flex-center gap-8">
                    <div style="width:8px;height:8px;border-radius:50%;background:${getCat(c.category).color}"></div>
                    <span class="text-sm">${getCat(c.category).icon} ${getCat(c.category).name}</span>
                  </div>
                  <span class="text-sm" style="font-weight:600">${fmt(c.amount)}</span>
                </div>
              `).join('') || '<p class="text-muted text-sm">No expenses</p>'}
            </div>
          </div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-header"><h3>Top Expenses This Week</h3></div>
        ${exp.sort((a,b)=>b.amount-a.amount).slice(0,5).map(t => {
          const cat = getCat(t.category);
          return `
            <div class="flex flex-center flex-between" style="padding:8px 0;border-bottom:1px solid var(--border)">
              <div class="flex flex-center gap-8">
                <div class="transaction-icon" style="background:${cat.color}22;color:${cat.color}">${cat.icon}</div>
                <div>
                  <div class="text-sm" style="font-weight:500">${t.description||cat.name}</div>
                  <div class="text-sm text-muted">${t.date}</div>
                </div>
              </div>
              <span style="font-weight:600;color:var(--red)">- ${fmt(t.amount)}</span>
            </div>
          `;
        }).join('') || '<p class="empty-state text-muted">No expenses this week</p>'}
      </div>
    </div>
  `;
  setTimeout(() => {
    drawBarChart('weeklyBar', dailyData, dailyLabels, '#e17055');
    drawPieChart('weeklyPie', catData, totalExp);
  }, 50);
}

// ===== MONTHLY REPORT =====
function renderMonthly() {
  const now = new Date();
  const monthStart = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-01';
  const monthEnd = new Date(now.getFullYear(), now.getMonth()+1, 0).toISOString().slice(0,10);
  const exp = getExpenses('month', monthStart, monthEnd);
  const inc = getIncome('month', monthStart, monthEnd);
  const totalExp = exp.reduce((s,t)=>s+t.amount,0);
  const totalInc = inc.reduce((s,t)=>s+t.amount,0);
  const catData = sumByCategory(exp);
  const payData = sumByPayment(exp);
  const dailyExp = sumByDay(exp);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
  const dailyData = [];
  const dailyLabels = [];
  for(let i=1;i<=daysInMonth;i++) {
    const d = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(i).padStart(2,'0');
    dailyData.push(exp.filter(t=>t.date===d).reduce((s,t)=>s+t.amount,0));
    dailyLabels.push(i.toString());
  }
  const catSpending = catData.map(c => ({...c, pct: totalExp ? (c.amount/totalExp*100) : 0}));
  const avgPerDay = totalExp / daysInMonth;
  const topDay = dailyExp.length ? dailyExp.reduce((a,b)=>b[1]>a[1]?b:a, ['',[0]]) : ['',[0]];

  const main = document.getElementById('mainContent');
  main.innerHTML = `
    <div class="fade-in">
      <div class="header">
        <h2>Monthly Report — ${now.toLocaleDateString('en-US',{month:'long',year:'numeric'})}</h2>
      </div>
      <div class="cards-grid">
        <div class="card"><div class="card-label">💸 Total Expenses</div><div class="card-value red">${fmt(totalExp)}</div></div>
        <div class="card"><div class="card-label">💰 Total Income</div><div class="card-value green">${fmt(totalInc)}</div></div>
        <div class="card"><div class="card-label">🏦 Net Balance</div><div class="card-value ${totalInc-totalExp>=0?'green':'red'}">${fmt(totalInc-totalExp)}</div></div>
        <div class="card"><div class="card-label">📅 Avg Daily</div><div class="card-value accent">${fmt(avgPerDay)}</div></div>
      </div>
      <div class="grid-2">
        <div class="panel">
          <div class="panel-header"><h3>Daily Expense Trend</h3></div>
          <canvas id="monthlyLine"></canvas>
        </div>
        <div class="panel">
          <div class="panel-header"><h3>Category Breakdown</h3></div>
          <div class="chart-split" style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
            <div style="flex:1;min-width:140px;max-width:200px">
              <canvas id="monthlyPie"></canvas>
            </div>
            <div style="flex:1;min-width:180px">
              ${catSpending.map(c=>`
                <div style="margin-bottom:10px">
                  <div class="flex flex-center flex-between mb-8">
                    <span class="text-sm">${getCat(c.category).icon} ${getCat(c.category).name}</span>
                    <span class="text-sm" style="font-weight:600">${fmt(c.amount)} <span class="text-muted">(${c.pct.toFixed(0)}%)</span></span>
                  </div>
                  <div class="progress-bar">
                    <div class="progress-fill" style="width:${c.pct}%;background:${getCat(c.category).color}"></div>
                  </div>
                </div>
              `).join('') || '<p class="text-muted text-sm">No expenses</p>'}
            </div>
          </div>
        </div>
      </div>
      <div class="grid-2">
        <div class="panel">
          <div class="panel-header"><h3>Payment Methods</h3></div>
          ${payData.map(p=>`
            <div class="flex flex-center flex-between" style="padding:10px 0;border-bottom:1px solid var(--border)">
              <span class="text-sm">${PAYMENT_LABELS[p.payment]||p.payment}</span>
              <div class="flex flex-center gap-8">
                <div class="progress-bar" style="width:100px">
                  <div class="progress-fill" style="width:${totalExp?(p.amount/totalExp*100):0}%;background:var(--accent)"></div>
                </div>
                <span class="text-sm" style="font-weight:600;min-width:80px;text-align:right">${fmt(p.amount)}</span>
              </div>
            </div>
          `).join('') || '<p class="text-muted text-sm">No data</p>'}
        </div>
        <div class="panel">
          <div class="panel-header"><h3>Highlights</h3></div>
          <div class="flex flex-center gap-8 mb-16" style="padding:12px;background:var(--bg3);border-radius:var(--radius-sm)">
            <span style="font-size:1.5rem">🏆</span>
            <div>
              <div class="text-sm" style="font-weight:600">Highest Spending Day</div>
              <div class="text-sm text-muted">${topDay[0] ? new Date(topDay[0]+'T00:00:00').toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'}) : 'N/A'} — ${fmt(topDay[1])}</div>
            </div>
          </div>
          <div class="flex flex-center gap-8 mb-16" style="padding:12px;background:var(--bg3);border-radius:var(--radius-sm)">
            <span style="font-size:1.5rem">${catData.length ? getCat(catData[0].category).icon : '📊'}</span>
            <div>
              <div class="text-sm" style="font-weight:600">Top Category</div>
              <div class="text-sm text-muted">${catData.length ? getCat(catData[0].category).name+' — '+fmt(catData[0].amount) : 'N/A'}</div>
            </div>
          </div>
          <div class="flex flex-center gap-8" style="padding:12px;background:var(--bg3);border-radius:var(--radius-sm)">
            <span style="font-size:1.5rem">📝</span>
            <div>
              <div class="text-sm" style="font-weight:600">Total Transactions</div>
              <div class="text-sm text-muted">${exp.length} expenses, ${inc.length} income</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  setTimeout(() => {
    drawLineChart('monthlyLine', dailyData, dailyLabels, '#e17055');
    drawPieChart('monthlyPie', catData, totalExp);
  }, 50);
}

// ===== YEARLY REPORT =====
function renderYearly() {
  const now = new Date();
  const year = now.getFullYear();
  const yearStart = year + '-01-01';
  const yearEnd = year + '-12-31';
  const exp = getExpenses('year', yearStart, yearEnd);
  const inc = getIncome('year', yearStart, yearEnd);
  const totalExp = exp.reduce((s,t)=>s+t.amount,0);
  const totalInc = inc.reduce((s,t)=>s+t.amount,0);
  const catData = sumByCategory(exp);
  const monthData = sumByMonth(exp);
  const incMonthData = sumByMonth(inc);
  
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const expByMonth = [];
  const incByMonth = [];
  const monthLabels = [];
  for(let i=0;i<12;i++) {
    const ms = year+'-'+String(i+1).padStart(2,'0')+'-01';
    const me = new Date(year, i+1, 0).toISOString().slice(0,10);
    expByMonth.push(getExpenses('m', ms, me).reduce((s,t)=>s+t.amount,0));
    incByMonth.push(getIncome('m', ms, me).reduce((s,t)=>s+t.amount,0));
    monthLabels.push(monthNames[i]);
  }

  const main = document.getElementById('mainContent');
  main.innerHTML = `
    <div class="fade-in">
      <div class="header"><h2>Yearly Report — ${year}</h2></div>
      <div class="cards-grid">
        <div class="card"><div class="card-label">💸 Total Expenses</div><div class="card-value red">${fmt(totalExp)}</div></div>
        <div class="card"><div class="card-label">💰 Total Income</div><div class="card-value green">${fmt(totalInc)}</div></div>
        <div class="card"><div class="card-label">🏦 Net Savings</div><div class="card-value ${totalInc-totalExp>=0?'green':'red'}">${fmt(totalInc-totalExp)}</div></div>
        <div class="card"><div class="card-label">📊 Savings Rate</div><div class="card-value accent">${totalInc ? ((totalInc-totalExp)/totalInc*100).toFixed(1) : 0}%</div></div>
      </div>
      <div class="panel mb-20">
        <div class="panel-header"><h3>Monthly Comparison</h3></div>
        <div class="chart-container"><canvas id="yearlyBar"></canvas></div>
      </div>
      <div class="grid-2">
        <div class="panel">
          <div class="panel-header"><h3>Income vs Expenses</h3></div>
          <canvas id="yearlyLine"></canvas>
        </div>
        <div class="panel">
          <div class="panel-header"><h3>Top Categories</h3></div>
          ${catData.slice(0,6).map((c,i)=>`
            <div class="flex flex-center flex-between" style="padding:10px 0;border-bottom:1px solid var(--border)">
              <div class="flex flex-center gap-8">
                <span style="font-weight:700;color:var(--text3);width:20px">${i+1}.</span>
                <span>${getCat(c.category).icon} ${getCat(c.category).name}</span>
              </div>
              <span style="font-weight:600">${fmt(c.amount)}</span>
            </div>
          `).join('') || '<p class="text-muted">No data</p>'}
        </div>
      </div>
      <div class="grid-2">
        <div class="panel">
          <div class="panel-header"><h3>Expense by Category</h3></div>
          <div class="chart-split" style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
            <div style="flex:1;min-width:140px;max-width:220px">
              <canvas id="yearlyPie"></canvas>
            </div>
            <div style="flex:1;min-width:180px">
              ${catData.map(c=>`
                <div class="flex flex-center flex-between mb-8">
                  <div class="flex flex-center gap-8">
                    <div style="width:8px;height:8px;border-radius:50%;background:${getCat(c.category).color}"></div>
                    <span class="text-sm">${getCat(c.category).name}</span>
                  </div>
                  <span class="text-sm" style="font-weight:600">${fmt(c.amount)}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
        <div class="panel">
          <div class="panel-header"><h3>Quarterly Summary</h3></div>
          ${[0,1,2,3].map(q => {
            const qExp = expByMonth.slice(q*3,q*3+3).reduce((s,v)=>s+v,0);
            const qInc = incByMonth.slice(q*3,q*3+3).reduce((s,v)=>s+v,0);
            return `
              <div style="padding:12px;background:var(--bg3);border-radius:var(--radius-sm);margin-bottom:8px">
                <div class="flex flex-center flex-between mb-8">
                  <span style="font-weight:600">Q${q+1}</span>
                  <span class="badge badge-${qInc-qExp>=0?'success':'danger'}">${qInc-qExp>=0?'Surplus':'Deficit'}</span>
                </div>
                <div class="flex flex-center flex-between text-sm">
                  <span class="text-muted">Income: <strong style="color:var(--green)">${fmt(qInc)}</strong></span>
                  <span class="text-muted">Expenses: <strong style="color:var(--red)">${fmt(qExp)}</strong></span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
  setTimeout(() => {
    drawBarChart('yearlyBar', expByMonth, monthLabels, '#6c5ce7');
    drawLineChart('yearlyLine', incByMonth.map((v,i)=>v), monthLabels, '#00b894');
    drawPieChart('yearlyPie', catData, totalExp);
  }, 50);
}

// ===== BUDGETS =====
function renderBudgets() {
  const now = new Date();
  const monthStart = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-01';
  const monthEnd = new Date(now.getFullYear(), now.getMonth()+1, 0).toISOString().slice(0,10);
  const monthExp = getExpenses('month', monthStart, monthEnd);
  const spent = {};
  monthExp.forEach(t => { spent[t.category] = (spent[t.category]||0) + t.amount; });
  const totalBudget = budgets.reduce((s,b)=>s+b.limit, 0);
  const totalSpent = budgets.reduce((s,b)=>s+(spent[b.category]||0), 0);

  const main = document.getElementById('mainContent');
  main.innerHTML = `
    <div class="fade-in">
      <div class="header">
        <h2>Budgets — ${now.toLocaleDateString('en-US',{month:'long',year:'numeric'})}</h2>
        <button class="btn btn-primary" onclick="openAddBudget()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Set Budget
        </button>
      </div>
      <div class="cards-grid">
        <div class="card"><div class="card-label">💰 Total Budget</div><div class="card-value accent">${fmt(totalBudget)}</div></div>
        <div class="card"><div class="card-label">💸 Total Spent</div><div class="card-value red">${fmt(totalSpent)}</div></div>
        <div class="card"><div class="card-label">📊 Remaining</div><div class="card-value ${totalBudget-totalSpent>=0?'green':'red'}">${fmt(totalBudget-totalSpent)}</div></div>
      </div>
      <div class="panel">
        ${budgets.length ? budgets.map(b => {
          const cat = getCat(b.category);
          const s = spent[b.category] || 0;
          const pct = b.limit ? Math.min((s/b.limit)*100, 100) : 0;
          const over = s > b.limit;
          return `
            <div class="budget-row">
              <div class="transaction-icon" style="background:${cat.color}22;color:${cat.color}">${cat.icon}</div>
              <div class="budget-info">
                <div class="name">${cat.name}</div>
                <div class="amounts">${fmt(s)} of ${fmt(b.limit)} spent</div>
                <div class="progress-bar" style="margin-top:6px">
                  <div class="progress-fill" style="width:${pct}%;background:${over?'var(--red)':pct>80?'var(--yellow)':'var(--green)'}"></div>
                </div>
              </div>
              <span class="badge ${over?'badge-danger':pct>80?'badge-warning':'badge-success'}">${over?'Over':pct>80?'Warning':'On Track'}</span>
              <button class="btn btn-ghost btn-sm btn-icon" onclick="openEditBudget('${b.id}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="btn btn-ghost btn-sm btn-icon" onclick="deleteBudget('${b.id}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
              </button>
            </div>
          `;
        }).join('') : '<div class="empty-state"><p>No budgets set. Click "Set Budget" to start tracking.</p></div>'}
      </div>
    </div>
  `;
}

// ===== RECURRING =====
function renderRecurring() {
  const main = document.getElementById('mainContent');
  main.innerHTML = `
    <div class="fade-in">
      <div class="header">
        <h2>Recurring Expenses</h2>
        <button class="btn btn-primary" onclick="openAddRecurring()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Recurring
        </button>
      </div>
      <div class="cards-grid">
        <div class="card"><div class="card-label">🔄 Active</div><div class="card-value accent">${recurringList.filter(r=>r.active).length}</div></div>
        <div class="card"><div class="card-label">💸 Monthly Cost</div><div class="card-value red">${fmt(recurringList.filter(r=>r.active).reduce((s,r)=>{const m={weekly:4.33,biweekly:2.16,monthly:1,quarterly:0.33,yearly:0.083};return s+r.amount*(m[r.frequency]||1);},0))}</div></div>
        <div class="card"><div class="card-label">📅 Yearly Cost</div><div class="card-value yellow">${fmt(recurringList.filter(r=>r.active).reduce((s,r)=>{const y={weekly:52,biweekly:26,monthly:12,quarterly:4,yearly:1};return s+r.amount*(y[r.frequency]||1);},0))}</div></div>
      </div>
      <div class="panel">
        ${recurringList.length ? recurringList.map(r => {
          const cat = getCat(r.category);
          const freqLabels = {weekly:'Weekly','biweekly':'Bi-Weekly',monthly:'Monthly',quarterly:'Quarterly',yearly:'Yearly'};
          return `
            <div class="recurring-row flex flex-center flex-between" style="padding:14px 0;border-bottom:1px solid var(--border)">
              <div class="flex flex-center gap-12">
                <div class="transaction-icon" style="background:${cat.color}22;color:${cat.color}">${cat.icon}</div>
                <div>
                  <div style="font-weight:600">${r.description}</div>
                  <div class="text-sm text-muted">${cat.name} · ${freqLabels[r.frequency]||r.frequency}</div>
                </div>
              </div>
              <div class="flex flex-center gap-12">
                <span style="font-weight:600;color:var(--red)">${fmt(r.amount)}</span>
                <span class="badge ${r.active?'badge-success':'badge-danger'}">${r.active?'Active':'Paused'}</span>
                <div class="flex gap-8">
                  <button class="btn btn-ghost btn-sm btn-icon" onclick="toggleRecurring('${r.id}')" title="${r.active?'Pause':'Resume'}">
                    ${r.active ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>' : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>'}
                  </button>
                  <button class="btn btn-ghost btn-sm btn-icon" onclick="openEditRecurring('${r.id}')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button class="btn btn-ghost btn-sm btn-icon" onclick="deleteRecurring('${r.id}')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('') : '<div class="empty-state"><p>No recurring expenses. Add subscriptions, rent, etc.</p></div>'}
      </div>
    </div>
  `;
}

// ===== SAVINGS GOALS =====
function renderSavings() {
  const totalSaved = savingsGoals.reduce((s,g)=>s+g.current,0);
  const totalTarget = savingsGoals.reduce((s,g)=>s+g.target,0);
  const main = document.getElementById('mainContent');
  main.innerHTML = `
    <div class="fade-in">
      <div class="header">
        <h2>Savings Goals</h2>
        <button class="btn btn-primary" onclick="openAddGoal()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Goal
        </button>
      </div>
      <div class="cards-grid">
        <div class="card savings-card">
          <div class="card-label">💎 Total Saved</div>
          <div class="card-value">${fmt(totalSaved)}</div>
        </div>
        <div class="card"><div class="card-label">🎯 Total Target</div><div class="card-value accent">${fmt(totalTarget)}</div></div>
        <div class="card"><div class="card-label">📊 Overall Progress</div><div class="card-value ${totalTarget?(totalSaved/totalTarget*100>=100?'green':'yellow'):'accent'}">${totalTarget?(totalSaved/totalTarget*100).toFixed(1):0}%</div></div>
      </div>
      <div class="savings-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px">
        ${savingsGoals.length ? savingsGoals.map(g => {
          const pct = g.target ? Math.min((g.current/g.target)*100, 100) : 0;
          const remaining = Math.max(g.target - g.current, 0);
          const daysLeft = g.date ? Math.max(Math.ceil((new Date(g.date) - new Date())/(1000*60*60*24)), 0) : null;
          const monthlyNeeded = daysLeft !== null && daysLeft > 0 && remaining > 0 ? remaining / (daysLeft/30) : null;
          return `
            <div class="panel" style="position:relative;overflow:hidden">
              <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,${pct>=100?'var(--green)':'var(--accent)'},${pct>=100?'var(--green2)':'var(--accent2)'});width:${pct}%"></div>
              <div class="flex flex-center flex-between mb-16">
                <h3 style="font-size:1rem">${g.name}</h3>
                <div class="flex gap-8">
                  <button class="btn btn-ghost btn-sm btn-icon" onclick="openEditGoal('${g.id}')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button class="btn btn-ghost btn-sm btn-icon" onclick="deleteGoal('${g.id}')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                  </button>
                </div>
              </div>
              <div class="mb-8">
                <div class="flex flex-center flex-between text-sm mb-8">
                  <span style="font-weight:600;color:var(--green)">${fmt(g.current)}</span>
                  <span class="text-muted">${fmt(g.target)}</span>
                </div>
                <div class="progress-bar" style="height:10px">
                  <div class="progress-fill" style="width:${pct}%;background:${pct>=100?'var(--green)':pct>=70?'var(--yellow)':'var(--accent)'}"></div>
                </div>
                <div class="text-sm text-muted mt-8" style="text-align:center">${pct.toFixed(1)}% complete</div>
              </div>
              <div class="savings-subgrid" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px">
                <div style="padding:8px;background:var(--bg3);border-radius:6px;text-align:center">
                  <div class="text-sm text-muted">Remaining</div>
                  <div style="font-weight:600;font-size:0.85rem">${fmt(remaining)}</div>
                </div>
                <div style="padding:8px;background:var(--bg3);border-radius:6px;text-align:center">
                  <div class="text-sm text-muted">${daysLeft!==null?'Days Left':'Target Date'}</div>
                  <div style="font-weight:600;font-size:0.85rem">${daysLeft!==null?daysLeft+'d':g.date||'None'}</div>
                </div>
              </div>
              ${monthlyNeeded ? `
                <div class="text-sm text-muted mt-8" style="text-align:center">
                  Need ${fmt(monthlyNeeded)}/month to reach goal
                </div>
              ` : ''}
              ${pct>=100 ? '<div style="text-align:center;margin-top:8px"><span class="badge badge-success">🎉 Goal Reached!</span></div>' : ''}
            </div>
          `;
        }).join('') : '<div class="empty-state" style="grid-column:1/-1"><p>No savings goals yet. Set your first goal!</p></div>'}
      </div>
    </div>
  `;
}

// ===== EXPORT =====
function renderExport() {
  const main = document.getElementById('mainContent');
  main.innerHTML = `
    <div class="fade-in">
      <div class="header"><h2>Export Data</h2></div>
      <div class="cards-grid" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr))">
        <div class="panel" style="cursor:pointer" onclick="exportCSV()">
          <div style="text-align:center;padding:20px">
            <div style="font-size:2.5rem;margin-bottom:12px">📄</div>
            <h3 style="margin-bottom:8px">Export as CSV</h3>
            <p class="text-sm text-muted">Spreadsheet-compatible format. Open in Excel or Google Sheets.</p>
          </div>
        </div>
        <div class="panel" style="cursor:pointer" onclick="exportJSON()">
          <div style="text-align:center;padding:20px">
            <div style="font-size:2.5rem;margin-bottom:12px">📦</div>
            <h3 style="margin-bottom:8px">Export as JSON</h3>
            <p class="text-sm text-muted">Complete data backup. Can be re-imported later.</p>
          </div>
        </div>
        <div class="panel" style="cursor:pointer" onclick="exportMonthlyReport()">
          <div style="text-align:center;padding:20px">
            <div style="font-size:2.5rem;margin-bottom:12px">📊</div>
            <h3 style="margin-bottom:8px">Monthly Report (CSV)</h3>
            <p class="text-sm text-muted">Current month's summary with category breakdown.</p>
          </div>
        </div>
        <div class="panel" style="cursor:pointer" onclick="importData()">
          <div style="text-align:center;padding:20px">
            <div style="font-size:2.5rem;margin-bottom:12px">📥</div>
            <h3 style="margin-bottom:8px">Import Data</h3>
            <p class="text-sm text-muted">Restore from a JSON backup file.</p>
          </div>
        </div>
      </div>
      <div class="panel mt-16">
        <div class="panel-header"><h3>Data Summary</h3></div>
        <div class="data-summary-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:16px">
          <div style="padding:12px;background:var(--bg3);border-radius:var(--radius-sm);text-align:center">
            <div class="card-label" style="justify-content:center">Transactions</div>
            <div style="font-size:1.5rem;font-weight:700">${transactions.length}</div>
          </div>
          <div style="padding:12px;background:var(--bg3);border-radius:var(--radius-sm);text-align:center">
            <div class="card-label" style="justify-content:center">Budgets</div>
            <div style="font-size:1.5rem;font-weight:700">${budgets.length}</div>
          </div>
          <div style="padding:12px;background:var(--bg3);border-radius:var(--radius-sm);text-align:center">
            <div class="card-label" style="justify-content:center">Goals</div>
            <div style="font-size:1.5rem;font-weight:700">${savingsGoals.length}</div>
          </div>
          <div style="padding:12px;background:var(--bg3);border-radius:var(--radius-sm);text-align:center">
            <div class="card-label" style="justify-content:center">Recurring</div>
            <div style="font-size:1.5rem;font-weight:700">${recurringList.length}</div>
          </div>
        </div>
      </div>
    </div>
  `;
}
function exportCSV() {
  const header = 'Date,Type,Category,Amount,Payment,Description,Tags,Recurring\n';
  const rows = transactions.map(t => `${t.date},${t.type},"${getCat(t.category).name}",${t.amount},${t.payment},"${(t.description||'').replace(/"/g,'""')}","${(t.tags||[]).join(';')}",${t.recurring||false}`).join('\n');
  download(header+rows, 'spendwise-transactions.csv', 'text/csv');
}
function exportJSON() {
  const data = {transactions, budgets, savingsGoals, recurringList, exportDate: today()};
  download(JSON.stringify(data, null, 2), 'spendwise-backup.json', 'application/json');
}
function exportMonthlyReport() {
  const now = new Date();
  const ms = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-01';
  const me = new Date(now.getFullYear(), now.getMonth()+1, 0).toISOString().slice(0,10);
  const exp = getExpenses('month', ms, me);
  const inc = getIncome('month', ms, me);
  const catData = sumByCategory(exp);
  let csv = `Monthly Report - ${now.toLocaleDateString('en-US',{month:'long',year:'numeric'})}\n\n`;
  csv += `Total Expenses,${exp.reduce((s,t)=>s+t.amount,0).toFixed(2)}\n`;
  csv += `Total Income,${inc.reduce((s,t)=>s+t.amount,0).toFixed(2)}\n\n`;
  csv += 'Category,Amount,Percentage\n';
  const total = exp.reduce((s,t)=>s+t.amount,0);
  catData.forEach(c => { csv += `"${getCat(c.category).name}",${c.amount.toFixed(2)},${(c.amount/total*100).toFixed(1)}%\n`; });
  csv += '\nTransactions\nDate,Type,Category,Amount,Description\n';
  exp.concat(inc).sort((a,b)=>a.date.localeCompare(b.date)).forEach(t => {
    csv += `${t.date},${t.type},"${getCat(t.category).name}",${t.amount},"${(t.description||'').replace(/"/g,'""')}"\n`;
  });
  download(csv, 'spendwise-monthly-report.csv', 'text/csv');
}
function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = e => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        if(data.transactions) transactions = data.transactions;
        if(data.budgets) budgets = data.budgets;
        if(data.savingsGoals) savingsGoals = data.savingsGoals;
        if(data.recurringList) recurringList = data.recurringList;
        persist(); alert('Data imported successfully!'); renderPage();
      } catch(err) { alert('Invalid file format'); }
    };
    reader.readAsText(file);
  };
  input.click();
}
function download(content, filename, type) {
  const blob = new Blob([content], {type});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ===== SETTINGS =====
function renderSettings() {
  const main = document.getElementById('mainContent');
  main.innerHTML = `
    <div class="fade-in">
      <div class="header"><h2>Settings</h2></div>
      <div class="panel" style="max-width:500px">
        <h3 style="margin-bottom:20px">Preferences</h3>
        <div class="input-group">
          <label>Currency Symbol</label>
          <select class="input" id="settingCurrency" onchange="updateSetting('currency',this.value)">
            <option value="₹" ${settings.currency==='₹'?'selected':''}>₹ (Indian Rupee)</option>
            <option value="$" ${settings.currency==='$'?'selected':''}>$ (US Dollar)</option>
            <option value="€" ${settings.currency==='€'?'selected':''}>€ (Euro)</option>
            <option value="£" ${settings.currency==='£'?'selected':''}>£ (British Pound)</option>
            <option value="¥" ${settings.currency==='¥'?'selected':''}>¥ (Japanese Yen)</option>
            <option value="৳" ${settings.currency==='৳'?'selected':''}>৳ (Bangladeshi Taka)</option>
          </select>
        </div>
        <div class="input-group">
          <label>Theme</label>
          <div class="flex flex-center gap-8">
            <span class="text-sm">Light</span>
            <div class="toggle ${settings.theme==='dark'?'active':''}" onclick="toggleTheme()"></div>
            <span class="text-sm">Dark</span>
          </div>
        </div>
        <hr style="border:none;border-top:1px solid var(--border);margin:20px 0">
        <h3 style="margin-bottom:16px">Danger Zone</h3>
        <button class="btn btn-danger" onclick="if(confirm('Delete ALL data? This cannot be undone.')){localStorage.clear();location.reload();}">
          Reset All Data
        </button>
      </div>
    </div>
  `;
}
function updateSetting(key, value) {
  settings[key] = value;
  persist();
  if(key==='currency') renderPage();
}

// ===== RECURRING AUTO-GENERATE =====
function processRecurring() {
  const now = today();
  let changed = false;
  recurringList.forEach(r => {
    if(!r.active) return;
    while(r.nextDate <= now) {
      transactions.push({
        id: uid(),
        type: 'expense',
        amount: r.amount,
        date: r.nextDate,
        category: r.category,
        payment: 'auto',
        description: r.description + ' (auto)',
        tags: ['recurring'],
        recurring: true,
        frequency: r.frequency
      });
      const d = new Date(r.nextDate+'T00:00:00');
      switch(r.frequency) {
        case 'weekly': d.setDate(d.getDate()+7); break;
        case 'biweekly': d.setDate(d.getDate()+14); break;
        case 'monthly': d.setMonth(d.getMonth()+1); break;
        case 'quarterly': d.setMonth(d.getMonth()+3); break;
        case 'yearly': d.setFullYear(d.getFullYear()+1); break;
      }
      r.nextDate = d.toISOString().slice(0,10);
      changed = true;
    }
  });
  if(changed) persist();
}

// ===== INIT =====
applyTheme();
processRecurring();
setTransType('expense');
renderPage();
