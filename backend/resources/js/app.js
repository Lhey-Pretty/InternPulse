// ── Dark mode ──────────────────────────────────────────────────────────────────
function applyTheme(dark) {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('ip-theme', dark ? 'dark' : 'light');
    updateThemeIcons(dark);
}

function updateThemeIcons(dark) {
    document.querySelectorAll('[data-theme-icon]').forEach(el => {
        el.textContent = dark ? '☀️' : '🌙';
        el.title = dark ? 'Switch to Light Mode' : 'Switch to Dark Mode';
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('ip-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = saved ? saved === 'dark' : prefersDark;
    applyTheme(isDark);

    document.querySelectorAll('[data-toggle-theme]').forEach(btn => {
        btn.addEventListener('click', () => {
            applyTheme(!document.documentElement.classList.contains('dark'));
        });
    });
});

// ── Toast notifications ────────────────────────────────────────────────────────
window.toast = function (message, type = 'success', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const colors = {
        success: 'bg-green-600',
        error:   'bg-red-600',
        info:    'bg-blue-600',
        warning: 'bg-yellow-500',
    };

    const icons = {
        success: '✓',
        error:   '✕',
        info:    'ℹ',
        warning: '⚠',
    };

    const el = document.createElement('div');
    el.className = `toast-enter flex items-center gap-3 px-4 py-3 rounded-xl text-white text-sm font-medium shadow-lg max-w-sm ${colors[type] ?? colors.success}`;
    el.innerHTML = `<span class="shrink-0 text-base">${icons[type] ?? icons.success}</span><span class="flex-1">${message}</span><button onclick="this.parentElement.remove()" class="shrink-0 opacity-70 hover:opacity-100 ml-1">✕</button>`;

    container.appendChild(el);

    setTimeout(() => {
        el.classList.remove('toast-enter');
        el.classList.add('toast-leave');
        el.addEventListener('animationend', () => el.remove());
    }, duration);
};

// Auto-show flash messages as toasts (if present in DOM)
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-flash]').forEach(el => {
        const type = el.dataset.flash;
        const msg  = el.dataset.message;
        if (msg) setTimeout(() => window.toast(msg, type), 200);
    });
});

// ── Form loading state ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('form').forEach(form => {
        form.addEventListener('submit', function () {
            const btn = this.querySelector('button[type="submit"]');
            if (!btn || btn.dataset.noLoading) return;
            btn.disabled = true;
            btn.dataset.originalText = btn.innerHTML;
            btn.innerHTML = `<svg class="animate-spin w-4 h-4 inline mr-1.5 -mt-0.5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Processing…`;
        });
    });
});

// ── Sidebar mobile toggle ──────────────────────────────────────────────────────
window.toggleSidebar = function () {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const isOpen  = !sidebar.classList.contains('-translate-x-full');
    sidebar.classList.toggle('-translate-x-full', isOpen);
    overlay.classList.toggle('hidden', isOpen);
    overlay.classList.toggle('opacity-0', isOpen);
};

// ── Confirm delete helpers ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-confirm]').forEach(el => {
        el.addEventListener('click', function (e) {
            if (!confirm(this.dataset.confirm)) e.preventDefault();
        });
    });
});
