/* ==================================================================
   FOLLOWS.JS — Follow system (Firestore synced)
   Exposes: window.Follows
================================================================== */

window.Follows = (function () {

    /* In-memory store */
    let followed = []; /* [{ name, image }] */

    /* ============================================================
       PUBLIC HELPERS
    ============================================================ */
    function isFollowing(name) {
        if (!name) return false;
        return followed.some(a => a.name === name);
    }

    function follow(name, image) {
        if (!name) return;
        if (followed.some(a => a.name === name)) return;
        followed.push({ name: name, image: image || '' });
        syncToFirestore();
        dispatchUpdate();
    }

    function unfollow(name) {
        if (!name) return;
        followed = followed.filter(a => a.name !== name);
        syncToFirestore();
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

    function getAll() {
        return followed.slice();
    }

    function setAll(list) {
        followed = (list || []).slice();
        dispatchUpdate();
    }

    function clearAll() {
        followed = [];
        dispatchUpdate();
    }

    function syncToFirestore() {
        if (window.Firestore && window.Firestore.isReady()) {
            window.Firestore.saveFollows(followed);
        }
    }

    function dispatchUpdate() {
        try {
            window.dispatchEvent(new CustomEvent('follows:updated', { detail: followed.slice() }));
        } catch (e) {}
    }

    /* ============================================================
       RENDER FOLLOWING PAGE
    ============================================================ */
    function render() {
        const grid = document.getElementById('followed-grid');
        const empty = document.getElementById('followed-empty');
        const countText = document.getElementById('followed-count-text');
        if (!grid) return;

        if (!followed.length) {
            grid.innerHTML = '';
            if (empty) empty.style.display = 'flex';
            if (countText) countText.textContent = '0 artists';
            return;
        }

        if (empty) empty.style.display = 'none';
        if (countText) countText.textContent = `${followed.length} artist${followed.length > 1 ? 's' : ''}`;

        grid.innerHTML = followed.map(artist => `
            <div class="followed-card" data-artist-name="${artist.name}">
                <div class="followed-card-art">
                    <img src="${artist.image || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&h=200&fit=crop'}" alt="${artist.name}">
                </div>
                <span class="followed-card-name">${artist.name}</span>
                <span class="followed-card-meta">Artist</span>
            </div>
        `).join('');

        grid.querySelectorAll('.followed-card').forEach(card => {
            card.addEventListener('click', () => {
                const name = card.getAttribute('data-artist-name');
                if (name && window.Pages && window.Pages.openArtistProfile) {
                    window.Pages.openArtistProfile(name, { from: 'followed' });
                }
            });
        });
    }

    function openPage() {
        render();
        if (window.Pages) window.Pages.navigate('followed');
    }

    function syncFollowButton(artistName, image) {
        const btn = document.getElementById('artist-follow-btn');
        if (!btn) return;

        const following = isFollowing(artistName);
        btn.classList.toggle('following', following);
        btn.innerHTML = following
            ? '<i class="fas fa-check"></i> Following'
            : '<i class="fas fa-plus"></i> Follow';

        btn.dataset.artistName = artistName || '';
        btn.dataset.artistImage = image || '';
    }

    /* ============================================================
       INIT
    ============================================================ */
    function init() {
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

            if (!artistName) return;

            /* Login required */
            if (window.Auth && !window.Auth.isLoggedIn()) {
                window.Auth.requireLogin(() => {
                    const nowFollowing = toggle(artistName, artistImg);
                    btn.classList.toggle('following', nowFollowing);
                    btn.innerHTML = nowFollowing
                        ? '<i class="fas fa-check"></i> Following'
                        : '<i class="fas fa-plus"></i> Follow';
                    if (window.BottomNav && window.BottomNav.showToast) {
                        window.BottomNav.showToast(nowFollowing ? `Following ${artistName}` : `Unfollowed ${artistName}`);
                    }
                }, 'follow artists');
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

        window.addEventListener('follows:updated', () => {
            if (document.body.classList.contains('page-followed')) render();
        });

        /* 🔴 LOAD FROM FIRESTORE on login */
        window.addEventListener('auth:changed', function () {
            if (!window.Auth || !window.Auth.isLoggedIn()) return;
            if (!window.Firestore || !window.Firestore.isReady()) return;

            console.log('[Follows] Loading from Firestore...');
            window.Firestore.loadFollows().then(function (list) {
                if (list && Array.isArray(list)) {
                    followed = list.slice();
                    if (document.body.classList.contains('page-followed')) render();
                    console.log('[Follows] ✅ Loaded from Firestore:', list.length, 'artists');
                }
            });
        });

        console.log('[Follows] Module loaded (Firestore synced)');
    }

    return {
        init,
        isFollowing,
        follow,
        unfollow,
        toggle,
        getAll,
        setAll,
        clearAll,
        openPage,
        render,
        syncFollowButton
    };
})();