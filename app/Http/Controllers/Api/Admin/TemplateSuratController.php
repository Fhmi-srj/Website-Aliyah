<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Guru;
use App\Models\Siswa;
use App\Services\PrintService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use PhpOffice\PhpWord\PhpWord;
use PhpOffice\PhpWord\IOFactory;
use PhpOffice\PhpWord\SimpleType\Jc;
use PhpOffice\PhpWord\SimpleType\TblWidth;
use PhpOffice\PhpWord\Style\Cell;

class TemplateSuratController extends Controller
{
    /**
     * Get guru & siswa data for multi-select dropdowns.
     */
    public function getData(Request $request): JsonResponse
    {
        $guru = Guru::where('status', 'Aktif')
            ->orderBy('nama')
            ->get(['id', 'nama', 'nip', 'jabatan']);

        $siswa = Siswa::with([
            'kelas' => function ($q) {
                $q->select('id', 'nama_kelas');
            }
        ])
            ->where('status', 'Aktif')
            ->orderBy('nama')
            ->get(['id', 'nama', 'nis', 'nisn', 'kelas_id']);

        return response()->json([
            'success' => true,
            'guru' => $guru,
            'siswa' => $siswa->map(function ($s) {
                return [
                    'id' => $s->id,
                    'nama' => $s->nama,
                    'nis' => $s->nis,
                    'nisn' => $s->nisn,
                    'kelas' => $s->kelas->nama_kelas ?? '-',
                ];
            }),
        ]);
    }

    /**
     * Generate & download .docx for the selected template.
     */
    public function generate(Request $request)
    {
        $request->validate([
            'jenis' => 'required|in:surat_keterangan_aktif,sppd',
            'data' => 'required|array',
        ]);

        $jenis = $request->input('jenis');
        $data = $request->input('data');
        $nomorSurat = $data['nomor_surat'] ?? null;

        if ($jenis === 'surat_keterangan_aktif') {
            $phpWord = $this->buildSuratKeteranganAktif($data, $nomorSurat);
        } else {
            $phpWord = $this->buildSPPD($data, $nomorSurat);
        }

        return $this->downloadDocx($phpWord, $jenis === 'surat_keterangan_aktif' ? 'Surat_Keterangan_Aktif' : 'SPPD');
    }

    /**
     * Generate .docx and save to storage. Returns the relative file path.
     * Called by SuratKeluarController when jenis is 007/008/009.
     */
    public function generateAndSave(string $jenis, array $data, string $nomorSurat): string
    {
        if ($jenis === '007') {
            $data['tipe'] = 'guru';
            $phpWord = $this->buildSuratKeteranganAktif($data, $nomorSurat);
            $prefix = 'SK_Aktif_Guru';
        } elseif ($jenis === '008') {
            $data['tipe'] = 'siswa';
            $phpWord = $this->buildSuratKeteranganAktif($data, $nomorSurat);
            $prefix = 'SK_Aktif_Siswa';
        } else {
            $phpWord = $this->buildSPPD($data, $nomorSurat);
            $prefix = 'SPPD';
        }

        $filename = $prefix . '_' . date('Y-m-d_His') . '.docx';
        $relativePath = 'surat-keluar/' . $filename;
        $fullPath = storage_path('app/public/' . $relativePath);

        // Ensure directory exists
        if (!is_dir(dirname($fullPath))) {
            mkdir(dirname($fullPath), 0755, true);
        }

        $writer = IOFactory::createWriter($phpWord, 'Word2007');
        $writer->save($fullPath);

        return $relativePath;
    }

