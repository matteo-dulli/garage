'use strict';

/* ── Accordion helper ───────────────────────────────────── */
function toggleAccordion(sectionId) {
    const el = document.getElementById(sectionId);
    if (!el) return;
    const isOpen = el.classList.contains('show');
    el.closest('.accordion')?.querySelectorAll('.accordion-collapse.show').forEach(open => {
        open.classList.remove('show');
        document.querySelector(`[data-bs-target="#${open.id}"]`)?.classList.add('collapsed');
    });
    if (!isOpen) {
        el.classList.add('show');
        document.querySelector(`[data-bs-target="#${sectionId}"]`)?.classList.remove('collapsed');
    }
}

/* ── Main detail renderer ───────────────────────────────── */
function renderDetails(plate) {
    const panel = document.getElementById('detail-panel');
    if (!panel) return;
    AppState.selectedPlate = plate;

    const lastPassage = (plate.passages && plate.passages.length > 0)
        ? plate.passages[plate.passages.length - 1]
        : null;

    const ctx = {
        plate_id:       plate.id,
        plate_number:   plate.plate_number,
        entry_datetime: lastPassage ? lastPassage.entry_datetime : null,
        exit_datetime:  lastPassage ? lastPassage.exit_datetime  : null,
        ticket_code:    plate.ticket_code || (lastPassage && lastPassage.ticket_code) || null,
        ticket_id:      plate.ticket_id   || null,
        passage_id:     lastPassage ? lastPassage.id : null,
    };

    panel.innerHTML = `
        <div class="detail-header d-flex align-items-center justify-content-between mb-3">
            <div>
                <h4 class="mb-0 plate-badge">${escapeHtml(plate.plate_number)}</h4>
                <small class="text-muted">${plate.tipo ? escapeHtml(plate.tipo) : 'Transito'}</small>
            </div>
            <button class="btn btn-sm btn-outline-danger" onclick="deletePlate(${plate.id})" title="Elimina targa">
                <i class="bi bi-trash"></i>
            </button>
        </div>

        <div class="accordion" id="accordionPlate${plate.id}">

            <!-- 🚪 Entrata/Uscita & Pagamenti -->
            <div class="accordion-item">
                <h2 class="accordion-header">
                    <button class="accordion-button" type="button"
                            data-bs-target="#collapseEntrata${plate.id}"
                            onclick="toggleAccordion('collapseEntrata${plate.id}')">
                        <i class="bi bi-door-open me-2 text-success"></i>
                        🚪 Entrata/Uscita &amp; Pagamenti
                        ${lastPassage && lastPassage.entry_datetime
                            ? `<span class="badge bg-success ms-2">${formatDate(lastPassage.entry_datetime)}</span>`
                            : '<span class="badge bg-secondary ms-2">Nessun passaggio</span>'}
                    </button>
                </h2>
                <div id="collapseEntrata${plate.id}" class="accordion-collapse collapse show">
                    <div class="accordion-body">
                        ${_renderEntrataUscitaSection(plate, lastPassage)}
                    </div>
                </div>
            </div>

            <!-- Moduli placeholder -->
            <div id="moduli-container-${plate.id}">
                <div class="text-center text-muted py-2 small">
                    <i class="bi bi-hourglass-split"></i> Caricamento moduli...
                </div>
            </div>

        </div>

        ${plate.passages && plate.passages.length > 1 ? _renderPassagesHistory(plate) : ''}
    `;

    setTimeout(() => mountModuli(plate.id, ctx), 0);
}

