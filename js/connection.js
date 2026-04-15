/**
 * connection.js - Connection status bar management
 * Garage ANPR Management System
 */

'use strict';

const ConnectionStatus = {
    _isConnected: true,
    _lastUpdate: null,

    /**
     * Set connection status and update UI
     * @param {boolean} connected
     */
    set(connected) {
        this._isConnected = connected;
        this._render();
    },

    /**
     * Mark last successful update
     */
    markUpdated() {
        this._lastUpdate = new Date();
        this.set(true);
        this._renderTime();
    },

    _render() {
        const bar = document.getElementById('connection-status-bar');
        const icon = document.getElementById('connection-icon');
        const text = document.getElementById('connection-text');
        if (!bar) return;

        if (this._isConnected) {
            bar.className = 'connection-bar bg-success text-white py-1 px-3 d-flex align-items-center gap-2';
            if (icon) icon.innerHTML = '<i class="bi bi-wifi"></i>';
            if (text) text.textContent = 'Connesso';
        } else {
            bar.className = 'connection-bar bg-danger text-white py-1 px-3 d-flex align-items-center gap-2';
            if (icon) icon.innerHTML = '<i class="bi bi-wifi-off"></i>';
            if (text) text.textContent = 'Connessione persa — Nuovo tentativo in corso...';
        }
        this._renderTime();
    },

    _renderTime() {
        const timeEl = document.getElementById('last-update-time');
        if (!timeEl || !this._lastUpdate) return;
        timeEl.textContent = 'Ultimo aggiornamento: ' + this._lastUpdate.toLocaleTimeString('it-IT');
    },
};

// Patch apiCall to track connectivity
(function patchApiCall() {
    const origApiCall = typeof apiCall === 'function' ? apiCall : null;
    if (!origApiCall) return;
    window.apiCall = async function (endpoint, options) {
        try {
            const result = await origApiCall(endpoint, options);
            ConnectionStatus.markUpdated();
            return result;
        } catch (err) {
            // Only mark disconnected on network errors, not HTTP errors
            if (!err.message.startsWith('HTTP')) {
                ConnectionStatus.set(false);
            }
            throw err;
        }
    };
})();
