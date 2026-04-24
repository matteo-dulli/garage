<?php
require_once dirname(__DIR__, 2) . '/config/config.php';
require_once dirname(__DIR__, 2) . '/config/database.php';

setJsonHeaders();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonError('Metodo non consentito', 405);

$body        = getJsonBody();
$plateNumber = strtoupper(trim($body['plate_number'] ?? ''));
$autor       = trim($body['autor'] ?? '');

if (!$plateNumber) jsonError('plate_number richiesto');

$db = Database::getInstance();
$db->query('UPDATE plates SET autor = ?, updated_at = NOW() WHERE plate_number = ?', [$autor ?: null, $plateNumber]);

jsonSuccess(['updated' => true, 'autor' => $autor ?: null]);
