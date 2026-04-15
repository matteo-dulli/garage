/**
 * details.js - Unified details rendering for plates and passages
 * Garage ANPR Management System
 *
 * Section order:
 *  1. 🚪 Uscita   (EXIT - shown FIRST)
 *  2. 🚪 Ingresso (ENTRY - shown SECOND)
 *  3. 💳 Ticket
 *  4. 🚙 Veicolo
 *  5. 🎫 Abbonamento
 *  6. 💳 Tessera a Scalare
 *  7. 🚗 Veicolo Autorizzato
 *  8. 📝 Note
 */

'use strict';

// ============================================================
// ACCORDION TOGGLE
// ============================================================

/**
 * Toggle an accordion section
 * @param {string} sectionId - ID of the collapsible div
 */
function toggleAccordion(sectionId) {
    const el = document.getElementById(sectionId);
    if (!el) return;
    const isOpen = el.classList.contains('show');
    // Close all siblings first
    const parent = el.closest('.accordion');
    if (parent) {
        parent.querySelectorAll('.accordion-collapse.show').forEach(open => {
            open.classList.remove('show');
            const btn = parent.querySelector(`[data-bs-target="#${open.id}"]`);
            if (btn) btn.classList.add('collapsed');
        });
    }
    if (!isOpen) {
        el.classList.add('show');
        const btn = document.querySelector(`[data-bs-target="#${sectionId}"]`);
        if (btn) btn.classList.remove('collapsed');
    }
}

// ============================================================
// PLATE DETAILS RENDERING
// ============================================================

/**
 * Render full plate details in the detail panel
 * @param {Object} plate - Plate data object
 */
