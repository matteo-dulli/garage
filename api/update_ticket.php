<?php
/**
 * update_ticket.php - Update ticket data (amount, paid status, notes)
 * Garage ANPR Management System
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';

setJsonHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Metodo non consentito', 405);
}

$body       = getJsonBody();
$ticketCode = isset($body['ticket_code']) ? trim($body['ticket_code']) : '';
if (!$ticketCode) {
    jsonError('Codice ticket obbligatorio');
}

try {
    $db = Database::getInstance();

    $ticket = $db->fetchOne('SELECT id FROM tickets WHERE ticket_code = ?', [$ticketCode]);
    if (!$ticket) {
        jsonError('Ticket non trovato', 404);
    }

    $fields = [];
    $params = [];

    if (isset($body['amount'])) {
        $fields[] = 'amount = ?';
        $params[] = (float)$body['amount'];
    }
    if (isset($body['paid'])) {
        $fields[] = 'paid = ?';
        $params[] = (int)(bool)$body['paid'];
    }
    if (isset($body['notes'])) {
        $fields[] = 'notes = ?';
        $params[] = trim($body['notes']);
    }

    if (empty($fields)) {
        jsonError('Nessun campo da aggiornare');
    }

    $fields[]   = 'updated_at = NOW()';
    $params[]   = $ticketCode;

    $db->query(
        'UPDATE tickets SET ' . implode(', ', $fields) . ' WHERE ticket_code = ?',
        $params
    );

    echo json_encode(['success' => true, 'ticket_code' => $ticketCode], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    jsonError(APP_DEBUG ? $e->getMessage() : 'Errore interno del server', 500);
}
