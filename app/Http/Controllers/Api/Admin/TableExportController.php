<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\PrintService;
use App\Models\{
    Guru,
    Siswa,
    SiswaKelas,
    Kelas,
    Mapel,
    Jadwal,
    JamPelajaran,
    Kalender,
    Kegiatan,
    Ekskul,
    Rapat,
    Supervisi,
    SuratKeluar,
    SuratMasuk,
    Tagihan,
    TagihanSiswa,
    Pemasukan,
    Pengeluaran,
    AppSetting,
    TahunAjaran
};
use Illuminate\Http\Request;
use Barryvdh\DomPDF\Facade\Pdf;

class TableExportController extends Controller
{
    /**
     * Common data for all PDF exports
     */
    private function getPdfData($title, $subtitle, $columns, $rows, $orientation = 'portrait')
    {
        $kepala = PrintService::getKepalaSekolah();
        $namaLembaga = PrintService::getSchoolName();
        $alamat = AppSetting::getValue('alamat_lembaga') ?? 'Pekalongan';

        // Extract city name from address
        $tempat = $this->extractCity($alamat);
        $tempatTanggal = $tempat . ', ' . PrintService::formatDate(now());

        // Generate QR Code verification
        $qrData = PrintService::createVerification(
            'Laporan ' . $title,
            $title,
            now()->toDateString(),
            ['halaman' => $title]
        );

        return [
            'kopUrl' => PrintService::getKopUrl(),
            'title' => $title,
            'subtitle' => $subtitle,
            'columns' => $columns,
            'rows' => $rows,
            'tempatTanggal' => $tempatTanggal,
            'kepala' => $kepala,
            'qrCode' => $qrData['qrCode'],
            'namaLembaga' => $namaLembaga,
            'orientation' => $orientation,
        ];
    }

    /**
     * Extract city name from address string
     */
    private function extractCity($alamat)
    {
        // Try to get the city from common patterns
        // "Jl. xyz, Kota Pekalongan" -> "Pekalongan"
        // "Pekalongan" -> "Pekalongan"
        if (preg_match('/(?:Kota|Kab\.?|Kabupaten)\s+(\w+)/i', $alamat, $matches)) {
            return $matches[1];
        }
        // Fallback: take last word or the whole string if short
        $parts = array_filter(preg_split('/[,\n]/', $alamat));
        $last = trim(end($parts));
        return $last ?: 'Pekalongan';
    }

    /**
     * Render and download PDF
     */
    private function downloadPdf($data, $filename)
    {
        $html = view('exports.table-pdf', $data)->render();
        $pdf = Pdf::loadHTML($html);
        $pdf->setPaper('A4', $data['orientation'] ?? 'portrait');

        return response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }

    /**
     * Get active tahun ajaran ID
     */
    private function getActiveTahunAjaranId(Request $request)
    {
        $user = $request->user();
        if ($user && $user->tahun_ajaran_id) {
            return $user->tahun_ajaran_id;
        }
        $current = TahunAjaran::where('is_active', true)->first();
        return $current ? $current->id : null;
    }

    // ============================================================
    // DATA INDUK EXPORTS
    // ============================================================

    public function exportGuru(Request $request)
    {
        $query = Guru::orderBy('nama');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $data = $query->get();

        $columns = [
            ['label' => 'Nama', 'key' => 'nama'],
            ['label' => 'NIP', 'key' => 'nip'],
            ['label' => 'JK', 'key' => 'jk_label', 'align' => 'text-center'],
            ['label' => 'Jabatan', 'key' => 'jabatan'],
            ['label' => 'Pendidikan', 'key' => 'pendidikan'],
            ['label' => 'Kontak', 'key' => 'kontak'],
            ['label' => 'Status', 'key' => 'status', 'align' => 'text-center'],
        ];

        $rows = $data->map(fn($g) => [
            'nama' => $g->nama,
            'nip' => $g->nip ?? '-',
            'jk_label' => $g->jenis_kelamin === 'L' ? 'L' : 'P',
            'jabatan' => $g->jabatan ?? '-',
            'pendidikan' => $g->pendidikan ?? '-',
            'kontak' => $g->kontak ?? '-',
            'status' => $g->status ?? '-',
        ])->toArray();

        $pdfData = $this->getPdfData('Data Guru', 'Kelola data guru dan tenaga pendidik', $columns, $rows);
        return $this->downloadPdf($pdfData, 'data-guru.pdf');
    }

