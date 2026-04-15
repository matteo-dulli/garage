<?php
/**
 * get_plate.php - Return a single plate with all related data
 * Garage ANPR Management System
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';

setJsonHeaders();

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
if ($id <= 0) {
    jsonError('ID targa non valido');
}

try {
    $db = Database::getInstance();

    // Single plate with joined data
    $plate = $db->fetchOne(
        'SELECT p.*, s.type AS subscription_type, s.start_date, s.end_date,
                pc.code AS prepaid_code, pc.balance, pc.expiry_date,
                pa.authorized_until, pa.reason AS authorized_reason
         FROM plates p
         LEFT JOIN subscriptions s ON s.plate_id = p.id AND s.active = 1
         LEFT JOIN prepaid_cards pc ON pc.plate_id = p.id AND pc.active = 1
         LEFT JOIN plate_authorizations pa ON pa.plate_id = p.id AND pa.active = 1
         WHERE p.id = ?',
        [$id]
    );

    if (!$plate) {
        jsonError('Targa non trovata', 404);
    }

    // Passages for this plate
    $passages = $db->fetchAll(
        'SELECT pg.*, t.ticket_code, t.amount, t.paid, t.printed_at
         FROM passages pg
         LEFT JOIN tickets t ON t.passage_id = pg.id
         WHERE pg.plate_id = ?
         ORDER BY pg.id ASC',
        [$id]
    );

    $plate['passages'] = $passages;

    // Subscription sub-object
    if ($plate['subscription_type']) {
        $plate['subscription'] = [
            'type'       => $plate['subscription_type'],
            'start_date' => $plate['start_date'],
            'end_date'   => $plate['end_date'],
        ];
    } else {
        $plate['subscription'] = null;
    }
    unset($plate['subscription_type'], $plate['start_date'], $plate['end_date']);

    // Prepaid card sub-object
    if ($plate['prepaid_code']) {
        $plate['prepaid_card'] = [
            'code'        => $plate['prepaid_code'],
            'balance'     => $plate['balance'],
            'expiry_date' => $plate['expiry_date'],
        ];
    } else {
        $plate['prepaid_card'] = null;
    }
    unset($plate['prepaid_code'], $plate['balance'], $plate['expiry_date']);

    // Authorization
    $plate['is_authorized']     = !empty($plate['authorized_until']);
    $plate['authorized_until']  = $plate['authorized_until'] ?? null;
    $plate['authorized_reason'] = $plate['authorized_reason'] ?? null;

    // Ticket code from last passage (for quick access)
    $lastPassage = end($passages) ?: null;
    $plate['ticket_code']   = $lastPassage['ticket_code'] ?? ($plate['ticket_code'] ?? null);
    $plate['ticket_amount'] = $lastPassage['amount'] ?? null;
    $plate['ticket_paid']   = isset($lastPassage['paid']) ? (bool)$lastPassage['paid'] : null;

    echo json_encode([
        'success' => true,
        'plate'   => $plate,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
    jsonError(APP_DEBUG ? $e->getMessage() : 'Errore interno del server', 500);
}
