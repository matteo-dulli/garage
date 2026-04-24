<?php
require_once dirname(__DIR__, 2) . '/config/config.php';
require_once dirname(__DIR__, 2) . '/config/database.php';

setJsonHeaders();

$plateNumber = strtoupper(trim($_GET['plate_number'] ?? ''));
if (!$plateNumber) jsonError('plate_number richiesto');

$db      = Database::getInstance();
$tessera = $db->fetchOne(
    'SELECT * FROM tesserapre WHERE plate_number = ? AND canc = 0 ORDER BY id DESC LIMIT 1',
    [$plateNumber]
);

jsonSuccess(['tessera' => $tessera ?: null]);
