@extends('print.layout')

@section('title', 'Berita Acara Rapat')

@section('content')
    <h1 class="doc-title">Berita Acara Rapat</h1>

    <div class="info-section">
        <div class="info-row">
            <span class="info-label">Nama Rapat</span>
            <span class="info-value">: {{ $rapat->agenda_rapat ?? '-' }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Tanggal</span>
            <span class="info-value">: {{ $tanggalRapat }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Waktu</span>
            <span class="info-value">: {{ $waktuMulai }} - {{ $waktuSelesai }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Tempat</span>
            <span class="info-value">: {{ $rapat->tempat ?? '-' }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Pimpinan Rapat</span>
            <span class="info-value">: {{ $rapat->pimpinanGuru->nama ?? '-' }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Sekretaris</span>
            <span class="info-value">: {{ $rapat->sekretarisGuru->nama ?? '-' }}</span>
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
            @forelse($peserta as $index => $p)
                <tr>
                    <td class="text-center">{{ $index + 1 }}</td>
                    <td>{{ $p['nama'] }}</td>
                    <td>{{ $p['jabatan'] ?? '-' }}</td>
                    <td class="text-center ttd-cell">
                        @if($p['ttd'] && strtolower($p['status']) === 'hadir')
                            @php
                                $hash = crc32($p['nama']);
                                $scale = 1 + (abs($hash % 20) + 1) / 100; // 1.01 to 1.20
                                $rotation = ($hash % 31) - 15; // -15 to +15 degrees
                                $offsetY = (crc32($p['nama'] . 'y') % 21) - 10; // -10px to +10px
                                $offsetX = ($index % 2 === 0) ? -10 : 10;
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
            @if(!empty($rapat->peserta_eksternal))
                @foreach($rapat->peserta_eksternal as $pe)
                    <tr style="background-color: #f0f7ff;">
                        <td class="text-center">{{ count($peserta) + $loop->iteration }}</td>
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
        <p><strong>Rekap Kehadiran:</strong> Hadir: {{ $rekap['hadir'] }} | Izin: {{ $rekap['izin'] }} | Sakit:
            {{ $rekap['sakit'] }} | Alpha: {{ $rekap['alpha'] }}
        </p>
    </div>

    <h3 class="section-title">Notulensi</h3>
    <div class="content-box">
        {!! nl2br(e($notulensi ?? 'Tidak ada notulensi')) !!}
    </div>

    @if(count($fotos) > 0)
        <h3 class="section-title">Dokumentasi - {{ $rapat->agenda_rapat ?? 'Rapat' }}</h3>
        <div class="photo-gallery">
            @foreach($fotos as $foto)
                <img src="{{ $foto }}" alt="Dokumentasi Rapat">
            @endforeach
        </div>
    @endif

    <div class="signature-section">
        <div class="signature-row">
            <div class="signature-box">
                <p>Pimpinan Rapat,</p>
                <div class="signature-space">
                    @if($rapat->pimpinanGuru && $rapat->pimpinanGuru->ttd)
                        <img src="{{ asset('storage/' . $rapat->pimpinanGuru->ttd) }}" alt="Tanda Tangan" class="ttd-img">
                    @endif
                </div>
                <p class="signature-name">{{ $rapat->pimpinanGuru->nama ?? '........................' }}</p>
                <p>NIP. {{ $rapat->pimpinanGuru->nip ?? '........................' }}</p>
            </div>
            <div class="signature-box">
                <p>Sekretaris,</p>
                <div class="signature-space">
                    @if($rapat->sekretarisGuru && $rapat->sekretarisGuru->ttd)
                        <img src="{{ asset('storage/' . $rapat->sekretarisGuru->ttd) }}" alt="Tanda Tangan" class="ttd-img">
                    @endif
                </div>
                <p class="signature-name">{{ $rapat->sekretarisGuru->nama ?? '........................' }}</p>
                <p>NIP. {{ $rapat->sekretarisGuru->nip ?? '........................' }}</p>
            </div>
        </div>
    </div>
@endsection

@section('styles')
    <style>
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