/* ==================================================================
   PLAYLISTS.JS — Create playlist + Add songs + Play playlists
   Exposes: window.Playlists
================================================================== */

window.Playlists = (function () {

    const STORAGE_KEY = 'reverb_custom_playlists';
    const SYSTEM_KEY = 'reverb_system_playlists';

    let modalOverlay, openModalBtn, closeModalBtn, cancelModalBtn,
        savePlaylistBtn, playlistNameInput, playlistsGroup;

    /* ---------- Storage ---------- */
    function loadCustomPlaylists() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) return JSON.parse(raw) || [];
        } catch (e) {}
        return [];
    }

    function saveCustomPlaylists(list) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        } catch (e) {}
    }

    function loadPlaylistSongs() {
        try {
            const raw = localStorage.getItem(SYSTEM_KEY);
            if (raw) return JSON.parse(raw) || {};
        } catch (e) {}
        return {};
    }

    function savePlaylistSongs(map) {
        try {
            localStorage.setItem(SYSTEM_KEY, JSON.stringify(map));
        } catch (e) {}
    }

    /* ---------- Built-in playlists ---------- */
    const BUILT_IN = [
        { name: 'Night Drive', icon: 'fa-moon', gradient: 'linear-gradient(145deg, #5a4a8a, #3d3260)' },
        { name: 'Morning Dew', icon: 'fa-cloud-sun', gradient: 'linear-gradient(145deg, #2a4a6e, #1a2f4a)' },
        { name: 'Focus Deep', icon: 'fa-headphones', gradient: 'linear-gradient(145deg, #6e3a5a, #4a253d)' },
        { name: 'Indie Folk', icon: 'fa-guitar', gradient: 'linear-gradient(145deg, #2a5a5a, #1a3d3d)' }
    ];

    function getAllPlaylists() {
        const custom = loadCustomPlaylists().map((name, i) => {
            const gradients = [
                'linear-gradient(145deg, #7c3aed, #4c1d95)',
                'linear-gradient(145deg, #059669, #047857)',
                'linear-gradient(145deg, #d97706, #b45309)',
                'linear-gradient(145deg, #db2777, #9d174d)'
            ];
            return {
                name,
                icon: 'fa-compact-disc',
                gradient: gradients[i % gradients.length],
                isCustom: true
            };
        });
        return [...BUILT_IN, ...custom];
    }

    /* ---------- Song helpers ---------- */
    function addSongToPlaylist(playlistName, trackId) {
        if (!playlistName || trackId === undefined) return false;
        const map = loadPlaylistSongs();
        if (!map[playlistName]) map[playlistName] = [];
        if (map[playlistName].includes(trackId)) return false;
        map[playlistName].push(trackId);
        savePlaylistSongs(map);
        return true;
    }

    function removeSongFromPlaylist(playlistName, trackId) {
        const map = loadPlaylistSongs();
        if (!map[playlistName]) return;
        map[playlistName] = map[playlistName].filter(id => id !== trackId);
        savePlaylistSongs(map);
    }

    function getSongsInPlaylist(playlistName) {
        const map = loadPlaylistSongs();
        return map[playlistName] || [];
    }

    /* ---------- Play playlist ---------- */
    function playPlaylist(playlistName) {
        const songIds = getSongsInPlaylist(playlistName);
        const tracks = window.tracks || [];
        if (!songIds.length) {
            if (window.BottomNav && window.BottomNav.showToast) {
                window.BottomNav.showToast(`${playlistName} is empty`);
            }
            return;
        }
        const firstIdx = tracks.findIndex(t => t.id === songIds[0]);
        if (firstIdx !== -1 && window.Player) {
            window.Player.loadTrack(firstIdx, true);
            if (window.BottomNav && window.BottomNav.showToast) {
                window.BottomNav.showToast(`Playing ${playlistName}`);
            }
        }
    }

    /* ---------- Sidebar playlists ---------- */
    function renderNewPlaylist(name, isNew = true) {
        if (!name || !name.trim()) return;

        const newPl = document.createElement('div');
        newPl.className = 'playlist-mini';
        newPl.setAttribute('data-title', name);
        newPl.setAttribute('data-playlist-name', name);

        const gradients = [
            'linear-gradient(145deg, #7c3aed, #4c1d95)',
            'linear-gradient(145deg, #059669, #047857)',
            'linear-gradient(145deg, #d97706, #b45309)',
            'linear-gradient(145deg, #db2777, #9d174d)'
        ];
        const bg = gradients[Math.floor(Math.random() * gradients.length)];

        newPl.innerHTML = `
            <div class="playlist-mini-art" style="background:${bg}">
                <i class="fas fa-compact-disc"></i>
            </div>
            <span>${name}</span>
        `;
        if (playlistsGroup) playlistsGroup.appendChild(newPl);

        newPl.addEventListener('click', () => playPlaylist(name));

        if (isNew) {
            const saved = loadCustomPlaylists();
            saved.push(name);
            saveCustomPlaylists(saved);
        }
    }

    function loadSavedPlaylists() {
        const saved = loadCustomPlaylists();
        saved.forEach(name => renderNewPlaylist(name, false));

        document.querySelectorAll('.playlist-mini').forEach(item => {
            if (item._plBound) return;
            item._plBound = true;
            const name = item.getAttribute('data-title') || item.getAttribute('data-playlist-name');
            if (!name) return;
            item.addEventListener('click', () => playPlaylist(name));
        });
    }

    /* ---------- Dropdown ---------- */
    function renderPlaylistDropdown() {
        const list = document.getElementById('playlist-dropdown-list');
        if (!list) {
            console.warn('[Playlists] Dropdown list element missing!');
            return;
        }

        const playlists = getAllPlaylists();
        console.log('[Playlists] Rendering dropdown with', playlists.length, 'playlists');

        if (!playlists.length) {
            list.innerHTML = `
                <div class="playlist-dropdown-empty">
                    <i class="fas fa-folder-plus"></i>
                    No playlists yet
                </div>
            `;
            return;
        }

        list.innerHTML = playlists.map(pl => {
            const songs = getSongsInPlaylist(pl.name);
            return `
                <div class="playlist-dropdown-item" data-playlist="${pl.name}">
                    <div class="playlist-dropdown-art" style="background:${pl.gradient};">
                        <i class="fas ${pl.icon}"></i>
                    </div>
                    <div class="playlist-dropdown-info">
                        <span class="playlist-dropdown-title">${pl.name}</span>
                        <span class="playlist-dropdown-meta">${songs.length} song${songs.length !== 1 ? 's' : ''}</span>
                    </div>
                </div>
            `;
        }).join('');

               list.querySelectorAll('.playlist-dropdown-item').forEach(item => {
            item.addEventListener('click', () => {
                /* 🔐 Login required for adding to playlist */
                if (window.Auth && !window.Auth.isLoggedIn()) {
                    window.Auth.requireLogin(() => {
                        const playlistName = item.getAttribute('data-playlist');
                        const currentIdx = window.Player?.getIndex ? window.Player.getIndex() : 0;
                        const track = (window.tracks || [])[currentIdx];
                        if (!track) return;

                        const added = addSongToPlaylist(playlistName, track.id);

                        if (window.BottomNav && window.BottomNav.showToast) {
                            window.BottomNav.showToast(
                                added
                                    ? `Added "${track.title}" to ${playlistName}`
                                    : `Already in ${playlistName}`
                            );
                        }
                        setTimeout(() => closePlaylistDropdown(), 300);
                    }, 'add to playlists');
                    return;
                }

                const playlistName = item.getAttribute('data-playlist');
                const currentIdx = window.Player?.getIndex ? window.Player.getIndex() : 0;
                const track = (window.tracks || [])[currentIdx];
                if (!track) return;

                const added = addSongToPlaylist(playlistName, track.id);

                if (window.BottomNav && window.BottomNav.showToast) {
                    window.BottomNav.showToast(
                        added
                            ? `Added "${track.title}" to ${playlistName}`
                            : `Already in ${playlistName}`
                    );
                }
                setTimeout(() => closePlaylistDropdown(), 300);
            });
        });
    }

    function openPlaylistDropdown() {
        console.log('[Playlists] Opening dropdown');
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
        if (!dd) {
            console.warn('[Playlists] Dropdown element not found!');
            return;
        }
        if (dd.classList.contains('open')) closePlaylistDropdown();
        else openPlaylistDropdown();
    }

    /* ---------- Create playlist modal ---------- */
    function openModal() {
        if (modalOverlay) {
            modalOverlay.classList.add('active');
            if (playlistNameInput) playlistNameInput.focus();
        }
    }

    function closeModal() {
        if (modalOverlay) {
            modalOverlay.classList.remove('active');
            if (playlistNameInput) playlistNameInput.value = '';
        }
    }

    /* ---------- Init ---------- */
    function init() {
        console.log('[Playlists] Initializing...');

        modalOverlay = document.getElementById('playlist-modal');
        openModalBtn = document.getElementById('btn-open-playlist-modal');
        closeModalBtn = document.getElementById('btn-close-modal');
        cancelModalBtn = document.getElementById('btn-cancel-playlist');
        savePlaylistBtn = document.getElementById('btn-save-playlist');
        playlistNameInput = document.getElementById('playlist-name-input');
        playlistsGroup = document.getElementById('playlists-group');

        /* Modal controls */
        if (openModalBtn) {
            openModalBtn.addEventListener('click', () => {
                /* 🔐 Login required for creating playlists */
                if (window.Auth && !window.Auth.isLoggedIn()) {
                    window.Auth.requireLogin(() => {
                        openModal();
                    }, 'create playlists');
                    return;
                }
                openModal();
            });
        }
        if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
        if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeModal);

        if (modalOverlay) {
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) closeModal();
            });
        }

        if (savePlaylistBtn) {
            savePlaylistBtn.addEventListener('click', () => {
                const val = playlistNameInput.value;
                if (val) {
                    renderNewPlaylist(val, true);
                    closeModal();
                    if (window.BottomNav && window.BottomNav.showToast) {
                        window.BottomNav.showToast(`Created "${val}"`);
                    }
                }
            });
        }

        if (playlistNameInput) {
            playlistNameInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    savePlaylistBtn?.click();
                }
            });
        }

        /* 🔴 Mini player ➕ button → open dropdown */
        const miniAddBtn = document.getElementById('mini-add-btn');
        console.log('[Playlists] Mini add button:', miniAddBtn);

        if (miniAddBtn) {
            miniAddBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                console.log('[Playlists] ➕ clicked!');
                togglePlaylistDropdown();
            });
            console.log('[Playlists] ➕ button wired up');
        } else {
            console.warn('[Playlists] ❌ mini-add-btn NOT FOUND in DOM!');
        }

        /* Dropdown close button */
        const ddClose = document.getElementById('playlist-dropdown-close');
        if (ddClose) {
            ddClose.addEventListener('click', (e) => {
                e.stopPropagation();
                closePlaylistDropdown();
            });
        }

        /* Click outside → close */
        document.addEventListener('click', (e) => {
            const dd = document.getElementById('playlist-dropdown');
            const btn = document.getElementById('mini-add-btn');
            if (!dd || !dd.classList.contains('open')) return;
            if (dd.contains(e.target)) return;
            if (btn && btn.contains(e.target)) return;
            closePlaylistDropdown();
        });

        /* Escape closes */
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closePlaylistDropdown();
        });

        /* Load saved playlists */
        loadSavedPlaylists();

        console.log('[Playlists] ✅ Init complete. Custom playlists:', loadCustomPlaylists().length);
    }

    return {
        init,
        addSongToPlaylist,
        removeSongFromPlaylist,
        getSongsInPlaylist,
        playPlaylist,
        openPlaylistDropdown,
        closePlaylistDropdown,
        renderPlaylistDropdown
    };
})();