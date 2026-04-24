'use strict';

/* ── Configuration ──────────────────────────────────────── */
const APP_CONFIG = {
    apiBase:          'api/',
    refreshInterval:  60000,   // ms
    toastDuration:    3500,    // ms
    searchDebounce:   300,     // ms
};

/* ── Global application state ───────────────────────────── */
const AppState = {
    plates:        [],
    selectedPlate: null,
    searchQuery:   '',
    filterStatus:  'all',
    loading:       false,
};

/* ── API helper ─────────────────────────────────────────── */
async function apiCall(endpoint, options = {}) {
    const url = APP_CONFIG.apiBase + endpoint;
    const defaults = {
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    };
    const cfg = Object.assign({}, defaults, options);
    if (cfg.body && typeof cfg.body === 'object') {
        cfg.body = JSON.stringify(cfg.body);
    }
    const res = await fetch(url, cfg);
    const json = await res.json();
    if (!json.success) {
        throw new Error(json.message || 'Errore API');
    }
    return json;
}

/* ── Formatters ─────────────────────────────────────────── */
function formatDate(dateStr) {
    if (!dateStr) return '—';
    try {
        const d = new Date(dateStr);
        if (isNaN(d)) return dateStr;
        return d.toLocaleString('it-IT', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    } catch { return dateStr; }
}

function formatAmount(amount) {
    if (amount === null || amount === undefined || amount === '') return '—';
    const n = parseFloat(amount);
    if (isNaN(n)) return '—';
    return n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
}

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function debounce(fn, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

/* ── Ticket actions ─────────────────────────────────────── */
async function saveFinalTicket(passageId, data) {
    try {
        const res = await apiCall('emit_ticket.php', {
            method: 'POST',
            body: Object.assign({ passage_id: passageId }, data),
        });
        showToast('Ticket emesso: ' + (res.data.ticket_code || ''), 'success');
        return res.data;
    } catch (e) {
        showToast('Errore emissione ticket: ' + e.message, 'error');
        throw e;
    }
}

/* ── Passage selection (for standalone ticket view) ─────── */
function selectPassage(passage) {
    if (!passage) return;
    // Build a minimal plate-like object so renderDetails can handle it
    const pseudo = {
        id:           passage.plate_id || 0,
        plate_number: passage.plate_number || '—',
        tipo:         null,
        ticket_code:  passage.ticket_code || null,
        ticket_id:    passage.ticket_id   || null,
        passages:     [passage],
    };
    renderDetails(pseudo);
}

/* ── Global search ──────────────────────────────────────── */
function doSearch() {
    const q = document.getElementById('global-search')?.value?.trim() || '';
    if (!q) return;
    // If it looks like a ticket code, search by ticket
    if (/^TK/i.test(q)) {
        searchTicketCode(q);
    } else {
        document.getElementById('search-input').value = q;
        AppState.searchQuery = q;
        filterAndRenderPlates();
    }
}

/* ── Search input debounce wiring ───────────────────────── */
const onSearchInput = debounce(function () {
    AppState.searchQuery = document.getElementById('search-input')?.value?.trim() || '';
    filterAndRenderPlates();
}, APP_CONFIG.searchDebounce);

/* ── Scan folder ────────────────────────────────────────── */
async function scanFolder() {
    try {
        showToast('Scansione cartella in corso…', 'info');
        const res = await apiCall('scan_folder.php', { method: 'POST' });
        showToast(`Scansione completata: ${res.data.found ?? 0} nuovi passaggi`, 'success');
        await loadPlates(true);
    } catch (e) {
        showToast('Errore scansione: ' + e.message, 'error');
    }
}

/* ── Bootstrap Enter-key wiring for search ──────────────── */
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('global-search')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') doSearch();
    });
    document.getElementById('search-input')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            AppState.searchQuery = e.target.value.trim();
            filterAndRenderPlates();
        }
    });

    loadPlates();
    checkConnection();

    setInterval(loadPlates,      APP_CONFIG.refreshInterval);
    setInterval(checkConnection, 30000);
});
