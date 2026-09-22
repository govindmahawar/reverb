/* ==================================================================
   LIKES.JS — Universal like system (works EVERYWHERE in the app)
   - Any .song-like heart click anywhere → toggle + persist
   - Auto-detects track via data-track-id, data-track-index, or title/artist
   - Syncs hearts everywhere (home, recent, liked, artist, search, etc.)
   - Uses MutationObserver to auto-sync dynamically added hearts
   Exposes: window.Likes → { init, isLiked, toggle, getAll,
                             renderLikedPage, syncAllHearts, getTrackId }
================================================================== */

window.Likes = (function () {

    const STORAGE_KEY = 'reverb_liked_songs';

    /* ---------- Load / save ---------- */
    function load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const arr = JSON.parse(raw);
                return Array.isArray(arr) ? arr : [];
            }
        } catch (e) {}
        return [];
    }

    function save(ids) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
        } catch (e) {}
    }

    /* ---------- Public helpers ---------- */
    function isLiked(trackId) {
        if (trackId === undefined || trackId === null) return false;
        return load().includes(Number(trackId));
    }

    function toggle(trackId) {
        if (trackId === undefined || trackId === null) return false;
        const id = Number(trackId);
        const ids = load();
        const idx = ids.indexOf(id);

        if (idx === -1) {
            ids.unshift(id);
            save(ids);
            dispatchUpdate();
            return true;
        } else {
            ids.splice(idx, 1);
            save(ids);
            dispatchUpdate();
            return false;
        }
    }

    function getAll() {
        return load();
    }

    function dispatchUpdate() {
        try {
            window.dispatchEvent(new CustomEvent('likes:updated', { detail: load() }));
        } catch (e) {}
    }

    /* ----------------------------------------------------------------
       UNIVERSAL track ID resolver
       Strategy order:
         1. data-track-id attribute (most reliable)
         2. data-track-index → tracks[] lookup
         3. Match title + artist against tracks[]
    ---------------------------------------------------------------- */
    function getTrackId(el) {
        if (!el) return null;

        /* --- 1) data-track-id --- */
        const direct = el.getAttribute && el.getAttribute('data-track-id');
        if (direct !== null && direct !== undefined && direct !== '') {
            const n = Number(direct);
            if (!isNaN(n)) return n;
        }

        /* --- 2) data-track-index on closest row --- */
        const row = el.closest('.song-row, .music-card, .suggestion-item, .library-item, .followed-card');
        if (row) {
            const idxAttr = row.getAttribute('data-track-index');
            if (idxAttr !== null) {
                const idx = parseInt(idxAttr, 10);
                const tracks = window.tracks || [];
                if (!isNaN(idx) && tracks[idx]) {
                    return tracks[idx].id;
                }
            }

            /* data-track-id on row itself */
            const rowId = row.getAttribute('data-track-id');
            if (rowId !== null && rowId !== undefined && rowId !== '') {
                const n = Number(rowId);
                if (!isNaN(n)) return n;
            }

            /* --- 3) Match by title + artist --- */
            const titleEl = row.querySelector('.song-title, .card-title, .suggestion-title');
            if (titleEl) {
                const title = titleEl.textContent.trim().toLowerCase();
                /* Remove any <mark> tags effect by getting textContent */
                const artistEl = row.querySelector('.song-artist, .card-artist, .suggestion-artist');
                const artist = artistEl
                    ? artistEl.textContent.replace(/^\s*/, '').trim().toLowerCase()
                    : '';

                const tracks = window.tracks || [];
                let found = tracks.find(t =>
                    t.title.toLowerCase() === title &&
                    (!artist || t.artist.toLowerCase() === artist)
                );

                /* Fallback: match only by title */
                if (!found) {
                    found = tracks.find(t => t.title.toLowerCase() === title);
                }

                if (found) return found.id;
            }
        }

        return null;
    }

    /* ---------- Update single heart visual ---------- */
    function updateHeartVisual(heartEl, liked) {
        if (!heartEl) return;
        heartEl.classList.toggle('active', liked);
    }

    /* ---------- Sync every heart on the page ---------- */
    function syncAllHearts(root) {
        const scope = root || document;
        scope.querySelectorAll('.song-like').forEach(heart => {
            const id = getTrackId(heart);
            if (id === null) return;
            updateHeartVisual(heart, isLiked(id));
        });
    }

    /* ----------------------------------------------------------------
       Render Liked Songs page (from localStorage)
    ---------------------------------------------------------------- */
    function renderLikedPage() {
        const list = document.getElementById('liked-list');
        const empty = document.getElementById('liked-empty');
        const countText = document.getElementById('liked-count-text');
        if (!list) return;

        const likedIds = load();
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
        if (countText) {
            countText.textContent = `${likedTracks.length} song${likedTracks.length > 1 ? 's' : ''}`;
        }

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

        /* Wire click on rows → play */
        list.querySelectorAll('.song-row').forEach(row => {
            row.addEventListener('click', (e) => {
                if (e.target.classList.contains('song-like')) return;
                const idx = parseInt(row.getAttribute('data-track-index'), 10);
                if (!isNaN(idx) && window.Player) {
                    window.Player.loadTrack(idx, true);
                }
            });
        });

        /* Wire likes inside this list — remove row on unlike */
        list.querySelectorAll('.song-like').forEach(heart => {
            heart.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const id = Number(heart.getAttribute('data-track-id'));
                if (isNaN(id)) return;
                toggle(id);
                /* Re-render since row should disappear */
                setTimeout(renderLikedPage, 60);

                if (window.BottomNav && window.BottomNav.showToast) {
                    const t = tracks.find(tr => tr.id === id);
                    window.BottomNav.showToast(t ? `Removed ${t.title}` : 'Removed');
                }
            });
        });

        /* Sync hearts once more */
        syncAllHearts(list);
    }

    /* ----------------------------------------------------------------
       INIT
    ---------------------------------------------------------------- */
    function init() {

        /* ---- GLOBAL click delegation for ANY .song-like ---- */
               document.addEventListener('click', (e) => {
            const heart = e.target.closest('.song-like');
            if (!heart) return;

            e.preventDefault();
            e.stopPropagation();

            if (heart.closest('#liked-list')) return;

            const trackId = getTrackId(heart);
            if (trackId === null) return;

            /* 🔐 Login required for liking */
            if (window.Auth && !window.Auth.isLoggedIn()) {
                window.Auth.requireLogin(() => {
                    /* After login, do the like */
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

        /* Sync hearts on load */
        syncAllHearts();

        /* Re-sync whenever likes change */
        window.addEventListener('likes:updated', () => {
            syncAllHearts();
        });

        /* ----------------------------------------------------------------
           MutationObserver — watch for dynamically added hearts
           (Recently Played, Liked, Search, Artist Profile renders, etc.)
        ---------------------------------------------------------------- */
        const observer = new MutationObserver((mutations) => {
            let shouldSync = false;
            mutations.forEach(m => {
                m.addedNodes.forEach(node => {
                    if (node.nodeType !== 1) return;
                    if (node.classList && node.classList.contains('song-like')) {
                        shouldSync = true;
                    }
                    if (node.querySelector && node.querySelector('.song-like')) {
                        shouldSync = true;
                    }
                });
            });
            if (shouldSync) {
                /* Defer to next frame so DOM settles */
                requestAnimationFrame(() => syncAllHearts());
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        console.log('[Likes] Module loaded. Liked songs:', load().length);
    }

    return {
        init,
        isLiked,
        toggle,
        getAll,
        syncAllHearts,
        renderLikedPage,
        getTrackId
    };
})();