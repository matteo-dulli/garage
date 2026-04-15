/**
 * plate-management.js - Plate list loading, filtering, and manual creation
 * Garage ANPR Management System
 */

'use strict';

// ============================================================
// DATA LOADING
// ============================================================

/**
 * Load plates (and associated passages) from the API
 * @param {boolean} silent - if true, don't show loading spinner
 */
async function loadPlates(silent = false) {
    if (AppState.isLoading) return;
    AppState.isLoading = true;

    if (!silent) {
        const container = document.getElementById('plates-list');
        if (container) {
            container.innerHTML = `
                <div class="text-center text-muted py-5">
                    <div class="spinner-border spinner-border-sm" role="status"></div>
                    <p class="mt-2">Caricamento...</p>
                </div>
            `;
        }
    }

    try {
        const data = await apiCall('get_plates.php');
        AppState.plates   = data.plates   || [];
        AppState.passages = data.passages || [];
        AppState.tickets  = data.tickets  || [];

        updateStats({
            plates:   AppState.plates.length,
            passages: AppState.passages.length,
            tickets:  AppState.tickets.length,
        });

        filterAndRenderPlates();

        // Re-render selected plate if still present
        if (AppState.selectedPlate) {
            const updated = AppState.plates.find(p => p.id === AppState.selectedPlate.id);
            if (updated && typeof renderDetails === 'function') {
                renderDetails(updated);
            }
        }
    } catch (err) {
        if (typeof showToast === 'function') {
            showToast('Errore caricamento dati: ' + err.message, 'danger');
        }
    } finally {
        AppState.isLoading = false;
    }
}

// ============================================================
// FILTERING
// ============================================================

/**
 * Filter plates based on current AppState.filterStatus and AppState.searchQuery,
 * then render the filtered list
 */
function filterAndRenderPlates() {
    let filtered = AppState.plates.slice();

    // Apply status filter
    switch (AppState.filterStatus) {
        case 'inside': {
            filtered = filtered.filter(p => {
                const last = _lastPassage(p);
                return last && last.entry_datetime && !last.exit_datetime;
            });
            break;
        }
        case 'outside': {
            filtered = filtered.filter(p => {
                const last = _lastPassage(p);
                return !last || last.exit_datetime;
            });
            break;
        }
        case 'ticket': {
            filtered = filtered.filter(p => {
                const last = _lastPassage(p);
                return p.ticket_code || (last && last.ticket_code);
            });
            break;
        }
        case 'subscription': {
            filtered = filtered.filter(p => !!p.subscription);
            break;
        }
        // 'all': no filter
    }

    // Apply search query
    if (AppState.searchQuery) {
        const q = AppState.searchQuery.toLowerCase();
        filtered = filtered.filter(p => {
            const plateMatch = p.plate_number && p.plate_number.toLowerCase().includes(q);
            const ticketMatch = p.ticket_code && p.ticket_code.toLowerCase().includes(q);
            const lastPassage = _lastPassage(p);
            const passageTicketMatch = lastPassage && lastPassage.ticket_code
                && lastPassage.ticket_code.toLowerCase().includes(q);
            return plateMatch || ticketMatch || passageTicketMatch;
        });
    }

    if (typeof updatePlatesList === 'function') {
        updatePlatesList(filtered);
    }
}

// ============================================================
// PLATE SELECTION
// ============================================================

/**
 * Select a plate and render its details
 * @param {number} plateId
 */
async function selectPlate(plateId) {
    // Try to use cached data first
    const cached = AppState.plates.find(p => p.id === plateId);
    if (cached && typeof renderDetails === 'function') {
        renderDetails(cached);
        AppState.selectedPlate = cached;
        _updateSelectedCardUI(plateId);
    }

    // Always fetch fresh data from the dedicated endpoint
    try {
        const data = await apiCall('get_plate.php?id=' + plateId);
        if (data && data.plate) {
            AppState.selectedPlate = data.plate;
            if (typeof renderDetails === 'function') {
                renderDetails(data.plate);
            }
            _updateSelectedCardUI(plateId);
        }
    } catch (err) {
        if (typeof showToast === 'function') {
            showToast('Errore caricamento dettagli: ' + err.message, 'danger');
        }
    }
}

function _updateSelectedCardUI(plateId) {
    document.querySelectorAll('.plate-card').forEach(card => {
        card.classList.toggle('selected', parseInt(card.dataset.plateId) === plateId);
    });
}

// ============================================================
// MANUAL PLATE CREATION
// ============================================================

/**
 * Create a new plate manually from the modal form
 */
async function createManualPlate() {
    const plateInput  = document.getElementById('new-plate-number');
    const typeSelect  = document.getElementById('new-plate-type');
    const notesInput  = document.getElementById('new-plate-notes');

    if (!plateInput || !plateInput.value.trim()) {
        if (typeof showToast === 'function') showToast('Inserisci il numero di targa', 'warning');
        return;
    }

    try {
        await apiCall('create_manual_plate.php', {
            method: 'POST',
            body: {
                plate_number: plateInput.value.trim().toUpperCase(),
                type:         typeSelect ? typeSelect.value : 'transit',
                notes:        notesInput ? notesInput.value.trim() : '',
            },
        });

        // Close modal
        const modalEl = document.getElementById('modalNewPlate');
        if (modalEl) bootstrap.Modal.getInstance(modalEl)?.hide();

        // Reset form
        if (plateInput)  plateInput.value  = '';
        if (notesInput)  notesInput.value  = '';

        if (typeof showToast === 'function') showToast('Targa creata con successo', 'success');
        await loadPlates();
    } catch (err) {
        if (typeof showToast === 'function') showToast('Errore creazione targa: ' + err.message, 'danger');
    }
}

// ============================================================
// MANUAL TICKET CREATION
// ============================================================

/**
 * Create a new ticket manually from the modal form
 */
async function createManualTicket() {
    const plateInput  = document.getElementById('new-ticket-plate');
    const amountInput = document.getElementById('new-ticket-amount');
    const notesInput  = document.getElementById('new-ticket-notes');

    try {
        await apiCall('create_manual_ticket.php', {
            method: 'POST',
            body: {
                plate_number: plateInput ? plateInput.value.trim().toUpperCase() : '',
                amount:       amountInput ? parseFloat(amountInput.value) || 0 : 0,
                notes:        notesInput ? notesInput.value.trim() : '',
            },
        });

        // Close modal
        const modalEl = document.getElementById('modalNewTicket');
        if (modalEl) bootstrap.Modal.getInstance(modalEl)?.hide();

        // Reset form
        if (plateInput)  plateInput.value  = '';
        if (amountInput) amountInput.value = '';
        if (notesInput)  notesInput.value  = '';

        if (typeof showToast === 'function') showToast('Ticket creato con successo', 'success');
        await loadPlates();
    } catch (err) {
        if (typeof showToast === 'function') showToast('Errore creazione ticket: ' + err.message, 'danger');
    }
}

// ============================================================
// HELPERS
// ============================================================

function _lastPassage(plate) {
    return (plate.passages && plate.passages.length > 0)
        ? plate.passages[plate.passages.length - 1]
        : null;
}
