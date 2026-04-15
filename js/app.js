/**
 * app.js - Global configuration and core application logic
 * Garage ANPR Management System
 */

'use strict';

// ============================================================
// GLOBAL CONFIGURATION
// ============================================================
const APP_CONFIG = {
    apiBase: 'api/',
    refreshInterval: 10000,       // ms between auto-refresh
    toastDuration: 4000,          // ms toast display duration
    searchDebounce: 400,          // ms debounce for search input
    dateFormat: { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' },
};

// ============================================================
// APP STATE
// ============================================================
const AppState = {
    plates: [],
    passages: [],
    tickets: [],
    selectedPlate: null,
    selectedPassage: null,
    filterStatus: 'all',
    searchQuery: '',
    refreshTimer: null,
    isLoading: false,
};

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Format a date string to local date/time
 * @param {string} dateStr
 * @returns {string}
 */
function formatDate(dateStr) {
    if (!dateStr) return '—';
    try {
        return new Date(dateStr).toLocaleString('it-IT', APP_CONFIG.dateFormat);
    } catch {
        return dateStr;
    }
}

/**
 * Format currency amount
 * @param {number|string} amount
 * @returns {string}
 */
function formatAmount(amount) {
    if (amount === null || amount === undefined || amount === '') return '—';
    const num = parseFloat(amount);
    if (isNaN(num)) return '—';
    return num.toFixed(2) + ' €';
}

/**
 * Escape HTML to prevent XSS
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Debounce utility
 * @param {Function} fn
 * @param {number} delay
 * @returns {Function}
 */
function debounce(fn, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

/**
 * API call helper with JSON response
 * @param {string} endpoint
 * @param {Object} options - fetch options
 * @returns {Promise<Object>}
 */
async function apiCall(endpoint, options = {}) {
    const url = APP_CONFIG.apiBase + endpoint;
    const defaultOptions = {
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    };
    const mergedOptions = { ...defaultOptions, ...options };
    if (mergedOptions.body && typeof mergedOptions.body === 'object') {
        mergedOptions.body = JSON.stringify(mergedOptions.body);
    }
    const response = await fetch(url, mergedOptions);
    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errText}`);
    }
    return response.json();
}

// ============================================================
// TICKET FUNCTIONS (shared)
// ============================================================

/**
 * Select a passage (standalone ticket or plate-linked)
 * @param {Object} passage
 */
function selectPassage(passage) {
    AppState.selectedPassage = passage;
    if (typeof renderPassageDetails === 'function') {
        renderPassageDetails(passage);
    }
}

/**
 * Save (emit) a final ticket for a passage
 * @param {number|string} passageId
 * @param {Object} ticketData
 * @returns {Promise<Object>}
 */
async function saveFinalTicket(passageId, ticketData) {
    return apiCall('emit_ticket.php', {
        method: 'POST',
        body: { passage_id: passageId, ...ticketData },
    });
}

// ============================================================
// INIT
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    // Wire up search
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            AppState.searchQuery = e.target.value.trim();
            if (typeof filterAndRenderPlates === 'function') {
                filterAndRenderPlates();
            }
        }, APP_CONFIG.searchDebounce));
    }

    // Clear search button
    const btnClear = document.getElementById('btn-clear-search');
    if (btnClear) {
        btnClear.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            AppState.searchQuery = '';
            if (typeof filterAndRenderPlates === 'function') {
                filterAndRenderPlates();
            }
        });
    }

    // Status filter
    const filterSelect = document.getElementById('filter-status');
    if (filterSelect) {
        filterSelect.addEventListener('change', (e) => {
            AppState.filterStatus = e.target.value;
            if (typeof filterAndRenderPlates === 'function') {
                filterAndRenderPlates();
            }
        });
    }

    // New plate button
    const btnNewPlate = document.getElementById('btn-new-plate');
    if (btnNewPlate) {
        btnNewPlate.addEventListener('click', () => {
            const modal = new bootstrap.Modal(document.getElementById('modalNewPlate'));
            modal.show();
        });
    }

    // Save new plate
    const btnSaveNewPlate = document.getElementById('btn-save-new-plate');
    if (btnSaveNewPlate) {
        btnSaveNewPlate.addEventListener('click', () => {
            if (typeof createManualPlate === 'function') {
                createManualPlate();
            }
        });
    }

    // New ticket button
    const btnNewTicket = document.getElementById('btn-new-ticket');
    if (btnNewTicket) {
        btnNewTicket.addEventListener('click', () => {
            const modal = new bootstrap.Modal(document.getElementById('modalNewTicket'));
            modal.show();
        });
    }

    // Save new ticket
    const btnSaveNewTicket = document.getElementById('btn-save-new-ticket');
    if (btnSaveNewTicket) {
        btnSaveNewTicket.addEventListener('click', () => {
            if (typeof createManualTicket === 'function') {
                createManualTicket();
            }
        });
    }

    // Scan folder button
    const btnScan = document.getElementById('btn-scan');
    if (btnScan) {
        btnScan.addEventListener('click', async () => {
            btnScan.disabled = true;
            try {
                const result = await apiCall('scan_folder.php', { method: 'POST' });
                if (typeof showToast === 'function') {
                    showToast(`Scansione completata: ${result.new_plates || 0} nuove targhe`, 'success');
                }
                if (typeof loadPlates === 'function') {
                    await loadPlates();
                }
            } catch (err) {
                if (typeof showToast === 'function') {
                    showToast('Errore scansione: ' + err.message, 'danger');
                }
            } finally {
                btnScan.disabled = false;
            }
        });
    }

    // Initial data load
    if (typeof loadPlates === 'function') {
        loadPlates();
    }

    // Auto-refresh
    AppState.refreshTimer = setInterval(() => {
        if (typeof loadPlates === 'function') {
            loadPlates(true);
        }
    }, APP_CONFIG.refreshInterval);
});
