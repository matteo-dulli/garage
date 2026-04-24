'use strict';
/**
 * Modulo 6 - Note ingresso/uscita
 * Gestione note libere associate all'evento corrente
 */
function mountModulo6(container, plateId, ctx) {
    const itemId = 'modulo6-' + plateId;
    const html = `
    <div class="accordion-item module-section">
        <h2 class="accordion-header">
            <button class="accordion-button collapsed" type="button"
                    data-bs-target="#${itemId}"
                    onclick="toggleAccordion('${itemId}')">
                🗒️ Note ingresso/uscita
            </button>
        </h2>
        <div id="${itemId}" class="accordion-collapse collapse">
            <div class="accordion-body" id="${itemId}-body">
                <div class="text-muted small">Caricamento...</div>
            </div>
        </div>
    </div>`;
    container.insertAdjacentHTML('beforeend', html);
    _loadModulo6(plateId, ctx, itemId);
}

async function _loadModulo6(plateId, ctx, itemId) {
    const body = document.getElementById(itemId + '-body');
    try {
        const qs = ctx.passage_id
            ? 'passage_id=' + ctx.passage_id
            : 'plate_id=' + ctx.plate_id;
        const res  = await apiCall('moduli/get_note.php?' + qs);
        const note = res.data.note || '';

        if (body) body.innerHTML = `
            <div>
                <label class="form-label">Note evento</label>
                <textarea id="${itemId}-note" class="form-control form-control-sm" rows="4"
                          placeholder="Annotazioni libere per questo ingresso/uscita…">${escapeHtml(note)}</textarea>
            </div>
            <div class="mt-2">
                <button class="btn btn-sm btn-primary" onclick="_saveModulo6(${ctx.passage_id || 'null'}, '${itemId}')">
                    <i class="bi bi-save"></i> Salva note
                </button>
            </div>`;
    } catch (e) {
        if (body) body.innerHTML = '<p class="text-danger small">Errore caricamento note.</p>';
    }
}

async function _saveModulo6(passageId, itemId) {
    const note = document.getElementById(itemId + '-note')?.value || '';
    if (!passageId) { showToast('Nessun passaggio attivo per salvare note', 'warning'); return; }
    try {
        await apiCall('moduli/update_note.php', {
            method: 'POST',
            body: { passage_id: passageId, note },
        });
        showToast('Note salvate', 'success');
    } catch (e) {
        showToast('Errore salvataggio note: ' + e.message, 'error');
    }
}
