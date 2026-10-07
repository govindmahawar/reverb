/* ==================================================================
   FIRESTORE.JS — User data + Admin songs
   Exposes: window.Firestore
================================================================== */

window.Firestore = (function () {

    /* ================================================================
       HELPERS
    ================================================================ */
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

    /* ================================================================
       PROFILE
    ================================================================ */
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

    /* ================================================================
       LIKES
    ================================================================ */
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

    /* ================================================================
       FOLLOWS
    ================================================================ */
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

    /* ================================================================
       PLAYLISTS
    ================================================================ */
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

    /* ================================================================
       RECENT PLAYS
    ================================================================ */
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
       DELETE USER DATA
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

    /* ================================================================
       🔥 ADMIN SONGS — Global collection
       Visible to ALL users, editable by admin
    ================================================================ */

    function saveAdminSong(song) {
        console.log('[Firestore] saveAdminSong called:', song.title);

        if (!window.FirebaseDB) {
            console.error('[Firestore] ❌ FirebaseDB not initialized');
            return Promise.reject(new Error('Firestore not initialized'));
        }

        if (!window.FirebaseAuth || !window.FirebaseAuth.currentUser) {
            console.error('[Firestore] ❌ User not logged in');
            return Promise.reject(new Error('Please log in first'));
        }

        return window.FirebaseDB.collection('songs').doc(song.id).set(song)
            .then(function () {
                console.log('[Firestore] ✅ Admin song saved:', song.title);
                return song;
            })
            .catch(function (e) {
                console.error('[Firestore] ❌ Save song error:', e.code, e.message);
                throw new Error(e.message || 'Save failed');
            });
    }

    function deleteAdminSong(songId) {
        if (!window.FirebaseDB) {
            return Promise.reject(new Error('Firestore not initialized'));
        }

        return window.FirebaseDB.collection('songs').doc(songId).delete()
            .then(function () {
                console.log('[Firestore] ✅ Admin song deleted:', songId);
            })
            .catch(function (e) {
                console.error('[Firestore] Delete song error:', e.message);
                throw e;
            });
    }

    function loadAdminSongs() {
        if (!window.FirebaseDB) {
            console.warn('[Firestore] FirebaseDB not ready for loadAdminSongs');
            return Promise.resolve([]);
        }

        return window.FirebaseDB.collection('songs').get()
            .then(function (snapshot) {
                var songs = [];
                snapshot.forEach(function (doc) {
                    var data = doc.data();
                    data.id = doc.id;
                    songs.push(data);
                });
                console.log('[Firestore] ✅ Loaded', songs.length, 'admin songs');
                return songs;
            })
            .catch(function (e) {
                console.error('[Firestore] Load songs error:', e.message);
                return [];
            });
    }

    /* ================================================================
       INIT
    ================================================================ */
    function init() {
        if (window.FirebaseDB) {
            console.log('[Firestore] ✅ Ready');
        } else {
            console.warn('[Firestore] ⚠️ FirebaseDB not yet available');
        }
    }

    /* ================================================================
       PUBLIC API
    ================================================================ */
    return {
        init: init,
        isReady: isReady,

        /* Profile */
        saveProfile: saveProfile,

        /* Likes */
        saveLikes: saveLikes,
        loadLikes: loadLikes,

        /* Follows */
        saveFollows: saveFollows,
        loadFollows: loadFollows,

        /* Playlists */
        savePlaylists: savePlaylists,
        loadPlaylists: loadPlaylists,

        /* Recent */
        saveRecentPlays: saveRecentPlays,
        loadRecentPlays: loadRecentPlays,

        /* Delete user */
        deleteAllUserData: deleteAllUserData,

        /* Admin songs */
        saveAdminSong: saveAdminSong,
        deleteAdminSong: deleteAdminSong,
        loadAdminSongs: loadAdminSongs
    };
})();