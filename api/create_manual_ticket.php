<?php
require_once dirname(__DIR__) . '/config/config.php';
require_once dirname(__DIR__) . '/config/database.php';

setJsonHeaders();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonError('Metodo non consentito', 405);

$body        = getJsonBody();
$plateNumber = strtoupper(trim($body['plate_number'] ?? ''));
$amount      = isset($body['amount']) ? (float)$body['amount'] : 0.00;
$notes       = trim($body['notes'] ?? '');

$db = Database::getInstance();

// Ensure plate exists
$plate = $db->fetchOne('SELECT id, plate_number FROM plates WHERE plate_number = ?', [$plateNumber]);
if (!$plate && $plateNumber) {
    $pid = (int)$db->insert(
        'INSERT INTO plates (plate_number, created_at, updated_at) VALUES (?, NOW(), NOW())',
        [$plateNumber]
    );
    $plate = ['id' => $pid, 'plate_number' => $plateNumber];
} elseif (!$plate) {
    // Anonymous ticket
    $plate = ['id' => null, 'plate_number' => ''];
}

// Create passage
$passageId = (int)$db->insert(
    'INSERT INTO passages (plate_id, entry_datetime, created_at, updated_at) VALUES (?, NOW(), NOW(), NOW())',
    [$plate['id']]
);

// Generate ticket code
do {
    $code = TICKET_PREFIX . date('Ymd') . str_pad(random_int(0, 9999), 4, '0', STR_PAD_LEFT);
    $dup  = $db->fetchOne('SELECT id FROM tickets WHERE ticket_code = ?', [$code]);
} while ($dup);

$ticketId = (int)$db->insert(
    'INSERT INTO tickets (passage_id, ticket_code, amount, paid, note, printed_at, created_at, updated_at)
     VALUES (?, ?, ?, 0, ?, NOW(), NOW(), NOW())',
    [$passageId, $code, $amount, $notes ?: null]
);

if ($plate['id']) {
    $db->query('UPDATE plates SET ticket_code = ?, updated_at = NOW() WHERE id = ?', [$code, $plate['id']]);
}

$ticket = $db->fetchOne('SELECT * FROM tickets WHERE id = ?', [$ticketId]);
jsonSuccess(['ticket' => $ticket, 'ticket_code' => $code, 'plate' => $plate], 201);
