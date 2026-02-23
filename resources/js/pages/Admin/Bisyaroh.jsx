import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { API_BASE, authFetch } from '../../config/api';
import Swal from 'sweetalert2';

const BULAN_NAMES = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const CATEGORY_LABELS = {
    tarif_dasar: 'Tarif Dasar',
    tunjangan_jabatan: 'Tunjangan Jabatan',
    tunjangan_kegiatan: 'Tunjangan Kegiatan & Rapat',
    potongan: 'Potongan / Iuran',
};
const CATEGORY_ICONS = {
    tarif_dasar: 'fa-coins',
    tunjangan_jabatan: 'fa-user-tie',
    tunjangan_kegiatan: 'fa-tasks',
    potongan: 'fa-minus-circle',
};
const CATEGORY_ORDER = ['tarif_dasar', 'tunjangan_jabatan', 'tunjangan_kegiatan', 'potongan'];

function formatRupiah(val) {
    if (val === null || val === undefined || val === '') return '-';
    const num = Number(val);
    if (isNaN(num)) return '-';
    return 'Rp' + num.toLocaleString('id-ID');
}

function formatInputRupiah(val) {
    if (!val && val !== 0) return '';
    return Number(val).toLocaleString('id-ID');
}

function parseRupiahInput(str) {
    return str.replace(/[^0-9]/g, '');
}

