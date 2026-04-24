'use strict';

/* ── Connection bar ─────────────────────────────────────── */
async function checkConnection() {
    const bar  = document.getElementById('connection-status-bar');
    const text = document.getElementById('connection-text');
    const time = document.getElementById('connection-time');
    if (!bar) return;

    bar.className = 'checking';
    if (text) text.textContent = 'Verifica connessione…';

    try {
        const res = await apiCall('check_db.php');
        bar.className = 'connected';
        if (text) text.textContent = 'DB connesso';
        if (time) time.textContent = new Date().toLocaleTimeString('it-IT');
    } catch (e) {
        bar.className = 'disconnected';
        if (text) text.textContent = 'DB non raggiungibile: ' + e.message;
        if (time) time.textContent = new Date().toLocaleTimeString('it-IT');
    }
}
