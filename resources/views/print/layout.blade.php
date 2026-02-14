<!DOCTYPE html>
<html lang="id">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>@yield('title', 'Cetak Dokumen')</title>

    @php
        $logoLembaga = \App\Models\AppSetting::getValue('logo_lembaga');
        $logoUrlFavicon = $logoLembaga ? asset('storage/' . $logoLembaga) : asset('images/logo.png');
    @endphp

    <!-- Favicon -->
    <link rel="icon" type="image/png" href="{{ $logoUrlFavicon }}">
    <link rel="apple-touch-icon" href="{{ $logoUrlFavicon }}">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        @page {
            size: A4;
            margin: 1cm;
        }

        body {
            font-family: 'Times New Roman', Times, serif;
            font-size: 12pt;
            line-height: 1.5;
            color: #000;
            background: #fff;
        }

        .print-container {
            max-width: 21cm;
            margin: 0 auto;
            padding: 0.5cm;
        }

        /* Kop Surat */
        .kop-surat {
            text-align: center;
            margin-bottom: 20px;
        }

        .kop-surat img {
            max-width: 100%;
            height: auto;
            max-height: 3cm;
        }

        .kop-line {
            border-bottom: 2px solid #000;
            margin: 10px 0 20px 0;
        }

        /* Document Title */
        .doc-title {
            text-align: center;
            font-size: 14pt;
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 20px;
            text-decoration: underline;
        }

        /* Info Section */
        .info-section {
            margin-bottom: 20px;
        }

        .info-row {
            display: flex;
            margin-bottom: 5px;
        }

        .info-label {
            width: 150px;
            font-weight: normal;
        }

        .info-value {
            flex: 1;
        }

        /* Tables */
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }

        th,
        td {
            border: 1px solid #000;
            padding: 8px;
            text-align: left;
            vertical-align: top;
        }

        th {
            background-color: #f0f0f0;
            font-weight: bold;
            text-align: center;
        }

        .text-center {
            text-align: center;
        }

        .text-right {
            text-align: right;
        }

        /* Status Badges */
        .status-hadir {
            color: #16a34a;
            font-weight: bold;
        }

        .status-izin {
            color: #2563eb;
            font-weight: bold;
        }

        .status-sakit {
            color: #d97706;
            font-weight: bold;
        }

        .status-alpha {
            color: #dc2626;
            font-weight: bold;
        }

        /* Sections */
        .section-title {
            font-size: 12pt;
            font-weight: bold;
            margin: 20px 0 10px 0;
            text-decoration: underline;
        }

        .content-box {
            border: 1px solid #ccc;
            padding: 15px;
            margin-bottom: 20px;
            min-height: 100px;
        }

        /* Photo Gallery */
        .photo-gallery {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-bottom: 20px;
        }

        .photo-gallery img {
            max-width: 200px;
            max-height: 150px;
            border: 1px solid #ccc;
            object-fit: cover;
        }

        /* Signature Section */
        .signature-section {
            margin-top: 40px;
            page-break-inside: avoid;
        }

        .signature-row {
            display: flex;
            justify-content: space-around;
            margin: 0 3%;
        }

        .signature-box {
            text-align: center;
            width: 40%;
        }

        .signature-space {
            height: 80px;
        }

        .signature-name {
            font-weight: bold;
            text-decoration: underline;
            white-space: nowrap;
        }

        /* Profile Photo */
        .profile-photo {
            width: 3cm;
            height: 4cm;
            border: 1px solid #000;
            object-fit: cover;
            margin-bottom: 15px;
        }

        .profile-header {
            display: flex;
            gap: 20px;
            margin-bottom: 20px;
        }

        .profile-info {
            flex: 1;
        }

        /* Page Break */
        .page-break {
            page-break-after: always;
        }

        /* Print Styles */
        @media print {
            body {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }

            .no-print {
                display: none !important;
            }

            .print-container {
                padding: 0;
            }
        }

        /* Screen Styles (Print Preview) */
        @media screen {
            body {
                background: #e5e7eb;
                padding: 20px;
            }

            .print-container {
                background: #fff;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                border-radius: 4px;
            }

            .no-print {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 1000;
            }

            .print-btn {
                background: #16a34a;
                color: #fff;
                border: none;
                padding: 12px 24px;
                font-size: 14px;
                cursor: pointer;
                border-radius: 8px;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .print-btn:hover {
                background: #15803d;
            }
        }
    </style>
    @yield('styles')
</head>

<body>
    <div class="no-print">
        <button class="print-btn" onclick="window.print()">
            🖨️ Cetak / Save PDF
        </button>
    </div>

    <div class="print-container">
        @if($kopUrl ?? false)
            <div class="kop-surat">
                <img src="{{ $kopUrl }}" alt="Kop Surat">
            </div>
        @endif

        @yield('content')
    </div>

    @yield('scripts')

    <script>
        // Auto-print when page loads
        window.onload = function() {
            setTimeout(function() {
                window.print();
            }, 500);
        };
    </script>
</body>

</html>