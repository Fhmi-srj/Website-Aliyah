<!DOCTYPE html>
<html>

<head>
    <meta charset="utf-8">
    <title>Laporan Pengeluaran</title>
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

        .total-row {
            font-weight: bold;
            background: #ffebee;
        }
    </style>
</head>

<body>
    <h2>Laporan Pengeluaran</h2>
    <table>
        <thead>
            <tr>
                <th class="text-center" style="width:30px">No</th>
                <th>Tanggal</th>
                <th>Sumber</th>
                <th class="text-right">Nominal</th>
                <th>Kategori</th>
                <th>Keterangan</th>
                <th>Admin</th>
            </tr>
        </thead>
        <tbody>
            @foreach($pengeluaran as $i => $p)
                <tr>
                    <td class="text-center">{{ $i + 1 }}</td>
                    <td>{{ $p->tanggal->format('d/m/Y') }}</td>
                    <td>{{ $p->sumber->nama ?? '-' }}</td>
                    <td class="text-right">Rp {{ number_format($p->nominal, 0, ',', '.') }}</td>
                    <td>{{ $p->kategori->nama ?? '-' }}</td>
                    <td>{{ $p->keterangan ?? '-' }}</td>
                    <td>{{ $p->admin->name ?? '-' }}</td>
                </tr>
            @endforeach
            <tr class="total-row">
                <td colspan="3" class="text-right">TOTAL</td>
                <td class="text-right">Rp {{ number_format($pengeluaran->sum('nominal'), 0, ',', '.') }}</td>
                <td colspan="3"></td>
            </tr>
        </tbody>
    </table>
</body>

</html>