    public function exportSiswa(Request $request)
    {
        $tahunAjaranId = $request->query('tahun_ajaran_id') ?? $this->getActiveTahunAjaranId($request);

        if ($tahunAjaranId) {
            $siswaKelas = SiswaKelas::where('tahun_ajaran_id', $tahunAjaranId)
                ->whereIn('status', ['Aktif', 'Naik', 'Tinggal', 'Lulus'])
                ->with(['siswa', 'kelas'])
                ->get()
                ->filter(fn($sk) => $sk->siswa !== null);

            $data = $siswaKelas->map(fn($sk) => [
                'nama' => $sk->siswa->nama ?? '-',
                'nis' => $sk->siswa->nis ?? '-',
                'nisn' => $sk->siswa->nisn ?? '-',
                'jk_label' => ($sk->siswa->jenis_kelamin ?? 'L') === 'L' ? 'L' : 'P',
                'kelas' => $sk->kelas->nama_kelas ?? '-',
                'status' => $sk->siswa->status ?? '-',
            ])->values()->toArray();
        } else {
            $siswa = Siswa::with('kelas')->orderBy('nama')->get();
            $data = $siswa->map(fn($s) => [
                'nama' => $s->nama,
                'nis' => $s->nis ?? '-',
                'nisn' => $s->nisn ?? '-',
                'jk_label' => ($s->jenis_kelamin ?? 'L') === 'L' ? 'L' : 'P',
                'kelas' => $s->kelas->nama_kelas ?? '-',
                'status' => $s->status ?? '-',
            ])->toArray();
        }

        $columns = [
            ['label' => 'Nama', 'key' => 'nama'],
            ['label' => 'NIS', 'key' => 'nis'],
            ['label' => 'NISN', 'key' => 'nisn'],
            ['label' => 'JK', 'key' => 'jk_label', 'align' => 'text-center'],
            ['label' => 'Kelas', 'key' => 'kelas'],
            ['label' => 'Status', 'key' => 'status', 'align' => 'text-center'],
        ];

        $pdfData = $this->getPdfData('Data Siswa', 'Data peserta didik', $columns, $data);
        return $this->downloadPdf($pdfData, 'data-siswa.pdf');
    }

    public function exportKelas(Request $request)
    {
        $tahunAjaranId = $request->query('tahun_ajaran_id') ?? $this->getActiveTahunAjaranId($request);

        $query = Kelas::with('waliKelas:id,nama')->orderBy('tingkat')->orderBy('nama_kelas');
        if ($tahunAjaranId) {
            $query->where('tahun_ajaran_id', $tahunAjaranId);
        }

        $data = $query->get();

        $columns = [
            ['label' => 'Nama Kelas', 'key' => 'nama_kelas'],
            ['label' => 'Tingkat', 'key' => 'tingkat', 'align' => 'text-center'],
            ['label' => 'Wali Kelas', 'key' => 'wali_kelas'],
            ['label' => 'Jumlah Siswa', 'key' => 'jumlah_siswa', 'align' => 'text-center'],
        ];

        $rows = $data->map(fn($k) => [
            'nama_kelas' => $k->nama_kelas,
            'tingkat' => $k->tingkat ?? '-',
            'wali_kelas' => $k->waliKelas->nama ?? '-',
            'jumlah_siswa' => $k->jumlah_siswa ?? 0,
        ])->toArray();

        $pdfData = $this->getPdfData('Data Kelas', 'Data kelas dan wali kelas', $columns, $rows);
        return $this->downloadPdf($pdfData, 'data-kelas.pdf');
    }

    public function exportMapel()
    {
        $data = Mapel::orderBy('nama_mapel')->get();

        $columns = [
            ['label' => 'Nama Mapel', 'key' => 'nama_mapel'],
            ['label' => 'Kode', 'key' => 'kode', 'align' => 'text-center'],
            ['label' => 'Kelompok', 'key' => 'kelompok'],
        ];

        $rows = $data->map(fn($m) => [
            'nama_mapel' => $m->nama_mapel,
            'kode' => $m->kode ?? '-',
            'kelompok' => $m->kelompok ?? '-',
        ])->toArray();

        $pdfData = $this->getPdfData('Data Mata Pelajaran', 'Data mata pelajaran', $columns, $rows);
        return $this->downloadPdf($pdfData, 'data-mapel.pdf');
    }

