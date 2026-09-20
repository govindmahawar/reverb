/* ==================================================================
   MAIN.JS — Entry point
   Order matters: User feature modules MUST init BEFORE Profile,
   so the dropdown actions can call their APIs.
================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    /* Core */
    if (window.Player) window.Player.init();
    if (window.Sidebar) window.Sidebar.init();
    if (window.Search) window.Search.init();
    if (window.Likes) window.Likes.init();
    if (window.Playlists) window.Playlists.init();

    /* User features FIRST */
    if (window.ProfileEdit) window.ProfileEdit.init();
    if (window.Settings) window.Settings.init();
    if (window.Accounts) window.Accounts.init();
    if (window.Follows) window.Follows.init();

    /* Profile dropdown — can now use above modules */
    if (window.Profile) window.Profile.init();

    /* UI/UX enhancements */
    if (window.NowPlaying) window.NowPlaying.init();
    if (window.Albums) window.Albums.init();

    /* Rest */
    if (window.Cards) window.Cards.init();
    if (window.Navigation) window.Navigation.init();
    if (window.Pages) window.Pages.init();
    if (window.BottomNav) window.BottomNav.init();

    /* Preload first track metadata (no autoplay) */
    if (window.Player && window.tracks && window.tracks.length) {
        window.Player.loadTrack(0, false);
    }

    console.log('[Main] All modules initialized.');
});