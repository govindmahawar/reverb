/* ==================================================================
   GITHUB-SYNC.JS — Optional GitHub sync (disabled — using Firebase)
   Exposes: window.GitHubSync
================================================================== */

window.GitHubSync = (function () {

    var CONFIG_KEY = 'reverb_github_config';

    function loadConfig() {
        try {
            var raw = localStorage.getItem(CONFIG_KEY);
            if (raw) return JSON.parse(raw) || {};
        } catch (e) {}
        return {};
    }

    function getConfig() {
        var c = loadConfig();
        return {
            user: c.user || '',
            repo: c.repo || '',
            branch: c.branch || 'main',
            token: c.token || ''
        };
    }

    function isConfigured() {
        var c = getConfig();
        return !!(c.user && c.repo && c.branch);
    }

    function canPush() {
        var c = getConfig();
        return !!(c.user && c.repo && c.branch && c.token);
    }

    function init() {
        console.log('[GitHubSync] Loaded (disabled — using Firebase)');
    }

    return {
        init: init,
        getConfig: getConfig,
        isConfigured: isConfigured,
        canPush: canPush
    };
})();