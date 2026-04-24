<?php
require_once dirname(__DIR__, 2) . '/config/config.php';

setJsonHeaders();

$section = trim($_GET['section'] ?? '');

$costanti = loadCostanti();

if ($section) {
    if (!isset($costanti[$section])) jsonError('Sezione non trovata: ' . $section, 404);
    jsonSuccess(['section' => $section, 'values' => $costanti[$section]]);
}

jsonSuccess(['costanti' => $costanti]);
