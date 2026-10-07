/* ==================================================================
   DATA.JS — Track catalog (Firestore only, no demo tracks)
   All songs loaded from admin uploads (Firestore)
   Exposes: window.tracks, window.__baseTracks, window.__refreshTracks
================================================================== */

/* ---------- NO demo tracks — only admin uploaded ---------- */
window.__baseTracks = [];

/* ---------- Global cache ---------- */
window.tracks = [];
window.__adminSongs = [];

/* ---------- Get hidden songs (admin blocked) ---------- */
function getHiddenSongs() {
    try {
        const raw = localStorage.getItem('reverb_hidden_songs');
        if (raw) return JSON.parse(raw) || [];
    } catch (e) {}
    return [];
}

/* ---------- Parse duration "3:42" → 222 seconds ---------- */
function parseDuration(str) {
    if (!str) return 0;
    const parts = String(str).split(':').map(n => parseInt(n, 10));
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 0;
}

/* ---------- Build tracks from admin uploads ---------- */
function buildTracks() {
    const admin = window.__adminSongs || [];
    const hidden = getHiddenSongs();

    return admin
        .filter(s => s.published !== false)
        .filter(s => !hidden.includes(s.id))
        .map(s => ({
            id: s.id,
            title: s.title,
            artist: s.artist,
            album: s.album || 'Singles',
            duration: s.duration || '0:00',
            durSec: parseDuration(s.duration),
            art: s.cover || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop',
            src: s.audio,
            genre: s.genre || '',
            lyrics: s.lyrics || '',
            releaseDate: s.releaseDate || '',
            isAdmin: true
        }));
}

/* ---------- Refresh tracks ---------- */
window.__refreshTracks = function () {
    window.tracks = buildTracks();
    console.log('[Data] Tracks refreshed. Total:', window.tracks.length);

    try {
        window.dispatchEvent(new CustomEvent('tracks:updated', {
            detail: { count: window.tracks.length, tracks: window.tracks }
        }));
    } catch (e) {}
};

/* ---------- Load admin songs from Firestore ---------- */
window.__loadAdminSongs = async function () {
    if (!window.Firestore || !window.Firestore.isReady()) {
        console.log('[Data] Firestore not ready');
        return;
    }

    try {
        const songs = await window.Firestore.loadAdminSongs();
        window.__adminSongs = songs || [];
        console.log('[Data] ✅ Loaded', window.__adminSongs.length, 'songs from Firestore');
        window.__refreshTracks();
    } catch (err) {
        console.error('[Data] Load error:', err);
    }
};

/* ---------- Initial load ---------- */
window.tracks = buildTracks();

/* ---------- Auto-load on Firebase ready ---------- */
window.addEventListener('firebase:ready', function () {
    setTimeout(function () {
        window.__loadAdminSongs();
    }, 500);
});