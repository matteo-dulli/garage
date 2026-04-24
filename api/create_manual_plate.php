<?php
require_once dirname(__DIR__) . '/config/config.php';
require_once dirname(__DIR__) . '/config/database.php';

setJsonHeaders();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonError('Metodo non consentito', 405);

$body        = getJsonBody();
$plateNumber = strtoupper(trim($body['plate_number'] ?? ''));
$tipo        = trim($body['tipo']  ?? '');
$notes       = trim($body['notes'] ?? '');

if (!$plateNumber) jsonError('plate_number richiesto');

$db = Database::getInstance();

// Check duplicate
$existing = $db->fetchOne('SELECT id FROM plates WHERE plate_number = ?', [$plateNumber]);
if ($existing) jsonError('Targa già presente: ' . $plateNumber);

$newId = (int)$db->insert(
    'INSERT INTO plates (plate_number, tipo, notes, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
    [$plateNumber, $tipo ?: null, $notes ?: null]
);

$plate = $db->fetchOne('SELECT * FROM plates WHERE id = ?', [$newId]);
jsonSuccess(['plate' => $plate], 201);
