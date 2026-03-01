@extends('print.layout')

@section('title', 'Jurnal Mengajar Guru')

@section('content')

    <h1 class="doc-title">Jurnal Mengajar Guru</h1>

    <div class="info-section">
        <div class="info-row">
            <span class="info-label">Nama Guru</span>
            <span class="info-value">: {{ $guru->nama }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">NIP</span>
            <span class="info-value">: {{ $guru->nip ?? '-' }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Jabatan</span>
            <span class="info-value">: {{ $guru->jabatan ?? 'Guru' }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Periode</span>
            <span class="info-value">: {{ $periode }}</span>
        </div>
        @if($mapelFilter)
            <div class="info-row">
                <span class="info-label">Mata Pelajaran</span>
                <span class="info-value">: {{ $mapelFilter }}</span>
            </div>
        @endif
        @if($kelasFilter)
            <div class="info-row">
                <span class="info-label">Kelas</span>
                <span class="info-value">: {{ $kelasFilter }}</span>
            </div>
        @endif
    </div>

    <table>
        <thead>
            <tr>
                <th style="width: 25px" rowspan="2">No</th>
                <th style="width: 75px" rowspan="2">Hari</th>
                <th style="width: 50px" rowspan="2">Kelas</th>
                <th rowspan="2">Mapel</th>
                <th style="width: 35px" rowspan="2">Jam Ke</th>
                <th rowspan="2">Ringkasan Materi</th>
                <th colspan="4" style="text-align: center">Siswa</th>
                <th style="width: 90px" rowspan="2">Berita Acara</th>
            </tr>
            <tr>
                <th style="width: 25px; font-size: 9pt">H</th>
                <th style="width: 25px; font-size: 9pt">S</th>
                <th style="width: 25px; font-size: 9pt">I</th>
                <th style="width: 25px; font-size: 9pt">A</th>
            </tr>
        </thead>
        <tbody>
            @forelse($data as $index => $item)
                <tr>
                    <td class="text-center">{{ $index + 1 }}</td>
                    <td>{{ $item['hari'] }}<br><small>{{ $item['tanggal_short'] }}</small></td>
                    <td class="text-center">{{ $item['kelas'] }}</td>
                    <td>{{ $item['mapel'] }}</td>
                    <td class="text-center">{{ $item['jam_ke'] }}</td>
                    <td>{{ $item['materi'] ?? '-' }}</td>
                    <td class="text-center">{{ $item['siswa_hadir'] }}</td>
                    <td class="text-center">{{ $item['siswa_sakit'] }}</td>
                    <td class="text-center">{{ $item['siswa_izin'] }}</td>
                    <td class="text-center">{{ $item['siswa_alpha'] }}</td>
                    <td>{{ $item['berita_acara'] ?? '-' }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="11" class="text-center">Tidak ada data</td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <div class="info-section">
        <p><strong>Rekap Kehadiran Guru:</strong></p>
        <p>Total Pertemuan: {{ $rekap['total'] }} | Hadir: {{ $rekap['hadir'] }} | Izin: {{ $rekap['izin'] }} | Sakit:
            {{ $rekap['sakit'] }} | Alpha: {{ $rekap['alpha'] }}
        </p>
    </div>

    <div class="signature-section">
        <div class="signature-row">
            <div class="signature-box">
                <p>Mengetahui,</p>
                <p>Kepala Madrasah</p>
                <div class="signature-space">
                    @if(isset($qrCode))
                        <img src="{{ $qrCode }}" alt="QR Verifikasi" class="qr-code-img"
                            style="width:70px;height:70px;margin:3px auto;display:block;">
                    @endif
                </div>
                <p class="signature-name">{{ $kepalaSekolah['nama'] ?? '........................' }}</p>
                <p>NIP. {{ $kepalaSekolah['nip'] ?? '........................' }}</p>
            </div>
            <div class="signature-box">
                <p>Pekalongan, {{ $tanggalCetak }}</p>
                <p>Guru yang bersangkutan,</p>
                <div class="signature-space"></div>
                <p class="signature-name">{{ $guru->nama }}</p>
                <p>NIP. {{ $guru->nip ?? '-' }}</p>
            </div>
        </div>
    </div>
@endsection