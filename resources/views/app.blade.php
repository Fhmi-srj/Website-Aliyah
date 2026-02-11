<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">

    @php
        $namaLembaga = \App\Models\AppSetting::getValue('nama_lembaga', 'MA Al-Hikam');
        $motoLembaga = \App\Models\AppSetting::getValue('moto_lembaga', 'Sistem Informasi Madrasah');
        $logoLembaga = \App\Models\AppSetting::getValue('logo_lembaga');
        $logoUrl = $logoLembaga ? asset('storage/' . $logoLembaga) : asset('images/logo.png');
    @endphp

    <title>{{ $namaLembaga }} - SIMAKA</title>

    <!-- Meta Description -->
    <meta name="description" content="{{ $motoLembaga }}">

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="{{ url()->current() }}">
    <meta property="og:title" content="{{ $namaLembaga }} - SIMAKA">
    <meta property="og:description" content="{{ $motoLembaga }}">
    <meta property="og:image" content="{{ $logoUrl }}">

    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="{{ url()->current() }}">
    <meta property="twitter:title" content="{{ $namaLembaga }} - SIMAKA">
    <meta property="twitter:description" content="{{ $motoLembaga }}">
    <meta property="twitter:image" content="{{ $logoUrl }}">

    <!-- Favicon -->
    <link rel="icon" type="image/png" href="{{ $logoUrl }}">
    <link rel="apple-touch-icon" href="{{ $logoUrl }}">

    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css">

    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=montserrat:400,500,600,700" rel="stylesheet" />

    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/main.jsx'])
</head>

<body class="antialiased">
    <div id="app"></div>
</body>

</html>