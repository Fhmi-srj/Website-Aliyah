@extends('print.layout')

@section('title', 'Instrumen Supervisi Modul Ajar')

@section('content')
    <h1 class="doc-title">Instrumen Supervisi Modul Ajar</h1>

    <div class="info-section">
        <div class="info-row">
            <span class="info-label">Nama Guru</span>
            <span class="info-value">: {{ $guru->nama ?? '-' }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">NIP</span>
            <span class="info-value">: {{ $guru->nip ?? '-' }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Mata Pelajaran</span>
            <span class="info-value">: {{ $mapel ?? '-' }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Kelas</span>
            <span class="info-value">: {{ $kelas ?? '-' }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Topik/Materi</span>
            <span class="info-value">: {{ $topik ?? '-' }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Tanggal</span>
            <span class="info-value">: {{ $tanggalSupervisi ?? '-' }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Supervisor</span>
            <span class="info-value">: {{ $supervisor->nama ?? '-' }}</span>
        </div>
    </div>

    {{-- Bagian A: Perencanaan Pembelajaran --}}
    <h3 class="section-title">Bagian A: Perencanaan Pembelajaran (Modul Ajar)</h3>
    <table>
        <thead>
            <tr>
                <th style="width: 35px">No</th>
                <th>Aspek Penilaian</th>
                <th style="width: 50px">1</th>
                <th style="width: 50px">2</th>
                <th style="width: 50px">3</th>
                <th style="width: 50px">4</th>
            </tr>
            <tr class="likert-header">
                <th></th>
                <th></th>
                <th class="likert-label">Belum<br>Tampak</th>
                <th class="likert-label">Cukup</th>
                <th class="likert-label">Baik</th>
                <th class="likert-label">Sangat<br>Baik</th>
            </tr>
        </thead>
        <tbody>
            @foreach($bagianA as $index => $item)
                <tr>
                    <td class="text-center">{{ $index + 1 }}</td>
                    <td>
                        <strong>{{ $item['label'] }}</strong>
                        <br><span class="desc-text">{{ $item['desc'] }}</span>
                    </td>
                    @for($v = 1; $v <= 4; $v++)
                        <td class="text-center">
                            @if(($hasilA[$item['key']] ?? 0) == $v)
                                <span class="check-mark">✓</span>
                            @endif
                        </td>
                    @endfor
                </tr>
            @endforeach
            <tr class="total-row">
                <td colspan="2" class="text-right"><strong>Rata-rata Bagian A</strong></td>
                <td colspan="4" class="text-center"><strong>{{ $rataA }}</strong></td>
            </tr>
        </tbody>
    </table>

    {{-- Bagian B: Pelaksanaan Pembelajaran --}}
    <div style="page-break-before: always;"></div>
    <h3 class="section-title">Bagian B: Pelaksanaan Pembelajaran</h3>
    <table>
        <thead>
            <tr>
                <th style="width: 35px">No</th>
                <th>Aspek Penilaian</th>
                <th style="width: 50px">1</th>
                <th style="width: 50px">2</th>
                <th style="width: 50px">3</th>
                <th style="width: 50px">4</th>
            </tr>
            <tr class="likert-header">
                <th></th>
                <th></th>
                <th class="likert-label">Belum<br>Tampak</th>
                <th class="likert-label">Cukup</th>
                <th class="likert-label">Baik</th>
                <th class="likert-label">Sangat<br>Baik</th>
            </tr>
        </thead>
        <tbody>
            @foreach($bagianB as $index => $item)
                <tr>
                    <td class="text-center">{{ $index + 1 }}</td>
                    <td>
                        <strong>{{ $item['label'] }}</strong>
                        <br><span class="desc-text">{{ $item['desc'] }}</span>
                    </td>
                    @for($v = 1; $v <= 4; $v++)
                        <td class="text-center">
                            @if(($hasilB[$item['key']] ?? 0) == $v)
                                <span class="check-mark">✓</span>
                            @endif
                        </td>
                    @endfor
                </tr>
            @endforeach
            <tr class="total-row">
                <td colspan="2" class="text-right"><strong>Rata-rata Bagian B</strong></td>
                <td colspan="4" class="text-center"><strong>{{ $rataB }}</strong></td>
            </tr>
        </tbody>
    </table>

    {{-- Rekap Nilai --}}
    <div class="rekap-section">
        <table class="rekap-table">
            <tr>
                <td style="width: 50%"><strong>Rata-rata Bagian A (Perencanaan)</strong></td>
                <td class="text-center"><strong>{{ $rataA }}</strong></td>
            </tr>
            <tr>
                <td><strong>Rata-rata Bagian B (Pelaksanaan)</strong></td>
                <td class="text-center"><strong>{{ $rataB }}</strong></td>
            </tr>
            <tr class="total-row">
                <td><strong>Rata-rata Total</strong></td>
                <td class="text-center"><strong>{{ $rataTotal }}</strong></td>
            </tr>
            <tr>
                <td><strong>Predikat</strong></td>
                <td class="text-center"><strong class="predikat-{{ strtolower($predikat) }}">{{ $predikat }}</strong></td>
            </tr>
        </table>
    </div>

    {{-- Kesimpulan --}}
    <div style="page-break-before: always;"></div>
    <h3 class="section-title">Kesimpulan</h3>
    <div class="kesimpulan-box">
        @if(count($kelebihan) > 0)
            <p class="sub-heading kelebihan-heading">Kelebihan:</p>
            <ul class="kesimpulan-list">
                @foreach($kelebihan as $item)
                    <li>{{ $item }}</li>
                @endforeach
            </ul>
        @endif

        @if(count($kelemahan) > 0)
            <p class="sub-heading kelemahan-heading">Kelemahan:</p>
            <ul class="kesimpulan-list">
                @foreach($kelemahan as $item)
                    <li>{{ $item }}</li>
                @endforeach
            </ul>
        @endif

        @if(count($kelebihan) == 0 && count($kelemahan) == 0)
            <p><em>Belum ada data penilaian</em></p>
        @endif
    </div>

    {{-- Tindak Lanjut --}}
    <h3 class="section-title">Tindak Lanjut</h3>
    <div class="kesimpulan-box">
        @foreach($tindakLanjut as $skor => $items)
            @if(count($items) > 0)
                <p><strong>{{ $skorTindakLanjut[$skor] }}:</strong> {{ implode(', ', $items) }}</p>
            @endif
        @endforeach
    </div>

    @if($catatan)
        <h3 class="section-title">Catatan</h3>
        <div class="content-box">
            {!! nl2br(e($catatan)) !!}
        </div>
    @endif

    {{-- Signature Section --}}
    <div class="signature-section">
        <div class="signature-row">
            <div class="signature-box">
                <p>&nbsp;</p>
                <p>Guru Yang Disupervisi,</p>
                <div class="signature-space">
                    @if(isset($qrGuru))
                        <img src="{{ $qrGuru }}" alt="QR Verifikasi" class="qr-code-img">
                    @endif
                </div>
                <p class="signature-name">{{ $guru->nama ?? '........................' }}</p>
                <p>NIP. {{ $guru->nip ?? '........................' }}</p>
            </div>
            <div class="signature-box">
                <p>Pekalongan, {{ $tanggalCetak }}</p>
                <p>Supervisor,</p>
                <div class="signature-space">
                    @if(isset($qrSupervisor))
                        <img src="{{ $qrSupervisor }}" alt="QR Verifikasi" class="qr-code-img">
                    @endif
                </div>
                <p class="signature-name">{{ $supervisor->nama ?? '........................' }}</p>
                <p>NIP. {{ $supervisor->nip ?? '........................' }}</p>
            </div>
        </div>
    </div>

    {{-- Dokumentasi --}}
    @if(count($fotos) > 0)
        <div style="page-break-before: always;"></div>
        <h3 class="section-title">Dokumentasi Supervisi - {{ $guru->nama ?? '' }}</h3>
        <div class="photo-gallery-large">
            @foreach($fotos as $fotoIndex => $foto)
                <div class="photo-item-large">
                    <img src="{{ $foto }}" alt="Dokumentasi Supervisi">

                </div>
            @endforeach
        </div>
    @endif
@endsection

@section('styles')
    <style>
        .likert-header th {
            font-size: 8pt;
            padding: 3px;
            font-weight: normal;
            border-top: none;
        }

        .likert-label {
            font-size: 7pt !important;
            color: #666;
            line-height: 1.2;
        }

        .check-mark {
            font-size: 16pt;
            font-weight: bold;
            color: #16a34a;
        }

        .desc-text {
            font-size: 10pt;
            color: #555;
            font-style: italic;
        }

        .total-row {
            background-color: #f0f8f0 !important;
        }

        .total-row td {
            font-size: 12pt;
        }

        .rekap-section {
            margin: 25px 0;
        }

        .rekap-table {
            width: 60%;
            margin: 0 auto;
        }

        .rekap-table td {
            padding: 10px 15px;
        }

        .predikat-sangat.baik {
            color: #16a34a;
        }

        .predikat-baik {
            color: #2563eb;
        }

        .predikat-cukup {
            color: #d97706;
        }

        .predikat-kurang {
            color: #dc2626;
        }

        .kesimpulan-box {
            border: 1px solid #ddd;
            padding: 15px 20px;
            margin-bottom: 20px;
            border-radius: 4px;
        }

        .kesimpulan-box p {
            margin-bottom: 8px;
        }

        .sub-heading {
            font-weight: bold;
            margin-bottom: 5px !important;
            font-size: 11pt;
        }

        .kelebihan-heading {
            color: #16a34a;
        }

        .kelemahan-heading {
            color: #dc2626;
            margin-top: 12px !important;
        }

        .kesimpulan-list {
            margin: 0 0 10px 20px;
            padding: 0;
        }

        .kesimpulan-list li {
            margin-bottom: 4px;
            font-size: 11pt;
        }

        .photo-gallery-large {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            justify-content: center;
        }

        .photo-item-large {
            width: 45%;
            margin-bottom: 20px;
            text-align: center;
        }

        .photo-item-large img {
            width: 100%;
            height: auto;
            max-height: 300px;
            object-fit: contain;
            border: 1px solid #ccc;
        }

        .photo-caption {
            font-size: 11px;
            color: #555;
            margin-top: 5px;
            font-style: italic;
        }

        .qr-code-img {
            width: 80px;
            height: 80px;
            object-fit: contain;
        }

        @media print {
            .total-row {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                background-color: #f0f8f0 !important;
            }

            .photo-item-large {
                width: 48%;
            }

            .photo-item-large img {
                max-height: 280px;
            }
        }
    </style>
@endsection