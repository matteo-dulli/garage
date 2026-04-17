'use strict';

// ============================================================
// MODULE-LEVEL STATE
// ============================================================

let _ticketWatcherInterval      = null;
let _subscriptionWatcherInterval = null;
let _prepaidWatcherInterval     = null;

// Delay (ms) between a successful save and the detail-panel reload.
// Gives the server time to commit the write before we fetch fresh data.
const SERVER_COMMIT_DELAY_MS = 500;

// ============================================================
// DURATION HELPER
// ============================================================

/**
 * Calculate parking duration between entry and exit timestamps.
 * @param {string} entryDate - YYYY-MM-DD
 * @param {string} entryTime - HH:MM
 * @param {string} exitDate  - YYYY-MM-DD
 * @param {string} exitTime  - HH:MM
 * @returns {{giorni: number, ore: number, minuti: number}}
 */
function calculateDuration(entryDate, entryTime, exitDate, exitTime) {
    if (!entryDate || !exitDate) return { giorni: 0, ore: 0, minuti: 0 };
    try {
        const entry = new Date(`${entryDate}T${entryTime || '00:00'}:00`);
        const exit  = new Date(`${exitDate}T${exitTime  || '00:00'}:00`);
        const diffMins = Math.max(0, Math.floor((exit - entry) / 60000));
        return {
            giorni:  Math.floor(diffMins / 1440),
            ore:     Math.floor((diffMins % 1440) / 60),
            minuti:  diffMins % 60,
        };
    } catch (_) {
        return { giorni: 0, ore: 0, minuti: 0 };
    }
}

// ============================================================
// MAIN RENDER FUNCTION — renderPlateDetailsWithTimes
// ============================================================

/**
 * Render full plate details with entry/exit times in the details panel.
 * HTML is set ONCE; event listeners are attached ONCE after rendering.
 * @param {Object} plate - Plate data object from the API
 */
