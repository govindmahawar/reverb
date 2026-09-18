/* ==================================================================
   CARDS.JS — Music card / song row / hero play button → load track
   Exposes: window.Cards
================================================================== */

window.Cards = (function () {
    function init() {
        const tracks = window.tracks || [];

        /* Song rows */
        document.querySelectorAll('.song-row').forEach((row, idx) => {
            row.addEventListener('click', (e) => {
                if (e.target.classList.contains('song-like')) return;
                window.Player.loadTrack(idx % tracks.length, true);
            });
        });

        /* Music cards */
        document.querySelectorAll('.music-card').forEach((card, idx) => {
            card.addEventListener('click', () => {
                window.Player.loadTrack(idx % tracks.length, true);
            });
        });

        /* Hero play button */
        const heroPlayBtn = document.getElementById('hero-play-btn');
        if (heroPlayBtn) {
            heroPlayBtn.addEventListener('click', () => {
                window.Player.loadTrack(0, true);
            });
        }
    }

    return { init };
})();
