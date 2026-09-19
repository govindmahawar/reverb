/* ==================================================================
   SEARCH.JS — Live search with suggestions
   Desktop : topbar #search-input
   Mobile  : #mobile-search-input in Search page
   Exposes : window.Search → { init, filter, clear, showSuggestions }
================================================================== */

window.Search = (function () {
    let noResultsMsg;

    /* ----------------------------------------------------------------
       Ensure "no results" message element exists
    ---------------------------------------------------------------- */
    function ensureNoResultsMsg() {
        noResultsMsg = document.querySelector('.no-results-msg');
        if (!noResultsMsg) {
            noResultsMsg = document.createElement('div');
            noResultsMsg.className = 'no-results-msg';
            noResultsMsg.textContent = 'No songs or artists found matching your search.';
            const mainContent = document.querySelector('.main-content');
            if (mainContent) mainContent.appendChild(noResultsMsg);
        }
    }

    /* ----------------------------------------------------------------
       Escape HTML to avoid XSS
    ---------------------------------------------------------------- */
    function escapeHTML(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /* ----------------------------------------------------------------
       Highlight the matching substring in a text
    ---------------------------------------------------------------- */
    function highlight(text, query) {
        if (!query) return escapeHTML(text);
        const safeText = escapeHTML(text);
        const safeQuery = escapeHTML(query);
        const regex = new RegExp(`(${safeQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig');
        return safeText.replace(regex, '<mark>$1</mark>');
    }

    /* ----------------------------------------------------------------
       Build suggestion HTML from the tracks array
    ---------------------------------------------------------------- */
    function buildSuggestions(query) {
        const tracks = window.tracks || [];
        const q = query.toLowerCase().trim();

        /* Filter by title / artist / album */
        const matches = tracks.filter(t =>
            t.title.toLowerCase().includes(q) ||
            t.artist.toLowerCase().includes(q) ||
            (t.album && t.album.toLowerCase().includes(q))
        ).slice(0, 8); /* Limit to 8 suggestions */

        if (!matches.length) {
            return `
                <div class="search-suggestions-empty">
                    <i class="fas fa-magnifying-glass"></i>
                    <p>No results for "<strong>${escapeHTML(query)}</strong>"</p>
                    <span>Try a different song or artist name</span>
                </div>
            `;
        }

        return `
            <div class="search-suggestions-title">Top results</div>
            ${matches.map(track => `
                <div class="suggestion-item" data-track-id="${track.id}" role="button" tabindex="0">
                    <div class="suggestion-thumb">
                        <img src="${track.art}" alt="${escapeHTML(track.title)}" loading="lazy">
                    </div>
                    <div class="suggestion-info">
                        <span class="suggestion-title">${highlight(track.title, query)}</span>
                        <span class="suggestion-artist">
                            <i class="fas fa-user"></i>${highlight(track.artist, query)}
                        </span>
                    </div>
                    <div class="suggestion-play">
                        <i class="fas fa-play"></i>
                    </div>
                </div>
            `).join('')}
        `;
    }

    /* ----------------------------------------------------------------
       Show suggestions inside #search-suggestions
    ---------------------------------------------------------------- */
    function showSuggestions(query) {
        const container = document.getElementById('search-suggestions');
        const searchPage = document.getElementById('search-page');
        if (!container) return;

        const q = (query || '').trim();

        if (!q) {
            container.classList.remove('visible');
            container.innerHTML = '';
            if (searchPage) searchPage.classList.remove('has-suggestions');
            return;
        }

        container.innerHTML = buildSuggestions(q);
        container.classList.add('visible');
        if (searchPage) searchPage.classList.add('has-suggestions');

        /* Bind clicks on each suggestion */
        container.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                const trackId = parseInt(item.getAttribute('data-track-id'), 10);
                const tracks = window.tracks || [];
                const idx = tracks.findIndex(t => t.id === trackId);
                if (idx !== -1 && window.Player) {
                    window.Player.loadTrack(idx, true);
                }
            });

            /* Keyboard support (Enter) */
            item.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    item.click();
                }
            });
        });
    }

    /* ----------------------------------------------------------------
       Main filter — filters home content + updates suggestions
    ---------------------------------------------------------------- */
    function filter(query) {
        query = (query || '').toLowerCase().trim();
        let totalMatches = 0;

        /* ---- Music cards ---- */
        document.querySelectorAll('.music-card').forEach(card => {
            const title = card.querySelector('.card-title')?.textContent.toLowerCase() || '';
            const artist = card.querySelector('.card-artist')?.textContent.toLowerCase() || '';
            if (title.includes(query) || artist.includes(query)) {
                card.style.display = '';
                totalMatches++;
            } else {
                card.style.display = 'none';
            }
        });

        /* ---- Song rows ---- */
        document.querySelectorAll('.song-row').forEach(row => {
            const title = row.querySelector('.song-title')?.textContent.toLowerCase() || '';
            const artist = row.querySelector('.song-artist')?.textContent.toLowerCase() || '';
            const album = row.querySelector('.song-album')?.textContent.toLowerCase() || '';
            if (title.includes(query) || artist.includes(query) || album.includes(query)) {
                row.style.display = '';
                totalMatches++;
            } else {
                row.style.display = 'none';
            }
        });

        /* ---- No-results message (only on home page, not on search page) ---- */
        const searchPageActive = document.body.classList.contains('page-search');
        if (!searchPageActive) {
            if (query.length > 0 && totalMatches === 0) {
                noResultsMsg.style.display = 'block';
            } else {
                noResultsMsg.style.display = 'none';
            }
        } else {
            noResultsMsg.style.display = 'none';
        }

        /* ---- Live suggestions ---- */
        showSuggestions(query);
    }

    /* ----------------------------------------------------------------
       Clear inputs and hide suggestions
    ---------------------------------------------------------------- */
    function clear() {
        const desktopInput = document.getElementById('search-input');
        if (desktopInput) desktopInput.value = '';

        const mobileInput = document.getElementById('mobile-search-input');
        if (mobileInput) mobileInput.value = '';

        const mobileClearBtn = document.getElementById('mobile-search-clear');
        if (mobileClearBtn) mobileClearBtn.classList.remove('visible');

        /* Hide suggestions */
        const container = document.getElementById('search-suggestions');
        if (container) {
            container.classList.remove('visible');
            container.innerHTML = '';
        }
        const searchPage = document.getElementById('search-page');
        if (searchPage) searchPage.classList.remove('has-suggestions');

        filter('');
    }

    /* ----------------------------------------------------------------
       Init — bind desktop input; mobile input is bound by BottomNav
    ---------------------------------------------------------------- */
    function init() {
        ensureNoResultsMsg();

        const desktopInput = document.getElementById('search-input');
        if (desktopInput) {
            desktopInput.addEventListener('input', (e) => filter(e.target.value));
        }

        /* Mobile input (#mobile-search-input) is bound in bottom-nav.js */
    }

    /* ----------------------------------------------------------------
       Public API
    ---------------------------------------------------------------- */
    return {
        init,
        filter,
        clear,
        showSuggestions
    };
})();