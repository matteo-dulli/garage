<?php
require_once dirname(__DIR__) . '/config/config.php';
require_once dirname(__DIR__) . '/config/database.php';

setJsonHeaders();

$q          = trim($_GET['q']           ?? '');
$ticketCode = trim($_GET['ticket_code'] ?? '');

$db = Database::getInstance();

if ($ticketCode) {
    $ticket = $db->fetchOne(
        'SELECT t.*, pa.plate_id, pa.entry_datetime, pa.exit_datetime
         FROM tickets t
         LEFT JOIN passages pa ON pa.id = t.passage_id
         WHERE t.ticket_code = ?',
        [$ticketCode]
    );
    if (!$ticket) jsonError('Ticket non trovato', 404);
    jsonSuccess(['ticket' => $ticket]);
}

if (!$q || strlen($q) < 2) jsonError('Query troppo corta');

$plates = $db->fetchAll(
    'SELECT p.*,
            (SELECT pa.entry_datetime FROM passages pa WHERE pa.plate_id = p.id ORDER BY pa.id DESC LIMIT 1) AS last_entry,
            (SELECT pa.exit_datetime  FROM passages pa WHERE pa.plate_id = p.id ORDER BY pa.id DESC LIMIT 1) AS last_exit
     FROM plates p
     WHERE p.plate_number LIKE ?
     ORDER BY p.plate_number ASC
     LIMIT 20',
    ['%' . $q . '%']
);

jsonSuccess(['plates' => $plates]);