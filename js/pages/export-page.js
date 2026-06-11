// ===== EXPORT PAGE =====
import { getTransactions, getBudgets, getSavingsGoals, getRecurringList, replaceAllData } from '../store.js';
import { today, getCat, escapeCSV, sanitizeImportData } from '../utils.js';
import { toastSuccess, toastError } from '../toast.js';

function download(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function exportCSV() {
  const header = 'Date,Type,Category,Amount,Payment,Description,Tags,Recurring\n';
  const rows = getTransactions().map(t =>
    [t.date, t.type, escapeCSV(getCat(t.category).name), t.amount, t.payment, escapeCSV(t.description || ''), escapeCSV((t.tags || []).join(';')), t.recurring || false].join(',')
  ).join('\n');
  download(header + rows, 'spendwise-transactions.csv', 'text/csv');
  toastSuccess('CSV exported');
}

function exportJSON() {
  const data = {
    transactions: getTransactions(),
    budgets: getBudgets(),
    savingsGoals: getSavingsGoals(),
    recurringList: getRecurringList(),
    exportDate: today()
  };
  download(JSON.stringify(data, null, 2), 'spendwise-backup.json', 'application/json');
  toastSuccess('JSON backup exported');
}

function exportMonthlyReport() {
  const settings = { currency: '₹' };
  try { settings.currency = JSON.parse(localStorage.getItem('sw_settings'))?.currency || '₹'; } catch {}
  const now = new Date();
  const ms = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-01';
  const me = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  const txns = getTransactions();
  const exp = txns.filter(t => t.type === 'expense' && t.date >= ms && t.date <= me);
  const inc = txns.filter(t => t.type === 'income' && t.date >= ms && t.date <= me);

  const catMap = {};
  exp.forEach(t => { catMap[t.category] = (catMap[t.category] || 0) + t.amount; });
  const catData = Object.entries(catMap).map(([cat, val]) => ({ category: cat, amount: val })).sort((a, b) => b.amount - a.amount);
  const total = exp.reduce((s, t) => s + t.amount, 0);

  let csv = `Monthly Report - ${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}\n\n`;
  csv += `Total Expenses,${total.toFixed(2)}\n`;
  csv += `Total Income,${inc.reduce((s, t) => s + t.amount, 0).toFixed(2)}\n\n`;
  csv += 'Category,Amount,Percentage\n';
  catData.forEach(c => { csv += `"${getCat(c.category).name}",${c.amount.toFixed(2)},${(c.amount / total * 100).toFixed(1)}%\n`; });
  csv += '\nTransactions\nDate,Type,Category,Amount,Description\n';
  exp.concat(inc).sort((a, b) => a.date.localeCompare(b.date)).forEach(t => {
    csv += `${t.date},${t.type},"${getCat(t.category).name}",${t.amount},"${escapeCSV(t.description || '')}"\n`;
  });
  download(csv, 'spendwise-monthly-report.csv', 'text/csv');
  toastSuccess('Monthly report exported');
}

function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.setAttribute('aria-label', 'Import JSON backup file');
  input.onchange = e => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const raw = JSON.parse(ev.target.result);
        const data = sanitizeImportData(raw);
        if(!data) { toastError('Invalid file format'); return; }
        replaceAllData(data);
        toastSuccess('Data imported successfully!');
        renderExport(document.getElementById('mainContent'));
      } catch(err) { toastError('Invalid file format'); }
    };
    reader.readAsText(file);
  };
  input.click();
}

export function renderExport(container) {
  const transactions = getTransactions();
  const budgets = getBudgets();
  const savingsGoals = getSavingsGoals();
  const recurringList = getRecurringList();

  container.innerHTML = `
    <div class="fade-in">
      <div class="header"><h2>Export Data</h2></div>
      <div class="cards-grid" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr))">
        <div class="panel" style="cursor:pointer" onclick="window.__exportCSV()" role="button" tabindex="0" aria-label="Export as CSV">
          <div style="text-align:center;padding:20px">
            <div style="font-size:2.5rem;margin-bottom:12px" aria-hidden="true">📄</div>
            <h3 style="margin-bottom:8px">Export as CSV</h3>
            <p class="text-sm text-muted">Spreadsheet-compatible format. Open in Excel or Google Sheets.</p>
          </div>
        </div>
        <div class="panel" style="cursor:pointer" onclick="window.__exportJSON()" role="button" tabindex="0" aria-label="Export as JSON">
          <div style="text-align:center;padding:20px">
            <div style="font-size:2.5rem;margin-bottom:12px" aria-hidden="true">📦</div>
            <h3 style="margin-bottom:8px">Export as JSON</h3>
            <p class="text-sm text-muted">Complete data backup. Can be re-imported later.</p>
          </div>
        </div>
        <div class="panel" style="cursor:pointer" onclick="window.__exportMonthlyReport()" role="button" tabindex="0" aria-label="Export monthly report">
          <div style="text-align:center;padding:20px">
            <div style="font-size:2.5rem;margin-bottom:12px" aria-hidden="true">📊</div>
            <h3 style="margin-bottom:8px">Monthly Report (CSV)</h3>
            <p class="text-sm text-muted">Current month's summary with category breakdown.</p>
          </div>
        </div>
        <div class="panel" style="cursor:pointer" onclick="window.__importData()" role="button" tabindex="0" aria-label="Import data from JSON">
          <div style="text-align:center;padding:20px">
            <div style="font-size:2.5rem;margin-bottom:12px" aria-hidden="true">📥</div>
            <h3 style="margin-bottom:8px">Import Data</h3>
            <p class="text-sm text-muted">Restore from a JSON backup file.</p>
          </div>
        </div>
      </div>
      <div class="panel mt-16">
        <div class="panel-header"><h3>Data Summary</h3></div>
        <div class="data-summary-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:16px">
          <div style="padding:12px;background:var(--bg3);text-align:center">
            <div class="card-label" style="justify-content:center">Transactions</div>
            <div style="font-size:1.5rem;font-weight:700">${transactions.length}</div>
          </div>
          <div style="padding:12px;background:var(--bg3);text-align:center">
            <div class="card-label" style="justify-content:center">Budgets</div>
            <div style="font-size:1.5rem;font-weight:700">${budgets.length}</div>
          </div>
          <div style="padding:12px;background:var(--bg3);text-align:center">
            <div class="card-label" style="justify-content:center">Goals</div>
            <div style="font-size:1.5rem;font-weight:700">${savingsGoals.length}</div>
          </div>
          <div style="padding:12px;background:var(--bg3);text-align:center">
            <div class="card-label" style="justify-content:center">Recurring</div>
            <div style="font-size:1.5rem;font-weight:700">${recurringList.length}</div>
          </div>
        </div>
      </div>
    </div>
  `;

  window.__exportCSV = exportCSV;
  window.__exportJSON = exportJSON;
  window.__exportMonthlyReport = exportMonthlyReport;
  window.__importData = importData;
}
