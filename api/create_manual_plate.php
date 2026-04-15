<?php
/**
 * create_manual_plate.php - Create a new plate manually
 * Garage ANPR Management System
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';

setJsonHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Metodo non consentito', 405);
}

$body        = getJsonBody();
$plateNumber = isset($body['plate_number']) ? strtoupper(trim($body['plate_number'])) : '';
$type        = isset($body['type'])         ? trim($body['type'])   : 'transit';
$notes       = isset($body['notes'])        ? trim($body['notes'])  : '';

if (!$plateNumber) {
    jsonError('Numero di targa obbligatorio');
}
if (!preg_match('/^[A-Z0-9]{2,10}$/', $plateNumber)) {
    jsonError('Formato targa non valido (solo lettere e numeri, 2-10 caratteri)');
}
$allowedTypes = ['transit', 'subscription', 'authorized'];
if (!in_array($type, $allowedTypes, true)) {
    $type = 'transit';
}

try {
    $db = Database::getInstance();

    // Check for duplicate
    $existing = $db->fetchOne('SELECT id FROM plates WHERE plate_number = ?', [$plateNumber]);
    if ($existing) {
        jsonError('Targa già presente nel sistema', 409);
    }

    $newId = $db->insert(
        'INSERT INTO plates (plate_number, type, notes, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
        [$plateNumber, $type, $notes]
    );

    echo json_encode([
        'success' => true,
        'id'      => (int)$newId,
        'plate_number' => $plateNumber,
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    jsonError(APP_DEBUG ? $e->getMessage() : 'Errore interno del server', 500);
}
