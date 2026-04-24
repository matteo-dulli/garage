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

$allowed = ['notes', 'tipo', 'marca', 'colore', 'notev', 'autor', 'ticket_code'];
$sharedFields = ['tipo', 'marca', 'colore', 'notev', 'autor']; // update by plate_number

$setParts = [];
$params   = [];

foreach ($allowed as $field) {
    if (!array_key_exists($field, $body)) continue;

    if (in_array($field, $sharedFields)) {
        // Update all rows with same plate_number
        $db->query(
            "UPDATE plates SET `{$field}` = ?, updated_at = NOW() WHERE plate_number = ?",
            [$body[$field], $plate['plate_number']]
        );
    } else {
        $setParts[] = "`{$field}` = ?";
        $params[]   = $body[$field];
    }
}

// posizione is per-plate
if (array_key_exists('posizione', $body)) {
    $setParts[] = '`posizione` = ?';
    $params[]   = $body['posizione'];
}

if ($setParts) {
    $params[] = $id;
    $db->query('UPDATE plates SET ' . implode(', ', $setParts) . ', updated_at = NOW() WHERE id = ?', $params);
}

$updated = $db->fetchOne('SELECT * FROM plates WHERE id = ?', [$id]);
jsonSuccess(['plate' => $updated]);
