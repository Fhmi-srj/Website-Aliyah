<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\Admin\KelasController;
use App\Http\Controllers\Api\Admin\MapelController;
use App\Http\Controllers\Api\Admin\GuruController;
use App\Http\Controllers\Api\Admin\SiswaController;
use App\Http\Controllers\Api\Admin\JadwalController;
use App\Http\Controllers\Api\Admin\KegiatanController;
use App\Http\Controllers\Api\Admin\EkskulController;
use App\Http\Controllers\Api\Admin\RapatController;
use App\Http\Controllers\Api\Admin\DashboardController;


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

// Protected Auth Routes
Route::middleware('auth:sanctum')->group(function () {
    Route::post('auth/logout', [AuthController::class, 'logout']);
    Route::get('auth/me', [AuthController::class, 'me']);
    Route::post('auth/change-password', [AuthController::class, 'changePassword']);
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
    Route::apiResource('siswa', SiswaController::class);
    Route::apiResource('jadwal', JadwalController::class);
    Route::apiResource('kegiatan', KegiatanController::class);
    Route::apiResource('ekskul', EkskulController::class);
    Route::apiResource('rapat', RapatController::class);

    // Ekskul Anggota Management
    Route::get('ekskul/{ekskul}/anggota', [EkskulController::class, 'getAnggota']);
    Route::post('ekskul/{ekskul}/anggota', [EkskulController::class, 'addAnggota']);
    Route::delete('ekskul/{ekskul}/anggota/{siswa}', [EkskulController::class, 'removeAnggota']);
});

// Guru Panel Routes (for guru role)
Route::prefix('guru-panel')->middleware('auth:sanctum')->group(function () {
    Route::get('dashboard', [\App\Http\Controllers\Api\Guru\GuruDashboardController::class, 'index']);
    Route::get('search', [\App\Http\Controllers\Api\Guru\GuruDashboardController::class, 'search']);
    Route::get('profile', [\App\Http\Controllers\Api\Guru\GuruDashboardController::class, 'profile']);

    // Absensi Mengajar
    Route::get('jadwal-hari-ini', [\App\Http\Controllers\Api\Guru\GuruAbsensiController::class, 'jadwalHariIni']);
    Route::get('jadwal-seminggu', [\App\Http\Controllers\Api\Guru\GuruAbsensiController::class, 'jadwalSeminggu']);
    Route::get('jadwal/{id}/detail', [\App\Http\Controllers\Api\Guru\GuruAbsensiController::class, 'detailJadwal']);
    Route::post('absensi', [\App\Http\Controllers\Api\Guru\GuruAbsensiController::class, 'simpanAbsensi']);

    // Absensi Kegiatan
    Route::get('kegiatan-hari-ini', [\App\Http\Controllers\Api\Guru\GuruKegiatanController::class, 'kegiatanHariIni']);
    Route::get('kegiatan/{id}/detail', [\App\Http\Controllers\Api\Guru\GuruKegiatanController::class, 'detailKegiatan']);
    Route::post('kegiatan/absensi', [\App\Http\Controllers\Api\Guru\GuruKegiatanController::class, 'simpanAbsensi']);
    Route::post('kegiatan/absensi-pendamping', [\App\Http\Controllers\Api\Guru\GuruKegiatanController::class, 'absensiPendamping']);
    Route::get('kegiatan/{id}/absensi-pendamping', [\App\Http\Controllers\Api\Guru\GuruKegiatanController::class, 'getAbsensiPendamping']);
    Route::get('kegiatan/{id}/check-pendamping-status', [\App\Http\Controllers\Api\Guru\GuruKegiatanController::class, 'checkPendampingStatus']);

    // Absensi Rapat
    Route::get('rapat-hari-ini', [\App\Http\Controllers\Api\Guru\GuruRapatController::class, 'rapatHariIni']);
    Route::get('rapat/{id}/detail', [\App\Http\Controllers\Api\Guru\GuruRapatController::class, 'detailRapat']);
    Route::post('rapat/absensi-pimpinan', [\App\Http\Controllers\Api\Guru\GuruRapatController::class, 'absensiPimpinan']);
    Route::post('rapat/absensi-peserta', [\App\Http\Controllers\Api\Guru\GuruRapatController::class, 'absensiPeserta']);
    Route::post('rapat/absensi-sekretaris', [\App\Http\Controllers\Api\Guru\GuruRapatController::class, 'absensiSekretaris']);
    Route::get('rapat/{id}/absensi-peserta', [\App\Http\Controllers\Api\Guru\GuruRapatController::class, 'getAbsensiPeserta']);
    Route::get('rapat/{id}/check-status', [\App\Http\Controllers\Api\Guru\GuruRapatController::class, 'checkPesertaStatus']);
});

