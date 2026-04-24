<?php
require_once dirname(__DIR__, 2) . '/config/config.php';
require_once dirname(__DIR__, 2) . '/config/database.php';

setJsonHeaders();

$plateNumber = strtoupper(trim($_GET['plate_number'] ?? ''));
if (!$plateNumber) jsonError('plate_number richiesto');

$db  = Database::getInstance();
$abb = $db->fetchOne(
    'SELECT * FROM abbonamenti WHERE plate_number = ? ORDER BY id DESC LIMIT 1',
    [$plateNumber]
);

jsonSuccess(['abbonamento' => $abb ?: null]);