function renderDetails(plate) {
    const panel = document.getElementById('detail-panel');
    if (!panel) return;
    AppState.selectedPlate = plate;

    const lastPassage = (plate.passages && plate.passages.length > 0)
        ? plate.passages[plate.passages.length - 1]
        : null;

    panel.innerHTML = `
        <div class="detail-header d-flex align-items-center justify-content-between mb-3">
            <div>
                <h4 class="mb-0 plate-badge">${escapeHtml(plate.plate_number)}</h4>
                <small class="text-muted">${_plateTypeLabel(plate.type)}</small>
            </div>
            <div class="d-flex gap-2">
                <button class="btn btn-sm btn-outline-danger" onclick="deletePlate(${plate.id})" title="Elimina targa">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        </div>

        <div class="accordion" id="accordionPlate${plate.id}">

            <!-- 1. USCITA (EXIT - FIRST) -->
            <div class="accordion-item">
                <h2 class="accordion-header">
                    <button class="accordion-button ${lastPassage && lastPassage.exit_datetime ? '' : 'collapsed'}"
                            type="button" onclick="toggleAccordion('collapseUscita${plate.id}')">
                        <i class="bi bi-door-open me-2 text-warning"></i> Uscita
                        ${lastPassage && lastPassage.exit_datetime
                            ? `<span class="badge bg-warning text-dark ms-2">${formatDate(lastPassage.exit_datetime)}</span>`
                            : '<span class="badge bg-secondary ms-2">Non registrata</span>'}
                    </button>
                </h2>
                <div id="collapseUscita${plate.id}" class="accordion-collapse collapse ${lastPassage && lastPassage.exit_datetime ? 'show' : ''}">
                    <div class="accordion-body">
                        ${_renderExitSection(lastPassage)}
                    </div>
                </div>
            </div>

            <!-- 2. INGRESSO (ENTRY - SECOND) -->
            <div class="accordion-item">
                <h2 class="accordion-header">
                    <button class="accordion-button ${lastPassage && lastPassage.entry_datetime ? '' : 'collapsed'}"
                            type="button" onclick="toggleAccordion('collapseIngresso${plate.id}')">
                        <i class="bi bi-door-closed me-2 text-success"></i> Ingresso
                        ${lastPassage && lastPassage.entry_datetime
                            ? `<span class="badge bg-success ms-2">${formatDate(lastPassage.entry_datetime)}</span>`
                            : '<span class="badge bg-secondary ms-2">Non registrato</span>'}
                    </button>
                </h2>
                <div id="collapseIngresso${plate.id}" class="accordion-collapse collapse ${lastPassage && lastPassage.entry_datetime ? 'show' : ''}">
                    <div class="accordion-body">
                        ${_renderEntrySection(lastPassage)}
                    </div>
                </div>
            </div>

            <!-- 3. TICKET -->
            <div class="accordion-item">
                <h2 class="accordion-header">
                    <button class="accordion-button collapsed" type="button"
                            onclick="toggleAccordion('collapseTicket${plate.id}')">
                        <i class="bi bi-receipt me-2 text-primary"></i> Ticket
                        ${plate.ticket_code
                            ? `<span class="badge bg-primary ms-2">${escapeHtml(plate.ticket_code)}</span>`
                            : '<span class="badge bg-secondary ms-2">Nessun ticket</span>'}
                    </button>
                </h2>
                <div id="collapseTicket${plate.id}" class="accordion-collapse collapse">
                    <div class="accordion-body">
                        ${_renderTicketSection(plate, lastPassage)}
                    </div>
                </div>
            </div>

            <!-- 4. VEICOLO -->
            <div class="accordion-item">
                <h2 class="accordion-header">
                    <button class="accordion-button collapsed" type="button"
                            onclick="toggleAccordion('collapseVeicolo${plate.id}')">
                        <i class="bi bi-car-front me-2 text-info"></i> Veicolo
                    </button>
                </h2>
                <div id="collapseVeicolo${plate.id}" class="accordion-collapse collapse">
                    <div class="accordion-body">
                        ${_renderVehicleSection(plate)}
                    </div>
                </div>
            </div>

            <!-- 5. ABBONAMENTO -->
            <div class="accordion-item">
                <h2 class="accordion-header">
                    <button class="accordion-button collapsed" type="button"
                            onclick="toggleAccordion('collapseAbbonamento${plate.id}')">
                        <i class="bi bi-calendar-check me-2 text-success"></i> Abbonamento
                        ${plate.subscription
                            ? `<span class="badge bg-success ms-2">Attivo</span>`
                            : ''}
                    </button>
                </h2>
                <div id="collapseAbbonamento${plate.id}" class="accordion-collapse collapse">
                    <div class="accordion-body">
                        ${_renderSubscriptionSection(plate)}
                    </div>
                </div>
            </div>

            <!-- 6. TESSERA A SCALARE -->
            <div class="accordion-item">
                <h2 class="accordion-header">
                    <button class="accordion-button collapsed" type="button"
                            onclick="toggleAccordion('collapseTessera${plate.id}')">
                        <i class="bi bi-credit-card me-2 text-secondary"></i> Tessera a Scalare
                        ${plate.prepaid_card
                            ? `<span class="badge bg-secondary ms-2">${formatAmount(plate.prepaid_card.balance)}</span>`
                            : ''}
                    </button>
                </h2>
                <div id="collapseTessera${plate.id}" class="accordion-collapse collapse">
                    <div class="accordion-body">
                        ${_renderPrepaidSection(plate)}
                    </div>
                </div>
            </div>

            <!-- 7. VEICOLO AUTORIZZATO -->
            <div class="accordion-item">
                <h2 class="accordion-header">
                    <button class="accordion-button collapsed" type="button"
                            onclick="toggleAccordion('collapseAutorizzato${plate.id}')">
                        <i class="bi bi-shield-check me-2 text-warning"></i> Veicolo Autorizzato
                        ${plate.is_authorized
                            ? '<span class="badge bg-warning text-dark ms-2">Sì</span>'
                            : ''}
                    </button>
                </h2>
                <div id="collapseAutorizzato${plate.id}" class="accordion-collapse collapse">
                    <div class="accordion-body">
                        ${_renderAuthorizedSection(plate)}
                    </div>
                </div>
            </div>

            <!-- 8. NOTE -->
            <div class="accordion-item">
                <h2 class="accordion-header">
                    <button class="accordion-button collapsed" type="button"
                            onclick="toggleAccordion('collapseNote${plate.id}')">
                        <i class="bi bi-pencil-square me-2 text-muted"></i> Note
                    </button>
                </h2>
                <div id="collapseNote${plate.id}" class="accordion-collapse collapse">
                    <div class="accordion-body">
                        ${_renderNotesSection(plate)}
                    </div>
                </div>
            </div>

        </div>

        <!-- Passages history -->
        ${plate.passages && plate.passages.length > 1 ? _renderPassagesHistory(plate) : ''}
    `;
}