async function renderPlateDetailsWithTimes(plate) {
    try {
        const detailsPanel = document.getElementById('detailsPanel');
        if (!detailsPanel) return;

        const plateId      = plate.id;
        const displayPlate = plate.plate || plate.plate_number || '';

        // Normalise field names from different API shapes
        const entryDate = plate.Tentry_date || plate.entry_date || '';
        const entryTime = plate.Tentry_time || plate.entry_time || '';
        const exitDate  = plate.Texit_date  || plate.exit_date  || '';
        const exitTime  = plate.Texit_time  || plate.exit_time  || '';

        const { giorni, ore, minuti } = calculateDuration(entryDate, entryTime, exitDate, exitTime);

        const annullato   = !!plate.annullato;
        const motivo      = plate.motivo      || '';
        const paid        = !!plate.paid;
        const payC        = !!plate.pag_cash;
        const payE        = !!plate.pag_electronic;
        const fascia      = plate.fascia      || 'F1';
        const price       = plate.prezzo      != null ? plate.prezzo : (plate.price || 0);
        const invoiceCode = plate.invoice_code || plate.codice_ricevuta || '';
        const dateText    = plate.date         || plate.created_at     || '';
        const sourceText  = plate.is_manual
            ? '✏️ Inserita manualmente'
            : '📸 Rilevata dalla telecamera';

        // ===== BUILD HTML (single block, set once) =====
        const html = `
            <div class="detail-plate-header">
                <h3 class="plate-number">${displayPlate}</h3>
            </div>
            <div class="detail-form">

                <div class="detail-section">
                    <h4 class="section-title">🚪 Ingresso</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Data Ingresso</label>
                            <input type="date" id="plateEntryDate" class="form-control" value="${entryDate}" />
                        </div>
                        <div class="form-group">
                            <label>Ora Ingresso</label>
                            <input type="time" id="plateEntryTime" class="form-control" value="${entryTime}" />
                        </div>
                    </div>
                </div>

                <div class="detail-section">
                    <h4 class="section-title">🚪 Uscita</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Data Uscita</label>
                            <input type="date" id="plateExitDate" class="form-control" value="${exitDate}" />
                        </div>
                        <div class="form-group">
                            <label>Ora Uscita</label>
                            <input type="time" id="plateExitTime" class="form-control" value="${exitTime}" />
                        </div>
                    </div>
                </div>

                <div class="detail-section">
                    <h4 class="section-title">🎫 Ticket</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Codice Ticket</label>
                            <input type="text" id="ticketCode" class="form-control"
                                   value="${plate.ticket_code || ''}" placeholder="Codice ticket..." />
                        </div>
                        <div class="form-group">
                            <label>Info Ticket</label>
                            <input type="text" id="ticketInfo" class="form-control"
                                   value="${plate.ticket_info || ''}" placeholder="Info..." />
                        </div>
                    </div>
                </div>

                <div class="detail-section">
                    <h4 class="section-title">💰 Tariffa e Pagamento</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Fascia</label>
                            <select id="plateFascia" class="form-control">
                                <option value="F1" ${fascia === 'F1' ? 'selected' : ''}>F1</option>
                                <option value="F2" ${fascia === 'F2' ? 'selected' : ''}>F2</option>
                                <option value="F3" ${fascia === 'F3' ? 'selected' : ''}>F3</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Prezzo (€)</label>
                            <input type="number" id="platePrice" class="form-control"
                                   step="0.01" min="0" value="${price}" />
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group form-check-inline">
                            <label class="form-check-label">
                                <input type="checkbox" id="platePaid" class="form-check-input" ${paid ? 'checked' : ''} />
                                Pagato
                            </label>
                        </div>
                        <div class="form-group form-check-inline">
                            <label class="form-check-label">
                                <input type="checkbox" id="platePayC" class="form-check-input" ${payC ? 'checked' : ''} />
                                Contanti
                            </label>
                        </div>
                        <div class="form-group form-check-inline">
                            <label class="form-check-label">
                                <input type="checkbox" id="platePayE" class="form-check-input" ${payE ? 'checked' : ''} />
                                Elettronico
                            </label>
                        </div>
                    </div>
                </div>

                <div class="detail-section">
                    <h4 class="section-title">❌ Annullamento</h4>
                    <div class="form-row">
                        <div class="form-group form-check-inline">
                            <label class="form-check-label">
                                <input type="checkbox" id="plateAnnullato" class="form-check-input"
                                       ${annullato ? 'checked' : ''} />
                                Annullato
                            </label>
                        </div>
                        <div class="form-group" style="flex:1;">
                            <label>Motivo</label>
                            <input type="text" id="plateMotivo" class="form-control"
                                   value="${motivo}"
                                   placeholder="Motivo annullamento..."
                                   ${annullato ? '' : 'disabled'}
                                   style="opacity:${annullato ? '1' : '0.5'};cursor:${annullato ? 'auto' : 'not-allowed'};" />
                        </div>
                    </div>
                </div>

            </div>
        `;

        // ===== SET detailsPanel.innerHTML ONCE =====
        detailsPanel.innerHTML = html;

        // ===== EVENT LISTENERS FOR ANNULLATO / MOTIVO (attached once) =====
        const annullatoCheckbox = document.getElementById('plateAnnullato');
        const motivoInput       = document.getElementById('plateMotivo');

        if (annullatoCheckbox && motivoInput) {
            annullatoCheckbox.addEventListener('change', (e) => {
                motivoInput.disabled = !e.target.checked;
                if (e.target.checked) {
                    motivoInput.style.opacity = '1';
                    motivoInput.style.cursor  = 'auto';
                    motivoInput.focus();
                } else {
                    motivoInput.value         = '';
                    motivoInput.style.opacity = '0.5';
                    motivoInput.style.cursor  = 'not-allowed';
                }
            });
        }

        // ===== EVENT LISTENERS FOR CASH / ELECTRONIC (mutually exclusive, attached once) =====
        const payCashCheckbox       = document.getElementById('platePayC');
        const payElectronicCheckbox = document.getElementById('platePayE');

        if (payCashCheckbox && payElectronicCheckbox) {
            payCashCheckbox.addEventListener('change', (e) => {
                if (e.target.checked) payElectronicCheckbox.checked = false;
            });
            payElectronicCheckbox.addEventListener('change', (e) => {
                if (e.target.checked) payCashCheckbox.checked = false;
            });
        }

        // ===== BUTTON CONTAINER =====
        let buttonContainer = document.getElementById('detailsButtonContainer');
        if (!buttonContainer) {
            buttonContainer = document.createElement('div');
            buttonContainer.id        = 'detailsButtonContainer';
            buttonContainer.className = 'form-buttons';
            detailsPanel.parentNode.appendChild(buttonContainer);
        }
        buttonContainer.innerHTML = `
            <button onclick="confirmDeletePlate(${plateId})" class="btn-delete">🗑️ Elimina Targa</button>
            <button onclick="savePlateAllData(${plateId})" class="btn-save">💾 Salva</button>
            <button onclick="closeDetails()" class="btn-close">✕ Chiudi Scheda</button>
        `;
        buttonContainer.style.display = 'flex';

        // ===== IMAGE BOX (right panel — set once here) =====
        const imageBox = document.getElementById('imageBox');
        if (imageBox) {
            const invoiceCodeDisplay = invoiceCode || '-';
            const ticketCodeDisplay  = plate.ticket_code || '-';

            imageBox.innerHTML = `
                <div class="image-meta">
                    <div class="image-meta-plate">${displayPlate}</div>
                    <div class="image-meta-row">
                        <span class="image-meta-label">Data rilevazione</span>
                        <span class="image-meta-value">${dateText}</span>
                    </div>
                    <div class="image-meta-row">
                        <span class="image-meta-label">Ingresso</span>
                        <span class="image-meta-value">${entryDate} ${entryTime || '-'}</span>
                    </div>
                    <div class="image-meta-row">
                        <span class="image-meta-label">Uscita</span>
                        <span class="image-meta-value">${exitDate} ${exitTime || '-'}</span>
                    </div>
                    <div class="image-meta-row">
                        <span class="image-meta-label">Codice Ticket</span>
                        <span class="image-meta-value" id="imageTicketCodePlate">${ticketCodeDisplay}</span>
                    </div>
                    <div class="image-meta-row">
                        <span class="image-meta-label">Codice Ricevuta</span>
                        <span class="image-meta-value" id="imageCodiceRicevutaPlate">${invoiceCodeDisplay}</span>
                    </div>
                    <div class="image-meta-row">
                        <span class="image-meta-label">Durata Sosta</span>
                        <span class="image-meta-value">${giorni}g ${ore}h ${minuti}m</span>
                    </div>
                    <div class="image-meta-row">
                        <span class="image-meta-label">Origine</span>
                        <span class="image-meta-value">${sourceText}</span>
                    </div>
                </div>
                <div class="image-box-inner" style="margin-bottom:8px;">
                    <img src="${API_BASE}/get_image.php?id=${plateId}&t=${Date.now()}"
                         alt="${displayPlate} (ANPR)"
                         onclick="openImageModal(this, '${displayPlate}')"
                         style="cursor:pointer;" />
                </div>
                <div class="image-box-inner">
                    <img src="${API_BASE}/get_plate_image.php?id=${plateId}&t=${Date.now()}"
                         alt="${displayPlate} (targa)"
                         onclick="openImageModal(this, '${displayPlate}')"
                         style="cursor:pointer;" />
                </div>
            `;
        }

        // ===== INIT WATCHERS =====
        initSubscriptionExpiryWatcher();
        initTicketPrepaidExpiryWatcher();

        if (plate.id && !plate.is_passage) {
            loadAndPopulateTicketCode(plate.id);
        }

        startTicketWatcher(plateId);

    } catch (error) {
        console.error('❌ renderPlateDetailsWithTimes error:', error);
        if (typeof showToast === 'function') {
            showToast('❌ Errore caricamento targa', 'error');
        }
    }
}

