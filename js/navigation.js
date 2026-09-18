/* ==================================================================
   NAVIGATION.JS — Nav button active state + Liked Songs / Home filter
   Exposes: window.Navigation
================================================================== */

window.Navigation = (function () {
    function init() {
        const navBtns = document.querySelectorAll('.nav-btn');
        if (!navBtns.length) return;

        navBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                navBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const title = btn.getAttribute('data-title');

                if (title === 'Liked Songs') {
                    /* Show only liked rows */
                    document.querySelectorAll('.song-row').forEach(r => {
                        const isLiked = r.querySelector('.song-like')?.classList.contains('active');
                        r.style.display = isLiked ? 'flex' : 'none';
                    });
                    /* Hide all music cards while in liked view */
                    document.querySelectorAll('.music-card').forEach(c => c.style.display = 'none');

                } else if (title === 'Home') {
                    /* Reset everything */
                    document.querySelectorAll('.song-row').forEach(r => r.style.display = 'flex');
                    document.querySelectorAll('.music-card').forEach(c => c.style.display = 'block');
                    if (window.Search) window.Search.clear();
                }
            });
        });
    }

    return { init };
})();