'use strict';
/**
 * Modulo 4 - Tessera a Scalare
 * Gestione tessera prepagata: ricarica, annullamento, nuova tessera
 */
function mountModulo4(container, plateId, ctx) {
    const itemId = 'modulo4-' + plateId;
    const html = `
    <div class="accordion-item module-section">
        <h2 class="accordion-header">
            <button class="accordion-button collapsed" type="button"
                    data-bs-target="#${itemId}"
                    onclick="toggleAccordion('${itemId}')">
                💳 Tessera a Scalare
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
    _loadModulo4(plateId, ctx, itemId);
}

async function _loadModulo4(plateId, ctx, itemId) {
    const body  = document.getElementById(itemId + '-body');
    const badge = document.getElementById(itemId + '-badge');
    try {
        const [tessRes, costRes] = await Promise.all([
            apiCall('moduli/get_tessera.php?plate_number=' + encodeURIComponent(ctx.plate_number)),
            apiCall('moduli/get_costanti.php?section=DESCRIZIONI FASCE'),
        ]);
        const t      = tessRes.data.tessera;
        const fasce  = costRes.data.values || [];

        if (!t) {
            if (badge) { badge.textContent = 'Nessuna'; badge.className = 'badge bg-secondary ms-2'; }
        } else {
            if (badge) { badge.textContent = 'Residuo: ' + formatAmount(t.res1); badge.className = 'badge bg-info text-dark ms-2'; }
        }

        if (body) body.innerHTML = _renderModulo4Form(plateId, ctx, t, fasce, itemId);
    } catch (e) {
        if (body) body.innerHTML = '<p class="text-danger small">Errore caricamento tessera.</p>';
    }
}

function _renderModulo4Form(plateId, ctx, t, fasce, itemId) {
    const v    = t || {};
    const opts = fasce.map(f => `<option value="${escapeHtml(f)}"${v.fascias === f ? ' selected' : ''}>${escapeHtml(f)}</option>`).join('');

    let html = '';

    if (t) {
        html += `
        <div class="mb-2 p-2 bg-light rounded">
            <div class="d-flex justify-content-between">
                <span class="fw-bold">Tessera #${escapeHtml(String(t.id))}</span>
                <span class="text-success fw-bold">Residuo: ${formatAmount(t.res1)}</span>
            </div>
            <div class="small text-muted">${escapeHtml(t.nome || '')} — ${escapeHtml(t.fascias || 'Nessuna fascia')}</div>
        </div>`;
    } else {
        html += `<div class="alert alert-secondary py-2 small mb-2">Nessuna tessera attiva per questa targa.</div>`;
    }

    html += `
    <hr class="my-2">
    <h6 class="small fw-bold text-muted">Nuova tessera / Ricarica</h6>
    <div class="row g-2">
        <div class="col-sm-6">
            <label class="form-label">Nome intestatario</label>
            <input type="text" id="${itemId}-nome" class="form-control form-control-sm" value="${escapeHtml(v.nome || '')}">
        </div>
        <div class="col-sm-6">
            <label class="form-label">Fascia tariffaria</label>
            <select id="${itemId}-fascias" class="form-select form-select-sm">
                <option value="">— Seleziona —</option>${opts}
            </select>
        </div>
        <div class="col-sm-6">
            <label class="form-label">Importo ricarica (€)</label>
            <input type="number" id="${itemId}-prezzo" class="form-control form-control-sm" placeholder="0.00" step="0.01" min="0">
        </div>
        <div class="col-sm-6">
            <label class="form-label">Data pagamento</label>
            <input type="date" id="${itemId}-dpay" class="form-control form-control-sm" value="${new Date().toISOString().substring(0,10)}">
        </div>
        <div class="col-12 d-flex gap-3 flex-wrap">
            <div class="form-check">
                <input class="form-check-input" type="checkbox" id="${itemId}-apay" checked>
                <label class="form-check-label" for="${itemId}-apay">Pagato</label>
            </div>
            <div class="form-check">
                <input class="form-check-input" type="checkbox" id="${itemId}-spaye">
                <label class="form-check-label" for="${itemId}-spaye">Elettronico</label>
            </div>
            <div class="form-check">
                <input class="form-check-input" type="checkbox" id="${itemId}-spayc">
                <label class="form-check-label" for="${itemId}-spayc">Contante</label>
            </div>
        </div>
    </div>
    <div class="mt-2 d-flex gap-2 flex-wrap">
        ${t ? `<button class="btn btn-sm btn-success" onclick="_ricaricaTessera(${t.id}, '${itemId}')">
            <i class="bi bi-plus-circle"></i> Conferma Ricarica
        </button>` : ''}
        <button class="btn btn-sm btn-primary" onclick="_nuovaTessera('${escapeHtml(ctx.plate_number)}', '${itemId}')">
            <i class="bi bi-card-plus"></i> Genera Nuova Tessera
        </button>
        ${t ? `<button class="btn btn-sm btn-outline-danger" onclick="_showAnnullaTessera(${t.id}, '${itemId}')">
            <i class="bi bi-x-circle"></i> Annulla Tessera
        </button>` : ''}
    </div>
    <div id="${itemId}-annulla-form" class="mt-2" style="display:none">
        <div class="input-group input-group-sm">
            <input type="text" id="${itemId}-motivo" class="form-control" placeholder="Motivo annullamento…">
            <button class="btn btn-danger" onclick="_annullaTessera(${t ? t.id : 0}, '${itemId}')">Conferma annullamento</button>
        </div>
    </div>`;

    return html;
}

function _showAnnullaTessera(id, itemId) {
    const form = document.getElementById(itemId + '-annulla-form');
    if (form) form.style.display = form.style.display === 'none' ? '' : 'none';
}

async function _ricaricaTessera(id, itemId) {
    const get = suffix => document.getElementById(itemId + suffix)?.value ?? '';
    const chk = suffix => document.getElementById(itemId + suffix)?.checked ? 1 : 0;
    const prezzo = parseFloat(get('-prezzo'));
    if (!prezzo || prezzo <= 0) { showToast('Inserire importo ricarica', 'warning'); return; }
    try {
        const res = await apiCall('moduli/ricarica_tessera.php', {
            method: 'POST',
            body: { id, prezzo, Apay: chk('-apay'), SpayE: chk('-spaye'), SpayC: chk('-spayc'), Dpay: get('-dpay') || null },
        });
        showToast('Ricarica effettuata. Residuo: ' + formatAmount(res.data.tessera.res1), 'success');
        const badge = document.getElementById(itemId + '-badge');
        if (badge) { badge.textContent = 'Residuo: ' + formatAmount(res.data.tessera.res1); badge.className = 'badge bg-info text-dark ms-2'; }
    } catch (e) {
        showToast('Errore ricarica: ' + e.message, 'error');
    }
}

async function _annullaTessera(id, itemId) {
    const motivo = document.getElementById(itemId + '-motivo')?.value?.trim() || '';
    if (!id) { showToast('Nessuna tessera da annullare', 'warning'); return; }
    try {
        await apiCall('moduli/annulla_tessera.php', { method: 'POST', body: { id, motivo } });
        showToast('Tessera annullata', 'success');
        const body = document.getElementById(itemId + '-body');
        if (body) body.innerHTML = '<p class="text-muted small">Tessera annullata. Generare nuova tessera se necessario.</p>';
        const badge = document.getElementById(itemId + '-badge');
        if (badge) { badge.textContent = 'Annullata'; badge.className = 'badge bg-danger ms-2'; }
    } catch (e) {
        showToast('Errore annullamento: ' + e.message, 'error');
    }
}

async function _nuovaTessera(plateNumber, itemId) {
    if (!confirm('Generare una nuova tessera? Se presente, quella attiva sarà annullata e il residuo trasferito.')) return;
    const get    = suffix => document.getElementById(itemId + suffix)?.value ?? '';
    const nome   = get('-nome');
    const fascias = get('-fascias');
    try {
        const res = await apiCall('moduli/nuova_tessera.php', {
            method: 'POST',
            body: { plate_number: plateNumber, nome, fascias },
        });
        const t = res.data.tessera;
        showToast(`Nuova tessera #${t.id} creata. Residuo trasferito: ${formatAmount(res.data.residuo_trasferito)}`, 'success');
        const badge = document.getElementById(itemId + '-badge');
        if (badge) { badge.textContent = 'Residuo: ' + formatAmount(t.res1); badge.className = 'badge bg-info text-dark ms-2'; }
        const body = document.getElementById(itemId + '-body');
        if (body) {
            const topDiv = body.querySelector('.mb-2.p-2.bg-light');
            if (topDiv) topDiv.innerHTML = `
                <div class="d-flex justify-content-between">
                    <span class="fw-bold">Tessera #${escapeHtml(String(t.id))}</span>
                    <span class="text-success fw-bold">Residuo: ${formatAmount(t.res1)}</span>
                </div>
                <div class="small text-muted">${escapeHtml(t.nome || '')} — ${escapeHtml(t.fascias || 'Nessuna fascia')}</div>`;
        }
    } catch (e) {
        showToast('Errore generazione tessera: ' + e.message, 'error');
    }
}
