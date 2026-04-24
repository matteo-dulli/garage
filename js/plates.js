'use strict';

/* ── Search by ticket code ──────────────────────────────── */
async function searchTicketCode(code) {
    if (!code) return;
    try {
        const res = await apiCall('search_plate.php?ticket_code=' + encodeURIComponent(code));
        const ticket = res.data && res.data.ticket;
        if (!ticket) { showToast('Ticket non trovato: ' + code, 'warning'); return; }
        // Try to find in loaded plates
        const plate = AppState.plates.find(p => p.id === ticket.plate_id);
        if (plate) {
            selectPlate(plate);
        } else if (ticket.plate_id) {
            // Fetch full plate data rather than using a partial object
            try {
                const plateRes = await apiCall('get_plate.php?id=' + ticket.plate_id);
                if (plateRes.data && plateRes.data.plate) {
                    selectPlate(plateRes.data.plate);
                } else {
                    showToast('Ticket trovato ma targa non disponibile', 'info');
                }
            } catch (_) {
                showToast('Ticket trovato ma targa non disponibile', 'info');
            }
        } else {
            showToast('Ticket trovato ma senza targa associata', 'info');
        }
    } catch (e) {
        showToast('Ricerca fallita: ' + e.message, 'error');
    }
}

/* ── Client-side filter ─────────────────────────────────── */
function filterPlates(plates, query, status) {
    let result = plates || [];

    if (query) {
        const q = query.toUpperCase();
        result = result.filter(p =>
            (p.plate_number && p.plate_number.toUpperCase().includes(q)) ||
            (p.ticket_code  && p.ticket_code.toUpperCase().includes(q))
        );
    }

    if (status && status !== 'all') {
        result = result.filter(p => {
            switch (status) {
                case 'inside':       return p.last_entry && !p.last_exit;
                case 'outside':      return !p.last_entry || !!p.last_exit;
                case 'ticket':       return !!p.ticket_code;
                case 'subscription': return !!p.has_subscription;
                default:             return true;
            }
        });
    }

    return result;
}
