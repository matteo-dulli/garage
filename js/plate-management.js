'use strict';

/* ── Load all plates ────────────────────────────────────── */
async function loadPlates(silent = false) {
    if (!silent) AppState.loading = true;
    try {
        const res = await apiCall('get_plates.php?status=' + (AppState.filterStatus || 'all'));
        AppState.plates = res.data.plates || [];
        updateStats(res.data.stats || {});
        filterAndRenderPlates();
    } catch (e) {
        if (!silent) showToast('Errore caricamento targhe: ' + e.message, 'error');
    } finally {
        AppState.loading = false;
    }
}

/* ── Filter and render ──────────────────────────────────── */
function filterAndRenderPlates() {
    const query  = AppState.searchQuery  || '';
    const status = AppState.filterStatus || 'all';
    const filtered = filterPlates(AppState.plates, query, status);
    updatePlatesList(filtered);
}

/* ── Select a plate → load full details ─────────────────── */
async function selectPlate(plate) {
    // Mark active in list immediately
    document.querySelectorAll('.plate-item').forEach(li => li.classList.remove('active'));
    event?.currentTarget?.classList.add('active');

    try {
        const res = await apiCall('get_plate.php?id=' + plate.id);
        const full = res.data.plate;
        AppState.selectedPlate = full;
        renderDetails(full);
        // Re-mark active after re-render
        document.querySelectorAll('.plate-item').forEach(li => {
            const onclick = li.getAttribute('onclick') || '';
            if (onclick.includes('"id":' + full.id) || onclick.includes('"id": ' + full.id)) {
                li.classList.add('active');
            }
        });
    } catch (e) {
        showToast('Errore caricamento dettagli: ' + e.message, 'error');
    }
}

/* ── Create manual plate ────────────────────────────────── */
async function createManualPlate() {
    const number = document.getElementById('new-plate-number')?.value?.trim().toUpperCase();
    const tipo   = document.getElementById('new-plate-tipo')?.value?.trim()  || '';
    const notes  = document.getElementById('new-plate-notes')?.value?.trim() || '';

    if (!number) { showToast('Inserire il numero di targa', 'warning'); return; }

    try {
        const res = await apiCall('create_manual_plate.php', {
            method: 'POST',
            body: { plate_number: number, tipo, notes },
        });
        showToast('Targa creata: ' + number, 'success');
        bootstrap.Modal.getInstance(document.getElementById('modalNewPlate'))?.hide();
        document.getElementById('new-plate-number').value = '';
        document.getElementById('new-plate-tipo').value   = '';
        document.getElementById('new-plate-notes').value  = '';
        await loadPlates(true);
        selectPlate(res.data.plate);
    } catch (e) {
        showToast('Errore creazione targa: ' + e.message, 'error');
    }
}

/* ── Create manual ticket ───────────────────────────────── */
async function createManualTicket() {
    const plateNum = document.getElementById('new-ticket-plate')?.value?.trim().toUpperCase() || '';
    const amount   = parseFloat(document.getElementById('new-ticket-amount')?.value || '0');
    const notes    = document.getElementById('new-ticket-notes')?.value?.trim() || '';

    try {
        const res = await apiCall('create_manual_ticket.php', {
            method: 'POST',
            body: { plate_number: plateNum || null, amount: isNaN(amount) ? 0 : amount, notes },
        });
        showToast('Ticket emesso: ' + res.data.ticket_code, 'success');
        bootstrap.Modal.getInstance(document.getElementById('modalNewTicket'))?.hide();
        document.getElementById('new-ticket-plate').value  = '';
        document.getElementById('new-ticket-amount').value = '';
        document.getElementById('new-ticket-notes').value  = '';
        await loadPlates(true);
    } catch (e) {
        showToast('Errore emissione ticket: ' + e.message, 'error');
    }
}
