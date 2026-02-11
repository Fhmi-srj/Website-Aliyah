import React, { useState, useEffect, useRef } from 'react';
import { API_BASE, authFetch } from '../../../config/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useTahunAjaran } from '../../../contexts/TahunAjaranContext';

const BULAN_LIST = [
    { value: 1, label: 'Januari' },
    { value: 2, label: 'Februari' },
    { value: 3, label: 'Maret' },
    { value: 4, label: 'April' },
    { value: 5, label: 'Mei' },
    { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' },
    { value: 8, label: 'Agustus' },
    { value: 9, label: 'September' },
    { value: 10, label: 'Oktober' },
    { value: 11, label: 'November' },
    { value: 12, label: 'Desember' },
];

/* ─── Checkbox Dropdown Component ─── */
function CheckboxDropdown({ label, icon, items, selectedIds, onToggle, onToggleAll, renderLabel, placeholder }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const allSelected = items.length > 0 && selectedIds.length === items.length;
    const summary = selectedIds.length === 0
        ? placeholder
        : selectedIds.length === items.length
            ? `Semua (${items.length})`
            : `${selectedIds.length} dipilih`;

    return (
        <div ref={ref} className="relative group">
            <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 px-1">
                <i className={`fas ${icon} mr-1.5`}></i>
                {label}
            </label>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="w-full bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl px-4 py-2.5 text-sm text-left focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all flex items-center justify-between shadow-sm group-hover:border-gray-300 dark:group-hover:border-gray-600"
            >
                <span className={`truncate mr-2 font-semibold ${selectedIds.length === 0 ? 'text-gray-300 dark:text-gray-600' : 'text-gray-700 dark:text-dark-text'}`}>
                    {summary}
                </span>
                <i className={`fas fa-chevron-down text-gray-300 transition-transform duration-300 ${open ? 'rotate-180 text-primary' : ''}`}></i>
            </button>

            {open && (
                <div className="absolute z-50 mt-2 w-full bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-2xl shadow-2xl max-h-64 overflow-y-auto scrollbar-hide animate-fadeIn ring-1 ring-black/5">
                    {/* Select All */}
                    <label className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-primary/5 border-b border-gray-50 dark:border-dark-border sticky top-0 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-md z-10">
                        <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={onToggleAll}
                            className="w-4 h-4 rounded border-gray-300 dark:border-dark-border text-primary focus:ring-primary cursor-pointer"
                        />
                        <span className="text-[11px] font-black text-primary uppercase tracking-wider">
                            {allSelected ? 'Batal Semua' : 'Pilih Semua'}
                        </span>
                    </label>
                    <div className="py-1">
                        {items.map(item => (
                            <label
                                key={item.id ?? item.value}
                                className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-bg/50 transition-colors ${selectedIds.includes(item.id ?? item.value) ? 'bg-primary/5' : ''}`}
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedIds.includes(item.id ?? item.value)}
                                    onChange={() => onToggle(item.id ?? item.value)}
                                    className="w-4 h-4 rounded border-gray-300 dark:border-dark-border text-primary focus:ring-primary cursor-pointer transition-all"
                                />
                                <span className={`text-xs transition-all ${selectedIds.includes(item.id ?? item.value) ? 'text-primary font-bold' : 'text-gray-600 dark:text-dark-text font-medium'}`}>
                                    {renderLabel(item)}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

/* ─── Main Component ─── */
function AbsensiSiswa() {
    const [kelasList, setKelasList] = useState([]);
    const [guruList, setGuruList] = useState([]);
    const [loading, setLoading] = useState(true);

    // 3 modes: 'absensi-siswa', 'absensi-guru', 'jurnal-guru'
    const [mode, setMode] = useState('absensi-siswa');
    const [selectedKelasIds, setSelectedKelasIds] = useState([]);
    const [selectedBulanValues, setSelectedBulanValues] = useState([new Date().getMonth() + 1]);
    const [selectedGuruIds, setSelectedGuruIds] = useState([]);
    const [selectedTahun, setSelectedTahun] = useState(new Date().getFullYear());
    const [printing, setPrinting] = useState(false);

    const { tahunAjaran: authTahunAjaran, token } = useAuth();
    const { activeTahunAjaran } = useTahunAjaran();
    const tahunAjaranId = authTahunAjaran?.id || activeTahunAjaran?.id;

    const currentYear = new Date().getFullYear();
    const tahunOptions = [currentYear - 1, currentYear, currentYear + 1];

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                let kelasUrl = `${API_BASE}/kelas`;
                if (tahunAjaranId) kelasUrl += `?tahun_ajaran_id=${tahunAjaranId}`;
                const kelasRes = await authFetch(kelasUrl);
                const kelasData = await kelasRes.json();
                setKelasList((kelasData.data || []).filter(k => k.status === 'Aktif'));

                const guruRes = await authFetch(`${API_BASE}/guru`);
                const guruData = await guruRes.json();
                setGuruList(guruData.data || guruData || []);
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };
        if (tahunAjaranId) fetchData();
    }, [tahunAjaranId]);

    // Toggle helpers
    const toggle = (setter, list) => (id) => {
        setter(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };
    const toggleAll = (setter, list, getKey) => () => {
        setter(prev => prev.length === list.length ? [] : list.map(getKey));
    };

    // Build preview items
    const previewItems = [];
    if (mode === 'absensi-siswa') {
        for (const kelasId of selectedKelasIds) {
            const kelas = kelasList.find(k => k.id === kelasId);
            for (const bulan of selectedBulanValues) {
                previewItems.push({
                    key: `s-${kelasId}-${bulan}`,
                    label: `${kelas?.nama_kelas || '?'} — ${BULAN_LIST.find(b => b.value === bulan)?.label} ${selectedTahun}`,
                });
            }
        }
    } else if (mode === 'absensi-guru') {
        for (const bulan of selectedBulanValues) {
            previewItems.push({
                key: `ag-${bulan}`,
                label: `Semua Guru — ${BULAN_LIST.find(b => b.value === bulan)?.label} ${selectedTahun}`,
            });
        }
    } else {
        for (const guruId of selectedGuruIds) {
            const guru = guruList.find(g => g.id === guruId);
            for (const bulan of selectedBulanValues) {
                previewItems.push({
                    key: `g-${guruId}-${bulan}`,
                    label: `${guru?.nama || '?'} — ${BULAN_LIST.find(b => b.value === bulan)?.label} ${selectedTahun}`,
                });
            }
        }
    }

    const handleCetak = () => {
        if (previewItems.length === 0) return;
        setPrinting(true);

        let printUrl;
        if (mode === 'absensi-siswa') {
            const kelasStr = selectedKelasIds.join(',');
            const bulanStr = selectedBulanValues.join(',');
            printUrl = `/print/daftar-hadir-kelas-bulk?kelas_ids=${kelasStr}&bulan=${bulanStr}&tahun=${selectedTahun}&token=${token}`;
        } else if (mode === 'absensi-guru') {
            const bulanStr = selectedBulanValues.join(',');
            printUrl = `/print/daftar-hadir-guru-bulk?bulan=${bulanStr}&tahun=${selectedTahun}&token=${token}`;
        } else {
            const guruStr = selectedGuruIds.join(',');
            const bulanStr = selectedBulanValues.join(',');
            printUrl = `/print/jurnal-guru-bulk?guru_ids=${guruStr}&bulan=${bulanStr}&tahun=${selectedTahun}&token=${token}`;
        }

        window.open(printUrl, '_blank');
        setTimeout(() => setPrinting(false), 1000);
    };

    // Mode configuration
    const modes = [
        { key: 'absensi-siswa', label: 'Absensi Siswa', icon: 'fa-user-graduate' },
        { key: 'absensi-guru', label: 'Absensi Guru', icon: 'fa-id-badge' },
        { key: 'jurnal-guru', label: 'Jurnal Guru', icon: 'fa-book' },
    ];

    const docTypeLabel = mode === 'absensi-siswa' ? 'Daftar Hadir Siswa'
        : mode === 'absensi-guru' ? 'Daftar Hadir Guru'
            : 'Jurnal Mengajar';

    const docTypeIcon = mode === 'absensi-siswa' ? 'fa-clipboard-list'
        : mode === 'absensi-guru' ? 'fa-clipboard-check'
            : 'fa-book-open';

    return (
        <div className="animate-fadeIn flex flex-col flex-grow max-w-full overflow-auto">
            {/* Header */}
            <header className="mb-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary to-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                            <i className="fas fa-print text-white text-xl"></i>
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-gray-800 dark:text-dark-text uppercase tracking-tight">
                                Pelaporan & Cetak
                            </h1>
                            <p className="text-xs text-gray-400 mt-0.5 font-medium uppercase tracking-widest">
                                Daftar hadir kolektif dan jurnal mengajar
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            <div className="bg-white dark:bg-dark-surface rounded-[2.5rem] shadow-premium border border-gray-100 dark:border-dark-border overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="relative">
                            <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <i className="fas fa-file-alt text-primary/40 text-xs animate-pulse"></i>
                            </div>
                        </div>
                        <span className="ml-4 text-sm font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Menyiapkan Mesin Cetak...</span>
                    </div>
                ) : (
                    <div className="p-10 md:p-14">
                        {/* Mode Tabs */}
                        <div className="flex flex-wrap gap-3 bg-gray-50/50 dark:bg-dark-bg/30 p-2 rounded-[2rem] mb-12 w-fit border border-gray-100 dark:border-dark-border mx-auto md:mx-0">
                            {modes.map(m => (
                                <button
                                    key={m.key}
                                    onClick={() => setMode(m.key)}
                                    className={`group flex items-center gap-3 px-8 py-3 rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all duration-300 ${mode === m.key
                                        ? 'bg-white dark:bg-dark-surface text-primary shadow-xl shadow-primary/5 ring-1 ring-black/[0.03] scale-105'
                                        : 'text-gray-400 dark:text-dark-muted hover:text-gray-600 dark:hover:text-dark-text hover:bg-white/50'
                                        }`}
                                >
                                    <i className={`fas ${m.icon} transition-transform group-hover:scale-110`}></i>
                                    {m.label}
                                </button>
                            ))}
                        </div>

                        {/* Filter Controls */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12 items-end">
                            {/* Dynamic Filters */}
                            {mode === 'absensi-siswa' && (
                                <CheckboxDropdown
                                    label="Unit Kelas"
                                    icon="fa-door-open"
                                    items={kelasList}
                                    selectedIds={selectedKelasIds}
                                    onToggle={toggle(setSelectedKelasIds, kelasList)}
                                    onToggleAll={toggleAll(setSelectedKelasIds, kelasList, k => k.id)}
                                    renderLabel={k => `${k.nama_kelas}${k.wali_kelas ? ` (${k.wali_kelas.nama})` : ''}`}
                                    placeholder="Semua Kelas"
                                />
                            )}
                            {mode === 'jurnal-guru' && (
                                <CheckboxDropdown
                                    label="Personel Guru"
                                    icon="fa-chalkboard-teacher"
                                    items={guruList}
                                    selectedIds={selectedGuruIds}
                                    onToggle={toggle(setSelectedGuruIds, guruList)}
                                    onToggleAll={toggleAll(setSelectedGuruIds, guruList, g => g.id)}
                                    renderLabel={g => g.nama}
                                    placeholder="Semua Guru"
                                />
                            )}

                            {/* Bulan dropdown */}
                            <CheckboxDropdown
                                label="Bulan Laporan"
                                icon="fa-calendar-check"
                                items={BULAN_LIST}
                                selectedIds={selectedBulanValues}
                                onToggle={toggle(setSelectedBulanValues, BULAN_LIST)}
                                onToggleAll={toggleAll(setSelectedBulanValues, BULAN_LIST, b => b.value)}
                                renderLabel={b => b.label}
                                placeholder="Pilih Bulan"
                            />

                            {/* Tahun */}
                            <div className="group">
                                <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 px-1">
                                    <i className="fas fa-calendar-alt mr-1.5"></i> Tahun
                                </label>
                                <div className="relative">
                                    <select
                                        value={selectedTahun}
                                        onChange={(e) => setSelectedTahun(Number(e.target.value))}
                                        className="w-full bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-dark-text appearance-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none"
                                    >
                                        {tahunOptions.map(y => (
                                            <option key={y} value={y}>{y}</option>
                                        ))}
                                    </select>
                                    <i className="fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 text-xs pointer-events-none group-focus-within:text-primary transition-colors"></i>
                                </div>
                            </div>
                        </div>

                        {/* Special Info Badge */}
                        {mode === 'absensi-guru' && (
                            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/10 rounded-2xl p-6 mb-12 flex items-center gap-4 animate-fadeIn">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
                                    <i className="fas fa-shield-check"></i>
                                </div>
                                <div className="text-xs text-emerald-800 dark:text-emerald-400 leading-relaxed font-semibold">
                                    <p className="text-[10px] uppercase font-black tracking-widest mb-1">Informasi Cetak Massal</p>
                                    Laporan ini akan menggabungkan seluruh data kehadiran <strong className="text-emerald-900 dark:text-emerald-200">Seluruh Guru Aktif</strong> dalam struktur dokumen tunggal.
                                </div>
                            </div>
                        )}

                        {/* Preview Section */}
                        <div className={`transition-all duration-500 ${previewItems.length > 0 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 h-0 pointer-events-none'}`}>
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] flex items-center gap-3">
                                    <span className="w-8 h-px bg-gray-200 dark:bg-dark-border"></span>
                                    Daftar Antrean Cetak ({previewItems.length})
                                    <span className="w-8 h-px bg-gray-200 dark:bg-dark-border"></span>
                                </h3>
                            </div>

                            <div className="overflow-hidden rounded-3xl border border-gray-100 dark:border-dark-border bg-gray-50/30 dark:bg-dark-bg/20 mb-10">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-white/50 dark:bg-dark-surface/50 border-b border-gray-100 dark:border-dark-border">
                                            <th className="pl-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest w-20 text-center">Urutan</th>
                                            <th className="py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Identitas Pelaporan</th>
                                            <th className="pr-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Tipe Dokumen</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 dark:divide-dark-border/50">
                                        {previewItems.map((item, idx) => (
                                            <tr key={item.key} className="group hover:bg-white dark:hover:bg-dark-surface/50 transition-colors">
                                                <td className="pl-8 py-4 text-center font-black text-xs text-gray-300 group-hover:text-primary transition-colors">
                                                    {(idx + 1).toString().padStart(2, '0')}
                                                </td>
                                                <td className="py-4">
                                                    <span className="text-sm font-bold text-gray-700 dark:text-dark-text group-hover:translate-x-1 transition-transform inline-block">
                                                        {item.label}
                                                    </span>
                                                </td>
                                                <td className="pr-8 py-4 text-center">
                                                    <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-primary/5 text-primary border border-primary/10 shadow-sm transition-all group-hover:scale-105 active:scale-95">
                                                        <i className={`fas ${docTypeIcon} text-[10px]`}></i>
                                                        {docTypeLabel}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Status Info Box */}
                            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/10 rounded-2xl p-4 mb-10 mx-auto max-w-2xl text-center">
                                <div className="flex items-center justify-center gap-3 text-amber-700 dark:text-amber-400 text-xs font-bold">
                                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></div>
                                    Dokumen PDF akan dihasilkan secara otomatis dalam tab baru browser Anda.
                                </div>
                            </div>
                        </div>

                        {/* Print Button */}
                        <div className="flex flex-col items-center">
                            <button
                                onClick={handleCetak}
                                disabled={previewItems.length === 0 || printing}
                                className={`group relative btn-primary h-20 px-16 rounded-[2rem] flex items-center gap-5 text-lg font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 active:scale-95 transition-all duration-300 disabled:opacity-30 disabled:grayscale disabled:scale-100 disabled:pointer-events-none ${printing ? 'w-full md:w-[400px]' : 'hover:px-20'}`}
                            >
                                <div className="absolute inset-0 bg-white/20 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-500 skew-x-12"></div>
                                {printing ? (
                                    <>
                                        <div className="w-6 h-6 rounded-full border-3 border-white/30 border-t-white animate-spin"></div>
                                        <span>Proses Cetak...</span>
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-print text-2xl group-hover:rotate-12 transition-transform"></i>
                                        <span>Cetak Dokumen</span>
                                        {previewItems.length > 0 && (
                                            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-white text-primary text-xs font-black shadow-lg shadow-black/10 transition-all group-hover:scale-110">
                                                {previewItems.length}
                                            </span>
                                        )}
                                    </>
                                )}
                            </button>

                            {previewItems.length === 0 && (
                                <p className="mt-6 text-[10px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest animate-pulse">
                                    Silakan pilih kriteria untuk melanjutkan
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Custom Premium Styles */}
            <style dangerouslySetInnerHTML={{
                __html: `
                .shadow-premium {
                    box-shadow: 0 40px 100px -20px rgba(0, 0, 0, 0.05);
                }
                .dark .shadow-premium {
                    box-shadow: 0 40px 100px -20px rgba(0, 0, 0, 0.3);
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            ` }} />
        </div>
    );
}

export default AbsensiSiswa;