// ============================================================
// PASSAGE DETAILS RENDERING
// ============================================================

/**
 * Render passage details in the detail panel
 * @param {Object} passage - Passage data object
 */
function renderPassageDetails(passage) {
    const panel = document.getElementById('detail-panel');
    if (!panel) return;
    AppState.selectedPassage = passage;

    panel.innerHTML = `
        <div class="detail-header d-flex align-items-center justify-content-between mb-3">
            <div>
                <h4 class="mb-0 plate-badge">${escapeHtml(passage.plate_number || 'Targa sconosciuta')}</h4>
                <small class="text-muted">Passaggio #${passage.id}</small>
            </div>
            <div class="d-flex gap-2">
                <button class="btn btn-sm btn-outline-danger" onclick="deletePassage(${passage.id})" title="Elimina passaggio">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        </div>

        <div class="accordion" id="accordionPassage${passage.id}">

            <!-- 1. USCITA (EXIT - FIRST) -->
            <div class="accordion-item">
                <h2 class="accordion-header">
                    <button class="accordion-button ${passage.exit_datetime ? '' : 'collapsed'}"
                            type="button" onclick="toggleAccordion('collapseUscitaP${passage.id}')">
                        <i class="bi bi-door-open me-2 text-warning"></i> Uscita
                        ${passage.exit_datetime
                            ? `<span class="badge bg-warning text-dark ms-2">${formatDate(passage.exit_datetime)}</span>`
                            : '<span class="badge bg-secondary ms-2">Non registrata</span>'}
                    </button>
                </h2>
                <div id="collapseUscitaP${passage.id}" class="accordion-collapse collapse ${passage.exit_datetime ? 'show' : ''}">
                    <div class="accordion-body">
                        ${_renderExitSection(passage)}
                    </div>
                </div>
            </div>

            <!-- 2. INGRESSO (ENTRY - SECOND) -->
            <div class="accordion-item">
                <h2 class="accordion-header">
                    <button class="accordion-button ${passage.entry_datetime ? '' : 'collapsed'}"
                            type="button" onclick="toggleAccordion('collapseIngressoP${passage.id}')">
                        <i class="bi bi-door-closed me-2 text-success"></i> Ingresso
                        ${passage.entry_datetime
                            ? `<span class="badge bg-success ms-2">${formatDate(passage.entry_datetime)}</span>`
                            : '<span class="badge bg-secondary ms-2">Non registrato</span>'}
                    </button>
                </h2>
                <div id="collapseIngressoP${passage.id}" class="accordion-collapse collapse ${passage.entry_datetime ? 'show' : ''}">
                    <div class="accordion-body">
                        ${_renderEntrySection(passage)}
                    </div>
                </div>
            </div>

            <!-- 3. TICKET -->
            <div class="accordion-item">
                <h2 class="accordion-header">
                    <button class="accordion-button ${passage.ticket_code ? '' : 'collapsed'}"
                            type="button" onclick="toggleAccordion('collapseTicketP${passage.id}')">
                        <i class="bi bi-receipt me-2 text-primary"></i> Ticket
                        ${passage.ticket_code
                            ? `<span class="badge bg-primary ms-2">${escapeHtml(passage.ticket_code)}</span>`
                            : '<span class="badge bg-secondary ms-2">Nessun ticket</span>'}
                    </button>
                </h2>
                <div id="collapseTicketP${passage.id}" class="accordion-collapse collapse ${passage.ticket_code ? 'show' : ''}">
                    <div class="accordion-body">
                        ${_renderPassageTicketSection(passage)}
                    </div>
                </div>
            </div>

            <!-- 8. NOTE -->
            <div class="accordion-item">
                <h2 class="accordion-header">
                    <button class="accordion-button collapsed" type="button"
                            onclick="toggleAccordion('collapseNoteP${passage.id}')">
                        <i class="bi bi-pencil-square me-2 text-muted"></i> Note
                    </button>
                </h2>
                <div id="collapseNoteP${passage.id}" class="accordion-collapse collapse">
                    <div class="accordion-body">
                        <textarea class="form-control" id="passage-notes-${passage.id}" rows="3">${escapeHtml(passage.notes || '')}</textarea>
                        <button class="btn btn-sm btn-primary mt-2" onclick="savePassageNotes(${passage.id})">
                            <i class="bi bi-save"></i> Salva
                        </button>
                    </div>
                </div>
            </div>

        </div>
    `;
}

