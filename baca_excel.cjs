/**
 * Script untuk membaca seluruh isi dari:
 *   - ABSEN SISWA REAL.xlsx
 *   - MENGAJAR REAL.xlsx
 * Menggunakan xlsx (SheetJS) - membaca setiap sheet, setiap baris, setiap kolom secara detail.
 */

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

function readExcelFull(filepath) {
    if (!fs.existsSync(filepath)) {
        console.log(`❌ File tidak ditemukan: ${filepath}`);
        return;
    }

    const stats = fs.statSync(filepath);
    console.log('='.repeat(120));
    console.log(`📄 FILE: ${path.basename(filepath)}`);
    console.log(`   Path: ${filepath}`);
    console.log(`   Size: ${stats.size.toLocaleString()} bytes`);
    console.log('='.repeat(120));

    const wb = XLSX.readFile(filepath);
    console.log(`   Jumlah Sheet: ${wb.SheetNames.length}`);
    console.log(`   Nama Sheet: ${JSON.stringify(wb.SheetNames)}`);
    console.log();

    for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        const ref = ws['!ref'] || 'A1';
        const range = XLSX.utils.decode_range(ref);
        const totalRows = range.e.r - range.s.r + 1;
        const totalCols = range.e.c - range.s.c + 1;

        // Merged cells
        const merges = ws['!merges'] || [];

        console.log('-'.repeat(120));
        console.log(`📋 SHEET: '${sheetName}'`);
        console.log(`   Dimensi: ${ref}`);
        console.log(`   Baris: ${totalRows}, Kolom: ${totalCols}`);
        console.log(`   Merged Cells: ${merges.length > 0 ? merges.map(m => XLSX.utils.encode_range(m)).join(', ') : 'Tidak ada'}`);
        console.log('-'.repeat(120));

        // Print every cell with detail
        for (let r = range.s.r; r <= range.e.r; r++) {
            console.log(`\n--- Baris ${r + 1} ---`);
            for (let c = range.s.c; c <= range.e.c; c++) {
                const cellAddr = XLSX.utils.encode_cell({ r, c });
                const cell = ws[cellAddr];

                if (cell) {
                    const cellType = cell.t === 's' ? 'string' :
                        cell.t === 'n' ? 'number' :
                            cell.t === 'b' ? 'boolean' :
                                cell.t === 'd' ? 'date' :
                                    cell.t === 'e' ? 'error' : cell.t;

                    // v = raw value, w = formatted text, f = formula
                    let display = `(${cellType}) = ${JSON.stringify(cell.v)}`;
                    if (cell.w && cell.w !== String(cell.v)) {
                        display += ` [formatted: "${cell.w}"]`;
                    }
                    if (cell.f) {
                        display += ` [formula: ${cell.f}]`;
                    }
                    console.log(`   [${cellAddr}] ${display}`);
                }
            }
        }

        console.log(`\n   Total baris: ${totalRows}, Total kolom: ${totalCols}`);
        console.log();
    }
}

// Main
const baseDir = __dirname;
const files = [
    path.join(baseDir, 'ABSEN SISWA REAL.xlsx'),
    path.join(baseDir, 'MENGAJAR REAL.xlsx'),
];

for (const f of files) {
    readExcelFull(f);
}
