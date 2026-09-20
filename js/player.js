/* ==================================================================
   PLAYER.JS — Audio player core + Mini Player
   Exposes: window.Player (with loadTrack, playTrack, pauseTrack, etc.)
================================================================== */

window.Player = (function () {
    let currentTrackIndex = 0;
    let isPlaying = false;
    let isMuted = false;
    let isRepeat = false;
    let isShuffle = false;

    // DOM refs (assigned on init)
    let audio, mainPlayBtn, prevBtn, nextBtn, repeatBtn, shuffleBtn,
        volumeBtn, volumeSlider, progressSlider, progressFill,
        currTimeSpan, totalTimeSpan, playerArtImg,
        playerTrackTitle, playerTrackArtist;

    // Web Audio Synth Fallback
    let audioCtx = null;
    let synthOsc = null;
    let synthGain = null;

    /* ---------- Synth fallback ---------- */
    function playSynthTone() {
        try {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtx.state === 'suspended') audioCtx.resume();
            if (synthOsc) synthOsc.stop();

            synthOsc = audioCtx.createOscillator();
            synthGain = audioCtx.createGain();

            const freq = 220 + (currentTrackIndex * 40);
            synthOsc.type = 'sine';
            synthOsc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            synthGain.gain.setValueAtTime(volumeSlider ? volumeSlider.value * 0.15 : 0.1, audioCtx.currentTime);

            synthOsc.connect(synthGain);
            synthGain.connect(audioCtx.destination);
            synthOsc.start();
        } catch (e) { /* silent */ }
    }

    function stopSynthTone() {
        try {
            if (synthOsc) {
                synthOsc.stop();
                synthOsc = null;
            }
        } catch (e) { /* silent */ }
    }

    /* ---------- Time formatter ---------- */
    function formatTime(seconds) {
        if (isNaN(seconds) || seconds < 0) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    /* ---------- Mini player show/hide ---------- */
    function showMiniPlayer() {
        const dock = document.getElementById('mini-player');
        if (!dock) return;
        dock.classList.add('visible');
    }

    function hideMiniPlayer() {
        const dock = document.getElementById('mini-player');
        if (!dock) return;
        dock.classList.remove('visible');
    }

    /* ---------- Load track ---------- */
    function loadTrack(index, autoPlay = true) {
        const tracks = window.tracks;
        if (!tracks || !tracks.length) return;

        if (index < 0) index = tracks.length - 1;
        if (index >= tracks.length) index = 0;
        currentTrackIndex = index;
        const track = tracks[currentTrackIndex];

        playerTrackTitle.textContent = track.title;
        playerTrackArtist.textContent = track.artist;
        playerArtImg.src = track.art;
        totalTimeSpan.textContent = track.duration;

        audio.src = track.src;
        audio.load();

        /* Show mini player */
        showMiniPlayer();

        /* Close any open playlist dropdown */
        if (window.Playlists && window.Playlists.closePlaylistDropdown) {
            window.Playlists.closePlaylistDropdown();
        }

        /* Notify NowPlaying module */
        try {
            window.dispatchEvent(new CustomEvent('player:track-changed', { detail: index }));
        } catch (e) {}

        if (autoPlay) playTrack();
        else pauseTrack();
    }

    function playTrack() {
        isPlaying = true;

        /* Sync all play buttons (mini + desktop) */
        document.querySelectorAll('#main-play-btn, #main-play-btn-desktop').forEach(btn => {
            btn.classList.remove('fa-play-circle');
            btn.classList.add('fa-pause-circle');
            btn.style.color = '#b8a8e0';
        });

        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(() => {
                // fallback if remote stream blocked
                playSynthTone();
            });
        }
    }

    function pauseTrack() {
        isPlaying = false;

        document.querySelectorAll('#main-play-btn, #main-play-btn-desktop').forEach(btn => {
            btn.classList.remove('fa-pause-circle');
            btn.classList.add('fa-play-circle');
            btn.style.color = '#ffffff';
        });

        audio.pause();
        stopSynthTone();
    }

    function togglePlay() {
        if (isPlaying) pauseTrack();
        else playTrack();
    }

    /* ---------- Init ---------- */
    function init() {
        audio = document.getElementById('audio-player');
        mainPlayBtn = document.getElementById('main-play-btn');
        prevBtn = document.getElementById('prev-btn');
        nextBtn = document.getElementById('next-btn');
        repeatBtn = document.getElementById('repeat-btn');
        shuffleBtn = document.getElementById('shuffle-btn');
        volumeBtn = document.getElementById('volume-btn');
        volumeSlider = document.getElementById('volume-slider');
        progressSlider = document.getElementById('progress-slider');
        progressFill = document.getElementById('progress-fill');
        currTimeSpan = document.getElementById('curr-time');
        totalTimeSpan = document.getElementById('total-time');
        playerArtImg = document.getElementById('player-art-img');
        playerTrackTitle = document.getElementById('player-track-title');
        playerTrackArtist = document.getElementById('player-track-artist');

        if (!audio) return;

        /* ---------- Play / Pause (mini + desktop) ---------- */
        if (mainPlayBtn) mainPlayBtn.addEventListener('click', togglePlay);

        const mainPlayBtnDesktop = document.getElementById('main-play-btn-desktop');
        if (mainPlayBtnDesktop) mainPlayBtnDesktop.addEventListener('click', togglePlay);

        /* ---------- Prev / Next (mini + desktop) ---------- */
        if (prevBtn) prevBtn.addEventListener('click', () => {
            if (isShuffle) loadTrack(Math.floor(Math.random() * window.tracks.length));
            else loadTrack(currentTrackIndex - 1);
        });

        if (nextBtn) nextBtn.addEventListener('click', () => {
            if (isShuffle) loadTrack(Math.floor(Math.random() * window.tracks.length));
            else loadTrack(currentTrackIndex + 1);
        });

        const prevBtnDesktop = document.getElementById('prev-btn-desktop');
        if (prevBtnDesktop) prevBtnDesktop.addEventListener('click', () => {
            if (isShuffle) loadTrack(Math.floor(Math.random() * window.tracks.length));
            else loadTrack(currentTrackIndex - 1);
        });

        const nextBtnDesktop = document.getElementById('next-btn-desktop');
        if (nextBtnDesktop) nextBtnDesktop.addEventListener('click', () => {
            if (isShuffle) loadTrack(Math.floor(Math.random() * window.tracks.length));
            else loadTrack(currentTrackIndex + 1);
        });

        /* ---------- Repeat ---------- */
        if (repeatBtn) repeatBtn.addEventListener('click', () => {
            isRepeat = !isRepeat;
            repeatBtn.classList.toggle('active', isRepeat);
        });

        /* ---------- Shuffle (main + mini sync) ---------- */
        if (shuffleBtn) shuffleBtn.addEventListener('click', () => {
            isShuffle = !isShuffle;
            shuffleBtn.classList.toggle('active', isShuffle);
            const miniShuffleBtn = document.getElementById('mini-shuffle-btn');
            if (miniShuffleBtn) miniShuffleBtn.classList.toggle('active', isShuffle);
        });

        /* ---------- Mini shuffle button — mirrors main ---------- */
        const miniShuffleBtn = document.getElementById('mini-shuffle-btn');
        if (miniShuffleBtn) {
            miniShuffleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (shuffleBtn) {
                    shuffleBtn.click();
                } else {
                    isShuffle = !isShuffle;
                    miniShuffleBtn.classList.toggle('active', isShuffle);
                }
                console.log('[Player] Mini shuffle toggled. isShuffle:', isShuffle);
            });
        }

        /* ---------- Time update → progress (mini + desktop) ---------- */
        audio.addEventListener('timeupdate', () => {
            if (!audio.duration) return;
            const pct = (audio.currentTime / audio.duration) * 100;
            const pctStr = pct + '%';

            /* Desktop progress */
            if (progressFill) progressFill.style.width = pctStr;
            if (progressSlider) progressSlider.value = pct;
            if (currTimeSpan) currTimeSpan.textContent = formatTime(audio.currentTime);
            if (totalTimeSpan) totalTimeSpan.textContent = formatTime(audio.duration);

            /* Mini progress (top of mini player) */
            const miniFill = document.getElementById('progress-fill');
            const miniSlider = document.getElementById('progress-slider');
            if (miniFill) miniFill.style.width = pctStr;
            if (miniSlider) miniSlider.value = pct;
        });

        /* ---------- Ended ---------- */
        audio.addEventListener('ended', () => {
            if (isRepeat) {
                audio.currentTime = 0;
                playTrack();
            } else {
                loadTrack(currentTrackIndex + 1);
            }
        });

        /* ---------- Progress scrub (mini) ---------- */
        if (progressSlider) {
            progressSlider.addEventListener('input', (e) => {
                const pct = e.target.value;
                if (progressFill) progressFill.style.width = pct + '%';
                if (audio.duration) audio.currentTime = (pct / 100) * audio.duration;
            });
        }

        const progressSliderDesktop = document.getElementById('progress-slider-desktop');
        if (progressSliderDesktop) {
            progressSliderDesktop.addEventListener('input', (e) => {
                const pct = e.target.value;
                if (progressFill) progressFill.style.width = pct + '%';
                if (audio.duration) audio.currentTime = (pct / 100) * audio.duration;
            });
        }

        /* ---------- Volume ---------- */
        if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => {
                audio.volume = e.target.value;
                if (audio.volume === 0) volumeBtn.className = 'fas fa-volume-xmark';
                else if (audio.volume < 0.5) volumeBtn.className = 'fas fa-volume-low';
                else volumeBtn.className = 'fas fa-volume-high';
            });
        }

        if (volumeBtn) {
            volumeBtn.addEventListener('click', () => {
                isMuted = !isMuted;
                audio.muted = isMuted;
                volumeBtn.className = isMuted ? 'fas fa-volume-xmark' : 'fas fa-volume-high';
            });
        }

        /* ---------- Click on mini player LEFT → open full screen player ---------- */
        const miniLeft = document.getElementById('mini-player-left');
        if (miniLeft) {
            miniLeft.addEventListener('click', (e) => {
                if (e.target.closest('.mini-controls') || e.target.closest('.player-right')) return;
                if (window.NowPlaying) window.NowPlaying.open();
            });
        }
    }

    /* ---------- Public API ---------- */
    return {
        init,
        loadTrack,
        playTrack,
        pauseTrack,
        togglePlay,
        showMiniPlayer,
        hideMiniPlayer,
        getIndex: () => currentTrackIndex,
        setIndex: (i) => { currentTrackIndex = i; }
    };
})();