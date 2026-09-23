/* ==================================================================
   PLAYLISTS.JS — Playlists (Firestore synced)
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

    let customPlaylists = []; /* [{ name, icon, gradient }] */
    let playlistSongs = {};   /* { playlistName: [trackId, ...] } */

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

    function syncToFirestore() {
        if (window.Firestore && window.Firestore.isReady()) {
            window.Firestore.savePlaylists(customPlaylists, playlistSongs);
        }
    }

    /* ============================================================
       PLAY
    ============================================================ */
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

    /* ============================================================
       RENDER SIDEBAR PLAYLISTS
    ============================================================ */
    function renderNewPlaylist(name, isNew) {
        if (isNew === undefined) isNew = true;
        if (!name || !name.trim()) return;

        const gradients = [
            'linear-gradient(145deg, #7c3aed, #4c1d95)',
            'linear-gradient(145deg, #059669, #047857)',
            'linear-gradient(145deg, #d97706, #b45309)',
            'linear-gradient(145deg, #db2777, #9d174d)'
        ];
        const bg = gradients[customPlaylists.length % gradients.length];

        const newPl = document.createElement('div');
        newPl.className = 'playlist-mini';
        newPl.setAttribute('data-title', name);
        newPl.setAttribute('data-playlist-name', name);

        newPl.innerHTML = `
            <div class="playlist-mini-art" style="background:${bg}">
                <i class="fas fa-compact-disc"></i>
            </div>
            <span>${name}</span>
        `;
        if (playlistsGroup) playlistsGroup.appendChild(newPl);

        newPl.addEventListener('click', () => playPlaylist(name));

        if (isNew) {
            customPlaylists.push({ name: name, icon: 'fa-compact-disc', gradient: bg });
            syncToFirestore();
        }
    }

    function loadSavedPlaylists() {
        /* Render all custom playlists from memory */
        customPlaylists.forEach(pl => {
            const exists = document.querySelector('.playlist-mini[data-playlist-name="' + pl.name + '"]');
            if (!exists) renderNewPlaylist(pl.name, false);
        });

        /* Wire existing ones */
        document.querySelectorAll('.playlist-mini').forEach(item => {
            if (item._plBound) return;
            item._plBound = true;
            const name = item.getAttribute('data-title') || item.getAttribute('data-playlist-name');
            if (!name) return;
            item.addEventListener('click', () => playPlaylist(name));
        });
    }

    /* ============================================================
       DROPDOWN
    ============================================================ */
    function renderPlaylistDropdown() {
        const list = document.getElementById('playlist-dropdown-list');
        if (!list) return;

        const playlists = getAllPlaylists();

        if (!playlists.length) {
            list.innerHTML = '<div class="playlist-dropdown-empty"><i class="fas fa-folder-plus"></i>No playlists yet</div>';
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
                /* Login required */
                if (window.Auth && !window.Auth.isLoggedIn()) {
                    window.Auth.requireLogin(() => {
                        const playlistName = item.getAttribute('data-playlist');
                        addSongFromCurrent(playlistName);
                    }, 'add to playlists');
                    return;
                }
                const playlistName = item.getAttribute('data-playlist');
                addSongFromCurrent(playlistName);
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

        setTimeout(() => closePlaylistDropdown(), 300);
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
            if (playlistNameInput) playlistNameInput.focus();
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

        if (openModalBtn) {
            openModalBtn.addEventListener('click', () => {
                if (window.Auth && !window.Auth.isLoggedIn()) {
                    window.Auth.requireLogin(openModal, 'create playlists');
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
                        window.BottomNav.showToast('Created "' + val + '"');
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

        const miniAddBtn = document.getElementById('mini-add-btn');
        if (miniAddBtn) {
            miniAddBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                if (window.Auth && !window.Auth.isLoggedIn()) {
                    window.Auth.requireLogin(togglePlaylistDropdown, 'add to playlists');
                    return;
                }
                togglePlaylistDropdown();
            });
        }

        const ddClose = document.getElementById('playlist-dropdown-close');
        if (ddClose) {
            ddClose.addEventListener('click', (e) => {
                e.stopPropagation();
                closePlaylistDropdown();
            });
        }

        document.addEventListener('click', (e) => {
            const dd = document.getElementById('playlist-dropdown');
            const btn = document.getElementById('mini-add-btn');
            if (!dd || !dd.classList.contains('open')) return;
            if (dd.contains(e.target)) return;
            if (btn && btn.contains(e.target)) return;
            closePlaylistDropdown();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closePlaylistDropdown();
        });

        loadSavedPlaylists();

        /* 🔴 LOAD FROM FIRESTORE on login */
        window.addEventListener('auth:changed', function () {
            if (!window.Auth || !window.Auth.isLoggedIn()) return;
            if (!window.Firestore || !window.Firestore.isReady()) return;

            console.log('[Playlists] Loading from Firestore...');
            window.Firestore.loadPlaylists().then(function (data) {
                if (data) {
                    customPlaylists = data.playlists || [];
                    playlistSongs = data.songsMap || {};
                    loadSavedPlaylists();
                    console.log('[Playlists] ✅ Loaded from Firestore:', customPlaylists.length, 'playlists');
                }
            });
        });

        console.log('[Playlists] Init complete (Firestore synced)');
    }

    return {
        init,
        addSongToPlaylist,
        removeSongFromPlaylist,
        getSongsInPlaylist,
        getAllPlaylists,
        playPlaylist,
        openPlaylistDropdown,
        closePlaylistDropdown,
        renderPlaylistDropdown
    };
})();