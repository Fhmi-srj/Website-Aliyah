<!DOCTYPE html>
<html>

<head>
    <meta charset="utf-8">
    <title>Laporan Tagihan - {{ $tagihan->nama }}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            font-size: 11px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }

        th,
        td {
            border: 1px solid #333;
            padding: 4px 6px;
            text-align: left;
        }

        th {
            background: #f0f0f0;
            font-weight: bold;
        }

        .text-right {
            text-align: right;
        }

        .text-center {
            text-align: center;
        }

        h2 {
            margin-bottom: 5px;
        }

        .summary {
            margin: 10px 0;
        }
    </style>
</head>

<body>
    <h2>Laporan Tagihan: {{ $tagihan->nama }}</h2>
    <div class="summary">
        <p>Nominal: Rp {{ number_format($tagihan->nominal, 0, ',', '.') }}
            | Jatuh Tempo: {{ $tagihan->tanggal_jatuh_tempo?->format('d/m/Y') ?? '-' }}</p>
    </div>
    <table>
        <thead>
            <tr>
                <th class="text-center" style="width:30px">No</th>
                <th>NIS</th>
                <th>Nama Siswa</th>
                <th>Kelas</th>
                <th class="text-right">Tagihan</th>
                <th class="text-right">Dibayar</th>
                <th class="text-right">Sisa</th>
                <th class="text-center">Status</th>
                <th>Tgl Bayar</th>
                <th>Catatan</th>
            </tr>
        </thead>
        <tbody>
            @foreach($pembayaran as $i => $p)
                <tr>
                    <td class="text-center">{{ $i + 1 }}</td>
                    <td>{{ $p->siswa->nis ?? '-' }}</td>
                    <td>{{ $p->siswa->nama ?? '-' }}</td>
                    <td>{{ $p->kelas->nama ?? '-' }}</td>
                    <td class="text-right">{{ number_format($tagihan->nominal, 0, ',', '.') }}</td>
                    <td class="text-right">{{ number_format($p->nominal_dibayar, 0, ',', '.') }}</td>
                    <td class="text-right">{{ number_format($tagihan->nominal - $p->nominal_dibayar, 0, ',', '.') }}</td>
                    <td class="text-center">{{ ucfirst($p->status) }}</td>
                    <td>{{ $p->tanggal_bayar?->format('d/m/Y') ?? '-' }}</td>
                    <td>{{ $p->catatan ?? '-' }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
</body>

</html>