// ============================================================
// SAVE FUNCTION — savePlateAllData
// ============================================================

/**
 * Collect all form data from the detail panel and persist to the server.
 * On success, updates the in-memory allPlates array, refreshes the list,
 * and reloads the detail view.
 * @param {number} plateId
 */
async function savePlateAllData(plateId) {
    try {
        const entryDate  = document.getElementById('plateEntryDate')?.value  || null;
        const entryTime  = document.getElementById('plateEntryTime')?.value  || null;
        const exitDate   = document.getElementById('plateExitDate')?.value   || null;
        const exitTime   = document.getElementById('plateExitTime')?.value   || null;
        const fascia     = document.getElementById('plateFascia')?.value     || 'F1';
        const price      = parseFloat(document.getElementById('platePrice')?.value  || '0');
        const annullato  = document.getElementById('plateAnnullato')?.checked ? 1 : 0;
        const motivo     = document.getElementById('plateMotivo')?.value     || '';
        const paid       = document.getElementById('platePaid')?.checked     ? 1 : 0;
        const payC       = document.getElementById('platePayC')?.checked     ? 1 : 0;
        const payE       = document.getElementById('platePayE')?.checked     ? 1 : 0;
        const ticketCode = document.getElementById('ticketCode')?.value      || '';
        const ticketInfo = document.getElementById('ticketInfo')?.value      || '';

        console.log('💾 Salvataggio targa:', {
            plateId, entryDate, entryTime, exitDate, exitTime,
            fascia, price, annullato, motivo, paid, payC, payE,
        });

        const payload = {
            plate_id:       plateId,
            Tentry_date:    entryDate,
            Tentry_time:    entryTime,
            Texit_date:     exitDate,
            Texit_time:     exitTime,
            fascia,
            prezzo:         price,
            annullato,
            motivo,
            paid,
            pag_cash:       payC,
            pag_electronic: payE,
            ticket_code:    ticketCode,
            ticket_info:    ticketInfo,
        };

        const response = await fetch(`${API_BASE}/update_plate_cassa.php`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(payload),
        });

        if (!response.ok) throw new Error('HTTP ' + response.status);

        const result = await response.json();
        console.log('✅ Salvataggio response:', result);

        if (!result.success) throw new Error(result.message || 'Errore sconosciuto');

        // Update in-memory allPlates array
        if (typeof allPlates !== 'undefined' && Array.isArray(allPlates)) {
            const idx = allPlates.findIndex(p => p.id === plateId);
            if (idx !== -1) {
                allPlates[idx] = { ...allPlates[idx], ...payload, id: plateId };
            }
        }

        if (typeof showToast === 'function') {
            showToast('💾 Dati targa salvati correttamente', 'success', 3000);
        }

        // Refresh the plates list
        if (typeof updatePlatesList === 'function') {
            updatePlatesList();
        }

        // Reload plate details after a short delay so the server has time to commit
        setTimeout(async () => {
            if (typeof loadPlates === 'function') {
                await loadPlates(true);
            }
            // Re-render the detail panel with fresh data
            try {
                const resp = await fetch(
                    `${API_BASE}/get_plate.php?id=${plateId}&t=${Date.now()}`,
                    { cache: 'no-store' }
                );
                if (resp.ok) {
                    const freshData = await resp.json();
                    if (freshData.success && (freshData.data || freshData.plate)) {
                        renderPlateDetailsWithTimes(freshData.data || freshData.plate);
                    }
                }
            } catch (reloadErr) {
                console.warn('⚠️ Impossibile ricaricare dettagli targa:', reloadErr);
            }
        }, SERVER_COMMIT_DELAY_MS);

    } catch (error) {
        console.error('❌ Errore salvataggio targa:', error);
        if (typeof showToast === 'function') {
            showToast('❌ Errore salvataggio: ' + error.message, 'error');
        }
    }
}

