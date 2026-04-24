'use strict';
/**
 * Modulo 5 - Autorizzazioni
 * Gestione autorizzazione veicolo (tipo accesso)
 */
function mountModulo5(container, plateId, ctx) {
    const itemId = 'modulo5-' + plateId;
    const html = `
    <div class="accordion-item module-section">
        <h2 class="accordion-header">
            <button class="accordion-button collapsed" type="button"
                    data-bs-target="#${itemId}"
                    onclick="toggleAccordion('${itemId}')">
                ✅ Autorizzazioni
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
    _loadModulo5(plateId, ctx, itemId);
}

async function _loadModulo5(plateId, ctx, itemId) {
    const body  = document.getElementById(itemId + '-body');
    const badge = document.getElementById(itemId + '-badge');
    try {
        const [autorRes, costRes] = await Promise.all([
            apiCall('moduli/get_autorizzazione.php?plate_number=' + encodeURIComponent(ctx.plate_number)),
            apiCall('moduli/get_costanti.php?section=AUTORIZZATI'),
        ]);
        const current = autorRes.data.autor;
        const options = costRes.data.values || [];

        if (badge) {
            badge.textContent = current || 'Nessuna';
            badge.className   = current ? 'badge bg-success ms-2' : 'badge bg-secondary ms-2';
        }

        const opts = options.map(o =>
            `<option value="${escapeHtml(o)}"${current === o ? ' selected' : ''}>${escapeHtml(o)}</option>`
        ).join('');

        if (body) body.innerHTML = `
            <div class="row g-2 align-items-end">
                <div class="col">
                    <label class="form-label">Tipo autorizzazione</label>
                    <select id="${itemId}-autor" class="form-select form-select-sm">
                        <option value="">— Nessuna —</option>
                        ${opts}
                    </select>
                </div>
                <div class="col-auto">
                    <button class="btn btn-sm btn-primary" onclick="_saveModulo5('${escapeHtml(ctx.plate_number)}', '${itemId}')">
                        <i class="bi bi-save"></i> Salva
                    </button>
                </div>
            </div>`;
    } catch (e) {
        if (body) body.innerHTML = '<p class="text-danger small">Errore caricamento autorizzazione.</p>';
    }
}

async function _saveModulo5(plateNumber, itemId) {
    const autor = document.getElementById(itemId + '-autor')?.value || '';
    try {
        await apiCall('moduli/set_autorizzazione.php', {
            method: 'POST',
            body: { plate_number: plateNumber, autor },
        });
        showToast('Autorizzazione salvata', 'success');
        const badge = document.getElementById(itemId + '-badge');
        if (badge) {
            badge.textContent = autor || 'Nessuna';
            badge.className   = autor ? 'badge bg-success ms-2' : 'badge bg-secondary ms-2';
        }
    } catch (e) {
        showToast('Errore salvataggio autorizzazione: ' + e.message, 'error');
    }
}