    public function exportJadwal(Request $request)
    {
        $tahunAjaranId = $request->query('tahun_ajaran_id') ?? $this->getActiveTahunAjaranId($request);

        $query = Jadwal::with(['guru:id,nama', 'mapel:id,nama_mapel', 'kelas:id,nama_kelas', 'jamPelajaran:id,jam_ke,jam_mulai,jam_selesai']);
        if ($tahunAjaranId) {
            $query->where('tahun_ajaran_id', $tahunAjaranId);
        }
        if ($request->filled('kelas_id')) {
            $query->where('kelas_id', $request->kelas_id);
        }
        if ($request->filled('hari')) {
            $query->where('hari', $request->hari);
        }

        $data = $query->orderBy('hari')->orderBy('jam_ke')->get();

        $hariNames = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

        $columns = [
            ['label' => 'Hari', 'key' => 'hari_label'],
            ['label' => 'Jam Ke', 'key' => 'jam_ke', 'align' => 'text-center'],
            ['label' => 'Waktu', 'key' => 'waktu'],
            ['label' => 'Mapel', 'key' => 'mapel'],
            ['label' => 'Guru', 'key' => 'guru'],
            ['label' => 'Kelas', 'key' => 'kelas'],
        ];

        $rows = $data->map(fn($j) => [
            'hari_label' => $hariNames[$j->hari - 1] ?? $j->hari,
            'jam_ke' => $j->jam_ke ?? '-',
            'waktu' => ($j->jamPelajaran ? substr($j->jamPelajaran->jam_mulai, 0, 5) . '-' . substr($j->jamPelajaran->jam_selesai, 0, 5) : '-'),
            'mapel' => $j->mapel->nama_mapel ?? '-',
            'guru' => $j->guru->nama ?? '-',
            'kelas' => $j->kelas->nama_kelas ?? '-',
        ])->toArray();

        $pdfData = $this->getPdfData('Jadwal Pelajaran', 'Jadwal pelajaran semester ini', $columns, $rows, 'landscape');
        return $this->downloadPdf($pdfData, 'jadwal-pelajaran.pdf');
    }

    public function exportJamPelajaran()
    {
        $data = JamPelajaran::orderBy('jam_ke')->get();

        $columns = [
            ['label' => 'Jam Ke', 'key' => 'jam_ke', 'align' => 'text-center'],
            ['label' => 'Jam Mulai', 'key' => 'jam_mulai', 'align' => 'text-center'],
            ['label' => 'Jam Selesai', 'key' => 'jam_selesai', 'align' => 'text-center'],
            ['label' => 'Keterangan', 'key' => 'keterangan'],
        ];

        $rows = $data->map(fn($jp) => [
            'jam_ke' => $jp->jam_ke,
            'jam_mulai' => substr($jp->jam_mulai, 0, 5),
            'jam_selesai' => substr($jp->jam_selesai, 0, 5),
            'keterangan' => $jp->keterangan ?? '-',
        ])->toArray();

        $pdfData = $this->getPdfData('Jam Pelajaran', 'Pengaturan jam pelajaran', $columns, $rows);
        return $this->downloadPdf($pdfData, 'jam-pelajaran.pdf');
    }

    public function exportKalender(Request $request)
    {
        $query = Kalender::orderBy('tanggal_mulai', 'desc');

        if ($request->filled('bulan')) {
            $query->whereMonth('tanggal_mulai', $request->bulan);
        }
        if ($request->filled('tahun')) {
            $query->whereYear('tanggal_mulai', $request->tahun);
        }

        $data = $query->get();

        $columns = [
            ['label' => 'Judul', 'key' => 'judul'],
            ['label' => 'Tanggal Mulai', 'key' => 'tanggal_mulai', 'align' => 'text-center'],
            ['label' => 'Tanggal Selesai', 'key' => 'tanggal_selesai', 'align' => 'text-center'],
            ['label' => 'Jenis', 'key' => 'jenis'],
            ['label' => 'Status KBM', 'key' => 'status_kbm', 'align' => 'text-center'],
            ['label' => 'Keterangan', 'key' => 'keterangan'],
        ];

        $rows = $data->map(fn($k) => [
            'judul' => $k->judul ?? '-',
            'tanggal_mulai' => PrintService::formatDate($k->tanggal_mulai, 'd/m/Y'),
            'tanggal_selesai' => $k->tanggal_selesai ? PrintService::formatDate($k->tanggal_selesai, 'd/m/Y') : '-',
            'jenis' => $k->jenis ?? '-',
            'status_kbm' => $k->status_kbm ?? '-',
            'keterangan' => $k->keterangan ?? '-',
        ])->toArray();

        $pdfData = $this->getPdfData('Kalender Akademik', 'Kalender kegiatan akademik', $columns, $rows, 'landscape');
        return $this->downloadPdf($pdfData, 'kalender-akademik.pdf');
    }

