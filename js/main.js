document.addEventListener('DOMContentLoaded', () => {
    /* Core */
    if (window.Player) window.Player.init();
    if (window.Sidebar) window.Sidebar.init();
    if (window.Search) window.Search.init();
    if (window.Likes) window.Likes.init();         /* ✅ Likes BEFORE Pages */
    if (window.Playlists) window.Playlists.init();

    /* User features */
    if (window.ProfileEdit) window.ProfileEdit.init();
    if (window.Settings) window.Settings.init();
    if (window.Accounts) window.Accounts.init();
    if (window.Follows) window.Follows.init();

    /* Profile dropdown */
    if (window.Profile) window.Profile.init();

    /* Rest */
    if (window.Cards) window.Cards.init();
    if (window.Navigation) window.Navigation.init();
    if (window.Pages) window.Pages.init();
    if (window.BottomNav) window.BottomNav.init();

    /* Preload */
    if (window.Player && window.tracks && window.tracks.length) {
        window.Player.loadTrack(0, false);
    }

    console.log('[Main] All modules initialized.');
});