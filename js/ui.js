'use strict';

/* ── Toast ──────────────────────────────────────────────── */
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `app-toast ${type}`;
    toast.innerHTML = `<i class="bi ${_toastIcon(type)} me-2"></i>${escapeHtml(message)}`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 350);
    }, APP_CONFIG.toastDuration);
}

function _toastIcon(type) {
    return { success: 'bi-check-circle-fill', error: 'bi-x-circle-fill',
             warning: 'bi-exclamation-triangle-fill', info: 'bi-info-circle-fill' }[type] || 'bi-info-circle-fill';
}

/* ── Stats bar update ───────────────────────────────────── */
function updateStats(data) {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val ?? '—'; };
    set('stat-inside',  data.inside  ?? '—');
    set('stat-tickets', data.tickets ?? '—');
    set('stat-total',   data.total   ?? '—');
}

/* ── Plates list rendering ──────────────────────────────── */
function updatePlatesList(plates) {
    const list = document.getElementById('plates-list');
    if (!list) return;

    if (!plates || plates.length === 0) {
        list.innerHTML = '<li class="p-3 text-muted text-center small">Nessuna targa trovata</li>';
        return;
    }

    list.innerHTML = plates.map(p => {
        const isActive = AppState.selectedPlate && AppState.selectedPlate.id === p.id;
        const inside   = p.last_entry && !p.last_exit;
        const badge    = inside
            ? '<span class="badge bg-success ms-1" style="font-size:.65rem">IN</span>'
            : '<span class="badge bg-secondary ms-1" style="font-size:.65rem">OUT</span>';
        const meta = p.last_entry ? formatDate(p.last_entry) : 'Nessun passaggio';
        return `<li class="plate-item${isActive ? ' active' : ''}" onclick="selectPlate(${JSON.stringify(p).replace(/"/g, '&quot;')})">
            <div class="flex-grow-1 overflow-hidden">
                <div class="pn">${escapeHtml(p.plate_number)}${badge}</div>
                <div class="meta">${escapeHtml(meta)}</div>
            </div>
            ${p.tipo ? `<span class="badge bg-light text-dark border" style="font-size:.65rem">${escapeHtml(p.tipo)}</span>` : ''}
        </li>`;
    }).join('');
}