    /**
     * Build Surat Keterangan Aktif PhpWord object (Guru or Siswa).
     */
    private function buildSuratKeteranganAktif(array $data, ?string $nomorSurat = null): PhpWord
    {
        $tipe = $data['tipe'] ?? 'guru';
        $orangIds = $data['orang_ids'] ?? [];
        $keperluan = $data['keperluan'] ?? '';

        if (empty($orangIds)) {
            return new PhpWord(); // Return empty doc as fallback
        }

        // Fetch people data
        if ($tipe === 'guru') {
            $orang = Guru::whereIn('id', $orangIds)->get();
        } else {
            $orang = Siswa::with('kelas')->whereIn('id', $orangIds)->get();
        }

        $kepala = PrintService::getKepalaSekolah();
        $namaSekolah = PrintService::getSchoolName();

        $phpWord = new PhpWord();
        $phpWord->setDefaultFontName('Times New Roman');
        $phpWord->setDefaultFontSize(12);

        $section = $phpWord->addSection([
            'marginTop' => 600,
            'marginBottom' => 600,
            'marginLeft' => 1200,
            'marginRight' => 1000,
        ]);

        // Kop Surat Image
        $this->addKopSurat($section);

        // Separator line
        $section->addText('', [], ['borderBottomSize' => 6, 'borderBottomColor' => '000000', 'spaceAfter' => 100]);

        // Title
        $section->addText('SURAT KETERANGAN', ['bold' => true, 'size' => 13, 'underline' => 'single'], ['alignment' => Jc::CENTER, 'spaceAfter' => 0]);
        $nomorDisplay = $nomorSurat ?? '.........../............/..............';
        $section->addText('Nomor: ' . $nomorDisplay, ['size' => 11, 'italic' => true], ['alignment' => Jc::CENTER, 'spaceAfter' => 200]);

        // Opening paragraph
        $section->addText('Yang bertanda tangan di bawah ini, Kepala ' . $namaSekolah . ', menerangkan bahwa:', ['size' => 12], ['spaceAfter' => 100]);

        // Table of people
        $tableStyle = [
            'borderSize' => 6,
            'borderColor' => '000000',
            'cellMargin' => 50,
        ];
        $phpWord->addTableStyle('peopleTable', $tableStyle);
        $table = $section->addTable('peopleTable');

        $headerStyle = ['bold' => true, 'size' => 11];
        $cellStyle = ['size' => 11];
        $headerCellBg = ['bgColor' => 'D9E2F3'];

        // Table header
        $table->addRow();
        $table->addCell(600, $headerCellBg)->addText('No', $headerStyle, ['alignment' => Jc::CENTER]);
        $table->addCell(3500, $headerCellBg)->addText('Nama', $headerStyle);

        if ($tipe === 'guru') {
            $table->addCell(2500, $headerCellBg)->addText('NIP', $headerStyle);
            $table->addCell(2500, $headerCellBg)->addText('Jabatan', $headerStyle);
        } else {
            $table->addCell(2000, $headerCellBg)->addText('NISN', $headerStyle);
            $table->addCell(3000, $headerCellBg)->addText('Kelas', $headerStyle);
        }

        // Table rows
        foreach ($orang as $idx => $person) {
            $table->addRow();
            $table->addCell(600)->addText(($idx + 1) . '.', $cellStyle, ['alignment' => Jc::CENTER]);
            $table->addCell(3500)->addText($person->nama, $cellStyle);

            if ($tipe === 'guru') {
                $table->addCell(2500)->addText($person->nip ?? '-', $cellStyle);
                $table->addCell(2500)->addText($person->jabatan ?? '-', $cellStyle);
            } else {
                $table->addCell(2000)->addText($person->nisn ?? '-', $cellStyle);
                $table->addCell(3000)->addText($person->kelas->nama_kelas ?? '-', $cellStyle);
            }
        }

        $section->addTextBreak(1);

        $jenisOrang = $tipe === 'guru' ? 'guru/tenaga pendidik' : 'siswa/siswi';
        $section->addText(
            'Adalah benar ' . $jenisOrang . ' aktif di ' . $namaSekolah . '.',
            ['size' => 12],
            ['spaceAfter' => 100]
        );

        if ($keperluan) {
            $section->addText(
                'Surat keterangan ini dibuat untuk keperluan ' . $keperluan . '.',
                ['size' => 12],
                ['spaceAfter' => 100]
            );
        }

        $section->addText(
            'Demikian surat keterangan ini dibuat dengan sesungguhnya agar dapat dipergunakan sebagaimana mestinya.',
            ['size' => 12],
            ['spaceAfter' => 200]
        );

        // Signature block - right aligned with QR
        $this->addSignatureBlock($section, $kepala, $namaSekolah, $nomorSurat);

        return $phpWord;
    }

