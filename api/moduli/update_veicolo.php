<?php
require_once dirname(__DIR__, 2) . '/config/config.php';
require_once dirname(__DIR__, 2) . '/config/database.php';

setJsonHeaders();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonError('Metodo non consentito', 405);

$body        = getJsonBody();
$plateId     = (int)($body['plate_id'] ?? 0);
$plateNumber = strtoupper(trim($body['plate_number'] ?? ''));

if (!$plateId && !$plateNumber) jsonError('plate_id o plate_number richiesto');

$db = Database::getInstance();

if ($plateId && !$plateNumber) {
    $row = $db->fetchOne('SELECT plate_number FROM plates WHERE id = ?', [$plateId]);
    $plateNumber = $row ? $row['plate_number'] : '';
}

// Fields shared across all rows with same plate_number
$sharedFields = ['tipo', 'marca', 'colore', 'notev'];
foreach ($sharedFields as $f) {
    if (array_key_exists($f, $body)) {
        $db->query(
            "UPDATE plates SET `{$f}` = ?, updated_at = NOW() WHERE plate_number = ?",
            [$body[$f], $plateNumber]
        );
    }
}

// posizione: only for specific plate_id
if ($plateId && array_key_exists('posizione', $body)) {
    $db->query('UPDATE plates SET posizione = ?, updated_at = NOW() WHERE id = ?', [$body['posizione'], $plateId]);
}

jsonSuccess(['updated' => true]);