    public function exportKegiatan(Request $request)
    {
        $tahunAjaranId = $request->query('tahun_ajaran_id') ?? $this->getActiveTahunAjaranId($request);

        $query = Kegiatan::with('penanggungjawab:id,nama');
        if ($tahunAjaranId) {
            $query->where('tahun_ajaran_id', $tahunAjaranId);
        }

        $data = $query->orderBy('waktu_mulai', 'desc')->get();

        $columns = [
            ['label' => 'Nama Kegiatan', 'key' => 'nama'],
            ['label' => 'Jenis', 'key' => 'jenis', 'align' => 'text-center'],
            ['label' => 'Tanggal', 'key' => 'tanggal'],
            ['label' => 'Waktu', 'key' => 'waktu'],
            ['label' => 'Tempat', 'key' => 'tempat'],
            ['label' => 'Penanggung Jawab', 'key' => 'pj'],
            ['label' => 'Status', 'key' => 'status', 'align' => 'text-center'],
        ];

        $rows = $data->map(fn($k) => [
            'nama' => $k->nama ?? '-',
            'jenis' => ucfirst($k->jenis ?? '-'),
            'tanggal' => PrintService::formatDate($k->waktu_mulai, 'd/m/Y'),
            'waktu' => ($k->waktu_mulai ? substr($k->waktu_mulai, 11, 5) : '-') . ' - ' . ($k->waktu_selesai ? substr($k->waktu_selesai, 11, 5) : '-'),
            'tempat' => $k->tempat ?? '-',
            'pj' => $k->penanggungjawab->nama ?? '-',
            'status' => ucfirst($k->status ?? '-'),
        ])->toArray();

        $pdfData = $this->getPdfData('Data Kegiatan', 'Data kegiatan madrasah', $columns, $rows, 'landscape');
        return $this->downloadPdf($pdfData, 'data-kegiatan.pdf');
    }

    public function exportEkskul()
    {
        $data = Ekskul::with('pembina:id,nama')->withCount('anggota')->orderBy('nama_ekskul')->get();

        $columns = [
            ['label' => 'Nama Ekskul', 'key' => 'nama_ekskul'],
            ['label' => 'Pembina', 'key' => 'pembina'],
            ['label' => 'Hari', 'key' => 'hari'],
            ['label' => 'Waktu', 'key' => 'waktu'],
            ['label' => 'Jumlah Anggota', 'key' => 'jumlah_anggota', 'align' => 'text-center'],
        ];

        $rows = $data->map(fn($e) => [
            'nama_ekskul' => $e->nama_ekskul,
            'pembina' => $e->pembina->nama ?? '-',
            'hari' => $e->hari ?? '-',
            'waktu' => $e->waktu ?? '-',
            'jumlah_anggota' => $e->anggota_count ?? 0,
        ])->toArray();

        $pdfData = $this->getPdfData('Data Ekstrakurikuler', 'Data kegiatan ekstrakurikuler', $columns, $rows);
        return $this->downloadPdf($pdfData, 'data-ekskul.pdf');
    }

