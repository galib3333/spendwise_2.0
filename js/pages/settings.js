// ===== SETTINGS PAGE =====
import { getSettings, updateSettings, clearAllData } from '../store.js';
import { toastSuccess } from '../toast.js';

function applyTheme() {
  const settings = getSettings();
  document.documentElement.setAttribute('data-theme', settings.theme);
  const toggle = document.getElementById('themeToggle');
  if(toggle) toggle.classList.toggle('active', settings.theme === 'dark');
}

function toggleTheme() {
  const settings = getSettings();
  const newTheme = settings.theme === 'dark' ? 'light' : 'dark';
  updateSettings('theme', newTheme);
  applyTheme();
}

export function renderSettings(container) {
  const settings = getSettings();

  container.innerHTML = `
    <div class="fade-in">
      <div class="header"><h2>Settings</h2></div>
      <div class="panel" style="max-width:500px">
        <h3 style="margin-bottom:20px">Preferences</h3>
        <div class="input-group">
          <label for="settingCurrency">Currency Symbol</label>
          <select class="input" id="settingCurrency">
            <option value="₹" ${settings.currency === '₹' ? 'selected' : ''}>₹ (Indian Rupee)</option>
            <option value="$" ${settings.currency === '$' ? 'selected' : ''}>$ (US Dollar)</option>
            <option value="€" ${settings.currency === '€' ? 'selected' : ''}>€ (Euro)</option>
            <option value="£" ${settings.currency === '£' ? 'selected' : ''}>£ (British Pound)</option>
            <option value="¥" ${settings.currency === '¥' ? 'selected' : ''}>¥ (Japanese Yen)</option>
            <option value="৳" ${settings.currency === '৳' ? 'selected' : ''}>৳ (Bangladeshi Taka)</option>
          </select>
        </div>
        <div class="input-group">
          <label>Theme</label>
          <div class="flex flex-center gap-8">
            <span class="text-sm">Light</span>
            <div class="toggle ${settings.theme === 'dark' ? 'active' : ''}" id="themeToggleSettings" role="switch" aria-checked="${settings.theme === 'dark'}" aria-label="Toggle dark theme" tabindex="0"></div>
            <span class="text-sm">Dark</span>
          </div>
        </div>
        <hr style="border:none;border-top:1px solid var(--border);margin:20px 0">
        <h3 style="margin-bottom:16px">Danger Zone</h3>
        <button class="btn btn-danger" id="resetDataBtn" aria-label="Delete all data">
          Reset All Data
        </button>
      </div>
    </div>
  `;

  document.getElementById('settingCurrency')?.addEventListener('change', e => {
    updateSettings('currency', e.target.value);
    toastSuccess('Currency updated');
  });

  document.getElementById('themeToggleSettings')?.addEventListener('click', () => {
    toggleTheme();
  });

  document.getElementById('themeToggleSettings')?.addEventListener('keydown', e => {
    if(e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleTheme();
    }
  });

  document.getElementById('resetDataBtn')?.addEventListener('click', () => {
    if(confirm('Delete ALL data? This cannot be undone.')) {
      clearAllData();
      toastSuccess('All data cleared');
      applyTheme();
    }
  });
}

export { applyTheme };
