<!DOCTYPE html>
<html lang="id">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Link Tidak Valid - SIMAKA</title>

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
            background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%);
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
            margin-bottom: 12px;
        }

        .card p {
            color: #666;
            font-size: 0.95rem;
            line-height: 1.6;
        }
    </style>
</head>

<body>
    <div class="card">
        <div class="icon">⚠️</div>
        <h1>Link Tidak Valid</h1>
        <p>{{ $message ?? 'Link absensi tidak valid atau sudah kadaluarsa.' }}</p>
    </div>
</body>

</html>