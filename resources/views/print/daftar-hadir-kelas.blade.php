@extends('print.layout')

@section('title', 'Daftar Hadir Peserta Didik')

@section('styles')
    <style>
        @page {
            size: A4 landscape;
            margin: 0.8cm;
        }

        .print-container {
            max-width: 29.7cm;
            font-size: 9pt;
        }

        /* Compact institutional header */
        .institution-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 6px;
            padding-bottom: 6px;
            border-bottom: 2px solid #8B0000;
        }

        .institution-logo {
            width: 45px;
            height: 45px;
            object-fit: contain;
            flex-shrink: 0;
        }

        .institution-info {
            flex: 1;
        }

        .institution-name {
            font-size: 12pt;
            font-weight: bold;
            color: #8B0000;
            margin: 0;
            line-height: 1.2;
        }

        .institution-motto {
            font-size: 7.5pt;
            color: #555;
            font-style: italic;
            margin: 0;
        }

        .institution-address {
            font-size: 7pt;
            color: #777;
            margin: 0;
        }

        .doc-title {
            font-size: 13pt;
            margin-bottom: 5px;
        }

        .doc-subtitle {
            text-align: center;
            font-size: 11pt;
            margin-bottom: 10px;
        }

        /* Compact info line */
        .info-line {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 9pt;
            border-bottom: 1px solid #ddd;
            padding-bottom: 4px;
        }

        .info-item {
            display: flex;
            gap: 4px;
        }

        .info-item strong {
            font-weight: bold;
        }

        /* Attendance Table */
        .attendance-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
            font-size: 7.5pt;
        }

        .attendance-table th,
        .attendance-table td {
            border: 1px solid #000;
            padding: 2px 1px;
            text-align: center;
            vertical-align: middle;
        }

        .attendance-table th {
            background-color: #f0f0f0;
            font-weight: bold;
            font-size: 7pt;
        }

        .attendance-table .col-no {
            width: 22px;
        }

        .attendance-table .col-nis {
            width: 55px;
        }

        .attendance-table .col-nama {
            width: 130px;
            text-align: left;
            padding-left: 4px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 130px;
        }

        .attendance-table .col-day {
            width: 18px;
            min-width: 18px;
        }

        .attendance-table .col-total {
            width: 18px;
            font-weight: bold;
        }

        /* Status colors */
        .status-h {
            color: #16a34a;
        }

        .status-s {
            color: #d97706;
            font-weight: bold;
        }

        .status-i {
            color: #2563eb;
            font-weight: bold;
        }

        .status-a {
            color: #dc2626;
            font-weight: bold;
        }

        .col-holiday {
            background-color: #e8e8e8 !important;
        }

        .col-holiday-header {
            background-color: #d4d4d4 !important;
            color: #888 !important;
        }

        .col-holiday-merged {
            background-color: #e8e8e8 !important;
            writing-mode: vertical-rl;
            text-orientation: mixed;
            font-size: 6pt;
            color: #999;
            text-align: center;
            vertical-align: middle;
            white-space: nowrap;
            padding: 3px 0;
            letter-spacing: 0.5px;
        }

        /* Signature */
        .signature-section {
            margin-top: 20px;
            page-break-inside: avoid;
        }

        .signature-row {
            display: flex;
            justify-content: space-between;
            margin: 0 2%;
        }

        .signature-box {
            text-align: center;
            width: 35%;
        }

        .signature-space {
            min-height: 10px;
        }

        .signature-name {
            font-weight: bold;
            text-decoration: underline;
        }

        .signature-nip {
            font-size: 8pt;
        }

        .qr-code-img {
            width: 70px;
            height: 70px;
            margin: 3px auto;
            display: block;
        }

        .legend-section {
            margin-top: 8px;
            font-size: 8pt;
        }

        .legend-section span {
            margin-right: 15px;
        }
    </style>
@endsection

