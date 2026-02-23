<?php

use Illuminate\Support\Facades\Route;

// Print Routes (requires token in query string)
Route::prefix('print')->middleware(['web', 'token_auth'])->group(function () {
    Route::get('jurnal-guru', [\App\Http\Controllers\Api\Guru\GuruPrintController::class, 'jurnalGuru']);
    Route::get('jurnal-kelas/{kelasId}', [\App\Http\Controllers\Api\Guru\GuruPrintController::class, 'jurnalKelas']);
    Route::get('hasil-rapat/{absensiId}', [\App\Http\Controllers\Api\Guru\GuruPrintController::class, 'hasilRapat']);
    Route::get('hasil-kegiatan/{absensiId}', [\App\Http\Controllers\Api\Guru\GuruPrintController::class, 'hasilKegiatan']);
    Route::get('hasil-kegiatan-bulk', [\App\Http\Controllers\Api\Guru\GuruPrintController::class, 'hasilKegiatanBulk']);
    Route::get('hasil-rapat-bulk', [\App\Http\Controllers\Api\Guru\GuruPrintController::class, 'hasilRapatBulk']);
    Route::get('profil', [\App\Http\Controllers\Api\Guru\GuruPrintController::class, 'profilGuru']);
    Route::get('daftar-hadir-kelas/{kelasId}', [\App\Http\Controllers\Api\Guru\GuruPrintController::class, 'daftarHadirKelas']);
    Route::get('daftar-hadir-kelas-bulk', [\App\Http\Controllers\Api\Guru\GuruPrintController::class, 'daftarHadirKelasBulk']);
    Route::get('jurnal-guru-bulk', [\App\Http\Controllers\Api\Guru\GuruPrintController::class, 'jurnalGuruBulk']);
    Route::get('daftar-hadir-guru-bulk', [\App\Http\Controllers\Api\Guru\GuruPrintController::class, 'daftarHadirGuruBulk']);
});

// Document Verification Route (public, no auth)
Route::get('/verify/{id}', [\App\Http\Controllers\VerificationController::class, 'show'])->name('verify.show');

// PWA Routes
Route::get('/manifest.json', [\App\Http\Controllers\ManifestController::class, 'manifest']);
Route::get('/pwa-icon/{size}', [\App\Http\Controllers\ManifestController::class, 'icon'])->where('size', '[0-9]+');
Route::get('/sw.js', function () {
    return response()->file(public_path('sw.js'), [
        'Content-Type' => 'application/javascript',
        'Service-Worker-Allowed' => '/',
    ]);
});

// SPA catch-all route - serves React app for all routes
Route::get('/{any?}', function () {
    return view('app');
})->where('any', '.*');

