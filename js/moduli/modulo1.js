'use strict';
/**
 * Modulo 1 - Ticket (Sola Lettura)
 * Mostra i dati del ticket associato all'evento corrente
 */
function mountModulo1(container, plateId, ctx) {
    const itemId = 'modulo1-' + plateId;
    const html = `
    <div class="accordion-item module-section">
        <h2 class="accordion-header">
            <button class="accordion-button collapsed" type="button"
                    data-bs-target="#${itemId}"
                    onclick="toggleAccordion('${itemId}')">
                🎫 Ticket
                <span id="${itemId}-badge" class="badge bg-secondary ms-2">—</span>
            </button>
        </h2>
        <div id="${itemId}" class="accordion-collapse collapse">
            <div class="accordion-body" id="${itemId}-body">
                <div class="text-muted small">Caricamento...</div>
            </div>
        </div>
    </div>`;
    container.insertAdjacentHTML('beforeend', html);
    _loadModulo1(plateId, ctx, itemId);
}

async function _loadModulo1(plateId, ctx, itemId) {
    const body  = document.getElementById(itemId + '-body');
    const badge = document.getElementById(itemId + '-badge');
    try {
        const qs = 'plate_id=' + ctx.plate_id + (ctx.passage_id ? '&passage_id=' + ctx.passage_id : '');
        const res = await apiCall('moduli/get_ticket_details.php?' + qs);
        const t   = res.data && res.data.ticket;
        if (!t) {
            if (body)  body.innerHTML  = '<p class="text-muted mb-0">Nessun ticket per questo evento.</p>';
            if (badge) { badge.textContent = 'Nessuno'; badge.className = 'badge bg-secondary ms-2'; }
            return;
        }
        if (badge) { badge.textContent = escapeHtml(t.ticket_code || '—'); badge.className = 'badge bg-primary ms-2'; }
        if (body) body.innerHTML = `
            <dl class="row mb-0">
                <dt class="col-sm-4">Codice</dt>
                <dd class="col-sm-8"><code>${escapeHtml(t.ticket_code)}</code></dd>
                <dt class="col-sm-4">Ingresso</dt>
                <dd class="col-sm-8">${formatDate(t.entry_datetime)}</dd>
                <dt class="col-sm-4">Uscita</dt>
                <dd class="col-sm-8">${formatDate(t.exit_datetime)}</dd>
                <dt class="col-sm-4">Importo</dt>
                <dd class="col-sm-8">${formatAmount(t.amount)}</dd>
                <dt class="col-sm-4">Pagato</dt>
                <dd class="col-sm-8">${t.paid ? '<span class="badge bg-success">Sì</span>' : '<span class="badge bg-danger">No</span>'}</dd>
                ${t.ticket_note ? `<dt class="col-sm-4">Nota</dt><dd class="col-sm-8">${escapeHtml(t.ticket_note)}</dd>` : ''}
            </dl>
            <div class="mt-2 d-flex gap-2">
                <button class="btn btn-sm btn-outline-secondary" onclick="reprintTicket('${escapeHtml(t.ticket_code)}')">
                    <i class="bi bi-printer"></i> Ristampa
                </button>
            </div>`;
    } catch (e) {
        if (body) body.innerHTML = '<p class="text-danger small">Errore caricamento ticket.</p>';
    }
}
