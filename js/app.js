// ===== MAIN APPLICATION ENTRY POINT =====
import { initStore, getSettings, updateSettings, addTransaction, getRecurringList, addBulkTransactions, updateRecurring } from './store.js';
import { initRouter, navigate, registerPage } from './router.js';
import { initModals } from './modals.js';
import { setChartUtils } from './charts.js';
import { fmt, fmtShort, EXPENSE_CATS, validateTransaction, uid, today } from './utils.js';
import { applyTheme } from './pages/settings.js';
import { toastSuccess } from './toast.js';
import { initLockScreen, lockApp, resetLockTimer, stopLockTimer } from './lockscreen.js';
import { isLocked, isLockEnabled } from './security.js';

// Page imports
import { renderDashboard } from './pages/dashboard.js';
import { renderTransactions } from './pages/transactions.js';
import { renderWeekly, renderMonthly, renderYearly } from './pages/reports.js';
import { renderBudgets } from './pages/budgets.js';
import { renderRecurring } from './pages/recurring.js';
import { renderSavings } from './pages/savings.js';
import { renderExport } from './pages/export-page.js';
import { renderSettings } from './pages/settings.js';

// ===== RECURRING PROCESSING =====
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

// ===== AUTO-LOCK & LIFECYCLE =====
let _unlocked = false;
let _lockPaused = false;
let _isUnloading = false;

function startAutoLock() {
  _unlocked = true;
  const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];
  const resetTimer = () => {
    if(_lockPaused || !isLockEnabled() || isLocked()) return;
    resetLockTimer(lockApp);
  };
  activityEvents.forEach(evt => document.addEventListener(evt, resetTimer, { passive: true }));
  resetLockTimer(lockApp);
}

function setupLifecycleLocks() {
  // Expose pause/resume for file dialogs (import/export)
  window.__pauseAutoLock = () => { _lockPaused = true; stopLockTimer(); };
  window.__resumeAutoLock = () => { _lockPaused = false; if(isLockEnabled() && !isLocked()) resetLockTimer(lockApp); };

  // Detect page unload — skip lock flash on reload
  window.addEventListener('beforeunload', () => { _isUnloading = true; });

  // Lock on tab hide (only after first unlock, not on page unload)
  document.addEventListener('visibilitychange', () => {
    if(!_unlocked || _lockPaused || _isUnloading) return;
    if(document.hidden && isLockEnabled() && !isLocked()) {
      lockApp();
    }
  });

  // Lock on window blur (mobile: user switches app) — with delay to avoid false triggers
  let _blurTimeout = null;
  window.addEventListener('blur', () => {
    if(!_unlocked || _lockPaused) return;
    if(!isLockEnabled() || isLocked()) return;
    _blurTimeout = setTimeout(() => {
      if(!_lockPaused && isLockEnabled() && !isLocked()) lockApp();
    }, 2000);
  });
  window.addEventListener('focus', () => {
    if(_blurTimeout) { clearTimeout(_blurTimeout); _blurTimeout = null; }
  });
}

// ===== QUICK ADD FAB =====
function setupQuickAdd() {
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
}

// ===== THEME TOGGLE =====
function setupThemeToggle() {
  const themeToggle = document.getElementById('themeToggle');
  if(themeToggle) {
    themeToggle.addEventListener('click', () => {
      const s = getSettings();
      const newTheme = s.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      themeToggle.classList.toggle('active', newTheme === 'dark');
      updateSettings('theme', newTheme);
    });
  }
}

// ===== INITIALIZE =====
function init() {
  initStore();

  const settings = getSettings();
  setChartUtils(
    (n, c) => fmt(n, c || settings.currency),
    (n, c) => fmtShort(n, c || settings.currency)
  );

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

  initModals();
  initRouter();
  applyTheme();
  processRecurring();
  setupThemeToggle();
  setupQuickAdd();
  setupLifecycleLocks();

  // Hide main content until unlocked
  const mainEl = document.getElementById('mainContent');
  if(mainEl) mainEl.style.visibility = 'hidden';

  // Init lock screen — blocks until unlocked
  initLockScreen(() => {
    if(mainEl) mainEl.style.visibility = 'visible';
    navigate('dashboard');
    startAutoLock();
  });
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
