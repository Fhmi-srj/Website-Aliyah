<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Auto-save Alpha records daily at midnight
Schedule::command('absensi:save-alpha')->daily()->at('00:00')
    ->appendOutputTo(storage_path('logs/alpha-records.log'));
