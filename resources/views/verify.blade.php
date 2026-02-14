<!DOCTYPE html>
<html lang="id">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verifikasi Dokumen - {{ $schoolName }}</title>

    <!-- Favicon -->
    <link rel="icon" type="image/png" href="{{ $logoUrl }}">
    <link rel="apple-touch-icon" href="{{ $logoUrl }}">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #0f5132 0%, #198754 50%, #20c997 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .card {
            background: #fff;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            max-width: 500px;
            width: 100%;
            overflow: hidden;
        }

        .card-header {
            background: linear-gradient(135deg, #0f5132, #198754);
            color: #fff;
            text-align: center;
            padding: 30px 20px;
        }

        .card-header img {
            width: 70px;
            height: 70px;
            border-radius: 50%;
            border: 3px solid rgba(255, 255, 255, 0.5);
            margin-bottom: 12px;
            object-fit: contain;
            background: #fff;
        }

        .card-header h1 {
            font-size: 18px;
            margin-bottom: 4px;
        }

        .card-header p {
            font-size: 13px;
            opacity: 0.85;
        }

        .card-body {
            padding: 30px;
        }

        .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: #d1e7dd;
            color: #0f5132;
            padding: 10px 20px;
            border-radius: 50px;
            font-weight: 600;
            font-size: 14px;
            margin-bottom: 24px;
        }

        .status-badge.invalid {
            background: #f8d7da;
            color: #842029;
        }

        .status-badge .icon {
            font-size: 18px;
        }

        .detail-row {
            display: flex;
            padding: 12px 0;
            border-bottom: 1px solid #eee;
        }

        .detail-row:last-child {
            border-bottom: none;
        }

        .detail-label {
            width: 140px;
            font-size: 13px;
            color: #6c757d;
            flex-shrink: 0;
        }

        .detail-value {
            flex: 1;
            font-size: 14px;
            color: #212529;
            font-weight: 500;
        }

        .footer {
            text-align: center;
            padding: 16px;
            background: #f8f9fa;
            font-size: 11px;
            color: #6c757d;
        }

        .extra-detail {
            margin-top: 16px;
            padding: 12px;
            background: #f8f9fa;
            border-radius: 8px;
            font-size: 13px;
            color: #495057;
        }

        .extra-detail strong {
            display: block;
            margin-bottom: 6px;
            color: #212529;
        }
    </style>
</head>

<body>
    <div class="card">
        <div class="card-header">
            <img src="{{ $logoUrl }}" alt="Logo">
            <h1>{{ $schoolName }}</h1>
            <p>Sistem Verifikasi Dokumen Digital</p>
        </div>

        <div class="card-body">
            @if($found)
                <div class="status-badge">
                    <span class="icon">✅</span>
                    Dokumen Terverifikasi & SAH
                </div>

                <div class="detail-row">
                    <span class="detail-label">Jenis Dokumen</span>
                    <span class="detail-value">{{ $doc->jenis_dokumen }}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Perihal</span>
                    <span class="detail-value">{{ $doc->perihal }}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Dikeluarkan Oleh</span>
                    <span class="detail-value">{{ $doc->dikeluarkan_oleh }}</span>
                </div>
                @if($doc->nip_pejabat)
                    <div class="detail-row">
                        <span class="detail-label">NIP</span>
                        <span class="detail-value">{{ $doc->nip_pejabat }}</span>
                    </div>
                @endif
                <div class="detail-row">
                    <span class="detail-label">Tanggal Dokumen</span>
                    <span
                        class="detail-value">{{ $doc->tanggal_dokumen ? $doc->tanggal_dokumen->locale('id')->translatedFormat('d F Y') : '-' }}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Tanggal Cetak</span>
                    <span class="detail-value">{{ $doc->tanggal_cetak->locale('id')->translatedFormat('d F Y') }}</span>
                </div>

                @if($doc->detail)
                    <div class="extra-detail">
                        <strong>Detail Tambahan:</strong>
                        @foreach($doc->detail as $key => $value)
                            {{ ucwords(str_replace('_', ' ', $key)) }}: {{ $value }}<br>
                        @endforeach
                    </div>
                @endif
            @else
                <div class="status-badge invalid">
                    <span class="icon">❌</span>
                    Dokumen Tidak Ditemukan
                </div>
                <p style="color: #6c757d; font-size: 14px;">
                    QR Code yang Anda scan tidak terdaftar dalam sistem. Dokumen ini mungkin tidak valid atau telah dihapus.
                </p>
            @endif
        </div>

        <div class="footer">
            &copy; {{ date('Y') }} {{ $schoolName }} — Sistem Verifikasi Dokumen Digital
        </div>
    </div>
</body>

</html>