<!DOCTYPE html>
<html lang="id">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Link Tidak Valid - MAHAKAM APP</title>

    @php
        $logoLembaga = \App\Models\AppSetting::getValue('logo_lembaga');
        $logoUrl = $logoLembaga ? asset('storage/' . $logoLembaga) : asset('images/logo.png');
        $namaLembaga = \App\Models\AppSetting::getValue('nama_lembaga', 'MA Al-Hikam');
    @endphp

    <link rel="shortcut icon" href="{{ asset('favicon.ico') }}?v=1.1">
    <link rel="icon" type="image/png" href="{{ $logoUrl }}?v=1.1">
    <link rel="apple-touch-icon" href="{{ $logoUrl }}?v=1.1">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            background: #f0f2f5;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }

        .header {
            background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
            color: white;
            padding: 16px 20px;
            display: flex;
            align-items: center;
            gap: 12px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }

        .header img {
            width: 36px;
            height: 36px;
            border-radius: 10px;
            background: white;
            padding: 2px;
        }

        .header-text h1 {
            font-size: 0.9rem;
            font-weight: 800;
            letter-spacing: 0.5px;
        }

        .header-text p {
            font-size: 0.7rem;
            opacity: 0.85;
            font-weight: 500;
        }

        .content {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px 16px;
        }

        .error-card {
            background: white;
            border-radius: 16px;
            padding: 32px 24px;
            width: 100%;
            max-width: 380px;
            text-align: center;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
        }

        .error-icon {
            width: 64px;
            height: 64px;
            border-radius: 50%;
            background: linear-gradient(135deg, #ef4444, #f87171);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.8rem;
            margin: 0 auto 16px;
        }

        .error-card h2 {
            font-size: 1.15rem;
            color: #111;
            margin-bottom: 8px;
            font-weight: 800;
        }

        .error-card .msg {
            color: #777;
            font-size: 0.85rem;
            line-height: 1.6;
        }

        .footer {
            text-align: center;
            padding: 12px;
            color: #bbb;
            font-size: 0.65rem;
            font-weight: 600;
        }
    </style>
</head>

<body>
    <div class="header">
        <img src="{{ $logoUrl }}" alt="Logo">
        <div class="header-text">
            <h1>{{ $namaLembaga }}</h1>
            <p>Sistem Absensi Digital</p>
        </div>
    </div>

    <div class="content">
        <div class="error-card">
            <div class="error-icon"><i class="fas fa-exclamation"></i></div>
            <h2>Link Tidak Valid</h2>
            <p class="msg">{{ $message ?? 'Link absensi tidak valid atau sudah kadaluarsa.' }}</p>
        </div>
    </div>

    <div class="footer">MAHAKAM APP &copy; {{ date('Y') }} &middot; Pesan otomatis</div>
</body>

</html>