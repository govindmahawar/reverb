/* ==================================================================
   SETTINGS.JS — Settings page (theme, language, quality, accent)
   Exposes: window.Settings
================================================================== */

window.Settings = (function () {

    const STORAGE_KEY = 'reverb_settings';

    const DEFAULT_SETTINGS = {
        theme: 'dark',
        language: 'en',
        quality: 'normal',
        crossfade: false,
        autoplay: true,
        accent: '#8b7ab8'
    };

    let current = { ...DEFAULT_SETTINGS };

    /* ---------- Load ---------- */
    function load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) current = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
        } catch (e) {}
        return current;
    }

    /* ---------- Save ---------- */
    function save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
        } catch (e) {}
        applyTheme();
    }

    /* ---------- Hex helpers ---------- */
    function hexToRgb(hex) {
        const h = (hex || '#8b7ab8').replace('#', '');
        const bigint = parseInt(h.length === 3
            ? h.split('').map(c => c + c).join('')
            : h, 16);
        return `${(bigint >> 16) & 255}, ${(bigint >> 8) & 255}, ${bigint & 255}`;
    }

    function adjustHex(hex, percent) {
        const h = (hex || '#8b7ab8').replace('#', '');
        const num = parseInt(h.length === 3
            ? h.split('').map(c => c + c).join('')
            : h, 16);
        let r = (num >> 16) & 255;
        let g = (num >> 8) & 255;
        let b = num & 255;
        const amt = Math.round(2.55 * percent);
        r = Math.max(0, Math.min(255, r + amt));
        g = Math.max(0, Math.min(255, g + amt));
        b = Math.max(0, Math.min(255, b + amt));
        return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
    }

    /* ---------- Apply theme + accent ---------- */
    function applyTheme() {
        document.body.classList.remove('theme-darker', 'theme-purple', 'theme-light');
        if (current.theme === 'darker') document.body.classList.add('theme-darker');
        else if (current.theme === 'purple') document.body.classList.add('theme-purple');
        else if (current.theme === 'light') document.body.classList.add('theme-light');

        const root = document.documentElement;
        const accent = current.accent || '#8b7ab8';
        root.style.setProperty('--accent', accent);
        root.style.setProperty('--accent-rgb', hexToRgb(accent));
        root.style.setProperty('--accent-light', adjustHex(accent, 25));
        root.style.setProperty('--accent-dark', adjustHex(accent, -15));

        console.log('[Settings] Theme applied:', current.theme, '| Accent:', accent);
    }

    /* ---------- Sync form controls ---------- */
    function syncForm() {
        const themeSel = document.getElementById('setting-theme');
        const langSel = document.getElementById('setting-language');
        const qualitySel = document.getElementById('setting-quality');
        const crossfadeChk = document.getElementById('setting-crossfade');
        const autoplayChk = document.getElementById('setting-autoplay');

        if (themeSel) themeSel.value = current.theme;
        if (langSel) langSel.value = current.language;
        if (qualitySel) qualitySel.value = current.quality;
        if (crossfadeChk) crossfadeChk.checked = !!current.crossfade;
        if (autoplayChk) autoplayChk.checked = !!current.autoplay;

        /* Accent swatches active state */
        const accent = (current.accent || '#8b7ab8').toLowerCase();
        document.querySelectorAll('.accent-swatch').forEach(sw => {
            const color = (sw.getAttribute('data-accent') || '').toLowerCase();
            sw.classList.toggle('active', color === accent);
        });

        const customInput = document.getElementById('setting-accent-custom');
        if (customInput) customInput.value = current.accent || '#8b7ab8';
    }

    /* ---------- Open page ---------- */
    function openPage() {
        syncForm();
        if (window.Pages) window.Pages.navigate('settings');
    }

    /* ---------- Wire up accent swatches ---------- */
    function wireAccentSwatches() {
        const swatches = document.querySelectorAll('.accent-swatch');
        console.log('[Settings] Wiring', swatches.length, 'accent swatches');

        swatches.forEach(sw => {
            /* Prevent double-binding */
            if (sw._accentBound) return;
            sw._accentBound = true;

            sw.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const color = sw.getAttribute('data-accent');
                console.log('[Settings] Accent swatch clicked:', color);
                if (!color) return;

                current.accent = color;
                save();
                syncForm();

                if (window.BottomNav && window.BottomNav.showToast) {
                    window.BottomNav.showToast('Accent updated 🎨');
                }
            });
        });

        /* Custom color picker */
        const customInput = document.getElementById('setting-accent-custom');
        if (customInput && !customInput._accentBound) {
            customInput._accentBound = true;

            customInput.addEventListener('input', (e) => {
                const color = e.target.value;
                console.log('[Settings] Custom accent picked:', color);
                current.accent = color;
                save();

                /* Remove active from preset swatches */
                document.querySelectorAll('.accent-swatch').forEach(s => s.classList.remove('active'));
            });
        }

        /* Reset button */
        const resetAccentBtn = document.getElementById('setting-accent-reset');
        if (resetAccentBtn && !resetAccentBtn._accentBound) {
            resetAccentBtn._accentBound = true;

            resetAccentBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const DEFAULT_ACCENT = '#8b7ab8';
                current.accent = DEFAULT_ACCENT;
                save();
                syncForm();

                console.log('[Settings] Accent reset to default:', DEFAULT_ACCENT);

                if (window.BottomNav && window.BottomNav.showToast) {
                    window.BottomNav.showToast('Accent reset to default 🎨');
                }
            });
        }
    }

    /* ---------- Init ---------- */
    function init() {
        load();
        applyTheme();
        syncForm();

        /* Wire up selects and checkboxes */
        const themeSel = document.getElementById('setting-theme');
        const langSel = document.getElementById('setting-language');
        const qualitySel = document.getElementById('setting-quality');
        const crossfadeChk = document.getElementById('setting-crossfade');
        const autoplayChk = document.getElementById('setting-autoplay');
        const resetBtn = document.getElementById('settings-reset-btn');
        const backBtn = document.getElementById('settings-back');

        if (themeSel) {
            themeSel.addEventListener('change', (e) => {
                current.theme = e.target.value;
                save();
                if (window.BottomNav && window.BottomNav.showToast) {
                    window.BottomNav.showToast(`Theme: ${e.target.value}`);
                }
            });
        }

        if (langSel) {
            langSel.addEventListener('change', (e) => {
                current.language = e.target.value;
                save();
                if (window.BottomNav && window.BottomNav.showToast) {
                    window.BottomNav.showToast(`Language: ${e.target.options[e.target.selectedIndex].text}`);
                }
            });
        }

        if (qualitySel) {
            qualitySel.addEventListener('change', (e) => {
                current.quality = e.target.value;
                save();
                if (window.BottomNav && window.BottomNav.showToast) {
                    window.BottomNav.showToast(`Quality: ${e.target.value}`);
                }
            });
        }

        if (crossfadeChk) {
            crossfadeChk.addEventListener('change', (e) => {
                current.crossfade = e.target.checked;
                save();
            });
        }

        if (autoplayChk) {
            autoplayChk.addEventListener('change', (e) => {
                current.autoplay = e.target.checked;
                save();
            });
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                current = { ...DEFAULT_SETTINGS };
                save();
                syncForm();
                if (window.BottomNav && window.BottomNav.showToast) {
                    window.BottomNav.showToast('Settings reset ✓');
                }
            });
        }

        if (backBtn) {
            backBtn.addEventListener('click', () => {
                if (window.Pages) window.Pages.navigate('home');
            });
        }

        /* Wire accent swatches */
        wireAccentSwatches();

        console.log('[Settings] Init complete. Accent:', current.accent);
    }

    return {
        init,
        openPage,
        get: () => current,
        set: (s) => { current = { ...current, ...s }; save(); syncForm(); },
        applyTheme
    };
})();