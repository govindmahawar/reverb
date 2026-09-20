/* ==================================================================
   NOW-PLAYING.JS — Full-screen Now Playing overlay
   - Opens when mini player is tapped
   - Big album art, title, artist, like button
   - Full controls (prev/play/next, shuffle, repeat)
   - Volume slider
   - Lyrics panel (slide-up)
   Exposes: window.NowPlaying
================================================================== */

window.NowPlaying = (function () {

    let overlay, isOpen = false;

    /* ---------- Sample lyrics per track (demo) ---------- */
    const LYRICS = {
        'Midnight Sun': `I wake up to a midnight sun
Where shadows fade and dreams begun
The city sleeps but we're alive
Chasing echoes through the sky

Every breath a melody
Every step a memory
We are made of starlight, love
Floating through the midnight sun`,

        'Velvet Sky': `Underneath the velvet sky
I see your colors passing by
Soft as rain on summer leaves
You're everything my heart believes

Hold on, hold on to me
We'll paint the sky in memory
Hold on, hold on tonight
Underneath the velvet light`,

        'Deep Blue': `Deep blue ocean in your eyes
Waves of wonder, no disguise
Pull me under, let me drown
In the silence, I have found

Deep blue, deep blue
Everything I never knew
Deep blue, deep blue
All I ever wanted was you`,

        'Moonlit': `Moonlit dreams on silver streams
Nothing's ever what it seems
Dancing shadows on the wall
Waiting for the night to fall

Moonlit, we're moonlit
Caught between the dark and light
Moonlit, we're moonlit
Everything feels so right`,

        'Reverb Waves': `Waves of sound come crashing down
Filling silence all around
Every echo finds its way
Back to where we used to stay

Reverb waves, carry me home
Through the static, through the storm
Reverb waves, let me be
One with all eternity`
    };

    function getLyricsForTrack(title) {
        return LYRICS[title] || null;
    }

    /* ---------- Elements (lazy) ---------- */
    function getElements() {
        return {
            overlay: document.getElementById('now-playing-fullscreen'),
            artImg: document.getElementById('np-art-img'),
            art: document.getElementById('np-art'),
            title: document.getElementById('np-track-title'),
            artist: document.getElementById('np-track-artist'),
            likeBtn: document.getElementById('np-like-btn'),
            progressFill: document.getElementById('np-progress-fill'),
            progressSlider: document.getElementById('np-progress-slider'),
            currTime: document.getElementById('np-curr-time'),
            totalTime: document.getElementById('np-total-time'),
            playBtn: document.getElementById('np-play-btn'),
            prevBtn: document.getElementById('np-prev-btn'),
            nextBtn: document.getElementById('np-next-btn'),
            shuffleBtn: document.getElementById('np-shuffle-btn'),
            repeatBtn: document.getElementById('np-repeat-btn'),
            volumeSlider: document.getElementById('np-volume-slider'),
            closeBtn: document.getElementById('np-close-btn'),
            menuBtn: document.getElementById('np-menu-btn'),
            lyricsBtn: document.getElementById('np-lyrics-btn'),
            lyricsPanel: document.getElementById('np-lyrics-panel'),
            lyricsBody: document.getElementById('np-lyrics-body'),
            lyricsClose: document.getElementById('np-lyrics-close'),
            source: document.getElementById('np-source')
        };
    }

    /* ---------- Open / Close ---------- */
    function open() {
        const el = getElements();
        if (!el.overlay) return;
        el.overlay.classList.add('open');
        isOpen = true;
        document.body.style.overflow = 'hidden';
        syncFromPlayer();
    }

    function close() {
        const el = getElements();
        if (!el.overlay) return;
        el.overlay.classList.remove('open');
        isOpen = false;
        document.body.style.overflow = '';
        /* Close lyrics panel too */
        if (el.lyricsPanel) el.lyricsPanel.classList.remove('open');
        if (el.lyricsBtn) el.lyricsBtn.classList.remove('active');
    }

    function toggle() {
        if (isOpen) close();
        else open();
    }

    /* ---------- Sync overlay from current player state ---------- */
    function syncFromPlayer() {
        const el = getElements();
        if (!el.overlay) return;

        const tracks = window.tracks || [];
        const idx = window.Player?.getIndex ? window.Player.getIndex() : 0;
        const track = tracks[idx];
        if (!track) return;

        /* Art */
        if (el.artImg) {
            el.artImg.src = track.art;
            el.artImg.alt = track.title;
        }

        /* Info */
        if (el.title) el.title.textContent = track.title;
        if (el.artist) el.artist.textContent = track.artist;

        /* Like state */
        if (el.likeBtn) {
            const liked = window.Likes && window.Likes.isLiked ? window.Likes.isLiked(track.id) : false;
            el.likeBtn.classList.toggle('active', liked);
        }

        /* Play button icon */
        syncPlayIcon();

        /* Volume */
        const audio = document.getElementById('audio-player');
        if (audio && el.volumeSlider) el.volumeSlider.value = audio.volume;

        /* Lyrics */
        if (el.lyricsBody) {
            const lyrics = getLyricsForTrack(track.title);
            el.lyricsBody.innerHTML = lyrics
                ? lyrics
                : '<div class="no-lyrics">Lyrics not available for this track</div>';
        }
    }

    /* ---------- Update progress ---------- */
    function updateProgress(current, total) {
        const el = getElements();
        if (!el.overlay) return;

        const pct = total > 0 ? (current / total) * 100 : 0;
        if (el.progressFill) el.progressFill.style.width = pct + '%';
        if (el.progressSlider) el.progressSlider.value = pct;
        if (el.currTime) el.currTime.textContent = formatTime(current);
        if (el.totalTime) el.totalTime.textContent = formatTime(total);
    }

    function formatTime(seconds) {
        if (isNaN(seconds) || seconds < 0) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    /* ---------- Play icon sync ---------- */
    function syncPlayIcon() {
        const el = getElements();
        if (!el.playBtn) return;
        const audio = document.getElementById('audio-player');
        const playing = audio && !audio.paused;
        el.playBtn.innerHTML = playing
            ? '<i class="fas fa-pause"></i>'
            : '<i class="fas fa-play"></i>';

        /* Animate art */
        if (el.art) el.art.classList.toggle('playing', !!playing);
    }

    /* ---------- Wire mini player tap → open full screen ---------- */
    function bindMiniPlayerClick() {
        const playerLeft = document.querySelector('.player-left');
        if (!playerLeft || playerLeft._npBound) return;
        playerLeft._npBound = true;

        playerLeft.style.cursor = 'pointer';
        playerLeft.addEventListener('click', () => {
            open();
        });
    }

    /* ---------- Init ---------- */
    function init() {
        const el = getElements();
        if (!el.overlay) {
            console.warn('[NowPlaying] Overlay element missing');
            return;
        }

        /* Bind mini player click */
        bindMiniPlayerClick();

        /* Close */
        if (el.closeBtn) el.closeBtn.addEventListener('click', close);

        /* Escape key */
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isOpen) close();
        });

        /* Play button */
        if (el.playBtn) {
            el.playBtn.addEventListener('click', () => {
                if (window.Player?.togglePlay) window.Player.togglePlay();
                setTimeout(syncPlayIcon, 50);
            });
        }

        /* Prev / Next */
        if (el.prevBtn) {
            el.prevBtn.addEventListener('click', () => {
                const mainPrev = document.getElementById('prev-btn');
                if (mainPrev) mainPrev.click();
                setTimeout(syncFromPlayer, 100);
            });
        }
        if (el.nextBtn) {
            el.nextBtn.addEventListener('click', () => {
                const mainNext = document.getElementById('next-btn');
                if (mainNext) mainNext.click();
                setTimeout(syncFromPlayer, 100);
            });
        }

        /* Shuffle / Repeat — mirror main player */
        if (el.shuffleBtn) {
            el.shuffleBtn.addEventListener('click', () => {
                const mainShuffle = document.getElementById('shuffle-btn');
                if (mainShuffle) {
                    mainShuffle.click();
                    el.shuffleBtn.classList.toggle('active', mainShuffle.classList.contains('active'));
                }
            });
        }
        if (el.repeatBtn) {
            el.repeatBtn.addEventListener('click', () => {
                const mainRepeat = document.getElementById('repeat-btn');
                if (mainRepeat) {
                    mainRepeat.click();
                    el.repeatBtn.classList.toggle('active', mainRepeat.classList.contains('active'));
                }
            });
        }

        /* Like */
        if (el.likeBtn) {
            el.likeBtn.addEventListener('click', () => {
                const tracks = window.tracks || [];
                const idx = window.Player?.getIndex ? window.Player.getIndex() : 0;
                const track = tracks[idx];
                if (!track || !window.Likes) return;
                const nowLiked = window.Likes.toggle(track.id);
                el.likeBtn.classList.toggle('active', nowLiked);
                if (window.BottomNav && window.BottomNav.showToast) {
                    window.BottomNav.showToast(nowLiked ? `Liked ${track.title} ❤️` : `Removed ${track.title}`);
                }
            });
        }

        /* Volume */
        if (el.volumeSlider) {
            el.volumeSlider.addEventListener('input', (e) => {
                const audio = document.getElementById('audio-player');
                if (audio) audio.volume = parseFloat(e.target.value);
            });
        }

        /* Progress scrubbing */
        if (el.progressSlider) {
            el.progressSlider.addEventListener('input', (e) => {
                const audio = document.getElementById('audio-player');
                if (!audio || !audio.duration) return;
                const pct = parseFloat(e.target.value);
                audio.currentTime = (pct / 100) * audio.duration;
                if (el.progressFill) el.progressFill.style.width = pct + '%';
            });
        }

        /* Lyrics panel */
        if (el.lyricsBtn && el.lyricsPanel) {
            el.lyricsBtn.addEventListener('click', () => {
                el.lyricsPanel.classList.toggle('open');
                el.lyricsBtn.classList.toggle('active');
            });
        }
        if (el.lyricsClose && el.lyricsPanel) {
            el.lyricsClose.addEventListener('click', () => {
                el.lyricsPanel.classList.remove('open');
                if (el.lyricsBtn) el.lyricsBtn.classList.remove('active');
            });
        }

        /* Menu button */
        if (el.menuBtn) {
            el.menuBtn.addEventListener('click', () => {
                if (window.BottomNav && window.BottomNav.showToast) {
                    window.BottomNav.showToast('More options — coming soon');
                }
            });
        }

        /* Sync with the audio element */
        const audio = document.getElementById('audio-player');
        if (audio) {
            audio.addEventListener('timeupdate', () => {
                if (!isOpen) return;
                updateProgress(audio.currentTime, audio.duration);
            });
            audio.addEventListener('play', syncPlayIcon);
            audio.addEventListener('pause', syncPlayIcon);
            audio.addEventListener('loadedmetadata', () => {
                if (isOpen) syncFromPlayer();
            });
        }

        /* Listen for track changes */
        window.addEventListener('player:track-changed', syncFromPlayer);

        console.log('[NowPlaying] Module loaded.');
    }

    return {
        init,
        open,
        close,
        toggle,
        syncFromPlayer,
        isOpen: () => isOpen
    };
})();