// ============================================================
// FORM POPULATION (for ticket data updates)
// ============================================================

/**
 * Update the detail panel form fields with ticket data
 * @param {Object} data - Object with plate and/or ticket info
 */
function updateFormWithTicketData(data) {
    if (!data) return;
    // Use plate.ticket_code if available, fallback to data.ticket_code
    const ticketCode = (data.plate && data.plate.ticket_code) || data.ticket_code || '';
    const ticketInput = document.getElementById('ticket-code-input');
    if (ticketInput && ticketCode) {
        ticketInput.value = ticketCode;
    }
    // Amount
    const amountInput = document.getElementById('ticket-amount-input');
    if (amountInput && (data.amount !== undefined)) {
        amountInput.value = data.amount;
    }
    // Paid status
    const paidCheck = document.getElementById('ticket-paid-input');
    if (paidCheck && (data.paid !== undefined)) {
        paidCheck.checked = !!data.paid;
    }
}

// ============================================================
// SECTION RENDERERS (private helpers)
// ============================================================

function _renderExitSection(passage) {
    if (!passage) {
        return '<p class="text-muted mb-0">Nessun passaggio registrato.</p>';
    }
    if (!passage.exit_datetime) {
        return `
            <p class="text-muted mb-2">Uscita non ancora registrata.</p>
            <button class="btn btn-sm btn-warning" onclick="registerExit(${passage.id})">
                <i class="bi bi-door-open"></i> Registra Uscita
            </button>
        `;
    }
    return `
        <dl class="row mb-0">
            <dt class="col-sm-4">Data/Ora</dt>
            <dd class="col-sm-8">${formatDate(passage.exit_datetime)}</dd>
            ${passage.exit_image ? `<dt class="col-sm-4">Immagine</dt>
            <dd class="col-sm-8"><img src="${escapeHtml(passage.exit_image)}" class="img-thumbnail" style="max-height:120px" alt="Uscita"></dd>` : ''}
        </dl>
        <button class="btn btn-sm btn-outline-secondary mt-2" onclick="editPassage(${passage.id}, 'exit')">
            <i class="bi bi-pencil"></i> Modifica
        </button>
    `;
}

function _renderEntrySection(passage) {
    if (!passage) {
        return '<p class="text-muted mb-0">Nessun passaggio registrato.</p>';
    }
    if (!passage.entry_datetime) {
        return `
            <p class="text-muted mb-2">Ingresso non ancora registrato.</p>
            <button class="btn btn-sm btn-success" onclick="registerEntry(${passage.id})">
                <i class="bi bi-door-closed"></i> Registra Ingresso
            </button>
        `;
    }
    return `
        <dl class="row mb-0">
            <dt class="col-sm-4">Data/Ora</dt>
            <dd class="col-sm-8">${formatDate(passage.entry_datetime)}</dd>
            ${passage.entry_image ? `<dt class="col-sm-4">Immagine</dt>
            <dd class="col-sm-8"><img src="${escapeHtml(passage.entry_image)}" class="img-thumbnail" style="max-height:120px" alt="Ingresso"></dd>` : ''}
        </dl>
        <button class="btn btn-sm btn-outline-secondary mt-2" onclick="editPassage(${passage.id}, 'entry')">
            <i class="bi bi-pencil"></i> Modifica
        </button>
    `;
}

