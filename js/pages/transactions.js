// ===== TRANSACTIONS PAGE =====
import { getTransactions, addTransaction, updateTransaction, deleteTransaction, restoreTransaction, getSettings } from '../store.js';
import { today, fmt, getCat, ALL_CATS, EXPENSE_CATS, INCOME_CATS, PAYMENT_LABELS, validateTransaction, uid } from '../utils.js';
import { toastSuccess, toastInfo } from '../toast.js';
import { openModal, closeModal } from '../modals.js';

let currentFilter = { search: '', type: 'all', category: 'all', payment: 'all' };

function getFiltered() {
  let filtered = [...getTransactions()].sort((a, b) => b.date.localeCompare(a.date));
  const f = currentFilter;
  if(f.type !== 'all') filtered = filtered.filter(t => t.type === f.type);
  if(f.category !== 'all') filtered = filtered.filter(t => t.category === f.category);
  if(f.payment !== 'all') filtered = filtered.filter(t => t.payment === f.payment);
  if(f.search) {
    const s = f.search.toLowerCase();
    filtered = filtered.filter(t =>
      (t.description || '').toLowerCase().includes(s) ||
      (t.tags || []).some(tag => tag.toLowerCase().includes(s)) ||
      getCat(t.category).name.toLowerCase().includes(s)
    );
  }
  return filtered;
}