    public function exportRapat(Request $request)
    {
        $tahunAjaranId = $request->query('tahun_ajaran_id') ?? $this->getActiveTahunAjaranId($request);

        $query = Rapat::with(['pimpinanGuru:id,nama', 'sekretarisGuru:id,nama']);
        if ($tahunAjaranId) {
            $query->where('tahun_ajaran_id', $tahunAjaranId);
        }

        $data = $query->orderBy('tanggal', 'desc')->get();

        $columns = [
            ['label' => 'Judul', 'key' => 'judul'],
            ['label' => 'Tanggal', 'key' => 'tanggal', 'align' => 'text-center'],
            ['label' => 'Waktu', 'key' => 'waktu'],
            ['label' => 'Tempat', 'key' => 'tempat'],
            ['label' => 'Pimpinan', 'key' => 'pimpinan'],
            ['label' => 'Status', 'key' => 'status', 'align' => 'text-center'],
        ];

        $rows = $data->map(fn($r) => [
            'judul' => $r->judul ?? '-',
            'tanggal' => PrintService::formatDate($r->tanggal, 'd/m/Y'),
            'waktu' => ($r->waktu_mulai ? substr($r->waktu_mulai, 0, 5) : '-') . ' - ' . ($r->waktu_selesai ? substr($r->waktu_selesai, 0, 5) : '-'),
            'tempat' => $r->tempat ?? '-',
            'pimpinan' => $r->pimpinanGuru->nama ?? '-',
            'status' => ucfirst($r->status ?? '-'),
        ])->toArray();

        $pdfData = $this->getPdfData('Data Rapat', 'Data rapat madrasah', $columns, $rows, 'landscape');
        return $this->downloadPdf($pdfData, 'data-rapat.pdf');
    }

    public function exportSupervisi(Request $request)
    {
        $tahunAjaranId = $request->query('tahun_ajaran_id') ?? $this->getActiveTahunAjaranId($request);

        $query = Supervisi::with(['supervisor:id,nama', 'guru:id,nama', 'mapel:id,nama_mapel']);
        if ($tahunAjaranId) {
            $query->where('tahun_ajaran_id', $tahunAjaranId);
        }

        $data = $query->orderBy('tanggal', 'desc')->get();

        $columns = [
            ['label' => 'Guru', 'key' => 'guru'],
            ['label' => 'Mata Pelajaran', 'key' => 'mapel'],
            ['label' => 'Kelas', 'key' => 'kelas'],
            ['label' => 'Tanggal', 'key' => 'tanggal', 'align' => 'text-center'],
            ['label' => 'Supervisor', 'key' => 'supervisor'],
            ['label' => 'Status', 'key' => 'status', 'align' => 'text-center'],
        ];

        $rows = $data->map(fn($s) => [
            'guru' => $s->guru->nama ?? '-',
            'mapel' => $s->mapel->nama_mapel ?? '-',
            'kelas' => $s->kelas ?? '-',
            'tanggal' => PrintService::formatDate($s->tanggal, 'd/m/Y'),
            'supervisor' => $s->supervisor->nama ?? '-',
            'status' => ucfirst($s->status ?? '-'),
        ])->toArray();

        $pdfData = $this->getPdfData('Data Supervisi', 'Data supervisi akademik', $columns, $rows, 'landscape');
        return $this->downloadPdf($pdfData, 'data-supervisi.pdf');
    }

    public function exportAlumni(Request $request)
    {
        $tahunAjaranId = $request->query('tahun_ajaran_id') ?? $this->getActiveTahunAjaranId($request);

        // Get alumni data (students with 'Alumni' status)
        $siswa = Siswa::with('kelas')
            ->where('status', 'Alumni')
            ->orderBy('nama')
            ->get();

        $columns = [
            ['label' => 'Nama', 'key' => 'nama'],
            ['label' => 'NIS', 'key' => 'nis'],
            ['label' => 'NISN', 'key' => 'nisn'],
            ['label' => 'JK', 'key' => 'jk_label', 'align' => 'text-center'],
            ['label' => 'Kelas Terakhir', 'key' => 'kelas'],
        ];

        $rows = $siswa->map(fn($s) => [
            'nama' => $s->nama,
            'nis' => $s->nis ?? '-',
            'nisn' => $s->nisn ?? '-',
            'jk_label' => ($s->jenis_kelamin ?? 'L') === 'L' ? 'L' : 'P',
            'kelas' => $s->kelas->nama_kelas ?? '-',
        ])->toArray();

        $pdfData = $this->getPdfData('Data Alumni', 'Data alumni peserta didik', $columns, $rows);
        return $this->downloadPdf($pdfData, 'data-alumni.pdf');
    }

