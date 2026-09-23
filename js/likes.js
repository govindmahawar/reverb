/* ==================================================================
   LIKES.JS — Like system (Firestore synced)
   Exposes: window.Likes
================================================================== */

window.Likes = (function () {

    /* In-memory store */
    let likedIds = [];

    /* ============================================================
       PUBLIC HELPERS
    ============================================================ */
    function isLiked(trackId) {
        if (trackId === undefined || trackId === null) return false;
        return likedIds.includes(Number(trackId));
    }

    function toggle(trackId) {
        if (trackId === undefined || trackId === null) return false;
        const id = Number(trackId);
        const idx = likedIds.indexOf(id);

        if (idx === -1) {
            likedIds.unshift(id);
        } else {
            likedIds.splice(idx, 1);
        }

        /* Sync to Firestore — with safety check */
        if (window.Firestore && window.Firestore.isReady()) {
            /* Don't sync if data hasn't loaded yet (prevents wipe) */
            if (!window._likesLoaded && likedIds.length === 1) {
                console.warn('[Likes] ⚠️ Data not loaded — but user is explicitly liking, so saving');
            }
            window.Firestore.saveLikes(likedIds);
        }

        dispatchUpdate();
        return idx === -1;
    }

    function getAll() {
        return likedIds.slice();
    }

    function setAll(ids) {
        likedIds = (ids || []).map(Number);
        dispatchUpdate();
    }

    function clearAll() {
        likedIds = [];
        dispatchUpdate();
    }

    function dispatchUpdate() {
        try {
            window.dispatchEvent(new CustomEvent('likes:updated', { detail: likedIds.slice() }));
        } catch (e) {}
    }

    /* ============================================================
       TRACK ID RESOLVER (works everywhere)
    ============================================================ */
    function getTrackId(el) {
        if (!el) return null;

        const direct = el.getAttribute && el.getAttribute('data-track-id');
        if (direct !== null && direct !== undefined && direct !== '') {
            const n = Number(direct);
            if (!isNaN(n)) return n;
        }

        const row = el.closest('.song-row, .music-card, .suggestion-item, .library-item, .followed-card');
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
                const artistEl = row.querySelector('.song-artist, .card-artist, .suggestion-artist');
                const artist = artistEl ? artistEl.textContent.replace(/^\s*/, '').trim().toLowerCase() : '';
                const tracks = window.tracks || [];
                let found = tracks.find(t =>
                    t.title.toLowerCase() === title && (!artist || t.artist.toLowerCase() === artist)
                );
                if (!found) found = tracks.find(t => t.title.toLowerCase() === title);
                if (found) return found.id;
            }
        }
        return null;
    }

    function updateHeartVisual(heartEl, liked) {
        if (!heartEl) return;
        heartEl.classList.toggle('active', liked);
    }

    function syncAllHearts(root) {
        const scope = root || document;
        scope.querySelectorAll('.song-like').forEach(heart => {
            const id = getTrackId(heart);
            if (id === null) return;
            updateHeartVisual(heart, isLiked(id));
        });
    }

    /* ============================================================
       RENDER LIKED PAGE
    ============================================================ */
    function renderLikedPage() {
        const list = document.getElementById('liked-list');
        const empty = document.getElementById('liked-empty');
        const countText = document.getElementById('liked-count-text');
        if (!list) return;

        const tracks = window.tracks || [];
        const likedTracks = likedIds
            .map(id => {
                const track = tracks.find(t => t.id === id);
                if (!track) return null;
                return { track, trackIndex: tracks.indexOf(track) };
            })
            .filter(Boolean);

        list.innerHTML = '';

        if (!likedTracks.length) {
            if (empty) empty.style.display = 'flex';
            if (countText) countText.textContent = '0 songs';
            return;
        }

        if (empty) empty.style.display = 'none';
        if (countText) countText.textContent = `${likedTracks.length} song${likedTracks.length > 1 ? 's' : ''}`;

        likedTracks.forEach(({ track, trackIndex }) => {
            const row = document.createElement('div');
            row.className = 'song-row';
            row.setAttribute('data-track-index', trackIndex);
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
                <i class="fas fa-heart song-like active" data-track-id="${track.id}"></i>
            `;
            list.appendChild(row);
        });

        list.querySelectorAll('.song-row').forEach(row => {
            row.addEventListener('click', (e) => {
                if (e.target.classList.contains('song-like')) return;
                const idx = parseInt(row.getAttribute('data-track-index'), 10);
                if (!isNaN(idx) && window.Player) window.Player.loadTrack(idx, true);
            });
        });

        list.querySelectorAll('.song-like').forEach(heart => {
            heart.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const id = Number(heart.getAttribute('data-track-id'));
                if (isNaN(id)) return;
                toggle(id);
                setTimeout(renderLikedPage, 60);
                if (window.BottomNav && window.BottomNav.showToast) {
                    const t = tracks.find(tr => tr.id === id);
                    window.BottomNav.showToast(t ? `Removed ${t.title}` : 'Removed');
                }
            });
        });

        syncAllHearts(list);
    }

    /* ============================================================
       INIT
    ============================================================ */
    function init() {
        document.addEventListener('click', (e) => {
            const heart = e.target.closest('.song-like');
            if (!heart) return;

            e.preventDefault();
            e.stopPropagation();

            if (heart.closest('#liked-list')) return;

            const trackId = getTrackId(heart);
            if (trackId === null) return;

            /* Login required */
            if (window.Auth && !window.Auth.isLoggedIn()) {
                window.Auth.requireLogin(() => {
                    const nowLiked = toggle(trackId);
                    updateHeartVisual(heart, nowLiked);
                    if (window.BottomNav && window.BottomNav.showToast) {
                        const tracks = window.tracks || [];
                        const t = tracks.find(tr => tr.id === trackId);
                        window.BottomNav.showToast(nowLiked ? `Liked ${t?.title || 'Song'} ❤️` : 'Removed');
                    }
                }, 'like songs');
                return;
            }

            const nowLiked = toggle(trackId);
            updateHeartVisual(heart, nowLiked);

            if (window.BottomNav && window.BottomNav.showToast) {
                const tracks = window.tracks || [];
                const t = tracks.find(tr => tr.id === trackId);
                const label = t ? t.title : 'Song';
                window.BottomNav.showToast(nowLiked ? `Liked ${label} ❤️` : `Removed ${label}`);
            }
        });

        syncAllHearts();
        window.addEventListener('likes:updated', () => syncAllHearts());

        /* Watch dynamic hearts */
        const observer = new MutationObserver((mutations) => {
            let shouldSync = false;
            mutations.forEach(m => {
                m.addedNodes.forEach(node => {
                    if (node.nodeType !== 1) return;
                    if (node.classList && node.classList.contains('song-like')) shouldSync = true;
                    if (node.querySelector && node.querySelector('.song-like')) shouldSync = true;
                });
            });
            if (shouldSync) requestAnimationFrame(() => syncAllHearts());
        });
        observer.observe(document.body, { childList: true, subtree: true });

        /* 🔴 LOAD FROM FIRESTORE on login */
        window.addEventListener('auth:changed', function () {
            if (!window.Auth || !window.Auth.isLoggedIn()) return;
            if (!window.Firestore || !window.Firestore.isReady()) return;
            loadFromFirestore();
        });

        /* 🔴 ALSO LOAD ON PAGE LOAD */
        window.addEventListener('firebase:ready', function () {
            setTimeout(function () {
                if (window.Auth && window.Auth.isLoggedIn()) {
                    loadFromFirestore();
                }
            }, 1000);
        });

        /* Fallback polling */
        var loadCheckInterval = setInterval(function () {
            if (window.Auth && window.Auth.isLoggedIn() && window.Firestore && window.Firestore.isReady()) {
                clearInterval(loadCheckInterval);
                if (!window._likesLoaded) {
                    loadFromFirestore();
                }
            }
        }, 500);

        setTimeout(function () {
            clearInterval(loadCheckInterval);
        }, 15000);

        console.log('[Likes] Module loaded (Firestore synced)');
    }

    function loadFromFirestore() {
        if (window._likesLoaded) return;
        window._likesLoaded = true;

        console.log('[Likes] Loading from Firestore...');
        window.Firestore.loadLikes().then(function (ids) {
            if (ids && Array.isArray(ids)) {
                likedIds = ids.map(Number);
                syncAllHearts();
                if (document.body.classList.contains('page-liked')) renderLikedPage();
                console.log('[Likes] ✅ Loaded:', ids.length, 'songs');
            }
        }).catch(function (err) {
            console.error('[Likes] Load error:', err);
            window._likesLoaded = false;
        });
    }

    return {
        init,
        isLiked,
        toggle,
        getAll,
        setAll,
        clearAll,
        syncAllHearts,
        renderLikedPage,
        getTrackId
    };
})();