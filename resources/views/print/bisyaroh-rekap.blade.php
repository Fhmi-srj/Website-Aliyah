@extends('print.layout')

@section('title', 'Rekap Bisyaroh - ' . $bulanNama . ' ' . $tahun)

@section('styles')
<style>
    @page {
        size: A4 landscape;
        margin: 0.5cm 0.6cm;
    }

    .print-container {
        max-width: 100% !important;
        padding: 0.2cm !important;
    }

    body {
        font-family: Arial, Helvetica, sans-serif;
        font-size: 8pt;
        line-height: 1.2;
    }

    /* Compact kop */
    .kop-surat { margin-bottom: 3px; }
    .kop-surat img { max-height: 1.8cm; }
    .kop-line { margin: 3px 0 6px 0; }

    /* Title row */
    .title-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
    }
    .title-row h2 { font-size: 11pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin: 0; }
    .title-row .meta { font-size: 7.5pt; color: #444; }
    .title-row .meta span { margin-left: 12px; }

    /* REKAP TABLE */
    .rekap-table { font-size: 7pt; width: 100%; border-collapse: collapse; }
    .rekap-table th { background-color: #2e7d32; color: #fff; font-size: 6.5pt; padding: 3px 2px; text-align: center; vertical-align: middle; white-space: nowrap; font-weight: bold; border: 1px solid #1b5e20; }
    .rekap-table td { padding: 2px 3px; vertical-align: middle; border: 1px solid #bbb; }
    .rekap-table tbody tr:nth-child(even) { background-color: #f5f5f5; }
    .rekap-table .col-no { width: 18px; text-align: center; color: #666; }
    .rekap-table .col-nama { white-space: nowrap; }
    .rekap-table .col-jabatan { text-align: center; font-size: 6pt; max-width: 60px; }
    .rekap-table .col-num { text-align: right; white-space: nowrap; font-size: 6.5pt; }
    .rekap-table .col-center { text-align: center; }
    .rekap-table .col-jumlah { text-align: right; white-space: nowrap; font-weight: bold; font-size: 6.5pt; background-color: #f1f8e9; }
    .rekap-table .col-penerimaan { text-align: right; white-space: nowrap; font-weight: bold; font-size: 7pt; color: #1b5e20; }
    .rekap-table .col-ttd { width: 50px; text-align: center; }
    .rekap-table tfoot td { font-weight: bold; background-color: #e8f5e9; border-top: 2px solid #2e7d32; font-size: 7pt; }

    /* Signature footer */
    .sig-footer { margin-top: 10px; page-break-inside: avoid; text-align: right; padding-right: 20px; }
    .sig-footer .sig-date { font-size: 8pt; margin-bottom: 2px; }
    .sig-footer .sig-title { font-size: 8.5pt; }
    .sig-footer .sig-space { height: 50px; }
    .sig-footer .sig-name { font-weight: bold; font-size: 9pt; text-decoration: underline; }
    .sig-footer .sig-nip { font-size: 7.5pt; color: #555; }

    /* ====== SLIP PAGES ====== */
    .slip-page {
        page-break-before: always;
        display: grid;
        grid-template-columns: 1fr 1fr;
        grid-template-rows: 1fr 1fr;
        gap: 6px;
        height: calc(100vh - 1cm);
    }

    .slip {
        border: 2px solid #2e7d32;
        border-radius: 6px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        font-size: 6.5pt;
        line-height: 1.25;
    }

    /* Slip Header - green gradient bar with logo */
    .slip-top {
        background: linear-gradient(135deg, #2e7d32, #43a047);
        color: #fff;
        padding: 4px 8px;
        display: flex;
        align-items: center;
        gap: 6px;
    }
    .slip-logo {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: #fff;
        flex-shrink: 0;
        object-fit: contain;
        padding: 1px;
    }
    .slip-top-text {
        flex: 1;
    }
    .slip-top-text .slip-title {
        font-size: 8pt;
        font-weight: bold;
        letter-spacing: 0.5px;
    }
    .slip-top-text .slip-sub {
        font-size: 5.5pt;
        opacity: 0.9;
    }
    .slip-top .slip-bulan {
        font-size: 6.5pt;
        background: rgba(255,255,255,0.2);
        padding: 1px 6px;
        border-radius: 3px;
        white-space: nowrap;
        font-weight: bold;
    }

    /* Slip Info Bar */
    .slip-info-bar {
        display: flex;
        gap: 0;
        border-bottom: 1.5px solid #2e7d32;
        background: #f1f8e9;
        font-size: 6pt;
    }
    .slip-info-item {
        flex: 1;
        padding: 2px 5px;
        border-right: 1px solid #c8e6c9;
    }
    .slip-info-item:last-child { border-right: none; }
    .slip-info-item .si-label { color: #666; font-size: 5pt; text-transform: uppercase; }
    .slip-info-item .si-value { font-weight: bold; font-size: 6.5pt; color: #1b5e20; }

    /* Slip Body */
    .slip-body {
        display: flex;
        gap: 0;
        flex: 1;
        min-height: 0;
        padding: 3px;
    }

    /* Left: Rincian */
    .slip-left {
        width: 36%;
        padding-right: 4px;
        border-right: 1px dashed #c8e6c9;
    }
    .slip-sec-title {
        font-weight: bold;
        font-size: 6pt;
        color: #2e7d32;
        text-transform: uppercase;
        letter-spacing: 0.3px;
        margin: 2px 0 1px 0;
        padding-bottom: 1px;
        border-bottom: 0.5px solid #c8e6c9;
    }

    .slip-rincian {
        width: 100%;
        border: none;
    }
    .slip-rincian td {
        border: none;
        padding: 0.5px 1px;
        font-size: 5.5pt;
        vertical-align: top;
    }
    .slip-rincian .r-no { width: 8px; color: #999; text-align: center; }
    .slip-rincian .r-val { text-align: right; white-space: nowrap; font-weight: 600; }
    .slip-rincian .r-sep { width: 5px; }
    .slip-rincian .r-total td {
        font-weight: bold;
        border-top: 1px solid #333;
        padding-top: 1px;
    }

    .slip-total-box {
        background: linear-gradient(135deg, #1b5e20, #2e7d32);
        color: #fff;
        text-align: center;
        padding: 3px 4px;
        border-radius: 3px;
        margin-top: 3px;
        font-size: 7pt;
        font-weight: bold;
        letter-spacing: 0.3px;
    }

    /* Right: Events */
    .slip-right {
        width: 64%;
        padding-left: 4px;
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .slip-evt-table {
        width: 100%;
        font-size: 5.5pt;
        border-collapse: collapse;
    }
    .slip-evt-table th {
        background: #e8f5e9;
        color: #2e7d32;
        font-size: 5pt;
        padding: 1.5px 2px;
        text-align: center;
        font-weight: bold;
        border: 0.5px solid #c8e6c9;
        text-transform: uppercase;
    }
    .slip-evt-table td {
        padding: 1px 2px;
        font-size: 5.5pt;
        border: 0.5px solid #e0e0e0;
        vertical-align: middle;
    }
    .slip-evt-table .ec { text-align: center; }

    .slip-status-h { color: #16a34a; font-weight: bold; font-size: 7pt; }
    .slip-status-a { color: #dc2626; font-weight: bold; font-size: 7pt; }

    .slip-empty { font-size: 5pt; color: #aaa; font-style: italic; padding: 2px; }

    .slip-footer {
        font-size: 4.5pt;
        color: #999;
        text-align: center;
        padding: 1px 4px;
        border-top: 0.5px solid #e0e0e0;
        background: #fafafa;
    }

    @media print {
        .rekap-table th, .rekap-table tbody tr:nth-child(even),
        .rekap-table tfoot td, .rekap-table .col-jumlah,
        .slip-top, .slip-info-bar, .slip-total-box,
        .slip-evt-table th, .slip-footer {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        .slip-page { height: 100vh; }
    }
    @media screen {
        .slip-page { min-height: 700px; margin-bottom: 20px; }
    }
</style>
@endsection

@section('content')
    {{-- ==================== PAGE 1: REKAP TABLE ==================== --}}
    <div class="title-row">
        <h2>Rekap Bisyaroh &mdash; {{ $bulanNama }} {{ $tahun }}</h2>
        <div class="meta">
            <span>Bisyaroh/Jam: <strong>Rp{{ number_format($settings['bisyaroh_per_jam'], 0, ',', '.') }}</strong></span>
            <span>Transport/Hadir: <strong>Rp{{ number_format($settings['transport_per_hadir'], 0, ',', '.') }}</strong></span>
            <span>Guru: <strong>{{ count($bisyaroh) }}</strong></span>
        </div>
    </div>

    @php
        $potonganKeys = [];
        foreach ($bisyaroh as $b) {
            if (is_array($b->potongan_detail)) {
                foreach (array_keys($b->potongan_detail) as $k) {
                    if (!in_array($k, $potonganKeys)) {
                        $potonganKeys[] = $k;
                    }
                }
            }
        }
    @endphp

    <table class="rekap-table">
        <thead>
            <tr>
                <th class="col-no">No</th>
                <th>Nama</th>
                <th>Jabatan</th>
                <th>Jam</th>
                <th>Hadir</th>
                <th>Gaji Pokok</th>
                <th>Tunj. Struktural</th>
                <th>Tunj. Transport</th>
                <th>Tunj. Masa Kerja</th>
                <th>Tunj. Keg & Rapat</th>
                <th>Jumlah</th>
                @foreach($potonganKeys as $pk)
                    <th>{{ $pk }}</th>
                @endforeach
                <th>Penerimaan</th>
                <th class="col-ttd">TTD</th>
            </tr>
        </thead>
        <tbody>
            @php
                $totalGaji = 0; $totalTunjStr = 0; $totalTransport = 0;
                $totalMasaKerja = 0; $totalKegRapat = 0; $totalJumlah = 0;
                $totalPenerimaan = 0;
                $totalPotonganPerKey = array_fill_keys($potonganKeys, 0);
            @endphp
            @foreach($bisyaroh as $index => $b)
                @php
                    $totalGaji += $b->gaji_pokok;
                    $totalTunjStr += $b->tunj_struktural;
                    $totalTransport += $b->tunj_transport;
                    $totalMasaKerja += $b->tunj_masa_kerja;
                    $totalKegRapat += ($b->tunj_kegiatan + $b->tunj_rapat);
                    $totalJumlah += $b->jumlah;
                    $totalPenerimaan += $b->total_penerimaan;

                    $jabatan = '-';
                    if ($b->guru && $b->guru->user) {
                        $roleNames = $b->guru->user->roles->where('name', '!=', 'guru')->pluck('display_name')->toArray();
                        $jabatan = !empty($roleNames) ? implode(', ', $roleNames) : 'Guru';
                    }
                @endphp
                <tr>
                    <td class="col-no">{{ $index + 1 }}</td>
                    <td class="col-nama">{{ $b->guru->nama ?? '-' }}</td>
                    <td class="col-jabatan">{{ $jabatan }}</td>
                    <td class="col-center">{{ $b->jumlah_jam }}</td>
                    <td class="col-center">{{ $b->jumlah_hadir }}</td>
                    <td class="col-num">Rp{{ number_format($b->gaji_pokok, 0, ',', '.') }}</td>
                    <td class="col-num">{{ $b->tunj_struktural > 0 ? 'Rp' . number_format($b->tunj_struktural, 0, ',', '.') : '-' }}</td>
                    <td class="col-num">{{ $b->tunj_transport > 0 ? 'Rp' . number_format($b->tunj_transport, 0, ',', '.') : '-' }}</td>
                    <td class="col-num">{{ $b->tunj_masa_kerja > 0 ? 'Rp' . number_format($b->tunj_masa_kerja, 0, ',', '.') : '-' }}</td>
                    <td class="col-num">{{ ($b->tunj_kegiatan + $b->tunj_rapat) > 0 ? 'Rp' . number_format($b->tunj_kegiatan + $b->tunj_rapat, 0, ',', '.') : '-' }}</td>
                    <td class="col-jumlah">Rp{{ number_format($b->jumlah, 0, ',', '.') }}</td>
                    @foreach($potonganKeys as $pk)
                        @php
                            $potVal = $b->potongan_detail[$pk] ?? 0;
                            $totalPotonganPerKey[$pk] += $potVal;
                        @endphp
                        <td class="col-num">{{ $potVal > 0 ? 'Rp' . number_format($potVal, 0, ',', '.') : '-' }}</td>
                    @endforeach
                    <td class="col-penerimaan">Rp{{ number_format($b->total_penerimaan, 0, ',', '.') }}</td>
                    <td class="col-ttd"></td>
                </tr>
            @endforeach
        </tbody>
        <tfoot>
            <tr>
                <td colspan="5" class="text-center"><strong>TOTAL</strong></td>
                <td class="col-num">Rp{{ number_format($totalGaji, 0, ',', '.') }}</td>
                <td class="col-num">Rp{{ number_format($totalTunjStr, 0, ',', '.') }}</td>
                <td class="col-num">Rp{{ number_format($totalTransport, 0, ',', '.') }}</td>
                <td class="col-num">Rp{{ number_format($totalMasaKerja, 0, ',', '.') }}</td>
                <td class="col-num">Rp{{ number_format($totalKegRapat, 0, ',', '.') }}</td>
                <td class="col-jumlah">Rp{{ number_format($totalJumlah, 0, ',', '.') }}</td>
                @foreach($potonganKeys as $pk)
                    <td class="col-num">Rp{{ number_format($totalPotonganPerKey[$pk], 0, ',', '.') }}</td>
                @endforeach
                <td class="col-penerimaan">Rp{{ number_format($totalPenerimaan, 0, ',', '.') }}</td>
                <td></td>
            </tr>
        </tfoot>
    </table>

    <div class="sig-footer">
        <div class="sig-date">{{ \App\Services\PrintService::formatDate(now(), 'd F Y') }}</div>
        <div class="sig-title">Mengetahui,</div>
        <div class="sig-title"><strong>Kepala Madrasah</strong></div>
        <div class="sig-space"></div>
        <div class="sig-name">{{ $kepala['nama'] ?? '.........................' }}</div>
        @if($kepala['nip'] ?? false)
            <div class="sig-nip">NIP. {{ $kepala['nip'] }}</div>
        @endif
    </div>

    {{-- ==================== PAGES 2+: SALARY SLIPS (4 per page) ==================== --}}
    @php $slipChunks = $bisyaroh->chunk(4); @endphp

    @foreach($slipChunks as $chunk)
        <div class="slip-page">
            @foreach($chunk as $b)
                @php
                    $jabatan = '-';
                    if ($b->guru && $b->guru->user) {
                        $roleNames = $b->guru->user->roles->where('name', '!=', 'guru')->pluck('display_name')->toArray();
                        $jabatan = !empty($roleNames) ? implode(', ', $roleNames) : 'Guru';
                    }
                    $detailKegiatan = is_array($b->detail_kegiatan) ? $b->detail_kegiatan : [];
                    $detailRapat = is_array($b->detail_rapat) ? $b->detail_rapat : [];
                @endphp
                <div class="slip">
                    {{-- Green header bar with logo --}}
                    <div class="slip-top">
                        @if($logoBase64)
                            <img src="{{ $logoBase64 }}" class="slip-logo" alt="Logo">
                        @endif
                        <div class="slip-top-text">
                            <div class="slip-title">SLIP BISYAROH</div>
                            <div class="slip-sub">{{ $namaLembaga }}</div>
                        </div>
                        <div class="slip-bulan">{{ strtoupper($bulanNama) }} {{ $tahun }}</div>
                    </div>

                    {{-- Info bar --}}
                    <div class="slip-info-bar">
                        <div class="slip-info-item">
                            <div class="si-label">Nama</div>
                            <div class="si-value">{{ $b->guru->nama ?? '-' }}</div>
                        </div>
                        <div class="slip-info-item">
                            <div class="si-label">Jabatan</div>
                            <div class="si-value">{{ $jabatan }}</div>
                        </div>
                        <div class="slip-info-item">
                            <div class="si-label">Jam</div>
                            <div class="si-value">{{ $b->jumlah_jam }}</div>
                        </div>
                        <div class="slip-info-item">
                            <div class="si-label">Kehadiran</div>
                            <div class="si-value">{{ $b->jumlah_hadir }} hari</div>
                        </div>
                    </div>

                    {{-- Body --}}
                    <div class="slip-body">
                        {{-- LEFT: Rincian --}}
                        <div class="slip-left">
                            <div class="slip-sec-title">Rincian Gaji</div>
                            <table class="slip-rincian">
                                @php $rNo = 1; @endphp
                                <tr>
                                    <td class="r-no">{{ $rNo++ }}</td>
                                    <td>Gaji Pokok</td>
                                    <td class="r-sep">:</td>
                                    <td class="r-val">Rp{{ number_format($b->gaji_pokok, 0, ',', '.') }}</td>
                                </tr>
                                @if($b->tunj_struktural > 0)
                                <tr>
                                    <td class="r-no">{{ $rNo++ }}</td>
                                    <td>Tunj. Struktural</td>
                                    <td class="r-sep">:</td>
                                    <td class="r-val">Rp{{ number_format($b->tunj_struktural, 0, ',', '.') }}</td>
                                </tr>
                                @endif
                                <tr>
                                    <td class="r-no">{{ $rNo++ }}</td>
                                    <td>Tunj. Transport</td>
                                    <td class="r-sep">:</td>
                                    <td class="r-val">Rp{{ number_format($b->tunj_transport, 0, ',', '.') }}</td>
                                </tr>
                                <tr>
                                    <td class="r-no">{{ $rNo++ }}</td>
                                    <td>Tunj. Masa Kerja</td>
                                    <td class="r-sep">:</td>
                                    <td class="r-val">Rp{{ number_format($b->tunj_masa_kerja, 0, ',', '.') }}</td>
                                </tr>
                                <tr>
                                    <td class="r-no">{{ $rNo++ }}</td>
                                    <td>Tunj. Keg & Rapat</td>
                                    <td class="r-sep">:</td>
                                    <td class="r-val">Rp{{ number_format($b->tunj_kegiatan + $b->tunj_rapat, 0, ',', '.') }}</td>
                                </tr>
                                <tr class="r-total">
                                    <td></td>
                                    <td><strong>Jumlah</strong></td>
                                    <td class="r-sep">:</td>
                                    <td class="r-val">Rp{{ number_format($b->jumlah, 0, ',', '.') }}</td>
                                </tr>
                            </table>

                            @if($b->potongan_detail && count($b->potongan_detail) > 0)
                                <div class="slip-sec-title">Iuran / Potongan</div>
                                <table class="slip-rincian">
                                    @php $pNo = 1; @endphp
                                    @foreach($b->potongan_detail as $label => $nominal)
                                        <tr>
                                            <td class="r-no">{{ $pNo++ }}</td>
                                            <td>{{ $label }}</td>
                                            <td class="r-sep">:</td>
                                            <td class="r-val">Rp{{ number_format($nominal, 0, ',', '.') }}</td>
                                        </tr>
                                    @endforeach
                                    <tr class="r-total">
                                        <td></td>
                                        <td><strong>Jumlah</strong></td>
                                        <td class="r-sep">:</td>
                                        <td class="r-val">Rp{{ number_format($b->jumlah_potongan, 0, ',', '.') }}</td>
                                    </tr>
                                </table>
                            @endif

                            <div class="slip-total-box">
                                TOTAL: Rp{{ number_format($b->total_penerimaan, 0, ',', '.') }}
                            </div>
                        </div>

                        {{-- RIGHT: Events --}}
                        <div class="slip-right">
                            {{-- Kegiatan --}}
                            <div>
                                <div class="slip-sec-title">Kegiatan</div>
                                @if(count($detailKegiatan) > 0)
                                    <table class="slip-evt-table">
                                        <thead>
                                            <tr>
                                                <th>Nama Kegiatan</th>
                                                <th>Tanggal</th>
                                                <th>Peran</th>
                                                <th>Absen</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            @foreach($detailKegiatan as $kg)
                                                <tr>
                                                    <td>{{ $kg['nama'] ?? '-' }}</td>
                                                    <td class="ec">{{ isset($kg['tanggal']) ? \Carbon\Carbon::parse($kg['tanggal'])->format('d/m/Y') : '-' }}</td>
                                                    <td class="ec">{{ $kg['peran'] ?? '-' }}</td>
                                                    <td class="ec">
                                                        @if(($kg['hadir'] ?? 0) > 0)
                                                            <span class="slip-status-h">✔</span>
                                                        @else
                                                            <span class="slip-status-a">✘</span>
                                                        @endif
                                                    </td>
                                                </tr>
                                            @endforeach
                                        </tbody>
                                    </table>
                                @else
                                    <div class="slip-empty">Tidak ada kegiatan bulan ini</div>
                                @endif
                            </div>

                            {{-- Rapat --}}
                            <div>
                                <div class="slip-sec-title">Rapat</div>
                                @if(count($detailRapat) > 0)
                                    <table class="slip-evt-table">
                                        <thead>
                                            <tr>
                                                <th>Agenda Rapat</th>
                                                <th>Tanggal</th>
                                                <th>Tempat</th>
                                                <th>Absen</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            @foreach($detailRapat as $rp)
                                                <tr>
                                                    <td>{{ $rp['agenda'] ?? '-' }}</td>
                                                    <td class="ec">{{ isset($rp['tanggal']) ? \Carbon\Carbon::parse($rp['tanggal'])->format('d/m/Y') : '-' }}</td>
                                                    <td>{{ $rp['tempat'] ?? '-' }}</td>
                                                    <td class="ec">
                                                        @if($rp['hadir'] ?? false)
                                                            <span class="slip-status-h">✔</span>
                                                        @else
                                                            <span class="slip-status-a">✘</span>
                                                        @endif
                                                    </td>
                                                </tr>
                                            @endforeach
                                        </tbody>
                                    </table>
                                @else
                                    <div class="slip-empty">Tidak ada rapat bulan ini</div>
                                @endif
                            </div>
                        </div>
                    </div>

                    <div class="slip-footer">
                        Harap laporkan jika ada kesalahan dalam absensi atau perhitungan &bull; {{ $namaLembaga }}
                    </div>
                </div>
            @endforeach

            @for($i = $chunk->count(); $i < 4; $i++)
                <div></div>
            @endfor
        </div>
    @endforeach
@endsection