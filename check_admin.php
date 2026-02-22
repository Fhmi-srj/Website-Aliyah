<?php
require_once __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// Delete the stray pengeluaran with admin_id=1 (test data, not from Excel import)
$deleted = App\Models\Pengeluaran::where('admin_id', 1)->delete();
echo "Deleted $deleted pengeluaran record(s) with admin_id=1\n";
echo "Remaining pengeluaran: " . App\Models\Pengeluaran::count() . "\n";
