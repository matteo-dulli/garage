'use strict';
/**
 * Modulo 3 - Abbonamento
 * Gestione abbonamento: tipo, date, pagamento
 */
function mountModulo3(container, plateId, ctx) {
    const itemId = 'modulo3-' + plateId;
    const html = `
    <div class="accordion-item module-section">
        <h2 class="accordion-header">
            <button class="accordion-button collapsed" type="button"
                    data-bs-target="#${itemId}"
                    onclick="toggleAccordion('${itemId}')">
                🪪 Abbonamento
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
    _loadModulo3(plateId, ctx, itemId);
}

async function _loadModulo3(plateId, ctx, itemId) {
    const body  = document.getElementById(itemId + '-body');
    const badge = document.getElementById(itemId + '-badge');
    try {
        const [abbRes, costRes] = await Promise.all([
            apiCall('moduli/get_abbonamento.php?plate_number=' + encodeURIComponent(ctx.plate_number)),
            apiCall('moduli/get_costanti.php?section=ABBONAMENTI'),
        ]);
        const abb     = abbRes.data.abbonamento;
        const tipiAbb = costRes.data.values || [];

        // Compute status badge
        if (!abb || !abb.attivo) {
            if (badge) { badge.textContent = abb ? 'Inattivo' : 'Nessuno'; badge.className = 'badge bg-secondary ms-2'; }
        } else {
            const today  = new Date();
            const finabb = abb.finabb ? new Date(abb.finabb) : null;
            if (finabb && finabb < today) {
                if (badge) { badge.textContent = 'Scaduto'; badge.className = 'badge bg-danger ms-2'; }
            } else if (finabb && (finabb - today) / 86400000 <= 7) {
                if (badge) { badge.textContent = 'In scadenza'; badge.className = 'badge bg-warning text-dark ms-2'; }
            } else {
                if (badge) { badge.textContent = 'Attivo'; badge.className = 'badge bg-success ms-2'; }
            }
        }

        if (body) body.innerHTML = _renderModulo3Form(plateId, ctx, abb, tipiAbb, itemId);
    } catch (e) {
        if (body) body.innerHTML = '<p class="text-danger small">Errore caricamento abbonamento.</p>';
    }
}

function _renderModulo3Form(plateId, ctx, abb, tipiAbb, itemId) {
    const v  = abb || {};
    const opts = tipiAbb.map(t => `<option value="${escapeHtml(t)}"${v.tipo_abb === t ? ' selected' : ''}>${escapeHtml(t)}</option>`).join('');

    return `
    <div class="row g-2">
        <div class="col-sm-6">
            <label class="form-label">Nome intestatario</label>
            <input type="text" id="${itemId}-nome" class="form-control form-control-sm" value="${escapeHtml(v.nome || '')}">
        </div>
        <div class="col-sm-6">
            <label class="form-label">Tipo abbonamento</label>
            <select id="${itemId}-tipo_abb" class="form-select form-select-sm">
                <option value="">— Seleziona —</option>${opts}
            </select>
        </div>
        <div class="col-sm-6">
            <label class="form-label">Inizio</label>
            <input type="date" id="${itemId}-inabb" class="form-control form-control-sm" value="${v.inabb || ''}">
        </div>
        <div class="col-sm-6">
            <label class="form-label">Fine</label>
            <input type="date" id="${itemId}-finabb" class="form-control form-control-sm" value="${v.finabb || ''}">
        </div>
        <div class="col-sm-6">
            <label class="form-label">Prezzo (€)</label>
            <input type="number" id="${itemId}-prezzo" class="form-control form-control-sm" value="${v.prezzo || ''}" step="0.01" min="0">
        </div>
        <div class="col-sm-6">
            <label class="form-label">Data pagamento</label>
            <input type="date" id="${itemId}-dpay" class="form-control form-control-sm" value="${v.Dpay ? v.Dpay.substring(0,10) : ''}">
        </div>
        <div class="col-12 d-flex gap-3 flex-wrap">
            <div class="form-check">
                <input class="form-check-input" type="checkbox" id="${itemId}-attivo" ${v.attivo ? 'checked' : ''}>
                <label class="form-check-label" for="${itemId}-attivo">Attivo</label>
            </div>
            <div class="form-check">
                <input class="form-check-input" type="checkbox" id="${itemId}-apay" ${v.Apay ? 'checked' : ''}>
                <label class="form-check-label" for="${itemId}-apay">Pagato</label>
            </div>
            <div class="form-check">
                <input class="form-check-input" type="checkbox" id="${itemId}-spaye" ${v.SpayE ? 'checked' : ''}>
                <label class="form-check-label" for="${itemId}-spaye">Elettronico</label>
            </div>
            <div class="form-check">
                <input class="form-check-input" type="checkbox" id="${itemId}-spayc" ${v.SpayC ? 'checked' : ''}>
                <label class="form-check-label" for="${itemId}-spayc">Contante</label>
            </div>
        </div>
    </div>
    <div class="mt-2">
        <button class="btn btn-sm btn-primary" onclick="_saveModulo3(${plateId}, '${escapeHtml(ctx.plate_number)}', '${itemId}')">
            <i class="bi bi-save"></i> Salva abbonamento
        </button>
    </div>`;
}

async function _saveModulo3(plateId, plateNumber, itemId) {
    const get  = id => document.getElementById(id)?.value ?? '';
    const chk  = id => document.getElementById(id)?.checked ? 1 : 0;
    const body = {
        plate_number: plateNumber,
        nome:         get(itemId + '-nome'),
        tipo_abb:     get(itemId + '-tipo_abb'),
        inabb:        get(itemId + '-inabb')  || null,
        finabb:       get(itemId + '-finabb') || null,
        prezzo:       parseFloat(get(itemId + '-prezzo')) || null,
        Dpay:         get(itemId + '-dpay')   || null,
        attivo:       chk(itemId + '-attivo'),
        Apay:         chk(itemId + '-apay'),
        SpayE:        chk(itemId + '-spaye'),
        SpayC:        chk(itemId + '-spayc'),
    };
    try {
        await apiCall('moduli/upsert_abbonamento.php', { method: 'POST', body });
        showToast('Abbonamento salvato', 'success');
        // Refresh badge
        const badge = document.getElementById(itemId + '-badge');
        if (badge && body.attivo) {
            const today = new Date();
            const fin   = body.finabb ? new Date(body.finabb) : null;
            if (fin && fin < today) { badge.textContent = 'Scaduto'; badge.className = 'badge bg-danger ms-2'; }
            else if (fin && (fin - today) / 86400000 <= 7) { badge.textContent = 'In scadenza'; badge.className = 'badge bg-warning text-dark ms-2'; }
            else { badge.textContent = 'Attivo'; badge.className = 'badge bg-success ms-2'; }
        }
    } catch (e) {
        showToast('Errore salvataggio abbonamento: ' + e.message, 'error');
    }
}