    public function exportSuratKeluar(Request $request)
    {
        $query = SuratKeluar::with('user:id,name');

        if ($request->filled('tahun_ajaran_id')) {
            $query->where('tahun_ajaran_id', $request->tahun_ajaran_id);
        }

        $data = $query->orderBy('tanggal', 'desc')->get();

        $columns = [
            ['label' => 'Nomor Surat', 'key' => 'nomor_surat'],
            ['label' => 'Tanggal', 'key' => 'tanggal', 'align' => 'text-center'],
            ['label' => 'Tujuan', 'key' => 'tujuan'],
            ['label' => 'Perihal', 'key' => 'perihal'],
            ['label' => 'Jenis', 'key' => 'jenis'],
        ];

        $rows = $data->map(fn($s) => [
            'nomor_surat' => $s->nomor_surat ?? '-',
            'tanggal' => PrintService::formatDate($s->tanggal, 'd/m/Y'),
            'tujuan' => $s->tujuan ?? '-',
            'perihal' => $s->perihal ?? '-',
            'jenis' => $s->jenis_surat_label ?? ($s->jenis_surat ?? '-'),
        ])->toArray();

        $pdfData = $this->getPdfData('Surat Keluar', 'Data surat keluar', $columns, $rows, 'landscape');
        return $this->downloadPdf($pdfData, 'surat-keluar.pdf');
    }

    public function exportSuratMasuk(Request $request)
    {
        $query = SuratMasuk::with('user:id,name');

        if ($request->filled('tahun_ajaran_id')) {
            $query->where('tahun_ajaran_id', $request->tahun_ajaran_id);
        }

        $data = $query->orderBy('tanggal', 'desc')->get();

        $columns = [
            ['label' => 'Nomor Surat', 'key' => 'nomor_surat'],
            ['label' => 'Tanggal', 'key' => 'tanggal', 'align' => 'text-center'],
            ['label' => 'Pengirim', 'key' => 'pengirim'],
            ['label' => 'Perihal', 'key' => 'perihal'],
            ['label' => 'Tanggal Diterima', 'key' => 'tanggal_diterima', 'align' => 'text-center'],
        ];

        $rows = $data->map(fn($s) => [
            'nomor_surat' => $s->nomor_surat ?? '-',
            'tanggal' => PrintService::formatDate($s->tanggal, 'd/m/Y'),
            'pengirim' => $s->pengirim ?? '-',
            'perihal' => $s->perihal ?? '-',
            'tanggal_diterima' => $s->tanggal_diterima ? PrintService::formatDate($s->tanggal_diterima, 'd/m/Y') : '-',
        ])->toArray();

        $pdfData = $this->getPdfData('Surat Masuk', 'Data surat masuk', $columns, $rows, 'landscape');
        return $this->downloadPdf($pdfData, 'surat-masuk.pdf');
    }

    public function exportAbsensiSiswa(Request $request)
    {
        $query = \App\Models\AbsensiSiswa::with(['siswa:id,nama,nis', 'kelas:id,nama_kelas', 'mapel:id,nama_mapel']);

        if ($request->filled('kelas_id')) {
            $query->where('kelas_id', $request->kelas_id);
        }
        if ($request->filled('tanggal')) {
            $query->whereDate('tanggal', $request->tanggal);
        }

        $data = $query->orderBy('tanggal', 'desc')->limit(500)->get();

        $columns = [
            ['label' => 'Tanggal', 'key' => 'tanggal', 'align' => 'text-center'],
            ['label' => 'NIS', 'key' => 'nis'],
            ['label' => 'Nama Siswa', 'key' => 'nama'],
            ['label' => 'Kelas', 'key' => 'kelas'],
            ['label' => 'Mapel', 'key' => 'mapel'],
            ['label' => 'Status', 'key' => 'status', 'align' => 'text-center'],
        ];

        $rows = $data->map(fn($a) => [
            'tanggal' => PrintService::formatDate($a->tanggal, 'd/m/Y'),
            'nis' => $a->siswa->nis ?? '-',
            'nama' => $a->siswa->nama ?? '-',
            'kelas' => $a->kelas->nama_kelas ?? '-',
            'mapel' => $a->mapel->nama_mapel ?? '-',
            'status' => ucfirst($a->status ?? '-'),
        ])->toArray();

        $pdfData = $this->getPdfData('Absensi Siswa', 'Data absensi peserta didik', $columns, $rows, 'landscape');
        return $this->downloadPdf($pdfData, 'absensi-siswa.pdf');
    }

    // ============================================================
    // TRANSAKSI EXPORTS
    // ============================================================

