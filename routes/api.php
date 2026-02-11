<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\TahunAjaranController;
use App\Http\Controllers\Api\Admin\KelasController;
use App\Http\Controllers\Api\Admin\MapelController;
use App\Http\Controllers\Api\Admin\GuruController;
use App\Http\Controllers\Api\Admin\SiswaController;
use App\Http\Controllers\Api\Admin\JadwalController;
use App\Http\Controllers\Api\Admin\KegiatanController;
use App\Http\Controllers\Api\Admin\EkskulController;
use App\Http\Controllers\Api\Admin\RapatController;
use App\Http\Controllers\Api\Admin\DashboardController;
use App\Http\Controllers\Api\Admin\SettingController;


/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group.
|
*/

// Public Auth Routes
Route::post('auth/login', [AuthController::class, 'login']);

// Public Tahun Ajaran Routes (needed for login page)
Route::get('tahun-ajaran', [TahunAjaranController::class, 'index']);
Route::get('tahun-ajaran/active', [TahunAjaranController::class, 'getActive']);

// Protected Auth Routes
Route::middleware('auth:sanctum')->group(function () {
    Route::post('auth/logout', [AuthController::class, 'logout']);
    Route::get('auth/me', [AuthController::class, 'me']);
    Route::post('auth/change-password', [AuthController::class, 'changePassword']);

    // Protected Tahun Ajaran Routes (write operations)
    Route::post('tahun-ajaran/set-active', [TahunAjaranController::class, 'setActive']);
    Route::delete('tahun-ajaran/{id}', [TahunAjaranController::class, 'destroy']);

    // Tahun Ajaran Wizard Routes
    Route::get('tahun-ajaran/wizard/preview', [\App\Http\Controllers\Api\Admin\TahunAjaranWizardController::class, 'getPreviewData']);
    Route::get('tahun-ajaran/wizard/student-mappings', [\App\Http\Controllers\Api\Admin\TahunAjaranWizardController::class, 'getStudentMappings']);
    Route::post('tahun-ajaran/wizard/execute', [\App\Http\Controllers\Api\Admin\TahunAjaranWizardController::class, 'executeWizard']);
});

