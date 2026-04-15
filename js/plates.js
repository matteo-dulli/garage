/**
 * plates.js - Search, filter helpers and ticket code search
 * Garage ANPR Management System
 */

'use strict';

/**
 * Search for a ticket by code via API
 * @param {string} code - Ticket code to search
 */
async function searchTicketCode(code) {
    if (!code || !code.trim()) {
        if (typeof showToast === 'function') showToast('Inserisci un codice ticket', 'warning');
        return;
    }
    try {
        const data = await apiCall('search_plate.php?ticket_code=' + encodeURIComponent(code.trim()));
        if (data && data.passage) {
            selectPassage(data.passage);
        } else if (data && data.plate) {
            if (typeof renderDetails === 'function') renderDetails(data.plate);
        } else {
            if (typeof showToast === 'function') showToast('Nessun risultato trovato', 'warning');
        }
    } catch (err) {
        if (typeof showToast === 'function') showToast('Errore ricerca: ' + err.message, 'danger');
    }
}

/**
 * Search for plates matching a query string via API
 * @param {string} query - Plate number or partial to search
 */
async function searchPlate(query) {
    if (!query || !query.trim()) return;
    try {
        const data = await apiCall('search_plate.php?q=' + encodeURIComponent(query.trim()));
        if (data && data.plates) {
            if (typeof updatePlatesList === 'function') updatePlatesList(data.plates);
        }
    } catch (err) {
        if (typeof showToast === 'function') showToast('Errore ricerca: ' + err.message, 'danger');
    }
}
