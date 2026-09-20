/* ==================================================================
   ALBUMS.JS — Album detail page + album card click handling
   Exposes: window.Albums
================================================================== */

window.Albums = (function () {

    let currentAlbumName = null;
    let previousPage = 'home';

    /* ---------- Get all tracks in an album ---------- */
    function getTracksByAlbum(albumName) {
        const tracks = window.tracks || [];
        const normalized = albumName.toLowerCase().trim();
        return tracks
            .map((t, i) => ({ ...t, _index: i }))
            .filter(t => (t.album || '').toLowerCase().trim() === normalized);
    }

    /* ---------- Open album detail page ---------- */
    function openAlbumPage(albumName, options = {}) {
        console.log('[Albums] Opening album:', albumName);

        const tracks = getTracksByAlbum(albumName);

        const artImg = document.getElementById('album-art-img');
        const nameEl = document.getElementById('album-name');
        const artistEl = document.getElementById('album-artist');
        const countEl = document.getElementById('album-song-count');
        const listEl = document.getElementById('album-songs-list');
        const emptyEl = document.getElementById('album-empty');

        /* Name */
        if (nameEl) nameEl.textContent = albumName;

        /* Artist — from first track */
        const artistName = tracks[0]?.artist || options.artist || 'Various Artists';
        if (artistEl) artistEl.textContent = artistName;

        /* Count */
        if (countEl) {
            countEl.textContent = tracks.length
                ? `${tracks.length} song${tracks.length > 1 ? 's' : ''}`
                : 'No songs';
        }

        /* Art — from first track, or fallback */
        if (artImg) {
            artImg.src = tracks[0]?.art || options.fallbackImage || '';
            artImg.alt = albumName;
        }

        /* Reset save button state */
        const saveBtn = document.getElementById('album-save-btn');
        if (saveBtn) {
            saveBtn.classList.remove('following');
            saveBtn.innerHTML = '<i class="fas fa-plus"></i> Save';
        }

        /* Render songs */
        if (listEl) {
            listEl.innerHTML = '';

            if (!tracks.length) {
                if (emptyEl) emptyEl.style.display = 'flex';
            } else {
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

                /* Wire click → play */
                listEl.querySelectorAll('.song-row').forEach(row => {
                    row.addEventListener('click', (e) => {
                        if (e.target.classList.contains('song-like')) return;
                        const idx = parseInt(row.getAttribute('data-track-index'), 10);
                        if (!isNaN(idx) && window.Player) {
                            window.Player.loadTrack(idx, true);
                        }
                    });
                });

                /* Sync hearts */
                if (window.Likes && window.Likes.syncAllHearts) {
                    window.Likes.syncAllHearts(listEl);
                }
            }
        }

        currentAlbumName = albumName;
        previousPage = options.from || 'home';

        /* Switch page via Pages */
        if (window.Pages) {
            window.Pages.navigate('album');
        }
    }

    /* ---------- Play all / shuffle ---------- */
    function playAll() {
        const tracks = getTracksByAlbum(currentAlbumName);
        if (!tracks.length || !window.Player) return;
        window.Player.loadTrack(tracks[0]._index, true);
    }

    function shuffle() {
        const tracks = getTracksByAlbum(currentAlbumName);
        if (!tracks.length || !window.Player) return;
        const random = tracks[Math.floor(Math.random() * tracks.length)];
        window.Player.loadTrack(random._index, true);
    }

    /* ---------- Find album name from a music card ---------- */
    /* Cards use the track title as the visible text — but the underlying
       "album" is inferred from a matching track. */
    function findAlbumFromCard(card) {
        const title = card.querySelector('.card-title')?.textContent?.trim();
        if (!title) return null;
        const tracks = window.tracks || [];
        /* Find a track whose title matches */
        const track = tracks.find(t => t.title.toLowerCase() === title.toLowerCase());
        if (track) return track.album;
        /* If not found, treat the card title itself as the album name */
        return title;
    }

    /* ---------- Init ---------- */
    function init() {
        /* Album card clicks — cards inside "for late hours" / "made for you" */
        document.querySelectorAll('.music-card').forEach(card => {
            if (card._albumBound) return;
            card._albumBound = true;
            /* Only treat cards as albums if they're in the "made for you"
               section OR they have a data-album attribute. Otherwise we
               keep them as play buttons (handled by cards.js).
               For now, we don't override — user can click play button. */
        });

        /* Back button */
        const backBtn = document.getElementById('album-back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                if (window.Pages) window.Pages.navigate(previousPage || 'home');
            });
        }

        /* Play all */
        const playAllBtn = document.getElementById('album-play-all-btn');
        if (playAllBtn) playAllBtn.addEventListener('click', playAll);

        /* Shuffle */
        const shuffleBtn = document.getElementById('album-shuffle-btn');
        if (shuffleBtn) {
            shuffleBtn.addEventListener('click', () => {
                shuffleBtn.classList.toggle('active');
                shuffle();
            });
        }

        /* Save button */
        const saveBtn = document.getElementById('album-save-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                const saved = saveBtn.classList.toggle('following');
                saveBtn.innerHTML = saved
                    ? '<i class="fas fa-check"></i> Saved'
                    : '<i class="fas fa-plus"></i> Save';
                if (window.BottomNav && window.BottomNav.showToast) {
                    window.BottomNav.showToast(saved ? `Saved ${currentAlbumName}` : `Removed ${currentAlbumName}`);
                }
            });
        }

        console.log('[Albums] Module loaded.');
    }

    return {
        init,
        openAlbumPage,
        getTracksByAlbum,
        playAll,
        shuffle
    };
})();