@section('content')
    @php
        $logoLembaga = \App\Models\AppSetting::getValue('logo_lembaga');
        $namaLembaga = \App\Models\AppSetting::getValue('nama_lembaga') ?? 'Madrasah Aliyah';
        $motoLembaga = \App\Models\AppSetting::getValue('moto_lembaga');
        $alamatLembaga = \App\Models\AppSetting::getValue('alamat_lembaga');
        $logoUrl = $logoLembaga ? asset('storage/' . $logoLembaga) : null;
    @endphp

    <div class="institution-header">
        @if($logoUrl)
            <img src="{{ $logoUrl }}" alt="Logo" class="institution-logo">
        @endif
        <div class="institution-info">
            <p class="institution-name">{{ strtoupper($namaLembaga) }}</p>
            @if($motoLembaga)
                <p class="institution-motto">"{{ $motoLembaga }}"</p>
            @endif
            @if($alamatLembaga)
                <p class="institution-address">{{ $alamatLembaga }}</p>
            @endif
        </div>
    </div>

    <h1 class="doc-title">DAFTAR HADIR PESERTA DIDIK</h1>
    <p class="doc-subtitle">TAHUN PELAJARAN {{ $tahunAjaran }}</p>

    {{-- Compact single-line info --}}
    <div class="info-line">
        <div class="info-item">
            <strong>Kelas:</strong>
            <span>{{ $kelas->nama_kelas ?? '-' }}</span>
        </div>
        <div class="info-item">
            <strong>Bulan:</strong>
            <span>{{ $bulanNama }} {{ $tahun }}</span>
        </div>
        <div class="info-item">
            <strong>Wali Kelas:</strong>
            <span>{{ $kelas->waliKelas->nama ?? '-' }}</span>
        </div>
    </div>

    <table class="attendance-table">
        @php
            $dayInitials = [0 => 'Mg', 1 => 'Sn', 2 => 'Sl', 3 => 'Rb', 4 => 'Km', 5 => 'Jm', 6 => 'Sb'];
            $bulanMap = ['Januari' => 1, 'Februari' => 2, 'Maret' => 3, 'April' => 4, 'Mei' => 5, 'Juni' => 6, 'Juli' => 7, 'Agustus' => 8, 'September' => 9, 'Oktober' => 10, 'November' => 11, 'Desember' => 12];
        @endphp
        <thead>
            <tr>
                <th rowspan="3" class="col-no">NO</th>
                <th rowspan="3" class="col-nis">NIS</th>
                <th rowspan="3" class="col-nama">NAMA</th>
                <th colspan="{{ $daysInMonth }}" style="text-align: center;">TANGGAL</th>
                <th colspan="4" style="text-align: center;">JUMLAH</th>
            </tr>
            <tr>
                @for($d = 1; $d <= $daysInMonth; $d++)
                    <th class="col-day {{ isset($holidayInfo[$d]) ? 'col-holiday-header' : '' }}">{{ $d }}</th>
                @endfor
                <th rowspan="2" class="col-total">H</th>
                <th rowspan="2" class="col-total">S</th>
                <th rowspan="2" class="col-total">I</th>
                <th rowspan="2" class="col-total">A</th>
            </tr>
            <tr>
                @for($d = 1; $d <= $daysInMonth; $d++)
                    @php $dow = \Carbon\Carbon::create($tahun, $bulanMap[$bulanNama] ?? 1, $d)->dayOfWeek; @endphp
                    <th class="col-day {{ isset($holidayInfo[$d]) ? 'col-holiday-header' : '' }}"
                        style="font-size: 5.5pt; color: {{ $dow == 5 ? '#dc2626' : '#666' }};">
                        {{ $dayInitials[$dow] }}
                    </th>
                @endfor
            </tr>
        </thead>
        <tbody>
            @php
                // Group consecutive holiday days with same reason
                $holidayGroups = [];
                $curGroup = null;
                for ($d = 1; $d <= $daysInMonth; $d++) {
                    if (isset($holidayInfo[$d])) {
                        if ($curGroup && $curGroup['reason'] === $holidayInfo[$d] && $curGroup['end'] === $d - 1) {
                            $curGroup['end'] = $d;
                        } else {
                            if ($curGroup)
                                $holidayGroups[] = $curGroup;
                            $curGroup = ['start' => $d, 'end' => $d, 'reason' => $holidayInfo[$d]];
                        }
                    } else {
                        if ($curGroup) {
                            $holidayGroups[] = $curGroup;
                            $curGroup = null;
                        }
                    }
                }
                if ($curGroup)
                    $holidayGroups[] = $curGroup;

                // Lookup: day => group info
                $hgLookup = [];
                foreach ($holidayGroups as $g) {
                    for ($d = $g['start']; $d <= $g['end']; $d++) {
                        $hgLookup[$d] = [
                            'isStart' => ($d === $g['start']),
                            'colspan' => $g['end'] - $g['start'] + 1,
                            'reason' => $g['reason'],
                        ];
                    }
                }
                $totalRows = count($rows);
            @endphp

            @forelse($rows as $rowIdx => $row)
                <tr>
                    <td class="col-no">{{ $row['no'] }}</td>
                    <td class="col-nis">{{ $row['nis'] }}</td>
                    <td class="col-nama" title="{{ $row['nama'] }}">{{ $row['nama'] }}</td>
                    @for($d = 1; $d <= $daysInMonth; $d++)
                        @if(isset($hgLookup[$d]))
                            @if($hgLookup[$d]['isStart'] && $rowIdx === 0)
                                <td rowspan="{{ $totalRows }}" colspan="{{ $hgLookup[$d]['colspan'] }}" class="col-day col-holiday-merged"
                                    title="{{ $hgLookup[$d]['reason'] }}">
                                    {{ $hgLookup[$d]['reason'] }}
                                </td>
                            @endif
                        @else
                            @php $status = $row['days'][$d] ?? ''; @endphp
                            <td class="col-day {{ $status ? 'status-' . strtolower($status) : '' }}">
                                {{ $status }}
                            </td>
                        @endif
                    @endfor
                    <td class="col-total">{{ $row['total_h'] }}</td>
                    <td class="col-total">{{ $row['total_s'] }}</td>
                    <td class="col-total">{{ $row['total_i'] }}</td>
                    <td class="col-total">{{ $row['total_a'] }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="{{ $daysInMonth + 7 }}" style="text-align: center; padding: 20px;">
                        Belum ada data siswa untuk kelas ini
                    </td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <div class="legend-section">
        <strong>Keterangan:</strong>
        <span class="status-h">H = Hadir</span>
        <span class="status-s">S = Sakit</span>
        <span class="status-i">I = Izin</span>
        <span class="status-a">A = Alpha</span>
        <span style="color: #888;">- = Libur / Tidak Ada KBM</span>
    </div>

    <div class="signature-section">
        <div class="signature-row">
            <div class="signature-box">
                <p>Mengetahui,</p>
                <p>Kepala Madrasah</p>
                <div class="signature-space">
                    @if(isset($qrCode))
                        <img src="{{ $qrCode }}" alt="QR Verifikasi" class="qr-code-img">
                    @endif
                </div>
                <p class="signature-name">{{ $kepalaSekolah['nama'] ?? '.........................' }}</p>
                @if($kepalaSekolah['nip'] ?? false)
                    <p class="signature-nip">NIP. {{ $kepalaSekolah['nip'] }}</p>
                @endif
            </div>
            <div class="signature-box">
                <p>&nbsp;</p>
                <p>Wali Kelas</p>
                <div class="signature-space">
                    @if(isset($qrWaliKelas))
                        <img src="{{ $qrWaliKelas }}" alt="QR Wali Kelas" class="qr-code-img">
                    @endif
                </div>
                <p class="signature-name">{{ $kelas->waliKelas->nama ?? '.........................' }}</p>
                @if($kelas->waliKelas->nip ?? false)
                    <p class="signature-nip">NIP. {{ $kelas->waliKelas->nip }}</p>
                @endif
            </div>
        </div>
    </div>
@endsection