/**
 * Currency formatting utilities for Indonesian Rupiah.
 *
 * formatRupiah(number) => "100.000"
 * parseRupiah(string) => 100000
 * handleRupiahInput(e, setter, field?) => updates state with raw number, shows formatted
 */

// Format a number to Indonesian currency string (without Rp prefix): 100000 => "100.000"
export function formatRupiah(value) {
    if (value === '' || value === null || value === undefined) return '';
    let num;
    if (typeof value === 'number') {
        num = value;
    } else {
        const str = String(value);
        // If it looks like a decimal number (e.g. "100000.00"), parse directly
        if (/^\d+\.\d+$/.test(str)) {
            num = parseFloat(str);
        } else {
            // Indonesian formatted string like "100.000" — remove dots, parse
            num = parseFloat(str.replace(/\./g, '').replace(/,/g, ''));
        }
    }
    if (isNaN(num) || num === 0) return '0';
    return new Intl.NumberFormat('id-ID').format(Math.round(num));
}

// Parse a formatted rupiah string back to number: "100.000" => 100000
export function parseRupiah(value) {
    if (!value || value === '') return '';
    const cleaned = String(value).replace(/[^\d]/g, '');
    return cleaned === '' ? '' : parseInt(cleaned, 10);
}

// Display format with Rp prefix: 100000 => "Rp 100.000"
export function displayRupiah(value) {
    if (value === '' || value === null || value === undefined || value === 0) return 'Rp 0';
    return `Rp ${formatRupiah(value)}`;
}
