@extends('print.layout')

@section('title', 'Berita Acara Rapat')

@section('content')
    @foreach($rapatList as $index => $item)
        @if($index > 0)
            <div style="page-break-before: always;"></div>
            @if($kopUrl ?? false)
                <div class="kop-surat">
                    <img src="{{ $kopUrl }}" alt="Kop Surat">
                </div>
            @endif
        @endif

        <h1 class="doc-title">Berita Acara Rapat</h1>

        <div class="info-section">
            <div class="info-row">
                <span class="info-label">Nama Rapat</span>
                <span class="info-value">: {{ $item['rapat']->agenda_rapat ?? '-' }}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Tanggal</span>
                <span class="info-value">: {{ $item['tanggalRapat'] }}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Waktu</span>
                <span class="info-value">: {{ $item['waktuMulai'] }} - {{ $item['waktuSelesai'] }}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Tempat</span>
                <span class="info-value">: {{ $item['rapat']->tempat ?? '-' }}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Pimpinan Rapat</span>
                <span class="info-value">: {{ $item['rapat']->pimpinanGuru->nama ?? '-' }}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Sekretaris</span>
                <span class="info-value">: {{ $item['rapat']->sekretarisGuru->nama ?? '-' }}</span>
            </div>
        </div>

        <h3 class="section-title">Daftar Hadir Peserta</h3>
        <table>
            <thead>
                <tr>
                    <th style="width: 40px">No</th>
                    <th>Nama</th>
                    <th>Jabatan</th>
                    <th style="width: 100px">TTD</th>
                    <th>Keterangan</th>
                </tr>
            </thead>
            <tbody>
                @forelse($item['peserta'] as $pIndex => $p)
                    <tr>
                        <td class="text-center">{{ $pIndex + 1 }}</td>
                        <td>{{ $p['nama'] }}</td>
                        <td>{{ $p['jabatan'] ?? '-' }}</td>
                        <td class="text-center ttd-cell">
                            @if($p['ttd'] && strtolower($p['status']) === 'hadir')
                                @php
                                    $hash = crc32($p['nama']);
                                    $scale = 1 + (abs($hash % 20) + 1) / 100; // 1.01 to 1.20
                                    $rotation = ($hash % 31) - 15; // -15 to +15 degrees
                                    $offsetY = (crc32($p['nama'] . 'y') % 21) - 10; // -10px to +10px
                                    $offsetX = ($pIndex % 2 === 0) ? -10 : 10;
                                @endphp
                                <img src="{{ $p['ttd'] }}" alt="TTD" class="ttd-inline"
                                    style="transform: rotate({{ $rotation }}deg) scale({{ $scale }}) translateX({{ $offsetX }}px) translateY({{ $offsetY }}px);">
                            @else
                                <span class="{{ $p['status_class'] }}">{{ $p['status'] }}</span>
                            @endif
                        </td>
                        <td>{{ $p['keterangan'] ?? '-' }}</td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="5" class="text-center">Tidak ada data peserta</td>
                    </tr>
                @endforelse
                @if(!empty($item['rapat']->peserta_eksternal))
                    @foreach($item['rapat']->peserta_eksternal as $pe)
                        <tr style="background-color: #f0f7ff;">
                            <td class="text-center">{{ count($item['peserta']) + $loop->iteration }}</td>
                            <td>{{ $pe['nama'] }} <small style="color: #3b82f6;">(Tamu)</small></td>
                            <td>{{ $pe['jabatan'] ?? '-' }}</td>
                            <td class="text-center ttd-cell">
                                @if(!empty($pe['ttd']))
                                    @php
                                        $hash = crc32($pe['nama']);
                                        $scale = 1 + (abs($hash % 20) + 1) / 100;
                                        $rotation = ($hash % 31) - 15;
                                        $offsetY = (crc32($pe['nama'] . 'y') % 21) - 10;
                                        $offsetX = ($loop->index % 2 === 0) ? -10 : 10;
                                    @endphp
                                    <img src="{{ $pe['ttd'] }}" alt="TTD" class="ttd-inline"
                                        style="transform: rotate({{ $rotation }}deg) scale({{ $scale }}) translateX({{ $offsetX }}px) translateY({{ $offsetY }}px);">
                                @else
                                    <span style="color: green; font-weight: bold;">Hadir</span>
                                @endif
                            </td>
                            <td>-</td>
                        </tr>
                    @endforeach
                @endif
            </tbody>
        </table>

        <div class="info-section">
            <p><strong>Rekap Kehadiran:</strong> Hadir: {{ $item['rekap']['hadir'] }} | Izin: {{ $item['rekap']['izin'] }} |
                Sakit:
                {{ $item['rekap']['sakit'] }} | Alpha: {{ $item['rekap']['alpha'] }}
            </p>
        </div>

        <h3 class="section-title">Notulensi</h3>
        <div class="content-box">
            {!! nl2br(e($item['notulensi'] ?? 'Tidak ada notulensi')) !!}
        </div>

        <div class="signature-section">
            <div class="signature-row">
                <div class="signature-box">
                    <p>&nbsp;</p>
                    <p>Pimpinan Rapat,</p>
                    <div class="signature-space">
                        @if($item['rapat']->pimpinanGuru && $item['rapat']->pimpinanGuru->ttd)
                            <img src="{{ asset('storage/' . $item['rapat']->pimpinanGuru->ttd) }}" alt="Tanda Tangan"
                                class="ttd-img">
                        @endif
                    </div>
                    <p class="signature-name">{{ $item['rapat']->pimpinanGuru->nama ?? '........................' }}</p>
                    <p>NIP. {{ $item['rapat']->pimpinanGuru->nip ?? '........................' }}</p>
                </div>
                <div class="signature-box">
                    <p>Pekalongan, {{ $tanggalCetak }}</p>
                    <p>Sekretaris,</p>
                    <div class="signature-space">
                        @if($item['rapat']->sekretarisGuru && $item['rapat']->sekretarisGuru->ttd)
                            <img src="{{ asset('storage/' . $item['rapat']->sekretarisGuru->ttd) }}" alt="Tanda Tangan"
                                class="ttd-img">
                        @endif
                    </div>
                    <p class="signature-name">{{ $item['rapat']->sekretarisGuru->nama ?? '........................' }}</p>
                    <p>NIP. {{ $item['rapat']->sekretarisGuru->nip ?? '........................' }}</p>
                </div>
            </div>
        </div>

        @if(count($item['fotos']) > 0)
            <div style="page-break-before: always;"></div>
            <h3 class="section-title">Dokumentasi - {{ $item['rapat']->agenda_rapat ?? 'Rapat' }}</h3>
            <div class="photo-gallery-large">
                @foreach($item['fotos'] as $foto)
                    <div class="photo-item-large">
                        <img src="{{ $foto }}" alt="Dokumentasi Rapat">
                    </div>
                @endforeach
            </div>
        @endif
    @endforeach
@endsection

@section('styles')
    <style>
        .photo-gallery-large {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            justify-content: center;
        }

        .photo-item-large {
            width: 45%;
            margin-bottom: 20px;
        }

        .photo-item-large img {
            width: 100%;
            height: auto;
            max-height: 300px;
            object-fit: contain;
            border: 1px solid #ccc;
        }

        @media print {
            .photo-item-large {
                width: 48%;
            }

            .photo-item-large img {
                max-height: 280px;
            }
        }

        .ttd-img {
            max-width: 120px;
            max-height: 80px;
            object-fit: contain;
        }

        .ttd-inline {
            max-width: 120px;
            height: 60px;
            object-fit: contain;
            margin: -18px auto;
            display: block;
            position: relative;
            z-index: 1;
        }

        td.ttd-cell {
            padding: 2px 15px;
            overflow: visible;
            position: relative;
        }
    </style>
@endsection