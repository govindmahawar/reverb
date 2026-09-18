/* ==================================================================
   MAIN.JS — Entry point. Initializes all modules in correct order.
================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    /* 1. Player first */
    if (window.Player) window.Player.init();

    /* 2. Sidebar */
    if (window.Sidebar) window.Sidebar.init();

    /* 3. Live search */
    if (window.Search) window.Search.init();

    /* 4. Heart like toggles */
    if (window.Likes) window.Likes.init();

    /* 5. Create playlist modal */
    if (window.Playlists) window.Playlists.init();

    /* 6. Profile dropdown  👈 NAYA */
    if (window.Profile) window.Profile.init();

    /* 7. Clickable cards / song rows */
    if (window.Cards) window.Cards.init();

    /* 8. Sidebar nav buttons */
    if (window.Navigation) window.Navigation.init();

    /* 9. Preload first track metadata (no autoplay) */
    if (window.Player && window.tracks && window.tracks.length) {
        window.Player.loadTrack(0, false);
    }
});