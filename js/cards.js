/* ==================================================================
   CARDS.JS — Music card / song row / hero play button → load track
   STRICT: .artist-card is EXPLICITLY EXCLUDED.
   Exposes: window.Cards
================================================================== */

window.Cards = (function () {
    function init() {
        const tracks = window.tracks || [];

        /* ---- Auto-attach data-track-id to static home song rows ---- */
        document.querySelectorAll('.song-list .song-row').forEach((row, idx) => {
            const track = tracks[idx % tracks.length];
            if (track) {
                if (!row.getAttribute('data-track-index')) {
                    row.setAttribute('data-track-index', idx);
                }
                if (!row.getAttribute('data-track-id')) {
                    row.setAttribute('data-track-id', track.id);
                }
                const heart = row.querySelector('.song-like');
                if (heart && !heart.getAttribute('data-track-id')) {
                    heart.setAttribute('data-track-id', track.id);
                }
            }

            row.addEventListener('click', (e) => {
                if (e.target.classList.contains('song-like')) return;
                window.Player.loadTrack(idx % tracks.length, true);
            });
        });

        /* ---- Home page music cards ONLY (NOT artist cards) ---- */
        document.querySelectorAll('.music-grid .music-card').forEach((card, idx) => {
            card.addEventListener('click', () => {
                window.Player.loadTrack(idx % tracks.length, true);
            });
        });

        /* ---- Hero play button ---- */
        const heroPlayBtn = document.getElementById('hero-play-btn');
        if (heroPlayBtn) {
            heroPlayBtn.addEventListener('click', () => {
                window.Player.loadTrack(0, true);
            });
        }

        console.log('[Cards] Loaded. Artist cards handled by Pages module.');
    }

    return { init };
})();