function _renderTicketSection(plate, passage) {
    const ticketCode = plate.ticket_code || (passage && passage.ticket_code) || '';
    if (!ticketCode) {
        return `
            <p class="text-muted mb-2">Nessun ticket emesso.</p>
            <button class="btn btn-sm btn-primary" onclick="emitTicket(${plate.id}, ${passage ? passage.id : 'null'})">
                <i class="bi bi-printer"></i> Emetti Ticket
            </button>
        `;
    }
    return `
        <dl class="row mb-0">
            <dt class="col-sm-4">Codice</dt>
            <dd class="col-sm-8"><code>${escapeHtml(ticketCode)}</code></dd>
            ${plate.ticket_amount ? `<dt class="col-sm-4">Importo</dt><dd class="col-sm-8">${formatAmount(plate.ticket_amount)}</dd>` : ''}
            ${plate.ticket_paid !== undefined ? `<dt class="col-sm-4">Pagato</dt><dd class="col-sm-8">${plate.ticket_paid ? '<span class="badge bg-success">Sì</span>' : '<span class="badge bg-danger">No</span>'}</dd>` : ''}
        </dl>
        <div class="mt-2 d-flex gap-2">
            <button class="btn btn-sm btn-outline-secondary" onclick="reprintTicket('${escapeHtml(ticketCode)}')">
                <i class="bi bi-printer"></i> Ristampa
            </button>
            <button class="btn btn-sm btn-outline-primary" onclick="updateTicketStatus('${escapeHtml(ticketCode)}')">
                <i class="bi bi-pencil"></i> Aggiorna
            </button>
        </div>
    `;
}

function _renderPassageTicketSection(passage) {
    if (!passage.ticket_code) {
        return `
            <p class="text-muted mb-2">Nessun ticket emesso.</p>
            <button class="btn btn-sm btn-primary" onclick="emitTicket(null, ${passage.id})">
                <i class="bi bi-printer"></i> Emetti Ticket
            </button>
        `;
    }
    return `
        <dl class="row mb-0">
            <dt class="col-sm-4">Codice</dt>
            <dd class="col-sm-8"><code>${escapeHtml(passage.ticket_code)}</code></dd>
            ${passage.amount ? `<dt class="col-sm-4">Importo</dt><dd class="col-sm-8">${formatAmount(passage.amount)}</dd>` : ''}
            ${passage.paid !== undefined ? `<dt class="col-sm-4">Pagato</dt><dd class="col-sm-8">${passage.paid ? '<span class="badge bg-success">Sì</span>' : '<span class="badge bg-danger">No</span>'}</dd>` : ''}
        </dl>
        <div class="mt-2 d-flex gap-2">
            <button class="btn btn-sm btn-outline-secondary" onclick="reprintTicket('${escapeHtml(passage.ticket_code)}')">
                <i class="bi bi-printer"></i> Ristampa
            </button>
        </div>
    `;
}

function _renderVehicleSection(plate) {
    return `
        <dl class="row mb-0">
            <dt class="col-sm-4">Targa</dt>
            <dd class="col-sm-8"><strong>${escapeHtml(plate.plate_number)}</strong></dd>
            <dt class="col-sm-4">Tipo</dt>
            <dd class="col-sm-8">${_plateTypeLabel(plate.type)}</dd>
            ${plate.brand ? `<dt class="col-sm-4">Marca</dt><dd class="col-sm-8">${escapeHtml(plate.brand)}</dd>` : ''}
            ${plate.model ? `<dt class="col-sm-4">Modello</dt><dd class="col-sm-8">${escapeHtml(plate.model)}</dd>` : ''}
            ${plate.color ? `<dt class="col-sm-4">Colore</dt><dd class="col-sm-8">${escapeHtml(plate.color)}</dd>` : ''}
            <dt class="col-sm-4">Creata il</dt>
            <dd class="col-sm-8">${formatDate(plate.created_at)}</dd>
        </dl>
    `;
}

