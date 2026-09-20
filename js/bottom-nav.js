/* ==================================================================
   BOTTOM-NAV.JS — Mobile bottom navigation + Library tabs + Search
   Delegates page switching to window.Pages
   Exposes: window.BottomNav → { init, showToast }
================================================================== */

window.BottomNav = (function () {
    let navItems;

    /* ================================================================
       TINY TOAST
    ================================================================ */
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

    /* ================================================================
       SEARCH PAGE WIRING
    ================================================================ */
    function initSearchPage() {
        const input = document.getElementById('mobile-search-input');
        const clearBtn = document.getElementById('mobile-search-clear');
        if (!input) return;

        input.addEventListener('input', (e) => {
            const q = e.target.value;
            if (clearBtn) clearBtn.classList.toggle('visible', q.trim().length > 0);
            if (window.Search && window.Search.filter) window.Search.filter(q);
        });

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

        /* Search category tiles */
        document.querySelectorAll('.search-cat').forEach(cat => {
            cat.addEventListener('click', () => {
                const name = cat.querySelector('span')?.textContent || 'Category';
                showToast(`${name} — coming soon 🎵`);
            });
        });
    }

    /* ================================================================
       LIBRARY → LIKED TAB RENDERER
       Renders liked songs directly inside the Library's Liked tab
    ================================================================ */
    function renderLibraryLiked() {
        const container = document.querySelector('.library-tab-content[data-content="liked"]');
        if (!container) return;

        const likedIds = (window.Likes && window.Likes.getAll) ? window.Likes.getAll() : [];
        const tracks = window.tracks || [];

        /* Empty state */
        if (!likedIds.length) {
            container.innerHTML = `
                <div class="library-empty">
                    <i class="fas fa-heart"></i>
                    <p>Songs you like will appear here</p>
                    <span>Tap the heart on any song to save it</span>
                </div>
            `;
            return;
        }

        const likedTracks = likedIds
            .map(id => {
                const track = tracks.find(t => t.id === id);
                if (!track) return null;
                return { track, idx: tracks.indexOf(track) };
            })
            .filter(Boolean);

        container.innerHTML = likedTracks.map(({ track, idx }) => `
            <div class="library-song-item" data-track-index="${idx}" data-track-id="${track.id}">
                <div class="library-song-thumb">
                    <img src="${track.art}" alt="">
                </div>
                <div class="library-song-info">
                    <span class="library-song-title">${track.title}</span>
                    <span class="library-song-artist">${track.artist}</span>
                </div>
                <i class="fas fa-heart song-like active" data-track-id="${track.id}"></i>
            </div>
        `).join('');

        /* Wire click → play song */
        container.querySelectorAll('.library-song-item').forEach(row => {
            row.addEventListener('click', (e) => {
                if (e.target.classList.contains('song-like')) return;
                const idx = parseInt(row.getAttribute('data-track-index'), 10);
                if (!isNaN(idx) && window.Player) {
                    window.Player.loadTrack(idx, true);
                }
            });
        });

        /* Sync heart visual state */
        if (window.Likes && window.Likes.syncAllHearts) {
            window.Likes.syncAllHearts(container);
        }
    }

    /* ================================================================
       LIBRARY PAGE TABS
    ================================================================ */
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

                /* NEW: Render liked songs when Liked tab is selected */
                if (key === 'liked') {
                    renderLibraryLiked();
                }
            });
        });

        /* If Liked tab is already active on load, render immediately */
        const activeTab = document.querySelector('.library-tab.active');
        if (activeTab && activeTab.getAttribute('data-tab') === 'liked') {
            renderLibraryLiked();
        }

        /* Library items → play track OR open artist profile */
        document.querySelectorAll('.library-item, .library-liked-card').forEach(item => {
            if (item._libBound) return;
            item._libBound = true;

            item.addEventListener('click', () => {
                const target = item.getAttribute('data-play-target');

                /* 1) Liked Songs card → open Liked tab */
                if (target === 'liked') {
                    const likedTab = document.querySelector('.library-tab[data-tab="liked"]');
                    if (likedTab) likedTab.click();
                    return;
                }

                /* 2) Artist item → open artist profile */
                const isArtistItem = item.querySelector('.library-artist-art') !== null;
                if (isArtistItem) {
                    const artistName = item.querySelector('.library-item-title')?.textContent?.trim();
                    const artistImg = item.querySelector('.library-artist-art img')?.src;
                    console.log('[BottomNav] Artist item clicked:', artistName);

                    if (artistName && window.Pages && window.Pages.openArtistProfile) {
                        window.Pages.openArtistProfile(artistName, {
                            from: 'library',
                            fallbackImage: artistImg
                        });
                    }
                    return;
                }

                /* 3) Playlist / Album → play track */
                const idx = parseInt(target, 10);
                if (!isNaN(idx) && window.Player) {
                    window.Player.loadTrack(idx, true);
                }
            });
        });

        /* Library add button → open create playlist modal */
        const addBtn = document.getElementById('library-add-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                const openModalBtn = document.getElementById('btn-open-playlist-modal');
                if (openModalBtn) openModalBtn.click();
            });
        }

        /* Re-render liked tab when likes change (only if visible) */
        window.addEventListener('likes:updated', () => {
            const libLiked = document.querySelector('.library-tab-content[data-content="liked"]');
            if (libLiked && libLiked.style.display !== 'none') {
                renderLibraryLiked();
            }
        });
    }

    /* ================================================================
       BOTTOM NAV HANDLER
    ================================================================ */
    function handleNav(navKey) {
        switch (navKey) {
            case 'home':
                if (window.Pages) window.Pages.navigate('home');
                break;
            case 'search':
                if (window.Pages) window.Pages.navigate('search');
                break;
            case 'library':
                if (window.Pages) window.Pages.navigate('library');
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

    /* ================================================================
       INIT
    ================================================================ */
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

        /* Mark Home as active on load */
        const homeItem = document.querySelector('.mbn-item[data-nav="home"]');
        if (homeItem) homeItem.classList.add('active');

        initLibraryTabs();
        initSearchPage();

        console.log('[BottomNav] Initialized.');
    }

    return {
        init,
        showToast,
        renderLibraryLiked
    };
})();