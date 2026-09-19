/* ==================================================================
   BOTTOM-NAV.JS — Mobile bottom navigation with page switching
   Home · Search · Library · Premium · Create
   Exposes: window.BottomNav
================================================================== */

window.BottomNav = (function () {
    let navItems;

    /* ---------- Helpers ---------- */
    function scrollToTop() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function resetFilters() {
        document.querySelectorAll('.music-card').forEach(c => c.style.display = '');
        document.querySelectorAll('.song-row').forEach(r => r.style.display = '');
    }

    /* Remove all page classes */
    function clearAllPages() {
        document.body.classList.remove('page-library', 'page-search');
    }

    /* Switch to a page: 'home' | 'library' | 'search' */
    function switchPage(page) {
        clearAllPages();

        if (page === 'library') {
            document.body.classList.add('page-library');
        } else if (page === 'search') {
            document.body.classList.add('page-search');
            /* Auto-focus the search input */
            setTimeout(() => {
                const input = document.getElementById('mobile-search-input');
                if (input) input.focus();
            }, 180);
        }
        /* 'home' → no class, shows default home content */

        /* Scroll to top on every page change */
        scrollToTop();
    }

    /* ---------- Tiny toast ---------- */
    function showToast(message) {
        let toast = document.getElementById('reverb-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'reverb-toast';
            toast.style.cssText = `
                position: fixed;
                bottom: 140px;
                left: 50%;
                transform: translateX(-50%) translateY(20px);
                background: #1b1d2e;
                color: #fff;
                padding: 10px 18px;
                border-radius: 10px;
                font-size: 0.82rem;
                font-weight: 500;
                border: 1px solid rgba(255, 255, 255, 0.12);
                box-shadow: 0 12px 30px rgba(0, 0, 0, 0.6);
                z-index: 3000;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.25s ease, transform 0.25s ease;
                white-space: nowrap;
            `;
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(20px)';
        }, 1800);
    }

    /* ---------- Handle a bottom-nav button ---------- */
    function handleNav(navKey) {
        switch (navKey) {

            case 'home':
                resetFilters();
                if (window.Search && window.Search.clear) window.Search.clear();
                switchPage('home');
                break;

            case 'search':
                switchPage('search');
                break;

            case 'library':
                switchPage('library');
                break;

            case 'premium':
                showToast('Premium — coming soon ✨');
                break;

            case 'create':
                const openModalBtn = document.getElementById('btn-open-playlist-modal');
                if (openModalBtn) openModalBtn.click();
                break;
        }
    }

    /* ---------- Wire up library tabs ---------- */
    function initLibraryTabs() {
        const tabs = document.querySelectorAll('.library-tab');
        const contents = document.querySelectorAll('.library-tab-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                const key = tab.getAttribute('data-tab');
                contents.forEach(c => {
                    c.style.display = (c.getAttribute('data-content') === key) ? 'flex' : 'none';
                });
            });
        });

        /* Library item clicks → play a track */
        document.querySelectorAll('.library-item, .library-liked-card').forEach(item => {
            item.addEventListener('click', () => {
                const target = item.getAttribute('data-play-target');
                if (target === 'liked') {
                    /* Switch to the Liked tab */
                    const likedTab = document.querySelector('.library-tab[data-tab="liked"]');
                    if (likedTab) likedTab.click();
                    return;
                }
                const idx = parseInt(target, 10);
                if (!isNaN(idx) && window.Player) {
                    window.Player.loadTrack(idx, true);
                }
            });
        });

        /* Library add button → open create modal */
        const addBtn = document.getElementById('library-add-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                const openModalBtn = document.getElementById('btn-open-playlist-modal');
                if (openModalBtn) openModalBtn.click();
            });
        }
    }

    /* ---------- Wire up mobile search page ---------- */
    function initSearchPage() {
        const input = document.getElementById('mobile-search-input');
        const clearBtn = document.getElementById('mobile-search-clear');
        if (!input) return;

        input.addEventListener('input', (e) => {
            const q = e.target.value;
            if (clearBtn) clearBtn.classList.toggle('visible', q.trim().length > 0);

            /* Search.filter() also builds + shows live suggestions */
            if (window.Search && window.Search.filter) {
                window.Search.filter(q);
            }
        });

        /* Press Enter → dismiss keyboard, keep suggestions */
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                input.blur();
            }
        });

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                input.value = '';
                clearBtn.classList.remove('visible');
                if (window.Search && window.Search.clear) window.Search.clear();
                input.focus();
            });
        }

        /* Category tiles → toast for now */
        document.querySelectorAll('.search-cat').forEach(cat => {
            cat.addEventListener('click', () => {
                const name = cat.querySelector('span')?.textContent || 'Category';
                showToast(`${name} — coming soon 🎵`);
            });
        });
    }

    /* ---------- Init ---------- */
    function init() {
        navItems = document.querySelectorAll('.mbn-item');
        if (!navItems.length) return;

        navItems.forEach(item => {
            item.addEventListener('mousedown', (e) => e.preventDefault());

            item.addEventListener('click', () => {
                navItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                item.blur();

                const navKey = item.getAttribute('data-nav');
                handleNav(navKey);
            });
        });

        /* Ensure Home starts active */
        const homeItem = document.querySelector('.mbn-item[data-nav="home"]');
        if (homeItem) homeItem.classList.add('active');

        initLibraryTabs();
        initSearchPage();

        /* Default page: home (no class) */
        clearAllPages();
    }

    return { init, showToast, switchPage };
})();