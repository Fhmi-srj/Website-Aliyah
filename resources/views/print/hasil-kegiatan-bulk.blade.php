@extends('print.layout')

@section('title', 'Laporan Kegiatan')

@section('content')
    @foreach($kegiatanList as $index => $item)
        @if($index > 0)
            <div style="page-break-before: always;"></div>
            @if($kopUrl ?? false)
                <div class="kop-surat">
                    <img src="{{ $kopUrl }}" alt="Kop Surat">
                </div>
            @endif
        @endif

        <h1 class="doc-title">Laporan Kegiatan</h1>

        <div class="info-section">
            <div class="info-row">
                <span class="info-label">Nama Kegiatan</span>
                <span class="info-value">: {{ $item['kegiatan']->nama_kegiatan }}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Tanggal</span>
                <span class="info-value">: {{ $item['tanggalKegiatan'] }}</span>
            </div>
            @if($item['waktuMulai'] !== '00:00' || $item['waktuSelesai'] !== '00:00')
                <div class="info-row">
                    <span class="info-label">Waktu</span>
                    <span class="info-value">: {{ $item['waktuMulai'] }} - {{ $item['waktuSelesai'] }}</span>
                </div>
            @endif
            <div class="info-row">
                <span class="info-label">Tempat</span>
                <span class="info-value">: {{ $item['kegiatan']->tempat ?? '-' }}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Penanggung Jawab</span>
                <span class="info-value">: {{ $item['kegiatan']->penanggungJawab->nama ?? '-' }}</span>
            </div>
        </div>

        <h3 class="section-title">Berita Acara</h3>
        <div class="content-box">
            {!! nl2br(e($item['beritaAcara'] ?? 'Tidak ada berita acara')) !!}
        </div>

        <h3 class="section-title">Absensi Koordinator & Pendamping</h3>
        <table>
            <thead>
                <tr>
                    <th style="width: 40px">No</th>
                    <th>Nama</th>
                    <th>Jabatan</th>
                    <th style="width: 80px">Status</th>
                    <th>Keterangan</th>
                </tr>
            </thead>
            <tbody>
                @forelse($item['pendamping'] as $pIndex => $p)
                    <tr>
                        <td class="text-center">{{ $pIndex + 1 }}</td>
                        <td>{{ $p['nama'] }}</td>
                        <td>{{ $p['jabatan'] ?? '-' }}</td>
                        <td class="text-center {{ $p['status_class'] }}">{{ $p['status'] }}</td>
                        <td>{{ $p['keterangan'] ?? '-' }}</td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="5" class="text-center">Tidak ada data koordinator/pendamping</td>
                    </tr>
                @endforelse
            </tbody>
        </table>

        <div class="info-section">
            <p><strong>Rekap Kehadiran Guru:</strong> Hadir: {{ $item['rekapPendamping']['hadir'] }} | Izin:
                {{ $item['rekapPendamping']['izin'] }} | Sakit: {{ $item['rekapPendamping']['sakit'] }} | Alpha:
                {{ $item['rekapPendamping']['alpha'] }}
            </p>
        </div>

        @if(count($item['siswa']) > 0)
            <h3 class="section-title">Absensi Siswa</h3>
            <table>
                <thead>
                    <tr>
                        <th style="width: 40px">No</th>
                        <th>Nama</th>
                        <th>Kelas</th>
                        <th style="width: 80px">Status</th>
                        <th>Keterangan</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($item['siswa'] as $sIndex => $s)
                        <tr>
                            <td class="text-center">{{ $sIndex + 1 }}</td>
                            <td>{{ $s['nama'] }}</td>
                            <td>{{ $s['kelas'] ?? '-' }}</td>
                            <td class="text-center {{ $s['status_class'] }}">{{ $s['status'] }}</td>
                            <td>{{ $s['keterangan'] ?? '-' }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>

            <div class="info-section">
                <p><strong>Rekap Kehadiran Siswa:</strong> Hadir: {{ $item['rekapSiswa']['hadir'] }} | Izin:
                    {{ $item['rekapSiswa']['izin'] }} | Sakit: {{ $item['rekapSiswa']['sakit'] }} | Alpha:
                    {{ $item['rekapSiswa']['alpha'] }}
                </p>
            </div>
        @endif

        <div class="signature-section">
            <div class="signature-row">
                <div class="signature-box">
                    <p>&nbsp;</p>
                    <p>Mengetahui,</p>
                    <p>Kepala Madrasah</p>
                    <div class="signature-space">
                        @if(isset($item['qrCode']))
                            <img src="{{ $item['qrCode'] }}" alt="QR Verifikasi" class="qr-code-img">
                        @endif
                    </div>
                    <p class="signature-name">{{ $kepalaSekolah['nama'] ?? '........................' }}</p>
                    <p>NIP. {{ $kepalaSekolah['nip'] ?? '........................' }}</p>
                </div>
                <div class="signature-box">
                    <p>Pekalongan, {{ $tanggalCetak }}</p>
                    <p>&nbsp;</p>
                    <p>Penanggung Jawab,</p>
                    <div class="signature-space">
                        @if(isset($item['qrPJ']))
                            <img src="{{ $item['qrPJ'] }}" alt="QR Verifikasi" class="qr-code-img">
                        @endif
                    </div>
                    <p class="signature-name">{{ $item['kegiatan']->penanggungJawab->nama ?? '........................' }}</p>
                    <p>NIP. {{ $item['kegiatan']->penanggungJawab->nip ?? '........................' }}</p>
                </div>
            </div>
        </div>

        @if(count($item['fotos']) > 0)
            <div style="page-break-before: always;"></div>
            <h3 class="section-title">Dokumentasi - {{ $item['kegiatan']->nama_kegiatan }}</h3>
            <div class="photo-gallery-large">
                @foreach($item['fotos'] as $fotoIndex => $foto)
                    <div class="photo-item-large">
                        <img src="{{ $foto }}" alt="Dokumentasi Kegiatan">
                        <p class="photo-caption">Foto {{ $fotoIndex + 1 }} - {{ $item['kegiatan']->nama_kegiatan }}</p>
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

        @media print {
            .photo-item-large {
                width: 48%;
            }

            .photo-item-large img {
                max-height: 280px;
            }
        }

        .qr-code-img {
            width: 80px;
            height: 80px;
            object-fit: contain;
        }
    </style>
@endsection