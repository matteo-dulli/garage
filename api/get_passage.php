<?php
require_once dirname(__DIR__) . '/config/config.php';
require_once dirname(__DIR__) . '/config/database.php';

setJsonHeaders();

$id = (int)($_GET['id'] ?? 0);
if (!$id) jsonError('ID mancante');

$db      = Database::getInstance();
$passage = $db->fetchOne(
    'SELECT pa.*, t.id AS ticket_id, t.ticket_code, t.amount, t.paid, t.note AS ticket_note, t.scal
     FROM passages pa
     LEFT JOIN tickets t ON t.passage_id = pa.id
     WHERE pa.id = ?',
    [$id]
);
if (!$passage) jsonError('Passaggio non trovato', 404);

jsonSuccess(['passage' => $passage]);
