// ===== MAIN APPLICATION ENTRY POINT =====
import { initStore, getSettings, updateSettings, addTransaction, getRecurringList, addBulkTransactions, updateRecurring } from './store.js';
import { initRouter, navigate, registerPage } from './router.js';
import { initModals } from './modals.js';
import { setChartUtils } from './charts.js';
import { fmt, fmtShort, EXPENSE_CATS, validateTransaction, uid, today } from './utils.js';
import { applyTheme } from './pages/settings.js';
import { toastSuccess } from './toast.js';
import { initLockScreen, lockApp, resetLockTimer, stopLockTimer, isLocked, isLockEnabled } from './lockscreen.js';

// Page imports
import { renderDashboard } from './pages/dashboard.js';
import { renderTransactions } from './pages/transactions.js';
import { renderWeekly, renderMonthly, renderYearly } from './pages/reports.js';
import { renderBudgets } from './pages/budgets.js';
import { renderRecurring } from './pages/recurring.js';
import { renderSavings } from './pages/savings.js';
import { renderExport } from './pages/export-page.js';
import { renderSettings } from './pages/settings.js';

function processRecurring() {
  const now = today();
  const newTransactions = [];
  const recurringList = getRecurringList();

  recurringList.forEach(r => {
    if(!r.active) return;
    if(r.nextDate <= now) {
      newTransactions.push({
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

      const d = new Date(r.nextDate + 'T00:00:00');
      switch(r.frequency) {
        case 'weekly': d.setDate(d.getDate() + 7); break;
        case 'biweekly': d.setDate(d.getDate() + 14); break;
        case 'monthly': d.setMonth(d.getMonth() + 1); break;
        case 'quarterly': d.setMonth(d.getMonth() + 3); break;
        case 'yearly': d.setFullYear(d.getFullYear() + 1); break;
      }
      updateRecurring(r.id, { nextDate: d.toISOString().slice(0, 10) });
    }
  });

  if(newTransactions.length) addBulkTransactions(newTransactions);
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

  // Init lock screen — blocks until unlocked
  const afterUnlock = () => {
    navigate('dashboard');
    startAutoLock();
  };
  initLockScreen(afterUnlock);

  // Expose theme toggle globally
  const themeToggle = document.getElementById('themeToggle');
  if(themeToggle) {
    themeToggle.addEventListener('click', () => {
      const s = getSettings();
      const newTheme = s.theme === 'dark' ? 'light' : 'dark';
      // Direct DOM update since settings page might not be loaded
      document.documentElement.setAttribute('data-theme', newTheme);
      themeToggle.classList.toggle('active', newTheme === 'dark');
      updateSettings('theme', newTheme);
    });
  }

  // Quick-add FAB
  const fab = document.getElementById('fabQuickAdd');
  const quickOverlay = document.getElementById('quickAddOverlay');
  const quickCat = document.getElementById('quickCategory');
  if(quickCat) {
    quickCat.innerHTML = EXPENSE_CATS.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');
  }

  function openQuickAdd() {
    document.getElementById('quickAmount').value = '';
    document.getElementById('quickDesc').value = '';
    document.getElementById('quickPayment').value = 'cash';
    if(quickCat) quickCat.value = 'food';
    quickOverlay?.classList.add('show');
    document.getElementById('quickAmount')?.focus();
  }

  function closeQuickAdd() {
    quickOverlay?.classList.remove('show');
  }

  fab?.addEventListener('click', openQuickAdd);
  document.getElementById('quickAddClose')?.addEventListener('click', closeQuickAdd);
  document.getElementById('quickAddCancel')?.addEventListener('click', closeQuickAdd);
  quickOverlay?.addEventListener('click', e => { if(e.target === quickOverlay) closeQuickAdd(); });

  document.getElementById('quickAddSave')?.addEventListener('click', () => {
    const amount = parseFloat(document.getElementById('quickAmount').value);
    const category = document.getElementById('quickCategory').value;
    const description = document.getElementById('quickDesc').value.trim();
    const payment = document.getElementById('quickPayment').value;
    const date = today();

    const errors = validateTransaction({ amount, date, category, type: 'expense', payment });
    if(errors.length) { alert(errors[0]); return; }

    addTransaction({ id: uid(), type: 'expense', amount, date, category, payment, description, tags: [], recurring: false, frequency: null });
    toastSuccess('Expense added');
    closeQuickAdd();
  });

  document.addEventListener('keydown', e => {
    if(e.key === 'Escape') closeQuickAdd();
  });

  // === AUTO-LOCK & LIFECYCLE ===
  function startAutoLock() {
    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    const resetTimer = () => {
      if(!isLockEnabled() || isLocked()) return;
      resetLockTimer(lockApp);
    };
    activityEvents.forEach(evt => document.addEventListener(evt, resetTimer, { passive: true }));
    resetLockTimer(lockApp);
  }

  // Lock on tab hide / app background
  document.addEventListener('visibilitychange', () => {
    if(document.hidden && isLockEnabled() && !isLocked()) {
      lockApp();
    }
  });

  // Lock on window blur (mobile: user switches app)
  window.addEventListener('blur', () => {
    if(isLockEnabled() && !isLocked()) {
      lockApp();
    }
  });

  // Prevent back button bypass on mobile
  window.addEventListener('popstate', () => {
    if(isLockEnabled() && isLocked()) {
      history.pushState(null, '', location.href);
    }
  });
  if(isLockEnabled()) history.pushState(null, '', location.href);
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
