@extends('print.layout')

@section('title', 'Jurnal Mengajar Guru')

@section('content')
    @php
        $logoLembaga = \App\Models\AppSetting::getValue('logo_lembaga');
        $namaLembaga = \App\Models\AppSetting::getValue('nama_lembaga') ?? 'Madrasah Aliyah';
        $motoLembaga = \App\Models\AppSetting::getValue('moto_lembaga');
        $alamatLembaga = \App\Models\AppSetting::getValue('alamat_lembaga');
        $logoUrl = $logoLembaga ? asset('storage/' . $logoLembaga) : null;
    @endphp

    @foreach($sections as $idx => $section)
        <div class="{{ $idx > 0 ? 'section-break' : '' }}">
            <div
                style="display:flex;align-items:center;gap:10px;margin-bottom:6px;padding-bottom:6px;border-bottom:2px solid #8B0000;">
                @if($logoUrl)
                    <img src="{{ $logoUrl }}" alt="Logo" style="width:45px;height:45px;object-fit:contain;">
                @endif
                <div>
                    <p style="font-size:12pt;font-weight:bold;color:#8B0000;margin:0;line-height:1.2;">
                        {{ strtoupper($namaLembaga) }}</p>
                    @if($motoLembaga)
                        <p style="font-size:7.5pt;color:#555;font-style:italic;margin:0;">"{{ $motoLembaga }}"</p>
                    @endif
                    @if($alamatLembaga)
                        <p style="font-size:7pt;color:#777;margin:0;">{{ $alamatLembaga }}</p>
                    @endif
                </div>
            </div>

            <h1 class="doc-title">Jurnal Mengajar Guru</h1>

            <div class="info-section">
                <div class="info-row">
                    <span class="info-label">Nama Guru</span>
                    <span class="info-value">: {{ $section['guru']->nama }}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">NIP</span>
                    <span class="info-value">: {{ $section['guru']->nip ?? '-' }}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Jabatan</span>
                    <span class="info-value">: {{ $section['guru']->jabatan ?? 'Guru' }}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Periode</span>
                    <span class="info-value">: {{ $section['bulanNama'] }}</span>
                </div>
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
                    @forelse($section['data'] as $index => $item)
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
                <p>Total Pertemuan: {{ $section['rekap']['total'] }} | Hadir: {{ $section['rekap']['hadir'] }} | Izin:
                    {{ $section['rekap']['izin'] }} | Sakit:
                    {{ $section['rekap']['sakit'] }} | Alpha: {{ $section['rekap']['alpha'] }}
                </p>
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
                        <p class="signature-name">{{ $kepalaSekolah['nama'] ?? '........................' }}</p>
                        <p>NIP. {{ $kepalaSekolah['nip'] ?? '........................' }}</p>
                    </div>
                    <div class="signature-box">
                        <p>Pekalongan, {{ $tanggalCetak }}</p>
                        <p>Guru yang bersangkutan,</p>
                        <div class="signature-space"></div>
                        <p class="signature-name">{{ $section['guru']->nama }}</p>
                        <p>NIP. {{ $section['guru']->nip ?? '-' }}</p>
                    </div>
                </div>
            </div>
        </div>
    @endforeach
@endsection

@section('styles')
    <style>
        .section-break {
            page-break-before: always;
        }

        .qr-code-img {
            width: 70px;
            height: 70px;
            margin: 3px auto;
            display: block;
        }
    </style>
@endsection