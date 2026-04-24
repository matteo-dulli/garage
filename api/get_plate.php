<?php
require_once dirname(__DIR__) . '/config/config.php';
require_once dirname(__DIR__) . '/config/database.php';

setJsonHeaders();

$id = (int)($_GET['id'] ?? 0);
if (!$id) jsonError('ID mancante');

$db    = Database::getInstance();
$plate = $db->fetchOne('SELECT * FROM plates WHERE id = ?', [$id]);
if (!$plate) jsonError('Targa non trovata', 404);

$plate['passages'] = $db->fetchAll(
    'SELECT pa.*, t.id AS ticket_id, t.ticket_code, t.amount, t.paid, t.note AS ticket_note, t.scal
     FROM passages pa
     LEFT JOIN tickets t ON t.passage_id = pa.id
     WHERE pa.plate_id = ?
     ORDER BY pa.id DESC',
    [$id]
);

$plate['abbonamento'] = $db->fetchOne(
    'SELECT * FROM abbonamenti WHERE plate_number = ? ORDER BY id DESC LIMIT 1',
    [$plate['plate_number']]
);

$plate['tessera'] = $db->fetchOne(
    'SELECT * FROM tesserapre WHERE plate_number = ? AND canc = 0 ORDER BY id DESC LIMIT 1',
    [$plate['plate_number']]
);

jsonSuccess(['plate' => $plate]);
