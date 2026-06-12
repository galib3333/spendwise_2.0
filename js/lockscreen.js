// ===== LOCK SCREEN UI =====
import {
  hasPIN, setupPIN, verifyPIN, removePIN,
  isLockEnabled, setLocked,
  isLockedOut, getRemainingLockoutMs,
  startLockTimer, stopLockTimer, resetLockTimer, getLockTimeout, setLockTimeout
} from './security.js';

let _onUnlock = null;
let _pin = '';
let _step = 'enter'; // enter | setup | confirm | change
let _setupPin = '';
let _keyBound = false;

const lockSVG = `<svg class="lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="0" ry="0"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>`;
const unlockSVG = `<svg class="lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="0" ry="0"/><path d="M7 11V7a5 5 0 019.9-1"/></svg>`;

function getPanel() { return document.getElementById('lockPanel'); }
function getScreen() { return document.getElementById('lockScreen'); }

function renderDots(count, max = 4) {
  let html = '<div class="pin-dots">';
  for(let i = 0; i < max; i++) {
    const filled = i < count ? 'filled' : '';
    html += `<div class="pin-dot ${filled}"></div>`;
  }
  html += '</div>';
  return html;
}

function renderPinPad() {
  const keys = ['1','2','3','4','5','6','7','8','9'];
  let html = '<div class="pin-pad">';
  keys.forEach(k => { html += `<button type="button" class="pin-key" data-key="${k}">${k}</button>`; });
  html += `<button type="button" class="pin-key" data-key=""></button>`;
  html += `<button type="button" class="pin-key" data-key="0">0</button>`;
  html += `<button type="button" class="pin-key del" data-key="del">⌫</button>`;
  html += '</div>';
  return html;
}

function renderEnterScreen() {
  const panel = getPanel();
  panel.innerHTML = `
    ${lockSVG}
    <h2>Welcome Back</h2>
    <p>Enter your PIN to unlock</p>
    ${renderDots(_pin.length)}
    <div class="lock-error" id="lockError"></div>
    ${renderPinPad()}
    <div class="lock-footer">
      <button type="button" id="lockPrivacyLink">Privacy Policy</button>
    </div>
  `;
  bindPinKeys();
  document.getElementById('lockPrivacyLink')?.addEventListener('click', showPrivacyModal);
}

function renderSetupScreen() {
  const panel = getPanel();
  panel.classList.add('lock-setup');
  panel.innerHTML = `
    ${unlockSVG}
    <h2>Set Up PIN</h2>
    <p>Choose a 4-8 digit PIN</p>
    ${renderDots(_pin.length)}
    <div class="lock-error" id="lockError"></div>
    ${renderPinPad()}
    <div class="lock-footer">
      <button type="button" id="lockSkipBtn">Skip for now</button>
    </div>
  `;
  bindPinKeys();
  document.getElementById('lockSkipBtn')?.addEventListener('click', () => {
    _pin = '';
    setLocked(false);
    hide();
    if(_onUnlock) _onUnlock();
  });
}

function renderConfirmScreen() {
  const panel = getPanel();
  panel.innerHTML = `
    ${unlockSVG}
    <h2>Confirm PIN</h2>
    <p>Re-enter your PIN to confirm</p>
    ${renderDots(_pin.length)}
    <div class="lock-error" id="lockError"></div>
    ${renderPinPad()}
  `;
  bindPinKeys();
}

function renderChangeScreen() {
  const panel = getPanel();
  panel.innerHTML = `
    ${lockSVG}
    <h2>Change PIN</h2>
    <p>Enter your current PIN</p>
    ${renderDots(_pin.length)}
    <div class="lock-error" id="lockError"></div>
    ${renderPinPad()}
  `;
  bindPinKeys();
}

function bindPinKeys() {
  // Remove old keydown listener to prevent stacking
  if(_keyBound) document.removeEventListener('keydown', handleKeyDown);

  document.querySelectorAll('.pin-key').forEach(btn => {
    btn.replaceWith(btn.cloneNode(true));
  });
  document.querySelectorAll('.pin-key').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const key = btn.dataset.key;
      if(key === 'del') {
        _pin = _pin.slice(0, -1);
      } else if(key !== '' && _pin.length < 8) {
        _pin += key;
      }
      updateDots();
      if(_pin.length >= 4) handlePinComplete();
    });
  });

  document.addEventListener('keydown', handleKeyDown);
  _keyBound = true;
}

