/* ==================================================================
   SEARCH.JS — Live search filter (desktop topbar + mobile inline)
   Exposes: window.Search
================================================================== */

window.Search = (function () {
    let noResultsMsg;
    let mobileSearchInput = null;

    /* ---------- Create a mobile search pill below the topbar ---------- */
    function createMobileSearch() {
        const topbar = document.querySelector('.topbar');
        if (!topbar) return;

        /* Avoid duplicates */
        if (document.querySelector('.mobile-search-pill')) return;

        const pill = document.createElement('div');
        pill.className = 'search-pill mobile-search-pill';
        pill.innerHTML = `
            <i class="fas fa-magnifying-glass"></i>
            <input type="text" id="mobile-search-input"
                   placeholder="Search songs, artists, albums...">
        `;
        topbar.insertAdjacentElement('afterend', pill);

        mobileSearchInput = pill.querySelector('input');
        mobileSearchInput.addEventListener('input', (e) => filter(e.target.value));
    }

    /* ---------- No-results message ---------- */
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

    /* ---------- Filter logic ---------- */
    function filter(query) {
        query = (query || '').toLowerCase().trim();
        let totalMatches = 0;

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

        if (query.length > 0 && totalMatches === 0) {
            noResultsMsg.style.display = 'block';
        } else {
            noResultsMsg.style.display = 'none';
        }
    }

    function clear() {
        const dInput = document.getElementById('search-input');
        if (dInput) dInput.value = '';
        if (mobileSearchInput) mobileSearchInput.value = '';
        filter('');
    }

    /* ---------- Init ---------- */
    function init() {
        ensureNoResultsMsg();

        /* Desktop input */
        const desktopInput = document.getElementById('search-input');
        if (desktopInput) {
            desktopInput.addEventListener('input', (e) => filter(e.target.value));
        }

        /* Mobile input — create it only on small screens */
        if (window.matchMedia('(max-width: 768px)').matches) {
            createMobileSearch();
        }

        /* If user resizes to mobile, create it */
        window.addEventListener('resize', () => {
            if (window.matchMedia('(max-width: 768px)').matches) {
                createMobileSearch();
            }
        });
    }

    return { init, filter, clear };
})();