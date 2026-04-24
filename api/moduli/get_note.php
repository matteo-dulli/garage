<?php
require_once dirname(__DIR__, 2) . '/config/config.php';
require_once dirname(__DIR__, 2) . '/config/database.php';

setJsonHeaders();

$plateId   = (int)($_GET['plate_id']   ?? 0);
$passageId = (int)($_GET['passage_id'] ?? 0);

if (!$plateId && !$passageId) jsonError('plate_id o passage_id richiesto');

$db = Database::getInstance();

if ($passageId) {
    $ticket = $db->fetchOne('SELECT note FROM tickets WHERE passage_id = ?', [$passageId]);
    if ($ticket) {
        jsonSuccess(['note' => $ticket['note']]);
    }
    // Fallback to passage notes
    $passage = $db->fetchOne('SELECT notes FROM passages WHERE id = ?', [$passageId]);
    jsonSuccess(['note' => $passage ? $passage['notes'] : null]);
}

// By plate_id: get note from latest ticket
$ticket = $db->fetchOne(
    'SELECT t.note FROM tickets t
     INNER JOIN passages pa ON pa.id = t.passage_id
     WHERE pa.plate_id = ?
     ORDER BY t.id DESC LIMIT 1',
    [$plateId]
);
jsonSuccess(['note' => $ticket ? $ticket['note'] : null]);
