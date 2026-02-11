@extends('print.layout')

@section('title', 'Jurnal Kelas')

@section('content')
    <h1 class="doc-title">Jurnal Pembelajaran Kelas</h1>

    <div class="info-section">
        <div class="info-row">
            <span class="info-label">Kelas</span>
            <span class="info-value">: {{ $kelas->nama_kelas }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Wali Kelas</span>
            <span class="info-value">: {{ $kelas->waliKelas->nama ?? '-' }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Tahun Ajaran</span>
            <span class="info-value">: {{ $tahunAjaran }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Periode</span>
            <span class="info-value">: {{ $periode }}</span>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th style="width: 40px">No</th>
                <th style="width: 100px">Tanggal</th>
                <th style="width: 60px">Jam</th>
                <th>Mata Pelajaran</th>
                <th>Pengajar</th>
                <th>Materi</th>
                <th style="width: 70px">Status</th>
            </tr>
        </thead>
        <tbody>
            @forelse($data as $index => $item)
                <tr>
                    <td class="text-center">{{ $index + 1 }}</td>
                    <td>{{ $item['tanggal'] }}</td>
                    <td class="text-center">{{ $item['jam'] }}</td>
                    <td>{{ $item['mapel'] }}</td>
                    <td>{{ $item['guru'] }}</td>
                    <td>{{ $item['materi'] ?? '-' }}</td>
                    <td class="text-center {{ $item['status_class'] }}">{{ $item['status'] }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="7" class="text-center">Tidak ada data</td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <div class="signature-section">
        <div class="signature-row">
            <div class="signature-box">
                <p>Mengetahui,</p>
                <p>Wali Kelas</p>
                <div class="signature-space"></div>
                <p class="signature-name">{{ $kelas->waliKelas->nama ?? '........................' }}</p>
                <p>NIP. {{ $kelas->waliKelas->nip ?? '........................' }}</p>
            </div>
            <div class="signature-box">
                <p>Pekalongan, {{ $tanggalCetak }}</p>
                <p>Kepala Madrasah</p>
                <div class="signature-space">
                    @if(isset($qrCode))
                        <img src="{{ $qrCode }}" alt="QR Verifikasi" class="qr-code-img">
                    @endif
                </div>
                <p class="signature-name">{{ $kepalaSekolah['nama'] ?? '........................' }}</p>
                <p>NIP. {{ $kepalaSekolah['nip'] ?? '........................' }}</p>
            </div>
        </div>
    </div>
@endsection

@section('styles')
    <style>
        .qr-code-img {
            width: 80px;
            height: 80px;
            object-fit: contain;
        }
    </style>
@endsection