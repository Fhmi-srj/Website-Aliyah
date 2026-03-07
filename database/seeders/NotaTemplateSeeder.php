<?php

namespace Database\Seeders;

use App\Models\NotaTemplate;
use Illuminate\Database\Seeder;

class NotaTemplateSeeder extends Seeder
{
    public function run(): void
    {
        // ── BRI m-Commerce Template ────────────────────────────────
        NotaTemplate::create([
            'nama' => 'BRI m-Commerce',
            'fields' => [
                ['key' => 'no_transaksi', 'label' => 'No Transaksi', 'type' => 'text', 'required' => true],
                ['key' => 'tanggal', 'label' => 'Tanggal & Waktu', 'type' => 'text', 'required' => true],
                ['key' => 'referensi', 'label' => 'Kode Referensi', 'type' => 'text', 'required' => true],
                ['key' => 'nama_pelanggan', 'label' => 'Nama Pelanggan', 'type' => 'text', 'required' => true],
                ['key' => 'id_pelanggan', 'label' => 'No ID Pelanggan', 'type' => 'text', 'required' => false],
                ['key' => 'no_rekening', 'label' => 'No Rekening', 'type' => 'text', 'required' => false],
                ['key' => 'jenis_transaksi', 'label' => 'Jenis Transaksi', 'type' => 'text', 'required' => true],
                ['key' => 'nominal', 'label' => 'Nominal (Rp)', 'type' => 'text', 'required' => true],
                ['key' => 'admin_fee', 'label' => 'Admin Fee (Rp)', 'type' => 'text', 'required' => false],
                ['key' => 'keterangan', 'label' => 'Keterangan Tambahan', 'type' => 'textarea', 'required' => false],
            ],
            'layout_html' => <<<'HTML'
<div style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 380px; margin: 0 auto; background: white; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
    <!-- Header -->
    <div style="background: #003d79; color: white; text-align: center; padding: 16px;">
        <div style="font-size: 18px; font-weight: bold;">m-Commerce</div>
    </div>

    <!-- Body -->
    <div style="padding: 20px; font-size: 13px; line-height: 1.8; color: #1f2937;">
        <div style="font-weight: 600; color: #003d79; margin-bottom: 4px;">m-Commerce:</div>
        <div>No {no_transaksi}</div>
        <div>{tanggal}</div>
        <div>{referensi}</div>
        <div style="font-weight: 600;">{nama_pelanggan}</div>
        <div>{id_pelanggan}</div>
        <div>{no_rekening}</div>
        <div>{jenis_transaksi}</div>
        <div style="font-weight: bold; font-size: 15px; margin: 6px 0;">RP {nominal}</div>
        <div>{keterangan}</div>
        <div>ADM RP {admin_fee}</div>
    </div>

    <!-- Footer -->
    <div style="padding: 16px 20px; border-top: 1px solid #e5e7eb;">
        <div style="color: #2563eb; font-size: 12px; line-height: 1.6;">
            Biaya Termasuk PPN (Bila ada)<br>
            PT. BANK RAKYAT INDONESIA TBK.<br>
        </div>
    </div>

    <!-- OK Button -->
    <div style="text-align: center; padding: 0 20px 20px;">
        <div style="background: #003d79; color: white; padding: 10px 40px; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 14px;">OK</div>
    </div>
</div>
HTML,
            'is_active' => true,
        ]);

        // ── Shopee Template ────────────────────────────────────────
        NotaTemplate::create([
            'nama' => 'Shopee',
            'fields' => [
                ['key' => 'no_pesanan', 'label' => 'No. Pesanan', 'type' => 'text', 'required' => true],
                ['key' => 'tanggal', 'label' => 'Tanggal Transaksi', 'type' => 'text', 'required' => true],
                ['key' => 'nama_toko', 'label' => 'Nama Toko', 'type' => 'text', 'required' => true],
                ['key' => 'alamat', 'label' => 'Alamat Pengiriman', 'type' => 'textarea', 'required' => true],
                ['key' => 'no_telp', 'label' => 'No. Telepon', 'type' => 'text', 'required' => false],
                ['key' => 'metode_bayar', 'label' => 'Metode Pembayaran', 'type' => 'text', 'required' => true],
                ['key' => 'nama_barang', 'label' => 'Nama Barang', 'type' => 'text', 'required' => true],
                ['key' => 'qty', 'label' => 'Jumlah (QTY)', 'type' => 'number', 'required' => true],
                ['key' => 'harga_satuan', 'label' => 'Harga Satuan (Rp)', 'type' => 'text', 'required' => true],
                ['key' => 'subtotal_produk', 'label' => 'Subtotal Produk (Rp)', 'type' => 'text', 'required' => true],
                ['key' => 'ongkir', 'label' => 'Subtotal Pengiriman (Rp)', 'type' => 'text', 'required' => false],
                ['key' => 'biaya_layanan', 'label' => 'Biaya Layanan (Rp)', 'type' => 'text', 'required' => false],
                ['key' => 'voucher', 'label' => 'Voucher Shopee (Rp)', 'type' => 'text', 'required' => false],
                ['key' => 'total', 'label' => 'Total Pembayaran (Rp)', 'type' => 'text', 'required' => true],
            ],
            'layout_html' => <<<'HTML'
<div style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 420px; margin: 0 auto; background: white; border: 1px solid #e5e7eb;">
    <!-- Header -->
    <div style="display: flex; align-items: center; padding: 14px 16px; border-bottom: 1px solid #e5e7eb;">
        <div style="font-size: 17px; font-weight: 600; color: #222;">← Nota Pesanan / Faktur</div>
    </div>

    <!-- No Pesanan -->
    <div style="padding: 16px; border-bottom: 8px solid #f5f5f5;">
        <div style="font-size: 13px; color: #666; margin-bottom: 4px;">No. Pesanan: <span style="font-weight: 600; color: #222;">{no_pesanan}</span></div>

        <div style="display: flex; justify-content: space-between; margin-top: 12px;">
            <div>
                <div style="font-size: 12px; color: #999;">Total Pembayaran</div>
                <div style="font-size: 18px; font-weight: bold; color: #ee4d2d;">Rp{total}</div>
            </div>
            <div style="text-align: right;">
                <div style="font-size: 12px; color: #999;">Tanggal Transaksi</div>
                <div style="font-size: 14px; font-weight: 600;">{tanggal}</div>
            </div>
        </div>
    </div>

    <!-- Rincian Pengiriman & Metode -->
    <div style="padding: 16px; border-bottom: 8px solid #f5f5f5; display: flex; gap: 20px;">
        <div style="flex: 1;">
            <div style="font-size: 12px; font-weight: 600; color: #222; margin-bottom: 6px;">Rincian Pengiriman</div>
            <div style="font-size: 12px; color: #666; line-height: 1.5;">
                {nama_toko}<br>
                {alamat}<br>
                {no_telp}
            </div>
        </div>
        <div>
            <div style="font-size: 12px; font-weight: 600; color: #222; margin-bottom: 6px;">Metode Pembayaran</div>
            <div style="font-size: 12px; color: #666;">{metode_bayar}</div>
        </div>
    </div>

    <!-- Rincian Pesanan -->
    <div style="padding: 16px; border-bottom: 8px solid #f5f5f5;">
        <div style="font-size: 13px; font-weight: 600; color: #222; margin-bottom: 12px;">Rincian Pesanan</div>

        <div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
            <div style="font-size: 13px; color: #222; flex: 1;">{nama_barang}</div>
            <div style="text-align: right; font-size: 12px; color: #666; white-space: nowrap; margin-left: 12px;">
                x {qty}<br>
                <span style="color: #222;">Rp{harga_satuan}</span>
            </div>
        </div>
    </div>

    <!-- Totals -->
    <div style="padding: 16px; font-size: 13px;">
        <div style="display: flex; justify-content: space-between; padding: 4px 0;">
            <span style="color: #666;">Subtotal untuk Produk</span>
            <span style="color: #222;">Rp{subtotal_produk}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 4px 0;">
            <span style="color: #999; font-size: 12px;">Subtotal Pengiriman</span>
            <span style="color: #999; font-size: 12px;">Rp{ongkir}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 4px 0;">
            <span style="color: #999; font-size: 12px;">Biaya Layanan</span>
            <span style="color: #999; font-size: 12px;">Rp{biaya_layanan}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 4px 0;">
            <span style="color: #999; font-size: 12px;">Voucher Shopee Digunakan</span>
            <span style="color: #ee4d2d; font-size: 12px;">-Rp{voucher}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-top: 1px solid #e5e7eb; margin-top: 8px;">
            <span style="font-weight: 600; color: #222;">Total Pembayaran</span>
            <span style="font-weight: bold; color: #ee4d2d; font-size: 15px;">Rp{total}</span>
        </div>
    </div>
</div>
HTML,
            'is_active' => true,
        ]);
    }
}