// ============================================================
// TICKET WATCHER — startTicketWatcher
// ============================================================

/**
 * Start polling the ticketCode input for changes.
 * Clears any previously running watcher first.
 * Fires onTicketCodeChanged(plateId) when the value changes.
 * @param {number} plateId
 */
function startTicketWatcher(plateId) {
    // Clear existing watcher
    if (_ticketWatcherInterval) {
        clearInterval(_ticketWatcherInterval);
        _ticketWatcherInterval = null;
    }

    const ticketInput = document.getElementById('ticketCode');
    if (!ticketInput) return;

    let lastValue = ticketInput.value;

    _ticketWatcherInterval = setInterval(() => {
        const el = document.getElementById('ticketCode');
        if (!el) {
            clearInterval(_ticketWatcherInterval);
            _ticketWatcherInterval = null;
            return;
        }
        const current = el.value;
        if (current !== lastValue) {
            lastValue = current;
            console.log('🎫 Ticket code cambiato:', current);
            // Mirror the new value in the image-box metadata
            const mirror = document.getElementById('imageTicketCodePlate');
            if (mirror) mirror.textContent = current || '-';
            if (typeof onTicketCodeChanged === 'function') {
                onTicketCodeChanged(plateId);
            }
        }
    }, 500);
}

// ============================================================
// EXPIRY WATCHERS
// ============================================================

