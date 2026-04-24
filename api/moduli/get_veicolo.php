<?php
require_once dirname(__DIR__, 2) . '/config/config.php';
require_once dirname(__DIR__, 2) . '/config/database.php';

setJsonHeaders();

$plateNumber = strtoupper(trim($_GET['plate_number'] ?? ''));
$plateId     = (int)($_GET['plate_id'] ?? 0);

if (!$plateNumber && !$plateId) jsonError('plate_number o plate_id richiesto');

$db = Database::getInstance();

if ($plateId && !$plateNumber) {
    $row = $db->fetchOne('SELECT plate_number FROM plates WHERE id = ?', [$plateId]);
    $plateNumber = $row ? $row['plate_number'] : '';
}

// Shared fields from any row with this plate_number
$shared = $db->fetchOne(
    'SELECT tipo, marca, colore, notev FROM plates WHERE plate_number = ? LIMIT 1',
    [$plateNumber]
);

// posizione per specific plate_id
$posizione = null;
if ($plateId) {
    $row = $db->fetchOne('SELECT posizione FROM plates WHERE id = ?', [$plateId]);
    $posizione = $row ? $row['posizione'] : null;
}

jsonSuccess([
    'veicolo' => [
        'tipo'      => $shared['tipo']   ?? null,
        'marca'     => $shared['marca']  ?? null,
        'colore'    => $shared['colore'] ?? null,
        'notev'     => $shared['notev']  ?? null,
        'posizione' => $posizione,
    ],
]);