    public function exportPemasukan(Request $request)
    {
        $tahunAjaranId = $request->user()->tahun_ajaran_id;

        $query = Pemasukan::where('tahun_ajaran_id', $tahunAjaranId)
            ->with(['admin:id,name', 'sumber:id,nama']);

        if ($request->filled('bulan'))
            $query->whereMonth('tanggal', $request->bulan);
        if ($request->filled('tahun'))
            $query->whereYear('tanggal', $request->tahun);

        $data = $query->orderBy('tanggal', 'desc')->get();

        $columns = [
            ['label' => 'Tanggal', 'key' => 'tanggal', 'align' => 'text-center'],
            ['label' => 'Sumber', 'key' => 'sumber'],
            ['label' => 'Nominal', 'key' => 'nominal', 'align' => 'text-right'],
            ['label' => 'Keterangan', 'key' => 'keterangan'],
            ['label' => 'Admin', 'key' => 'admin'],
        ];

        $rows = $data->map(fn($p) => [
            'tanggal' => $p->tanggal ? $p->tanggal->format('d/m/Y') : '-',
            'sumber' => $p->sumber->nama ?? '-',
            'nominal' => 'Rp ' . number_format($p->nominal, 0, ',', '.'),
            'keterangan' => $p->keterangan ?? '-',
            'admin' => $p->admin->name ?? '-',
        ])->toArray();

        $pdfData = $this->getPdfData('Laporan Pemasukan', 'Data pemasukan keuangan', $columns, $rows);
        return $this->downloadPdf($pdfData, 'laporan-pemasukan.pdf');
    }

    public function exportPengeluaran(Request $request)
    {
        $tahunAjaranId = $request->user()->tahun_ajaran_id;

        $query = Pengeluaran::where('tahun_ajaran_id', $tahunAjaranId)
            ->with(['admin:id,name', 'kategori:id,nama']);

        if ($request->filled('bulan'))
            $query->whereMonth('tanggal', $request->bulan);
        if ($request->filled('tahun'))
            $query->whereYear('tanggal', $request->tahun);

        $data = $query->orderBy('tanggal', 'desc')->get();

        $columns = [
            ['label' => 'Tanggal', 'key' => 'tanggal', 'align' => 'text-center'],
            ['label' => 'Kategori', 'key' => 'kategori'],
            ['label' => 'Nominal', 'key' => 'nominal', 'align' => 'text-right'],
            ['label' => 'Keterangan', 'key' => 'keterangan'],
            ['label' => 'Admin', 'key' => 'admin'],
        ];

        $rows = $data->map(fn($p) => [
            'tanggal' => $p->tanggal ? $p->tanggal->format('d/m/Y') : '-',
            'kategori' => $p->kategori->nama ?? '-',
            'nominal' => 'Rp ' . number_format($p->nominal, 0, ',', '.'),
            'keterangan' => $p->keterangan ?? '-',
            'admin' => $p->admin->name ?? '-',
        ])->toArray();

        $pdfData = $this->getPdfData('Laporan Pengeluaran', 'Data pengeluaran keuangan', $columns, $rows);
        return $this->downloadPdf($pdfData, 'laporan-pengeluaran.pdf');
    }

    public function exportTagihan(Request $request)
    {
        $tahunAjaranId = $request->user()->tahun_ajaran_id;

        $tagihan = Tagihan::where('tahun_ajaran_id', $tahunAjaranId)
            ->withCount('tagihanSiswa')
            ->orderBy('created_at', 'desc')
            ->get();

        $columns = [
            ['label' => 'Nama Tagihan', 'key' => 'nama'],
            ['label' => 'Nominal', 'key' => 'nominal', 'align' => 'text-right'],
            ['label' => 'Jatuh Tempo', 'key' => 'jatuh_tempo', 'align' => 'text-center'],
            ['label' => 'Jumlah Siswa', 'key' => 'jumlah_siswa', 'align' => 'text-center'],
        ];

        $rows = $tagihan->map(fn($t) => [
            'nama' => $t->nama,
            'nominal' => 'Rp ' . number_format($t->nominal, 0, ',', '.'),
            'jatuh_tempo' => $t->tanggal_jatuh_tempo ? $t->tanggal_jatuh_tempo->format('d/m/Y') : '-',
            'jumlah_siswa' => $t->tagihan_siswa_count ?? 0,
        ])->toArray();

        $pdfData = $this->getPdfData('Data Tagihan', 'Data tagihan pembayaran', $columns, $rows);
        return $this->downloadPdf($pdfData, 'data-tagihan.pdf');
    }
}
