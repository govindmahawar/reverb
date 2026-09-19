/* ==================================================================
   MAIN.JS — Entry point. Initializes all modules in correct order.
================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    if (window.Player) window.Player.init();
    if (window.Sidebar) window.Sidebar.init();
    if (window.Search) window.Search.init();
    if (window.Likes) window.Likes.init();
    if (window.Playlists) window.Playlists.init();
    if (window.Profile) window.Profile.init();
    if (window.Cards) window.Cards.init();
    if (window.Navigation) window.Navigation.init();
    if (window.BottomNav) window.BottomNav.init();  /* 🆕 */

    if (window.Player && window.tracks && window.tracks.length) {
        window.Player.loadTrack(0, false);
    }
});