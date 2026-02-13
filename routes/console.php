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

// === WhatsApp Notification Schedules ===

// Personal reminder: check every minute for jadwal that started 30 min ago
Schedule::command('wa:absen-reminder')->everyMinute()
    ->appendOutputTo(storage_path('logs/whatsapp-scheduler.log'));

// Group: Jadwal harian
Schedule::command('wa:schedule-daily')
    ->dailyAt(\App\Models\AppSetting::getValue('wa_schedule_time', config('services.mpwa.schedule_time', '06:30')))
    ->appendOutputTo(storage_path('logs/whatsapp-scheduler.log'));

// Group: Rekap absensi mengajar
Schedule::command('wa:attendance-recap')
    ->dailyAt(\App\Models\AppSetting::getValue('wa_recap_time', config('services.mpwa.recap_time', '13:30')))
    ->appendOutputTo(storage_path('logs/whatsapp-scheduler.log'));

// Group: Laporan kegiatan & rapat
Schedule::command('wa:activity-report')
    ->dailyAt(\App\Models\AppSetting::getValue('wa_activity_report_time', config('services.mpwa.activity_report_time', '18:00')))
    ->appendOutputTo(storage_path('logs/whatsapp-scheduler.log'));

// Group: Undangan rapat H-2 + Pengingat H
Schedule::command('wa:meeting-invitation')
    ->dailyAt(\App\Models\AppSetting::getValue('wa_meeting_invite_time', config('services.mpwa.meeting_invite_time', '07:00')))
    ->appendOutputTo(storage_path('logs/whatsapp-scheduler.log'));
