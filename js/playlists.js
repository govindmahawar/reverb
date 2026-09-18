/* ==================================================================
   PLAYLISTS.JS — Create playlist modal + localStorage + render
   Exposes: window.Playlists
================================================================== */

window.Playlists = (function () {
    let modalOverlay, openModalBtn, closeModalBtn, cancelModalBtn,
        savePlaylistBtn, playlistNameInput, playlistsGroup;

    /* ---------- Modal open/close ---------- */
    function openModal() {
        if (modalOverlay) {
            modalOverlay.classList.add('active');
            playlistNameInput.focus();
        }
    }

    function closeModal() {
        if (modalOverlay) {
            modalOverlay.classList.remove('active');
            playlistNameInput.value = '';
        }
    }

    /* ---------- Render new playlist in sidebar ---------- */
    function renderNewPlaylist(name, isNew = true) {
        if (!name || !name.trim()) return;

        const newPl = document.createElement('div');
        newPl.className = 'playlist-mini';
        newPl.setAttribute('data-title', name);

        const colorGradients = [
            'linear-gradient(145deg, #7c3aed, #4c1d95)',
            'linear-gradient(145deg, #059669, #047857)',
            'linear-gradient(145deg, #d97706, #b45309)',
            'linear-gradient(145deg, #db2777, #9d174d)'
        ];
        const bg = colorGradients[Math.floor(Math.random() * colorGradients.length)];

        newPl.innerHTML = `
            <div class="playlist-mini-art" style="background:${bg}">
                <i class="fas fa-compact-disc"></i>
            </div>
            <span>${name}</span>
        `;
        playlistsGroup.appendChild(newPl);

        if (isNew) {
            const saved = JSON.parse(localStorage.getItem('reverb_custom_playlists') || '[]');
            saved.push(name);
            localStorage.setItem('reverb_custom_playlists', JSON.stringify(saved));
        }
    }

    /* ---------- Load saved playlists from localStorage ---------- */
    function loadSavedPlaylists() {
        const saved = JSON.parse(localStorage.getItem('reverb_custom_playlists') || '[]');
        saved.forEach(name => renderNewPlaylist(name, false));
    }

    /* ---------- Init ---------- */
    function init() {
        modalOverlay = document.getElementById('playlist-modal');
        openModalBtn = document.getElementById('btn-open-playlist-modal');
        closeModalBtn = document.getElementById('btn-close-modal');
        cancelModalBtn = document.getElementById('btn-cancel-playlist');
        savePlaylistBtn = document.getElementById('btn-save-playlist');
        playlistNameInput = document.getElementById('playlist-name-input');
        playlistsGroup = document.getElementById('playlists-group');

        if (openModalBtn) openModalBtn.addEventListener('click', openModal);
        if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
        if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeModal);

        if (modalOverlay) {
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) closeModal();
            });
        }

        if (savePlaylistBtn) {
            savePlaylistBtn.addEventListener('click', () => {
                const val = playlistNameInput.value;
                if (val) {
                    renderNewPlaylist(val, true);
                    closeModal();
                }
            });
        }

        /* Enter key saves */
        if (playlistNameInput) {
            playlistNameInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    savePlaylistBtn.click();
                }
            });
        }

        loadSavedPlaylists();
    }

    return { init };
})();