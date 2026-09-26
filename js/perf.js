/* ==================================================================
   PERF.JS — Performance optimizer (SAFE VERSION)
   Only silence logs + passive events + lazy images
   Does NOT override any native functions
   Exposes: window.Perf
================================================================== */

window.Perf = (function () {

    /* ================================================================
       🔇 SILENCE CONSOLE LOGS
    ================================================================ */
       function silenceLogs() {
        /* Save originals */
        window.__originalConsoleLog = console.log;
        window.__originalConsoleInfo = console.info;

        /* Silence after a small delay — so all modules load */
        setTimeout(function () {
            console.log = function () {};
            console.info = function () {};
        }, 1000);

        /* Show confirm */
        window.__originalConsoleLog('%c⚡ [Perf] Safe mode active', 'color:#4ade80;font-weight:bold;font-size:13px');
    }

    /* ================================================================
       🚀 PASSIVE EVENTS — everywhere
    ================================================================ */
    function makePassiveEvents() {
        var origAdd = EventTarget.prototype.addEventListener;
        EventTarget.prototype.addEventListener = function (type, listener, options) {
            if (type === 'touchstart' || type === 'touchmove' || type === 'touchend' ||
                type === 'scroll' || type === 'wheel' || type === 'mousewheel') {
                if (typeof options === 'object' && options !== null) {
                    options.passive = true;
                } else {
                    options = { passive: true };
                }
            }
            return origAdd.call(this, type, listener, options);
        };
    }

    /* ================================================================
       🖼️ LAZY IMAGES
    ================================================================ */
    function enableLazyImages() {
        function optimizeImg(img) {
            if (!img.loading) img.loading = 'lazy';
            if (!img.decoding) img.decoding = 'async';
        }

        document.querySelectorAll('img').forEach(optimizeImg);

        var imgObserver = new MutationObserver(function (mutations) {
            mutations.forEach(function (m) {
                m.addedNodes.forEach(function (node) {
                    if (node.nodeType === 1) {
                        if (node.tagName === 'IMG') optimizeImg(node);
                        if (node.querySelectorAll) {
                            node.querySelectorAll('img').forEach(optimizeImg);
                        }
                    }
                });
            });
        });
        imgObserver.observe(document.body, { childList: true, subtree: true });
    }

    /* ================================================================
       🎬 GPU STYLES — only CSS, no JS interference
    ================================================================ */
    function injectGPUStyles() {
        var style = document.createElement('style');
        style.id = 'perf-gpu-styles';
        style.textContent = `
            /* GPU acceleration for animated elements (NO SIDEBAR) */
            .music-card,
            .song-row,
            .playlist-mini,
            .library-item,
            .artist-card,
            .followed-card,
            .card-art,
            .suggestion-item,
            .library-song-item {
                transform: translateZ(0);
                backface-visibility: hidden;
            }

            /* Contain layout/paint */
            .music-card,
            .song-row,
            .card-art,
            .song-thumb,
            .playlist-mini,
            .library-item,
            .artist-card,
            .followed-card,
            .suggestion-item,
            .suggestion-thumb {
                contain: layout paint style;
            }

            /* Lazy images */
            img {
                decoding: async;
            }

            /* Smooth transitions */
            .music-card,
            .song-row,
            .playlist-mini,
            .library-item,
            .artist-card {
                transition-property: transform, opacity, background-color, border-color !important;
                transition-timing-function: cubic-bezier(0.22, 1, 0.36, 1) !important;
                transition-duration: 0.2s !important;
            }

            /* GPU layers for fixed elements */
            .player-dock,
            .mobile-bottom-nav {
                transform: translateZ(0);
                will-change: transform;
            }

            /* Smooth scroll */
            html { scroll-behavior: smooth; }
            body {
                -webkit-overflow-scrolling: touch;
                overscroll-behavior-y: contain;
            }

            /* Reduced motion */
            @media (prefers-reduced-motion: reduce) {
                *, *::before, *::after {
                    animation-duration: 0.01ms !important;
                    transition-duration: 0.01ms !important;
                }
            }

            /* Content visibility for long lists */
            .song-list,
            .music-grid,
            .library-tab-content,
            .artist-songs-list,
            .liked-list {
                content-visibility: auto;
                contain-intrinsic-size: 1px 500px;
            }

            /* Prevent text selection during tap */
            .song-row,
            .music-card,
            .playlist-mini,
            .library-item {
                user-select: none;
                -webkit-user-select: none;
            }
        `;
        document.head.appendChild(style);
    }

    /* ================================================================
       🚦 SCROLL OPTIMIZATION
    ================================================================ */
    function optimizeScroll() {
        var ticking = false;
        window.addEventListener('scroll', function () {
            if (!ticking) {
                ticking = true;
                requestAnimationFrame(function () {
                    ticking = false;
                });
            }
        }, { passive: true });
    }

    /* ================================================================
       📊 FPS MONITOR (for debugging)
    ================================================================ */
    function setupFPSMonitor() {
        var frames = 0;
        var lastTime = performance.now();
        var samples = [];

        function tick(timestamp) {
            frames++;
            var elapsed = timestamp - lastTime;
            if (elapsed >= 1000) {
                var fps = Math.round((frames * 1000) / elapsed);
                samples.push(fps);
                if (samples.length > 60) samples.shift();
                frames = 0;
                lastTime = timestamp;
                window.__fps = fps;
                window.__avgFps = Math.round(samples.reduce((a, b) => a + b, 0) / samples.length);
            }
            requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    }

    /* ================================================================
       INIT
    ================================================================ */
    function init() {
        try { silenceLogs(); } catch (e) {}
        try { makePassiveEvents(); } catch (e) {}
        try { injectGPUStyles(); } catch (e) {}
        try { enableLazyImages(); } catch (e) {}
        try { optimizeScroll(); } catch (e) {}
        try { setupFPSMonitor(); } catch (e) {}
    }

    /* ================================================================
       PUBLIC API
    ================================================================ */
    return {
        init: init,
        getFPS: function () { return window.__fps || 0; },
        getAvgFPS: function () { return window.__avgFps || 0; },
        restoreLogs: function () {
            if (window.__originalConsoleLog) console.log = window.__originalConsoleLog;
            if (window.__originalConsoleInfo) console.info = window.__originalConsoleInfo;
        }
    };
})();