function _renderSubscriptionSection(plate) {
    if (!plate.subscription) {
        return '<p class="text-muted mb-0">Nessun abbonamento attivo.</p>';
    }
    const sub = plate.subscription;
    const expired = sub.end_date && new Date(sub.end_date) < new Date();
    return `
        <dl class="row mb-0">
            <dt class="col-sm-4">Tipo</dt>
            <dd class="col-sm-8">${escapeHtml(sub.type || '—')}</dd>
            <dt class="col-sm-4">Inizio</dt>
            <dd class="col-sm-8">${formatDate(sub.start_date)}</dd>
            <dt class="col-sm-4">Fine</dt>
            <dd class="col-sm-8">
                ${formatDate(sub.end_date)}
                ${expired ? '<span class="badge bg-danger ms-1">Scaduto</span>' : '<span class="badge bg-success ms-1">Valido</span>'}
            </dd>
        </dl>
    `;
}

function _renderPrepaidSection(plate) {
    if (!plate.prepaid_card) {
        return '<p class="text-muted mb-0">Nessuna tessera a scalare.</p>';
    }
    const card = plate.prepaid_card;
    return `
        <dl class="row mb-0">
            <dt class="col-sm-4">Codice</dt>
            <dd class="col-sm-8"><code>${escapeHtml(card.code || '—')}</code></dd>
            <dt class="col-sm-4">Saldo</dt>
            <dd class="col-sm-8">${formatAmount(card.balance)}</dd>
            <dt class="col-sm-4">Scadenza</dt>
            <dd class="col-sm-8">${formatDate(card.expiry_date)}</dd>
        </dl>
    `;
}

function _renderAuthorizedSection(plate) {
    if (!plate.is_authorized) {
        return '<p class="text-muted mb-0">Veicolo non autorizzato.</p>';
    }
    return `
        <dl class="row mb-0">
            <dt class="col-sm-4">Stato</dt>
            <dd class="col-sm-8"><span class="badge bg-success">Autorizzato</span></dd>
            ${plate.authorized_until ? `<dt class="col-sm-4">Fino al</dt><dd class="col-sm-8">${formatDate(plate.authorized_until)}</dd>` : ''}
            ${plate.authorized_reason ? `<dt class="col-sm-4">Motivo</dt><dd class="col-sm-8">${escapeHtml(plate.authorized_reason)}</dd>` : ''}
        </dl>
    `;
}

function _renderNotesSection(plate) {
    return `
        <textarea class="form-control" id="plate-notes-${plate.id}" rows="3">${escapeHtml(plate.notes || '')}</textarea>
        <button class="btn btn-sm btn-primary mt-2" onclick="savePlateNotes(${plate.id})">
            <i class="bi bi-save"></i> Salva
        </button>
    `;
}

function _renderPassagesHistory(plate) {
    const rows = plate.passages.slice().reverse().map(p => `
        <tr style="cursor:pointer" onclick="selectPassage(${JSON.stringify(p).replace(/"/g, '&quot;')})">
            <td>${formatDate(p.entry_datetime)}</td>
            <td>${formatDate(p.exit_datetime)}</td>
            <td>${p.ticket_code ? `<code>${escapeHtml(p.ticket_code)}</code>` : '—'}</td>
        </tr>
    `).join('');
    return `
        <div class="mt-3">
            <h6 class="text-muted">Storico passaggi</h6>
            <div class="table-responsive">
                <table class="table table-sm table-hover">
                    <thead><tr><th>Ingresso</th><th>Uscita</th><th>Ticket</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>
    `;
}

function _plateTypeLabel(type) {
    const labels = {
        transit: 'Transito',
        subscription: 'Abbonamento',
        authorized: 'Autorizzato',
    };
    return labels[type] || (type ? escapeHtml(type) : 'Transito');
}

// ============================================================
// ACTION HANDLERS
// ============================================================

async function emitTicket(plateId, passageId) {
    try {
        const result = await saveFinalTicket(passageId, { plate_id: plateId });
        if (typeof showToast === 'function') {
            showToast('Ticket emesso: ' + (result.ticket_code || ''), 'success');
        }
        if (AppState.selectedPlate && typeof renderDetails === 'function') {
            const updated = await apiCall('get_plate.php?id=' + (plateId || AppState.selectedPlate.id));
            if (updated && updated.plate) renderDetails(updated.plate);
        }
    } catch (err) {
        if (typeof showToast === 'function') {
            showToast('Errore emissione ticket: ' + err.message, 'danger');
        }
    }
}

