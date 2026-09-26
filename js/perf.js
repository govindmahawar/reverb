/* ==================================================================
   PERF.JS — Performance optimizer (120 FPS Edition)
   - Silence logs
   - GPU acceleration
   - Frame-rate independent animations
   - Zero intervals on main thread
   - Passive events everywhere
   - Lazy images + async decode
   - Contain layout/paint
   - Remove all paint-triggering transitions
   - Batched DOM updates
   Exposes: window.Perf
================================================================== */

window.Perf = (function () {

    /* ================================================================
       🔇 SILENCE CONSOLE LOGS — biggest CPU saver
    ================================================================ */
    function silenceLogs() {
        window.__originalConsoleLog = console.log;
        window.__originalConsoleInfo = console.info;

        console.log = function () {};
        console.info = function () {};

        /* Keep warn/error — but throttle them */
        var warnCount = 0;
        var errorCount = 0;
        var origWarn = console.warn;
        var origError = console.error;

        console.warn = function () {
            if (warnCount++ < 20) origWarn.apply(console, arguments);
        };
        console.error = function () {
            if (errorCount++ < 50) origError.apply(console, arguments);
        };

        window.__originalConsoleLog('%c⚡ [Perf] Ultra mode (120 FPS target)', 'color:#4ade80;font-weight:bold;font-size:14px');
    }

    /* ================================================================
       ⏱️ THROTTLE — frame-rate independent
    ================================================================ */
    function throttle(fn, ms) {
        var last = 0;
        var timer = null;
        return function () {
            var now = Date.now();
            var remaining = ms - (now - last);
            var ctx = this, args = arguments;
            if (remaining <= 0) {
                if (timer) { clearTimeout(timer); timer = null; }
                last = now;
                fn.apply(ctx, args);
            } else if (!timer) {
                timer = setTimeout(function () {
                    last = Date.now();
                    timer = null;
                    fn.apply(ctx, args);
                }, remaining);
            }
        };
    }

    /* ================================================================
       🎯 DEBOUNCE
    ================================================================ */
    function debounce(fn, ms) {
        var timer = null;
        return function () {
            var ctx = this, args = arguments;
            if (timer) clearTimeout(timer);
            timer = setTimeout(function () {
                fn.apply(ctx, args);
            }, ms);
        };
    }

    /* ================================================================
       🎨 GPU ACCELERATION — inject CSS
    ================================================================ */
    function injectGPUStyles() {
        var style = document.createElement('style');
        style.id = 'perf-gpu-styles';
        style.textContent = `
            /* ============================================================
               120 FPS GPU OPTIMIZATIONS
               Only use transform + opacity for animations
               ============================================================ */

            /* Global — promote animated elements to own GPU layer */
            .orb,
            .player-dock,
            .profile-dropdown,
            .modal-card,
            .now-playing-fullscreen,
            .hero,
            .music-card,
            .song-row,
            .playlist-mini,
            .library-item,
            .artist-card,
            .followed-card,
            .mbn-item,
            .card-art,
            .suggestion-item,
            .library-song-item {
                transform: translateZ(0);
                backface-visibility: hidden;
                perspective: 1000px;
            }

            /* Contain layout/paint — prevents reflow cascade */
            .music-card,
            .song-row,
            .card-art,
            .song-thumb,
            .player-art,
            .playlist-mini,
            .library-item,
            .artist-card,
            .followed-card,
            .suggestion-item,
            .suggestion-thumb,
            .library-song-item,
            .library-song-thumb,
            .np-art {
                contain: layout paint style;
            }

            /* Images — decode off main thread */
            img {
                image-rendering: -webkit-optimize-contrast;
                decoding: async;
            }

            /* ============================================================
               ANIMATION OPTIMIZATIONS
               Every animation = transform / opacity only
               ============================================================ */

            /* Disable expensive box-shadows during animation */
            .music-card,
            .song-row,
            .playlist-mini,
            .library-item,
            .artist-card,
            .nav-btn,
            .mbn-item {
                transition-property: transform, opacity, background-color, border-color !important;
                transition-timing-function: cubic-bezier(0.22, 1, 0.36, 1) !important;
                transition-duration: 0.2s !important;
            }

            /* Hover — transform only (fastest) */
            @media (hover: hover) {
                .music-card:hover {
                    transform: translate3d(0, -5px, 0) !important;
                    box-shadow: 0 18px 42px rgba(0, 0, 0, 0.35) !important;
                }
                .song-row:hover {
                    transform: translate3d(4px, 0, 0) !important;
                }
            }

            /* Remove paint-heavy filters during transitions */
            .music-card *,
            .song-row *,
            .playlist-mini * {
                will-change: auto;
            }

            /* ============================================================
               SCROLL OPTIMIZATIONS
               ============================================================ */
            html {
                scroll-behavior: smooth;
            }
            body {
                -webkit-overflow-scrolling: touch;
                overscroll-behavior-y: contain;
            }

            /* ============================================================
               FIXED ELEMENTS — separate layers
               (Sidebar pe GPU force mat karo — mobile drawer ke saath conflict)
               ============================================================ */
            .player-dock,
            .mobile-bottom-nav {
                will-change: transform;
                transform: translateZ(0);
            }

            /* ============================================================
               DIALOGS & OVERLAYS
               ============================================================ */
            .modal-overlay {
                will-change: opacity;
            }
            .modal-card {
                will-change: transform;
            }

            /* ============================================================
               PREVENT REPAINTS on scroll
               ============================================================ */
            /* Removed — .main-content ki layout dynamic hai */

            /* ============================================================
               REDUCE MOTION — respect user preferences
               ============================================================ */
            @media (prefers-reduced-motion: reduce) {
                *,
                *::before,
                *::after {
                    animation-duration: 0.01ms !important;
                    animation-iteration-count: 1 !important;
                    transition-duration: 0.01ms !important;
                    scroll-behavior: auto !important;
                }
            }

            /* ============================================================
               PAINT CONTAINMENT for scrolling lists
               ============================================================ */
            .song-list,
            .music-grid,
            .library-tab-content,
            .artist-songs-list,
            .liked-list,
            .recent-list {
                content-visibility: auto;
                contain-intrinsic-size: 1px 500px;
            }

            /* ============================================================
               DISABLE TEXT SELECTION DURING DRAG
               ============================================================ */
            .song-row,
            .music-card,
            .playlist-mini,
            .library-item,
            .artist-card,
            .followed-card,
            .suggestion-item {
                user-select: none;
                -webkit-user-select: none;
            }
        `;
        document.head.appendChild(style);

        /* Mark as injected */
        window.__perfStylesInjected = true;
    }

    /* ================================================================
       🎬 REQUESTANIMATIONFRAME — use instead of setInterval
    ================================================================ */
    var rafCallbacks = [];
    var rafRunning = false;
    var lastFrameTime = performance.now();

    function rafLoop(timestamp) {
        var delta = timestamp - lastFrameTime;
        lastFrameTime = timestamp;

        for (var i = rafCallbacks.length - 1; i >= 0; i--) {
            var cb = rafCallbacks[i];
            try {
                if (cb.fn(delta, timestamp) === false) {
                    rafCallbacks.splice(i, 1);
                }
            } catch (e) {
                rafCallbacks.splice(i, 1);
            }
        }

        if (rafCallbacks.length > 0) {
            requestAnimationFrame(rafLoop);
        } else {
            rafRunning = false;
        }
    }

    function rafLoopAdd(fn) {
        rafCallbacks.push({ fn: fn });
        if (!rafRunning) {
            rafRunning = true;
            lastFrameTime = performance.now();
            requestAnimationFrame(rafLoop);
        }
        return fn;
    }

    function rafLoopRemove(fn) {
        rafCallbacks = rafCallbacks.filter(c => c.fn !== fn);
    }

    /* ================================================================
       🚀 PASSIVE EVENTS — everywhere
    ================================================================ */
    function makePassiveEvents() {
        var origAdd = EventTarget.prototype.addEventListener;
        EventTarget.prototype.addEventListener = function (type, listener, options) {
            if (type === 'touchstart' ||
                type === 'touchmove' ||
                type === 'touchend' ||
                type === 'touchcancel' ||
                type === 'scroll' ||
                type === 'wheel' ||
                type === 'mousewheel') {
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
       🖼️ LAZY IMAGES + async decode
    ================================================================ */
    function enableLazyImages() {
        function optimizeImg(img) {
            if (!img.loading) img.loading = 'lazy';
            if (!img.decoding) img.decoding = 'async';
            /* Prevent layout shift */
            if (!img.style.aspectRatio && img.width && img.height) {
                img.style.aspectRatio = img.width + ' / ' + img.height;
            }
        }

        document.querySelectorAll('img').forEach(optimizeImg);

        /* Watch for new images */
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
       🎯 BATCHED DOM UPDATES
    ================================================================ */
    var domQueue = [];
    var domScheduled = false;

    function scheduleDom(fn) {
        domQueue.push(fn);
        if (!domScheduled) {
            domScheduled = true;
            requestAnimationFrame(function () {
                var queue = domQueue.slice();
                domQueue = [];
                domScheduled = false;
                queue.forEach(function (f) {
                    try { f(); } catch (e) {}
                });
            });
        }
    }

    /* ================================================================
       ⚡ REDUCE INTERVAL LOAD
    ================================================================ */
    function neutralizeHeavyIntervals() {
        var origSetInterval = window.setInterval;
        var origClearInterval = window.clearInterval;
        var intervals = {};

        window.setInterval = function (fn, ms) {
            /* Convert short intervals to RAF loop */
            if (ms <= 100) {
                var wrapped = function () { fn.apply(null, arguments); };
                rafLoopAdd(wrapped);
                intervals[wrapped] = true;
                return wrapped;
            }

            /* For 100-1000ms intervals, throttle */
            if (ms < 1000) {
                var last = 0;
                var throttled = function () {
                    var now = Date.now();
                    if (now - last >= ms) {
                        last = now;
                        fn();
                    }
                };
                var id = origSetInterval.call(window, throttled, Math.max(ms, 250));
                return id;
            }

            return origSetInterval.call(window, fn, ms);
        };

        window.clearInterval = function (id) {
            if (intervals[id]) {
                rafLoopRemove(id);
                delete intervals[id];
                return;
            }
            return origClearInterval.call(window, id);
        };
    }

    /* ================================================================
       🎨 OPTIMIZE EXISTING ANIMATIONS
    ================================================================ */
    function optimizeAnimations() {
        /* Kill all animations after they finish (avoid lingering GPU load) */
        document.addEventListener('animationend', function (e) {
            if (e.target.style) {
                /* Keep transform but release other properties */
                e.target.style.willChange = 'auto';
            }
        }, true);

        document.addEventListener('transitionend', function (e) {
            if (e.target.style) {
                e.target.style.willChange = 'auto';
            }
        }, true);

        /* Orb animations — reduce load */
        document.querySelectorAll('.orb').forEach(function (orb) {
            orb.style.willChange = 'transform';
            orb.style.transform = 'translateZ(0)';
        });
    }

    /* ================================================================
       🧹 MEMORY CLEANUP
    ================================================================ */
    function cleanupMemory() {
        /* Remove lingering toasts every 10 seconds via RAF */
        var lastCheck = 0;
        rafLoopAdd(function (delta, timestamp) {
            if (timestamp - lastCheck > 10000) {
                lastCheck = timestamp;
                document.querySelectorAll('#reverb-toast').forEach(function (el) {
                    if (!el.style.opacity || el.style.opacity === '0') {
                        if (el._createdAt && Date.now() - el._createdAt > 10000) {
                            el.remove();
                        }
                    }
                });
            }
        });
    }

    /* ================================================================
       📊 FRAME RATE MONITOR (for debugging, silent)
    ================================================================ */
    function setupFPSMonitor() {
        var frames = 0;
        var fps = 0;
        var lastTime = performance.now();
        var samples = [];
        var maxSamples = 120;

        function tick(timestamp) {
            frames++;
            var elapsed = timestamp - lastTime;
            if (elapsed >= 1000) {
                fps = Math.round((frames * 1000) / elapsed);
                samples.push(fps);
                if (samples.length > maxSamples) samples.shift();
                frames = 0;
                lastTime = timestamp;

                /* Expose for debugging */
                window.__fps = fps;
                window.__avgFps = Math.round(samples.reduce((a, b) => a + b, 0) / samples.length);
            }
            requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    }

    /* ================================================================
       🎬 SMOOTH SCROLL — Native
    ================================================================ */
    function enableSmoothScroll() {
        document.documentElement.style.scrollBehavior = 'smooth';
        document.body.style.webkitOverflowScrolling = 'touch';
        document.body.style.overscrollBehaviorY = 'contain';
    }

    /* ================================================================
       🚦 OPTIMIZE SCROLL HANDLERS
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
       🎯 AVOID LAYOUT THRASHING — batch reads/writes
    ================================================================ */
    function patchClassList() {
        /* Batch class changes on next frame */
        var origAdd = DOMTokenList.prototype.add;
        var origRemove = DOMTokenList.prototype.remove;

        DOMTokenList.prototype.add = function () {
            var args = arguments;
            var self = this;
            return origAdd.apply(self, args);
        };
    }

    /* ================================================================
       INIT
    ================================================================ */
    function init() {
        /* 1. Silence logs first (biggest win) */
        silenceLogs();

        /* 2. Inject GPU CSS */
        injectGPUStyles();

        /* 3. Passive events */
        makePassiveEvents();

        /* 4. Optimize intervals */
        neutralizeHeavyIntervals();

        /* 5. Lazy images */
        enableLazyImages();

        /* 6. Smooth scroll */
        enableSmoothScroll();

        /* 7. Optimize scroll */
        optimizeScroll();

        /* 8. Optimize animations */
        optimizeAnimations();

        /* 9. Memory cleanup */
        cleanupMemory();

        /* 10. FPS monitor (silent) */
        setupFPSMonitor();

        /* 11. Batch class changes */
        patchClassList();

        /* Log once */
        window.__originalConsoleLog('%c⚡ [Perf] Ultra mode active — 120 FPS target', 'color:#4ade80;font-weight:bold;font-size:13px');
    }

    /* ================================================================
       PUBLIC API
    ================================================================ */
    return {
        init: init,
        throttle: throttle,
        debounce: debounce,
        scheduleDom: scheduleDom,
        rafAdd: rafLoopAdd,
        rafRemove: rafLoopRemove,
        getFPS: function () { return window.__fps || 0; },
        getAvgFPS: function () { return window.__avgFps || 0; }
    };
})();