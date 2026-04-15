<?php
/**
 * reprint_ticket.php - Reprint an existing ticket
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

    $ticket = $db->fetchOne(
        'SELECT t.*, pg.entry_datetime, pg.exit_datetime, p.plate_number
         FROM tickets t
         JOIN passages pg ON pg.id = t.passage_id
         LEFT JOIN plates p ON p.id = pg.plate_id
         WHERE t.ticket_code = ?',
        [$ticketCode]
    );

    if (!$ticket) {
        jsonError('Ticket non trovato', 404);
    }

    // Write/overwrite ticket file
    if (defined('PRINT_DIR') && is_dir(PRINT_DIR)) {
        $filename = PRINT_DIR . $ticketCode . '.txt';
        $content  = "*** RISTAMPA ***\n";
        $content .= "TICKET: $ticketCode\n";
        $content .= 'Targa: '    . ($ticket['plate_number']    ?? 'N/D') . "\n";
        $content .= 'Ingresso: ' . ($ticket['entry_datetime']  ?? 'N/D') . "\n";
        $content .= 'Uscita: '   . ($ticket['exit_datetime']   ?? 'N/D') . "\n";
        $content .= 'Importo: '  . number_format((float)$ticket['amount'], 2) . " EUR\n";
        $content .= 'Ristampato: ' . date('Y-m-d H:i:s') . "\n";
        file_put_contents($filename, $content);
    }

    // Update printed_at timestamp
    $db->query('UPDATE tickets SET printed_at = NOW() WHERE ticket_code = ?', [$ticketCode]);

    echo json_encode(['success' => true, 'ticket_code' => $ticketCode], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    jsonError(APP_DEBUG ? $e->getMessage() : 'Errore interno del server', 500);
}