function renderTable() {
  const filtered = getFiltered();
  const tbody = document.getElementById('txBody');
  const empty = document.getElementById('txEmpty');
  const settings = getSettings();

  if(!filtered.length) {
    if(tbody) tbody.innerHTML = '';
    if(empty) empty.classList.remove('hidden');
    return;
  }

  if(empty) empty.classList.add('hidden');
  if(!tbody) return;

  tbody.innerHTML = filtered.map(t => {
    const cat = getCat(t.category);
    const payLabel = PAYMENT_LABELS[t.payment] || t.payment;
    return `
      <tr>
        <td class="text-sm">${t.date}</td>
        <td>
          <div class="flex flex-center gap-8">
            <div class="transaction-icon" style="background:${cat.color}22;color:${cat.color};font-size:0.9rem" aria-hidden="true">${cat.icon}</div>
            <div>
              <div style="font-weight:500">${t.description || cat.name}</div>
              ${t.recurring ? '<span class="recurring-badge">🔄 Recurring</span>' : ''}
            </div>
          </div>
        </td>
        <td><span class="tag tag-${t.category}">${cat.name}</span></td>
        <td class="text-sm text-muted">${payLabel}</td>
        <td>${(t.tags || []).map(tag => `<span class="tag tag-other" style="margin-right:4px">${tag}</span>`).join('')}</td>
        <td class="text-right" style="font-weight:600;color:${t.type === 'expense' ? 'var(--red)' : 'var(--green)'}">
          ${t.type === 'expense' ? '-' : '+'} ${fmt(t.amount, settings.currency)}
        </td>
        <td>
          <div class="flex gap-8" style="justify-content:flex-end">
            <button class="btn btn-ghost btn-sm btn-icon" onclick="window.__editTransaction('${t.id}')" title="Edit" aria-label="Edit transaction">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn btn-ghost btn-sm btn-icon" onclick="window.__deleteTransaction('${t.id}')" title="Delete" aria-label="Delete transaction">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function populateCategorySelect(selectEl, type) {
  const cats = type === 'income' ? INCOME_CATS : EXPENSE_CATS;
  selectEl.innerHTML = cats.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');
}

function setTransType(type) {
  document.querySelectorAll('#typeTabs .tab').forEach((t, i) => t.classList.toggle('active', (i === 0 && type === 'expense') || (i === 1 && type === 'income')));
  const catSelect = document.getElementById('txCategory');
  if(catSelect) populateCategorySelect(catSelect, type);
  window.__currentTransType = type;
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
  const t = getTransactions().find(x => x.id === id);
  if(!t) return;
  document.getElementById('modalTitle').textContent = 'Edit Transaction';
  document.getElementById('txId').value = t.id;
  document.getElementById('txAmount').value = t.amount;
  document.getElementById('txDate').value = t.date;
  document.getElementById('txDesc').value = t.description || '';
  document.getElementById('txTags').value = (t.tags || []).join(', ');
  document.getElementById('txRecurring').checked = !!t.recurring;
  document.getElementById('recurringOptions').classList.toggle('hidden', !t.recurring);
  if(t.recurring) document.getElementById('txFreq').value = t.frequency || 'monthly';
  setTransType(t.type);
  document.getElementById('txCategory').value = t.category;
  document.getElementById('txPayment').value = t.payment || 'cash';
  document.getElementById('txSaveBtn').textContent = 'Update Transaction';
  openModal('transactionModal');
}

function saveTransaction() {
  const amount = parseFloat(document.getElementById('txAmount').value);
  const date = document.getElementById('txDate').value;
  const cat = document.getElementById('txCategory').value;
  const payment = document.getElementById('txPayment').value;
  const desc = document.getElementById('txDesc').value.trim();
  const tags = document.getElementById('txTags').value.split(',').map(t => t.trim()).filter(Boolean);
  const isRecurring = document.getElementById('txRecurring').checked;
  const freq = document.getElementById('txFreq').value;
  const id = document.getElementById('txId').value;
  const type = window.__currentTransType || 'expense';

  const errors = validateTransaction({ amount, date, category: cat, type, payment });
  if(errors.length) { alert(errors[0]); return; }

  const data = { type, amount, date, category: cat, payment, description: desc, tags, recurring: isRecurring, frequency: freq };

  if(id) {
    updateTransaction(id, data);
    toastSuccess('Transaction updated');
  } else {
    data.id = uid();
    addTransaction(data);
    toastSuccess('Transaction added');
  }
  closeModal('transactionModal');
  renderTable();
}

function deleteTransactionHandler(id) {
  if(!confirm('Delete this transaction?')) return;
  const removed = deleteTransaction(id);
  if(removed) {
    toastInfo('Transaction deleted', {
      action: () => { restoreTransaction(removed); renderTable(); },
      actionLabel: 'Undo',
      duration: 5000
    });
  }
  renderTable();
}

export function renderTransactions(container) {
  const allCats = ALL_CATS;
  const payments = PAYMENT_LABELS;

  container.innerHTML = `
    <div class="fade-in">
      <div class="header">
        <h2>Transactions</h2>
        <div class="header-actions">
          <div class="search-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" class="input" id="searchInput" placeholder="Search transactions..." aria-label="Search transactions" style="width:220px">
          </div>
          <select class="input" id="filterType" aria-label="Filter by type" style="width:130px">
            <option value="all">All Types</option>
            <option value="expense">Expenses</option>
            <option value="income">Income</option>
          </select>
          <select class="input" id="filterCat" aria-label="Filter by category" style="width:150px">
            <option value="all">All Categories</option>
            ${allCats.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('')}
          </select>
          <select class="input" id="filterPayment" aria-label="Filter by payment method" style="width:150px">
            <option value="all">All Payments</option>
            ${Object.entries(payments).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}
          </select>
          <button class="btn btn-primary" onclick="window.__openAddTransaction()" aria-label="Add transaction">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add
          </button>
        </div>
      </div>
      <div class="panel">
        <div class="tx-table-wrapper">
          <table class="tx-table table" id="txTable" aria-label="Transactions list">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Description</th>
                <th scope="col">Category</th>
                <th scope="col">Payment</th>
                <th scope="col">Tags</th>
                <th scope="col" class="text-right">Amount</th>
                <th scope="col" style="width:80px"></th>
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

  // Event listeners
  document.getElementById('searchInput')?.addEventListener('input', e => { currentFilter.search = e.target.value; renderTable(); });
  document.getElementById('filterType')?.addEventListener('change', e => { currentFilter.type = e.target.value; renderTable(); });
  document.getElementById('filterCat')?.addEventListener('change', e => { currentFilter.category = e.target.value; renderTable(); });
  document.getElementById('filterPayment')?.addEventListener('change', e => { currentFilter.payment = e.target.value; renderTable(); });

  // Expose handlers for inline onclick
  window.__openAddTransaction = openAddTransaction;
  window.__editTransaction = openEditTransaction;
  window.__deleteTransaction = deleteTransactionHandler;
  window.__saveTransaction = saveTransaction;
  window.__setTransType = setTransType;

  renderTable();
}
