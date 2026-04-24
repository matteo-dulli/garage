<?php
require_once dirname(__DIR__) . '/config/config.php';
require_once dirname(__DIR__) . '/config/database.php';

setJsonHeaders();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonError('Metodo non consentito', 405);

$body = getJsonBody();
$id   = (int)($body['id'] ?? 0);
if (!$id) jsonError('ID mancante');

$db    = Database::getInstance();
$plate = $db->fetchOne('SELECT * FROM plates WHERE id = ?', [$id]);
if (!$plate) jsonError('Targa non trovata', 404);

// Delete tickets linked to passages of this plate
$db->query(
    'DELETE t FROM tickets t
     INNER JOIN passages pa ON pa.id = t.passage_id
     WHERE pa.plate_id = ?',
    [$id]
);

// Delete passages
$db->query('DELETE FROM passages WHERE plate_id = ?', [$id]);

// Delete abbonamenti
$db->query('DELETE FROM abbonamenti WHERE plate_number = ?', [$plate['plate_number']]);

// Delete tessere (mark cancelled instead of hard delete to keep audit trail)
$db->query('UPDATE tesserapre SET canc = 1, attivo = 0 WHERE plate_number = ?', [$plate['plate_number']]);

// Delete plate
$db->query('DELETE FROM plates WHERE id = ?', [$id]);

jsonSuccess(['deleted' => true, 'id' => $id]);
