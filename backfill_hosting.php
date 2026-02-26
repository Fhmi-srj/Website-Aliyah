<?php
/**
 * Backfill NULL tahun_ajaran_id records + deduplicate kegiatan + link kegiatan to kaldik
 * 
 * Run via browser: https://yourdomain.com/backfill_hosting.php
 * Or via SSH: php backfill_hosting.php
 * 
 * DELETE THIS FILE AFTER RUNNING!
 */

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;
use App\Models\TahunAjaran;

header('Content-Type: text/plain; charset=utf-8');

$active = TahunAjaran::where('is_active', true)->first();
if (!$active) {
    echo "ERROR: No active tahun ajaran found!\n";
    exit(1);
}

$activeId = $active->id;
echo "Active Tahun Ajaran: {$active->nama} (ID: {$activeId})\n\n";

// ============================================================
// STEP 1: Backfill NULL tahun_ajaran_id
// ============================================================
echo "========================================\n";
echo "STEP 1: Backfill NULL tahun_ajaran_id\n";
echo "========================================\n";

$tables = [
    'kalender',
    'kegiatan',
    'rapat',
    'jadwal',
    'ekskul',
    'supervisi',
    'surat_masuk',
    'surat_keluar',
    'kelas',
    'siswa',
    'siswa_kelas',
    'pemasukan',
    'pengeluaran',
    'tagihan',
];

foreach ($tables as $table) {
    try {
        if (!DB::getSchemaBuilder()->hasColumn($table, 'tahun_ajaran_id')) {
            continue;
        }
        $nullCount = DB::table($table)->whereNull('tahun_ajaran_id')->count();
        $total = DB::table($table)->count();
        echo "{$table}: {$nullCount} NULL / {$total} total";

        if ($nullCount > 0) {
            $updated = DB::table($table)
                ->whereNull('tahun_ajaran_id')
                ->update(['tahun_ajaran_id' => $activeId]);
            echo " -> UPDATED {$updated} records";
        }
        echo "\n";
    } catch (\Exception $e) {
        echo "{$table}: SKIP ({$e->getMessage()})\n";
    }
}

// ============================================================
// STEP 2: Deduplicate kegiatan
// ============================================================
echo "\n========================================\n";
echo "STEP 2: Deduplicate kegiatan\n";
echo "========================================\n";

$dupes = DB::table('kegiatan')
    ->where('tahun_ajaran_id', $activeId)
    ->select('nama_kegiatan', DB::raw('COUNT(*) as cnt'))
    ->groupBy('nama_kegiatan')
    ->having('cnt', '>', 1)
    ->get();

if ($dupes->isEmpty()) {
    echo "No duplicates found.\n";
} else {
    foreach ($dupes as $d) {
        echo "\nDuplicate: {$d->nama_kegiatan} (x{$d->cnt})\n";
        $items = DB::table('kegiatan')
            ->where('nama_kegiatan', $d->nama_kegiatan)
            ->where('tahun_ajaran_id', $activeId)
            ->get();

        $scored = [];
        foreach ($items as $item) {
            $linkedKaldik = DB::table('kalender')->where('kegiatan_id', $item->id)->count();
            $absensi = DB::table('absensi_kegiatan')->where('kegiatan_id', $item->id)->count();
            $score = ($linkedKaldik * 100) + ($absensi * 10) + $item->id;
            $scored[] = ['item' => $item, 'score' => $score, 'linked' => $linkedKaldik, 'absensi' => $absensi];
        }
        usort($scored, fn($a, $b) => $b['score'] - $a['score']);

        $keep = $scored[0];
        echo "  KEEP: ID:{$keep['item']->id} (linked:{$keep['linked']}, absensi:{$keep['absensi']})\n";

        for ($i = 1; $i < count($scored); $i++) {
            $del = $scored[$i];
            echo "  DELETE: ID:{$del['item']->id} (linked:{$del['linked']}, absensi:{$del['absensi']})\n";

            if ($del['absensi'] > 0) {
                DB::table('absensi_kegiatan')
                    ->where('kegiatan_id', $del['item']->id)
                    ->update(['kegiatan_id' => $keep['item']->id]);
                echo "    -> Moved {$del['absensi']} absensi to ID:{$keep['item']->id}\n";
            }

            DB::table('kalender')
                ->where('kegiatan_id', $del['item']->id)
                ->update(['kegiatan_id' => $keep['item']->id]);

            DB::table('kegiatan')->where('id', $del['item']->id)->delete();
        }
    }
}

// ============================================================
// STEP 3: Link unlinked kegiatan to kaldik
// ============================================================
echo "\n========================================\n";
echo "STEP 3: Link unlinked kegiatan to kaldik\n";
echo "========================================\n";

$unlinked = DB::table('kegiatan')
    ->where('tahun_ajaran_id', $activeId)
    ->whereNotIn('id', function ($q) {
        $q->select('kegiatan_id')->from('kalender')->whereNotNull('kegiatan_id');
    })
    ->get();

if ($unlinked->isEmpty()) {
    echo "All kegiatan already linked.\n";
} else {
    foreach ($unlinked as $kegiatan) {
        $match = DB::table('kalender')
            ->where('tahun_ajaran_id', $activeId)
            ->where('kegiatan', $kegiatan->nama_kegiatan)
            ->whereNull('kegiatan_id')
            ->first();

        if ($match) {
            DB::table('kalender')
                ->where('id', $match->id)
                ->update(['kegiatan_id' => $kegiatan->id, 'keterangan' => 'Kegiatan']);
            echo "LINKED: {$kegiatan->nama_kegiatan} (kegiatan:{$kegiatan->id} -> kaldik:{$match->id})\n";
        } else {
            echo "NO MATCH: {$kegiatan->nama_kegiatan} (kegiatan:{$kegiatan->id}) - no kaldik entry found\n";
        }
    }
}

// ============================================================
// VERIFY
// ============================================================
echo "\n========================================\n";
echo "VERIFICATION\n";
echo "========================================\n";

foreach ($tables as $table) {
    try {
        if (!DB::getSchemaBuilder()->hasColumn($table, 'tahun_ajaran_id'))
            continue;
        $nullCount = DB::table($table)->whereNull('tahun_ajaran_id')->count();
        if ($nullCount > 0)
            echo "WARNING: {$table} still has {$nullCount} NULL records\n";
    } catch (\Exception $e) {
    }
}

$totalKegiatan = DB::table('kegiatan')->where('tahun_ajaran_id', $activeId)->count();
$linkedKegiatan = DB::table('kegiatan')
    ->where('tahun_ajaran_id', $activeId)
    ->whereIn('id', function ($q) {
        $q->select('kegiatan_id')->from('kalender')->whereNotNull('kegiatan_id');
    })->count();
$dupeCount = DB::table('kegiatan')
    ->where('tahun_ajaran_id', $activeId)
    ->select('nama_kegiatan', DB::raw('COUNT(*) as cnt'))
    ->groupBy('nama_kegiatan')
    ->having('cnt', '>', 1)
    ->count();

echo "Kegiatan total: {$totalKegiatan}\n";
echo "Kegiatan linked to kaldik: {$linkedKegiatan}\n";
echo "Remaining duplicates: {$dupeCount}\n";

echo "\n===== DONE! HAPUS FILE INI SETELAH SELESAI! =====\n";
