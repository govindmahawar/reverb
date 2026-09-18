/* ==================================================================
   SIDEBAR.JS — Retractable sidebar (desktop) + slide-in drawer (mobile)
   Exposes: window.Sidebar
================================================================== */

window.Sidebar = (function () {
    let appShell, sidebar, sidebarToggleBtn, mobileMenuBtn, backdrop;

    /* ---------- Mobile open/close ---------- */
    function openMobileSidebar() {
        if (!sidebar || !backdrop) return;
        sidebar.classList.add('mobile-open');
        backdrop.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeMobileSidebar() {
        if (!sidebar || !backdrop) return;
        sidebar.classList.remove('mobile-open');
        backdrop.classList.remove('active');
        document.body.style.overflow = '';
    }

    function isMobile() {
        return window.matchMedia('(max-width: 768px)').matches;
    }

    /* ---------- Init ---------- */
    function init() {
        appShell = document.querySelector('.app-shell');
        sidebar = document.querySelector('.sidebar');
        sidebarToggleBtn = document.getElementById('sidebar-toggle');
        mobileMenuBtn = document.getElementById('mobile-menu-btn');
        backdrop = document.getElementById('sidebar-backdrop');

        if (!appShell || !sidebar) return;

        /* ---- Desktop: retract toggle + localStorage ---- */
        if (localStorage.getItem('reverb_sidebar_collapsed') === 'true') {
            appShell.classList.add('sidebar-collapsed');
        }

        if (sidebarToggleBtn) {
            sidebarToggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();

                /* On mobile, toggle button acts as "close drawer" */
                if (isMobile()) {
                    closeMobileSidebar();
                    return;
                }

                appShell.classList.toggle('sidebar-collapsed');
                localStorage.setItem(
                    'reverb_sidebar_collapsed',
                    appShell.classList.contains('sidebar-collapsed')
                );
            });
        }

        /* ---- Mobile: hamburger opens drawer ---- */
        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (sidebar.classList.contains('mobile-open')) {
                    closeMobileSidebar();
                } else {
                    openMobileSidebar();
                }
            });
        }

        /* ---- Mobile: backdrop click closes ---- */
        if (backdrop) {
            backdrop.addEventListener('click', closeMobileSidebar);
        }

        /* ---- Escape key closes drawer ---- */
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeMobileSidebar();
        });

        /* ---- Auto-close drawer on nav item click (mobile) ---- */
        sidebar.querySelectorAll('.nav-btn, .playlist-mini').forEach(item => {
            item.addEventListener('click', () => {
                if (isMobile()) closeMobileSidebar();
            });
        });

        /* ---- Auto-close when resizing back to desktop ---- */
        window.addEventListener('resize', () => {
            if (!isMobile()) {
                closeMobileSidebar();
            }
        });
    }

    return {
        init,
        open: openMobileSidebar,
        close: closeMobileSidebar
    };
})();