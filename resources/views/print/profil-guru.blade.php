@extends('print.layout')

@section('title', 'Data Guru')

@section('content')
    <h1 class="doc-title">Data Guru</h1>

    <div class="profile-header">
        @if($fotoUrl)
            <img src="{{ $fotoUrl }}" alt="Foto Guru" class="profile-photo">
        @else
            <div class="profile-photo"
                style="display: flex; align-items: center; justify-content: center; background: #f0f0f0;">
                <span style="color: #999;">Foto</span>
            </div>
        @endif
        <div class="profile-info">
            <h2 style="margin-bottom: 10px;">{{ $guru->nama }}</h2>
            <p>{{ $guru->jabatan ?? 'Guru' }}</p>
        </div>
    </div>

    <table>
        <tbody>
            <tr>
                <td style="width: 200px; font-weight: bold;">NIP</td>
                <td>{{ $guru->nip ?? '-' }}</td>
            </tr>
            <tr>
                <td style="font-weight: bold;">SK</td>
                <td>{{ $guru->sk ?? '-' }}</td>
            </tr>
            <tr>
                <td style="font-weight: bold;">Jenis Kelamin</td>
                <td>{{ $guru->jenis_kelamin == 'L' ? 'Laki-laki' : 'Perempuan' }}</td>
            </tr>
            <tr>
                <td style="font-weight: bold;">Tempat Lahir</td>
                <td>{{ $guru->tempat_lahir ?? '-' }}</td>
            </tr>
            <tr>
                <td style="font-weight: bold;">Tanggal Lahir</td>
                <td>{{ $tanggalLahir }}</td>
            </tr>
            <tr>
                <td style="font-weight: bold;">Alamat</td>
                <td>{{ $guru->alamat ?? '-' }}</td>
            </tr>
            <tr>
                <td style="font-weight: bold;">Kontak</td>
                <td>{{ $guru->kontak ?? '-' }}</td>
            </tr>
            <tr>
                <td style="font-weight: bold;">Pendidikan</td>
                <td>{{ $guru->pendidikan ?? '-' }}</td>
            </tr>
            <tr>
                <td style="font-weight: bold;">TMT (Terhitung Mulai Tanggal)</td>
                <td>{{ $tmt }}</td>
            </tr>
            <tr>
                <td style="font-weight: bold;">Status</td>
                <td>{{ $guru->status ?? 'Aktif' }}</td>
            </tr>
        </tbody>
    </table>

    <div class="signature-section">
        <div class="signature-row">
            <div class="signature-box"></div>
            <div class="signature-box">
                <p>Pekalongan, {{ $tanggalCetak }}</p>
                <p>Yang bersangkutan,</p>
                <div class="signature-space">
                    @if(isset($qrCode))
                        <img src="{{ $qrCode }}" alt="QR Verifikasi" class="qr-code-img"
                            style="width:70px;height:70px;margin:3px auto;display:block;">
                    @endif
                </div>
                <p class="signature-name">{{ $guru->nama }}</p>
                <p>NIP. {{ $guru->nip ?? '-' }}</p>
            </div>
        </div>
    </div>
@endsection