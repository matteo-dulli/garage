'use strict';
/**
 * Modulo 2 - Veicolo
 * Gestione tipo, marca, colore, posizione, note veicolo
 */
function mountModulo2(container, plateId, ctx) {
    const itemId = 'modulo2-' + plateId;
    const html = `
    <div class="accordion-item module-section">
        <h2 class="accordion-header">
            <button class="accordion-button collapsed" type="button"
                    data-bs-target="#${itemId}"
                    onclick="toggleAccordion('${itemId}')">
                🚗 Veicolo
            </button>
        </h2>
        <div id="${itemId}" class="accordion-collapse collapse">
            <div class="accordion-body" id="${itemId}-body">
                <div class="text-muted small">Caricamento...</div>
            </div>
        </div>
    </div>`;
    container.insertAdjacentHTML('beforeend', html);
    _loadModulo2(plateId, ctx, itemId);
}

async function _loadModulo2(plateId, ctx, itemId) {
    const body = document.getElementById(itemId + '-body');
    try {
        const res = await apiCall('moduli/get_veicolo.php?plate_number=' + encodeURIComponent(ctx.plate_number) + '&plate_id=' + ctx.plate_id);
        const v   = res.data.veicolo || {};
        if (body) body.innerHTML = _renderModulo2Form(plateId, ctx, v, itemId);
    } catch (e) {
        if (body) body.innerHTML = '<p class="text-danger small">Errore caricamento dati veicolo.</p>';
    }
}

function _renderModulo2Form(plateId, ctx, v, itemId) {
    return `
    <div class="row g-2">
        <div class="col-sm-6">
            <label class="form-label">Tipo veicolo</label>
            <input type="text" id="${itemId}-tipo" class="form-control form-control-sm"
                   value="${escapeHtml(v.tipo || '')}" placeholder="Auto, Moto, Furgone…">
        </div>
        <div class="col-sm-6">
            <label class="form-label">Marca</label>
            <input type="text" id="${itemId}-marca" class="form-control form-control-sm"
                   value="${escapeHtml(v.marca || '')}" placeholder="Fiat, BMW…">
        </div>
        <div class="col-sm-6">
            <label class="form-label">Colore</label>
            <input type="text" id="${itemId}-colore" class="form-control form-control-sm"
                   value="${escapeHtml(v.colore || '')}" placeholder="Bianco, Nero…">
        </div>
        <div class="col-sm-6">
            <label class="form-label">Posizione parcheggio</label>
            <input type="text" id="${itemId}-posizione" class="form-control form-control-sm"
                   value="${escapeHtml(v.posizione || '')}" placeholder="A1, P2…">
        </div>
        <div class="col-12">
            <label class="form-label">Note veicolo</label>
            <textarea id="${itemId}-notev" class="form-control form-control-sm" rows="2">${escapeHtml(v.notev || '')}</textarea>
        </div>
    </div>
    <div class="mt-2">
        <button class="btn btn-sm btn-primary" onclick="_saveModulo2(${plateId}, '${escapeHtml(ctx.plate_number)}', '${itemId}')">
            <i class="bi bi-save"></i> Salva veicolo
        </button>
    </div>`;
}

async function _saveModulo2(plateId, plateNumber, itemId) {
    const get = id => document.getElementById(id)?.value ?? '';
    const body = {
        plate_id:     plateId,
        plate_number: plateNumber,
        tipo:         get(itemId + '-tipo'),
        marca:        get(itemId + '-marca'),
        colore:       get(itemId + '-colore'),
        posizione:    get(itemId + '-posizione'),
        notev:        get(itemId + '-notev'),
    };
    try {
        await apiCall('moduli/update_veicolo.php', { method: 'POST', body });
        showToast('Dati veicolo salvati', 'success');
    } catch (e) {
        showToast('Errore salvataggio veicolo: ' + e.message, 'error');
    }
}
