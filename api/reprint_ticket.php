<?php
require_once dirname(__DIR__) . '/config/config.php';
require_once dirname(__DIR__) . '/config/database.php';

setJsonHeaders();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonError('Metodo non consentito', 405);

$body       = getJsonBody();
$ticketCode = trim($body['ticket_code'] ?? '');
if (!$ticketCode) jsonError('ticket_code richiesto');

$db     = Database::getInstance();
$ticket = $db->fetchOne('SELECT * FROM tickets WHERE ticket_code = ?', [$ticketCode]);
if (!$ticket) jsonError('Ticket non trovato', 404);

$db->query('UPDATE tickets SET printed_at = NOW(), updated_at = NOW() WHERE ticket_code = ?', [$ticketCode]);

$ticket = $db->fetchOne('SELECT * FROM tickets WHERE ticket_code = ?', [$ticketCode]);
jsonSuccess(['ticket' => $ticket]);
