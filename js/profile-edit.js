/* ==================================================================
   PROFILE-EDIT.JS — Profile edit page
   - Edit name, email, bio
   - Change avatar (image upload → localStorage)
   - Save to localStorage
   Exposes: window.ProfileEdit
================================================================== */

window.ProfileEdit = (function () {

    const STORAGE_KEY = 'reverb_user_profile';

    /* ---------- Default profile ---------- */
    const DEFAULT_PROFILE = {
        name: 'Alex Carter',
        email: 'alex@reverb.fm',
        bio: '',
        avatar: '' /* base64 image data if uploaded */
    };

    let currentProfile = { ...DEFAULT_PROFILE };

    /* ---------- Load ---------- */
    function load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) currentProfile = { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
        } catch (e) {}
        return currentProfile;
    }

    /* ---------- Save ---------- */
    function save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(currentProfile));
        } catch (e) {}
        /* Sync everywhere */
        syncUI();
    }

    /* ---------- Sync UI everywhere ---------- */
    function syncUI() {
        /* Avatar initial letters */
        const initial = (currentProfile.name || 'A').trim().charAt(0).toUpperCase() || 'A';

        /* Topbar avatar */
        const topAvatar = document.getElementById('avatar-btn');
        if (topAvatar) {
            if (currentProfile.avatar) {
                topAvatar.innerHTML = `<img src="${currentProfile.avatar}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">`;
            } else {
                topAvatar.textContent = initial;
            }
        }

        /* Profile dropdown header */
        const pName = document.querySelector('.profile-header-name');
        const pEmail = document.querySelector('.profile-header-email');
        const pAvatar = document.querySelector('.profile-header-avatar');
        if (pName) pName.textContent = currentProfile.name;
        if (pEmail) pEmail.textContent = currentProfile.email;
        if (pAvatar) {
            if (currentProfile.avatar) {
                pAvatar.innerHTML = `<img src="${currentProfile.avatar}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">`;
            } else {
                pAvatar.textContent = initial;
            }
        }

        /* Library header */
        const libName = document.querySelector('.library-header-info p');
        const libAvatar = document.querySelector('.library-avatar');
        if (libName) libName.textContent = currentProfile.name;
        if (libAvatar) {
            if (currentProfile.avatar) {
                libAvatar.innerHTML = `<img src="${currentProfile.avatar}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">`;
            } else {
                libAvatar.textContent = initial;
            }
        }

        /* Profile edit page */
        const editAvatar = document.getElementById('profile-edit-avatar');
        if (editAvatar) {
            if (currentProfile.avatar) {
                editAvatar.innerHTML = `<img src="${currentProfile.avatar}" alt="">`;
            } else {
                editAvatar.textContent = initial;
            }
        }

        /* Emit event so other modules can listen */
        window.dispatchEvent(new CustomEvent('profile:updated', { detail: currentProfile }));
    }

    /* ---------- Open page ---------- */
    function openPage() {
        /* Fill form with current values */
        const nameInput = document.getElementById('profile-input-name');
        const emailInput = document.getElementById('profile-input-email');
        const bioInput = document.getElementById('profile-input-bio');
        if (nameInput) nameInput.value = currentProfile.name;
        if (emailInput) emailInput.value = currentProfile.email;
        if (bioInput) bioInput.value = currentProfile.bio || '';

        /* Switch page */
        if (window.Pages) {
            window.Pages.navigate('profile-edit');
        }
    }

    /* ---------- Save from form ---------- */
    function saveFromForm() {
        const nameInput = document.getElementById('profile-input-name');
        const emailInput = document.getElementById('profile-input-email');
        const bioInput = document.getElementById('profile-input-bio');

        const name = (nameInput?.value || '').trim();
        const email = (emailInput?.value || '').trim();

        if (!name) {
            if (window.BottomNav && window.BottomNav.showToast) {
                window.BottomNav.showToast('Please enter your name');
            }
            nameInput?.focus();
            return;
        }

        currentProfile.name = name;
        currentProfile.email = email || currentProfile.email;
        currentProfile.bio = (bioInput?.value || '').trim();

        save();

        if (window.BottomNav && window.BottomNav.showToast) {
            window.BottomNav.showToast('Profile updated ✓');
        }

        /* Go back */
        setTimeout(() => {
            if (window.Pages) window.Pages.navigate('home');
        }, 500);
    }

    /* ---------- Avatar upload ---------- */
    function handleAvatarUpload(file) {
        if (!file) return;
        if (!file.type.startsWith('image/')) return;

        /* Optional size limit: 2MB */
        if (file.size > 2 * 1024 * 1024) {
            if (window.BottomNav && window.BottomNav.showToast) {
                window.BottomNav.showToast('Image too large (max 2MB)');
            }
            return;
        }

        const reader = new FileReader();
        reader.onload = (ev) => {
            currentProfile.avatar = ev.target.result;
            save();
            if (window.BottomNav && window.BottomNav.showToast) {
                window.BottomNav.showToast('Photo updated ✓');
            }
        };
        reader.readAsDataURL(file);
    }

    /* ---------- Init ---------- */
    function init() {
        load();
        syncUI();

        /* Avatar upload button */
        const changeAvatarBtn = document.getElementById('profile-change-avatar-btn');
        const avatarInput = document.getElementById('profile-avatar-input');
        if (changeAvatarBtn && avatarInput) {
            changeAvatarBtn.addEventListener('click', () => avatarInput.click());
            avatarInput.addEventListener('change', (e) => {
                handleAvatarUpload(e.target.files?.[0]);
                avatarInput.value = '';
            });
        }

        /* Save / Cancel */
        const saveBtn = document.getElementById('profile-edit-save');
        const cancelBtn = document.getElementById('profile-edit-cancel');
        const backBtn = document.getElementById('profile-edit-back');

        if (saveBtn) saveBtn.addEventListener('click', saveFromForm);
        if (cancelBtn) cancelBtn.addEventListener('click', () => {
            if (window.Pages) window.Pages.navigate('home');
        });
        if (backBtn) backBtn.addEventListener('click', () => {
            if (window.Pages) window.Pages.navigate('home');
        });

        console.log('[ProfileEdit] Loaded. Profile:', currentProfile.name);
    }

    return {
        init,
        openPage,
        get: () => currentProfile,
        set: (p) => { currentProfile = { ...currentProfile, ...p }; save(); }
    };
})();