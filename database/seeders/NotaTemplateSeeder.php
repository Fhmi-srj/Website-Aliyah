<?php

namespace Database\Seeders;

use App\Models\NotaTemplate;
use Illuminate\Database\Seeder;

class NotaTemplateSeeder extends Seeder
{
    public function run(): void
    {
        // ── BRI Transaksi Berhasil Template ─────────────────────────
        NotaTemplate::updateOrCreate(
            ['nama' => 'BRI Mobile Banking'],
            [
                'fields' => [
                    ['key' => 'tanggal', 'label' => 'Tanggal', 'type' => 'text', 'required' => true],
                    ['key' => 'no_referensi', 'label' => 'No. Referensi', 'type' => 'text', 'required' => true],
                    ['key' => 'sumber_nama', 'label' => 'Sumber Dana - Nama', 'type' => 'text', 'required' => true],
                    ['key' => 'sumber_rekening', 'label' => 'Sumber Dana - No Rekening', 'type' => 'text', 'required' => true],
                    ['key' => 'jenis_transaksi', 'label' => 'Jenis Transaksi', 'type' => 'text', 'required' => true],
                    ['key' => 'nama', 'label' => 'Nama', 'type' => 'text', 'required' => true],
                    ['key' => 'nomor_pelanggan', 'label' => 'Nomor Pelanggan', 'type' => 'text', 'required' => false],
                    ['key' => 'kode_regional', 'label' => 'Kode Regional', 'type' => 'text', 'required' => false],
                    ['key' => 'jumlah_tagihan', 'label' => 'Jumlah Tagihan', 'type' => 'text', 'required' => false],
                    ['key' => 'nomor_resi', 'label' => 'Nomor Resi/Bukti', 'type' => 'text', 'required' => false],
                    ['key' => 'nominal', 'label' => 'Nominal (Rp)', 'type' => 'text', 'required' => true],
                    ['key' => 'biaya_admin', 'label' => 'Biaya Admin (Rp)', 'type' => 'text', 'required' => false],
                    ['key' => 'total', 'label' => 'Total (Rp)', 'type' => 'text', 'required' => true],
                ],
                'layout_html' => <<<'HTML'
<div style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 380px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #0066cc 0%, #004a99 100%); color: white; text-align: center; padding: 24px 16px 20px;">
        <div style="width: 48px; height: 48px; background: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto 12px; display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 24px;">✓</span>
        </div>
        <div style="font-size: 18px; font-weight: 700;">Transaksi Berhasil</div>
    </div>

    <!-- Info rows -->
    <div style="padding: 16px 20px; font-size: 13px; color: #666; border-bottom: 1px solid #f0f0f0;">
        <div style="display: flex; justify-content: space-between; padding: 6px 0;">
            <span>Tanggal</span>
            <span style="color: #222; font-weight: 500; text-align: right;">{tanggal}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 6px 0;">
            <span>No. Referensi</span>
            <span style="color: #222; font-weight: 500;">{no_referensi}</span>
        </div>
    </div>

    <!-- Sumber Dana -->
    <div style="padding: 12px 20px; border-bottom: 1px solid #f0f0f0;">
        <div style="font-size: 12px; color: #999; margin-bottom: 4px;">Sumber Dana</div>
        <div style="font-size: 14px; font-weight: 600; color: #222;">{sumber_nama}</div>
        <div style="font-size: 13px; color: #666;">{sumber_rekening}</div>
    </div>

    <!-- Detail Transaksi -->
    <div style="padding: 12px 20px; font-size: 13px; color: #666; border-bottom: 1px solid #f0f0f0;">
        <div style="display: flex; justify-content: space-between; padding: 5px 0;">
            <span>Jenis Transaksi</span>
            <span style="color: #222; font-weight: 500;">{jenis_transaksi}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 5px 0;">
            <span>Nama</span>
            <span style="color: #222; font-weight: 600;">{nama}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 5px 0;">
            <span>Nomor Pelanggan</span>
            <span style="color: #222;">{nomor_pelanggan}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 5px 0;">
            <span>Kode Regional</span>
            <span style="color: #222;">{kode_regional}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 5px 0;">
            <span>Jumlah Tagihan</span>
            <span style="color: #222;">{jumlah_tagihan}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 5px 0;">
            <span>Nomor Resi/Bukti</span>
            <span style="color: #222;">{nomor_resi}</span>
        </div>
    </div>

    <!-- Lihat Lebih Sedikit -->
    <div style="text-align: center; padding: 8px;">
        <span style="color: #0066cc; font-size: 12px; font-weight: 500;">Lihat Lebih Sedikit ∧</span>
    </div>

    <!-- Total Section -->
    <div style="padding: 12px 20px 20px; background: #f8fafc;">
        <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px;">
            <span style="color: #666;">Nominal</span>
            <span style="color: #222; font-weight: 500;">Rp{nominal}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px;">
            <span style="color: #666;">Biaya Admin</span>
            <span style="color: #222; font-weight: 500;">Rp{biaya_admin}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 10px 0; margin-top: 6px; border-top: 1px solid #e2e8f0;">
            <span style="font-size: 14px; color: #222; font-weight: 600;">Total</span>
            <span style="font-size: 18px; color: #0066cc; font-weight: 700;">Rp{total}</span>
        </div>
    </div>
</div>
HTML,
                'is_active' => true,
            ]
        );

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
