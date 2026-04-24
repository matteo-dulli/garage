<?php
require_once dirname(__DIR__) . '/config/config.php';
require_once dirname(__DIR__) . '/config/database.php';

setJsonHeaders();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonError('Metodo non consentito', 405);

$body      = getJsonBody();
$passageId = (int)($body['passage_id'] ?? 0);
$plateId   = (int)($body['plate_id']   ?? 0);
$amount    = isset($body['amount'])  ? (float)$body['amount']  : 0.00;
$notes     = trim($body['notes'] ?? '');

if (!$passageId && !$plateId) jsonError('passage_id o plate_id richiesto');

$db = Database::getInstance();

// If only plate_id, get or create a passage
if (!$passageId && $plateId) {
    $passage = $db->fetchOne(
        'SELECT id FROM passages WHERE plate_id = ? ORDER BY id DESC LIMIT 1',
        [$plateId]
    );
    if ($passage) {
        $passageId = (int)$passage['id'];
    } else {
        $passageId = (int)$db->insert(
            'INSERT INTO passages (plate_id, entry_datetime, created_at, updated_at) VALUES (?, NOW(), NOW(), NOW())',
            [$plateId]
        );
    }
}

// Check existing ticket
$existing = $db->fetchOne('SELECT id, ticket_code FROM tickets WHERE passage_id = ?', [$passageId]);
if ($existing) jsonError('Ticket già emesso per questo passaggio: ' . $existing['ticket_code']);

// Generate unique ticket code
do {
    $code = TICKET_PREFIX . date('Ymd') . str_pad(random_int(0, 9999), 4, '0', STR_PAD_LEFT);
    $dup  = $db->fetchOne('SELECT id FROM tickets WHERE ticket_code = ?', [$code]);
} while ($dup);

$ticketId = (int)$db->insert(
    'INSERT INTO tickets (passage_id, ticket_code, amount, paid, note, printed_at, created_at, updated_at)
     VALUES (?, ?, ?, 0, ?, NOW(), NOW(), NOW())',
    [$passageId, $code, $amount, $notes ?: null]
);

// Update plate ticket_code if we know the plate
if ($plateId) {
    $db->query('UPDATE plates SET ticket_code = ?, updated_at = NOW() WHERE id = ?', [$code, $plateId]);
}

$ticket = $db->fetchOne('SELECT * FROM tickets WHERE id = ?', [$ticketId]);
jsonSuccess(['ticket' => $ticket, 'ticket_code' => $code], 201);
