<?php
require_once dirname(__DIR__) . '/config/config.php';
require_once dirname(__DIR__) . '/config/database.php';

setJsonHeaders();

$db      = Database::getInstance();
$tickets = $db->fetchAll(
    'SELECT t.*, pa.plate_id, pa.entry_datetime, pa.exit_datetime, p.plate_number
     FROM tickets t
     LEFT JOIN passages pa ON pa.id = t.passage_id
     LEFT JOIN plates   p  ON p.id  = pa.plate_id
     ORDER BY t.created_at DESC
     LIMIT 200'
);

jsonSuccess(['tickets' => $tickets]);
