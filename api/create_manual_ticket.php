<?php
/**
 * create_manual_ticket.php - Create a standalone ticket (without ANPR passage)
 * Garage ANPR Management System
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';

setJsonHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Metodo non consentito', 405);
}

$body        = getJsonBody();
$plateNumber = isset($body['plate_number']) ? strtoupper(trim($body['plate_number'])) : '';
$amount      = isset($body['amount'])       ? (float)$body['amount']                 : 0.0;
$notes       = isset($body['notes'])        ? trim($body['notes'])                   : '';

try {
    $db  = Database::getInstance();
    $pdo = $db->getConnection();
    $pdo->beginTransaction();

    $plateId = null;
    if ($plateNumber) {
        $plate = $db->fetchOne('SELECT id FROM plates WHERE plate_number = ?', [$plateNumber]);
        if ($plate) {
            $plateId = (int)$plate['id'];
        } else {
            // Auto-create plate
            $plateId = (int)$db->insert(
                'INSERT INTO plates (plate_number, type, created_at, updated_at) VALUES (?, \'transit\', NOW(), NOW())',
                [$plateNumber]
            );
        }
    }

    // Create a passage
    $passageId = (int)$db->insert(
        'INSERT INTO passages (plate_id, entry_datetime, info, created_at) VALUES (?, NOW(), \'Ticket manuale\', NOW())',
        [$plateId]
    );

    // Generate ticket code
    $ticketCode = TICKET_PREFIX . strtoupper(substr(md5(uniqid('M' . $passageId, true)), 0, 8));

    $db->insert(
        'INSERT INTO tickets (passage_id, ticket_code, amount, paid, notes, created_at) VALUES (?, ?, ?, 0, ?, NOW())',
        [$passageId, $ticketCode, $amount, $notes]
    );

    $pdo->commit();

    echo json_encode([
        'success'     => true,
        'ticket_code' => $ticketCode,
        'passage_id'  => $passageId,
        'plate_id'    => $plateId,
        'amount'      => $amount,
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    jsonError(APP_DEBUG ? $e->getMessage() : 'Errore interno del server', 500);
}
