/* ==================================================================
   MAIN.JS — Entry point
   Order matters:
     0. Performance (perf.js)
     1. Auth FIRST
     2. Core modules (Player, Sidebar, Search)
     3. UserData (likes + follows + playlists)
     4. Swipe gestures (mobile)
     5. User features (ProfileEdit, Settings, Accounts)
     6. Profile dropdown
     7. Admin panel
     8. Cards, Navigation, Pages, NowPlaying, Albums, BottomNav
     9. Preload first track
================================================================== */

document.addEventListener('DOMContentLoaded', function () {



    /* ------------------------------------------------------------
       1. AUTH
    ------------------------------------------------------------ */
    if (window.Auth) {
        try { window.Auth.init(); } catch (e) { console.error('[Main] Auth init error:', e); }
    }

    /* ------------------------------------------------------------
       2. CORE MODULES
    ------------------------------------------------------------ */
    if (window.Player) {
        try { window.Player.init(); } catch (e) { console.error('[Main] Player init error:', e); }
    }
    if (window.Sidebar) {
        try { window.Sidebar.init(); } catch (e) { console.error('[Main] Sidebar init error:', e); }
    }
    if (window.Search) {
        try { window.Search.init(); } catch (e) { console.error('[Main] Search init error:', e); }
    }

    /* ------------------------------------------------------------
       3. USERDATA — Likes + Follows + Playlists
    ------------------------------------------------------------ */
    if (window.UserData) {
        try { window.UserData.init(); } catch (e) { console.error('[Main] UserData init error:', e); }
    }

    /* ------------------------------------------------------------
       4. SWIPE GESTURES (mobile only)
    ------------------------------------------------------------ */
    if (window.Swipe) {
        try { window.Swipe.init(); } catch (e) { console.error('[Main] Swipe init error:', e); }
    }

    /* ------------------------------------------------------------
       5. USER FEATURES
    ------------------------------------------------------------ */
    if (window.ProfileEdit) {
        try { window.ProfileEdit.init(); } catch (e) { console.error('[Main] ProfileEdit init error:', e); }
    }
    if (window.Settings) {
        try { window.Settings.init(); } catch (e) { console.error('[Main] Settings init error:', e); }
    }
    if (window.Accounts) {
        try { window.Accounts.init(); } catch (e) { console.error('[Main] Accounts init error:', e); }
    }

    /* ------------------------------------------------------------
       6. PROFILE DROPDOWN
    ------------------------------------------------------------ */
    if (window.Profile) {
        try { window.Profile.init(); } catch (e) { console.error('[Main] Profile init error:', e); }
    }

    /* ------------------------------------------------------------
       7. ADMIN (needs Auth)
    ------------------------------------------------------------ */
    if (window.Admin) {
        try { window.Admin.init(); } catch (e) { console.error('[Main] Admin init error:', e); }
    }

    /* ------------------------------------------------------------
       8. REST
    ------------------------------------------------------------ */
    if (window.Cards) {
        try { window.Cards.init(); } catch (e) { console.error('[Main] Cards init error:', e); }
    }
    if (window.Navigation) {
        try { window.Navigation.init(); } catch (e) { console.error('[Main] Navigation init error:', e); }
    }
    if (window.Pages) {
        try { window.Pages.init(); } catch (e) { console.error('[Main] Pages init error:', e); }
    }
    if (window.NowPlaying) {
        try { window.NowPlaying.init(); } catch (e) { console.error('[Main] NowPlaying init error:', e); }
    }
    if (window.Albums) {
        try { window.Albums.init(); } catch (e) { console.error('[Main] Albums init error:', e); }
    }
    if (window.BottomNav) {
        try { window.BottomNav.init(); } catch (e) { console.error('[Main] BottomNav init error:', e); }
    }

    /* ------------------------------------------------------------
       9. PRELOAD FIRST TRACK (no autoplay)
    ------------------------------------------------------------ */
    if (window.Player && window.tracks && window.tracks.length) {
        try { window.Player.loadTrack(0, false); } catch (e) {}
    }

      /* Final log */
    if (window.__originalConsoleLog) {
        window.__originalConsoleLog('%c✅ [Main] All modules initialized', 'color:#4ade80;font-weight:bold;font-size:13px');
    }

    /* 🔴 Perf LAST — after everything loaded */
    setTimeout(function () {
        if (window.Perf) {
            try { window.Perf.init(); } catch (e) {}
        }
    }, 500);
});
