/* ==================================================================
   FIREBASE-CONFIG.JS — Firebase initialization
   Project: reverb-8fb2f
   Exposes: window.FirebaseApp, window.FirebaseAuth, window.FirebaseDB
================================================================== */

(function () {
    var firebaseConfig = {
        apiKey: "AIzaSyCtgNd7NuX-kynx1QFvDUyiz6QZroXNU5A",
        authDomain: "reverb-8fb2f.firebaseapp.com",
        projectId: "reverb-8fb2f",
        storageBucket: "reverb-8fb2f.firebasestorage.app",
        messagingSenderId: "744858701393",
        appId: "1:744858701393:web:a8b06b13000d878f5ef270",
        measurementId: "G-6K7ZEQ51EV"
    };

    var SDK_VERSION = '10.7.1';
    var BASE = 'https://www.gstatic.com/firebasejs/' + SDK_VERSION + '/';

    function loadScript(src, callback) {
        var s = document.createElement('script');
        s.src = src;
        s.async = false;
        s.onload = callback;
        s.onerror = function () {
            console.error('[Firebase] ❌ Failed to load:', src);
        };
        document.head.appendChild(s);
    }

    console.log('[Firebase] Loading SDKs...');

    loadScript(BASE + 'firebase-app-compat.js', function () {
        console.log('[Firebase] ✅ firebase-app loaded');
        loadScript(BASE + 'firebase-auth-compat.js', function () {
            console.log('[Firebase] ✅ firebase-auth loaded');
            loadScript(BASE + 'firebase-firestore-compat.js', function () {
                console.log('[Firebase] ✅ firebase-firestore loaded');
                try {
                    firebase.initializeApp(firebaseConfig);
                    window.FirebaseApp = firebase.app();
                    window.FirebaseAuth = firebase.auth();
                    window.FirebaseDB = firebase.firestore();

                    /* 🔴 Set persistence + COOP fix */
                    window.FirebaseAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
                        .catch(function (e) { console.warn('[Firebase] Persistence error:', e); });

                    console.log('[Firebase] ✅ Initialized. Project:', firebaseConfig.projectId);

                    window.dispatchEvent(new CustomEvent('firebase:ready'));
                } catch (e) {
                    console.error('[Firebase] ❌ Init error:', e.message);
                }
            });
        });
    });
})();