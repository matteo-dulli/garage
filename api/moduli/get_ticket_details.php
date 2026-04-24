<?php
require_once dirname(__DIR__, 2) . '/config/config.php';
require_once dirname(__DIR__, 2) . '/config/database.php';

setJsonHeaders();

$plateId    = (int)($_GET['plate_id']    ?? 0);
$plateNumber = trim($_GET['plate_number'] ?? '');
$passageId  = (int)($_GET['passage_id']  ?? 0);

$db = Database::getInstance();

// Build query based on provided params
if ($passageId) {
    $ticket = $db->fetchOne(
        'SELECT t.*, pa.plate_id, pa.entry_datetime, pa.exit_datetime, p.plate_number
         FROM tickets t
         INNER JOIN passages pa ON pa.id = t.passage_id
         LEFT JOIN  plates   p  ON p.id  = pa.plate_id
         WHERE t.passage_id = ?',
        [$passageId]
    );
} elseif ($plateId) {
    $ticket = $db->fetchOne(
        'SELECT t.*, pa.plate_id, pa.entry_datetime, pa.exit_datetime, p.plate_number
         FROM tickets t
         INNER JOIN passages pa ON pa.id = t.passage_id
         LEFT JOIN  plates   p  ON p.id  = pa.plate_id
         WHERE pa.plate_id = ?
         ORDER BY t.id DESC LIMIT 1',
        [$plateId]
    );
} elseif ($plateNumber) {
    $ticket = $db->fetchOne(
        'SELECT t.*, pa.plate_id, pa.entry_datetime, pa.exit_datetime, p.plate_number
         FROM tickets t
         INNER JOIN passages pa ON pa.id  = t.passage_id
         INNER JOIN plates   p  ON p.id   = pa.plate_id
         WHERE p.plate_number = ?
         ORDER BY t.id DESC LIMIT 1',
        [$plateNumber]
    );
} else {
    jsonError('plate_id, plate_number o passage_id richiesto');
}

jsonSuccess(['ticket' => $ticket ?: null]);