    /**
     * Build SPPD PhpWord object.
     */
    private function buildSPPD(array $data, ?string $nomorSurat = null)
    {
        $guruIds = $data['guru_ids'] ?? $data['orang_ids'] ?? [];
        $tujuan = $data['tujuan'] ?? '';
        $kendaraan = $data['kendaraan'] ?? '';
        $keperluan = $data['keperluan'] ?? '';
        $tanggal = $data['tanggal'] ?? now()->toDateString();

        if (empty($guruIds)) {
            return new PhpWord(); // Return empty doc as fallback
        }

        $guruList = Guru::whereIn('id', $guruIds)->get();
        $kepala = PrintService::getKepalaSekolah();
        $namaSekolah = PrintService::getSchoolName();
        $tanggalFormatted = PrintService::formatDate($tanggal, 'l, d F Y');

        $phpWord = new PhpWord();
        $phpWord->setDefaultFontName('Times New Roman');
        $phpWord->setDefaultFontSize(11);

        $section = $phpWord->addSection([
            'marginTop' => 400,
            'marginBottom' => 400,
            'marginLeft' => 1100,
            'marginRight' => 900,
        ]);

        // Kop Surat
        $this->addKopSurat($section);

        // Title
        $section->addText('SURAT PERINTAH PERJALANAN DINAS', ['bold' => true, 'size' => 12, 'underline' => 'single'], ['alignment' => Jc::CENTER, 'spaceAfter' => 0]);
        $nomorDisplay = $nomorSurat ?? '.........../............/.............';
        $section->addText('Nomor: ' . $nomorDisplay, ['size' => 10, 'italic' => true, 'bold' => true], ['alignment' => Jc::CENTER, 'spaceAfter' => 80]);

        // Empty paragraphs before opening
        $section->addText('', [], ['spaceAfter' => 100]);
        $section->addText('', [], ['spaceAfter' => 100]);

        // Opening: "DIPERINTAHKAN KEPADA :"
        $section->addText('DIPERINTAHKAN KEPADA :', ['bold' => true], ['spaceAfter' => 100]);

        // Another empty paragraph
        $section->addText('', [], ['spaceAfter' => 100]);

        // Guru table (with indent 456 twips)
        $noBorderCell = ['borderSize' => 0, 'borderColor' => 'FFFFFF'];
        $tableStyle = ['borderSize' => 4, 'borderColor' => '000000', 'cellMargin' => 30, 'indent' => new \PhpOffice\PhpWord\ComplexType\TblWidth(456, 'dxa')];
        $phpWord->addTableStyle('guruTable', $tableStyle);
        $table = $section->addTable('guruTable');

        $headerFont = ['bold' => true, 'size' => 10];
        $headerPara = ['alignment' => Jc::CENTER, 'spaceAfter' => 0, 'lineHeight' => 1.5];
        $headerBg = ['bgColor' => 'D9E2F3'];

        $table->addRow();
        $table->addCell(3074, $headerBg)->addText('NAMA', $headerFont, $headerPara);
        $table->addCell(3000, $headerBg)->addText('JABATAN', $headerFont, $headerPara);
        $table->addCell(2005, $headerBg)->addText('NIP', $headerFont, $headerPara);

        foreach ($guruList as $guru) {
            $table->addRow();
            $table->addCell(3074)->addText($guru->nama, ['size' => 12], ['spaceAfter' => 0, 'lineHeight' => 1.5]);
            $table->addCell(3000)->addText($guru->jabatan ?? '-', ['size' => 10], ['spaceAfter' => 0, 'lineHeight' => 1.5]);
            $table->addCell(2005)->addText($guru->nip ?? '-', ['size' => 10], ['spaceAfter' => 0, 'lineHeight' => 1.5]);
        }

        // Space after guru table
        $section->addText('', [], ['spaceBefore' => 60, 'spaceAfter' => 20]);

        // Detail fields - borderless (white border), indented 446 twips
        $noBorder = ['borderSize' => 0, 'borderColor' => 'FFFFFF'];
        $phpWord->addTableStyle('detailTable', [
            'borderSize' => 0,
            'borderColor' => 'FFFFFF',
            'cellMargin' => 20,
            'indent' => new \PhpOffice\PhpWord\ComplexType\TblWidth(446, 'dxa'),
        ]);
        $detailTable = $section->addTable('detailTable');

        $labelStyle = ['bold' => true];
        $valueStyle = [];
        $detailPara = ['spaceAfter' => 0, 'lineHeight' => 1.5];

        $details = [
            ['Tanggal', $tanggalFormatted],
            ['Tujuan', $tujuan],
            ['Kendaraan', $kendaraan],
            ['Untuk Keperluan', $keperluan],
        ];

        foreach ($details as $detail) {
            $detailTable->addRow();
            $detailTable->addCell(2074, $noBorder)->addText($detail[0], $labelStyle, $detailPara);
            $detailTable->addCell(300, $noBorder)->addText(':', $labelStyle, $detailPara);
            $detailTable->addCell(6200, $noBorder)->addText($detail[1], $valueStyle, $detailPara);
            $detailTable->addCell(925, $noBorder); // Empty trailing column
        }

        // Space after detail
        $section->addText('', [], ['spaceBefore' => 60, 'spaceAfter' => 20]);

        // Closing text (12pt, justified)
        $section->addText(
            'Demikian surat tugas ini kami buat agar dapat dilaksanakan dengan sebaik-baiknya serta penuh rasa tanggung jawab.',
            ['size' => 12],
            ['alignment' => Jc::BOTH]
        );

        // Signature block with QR code
        $this->addSignatureBlock($section, $kepala, $namaSekolah, $nomorSurat, $tanggalFormatted);

        // Empty paragraphs before pejabat section
        $section->addText('', [], ['spaceBefore' => 80, 'spaceAfter' => 40]);
        $section->addText('', [], ['spaceBefore' => 80, 'spaceAfter' => 40]);

        // Pejabat table heading (12pt)
        $section->addText('MENGETAHUI PEJABAT SETEMPAT', ['bold' => true, 'size' => 12], ['alignment' => Jc::CENTER, 'spaceAfter' => 40, 'spaceBefore' => 80]);

        $phpWord->addTableStyle('pejabatTable', ['borderSize' => 4, 'borderColor' => '000000', 'cellMargin' => 30, 'indent' => new \PhpOffice\PhpWord\ComplexType\TblWidth(30, 'dxa')]);
        $pejabatTable = $section->addTable('pejabatTable');

        $pjHeaderFont = ['bold' => true, 'size' => 12];
        $pjHeaderPara = ['alignment' => Jc::CENTER];

        $pejabatTable->addRow();
        $pejabatTable->addCell(3261, $headerBg)->addText('Datang', $pjHeaderFont, $pjHeaderPara);
        $pejabatTable->addCell(3260, $headerBg)->addText('Tempat / Pejabat yang dituju', $pjHeaderFont, $pjHeaderPara);
        $pejabatTable->addCell(3260, $headerBg)->addText('Pulang', $pjHeaderFont, $pjHeaderPara);

        $pejabatTable->addRow(1200);
        $cell1 = $pejabatTable->addCell(3261, ['valign' => 'top']);
        $cell1->addText('Tanggal :', ['size' => 12]);
        $cell1->addText('Nama :', ['size' => 12]);

        $cell2 = $pejabatTable->addCell(3260, ['valign' => 'center']);
        $cell2->addText('Tanda Tangan &amp; Stempel', ['size' => 12, 'color' => '999999', 'italic' => true], ['alignment' => Jc::CENTER]);

        $cell3 = $pejabatTable->addCell(3260, ['valign' => 'top']);
        $cell3->addText('Tanggal :', ['size' => 12]);
        $cell3->addText('Nama :', ['size' => 12]);

        return $phpWord;
    }