// Protected Data Routes (requires authentication)
Route::middleware('auth:sanctum')->group(function () {
    // Dashboard Routes
    Route::get('dashboard/statistics', [DashboardController::class, 'statistics']);
    Route::get('dashboard/charts', [DashboardController::class, 'charts']);
    Route::get('dashboard/recent-activity', [DashboardController::class, 'recentActivity']);

    // Data Induk Routes (Operator only for now)
    Route::apiResource('kelas', KelasController::class)->parameters(['kelas' => 'kelas']);
    Route::apiResource('mapel', MapelController::class);
    Route::apiResource('guru', GuruController::class);
    Route::post('guru/{guru}/link-user', [GuruController::class, 'linkUser']);
    Route::post('guru/bulk-delete', [GuruController::class, 'bulkDelete']);
    Route::post('guru/{guru}/upload-ttd', [GuruController::class, 'uploadTtd']);
    Route::apiResource('siswa', SiswaController::class);
    Route::post('siswa/bulk-delete', [SiswaController::class, 'bulkDelete']);
    Route::apiResource('jadwal', JadwalController::class);
    Route::apiResource('kegiatan', KegiatanController::class);
    Route::post('kegiatan/bulk-delete', [KegiatanController::class, 'bulkDelete']);
    Route::post('kegiatan/bulk-jenis', [KegiatanController::class, 'bulkUpdateJenis']);
    Route::apiResource('ekskul', EkskulController::class);
    Route::apiResource('rapat', RapatController::class);
    Route::apiResource('jam-pelajaran', \App\Http\Controllers\Api\Admin\JamPelajaranController::class);
    Route::apiResource('kalender', \App\Http\Controllers\Api\Admin\KalenderController::class);
    Route::post('kalender/bulk-delete', [\App\Http\Controllers\Api\Admin\KalenderController::class, 'bulkDelete']);
    Route::post('kalender/bulk-status-kbm', [\App\Http\Controllers\Api\Admin\KalenderController::class, 'bulkUpdateStatusKbm']);
    Route::post('kalender/bulk-keterangan', [\App\Http\Controllers\Api\Admin\KalenderController::class, 'bulkUpdateKeterangan']);

    // Admin Absensi Edit Routes
    Route::get('rapat/{id}/absensi-admin', [\App\Http\Controllers\Api\Admin\AdminAbsensiController::class, 'getAbsensiRapat']);
    Route::put('rapat/{id}/absensi-admin', [\App\Http\Controllers\Api\Admin\AdminAbsensiController::class, 'updateAbsensiRapat']);
    Route::post('rapat/absensi/upload-foto', [\App\Http\Controllers\Api\Admin\AdminAbsensiController::class, 'uploadFotoRapat']);
    Route::get('kegiatan/{id}/absensi-admin', [\App\Http\Controllers\Api\Admin\AdminAbsensiController::class, 'getAbsensiKegiatan']);
    Route::put('kegiatan/{id}/absensi-admin', [\App\Http\Controllers\Api\Admin\AdminAbsensiController::class, 'updateAbsensiKegiatan']);
    Route::post('kegiatan/absensi/upload-foto', [\App\Http\Controllers\Api\Admin\AdminAbsensiController::class, 'uploadFotoKegiatan']);

    // Ekskul Anggota Management
    Route::get('ekskul/{ekskul}/anggota', [EkskulController::class, 'getAnggota']);
    Route::post('ekskul/{ekskul}/anggota', [EkskulController::class, 'addAnggota']);
    Route::delete('ekskul/{ekskul}/anggota/{siswa}', [EkskulController::class, 'removeAnggota']);

    // Settings Routes
    Route::get('settings', [SettingController::class, 'index']);
    Route::get('settings/public', [SettingController::class, 'getPublicSettings']);
    Route::get('settings/{key}', [SettingController::class, 'show']);
    Route::put('settings/{key}', [SettingController::class, 'update']);
    Route::post('settings/upload-logo', [SettingController::class, 'uploadLogo']);
    Route::post('settings/upload-kop', [SettingController::class, 'uploadKop']);

    // Activity Log Routes
    Route::prefix('activity-logs')->group(function () {
        Route::get('/', [\App\Http\Controllers\Api\Admin\ActivityLogController::class, 'index']);
        Route::get('/stats', [\App\Http\Controllers\Api\Admin\ActivityLogController::class, 'stats']);
        Route::post('/{id}/restore', [\App\Http\Controllers\Api\Admin\ActivityLogController::class, 'restore']);
    });

    // Role Management Routes
    Route::prefix('roles')->group(function () {
        Route::get('/', [\App\Http\Controllers\Api\Admin\RoleController::class, 'index']);
        Route::post('/', [\App\Http\Controllers\Api\Admin\RoleController::class, 'store']);
        Route::get('/users-list', [\App\Http\Controllers\Api\Admin\RoleController::class, 'getAllUsers']);
        Route::get('/{id}', [\App\Http\Controllers\Api\Admin\RoleController::class, 'show']);
        Route::put('/{id}', [\App\Http\Controllers\Api\Admin\RoleController::class, 'update']);
        Route::delete('/{id}', [\App\Http\Controllers\Api\Admin\RoleController::class, 'destroy']);
        Route::get('/{id}/users', [\App\Http\Controllers\Api\Admin\RoleController::class, 'getUsers']);
        Route::post('/assign', [\App\Http\Controllers\Api\Admin\RoleController::class, 'assignToUser']);
        Route::post('/remove', [\App\Http\Controllers\Api\Admin\RoleController::class, 'removeFromUser']);
        Route::post('/users/{userId}/sync', [\App\Http\Controllers\Api\Admin\RoleController::class, 'syncUserRoles']);
    });
});

