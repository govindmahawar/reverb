/* ==================================================================
   PAGES.JS — Central page router
   Handles: Home, Search, Explore, Artists (+ profile), Album,
            Playlists, Liked, Recent, Downloads, Profile Edit,
            Settings, Following, Library
   Works on BOTH desktop (sidebar) and mobile (bottom nav).
   Exposes: window.Pages
================================================================== */

window.Pages = (function () {

    /* Map: sidebar data-title → body class (or '' for home) */
    const NAV_TO_PAGE = {
        'Home':            '',
        'Search':          'page-search',
        'Explore':         'page-explore',
        'Artists':         'page-artists',
        'Playlists':       'page-playlists',
        'Liked Songs':     'page-liked',
        'Recently Played': 'page-recent',
        'Downloads':       'page-downloads'
    };

    /* All body classes we manage */
    const ALL_PAGE_CLASSES = [
        'page-search',
        'page-library',
        'page-explore',
        'page-artists',
        'page-artist-profile',
        'page-album',
        'page-playlists',
        'page-liked',
        'page-recent',
        'page-downloads',
        'page-profile-edit',
        'page-settings',
        'page-followed',
        'page-admin'
    ];

    let currentArtistName = null;
    let previousPageKey = 'artists';

    /* ---------- Utilities ---------- */
    function scrollToTop() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        document.querySelector('.main-content')?.scrollTo?.({ top: 0, behavior: 'smooth' });
    }

    function clearAllPageClasses() {
        ALL_PAGE_CLASSES.forEach(c => document.body.classList.remove(c));
    }

    function resetFilters() {
        document.querySelectorAll('.music-card').forEach(c => c.style.display = '');
        document.querySelectorAll('.song-row').forEach(s => s.style.display = '');

        const nr = document.querySelector('.no-results-msg');
        if (nr) nr.style.display = 'none';

        const dInput = document.getElementById('search-input');
        if (dInput) dInput.value = '';
        const mInput = document.getElementById('mobile-search-input');
        if (mInput) mInput.value = '';
        const clearBtn = document.getElementById('mobile-search-clear');
        if (clearBtn) clearBtn.classList.remove('visible');
        const sugg = document.getElementById('search-suggestions');
        if (sugg) { sugg.classList.remove('visible'); sugg.innerHTML = ''; }
        const sPage = document.getElementById('search-page');
        if (sPage) sPage.classList.remove('has-suggestions');
    }

    /* ---------- Highlight helpers ---------- */
    function setActiveSidebarBtn(title) {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-title') === title);
        });
    }

    function setActiveBottomNav(navKey) {
        document.querySelectorAll('.mbn-item').forEach(item => {
            item.classList.toggle('active', item.getAttribute('data-nav') === navKey);
        });
    }

    function focusSearchInput() {
        setTimeout(() => {
            const mobile = document.getElementById('mobile-search-input');
            const desktop = document.getElementById('search-input');
            if (mobile && window.matchMedia('(max-width: 768px)').matches) {
                mobile.focus();
            } else if (desktop) {
                desktop.focus();
            }
        }, 180);
    }

    function syncNavBarsForPage(pageKey) {
        const map = {
            'home': 'Home',
            'search': 'Search',
            'explore': 'Explore',
            'artists': 'Artists',
            'playlists': 'Playlists',
            'liked': 'Liked Songs',
            'recent': 'Recently Played',
            'downloads': 'Downloads'
        };
        const sidebarTitle = map[pageKey];
        if (sidebarTitle) setActiveSidebarBtn(sidebarTitle);

        const bottomMap = { 'home': 'home', 'search': 'search', 'library': 'library' };
        const bottomKey = bottomMap[pageKey];
        if (bottomKey) setActiveBottomNav(bottomKey);
    }

    /* ---------- Navigate to a page ---------- */
    /* ---------- Current page tracker ---------- */
    let currentPage = 'home';

    function navigate(pageKey, options = {}) {
        /* 🔴 Push to browser history for back button support */
        if (!options.skipHistory && pageKey !== currentPage) {
            try {
                history.pushState({ page: pageKey, reverbPage: true }, '', '#' + pageKey);
            } catch (e) {}
        }

        currentPage = pageKey;

        clearAllPageClasses();

        if (pageKey === 'home') {
            resetFilters();
        } else if (pageKey === 'search') {
            document.body.classList.add('page-search');
            if (options.focus !== false) focusSearchInput();
        } else if (pageKey === 'library') {
            document.body.classList.add('page-library');
        } else if (pageKey === 'explore') {
            document.body.classList.add('page-explore');
        } else if (pageKey === 'artists') {
            document.body.classList.add('page-artists');
        } else if (pageKey === 'playlists') {
            document.body.classList.add('page-playlists');
        } else if (pageKey === 'liked') {
            document.body.classList.add('page-liked');
            renderLikedSongs();
        } else if (pageKey === 'recent') {
            document.body.classList.add('page-recent');
            renderRecentSongs();
        } else if (pageKey === 'downloads') {
            document.body.classList.add('page-downloads');
            renderDownloads();
        } else if (pageKey === 'profile-edit') {
            document.body.classList.add('page-profile-edit');
        } else if (pageKey === 'settings') {
            document.body.classList.add('page-settings');
        } else if (pageKey === 'followed') {
            document.body.classList.add('page-followed');
            if (window.Follows) window.Follows.render();
        } else if (pageKey === 'album') {
            document.body.classList.add('page-album');
        } else if (pageKey === 'admin') {
            document.body.classList.add('page-admin');
            if (window.Admin) window.Admin.renderAdminPage();
        }

        syncNavBarsForPage(pageKey);
        scrollToTop();

        setTimeout(() => {
            const mc = document.querySelector('.main-content');
            if (mc) mc.scrollTop = 0;
            window.scrollTo({ top: 0, behavior: 'auto' });
        }, 50);
    }

    /* ================================================================
       ARTIST PROFILE
    ================================================================ */
    function getTracksByArtist(artistName) {
        const tracks = window.tracks || [];
        const normalized = artistName.toLowerCase().trim();
        return tracks
            .map((t, i) => ({ ...t, _index: i }))
            .filter(t => t.artist.toLowerCase().trim() === normalized);
    }

    function openArtistProfile(artistName, options = {}) {
        console.log('[Pages] openArtistProfile called for:', artistName);

        const tracks = getTracksByArtist(artistName);
        console.log('[Pages] Found', tracks.length, 'tracks for', artistName);

        const img = document.getElementById('artist-profile-img');
        const nameEl = document.getElementById('artist-profile-name');
        const metaEl = document.getElementById('artist-profile-meta');
        const listEl = document.getElementById('artist-songs-list');
        const emptyEl = document.getElementById('artist-empty');

        if (nameEl) nameEl.textContent = artistName;
        if (metaEl) {
            metaEl.textContent = tracks.length
                ? `${tracks.length} song${tracks.length > 1 ? 's' : ''}`
                : 'No songs yet';
        }

        if (img) {
            if (tracks.length && tracks[0].art) {
                img.src = tracks[0].art;
                img.alt = artistName;
            } else if (options.fallbackImage) {
                img.src = options.fallbackImage;
                img.alt = artistName;
            } else {
                img.src = 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&h=200&fit=crop';
                img.alt = artistName;
            }
        }

        /* Sync follow button state */
        const followBtn = document.getElementById('artist-follow-btn');
        if (followBtn) {
            const artistImg = tracks[0]?.art || options.fallbackImage || '';
            followBtn.dataset.artistName = artistName;
            followBtn.dataset.artistImage = artistImg;
            if (window.Follows) {
                window.Follows.syncFollowButton(artistName, artistImg);
            }
        }

        /* Reset shuffle state */
        const shuffleBtn = document.getElementById('artist-shuffle-btn');
        if (shuffleBtn) shuffleBtn.classList.remove('active');

        /* Render song list */
        if (listEl) {
            listEl.innerHTML = '';
            if (tracks.length) {
                if (emptyEl) emptyEl.style.display = 'none';
                tracks.forEach(track => {
                    const row = document.createElement('div');
                    row.className = 'song-row';
                    row.setAttribute('data-track-index', track._index);
                    row.setAttribute('data-track-id', track.id);
                    row.innerHTML = `
                        <div class="song-play"><i class="fas fa-play"></i></div>
                        <div class="song-thumb"><img src="${track.art}" alt=""></div>
                        <div class="song-info">
                            <span class="song-title">${track.title}</span>
                            <span class="song-artist">${track.artist}</span>
                        </div>
                        <span class="song-album">${track.album}</span>
                        <span class="song-duration">${track.duration}</span>
                        <i class="fas fa-heart song-like" data-track-id="${track.id}"></i>
                    `;
                    listEl.appendChild(row);
                });

                /* Wire song clicks → play */
                listEl.querySelectorAll('.song-row').forEach(row => {
                    row.addEventListener('click', (e) => {
                        if (e.target.classList.contains('song-like')) return;
                        const idx = parseInt(row.getAttribute('data-track-index'), 10);
                        if (!isNaN(idx) && window.Player) {
                            window.Player.loadTrack(idx, true);
                        }
                    });
                });

                /* Sync heart states */
                if (window.Likes && window.Likes.syncAllHearts) {
                    window.Likes.syncAllHearts(listEl);
                }
            } else {
                if (emptyEl) emptyEl.style.display = 'flex';
            }
        }

        currentArtistName = artistName;
        previousPageKey = options.from || 'artists';

        clearAllPageClasses();
        document.body.classList.add('page-artist-profile');

        setActiveSidebarBtn('Artists');
        setActiveBottomNav('library');

        scrollToTop();

        setTimeout(() => {
            const mc = document.querySelector('.main-content');
            if (mc) mc.scrollTop = 0;
            window.scrollTo({ top: 0, behavior: 'auto' });
        }, 50);

        console.log('[Pages] Artist profile opened. Body classes:', document.body.className);
    }

    function playAllArtistSongs() {
        const tracks = getTracksByArtist(currentArtistName);
        if (!tracks.length || !window.Player) return;
        window.Player.loadTrack(tracks[0]._index, true);
    }

    function shuffleArtistSongs() {
        const tracks = getTracksByArtist(currentArtistName);
        if (!tracks.length || !window.Player) return;
        const random = tracks[Math.floor(Math.random() * tracks.length)];
        window.Player.loadTrack(random._index, true);
    }

    /* ================================================================
       RENDER HELPERS
    ================================================================ */
    function buildSongRow(track, trackIndex) {
        return `
            <div class="song-row" data-track-index="${trackIndex}" data-track-id="${track.id}">
                <div class="song-play"><i class="fas fa-play"></i></div>
                <div class="song-thumb"><img src="${track.art}" alt=""></div>
                <div class="song-info">
                    <span class="song-title">${track.title}</span>
                    <span class="song-artist">${track.artist}</span>
                </div>
                <span class="song-album">${track.album}</span>
                <span class="song-duration">${track.duration}</span>
                <i class="fas fa-heart song-like" data-track-id="${track.id}"></i>
            </div>
        `;
    }

    function wireSongRows(container) {
        if (!container) return;
        container.querySelectorAll('.song-row').forEach(row => {
            row.addEventListener('click', (e) => {
                if (e.target.classList.contains('song-like')) return;
                const idx = parseInt(row.getAttribute('data-track-index'), 10);
                if (!isNaN(idx) && window.Player) window.Player.loadTrack(idx, true);
            });
        });
        /* Heart clicks are handled globally by Likes module */
        if (window.Likes) window.Likes.syncAllHearts(container);
    }

    function renderLikedSongs() {
        /* Delegate to Likes module — reads from localStorage */
        if (window.Likes && window.Likes.renderLikedPage) {
            window.Likes.renderLikedPage();
        }
    }

    function renderRecentSongs() {
        const list = document.getElementById('recent-list');
        const empty = document.getElementById('recent-empty');
        if (!list) return;

        const recentIdx = JSON.parse(localStorage.getItem('reverb_recent_plays') || '[]');
        const tracks = window.tracks || [];
        list.innerHTML = '';

        if (!recentIdx.length) {
            if (empty) empty.style.display = 'flex';
            return;
        }

        if (empty) empty.style.display = 'none';

        recentIdx.slice(0, 20).forEach(idx => {
            const track = tracks[idx];
            if (!track) return;
            const wrapper = document.createElement('div');
            wrapper.innerHTML = buildSongRow(track, idx);
            list.appendChild(wrapper.firstElementChild);
        });

        wireSongRows(list);
    }

    function renderDownloads() {
        const empty = document.getElementById('downloads-empty');
        const list = document.getElementById('downloads-list');
        if (!empty || !list) return;
        empty.style.display = 'flex';
        list.innerHTML = '';
    }

    /* ================================================================
       INIT
    ================================================================ */
    function init() {

        /* ---- Sidebar nav buttons ---- */
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const title = btn.getAttribute('data-title');
                const pageClass = NAV_TO_PAGE[title];
                const keyMap = {
                    '': 'home',
                    'page-search': 'search',
                    'page-explore': 'explore',
                    'page-artists': 'artists',
                    'page-playlists': 'playlists',
                    'page-liked': 'liked',
                    'page-recent': 'recent',
                    'page-downloads': 'downloads'
                };
                const pageKey = keyMap[pageClass] || 'home';
                navigate(pageKey, { focus: pageKey === 'search' });
            });
        });

        /* ---- Playlist mini cards (sidebar) ---- */
        document.querySelectorAll('.playlist-mini').forEach(item => {
            item.addEventListener('click', () => navigate('playlists'));
        });

        /* ---- Explore cards ---- */
        document.querySelectorAll('.explore-card').forEach(card => {
            card.addEventListener('click', () => {
                const label = card.querySelector('span')?.textContent || 'Explore';
                if (window.BottomNav && window.BottomNav.showToast) {
                    window.BottomNav.showToast(`${label} — coming soon 🎵`);
                }
            });
        });

        /* ---- Artist cards → open ARTIST PROFILE ---- */
        const artistCards = document.querySelectorAll('.artist-card');
        console.log('[Pages] Binding', artistCards.length, 'artist cards');

        artistCards.forEach((card, i) => {
            if (card._artistBound) return;
            card._artistBound = true;

            card.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('[Pages] Artist card clicked:', i);

                const artistName = card.querySelector('.artist-name')?.textContent?.trim();
                const artistImg = card.querySelector('.artist-art img')?.src;
                console.log('[Pages] Artist name:', artistName);

                if (!artistName) return;
                openArtistProfile(artistName, {
                    from: 'artists',
                    fallbackImage: artistImg
                });
            });
        });

        /* ---- Artist profile: back ---- */
        const backBtn = document.getElementById('artist-back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                navigate(previousPageKey || 'artists');
            });
        }

        /* ---- Artist profile: play-all ---- */
        const playAllBtn = document.getElementById('artist-play-all-btn');
        if (playAllBtn) {
            playAllBtn.addEventListener('click', playAllArtistSongs);
        }

        /* ---- Artist profile: shuffle ---- */
        const shuffleBtn = document.getElementById('artist-shuffle-btn');
        if (shuffleBtn) {
            shuffleBtn.addEventListener('click', () => {
                shuffleBtn.classList.toggle('active');
                shuffleArtistSongs();
            });
        }

        /* ---- Artist profile: follow button is handled by Follows module ---- */

        /* ---- Playlist page cards ---- */
        document.querySelectorAll('.pl-card').forEach(card => {
            card.addEventListener('click', () => {
                const idx = parseInt(card.getAttribute('data-play-target'), 10);
                if (!isNaN(idx) && window.Player) window.Player.loadTrack(idx, true);
            });
        });

        /* ---- Track recent plays automatically ---- */
        const originalLoad = window.Player?.loadTrack;
        if (originalLoad && !originalLoad._wrapped) {
            const wrapped = function (idx, autoPlay) {
                originalLoad.call(window.Player, idx, autoPlay);
                try {
                    const recent = JSON.parse(localStorage.getItem('reverb_recent_plays') || '[]');
                    const filtered = recent.filter(i => i !== idx);
                    filtered.unshift(idx);
                    localStorage.setItem('reverb_recent_plays', JSON.stringify(filtered.slice(0, 20)));
                } catch (e) {}

                /* Notify NowPlaying module */
                try {
                    window.dispatchEvent(new CustomEvent('player:track-changed', { detail: idx }));
                } catch (e) {}
            };
            wrapped._wrapped = true;
            window.Player.loadTrack = wrapped;
        }

        /* ============================================================
           🔴 HANDLE BROWSER BACK BUTTON (mobile + desktop)
           - Agar kisi page pe ho (not home) → home pe jao
           - Agar home pe ho → browser ko normally exit karne do
        ============================================================ */
        window.addEventListener('popstate', function (event) {
            console.log('[Pages] Back button pressed');

            /* If we are not on home, go back to home */
            if (currentPage !== 'home') {
                /* Prevent default exit — go home instead */
                try {
                    history.pushState({ page: 'home', reverbPage: true }, '', '#home');
                } catch (e) {}

                navigate('home', { skipHistory: true });
                console.log('[Pages] Navigated back to home');
            }
            /* If already on home, let browser handle exit naturally */
        });

        /* Initialize history state on load */
        try {
            history.replaceState({ page: 'home', reverbPage: true }, '', '#home');
        } catch (e) {}

        console.log('[Pages] Init complete.');
    }

    /* ---------- PUBLIC API ---------- */
    return {
        init,
        navigate,
        openArtistProfile,
        renderLikedSongs,
        renderRecentSongs,
        renderDownloads,
        getTracksByArtist
    };
})();