@extends('print.layout')

@section('title', 'Laporan Kegiatan')

@section('content')
    <h1 class="doc-title">Laporan Kegiatan</h1>

    <div class="info-section">
        <div class="info-row">
            <span class="info-label">Nama Kegiatan</span>
            <span class="info-value">: {{ $kegiatan->nama_kegiatan }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Tanggal</span>
            <span class="info-value">: {{ $tanggalKegiatan }}</span>
        </div>
        @if($waktuMulai !== '00:00' || $waktuSelesai !== '00:00')
            <div class="info-row">
                <span class="info-label">Waktu</span>
                <span class="info-value">: {{ $waktuMulai }} - {{ $waktuSelesai }}</span>
            </div>
        @endif
        <div class="info-row">
            <span class="info-label">Tempat</span>
            <span class="info-value">: {{ $kegiatan->tempat ?? '-' }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Penanggung Jawab</span>
            <span class="info-value">: {{ $kegiatan->penanggungJawab->nama ?? '-' }}</span>
        </div>
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
            @forelse($pendamping as $index => $p)
                <tr>
                    <td class="text-center">{{ $index + 1 }}</td>
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
        <p><strong>Rekap Kehadiran Guru:</strong> Hadir: {{ $rekapPendamping['hadir'] }} | Izin:
            {{ $rekapPendamping['izin'] }} | Sakit: {{ $rekapPendamping['sakit'] }} | Alpha: {{ $rekapPendamping['alpha'] }}
        </p>
    </div>

    @if(count($siswa) > 0)
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
                @foreach($siswa as $index => $s)
                    <tr>
                        <td class="text-center">{{ $index + 1 }}</td>
                        <td>{{ $s['nama'] }}</td>
                        <td>{{ $s['kelas'] ?? '-' }}</td>
                        <td class="text-center {{ $s['status_class'] }}">{{ $s['status'] }}</td>
                        <td>{{ $s['keterangan'] ?? '-' }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>

        <div class="info-section">
            <p><strong>Rekap Kehadiran Siswa:</strong> Hadir: {{ $rekapSiswa['hadir'] }} | Izin: {{ $rekapSiswa['izin'] }} |
                Sakit: {{ $rekapSiswa['sakit'] }} | Alpha: {{ $rekapSiswa['alpha'] }}</p>
        </div>
    @endif

    <h3 class="section-title">Berita Acara</h3>
    <div class="content-box">
        {!! nl2br(e($beritaAcara ?? 'Tidak ada berita acara')) !!}
    </div>

    <div class="signature-section">
        <div class="signature-row">
            <div class="signature-box">
                <p>&nbsp;</p>
                <p>Mengetahui,</p>
                <p>Kepala Madrasah</p>
                <div class="signature-space">
                    @if(isset($qrCode))
                        <img src="{{ $qrCode }}" alt="QR Verifikasi" class="qr-code-img">
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
                    @if(isset($qrPJ))
                        <img src="{{ $qrPJ }}" alt="QR Verifikasi" class="qr-code-img">
                    @endif
                </div>
                <p class="signature-name">{{ $kegiatan->penanggungJawab->nama ?? '........................' }}</p>
                <p>NIP. {{ $kegiatan->penanggungJawab->nip ?? '........................' }}</p>
            </div>
        </div>
    </div>

    @if(count($fotos) > 0)
        <div style="page-break-before: always;"></div>
        <h3 class="section-title">Dokumentasi - {{ $kegiatan->nama_kegiatan }}</h3>
        <div class="photo-gallery-large">
            @foreach($fotos as $fotoIndex => $foto)
                <div class="photo-item-large">
                    <img src="{{ $foto }}" alt="Dokumentasi Kegiatan">
                    <p class="photo-caption">Foto {{ $fotoIndex + 1 }} - {{ $kegiatan->nama_kegiatan }}</p>
                </div>
            @endforeach
        </div>
    @endif
@endsection

@section('styles')
    <style>
        .page-break {
            page-break-before: always;
            margin-top: 30px;
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
            .page-break {
                page-break-before: always;
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