function Bisyaroh() {
    const now = new Date();
    const [bulan, setBulan] = useState(now.getMonth() + 1);
    const [tahun, setTahun] = useState(now.getFullYear());
    const [data, setData] = useState([]);
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [isSettingsClosing, setIsSettingsClosing] = useState(false);
    const [showDetail, setShowDetail] = useState(null);
    const [isDetailClosing, setIsDetailClosing] = useState(false);
    const [settingsData, setSettingsData] = useState(null);
    const [savingSettings, setSavingSettings] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [detailData, setDetailData] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [activeDetailTab, setActiveDetailTab] = useState('rincian');
    const [showKegiatanOverview, setShowKegiatanOverview] = useState(false);
    const [showRapatOverview, setShowRapatOverview] = useState(false);
    const [isOverviewClosing, setIsOverviewClosing] = useState(false);
    const [kegiatanBulanData, setKegiatanBulanData] = useState([]);
    const [rapatBulanData, setRapatBulanData] = useState([]);
    const [loadingOverview, setLoadingOverview] = useState(false);

    // History / Riwayat state
    const [histories, setHistories] = useState([]);
    const [loadingHistories, setLoadingHistories] = useState(false);
    const [savingHistory, setSavingHistory] = useState(false);
    const [viewHistory, setViewHistory] = useState(null);
    const [isHistoryViewClosing, setIsHistoryViewClosing] = useState(false);
    const [viewingHistory, setViewingHistory] = useState(null); // currently loaded history snapshot
    const [liveData, setLiveData] = useState(null); // cached live data when viewing history

    useEffect(() => {
        const h = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', h);
        return () => window.removeEventListener('resize', h);
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setViewingHistory(null);
        setLiveData(null);
        try {
            const res = await authFetch(`${API_BASE}/bisyaroh?bulan=${bulan}&tahun=${tahun}`);
            const json = await res.json();
            if (json.success) {
                setData(json.data);
                setSettings(json.settings || {});
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [bulan, tahun]);

    const fetchHistories = useCallback(async () => {
        setLoadingHistories(true);
        try {
            const res = await authFetch(`${API_BASE}/bisyaroh/history`);
            const json = await res.json();
            if (json.success) setHistories(json.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingHistories(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);
    useEffect(() => { fetchHistories(); }, [fetchHistories]);

    const handleSaveHistory = async () => {
        const result = await Swal.fire({
            title: 'Simpan ke Riwayat?',
            html: `Simpan data bisyaroh <strong>${BULAN_NAMES[bulan]} ${tahun}</strong> sebagai riwayat?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#16a34a',
            cancelButtonColor: '#6B7280',
            confirmButtonText: 'Ya, Simpan',
            cancelButtonText: 'Batal',
            input: 'text',
            inputLabel: 'Catatan (opsional)',
            inputPlaceholder: 'Misal: Revisi ke-2',
        });
        if (!result.isConfirmed) return;

        setSavingHistory(true);
        try {
            const res = await authFetch(`${API_BASE}/bisyaroh/history`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bulan, tahun, notes: result.value || null }),
            });
            const json = await res.json();
            if (json.success) {
                Swal.fire({ icon: 'success', title: 'Tersimpan!', text: json.message, timer: 1500, showConfirmButton: false });
                fetchHistories();
            } else {
                Swal.fire({ icon: 'error', title: 'Gagal', text: json.message });
            }
        } catch (e) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Gagal menyimpan riwayat.' });
        } finally {
            setSavingHistory(false);
        }
    };

    const handleLockHistory = async (id, currentStatus) => {
        const action = currentStatus === 'locked' ? 'Unlock' : 'Kunci';
        const result = await Swal.fire({
            title: `${action} Riwayat?`,
            text: currentStatus === 'locked' ? 'Riwayat akan bisa dihapus kembali.' : 'Riwayat yang dikunci tidak bisa dihapus.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: currentStatus === 'locked' ? '#f59e0b' : '#16a34a',
            cancelButtonColor: '#6B7280',
            confirmButtonText: `Ya, ${action}`,
            cancelButtonText: 'Batal',
        });
        if (!result.isConfirmed) return;

        try {
            const res = await authFetch(`${API_BASE}/bisyaroh/history/${id}/lock`, { method: 'PATCH' });
            const json = await res.json();
            if (json.success) {
                Swal.fire({ icon: 'success', title: 'Berhasil!', text: json.message, timer: 1500, showConfirmButton: false });
                fetchHistories();
            }
        } catch (e) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Gagal mengubah status.' });
        }
    };

    const handleDeleteHistory = async (id) => {
        const result = await Swal.fire({
            title: 'Hapus Riwayat?',
            text: 'Data riwayat yang dihapus tidak bisa dikembalikan.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6B7280',
            confirmButtonText: 'Ya, Hapus',
            cancelButtonText: 'Batal',
        });
        if (!result.isConfirmed) return;

        try {
            const res = await authFetch(`${API_BASE}/bisyaroh/history/${id}`, { method: 'DELETE' });
            const json = await res.json();
            if (json.success) {
                Swal.fire({ icon: 'success', title: 'Terhapus!', text: json.message, timer: 1500, showConfirmButton: false });
                fetchHistories();
            } else {
                Swal.fire({ icon: 'error', title: 'Gagal', text: json.message });
            }
        } catch (e) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Gagal menghapus.' });
        }
    };

    const handleViewHistory = async (id) => {
        try {
            const res = await authFetch(`${API_BASE}/bisyaroh/history/${id}`);
            const json = await res.json();
            if (json.success && json.data && Array.isArray(json.data.data)) {
                // Save live data so we can restore it
                if (!viewingHistory) setLiveData(data);
                setData(json.data.data);
                setViewingHistory(json.data);
                // Scroll to top of data table
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } catch (e) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Gagal memuat data riwayat.' });
        }
    };

    const handleBackToLive = () => {
        if (liveData) setData(liveData);
        setViewingHistory(null);
        setLiveData(null);
    };

    const closeHistoryView = () => {
        setIsHistoryViewClosing(true);
        setTimeout(() => { setViewHistory(null); setIsHistoryViewClosing(false); }, 300);
    };

    const handleGenerate = async () => {
        const result = await Swal.fire({
            title: 'Generate Bisyaroh?',
            html: `Generate bisyaroh bulan <strong>${BULAN_NAMES[bulan]} ${tahun}</strong> untuk semua guru/pegawai aktif?<br><small class="text-gray-400">Data yang sudah ada akan di-update</small>`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#16a34a',
            cancelButtonColor: '#6B7280',
            confirmButtonText: 'Ya, Generate',
            cancelButtonText: 'Batal',
        });
        if (!result.isConfirmed) return;

        setGenerating(true);
        try {
            const res = await authFetch(`${API_BASE}/bisyaroh/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bulan, tahun }),
            });
            const json = await res.json();
            if (json.success) {
                Swal.fire({ icon: 'success', title: 'Berhasil!', text: json.message, timer: 1500, showConfirmButton: false });
                fetchData();
            } else {
                Swal.fire({ icon: 'error', title: 'Gagal!', text: json.message, timer: 2000, showConfirmButton: false });
            }
        } catch (e) {
            Swal.fire({ icon: 'error', title: 'Gagal!', text: e.message, timer: 2000, showConfirmButton: false });
        } finally {
            setGenerating(false);
        }
    };

    const fetchSettingsData = async () => {
        try {
            const res = await authFetch(`${API_BASE}/bisyaroh/settings`);
            const json = await res.json();
            if (json.success) setSettingsData(json.data);
        } catch (e) {
            console.error(e);
        }
    };

    const handleOpenSettings = () => {
        fetchSettingsData();
        setIsSettingsClosing(false);
        setShowSettings(true);
    };

    const closeSettings = () => {
        setIsSettingsClosing(true);
        setTimeout(() => {
            setShowSettings(false);
            setIsSettingsClosing(false);
        }, 200);
    };

    const handleSaveSettings = async () => {
        if (!settingsData) return;
        setSavingSettings(true);
        try {
            const allSettings = Object.values(settingsData).flat().map(s => ({ key: s.key, value: s.value }));
            const res = await authFetch(`${API_BASE}/bisyaroh/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ settings: allSettings }),
            });
            const json = await res.json();
            if (json.success) {
                Swal.fire({ icon: 'success', title: 'Berhasil!', text: json.message, timer: 1500, showConfirmButton: false });
                closeSettings();
                fetchData();
            }
        } catch (e) {
            Swal.fire({ icon: 'error', title: 'Gagal!', text: e.message, timer: 2000, showConfirmButton: false });
        } finally {
            setSavingSettings(false);
        }
    };

    const handleAddPotongan = async () => {
        const { value: formValues } = await Swal.fire({
            title: 'Tambah Potongan / Iuran',
            html: '<input id="swal-label" class="swal2-input" placeholder="Nama (mis: Arisan)">' +
                '<input id="swal-value" class="swal2-input" type="number" placeholder="Nilai (mis: 20000)">',
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonColor: '#16a34a',
            cancelButtonColor: '#6B7280',
            confirmButtonText: 'Tambah',
            cancelButtonText: 'Batal',
            preConfirm: () => {
                const label = document.getElementById('swal-label').value.trim();
                const value = document.getElementById('swal-value').value.trim();
                if (!label || !value) { Swal.showValidationMessage('Nama dan nilai harus diisi'); return false; }
                return { label, value };
            }
        });
        if (!formValues) return;
        try {
            const key = 'pot_' + formValues.label.toLowerCase().replace(/[^a-z0-9]/g, '_');
            const res = await authFetch(`${API_BASE}/bisyaroh/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key, value: formValues.value, type: 'integer', category: 'potongan', label: formValues.label }),
            });
            const json = await res.json();
            if (json.success) {
                Swal.fire({ icon: 'success', title: 'Berhasil!', text: 'Potongan baru ditambahkan', timer: 1500, showConfirmButton: false });
                fetchSettingsData();
            } else {
                Swal.fire({ icon: 'error', title: 'Gagal!', text: json.message || 'Gagal menambah potongan', timer: 2000, showConfirmButton: false });
            }
        } catch (e) {
            Swal.fire({ icon: 'error', title: 'Gagal!', text: e.message });
        }
    };

    const handleDeletePotongan = async (item) => {
        const result = await Swal.fire({
            title: 'Hapus Potongan?',
            html: `Hapus <strong>${item.label}</strong> dari daftar potongan?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6B7280',
            confirmButtonText: 'Ya, Hapus',
            cancelButtonText: 'Batal',
        });
        if (!result.isConfirmed) return;
        try {
            const res = await authFetch(`${API_BASE}/bisyaroh/settings/${item.id}`, { method: 'DELETE' });
            const json = await res.json();
            if (json.success) {
                Swal.fire({ icon: 'success', title: 'Dihapus!', text: 'Potongan berhasil dihapus', timer: 1500, showConfirmButton: false });
                fetchSettingsData();
            }
        } catch (e) {
            Swal.fire({ icon: 'error', title: 'Gagal!', text: e.message });
        }
    };

    const updateSettingValue = (category, key, value) => {
        setSettingsData(prev => {
            const updated = { ...prev };
            updated[category] = updated[category].map(s => s.key === key ? { ...s, value: value } : s);
            return updated;
        });
    };

    const handleOpenDetail = async (item) => {
        setShowDetail(item.id);
        setIsDetailClosing(false);
        setLoadingDetail(true);
        setActiveDetailTab('rincian');
        try {
            const res = await authFetch(`${API_BASE}/bisyaroh/${item.id}`);
            const json = await res.json();
            if (json.success) setDetailData(json.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingDetail(false);
        }
    };

    const closeDetail = () => {
        setIsDetailClosing(true);
        setTimeout(() => {
            setShowDetail(null);
            setDetailData(null);
            setIsDetailClosing(false);
        }, 200);
    };

    const handlePrintRekap = () => {
        const token = localStorage.getItem('auth_token');
        window.open(`${API_BASE}/bisyaroh/print-rekap?bulan=${bulan}&tahun=${tahun}&token=${token}`, '_blank');
    };

    const handleOpenKegiatanOverview = async () => {
        setLoadingOverview(true);
        setIsOverviewClosing(false);
        setShowKegiatanOverview(true);
        try {
            const res = await authFetch(`${API_BASE}/bisyaroh/kegiatan-bulan?bulan=${bulan}&tahun=${tahun}`);
            const json = await res.json();
            if (json.success) setKegiatanBulanData(json.data);
        } catch (e) { console.error(e); }
        finally { setLoadingOverview(false); }
    };

    const handleOpenRapatOverview = async () => {
        setLoadingOverview(true);
        setIsOverviewClosing(false);
        setShowRapatOverview(true);
        try {
            const res = await authFetch(`${API_BASE}/bisyaroh/rapat-bulan?bulan=${bulan}&tahun=${tahun}`);
            const json = await res.json();
            if (json.success) setRapatBulanData(json.data);
        } catch (e) { console.error(e); }
        finally { setLoadingOverview(false); }
    };

    const closeOverview = () => {
        setIsOverviewClosing(true);
        setTimeout(() => {
            setShowKegiatanOverview(false);
            setShowRapatOverview(false);
            setIsOverviewClosing(false);
        }, 200);
    };

    const handlePrintRincian = (id) => {
        const token = localStorage.getItem('auth_token');
        window.open(`${API_BASE}/bisyaroh/${id}/print-rincian?token=${token}`, '_blank');
    };

    // Extract dynamic potongan column keys from data
    const potonganKeys = useMemo(() => {
        const keySet = new Map();
        data.forEach(b => {
            if (b.potongan_detail && typeof b.potongan_detail === 'object') {
                Object.keys(b.potongan_detail).forEach(k => {
                    if (!keySet.has(k)) keySet.set(k, k);
                });
            }
        });
        return Array.from(keySet.keys());
    }, [data]);

    // Totals
    const totals = useMemo(() => {
        const n = v => Number(v) || 0;
        const base = data.reduce((acc, b) => ({
            gaji_pokok: acc.gaji_pokok + n(b.gaji_pokok),
            tunj_struktural: acc.tunj_struktural + n(b.tunj_struktural),
            tunj_transport: acc.tunj_transport + n(b.tunj_transport),
            tunj_masa_kerja: acc.tunj_masa_kerja + n(b.tunj_masa_kerja),
            tunj_keg_rapat: acc.tunj_keg_rapat + n(b.tunj_kegiatan) + n(b.tunj_rapat),
            jumlah: acc.jumlah + n(b.jumlah),
            jumlah_potongan: acc.jumlah_potongan + n(b.jumlah_potongan),
            total_penerimaan: acc.total_penerimaan + n(b.total_penerimaan),
        }), { gaji_pokok: 0, tunj_struktural: 0, tunj_transport: 0, tunj_masa_kerja: 0, tunj_keg_rapat: 0, jumlah: 0, jumlah_potongan: 0, total_penerimaan: 0 });
        // Per-potongan totals
        const potTotals = {};
        potonganKeys.forEach(k => {
            potTotals[k] = data.reduce((sum, b) => sum + (Number((b.potongan_detail && b.potongan_detail[k]) || 0)), 0);
        });
        base.potongan_per_item = potTotals;
        return base;
    }, [data, potonganKeys]);

    return (
        <div className="animate-fadeIn flex flex-col flex-grow max-w-full overflow-auto">
            {/* Header — matches ManajemenGuru pattern */}
            <header className={`${isMobile ? 'mb-3 mobile-sticky-header pt-2 pb-2 px-1' : 'mb-6'}`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="page-header-icon w-12 h-12 bg-gradient-to-br from-primary to-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                            <i className="fas fa-wallet text-white text-xl"></i>
                        </div>
                        <div>
                            <h1 className="page-header-title text-xl font-black text-gray-800 uppercase tracking-tight">Bisyaroh</h1>
                            <p className="page-header-subtitle text-xs text-gray-400 mt-0.5 font-medium uppercase tracking-widest">Gaji Guru & Pegawai</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Controls Bar */}
            <div className={`${isMobile ? 'mobile-sticky-header' : ''}`}>
                {isMobile ? (
                    /* ========== MOBILE Controls ========== */
                    <div className="flex flex-col gap-2 px-1 py-2">
                        {/* Row 1: Date picker + guru count */}
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-1">
                                {/* Month dropdown */}
                                <div className="relative flex-1">
                                    <i className="fas fa-calendar-alt absolute left-2.5 top-1/2 -translate-y-1/2 text-primary/60 text-[10px] pointer-events-none"></i>
                                    <select value={bulan} onChange={e => setBulan(Number(e.target.value))}
                                        className="w-full appearance-none bg-white rounded-xl border border-gray-200 pl-7 pr-7 py-2 text-xs font-bold text-gray-700 outline-none cursor-pointer shadow-sm hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all">
                                        {BULAN_NAMES.slice(1).map((n, i) => <option key={i + 1} value={i + 1}>{n}</option>)}
                                    </select>
                                    <i className="fas fa-chevron-down absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[8px] pointer-events-none"></i>
                                </div>
                                {/* Year dropdown */}
                                <div className="relative w-[85px] shrink-0">
                                    <select value={tahun} onChange={e => setTahun(Number(e.target.value))}
                                        className="w-full appearance-none bg-white rounded-xl border border-gray-200 pl-3 pr-7 py-2 text-xs font-bold text-gray-700 outline-none cursor-pointer shadow-sm hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all">
                                        {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 3 + i).map(y => (
                                            <option key={y} value={y}>{y}</option>
                                        ))}
                                    </select>
                                    <i className="fas fa-chevron-down absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[8px] pointer-events-none"></i>
                                </div>
                            </div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                                {data.length} <span className="hidden xs:inline">guru</span>
                            </span>
                        </div>
                        {/* Row 2: Action buttons - compact scrollable */}
                        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
                            <button onClick={handleOpenKegiatanOverview}
                                className="btn-secondary flex items-center gap-1.5 px-3 py-2 text-[10px] rounded-xl font-bold uppercase tracking-wider whitespace-nowrap shrink-0" type="button">
                                <i className="fas fa-tasks text-[9px]"></i>
                                Kegiatan
                            </button>
                            <button onClick={handleOpenRapatOverview}
                                className="btn-secondary flex items-center gap-1.5 px-3 py-2 text-[10px] rounded-xl font-bold uppercase tracking-wider whitespace-nowrap shrink-0" type="button">
                                <i className="fas fa-users text-[9px]"></i>
                                Rapat
                            </button>
                            <button onClick={handleOpenSettings}
                                className="btn-secondary flex items-center gap-1.5 px-3 py-2 text-[10px] rounded-xl font-bold uppercase tracking-wider whitespace-nowrap shrink-0" type="button">
                                <i className="fas fa-cog text-[9px]"></i>
                                Pengaturan
                            </button>
                            <button onClick={handlePrintRekap} disabled={data.length === 0}
                                className="btn-secondary flex items-center gap-1.5 px-3 py-2 text-[10px] rounded-xl font-bold uppercase tracking-wider whitespace-nowrap shrink-0 disabled:opacity-40" type="button">
                                <i className="fas fa-print text-[9px]"></i>
                                Rekap
                            </button>
                            <button onClick={handleGenerate} disabled={generating}
                                className="btn-primary flex items-center gap-1.5 px-4 py-2 text-[10px] rounded-xl font-bold uppercase tracking-wider whitespace-nowrap shrink-0 shadow-md shadow-primary/20 disabled:opacity-50" type="button">
                                <i className={`fas ${generating ? 'fa-spinner fa-spin' : 'fa-calculator'} text-[9px]`}></i>
                                {generating ? 'Proses...' : 'Generate'}
                            </button>
                        </div>
                    </div>
                ) : (
                    /* ========== DESKTOP Controls ========== */
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                        {/* Left: Month/Year Picker + Settings Info */}
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                {/* Month dropdown */}
                                <div className="relative">
                                    <i className="fas fa-calendar-alt absolute left-3 top-1/2 -translate-y-1/2 text-primary/60 text-xs pointer-events-none"></i>
                                    <select value={bulan} onChange={e => setBulan(Number(e.target.value))}
                                        className="appearance-none bg-white rounded-xl border border-gray-200 pl-8 pr-8 py-2 text-xs font-bold text-gray-700 outline-none cursor-pointer shadow-sm hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all">
                                        {BULAN_NAMES.slice(1).map((n, i) => <option key={i + 1} value={i + 1}>{n}</option>)}
                                    </select>
                                    <i className="fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[9px] pointer-events-none"></i>
                                </div>
                                {/* Year dropdown */}
                                <div className="relative">
                                    <select value={tahun} onChange={e => setTahun(Number(e.target.value))}
                                        className="appearance-none bg-white rounded-xl border border-gray-200 pl-3 pr-8 py-2 text-xs font-bold text-gray-700 outline-none cursor-pointer shadow-sm hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all">
                                        {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 3 + i).map(y => (
                                            <option key={y} value={y}>{y}</option>
                                        ))}
                                    </select>
                                    <i className="fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[9px] pointer-events-none"></i>
                                </div>
                            </div>
                            {settings.bisyaroh_per_jam && (
                                <div className="flex items-center gap-3 text-[10px] text-gray-400 font-medium uppercase tracking-widest">
                                    <span>Per Jam: <strong className="text-gray-600">{formatRupiah(settings.bisyaroh_per_jam)}</strong></span>
                                    <span>Transport: <strong className="text-gray-600">{formatRupiah(settings.transport_per_hadir)}</strong></span>
                                </div>
                            )}
                        </div>

                        {/* Right: Action Buttons */}
                        <div className="flex gap-2 flex-wrap md:flex-nowrap items-center">
                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mr-2">
                                <div className="w-1 h-1 rounded-full bg-primary animate-pulse"></div>
                                {data.length} guru/pegawai
                            </span>
                            <button onClick={handleOpenKegiatanOverview}
                                className="btn-secondary flex items-center gap-1 font-black uppercase tracking-widest px-5 py-2.5 text-[10px] rounded-xl" type="button">
                                <i className="fas fa-tasks"></i>
                                <span>Kegiatan</span>
                            </button>
                            <button onClick={handleOpenRapatOverview}
                                className="btn-secondary flex items-center gap-1 font-black uppercase tracking-widest px-5 py-2.5 text-[10px] rounded-xl" type="button">
                                <i className="fas fa-users"></i>
                                <span>Rapat</span>
                            </button>
                            <button onClick={handleOpenSettings}
                                className="btn-secondary flex items-center gap-1 font-black uppercase tracking-widest px-5 py-2.5 text-[10px] rounded-xl" type="button">
                                <i className="fas fa-cog"></i>
                                <span>Pengaturan</span>
                            </button>
                            <button onClick={handlePrintRekap} disabled={data.length === 0}
                                className="btn-secondary flex items-center gap-1 font-black uppercase tracking-widest disabled:opacity-40 px-5 py-2.5 text-[10px] rounded-xl" type="button">
                                <i className="fas fa-print"></i>
                                <span>Cetak Rekap</span>
                            </button>
                            <button onClick={handleGenerate} disabled={generating}
                                className="btn-primary flex items-center gap-1 group shadow-lg shadow-primary/20 font-black uppercase tracking-widest disabled:opacity-50 px-4 py-2.5 text-[10px] rounded-xl" type="button">
                                <i className={`fas ${generating ? 'fa-spinner fa-spin' : 'fa-calculator'} group-hover:rotate-90 transition-transform`}></i>
                                <span>{generating ? 'Generating...' : 'Generate'}</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Viewing History Banner */}
            {viewingHistory && (
                <div className="mb-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                            <i className="fas fa-history text-amber-600"></i>
                        </div>
                        <div>
                            <div className="text-xs font-black text-amber-700 uppercase tracking-wider">
                                <i className="fas fa-eye mr-1"></i>Melihat Riwayat: {viewingHistory.label}
                            </div>
                            <div className="text-[10px] text-amber-500 mt-0.5">
                                {viewingHistory.total_guru} guru • {formatRupiah(viewingHistory.total_penerimaan)} • Disimpan {viewingHistory.created_at ? new Date(viewingHistory.created_at).toLocaleDateString('id-ID') : ''}
                                {viewingHistory.status === 'locked' && <span className="ml-1">🔒 Terkunci</span>}
                            </div>
                        </div>
                    </div>
                    <button onClick={handleBackToLive}
                        className="shrink-0 px-4 py-2 bg-white border border-amber-200 text-amber-700 text-[10px] font-bold uppercase tracking-wider rounded-xl hover:bg-amber-50 transition-all shadow-sm" type="button">
                        <i className="fas fa-arrow-left mr-1"></i>Kembali ke Data Live
                    </button>
                </div>
            )}

            {/* Loading State */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700"></div>
                    <span className="ml-3 text-gray-600">Memuat data...</span>
                </div>
            ) : data.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-soft border border-gray-100 overflow-hidden">
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center">
                            <i className="fas fa-file-invoice-dollar text-2xl text-gray-300"></i>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-400 text-center">Belum Ada Data Bisyaroh</p>
                            <p className="text-[11px] text-gray-400 mt-1 uppercase tracking-widest font-medium text-center">
                                Klik "Generate" untuk menghitung bisyaroh bulan ini
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className={`bg-white rounded-2xl shadow-soft border border-gray-100 ${isMobile ? 'overflow-hidden' : 'overflow-x-auto scrollbar-hide'}`}>
                    {isMobile ? (
                        /* ========== MOBILE: Card Layout ========== */
                        <div className="divide-y divide-gray-100">
                            {data.map((b, i) => (
                                <div key={b.id} className="p-3 active:bg-gray-50 transition-colors" onClick={() => handleOpenDetail(b)}>
                                    {/* Top: Name + Jabatan + Actions */}
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1 min-w-0 mr-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold text-gray-400 w-5 shrink-0">{i + 1}</span>
                                                <span className="text-[13px] font-black text-gray-800 truncate">{b.nama}</span>
                                            </div>
                                            <div className="flex items-center gap-2 ml-7 mt-0.5">
                                                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-bold">{b.jabatan || 'Guru'}</span>
                                                <span className="text-[9px] text-gray-400">{b.jumlah_jam} jam &bull; {b.jumlah_hadir} hadir</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                                            <button onClick={() => handleOpenDetail(b)} className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all flex items-center justify-center" title="Lihat Rincian">
                                                <i className="fas fa-eye text-[9px]"></i>
                                            </button>
                                            <button onClick={() => handlePrintRincian(b.id)} className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 transition-all flex items-center justify-center" title="Cetak Rincian">
                                                <i className="fas fa-print text-[9px]"></i>
                                            </button>
                                        </div>
                                    </div>
                                    {/* Bottom: Salary info grid */}
                                    <div className="ml-7 grid grid-cols-3 gap-x-3 gap-y-1">
                                        <div>
                                            <div className="text-[8px] text-gray-400 uppercase tracking-wider font-bold">Gaji Pokok</div>
                                            <div className="text-[11px] font-mono font-bold text-gray-700">{formatRupiah(b.gaji_pokok)}</div>
                                        </div>
                                        <div>
                                            <div className="text-[8px] text-gray-400 uppercase tracking-wider font-bold">Jumlah</div>
                                            <div className="text-[11px] font-mono font-bold text-primary">{formatRupiah(b.jumlah)}</div>
                                        </div>
                                        <div>
                                            <div className="text-[8px] text-emerald-500 uppercase tracking-wider font-bold">Penerimaan</div>
                                            <div className="text-[12px] font-mono font-extrabold text-emerald-600">{formatRupiah(b.total_penerimaan)}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {/* Mobile Footer */}
                            <div className="p-3 bg-gray-50/80">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1 h-1 rounded-full bg-primary animate-pulse"></div>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{data.length} Guru &bull; {BULAN_NAMES[bulan]} {tahun}</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[8px] text-gray-400 uppercase font-bold">Total Penerimaan</div>
                                        <div className="text-[13px] font-mono font-extrabold text-emerald-600">{formatRupiah(totals.total_penerimaan)}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* ========== DESKTOP: Table Layout ========== */
                        <>
                            <table className="admin-table min-w-[1400px]">
                                <thead>
                                    <tr>
                                        <th className="select-none py-2.5 text-center text-xs font-black text-gray-400 uppercase tracking-widest w-10">No</th>
                                        <th className="select-none py-2.5 px-2 text-xs font-black text-gray-400 uppercase tracking-widest">Nama</th>
                                        <th className="select-none py-2.5 px-2 text-center text-xs font-black text-gray-400 uppercase tracking-widest">Jabatan</th>
                                        <th className="select-none py-2.5 px-2 text-center text-xs font-black text-gray-400 uppercase tracking-widest">Jam</th>
                                        <th className="select-none py-2.5 px-2 text-center text-xs font-black text-gray-400 uppercase tracking-widest">Hadir</th>
                                        <th className="select-none py-2.5 px-2 text-right text-xs font-black text-gray-400 uppercase tracking-widest">Gaji Pokok</th>
                                        <th className="select-none py-2.5 px-2 text-right text-xs font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Tunj Struktural</th>
                                        <th className="select-none py-2.5 px-2 text-right text-xs font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Tunj Transport</th>
                                        <th className="select-none py-2.5 px-2 text-right text-xs font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Tunj M. Kerja</th>
                                        <th className="select-none py-2.5 px-2 text-right text-xs font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Tunj Keg & Rapat</th>
                                        <th className="select-none py-2.5 px-2 text-right text-xs font-black text-primary uppercase tracking-widest">Jumlah</th>
                                        {potonganKeys.map(pk => (
                                            <th key={pk} className="select-none py-2.5 px-2 text-right text-xs font-black text-rose-400 uppercase tracking-widest whitespace-nowrap">{pk}</th>
                                        ))}
                                        <th className="select-none py-2.5 px-2 text-right text-xs font-black text-emerald-600 uppercase tracking-widest whitespace-nowrap">Total Penerimaan</th>
                                        <th className="select-none py-2.5 text-center text-xs font-black text-gray-400 uppercase tracking-widest px-6">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map((b, i) => (
                                        <tr key={b.id} className="hover:bg-primary/5 transition-colors cursor-pointer" onClick={() => handleOpenDetail(b)}>
                                            <td className="text-center text-xs font-bold text-gray-400">{i + 1}</td>
                                            <td className="px-2 py-2 align-middle whitespace-nowrap">
                                                <span className="text-sm font-black text-gray-700 uppercase tracking-tight">{b.nama}</span>
                                            </td>
                                            <td className="px-2 py-2 align-middle text-center whitespace-nowrap">
                                                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">{b.jabatan || '-'}</span>
                                            </td>
                                            <td className="px-2 py-2 align-middle text-center text-xs font-medium text-gray-600">{b.jumlah_jam}</td>
                                            <td className="px-2 py-2 align-middle text-center text-xs font-medium text-gray-600">{b.jumlah_hadir}</td>
                                            <td className="px-2 py-2 align-middle text-right text-xs font-mono text-gray-700">{formatRupiah(b.gaji_pokok)}</td>
                                            <td className="px-2 py-2 align-middle text-right text-xs font-mono text-gray-500">{b.tunj_struktural ? formatRupiah(b.tunj_struktural) : '-'}</td>
                                            <td className="px-2 py-2 align-middle text-right text-xs font-mono text-gray-500">{b.tunj_transport ? formatRupiah(b.tunj_transport) : '-'}</td>
                                            <td className="px-2 py-2 align-middle text-right text-xs font-mono text-gray-500">{b.tunj_masa_kerja ? formatRupiah(b.tunj_masa_kerja) : '-'}</td>
                                            <td className="px-2 py-2 align-middle text-right text-xs font-mono text-gray-500">{(Number(b.tunj_kegiatan || 0) + Number(b.tunj_rapat || 0)) > 0 ? formatRupiah(Number(b.tunj_kegiatan || 0) + Number(b.tunj_rapat || 0)) : '-'}</td>
                                            <td className="px-2 py-2 align-middle text-right text-xs font-mono font-bold text-primary">{formatRupiah(b.jumlah)}</td>
                                            {potonganKeys.map(pk => (
                                                <td key={pk} className="px-2 py-2 align-middle text-right text-xs font-mono text-rose-500">
                                                    {(b.potongan_detail && b.potongan_detail[pk]) ? formatRupiah(b.potongan_detail[pk]) : '-'}
                                                </td>
                                            ))}
                                            <td className="px-2 py-2 align-middle text-right text-xs font-mono font-bold text-emerald-600">{formatRupiah(b.total_penerimaan)}</td>
                                            <td className="text-center px-6" onClick={e => e.stopPropagation()}>
                                                <div className="flex items-center justify-center gap-1">
                                                    <button onClick={() => handleOpenDetail(b)} className="action-btn w-8 h-8 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all flex items-center justify-center hover:scale-110 active:scale-95" title="Lihat Rincian">
                                                        <i className="fas fa-eye text-[10px]"></i>
                                                    </button>
                                                    <button onClick={() => handlePrintRincian(b.id)} className="action-btn w-8 h-8 rounded-xl bg-orange-50 text-orange-600 hover:bg-orange-100 transition-all flex items-center justify-center hover:scale-110 active:scale-95" title="Cetak Rincian">
                                                        <i className="fas fa-print text-[10px]"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-gray-50/50">
                                        <td colSpan={5} className="px-3 py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</td>
                                        <td className="px-2 py-3 text-right text-xs font-mono font-bold text-gray-700">{formatRupiah(totals.gaji_pokok)}</td>
                                        <td className="px-2 py-3 text-right text-xs font-mono text-gray-500">{formatRupiah(totals.tunj_struktural)}</td>
                                        <td className="px-2 py-3 text-right text-xs font-mono text-gray-500">{formatRupiah(totals.tunj_transport)}</td>
                                        <td className="px-2 py-3 text-right text-xs font-mono text-gray-500">{formatRupiah(totals.tunj_masa_kerja)}</td>
                                        <td className="px-2 py-3 text-right text-xs font-mono text-gray-500">{formatRupiah(totals.tunj_keg_rapat)}</td>
                                        <td className="px-2 py-3 text-right text-xs font-mono font-bold text-primary">{formatRupiah(totals.jumlah)}</td>
                                        {potonganKeys.map(pk => (
                                            <td key={pk} className="px-2 py-3 text-right text-xs font-mono text-rose-500">{formatRupiah((totals.potongan_per_item || {})[pk] || 0)}</td>
                                        ))}
                                        <td className="px-2 py-3 text-right text-xs font-mono font-bold text-emerald-600">{formatRupiah(totals.total_penerimaan)}</td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>

                            {/* Footer */}
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-6 border-t border-gray-100 bg-gray-50/30 rounded-b-2xl">
                                <div className="flex items-center gap-4">
                                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <div className="w-1 h-1 rounded-full bg-primary animate-pulse"></div>
                                        {data.length} Total Data
                                    </span>
                                </div>
                                <div className="text-[11px] font-medium text-gray-400 uppercase tracking-widest">
                                    {BULAN_NAMES[bulan]} {tahun}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ============ RIWAYAT GENERATE SECTION ============ */}
            <div className={`mt-6 ${isMobile ? 'px-0' : ''}`}>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-8 bg-gradient-to-b from-amber-400 to-orange-500 rounded-full"></div>
                        <div>
                            <h3 className="text-sm font-black text-gray-700 uppercase tracking-wider">Riwayat Generate</h3>
                            <p className="text-[10px] text-gray-400 font-medium">Data bisyaroh yang sudah disimpan</p>
                        </div>
                    </div>
                    {data.length > 0 && (
                        <button onClick={handleSaveHistory} disabled={savingHistory}
                            className="btn-primary flex items-center gap-1.5 px-4 py-2 text-[10px] rounded-xl font-bold uppercase tracking-wider shadow-md shadow-primary/20 disabled:opacity-50" type="button">
                            <i className={`fas ${savingHistory ? 'fa-spinner fa-spin' : 'fa-save'} text-[9px]`}></i>
                            {savingHistory ? 'Menyimpan...' : 'Simpan ke Riwayat'}
                        </button>
                    )}
                </div>

                {loadingHistories ? (
                    <div className="text-center py-8 text-gray-400 text-xs"><i className="fas fa-spinner fa-spin mr-2"></i>Memuat riwayat...</div>
                ) : histories.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-soft p-8 text-center">
                        <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                            <i className="fas fa-history text-amber-400 text-lg"></i>
                        </div>
                        <p className="text-sm font-bold text-gray-400">Belum ada riwayat</p>
                        <p className="text-[10px] text-gray-300 mt-1">Generate dan simpan data bisyaroh untuk melihat riwayat di sini.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-soft overflow-hidden">
                        {isMobile ? (
                            /* Mobile: Card list */
                            <div className="divide-y divide-gray-100">
                                {histories.map(h => (
                                    <div key={h.id} className={`p-3 cursor-pointer transition-colors ${viewingHistory?.id === h.id ? 'bg-amber-50' : 'hover:bg-gray-50'}`}
                                        onClick={() => handleViewHistory(h.id)}>
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="text-xs font-bold text-gray-700 truncate">{h.label}</span>
                                                    <span className={`shrink-0 px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-wider ${h.status === 'locked' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                                                        }`}>
                                                        {h.status === 'locked' ? '🔒 Terkunci' : '📝 Draft'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] text-gray-400">
                                                    <span><i className="fas fa-users text-[8px] mr-1"></i>{h.total_guru} guru</span>
                                                    <span>•</span>
                                                    <span className="font-mono font-bold text-primary">{formatRupiah(h.total_jumlah || 0)}</span>
                                                    <span>•</span>
                                                    <span className="font-mono font-bold text-emerald-600">{formatRupiah(h.total_penerimaan)}</span>
                                                </div>
                                                <div className="text-[9px] text-gray-300 mt-0.5">
                                                    {h.created_at} • oleh {h.created_by_name}
                                                    {h.notes && <span className="ml-1 text-amber-400">— {h.notes}</span>}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                                                <button onClick={() => handleViewHistory(h.id)}
                                                    className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center text-[9px]" title="Lihat">
                                                    <i className="fas fa-eye"></i>
                                                </button>
                                                <button onClick={() => handleLockHistory(h.id, h.status)}
                                                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-[9px] ${h.status === 'locked' ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                                                        }`} title={h.status === 'locked' ? 'Unlock' : 'Kunci'}>
                                                    <i className={`fas ${h.status === 'locked' ? 'fa-lock-open' : 'fa-lock'}`}></i>
                                                </button>
                                                {h.status !== 'locked' && (
                                                    <button onClick={() => handleDeleteHistory(h.id)}
                                                        className="w-7 h-7 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 flex items-center justify-center text-[9px]" title="Hapus">
                                                        <i className="fas fa-trash-alt"></i>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            /* Desktop: Table */
                            <table className="admin-table w-full">
                                <thead>
                                    <tr>
                                        <th className="py-2.5 px-4 text-xs font-black text-gray-400 uppercase tracking-widest text-left">Label</th>
                                        <th className="py-2.5 px-3 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Periode</th>
                                        <th className="py-2.5 px-3 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Guru</th>
                                        <th className="py-2.5 px-3 text-xs font-black text-primary uppercase tracking-widest text-right">Jumlah</th>
                                        <th className="py-2.5 px-3 text-xs font-black text-emerald-600 uppercase tracking-widest text-right">Total Penerimaan</th>
                                        <th className="py-2.5 px-3 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                                        <th className="py-2.5 px-3 text-xs font-black text-gray-400 uppercase tracking-widest text-left">Disimpan</th>
                                        <th className="py-2.5 px-3 text-xs font-black text-gray-400 uppercase tracking-widest text-left">Catatan</th>
                                        <th className="py-2.5 px-4 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {histories.map(h => (
                                        <tr key={h.id} className={`hover:bg-primary/5 transition-colors cursor-pointer ${viewingHistory?.id === h.id ? 'bg-amber-50 ring-1 ring-amber-200' : ''}`}
                                            onClick={() => handleViewHistory(h.id)}>
                                            <td className="px-4 py-3 text-sm font-bold text-gray-700">{h.label}</td>
                                            <td className="px-3 py-3 text-center text-xs text-gray-500">{BULAN_NAMES[h.bulan]} {h.tahun}</td>
                                            <td className="px-3 py-3 text-center text-xs text-gray-500">{h.total_guru}</td>
                                            <td className="px-3 py-3 text-right text-xs font-mono font-bold text-primary">{formatRupiah(h.total_jumlah || 0)}</td>
                                            <td className="px-3 py-3 text-right text-xs font-mono font-bold text-emerald-600">{formatRupiah(h.total_penerimaan)}</td>
                                            <td className="px-3 py-3 text-center">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${h.status === 'locked' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                                                    }`}>
                                                    <i className={`fas ${h.status === 'locked' ? 'fa-lock' : 'fa-pencil-alt'} text-[8px]`}></i>
                                                    {h.status === 'locked' ? 'Terkunci' : 'Draft'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 text-xs text-gray-400">
                                                <div>{h.created_at}</div>
                                                <div className="text-[10px] text-gray-300">{h.created_by_name}</div>
                                            </td>
                                            <td className="px-3 py-3 text-xs text-gray-400 max-w-[150px] truncate">{h.notes || '-'}</td>
                                            <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                                                <div className="flex items-center justify-center gap-1">
                                                    <button onClick={() => handleViewHistory(h.id)}
                                                        className="action-btn w-8 h-8 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all flex items-center justify-center hover:scale-110 active:scale-95" title="Lihat Data">
                                                        <i className="fas fa-eye text-[10px]"></i>
                                                    </button>
                                                    <button onClick={() => handleLockHistory(h.id, h.status)}
                                                        className={`action-btn w-8 h-8 rounded-xl transition-all flex items-center justify-center hover:scale-110 active:scale-95 ${h.status === 'locked' ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                                                            }`} title={h.status === 'locked' ? 'Unlock' : 'Kunci'}>
                                                        <i className={`fas ${h.status === 'locked' ? 'fa-lock-open' : 'fa-lock'} text-[10px]`}></i>
                                                    </button>
                                                    {h.status !== 'locked' && (
                                                        <button onClick={() => handleDeleteHistory(h.id)}
                                                            className="action-btn w-8 h-8 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 transition-all flex items-center justify-center hover:scale-110 active:scale-95" title="Hapus">
                                                            <i className="fas fa-trash-alt text-[10px]"></i>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </div>

            {/* ============ VIEW HISTORY MODAL (Portal) ============ */}
            {viewHistory && ReactDOM.createPortal(
                <div
                    className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 backdrop-blur-sm ${isHistoryViewClosing ? 'opacity-0' : 'opacity-100'}`}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
                    onClick={closeHistoryView}
                >
                    <div
                        className={`bg-white rounded-3xl shadow-2xl w-full flex flex-col relative overflow-hidden transform transition-all duration-300 ${isMobile ? 'max-w-full max-h-[95vh]' : 'max-w-5xl max-h-[85vh]'} ${isHistoryViewClosing ? 'scale-95 translate-y-4 opacity-0' : 'scale-100 translate-y-0 opacity-100'}`}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 text-white relative">
                            <button onClick={closeHistoryView}
                                className="absolute top-3 right-3 w-8 h-8 text-white/80 hover:text-white cursor-pointer transition flex items-center justify-center rounded-full hover:bg-white/20"
                                type="button">
                                <i className="fas fa-times text-lg"></i>
                            </button>
                            <h3 className="text-sm font-black uppercase tracking-wider">
                                <i className="fas fa-history mr-2"></i>{viewHistory.label}
                            </h3>
                            <div className="flex items-center gap-3 mt-1 text-[10px] text-white/80">
                                <span><i className="fas fa-users mr-1"></i>{viewHistory.total_guru} guru</span>
                                <span><i className="fas fa-money-bill-wave mr-1"></i>{formatRupiah(viewHistory.total_penerimaan)}</span>
                                <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase ${viewHistory.status === 'locked' ? 'bg-white/20 text-white' : 'bg-white/20 text-white'
                                    }`}>
                                    {viewHistory.status === 'locked' ? '🔒 Terkunci' : '📝 Draft'}
                                </span>
                            </div>
                            {viewHistory.notes && (
                                <div className="text-[10px] text-white/70 mt-1"><i className="fas fa-sticky-note mr-1"></i>{viewHistory.notes}</div>
                            )}
                        </div>

                        {/* Content */}
                        <div className="overflow-auto flex-1 p-4">
                            {viewHistory.data && Array.isArray(viewHistory.data) ? (
                                isMobile ? (
                                    /* Mobile: Cards */
                                    <div className="space-y-2">
                                        {viewHistory.data.map((g, i) => (
                                            <div key={i} className="bg-gray-50 rounded-xl p-3">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs font-bold text-gray-700">{i + 1}. {g.nama}</span>
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-bold">{g.jabatan}</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-1 text-[10px]">
                                                    <div><span className="text-gray-400">Gaji Pokok</span><br /><span className="font-mono font-bold text-gray-600">{formatRupiah(g.gaji_pokok)}</span></div>
                                                    <div><span className="text-gray-400">Jumlah</span><br /><span className="font-mono font-bold text-primary">{formatRupiah(g.jumlah)}</span></div>
                                                    <div><span className="text-gray-400">Penerimaan</span><br /><span className="font-mono font-bold text-emerald-600">{formatRupiah(g.total_penerimaan)}</span></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    /* Desktop: Table */
                                    <table className="admin-table w-full text-xs">
                                        <thead>
                                            <tr>
                                                <th className="py-2 px-2 text-center text-[10px] font-black text-gray-400 uppercase">No</th>
                                                <th className="py-2 px-2 text-left text-[10px] font-black text-gray-400 uppercase">Nama</th>
                                                <th className="py-2 px-2 text-center text-[10px] font-black text-gray-400 uppercase">Jabatan</th>
                                                <th className="py-2 px-2 text-center text-[10px] font-black text-gray-400 uppercase">Jam</th>
                                                <th className="py-2 px-2 text-center text-[10px] font-black text-gray-400 uppercase">Hadir</th>
                                                <th className="py-2 px-2 text-right text-[10px] font-black text-gray-400 uppercase">Gaji Pokok</th>
                                                <th className="py-2 px-2 text-right text-[10px] font-black text-primary uppercase">Jumlah</th>
                                                <th className="py-2 px-2 text-right text-[10px] font-black text-rose-400 uppercase">Potongan</th>
                                                <th className="py-2 px-2 text-right text-[10px] font-black text-emerald-600 uppercase">Penerimaan</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {viewHistory.data.map((g, i) => (
                                                <tr key={i} className="hover:bg-gray-50">
                                                    <td className="px-2 py-2 text-center text-gray-400 font-bold">{i + 1}</td>
                                                    <td className="px-2 py-2 font-bold text-gray-700 uppercase">{g.nama}</td>
                                                    <td className="px-2 py-2 text-center"><span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">{g.jabatan}</span></td>
                                                    <td className="px-2 py-2 text-center text-gray-500">{g.jumlah_jam}</td>
                                                    <td className="px-2 py-2 text-center text-gray-500">{g.jumlah_hadir}</td>
                                                    <td className="px-2 py-2 text-right font-mono text-gray-700">{formatRupiah(g.gaji_pokok)}</td>
                                                    <td className="px-2 py-2 text-right font-mono font-bold text-primary">{formatRupiah(g.jumlah)}</td>
                                                    <td className="px-2 py-2 text-right font-mono text-rose-500">{formatRupiah(g.jumlah_potongan)}</td>
                                                    <td className="px-2 py-2 text-right font-mono font-bold text-emerald-600">{formatRupiah(g.total_penerimaan)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )
                            ) : (
                                <div className="text-center py-8 text-gray-400 text-xs">Tidak ada data.</div>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}


            {/* ============ SETTINGS MODAL (Portal) ============ */}
            {showSettings && ReactDOM.createPortal(
                <div
                    className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 backdrop-blur-sm ${isSettingsClosing ? 'opacity-0' : 'opacity-100'}`}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
                    onClick={closeSettings}
                >
                    <div
                        className={`bg-white rounded-3xl shadow-2xl max-w-2xl w-full flex flex-col relative overflow-hidden transform transition-all duration-300 max-h-[85vh] ${isSettingsClosing ? 'scale-95 translate-y-4 opacity-0' : 'scale-100 translate-y-0 opacity-100'}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header — gradient green like ManajemenGuru */}
                        <div className={`bg-gradient-to-r from-primary to-green-600 ${isMobile ? 'px-3 py-2' : 'px-4 py-2.5'} text-white relative`}>
                            <button
                                onClick={closeSettings}
                                className={`absolute ${isMobile ? 'top-2 right-2 w-6 h-6' : 'top-4 right-4 w-8 h-8'} text-white/80 hover:text-white cursor-pointer transition flex items-center justify-center rounded-full hover:bg-white/20`}
                                type="button"
                                aria-label="Tutup Modal"
                            >
                                <i className={`fas fa-times ${isMobile ? 'text-sm' : 'text-lg'}`}></i>
                            </button>
                            <div className="flex items-center gap-3">
                                <div className={`${isMobile ? 'w-8 h-8' : 'w-10 h-10'} bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md`}>
                                    <i className={`fas fa-cog ${isMobile ? 'text-sm' : 'text-lg'}`}></i>
                                </div>
                                <div>
                                    <h2 className={`${isMobile ? 'text-sm' : 'text-lg'} font-bold`}>Pengaturan Bisyaroh</h2>
                                    <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-white/70`}>Atur tarif, tunjangan, dan potongan</p>
                                </div>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {!settingsData ? (
                                <div className="flex items-center justify-center py-10">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700"></div>
                                    <span className="ml-3 text-gray-600">Memuat pengaturan...</span>
                                </div>
                            ) : (
                                CATEGORY_ORDER.filter(cat => settingsData[cat]).map(category => {
                                    const items = settingsData[category];
                                    const isPotongan = category === 'potongan';
                                    return (
                                        <div key={category}>
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
                                                <i className={`fas ${CATEGORY_ICONS[category] || 'fa-cog'} ${isPotongan ? 'text-rose-400' : 'text-primary'}`}></i>
                                                {CATEGORY_LABELS[category] || category}
                                                {isPotongan && (
                                                    <button onClick={handleAddPotongan} type="button"
                                                        className="ml-auto text-[9px] font-bold text-primary hover:text-primary/80 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-primary/10 transition-all">
                                                        <i className="fas fa-plus text-[8px]"></i> Tambah
                                                    </button>
                                                )}
                                            </h4>
                                            <div className="space-y-1.5">
                                                {items.map(s => (
                                                    <div key={s.key} className="flex items-center justify-between gap-3 group">
                                                        <label className="text-xs text-gray-600 font-medium flex-1">{s.label}</label>
                                                        <div className="flex items-center gap-2">
                                                            <div className="relative">
                                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-medium">Rp</span>
                                                                <input
                                                                    type="text"
                                                                    value={formatInputRupiah(s.value)}
                                                                    onChange={e => updateSettingValue(category, s.key, parseRupiahInput(e.target.value))}
                                                                    className="w-40 pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-right font-mono text-gray-800 focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none"
                                                                />
                                                            </div>
                                                            {isPotongan && (
                                                                <button onClick={() => handleDeletePotongan(s)} type="button"
                                                                    className="w-7 h-7 rounded-lg text-gray-300 hover:text-rose-500 hover:bg-rose-50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100"
                                                                    title={`Hapus ${s.label}`}>
                                                                    <i className="fas fa-trash-alt text-[10px]"></i>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Modal Footer */}
                        {settingsData && (
                            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/30">
                                <button onClick={closeSettings}
                                    className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-100 transition-all" type="button">
                                    Batal
                                </button>
                                <button onClick={handleSaveSettings} disabled={savingSettings}
                                    className="btn-primary flex items-center gap-1 shadow-lg shadow-primary/20 font-black uppercase tracking-widest px-5 py-2.5 text-[10px] rounded-xl disabled:opacity-50" type="button">
                                    <i className={`fas ${savingSettings ? 'fa-spinner fa-spin' : 'fa-save'}`}></i>
                                    <span>{savingSettings ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}

            {/* ============ DETAIL MODAL (Portal) ============ */}
            {showDetail && ReactDOM.createPortal(
                <div
                    className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 backdrop-blur-sm ${isDetailClosing ? 'opacity-0' : 'opacity-100'}`}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
                    onClick={closeDetail}
                >
                    <div
                        className={`bg-white rounded-3xl shadow-2xl max-w-3xl w-full flex flex-col relative overflow-hidden transform transition-all duration-300 max-h-[90vh] ${isDetailClosing ? 'scale-95 translate-y-4 opacity-0' : 'scale-100 translate-y-0 opacity-100'}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className={`bg-gradient-to-r from-primary to-green-600 ${isMobile ? 'px-3 py-2' : 'px-4 py-2.5'} text-white relative`}>
                            <button
                                onClick={closeDetail}
                                className={`absolute ${isMobile ? 'top-2 right-2 w-6 h-6' : 'top-4 right-4 w-8 h-8'} text-white/80 hover:text-white cursor-pointer transition flex items-center justify-center rounded-full hover:bg-white/20`}
                                type="button"
                                aria-label="Tutup Modal"
                            >
                                <i className={`fas fa-times ${isMobile ? 'text-sm' : 'text-lg'}`}></i>
                            </button>
                            <div className="flex items-center gap-3">
                                <div className={`${isMobile ? 'w-8 h-8' : 'w-10 h-10'} bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md`}>
                                    <i className={`fas fa-file-invoice-dollar ${isMobile ? 'text-sm' : 'text-lg'}`}></i>
                                </div>
                                <div>
                                    <h2 className={`${isMobile ? 'text-sm' : 'text-lg'} font-bold`}>Rincian Bisyaroh</h2>
                                    <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-white/70`}>
                                        {detailData ? `${detailData.guru?.nama} — ${BULAN_NAMES[detailData.bulan]} ${detailData.tahun}` : 'Memuat...'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Detail Tabs */}
                        <div className="flex px-6 pt-3 gap-1 border-b border-gray-100">
                            {[
                                { id: 'rincian', label: 'Rincian', icon: 'fa-file-invoice-dollar', mobileLabel: 'Rincian' },
                                { id: 'kegiatan', label: 'Kegiatan', icon: 'fa-tasks', mobileLabel: 'Kegiatan' },
                                { id: 'rapat', label: 'Rapat', icon: 'fa-users', mobileLabel: 'Rapat' },
                            ].map(tab => (
                                <button key={tab.id} onClick={() => setActiveDetailTab(tab.id)}
                                    className={`flex items-center gap-1 rounded-t-xl font-black uppercase tracking-widest transition-all whitespace-nowrap border-b-2 ${isMobile ? 'px-2 py-1.5 text-[8px]' : 'gap-2 px-4 py-2.5 text-[10px]'} ${activeDetailTab === tab.id
                                        ? 'text-primary border-primary bg-primary/5' : 'text-gray-400 border-transparent hover:text-gray-600 hover:bg-gray-50'}`}>
                                    <i className={`fas ${tab.icon} ${isMobile ? 'text-[9px]' : ''}`}></i>
                                    {isMobile ? tab.mobileLabel : tab.label}
                                </button>
                            ))}
                            {/* Print button in tab bar */}
                            <div className="ml-auto flex items-center">
                                {detailData && (
                                    <button onClick={() => handlePrintRincian(detailData.id)}
                                        className={`action-btn ${isMobile ? 'w-6 h-6' : 'w-8 h-8'} rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all flex items-center justify-center hover:scale-110 active:scale-95`}
                                        title="Cetak Rincian">
                                        <i className={`fas fa-print ${isMobile ? 'text-[8px]' : 'text-[10px]'}`}></i>
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            {loadingDetail || !detailData ? (
                                <div className="flex items-center justify-center py-10">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700"></div>
                                    <span className="ml-3 text-gray-600">Memuat rincian...</span>
                                </div>
                            ) : (
                                <>
                                    {activeDetailTab === 'rincian' && (
                                        <div className="space-y-5">
                                            {/* Guru Info Cards */}
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                {[
                                                    { label: 'Nama', value: detailData.guru?.nama, icon: 'fa-user' },
                                                    { label: 'Jabatan', value: detailData.guru?.jabatan || '-', icon: 'fa-briefcase' },
                                                    { label: 'Jumlah Jam', value: detailData.jumlah_jam, icon: 'fa-clock' },
                                                    { label: 'Kehadiran', value: `${detailData.jumlah_hadir} hari`, icon: 'fa-calendar-check' },
                                                ].map((info, i) => (
                                                    <div key={i} className="bg-gray-50 rounded-xl p-3">
                                                        <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-1 flex items-center gap-1.5 font-bold">
                                                            <i className={`fas ${info.icon} text-primary`}></i> {info.label}
                                                        </div>
                                                        <div className="text-sm font-bold text-gray-800">{info.value || '-'}</div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Rincian Gaji Table */}
                                            <div className="bg-white rounded-2xl shadow-soft border border-gray-100 overflow-hidden">
                                                <div className="px-4 py-3 bg-gray-50/50">
                                                    <h5 className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                                        <i className="fas fa-coins text-primary"></i> Rincian Gaji
                                                    </h5>
                                                </div>
                                                <table className="admin-table w-full">
                                                    <tbody>
                                                        {[
                                                            ['Gaji Pokok', detailData.gaji_pokok],
                                                            ['Tunj. Struktural', detailData.tunj_struktural],
                                                            ['Tunj. Transport', detailData.tunj_transport],
                                                            ['Tunj. Masa Kerja', detailData.tunj_masa_kerja],
                                                            ['Tunj. Kegiatan', detailData.tunj_kegiatan],
                                                            ['Tunj. Rapat', detailData.tunj_rapat],
                                                        ].map(([label, val], i) => (
                                                            <tr key={i}>
                                                                <td className="px-4 py-2 text-xs text-gray-600">{i + 1}. {label}</td>
                                                                <td className="px-4 py-2 text-xs font-mono font-medium text-gray-800 text-right">{formatRupiah(val)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                    <tfoot>
                                                        <tr className="bg-primary/5 font-bold">
                                                            <td className="px-4 py-2.5 text-xs text-gray-700">Jumlah</td>
                                                            <td className="px-4 py-2.5 text-xs font-mono font-bold text-primary text-right">{formatRupiah(detailData.jumlah)}</td>
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            </div>

                                            {/* Potongan */}
                                            {detailData.potongan_detail && Object.keys(detailData.potongan_detail).length > 0 && (
                                                <div className="bg-white rounded-2xl shadow-soft border border-gray-100 overflow-hidden">
                                                    <div className="px-4 py-3 bg-rose-50/50">
                                                        <h5 className="text-[10px] font-black uppercase tracking-widest text-rose-400 flex items-center gap-2">
                                                            <i className="fas fa-minus-circle text-rose-400"></i> Iuran / Potongan
                                                        </h5>
                                                    </div>
                                                    <table className="admin-table w-full">
                                                        <tbody>
                                                            {Object.entries(detailData.potongan_detail).map(([label, val], i) => (
                                                                <tr key={i}>
                                                                    <td className="px-4 py-2 text-xs text-gray-600">{i + 1}. {label}</td>
                                                                    <td className="px-4 py-2 text-xs font-mono font-medium text-rose-500 text-right">{formatRupiah(val)}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                        <tfoot>
                                                            <tr className="bg-rose-50/50 font-bold">
                                                                <td className="px-4 py-2.5 text-xs text-gray-700">Jumlah Potongan</td>
                                                                <td className="px-4 py-2.5 text-xs font-mono font-bold text-rose-500 text-right">{formatRupiah(detailData.jumlah_potongan)}</td>
                                                            </tr>
                                                        </tfoot>
                                                    </table>
                                                </div>
                                            )}

                                            {/* Total Penerimaan */}
                                            <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl border border-emerald-100 p-5 flex justify-between items-center">
                                                <span className="text-sm font-black text-gray-700 uppercase tracking-widest">Total Penerimaan</span>
                                                <span className="text-xl font-mono font-black text-emerald-600">{formatRupiah(detailData.total_penerimaan)}</span>
                                            </div>
                                        </div>
                                    )}

                                    {activeDetailTab === 'kegiatan' && (
                                        <div>
                                            {(!detailData.detail_kegiatan || detailData.detail_kegiatan.length === 0) ? (
                                                <div className="flex flex-col items-center justify-center py-16 gap-3">
                                                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center">
                                                        <i className="fas fa-tasks text-2xl text-gray-300"></i>
                                                    </div>
                                                    <p className="text-sm font-bold text-gray-400">Tidak Ada Kegiatan</p>
                                                    <p className="text-[11px] text-gray-400 uppercase tracking-widest font-medium">Tidak ada data kegiatan bulan ini</p>
                                                </div>
                                            ) : (
                                                <div className="bg-white rounded-2xl shadow-soft border border-gray-100 overflow-hidden">
                                                    <table className="admin-table w-full">
                                                        <thead>
                                                            <tr>
                                                                <th className="select-none py-2.5 px-3 text-xs font-black text-gray-400 uppercase tracking-widest">No</th>
                                                                <th className="select-none py-2.5 px-3 text-xs font-black text-gray-400 uppercase tracking-widest text-left">Kegiatan</th>
                                                                <th className="select-none py-2.5 px-3 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Tanggal</th>
                                                                <th className="select-none py-2.5 px-3 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Peran</th>
                                                                <th className="select-none py-2.5 px-3 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Tunjangan</th>
                                                                <th className="select-none py-2.5 px-3 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {detailData.detail_kegiatan.map((k, i) => (
                                                                <tr key={i}>
                                                                    <td className="px-3 py-2 text-center text-xs font-bold text-gray-400">{i + 1}</td>
                                                                    <td className="px-3 py-2 text-xs font-semibold text-gray-700">{k.nama}</td>
                                                                    <td className="px-3 py-2 text-center text-xs text-gray-500">{k.tanggal}</td>
                                                                    <td className="px-3 py-2 text-center">
                                                                        <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold">{k.peran}</span>
                                                                    </td>
                                                                    <td className="px-3 py-2 text-right text-xs font-mono text-gray-700">{formatRupiah(k.tunjangan)}</td>
                                                                    <td className="px-3 py-2 text-center">
                                                                        {k.hadir > 0 ? (
                                                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600">
                                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                                                Hadir
                                                                            </span>
                                                                        ) : (
                                                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-600">
                                                                                Tidak Hadir
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeDetailTab === 'rapat' && (
                                        <div>
                                            {(!detailData.detail_rapat || detailData.detail_rapat.length === 0) ? (
                                                <div className="flex flex-col items-center justify-center py-16 gap-3">
                                                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center">
                                                        <i className="fas fa-users text-2xl text-gray-300"></i>
                                                    </div>
                                                    <p className="text-sm font-bold text-gray-400">Tidak Ada Rapat</p>
                                                    <p className="text-[11px] text-gray-400 uppercase tracking-widest font-medium">Tidak ada data rapat bulan ini</p>
                                                </div>
                                            ) : (
                                                <div className="bg-white rounded-2xl shadow-soft border border-gray-100 overflow-hidden">
                                                    <table className="admin-table w-full">
                                                        <thead>
                                                            <tr>
                                                                <th className="select-none py-2.5 px-3 text-xs font-black text-gray-400 uppercase tracking-widest">No</th>
                                                                <th className="select-none py-2.5 px-3 text-xs font-black text-gray-400 uppercase tracking-widest text-left">Agenda</th>
                                                                <th className="select-none py-2.5 px-3 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Tanggal</th>
                                                                {!isMobile && <th className="select-none py-2.5 px-3 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Tempat</th>}
                                                                <th className="select-none py-2.5 px-3 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Tunjangan</th>
                                                                <th className="select-none py-2.5 px-3 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {detailData.detail_rapat.map((r, i) => (
                                                                <tr key={i}>
                                                                    <td className="px-3 py-2 text-center text-xs font-bold text-gray-400">{i + 1}</td>
                                                                    <td className="px-3 py-2 text-xs font-semibold text-gray-700">{r.agenda}</td>
                                                                    <td className="px-3 py-2 text-center text-xs text-gray-500">{r.tanggal}</td>
                                                                    {!isMobile && <td className="px-3 py-2 text-center text-xs text-gray-500">{r.tempat || '-'}</td>}
                                                                    <td className="px-3 py-2 text-right text-xs font-mono text-gray-700">{formatRupiah(r.tunjangan)}</td>
                                                                    <td className="px-3 py-2 text-center">
                                                                        {r.hadir ? (
                                                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600">
                                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                                                Hadir
                                                                            </span>
                                                                        ) : (
                                                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-600">
                                                                                Tidak Hadir
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
            {/* ============ KEGIATAN OVERVIEW MODAL ============ */}
            {showKegiatanOverview && ReactDOM.createPortal(
                <div
                    className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 backdrop-blur-sm ${isOverviewClosing ? 'opacity-0' : 'opacity-100'}`}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
                    onClick={closeOverview}
                >
                    <div
                        className={`bg-white rounded-3xl shadow-2xl max-w-3xl w-full flex flex-col relative overflow-hidden transform transition-all duration-300 max-h-[85vh] ${isOverviewClosing ? 'scale-95 translate-y-4 opacity-0' : 'scale-100 translate-y-0 opacity-100'}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={`bg-gradient-to-r from-primary to-green-600 ${isMobile ? 'px-3 py-2' : 'px-4 py-2.5'} text-white relative`}>
                            <button onClick={closeOverview}
                                className={`absolute ${isMobile ? 'top-2 right-2 w-6 h-6' : 'top-4 right-4 w-8 h-8'} text-white/80 hover:text-white cursor-pointer transition flex items-center justify-center rounded-full hover:bg-white/20`}
                                type="button">
                                <i className={`fas fa-times ${isMobile ? 'text-sm' : 'text-lg'}`}></i>
                            </button>
                            <div className="flex items-center gap-3">
                                <div className={`${isMobile ? 'w-8 h-8' : 'w-10 h-10'} bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md`}>
                                    <i className={`fas fa-tasks ${isMobile ? 'text-sm' : 'text-lg'}`}></i>
                                </div>
                                <div>
                                    <h2 className={`${isMobile ? 'text-sm' : 'text-lg'} font-bold`}>Daftar Kegiatan</h2>
                                    <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-white/70`}>{BULAN_NAMES[bulan]} {tahun} — {kegiatanBulanData.length} kegiatan</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6">
                            {loadingOverview ? (
                                <div className="flex items-center justify-center py-10">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700"></div>
                                    <span className="ml-3 text-gray-600">Memuat data...</span>
                                </div>
                            ) : kegiatanBulanData.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 gap-3">
                                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center">
                                        <i className="fas fa-tasks text-2xl text-gray-300"></i>
                                    </div>
                                    <p className="text-sm font-bold text-gray-400">Tidak Ada Kegiatan</p>
                                    <p className="text-[11px] text-gray-400 uppercase tracking-widest font-medium">Tidak ada kegiatan di bulan ini</p>
                                </div>
                            ) : (
                                <div className="bg-white rounded-2xl shadow-soft border border-gray-100 overflow-hidden">
                                    <table className="admin-table w-full">
                                        <thead>
                                            <tr>
                                                <th className="select-none py-2.5 px-3 text-xs font-black text-gray-400 uppercase tracking-widest">No</th>
                                                <th className="select-none py-2.5 px-3 text-xs font-black text-gray-400 uppercase tracking-widest text-left">Kegiatan</th>
                                                <th className="select-none py-2.5 px-3 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Tanggal</th>
                                                <th className="select-none py-2.5 px-3 text-xs font-black text-gray-400 uppercase tracking-widest text-left">PJ</th>
                                                {!isMobile && <th className="select-none py-2.5 px-3 text-xs font-black text-gray-400 uppercase tracking-widest text-left">Tempat</th>}
                                                {!isMobile && <th className="select-none py-2.5 px-3 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Pendamping</th>}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {kegiatanBulanData.map((k, i) => (
                                                <tr key={i}>
                                                    <td className="px-3 py-2 text-center text-xs font-bold text-gray-400">{i + 1}</td>
                                                    <td className="px-3 py-2 text-xs font-semibold text-gray-700">{k.nama}</td>
                                                    <td className="px-3 py-2 text-center text-xs text-gray-500">{k.tanggal}</td>
                                                    <td className="px-3 py-2 text-xs font-medium text-gray-600">{k.pj}</td>
                                                    {!isMobile && <td className="px-3 py-2 text-xs text-gray-500">{k.tempat || '-'}</td>}
                                                    {!isMobile && <td className="px-3 py-2 text-center text-xs text-gray-500">{k.guru_pendamping?.length || 0} guru</td>}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ============ RAPAT OVERVIEW MODAL ============ */}
            {showRapatOverview && ReactDOM.createPortal(
                <div
                    className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 backdrop-blur-sm ${isOverviewClosing ? 'opacity-0' : 'opacity-100'}`}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
                    onClick={closeOverview}
                >
                    <div
                        className={`bg-white rounded-3xl shadow-2xl max-w-3xl w-full flex flex-col relative overflow-hidden transform transition-all duration-300 max-h-[85vh] ${isOverviewClosing ? 'scale-95 translate-y-4 opacity-0' : 'scale-100 translate-y-0 opacity-100'}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={`bg-gradient-to-r from-primary to-green-600 ${isMobile ? 'px-3 py-2' : 'px-4 py-2.5'} text-white relative`}>
                            <button onClick={closeOverview}
                                className={`absolute ${isMobile ? 'top-2 right-2 w-6 h-6' : 'top-4 right-4 w-8 h-8'} text-white/80 hover:text-white cursor-pointer transition flex items-center justify-center rounded-full hover:bg-white/20`}
                                type="button">
                                <i className={`fas fa-times ${isMobile ? 'text-sm' : 'text-lg'}`}></i>
                            </button>
                            <div className="flex items-center gap-3">
                                <div className={`${isMobile ? 'w-8 h-8' : 'w-10 h-10'} bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md`}>
                                    <i className={`fas fa-users ${isMobile ? 'text-sm' : 'text-lg'}`}></i>
                                </div>
                                <div>
                                    <h2 className={`${isMobile ? 'text-sm' : 'text-lg'} font-bold`}>Daftar Rapat</h2>
                                    <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-white/70`}>{BULAN_NAMES[bulan]} {tahun} — {rapatBulanData.length} rapat</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6">
                            {loadingOverview ? (
                                <div className="flex items-center justify-center py-10">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700"></div>
                                    <span className="ml-3 text-gray-600">Memuat data...</span>
                                </div>
                            ) : rapatBulanData.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 gap-3">
                                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center">
                                        <i className="fas fa-users text-2xl text-gray-300"></i>
                                    </div>
                                    <p className="text-sm font-bold text-gray-400">Tidak Ada Rapat</p>
                                    <p className="text-[11px] text-gray-400 uppercase tracking-widest font-medium">Tidak ada rapat di bulan ini</p>
                                </div>
                            ) : (
                                <div className="bg-white rounded-2xl shadow-soft border border-gray-100 overflow-hidden">
                                    <table className="admin-table w-full">
                                        <thead>
                                            <tr>
                                                <th className="select-none py-2.5 px-3 text-xs font-black text-gray-400 uppercase tracking-widest">No</th>
                                                <th className="select-none py-2.5 px-3 text-xs font-black text-gray-400 uppercase tracking-widest text-left">Agenda</th>
                                                <th className="select-none py-2.5 px-3 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Tanggal</th>
                                                <th className="select-none py-2.5 px-3 text-xs font-black text-gray-400 uppercase tracking-widest text-left">Pimpinan</th>
                                                {!isMobile && <th className="select-none py-2.5 px-3 text-xs font-black text-gray-400 uppercase tracking-widest text-left">Tempat</th>}
                                                {!isMobile && <th className="select-none py-2.5 px-3 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Peserta</th>}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rapatBulanData.map((r, i) => (
                                                <tr key={i}>
                                                    <td className="px-3 py-2 text-center text-xs font-bold text-gray-400">{i + 1}</td>
                                                    <td className="px-3 py-2 text-xs font-semibold text-gray-700">{r.agenda}</td>
                                                    <td className="px-3 py-2 text-center text-xs text-gray-500">{r.tanggal}</td>
                                                    <td className="px-3 py-2 text-xs font-medium text-gray-600">{r.pimpinan}</td>
                                                    {!isMobile && <td className="px-3 py-2 text-xs text-gray-500">{r.tempat || '-'}</td>}
                                                    {!isMobile && <td className="px-3 py-2 text-center text-xs text-gray-500">{r.jumlah_peserta} guru</td>}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

export default Bisyaroh;
