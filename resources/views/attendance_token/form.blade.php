<!DOCTYPE html>
<html lang="id">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Absensi - SIMAKA</title>

    @php
        $logoLembaga = \App\Models\AppSetting::getValue('logo_lembaga');
        $logoUrl = $logoLembaga ? asset('storage/' . $logoLembaga) : asset('images/logo.png');
    @endphp

    <!-- Favicon -->
    <link rel="shortcut icon" href="{{ asset('favicon.ico') }}?v=1.1">
    <link rel="icon" type="image/png" href="{{ $logoUrl }}?v=1.1">
    <link rel="apple-touch-icon" href="{{ $logoUrl }}?v=1.1">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .card {
            background: white;
            border-radius: 16px;
            padding: 32px;
            width: 100%;
            max-width: 480px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .card h1 {
            font-size: 1.5rem;
            color: #1a1a2e;
            margin-bottom: 8px;
            text-align: center;
        }

        .card .subtitle {
            color: #666;
            text-align: center;
            margin-bottom: 24px;
            font-size: 0.9rem;
        }

        .info-box {
            background: #f0f4ff;
            border: 1px solid #d0d8f0;
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 24px;
        }

        .info-box .row {
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
            font-size: 0.9rem;
        }

        .info-box .row .label {
            color: #555;
            font-weight: 500;
        }

        .info-box .row .value {
            color: #1a1a2e;
            font-weight: 600;
            text-align: right;
        }

        .form-group {
            margin-bottom: 16px;
        }

        .form-group label {
            display: block;
            font-size: 0.85rem;
            font-weight: 600;
            color: #333;
            margin-bottom: 6px;
        }

        .form-group textarea,
        .form-group input {
            width: 100%;
            padding: 12px;
            border: 2px solid #e0e0e0;
            border-radius: 10px;
            font-size: 0.9rem;
            font-family: inherit;
            transition: border-color 0.2s;
            outline: none;
        }

        .form-group textarea:focus,
        .form-group input:focus {
            border-color: #667eea;
        }

        .form-group textarea {
            resize: vertical;
            min-height: 80px;
        }

        .btn {
            width: 100%;
            padding: 14px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.1s, opacity 0.2s;
        }

        .btn:hover {
            opacity: 0.9;
        }

        .btn:active {
            transform: scale(0.98);
        }

        .guru-name {
            text-align: center;
            font-size: 1.1rem;
            font-weight: 700;
            color: #667eea;
            margin-bottom: 4px;
        }
    </style>
</head>

<body>
    <div class="card">
        <h1>📋 Form Absensi</h1>
        <p class="guru-name">{{ $token->guru->nama ?? '-' }}</p>
        <p class="subtitle">
            @if($token->type === 'mengajar') Absensi Mengajar
            @elseif($token->type === 'kegiatan') Absensi Kegiatan
            @else Absensi Rapat @endif
        </p>

        <div class="info-box">
            @if($token->type === 'mengajar' && $reference)
                <div class="row"><span class="label">Mapel</span><span
                        class="value">{{ $reference->mapel->nama ?? '-' }}</span></div>
                <div class="row"><span class="label">Kelas</span><span
                        class="value">{{ $reference->kelas->nama ?? '-' }}</span></div>
                <div class="row"><span class="label">Jam</span><span class="value">{{ $reference->jam_mulai }} -
                        {{ $reference->jam_selesai }}</span></div>
                <div class="row"><span class="label">Hari</span><span class="value">{{ $reference->hari }}</span></div>
            @elseif($token->type === 'kegiatan' && $reference)
                <div class="row"><span class="label">Kegiatan</span><span
                        class="value">{{ $reference->nama_kegiatan }}</span></div>
                <div class="row"><span class="label">Tempat</span><span class="value">{{ $reference->tempat ?? '-' }}</span>
                </div>
                <div class="row"><span class="label">Waktu</span><span
                        class="value">{{ \Carbon\Carbon::parse($reference->waktu_mulai)->format('H:i') }}</span></div>
            @elseif($token->type === 'rapat' && $reference)
                <div class="row"><span class="label">Agenda</span><span class="value">{{ $reference->agenda_rapat }}</span>
                </div>
                <div class="row"><span class="label">Tempat</span><span class="value">{{ $reference->tempat ?? '-' }}</span>
                </div>
                <div class="row"><span class="label">Waktu</span><span class="value">{{ $reference->waktu_mulai }} -
                        {{ $reference->waktu_selesai }}</span></div>
            @endif
            <div class="row"><span class="label">Tanggal</span><span
                    class="value">{{ $token->tanggal->translatedFormat('d F Y') }}</span></div>
        </div>

        <form method="POST" action="{{ url('/api/absen/' . $token->token) }}">
            @csrf

            @if($token->type === 'mengajar')
                <div class="form-group">
                    <label>Ringkasan Materi (opsional)</label>
                    <textarea name="ringkasan_materi" placeholder="Tuliskan ringkasan materi yang diajarkan..."></textarea>
                </div>
            @endif

            <div class="form-group">
                <label>Keterangan (opsional)</label>
                <input type="text" name="keterangan" placeholder="Hadir" value="Hadir (via link WA)">
            </div>

            <button type="submit" class="btn">✅ Submit Absensi</button>
        </form>
    </div>
</body>

</html>