// Guru Panel Routes (for guru role)
Route::prefix('guru-panel')->middleware('auth:sanctum')->group(function () {
    Route::get('dashboard', [\App\Http\Controllers\Api\Guru\GuruDashboardController::class, 'index']);
    Route::get('search', [\App\Http\Controllers\Api\Guru\GuruDashboardController::class, 'search']);
    Route::get('profile', [\App\Http\Controllers\Api\Guru\GuruDashboardController::class, 'profile']);
    Route::post('upload-photo', [\App\Http\Controllers\Api\Guru\GuruDashboardController::class, 'uploadPhoto']);
    Route::post('upload-ttd', [\App\Http\Controllers\Api\Guru\GuruDashboardController::class, 'uploadTtd']);
    Route::get('upcoming-events', [\App\Http\Controllers\Api\Guru\GuruDashboardController::class, 'upcomingEvents']);

    // Absensi Mengajar
    Route::get('jadwal-hari-ini', [\App\Http\Controllers\Api\Guru\GuruAbsensiController::class, 'jadwalHariIni']);
    Route::get('jadwal-seminggu', [\App\Http\Controllers\Api\Guru\GuruAbsensiController::class, 'jadwalSeminggu']);
    Route::get('jadwal/{id}/detail', [\App\Http\Controllers\Api\Guru\GuruAbsensiController::class, 'detailJadwal']);
    Route::get('jadwal/{id}/siswa', [\App\Http\Controllers\Api\Guru\GuruAbsensiController::class, 'getSiswaByJadwal']);
    Route::get('guru-list', [\App\Http\Controllers\Api\Guru\GuruAbsensiController::class, 'getGuruList']);
    Route::post('absensi', [\App\Http\Controllers\Api\Guru\GuruAbsensiController::class, 'simpanAbsensi']);

    // Absensi Kegiatan
    Route::get('kegiatan-hari-ini', [\App\Http\Controllers\Api\Guru\GuruKegiatanController::class, 'kegiatanHariIni']);
    Route::get('kegiatan-seminggu', [\App\Http\Controllers\Api\Guru\GuruKegiatanController::class, 'kegiatanSeminggu']);
    Route::get('kegiatan/{id}/detail', [\App\Http\Controllers\Api\Guru\GuruKegiatanController::class, 'detailKegiatan']);
    Route::post('kegiatan/absensi', [\App\Http\Controllers\Api\Guru\GuruKegiatanController::class, 'simpanAbsensi']);
    Route::post('kegiatan/absensi-pendamping', [\App\Http\Controllers\Api\Guru\GuruKegiatanController::class, 'absensiPendamping']);
    Route::get('kegiatan/{id}/absensi-pendamping', [\App\Http\Controllers\Api\Guru\GuruKegiatanController::class, 'getAbsensiPendamping']);
    Route::get('kegiatan/{id}/check-pendamping-status', [\App\Http\Controllers\Api\Guru\GuruKegiatanController::class, 'checkPendampingStatus']);
    Route::get('kegiatan/{id}/absensi', [\App\Http\Controllers\Api\Guru\GuruKegiatanController::class, 'getAbsensiKegiatan']);

    // Absensi Rapat
    Route::get('rapat-hari-ini', [\App\Http\Controllers\Api\Guru\GuruRapatController::class, 'rapatHariIni']);
    Route::get('rapat-seminggu', [\App\Http\Controllers\Api\Guru\GuruRapatController::class, 'rapatSeminggu']);
    Route::get('rapat/{id}/detail', [\App\Http\Controllers\Api\Guru\GuruRapatController::class, 'detailRapat']);
    Route::post('rapat/absensi-pimpinan', [\App\Http\Controllers\Api\Guru\GuruRapatController::class, 'absensiPimpinan']);
    Route::post('rapat/absensi-peserta', [\App\Http\Controllers\Api\Guru\GuruRapatController::class, 'absensiPeserta']);
    Route::post('rapat/absensi-sekretaris', [\App\Http\Controllers\Api\Guru\GuruRapatController::class, 'absensiSekretaris']);
    Route::get('rapat/{id}/absensi-peserta', [\App\Http\Controllers\Api\Guru\GuruRapatController::class, 'getAbsensiPeserta']);
    Route::get('rapat/{id}/check-status', [\App\Http\Controllers\Api\Guru\GuruRapatController::class, 'checkPesertaStatus']);
    Route::get('rapat/{id}/absensi', [\App\Http\Controllers\Api\Guru\GuruRapatController::class, 'getAbsensiRapat']);

    // Riwayat
    Route::get('riwayat/mengajar', [\App\Http\Controllers\Api\Guru\GuruRiwayatController::class, 'riwayatMengajar']);
    Route::get('riwayat/mengajar/{id}/detail', [\App\Http\Controllers\Api\Guru\GuruRiwayatController::class, 'detailPertemuan']);
    Route::get('riwayat/kegiatan', [\App\Http\Controllers\Api\Guru\GuruRiwayatController::class, 'riwayatKegiatan']);
    Route::get('riwayat/kegiatan/{id}/detail', [\App\Http\Controllers\Api\Guru\GuruRiwayatController::class, 'detailKegiatan']);
    Route::get('riwayat/rapat', [\App\Http\Controllers\Api\Guru\GuruRiwayatController::class, 'riwayatRapat']);
    Route::get('riwayat/rapat/{id}/detail', [\App\Http\Controllers\Api\Guru\GuruRiwayatController::class, 'detailRapat']);

    // Check if attendance is unlocked
    Route::get('check-attendance-unlock', [SettingController::class, 'checkAttendanceUnlock']);

    Route::get('jurnal-kelas/list', [\App\Http\Controllers\Api\Guru\GuruPrintController::class, 'getKelasList']);
    Route::get('wali-kelas-info', [\App\Http\Controllers\Api\Guru\GuruDashboardController::class, 'waliKelasInfo']);
});

// Print Routes - separate group with token_auth middleware
Route::prefix('guru-panel')->middleware('token_auth')->group(function () {
    Route::get('print/jurnal-guru', [\App\Http\Controllers\Api\Guru\GuruPrintController::class, 'jurnalGuru']);
    Route::get('print/jurnal-kelas/{kelasId}', [\App\Http\Controllers\Api\Guru\GuruPrintController::class, 'jurnalKelas']);
    Route::get('print/hasil-rapat/{absensiId}', [\App\Http\Controllers\Api\Guru\GuruPrintController::class, 'hasilRapat']);
    Route::get('print/hasil-kegiatan/{absensiId}', [\App\Http\Controllers\Api\Guru\GuruPrintController::class, 'hasilKegiatan']);
    Route::get('print/hasil-kegiatan-bulk', [\App\Http\Controllers\Api\Guru\GuruPrintController::class, 'hasilKegiatanBulk']);
    Route::get('print/profil', [\App\Http\Controllers\Api\Guru\GuruPrintController::class, 'profilGuru']);
});

