<?php

namespace App\Services;

use App\Models\AppSetting;

class PrintService
{
    /**
     * Get kop surat URL
     */
    public static function getKopUrl()
    {
        $kopPath = AppSetting::getValue('kop_image');
        return $kopPath ? asset('storage/' . $kopPath) : null;
    }

    /**
     * Get logo URL
     */
    public static function getLogoUrl()
    {
        $logoPath = AppSetting::getValue('logo_lembaga');
        return $logoPath ? asset('storage/' . $logoPath) : null;
    }

    /**
     * Get school name
     */
    public static function getSchoolName()
    {
        return AppSetting::getValue('nama_lembaga') ?? 'Sekolah';
    }

    /**
     * Format date to Indonesian
     */
    public static function formatDate($date, $format = 'd F Y')
    {
        if (!$date)
            return '-';

        $carbon = $date instanceof \Carbon\Carbon ? $date : \Carbon\Carbon::parse($date);
        return $carbon->locale('id')->translatedFormat($format);
    }

    /**
     * Format time (HH:MM)
     */
    public static function formatTime($time)
    {
        if (!$time)
            return '-';
        return substr($time, 0, 5);
    }

    /**
     * Get status badge class
     */
    public static function getStatusClass($status)
    {
        return match (strtolower($status)) {
            'hadir' => 'status-hadir',
            'izin' => 'status-izin',
            'sakit' => 'status-sakit',
            'alpha' => 'status-alpha',
            default => 'status-default',
        };
    }

    /**
     * Get Kepala Sekolah / Kepala Madrasah data
     */
    public static function getKepalaSekolah()
    {
        // Try to get from app settings first
        $nama = AppSetting::getValue('nama_kepala_sekolah');
        $nip = AppSetting::getValue('nip_kepala_sekolah');

        // If not in settings, try to find user with kepala_madrasah role
        if (!$nama) {
            // Find user with kepala_madrasah role using whereHas
            $kepalaUser = \App\Models\User::whereHas('roles', function ($q) {
                $q->where('name', 'kepala_madrasah');
            })
                ->with('guru')
                ->first();

            if ($kepalaUser && $kepalaUser->guru) {
                $nama = $kepalaUser->guru->nama;
                $nip = $kepalaUser->guru->nip;
            } else {
                // Fallback: try to find from Guru table with jabatan
                $kepala = \App\Models\Guru::where(function ($q) {
                    $q->where('jabatan', 'Kepala Madrasah')
                        ->orWhere('jabatan', 'Kepala Sekolah')
                        ->orWhere('jabatan', 'like', 'Kepala %');
                })->first();

                if ($kepala) {
                    $nama = $kepala->nama;
                    $nip = $kepala->nip;
                }
            }
        }

        return [
            'nama' => $nama,
            'nip' => $nip,
        ];
    }

    /**
     * Get Tata Usaha data
     */
    public static function getTataUsaha()
    {
        // Try to find user with tata_usaha role
        $tuUser = \App\Models\User::whereHas('roles', function ($q) {
            $q->where('name', 'tata_usaha');
        })
            ->with('guru')
            ->first();

        if ($tuUser && $tuUser->guru) {
            return [
                'nama' => $tuUser->guru->nama,
                'nip' => $tuUser->guru->nip,
            ];
        }

        // Fallback: try to find from Guru table with jabatan
        $tu = \App\Models\Guru::where(function ($q) {
            $q->where('jabatan', 'Tata Usaha')
                ->orWhere('jabatan', 'like', 'Tata Usaha%')
                ->orWhere('jabatan', 'like', '%TU%');
        })->first();

        if ($tu) {
            return [
                'nama' => $tu->nama,
                'nip' => $tu->nip,
            ];
        }

        return [
            'nama' => null,
            'nip' => null,
        ];
    }

    /**
     * Generate QR Code with logo overlay for document verification
     * Returns base64 data URI for embedding in print templates
     */
    public static function generateQrCode($verificationId)
    {
        $url = url('/verify/' . $verificationId);

        // Get logo path for overlay
        $logoPath = null;
        $logoSetting = AppSetting::getValue('logo_lembaga');
        if ($logoSetting && file_exists(storage_path('app/public/' . $logoSetting))) {
            $logoPath = storage_path('app/public/' . $logoSetting);
        } elseif (file_exists(public_path('images/logo.png'))) {
            $logoPath = public_path('images/logo.png');
        }

        // Generate QR code as SVG (no Imagick required)
        $qrSvg = \SimpleSoftwareIO\QrCode\Facades\QrCode::format('svg')
            ->size(200)
            ->errorCorrection('H') // High error correction for logo overlay
            ->margin(1)
            ->generate($url);

        // If logo exists, embed it in the center of the SVG
        if ($logoPath) {
            $logoData = base64_encode(file_get_contents($logoPath));
            $logoExt = pathinfo($logoPath, PATHINFO_EXTENSION);
            $mimeType = $logoExt === 'png' ? 'image/png' : ($logoExt === 'svg' ? 'image/svg+xml' : 'image/jpeg');

            // Insert logo image in the center of the SVG (25% of QR size)
            $logoSize = 50; // 25% of 200
            $logoPos = (200 - $logoSize) / 2;
            $logoSvg = '<rect x="' . ($logoPos - 3) . '" y="' . ($logoPos - 3) . '" width="' . ($logoSize + 6) . '" height="' . ($logoSize + 6) . '" fill="white" rx="4"/>';
            $logoSvg .= '<image x="' . $logoPos . '" y="' . $logoPos . '" width="' . $logoSize . '" height="' . $logoSize . '" href="data:' . $mimeType . ';base64,' . $logoData . '" />';

            // Insert before closing </svg> tag
            $qrSvg = str_replace('</svg>', $logoSvg . '</svg>', $qrSvg);
        }

        return 'data:image/svg+xml;base64,' . base64_encode($qrSvg);
    }

    /**
     * Create a document verification record and return QR code
     */
    public static function createVerification($jenisDokumen, $perihal, $tanggalDokumen, $detail = [])
    {
        $kepala = self::getKepalaSekolah();

        $verification = \App\Models\DocumentVerification::create([
            'jenis_dokumen' => $jenisDokumen,
            'perihal' => $perihal,
            'dikeluarkan_oleh' => $kepala['nama'] ?? '-',
            'nip_pejabat' => $kepala['nip'] ?? null,
            'tanggal_dokumen' => $tanggalDokumen,
            'tanggal_cetak' => now()->toDateString(),
            'detail' => $detail,
        ]);

        return [
            'qrCode' => self::generateQrCode($verification->id),
            'verification' => $verification,
        ];
    }
}
