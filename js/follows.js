/* ==================================================================
   FOLLOWS.JS — Artist follow/unfollow system (robust)
   - Toggle follow state
   - Persist in localStorage
   - Render "Following" page
   - Event delegation for clicks
   Exposes: window.Follows
================================================================== */

window.Follows = (function () {

    const STORAGE_KEY = 'reverb_followed_artists';

    /* ---------- Load / save ---------- */
    function load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const arr = JSON.parse(raw);
                return Array.isArray(arr) ? arr : [];
            }
        } catch (e) {}
        return [];
    }

    function save(list) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        } catch (e) {}
    }

    /* ---------- Public helpers ---------- */
    function isFollowing(name) {
        if (!name) return false;
        return load().some(a => a.name === name);
    }

    function follow(name, image) {
        if (!name) return;
        const list = load();
        if (list.some(a => a.name === name)) return;
        list.push({ name, image: image || '' });
        save(list);
        dispatchUpdate();
    }

    function unfollow(name) {
        if (!name) return;
        const list = load().filter(a => a.name !== name);
        save(list);
        dispatchUpdate();
    }

    function toggle(name, image) {
        if (!name) return false;
        if (isFollowing(name)) {
            unfollow(name);
            return false;
        } else {
            follow(name, image);
            return true;
        }
    }

    function dispatchUpdate() {
        try {
            window.dispatchEvent(new CustomEvent('follows:updated', { detail: load() }));
        } catch (e) {}
    }

    /* ---------- Render "Following" page ---------- */
    function render() {
        const grid = document.getElementById('followed-grid');
        const empty = document.getElementById('followed-empty');
        const countText = document.getElementById('followed-count-text');
        if (!grid) return;

        const list = load();

        if (!list.length) {
            grid.innerHTML = '';
            if (empty) empty.style.display = 'flex';
            if (countText) countText.textContent = '0 artists';
            return;
        }

        if (empty) empty.style.display = 'none';
        if (countText) countText.textContent = `${list.length} artist${list.length > 1 ? 's' : ''}`;

        grid.innerHTML = list.map(artist => `
            <div class="followed-card" data-artist-name="${artist.name}">
                <div class="followed-card-art">
                    <img src="${artist.image || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&h=200&fit=crop'}" alt="${artist.name}">
                </div>
                <span class="followed-card-name">${artist.name}</span>
                <span class="followed-card-meta">Artist</span>
            </div>
        `).join('');

        /* Click → open artist profile */
        grid.querySelectorAll('.followed-card').forEach(card => {
            card.addEventListener('click', () => {
                const name = card.getAttribute('data-artist-name');
                if (name && window.Pages && window.Pages.openArtistProfile) {
                    window.Pages.openArtistProfile(name, { from: 'followed' });
                }
            });
        });
    }

    /* ---------- Open "Following" page ---------- */
    function openPage() {
        render();
        if (window.Pages) window.Pages.navigate('followed');
    }

    /* ---------- Sync follow button on artist profile ---------- */
    function syncFollowButton(artistName, image) {
        const btn = document.getElementById('artist-follow-btn');
        if (!btn) return;

        const following = isFollowing(artistName);
        btn.classList.toggle('following', following);
        btn.innerHTML = following
            ? '<i class="fas fa-check"></i> Following'
            : '<i class="fas fa-plus"></i> Follow';

        /* Store current artist info on the button for the global handler */
        btn.dataset.artistName = artistName;
        btn.dataset.artistImage = image || '';
    }

    /* ---------- Init ---------- */
    function init() {
        /* ---- GLOBAL CLICK DELEGATION for follow button ----
           This is the KEY fix — the listener survives even if
           pages.js or others re-render the button. */
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('#artist-follow-btn');
            if (!btn) return;

            e.preventDefault();
            e.stopPropagation();

            const artistName = btn.dataset.artistName
                || document.getElementById('artist-profile-name')?.textContent?.trim()
                || '';
            const artistImg = btn.dataset.artistImage
                || document.getElementById('artist-profile-img')?.src
                || '';

            console.log('[Follows] Click detected for:', artistName);

            if (!artistName) {
                console.warn('[Follows] No artist name!');
                return;
            }

            const nowFollowing = toggle(artistName, artistImg);

            btn.classList.toggle('following', nowFollowing);
            btn.innerHTML = nowFollowing
                ? '<i class="fas fa-check"></i> Following'
                : '<i class="fas fa-plus"></i> Follow';

            if (window.BottomNav && window.BottomNav.showToast) {
                window.BottomNav.showToast(
                    nowFollowing ? `Following ${artistName}` : `Unfollowed ${artistName}`
                );
            }
        });

        /* Re-render following page if visible */
        window.addEventListener('follows:updated', () => {
            if (document.body.classList.contains('page-followed')) {
                render();
            }
        });

        console.log('[Follows] Loaded.');
    }

    return {
        init,
        isFollowing,
        follow,
        unfollow,
        toggle,
        openPage,
        render,
        syncFollowButton
    };
})();