    /**
     * Add Kop Surat image to a section.
     */
    private function addKopSurat($section)
    {
        $kopPath = \App\Models\AppSetting::getValue('kop_image');
        if ($kopPath) {
            $fullPath = storage_path('app/public/' . $kopPath);
            if (file_exists($fullPath)) {
                $section->addImage($fullPath, [
                    'width' => 500,
                    'alignment' => Jc::CENTER,
                    'wrappingStyle' => 'inline',
                ]);
                return;
            }
        }
        // Fallback: text header
        $namaSekolah = PrintService::getSchoolName();
        $section->addText($namaSekolah, ['bold' => true, 'size' => 16], ['alignment' => Jc::CENTER]);
    }

    /**
     * Add signature block (right-aligned) with optional QR code.
     */
    private function addSignatureBlock($section, $kepala, $namaSekolah, ?string $nomorSurat = null, ?string $tanggalFormatted = null)
    {
        $now = $tanggalFormatted ?? PrintService::formatDate(now(), 'l, d F Y');
        $noBorder = ['borderSize' => 0, 'borderColor' => 'FFFFFF'];

        // Use a table with invisible borders for right-alignment
        $sigTable = $section->addTable(['borderSize' => 0, 'borderColor' => 'FFFFFF']);
        $sigTable->addRow();
        $sigTable->addCell(4500, $noBorder); // Empty left cell
        $rightCell = $sigTable->addCell(4500, $noBorder);

        // Single-line: "Pekalongan Jumat, 13 Februari 2026"
        $rightCell->addText('Pekalongan ' . $now, ['size' => 12]);

        // Kepala Sekolah label
        $rightCell->addText('Kepala Sekolah,', ['size' => 12, 'bold' => true], ['alignment' => Jc::CENTER, 'spaceBefore' => 40]);

        // Generate & embed QR code using existing verification system
        if ($nomorSurat) {
            try {
                $qrData = PrintService::createVerification(
                    'SPPD',
                    'Surat Perintah Perjalanan Dinas ' . $nomorSurat,
                    now()->toDateString(),
                    ['nomor_surat' => $nomorSurat, 'kepala' => $kepala['nama'] ?? '-']
                );
                // createVerification returns SVG data URI, we need a PNG file for PhpWord
                // Use our GD-based generator with the verification URL
                $verificationUrl = url('/verify/' . $qrData['verification']->id);
                $qrTempFile = $this->generateQrPng($verificationUrl);
                if ($qrTempFile) {
                    $rightCell->addImage($qrTempFile, [
                        'width' => 60,
                        'height' => 60,
                        'alignment' => Jc::CENTER,
                    ]);
                } else {
                    $rightCell->addTextBreak(2);
                }
            } catch (\Exception $e) {
                \Log::warning('QR code generation failed: ' . $e->getMessage());
                $rightCell->addTextBreak(2);
            }
        } else {
            $rightCell->addTextBreak(2);
        }

        $rightCell->addText($kepala['nama'] ?? '_________________', ['size' => 12, 'bold' => true, 'underline' => 'single'], ['alignment' => Jc::CENTER, 'spaceAfter' => 0]);
        if ($kepala['nip'] ?? null) {
            $rightCell->addText('NIP. ' . $kepala['nip'], ['size' => 12], ['alignment' => Jc::CENTER, 'spaceAfter' => 0]);
        }
    }

