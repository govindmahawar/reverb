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
        if (dropdown) dropdown.classList.add('open');
    }

    function closeDropdown() {
        if (dropdown) dropdown.classList.remove('open');
    }

    function handleMenuClick(action) {
        switch (action) {
            case 'add-account':
                console.log('[Profile] → Add Account clicked');
                break;
            case 'recent':
                console.log('[Profile] → Recent clicked');
                break;
            case 'updates':
                console.log('[Profile] → Your Updates clicked');
                break;
            case 'settings':
                console.log('[Profile] → Settings & Privacy clicked');
                break;
        }
        closeDropdown();
    }

    function init() {
        avatarWrapper = document.getElementById('avatar-wrapper');
        avatarBtn = document.getElementById('avatar-btn');
        dropdown = document.getElementById('profile-dropdown');
        logoutBtn = document.getElementById('profile-logout-btn');

        if (!avatarWrapper || !avatarBtn || !dropdown) return;

        avatarBtn.addEventListener('click', toggleDropdown);
        dropdown.addEventListener('click', (e) => e.stopPropagation());

        dropdown.querySelectorAll('.profile-menu-item').forEach(item => {
            item.addEventListener('click', () => {
                const action = item.getAttribute('data-action');
                handleMenuClick(action);
            });
        });

        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('[Profile] → Log out clicked');
                closeDropdown();
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
    }

    return { init, open: openDropdown, close: closeDropdown, toggle: toggleDropdown };
})();