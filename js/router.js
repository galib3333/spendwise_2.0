// ===== ROUTER / NAVIGATION =====
let currentPage = 'dashboard';
const pageRenderers = {};
let onNavigate = null;

export function registerPage(name, renderFn) {
  pageRenderers[name] = renderFn;
}

export function navigate(page) {
  if(!pageRenderers[page]) return;
  currentPage = page;

  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.toggle('active', n.dataset.page === page);
    n.setAttribute('aria-current', n.dataset.page === page ? 'page' : 'false');
  });

  const main = document.getElementById('mainContent');
  if(main) {
    main.innerHTML = '';
    pageRenderers[page](main);
  }

  toggleSidebar(false);

  if(onNavigate) onNavigate(page);
}

function toggleSidebar(force) {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('overlay');
  if(!sb || !ov) return;
  const open = force !== undefined ? force : !sb.classList.contains('open');
  sb.classList.toggle('open', open);
  ov.classList.toggle('show', open);

  if(open) {
    const firstFocusable = sb.querySelector('button, [tabindex], a');
    if(firstFocusable) firstFocusable.focus();
  }
}

export function initRouter() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => navigate(item.dataset.page));
  });

  const hamburger = document.getElementById('hamburgerBtn');
  const overlay = document.getElementById('overlay');
  if(hamburger) hamburger.addEventListener('click', () => toggleSidebar());
  if(overlay) overlay.addEventListener('click', () => toggleSidebar(false));

  document.addEventListener('keydown', e => {
    if(e.key === 'Escape') {
      const sb = document.getElementById('sidebar');
      if(sb && sb.classList.contains('open')) {
        toggleSidebar(false);
      }
    }
  });
}
