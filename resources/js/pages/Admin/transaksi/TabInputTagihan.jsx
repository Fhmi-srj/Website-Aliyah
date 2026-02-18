import React, { useState, useEffect, useRef } from 'react';
import CrudModal, { ModalSection } from '../../../components/CrudModal';
import { API_BASE, authFetch } from '../../../config/api';
import Swal from 'sweetalert2';
import { formatRupiah, parseRupiah } from '../../../utils/currency';

export default function TabInputTagihan({ isMobile }) {
    const [gridData, setGridData] = useState({ tagihan: [], kelas: [], siswa: [] });
    const [loading, setLoading] = useState(false);
    const [filterKelasIds, setFilterKelasIds] = useState([]);
    const [searchName, setSearchName] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [currentTagihan, setCurrentTagihan] = useState(null);
    const [formNama, setFormNama] = useState('');
    const [formJatuhTempo, setFormJatuhTempo] = useState('');
    const [editedCells, setEditedCells] = useState({});
    const [expandedRow, setExpandedRow] = useState(null);

    // Bulk edit state
    const [bulkTagihanIds, setBulkTagihanIds] = useState([]);
    const [bulkNominal, setBulkNominal] = useState('');
    const [bulkNominalDisplay, setBulkNominalDisplay] = useState('');
    const [showKelasDropdown, setShowKelasDropdown] = useState(false);
    const [showTagihanDropdown, setShowTagihanDropdown] = useState(false);
    const kelasDropdownRef = useRef(null);
    const tagihanDropdownRef = useRef(null);

    const fmt = (n) => formatRupiah(n);

    useEffect(() => { fetchGrid(); }, []);

    const fetchGrid = async () => {
        setLoading(true);
        try {
            const r = await authFetch(`${API_BASE}/tagihan-siswa-grid`);
            const d = await r.json();
            if (d.success) setGridData(d.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClick = (e) => {
            if (kelasDropdownRef.current && !kelasDropdownRef.current.contains(e.target)) setShowKelasDropdown(false);
            if (tagihanDropdownRef.current && !tagihanDropdownRef.current.contains(e.target)) setShowTagihanDropdown(false);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const toggleKelas = (id) => {
        setFilterKelasIds(prev => prev.includes(id) ? prev.filter(k => k !== id) : [...prev, id]);
    };

    const toggleBulkTagihan = (id) => {
        setBulkTagihanIds(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
    };

    const openAdd = () => { setModalMode('add'); setFormNama(''); setFormJatuhTempo(''); setShowModal(true); };
    const openEdit = (t) => { setModalMode('edit'); setCurrentTagihan(t); setFormNama(t.nama); setFormJatuhTempo(t.tanggal_jatuh_tempo ? t.tanggal_jatuh_tempo.split('T')[0] : ''); setShowModal(true); };

    const submitTagihan = async () => {
        try {
            const url = modalMode === 'add' ? `${API_BASE}/tagihan` : `${API_BASE}/tagihan/${currentTagihan.id}`;
            const r = await authFetch(url, { method: modalMode === 'add' ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ nama: formNama, tanggal_jatuh_tempo: formJatuhTempo || null }) });
            if (r.ok) { setShowModal(false); fetchGrid(); Swal.fire({ icon: 'success', title: 'Berhasil!', timer: 1500, showConfirmButton: false }); }
        } catch { Swal.fire({ icon: 'error', title: 'Gagal', text: 'Terjadi kesalahan' }); }
    };

    const deleteTagihan = async (id) => {
        const c = await Swal.fire({ title: 'Yakin hapus tagihan ini?', text: 'Semua data tagihan siswa terkait akan terhapus!', icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc2626', confirmButtonText: 'Ya, Hapus!', cancelButtonText: 'Batal' });
        if (c.isConfirmed) { try { await authFetch(`${API_BASE}/tagihan/${id}`, { method: 'DELETE', headers: { Accept: 'application/json' } }); fetchGrid(); Swal.fire({ icon: 'success', title: 'Terhapus!', timer: 1500, showConfirmButton: false }); } catch { } }
    };

    const handleCellChange = (siswaId, tagihanId, nominal) => {
        setEditedCells(p => ({ ...p, [`${siswaId}_${tagihanId}`]: { siswaId, tagihanId, nominal } }));
    };

    const saveEdited = async () => {
        const entries = Object.values(editedCells);
        if (!entries.length) return;
        const byTagihan = {};
        entries.forEach(e => { if (!byTagihan[e.tagihanId]) byTagihan[e.tagihanId] = []; byTagihan[e.tagihanId].push(e); });
        try {
            for (const [tagihanId, items] of Object.entries(byTagihan)) {
                const siswaRows = gridData.siswa.filter(s => items.some(i => i.siswaId === s.siswa_id));
                await authFetch(`${API_BASE}/tagihan/assign-siswa`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                    body: JSON.stringify({ tagihan_id: parseInt(tagihanId), items: items.map(i => ({ siswa_id: i.siswaId, kelas_id: siswaRows.find(s => s.siswa_id === i.siswaId)?.kelas_id, nominal: parseFloat(i.nominal || 0) })) })
                });
            }
            setEditedCells({});
            await fetchGrid();
            Swal.fire({ icon: 'success', title: 'Data tersimpan!', timer: 1500, showConfirmButton: false });
        } catch (e) { console.error('Save error:', e); Swal.fire({ icon: 'error', title: 'Gagal menyimpan' }); }
    };

    const applyBulkNominal = async () => {
        if (bulkTagihanIds.length === 0) {
            Swal.fire({ icon: 'warning', title: 'Pilih Tagihan', text: 'Pilih satu atau beberapa jenis tagihan' });
            return;
        }
        if (filterKelasIds.length === 0) {
            Swal.fire({ icon: 'warning', title: 'Pilih Kelas', text: 'Pilih satu atau beberapa kelas terlebih dahulu' });
            return;
        }
        if (!bulkNominal && bulkNominal !== 0) {
            Swal.fire({ icon: 'warning', title: 'Isi Nominal', text: 'Masukkan nominal yang ingin diterapkan' });
            return;
        }

        // Confirm
        const kelasNames = filterKelasIds.map(id => kelasList.find(k => String(k.id) === String(id))?.nama || id).join(', ');
        const tagihanNames = bulkTagihanIds.map(id => tagihan.find(t => String(t.id) === String(id))?.nama || id).join(', ');
        const confirm = await Swal.fire({
            title: 'Konfirmasi Terapkan Masal',
            html: `<div class="text-left text-sm"><p class="mb-2">Nominal <b>Rp ${formatRupiah(bulkNominal)}</b> akan diterapkan ke:</p><p><b>Tagihan:</b> ${tagihanNames}</p><p><b>Kelas:</b> ${kelasNames}</p></div>`,
            icon: 'question', showCancelButton: true, confirmButtonText: 'Ya, Terapkan!', cancelButtonText: 'Batal',
        });
        if (!confirm.isConfirmed) return;

        try {
            const nominalValue = typeof bulkNominal === 'number' ? bulkNominal : parseFloat(String(bulkNominal).replace(/\./g, ''));
            const r = await authFetch(`${API_BASE}/tagihan/bulk-nominal`, {
                method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({ tagihan_ids: bulkTagihanIds.map(id => parseInt(id)), kelas_ids: filterKelasIds.map(id => parseInt(id)), nominal: nominalValue })
            });
            const d = await r.json();
            if (d.success) {
                setBulkNominal(''); setBulkNominalDisplay(''); setBulkTagihanIds([]);
                await fetchGrid();
                Swal.fire({ icon: 'success', title: 'Berhasil!', text: d.message, timer: 2500, showConfirmButton: false });
            } else {
                Swal.fire({ icon: 'error', title: 'Gagal', text: d.message || 'Terjadi kesalahan' });
            }
        } catch (e) {
            console.error('Bulk nominal error:', e);
            Swal.fire({ icon: 'error', title: 'Gagal', text: 'Terjadi kesalahan jaringan' });
        }
    };

    const tagihan = gridData.tagihan || [];
    const kelasList = gridData.kelas || [];
    const allSiswa = gridData.siswa || [];

    // Filter by kelas + search name
    const siswaList = allSiswa.filter(s => {
        const matchKelas = filterKelasIds.length === 0 || filterKelasIds.includes(s.kelas_id);
        const matchSearch = !searchName || s.siswa_nama?.toLowerCase().includes(searchName.toLowerCase()) || s.siswa_nis?.toLowerCase().includes(searchName.toLowerCase());
        return matchKelas && matchSearch;
    });

    return (
        <>
            {/* Controls Row */}
            <div className={`${isMobile ? 'mobile-controls-row bg-gray-50/50 rounded-xl border border-gray-100' : 'flex flex-col gap-4 mb-6 p-4 bg-gray-50/50 rounded-2xl border border-gray-100'}`}>
                <div className={`${isMobile ? '' : 'flex items-center gap-3 flex-wrap justify-between'}`}>
                    <div className={`${isMobile ? 'flex gap-1.5 w-full mb-2' : 'flex items-center gap-3 flex-wrap flex-1'}`}>
                        {/* Multi-Kelas Filter Chips */}
                        <div className="relative" ref={kelasDropdownRef} style={isMobile ? { width: '40%' } : undefined}>
                            <button onClick={() => setShowKelasDropdown(!showKelasDropdown)} className={`bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary flex items-center gap-2 ${isMobile ? 'py-1.5 text-[10px] px-2 font-bold w-full' : 'px-3 py-2.5 text-[11px] font-bold min-w-[140px]'} transition-all hover:border-gray-300`}>
                                <i className="fas fa-filter text-gray-400 text-[9px]"></i>
                                {filterKelasIds.length > 0 ? (
                                    <span className="flex items-center gap-1 flex-wrap overflow-hidden">
                                        {filterKelasIds.map(id => {
                                            const k = kelasList.find(x => x.id === id);
                                            return k ? <span key={id} className="bg-primary/10 text-primary px-1.5 py-0.5 rounded-md text-[9px] font-black">{k.nama}</span> : null;
                                        })}
                                    </span>
                                ) : (
                                    <span className="text-gray-400">Semua Kelas</span>
                                )}
                                <i className={`fas fa-chevron-down text-[8px] text-gray-400 transition-transform ml-auto ${showKelasDropdown ? 'rotate-180' : ''}`}></i>
                            </button>
                            {showKelasDropdown && (
                                <div className="absolute z-20 top-full mt-1 left-0 bg-white border border-gray-200 rounded-xl shadow-xl p-2 min-w-[200px]">
                                    <div className="flex flex-wrap gap-1.5">
                                        {kelasList.map(k => (
                                            <div key={k.id} onClick={() => toggleKelas(k.id)} className={`px-3 py-2 rounded-lg cursor-pointer text-center text-[10px] font-black uppercase tracking-wider transition-all border ${filterKelasIds.includes(k.id)
                                                ? 'bg-primary text-white border-primary shadow-sm' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-primary/30 hover:bg-primary/5'}`}>
                                                {k.nama}
                                            </div>
                                        ))}
                                    </div>
                                    {filterKelasIds.length > 0 && (
                                        <button onClick={() => setFilterKelasIds([])} className="mt-2 w-full text-[9px] font-bold text-gray-400 hover:text-rose-500 transition-colors py-1">
                                            <i className="fas fa-times mr-1"></i>Reset Filter
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                        {/* Search by Name */}
                        <div className={`relative group ${isMobile ? '' : 'flex-1 max-w-xs'}`} style={isMobile ? { width: '60%' } : undefined}>
                            <i className={`fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors ${isMobile ? 'text-[10px]' : ''}`}></i>
                            <input type="search" value={searchName} onChange={e => setSearchName(e.target.value)}
                                className={`w-full !pl-8 pr-2 ${isMobile ? 'py-1.5 text-[10px]' : 'py-2.5 text-[11px]'} bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder-gray-400 font-bold`}
                                placeholder="Cari nama siswa..." />
                        </div>
                    </div>
                    <div className={`${isMobile ? 'mobile-btn-group' : 'flex gap-2 items-center flex-shrink-0'}`}>
                        {Object.keys(editedCells).length > 0 && (
                            <button onClick={saveEdited} className={`btn-primary flex items-center gap-1 shadow-lg shadow-primary/20 font-black uppercase tracking-widest ${isMobile ? '' : 'px-4 py-2.5 text-[10px] rounded-xl'}`}>
                                <i className="fas fa-save"></i><span>Simpan ({Object.keys(editedCells).length})</span>
                            </button>
                        )}
                        <button onClick={openAdd} className={`btn-primary flex items-center gap-1 group shadow-lg shadow-primary/20 font-black uppercase tracking-widest ${isMobile ? '' : 'px-4 py-2.5 text-[10px] rounded-xl'}`}>
                            <i className="fas fa-plus group-hover:rotate-90 transition-transform"></i><span>{isMobile ? 'Tambah' : 'Tambah Tagihan'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Bulk Nominal — uses selected kelas filter chips */}
            {tagihan.length > 0 && filterKelasIds.length > 0 && (
                <div className={`${isMobile ? 'mb-3 p-3' : 'mb-6 p-4'} bg-gradient-to-r from-blue-50/80 to-indigo-50/50 rounded-2xl border border-blue-100`}>
                    <h4 className={`font-black text-blue-600 uppercase tracking-widest ${isMobile ? 'text-[9px] mb-2' : 'text-[10px] mb-3'}`}>
                        <i className="fas fa-layer-group mr-1"></i>Terapkan Nominal Masal →
                        <span className="text-primary ml-1">{filterKelasIds.map(id => kelasList.find(k => k.id === id)?.nama).filter(Boolean).join(', ')}</span>
                    </h4>
                    <div className={`flex items-end gap-2 ${isMobile ? 'flex-col' : 'flex-wrap gap-3'}`}>
                        <div className={`space-y-1 ${isMobile ? 'w-full' : ''}`}>
                            <label className="block text-[9px] font-bold text-gray-500 uppercase">Tagihan</label>
                            <div className="relative" ref={tagihanDropdownRef}>
                                <button onClick={() => setShowTagihanDropdown(!showTagihanDropdown)} className={`bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-primary/10 flex items-center gap-2 transition-all hover:border-gray-300 ${isMobile ? 'w-full px-2 py-1.5 text-[10px]' : 'px-3 py-2 text-[11px] min-w-[180px]'} font-bold`}>
                                    {bulkTagihanIds.length > 0 ? (
                                        <span className="flex items-center gap-1 flex-wrap">
                                            {bulkTagihanIds.map(id => {
                                                const t = tagihan.find(x => x.id === id);
                                                return t ? <span key={id} className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-md text-[9px] font-black">{t.nama}</span> : null;
                                            })}
                                        </span>
                                    ) : (
                                        <span className="text-gray-400">Pilih tagihan...</span>
                                    )}
                                    <i className={`fas fa-chevron-down text-[8px] text-gray-400 transition-transform ml-auto ${showTagihanDropdown ? 'rotate-180' : ''}`}></i>
                                </button>
                                {showTagihanDropdown && (
                                    <div className="absolute z-20 top-full mt-1 left-0 bg-white border border-gray-200 rounded-xl shadow-xl p-2 min-w-[200px]">
                                        <div className="flex flex-wrap gap-1.5">
                                            {tagihan.map(t => (
                                                <div key={t.id} onClick={() => toggleBulkTagihan(t.id)} className={`px-3 py-2 rounded-lg cursor-pointer text-center text-[10px] font-black uppercase tracking-wider transition-all border ${bulkTagihanIds.includes(t.id)
                                                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-300 hover:bg-blue-50'}`}>
                                                    {t.nama}
                                                </div>
                                            ))}
                                        </div>
                                        {bulkTagihanIds.length > 0 && (
                                            <button onClick={() => setBulkTagihanIds([])} className="mt-2 w-full text-[9px] font-bold text-gray-400 hover:text-rose-500 transition-colors py-1">
                                                <i className="fas fa-times mr-1"></i>Reset
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className={`space-y-1 ${isMobile ? 'w-full' : ''}`}>
                            <label className="block text-[9px] font-bold text-gray-500 uppercase">Nominal</label>
                            <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-gray-400">Rp</span>
                                <input type="text" inputMode="numeric" value={bulkNominalDisplay} onChange={e => { const raw = parseRupiah(e.target.value); setBulkNominal(raw); setBulkNominalDisplay(raw === '' ? '' : formatRupiah(raw)); }} className={`bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-primary/10 font-bold ${isMobile ? 'w-full pl-7 pr-2 py-1.5 text-[10px]' : 'pl-7 pr-3 py-2 text-[11px] w-36'}`} placeholder="0" />
                            </div>
                        </div>
                        <button onClick={applyBulkNominal} className={`btn-primary font-black uppercase tracking-widest shadow-lg shadow-primary/20 ${isMobile ? 'w-full py-2 text-[10px] rounded-xl' : 'px-4 py-2 text-[10px] rounded-xl'}`}>
                            <i className="fas fa-check mr-1"></i>Terapkan
                        </button>
                    </div>
                </div>
            )}

            {/* Grid Table */}
            {loading ? (
                <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div><span className="ml-3 text-sm font-medium text-gray-500">Memuat data...</span></div>
            ) : isMobile ? (
                /* Mobile: card-based expandable rows */
                <div className="bg-white rounded-2xl shadow-soft border border-gray-100 overflow-hidden">
                    <table className="admin-table mobile-table-fixed">
                        <thead><tr>
                            <th className="col-expand select-none py-1 text-center"></th>
                            <th className="select-none py-1.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Nama</th>
                            <th className="select-none py-1.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Kelas</th>
                        </tr></thead>
                        <tbody>
                            {siswaList.map((s, idx) => (
                                <React.Fragment key={s.siswa_id}>
                                    <tr className="hover:bg-gray-50/50 transition-colors border-b border-gray-100 last:border-0" onClick={() => setExpandedRow(expandedRow === s.siswa_id ? null : s.siswa_id)}>
                                        <td className="py-1.5 px-1 text-center align-middle">
                                            <i className={`fas fa-chevron-${expandedRow === s.siswa_id ? 'up' : 'down'} text-[8px] text-gray-400`}></i>
                                        </td>
                                        <td className="py-1.5 px-1 align-middle">
                                            <span className="text-[10px] font-black text-gray-700 uppercase tracking-tight truncate block max-w-[120px]">{s.siswa_nama}</span>
                                            <span className="text-[7px] text-gray-400 font-medium">NIS: {s.siswa_nis}</span>
                                        </td>
                                        <td className="py-1.5 px-1 align-middle"><span className="text-[9px] font-bold text-gray-600 uppercase">{s.kelas_nama}</span></td>
                                    </tr>
                                    {expandedRow === s.siswa_id && (
                                        <tr><td colSpan={3} className="p-0">
                                            <div className="bg-gray-50/70 p-3 space-y-2">
                                                {tagihan.map(t => {
                                                    const key = `${s.siswa_id}_${t.id}`;
                                                    const cell = s.tagihan?.[t.id] || {};
                                                    const edited = editedCells[key];
                                                    const val = edited ? edited.nominal : (cell.nominal || '');
                                                    return (
                                                        <div key={t.id} className="flex items-center justify-between gap-2">
                                                            <span className="text-[9px] font-bold text-gray-600 uppercase flex-shrink-0">{t.nama}</span>
                                                            <div className="relative">
                                                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[8px] font-bold text-gray-400">Rp</span>
                                                                <input type="text" inputMode="numeric" value={val === '' ? '' : formatRupiah(val)} onChange={e => handleCellChange(s.siswa_id, t.id, parseRupiah(e.target.value))}
                                                                    className={`w-28 bg-white border rounded-lg pl-6 pr-2 py-1 text-[10px] font-bold text-right focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${edited ? 'border-primary bg-primary/5' : 'border-gray-200'}`} placeholder="0" />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                {tagihan.length === 0 && <p className="text-[9px] text-gray-400 text-center">Belum ada jenis tagihan</p>}
                                            </div>
                                        </td></tr>
                                    )}
                                </React.Fragment>
                            ))}
                            {siswaList.length === 0 && (
                                <tr><td colSpan={3} className="py-12 text-center">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center"><i className="fas fa-users text-xl text-gray-300"></i></div>
                                        <p className="text-[10px] font-bold text-gray-400">{searchName ? 'Siswa tidak ditemukan' : 'Tidak ada data siswa'}</p>
                                    </div>
                                </td></tr>
                            )}
                        </tbody>
                    </table>
                    <div className="flex items-center justify-between p-3 border-t border-gray-100 bg-gray-50/30">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>{siswaList.length} Siswa · {tagihan.length} Tagihan
                        </span>
                    </div>
                </div>
            ) : (
                /* Desktop: full grid table */
                <div className="bg-white rounded-2xl shadow-soft border border-gray-100 overflow-x-auto scrollbar-hide">
                    <table className="admin-table min-w-[700px]" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                        <thead><tr>
                            <th className="select-none pl-6 py-2.5 w-[50px] text-center text-xs font-black text-gray-400 uppercase tracking-widest bg-white" style={{ position: 'sticky', left: 0, zIndex: 10 }}>No</th>
                            <th className="select-none py-2.5 px-2 text-xs font-black text-gray-400 uppercase tracking-widest bg-white min-w-[200px]" style={{ position: 'sticky', left: 50, zIndex: 10 }}>Nama Siswa</th>
                            <th className="select-none py-2.5 px-2 text-xs font-black text-gray-400 uppercase tracking-widest bg-white border-r border-gray-200" style={{ position: 'sticky', left: 250, zIndex: 10 }}>Kelas</th>
                            {tagihan.map(t => (
                                <th key={t.id} className="select-none py-2.5 px-2 text-xs font-black text-gray-400 uppercase tracking-widest min-w-[150px]">
                                    <div className="flex items-center gap-1">
                                        <span>{t.nama}</span>
                                        <button onClick={() => openEdit(t)} className="text-gray-300 hover:text-orange-500 transition-colors"><i className="fas fa-edit text-[8px]"></i></button>
                                        <button onClick={() => deleteTagihan(t.id)} className="text-gray-300 hover:text-rose-500 transition-colors"><i className="fas fa-trash text-[8px]"></i></button>
                                    </div>
                                </th>
                            ))}
                        </tr></thead>
                        <tbody>
                            {siswaList.map((s, idx) => (
                                <tr key={s.siswa_id} className="transition-colors border-b border-gray-100 last:border-0 group">
                                    <td className="py-2 pl-6 align-middle text-center text-xs font-bold text-gray-400 bg-white group-hover:bg-gray-50" style={{ position: 'sticky', left: 0, zIndex: 5 }}>{idx + 1}</td>
                                    <td className="py-2 px-2 align-middle bg-white group-hover:bg-gray-50 min-w-[200px]" style={{ position: 'sticky', left: 50, zIndex: 5 }}>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-gray-700 uppercase tracking-tight">{s.siswa_nama}</span>
                                            <span className="text-[7px] text-gray-400 font-medium">NIS: {s.siswa_nis}</span>
                                        </div>
                                    </td>
                                    <td className="py-2 px-2 align-middle bg-white group-hover:bg-gray-50 border-r border-gray-200" style={{ position: 'sticky', left: 250, zIndex: 5 }}><span className="text-[11px] font-bold text-gray-600 uppercase">{s.kelas_nama}</span></td>
                                    {tagihan.map(t => {
                                        const key = `${s.siswa_id}_${t.id}`;
                                        const cell = s.tagihan?.[t.id] || {};
                                        const edited = editedCells[key];
                                        const val = edited ? edited.nominal : (cell.nominal || '');
                                        return (
                                            <td key={t.id} className="py-2 px-2 align-middle group-hover:bg-gray-50">
                                                <div className="relative">
                                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-gray-400">Rp</span>
                                                    <input type="text" inputMode="numeric" value={val === '' ? '' : formatRupiah(val)} onChange={e => handleCellChange(s.siswa_id, t.id, parseRupiah(e.target.value))}
                                                        className={`w-full bg-gray-50 border rounded-lg pl-7 pr-2 py-1.5 text-[11px] font-bold text-right focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${edited ? 'border-primary bg-primary/5' : 'border-gray-200'}`} placeholder="0" />
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                            {siswaList.length === 0 && (
                                <tr><td colSpan={3 + tagihan.length} className="py-20 text-center">
                                    <div className="flex flex-col items-center justify-center gap-3">
                                        <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center"><i className="fas fa-users text-2xl text-gray-300"></i></div>
                                        <p className="text-sm font-bold text-gray-400">{searchName ? 'Siswa tidak ditemukan' : 'Tidak ada data siswa'}</p>
                                    </div>
                                </td></tr>
                            )}
                        </tbody>
                    </table>
                    <div className="flex items-center justify-between p-4 border-t border-gray-100 bg-gray-50/30">
                        <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>{siswaList.length} Siswa · {tagihan.length} Tagihan
                        </span>
                    </div>
                </div>
            )}

            <CrudModal show={showModal} onClose={() => setShowModal(false)} title={modalMode === 'add' ? 'Tambah Jenis Tagihan' : 'Edit Tagihan'} subtitle="Nama jenis tagihan" icon={modalMode === 'add' ? 'plus' : 'edit'} onSubmit={submitTagihan} submitLabel={modalMode === 'add' ? 'Simpan' : 'Perbarui'} isMobile={isMobile}>
                <ModalSection label="Detail Tagihan" isMobile={isMobile} />
                <div className="space-y-3">
                    <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Nama Tagihan *</label>
                        <input type="text" value={formNama} onChange={e => setFormNama(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder-gray-400" placeholder="Contoh: SPP, Seragam, Buku..." required />
                    </div>
                    <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Tanggal Jatuh Tempo</label>
                        <input type="date" value={formJatuhTempo} onChange={e => setFormJatuhTempo(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all" />
                        <p className="text-[9px] text-gray-400">Kosongkan jika langsung jatuh tempo</p>
                    </div>
                </div>
            </CrudModal>
        </>
    );
}
