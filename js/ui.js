/**
 * ui.js - Toast notifications, stats bar, and plates list rendering
 * Garage ANPR Management System
 */

'use strict';

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================

/**
 * Show a Bootstrap toast notification
 * @param {string} message
 * @param {'success'|'danger'|'warning'|'info'} type
 * @param {number} duration - ms (defaults to APP_CONFIG.toastDuration)
 */
function showToast(message, type = 'info', duration) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toastId = 'toast-' + Date.now();
    const delay = duration ?? (typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.toastDuration : 4000);

    const icons = {
        success: 'bi-check-circle-fill',
        danger:  'bi-x-circle-fill',
        warning: 'bi-exclamation-triangle-fill',
        info:    'bi-info-circle-fill',
    };

    const el = document.createElement('div');
    el.id = toastId;
    el.className = `toast align-items-center text-bg-${type} border-0`;
    el.setAttribute('role', 'alert');
    el.setAttribute('aria-live', 'assertive');
    el.innerHTML = `
        <div class="d-flex">
            <div class="toast-body d-flex align-items-center gap-2">
                <i class="bi ${icons[type] || icons.info}"></i>
                ${escapeHtml(message)}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    container.appendChild(el);

    const toast = new bootstrap.Toast(el, { autohide: true, delay });
    toast.show();
    el.addEventListener('hidden.bs.toast', () => el.remove());
}

// ============================================================
// STATS BAR
// ============================================================

/**
 * Update stats in the header stats bar
 * @param {Object} stats - { plates, passages, tickets }
 */
function updateStats(stats = {}) {
    const platesEl    = document.getElementById('stat-plates');
    const passagesEl  = document.getElementById('stat-passages');
    const ticketsEl   = document.getElementById('stat-tickets');

    if (platesEl)   platesEl.textContent   = stats.plates   ?? 0;
    if (passagesEl) passagesEl.textContent = stats.passages ?? 0;
    if (ticketsEl)  ticketsEl.textContent  = stats.tickets  ?? 0;
}

// ============================================================
// PLATES LIST RENDERING
// ============================================================

/**
 * Render the list of plates in the left panel
 * @param {Array} plates
 */
function updatePlatesList(plates) {
    const container = document.getElementById('plates-list');
    if (!container) return;

    if (!plates || plates.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted py-5">
                <i class="bi bi-search fs-2"></i>
                <p class="mt-2">Nessuna targa trovata</p>
            </div>
        `;
        return;
    }

    container.innerHTML = plates.map(plate => _renderPlateCard(plate)).join('');
}

/**
 * Render a single plate card in the list
 * @param {Object} plate
 * @returns {string} HTML
 */
function _renderPlateCard(plate) {
    const lastPassage = (plate.passages && plate.passages.length > 0)
        ? plate.passages[plate.passages.length - 1]
        : null;

    const isInside = lastPassage && lastPassage.entry_datetime && !lastPassage.exit_datetime;
    const statusBadge = isInside
        ? '<span class="badge bg-success">In garage</span>'
        : '<span class="badge bg-secondary">Uscito</span>';

    const hasTicket  = plate.ticket_code || (lastPassage && lastPassage.ticket_code);
    const hasSub     = !!plate.subscription;
    const isSelected = AppState.selectedPlate && AppState.selectedPlate.id === plate.id;

    return `
        <div class="plate-card ${isSelected ? 'selected' : ''}"
             onclick="selectPlate(${plate.id})"
             data-plate-id="${plate.id}">
            <div class="d-flex align-items-center justify-content-between">
                <strong class="plate-number">${escapeHtml(plate.plate_number)}</strong>
                ${statusBadge}
            </div>
            <div class="d-flex gap-1 mt-1 flex-wrap">
                ${hasTicket  ? '<span class="badge bg-primary text-white small"><i class="bi bi-receipt"></i> Ticket</span>' : ''}
                ${hasSub     ? '<span class="badge bg-success text-white small"><i class="bi bi-calendar-check"></i> Abbonato</span>' : ''}
                ${plate.is_authorized ? '<span class="badge bg-warning text-dark small"><i class="bi bi-shield-check"></i></span>' : ''}
            </div>
            ${lastPassage && lastPassage.entry_datetime
                ? `<small class="text-muted d-block mt-1">Ingresso: ${formatDate(lastPassage.entry_datetime)}</small>`
                : ''}
        </div>
    `;
}
