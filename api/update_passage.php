<?php
require_once dirname(__DIR__) . '/config/config.php';
require_once dirname(__DIR__) . '/config/database.php';

setJsonHeaders();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonError('Metodo non consentito', 405);

$body = getJsonBody();
$id   = (int)($body['id'] ?? 0);
if (!$id) jsonError('ID mancante');

$db      = Database::getInstance();
$passage = $db->fetchOne('SELECT * FROM passages WHERE id = ?', [$id]);
if (!$passage) jsonError('Passaggio non trovato', 404);

$allowed = ['entry_datetime', 'exit_datetime', 'notes', 'paid', 'info'];
$set     = [];
$params  = [];

foreach ($allowed as $field) {
    if (array_key_exists($field, $body)) {
        $set[]    = "`{$field}` = ?";
        $params[] = $body[$field];
    }
}

if (!$set) jsonError('Nessun campo da aggiornare');

$params[] = $id;
$db->query('UPDATE passages SET ' . implode(', ', $set) . ', updated_at = NOW() WHERE id = ?', $params);

$updated = $db->fetchOne(
    'SELECT pa.*, t.id AS ticket_id, t.ticket_code, t.amount, t.paid AS ticket_paid
     FROM passages pa
     LEFT JOIN tickets t ON t.passage_id = pa.id
     WHERE pa.id = ?',
    [$id]
);
jsonSuccess(['passage' => $updated]);