/* ── Entrata/Uscita section ─────────────────────────────── */
function _renderEntrataUscitaSection(plate, passage) {
    const pid = passage ? passage.id : null;
    const hasEntry = passage && passage.entry_datetime;
    const hasExit  = passage && passage.exit_datetime;

    let html = '<div class="row g-2">';

    // Entry
    html += `<div class="col-sm-6">
        <label class="form-label">Entrata</label>
        <div class="input-group input-group-sm">
            <input type="datetime-local" id="entry-dt-${plate.id}" class="form-control"
                   value="${hasEntry ? _toDatetimeLocal(passage.entry_datetime) : ''}">
            <button class="btn btn-outline-success" onclick="registerEntry(${plate.id}, ${pid || 'null'})">
                <i class="bi bi-door-open"></i>
            </button>
        </div>
    </div>`;

    // Exit
    html += `<div class="col-sm-6">
        <label class="form-label">Uscita</label>
        <div class="input-group input-group-sm">
            <input type="datetime-local" id="exit-dt-${plate.id}" class="form-control"
                   value="${hasExit ? _toDatetimeLocal(passage.exit_datetime) : ''}">
            <button class="btn btn-outline-warning" onclick="registerExit(${plate.id}, ${pid || 'null'})">
                <i class="bi bi-door-closed"></i>
            </button>
        </div>
    </div>`;

    html += '</div>'; // row

    // Ticket info
    const tc = passage && passage.ticket_code ? passage.ticket_code : (plate.ticket_code || null);
    html += `<hr class="my-2">
    <div class="d-flex align-items-center gap-2 flex-wrap">
        <span class="fw-bold">Ticket:</span>
        <code id="ticket-code-display-${plate.id}">${tc ? escapeHtml(tc) : '—'}</code>
        <span id="ticket-amount-display-${plate.id}" class="text-success fw-bold">
            ${passage && passage.amount ? formatAmount(passage.amount) : ''}
        </span>
        ${passage && passage.paid
            ? '<span class="badge bg-success">Pagato</span>'
            : (tc ? '<span class="badge bg-danger">Non pagato</span>' : '')}
    </div>

    <div class="mt-2 d-flex gap-2 flex-wrap">
        <button class="btn btn-sm btn-primary" onclick="emitTicket(${plate.id}, ${pid || 'null'})">
            <i class="bi bi-ticket-perforated"></i> Emetti ticket
        </button>
        ${tc ? `<button class="btn btn-sm btn-outline-secondary" onclick="reprintTicket('${escapeHtml(tc)}')">
            <i class="bi bi-printer"></i> Ristampa
        </button>` : ''}
        ${pid ? `<button class="btn btn-sm btn-outline-danger" onclick="deletePassage(${pid})">
            <i class="bi bi-trash"></i> Elimina passaggio
        </button>` : ''}
    </div>

    <div class="mt-2">
        <label class="form-label">Note passaggio</label>
        <div class="input-group input-group-sm">
            <textarea id="passage-notes-${plate.id}" class="form-control" rows="2">${escapeHtml(passage && passage.notes ? passage.notes : '')}</textarea>
            <button class="btn btn-outline-secondary" onclick="savePassageNotes(${pid || 'null'}, ${plate.id})">
                <i class="bi bi-save"></i>
            </button>
        </div>
    </div>`;

    return html;
}

/* ── Passage history table ──────────────────────────────── */
function _renderPassagesHistory(plate) {
    const rows = plate.passages.slice().reverse().map(p => `
        <tr>
            <td>${formatDate(p.entry_datetime)}</td>
            <td>${formatDate(p.exit_datetime)}</td>
            <td><code>${escapeHtml(p.ticket_code || '—')}</code></td>
            <td>${p.paid ? '<span class="badge bg-success">Sì</span>' : '<span class="badge bg-secondary">No</span>'}</td>
            <td>
                <button class="btn btn-xs btn-outline-secondary py-0 px-1" style="font-size:.7rem"
                        onclick="deletePassage(${p.id})">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>`).join('');

    return `<div class="mt-3">
        <h6 class="text-muted"><i class="bi bi-clock-history"></i> Storico passaggi</h6>
        <div class="table-responsive">
            <table class="table table-sm table-hover passages-history mb-0">
                <thead><tr><th>Entrata</th><th>Uscita</th><th>Ticket</th><th>Pagato</th><th></th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    </div>`;
}

/* ── renderPassageDetails (standalone) ─────────────────── */
function renderPassageDetails(passage) {
    selectPassage(passage);
}

/* ── updateFormWithTicketData ───────────────────────────── */
function updateFormWithTicketData(data) {
    if (!data) return;
    const plate = data.plate || data;
    const ticket = data.ticket || null;

    if (plate && plate.id) {
        const codeEl = document.getElementById('ticket-code-display-' + plate.id);
        if (codeEl) codeEl.textContent = plate.ticket_code || (ticket && ticket.ticket_code) || '—';
        const amtEl = document.getElementById('ticket-amount-display-' + plate.id);
        if (amtEl && ticket && ticket.amount) amtEl.textContent = formatAmount(ticket.amount);
    }
}

/* ── Helper: convert DB datetime to datetime-local value ── */
function _toDatetimeLocal(dateStr) {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        if (isNaN(d)) return '';
        const pad = n => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch { return ''; }
}

/* ── Action: emit ticket ────────────────────────────────── */
async function emitTicket(plateId, passageId) {
    try {
        const data = await saveFinalTicket(passageId, { plate_id: plateId });
        updateFormWithTicketData({ plate: { id: plateId, ticket_code: data.ticket_code }, ticket: data });
        loadPlates(true);
    } catch { /* handled by saveFinalTicket */ }
}

/* ── Action: reprint ticket ─────────────────────────────── */
async function reprintTicket(ticketCode) {
    if (!ticketCode || ticketCode === '—') return;
    try {
        await apiCall('reprint_ticket.php', { method: 'POST', body: { ticket_code: ticketCode } });
        showToast('Ristampa richiesta per ' + ticketCode, 'success');
    } catch (e) {
        showToast('Errore ristampa: ' + e.message, 'error');
    }
}

