import React, { useState, useEffect } from 'react';
import CrudModal, { ModalSection } from '../../../components/CrudModal';
import { API_BASE, authFetch } from '../../../config/api';
import Swal from 'sweetalert2';
import SearchableDropdown from '../components/SearchableDropdown';
import { formatRupiah, parseRupiah } from '../../../utils/currency';

const formatTanggal = (d, mobile = false) => {
    if (!d) return '-';
    const dt = new Date(d);
    if (isNaN(dt)) return d;
    if (mobile) {
        const bulanShort = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        return `${String(dt.getDate()).padStart(2, '0')} ${bulanShort[dt.getMonth()]} ${String(dt.getFullYear()).slice(-2)}`;
    }
    const hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${hari[dt.getDay()]}, ${dt.getDate()} ${bulan[dt.getMonth()]} ${dt.getFullYear()} | ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
};

export default function TabPemasukan({ isMobile }) {
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('terbaru');
    const [filterSumber, setFilterSumber] = useState('');
    const [filterAdmin, setFilterAdmin] = useState('');
    const [showFilter, setShowFilter] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [mode, setMode] = useState('add');
    const [current, setCurrent] = useState(null);
    const [form, setForm] = useState({ sumber_id: '', nominal: '', keterangan: '', tanggal: new Date().toISOString().split('T')[0] });
    const [nominalDisplay, setNominalDisplay] = useState('');
    const [sumberList, setSumberList] = useState([]);

    const fmt = (n) => formatRupiah(n);

    useEffect(() => { fetchData(); fetchKategori(); }, []);

    const fetchData = async () => {
        setLoading(true);
        try { const r = await authFetch(`${API_BASE}/pemasukan`); const d = await r.json(); setList(d.data || []); } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const fetchKategori = async () => {
        try {
            const s1 = await authFetch(`${API_BASE}/transaksi-kategori?tipe=sumber_pemasukan`);
            const d1 = await s1.json(); setSumberList(d1.data || []);
        } catch (e) { console.error(e); }
    };

    const createKategori = async (nama, tipe) => {
        try { const r = await authFetch(`${API_BASE}/transaksi-kategori`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ nama, tipe }) }); const d = await r.json(); if (d.success) { fetchKategori(); return d.data; } } catch { } return null;
    };

    const editKategori = async (id, newNama) => {
        try { const r = await authFetch(`${API_BASE}/transaksi-kategori/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ nama: newNama }) }); const d = await r.json(); if (d.success) { fetchKategori(); fetchData(); } } catch (e) { console.error(e); }
    };

    const deleteKategori = async (id) => {
        try { const r = await authFetch(`${API_BASE}/transaksi-kategori/${id}`, { method: 'DELETE', headers: { Accept: 'application/json' } }); const d = await r.json(); if (d.success) { fetchKategori(); } } catch (e) { console.error(e); }
    };

    const handleNominalChange = (e) => {
        const raw = parseRupiah(e.target.value);
        setForm(f => ({ ...f, nominal: raw }));
        setNominalDisplay(raw === '' ? '' : formatRupiah(raw));
    };

    const openAdd = () => { setMode('add'); setForm({ sumber_id: '', nominal: '', keterangan: '', tanggal: new Date().toISOString().split('T')[0] }); setNominalDisplay(''); setShowModal(true); };
    const openEdit = (item) => { setMode('edit'); setCurrent(item); setForm({ sumber_id: item.sumber_id ? Number(item.sumber_id) : (item.sumber?.id ? Number(item.sumber.id) : ''), nominal: item.nominal, keterangan: item.keterangan || '', tanggal: item.tanggal ? item.tanggal.substring(0, 10) : new Date().toISOString().split('T')[0] }); setNominalDisplay(formatRupiah(item.nominal)); setShowModal(true); };

    const submit = async () => {
        try {
            const url = mode === 'add' ? `${API_BASE}/pemasukan` : `${API_BASE}/pemasukan/${current.id}`;
            const r = await authFetch(url, { method: mode === 'add' ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(form) });
            if (r.ok) { setShowModal(false); fetchData(); Swal.fire({ icon: 'success', title: 'Berhasil!', timer: 1500, showConfirmButton: false }); }
        } catch { Swal.fire({ icon: 'error', title: 'Gagal' }); }
    };

    const deleteItem = async (id) => {
        const c = await Swal.fire({ title: 'Yakin hapus?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc2626', confirmButtonText: 'Ya, Hapus!', cancelButtonText: 'Batal' });
        if (c.isConfirmed) { try { await authFetch(`${API_BASE}/pemasukan/${id}`, { method: 'DELETE', headers: { Accept: 'application/json' } }); fetchData(); Swal.fire({ icon: 'success', title: 'Terhapus!', timer: 1500, showConfirmButton: false }); } catch { } }
    };

    const adminList = [...new Map(list.filter(i => i.admin?.name).map(i => [i.admin.id || i.admin.name, { id: i.admin.id || i.admin.name, nama: i.admin.name }])).values()];

    const filtered = list.filter(i => {
        if (search) { const s = search.toLowerCase(); if (!(i.keterangan?.toLowerCase().includes(s) || i.sumber?.nama?.toLowerCase().includes(s) || String(i.nominal).includes(s))) return false; }
        if (filterSumber && String(i.sumber?.id) !== String(filterSumber)) return false;
        if (filterAdmin && String(i.admin?.id || i.admin?.name) !== String(filterAdmin)) return false;
        return true;
    }).sort((a, b) => {
        if (sortBy === 'terbaru') return new Date(b.tanggal) - new Date(a.tanggal);
        if (sortBy === 'terlama') return new Date(a.tanggal) - new Date(b.tanggal);
        if (sortBy === 'nominal_desc') return parseFloat(b.nominal || 0) - parseFloat(a.nominal || 0);
        if (sortBy === 'nominal_asc') return parseFloat(a.nominal || 0) - parseFloat(b.nominal || 0);
        return 0;
    });

    const activeFilterCount = (filterSumber ? 1 : 0) + (filterAdmin ? 1 : 0) + (sortBy !== 'terbaru' ? 1 : 0);

    return (
        <>
            {/* Controls */}
            <div className={`${isMobile ? 'mobile-controls-row bg-gray-50/50 rounded-xl border border-gray-100' : 'flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 p-4 bg-gray-50/50 rounded-2xl border border-gray-100'}`}>
                {isMobile ? (
                    <div className="flex flex-col gap-1.5 w-full">
                        <div className="flex gap-1.5 w-full">
                            <div className="relative group flex-1">
                                <i className="fas fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors text-[10px]"></i>
                                <input type="search" value={search} onChange={e => setSearch(e.target.value)}
                                    className="w-full !pl-7 pr-2 py-1.5 text-[10px] bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder-gray-400 shadow-sm"
                                    placeholder="Cari..." />
                            </div>
                            <button onClick={() => setShowFilter(f => !f)} className={`relative flex items-center justify-center w-8 h-8 rounded-xl border transition-all ${showFilter ? 'bg-primary text-white border-primary' : 'bg-white text-gray-500 border-gray-200'}`}>
                                <i className="fas fa-sliders-h text-[10px]"></i>
                                {activeFilterCount > 0 && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 text-white text-[7px] font-black rounded-full flex items-center justify-center">{activeFilterCount}</span>}
                            </button>
                            <button onClick={openAdd} className="btn-primary flex items-center justify-center gap-1 group shadow-lg shadow-primary/20 font-black uppercase tracking-widest px-3 py-1.5 text-[10px] rounded-xl">
                                <i className="fas fa-plus group-hover:rotate-90 transition-transform"></i><span>Tambah</span>
                            </button>
                        </div>
                        {showFilter && (
                            <div className="flex gap-1.5 pt-1">
                                <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="flex-1 min-w-0 px-1.5 py-1 rounded-lg text-[8px] font-bold bg-white border border-gray-200 text-gray-600 transition-all">
                                    <option value="terbaru">Terbaru</option>
                                    <option value="terlama">Terlama</option>
                                    <option value="nominal_desc">Rp ↓</option>
                                    <option value="nominal_asc">Rp ↑</option>
                                </select>
                                <select value={filterSumber} onChange={e => setFilterSumber(e.target.value)} className="flex-1 min-w-0 px-1.5 py-1 rounded-lg text-[8px] font-bold bg-white border border-gray-200 text-gray-600 transition-all">
                                    <option value="">Sumber</option>
                                    {sumberList.map(k => (<option key={k.id} value={String(k.id)}>{k.nama}</option>))}
                                </select>
                                <select value={filterAdmin} onChange={e => setFilterAdmin(e.target.value)} className="flex-1 min-w-0 px-1.5 py-1 rounded-lg text-[8px] font-bold bg-white border border-gray-200 text-gray-600 transition-all">
                                    <option value="">Admin</option>
                                    {adminList.map(a => (<option key={a.id} value={String(a.id)}>{a.nama}</option>))}
                                </select>
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-3 flex-wrap w-full">
                            <div className="relative group flex-1 min-w-[200px]">
                                <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors"></i>
                                <input type="search" value={search} onChange={e => setSearch(e.target.value)}
                                    className="w-full !pl-8 pr-2 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder-gray-400 shadow-sm"
                                    placeholder="Cari pemasukan..." />
                            </div>
                            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="px-3 py-2.5 rounded-xl text-xs font-bold bg-white border border-gray-200 text-gray-600 focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-sm">
                                <option value="terbaru">Terbaru</option>
                                <option value="terlama">Terlama</option>
                                <option value="nominal_desc">Nominal ↓</option>
                                <option value="nominal_asc">Nominal ↑</option>
                            </select>
                            <select value={filterSumber} onChange={e => setFilterSumber(e.target.value)} className="px-3 py-2.5 rounded-xl text-xs font-bold bg-white border border-gray-200 text-gray-600 focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-sm">
                                <option value="">Semua Sumber</option>
                                {sumberList.map(k => (<option key={k.id} value={String(k.id)}>{k.nama}</option>))}
                            </select>
                            <select value={filterAdmin} onChange={e => setFilterAdmin(e.target.value)} className="px-3 py-2.5 rounded-xl text-xs font-bold bg-white border border-gray-200 text-gray-600 focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-sm">
                                <option value="">Semua Admin</option>
                                {adminList.map(a => (<option key={a.id} value={String(a.id)}>{a.nama}</option>))}
                            </select>
                            <button onClick={openAdd} className="btn-primary flex items-center gap-1 group shadow-lg shadow-primary/20 font-black uppercase tracking-widest px-4 py-2.5 text-[10px] rounded-xl">
                                <i className="fas fa-plus group-hover:rotate-90 transition-transform"></i><span>Tambah</span>
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div><span className="ml-3 text-sm font-medium text-gray-500">Memuat...</span></div>
            ) : (
                <div className={`bg-white rounded-2xl shadow-soft border border-gray-100 ${isMobile ? 'overflow-hidden' : 'overflow-x-auto scrollbar-hide'}`}>
                    <table className={`admin-table ${isMobile ? 'mobile-table-fixed' : 'min-w-[700px]'}`}>
                        <thead><tr>
                            {!isMobile && <th className="select-none pl-6 py-2.5 w-10 text-center text-xs font-black text-gray-400 uppercase tracking-widest">No</th>}
                            <th className={`select-none py-2 ${isMobile ? 'px-2 text-[8px]' : 'text-xs'} font-black text-gray-400 uppercase tracking-widest`}>Tanggal</th>
                            <th className={`select-none py-2 ${isMobile ? 'px-2 text-[8px]' : 'text-xs'} font-black text-gray-400 uppercase tracking-widest`}>Sumber</th>
                            <th className={`select-none py-2 ${isMobile ? 'px-2 text-[8px]' : 'text-xs'} font-black text-gray-400 uppercase tracking-widest`}>Nominal</th>
                            {!isMobile && <th className="select-none py-2 text-xs font-black text-gray-400 uppercase tracking-widest">User</th>}
                            {!isMobile && <th className="select-none py-2 text-xs font-black text-gray-400 uppercase tracking-widest">Keterangan</th>}
                            <th className={`select-none py-2 text-center ${isMobile ? 'px-1 text-[8px]' : 'px-6 text-xs'} font-black text-gray-400 uppercase tracking-widest`}>Aksi</th>
                        </tr></thead>
                        <tbody>
                            {filtered.map((item, idx) => (
                                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors border-b border-gray-100 last:border-0 group">
                                    {!isMobile && <td className="py-2.5 pl-6 align-middle text-center text-xs font-bold text-gray-400">{idx + 1}</td>}
                                    <td className={`py-2 ${isMobile ? 'px-2' : ''} align-middle`}><span className={`text-gray-600 ${isMobile ? 'text-[9px]' : 'text-sm'}`}>{formatTanggal(item.tanggal, isMobile)}</span></td>
                                    <td className={`py-2 ${isMobile ? 'px-2' : ''} align-middle`}><span className={`px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-lg font-bold ${isMobile ? 'text-[8px]' : 'text-[10px]'}`}>{item.sumber?.nama || '-'}</span></td>
                                    <td className={`py-2 ${isMobile ? 'px-2' : ''} align-middle`}><span className={`font-bold text-emerald-600 ${isMobile ? 'text-[9px]' : 'text-sm'}`}>Rp {fmt(item.nominal)}</span></td>
                                    {!isMobile && <td className="py-2 align-middle"><span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-bold">{item.admin?.name || '-'}</span></td>}
                                    {!isMobile && <td className="py-2 align-middle text-[11px] text-gray-500 max-w-[200px] truncate">{item.keterangan || '-'}</td>}
                                    <td className={`py-2 ${isMobile ? 'px-1' : 'px-6'} align-middle text-center`}>
                                        <div className="flex items-center justify-center gap-1">
                                            <button onClick={() => openEdit(item)} className={`action-btn rounded-xl bg-orange-50 text-orange-600 hover:bg-orange-100 transition-all flex items-center justify-center hover:scale-110 active:scale-95 ${isMobile ? 'w-6 h-6' : 'w-8 h-8'}`} title="Edit"><i className={`fas fa-edit ${isMobile ? 'text-[8px]' : 'text-[10px]'}`}></i></button>
                                            <button onClick={() => deleteItem(item.id)} className={`action-btn rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all flex items-center justify-center hover:scale-110 active:scale-95 ${isMobile ? 'w-6 h-6' : 'w-8 h-8'}`} title="Hapus"><i className={`fas fa-trash ${isMobile ? 'text-[8px]' : 'text-[10px]'}`}></i></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr><td colSpan={isMobile ? 4 : 7} className={`text-center ${isMobile ? 'py-8' : 'py-20'}`}>
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <div className={`bg-gray-50 rounded-2xl flex items-center justify-center ${isMobile ? 'w-12 h-12' : 'w-16 h-16'}`}><i className={`fas fa-arrow-down text-gray-300 ${isMobile ? 'text-xl' : 'text-2xl'}`}></i></div>
                                        <p className={`font-bold text-gray-400 ${isMobile ? 'text-[10px]' : 'text-sm'}`}>Belum Ada Pemasukan</p>
                                    </div>
                                </td></tr>
                            )}
                        </tbody>
                    </table>
                    <div className={`flex items-center justify-between border-t border-gray-100 bg-gray-50/30 ${isMobile ? 'p-3' : 'p-6'}`}>
                        <span className={`font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5 ${isMobile ? 'text-[9px]' : 'text-[11px]'}`}><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>Total: Rp {fmt(filtered.reduce((s, i) => s + parseFloat(i.nominal || 0), 0))}</span>
                        <span className={`font-black text-gray-400 uppercase tracking-widest ${isMobile ? 'text-[9px]' : 'text-[11px]'}`}>{filtered.length} Transaksi</span>
                    </div>
                </div>
            )}

            <CrudModal show={showModal} onClose={() => setShowModal(false)} title={mode === 'add' ? 'Tambah Pemasukan' : 'Edit Pemasukan'} subtitle="Catat pemasukan keuangan" icon={mode === 'add' ? 'plus' : 'edit'} onSubmit={submit} submitLabel={mode === 'add' ? 'Simpan' : 'Perbarui'} isMobile={isMobile}>
                <ModalSection label="Detail Pemasukan" isMobile={isMobile} />
                <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Sumber *</label>
                        <SearchableDropdown options={sumberList} value={form.sumber_id} onChange={val => setForm({ ...form, sumber_id: val })} onAddNew={async (nama) => { const k = await createKategori(nama, 'sumber_pemasukan'); if (k) { setForm(f => ({ ...f, sumber_id: k.id })); return k; } }} onEdit={editKategori} onDelete={deleteKategori} placeholder="Pilih atau ketik sumber baru..." />
                    </div>
                    <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                        <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Nominal *</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">Rp</span>
                                <input type="text" inputMode="numeric" required value={nominalDisplay} onChange={handleNominalChange} className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder-gray-400 font-bold" placeholder="0" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Tanggal *</label>
                            <input type="date" required value={form.tanggal} onChange={e => setForm({ ...form, tanggal: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Keterangan</label>
                        <textarea value={form.keterangan} onChange={e => setForm({ ...form, keterangan: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder-gray-400" rows={2} placeholder="Opsional..." />
                    </div>
                </div>
            </CrudModal>
        </>
    );
}
