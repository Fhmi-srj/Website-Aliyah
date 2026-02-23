@extends('print.layout')

@section('title', 'Data Guru')

@section('styles')
    <style>
        /* Profile Card Design */
        .profile-card {
            border: 2px solid #16a34a;
            border-radius: 12px;
            overflow: hidden;
            margin-bottom: 25px;
        }

        .profile-card-header {
            background: linear-gradient(135deg, #16a34a 0%, #15803d 50%, #166534 100%);
            padding: 25px 30px;
            display: flex;
            align-items: center;
            gap: 24px;
            color: #fff;
        }

        .profile-card-header .photo-frame {
            width: 3cm;
            height: 4cm;
            border-radius: 10px;
            border: 3px solid rgba(255, 255, 255, 0.5);
            object-fit: cover;
            flex-shrink: 0;
            background: rgba(255, 255, 255, 0.15);
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .profile-card-header .photo-frame img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 8px;
        }

        .profile-card-header .photo-placeholder {
            color: rgba(255, 255, 255, 0.5);
            font-size: 10pt;
            text-align: center;
        }

        .profile-card-header .header-info h2 {
            font-size: 18pt;
            font-weight: bold;
            margin-bottom: 4px;
            letter-spacing: 0.3px;
        }

        .profile-card-header .header-info .jabatan {
            font-size: 11pt;
            opacity: 0.85;
            font-style: italic;
        }

        .profile-card-header .header-info .nip-badge {
            display: inline-block;
            margin-top: 8px;
            background: rgba(255, 255, 255, 0.2);
            padding: 4px 14px;
            border-radius: 20px;
            font-size: 10pt;
            letter-spacing: 0.5px;
        }

        /* Data Section */
        .data-section {
            margin-bottom: 25px;
        }

        .data-section-title {
            font-family: 'Times New Roman', serif;
            font-size: 12pt;
            font-weight: bold;
            color: #16a34a;
            border-bottom: 2px solid #16a34a;
            padding-bottom: 6px;
            margin-bottom: 12px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .data-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0;
        }

        .data-item {
            padding: 10px 14px;
            border-bottom: 1px solid #e5e7eb;
            display: flex;
            flex-direction: column;
        }

        .data-item:nth-child(odd) {
            border-right: 1px solid #e5e7eb;
        }

        .data-item .data-label {
            font-size: 8pt;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            margin-bottom: 3px;
            font-family: Arial, sans-serif;
        }

        .data-item .data-value {
            font-size: 11pt;
            color: #111;
            font-weight: 500;
        }

        .data-item.full-width {
            grid-column: 1 / -1;
            border-right: none;
        }

        /* Status Badge */
        .status-badge {
            display: inline-block;
            padding: 3px 14px;
            border-radius: 20px;
            font-size: 10pt;
            font-weight: bold;
        }

        .status-badge.aktif {
            background: #dcfce7;
            color: #16a34a;
        }

        .status-badge.nonaktif {
            background: #fee2e2;
            color: #dc2626;
        }

        /* Signature Override */
        .signature-section {
            margin-top: 35px;
            page-break-inside: avoid;
        }

        .signature-row {
            display: flex;
            justify-content: flex-end;
            margin-right: 5%;
        }

        .signature-box {
            text-align: center;
            width: 45%;
        }

        .qr-frame {
            display: inline-block;
            padding: 5px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            margin: 5px auto;
        }

        .qr-frame img {
            display: block;
        }

        /* Print overrides */
        @media print {
            .profile-card-header {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }

            .status-badge {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }

            .data-section-title {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
        }
    </style>
@endsection

@section('content')
    <h1 class="doc-title">Data Guru</h1>

    {{-- Profile Card --}}
    <div class="profile-card">
        <div class="profile-card-header">
            <div class="photo-frame">
                @if($fotoUrl)
                    <img src="{{ $fotoUrl }}" alt="Foto {{ $guru->nama }}">
                @else
                    <div class="photo-placeholder">Foto<br>Guru</div>
                @endif
            </div>
            <div class="header-info">
                <h2>{{ $guru->nama }}</h2>
                <div class="jabatan">{{ $guru->jabatan ?? 'Guru' }}</div>
                @if($guru->nip)
                    <div class="nip-badge">NIP. {{ $guru->nip }}</div>
                @endif
            </div>
        </div>
    </div>

    {{-- Data Pribadi --}}
    <div class="data-section">
        <div class="data-section-title">Data Pribadi</div>
        <div class="data-grid">
            <div class="data-item">
                <span class="data-label">NIP</span>
                <span class="data-value">{{ $guru->nip ?? '-' }}</span>
            </div>
            <div class="data-item">
                <span class="data-label">SK</span>
                <span class="data-value">{{ $guru->sk ?? '-' }}</span>
            </div>
            <div class="data-item">
                <span class="data-label">Jenis Kelamin</span>
                <span class="data-value">{{ $guru->jenis_kelamin == 'L' ? 'Laki-laki' : 'Perempuan' }}</span>
            </div>
            <div class="data-item">
                <span class="data-label">Pendidikan</span>
                <span class="data-value">{{ $guru->pendidikan ?? '-' }}</span>
            </div>
            <div class="data-item">
                <span class="data-label">Tempat Lahir</span>
                <span class="data-value">{{ $guru->tempat_lahir ?? '-' }}</span>
            </div>
            <div class="data-item">
                <span class="data-label">Tanggal Lahir</span>
                <span class="data-value">{{ $tanggalLahir }}</span>
            </div>
            <div class="data-item full-width">
                <span class="data-label">Alamat</span>
                <span class="data-value">{{ $guru->alamat ?? '-' }}</span>
            </div>
        </div>
    </div>

    {{-- Informasi Kepegawaian --}}
    <div class="data-section">
        <div class="data-section-title">Informasi Kepegawaian</div>
        <div class="data-grid">
            <div class="data-item">
                <span class="data-label">Kontak</span>
                <span class="data-value">{{ $guru->kontak ?? '-' }}</span>
            </div>
            <div class="data-item">
                <span class="data-label">TMT (Terhitung Mulai Tanggal)</span>
                <span class="data-value">{{ $tmt }}</span>
            </div>
            <div class="data-item">
                <span class="data-label">Status</span>
                <span class="data-value">
                    <span
                        class="status-badge {{ strtolower($guru->status ?? 'aktif') === 'aktif' ? 'aktif' : 'nonaktif' }}">
                        {{ $guru->status ?? 'Aktif' }}
                    </span>
                </span>
            </div>
            <div class="data-item">
                <span class="data-label">Jabatan</span>
                <span class="data-value">{{ $guru->jabatan ?? 'Guru' }}</span>
            </div>
        </div>
    </div>

    {{-- Signature --}}
    <div class="signature-section">
        <div class="signature-row">
            <div class="signature-box">
                <p>Pekalongan, {{ $tanggalCetak }}</p>
                <p>Yang bersangkutan,</p>
                <div class="signature-space">
                    @if(isset($qrCode))
                        <div class="qr-frame">
                            <img src="{{ $qrCode }}" alt="QR Verifikasi" style="width:70px;height:70px;">
                        </div>
                    @endif
                </div>
                <p class="signature-name">{{ $guru->nama }}</p>
                <p>NIP. {{ $guru->nip ?? '-' }}</p>
            </div>
        </div>
    </div>
@endsection