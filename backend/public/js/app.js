// ── Dark mode ──────────────────────────────────────────────────────────────────
function applyTheme(dark) {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('ip-theme', dark ? 'dark' : 'light');
    document.querySelectorAll('[data-theme-icon]').forEach(function(el) {
        el.innerHTML = dark
            ? '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>'
            : '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>';
    });
}

document.addEventListener('DOMContentLoaded', function() {
    var saved = localStorage.getItem('ip-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var isDark = saved ? saved === 'dark' : prefersDark;
    applyTheme(isDark);

    document.querySelectorAll('[data-toggle-theme]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            applyTheme(!document.documentElement.classList.contains('dark'));
        });
    });
});

// ── Toast notifications ────────────────────────────────────────────────────────
window.toast = function(message, type, duration) {
    type = type || 'success';
    duration = duration || 4000;
    var container = document.getElementById('toast-container');
    if (!container) return;

    var colors = { success: 'bg-emerald-500', error: 'bg-rose-500', info: 'bg-sky-500', warning: 'bg-amber-500' };
    var icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };

    var el = document.createElement('div');
    el.className = 'toast-enter flex items-center gap-3 px-5 py-3.5 rounded-xl text-white text-sm font-medium shadow-xl max-w-sm ' + (colors[type] || colors.success);
    el.innerHTML = '<span class="shrink-0 text-lg">' + (icons[type] || icons.success) + '</span><span class="flex-1">' + message + '</span><button onclick="this.parentElement.remove()" class="shrink-0 opacity-70 hover:opacity-100 ml-1 text-lg">×</button>';

    container.appendChild(el);
    setTimeout(function() {
        el.classList.remove('toast-enter');
        el.classList.add('toast-leave');
        el.addEventListener('animationend', function() { el.remove(); });
    }, duration);
};

// Auto-show flash messages as toasts
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('[data-flash]').forEach(function(el) {
        var type = el.dataset.flash;
        var msg = el.dataset.message;
        if (msg) setTimeout(function() { window.toast(msg, type); }, 300);
    });
});

// ── Form loading state ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('form').forEach(function(form) {
        form.addEventListener('submit', function() {
            var btn = this.querySelector('button[type="submit"]');
            if (!btn || btn.dataset.noLoading) return;
            btn.disabled = true;
            btn.dataset.originalText = btn.innerHTML;
            btn.innerHTML = '<svg class="animate-spin w-4 h-4 inline mr-1.5 -mt-0.5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Processing…';
        });
    });
});

// ── Sidebar mobile toggle ──────────────────────────────────────────────────────
window.toggleSidebar = function() {
    var sidebar = document.getElementById('sidebar');
    var overlay = document.getElementById('sidebar-overlay');
    if (!sidebar || !overlay) return;
    var isOpen = !sidebar.classList.contains('-translate-x-full');
    sidebar.classList.toggle('-translate-x-full', isOpen);
    overlay.classList.toggle('hidden', isOpen);
};

// ── Confirm delete helpers ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('[data-confirm]').forEach(function(el) {
        el.addEventListener('click', function(e) {
            if (!confirm(this.dataset.confirm)) e.preventDefault();
        });
    });
});
