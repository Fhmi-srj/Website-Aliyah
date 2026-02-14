<!DOCTYPE html>
<html lang="id">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Absensi Berhasil - SIMAKA</title>

    @php
        $logoLembaga = \App\Models\AppSetting::getValue('logo_lembaga');
        $logoUrl = $logoLembaga ? asset('storage/' . $logoLembaga) : asset('images/logo.png');
    @endphp

    <!-- Favicon -->
    <link rel="icon" type="image/png" href="{{ $logoUrl }}?v=1.0">
    <link rel="apple-touch-icon" href="{{ $logoUrl }}?v=1.0">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .card {
            background: white;
            border-radius: 16px;
            padding: 40px 32px;
            width: 100%;
            max-width: 420px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
            text-align: center;
        }

        .icon {
            font-size: 4rem;
            margin-bottom: 16px;
        }

        .card h1 {
            font-size: 1.5rem;
            color: #1a1a2e;
            margin-bottom: 8px;
        }

        .card p {
            color: #666;
            font-size: 0.95rem;
            line-height: 1.6;
        }

        .guru-name {
            color: #11998e;
            font-weight: 700;
            font-size: 1.1rem;
            margin-top: 16px;
        }

        .time {
            color: #999;
            font-size: 0.85rem;
            margin-top: 8px;
        }
    </style>
</head>

<body>
    <div class="card">
        <div class="icon">✅</div>
        <h1>Absensi Berhasil!</h1>
        <p>Terima kasih, absensi Anda telah tercatat.</p>
        <p class="guru-name">{{ $token->guru->nama ?? '-' }}</p>
        <p class="time">{{ now()->translatedFormat('l, d F Y H:i') }}</p>
    </div>
</body>

</html>