/* ==================================================================
   MAIN.JS — Entry point
   Order matters:
     1. Auth FIRST (so other modules can check login)
     2. Core modules (Player, Sidebar, etc.)
     3. User features (Profile, Settings, Accounts, Follows)
     4. Admin (uses Auth.isOwnerEmail)
     5. Cards, Pages, BottomNav
================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    /* 1. AUTH FIRST */
    if (window.Auth) window.Auth.init();
    if (window.Firestore) window.Firestore.init();

    /* 2. Core */
    if (window.Player) window.Player.init();
    if (window.Sidebar) window.Sidebar.init();
    if (window.Search) window.Search.init();
    if (window.Likes) window.Likes.init();
    if (window.Playlists) window.Playlists.init();

    /* 3. User features */
    if (window.ProfileEdit) window.ProfileEdit.init();
    if (window.Settings) window.Settings.init();
    if (window.Accounts) window.Accounts.init();
    if (window.Follows) window.Follows.init();

    /* 4. Profile dropdown (after Auth) */
    if (window.Profile) window.Profile.init();

    /* 5. Admin (uses Auth) */
    if (window.Admin) window.Admin.init();

    /* 6. Rest */
    if (window.Cards) window.Cards.init();
    if (window.Navigation) window.Navigation.init();
    if (window.Pages) window.Pages.init();
    if (window.NowPlaying) window.NowPlaying.init();
    if (window.Albums) window.Albums.init();
    if (window.BottomNav) window.BottomNav.init();

    /* 7. Preload first track */
    if (window.Player && window.tracks && window.tracks.length) {
        window.Player.loadTrack(0, false);
    }

    console.log('[Main] All modules initialized.');
});