<?php
require_once dirname(__DIR__, 2) . '/config/config.php';
require_once dirname(__DIR__, 2) . '/config/database.php';

setJsonHeaders();

$plateNumber = strtoupper(trim($_GET['plate_number'] ?? ''));
if (!$plateNumber) jsonError('plate_number richiesto');

$db  = Database::getInstance();
$row = $db->fetchOne('SELECT autor FROM plates WHERE plate_number = ? LIMIT 1', [$plateNumber]);

jsonSuccess(['autor' => $row ? $row['autor'] : null]);
