/* ==================================================================
   PLAYLISTS.JS — Playlists (Firestore synced + auto-render)
   Exposes: window.Playlists
================================================================== */

window.Playlists = (function () {

    /* Built-in playlists */
    const BUILT_IN = [
        { name: 'Night Drive', icon: 'fa-moon', gradient: 'linear-gradient(145deg, #5a4a8a, #3d3260)' },
        { name: 'Morning Dew', icon: 'fa-cloud-sun', gradient: 'linear-gradient(145deg, #2a4a6e, #1a2f4a)' },
        { name: 'Focus Deep', icon: 'fa-headphones', gradient: 'linear-gradient(145deg, #6e3a5a, #4a253d)' },
        { name: 'Indie Folk', icon: 'fa-guitar', gradient: 'linear-gradient(145deg, #2a5a5a, #1a3d3d)' }
    ];

    /* In-memory store */
    let customPlaylists = [];
    let playlistSongs = {};

    let modalOverlay, openModalBtn, closeModalBtn, cancelModalBtn,
        savePlaylistBtn, playlistNameInput, playlistsGroup;

    /* ============================================================
       GETTERS
    ============================================================ */
    function getAllPlaylists() {
        return [...BUILT_IN, ...customPlaylists];
    }

    function getSongsInPlaylist(playlistName) {
        return (playlistSongs[playlistName] || []).slice();
    }

    /* ============================================================
       ADD / REMOVE SONGS
    ============================================================ */
    function addSongToPlaylist(playlistName, trackId) {
        if (!playlistName || trackId === undefined) return false;
        if (!playlistSongs[playlistName]) playlistSongs[playlistName] = [];
        if (playlistSongs[playlistName].includes(trackId)) return false;
        playlistSongs[playlistName].push(trackId);
        syncToFirestore();
        return true;
    }

    function removeSongFromPlaylist(playlistName, trackId) {
        if (!playlistSongs[playlistName]) return;
        playlistSongs[playlistName] = playlistSongs[playlistName].filter(id => id !== trackId);
        syncToFirestore();
    }

    /* ============================================================
       FIRESTORE SYNC
    ============================================================ */
    function syncToFirestore() {
        if (!window.Firestore || !window.Firestore.isReady()) return;

        /* 🔴 SAFETY: Don't overwrite if data not loaded yet */
        if (!window._playlistsLoaded && customPlaylists.length === 0) {
            console.warn('[Playlists] ⚠️ Skipping save — data not loaded yet');
            return;
        }

        console.log('[Playlists] 💾 Saving to Firestore:', customPlaylists.length, 'playlists');
        window.Firestore.savePlaylists(customPlaylists, playlistSongs);
    }

    function loadFromFirestore() {
        if (window._playlistsLoaded) return;
        if (!window.Firestore || !window.Firestore.isReady()) return;

        window._playlistsLoaded = true;
        console.log('[Playlists] 📥 Loading from Firestore...');

        window.Firestore.loadPlaylists().then(function (data) {
            if (data) {
                customPlaylists = data.playlists || [];
                playlistSongs = data.songsMap || {};

                console.log('[Playlists] ✅ Loaded:', customPlaylists.length, 'playlists');

                /* 🔴 Render everything */
                renderSidebarPlaylists();
                renderLibraryPagePlaylists();
            }
        }).catch(function (err) {
            console.error('[Playlists] Load error:', err);
            window._playlistsLoaded = false;
        });
    }

    /* ============================================================
       PLAY PLAYLIST
    ============================================================ */
    function playPlaylist(playlistName) {
        const songIds = getSongsInPlaylist(playlistName);
        const tracks = window.tracks || [];

        if (!songIds.length) {
            if (window.BottomNav && window.BottomNav.showToast) {
                window.BottomNav.showToast(playlistName + ' is empty');
            }
            return;
        }

        const firstIdx = tracks.findIndex(t => t.id === songIds[0]);
        if (firstIdx !== -1 && window.Player) {
            window.Player.loadTrack(firstIdx, true);
            if (window.BottomNav && window.BottomNav.showToast) {
                window.BottomNav.showToast('Playing ' + playlistName);
            }
        }
    }

    /* ============================================================
       RENDER SIDEBAR PLAYLISTS
    ============================================================ */
    function renderSidebarPlaylists() {
        if (!playlistsGroup) {
            playlistsGroup = document.getElementById('playlists-group');
        }
        if (!playlistsGroup) return;

        console.log('[Playlists] 🎨 Rendering sidebar:', customPlaylists.length, 'custom playlists');

        /* 🔴 Remove ALL existing custom playlist items */
        playlistsGroup.querySelectorAll('.playlist-mini[data-playlist-name]').forEach(el => el.remove());

        /* 🔴 Render each custom playlist */
        customPlaylists.forEach(function (pl) {
            const songs = getSongsInPlaylist(pl.name);

            const newPl = document.createElement('div');
            newPl.className = 'playlist-mini';
            newPl.setAttribute('data-title', pl.name);
            newPl.setAttribute('data-playlist-name', pl.name);

            newPl.innerHTML = ''
                + '<div class="playlist-mini-art" style="background:' + (pl.gradient || 'linear-gradient(145deg, #7c3aed, #4c1d95)') + ';">'
                +   '<i class="fas ' + (pl.icon || 'fa-compact-disc') + '"></i>'
                + '</div>'
                + '<span>' + pl.name + '</span>';

            newPl.addEventListener('click', function () {
                playPlaylist(pl.name);
            });

            playlistsGroup.appendChild(newPl);
        });

        console.log('[Playlists] ✅ Sidebar rendered');
    }

    /* ============================================================
       RENDER LIBRARY PAGE PLAYLISTS
    ============================================================ */
    function renderLibraryPagePlaylists() {
        const container = document.querySelector('.library-tab-content[data-content="playlists"]');
        if (!container) {
            console.log('[Playlists] Library container not found (may be desktop)');
            return;
        }

        console.log('[Playlists] 🎨 Rendering library page:', customPlaylists.length, 'custom playlists');

        /* 🔴 Remove existing custom playlist items */
        container.querySelectorAll('.library-item[data-playlist-name]').forEach(el => el.remove());

        /* 🔴 Render each custom playlist */
        customPlaylists.forEach(function (pl) {
            const songs = getSongsInPlaylist(pl.name);

            const item = document.createElement('div');
            item.className = 'library-item';
            item.setAttribute('data-playlist-name', pl.name);

            item.innerHTML = ''
                + '<div class="library-item-art" style="background:' + (pl.gradient || 'linear-gradient(145deg, #7c3aed, #4c1d95)') + ';">'
                +   '<i class="fas ' + (pl.icon || 'fa-compact-disc') + '"></i>'
                + '</div>'
                + '<div class="library-item-info">'
                +   '<span class="library-item-title">' + pl.name + '</span>'
                +   '<span class="library-item-meta">Playlist · ' + songs.length + ' song' + (songs.length !== 1 ? 's' : '') + '</span>'
                + '</div>';

            item.addEventListener('click', function () {
                playPlaylist(pl.name);
            });

            container.appendChild(item);
        });

        console.log('[Playlists] ✅ Library page rendered');
    }

    /* ============================================================
       CREATE NEW PLAYLIST
    ============================================================ */
    function createPlaylist(name) {
        if (!name || !name.trim()) return false;
        name = name.trim();

        /* Prevent duplicates */
        if (customPlaylists.some(p => p.name === name)) {
            if (window.BottomNav && window.BottomNav.showToast) {
                window.BottomNav.showToast('Playlist already exists');
            }
            return false;
        }

        const gradients = [
            'linear-gradient(145deg, #7c3aed, #4c1d95)',
            'linear-gradient(145deg, #059669, #047857)',
            'linear-gradient(145deg, #d97706, #b45309)',
            'linear-gradient(145deg, #db2777, #9d174d)'
        ];
        const bg = gradients[customPlaylists.length % gradients.length];

        customPlaylists.push({
            name: name,
            icon: 'fa-compact-disc',
            gradient: bg
        });

        syncToFirestore();
        renderSidebarPlaylists();
        renderLibraryPagePlaylists();

        return true;
    }

    /* ============================================================
       DROPDOWN (➕ Add to playlist)
    ============================================================ */
    function renderPlaylistDropdown() {
        const list = document.getElementById('playlist-dropdown-list');
        if (!list) return;

        const playlists = getAllPlaylists();

        if (!playlists.length) {
            list.innerHTML = '<div class="playlist-dropdown-empty"><i class="fas fa-folder-plus"></i>No playlists yet</div>';
            return;
        }

        list.innerHTML = playlists.map(function (pl) {
            const songs = getSongsInPlaylist(pl.name);
            return ''
                + '<div class="playlist-dropdown-item" data-playlist="' + pl.name + '">'
                +   '<div class="playlist-dropdown-art" style="background:' + pl.gradient + ';">'
                +     '<i class="fas ' + pl.icon + '"></i>'
                +   '</div>'
                +   '<div class="playlist-dropdown-info">'
                +     '<span class="playlist-dropdown-title">' + pl.name + '</span>'
                +     '<span class="playlist-dropdown-meta">' + songs.length + ' song' + (songs.length !== 1 ? 's' : '') + '</span>'
                +   '</div>'
                + '</div>';
        }).join('');

        list.querySelectorAll('.playlist-dropdown-item').forEach(function (item) {
            item.addEventListener('click', function () {
                if (window.Auth && !window.Auth.isLoggedIn()) {
                    window.Auth.requireLogin(function () {
                        addSongFromCurrent(item.getAttribute('data-playlist'));
                    }, 'add to playlists');
                    return;
                }
                addSongFromCurrent(item.getAttribute('data-playlist'));
            });
        });
    }

    function addSongFromCurrent(playlistName) {
        const currentIdx = window.Player && window.Player.getIndex ? window.Player.getIndex() : 0;
        const track = (window.tracks || [])[currentIdx];
        if (!track) return;

        const added = addSongToPlaylist(playlistName, track.id);

        if (window.BottomNav && window.BottomNav.showToast) {
            window.BottomNav.showToast(added
                ? 'Added "' + track.title + '" to ' + playlistName
                : 'Already in ' + playlistName);
        }

        setTimeout(closePlaylistDropdown, 300);
    }

    function openPlaylistDropdown() {
        renderPlaylistDropdown();
        const dd = document.getElementById('playlist-dropdown');
        if (dd) dd.classList.add('open');
    }

    function closePlaylistDropdown() {
        const dd = document.getElementById('playlist-dropdown');
        if (dd) dd.classList.remove('open');
    }

    function togglePlaylistDropdown() {
        const dd = document.getElementById('playlist-dropdown');
        if (!dd) return;
        if (dd.classList.contains('open')) closePlaylistDropdown();
        else openPlaylistDropdown();
    }

    /* ============================================================
       MODAL
    ============================================================ */
    function openModal() {
        if (modalOverlay) {
            modalOverlay.classList.add('active');
            if (playlistNameInput) {
                playlistNameInput.value = '';
                playlistNameInput.focus();
            }
        }
    }

    function closeModal() {
        if (modalOverlay) {
            modalOverlay.classList.remove('active');
            if (playlistNameInput) playlistNameInput.value = '';
        }
    }

    /* ============================================================
       INIT
    ============================================================ */
    function init() {
        modalOverlay = document.getElementById('playlist-modal');
        openModalBtn = document.getElementById('btn-open-playlist-modal');
        closeModalBtn = document.getElementById('btn-close-modal');
        cancelModalBtn = document.getElementById('btn-cancel-playlist');
        savePlaylistBtn = document.getElementById('btn-save-playlist');
        playlistNameInput = document.getElementById('playlist-name-input');
        playlistsGroup = document.getElementById('playlists-group');

        /* Wire existing built-in playlist-mini items */
        document.querySelectorAll('.playlist-mini').forEach(function (item) {
            if (item._plBound) return;
            item._plBound = true;
            const name = item.getAttribute('data-title') || item.getAttribute('data-playlist-name');
            if (!name) return;
            item.addEventListener('click', function () { playPlaylist(name); });
        });

        /* Open create modal */
        if (openModalBtn) {
            openModalBtn.addEventListener('click', function () {
                if (window.Auth && !window.Auth.isLoggedIn()) {
                    window.Auth.requireLogin(openModal, 'create playlists');
                    return;
                }
                openModal();
            });
        }

        /* Close modal */
        if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
        if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeModal);
        if (modalOverlay) {
            modalOverlay.addEventListener('click', function (e) {
                if (e.target === modalOverlay) closeModal();
            });
        }

        /* Save new playlist */
        if (savePlaylistBtn) {
            savePlaylistBtn.addEventListener('click', function () {
                const val = playlistNameInput.value;
                if (createPlaylist(val)) {
                    closeModal();
                    if (window.BottomNav && window.BottomNav.showToast) {
                        window.BottomNav.showToast('Created "' + val + '"');
                    }
                }
            });
        }

        if (playlistNameInput) {
            playlistNameInput.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (savePlaylistBtn) savePlaylistBtn.click();
                }
            });
        }

        /* ➕ Mini add button */
        const miniAddBtn = document.getElementById('mini-add-btn');
        if (miniAddBtn) {
            miniAddBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                e.preventDefault();
                if (window.Auth && !window.Auth.isLoggedIn()) {
                    window.Auth.requireLogin(togglePlaylistDropdown, 'add to playlists');
                    return;
                }
                togglePlaylistDropdown();
            });
        }

        /* Dropdown close */
        const ddClose = document.getElementById('playlist-dropdown-close');
        if (ddClose) {
            ddClose.addEventListener('click', function (e) {
                e.stopPropagation();
                closePlaylistDropdown();
            });
        }

        /* Outside click closes dropdown */
        document.addEventListener('click', function (e) {
            const dd = document.getElementById('playlist-dropdown');
            const btn = document.getElementById('mini-add-btn');
            if (!dd || !dd.classList.contains('open')) return;
            if (dd.contains(e.target)) return;
            if (btn && btn.contains(e.target)) return;
            closePlaylistDropdown();
        });

        /* Escape closes dropdown */
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') closePlaylistDropdown();
        });

        /* Library tabs — re-render when playlists tab opens */
        document.querySelectorAll('.library-tab').forEach(function (tab) {
            tab.addEventListener('click', function () {
                if (tab.getAttribute('data-tab') === 'playlists') {
                    setTimeout(renderLibraryPagePlaylists, 100);
                }
            });
        });

        /* 🔴 LOAD FROM FIRESTORE when user logs in */
        window.addEventListener('auth:changed', function () {
            if (!window.Auth || !window.Auth.isLoggedIn()) return;
            loadFromFirestore();
        });

        /* 🔴 ALSO LOAD ON PAGE LOAD (if already logged in) */
        window.addEventListener('firebase:ready', function () {
            setTimeout(function () {
                if (window.Auth && window.Auth.isLoggedIn()) {
                    loadFromFirestore();
                }
            }, 800);
        });

        /* 🔴 POLLING FALLBACK — check every 500ms for first 15s */
        var pollCount = 0;
        var pollInterval = setInterval(function () {
            pollCount++;
            if (window._playlistsLoaded) {
                clearInterval(pollInterval);
                return;
            }
            if (window.Auth && window.Auth.isLoggedIn() && window.Firestore && window.Firestore.isReady()) {
                clearInterval(pollInterval);
                loadFromFirestore();
            }
            if (pollCount >= 30) {
                clearInterval(pollInterval);
            }
        }, 500);

        console.log('[Playlists] ✅ Init complete (Firestore synced + auto-render)');
    }

    /* ============================================================
       PUBLIC API
    ============================================================ */
    return {
        init: init,
        addSongToPlaylist: addSongToPlaylist,
        removeSongFromPlaylist: removeSongFromPlaylist,
        getSongsInPlaylist: getSongsInPlaylist,
        getAllPlaylists: getAllPlaylists,
        playPlaylist: playPlaylist,
        openPlaylistDropdown: openPlaylistDropdown,
        closePlaylistDropdown: closePlaylistDropdown,
        renderPlaylistDropdown: renderPlaylistDropdown,
        createPlaylist: createPlaylist,
        renderSidebarPlaylists: renderSidebarPlaylists,
        renderLibraryPagePlaylists: renderLibraryPagePlaylists,
        loadFromFirestore: loadFromFirestore
    };
})();