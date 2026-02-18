<!DOCTYPE html>
<html lang="id">

<head>
    <meta charset="UTF-8">
    <title>{{ $title ?? 'Laporan Data' }}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        @page {
            size:
                {{ $orientation ?? 'portrait' }}
            ;
            margin: 1cm;
        }

        body {
            font-family: 'Times New Roman', Times, serif;
            font-size: 11pt;
            line-height: 1.4;
            color: #000;
        }

        /* Kop Surat */
        .kop-surat {
            text-align: center;
            margin-bottom: 15px;
        }

        .kop-surat img {
            max-width: 100%;
            height: auto;
            max-height: 2.5cm;
        }

        .kop-line {
            border-bottom: 3px double #000;
            margin: 8px 0 15px 0;
        }

        /* Title */
        .doc-title {
            text-align: center;
            font-size: 14pt;
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 5px;
        }

        .doc-subtitle {
            text-align: center;
            font-size: 10pt;
            color: #555;
            margin-bottom: 15px;
        }

        /* Table */
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            font-size: 9pt;
        }

        th,
        td {
            border: 1px solid #333;
            padding: 4px 6px;
            text-align: left;
            vertical-align: top;
        }

        th {
            background-color: #e8f5e9;
            font-weight: bold;
            text-align: center;
            font-size: 9pt;
        }

        .text-center {
            text-align: center;
        }

        .text-right {
            text-align: right;
        }

        .text-nowrap {
            white-space: nowrap;
        }

        /* Signature Section */
        .signature-section {
            margin-top: 30px;
            page-break-inside: avoid;
        }

        .signature-right {
            float: right;
            width: 45%;
            text-align: center;
        }

        .signature-space {
            height: 25px;
            position: relative;
        }

        .signature-name {
            font-weight: bold;
            text-decoration: underline;
        }

        .qr-code-img {
            width: 70px;
            height: 70px;
            object-fit: contain;
        }

        /* Footer info */
        .footer-info {
            font-size: 8pt;
            color: #888;
            text-align: center;
            margin-top: 20px;
            border-top: 1px solid #ddd;
            padding-top: 5px;
        }

        .clearfix::after {
            content: "";
            display: table;
            clear: both;
        }
    </style>
</head>

<body>
    {{-- Kop Surat --}}
    @if($kopUrl ?? false)
        <div class="kop-surat">
            <img src="{{ $kopUrl }}" alt="Kop Surat">
        </div>
        <div class="kop-line"></div>
    @endif

    {{-- Title --}}
    <h1 class="doc-title">{{ $title ?? 'Laporan Data' }}</h1>
    @if($subtitle ?? false)
        <p class="doc-subtitle">{{ $subtitle }}</p>
    @endif

    {{-- Table --}}
    <table>
        <thead>
            <tr>
                <th class="text-center" style="width: 30px">No</th>
                @foreach($columns as $col)
                    <th class="{{ $col['align'] ?? 'text-center' }}" @if(isset($col['width']))
                    style="width: {{ $col['width'] }}" @endif>
                        {{ $col['label'] }}
                    </th>
                @endforeach
            </tr>
        </thead>
        <tbody>
            @forelse($rows as $i => $row)
                <tr>
                    <td class="text-center">{{ $i + 1 }}</td>
                    @foreach($columns as $col)
                        <td class="{{ $col['align'] ?? '' }}">{{ $row[$col['key']] ?? '-' }}</td>
                    @endforeach
                </tr>
            @empty
                <tr>
                    <td colspan="{{ count($columns) + 1 }}" class="text-center" style="padding: 20px; color: #888;">
                        Tidak ada data
                    </td>
                </tr>
            @endforelse
        </tbody>
    </table>

    {{-- Signature Section --}}
    <div class="signature-section clearfix">
        <div class="signature-right">
            <p>{{ $tempatTanggal ?? '' }}</p>
            <p>Kepala Madrasah,</p>
            <div class="signature-space">
                @if($qrCode ?? false)
                    <img src="{{ $qrCode }}" alt="QR Verifikasi" class="qr-code-img">
                @endif
            </div>
            <p class="signature-name">{{ $kepala['nama'] ?? '........................' }}</p>
            <p>NIP. {{ $kepala['nip'] ?? '........................' }}</p>
        </div>
    </div>

    <div class="footer-info" style="clear: both; margin-top: 80px;">
        Dokumen ini dicetak secara otomatis oleh sistem {{ $namaLembaga ?? '' }}
    </div>
</body>

</html>