<!DOCTYPE html>
<html lang="id">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cetak Nota - {{ $template->nama }}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f5f5f5;
            display: flex;
            justify-content: center;
            padding: 20px;
        }

        .nota-wrapper {
            background: white;
            max-width: 420px;
            width: 100%;
            min-height: auto;
        }

        .nota-content {
            padding: 0;
        }

        .print-actions {
            display: flex;
            gap: 8px;
            justify-content: center;
            margin-bottom: 20px;
        }

        .print-actions button {
            padding: 10px 24px;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }

        .btn-print {
            background: #22c55e;
            color: white;
        }

        .btn-print:hover {
            background: #16a34a;
        }

        .btn-close {
            background: #e5e7eb;
            color: #374151;
        }

        .btn-close:hover {
            background: #d1d5db;
        }

        @media print {
            body {
                background: white;
                padding: 0;
                margin: 0;
            }

            .print-actions {
                display: none !important;
            }

            .nota-wrapper {
                box-shadow: none;
                max-width: 100%;
            }
        }
    </style>
</head>

<body>
    <div>
        <div class="print-actions">
            <button class="btn-print" onclick="window.print()">
                <i class="fas fa-print"></i> Cetak / Simpan PDF
            </button>
            <button class="btn-close" onclick="window.close()">Tutup</button>
        </div>

        <div class="nota-wrapper">
            <div class="nota-content">
                {!! $html !!}
            </div>
        </div>
    </div>

    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</body>

</html>