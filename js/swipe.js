/* ==================================================================
   SWIPE.JS — Touch swipe gestures for mobile (improved)
   Exposes: window.Swipe
================================================================== */

window.Swipe = (function () {

    var SWIPE_MIN_DISTANCE = 50;
    var SWIPE_MAX_TIME = 700;
    var DIRECTION_RATIO = 1.2;

    /* ================================================================
       CORE DETECT
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

            if (elapsed > SWIPE_MAX_TIME) return;

            var absX = Math.abs(deltaX);
            var absY = Math.abs(deltaY);

            console.log('[Swipe] deltaX:', deltaX.toFixed(0), 'deltaY:', deltaY.toFixed(0), 'time:', elapsed + 'ms');

            /* HORIZONTAL */
            if (absX > absY * DIRECTION_RATIO && absX > SWIPE_MIN_DISTANCE) {
                if (deltaX > 0) {
                    if (callbacks.onRight) callbacks.onRight(e);
                } else {
                    if (callbacks.onLeft) callbacks.onLeft(e);
                }
                return;
            }

            /* VERTICAL */
            if (absY > absX * DIRECTION_RATIO && absY > SWIPE_MIN_DISTANCE) {
                if (deltaY > 0) {
                    if (callbacks.onDown) callbacks.onDown(e);
                } else {
                    if (callbacks.onUp) callbacks.onUp(e);
                }
            }
        }

        function onCancel() { tracking = false; }

        el.addEventListener('touchstart', onStart, { passive: true });
        el.addEventListener('touchend', onEnd, { passive: true });
        el.addEventListener('touchcancel', onCancel, { passive: true });

        console.log('[Swipe] Attached to:', el.id || el.className);

        return function destroy() {
            el.removeEventListener('touchstart', onStart);
            el.removeEventListener('touchend', onEnd);
            el.removeEventListener('touchcancel', onCancel);
        };
    }

    /* ================================================================
       1. NOW PLAYING — Right, Left, Down
    ================================================================ */
    function setupNowPlayingSwipes() {
        var np = document.getElementById('now-playing-fullscreen');
        if (!np) {
            console.warn('[Swipe] Now Playing not found');
            return;
        }

        detectSwipe(np, {
            onRight: function () {
                console.log('[Swipe] RIGHT → Next');
                var btn = document.getElementById('np-next-btn');
                if (btn) btn.click();
            },
            onLeft: function () {
                console.log('[Swipe] LEFT → Previous');
                var btn = document.getElementById('np-prev-btn');
                if (btn) btn.click();
            },
            onDown: function () {
                console.log('[Swipe] DOWN → Close');
                var btn = document.getElementById('np-close-btn');
                if (btn) btn.click();
            }
        });
    }

    /* ================================================================
       2. MINI PLAYER — Up
    ================================================================ */
    function setupMiniPlayerSwipes() {
        var mini = document.getElementById('mini-player');
        if (!mini) {
            console.warn('[Swipe] Mini player not found');
            return;
        }

        detectSwipe(mini, {
            onUp: function () {
                console.log('[Swipe] UP → Open fullscreen');
                if (window.NowPlaying && window.NowPlaying.open) {
                    window.NowPlaying.open();
                } else {
                    var left = document.getElementById('mini-player-left');
                    if (left) left.click();
                }
            }
        });
    }

    /* ================================================================
       INIT
    ================================================================ */
    function init() {
        var isTouchDevice = ('ontouchstart' in window) ||
            (navigator.maxTouchPoints > 0) ||
            (navigator.msMaxTouchPoints > 0);

        console.log('[Swipe] Touch device:', isTouchDevice);

        if (!isTouchDevice) {
            console.log('[Swipe] Desktop — skipping');
            return;
        }

        /* Setup after DOM ready */
        setTimeout(function () {
            setupNowPlayingSwipes();
            setupMiniPlayerSwipes();
            console.log('[Swipe] ✅ Initialized');
        }, 500);
    }

    return {
        init: init,
        detect: detectSwipe
    };
})();