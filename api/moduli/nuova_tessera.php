<?php
require_once dirname(__DIR__, 2) . '/config/config.php';
require_once dirname(__DIR__, 2) . '/config/database.php';

setJsonHeaders();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonError('Metodo non consentito', 405);

$body        = getJsonBody();
$plateNumber = strtoupper(trim($body['plate_number'] ?? ''));
if (!$plateNumber) jsonError('plate_number richiesto');

$db = Database::getInstance();

// Check for existing active tessera
$old = $db->fetchOne(
    'SELECT * FROM tesserapre WHERE plate_number = ? AND canc = 0 ORDER BY id DESC LIMIT 1',
    [$plateNumber]
);

$transferRes = 0.00;
if ($old) {
    $transferRes = (float)($old['res1'] ?? 0);
    // Build logt entry
    $logtEntry = 'Sostituita da nuova tessera il ' . date('Y-m-d H:i:s') . ' - Residuo trasferito: ' . $transferRes . "\n";
    $newLogt   = ($old['logt'] ?? '') . $logtEntry;
    $db->query(
        'UPDATE tesserapre SET canc = 1, attivo = 0, motivo = ?, logt = ?, updated_at = NOW() WHERE id = ?',
        ['Nuova tessera emessa', $newLogt, $old['id']]
    );
}

// Create new tessera
$fascias = trim($body['fascias'] ?? '');
$nome    = trim($body['nome']    ?? '');
$fields  = ['nome','indirizzo','citta','cap','prov','stato','pi','cf','codun','info'];

$cols   = ['plate_number', 'fascias', 'res1', 'attivo', 'canc'];
$vals   = [$plateNumber, $fascias ?: null, $transferRes, 1, 0];
$marks  = ['?', '?', '?', '?', '?'];

foreach ($fields as $f) {
    if (array_key_exists($f, $body)) {
        $cols[]  = "`{$f}`";
        $vals[]  = $body[$f];
        $marks[] = '?';
    }
}

$newId   = (int)$db->insert(
    'INSERT INTO tesserapre (' . implode(', ', $cols) . ') VALUES (' . implode(', ', $marks) . ')',
    $vals
);

$tessera = $db->fetchOne('SELECT * FROM tesserapre WHERE id = ?', [$newId]);
jsonSuccess(['tessera' => $tessera, 'residuo_trasferito' => $transferRes], 201);
