// ===== MAIN APPLICATION ENTRY POINT =====
import { initStore, getSettings, subscribe } from './store.js';
import { initRouter, navigate, registerPage } from './router.js';
import { initModals } from './modals.js';
import { setChartUtils } from './charts.js';
import { fmt, fmtShort } from './utils.js';
import { applyTheme } from './pages/settings.js';

// Page imports
import { renderDashboard } from './pages/dashboard.js';
import { renderTransactions } from './pages/transactions.js';
import { renderWeekly, renderMonthly, renderYearly } from './pages/reports.js';
import { renderBudgets } from './pages/budgets.js';
import { renderRecurring } from './pages/recurring.js';
import { renderSavings } from './pages/savings.js';
import { renderExport } from './pages/export-page.js';
import { renderSettings } from './pages/settings.js';

// ===== RECURRING AUTO-GENERATE (FIXED: max 1 per run) =====
import { getRecurringList, addBulkTransactions, updateRecurring } from './store.js';
import { today, uid } from './utils.js';

function processRecurring() {
  const now = today();
  let changed = false;
  const recurringList = getRecurringList();

  recurringList.forEach(r => {
    if(!r.active) return;
    // FIX: Only generate one transaction per recurring item per app load
    if(r.nextDate <= now) {
      const transactions = [];
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

      // Calculate next date
      const d = new Date(r.nextDate + 'T00:00:00');
      switch(r.frequency) {
        case 'weekly': d.setDate(d.getDate() + 7); break;
        case 'biweekly': d.setDate(d.getDate() + 14); break;
        case 'monthly': d.setMonth(d.getMonth() + 1); break;
        case 'quarterly': d.setMonth(d.getMonth() + 3); break;
        case 'yearly': d.setFullYear(d.getFullYear() + 1); break;
      }
      const nextDate = d.toISOString().slice(0, 10);
      updateRecurring(r.id, { nextDate });
      changed = true;
    }
  });

  if(changed) addBulkTransactions([]);
}

// ===== INITIALIZE =====
function init() {
  // Init store first
  initStore();

  // Set chart utilities
  const settings = getSettings();
  setChartUtils(
    (n, c) => fmt(n, c || settings.currency),
    (n, c) => fmtShort(n, c || settings.currency)
  );

  // Register pages
  registerPage('dashboard', renderDashboard);
  registerPage('transactions', renderTransactions);
  registerPage('weekly', renderWeekly);
  registerPage('monthly', renderMonthly);
  registerPage('yearly', renderYearly);
  registerPage('budgets', renderBudgets);
  registerPage('recurring', renderRecurring);
  registerPage('savings', renderSavings);
  registerPage('export', renderExport);
  registerPage('settings', renderSettings);

  // Init modals
  initModals();

  // Init router
  initRouter();

  // Apply theme
  applyTheme();

  // Process recurring
  processRecurring();

  // Expose theme toggle globally
  const themeToggle = document.getElementById('themeToggle');
  if(themeToggle) {
    themeToggle.addEventListener('click', () => {
      const s = getSettings();
      const newTheme = s.theme === 'dark' ? 'light' : 'dark';
      // Direct DOM update since settings page might not be loaded
      document.documentElement.setAttribute('data-theme', newTheme);
      themeToggle.classList.toggle('active', newTheme === 'dark');
      import('./store.js').then(m => m.updateSettings('theme', newTheme));
    });
  }

  // Render initial page
  navigate('dashboard');
}

// Run when DOM is ready
if(document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Register Service Worker
if('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
