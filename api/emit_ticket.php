<?php
/**
 * emit_ticket.php - Emit (create) a ticket for a passage
 * Garage ANPR Management System
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';

setJsonHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Metodo non consentito', 405);
}

$body      = getJsonBody();
$passageId = isset($body['passage_id']) ? (int)$body['passage_id'] : 0;
$plateId   = isset($body['plate_id'])   ? (int)$body['plate_id']   : null;
$amount    = isset($body['amount'])     ? (float)$body['amount']   : 0.0;
$notes     = isset($body['notes'])      ? trim($body['notes'])     : '';

if ($passageId <= 0 && !$plateId) {
    jsonError('ID passaggio o targa obbligatorio');
}

try {
    $db  = Database::getInstance();
    $pdo = $db->getConnection();

    // If no passageId, find or create one for the plate
    if ($passageId <= 0 && $plateId) {
        $existingPassage = $db->fetchOne(
            'SELECT id FROM passages WHERE plate_id = ? AND exit_datetime IS NULL ORDER BY id DESC LIMIT 1',
            [$plateId]
        );
        if ($existingPassage) {
            $passageId = (int)$existingPassage['id'];
        } else {
            $passageId = (int)$db->insert(
                'INSERT INTO passages (plate_id, entry_datetime, created_at) VALUES (?, NOW(), NOW())',
                [$plateId]
            );
        }
    }

    // Check for existing ticket on this passage
    $existing = $db->fetchOne('SELECT id, ticket_code FROM tickets WHERE passage_id = ?', [$passageId]);
    if ($existing) {
        jsonError('Ticket già emesso per questo passaggio: ' . $existing['ticket_code'], 409);
    }

    // Generate unique ticket code
    $ticketCode = TICKET_PREFIX . strtoupper(substr(md5(uniqid((string)$passageId, true)), 0, 8));

    $pdo->beginTransaction();
    $db->insert(
        'INSERT INTO tickets (passage_id, ticket_code, amount, paid, notes, created_at) VALUES (?, ?, ?, 0, ?, NOW())',
        [$passageId, $ticketCode, $amount, $notes]
    );

    // Optionally write ticket file to PRINT_DIR
    if (defined('PRINT_DIR') && is_dir(PRINT_DIR)) {
        $filename = PRINT_DIR . $ticketCode . '.txt';
        $passage  = $db->fetchOne(
            'SELECT pg.*, p.plate_number FROM passages pg LEFT JOIN plates p ON p.id = pg.plate_id WHERE pg.id = ?',
            [$passageId]
        );
        $content  = "TICKET: $ticketCode\n";
        $content .= 'Targa: ' . ($passage['plate_number'] ?? 'N/D') . "\n";
        $content .= 'Ingresso: ' . ($passage['entry_datetime'] ?? 'N/D') . "\n";
        $content .= 'Importo: ' . number_format($amount, 2) . " EUR\n";
        $content .= 'Data emissione: ' . date('Y-m-d H:i:s') . "\n";
        file_put_contents($filename, $content);
    }

    $pdo->commit();

    echo json_encode([
        'success'      => true,
        'ticket_code'  => $ticketCode,
        'passage_id'   => $passageId,
        'amount'       => $amount,
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    jsonError(APP_DEBUG ? $e->getMessage() : 'Errore interno del server', 500);
}
