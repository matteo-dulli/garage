'use strict';

// ============================================================
// MODULE STATE
// ============================================================

let allPlates        = [];
let selectedPlateId  = null;
let selectedIsPassage = false;
let selectPlateLock  = false;

// ============================================================
// DATA LOADING
// ============================================================

/**
 * Load plates (and associated passages) from the API.
 * @param {boolean} silent - When true, skip the loading spinner.
 */
async function loadPlates(silent = false) {
    if (!silent) {
        const container = document.getElementById('platesList');
        if (container) {
            container.innerHTML = `
                <div class="loading-indicator">
                    <span>⏳ Caricamento...</span>
                </div>
            `;
        }
    }

    try {
        const resp = await fetch(`${API_BASE}/get_plates.php?t=${Date.now()}`, {
            cache: 'no-store',
        });
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const data = await resp.json();

        if (data.success) {
            allPlates = data.plates || data.data || [];
        } else {
            throw new Error(data.message || 'Errore caricamento targhe');
        }

        updatePlatesList();
    } catch (err) {
        console.error('❌ loadPlates error:', err);
        if (typeof showToast === 'function') {
            showToast('❌ Errore caricamento targhe: ' + err.message, 'error', 3000);
        }
    }
}

// ============================================================
// LIST RENDERING
// ============================================================

/**
 * Build the HTML string for a single plate list item.
 * @param {Object} plate - Plate data object
 * @returns {string} HTML string
 */
function _buildPlateItemHtml(plate) {
    const classes = ['plate-item'];
    if (plate.is_passage) classes.push('passage');
    else if (plate.is_manual) classes.push('manual');
    else classes.push('detected');
    if (plate.annullato) classes.push('annullato');
    if (plate.paid) classes.push('pagato');
    if (plate.id === selectedPlateId && !selectedIsPassage) classes.push('active');

    const plateNum  = plate.plate || plate.plate_number || '';
    const entryTime = plate.Tentry_time || plate.entry_time || '';
    const exitTime  = plate.Texit_time  || plate.exit_time  || '';

    return `
        <div class="${classes.join(' ')}"
             data-plate-id="${plate.id}"
             onclick="selectPlate(${plate.id}, event)">
            <span class="plate-number">${plateNum}</span>
            <span class="plate-times">${entryTime ? '🟢 ' + entryTime : ''}${exitTime ? ' 🔴 ' + exitTime : ''}</span>
        </div>
    `;
}

/**
 * Render the current allPlates array into the plates list element.
 * Applies the annullato / pagato CSS classes so colour coding is always fresh.
 */
function updatePlatesList() {
    const container = document.getElementById('platesList');
    if (!container) return;

    if (!allPlates || allPlates.length === 0) {
        container.innerHTML = '<div class="empty-list">Nessuna targa trovata</div>';
        return;
    }

    container.innerHTML = allPlates.map(_buildPlateItemHtml).join('');
}

/**
 * Filter and re-render the plates list based on an optional search query.
 * @param {string} [query=''] - Search string to filter plates by plate number or ticket code.
 */
function filterAndRenderPlates(query = '') {
    if (!query) {
        updatePlatesList();
        return;
    }
    const q = query.toLowerCase();
    const filtered = allPlates.filter(p => {
        const plateNum   = (p.plate || p.plate_number || '').toLowerCase();
        const ticketCode = (p.ticket_code || '').toLowerCase();
        return plateNum.includes(q) || ticketCode.includes(q);
    });

    const container = document.getElementById('platesList');
    if (!container) return;

    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-list">Nessun risultato</div>';
        return;
    }

    container.innerHTML = filtered.map(_buildPlateItemHtml).join('');
}

// ============================================================
// PLATE SELECTION
// ============================================================

/**
 * Select a plate from the list and render its details.
 * @param {number} plateId
 * @param {Event}  [event]
 */
async function selectPlate(plateId, event) {
    if (event && event.stopPropagation) {
        event.stopPropagation();
    }

    selectedPlateId   = plateId;
    selectedIsPassage = false;
    selectPlateLock   = true;

    // Highlight selected item in the list
    document.querySelectorAll('.plate-item').forEach(el => {
        const id = parseInt(el.dataset.plateId, 10);
        el.classList.toggle('active', id === plateId);
    });

    try {
        const url = `${API_BASE}/get_plate.php?id=${plateId}&t=${Date.now()}`;
        console.log('📸 selectPlate: carico da', url);

        const resp = await fetch(url, { cache: 'no-store' });
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const data = await resp.json();

        console.log('🔍 GET_PLATE risposta:', data);

        if (!data.success) {
            if (typeof showToast === 'function') {
                showToast(data.message || '❌ Errore caricamento targa', 'error', 3000);
            }
            return;
        }

        const plate = data.data || data.plate;
        console.log('✅ Targa caricata completo:', plate);

        if (typeof renderPlateDetailsWithTimes === 'function') {
            console.log('✅ Chiamo renderPlateDetailsWithTimes');
            renderPlateDetailsWithTimes(plate);
        } else if (typeof renderDetails === 'function') {
            console.log('⚠️ Fallback a renderDetails');
            renderDetails(plate);
        } else {
            if (typeof showToast === 'function') {
                showToast('❌ Nessuna funzione render disponibile', 'error');
            }
        }

    } catch (err) {
        console.error('❌ selectPlate error:', err);
        if (typeof showToast === 'function') {
            showToast('❌ Errore caricamento targa', 'error', 3000);
        }
    }
}

