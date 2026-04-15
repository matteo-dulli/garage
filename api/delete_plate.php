<?php
/**
 * delete_plate.php - Delete a plate and all associated data
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
    $db  = Database::getInstance();
    $pdo = $db->getConnection();

    $plate = $db->fetchOne('SELECT id FROM plates WHERE id = ?', [$id]);
    if (!$plate) {
        jsonError('Targa non trovata', 404);
    }

    $pdo->beginTransaction();

    // Delete tickets linked to passages of this plate
    $db->query(
        'DELETE t FROM tickets t JOIN passages pg ON pg.id = t.passage_id WHERE pg.plate_id = ?',
        [$id]
    );
    // Delete passages
    $db->query('DELETE FROM passages WHERE plate_id = ?', [$id]);
    // Delete subscriptions, prepaid cards, authorizations
    $db->query('DELETE FROM subscriptions WHERE plate_id = ?', [$id]);
    $db->query('DELETE FROM prepaid_cards WHERE plate_id = ?', [$id]);
    $db->query('DELETE FROM plate_authorizations WHERE plate_id = ?', [$id]);
    // Delete plate
    $db->query('DELETE FROM plates WHERE id = ?', [$id]);

    $pdo->commit();

    echo json_encode(['success' => true, 'id' => $id], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    jsonError(APP_DEBUG ? $e->getMessage() : 'Errore interno del server', 500);
}