    /**
     * Generate QR code as PNG file using BaconQrCode + GD (no imagick needed).
     * Returns the temp file path, or null on failure.
     */
    private function generateQrPng(string $data, int $size = 200): ?string
    {
        $qrCode = \BaconQrCode\Encoder\Encoder::encode(
            $data,
            \BaconQrCode\Common\ErrorCorrectionLevel::L(),
            'UTF-8'
        );
        $matrix = $qrCode->getMatrix();
        $matrixWidth = $matrix->getWidth();
        $matrixHeight = $matrix->getHeight();

        $scale = max(1, intdiv($size, $matrixWidth));
        $imgWidth = $matrixWidth * $scale;
        $imgHeight = $matrixHeight * $scale;

        $img = imagecreatetruecolor($imgWidth, $imgHeight);
        $white = imagecolorallocate($img, 255, 255, 255);
        $black = imagecolorallocate($img, 0, 0, 0);
        imagefill($img, 0, 0, $white);

        for ($y = 0; $y < $matrixHeight; $y++) {
            for ($x = 0; $x < $matrixWidth; $x++) {
                if ($matrix->get($x, $y) === 1) {
                    imagefilledrectangle(
                        $img,
                        $x * $scale,
                        $y * $scale,
                        ($x + 1) * $scale - 1,
                        ($y + 1) * $scale - 1,
                        $black
                    );
                }
            }
        }

        $tmpFile = tempnam(sys_get_temp_dir(), 'qr_') . '.png';
        imagepng($img, $tmpFile);
        imagedestroy($img);

        return $tmpFile;
    }

    /**
     * Generate and return the .docx as a download response.
     */
    private function downloadDocx(PhpWord $phpWord, string $filename)
    {
        $tempFile = tempnam(sys_get_temp_dir(), 'surat_') . '.docx';
        $writer = IOFactory::createWriter($phpWord, 'Word2007');
        $writer->save($tempFile);

        return response()->download($tempFile, $filename . '_' . date('Y-m-d_His') . '.docx', [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ])->deleteFileAfterSend(true);
    }
}
