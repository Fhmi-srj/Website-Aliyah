<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SuratKeluar extends Model
{
    use HasFactory;

    protected $table = 'surat_keluar';

    protected $fillable = [
        'user_id',
        'kode_surat',
        'jenis_surat',
        'nomor_urut',
        'nomor_surat',
        'tanggal',
        'keterangan',
        'file_surat',
        'template_data',
        'tahun_ajaran_id',
    ];

    protected $casts = [
        'tanggal' => 'date',
        'template_data' => 'array',
    ];

    // Kode Surat mapping
    public const KODE_SURAT = [
        '001' => 'Kepala Madrasah',
        '002' => 'Waka Kurikulum',
        '003' => 'Waka Kesiswaan',
        '004' => 'Kepala Tata Usaha',
        '005' => 'BK',
    ];

    // Jenis Surat mapping
    public const JENIS_SURAT = [
        '001' => 'Undangan',
        '002' => 'Surat Tugas',
        '003' => 'Surat Kuasa',
        '004' => 'Pemberitahuan',
        '005' => 'Surat Keputusan',
        '006' => 'Surat Keterangan',
        '007' => 'SK Aktif Guru',
        '008' => 'SK Aktif Siswa',
        '009' => 'SPPD',
    ];

    // Roman numerals for months
    public const BULAN_ROMAWI = [
        1 => 'I',
        2 => 'II',
        3 => 'III',
        4 => 'IV',
        5 => 'V',
        6 => 'VI',
        7 => 'VII',
        8 => 'VIII',
        9 => 'IX',
        10 => 'X',
        11 => 'XI',
        12 => 'XII',
    ];

    /**
     * Get the user who created this letter.
     */
    public function user()
    {
        return $this->belongsTo(\App\Models\User::class);
    }

    /**
     * Get the tahun ajaran.
     */
    public function tahunAjaran()
    {
        return $this->belongsTo(TahunAjaran::class);
    }

    /**
     * Generate the next nomor surat.
     * Format: {nomor_urut}/{kode_surat}/{jenis_surat}/{bulan_romawi}/{tahun}
     */
    public static function generateNomorSurat(string $kodeSurat, string $jenisSurat, ?string $tanggal = null): array
    {
        $date = $tanggal ? \Carbon\Carbon::parse($tanggal) : now();
        $bulan = $date->month;
        $tahun = $date->year;

        // Get the next nomor_urut for this month & year
        $lastNomor = self::whereMonth('tanggal', $bulan)
            ->whereYear('tanggal', $tahun)
            ->max('nomor_urut');

        $nomorUrut = ($lastNomor ?? 0) + 1;

        $bulanRomawi = self::BULAN_ROMAWI[$bulan];
        $nomorSurat = sprintf('%02d/%s/%s/%s/%d', $nomorUrut, $kodeSurat, $jenisSurat, $bulanRomawi, $tahun);

        return [
            'nomor_urut' => $nomorUrut,
            'nomor_surat' => $nomorSurat,
        ];
    }

    /**
     * Get kode_surat label.
     */
    public function getKodeSuratLabelAttribute(): string
    {
        return self::KODE_SURAT[$this->kode_surat] ?? $this->kode_surat;
    }

    /**
     * Get jenis_surat label.
     */
    public function getJenisSuratLabelAttribute(): string
    {
        return self::JENIS_SURAT[$this->jenis_surat] ?? $this->jenis_surat;
    }
}
