<?php
require 'vendor/autoload.php';

use PhpOffice\PhpSpreadsheet\IOFactory;

$spreadsheet = IOFactory::load('Kalender_Pendidikan_2026-02-07 (1).xlsx');
$sheet = $spreadsheet->getActiveSheet();
$data = $sheet->toArray();

foreach ($data as $i => $row) {
    echo 'Row ' . $i . ': ' . json_encode($row, JSON_UNESCAPED_UNICODE) . PHP_EOL;
}