/* ── Action: register entry ─────────────────────────────── */
async function registerEntry(plateId, passageId) {
    const dtInput = document.getElementById('entry-dt-' + plateId);
    const dt = dtInput ? dtInput.value : '';
    try {
        if (passageId) {
            await apiCall('update_passage.php', { method: 'POST', body: { id: passageId, entry_datetime: dt || new Date().toISOString() } });
        } else {
            await apiCall('update_plate.php', { method: 'POST', body: { id: plateId, entry_datetime: dt || new Date().toISOString() } });
        }
        showToast('Entrata registrata', 'success');
        await loadPlates(true);
        if (AppState.selectedPlate && AppState.selectedPlate.id === plateId) {
            const fresh = AppState.plates.find(p => p.id === plateId);
            if (fresh) selectPlate(fresh);
        }
    } catch (e) {
        showToast('Errore: ' + e.message, 'error');
    }
}

/* ── Action: register exit ──────────────────────────────── */
async function registerExit(plateId, passageId) {
    const dtInput = document.getElementById('exit-dt-' + plateId);
    const dt = dtInput ? dtInput.value : '';
    try {
        if (passageId) {
            await apiCall('update_passage.php', { method: 'POST', body: { id: passageId, exit_datetime: dt || new Date().toISOString() } });
        }
        showToast('Uscita registrata', 'success');
        await loadPlates(true);
        if (AppState.selectedPlate && AppState.selectedPlate.id === plateId) {
            const fresh = AppState.plates.find(p => p.id === plateId);
            if (fresh) selectPlate(fresh);
        }
    } catch (e) {
        showToast('Errore: ' + e.message, 'error');
    }
}

/* ── Action: delete plate ───────────────────────────────── */
async function deletePlate(plateId) {
    if (!confirm('Eliminare questa targa e tutti i dati correlati?')) return;
    try {
        await apiCall('delete_plate.php', { method: 'POST', body: { id: plateId } });
        showToast('Targa eliminata', 'success');
        document.getElementById('detail-panel').innerHTML =
            '<div id="detail-placeholder" class="h-100 d-flex flex-column align-items-center justify-content-center text-muted">' +
            '<i class="bi bi-arrow-left-circle fs-1 mb-3"></i><p>Seleziona una targa dalla lista</p></div>';
        AppState.selectedPlate = null;
        await loadPlates(true);
    } catch (e) {
        showToast('Errore eliminazione: ' + e.message, 'error');
    }
}

/* ── Action: delete passage ─────────────────────────────── */
async function deletePassage(passageId) {
    if (!confirm('Eliminare questo passaggio?')) return;
    try {
        await apiCall('delete_passage.php', { method: 'POST', body: { id: passageId } });
        showToast('Passaggio eliminato', 'success');
        const sel = AppState.selectedPlate;
        await loadPlates(true);
        if (sel) {
            const fresh = AppState.plates.find(p => p.id === sel.id);
            if (fresh) selectPlate(fresh);
        }
    } catch (e) {
        showToast('Errore: ' + e.message, 'error');
    }
}

/* ── Action: save plate notes ───────────────────────────── */
async function savePlateNotes(plateId) {
    const el = document.getElementById('plate-notes-' + plateId);
    if (!el) return;
    try {
        await apiCall('update_plate.php', { method: 'POST', body: { id: plateId, notes: el.value } });
        showToast('Note salvate', 'success');
    } catch (e) {
        showToast('Errore: ' + e.message, 'error');
    }
}

/* ── Action: save passage notes ─────────────────────────── */
async function savePassageNotes(passageId, plateId) {
    const el = document.getElementById('passage-notes-' + plateId);
    if (!el) return;
    if (!passageId) { showToast('Nessun passaggio attivo', 'warning'); return; }
    try {
        await apiCall('update_passage.php', { method: 'POST', body: { id: passageId, notes: el.value } });
        showToast('Note passaggio salvate', 'success');
    } catch (e) {
        showToast('Errore: ' + e.message, 'error');
    }
}

/* ── Mount all 6 modules ────────────────────────────────── */
function mountModuli(plateId, ctx) {
    const container = document.getElementById('moduli-container-' + plateId);
    if (!container) return;
    container.innerHTML = '';
    const modules = [
        { fn: 'mountModulo1', label: '🎫 Ticket' },
        { fn: 'mountModulo2', label: '🚗 Veicolo' },
        { fn: 'mountModulo3', label: '🪪 Abbonamento' },
        { fn: 'mountModulo4', label: '💳 Tessera a Scalare' },
        { fn: 'mountModulo5', label: '✅ Autorizzazioni' },
        { fn: 'mountModulo6', label: '🗒️ Note ingresso/uscita' },
    ];
    modules.forEach(({ fn, label }) => {
        if (typeof window[fn] === 'function') {
            try {
                window[fn](container, plateId, ctx);
            } catch (e) {
                console.error('Error mounting ' + fn, e);
            }
        }
    });
}
