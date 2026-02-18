import React, { useState, useEffect } from 'react';
import CrudModal, { ModalSection } from '../../../components/CrudModal';
import { API_BASE, authFetch } from '../../../config/api';
import Swal from 'sweetalert2';
import { formatRupiah, parseRupiah } from '../../../utils/currency';

const formatTanggal = (d) => {
    if (!d) return '-';
    const dt = new Date(d);
    if (isNaN(dt)) return d;
    const hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${hari[dt.getDay()]}, ${dt.getDate()} ${bulan[dt.getMonth()]} ${dt.getFullYear()}`;
};

export default function TabBayarTagihan({ isMobile }) {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [siswaSearch, setSiswaSearch] = useState('');
    const [siswaResults, setSiswaResults] = useState([]);
    const [selectedSiswa, setSelectedSiswa] = useState(null);
    const [siswaTagihan, setSiswaTagihan] = useState([]);
    const [loadingSiswa, setLoadingSiswa] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Multi-select payment
    const [selectedTagihanIds, setSelectedTagihanIds] = useState([]);
    const [payTanggal, setPayTanggal] = useState(new Date().toISOString().split('T')[0]);
    const [payCatatan, setPayCatatan] = useState('');

    // Expanded tagihan for cicilan history
    const [expandedTagihanId, setExpandedTagihanId] = useState(null);

    // Edit payment modal state
    const [showEditModal, setShowEditModal] = useState(false);
    const [editPembayaran, setEditPembayaran] = useState(null);
    const [editNominal, setEditNominal] = useState('');
    const [editTanggal, setEditTanggal] = useState('');
    const [editCatatan, setEditCatatan] = useState('');
    const [editSubmitting, setEditSubmitting] = useState(false);

    const fmt = (n) => formatRupiah(n);
    const today = new Date().toISOString().split('T')[0];
    const isDue = (t) => !t.tanggal_jatuh_tempo || t.tanggal_jatuh_tempo <= today;

    useEffect(() => { fetchPayments(); }, []);

    const fetchPayments = async () => {
        setLoading(true);
        try {
            const r = await authFetch(`${API_BASE}/pembayaran/search?q=`);
            const d = await r.json();
            if (d.success) setPayments(d.data || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    // Search siswa in modal
    useEffect(() => {
        const t = setTimeout(() => {
            if (siswaSearch.length >= 2) searchSiswa();
            else setSiswaResults([]);
        }, 300);
        return () => clearTimeout(t);
    }, [siswaSearch]);

    const searchSiswa = async () => {
        setLoadingSiswa(true);
        try {
            const r = await authFetch(`${API_BASE}/pembayaran/search?q=${encodeURIComponent(siswaSearch)}`);
            const d = await r.json();
            if (d.success) setSiswaResults(d.data || []);
        } catch (e) { console.error(e); }
        finally { setLoadingSiswa(false); }
    };

    const selectSiswa = async (siswa) => {
        setSelectedSiswa(siswa);
        setSiswaResults([]);
        setSiswaSearch('');
        setSelectedTagihanIds([]);
        setExpandedTagihanId(null);
        try {
            const r = await authFetch(`${API_BASE}/pembayaran/siswa/${siswa.id}`);
            const d = await r.json();
            if (d.success) setSiswaTagihan(d.data.tagihan || []);
        } catch (e) { console.error(e); }
    };

    // Click-to-pay from table row
    const openPayForSiswa = (siswa) => {
        setShowModal(true);
        setSiswaSearch('');
        setSiswaResults([]);
        setSiswaTagihan([]);
        setSelectedTagihanIds([]);
        setExpandedTagihanId(null);
        setPayTanggal(new Date().toISOString().split('T')[0]);
        setPayCatatan('');
        selectSiswa(siswa);
    };

    const openModal = () => {
        setShowModal(true);
        setSelectedSiswa(null);
        setSiswaSearch('');
        setSiswaResults([]);
        setSiswaTagihan([]);
        setSelectedTagihanIds([]);
        setExpandedTagihanId(null);
        setPayTanggal(new Date().toISOString().split('T')[0]);
        setPayCatatan('');
    };

    const toggleTagihan = (id) => {
        setSelectedTagihanIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    // Filter tagihan by due date
    const dueTagihan = siswaTagihan.filter(t => isDue(t));
    const notDueTagihan = siswaTagihan.filter(t => !isDue(t));

    // Selectable = all non-lunas (both due and not-due)
    const selectableTagihan = siswaTagihan.filter(t => t.status !== 'lunas');

    const toggleSelectAll = () => {
        if (selectedTagihanIds.length === selectableTagihan.length) {
            setSelectedTagihanIds([]);
        } else {
            setSelectedTagihanIds(selectableTagihan.map(t => t.id));
        }
    };

    const selectedTotal = siswaTagihan
        .filter(t => selectedTagihanIds.includes(t.id))
        .reduce((sum, t) => sum + (t.sisa || 0), 0);

    const submitPayment = async () => {
        if (selectedTagihanIds.length === 0) {
            Swal.fire({ icon: 'warning', title: 'Pilih tagihan yang ingin dibayar' });
            return;
        }
        const selectedItems = siswaTagihan.filter(t => selectedTagihanIds.includes(t.id) && t.status !== 'lunas');
        const totalBayar = selectedItems.reduce((sum, t) => sum + (t.sisa || 0), 0);

        const confirm = await Swal.fire({
            title: 'Konfirmasi Pembayaran',
            html: `<div class="text-left text-sm">
                <p class="mb-2 font-bold">${selectedSiswa?.nama}</p>
                <p class="mb-1"><b>${selectedItems.length}</b> tagihan akan dibayar:</p>
                <ul class="list-disc pl-5 mb-2">${selectedItems.map(t => `<li>${t.tagihan_nama} — Rp ${formatRupiah(t.sisa)}</li>`).join('')}</ul>
                <p class="text-lg font-bold text-green-600">Total: Rp ${formatRupiah(totalBayar)}</p>
            </div>`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Ya, Bayar!',
            cancelButtonText: 'Batal',
        });
        if (!confirm.isConfirmed) return;

        setSubmitting(true);
        let successCount = 0, failCount = 0;

        for (const item of selectedItems) {
            try {
                const r = await authFetch(`${API_BASE}/pembayaran`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                    body: JSON.stringify({ tagihan_siswa_id: item.id, nominal: item.sisa, tanggal_bayar: payTanggal, catatan: payCatatan || null })
                });
                const d = await r.json();
                if (d.success) successCount++; else failCount++;
            } catch { failCount++; }
        }

        setSubmitting(false);
        if (successCount > 0) {
            Swal.fire({ icon: failCount > 0 ? 'warning' : 'success', title: failCount > 0 ? `${successCount} berhasil, ${failCount} gagal` : 'Pembayaran Berhasil!', text: `${successCount} tagihan berhasil dibayar (Total: Rp ${formatRupiah(totalBayar)})`, timer: 2500, showConfirmButton: false });
            setSelectedTagihanIds([]);
            selectSiswa(selectedSiswa);
            fetchPayments();
        } else {
            Swal.fire({ icon: 'error', title: 'Gagal', text: 'Semua pembayaran gagal diproses' });
        }
    };

    const deletePayment = async (id) => {
        const c = await Swal.fire({ title: 'Hapus pembayaran?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc2626', confirmButtonText: 'Ya', cancelButtonText: 'Batal' });
        if (c.isConfirmed) {
            try {
                await authFetch(`${API_BASE}/pembayaran/${id}`, { method: 'DELETE', headers: { Accept: 'application/json' } });
                Swal.fire({ icon: 'success', title: 'Terhapus!', timer: 1500, showConfirmButton: false });
                if (selectedSiswa) selectSiswa(selectedSiswa);
                fetchPayments();
            } catch { }
        }
    };

    const editPayment = (p) => {
        setEditPembayaran(p);
        setEditNominal(formatRupiah(p.nominal));
        setEditTanggal(p.tanggal_bayar ? p.tanggal_bayar.split('T')[0] : '');
        setEditCatatan(p.catatan || '');
        setShowEditModal(true);
    };

    const submitEditPayment = async () => {
        const nominal = parseRupiah(editNominal);
        if (!nominal || nominal <= 0) { Swal.fire({ icon: 'warning', title: 'Nominal harus lebih dari 0' }); return; }
        if (!editTanggal) { Swal.fire({ icon: 'warning', title: 'Tanggal harus diisi' }); return; }
        setEditSubmitting(true);
        try {
            const r = await authFetch(`${API_BASE}/pembayaran/${editPembayaran.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({ nominal, tanggal_bayar: editTanggal, catatan: editCatatan || null })
            });
            const d = await r.json();
            if (d.success) {
                Swal.fire({ icon: 'success', title: 'Berhasil!', timer: 1500, showConfirmButton: false });
                setShowEditModal(false);
                if (selectedSiswa) selectSiswa(selectedSiswa);
                fetchPayments();
            } else {
                Swal.fire({ icon: 'error', title: 'Gagal', text: d.message || 'Terjadi kesalahan' });
            }
        } catch { Swal.fire({ icon: 'error', title: 'Gagal', text: 'Terjadi kesalahan' }); }
        finally { setEditSubmitting(false); }
    };

    const filtered = payments.filter(i => {
        if (!search) return true;
        const s = search.toLowerCase();
        return i.nama?.toLowerCase().includes(s) || i.nis?.toString().includes(s) || i.kelas_nama?.toLowerCase().includes(s);
    });

    // Get last payment date for a tagihan
    const getLastPaymentDate = (t) => {
        if (!t.pembayaran || t.pembayaran.length === 0) return null;
        const sorted = [...t.pembayaran].sort((a, b) => new Date(b.tanggal_bayar) - new Date(a.tanggal_bayar));
        return sorted[0].tanggal_bayar;
    };

    // Render a single tagihan row in the modal
    const renderTagihanRow = (t, options = {}) => {
        const { selectable = false, dimmed = false, notDueLabel = false } = options;
        const isLunas = t.status === 'lunas';
        const isCicilan = t.status === 'cicilan';
        const isSelected = selectedTagihanIds.includes(t.id);
        const isExpanded = expandedTagihanId === t.id;
        const hasPembayaran = t.pembayaran && t.pembayaran.length > 0;
        const lastPayDate = getLastPaymentDate(t);

        return (
            <div key={t.id} className={dimmed ? 'opacity-50' : ''}>
                <div
                    className={`flex items-center justify-between rounded-xl border p-3 transition-all
                        ${isLunas ? 'bg-emerald-50/80 border-emerald-200' : ''}
                        ${isCicilan ? 'bg-amber-50/50 border-amber-200' : ''}
                        ${!isLunas && !isCicilan && !dimmed ? 'bg-white border-gray-100 hover:border-gray-200' : ''}
                        ${dimmed ? 'bg-gray-50 border-gray-100' : ''}
                        ${isSelected ? '!border-primary !bg-primary/5 shadow-sm' : ''}
                        ${selectable ? 'cursor-pointer' : ''}`}
                    onClick={() => {
                        if (selectable && !isLunas) toggleTagihan(t.id);
                    }}
                >
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            {/* Checkbox for selectable items */}
                            {selectable && !isLunas && (
                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSelected ? 'border-primary bg-primary' : 'border-gray-300'}`}>
                                    {isSelected && <i className="fas fa-check text-white text-[7px]"></i>}
                                </div>
                            )}
                            {/* Lunas checkmark */}
                            {isLunas && (
                                <div className="w-5 h-5 rounded-md bg-emerald-500 flex items-center justify-center flex-shrink-0">
                                    <i className="fas fa-check text-white text-[7px]"></i>
                                </div>
                            )}
                            {/* Not due icon */}
                            {dimmed && (
                                <i className="fas fa-clock text-gray-300 text-[10px] flex-shrink-0"></i>
                            )}
                            <span className={`text-sm font-bold truncate ${isLunas ? 'text-emerald-700' : isCicilan ? 'text-amber-700' : 'text-gray-700'}`}>{t.tagihan_nama}</span>
                            {/* Status badge */}
                            {isLunas && <span className="text-[8px] bg-emerald-100 text-emerald-600 font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider flex-shrink-0">Lunas</span>}
                            {isCicilan && <span className="text-[8px] bg-amber-100 text-amber-600 font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider flex-shrink-0">Cicilan</span>}
                            {/* Jatuh tempo badge */}
                            {t.tanggal_jatuh_tempo && (
                                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${notDueLabel ? 'bg-blue-50 text-blue-500' : 'bg-gray-100 text-gray-500'}`}>
                                    <i className="fas fa-clock mr-0.5"></i>{notDueLabel ? 'JT: ' : 'JT: '}{new Date(t.tanggal_jatuh_tempo).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                </span>
                            )}
                        </div>
                        <div className="ml-7 mt-0.5 text-[10px]">
                            {isLunas ? (
                                <span className="text-emerald-600 font-bold">{lastPayDate ? formatTanggal(lastPayDate) : 'Lunas'} · Rp {fmt(t.nominal)}</span>
                            ) : isCicilan ? (
                                <span className="text-amber-600">Dibayar: <b>Rp {fmt(t.total_dibayar)}</b> / Rp {fmt(t.nominal)} · <span className="text-rose-500 font-bold">Kekurangan: Rp {fmt(t.sisa)}</span></span>
                            ) : dimmed ? (
                                <span className="text-gray-400">Jatuh tempo: {formatTanggal(t.tanggal_jatuh_tempo)} · Rp {fmt(t.nominal)}</span>
                            ) : notDueLabel ? (
                                <span className="text-gray-500">Nominal: Rp {fmt(t.nominal)} · <span className="text-rose-500 font-bold">Kekurangan: Rp {fmt(t.sisa)}</span></span>
                            ) : (
                                <span className="text-gray-400">Nominal: Rp {fmt(t.nominal)} · <span className="text-rose-500 font-bold">Kekurangan: Rp {fmt(t.sisa)}</span></span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                        {/* Expand button for items with pembayaran */}
                        {hasPembayaran && (
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setExpandedTagihanId(isExpanded ? null : t.id); }}
                                className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 transition-all inline-flex items-center justify-center"
                                title="Lihat riwayat"
                            >
                                <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} text-[8px]`}></i>
                            </button>
                        )}
                    </div>
                </div>

                {/* Expanded: cicilan history */}
                {isExpanded && hasPembayaran && (
                    <div className="ml-7 mt-1 mb-1 bg-white rounded-lg border border-gray-100 overflow-hidden">
                        {[...t.pembayaran].sort((a, b) => new Date(b.tanggal_bayar) - new Date(a.tanggal_bayar)).map((p, idx) => (
                            <div key={p.id} className={`flex items-center justify-between px-3 py-1.5 ${idx > 0 ? 'border-t border-gray-100' : ''} hover:bg-gray-50/50`}>
                                <div className="flex items-center gap-2">
                                    <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                                    <span className="text-[10px] text-gray-500">{formatTanggal(p.tanggal_bayar)}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-bold text-emerald-600">Rp {fmt(p.nominal)}</span>
                                    <button type="button" onClick={(e) => { e.stopPropagation(); editPayment(p); }}
                                        className="w-5 h-5 rounded-md bg-blue-50 text-blue-400 hover:bg-blue-100 hover:text-blue-600 transition-all inline-flex items-center justify-center"
                                        title="Edit pembayaran">
                                        <i className="fas fa-pen text-[7px]"></i>
                                    </button>
                                    <button type="button" onClick={(e) => { e.stopPropagation(); deletePayment(p.id); }}
                                        className="w-5 h-5 rounded-md bg-rose-50 text-rose-400 hover:bg-rose-100 hover:text-rose-600 transition-all inline-flex items-center justify-center"
                                        title="Hapus pembayaran">
                                        <i className="fas fa-trash text-[7px]"></i>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <>
            {/* Controls */}
            <div className={`${isMobile ? 'mobile-controls-row bg-gray-50/50 rounded-xl border border-gray-100' : 'flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 p-4 bg-gray-50/50 rounded-2xl border border-gray-100'}`}>
                {isMobile ? (
                    <div className="flex gap-1.5 w-full">
                        <div className="relative group" style={{ width: '65%' }}>
                            <i className="fas fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors text-[10px]"></i>
                            <input type="search" value={search} onChange={e => setSearch(e.target.value)}
                                className="w-full !pl-7 pr-2 py-1.5 text-[10px] bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder-gray-400 shadow-sm"
                                placeholder="Cari siswa..." />
                        </div>
                        <div style={{ width: '35%' }}>
                            <button onClick={openModal} className="btn-primary flex items-center justify-center gap-1 group shadow-lg shadow-primary/20 font-black uppercase tracking-widest w-full py-1.5 text-[10px] rounded-xl">
                                <i className="fas fa-plus group-hover:rotate-90 transition-transform"></i><span>Bayar</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center w-full md:w-[400px] relative group">
                            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors"></i>
                            <input type="search" value={search} onChange={e => setSearch(e.target.value)}
                                className="w-full !pl-8 pr-2 py-3 text-sm bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder-gray-400 shadow-sm"
                                placeholder="Cari siswa berdasarkan nama atau NIS..." />
                        </div>
                        <div className="flex gap-2 items-center">
                            <button onClick={openModal} className="btn-primary flex items-center gap-1 group shadow-lg shadow-primary/20 font-black uppercase tracking-widest px-4 py-2.5 text-[10px] rounded-xl">
                                <i className="fas fa-plus group-hover:rotate-90 transition-transform"></i><span>Tambah Pembayaran</span>
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Summary Table: No, Nama, Kelas, Tagihan, Pembayaran, Kekurangan */}
            {loading ? (
                <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div><span className="ml-3 text-sm font-medium text-gray-500">Memuat...</span></div>
            ) : (
                <div className={`bg-white rounded-2xl shadow-soft border border-gray-100 ${isMobile ? 'overflow-hidden' : 'overflow-x-auto scrollbar-hide'}`}>
                    <table className={`admin-table ${isMobile ? 'mobile-table-fixed' : 'min-w-[700px]'}`}>
                        <thead><tr>
                            {!isMobile && <th className="select-none pl-6 py-2.5 w-10 text-center text-xs font-black text-gray-400 uppercase tracking-widest">No</th>}
                            <th className={`select-none py-2 ${isMobile ? 'px-2 text-[8px]' : 'px-3 text-xs'} font-black text-gray-400 uppercase tracking-widest`}>Nama</th>
                            {!isMobile && <th className="select-none py-2 px-3 text-xs font-black text-gray-400 uppercase tracking-widest">Kelas</th>}
                            <th className={`select-none py-2 ${isMobile ? 'px-2 text-[8px]' : 'px-3 text-xs'} font-black text-gray-400 uppercase tracking-widest`}>Tagihan</th>
                            <th className={`select-none py-2 ${isMobile ? 'px-2 text-[8px]' : 'px-3 text-xs'} font-black text-gray-400 uppercase tracking-widest`}>Pembayaran</th>
                            <th className={`select-none py-2 ${isMobile ? 'px-2 text-[8px]' : 'px-3 text-xs'} font-black text-gray-400 uppercase tracking-widest`}>Kekurangan</th>
                        </tr></thead>
                        <tbody>
                            {filtered.map((s, idx) => (
                                <tr key={s.id} className="hover:bg-gray-50/50 transition-colors border-b border-gray-100 last:border-0 cursor-pointer" onClick={() => openPayForSiswa(s)}>
                                    {!isMobile && <td className="py-2.5 pl-6 align-middle text-center text-xs font-bold text-gray-400">{idx + 1}</td>}
                                    <td className={`py-2 ${isMobile ? 'px-2' : 'px-3'} align-middle`}>
                                        <div className="flex flex-col">
                                            <span className={`font-black text-primary hover:text-primary/80 uppercase tracking-tight ${isMobile ? 'text-[10px] truncate max-w-[100px] block' : 'text-sm'}`}>{s.nama}</span>
                                            <span className={`text-gray-400 font-medium ${isMobile ? 'text-[7px]' : 'text-[7px]'}`}>NIS: {s.nis}{isMobile ? ` · ${s.kelas_nama}` : ''}</span>
                                        </div>
                                    </td>
                                    {!isMobile && <td className="py-2 px-3 align-middle"><span className="text-[11px] font-bold text-gray-600 uppercase">{s.kelas_nama}</span></td>}
                                    <td className={`py-2 ${isMobile ? 'px-2' : 'px-3'} align-middle`}><span className={`font-bold text-gray-600 ${isMobile ? 'text-[9px]' : 'text-sm'}`}>Rp {fmt(s.total_tagihan)}</span></td>
                                    <td className={`py-2 ${isMobile ? 'px-2' : 'px-3'} align-middle`}><span className={`font-bold text-emerald-600 ${isMobile ? 'text-[9px]' : 'text-sm'}`}>Rp {fmt(s.total_dibayar)}</span></td>
                                    <td className={`py-2 ${isMobile ? 'px-2' : 'px-3'} align-middle`}><span className={`font-bold ${s.total_sisa > 0 ? 'text-rose-600' : 'text-emerald-600'} ${isMobile ? 'text-[9px]' : 'text-sm'}`}>Rp {fmt(s.total_sisa)}</span></td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr><td colSpan={isMobile ? 4 : 6} className={`text-center ${isMobile ? 'py-8' : 'py-20'}`}>
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <div className={`bg-gray-50 rounded-2xl flex items-center justify-center ${isMobile ? 'w-12 h-12' : 'w-16 h-16'}`}><i className={`fas fa-hand-holding-usd text-gray-300 ${isMobile ? 'text-xl' : 'text-2xl'}`}></i></div>
                                        <p className={`font-bold text-gray-400 ${isMobile ? 'text-[10px]' : 'text-sm'}`}>Belum ada data pembayaran</p>
                                    </div>
                                </td></tr>
                            )}
                        </tbody>
                    </table>
                    <div className={`flex items-center justify-between border-t border-gray-100 bg-gray-50/30 ${isMobile ? 'p-3' : 'p-4'}`}>
                        <span className={`font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5 ${isMobile ? 'text-[9px]' : 'text-[11px]'}`}>
                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>{filtered.length} Siswa
                        </span>
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            <CrudModal
                show={showModal}
                onClose={() => setShowModal(false)}
                title="Tambah Pembayaran"
                subtitle="Pilih siswa dan lakukan pembayaran"
                icon="money-bill-wave"
                onSubmit={submitPayment}
                submitLabel={submitting ? 'Menyimpan...' : `Bayar${selectedTagihanIds.length > 0 ? ` (${selectedTagihanIds.length})` : ''}`}
                maxWidth="max-w-2xl"
                isMobile={isMobile}
                hideFooter={!selectedSiswa || selectableTagihan.length === 0 || selectedTagihanIds.length === 0}
            >
                {/* Step 1: Search Siswa */}
                {!selectedSiswa && (
                    <>
                        <ModalSection label="Cari Santri" isMobile={isMobile} />
                        <div className="space-y-3">
                            <div className="relative group">
                                <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors text-xs"></i>
                                <input type="text" value={siswaSearch} onChange={e => setSiswaSearch(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder-gray-400"
                                    placeholder="Ketik nama atau NIS santri..." autoFocus />
                            </div>
                            {loadingSiswa && <div className="text-center py-3"><div className="animate-spin inline-block rounded-full h-5 w-5 border-b-2 border-primary"></div></div>}
                            {siswaResults.length > 0 && (
                                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden max-h-[250px] overflow-y-auto">
                                    {siswaResults.map(s => (
                                        <button key={s.id} onClick={() => selectSiswa(s)} className="w-full text-left px-4 py-3 hover:bg-primary/5 transition-colors border-b border-gray-100 last:border-0 flex items-center justify-between group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0"><i className="fas fa-user text-primary text-xs"></i></div>
                                                <div>
                                                    <span className="text-sm font-black text-gray-700 uppercase tracking-tight block">{s.nama}</span>
                                                    <span className="text-[9px] text-gray-400 font-medium">NIS: {s.nis} · {s.kelas_nama}</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className={`text-[9px] font-bold ${s.total_sisa > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                    Kekurangan: Rp {fmt(s.total_sisa)}
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                            {siswaSearch.length >= 2 && siswaResults.length === 0 && !loadingSiswa && (
                                <div className="text-center py-6"><i className="fas fa-user-slash text-gray-300 text-2xl mb-2 block"></i><p className="text-xs text-gray-400 font-bold">Santri tidak ditemukan</p></div>
                            )}
                            {siswaSearch.length < 2 && (
                                <div className="text-center py-6"><i className="fas fa-search text-gray-300 text-2xl mb-2 block"></i><p className="text-xs text-gray-400 font-bold">Ketik minimal 2 huruf untuk mencari</p></div>
                            )}
                        </div>
                    </>
                )}

                {/* Step 2: Siswa selected — unified tagihan list */}
                {selectedSiswa && (
                    <>
                        {/* Selected Siswa Info */}
                        <div className="flex items-center justify-between bg-gradient-to-r from-primary/5 to-emerald-50 rounded-xl border border-primary/10 p-3 mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center"><i className="fas fa-user text-primary text-sm"></i></div>
                                <div>
                                    <h4 className="text-sm font-black text-gray-800 uppercase tracking-tight">{selectedSiswa.nama}</h4>
                                    <p className="text-[9px] text-gray-500 font-medium">NIS: {selectedSiswa.nis} · {selectedSiswa.kelas_nama}</p>
                                </div>
                            </div>
                            <button onClick={() => { setSelectedSiswa(null); setSiswaTagihan([]); setSelectedTagihanIds([]); }}
                                className="text-[9px] text-gray-400 hover:text-rose-500 font-bold transition-colors"><i className="fas fa-times mr-1"></i>Ganti</button>
                        </div>

                        {/* Tagihan List Header */}
                        <div className="flex items-center justify-between mb-2">
                            <ModalSection label="Daftar Tagihan" isMobile={isMobile} />
                            {selectableTagihan.length > 0 && (
                                <button onClick={toggleSelectAll} className="text-[10px] font-bold text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
                                    <i className={`fas ${selectedTagihanIds.length === selectableTagihan.length ? 'fa-check-square' : 'fa-square'} text-xs`}></i>
                                    {selectedTagihanIds.length === selectableTagihan.length ? 'Batal Semua' : 'Pilih Semua'}
                                </button>
                            )}
                        </div>

                        {/* Due tagihan (all states: belum, cicilan, lunas) */}
                        {dueTagihan.length > 0 ? (
                            <div className="space-y-2 mb-4">
                                {dueTagihan.map(t => renderTagihanRow(t, { selectable: true }))}

                                {/* Selected Summary */}
                                {selectedTagihanIds.length > 0 && (
                                    <div className="bg-gradient-to-r from-emerald-50 to-primary/5 rounded-xl border border-emerald-200 p-3 mt-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] font-bold text-gray-600"><i className="fas fa-check-double text-primary mr-1"></i>{selectedTagihanIds.length} tagihan dipilih</span>
                                            <span className="text-sm font-black text-primary">Total: Rp {fmt(selectedTotal)}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-6 mb-4">
                                <i className="fas fa-check-circle text-emerald-400 text-3xl mb-2 block"></i>
                                <p className="text-sm font-bold text-emerald-600">Semua tagihan sudah lunas!</p>
                            </div>
                        )}

                        {/* Not-yet-due tagihan */}
                        {notDueTagihan.length > 0 && (
                            <>
                                <ModalSection label={`Belum Jatuh Tempo (${notDueTagihan.length})`} isMobile={isMobile} />
                                <div className="space-y-2 mb-4">
                                    {notDueTagihan.map(t => renderTagihanRow(t, { selectable: true, notDueLabel: true }))}
                                </div>
                            </>
                        )}

                        {/* Payment Details */}
                        {selectedTagihanIds.length > 0 && (
                            <>
                                <ModalSection label="Detail Pembayaran" isMobile={isMobile} />
                                <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                    <div className="space-y-1">
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Tanggal Bayar *</label>
                                        <input type="date" value={payTanggal} onChange={e => setPayTanggal(e.target.value)}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Catatan</label>
                                        <input type="text" value={payCatatan} onChange={e => setPayCatatan(e.target.value)}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder-gray-400" placeholder="Opsional..." />
                                    </div>
                                </div>
                            </>
                        )}
                    </>
                )}
            </CrudModal>

            {/* Edit Payment Modal */}
            <CrudModal
                show={showEditModal}
                onClose={() => setShowEditModal(false)}
                title="Edit Pembayaran"
                subtitle="Ubah detail pembayaran"
                icon="pen"
                onSubmit={submitEditPayment}
                submitLabel={editSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                maxWidth="max-w-md"
                isMobile={isMobile}
            >
                <ModalSection label="Detail Pembayaran" isMobile={isMobile} />
                <div className="space-y-4">
                    <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Nominal *</label>
                        <input type="text" value={editNominal}
                            onChange={e => { const raw = e.target.value.replace(/[^\d]/g, ''); setEditNominal(raw ? formatRupiah(parseInt(raw)) : ''); }}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all" autoFocus />
                    </div>
                    <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Tanggal Bayar *</label>
                        <input type="date" value={editTanggal} onChange={e => setEditTanggal(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all" />
                    </div>
                    <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Catatan</label>
                        <input type="text" value={editCatatan} onChange={e => setEditCatatan(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder-gray-400" placeholder="Opsional..." />
                    </div>
                </div>
            </CrudModal>
        </>
    );
}
