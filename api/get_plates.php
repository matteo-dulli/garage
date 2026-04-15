<?php
/**
 * get_plates.php - Return all plates with their latest passages and tickets
 * Garage ANPR Management System
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';

setJsonHeaders();

try {
    $db = Database::getInstance();

    // Plates
    $plates = $db->fetchAll(
        'SELECT p.*, s.type AS subscription_type, s.start_date, s.end_date,
                pc.code AS prepaid_code, pc.balance, pc.expiry_date,
                pa.authorized_until, pa.reason AS authorized_reason
         FROM plates p
         LEFT JOIN subscriptions s ON s.plate_id = p.id AND s.active = 1
         LEFT JOIN prepaid_cards pc ON pc.plate_id = p.id AND pc.active = 1
         LEFT JOIN plate_authorizations pa ON pa.plate_id = p.id AND pa.active = 1
         ORDER BY p.created_at DESC'
    );

    // Passages (all)
    $passages = $db->fetchAll(
        'SELECT * FROM passages ORDER BY id ASC'
    );

    // Tickets (all)
    $tickets = $db->fetchAll(
        'SELECT * FROM tickets ORDER BY id ASC'
    );

    // Build passage map keyed by plate_id
    $passageMap = [];
    foreach ($passages as $passage) {
        if ($passage['plate_id'] !== null) {
            $passageMap[(int)$passage['plate_id']][] = $passage;
        }
    }

    // Attach passages and subscription/prepaid sub-objects to each plate
    foreach ($plates as &$plate) {
        $id = (int)$plate['id'];
        $plate['passages'] = $passageMap[$id] ?? [];

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

        // Authorization sub-object
        $plate['is_authorized'] = (bool)$plate['authorized_until'];
        $plate['authorized_until']  = $plate['authorized_until'] ?? null;
        $plate['authorized_reason'] = $plate['authorized_reason'] ?? null;
    }
    unset($plate);

    // Standalone passages (no plate)
    $standalonePassages = array_values(array_filter($passages, fn($p) => $p['plate_id'] === null));

    echo json_encode([
        'success'            => true,
        'plates'             => $plates,
        'passages'           => $passages,
        'standalone_passages'=> $standalonePassages,
        'tickets'            => $tickets,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
    jsonError(APP_DEBUG ? $e->getMessage() : 'Errore interno del server', 500);
}
