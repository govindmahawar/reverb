/* ==================================================================
   PLAYER.JS — Audio player core
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

        if (autoPlay) playTrack();
        else pauseTrack();
    }

    function playTrack() {
        isPlaying = true;
        mainPlayBtn.classList.remove('fa-play-circle');
        mainPlayBtn.classList.add('fa-pause-circle');
        mainPlayBtn.style.color = '#b8a8e0';

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
        mainPlayBtn.classList.remove('fa-pause-circle');
        mainPlayBtn.classList.add('fa-play-circle');
        mainPlayBtn.style.color = '#ffffff';
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

        /* Play / Pause */
        mainPlayBtn.addEventListener('click', togglePlay);

        /* Prev / Next */
        prevBtn.addEventListener('click', () => {
            if (isShuffle) loadTrack(Math.floor(Math.random() * window.tracks.length));
            else loadTrack(currentTrackIndex - 1);
        });

        nextBtn.addEventListener('click', () => {
            if (isShuffle) loadTrack(Math.floor(Math.random() * window.tracks.length));
            else loadTrack(currentTrackIndex + 1);
        });

        /* Repeat / Shuffle */
        repeatBtn.addEventListener('click', () => {
            isRepeat = !isRepeat;
            repeatBtn.classList.toggle('active', isRepeat);
        });

        shuffleBtn.addEventListener('click', () => {
            isShuffle = !isShuffle;
            shuffleBtn.classList.toggle('active', isShuffle);
        });

        /* Time update */
        audio.addEventListener('timeupdate', () => {
            if (audio.duration) {
                const pct = (audio.currentTime / audio.duration) * 100;
                progressFill.style.width = pct + '%';
                progressSlider.value = pct;
                currTimeSpan.textContent = formatTime(audio.currentTime);
                totalTimeSpan.textContent = formatTime(audio.duration);
            }
        });

        /* Ended */
        audio.addEventListener('ended', () => {
            if (isRepeat) {
                audio.currentTime = 0;
                playTrack();
            } else {
                loadTrack(currentTrackIndex + 1);
            }
        });

        /* Progress scrub */
        progressSlider.addEventListener('input', (e) => {
            const pct = e.target.value;
            progressFill.style.width = pct + '%';
            if (audio.duration) audio.currentTime = (pct / 100) * audio.duration;
        });

        /* Volume */
        volumeSlider.addEventListener('input', (e) => {
            audio.volume = e.target.value;
            if (audio.volume === 0) volumeBtn.className = 'fas fa-volume-xmark';
            else if (audio.volume < 0.5) volumeBtn.className = 'fas fa-volume-low';
            else volumeBtn.className = 'fas fa-volume-high';
        });

        volumeBtn.addEventListener('click', () => {
            isMuted = !isMuted;
            audio.muted = isMuted;
            volumeBtn.className = isMuted ? 'fas fa-volume-xmark' : 'fas fa-volume-high';
        });
    }

    /* ---------- Public API ---------- */
    return {
        init,
        loadTrack,
        playTrack,
        pauseTrack,
        togglePlay,
        getIndex: () => currentTrackIndex,
        setIndex: (i) => { currentTrackIndex = i; }
    };
})();