function handleKeyDown(e) {
  const screen = getScreen();
  if(!screen?.classList.contains('show')) {
    document.removeEventListener('keydown', handleKeyDown);
    _keyBound = false;
    return;
  }
  if(e.key >= '0' && e.key <= '9' && _pin.length < 8) {
    _pin += e.key;
    updateDots();
    if(_pin.length >= 4) handlePinComplete();
  } else if(e.key === 'Backspace') {
    e.preventDefault();
    _pin = _pin.slice(0, -1);
    updateDots();
  }
}

function updateDots() {
  document.querySelectorAll('.pin-dot').forEach((dot, i) => {
    dot.classList.toggle('filled', i < _pin.length);
    dot.classList.remove('error');
  });
}

function showError(msg) {
  const el = document.getElementById('lockError');
  if(el) el.textContent = msg;
  document.querySelectorAll('.pin-dot').forEach(d => {
    d.classList.add('error');
    setTimeout(() => d.classList.remove('error'), 400);
  });
}

async function handlePinComplete() {
  if(_step === 'setup') {
    _setupPin = _pin;
    _pin = '';
    _step = 'confirm';
    renderConfirmScreen();
  } else if(_step === 'confirm') {
    if(_pin === _setupPin) {
      const ok = await setupPIN(_pin);
      if(ok) {
        _pin = '';
        setLocked(false);
        hide();
        if(_onUnlock) _onUnlock();
      } else {
        showError('Failed to set PIN');
      }
    } else {
      showError('PINs do not match');
      _pin = '';
      setTimeout(() => { _step = 'setup'; renderSetupScreen(); }, 800);
    }
  } else if(_step === 'enter') {
    if(isLockedOut()) {
      const ms = getRemainingLockoutMs();
      const sec = Math.ceil(ms / 1000);
      showError(`Too many attempts. Wait ${sec}s`);
      _pin = '';
      updateDots();
      return;
    }
    const ok = await verifyPIN(_pin);
    if(ok) {
      _pin = '';
      setLocked(false);
      hide();
      if(_onUnlock) _onUnlock();
    } else {
      showError('Incorrect PIN');
      _pin = '';
      updateDots();
    }
  } else if(_step === 'change') {
    const ok = await verifyPIN(_pin);
    if(ok) {
      _pin = '';
      _step = 'setup';
      renderSetupScreen();
    } else {
      showError('Incorrect current PIN');
      _pin = '';
      updateDots();
    }
  }
}

function showPrivacyModal() {
  import('./security.js').then(mod => {
    const policy = mod.getPrivacyPolicy();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay show';
    overlay.innerHTML = `<div class="modal" style="max-width:600px;max-height:80vh;overflow-y:auto">
      <h3>Privacy Policy</h3>
      <div style="color:var(--text2);font-size:0.8rem;line-height:1.6;white-space:pre-wrap">${policy}</div>
      <div class="modal-actions">
        <button type="button" class="btn btn-primary" id="privacyCloseBtn">Close</button>
      </div>
    </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if(e.target === overlay) overlay.remove(); });
    overlay.querySelector('#privacyCloseBtn')?.addEventListener('click', () => overlay.remove());
  });
}

export function showLockScreen(onUnlock) {
  _onUnlock = onUnlock;
  _pin = '';
  const screen = getScreen();
  if(!screen) return;

  if(!hasPIN()) {
    _step = 'setup';
    renderSetupScreen();
  } else {
    _step = 'enter';
    renderEnterScreen();
  }

  screen.classList.add('show');
  setLocked(true);
  stopLockTimer();
}

function hide() {
  const screen = getScreen();
  if(screen) screen.classList.remove('show');
  if(_keyBound) {
    document.removeEventListener('keydown', handleKeyDown);
    _keyBound = false;
  }
}

export function lockApp() {
  _pin = '';
  _step = 'enter';
  renderEnterScreen();
  getScreen()?.classList.add('show');
  setLocked(true);
  stopLockTimer();
}

export function initLockScreen(onUnlock) {
  _onUnlock = onUnlock;
  if(!isLockEnabled()) {
    setLocked(false);
    if(onUnlock) onUnlock();
    return;
  }
  showLockScreen(onUnlock);
}

export function changePIN() {
  if(!hasPIN()) return;
  _pin = '';
  _step = 'change';
  const screen = getScreen();
  renderChangeScreen();
  screen?.classList.add('show');
}

export function disableLock() {
  removePIN();
  setLocked(false);
  hide();
  stopLockTimer();
}

export { resetLockTimer, startLockTimer, stopLockTimer, getLockTimeout, setLockTimeout };
