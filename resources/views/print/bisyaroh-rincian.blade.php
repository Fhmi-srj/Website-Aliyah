@extends('print.layout')

@section('title', 'Rincian Bisyaroh - ' . ($bisyaroh->guru->nama ?? ''))

@section('styles')
    <style>
        @page {
            size: A4;
            margin: 1cm;
        }

        body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 10pt;
        }

        .rincian-container {
            border: 2px solid #000;
            padding: 20px;
        }

        .rincian-header {
            margin-bottom: 15px;
        }

        .rincian-header h2 {
            text-align: center;
            font-size: 14pt;
            margin-bottom: 5px;
        }

        .rincian-header .lembaga {
            text-align: center;
            font-size: 11pt;
            font-weight: bold;
        }

        .rincian-header .bulan {
            text-align: center;
            font-size: 10pt;
            margin-bottom: 15px;
        }

        .layout-flex {
            display: flex;
            gap: 20px;
        }

        .col-left {
            width: 40%;
        }

        .col-right {
            width: 60%;
        }

        .info-table {
            border: none;
            margin-bottom: 15px;
            width: 100%;
        }

        .info-table td {
            border: none;
            padding: 2px 5px;
            font-size: 9.5pt;
        }

        .info-table .label {
            width: 120px;
            font-weight: normal;
        }

        .info-table .sep {
            width: 10px;
        }

        .rincian-table {
            border: none;
            width: 100%;
            margin-bottom: 5px;
        }

        .rincian-table td {
            border: none;
            padding: 1px 5px;
            font-size: 9.5pt;
        }

        .rincian-table .no {
            width: 20px;
            text-align: center;
        }

        .rincian-table .value {
            text-align: right;
        }

        .rincian-table .total-row td {
            font-weight: bold;
            border-top: 1px solid #000;
            padding-top: 3px;
        }

        .section-label {
            font-weight: bold;
            margin-bottom: 3px;
            margin-top: 10px;
            text-decoration: underline;
        }

        /* Kegiatan & Rapat tables */
        .event-table {
            font-size: 8.5pt;
            margin-bottom: 10px;
        }

        .event-table th {
            background-color: #e8e8e8;
            font-size: 8pt;
            padding: 3px 5px;
        }

        .event-table td {
            padding: 2px 5px;
            font-size: 8pt;
        }

        .status-h {
            color: #16a34a;
            font-weight: bold;
            font-size: 12pt;
        }

        .status-a {
            color: #dc2626;
            font-weight: bold;
            font-size: 12pt;
        }

        .footer-note {
            margin-top: 15px;
            font-size: 8pt;
            font-style: italic;
            color: #555;
        }
    </style>
@endsection