async function reprintTicket(ticketCode) {
    try {
        await apiCall('reprint_ticket.php', { method: 'POST', body: { ticket_code: ticketCode } });
        if (typeof showToast === 'function') {
            showToast('Ticket ristampato', 'success');
        }
    } catch (err) {
        if (typeof showToast === 'function') {
            showToast('Errore ristampa: ' + err.message, 'danger');
        }
    }
}

async function registerEntry(passageId) {
    try {
        await apiCall('update_passage.php', {
            method: 'POST',
            body: { id: passageId, entry_datetime: new Date().toISOString() },
        });
        if (typeof showToast === 'function') showToast('Ingresso registrato', 'success');
        if (AppState.selectedPlate) {
            const updated = await apiCall('get_plate.php?id=' + AppState.selectedPlate.id);
            if (updated && updated.plate) renderDetails(updated.plate);
        }
    } catch (err) {
        if (typeof showToast === 'function') showToast('Errore: ' + err.message, 'danger');
    }
}

async function registerExit(passageId) {
    try {
        await apiCall('update_passage.php', {
            method: 'POST',
            body: { id: passageId, exit_datetime: new Date().toISOString() },
        });
        if (typeof showToast === 'function') showToast('Uscita registrata', 'success');
        if (AppState.selectedPlate) {
            const updated = await apiCall('get_plate.php?id=' + AppState.selectedPlate.id);
            if (updated && updated.plate) renderDetails(updated.plate);
        }
    } catch (err) {
        if (typeof showToast === 'function') showToast('Errore: ' + err.message, 'danger');
    }
}

async function deletePlate(plateId) {
    if (!confirm('Eliminare questa targa e tutti i dati associati?')) return;
    try {
        await apiCall('delete_plate.php', { method: 'POST', body: { id: plateId } });
        if (typeof showToast === 'function') showToast('Targa eliminata', 'warning');
        document.getElementById('detail-panel').innerHTML = '<div class="text-center text-muted py-5"><i class="bi bi-car-front fs-2"></i><p class="mt-2">Seleziona una targa per vedere i dettagli</p></div>';
        AppState.selectedPlate = null;
        if (typeof loadPlates === 'function') loadPlates();
    } catch (err) {
        if (typeof showToast === 'function') showToast('Errore eliminazione: ' + err.message, 'danger');
    }
}

async function deletePassage(passageId) {
    if (!confirm('Eliminare questo passaggio?')) return;
    try {
        await apiCall('delete_passage.php', { method: 'POST', body: { id: passageId } });
        if (typeof showToast === 'function') showToast('Passaggio eliminato', 'warning');
        if (AppState.selectedPlate) {
            const updated = await apiCall('get_plate.php?id=' + AppState.selectedPlate.id);
            if (updated && updated.plate) renderDetails(updated.plate);
        }
    } catch (err) {
        if (typeof showToast === 'function') showToast('Errore eliminazione: ' + err.message, 'danger');
    }
}

async function savePlateNotes(plateId) {
    const textarea = document.getElementById('plate-notes-' + plateId);
    if (!textarea) return;
    try {
        await apiCall('update_plate.php', { method: 'POST', body: { id: plateId, notes: textarea.value } });
        if (typeof showToast === 'function') showToast('Note salvate', 'success');
    } catch (err) {
        if (typeof showToast === 'function') showToast('Errore salvataggio note: ' + err.message, 'danger');
    }
}

async function savePassageNotes(passageId) {
    const textarea = document.getElementById('passage-notes-' + passageId);
    if (!textarea) return;
    try {
        await apiCall('update_passage.php', { method: 'POST', body: { id: passageId, notes: textarea.value } });
        if (typeof showToast === 'function') showToast('Note salvate', 'success');
    } catch (err) {
        if (typeof showToast === 'function') showToast('Errore salvataggio note: ' + err.message, 'danger');
    }
}
