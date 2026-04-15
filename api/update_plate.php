<?php
/**
 * update_plate.php - Update plate data (notes, type, etc.)
 * Garage ANPR Management System
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';

setJsonHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Metodo non consentito', 405);
}

$body = getJsonBody();
$id   = isset($body['id']) ? (int)$body['id'] : 0;
if ($id <= 0) {
    jsonError('ID targa non valido');
}

try {
    $db = Database::getInstance();

    $plate = $db->fetchOne('SELECT id FROM plates WHERE id = ?', [$id]);
    if (!$plate) {
        jsonError('Targa non trovata', 404);
    }

    $fields = [];
    $params = [];

    if (isset($body['notes'])) {
        $fields[] = 'notes = ?';
        $params[] = trim($body['notes']);
    }
    if (isset($body['type'])) {
        $allowed  = ['transit', 'subscription', 'authorized'];
        $type     = in_array($body['type'], $allowed, true) ? $body['type'] : 'transit';
        $fields[] = 'type = ?';
        $params[] = $type;
    }

    if (empty($fields)) {
        jsonError('Nessun campo da aggiornare');
    }

    $fields[] = 'updated_at = NOW()';
    $params[] = $id;

    $db->query(
        'UPDATE plates SET ' . implode(', ', $fields) . ' WHERE id = ?',
        $params
    );

    echo json_encode(['success' => true, 'id' => $id], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    jsonError(APP_DEBUG ? $e->getMessage() : 'Errore interno del server', 500);
}
