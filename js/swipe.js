/* ==================================================================
   SWIPE.JS — Touch swipe gestures for mobile
   - Now Playing: Swipe Right = Next, Swipe Left = Previous, Swipe Down = Close
   - Mini Player: Swipe Up = Open fullscreen
   Exposes: window.Swipe
================================================================== */

window.Swipe = (function () {

    /* Config */
    var SWIPE_MIN_DISTANCE = 60;   /* Minimum px to count as swipe */
    var SWIPE_MAX_TIME = 600;      /* Max time (ms) for swipe */
    var DIRECTION_RATIO = 1.3;     /* Horizontal must be > vertical * ratio */

    /* ================================================================
       CORE — Detect swipe on an element
    ================================================================ */
    function detectSwipe(el, callbacks) {
        if (!el) return null;
        callbacks = callbacks || {};

        var startX = 0, startY = 0;
        var startTime = 0;
        var tracking = false;

        function onStart(e) {
            if (!e.touches || e.touches.length !== 1) {
                tracking = false;
                return;
            }
            var touch = e.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;
            startTime = Date.now();
            tracking = true;
        }

        function onEnd(e) {
            if (!tracking) return;
            tracking = false;

            if (!e.changedTouches || e.changedTouches.length !== 1) return;
            var touch = e.changedTouches[0];

            var deltaX = touch.clientX - startX;
            var deltaY = touch.clientY - startY;
            var elapsed = Date.now() - startTime;

            /* Too slow — ignore */
            if (elapsed > SWIPE_MAX_TIME) return;

            var absX = Math.abs(deltaX);
            var absY = Math.abs(deltaY);

            /* ---------- HORIZONTAL ---------- */
            if (absX > absY * DIRECTION_RATIO && absX > SWIPE_MIN_DISTANCE) {
                if (deltaX > 0) {
                    /* Swipe RIGHT */
                    if (callbacks.onRight) callbacks.onRight(e);
                } else {
                    /* Swipe LEFT */
                    if (callbacks.onLeft) callbacks.onLeft(e);
                }
                return;
            }

            /* ---------- VERTICAL ---------- */
            if (absY > absX * DIRECTION_RATIO && absY > SWIPE_MIN_DISTANCE) {
                if (deltaY > 0) {
                    /* Swipe DOWN */
                    if (callbacks.onDown) callbacks.onDown(e);
                } else {
                    /* Swipe UP */
                    if (callbacks.onUp) callbacks.onUp(e);
                }
            }
        }

        function onCancel() {
            tracking = false;
        }

        el.addEventListener('touchstart', onStart, { passive: true });
        el.addEventListener('touchend', onEnd, { passive: true });
        el.addEventListener('touchcancel', onCancel, { passive: true });

        return function destroy() {
            el.removeEventListener('touchstart', onStart);
            el.removeEventListener('touchend', onEnd);
            el.removeEventListener('touchcancel', onCancel);
        };
    }

    /* ================================================================
       1. NOW PLAYING — Swipe Right, Left, Down
    ================================================================ */
    function setupNowPlayingSwipes() {
        var np = document.getElementById('now-playing-fullscreen');
        if (!np) {
            console.log('[Swipe] Now Playing element not found');
            return;
        }

        detectSwipe(np, {
            /* 👉 Swipe RIGHT = NEXT song */
            onRight: function () {
                console.log('[Swipe] Now Playing: RIGHT → Next');
                var nextBtn = document.getElementById('np-next-btn');
                if (nextBtn) {
                    nextBtn.click();
                } else if (window.Player && window.Player.next) {
                    window.Player.next();
                }
            },

            /* 👈 Swipe LEFT = PREVIOUS song */
            onLeft: function () {
                console.log('[Swipe] Now Playing: LEFT → Previous');
                var prevBtn = document.getElementById('np-prev-btn');
                if (prevBtn) {
                    prevBtn.click();
                } else if (window.Player && window.Player.prev) {
                    window.Player.prev();
                }
            },

            /* 👇 Swipe DOWN = CLOSE fullscreen */
            onDown: function () {
                console.log('[Swipe] Now Playing: DOWN → Close');
                var closeBtn = document.getElementById('np-close-btn');
                if (closeBtn) {
                    closeBtn.click();
                } else if (window.NowPlaying && window.NowPlaying.close) {
                    window.NowPlaying.close();
                }
            }
        });

        console.log('[Swipe] ✅ Now Playing swipes ready (Right/Left/Down)');
    }

    /* ================================================================
       2. MINI PLAYER — Swipe Up = Open fullscreen
    ================================================================ */
    function setupMiniPlayerSwipes() {
        var mini = document.getElementById('mini-player');
        if (!mini) {
            console.log('[Swipe] Mini player element not found');
            return;
        }

        detectSwipe(mini, {
            /* ☝️ Swipe UP = OPEN fullscreen */
            onUp: function () {
                console.log('[Swipe] Mini Player: UP → Open fullscreen');
                if (window.NowPlaying && window.NowPlaying.open) {
                    window.NowPlaying.open();
                } else {
                    /* Fallback: click player-left */
                    var playerLeft = document.getElementById('mini-player-left');
                    if (playerLeft) playerLeft.click();
                }
            }
        });

        console.log('[Swipe] ✅ Mini player swipe ready (Up)');
    }

    /* ================================================================
       INIT
    ================================================================ */
    function init() {
        /* Only enable on touch devices */
        var isTouchDevice = ('ontouchstart' in window) ||
            (navigator.maxTouchPoints > 0) ||
            (navigator.msMaxTouchPoints > 0);

        if (!isTouchDevice) {
            console.log('[Swipe] Desktop detected — swipes disabled');
            return;
        }

        /* Wait for DOM to be fully ready */
        setTimeout(function () {
            setupNowPlayingSwipes();
            setupMiniPlayerSwipes();
            console.log('[Swipe] ✅ All swipe gestures initialized');
        }, 500);
    }

    return {
        init: init,
        detect: detectSwipe
    };
})();