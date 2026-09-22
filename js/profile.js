/* ==================================================================
   PROFILE.JS — Profile dropdown (mobile-aware positioning)
   Exposes: window.Profile
================================================================== */

window.Profile = (function () {
    let avatarWrapper, avatarBtn, dropdown, logoutBtn;

    function toggleDropdown(e) {
        if (e) e.stopPropagation();
        if (!dropdown) return;
        dropdown.classList.toggle('open');
    }

    function openDropdown() {
        /* Refresh user info from Auth before opening */
        if (window.Auth && window.Auth.updateProfileUI) {
            window.Auth.updateProfileUI();
        }
        if (dropdown) dropdown.classList.add('open');
    }

    function closeDropdown() {
        if (dropdown) dropdown.classList.remove('open');
    }

    function handleMenuClick(action) {
        console.log('[Profile] Menu action:', action);

        closeDropdown();

        switch (action) {
            case 'add-account':
                if (window.Accounts) window.Accounts.open();
                break;

            case 'edit-profile':
                if (window.Auth && !window.Auth.isLoggedIn()) {
                    window.Auth.requireLogin(() => {
                        if (window.ProfileEdit) window.ProfileEdit.openPage();
                    }, 'edit your profile');
                    break;
                }
                if (window.ProfileEdit) window.ProfileEdit.openPage();
                break;

            case 'following':
                if (window.Auth && !window.Auth.isLoggedIn()) {
                    window.Auth.requireLogin(() => {
                        if (window.Follows) window.Follows.openPage();
                    }, 'see your following');
                    break;
                }
                if (window.Follows) window.Follows.openPage();
                break;

            case 'recent':
                if (window.Pages) window.Pages.navigate('recent');
                break;

            case 'updates':
                if (window.BottomNav && window.BottomNav.showToast) {
                    window.BottomNav.showToast('3 new updates ✨');
                }
                break;

            case 'settings':
                if (window.Settings) window.Settings.openPage();
                break;

            default:
                console.warn('[Profile] Unknown action:', action);
        }
    }

    /* ================================================================
       LOGOUT HANDLER
    ================================================================ */
    function handleLogout(e) {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }

        closeDropdown();

        console.log('[Profile] Logout clicked. Logged in:', window.Auth?.isLoggedIn());

        if (window.Auth) {
            if (window.Auth.isLoggedIn()) {
                /* Real logout → guest mode */
                window.Auth.logout();
            } else {
                /* Already guest → open login modal */
                window.Auth.openModal('login');
            }
        } else {
            console.warn('[Profile] Auth module missing');
        }
    }

    function init() {
        avatarWrapper = document.getElementById('avatar-wrapper');
        avatarBtn = document.getElementById('avatar-btn');
        dropdown = document.getElementById('profile-dropdown');
        logoutBtn = document.getElementById('profile-logout-btn');

        if (!avatarWrapper || !avatarBtn || !dropdown) return;

        avatarBtn.addEventListener('click', toggleDropdown);
        dropdown.addEventListener('click', (e) => e.stopPropagation());

        /* Menu items */
        dropdown.querySelectorAll('.profile-menu-item').forEach(item => {
            item.addEventListener('click', () => {
                const action = item.getAttribute('data-action');
                handleMenuClick(action);
            });
        });

        /* Logout button */
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }

        /* Profile header click → open login if guest */
        const profileHeader = dropdown.querySelector('.profile-header');
        if (profileHeader) {
            profileHeader.style.cursor = 'pointer';
            profileHeader.addEventListener('click', () => {
                if (window.Auth && !window.Auth.isLoggedIn()) {
                    closeDropdown();
                    window.Auth.openModal('login');
                }
            });
        }

        /* Outside click */
        document.addEventListener('click', (e) => {
            if (!avatarWrapper.contains(e.target)) closeDropdown();
        });

        /* Escape */
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeDropdown();
        });

        /* 🔴 Force profile UI to match Auth state on init */
        if (window.Auth && window.Auth.updateProfileUI) {
            window.Auth.updateProfileUI();
        }
    }

    return { init, open: openDropdown, close: closeDropdown, toggle: toggleDropdown };
})();