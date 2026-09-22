/* ==================================================================
   ADMIN.JS — Admin Panel (owner only, laptop only)
   - Uses Auth.isOwnerEmail() for access control
   - Songs management (add, edit, delete, publish/unpublish)
   - Home page dynamic render
   Exposes: window.Admin
================================================================== */

window.Admin = (function () {

    /* ---------- Config ---------- */
    const DESKTOP_MIN_WIDTH = 900;
    const SONGS_KEY = 'reverb_admin_songs';
    const HIDDEN_KEY = 'reverb_hidden_songs';

    /* ---------- State ---------- */
    let editingSongId = null;

    /* ---------- Elements ---------- */
    let modal, modalTitle, modalSaveText,
        inputTitle, inputArtist, inputAlbum, inputGenre,
        inputDuration, inputRelease, inputCover, inputAudio,
        inputLyrics, inputPublished,
        previewArt, previewTitle, previewArtist,
        songsList, emptyState,
        statTotal, statPublished, statDraft,
        songCountText;

    /* ================================================================
       ACCESS CONTROL — Auth module based
    ================================================================ */
    function isOwner() {
        if (window.Auth && typeof window.Auth.isOwnerEmail === 'function') {
            return window.Auth.isOwnerEmail();
        }
        return false;
    }

    function isDesktop() {
        return window.innerWidth >= DESKTOP_MIN_WIDTH;
    }

    /* ================================================================
       AUTH CHANGE HANDLER
    ================================================================ */
    function onAuthChange() {
        const granted = isOwner() && isDesktop();

        if (granted) {
            document.body.classList.add('admin-mode');
            console.log('[Admin] Access granted');
        } else {
            document.body.classList.remove('admin-mode');
            console.log('[Admin] Access denied');

            /* If on admin page, kick out */
            if (document.body.classList.contains('page-admin')) {
                document.body.classList.remove('page-admin');
                if (window.Pages) {
                    try { window.Pages.navigate('home'); } catch (e) {}
                }
            }
        }
    }

    /* ================================================================
       STORAGE
    ================================================================ */
    function loadAdminSongs() {
        try {
            const raw = localStorage.getItem(SONGS_KEY);
            if (raw) return JSON.parse(raw) || [];
        } catch (e) {}
        return [];
    }

    function saveAdminSongs(list) {
        try {
            localStorage.setItem(SONGS_KEY, JSON.stringify(list));
        } catch (e) {}
    }

    function loadHiddenSongs() {
        try {
            const raw = localStorage.getItem(HIDDEN_KEY);
            if (raw) return JSON.parse(raw) || [];
        } catch (e) {}
        return [];
    }

    function saveHiddenSongs(list) {
        try {
            localStorage.setItem(HIDDEN_KEY, JSON.stringify(list));
        } catch (e) {}
    }

    /* ================================================================
       MERGE TRACKS
    ================================================================ */
    function getMergedTracks() {
        const base = window.__baseTracks || [];
        const admin = loadAdminSongs();
        const hidden = loadHiddenSongs();

        const visibleBase = base.filter(t => !hidden.includes(t.id));

        const adminTracks = admin
            .filter(s => s.published !== false)
            .map(s => ({
                id: s.id,
                title: s.title,
                artist: s.artist,
                album: s.album || 'Singles',
                duration: s.duration || '0:00',
                durSec: parseDuration(s.duration),
                art: s.cover || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop',
                src: s.audio,
                genre: s.genre || '',
                lyrics: s.lyrics || '',
                releaseDate: s.releaseDate || '',
                isAdmin: true
            }));

        return [...visibleBase, ...adminTracks];
    }

    function parseDuration(str) {
        if (!str) return 0;
        const parts = String(str).split(':').map(n => parseInt(n, 10));
        if (parts.length === 2) return parts[0] * 60 + parts[1];
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
        return 0;
    }

    /* ================================================================
       RENDER ADMIN PAGE
    ================================================================ */
    function renderAdminPage() {
        const songs = loadAdminSongs();

        const published = songs.filter(s => s.published !== false).length;
        const draft = songs.filter(s => s.published === false).length;

        if (statTotal) statTotal.textContent = songs.length;
        if (statPublished) statPublished.textContent = published;
        if (statDraft) statDraft.textContent = draft;
        if (songCountText) songCountText.textContent = `${songs.length} songs`;

        if (!songsList) return;
        songsList.innerHTML = '';

        if (!songs.length) {
            if (emptyState) emptyState.style.display = 'flex';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';

        songs.forEach(song => {
            const row = document.createElement('div');
            row.className = 'admin-song-row';
            row.setAttribute('data-song-id', song.id);

            const isPub = song.published !== false;
            const statusClass = isPub ? 'published' : 'draft';
            const statusText = isPub ? 'Published' : 'Draft';

            row.innerHTML = `
                <div class="admin-song-thumb ${song.cover ? '' : 'no-img'}">
                    ${song.cover ? `<img src="${song.cover}" alt="${song.title}" onerror="this.style.display='none'; this.parentElement.classList.add('no-img');">` : ''}
                </div>
                <div class="admin-song-info">
                    <span class="admin-song-title">${song.title}</span>
                    <span class="admin-song-meta">
                        ${song.artist}
                        <span class="admin-dot">·</span>
                        ${song.album || 'Singles'}
                        ${song.genre ? `<span class="admin-dot">·</span>${song.genre}` : ''}
                    </span>
                </div>
                <span class="admin-song-status ${statusClass}">${statusText}</span>
                <div class="admin-song-actions">
                    <button class="admin-action-btn edit" data-action="edit" title="Edit">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button class="admin-action-btn toggle" data-action="toggle" title="${isPub ? 'Unpublish' : 'Publish'}">
                        <i class="fas fa-${isPub ? 'eye-slash' : 'eye'}"></i>
                    </button>
                    <button class="admin-action-btn delete" data-action="delete" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            songsList.appendChild(row);
        });

        songsList.querySelectorAll('.admin-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const row = btn.closest('.admin-song-row');
                const songId = row.getAttribute('data-song-id');
                const action = btn.getAttribute('data-action');

                if (action === 'edit') openEditModal(songId);
                else if (action === 'toggle') togglePublish(songId);
                else if (action === 'delete') deleteSong(songId);
            });
        });
    }

    /* ================================================================
       MODAL
    ================================================================ */
    function openAddModal() {
        editingSongId = null;
        if (modalTitle) modalTitle.textContent = 'Add New Song';
        if (modalSaveText) modalSaveText.textContent = 'Add Song';

        [inputTitle, inputArtist, inputAlbum, inputGenre,
         inputDuration, inputRelease, inputCover, inputAudio, inputLyrics]
            .forEach(inp => { if (inp) inp.value = ''; });
        if (inputPublished) inputPublished.checked = true;

        updatePreview();
        if (modal) modal.classList.add('active');
        setTimeout(() => inputTitle?.focus(), 200);
    }

    function openEditModal(songId) {
        const songs = loadAdminSongs();
        const song = songs.find(s => String(s.id) === String(songId));
        if (!song) return;

        editingSongId = song.id;
        if (modalTitle) modalTitle.textContent = 'Edit Song';
        if (modalSaveText) modalSaveText.textContent = 'Save Changes';

        if (inputTitle) inputTitle.value = song.title || '';
        if (inputArtist) inputArtist.value = song.artist || '';
        if (inputAlbum) inputAlbum.value = song.album || '';
        if (inputGenre) inputGenre.value = song.genre || '';
        if (inputDuration) inputDuration.value = song.duration || '';
        if (inputRelease) inputRelease.value = song.releaseDate || '';
        if (inputCover) inputCover.value = song.cover || '';
        if (inputAudio) inputAudio.value = song.audio || '';
        if (inputLyrics) inputLyrics.value = song.lyrics || '';
        if (inputPublished) inputPublished.checked = song.published !== false;

        updatePreview();
        if (modal) modal.classList.add('active');
        setTimeout(() => inputTitle?.focus(), 200);
    }

    function closeModal() {
        if (modal) modal.classList.remove('active');
        editingSongId = null;
    }

    /* ================================================================
       LIVE PREVIEW
    ================================================================ */
    function updatePreview() {
        if (previewTitle) previewTitle.textContent = inputTitle?.value || 'Song Title';
        if (previewArtist) previewArtist.textContent = inputArtist?.value || 'Artist';

        if (previewArt) {
            const url = inputCover?.value?.trim();
            if (url) {
                previewArt.innerHTML = `<img src="${url}" alt="preview" onerror="this.style.display='none'; this.parentElement.innerHTML='<i class=\\'fas fa-music\\'></i>';">`;
            } else {
                previewArt.innerHTML = '<i class="fas fa-music"></i>';
            }
        }
    }

    /* ================================================================
       SAVE SONG
    ================================================================ */
    function saveSong() {
        const title = inputTitle?.value?.trim();
        const artist = inputArtist?.value?.trim();
        const audio = inputAudio?.value?.trim();

        if (!title) { showToast('Enter song title'); inputTitle?.focus(); return; }
        if (!artist) { showToast('Enter artist name'); inputArtist?.focus(); return; }
        if (!audio) { showToast('Paste audio URL'); inputAudio?.focus(); return; }

        const songs = loadAdminSongs();

        if (editingSongId !== null) {
            const idx = songs.findIndex(s => String(s.id) === String(editingSongId));
            if (idx !== -1) {
                songs[idx] = {
                    ...songs[idx],
                    title,
                    artist,
                    album: inputAlbum?.value?.trim() || '',
                    genre: inputGenre?.value?.trim() || '',
                    duration: inputDuration?.value?.trim() || '0:00',
                    releaseDate: inputRelease?.value || '',
                    cover: inputCover?.value?.trim() || '',
                    audio,
                    lyrics: inputLyrics?.value?.trim() || '',
                    published: inputPublished?.checked !== false,
                    updatedAt: Date.now()
                };
            }
            showToast('Song updated ✓');
        } else {
            const newSong = {
                id: 'admin_' + Date.now(),
                title,
                artist,
                album: inputAlbum?.value?.trim() || '',
                genre: inputGenre?.value?.trim() || '',
                duration: inputDuration?.value?.trim() || '0:00',
                releaseDate: inputRelease?.value || '',
                cover: inputCover?.value?.trim() || '',
                audio,
                lyrics: inputLyrics?.value?.trim() || '',
                published: inputPublished?.checked !== false,
                createdAt: Date.now()
            };
            songs.push(newSong);
            showToast('Song added ✓');
        }

        saveAdminSongs(songs);
        closeModal();
        renderAdminPage();
        refreshPlayerTracks();
    }

    function togglePublish(songId) {
        const songs = loadAdminSongs();
        const song = songs.find(s => String(s.id) === String(songId));
        if (!song) return;

        song.published = song.published === false ? true : false;
        saveAdminSongs(songs);
        renderAdminPage();
        refreshPlayerTracks();
        showToast(song.published ? 'Published ✓' : 'Unpublished');
    }

    function deleteSong(songId) {
        const songs = loadAdminSongs();
        const song = songs.find(s => String(s.id) === String(songId));
        if (!song) return;

        if (!confirm(`Delete "${song.title}"?`)) return;

        const filtered = songs.filter(s => String(s.id) !== String(songId));
        saveAdminSongs(filtered);
        renderAdminPage();
        refreshPlayerTracks();
        showToast(`Deleted "${song.title}"`);
    }

    /* ================================================================
       REFRESH
    ================================================================ */
    function refreshPlayerTracks() {
        if (typeof window.__refreshTracks === 'function') {
            window.__refreshTracks();
        }
        renderAdminSongsOnHome();
        if (document.body.classList.contains('page-admin')) {
            renderAdminPage();
        }
    }

    /* ================================================================
       RENDER ADMIN SONGS ON HOME
    ================================================================ */
    function renderAdminSongsOnHome() {
        const sectionHead = document.getElementById('admin-songs-section-head');
        const list = document.getElementById('admin-songs-list-home');
        if (!list) return;

        const adminSongs = loadAdminSongs().filter(s => s.published !== false);

        if (!adminSongs.length) {
            if (sectionHead) sectionHead.style.display = 'none';
            list.innerHTML = '';
            return;
        }

        if (sectionHead) sectionHead.style.display = '';

        list.innerHTML = adminSongs.map(song => {
            const trackIndex = (window.tracks || []).findIndex(t => String(t.id) === String(song.id));
            const cover = song.cover || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=80&h=80&fit=crop';
            const duration = song.duration || '0:00';

            return `
                <div class="song-row" data-track-id="${song.id}" data-track-index="${trackIndex}">
                    <div class="song-play"><i class="fas fa-play"></i></div>
                    <div class="song-thumb">
                        <img src="${cover}" alt="${song.title}" onerror="this.style.display='none'; this.parentElement.innerHTML='<i class=\\'fas fa-music\\' style=\\'color:rgba(255,255,255,0.3);font-size:1.4rem;\\'></i>';">
                    </div>
                    <div class="song-info">
                        <span class="song-title">${song.title}</span>
                        <span class="song-artist">${song.artist}</span>
                    </div>
                    <span class="song-album">${song.album || 'Singles'}</span>
                    <span class="song-duration">${duration}</span>
                    <i class="fas fa-heart song-like" data-track-id="${song.id}"></i>
                </div>
            `;
        }).join('');

        list.querySelectorAll('.song-row').forEach(row => {
            row.addEventListener('click', (e) => {
                if (e.target.classList.contains('song-like')) return;
                const idx = parseInt(row.getAttribute('data-track-index'), 10);
                if (!isNaN(idx) && idx >= 0 && window.Player) {
                    window.Player.loadTrack(idx, true);
                }
            });
        });

        if (window.Likes && window.Likes.syncAllHearts) {
            window.Likes.syncAllHearts(list);
        }
    }

    /* ================================================================
       TOAST
    ================================================================ */
    function showToast(msg) {
        if (window.BottomNav && window.BottomNav.showToast) {
            window.BottomNav.showToast(msg);
        } else {
            console.log('[Admin]', msg);
        }
    }

    /* ================================================================
       OPEN ADMIN PAGE
    ================================================================ */
    function openAdminPage() {
        if (!isOwner()) {
            alert('Access denied. Admin panel is for the owner only.');
            return;
        }
        if (!isDesktop()) {
            alert('Admin panel is available on desktop/laptop only.');
            return;
        }

        renderAdminPage();

        if (window.Pages) {
            window.Pages.navigate('admin');
        } else {
            document.body.classList.add('page-admin');
        }
    }

    /* ================================================================
       INIT
    ================================================================ */
    function init() {
        modal = document.getElementById('admin-song-modal');
        modalTitle = document.getElementById('admin-modal-title');
        modalSaveText = document.getElementById('admin-modal-save-text');

        inputTitle = document.getElementById('admin-input-title');
        inputArtist = document.getElementById('admin-input-artist');
        inputAlbum = document.getElementById('admin-input-album');
        inputGenre = document.getElementById('admin-input-genre');
        inputDuration = document.getElementById('admin-input-duration');
        inputRelease = document.getElementById('admin-input-release');
        inputCover = document.getElementById('admin-input-cover');
        inputAudio = document.getElementById('admin-input-audio');
        inputLyrics = document.getElementById('admin-input-lyrics');
        inputPublished = document.getElementById('admin-input-published');

        previewArt = document.getElementById('admin-preview-art');
        previewTitle = document.getElementById('admin-preview-title');
        previewArtist = document.getElementById('admin-preview-artist');

        songsList = document.getElementById('admin-songs-list');
        emptyState = document.getElementById('admin-empty');
        statTotal = document.getElementById('admin-stat-total');
        statPublished = document.getElementById('admin-stat-published');
        statDraft = document.getElementById('admin-stat-draft');
        songCountText = document.getElementById('admin-song-count');

        /* Trigger button */
        const triggerBtn = document.getElementById('admin-trigger-btn');
        if (triggerBtn) {
            triggerBtn.addEventListener('click', openAdminPage);
        }

        /* Add new button */
        const addNewBtn = document.getElementById('admin-add-new-btn');
        if (addNewBtn) addNewBtn.addEventListener('click', openAddModal);

        /* Modal close */
        const modalClose = document.getElementById('admin-modal-close');
        const modalCancel = document.getElementById('admin-modal-cancel');
        if (modalClose) modalClose.addEventListener('click', closeModal);
        if (modalCancel) modalCancel.addEventListener('click', closeModal);

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModal();
            });
        }

        /* Save */
        const saveBtn = document.getElementById('admin-modal-save');
        if (saveBtn) saveBtn.addEventListener('click', saveSong);

        /* Live preview */
        [inputTitle, inputArtist, inputCover].forEach(inp => {
            if (inp) inp.addEventListener('input', updatePreview);
        });

        /* Enter on title → artist */
        if (inputTitle) {
            inputTitle.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    inputArtist?.focus();
                }
            });
        }

        /* Escape closes */
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal?.classList.contains('active')) {
                closeModal();
            }
        });

        /* Render admin songs on home */
        renderAdminSongsOnHome();

        /* Listen for track updates */
        window.addEventListener('tracks:updated', () => {
            renderAdminSongsOnHome();
        });

        /* Listen for auth changes */
        window.addEventListener('auth:changed', () => {
            onAuthChange();
        });

        /* Initial state check */
        onAuthChange();

        console.log('[Admin] Init complete. Owner:', isOwner());
    }

    /* ================================================================
       PUBLIC API
    ================================================================ */
    return {
        init,
        isOwner,
        isDesktop,
        getMergedTracks,
        loadAdminSongs,
        saveAdminSongs,
        openAdminPage,
        renderAdminPage,
        refreshPlayerTracks,
        renderAdminSongsOnHome,
        onAuthChange
    };
})();