// ============================================================
// PASSAGE SELECTION
// ============================================================

/**
 * Select a passage from the list and render its details.
 * @param {number} passageId
 * @param {Event}  [event]
 */
async function selectPassage(passageId, event) {
    if (event && event.stopPropagation) {
        event.stopPropagation();
    }

    selectedPlateId   = passageId;
    selectedIsPassage = true;
    selectPlateLock   = true;

    // Highlight selected item in the list
    document.querySelectorAll('.plate-item').forEach(el => {
        const id = parseInt(el.dataset.passageId || el.dataset.plateId, 10);
        el.classList.toggle('active', id === passageId);
    });

    try {
        const url = `${API_BASE}/get_passage.php?id=${passageId}&t=${Date.now()}`;
        console.log('🚶 selectPassage: carico da', url);

        const resp = await fetch(url, { cache: 'no-store' });
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const data = await resp.json();

        console.log('🔍 GET_PASSAGE risposta:', data);

        if (!data.success) {
            if (typeof showToast === 'function') {
                showToast(data.message || '❌ Errore caricamento passaggio', 'error', 3000);
            }
            return;
        }

        const passage = data.data || data.passage;
        console.log('✅ Passaggio caricato:', passage);

        if (typeof renderPassageDetails === 'function') {
            console.log('✅ Chiamo renderPassageDetails');
            renderPassageDetails(passage);
        } else {
            if (typeof showToast === 'function') {
                showToast('❌ Funzione renderPassageDetails non disponibile', 'error');
            }
        }

    } catch (err) {
        console.error('❌ selectPassage error:', err);
        if (typeof showToast === 'function') {
            showToast('❌ Errore caricamento passaggio', 'error', 3000);
        }
    }
}

// ============================================================
// PLATE CREATION
// ============================================================

/**
 * Create a new plate manually using values from the new-plate form fields.
 */
async function createManualPlate() {
    const plateInput = document.getElementById('newPlateNumber');
    const typeSelect = document.getElementById('newPlateType');
    const notesInput = document.getElementById('newPlateNotes');

    if (!plateInput || !plateInput.value.trim()) {
        if (typeof showToast === 'function') {
            showToast('⚠️ Inserisci il numero di targa', 'warning');
        }
        return;
    }

    try {
        const resp = await fetch(`${API_BASE}/create_manual_plate.php`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
                plate_number: plateInput.value.trim().toUpperCase(),
                type:         typeSelect ? typeSelect.value : 'manual',
                notes:        notesInput ? notesInput.value.trim() : '',
            }),
        });
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const result = await resp.json();
        if (!result.success) throw new Error(result.message || 'Errore sconosciuto');

        if (typeof showToast === 'function') {
            showToast('✅ Targa creata con successo', 'success');
        }

        // Reset form fields
        plateInput.value = '';
        if (notesInput) notesInput.value = '';

        await loadPlates();
    } catch (err) {
        console.error('❌ createManualPlate error:', err);
        if (typeof showToast === 'function') {
            showToast('❌ Errore creazione targa: ' + err.message, 'error');
        }
    }
}

// ============================================================
// PLATE DELETION
// ============================================================

/**
 * Ask for confirmation then delete the plate with the given ID.
 * @param {number} plateId
 */
async function confirmDeletePlate(plateId) {
    if (!confirm('Eliminare questa targa e tutti i dati associati?')) return;

    try {
        const resp = await fetch(`${API_BASE}/delete_plate.php`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ id: plateId }),
        });
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const result = await resp.json();
        if (!result.success) throw new Error(result.message || 'Errore sconosciuto');

        if (typeof showToast === 'function') {
            showToast('🗑️ Targa eliminata', 'warning');
        }

        closeDetails();
        await loadPlates();
    } catch (err) {
        console.error('❌ confirmDeletePlate error:', err);
        if (typeof showToast === 'function') {
            showToast('❌ Errore eliminazione: ' + err.message, 'error');
        }
    }
}

// ============================================================
// DETAIL PANEL CLOSE
// ============================================================

/**
 * Close and clear the details panel and button container.
 */
function closeDetails() {
    const detailsPanel = document.getElementById('detailsPanel');
    if (detailsPanel) detailsPanel.innerHTML = '';

    const buttonContainer = document.getElementById('detailsButtonContainer');
    if (buttonContainer) {
        buttonContainer.innerHTML = '';
        buttonContainer.style.display = 'none';
    }

    const imageBox = document.getElementById('imageBox');
    if (imageBox) imageBox.innerHTML = '';

    selectedPlateId   = null;
    selectedIsPassage = false;

    // Deselect all list items
    document.querySelectorAll('.plate-item.active').forEach(el => el.classList.remove('active'));
}
