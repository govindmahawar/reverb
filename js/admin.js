/* ==================================================================
   ADMIN.JS — Admin Panel (Complete Auto-Convert)
   - Permalink paste karo → Add Song click karo → AUTO RAW
   - Zero manual work
   - Firestore + home render
   Exposes: window.Admin
================================================================== */

window.Admin = (function () {

    var DESKTOP_MIN_WIDTH = 900;
    var _allSongs = [];
    var editingSongId = null;

    var modal, modalTitle, modalSaveText,
        inputTitle, inputArtist, inputGenre,
        inputRelease, inputCover, inputAudio,
        inputPublished,
        previewArt, previewTitle, previewArtist,
        songsList, emptyState,
        statTotal, statPublished, statDraft,
        songCountText;

    /* ================================================================
       ACCESS CONTROL
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
       🔥🔥 AUTO-CONVERT — FULL AUTOMATIC
       Jo bhi GitHub URL milega, raw bana dega
    ================================================================ */
    function autoConvertToRaw(url) {
        if (!url) return url;

        url = String(url).trim();

        /* Already raw? */
        if (url.indexOf('raw.githubusercontent.com') !== -1) {
            console.log('[Admin] ✅ Already raw');
            return url;
        }

        /* Pattern 1: github.com/user/repo/blob/BRANCH/FILE */
        var m1 = url.match(/^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)\/blob\/([^\/]+)\/(.+)$/i);
        if (m1) {
            var user = m1[1];
            var repo = m1[2];
            var branch = m1[3];
            var file = m1[4];

            /* If commit hash → use main */
            if (/^[a-f0-9]{7,40}$/i.test(branch)) {
                branch = 'main';
            }

            var result = 'https://raw.githubusercontent.com/' + user + '/' + repo + '/' + branch + '/' + file;
            console.log('[Admin] 🔄 Converted:', result);
            return result;
        }

        /* Pattern 2: github.com/user/repo/raw/BRANCH/FILE */
        var m2 = url.match(/^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)\/raw\/([^\/]+)\/(.+)$/i);
        if (m2) {
            var result2 = 'https://raw.githubusercontent.com/' + m2[1] + '/' + m2[2] + '/' + m2[3] + '/' + m2[4];
            console.log('[Admin] 🔄 Converted (raw):', result2);
            return result2;
        }

        /* Pattern 3: github.com/user/repo/tree/... (folder) → can't convert */
        /* Return original */
        return url;
    }

    /* ================================================================
       AUTH CHANGE
    ================================================================ */
    function onAuthChange() {
        var granted = isOwner() && isDesktop();
        if (granted) {
            document.body.classList.add('admin-mode');
            loadSongsFromFirestore();
        } else {
            document.body.classList.remove('admin-mode');
            if (document.body.classList.contains('page-admin')) {
                document.body.classList.remove('page-admin');
                if (window.Pages) {
                    try { window.Pages.navigate('home'); } catch (e) {}
                }
            }
        }
    }

    /* ================================================================
       LOAD / SAVE
    ================================================================ */
    function loadSongsFromFirestore() {
        if (!window.Firestore || !window.Firestore.loadAdminSongs) return;

        window.Firestore.loadAdminSongs().then(function (songs) {
            _allSongs = songs || [];
            window.__adminSongs = _allSongs.slice();
            if (window.__refreshTracks) window.__refreshTracks();
            renderAdminPage();
            renderOnHome();
            console.log('[Admin] Loaded', _allSongs.length, 'songs');
        }).catch(function (err) {
            console.error('[Admin] Load error:', err);
        });
    }

    function saveSongToFirestore(song) {
        if (!window.Firestore || !window.Firestore.saveAdminSong) {
            return Promise.reject(new Error('Firestore not ready'));
        }
        return window.Firestore.saveAdminSong(song);
    }

    function deleteSongFromFirestore(songId) {
        if (!window.Firestore || !window.Firestore.deleteAdminSong) {
            return Promise.reject(new Error('Firestore not ready'));
        }
        return window.Firestore.deleteAdminSong(songId);
    }

    /* ================================================================
       RENDER ADMIN PAGE
    ================================================================ */
    function renderAdminPage() {
        var songs = _allSongs || [];
        var published = songs.filter(s => s.published !== false).length;
        var draft = songs.filter(s => s.published === false).length;

        if (statTotal) statTotal.textContent = songs.length;
        if (statPublished) statPublished.textContent = published;
        if (statDraft) statDraft.textContent = draft;
        if (songCountText) songCountText.textContent = songs.length + ' songs';

        if (!songsList) return;
        songsList.innerHTML = '';

        if (!songs.length) {
            if (emptyState) emptyState.style.display = 'flex';
            return;
        }
        if (emptyState) emptyState.style.display = 'none';

        songs.forEach(function (song) {
            var row = document.createElement('div');
            row.className = 'admin-song-row';
            row.setAttribute('data-song-id', song.id);

            var isPub = song.published !== false;
            var statusClass = isPub ? 'published' : 'draft';
            var statusText = isPub ? 'Published' : 'Draft';

            row.innerHTML = ''
                + '<div class="admin-song-thumb ' + (song.cover ? '' : 'no-img') + '">'
                +   (song.cover ? '<img src="' + song.cover + '" alt="" onerror="this.style.display=\'none\';">' : '')
                + '</div>'
                + '<div class="admin-song-info">'
                +   '<span class="admin-song-title">' + song.title + '</span>'
                +   '<span class="admin-song-meta">'
                +     song.artist
                +     (song.genre ? '<span class="admin-dot">·</span>' + song.genre : '')
                +   '</span>'
                + '</div>'
                + '<span class="admin-song-status ' + statusClass + '">' + statusText + '</span>'
                + '<div class="admin-song-actions">'
                +   '<button class="admin-action-btn edit" data-action="edit" title="Edit"><i class="fas fa-pen"></i></button>'
                +   '<button class="admin-action-btn toggle" data-action="toggle" title="Toggle"><i class="fas fa-' + (isPub ? 'eye-slash' : 'eye') + '"></i></button>'
                +   '<button class="admin-action-btn delete" data-action="delete" title="Delete"><i class="fas fa-trash"></i></button>'
                + '</div>';

            songsList.appendChild(row);
        });

        songsList.querySelectorAll('.admin-action-btn').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                var row = btn.closest('.admin-song-row');
                var songId = row.getAttribute('data-song-id');
                var action = btn.getAttribute('data-action');

                if (action === 'edit') openEditModal(songId);
                else if (action === 'toggle') togglePublish(songId);
                else if (action === 'delete') deleteSong(songId);
            });
        });
    }

    /* ================================================================
       RENDER ON HOME
    ================================================================ */
    function renderOnHome() {
        var songs = (_allSongs || []).filter(s => s.published !== false);

        var head = document.getElementById('all-songs-head');
        var list = document.getElementById('all-songs-list');
        var empty = document.getElementById('songs-empty');

        if (head) head.style.display = songs.length ? '' : 'none';
        if (empty) empty.style.display = songs.length ? 'none' : 'flex';

        if (list) {
            list.innerHTML = '';

            songs.forEach(function (song) {
                var trackIndex = (window.tracks || []).findIndex(t => String(t.id) === String(song.id));
                var cover = song.cover || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=80&h=80&fit=crop';
                var duration = song.duration || '0:00';

                var row = document.createElement('div');
                row.className = 'song-row';
                row.setAttribute('data-track-id', song.id);
                row.setAttribute('data-track-index', trackIndex);
                row.innerHTML = ''
                    + '<div class="song-play"><i class="fas fa-play"></i></div>'
                    + '<div class="song-thumb"><img src="' + cover + '" alt=""></div>'
                    + '<div class="song-info">'
                    +   '<span class="song-title">' + song.title + '</span>'
                    +   '<span class="song-artist">' + song.artist + '</span>'
                    + '</div>'
                    + '<span class="song-album">' + (song.genre || 'Singles') + '</span>'
                    + '<span class="song-duration">' + duration + '</span>'
                    + '<i class="fas fa-heart song-like" data-track-id="' + song.id + '"></i>';

                list.appendChild(row);
            });

            list.querySelectorAll('.song-row').forEach(function (row) {
                row.addEventListener('click', function (e) {
                    if (e.target.classList.contains('song-like')) return;
                    var idx = parseInt(row.getAttribute('data-track-index'), 10);
                    if (!isNaN(idx) && idx >= 0 && window.Player) {
                        window.Player.loadTrack(idx, true);
                    }
                });
            });

            if (window.UserData && window.UserData.syncAllHearts) {
                window.UserData.syncAllHearts(list);
            }
        }
    }

    /* ================================================================
       MODAL
    ================================================================ */
    function openAddModal() {
        editingSongId = null;
        if (modalTitle) modalTitle.textContent = 'Add New Song';
        if (modalSaveText) modalSaveText.textContent = 'Add Song';

        [inputTitle, inputArtist, inputGenre, inputRelease, inputCover, inputAudio]
            .forEach(function (inp) { if (inp) inp.value = ''; });
        if (inputPublished) inputPublished.checked = true;

        updatePreview();
        if (modal) modal.classList.add('active');
        setTimeout(function () { if (inputTitle) inputTitle.focus(); }, 200);
    }

    function openEditModal(songId) {
        var song = _allSongs.find(s => String(s.id) === String(songId));
        if (!song) return;

        editingSongId = song.id;
        if (modalTitle) modalTitle.textContent = 'Edit Song';
        if (modalSaveText) modalSaveText.textContent = 'Save Changes';

        if (inputTitle) inputTitle.value = song.title || '';
        if (inputArtist) inputArtist.value = song.artist || '';
        if (inputGenre) inputGenre.value = song.genre || '';
        if (inputRelease) inputRelease.value = song.releaseDate || '';
        if (inputCover) inputCover.value = song.cover || '';
        if (inputAudio) inputAudio.value = song.audio || '';
        if (inputPublished) inputPublished.checked = song.published !== false;

        updatePreview();
        if (modal) modal.classList.add('active');
    }

    function closeModal() {
        if (modal) modal.classList.remove('active');
        editingSongId = null;
    }

    function updatePreview() {
        if (previewTitle) previewTitle.textContent = inputTitle ? inputTitle.value : 'Song Title';
        if (previewArtist) previewArtist.textContent = inputArtist ? inputArtist.value : 'Artist';

        if (previewArt) {
            var url = inputCover ? inputCover.value.trim() : '';
            if (url) {
                previewArt.innerHTML = '<img src="' + url + '" alt="" onerror="this.style.display=\'none\';">';
            } else {
                previewArt.innerHTML = '<i class="fas fa-music"></i>';
            }
        }
    }

    /* ================================================================
       SAVE SONG — FULL AUTO CONVERT
    ================================================================ */
    function saveSong() {
        var title = inputTitle ? inputTitle.value.trim() : '';
        var artist = inputArtist ? inputArtist.value.trim() : '';
        var audioInput = inputAudio ? inputAudio.value.trim() : '';

        if (!title) { showToast('Enter song title'); return; }
        if (!artist) { showToast('Enter artist name'); return; }
        if (!audioInput) { showToast('Paste audio URL'); return; }

        /* 🔥 AUTO-CONVERT — USER KO KUCH NAHI KARNA */
        var audio = autoConvertToRaw(audioInput);

        /* Silent — no toast needed unless user wants */
        console.log('[Admin] Audio URL ready:', audio);

        var song = {
            id: editingSongId || ('song_' + Date.now()),
            title: title,
            artist: artist,
            genre: inputGenre ? inputGenre.value : '',
            releaseDate: inputRelease ? inputRelease.value : '',
            cover: inputCover ? inputCover.value.trim() : '',
            audio: audio,
            published: inputPublished ? inputPublished.checked : true,
            updatedAt: Date.now()
        };

        if (!editingSongId) song.createdAt = Date.now();

        /* Loading */
        var saveBtn = document.getElementById('admin-modal-save');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        }

        saveSongToFirestore(song).then(function () {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="fas fa-check"></i> <span id="admin-modal-save-text">' + (editingSongId ? 'Save Changes' : 'Add Song') + '</span>';
            }

            showToast(editingSongId ? 'Song updated ✓' : 'Song added ✓');

            if (editingSongId) {
                var idx = _allSongs.findIndex(s => String(s.id) === String(editingSongId));
                if (idx !== -1) _allSongs[idx] = song;
            } else {
                _allSongs.push(song);
            }

            window.__adminSongs = _allSongs.slice();
            if (window.__refreshTracks) window.__refreshTracks();

            closeModal();
            renderAdminPage();
            renderOnHome();
        }).catch(function (err) {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="fas fa-check"></i> Save';
            }

            var errorMsg = 'Save failed';
            if (err && err.message) errorMsg = 'Save failed: ' + err.message;
            else if (err && err.code) errorMsg = 'Save failed: ' + err.code;

            console.error('[Admin] Save error:', err);
            showToast(errorMsg);
        });
    }

    function togglePublish(songId) {
        var song = _allSongs.find(s => String(s.id) === String(songId));
        if (!song) return;

        song.published = song.published === false ? true : false;

        saveSongToFirestore(song).then(function () {
            renderAdminPage();
            window.__adminSongs = _allSongs.slice();
            if (window.__refreshTracks) window.__refreshTracks();
            renderOnHome();
            showToast(song.published ? 'Published ✓' : 'Unpublished');
        }).catch(function (err) {
            showToast('Failed: ' + err.message);
        });
    }

    function deleteSong(songId) {
        var song = _allSongs.find(s => String(s.id) === String(songId));
        if (!song) return;

        if (!confirm('Delete "' + song.title + '"?')) return;

        deleteSongFromFirestore(songId).then(function () {
            _allSongs = _allSongs.filter(s => String(s.id) !== String(songId));
            window.__adminSongs = _allSongs.slice();
            if (window.__refreshTracks) window.__refreshTracks();
            renderAdminPage();
            renderOnHome();
            showToast('Deleted "' + song.title + '"');
        }).catch(function (err) {
            showToast('Delete failed: ' + err.message);
        });
    }

    /* ================================================================
       TOAST
    ================================================================ */
    function showToast(msg) {
        if (window.BottomNav && window.BottomNav.showToast) {
            window.BottomNav.showToast(msg);
        }
    }

    /* ================================================================
       OPEN ADMIN PAGE
    ================================================================ */
    function openAdminPage() {
        if (!isOwner()) { alert('Access denied.'); return; }
        if (!isDesktop()) { alert('Desktop only.'); return; }

        renderAdminPage();
        if (window.Pages) window.Pages.navigate('admin');
        else document.body.classList.add('page-admin');
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
        inputGenre = document.getElementById('admin-input-genre');
        inputRelease = document.getElementById('admin-input-release');
        inputCover = document.getElementById('admin-input-cover');
        inputAudio = document.getElementById('admin-input-audio');
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

        var triggerBtn = document.getElementById('admin-trigger-btn');
        if (triggerBtn) triggerBtn.addEventListener('click', openAdminPage);

        var addNewBtn = document.getElementById('admin-add-new-btn');
        if (addNewBtn) addNewBtn.addEventListener('click', openAddModal);

        var modalClose = document.getElementById('admin-modal-close');
        var modalCancel = document.getElementById('admin-modal-cancel');
        if (modalClose) modalClose.addEventListener('click', closeModal);
        if (modalCancel) modalCancel.addEventListener('click', closeModal);

        if (modal) {
            modal.addEventListener('click', function (e) {
                if (e.target === modal) closeModal();
            });
        }

        var saveBtn = document.getElementById('admin-modal-save');
        if (saveBtn) saveBtn.addEventListener('click', saveSong);

        [inputTitle, inputArtist, inputCover].forEach(function (inp) {
            if (inp) inp.addEventListener('input', updatePreview);
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && modal && modal.classList.contains('active')) closeModal();
        });

        window.addEventListener('auth:changed', onAuthChange);
        window.addEventListener('tracks:updated', renderOnHome);

        onAuthChange();

        console.log('[Admin] ✅ Init complete (auto-convert active)');
    }

    return {
        init: init,
        isOwner: isOwner,
        isDesktop: isDesktop,
        openAdminPage: openAdminPage,
        renderAdminPage: renderAdminPage,
        renderOnHome: renderOnHome,
        loadSongsFromFirestore: loadSongsFromFirestore,
        onAuthChange: onAuthChange,
        autoConvertToRaw: autoConvertToRaw
    };
})();