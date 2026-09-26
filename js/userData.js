/* ==================================================================
   USERDATA.JS — Likes + Follows + Playlists (all in one)
   Firestore synced · Multi-device · Fast load
   NO built-in / demo playlists — only user-created
   ❤️ Mini player like button with double-click guard
   Exposes: window.UserData
   Aliases: window.Likes, window.Follows, window.Playlists
================================================================== */

window.UserData = (function () {

    /* ================================================================
       IN-MEMORY STATE
    ================================================================ */
    let likedIds = [];
    let followed = [];
    let customPlaylists = [];
    let playlistSongs = {};

    window._userDataLoaded = false;

    /* Lock for mini like button (prevent double-tap) */
    var _miniLikeLocked = false;

    let modalOverlay, openModalBtn, closeModalBtn, cancelModalBtn,
        savePlaylistBtn, playlistNameInput, playlistsGroup;

    /* ================================================================
       UTILITY — Get Track ID from any heart element
    ================================================================ */
    function getTrackId(el) {
        if (!el) return null;

        const direct = el.getAttribute && el.getAttribute('data-track-id');
        if (direct !== null && direct !== undefined && direct !== '') {
            const n = Number(direct);
            if (!isNaN(n)) return n;
        }

        const row = el.closest('.song-row, .music-card, .suggestion-item, .library-item');
        if (row) {
            const idxAttr = row.getAttribute('data-track-index');
            if (idxAttr !== null) {
                const idx = parseInt(idxAttr, 10);
                const tracks = window.tracks || [];
                if (!isNaN(idx) && tracks[idx]) return tracks[idx].id;
            }

            const rowId = row.getAttribute('data-track-id');
            if (rowId !== null && rowId !== undefined && rowId !== '') {
                const n = Number(rowId);
                if (!isNaN(n)) return n;
            }

            const titleEl = row.querySelector('.song-title, .card-title, .suggestion-title');
            if (titleEl) {
                const title = titleEl.textContent.trim().toLowerCase();
                const tracks = window.tracks || [];
                const found = tracks.find(t => t.title.toLowerCase() === title);
                if (found) return found.id;
            }
        }
        return null;
    }

    /* ================================================================
       FAST LOAD HELPERS
    ================================================================ */
    function tryLoadNow() {
        if (window._userDataLoaded) return true;
        if (!window.FirebaseAuth || !window.FirebaseAuth.currentUser) return false;
        if (!window.Firestore || !window.Firestore.isReady()) return false;

        loadAllFromFirestore(true);
        return true;
    }

    /* ================================================================
       FIRESTORE SYNC
    ================================================================ */
    function syncAllToFirestore() {
        if (!window.Firestore || !window.Firestore.isReady()) return;
        if (!window._userDataLoaded) return;
        window.Firestore.saveLikes(likedIds);
        window.Firestore.saveFollows(followed);
        window.Firestore.savePlaylists(customPlaylists, playlistSongs);
    }

    function loadAllFromFirestore(force) {
        if (!force && window._userDataLoaded) return;
        if (!window.Firestore || !window.Firestore.isReady()) return;

        window._userDataLoaded = true;

        Promise.all([
            window.Firestore.loadLikes(),
            window.Firestore.loadFollows(),
            window.Firestore.loadPlaylists()
        ]).then(function (results) {
            likedIds = (results[0] || []).map(Number);
            followed = results[1] || [];
            customPlaylists = (results[2] && results[2].playlists) || [];
            playlistSongs = (results[2] && results[2].songsMap) || {};

            renderAll();
        }).catch(function (err) {
            window._userDataLoaded = false;
        });
    }

    function renderAll() {
        syncAllHearts();
        renderSidebarPlaylists();
        renderLibraryPagePlaylists();
        if (document.body.classList.contains('page-liked')) renderLikedPage();
        if (document.body.classList.contains('page-followed')) renderFollowsPage();
        syncMiniLikeButton();
    }

    /* ================================================================
       LIKES
    ================================================================ */
    function isLiked(trackId) {
        if (trackId === undefined || trackId === null) return false;
        return likedIds.includes(Number(trackId));
    }

    function toggleLike(trackId) {
        if (trackId === undefined || trackId === null) return false;
        const id = Number(trackId);
        const idx = likedIds.indexOf(id);

        var wasLiked = idx !== -1;

        if (wasLiked) {
            likedIds.splice(idx, 1);
        } else {
            likedIds.unshift(id);
        }

        if (window.Firestore && window.Firestore.isReady()) {
            window.Firestore.saveLikes(likedIds);
        }

        syncAllHearts();
        window.dispatchEvent(new CustomEvent('likes:updated', { detail: likedIds.slice() }));
        syncMiniLikeButton();

        return !wasLiked;
    }

    function getAllLikes() {
        return likedIds.slice();
    }

    function syncAllHearts(root) {
        const scope = root || document;
        scope.querySelectorAll('.song-like').forEach(function (heart) {
            const id = getTrackId(heart);
            if (id === null) return;
            heart.classList.toggle('active', isLiked(id));
        });
    }

    function renderLikedPage() {
        const list = document.getElementById('liked-list');
        const empty = document.getElementById('liked-empty');
        const countText = document.getElementById('liked-count-text');
        if (!list) return;

        const tracks = window.tracks || [];
        const likedTracks = likedIds
            .map(function (id) {
                const track = tracks.find(t => t.id === id);
                if (!track) return null;
                return { track: track, trackIndex: tracks.indexOf(track) };
            })
            .filter(Boolean);

        list.innerHTML = '';

        if (!likedTracks.length) {
            if (empty) empty.style.display = 'flex';
            if (countText) countText.textContent = '0 songs';
            return;
        }

        if (empty) empty.style.display = 'none';
        if (countText) countText.textContent = likedTracks.length + ' song' + (likedTracks.length > 1 ? 's' : '');

        likedTracks.forEach(function (item) {
            const track = item.track;
            const trackIndex = item.trackIndex;
            const row = document.createElement('div');
            row.className = 'song-row';
            row.setAttribute('data-track-index', trackIndex);
            row.setAttribute('data-track-id', track.id);
            row.innerHTML = ''
                + '<div class="song-play"><i class="fas fa-play"></i></div>'
                + '<div class="song-thumb"><img src="' + track.art + '" alt=""></div>'
                + '<div class="song-info">'
                +   '<span class="song-title">' + track.title + '</span>'
                +   '<span class="song-artist">' + track.artist + '</span>'
                + '</div>'
                + '<span class="song-album">' + track.album + '</span>'
                + '<span class="song-duration">' + track.duration + '</span>'
                + '<i class="fas fa-heart song-like active" data-track-id="' + track.id + '"></i>';
            list.appendChild(row);
        });

        list.querySelectorAll('.song-row').forEach(function (row) {
            row.addEventListener('click', function (e) {
                if (e.target.classList.contains('song-like')) return;
                const idx = parseInt(row.getAttribute('data-track-index'), 10);
                if (!isNaN(idx) && window.Player) window.Player.loadTrack(idx, true);
            });
        });

        list.querySelectorAll('.song-like').forEach(function (heart) {
            heart.addEventListener('click', function (e) {
                e.stopPropagation();
                const id = Number(heart.getAttribute('data-track-id'));
                if (isNaN(id)) return;
                toggleLike(id);
                setTimeout(renderLikedPage, 60);
            });
        });
    }

    /* ================================================================
       FOLLOWS
    ================================================================ */
    function isFollowing(name) {
        if (!name) return false;
        return followed.some(a => a.name === name);
    }

    function toggleFollow(name, image) {
        if (!name) return false;

        if (isFollowing(name)) {
            followed = followed.filter(a => a.name !== name);
        } else {
            followed.push({ name: name, image: image || '' });
        }

        if (window.Firestore && window.Firestore.isReady()) {
            window.Firestore.saveFollows(followed);
        }

        window.dispatchEvent(new CustomEvent('follows:updated', { detail: followed.slice() }));
        return isFollowing(name);
    }

    function getAllFollows() {
        return followed.slice();
    }

    function renderFollowsPage() {
        const grid = document.getElementById('followed-grid');
        const empty = document.getElementById('followed-empty');
        const countText = document.getElementById('followed-count-text');
        if (!grid) return;

        if (!followed.length) {
            grid.innerHTML = '';
            if (empty) empty.style.display = 'flex';
            if (countText) countText.textContent = '0 artists';
            return;
        }

        if (empty) empty.style.display = 'none';
        if (countText) countText.textContent = followed.length + ' artist' + (followed.length > 1 ? 's' : '');

        grid.innerHTML = followed.map(function (artist) {
            return ''
                + '<div class="followed-card" data-artist-name="' + artist.name + '">'
                +   '<div class="followed-card-art">'
                +     '<img src="' + (artist.image || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&h=200&fit=crop') + '" alt="' + artist.name + '">'
                +   '</div>'
                +   '<span class="followed-card-name">' + artist.name + '</span>'
                +   '<span class="followed-card-meta">Artist</span>'
                + '</div>';
        }).join('');

        grid.querySelectorAll('.followed-card').forEach(function (card) {
            card.addEventListener('click', function () {
                const name = card.getAttribute('data-artist-name');
                if (name && window.Pages && window.Pages.openArtistProfile) {
                    window.Pages.openArtistProfile(name, { from: 'followed' });
                }
            });
        });
    }

    function syncFollowButton(artistName, image) {
        const btn = document.getElementById('artist-follow-btn');
        if (!btn) return;
        const following = isFollowing(artistName);
        btn.classList.toggle('following', following);
        btn.innerHTML = following
            ? '<i class="fas fa-check"></i> Following'
            : '<i class="fas fa-plus"></i> Follow';
        btn.dataset.artistName = artistName || '';
        btn.dataset.artistImage = image || '';
    }

    /* ================================================================
       PLAYLISTS — Only custom
    ================================================================ */
    function getAllPlaylists() {
        return customPlaylists.slice();
    }

    function getSongsInPlaylist(playlistName) {
        return (playlistSongs[playlistName] || []).slice();
    }

    function createPlaylist(name) {
        if (!name || !name.trim()) return false;
        name = name.trim();

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
            'linear-gradient(145deg, #db2777, #9d174d)',
            'linear-gradient(145deg, #0891b2, #155e75)',
            'linear-gradient(145deg, #dc2626, #991b1b)'
        ];
        const bg = gradients[customPlaylists.length % gradients.length];

        customPlaylists.push({
            name: name,
            icon: 'fa-compact-disc',
            gradient: bg
        });

        if (window.Firestore && window.Firestore.isReady() && window._userDataLoaded) {
            window.Firestore.savePlaylists(customPlaylists, playlistSongs);
        }

        renderSidebarPlaylists();
        renderLibraryPagePlaylists();
        return true;
    }

    function addSongToPlaylist(playlistName, trackId) {
        if (!playlistName || trackId === undefined) return false;
        if (!playlistSongs[playlistName]) playlistSongs[playlistName] = [];
        if (playlistSongs[playlistName].includes(trackId)) return false;
        playlistSongs[playlistName].push(trackId);

        if (window.Firestore && window.Firestore.isReady() && window._userDataLoaded) {
            window.Firestore.savePlaylists(customPlaylists, playlistSongs);
        }
        return true;
    }

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

    /* ---- RENDER SIDEBAR PLAYLISTS ---- */
    function renderSidebarPlaylists() {
        if (!playlistsGroup) playlistsGroup = document.getElementById('playlists-group');
        if (!playlistsGroup) return;

        playlistsGroup.querySelectorAll('.playlist-mini').forEach(el => el.remove());

        customPlaylists.forEach(function (pl) {
            const newPl = document.createElement('div');
            newPl.className = 'playlist-mini';
            newPl.setAttribute('data-title', pl.name);
            newPl.setAttribute('data-playlist-name', pl.name);
            newPl.setAttribute('data-custom', 'true');

            newPl.innerHTML = ''
                + '<div class="playlist-mini-art" style="background:' + (pl.gradient || 'linear-gradient(145deg, #7c3aed, #4c1d95)') + ';">'
                +   '<i class="fas ' + (pl.icon || 'fa-compact-disc') + '"></i>'
                + '</div>'
                + '<span>' + pl.name + '</span>';

            newPl.addEventListener('click', function () { playPlaylist(pl.name); });
            playlistsGroup.appendChild(newPl);
        });
    }

    /* ---- RENDER LIBRARY PAGE PLAYLISTS ---- */
    function renderLibraryPagePlaylists() {
        const container = document.querySelector('.library-tab-content[data-content="playlists"]');
        if (!container) return;

        container.querySelectorAll('.library-item').forEach(el => el.remove());

        customPlaylists.forEach(function (pl) {
            const songs = getSongsInPlaylist(pl.name);

            const item = document.createElement('div');
            item.className = 'library-item';
            item.setAttribute('data-playlist-name', pl.name);
            item.setAttribute('data-custom', 'true');

            item.innerHTML = ''
                + '<div class="library-item-art" style="background:' + (pl.gradient || 'linear-gradient(145deg, #7c3aed, #4c1d95)') + ';">'
                +   '<i class="fas ' + (pl.icon || 'fa-compact-disc') + '"></i>'
                + '</div>'
                + '<div class="library-item-info">'
                +   '<span class="library-item-title">' + pl.name + '</span>'
                +   '<span class="library-item-meta">Playlist · ' + songs.length + ' song' + (songs.length !== 1 ? 's' : '') + '</span>'
                + '</div>';

            item.addEventListener('click', function () { playPlaylist(pl.name); });
            container.appendChild(item);
        });
    }

    /* ---- PLAYLIST DROPDOWN ---- */
    function renderPlaylistDropdown() {
        const list = document.getElementById('playlist-dropdown-list');
        if (!list) return;

        if (!customPlaylists.length) {
            list.innerHTML = '<div class="playlist-dropdown-empty"><i class="fas fa-folder-plus"></i>No playlists yet. Create one first.</div>';
            return;
        }

        list.innerHTML = customPlaylists.map(function (pl) {
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
                const playlistName = item.getAttribute('data-playlist');
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
            });
        });
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

    /* ---- MODAL ---- */
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

    /* ================================================================
       ❤️ MINI LIKE BUTTON
    ================================================================ */
    function syncMiniLikeButton() {
        var miniLikeBtn = document.getElementById('mini-like-btn');
        if (!miniLikeBtn) return;

        var currentIdx = window.Player && window.Player.getIndex ? window.Player.getIndex() : 0;
        var track = (window.tracks || [])[currentIdx];
        if (!track) return;

        var liked = isLiked(track.id);

        if (liked) {
            miniLikeBtn.classList.add('active');
            miniLikeBtn.setAttribute('data-liked', 'true');
        } else {
            miniLikeBtn.classList.remove('active');
            miniLikeBtn.setAttribute('data-liked', 'false');
        }
    }

    function setupMiniLikeButton() {
        var miniLikeBtn = document.getElementById('mini-like-btn');
        if (!miniLikeBtn) return;

        miniLikeBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            e.preventDefault();

            /* 🔴 Double-tap guard */
            if (_miniLikeLocked) return;
            _miniLikeLocked = true;
            setTimeout(function () { _miniLikeLocked = false; }, 400);

            var currentIdx = window.Player && window.Player.getIndex ? window.Player.getIndex() : 0;
            var track = (window.tracks || [])[currentIdx];
            if (!track) return;

            /* Login required */
            if (window.Auth && !window.Auth.isLoggedIn()) {
                window.Auth.requireLogin(function () {
                    var nowLiked = toggleLike(track.id);
                    if (nowLiked) miniLikeBtn.classList.add('active');
                    else miniLikeBtn.classList.remove('active');
                }, 'like songs');
                return;
            }

            /* Explicit toggle */
            var wasLiked = isLiked(track.id);
            toggleLike(track.id);
            var nowLiked = isLiked(track.id);

            /* Force class update */
            if (nowLiked) {
                miniLikeBtn.classList.add('active');
                miniLikeBtn.setAttribute('data-liked', 'true');
            } else {
                miniLikeBtn.classList.remove('active');
                miniLikeBtn.setAttribute('data-liked', 'false');
            }

            if (window.BottomNav && window.BottomNav.showToast) {
                window.BottomNav.showToast(nowLiked ? 'Liked ' + track.title + ' ❤️' : 'Removed ' + track.title);
            }
        });

        /* Initial sync */
        setTimeout(syncMiniLikeButton, 300);
        setTimeout(syncMiniLikeButton, 1000);

        /* Sync on events */
        window.addEventListener('player:track-changed', syncMiniLikeButton);
        window.addEventListener('likes:updated', syncMiniLikeButton);

        /* RAF-based polling for track changes (silent) */
        var lastIdx = -1;
        if (window.Perf && window.Perf.rafAdd) {
            window.Perf.rafAdd(function () {
                var currentIdx = window.Player && window.Player.getIndex ? window.Player.getIndex() : 0;
                if (currentIdx !== lastIdx) {
                    lastIdx = currentIdx;
                    syncMiniLikeButton();
                }
                return true;
            });
        }
    }

    /* ================================================================
       GLOBAL CLICK HANDLERS
    ================================================================ */
    function setupGlobalClickHandlers() {
        document.addEventListener('click', function (e) {

            /* 🔴 Skip mini-like-btn — has own handler */
            if (e.target.closest('#mini-like-btn')) return;

            /* ---- HEART / LIKE ---- */
            const heart = e.target.closest('.song-like');
            if (heart) {
                e.preventDefault();
                e.stopPropagation();
                if (heart.closest('#liked-list')) return;

                const trackId = getTrackId(heart);
                if (trackId === null) return;

                if (window.Auth && !window.Auth.isLoggedIn()) {
                    window.Auth.requireLogin(function () {
                        const nowLiked = toggleLike(trackId);
                        heart.classList.toggle('active', nowLiked);
                    }, 'like songs');
                    return;
                }

                const wasLiked = isLiked(trackId);
                toggleLike(trackId);
                const nowLiked = isLiked(trackId);

                if (nowLiked) heart.classList.add('active');
                else heart.classList.remove('active');

                if (window.BottomNav && window.BottomNav.showToast) {
                    const t = (window.tracks || []).find(tr => tr.id === trackId);
                    window.BottomNav.showToast(nowLiked ? 'Liked ' + (t?.title || 'Song') + ' ❤️' : 'Removed ' + (t?.title || 'Song'));
                }
                return;
            }

            /* ---- FOLLOW BUTTON ---- */
            const followBtn = e.target.closest('#artist-follow-btn');
            if (followBtn) {
                e.preventDefault();
                e.stopPropagation();

                const artistName = followBtn.dataset.artistName
                    || document.getElementById('artist-profile-name')?.textContent?.trim()
                    || '';
                const artistImg = followBtn.dataset.artistImage
                    || document.getElementById('artist-profile-img')?.src
                    || '';

                if (!artistName) return;

                if (window.Auth && !window.Auth.isLoggedIn()) {
                    window.Auth.requireLogin(function () {
                        const nowFollowing = toggleFollow(artistName, artistImg);
                        followBtn.classList.toggle('following', nowFollowing);
                        followBtn.innerHTML = nowFollowing ? '<i class="fas fa-check"></i> Following' : '<i class="fas fa-plus"></i> Follow';
                    }, 'follow artists');
                    return;
                }

                const nowFollowing = toggleFollow(artistName, artistImg);
                followBtn.classList.toggle('following', nowFollowing);
                followBtn.innerHTML = nowFollowing ? '<i class="fas fa-check"></i> Following' : '<i class="fas fa-plus"></i> Follow';

                if (window.BottomNav && window.BottomNav.showToast) {
                    window.BottomNav.showToast(nowFollowing ? 'Following ' + artistName : 'Unfollowed ' + artistName);
                }
                return;
            }
        });
    }

    /* ================================================================
       MUTATION OBSERVER
    ================================================================ */
    function setupMutationObserver() {
        const observer = new MutationObserver(function (mutations) {
            let shouldSync = false;
            mutations.forEach(function (m) {
                m.addedNodes.forEach(function (node) {
                    if (node.nodeType !== 1) return;
                    if (node.classList && node.classList.contains('song-like')) shouldSync = true;
                    if (node.querySelector && node.querySelector('.song-like')) shouldSync = true;
                });
            });
            if (shouldSync) requestAnimationFrame(() => syncAllHearts());
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    /* ================================================================
       INIT
    ================================================================ */
    function init() {
        modalOverlay = document.getElementById('playlist-modal');
        openModalBtn = document.getElementById('btn-open-playlist-modal');
        closeModalBtn = document.getElementById('btn-close-modal');
        cancelModalBtn = document.getElementById('btn-cancel-playlist');
        savePlaylistBtn = document.getElementById('btn-save-playlist');
        playlistNameInput = document.getElementById('playlist-name-input');
        playlistsGroup = document.getElementById('playlists-group');

        /* Remove hardcoded demo playlists */
        if (playlistsGroup) {
            playlistsGroup.querySelectorAll('.playlist-mini').forEach(el => el.remove());
        }
        const libContainer = document.querySelector('.library-tab-content[data-content="playlists"]');
        if (libContainer) {
            libContainer.querySelectorAll('.library-item').forEach(el => el.remove());
        }

        /* Global handlers */
        setupGlobalClickHandlers();
        setupMutationObserver();

        /* ❤️ Mini like button */
        setupMiniLikeButton();

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

        /* Save playlist */
        if (savePlaylistBtn) {
            savePlaylistBtn.addEventListener('click', function () {
                const val = playlistNameInput ? playlistNameInput.value : '';
                if (createPlaylist(val)) {
                    closeModal();
                    if (window.BottomNav && window.BottomNav.showToast) {
                        window.BottomNav.showToast('Created "' + val.trim() + '"');
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

        /* Library tabs re-render */
        document.querySelectorAll('.library-tab').forEach(function (tab) {
            tab.addEventListener('click', function () {
                if (tab.getAttribute('data-tab') === 'playlists') {
                    setTimeout(renderLibraryPagePlaylists, 100);
                }
            });
        });

        /* ============================================================
           FAST LOAD TRIGGERS
        ============================================================ */

        /* Trigger 1: On auth change (login/logout) */
        window.addEventListener('auth:changed', function () {
            if (!window.Auth || !window.Auth.isLoggedIn()) return;
            window._userDataLoaded = false;
            loadAllFromFirestore(true);
        });

        /* Trigger 2: On Firebase ready */
        window.addEventListener('firebase:ready', function () {
            tryLoadNow();
        });

        /* Trigger 3: One-shot RAF check loop */
        var checkAttempts = 0;
        var maxAttempts = 30;
        var checkLoop = function () {
            checkAttempts++;
            if (tryLoadNow() || checkAttempts >= maxAttempts) return false;
            return true;
        };

        if (window.Perf && window.Perf.rafAdd) {
            window.Perf.rafAdd(function () { return checkLoop(); });
        } else {
            var rafLoop = function () {
                if (checkLoop()) requestAnimationFrame(rafLoop);
            };
            requestAnimationFrame(rafLoop);
        }

        /* Trigger 4: On first user interaction */
        document.addEventListener('click', function once() {
            document.removeEventListener('click', once);
            tryLoadNow();
        }, { once: true });

        /* Trigger 5: On window focus */
        window.addEventListener('focus', function () {
            if (!window._userDataLoaded) tryLoadNow();
        });

        syncAllHearts();

        /* 🔴 Force mini like button sync */
        setTimeout(syncMiniLikeButton, 500);
        setTimeout(syncMiniLikeButton, 1500);
    }

    /* ================================================================
       PUBLIC API
    ================================================================ */
    return {
        init: init,
        isLiked: isLiked,
        toggleLike: toggleLike,
        getAllLikes: getAllLikes,
        syncAllHearts: syncAllHearts,
        renderLikedPage: renderLikedPage,
        isFollowing: isFollowing,
        toggleFollow: toggleFollow,
        getAllFollows: getAllFollows,
        renderFollowsPage: renderFollowsPage,
        syncFollowButton: syncFollowButton,
        getAllPlaylists: getAllPlaylists,
        getSongsInPlaylist: getSongsInPlaylist,
        createPlaylist: createPlaylist,
        addSongToPlaylist: addSongToPlaylist,
        playPlaylist: playPlaylist,
        openPlaylistDropdown: openPlaylistDropdown,
        closePlaylistDropdown: closePlaylistDropdown,
        renderSidebarPlaylists: renderSidebarPlaylists,
        renderLibraryPagePlaylists: renderLibraryPagePlaylists,
        loadAllFromFirestore: loadAllFromFirestore,
        syncMiniLikeButton: syncMiniLikeButton,
        clearAll: function () {
            likedIds = [];
            followed = [];
            customPlaylists = [];
            playlistSongs = {};
            window._userDataLoaded = false;
            syncAllHearts();
            renderSidebarPlaylists();
            renderLibraryPagePlaylists();
            syncMiniLikeButton();
        }
    };
})();

/* ==================================================================
   BACKWARD COMPATIBILITY
================================================================== */
window.Likes = {
    init: function () {},
    isLiked: function (id) { return window.UserData.isLiked(id); },
    toggle: function (id) { return window.UserData.toggleLike(id); },
    getAll: function () { return window.UserData.getAllLikes(); },
    clearAll: function () { window.UserData.clearAll(); },
    syncAllHearts: function (root) { window.UserData.syncAllHearts(root); },
    renderLikedPage: function () { window.UserData.renderLikedPage(); },
    getTrackId: getTrackId
};

window.Follows = {
    init: function () {},
    isFollowing: function (n) { return window.UserData.isFollowing(n); },
    follow: function (n, img) { if (!window.UserData.isFollowing(n)) window.UserData.toggleFollow(n, img); },
    unfollow: function (n) { if (window.UserData.isFollowing(n)) window.UserData.toggleFollow(n); },
    toggle: function (n, img) { return window.UserData.toggleFollow(n, img); },
    getAll: function () { return window.UserData.getAllFollows(); },
    clearAll: function () { window.UserData.clearAll(); },
    openPage: function () { window.UserData.renderFollowsPage(); if (window.Pages) window.Pages.navigate('followed'); },
    render: function () { window.UserData.renderFollowsPage(); },
    syncFollowButton: function (n, img) { window.UserData.syncFollowButton(n, img); }
};

window.Playlists = {
    init: function () {},
    addSongToPlaylist: function (p, t) { return window.UserData.addSongToPlaylist(p, t); },
    removeSongFromPlaylist: function () {},
    getSongsInPlaylist: function (p) { return window.UserData.getSongsInPlaylist(p); },
    getAllPlaylists: function () { return window.UserData.getAllPlaylists(); },
    playPlaylist: function (p) { window.UserData.playPlaylist(p); },
    openPlaylistDropdown: function () { window.UserData.openPlaylistDropdown(); },
    closePlaylistDropdown: function () { window.UserData.closePlaylistDropdown(); },
    renderPlaylistDropdown: function () {},
    createPlaylist: function (n) { return window.UserData.createPlaylist(n); }
};