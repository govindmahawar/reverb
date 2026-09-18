/* ==================================================================
   LIKES.JS — Heart toggle on songs (event delegation)
   Exposes: window.Likes
================================================================== */

window.Likes = (function () {
    function init() {
        /* Event delegation so it also works for dynamically added items */
        document.addEventListener('click', (e) => {
            const target = e.target;
            if (target.classList && target.classList.contains('song-like')) {
                e.stopPropagation();
                target.classList.toggle('active');
            }
        });
    }

    return { init };
})();