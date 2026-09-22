/* ==================================================================
   FIRESTORE.JS — User data sync (likes, follows, playlists)
   Exposes: window.Firestore
================================================================== */

window.Firestore = (function () {

    function isReady() {
        return !!(window.FirebaseDB && window.FirebaseAuth && window.FirebaseAuth.currentUser);
    }

    function currentUid() {
        return window.FirebaseAuth && window.FirebaseAuth.currentUser
            ? window.FirebaseAuth.currentUser.uid
            : null;
    }

    function userDoc() {
        var uid = currentUid();
        if (!uid) return null;
        return window.FirebaseDB.collection('users').doc(uid);
    }

    function saveProfile(user) {
        var ref = userDoc();
        if (!ref) return Promise.resolve();
        return ref.set({
            name: user.name || '',
            email: user.email || '',
            photo: user.photo || '',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true })
        .then(function () { console.log('[Firestore] Profile saved'); })
        .catch(function (e) { console.error('[Firestore] Save profile error:', e.message); });
    }

    function saveLikes(trackIds) {
        var ref = userDoc();
        if (!ref) return Promise.resolve();
        return ref.set({
            likedSongs: trackIds || [],
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true })
        .then(function () { console.log('[Firestore] Likes saved:', (trackIds || []).length); })
        .catch(function (e) { console.error('[Firestore] Save likes error:', e.message); });
    }

    function loadLikes() {
        var ref = userDoc();
        if (!ref) return Promise.resolve([]);
        return ref.get()
            .then(function (doc) {
                if (doc.exists) return doc.data().likedSongs || [];
                return [];
            })
            .catch(function (e) {
                console.error('[Firestore] Load likes error:', e.message);
                return [];
            });
    }

    function saveFollows(followedArray) {
        var ref = userDoc();
        if (!ref) return Promise.resolve();
        return ref.set({
            followedArtists: followedArray || [],
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true })
        .then(function () { console.log('[Firestore] Follows saved'); })
        .catch(function (e) { console.error('[Firestore] Save follows error:', e.message); });
    }

    function loadFollows() {
        var ref = userDoc();
        if (!ref) return Promise.resolve([]);
        return ref.get()
            .then(function (doc) {
                if (doc.exists) return doc.data().followedArtists || [];
                return [];
            })
            .catch(function (e) { return []; });
    }

    function savePlaylists(playlists, songsMap) {
        var ref = userDoc();
        if (!ref) return Promise.resolve();
        return ref.set({
            customPlaylists: playlists || [],
            playlistSongs: songsMap || {},
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true })
        .then(function () { console.log('[Firestore] Playlists saved'); })
        .catch(function (e) { console.error('[Firestore] Save playlists error:', e.message); });
    }

    function loadPlaylists() {
        var ref = userDoc();
        if (!ref) return Promise.resolve({ playlists: [], songsMap: {} });
        return ref.get()
            .then(function (doc) {
                if (doc.exists) {
                    var data = doc.data();
                    return {
                        playlists: data.customPlaylists || [],
                        songsMap: data.playlistSongs || {}
                    };
                }
                return { playlists: [], songsMap: {} };
            })
            .catch(function (e) { return { playlists: [], songsMap: {} }; });
    }

    function saveRecentPlays(indices) {
        var ref = userDoc();
        if (!ref) return Promise.resolve();
        return ref.set({
            recentPlays: indices || [],
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true })
        .catch(function (e) {});
    }

    function loadRecentPlays() {
        var ref = userDoc();
        if (!ref) return Promise.resolve([]);
        return ref.get()
            .then(function (doc) {
                if (doc.exists) return doc.data().recentPlays || [];
                return [];
            })
            .catch(function (e) { return []; });
    }
        /* ================================================================
       DELETE ALL USER DATA
    ================================================================ */
    function deleteAllUserData() {
        var ref = userDoc();
        if (!ref) return Promise.resolve();
        return ref.delete()
            .then(function () {
                console.log('[Firestore] All user data deleted');
            })
            .catch(function (e) {
                console.error('[Firestore] Delete user data error:', e.message);
                throw e;
            });
    }

    function init() {
        window.addEventListener('firebase:ready', function () {
            console.log('[Firestore] Ready');
        });

        if (window.FirebaseDB) {
            console.log('[Firestore] Ready (immediate)');
        }
    }

    return {
        init: init,
        isReady: isReady,
        saveProfile: saveProfile,
        saveLikes: saveLikes,
        loadLikes: loadLikes,
        saveFollows: saveFollows,
        loadFollows: loadFollows,
        savePlaylists: savePlaylists,
        loadPlaylists: loadPlaylists,
        saveRecentPlays: saveRecentPlays,
        loadRecentPlays: loadRecentPlays,
        deleteAllUserData: deleteAllUserData
    };
})();