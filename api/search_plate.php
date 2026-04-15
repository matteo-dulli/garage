<?php
/**
 * search_plate.php - Search plates by plate number or ticket code
 * Garage ANPR Management System
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';

setJsonHeaders();

$query       = isset($_GET['q'])           ? trim($_GET['q'])           : '';
$ticketCode  = isset($_GET['ticket_code']) ? trim($_GET['ticket_code']) : '';

if (!$query && !$ticketCode) {
    jsonError('Parametro di ricerca mancante');
}

try {
    $db = Database::getInstance();

    // Search by ticket code
    if ($ticketCode) {
        $passage = $db->fetchOne(
            'SELECT pg.*, t.ticket_code, t.amount, t.paid, t.printed_at,
                    p.plate_number
             FROM tickets t
             JOIN passages pg ON pg.id = t.passage_id
             LEFT JOIN plates p ON p.id = pg.plate_id
             WHERE t.ticket_code = ?',
            [$ticketCode]
        );

        if ($passage) {
            echo json_encode(['success' => true, 'passage' => $passage], JSON_UNESCAPED_UNICODE);
        } else {
            // Maybe the ticket_code is stored directly on the plate
            $plate = $db->fetchOne(
                'SELECT * FROM plates WHERE ticket_code = ?',
                [$ticketCode]
            );
            if ($plate) {
                echo json_encode(['success' => true, 'plate' => $plate], JSON_UNESCAPED_UNICODE);
            } else {
                echo json_encode(['success' => false, 'error' => 'Nessun risultato'], JSON_UNESCAPED_UNICODE);
            }
        }
        exit;
    }

    // Search by plate number (partial match)
    $plates = $db->fetchAll(
        'SELECT p.*, s.type AS subscription_type
         FROM plates p
         LEFT JOIN subscriptions s ON s.plate_id = p.id AND s.active = 1
         WHERE p.plate_number LIKE ?
         ORDER BY p.plate_number ASC
         LIMIT 50',
        ['%' . $query . '%']
    );

    echo json_encode(['success' => true, 'plates' => $plates], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
    jsonError(APP_DEBUG ? $e->getMessage() : 'Errore interno del server', 500);
}