@section('content')
    <div class="rincian-container">
        <div class="rincian-header">
            <h2>RINCIAN BISYAROH</h2>
            <div class="lembaga">MA ALHIKAM</div>
            <div class="bulan">BULAN {{ strtoupper($bulanNama) }}</div>
        </div>

        <div class="layout-flex">
            {{-- LEFT COLUMN: Info + Rincian --}}
            <div class="col-left">
                <div class="section-label">BISYAROH</div>
                <table class="info-table">
                    <tr>
                        <td class="label">No.</td>
                        <td class="sep">:</td>
                        <td>{{ $bisyaroh->id }}</td>
                    </tr>
                    <tr>
                        <td class="label">Nama Guru</td>
                        <td class="sep">:</td>
                        <td><strong>{{ $bisyaroh->guru->nama ?? '-' }}</strong></td>
                    </tr>
                    <tr>
                        <td class="label">Jabatan</td>
                        <td class="sep">:</td>
                        <td>@php
                            $jabatan = '-';
                            if ($bisyaroh->guru && $bisyaroh->guru->user) {
                                $roleNames = $bisyaroh->guru->user->roles->where('name', '!=', 'guru')->pluck('display_name')->toArray();
                                $jabatan = !empty($roleNames) ? implode(', ', $roleNames) : 'Guru';
                            }
                        @endphp{{ $jabatan }}</td>
                    </tr>
                    <tr>
                        <td class="label">Jumlah Jam</td>
                        <td class="sep">:</td>
                        <td>{{ $bisyaroh->jumlah_jam }}</td>
                    </tr>
                    <tr>
                        <td class="label">Kehadiran</td>
                        <td class="sep">:</td>
                        <td>{{ $bisyaroh->jumlah_hadir }}</td>
                    </tr>
                </table>

                <div class="section-label">Rincian</div>
                <table class="rincian-table">
                    <tr>
                        <td class="no">1</td>
                        <td>Gaji Pokok</td>
                        <td class="sep">:</td>
                        <td class="value">Rp{{ number_format($bisyaroh->gaji_pokok, 0, ',', '.') }}</td>
                    </tr>
                    <tr>
                        <td class="no">2</td>
                        <td>Tunj Struktural</td>
                        <td class="sep">:</td>
                        <td class="value">Rp{{ number_format($bisyaroh->tunj_struktural, 0, ',', '.') }}</td>
                    </tr>
                    <tr>
                        <td class="no">3</td>
                        <td>Tunj Transport</td>
                        <td class="sep">:</td>
                        <td class="value">Rp{{ number_format($bisyaroh->tunj_transport, 0, ',', '.') }}</td>
                    </tr>
                    <tr>
                        <td class="no">4</td>
                        <td>Tunj Masa Kerja</td>
                        <td class="sep">:</td>
                        <td class="value">Rp{{ number_format($bisyaroh->tunj_masa_kerja, 0, ',', '.') }}</td>
                    </tr>
                    <tr>
                        <td class="no">5</td>
                        <td>Tunj Kegiatan & Rapat</td>
                        <td class="sep">:</td>
                        <td class="value">
                            Rp{{ number_format($bisyaroh->tunj_kegiatan + $bisyaroh->tunj_rapat, 0, ',', '.') }}</td>
                    </tr>
                    <tr class="total-row">
                        <td></td>
                        <td><strong>Jumlah</strong></td>
                        <td class="sep">:</td>
                        <td class="value">Rp{{ number_format($bisyaroh->jumlah, 0, ',', '.') }}</td>
                    </tr>
                </table>

                @if($bisyaroh->potongan_detail && count($bisyaroh->potongan_detail) > 0)
                    <div class="section-label">Iuran</div>
                    <table class="rincian-table">
                        @php $potNo = 1; @endphp
                        @foreach($bisyaroh->potongan_detail as $label => $nominal)
                            <tr>
                                <td class="no">{{ $potNo++ }}</td>
                                <td>{{ $label }}</td>
                                <td class="sep">:</td>
                                <td class="value">Rp{{ number_format($nominal, 0, ',', '.') }}</td>
                            </tr>
                        @endforeach
                        <tr class="total-row">
                            <td></td>
                            <td><strong>Jumlah</strong></td>
                            <td class="sep">:</td>
                            <td class="value">Rp{{ number_format($bisyaroh->jumlah_potongan, 0, ',', '.') }}</td>
                        </tr>
                    </table>
                @endif

                <table class="rincian-table" style="margin-top: 15px;">
                    <tr class="total-row">
                        <td colspan="2"><strong>TOTAL PENERIMAAN</strong></td>
                        <td class="sep">:</td>
                        <td class="value" style="font-size: 12pt;">
                            Rp{{ number_format($bisyaroh->total_penerimaan, 0, ',', '.') }}</td>
                    </tr>
                </table>
            </div>

            {{-- RIGHT COLUMN: Kegiatan & Rapat --}}
            <div class="col-right">
                @if($bisyaroh->detail_kegiatan && count($bisyaroh->detail_kegiatan) > 0)
                    <div class="section-label">KEGIATAN</div>
                    <table class="event-table">
                        <thead>
                            <tr>
                                <th>KEGIATAN</th>
                                <th>TANGGAL</th>
                                <th>PERAN</th>
                                <th>ABSEN</th>
                            </tr>
                        </thead>
                        <tbody>
                            @foreach($bisyaroh->detail_kegiatan as $kg)
                                <tr>
                                    <td>{{ $kg['nama'] ?? '-' }}</td>
                                    <td class="text-center">{{ $kg['tanggal'] ?? '-' }}</td>
                                    <td class="text-center">{{ $kg['peran'] ?? '-' }}</td>
                                    <td class="text-center">
                                        @if(($kg['hadir'] ?? 0) > 0)
                                            <span class="status-h">✔</span>
                                        @else
                                            <span class="status-a">✘</span>
                                        @endif
                                    </td>
                                </tr>
                            @endforeach
                        </tbody>
                    </table>
                @endif

                @if($bisyaroh->detail_rapat && count($bisyaroh->detail_rapat) > 0)
                    <div class="section-label">RAPAT</div>
                    <table class="event-table">
                        <thead>
                            <tr>
                                <th>RAPAT</th>
                                <th>TANGGAL</th>
                                <th>TEMPAT</th>
                                <th>ABSEN</th>
                            </tr>
                        </thead>
                        <tbody>
                            @foreach($bisyaroh->detail_rapat as $rp)
                                <tr>
                                    <td>{{ $rp['agenda'] ?? '-' }}</td>
                                    <td class="text-center">{{ $rp['tanggal'] ?? '-' }}</td>
                                    <td>{{ $rp['tempat'] ?? '-' }}</td>
                                    <td class="text-center">
                                        @if($rp['hadir'] ?? false)
                                            <span class="status-h">✔</span>
                                        @else
                                            <span class="status-a">✘</span>
                                        @endif
                                    </td>
                                </tr>
                            @endforeach
                        </tbody>
                    </table>
                @endif
            </div>
        </div>

        <div class="footer-note">
            NB. Jangan lupa untuk selalu mengisi absensi, baik itu jurnal kelas, kegiatan ataupun rapat :)<br>
            Harap dilaporkan apabila ada kesalahan dalam absensi atau perhitungan untuk evaluasi pengembangan
        </div>
    </div>
@endsection