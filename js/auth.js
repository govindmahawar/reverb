/* ==================================================================
   AUTH.JS — Firebase Authentication (Email + Google Popup)
   Exposes: window.Auth
================================================================== */

window.Auth = (function () {

    var OWNER_EMAIL = 'govindmahawar785@gmail.com';
    var DESKTOP_MIN_WIDTH = 900;

    var currentUser = null;
    var pendingAction = null;
    var activeTab = 'login';

    var modal, closeBtn, submitBtn, submitText;
    var tabLogin, tabSignup;
    var titleEl, subtitleEl, infoText;
    var nameGroup, nameInput, emailInput, passwordInput;
    var forgotWrap, forgotBtn;
    var errorEl, googleBtn, guestBtn;

    /* ============================================================
       USER STATE
    ============================================================ */
    function isLoggedIn() {
        return !!currentUser && !currentUser.isGuest && currentUser.emailVerified !== false;
    }

    function isLoggedInButUnverified() {
        return !!currentUser && !currentUser.isGuest && currentUser.emailVerified === false;
    }

    function isGuest() {
        return !!currentUser && currentUser.isGuest;
    }

    function getUser() {
        return currentUser ? Object.assign({}, currentUser) : null;
    }

    function setUser(user) {
        currentUser = user;
        updateProfileUI();
        dispatchUserUpdate();
        updateAdminAccess();
    }

    /* ============================================================
       ADMIN ACCESS
    ============================================================ */
    function isOwnerEmail() {
        if (!currentUser || currentUser.isGuest) return false;
        return (currentUser.email || '').toLowerCase() === OWNER_EMAIL.toLowerCase();
    }

    function isDesktop() {
        return window.innerWidth >= DESKTOP_MIN_WIDTH;
    }

    function updateAdminAccess() {
        var isOwner = isOwnerEmail() && isDesktop();

        if (isOwner) {
            document.body.classList.add('admin-mode');
            console.log('[Auth] Admin access GRANTED:', currentUser.email);
        } else {
            document.body.classList.remove('admin-mode');
            if (document.body.classList.contains('page-admin')) {
                document.body.classList.remove('page-admin');
                if (window.Pages) {
                    try { window.Pages.navigate('home'); } catch (e) {}
                }
            }
        }

        if (window.Admin && window.Admin.onAuthChange) {
            try { window.Admin.onAuthChange(); } catch (e) {}
        }
    }

    /* ============================================================
       LOGOUT
    ============================================================ */
       function logout() {
        console.log('[Auth] Logging out...');

        if (window._verifyCheckInterval) {
            clearInterval(window._verifyCheckInterval);
            window._verifyCheckInterval = null;
        }

        if (window.FirebaseAuth) {
            window.FirebaseAuth.signOut().catch(function (err) {
                console.warn('[Auth] SignOut error:', err.message);
            });
        }

        currentUser = {
            name: 'Guest',
            email: '',
            photo: '',
            isGuest: true
        };

        document.body.classList.remove('admin-mode');
        document.body.classList.remove('page-admin');

        updateProfileUI();
        dispatchUserUpdate();

        try { localStorage.removeItem('reverb_user_profile'); } catch (e) {}

        try {
            if (window.Likes && window.Likes.clearAll) window.Likes.clearAll();
            if (window.Follows && window.Follows.clearAll) window.Follows.clearAll();
        } catch (e) {}

        /* 🔴 RESET LOAD FLAGS — so next login re-loads from Firestore */
        window._likesLoaded = false;
        window._followsLoaded = false;
        window._playlistsLoaded = false;

        /* 🔴 CLEAR CUSTOM PLAYLIST UI */
        try {
            document.querySelectorAll('.playlist-mini[data-playlist-name]').forEach(el => el.remove());
            document.querySelectorAll('.library-item[data-playlist-name]').forEach(el => el.remove());
        } catch (e) {}

        if (window.Pages) {
            try { window.Pages.navigate('home'); } catch (e) {}
        }

        if (window.Admin && window.Admin.onAuthChange) {
            try { window.Admin.onAuthChange(); } catch (e) {}
        }

        if (window.BottomNav && window.BottomNav.showToast) {
            window.BottomNav.showToast('Logged out — continuing as guest');
        }

        console.log('[Auth] Logout complete. Load flags reset.');
    }

    /* ============================================================
       DELETE ACCOUNT
    ============================================================ */
    function deleteAccount(password, onProgress, onError) {
        var fbUser = window.FirebaseAuth && window.FirebaseAuth.currentUser;
        if (!fbUser) {
            if (onError) onError('No user logged in');
            return Promise.reject('No user logged in');
        }

        if (onProgress) onProgress('Verifying password...');

        var credential = firebase.auth.EmailAuthProvider.credential(fbUser.email, password);

        return fbUser.reauthenticateWithCredential(credential)
            .then(function () {
                if (onProgress) onProgress('Deleting your data...');
                if (window.Firestore && window.Firestore.deleteAllUserData) {
                    return window.Firestore.deleteAllUserData();
                }
            })
            .then(function () {
                if (onProgress) onProgress('Deleting account...');
                return fbUser.delete();
            })
            .then(function () {
                console.log('[Auth] Account deleted');

                currentUser = { name: 'Guest', email: '', photo: '', isGuest: true };
                document.body.classList.remove('admin-mode');
                document.body.classList.remove('page-admin');

                updateProfileUI();
                dispatchUserUpdate();
                updateAdminAccess();

                try { localStorage.removeItem('reverb_user_profile'); } catch (e) {}

                try {
                    if (window.Likes && window.Likes.clearAll) window.Likes.clearAll();
                    if (window.Follows && window.Follows.clearAll) window.Follows.clearAll();
                } catch (e) {}

                if (window.Pages) {
                    try { window.Pages.navigate('home'); } catch (e) {}
                }

                return true;
            })
            .catch(function (err) {
                console.error('[Auth] Delete error:', err.code, err.message);
                var msg = err.message || 'Delete failed';
                if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                    msg = 'Wrong password. Please try again.';
                } else if (err.code === 'auth/too-many-requests') {
                    msg = 'Too many attempts. Try again later.';
                } else if (err.code === 'auth/requires-recent-login') {
                    msg = 'Please log out and log in again, then try deleting.';
                }
                if (onError) onError(msg);
                throw err;
            });
    }

    function dispatchUserUpdate() {
        try {
            window.dispatchEvent(new CustomEvent('auth:changed', { detail: currentUser }));
        } catch (e) {}
    }

    /* ============================================================
       PROFILE UI
    ============================================================ */
    function updateProfileUI() {
        var initial = currentUser
            ? (currentUser.name || currentUser.email || 'G').charAt(0).toUpperCase()
            : 'G';

        var isGuestNow = !currentUser || currentUser.isGuest;
        var displayName = isGuestNow ? 'Guest User' : (currentUser.name || 'User');
        var displayEmail = isGuestNow ? 'Tap to log in' : (currentUser.email || '');

        var topAvatar = document.getElementById('avatar-btn');
        if (topAvatar) {
            if (currentUser && currentUser.photo && !currentUser.isGuest) {
                topAvatar.innerHTML = '<img src="' + currentUser.photo + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">';
            } else {
                topAvatar.textContent = initial;
            }
        }

        var pName = document.querySelector('.profile-header-name');
        var pEmail = document.querySelector('.profile-header-email');
        var pAvatar = document.querySelector('.profile-header-avatar');

        if (pName) pName.textContent = displayName;
        if (pEmail) {
            pEmail.textContent = displayEmail;
            pEmail.style.color = isGuestNow ? '#b8a8e0' : '';
            pEmail.style.fontStyle = isGuestNow ? 'italic' : '';
        }
        if (pAvatar) {
            if (currentUser && currentUser.photo && !currentUser.isGuest) {
                pAvatar.innerHTML = '<img src="' + currentUser.photo + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">';
            } else {
                pAvatar.textContent = initial;
            }
        }

        var libName = document.querySelector('.library-header-info p');
        var libAvatar = document.querySelector('.library-avatar');
        if (libName) libName.textContent = displayName;
        if (libAvatar) {
            if (currentUser && currentUser.photo && !currentUser.isGuest) {
                libAvatar.innerHTML = '<img src="' + currentUser.photo + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">';
            } else {
                libAvatar.textContent = initial;
            }
        }

        var editAvatar = document.getElementById('profile-edit-avatar');
        if (editAvatar) {
            if (currentUser && currentUser.photo && !currentUser.isGuest) {
                editAvatar.innerHTML = '<img src="' + currentUser.photo + '" alt="">';
            } else {
                editAvatar.textContent = initial;
            }
        }
    }

    /* ============================================================
       MODAL
    ============================================================ */
    function openModal(tab, action) {
        tab = tab || 'login';
        activeTab = tab;
        pendingAction = action || null;
        switchTab(tab);
        if (modal) modal.classList.add('active');
        if (errorEl) errorEl.style.display = 'none';
        setTimeout(function () {
            if (emailInput) emailInput.focus();
        }, 200);
    }

    function closeModal() {
        if (modal) modal.classList.remove('active');
        pendingAction = null;
        clearForm();
    }

    function switchTab(tab) {
        activeTab = tab;

        if (tabLogin) tabLogin.classList.toggle('active', tab === 'login');
        if (tabSignup) tabSignup.classList.toggle('active', tab === 'signup');

        if (nameGroup) nameGroup.style.display = (tab === 'signup') ? 'flex' : 'none';
        if (forgotWrap) forgotWrap.style.display = (tab === 'login') ? 'flex' : 'none';

        if (titleEl) titleEl.textContent = tab === 'login' ? 'Welcome back' : 'Create account';
        if (subtitleEl) {
            subtitleEl.textContent = tab === 'login'
                ? 'Log in to save your likes & playlists'
                : 'Sign up free — takes just 10 seconds';
        }
        if (submitText) submitText.textContent = tab === 'login' ? 'Log in' : 'Create account';

        if (submitBtn) {
            var icon = submitBtn.querySelector('i');
            if (icon) icon.className = tab === 'login' ? 'fas fa-sign-in-alt' : 'fas fa-user-plus';
        }
        if (infoText) {
            infoText.textContent = tab === 'login'
                ? "Don't have an account? Switch to Sign up tab above."
                : "Already have an account? Switch to Log in tab above.";
        }
        if (errorEl) errorEl.style.display = 'none';
    }

    /* ============================================================
       FORM
    ============================================================ */
    function clearForm() {
        if (nameInput) nameInput.value = '';
        if (emailInput) emailInput.value = '';
        if (passwordInput) passwordInput.value = '';
        if (errorEl) errorEl.style.display = 'none';
    }

    function showError(msg) {
        if (errorEl) {
            errorEl.textContent = msg;
            errorEl.style.display = 'flex';
        }
    }

    function setLoading(loading) {
        if (submitBtn) {
            submitBtn.disabled = loading;
            submitBtn.style.opacity = loading ? '0.7' : '';
            submitBtn.style.cursor = loading ? 'wait' : '';
        }
        if (submitText) {
            submitText.textContent = loading
                ? 'Please wait...'
                : (activeTab === 'login' ? 'Log in' : 'Create account');
        }
    }

    function handleSubmit() {
        var email = (emailInput && emailInput.value || '').trim().toLowerCase();
        var password = (passwordInput && passwordInput.value) || '';
        var name = (nameInput && nameInput.value || '').trim();

        if (!email) { showError('Please enter your email'); if (emailInput) emailInput.focus(); return; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showError('Please enter a valid email');
            if (emailInput) emailInput.focus();
            return;
        }
        if (!password || password.length < 6) {
            showError('Password must be at least 6 characters');
            if (passwordInput) passwordInput.focus();
            return;
        }
        if (activeTab === 'signup' && !name) {
            showError('Please enter your name');
            if (nameInput) nameInput.focus();
            return;
        }

        if (!window.FirebaseAuth) {
            showError('Firebase not loaded yet. Please wait a moment and try again.');
            return;
        }

        setLoading(true);

        var promise;
        if (activeTab === 'signup') {
            promise = window.FirebaseAuth.createUserWithEmailAndPassword(email, password)
                .then(function (cred) {
                    return cred.user.updateProfile({ displayName: name }).then(function () {
                        return cred.user.sendEmailVerification().then(function () {
                            return cred.user;
                        });
                    });
                });
        } else {
            promise = window.FirebaseAuth.signInWithEmailAndPassword(email, password)
                .then(function (cred) {
                    var fbUser = cred.user;
                    if (!fbUser.emailVerified) {
                        closeModal();
                        setLoading(false);
                        showVerificationModal(fbUser.email);
                        return null;
                    }
                    return fbUser;
                });
        }

        promise.then(function (fbUser) {
            if (!fbUser) return;

            var user = {
                uid: fbUser.uid,
                name: fbUser.displayName || name || (email.split('@')[0]),
                email: fbUser.email,
                photo: fbUser.photoURL || '',
                emailVerified: fbUser.emailVerified,
                isGuest: false
            };

            setUser(user);

            if (window.Firestore) {
                window.Firestore.saveProfile(user);
            }

            closeModal();
            setLoading(false);

            if (window.BottomNav && window.BottomNav.showToast) {
                if (activeTab === 'signup') {
                    window.BottomNav.showToast('📧 Verification email sent to ' + user.email);
                } else {
                    window.BottomNav.showToast('Welcome back, ' + user.name);
                }
            }

            if (activeTab === 'signup') {
                showVerificationModal(user.email);
            }

            if (pendingAction && typeof pendingAction === 'function') {
                var action = pendingAction;
                pendingAction = null;
                setTimeout(function () {
                    try { action(); } catch (e) { console.error(e); }
                }, 400);
            }
        }).catch(function (err) {
            setLoading(false);
            var msg = err.message || 'Error occurred';
            if (err.code === 'auth/email-already-in-use') msg = 'This email is already registered. Try logging in.';
            else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') msg = 'Wrong password. Please try again.';
            else if (err.code === 'auth/user-not-found') msg = 'No account found. Please sign up.';
            else if (err.code === 'auth/weak-password') msg = 'Password too weak (min 6 chars).';
            else if (err.code === 'auth/invalid-email') msg = 'Invalid email format.';
            else if (err.code === 'auth/too-many-requests') msg = 'Too many attempts. Try again later.';
            else if (err.code === 'auth/network-request-failed') msg = 'Network error. Check your internet.';
            showError(msg);
        });
    }

    /* ============================================================
       GOOGLE SIGN-IN — POPUP METHOD
       (Redirect se better — instant result, no page reload)
    ============================================================ */
    function handleGoogle() {
        if (!window.FirebaseAuth) {
            showError('Firebase not loaded yet');
            return;
        }

        /* Clear previous errors */
        if (errorEl) errorEl.style.display = 'none';
        setLoading(true);

        var provider = new firebase.auth.GoogleAuthProvider();
        provider.addScope('profile');
        provider.addScope('email');
        provider.setCustomParameters({ prompt: 'select_account' });

        /* 🔴 POPUP METHOD — instant result */
        window.FirebaseAuth.signInWithPopup(provider)
            .then(function (result) {
                var fbUser = result.user;

                var user = {
                    uid: fbUser.uid,
                    name: fbUser.displayName || (fbUser.email || '').split('@')[0],
                    email: fbUser.email,
                    photo: fbUser.photoURL || '',
                    emailVerified: true, /* Google emails are verified */
                    isGuest: false,
                    provider: 'google.com'
                };

                console.log('[Auth] ✅ Google Sign-In success:', user.email);
                console.log('[Auth] Name:', user.name);
                console.log('[Auth] Photo:', user.photo);

                setUser(user);

                /* Save to Firestore */
                if (window.Firestore) {
                    window.Firestore.saveProfile(user);
                }

                closeModal();
                setLoading(false);

                if (window.BottomNav && window.BottomNav.showToast) {
                    window.BottomNav.showToast('Welcome, ' + user.name + '!');
                }

                /* Run pending action */
                if (pendingAction && typeof pendingAction === 'function') {
                    var action = pendingAction;
                    pendingAction = null;
                    setTimeout(function () {
                        try { action(); } catch (e) { console.error(e); }
                    }, 400);
                }
            })
            .catch(function (err) {
                setLoading(false);
                console.error('[Auth] Google error:', err.code, err.message);

                var msg = err.message || 'Google sign-in failed';

                if (err.code === 'auth/popup-closed-by-user') {
                    msg = 'Sign-in cancelled';
                } else if (err.code === 'auth/popup-blocked') {
                    msg = 'Popup blocked! Please allow popups for this site (click the icon in address bar)';
                } else if (err.code === 'auth/cancelled-popup-request') {
                    /* Silent — user cancelled */
                    return;
                } else if (err.code === 'auth/account-exists-with-different-credential') {
                    msg = 'This email is already registered with password. Please log in with your password.';
                } else if (err.code === 'auth/unauthorized-domain') {
                    msg = 'This domain is not authorized. Add 127.0.0.1 in Firebase Console → Auth → Settings → Authorized domains.';
                } else if (err.code === 'auth/network-request-failed') {
                    msg = 'Network error. Check your internet connection.';
                } else if (err.code === 'auth/operation-not-allowed') {
                    msg = 'Google Sign-In is not enabled in Firebase Console.';
                }

                showError(msg);
            });
    }

    function handleGuest() {
        currentUser = {
            name: 'Guest',
            email: '',
            photo: '',
            isGuest: true
        };
        updateProfileUI();
        dispatchUserUpdate();
        updateAdminAccess();
        closeModal();

        if (window.BottomNav && window.BottomNav.showToast) {
            window.BottomNav.showToast('Continuing as guest');
        }
    }

    function handleForgot() {
        var email = (emailInput && emailInput.value || '').trim();
        if (!email) {
            showError('Enter your email first');
            if (emailInput) emailInput.focus();
            return;
        }
        if (!window.FirebaseAuth) return;
        window.FirebaseAuth.sendPasswordResetEmail(email)
            .then(function () {
                if (window.BottomNav && window.BottomNav.showToast) {
                    window.BottomNav.showToast('Reset link sent to ' + email);
                }
            })
            .catch(function (err) {
                showError(err.message);
            });
    }

    /* ============================================================
       VERIFICATION MODAL
    ============================================================ */
    function showVerificationModal(email) {
        var vModal = document.getElementById('verify-email-modal');
        if (!vModal) {
            vModal = document.createElement('div');
            vModal.id = 'verify-email-modal';
            vModal.className = 'modal-overlay';
            vModal.style.cssText = 'z-index: 9999;';
            vModal.innerHTML = ''
                + '<div class="modal-card" style="max-width:420px;text-align:center;padding:32px 24px;">'
                +   '<div style="width:72px;height:72px;margin:0 auto 20px;background:linear-gradient(145deg,#8b7ab8,#6d5e9e);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:2rem;color:#fff;">'
                +     '📧'
                +   '</div>'
                +   '<h2 style="font-size:1.4rem;font-weight:800;color:#fff;margin-bottom:10px;">Verify your email</h2>'
                +   '<p style="font-size:0.88rem;color:rgba(255,255,255,0.6);margin-bottom:20px;line-height:1.5;">'
                +     'We sent a verification link to<br>'
                +     '<strong id="verify-email-target" style="color:#b8a8e0;font-size:0.95rem;"></strong>'
                +   '</p>'
                +   '<p style="font-size:0.78rem;color:rgba(255,255,255,0.5);margin-bottom:24px;line-height:1.5;">'
                +     'Click the link in the email to activate your account. Then come back and log in.'
                +   '</p>'
                +   '<div style="display:flex;flex-direction:column;gap:10px;">'
                +     '<button class="btn-primary" id="verify-resend-btn" style="justify-content:center;padding:12px 20px;">'
                +       '<i class="fas fa-paper-plane"></i> Resend Email'
                +     '</button>'
                +     '<button class="btn-secondary" id="verify-ok-btn" style="justify-content:center;padding:12px 20px;">'
                +       'I\'ll verify later'
                +     '</button>'
                +   '</div>'
                +   '<p style="font-size:0.7rem;color:rgba(255,255,255,0.4);margin-top:16px;">'
                +     'Check spam folder if you don\'t see the email.'
                +   '</p>'
                + '</div>';
            document.body.appendChild(vModal);
        }

        var target = document.getElementById('verify-email-target');
        if (target) target.textContent = email;

        setTimeout(function () { vModal.classList.add('active'); }, 50);

        var resendBtn = document.getElementById('verify-resend-btn');
        var okBtn = document.getElementById('verify-ok-btn');

        if (resendBtn && !resendBtn._bound) {
            resendBtn._bound = true;
            resendBtn.addEventListener('click', function () {
                var fbUser = window.FirebaseAuth.currentUser;
                if (fbUser) {
                    fbUser.sendEmailVerification()
                        .then(function () {
                            if (window.BottomNav && window.BottomNav.showToast) {
                                window.BottomNav.showToast('📧 Verification email resent');
                            }
                        })
                        .catch(function (err) {
                            if (window.BottomNav && window.BottomNav.showToast) {
                                window.BottomNav.showToast('Error: ' + err.message);
                            }
                        });
                }
            });
        }

        if (okBtn && !okBtn._bound) {
            okBtn._bound = true;
            okBtn.addEventListener('click', function () {
                vModal.classList.remove('active');
                if (window.BottomNav && window.BottomNav.showToast) {
                    window.BottomNav.showToast('We\'ll auto-detect when you verify');
                }
            });
        }

        /* Auto-check verification */
        if (window._verifyCheckInterval) clearInterval(window._verifyCheckInterval);

        var checkCount = 0;
        var MAX_CHECKS = 60;

        window._verifyCheckInterval = setInterval(function () {
            checkCount++;

            var fbUser = window.FirebaseAuth && window.FirebaseAuth.currentUser;
            if (!fbUser) {
                clearInterval(window._verifyCheckInterval);
                window._verifyCheckInterval = null;
                return;
            }

            fbUser.reload().then(function () {
                if (fbUser.emailVerified) {
                    clearInterval(window._verifyCheckInterval);
                    window._verifyCheckInterval = null;
                    vModal.classList.remove('active');

                    var user = {
                        uid: fbUser.uid,
                        name: fbUser.displayName || (fbUser.email || '').split('@')[0],
                        email: fbUser.email,
                        photo: fbUser.photoURL || '',
                        emailVerified: true,
                        isGuest: false
                    };

                    setUser(user);

                    if (window.BottomNav && window.BottomNav.showToast) {
                        window.BottomNav.showToast('✅ Email verified! Welcome ' + user.name);
                    }

                    if (window.Firestore) window.Firestore.saveProfile(user);
                }
            }).catch(function () {});

            if (checkCount >= MAX_CHECKS) {
                clearInterval(window._verifyCheckInterval);
                window._verifyCheckInterval = null;
            }
        }, 3000);
    }

    /* ============================================================
       ACTION GUARD
    ============================================================ */
    function requireLogin(action, actionDescription) {
        actionDescription = actionDescription || 'do this';

        if (isLoggedIn()) {
            if (typeof action === 'function') action();
            return true;
        }

        if (isLoggedInButUnverified()) {
            showVerificationModal(currentUser.email);
            if (window.BottomNav && window.BottomNav.showToast) {
                window.BottomNav.showToast('Verify your email to ' + actionDescription);
            }
            return false;
        }

        openModal('login', action);

        if (window.BottomNav && window.BottomNav.showToast) {
            window.BottomNav.showToast('Log in to ' + actionDescription);
        }
        return false;
    }

    /* ============================================================
       INIT
    ============================================================ */
    function init() {
        modal = document.getElementById('auth-modal');
        closeBtn = document.getElementById('auth-close-btn');
        submitBtn = document.getElementById('auth-submit-btn');
        submitText = document.getElementById('auth-submit-text');

        tabLogin = document.querySelector('.auth-tab[data-tab="login"]');
        tabSignup = document.querySelector('.auth-tab[data-tab="signup"]');

        titleEl = document.getElementById('auth-title');
        subtitleEl = document.getElementById('auth-subtitle');
        infoText = document.getElementById('auth-info-text');

        nameGroup = document.getElementById('auth-name-group');
        nameInput = document.getElementById('auth-name');
        emailInput = document.getElementById('auth-email');
        passwordInput = document.getElementById('auth-password');

        forgotWrap = document.getElementById('auth-forgot-wrap');
        forgotBtn = document.getElementById('auth-forgot-btn');
        errorEl = document.getElementById('auth-error');

        googleBtn = document.getElementById('auth-google-btn');
        guestBtn = document.getElementById('auth-guest-btn');

        if (tabLogin) tabLogin.addEventListener('click', function () { switchTab('login'); });
        if (tabSignup) tabSignup.addEventListener('click', function () { switchTab('signup'); });

        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (modal) {
            modal.addEventListener('click', function (e) {
                if (e.target === modal) closeModal();
            });
        }

        if (submitBtn) submitBtn.addEventListener('click', handleSubmit);

        [emailInput, passwordInput, nameInput].forEach(function (inp) {
            if (inp) {
                inp.addEventListener('keydown', function (e) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSubmit();
                    }
                });
            }
        });

        if (forgotBtn) forgotBtn.addEventListener('click', handleForgot);
        if (googleBtn) googleBtn.addEventListener('click', handleGoogle);
        if (guestBtn) guestBtn.addEventListener('click', handleGuest);

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && modal && modal.classList.contains('active')) {
                closeModal();
            }
        });

        /* Default: guest */
        currentUser = { name: 'Guest', email: '', photo: '', isGuest: true };
        updateProfileUI();
        updateAdminAccess();

        setTimeout(function () { updateProfileUI(); }, 100);
        setTimeout(function () { updateProfileUI(); }, 500);

        window.addEventListener('resize', function () {
            updateAdminAccess();
        });

        /* ============================================================
           Firebase listeners — POLL for ready
        ============================================================ */
        var firebaseReadyInterval = setInterval(function () {
            if (!window.FirebaseAuth) return;

            clearInterval(firebaseReadyInterval);
            console.log('[Auth] Firebase ready detected');

            /* Auth state listener */
            window.FirebaseAuth.onAuthStateChanged(function (fbUser) {
                if (fbUser) {
                    fbUser.reload().then(function () {
                        var provider = 'password';
                        if (fbUser.providerData && fbUser.providerData[0]) {
                            provider = fbUser.providerData[0].providerId;
                        }

                        var user = {
                            uid: fbUser.uid,
                            name: fbUser.displayName || (fbUser.email || '').split('@')[0],
                            email: fbUser.email,
                            photo: fbUser.photoURL || '',
                            emailVerified: fbUser.emailVerified || provider === 'google.com',
                            isGuest: false,
                            provider: provider
                        };
                        setUser(user);
                        console.log('[Auth] ✅ User restored:', user.email, '| provider:', provider);
                    });
                } else {
                    if (currentUser && !currentUser.isGuest) {
                        currentUser = { name: 'Guest', email: '', photo: '', isGuest: true };
                        updateProfileUI();
                        updateAdminAccess();
                    }
                    console.log('[Auth] No Firebase user (guest)');
                }
            });
        }, 100);

        /* ============================================================
           Auto-cleanup stale localStorage
        ============================================================ */
        setTimeout(function () {
            if (!window.FirebaseAuth) return;

            var fbUser = window.FirebaseAuth.currentUser;
            var cachedProfile = null;

            try {
                cachedProfile = JSON.parse(localStorage.getItem('reverb_user_profile') || 'null');
            } catch (e) {}

            if (cachedProfile && cachedProfile.email && !fbUser) {
                console.log('[Auth] Cleanup: clearing stale localStorage');
                try {
                    localStorage.removeItem('reverb_user_profile');
                    localStorage.removeItem('reverb_liked_songs');
                    localStorage.removeItem('reverb_followed_artists');
                    localStorage.removeItem('reverb_custom_playlists');
                    localStorage.removeItem('reverb_recent_plays');
                } catch (e) {}
            }
        }, 2000);

        /* ============================================================
           Window focus — recheck verification
        ============================================================ */
        window.addEventListener('focus', function () {
            var fbUser = window.FirebaseAuth && window.FirebaseAuth.currentUser;
            if (!fbUser) return;
            if (fbUser.emailVerified) return;

            fbUser.reload().then(function () {
                if (fbUser.emailVerified) {
                    console.log('[Auth] Email verified (on focus)');

                    var user = {
                        uid: fbUser.uid,
                        name: fbUser.displayName || (fbUser.email || '').split('@')[0],
                        email: fbUser.email,
                        photo: fbUser.photoURL || '',
                        emailVerified: true,
                        isGuest: false
                    };

                    setUser(user);

                    var vModal = document.getElementById('verify-email-modal');
                    if (vModal) vModal.classList.remove('active');

                    if (window._verifyCheckInterval) {
                        clearInterval(window._verifyCheckInterval);
                        window._verifyCheckInterval = null;
                    }

                    if (window.BottomNav && window.BottomNav.showToast) {
                        window.BottomNav.showToast('✅ Email verified! Welcome ' + user.name);
                    }

                    if (window.Firestore) window.Firestore.saveProfile(user);
                }
            }).catch(function () {});
        });

        console.log('[Auth] Init complete. User:', currentUser.name, '| Guest:', currentUser.isGuest);
    }

    /* ============================================================
       PUBLIC API
    ============================================================ */
    return {
        init: init,
        openModal: openModal,
        closeModal: closeModal,
        isLoggedIn: isLoggedIn,
        isLoggedInButUnverified: isLoggedInButUnverified,
        isGuest: isGuest,
        getUser: getUser,
        setUser: setUser,
        logout: logout,
        deleteAccount: deleteAccount,
        requireLogin: requireLogin,
        updateProfileUI: updateProfileUI,
        isOwnerEmail: isOwnerEmail,
        updateAdminAccess: updateAdminAccess,
        showVerificationModal: showVerificationModal,
        checkVerification: function () {
            var fbUser = window.FirebaseAuth && window.FirebaseAuth.currentUser;
            if (!fbUser) return Promise.resolve(false);
            return fbUser.reload().then(function () {
                return fbUser.emailVerified;
            });
        }
    };
})();