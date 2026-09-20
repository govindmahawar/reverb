/* ==================================================================
   SETTINGS.JS — Settings page
   - Theme, Language, Quality, Crossfade, Autoplay
   - Persist to localStorage
   - Apply theme immediately
   Exposes: window.Settings
================================================================== */

window.Settings = (function () {

    const STORAGE_KEY = 'reverb_settings';

    const DEFAULT_SETTINGS = {
        theme: 'dark',
        language: 'en',
        quality: 'normal',
        crossfade: false,
        autoplay: true
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

    /* ---------- Apply theme ---------- */
    function applyTheme() {
        document.body.classList.remove('theme-darker', 'theme-purple');
        if (current.theme === 'darker') document.body.classList.add('theme-darker');
        else if (current.theme === 'purple') document.body.classList.add('theme-purple');
    }

    /* ---------- Sync form controls with stored values ---------- */
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
    }

    /* ---------- Open page ---------- */
    function openPage() {
        syncForm();
        if (window.Pages) {
            window.Pages.navigate('settings');
        }
    }

    /* ---------- Init ---------- */
    function init() {
        load();
        applyTheme();
        syncForm();

        /* Wire up inputs */
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

        console.log('[Settings] Loaded. Theme:', current.theme, '| Quality:', current.quality);
    }

    return {
        init,
        openPage,
        get: () => current,
        set: (s) => { current = { ...current, ...s }; save(); syncForm(); }
    };
})();