/**
 * Poll for subscription expiry and mark expired elements in the DOM.
 */
function initSubscriptionExpiryWatcher() {
    if (_subscriptionWatcherInterval) {
        clearInterval(_subscriptionWatcherInterval);
        _subscriptionWatcherInterval = null;
    }
    _subscriptionWatcherInterval = setInterval(() => {
        const el = document.querySelector('[data-subscription-expiry]');
        if (!el) return;
        const expiry = el.dataset.subscriptionExpiry;
        if (expiry && new Date(expiry) < new Date()) {
            el.classList.add('expired');
        }
    }, 60000);
}

/**
 * Poll for ticket / prepaid-card expiry and mark expired elements in the DOM.
 */
function initTicketPrepaidExpiryWatcher() {
    if (_prepaidWatcherInterval) {
        clearInterval(_prepaidWatcherInterval);
        _prepaidWatcherInterval = null;
    }
    _prepaidWatcherInterval = setInterval(() => {
        const el = document.querySelector('[data-prepaid-expiry]');
        if (!el) return;
        const expiry = el.dataset.prepaidExpiry;
        if (expiry && new Date(expiry) < new Date()) {
            el.classList.add('expired');
        }
    }, 60000);
}

// ============================================================
// LOAD AND POPULATE TICKET CODE
// ============================================================

/**
 * Fetch fresh plate data and populate the ticketCode / ticketInfo inputs.
 * @param {number} plateId
 */
async function loadAndPopulateTicketCode(plateId) {
    try {
        const resp = await fetch(
            `${API_BASE}/get_plate.php?id=${plateId}&t=${Date.now()}`,
            { cache: 'no-store' }
        );
        if (!resp.ok) return;
        const data = await resp.json();
        if (!data.success) return;

        const plate = data.data || data.plate;
        if (!plate) return;

        const ticketInput = document.getElementById('ticketCode');
        if (ticketInput && plate.ticket_code) {
            ticketInput.value = plate.ticket_code;
        }

        const ticketInfoInput = document.getElementById('ticketInfo');
        if (ticketInfoInput && plate.ticket_info) {
            ticketInfoInput.value = plate.ticket_info;
        }

        const mirror = document.getElementById('imageTicketCodePlate');
        if (mirror) mirror.textContent = plate.ticket_code || '-';

    } catch (err) {
        console.warn('⚠️ loadAndPopulateTicketCode error:', err);
    }
}

// ============================================================
// FORM HELPERS
// ============================================================

/**
 * Update detail-panel form fields with data received from a ticket lookup.
 * @param {Object} data - Object containing plate and/or ticket info
 */
function updateFormWithTicketData(data) {
    if (!data) return;

    const ticketCode = (data.plate && data.plate.ticket_code) || data.ticket_code || '';
    const ticketInput = document.getElementById('ticketCode');
    if (ticketInput) ticketInput.value = ticketCode;

    const ticketInfoInput = document.getElementById('ticketInfo');
    if (ticketInfoInput && data.ticket_info !== undefined) {
        ticketInfoInput.value = data.ticket_info;
    }

    const amountInput = document.getElementById('platePrice');
    if (amountInput && data.amount !== undefined) {
        amountInput.value = data.amount;
    }

    const paidCheck = document.getElementById('platePaid');
    if (paidCheck && data.paid !== undefined) {
        paidCheck.checked = !!data.paid;
    }
}

// ============================================================
// TICKET CODE CHANGE CALLBACK
// ============================================================

/**
 * Called by startTicketWatcher when the ticket code input value changes.
 * Override or extend this function to add custom behaviour.
 * @param {number} plateId
 */
function onTicketCodeChanged(plateId) {
    console.log('🎫 Ticket code cambiato per targa:', plateId);
}
