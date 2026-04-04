import React, { useState, useEffect } from 'react';
import CrudModal, { ModalSection } from '../../../components/CrudModal';
import { API_BASE, authFetch } from '../../../config/api';
import Swal from 'sweetalert2';
import Pagination from '../../../components/Pagination';
import { useNavigate } from 'react-router-dom';

const ITEMS_PER_PAGE_DEFAULT = 10;

export default function AdminBankSoal() {
    const [data, setData] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [currentItem, setCurrentItem] = useState(null);
    const navigate = useNavigate();

    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [generatePrefix, setGeneratePrefix] = useState('');

    const [mapelList, setMapelList] = useState([]);
    const [guruList, setGuruList] = useState([]);

    const [formData, setFormData] = useState({
        mapel_id: '',
        name: '',
        description: ''
    });

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE_DEFAULT);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [bankProjectFilter, setBankProjectFilter] = useState('');

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await authFetch(`${API_BASE}/cbt/question-banks`);
            const result = await response.json();
            setData(result.data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDropdowns = async () => {
        try {
            const resMapel = await authFetch(`${API_BASE}/mapel`);
            const mapel = await resMapel.json();
            setMapelList(mapel.data || []);
        } catch (error) {
            console.error('Error fetching dropdowns:', error);
        }
    };

    useEffect(() => {
        fetchData();
        fetchDropdowns();
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Compute unique projects from bank names (prefix before " - ")
    const bankProjects = [...new Set(
        data.map(b => b.name.includes(' - ') ? b.name.split(' - ')[0].trim() : null).filter(Boolean)
    )].sort();

    const filteredData = data.filter(item => {
        if (bankProjectFilter && !(item.name.startsWith(bankProjectFilter + ' - ') || item.name === bankProjectFilter)) return false;
        if (!search) return true;
        const s = search.toLowerCase();
        return (
            item.name?.toLowerCase().includes(s) ||
            item.mapel?.nama_mapel?.toLowerCase().includes(s)
        );
    });

    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const openAddModal = () => {
        setModalMode('add');
        setFormData({ mapel_id: '', name: '', description: '' });
        setShowModal(true);
    };

    const openEditModal = (item) => {
        setModalMode('edit');
        setCurrentItem(item);
        setFormData({
            mapel_id: item.mapel_id || '',
            name: item.name || '',
            description: item.description || ''
        });
        setShowModal(true);
    };

    const closeModal = () => setShowModal(false);

    const openGenerateModal = () => {
        setGeneratePrefix('');
        setShowGenerateModal(true);
    };

    const closeGenerateModal = () => setShowGenerateModal(false);

    const handleGenerate = async (e) => {
        e.preventDefault();
        try {
            const response = await authFetch(`${API_BASE}/cbt/question-banks/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ prefix: generatePrefix })
            });
            if (response.ok) {
                const result = await response.json();
                closeGenerateModal();
                fetchData();
                Swal.fire({ icon: 'success', title: 'Berhasil!', text: result.message || 'Mass generate berhasil', timer: 2000, showConfirmButton: false });
            } else {
                const error = await response.json();
                Swal.fire({ icon: 'error', title: 'Gagal!', text: error.message || 'Terjadi kesalahan' });
            }
        } catch (error) {
            console.error('Error generating:', error);
            Swal.fire({ icon: 'error', title: 'Gagal!', text: 'Terjadi kesalahan server' });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const url = modalMode === 'add' ? `${API_BASE}/cbt/question-banks` : `${API_BASE}/cbt/question-banks/${currentItem.id}`;
            const method = modalMode === 'add' ? 'POST' : 'PUT';
            const response = await authFetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (response.ok) {
                closeModal();
                fetchData();
                Swal.fire({ icon: 'success', title: 'Berhasil!', text: `Data berhasil ${modalMode === 'add' ? 'ditambahkan' : 'diperbarui'}`, timer: 1500, showConfirmButton: false });
            } else {
                const error = await response.json();
                Swal.fire({ icon: 'error', title: 'Gagal!', text: error.message || 'Terjadi kesalahan' });
            }
        } catch (error) {
            console.error('Error saving:', error);
        }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Yakin ingin menghapus?', text: 'Data tidak dapat dikembalikan!', icon: 'warning',
            showCancelButton: true, confirmButtonColor: '#dc2626', cancelButtonColor: '#6b7280', confirmButtonText: 'Ya, Hapus!'
        });
        if (!result.isConfirmed) return;
        try {
            const response = await authFetch(`${API_BASE}/cbt/question-banks/${id}`, { method: 'DELETE' });
            if (response.ok) {
                fetchData();
                Swal.fire({ icon: 'success', title: 'Terhapus!', text: 'Data berhasil dihapus', timer: 1500, showConfirmButton: false });
            }
        } catch (error) {
            console.error('Error deleting:', error);
        }
    };

    return (
        <div className="animate-fadeIn flex flex-col flex-grow max-w-full overflow-auto">
            <header className={`${isMobile ? 'mb-3 mobile-sticky-header pt-2 pb-2 px-1' : 'mb-6'}`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="page-header-icon w-12 h-12 bg-gradient-to-br from-primary to-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                            <i className="fas fa-database text-white text-xl"></i>
                        </div>
                        <div>
                            <h1 className="page-header-title text-xl font-black text-gray-800 uppercase tracking-tight">Bank Soal CBT</h1>
                            <p className="page-header-subtitle text-xs text-gray-400 mt-0.5 font-medium uppercase tracking-widest">Kelola referensi bank soal ujian</p>
                        </div>
                    </div>
                </div>
            </header>

            <div className={`${isMobile ? 'mobile-sticky-header' : ''}`}>
                <div className={`${isMobile ? 'mobile-controls-row bg-gray-50/50 rounded-xl border border-gray-100' : 'flex items-center gap-4 flex-wrap w-full mb-8 p-4 bg-gray-50/50 rounded-2xl border border-gray-100'}`}>
                    <div className={`${isMobile ? 'mobile-search-wrap' : 'relative group flex-1 min-w-[200px]'}`}>
                        <i className={`fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors ${isMobile ? 'text-[10px]' : ''}`}></i>
                        <input
                            aria-label="Cari bank soal"
                            className={`w-full !pl-8 pr-2 ${isMobile ? 'py-1.5 text-[10px]' : 'py-3 text-sm'} bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder-gray-400 shadow-sm`}
                            placeholder="Cari kode, nama bank, mapel..."
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    {/* Project filter dropdown */}
                    {!isMobile && bankProjects.length > 0 && (
                        <div className="relative flex-shrink-0">
                            <select
                                value={bankProjectFilter}
                                onChange={e => { setBankProjectFilter(e.target.value); setCurrentPage(1); }}
                                className="appearance-none pl-8 pr-8 py-2.5 text-[10px] font-black uppercase tracking-widest bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-sm text-gray-700 cursor-pointer min-w-[160px]"
                            >
                                <option value="">Semua Projek</option>
                                {bankProjects.map(proj => (
                                    <option key={proj} value={proj}>{proj}</option>
                                ))}
                            </select>
                            <i className="fas fa-folder absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 text-xs pointer-events-none"></i>
                            <i className="fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[9px] pointer-events-none"></i>
                        </div>
                    )}
                    <div className={`${isMobile ? 'mobile-btn-group' : 'flex gap-2 flex-wrap md:flex-nowrap items-center'}`}>
                        <button onClick={openGenerateModal} className={`btn-primary bg-indigo-500 hover:bg-indigo-600 flex items-center gap-1 group shadow-lg shadow-indigo-500/20 font-black uppercase tracking-widest ${isMobile ? '' : 'px-4 py-2.5 text-[10px] rounded-xl'}`} type="button">
                            <i className="fas fa-magic group-hover:rotate-12 transition-transform"></i>
                            <span>{isMobile ? 'Generate' : 'Generate Massal'}</span>
                        </button>
                        <button onClick={openAddModal} className={`btn-primary flex items-center gap-1 group shadow-lg shadow-primary/20 font-black uppercase tracking-widest ${isMobile ? '' : 'px-4 py-2.5 text-[10px] rounded-xl'}`} type="button">
                            <i className="fas fa-plus group-hover:rotate-90 transition-transform"></i>
                            <span>{isMobile ? 'Tambah' : 'Bank Soal Baru'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="ml-3 text-sm font-medium text-gray-500">Memuat data...</span>
                </div>
            ) : (
                <div className={`bg-white rounded-2xl shadow-soft border border-gray-100 ${isMobile ? 'overflow-hidden' : 'overflow-x-auto scrollbar-hide'}`}>
                    <table className={`admin-table ${isMobile ? 'mobile-table-fixed' : 'min-w-[900px]'}`}>
                        <thead>
                            <tr>
                                <th className="select-none pl-6 py-2.5 w-10 text-center text-xs font-black text-gray-400 uppercase tracking-widest">No</th>
                                <th className="select-none py-2.5 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Kode Bank</th>
                                <th className="select-none py-2.5 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Nama / Proyek Ujian</th>
                                <th className="select-none py-2.5 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Mata Pelajaran</th>
                                <th className="select-none py-2.5 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Jumlah Soal</th>
                                <th className="select-none py-2.5 text-center text-xs font-black text-gray-400 uppercase tracking-widest px-6">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.map((item, idx) => (
                                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors border-b border-gray-100 last:border-0 group">
                                    <td className="pl-6 py-2.5 align-middle text-center text-xs font-bold text-gray-400 text-sm">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                                    <td className="py-2.5 px-2 align-middle whitespace-nowrap"><span className="px-2 py-1 bg-gray-100 rounded-lg text-[10px] font-bold text-gray-500">{item.kode_bank}</span></td>
                                    <td className="py-2.5 px-2 align-middle">
                                        <div className="font-black text-gray-700 uppercase tracking-tight text-sm">{item.name}</div>
                                        {item.description && <div className="text-[10px] text-gray-400 truncate max-w-[200px]">{item.description}</div>}
                                    </td>
                                    <td className="py-2.5 px-2 align-middle text-sm font-semibold text-primary">{item.mapel?.nama_mapel || '-'}</td>
                                    <td className="py-2.5 px-2 align-middle text-sm font-bold text-gray-500">
                                        <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px]"><i className="fas fa-list-ol mr-1"></i> {item.questions_count || 0} Soal</span>
                                    </td>
                                    <td className="text-center py-2.5 px-6">
                                        <div className="flex items-center justify-center gap-1">
                                            <button onClick={() => navigate(`/cbt/bank-soal/${item.id}/soal`)} className="action-btn w-8 h-8 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all flex items-center justify-center hover:scale-110 active:scale-95" title="Kelola Soal Di Dalam Bank Ini"><i className="fas fa-list"></i></button>
                                            <button onClick={() => openEditModal(item)} className="action-btn w-8 h-8 rounded-xl bg-orange-50 text-orange-600 hover:bg-orange-100 transition-all flex items-center justify-center hover:scale-110 active:scale-95" title="Edit Data"><i className="fas fa-edit"></i></button>
                                            <button onClick={() => handleDelete(item.id)} className="action-btn w-8 h-8 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all flex items-center justify-center hover:scale-110 active:scale-95" title="Hapus Data"><i className="fas fa-trash"></i></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredData.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="py-20 text-center">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center">
                                                <i className="fas fa-database text-2xl text-gray-300"></i>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-400">Data Bank Soal Kosong</p>
                                                <p className="text-[11px] text-gray-400 mt-1 uppercase tracking-widest font-medium">Belum ada bank soal yang ditambahkan</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-6 border-t border-gray-100 bg-gray-50/30">
                        <div className="flex items-center gap-3 order-2 md:order-1">
                            <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                                Total {filteredData.length} Bank Soal
                            </span>
                        </div>
                        <div className="order-1 md:order-2">
                            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={filteredData.length} itemsPerPage={itemsPerPage} onLimitChange={(l) => { setItemsPerPage(l); setCurrentPage(1); }} />
                        </div>
                    </div>
                </div>
            )}

            <CrudModal show={showModal} onClose={closeModal} title={modalMode === 'add' ? 'Tambah Bank Soal' : 'Edit Bank Soal'} subtitle="Tentukan mapel untuk soal ini" icon={modalMode === 'add' ? 'plus' : 'edit'} onSubmit={handleSubmit} submitLabel={modalMode === 'add' ? 'Simpan' : 'Perbarui'} maxWidth="max-w-lg">
                <div>
                    <ModalSection label="Detail Bank Soal" />
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Nama / Proyek Ujian *</label>
                            <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input-standard" placeholder="Contoh: UTS Matematika Ganjil 2024" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Mata Pelajaran *</label>
                            <select required value={formData.mapel_id} onChange={(e) => setFormData({ ...formData, mapel_id: e.target.value })} className="input-standard">
                                <option value="">-- Pilih Mata Pelajaran --</option>
                                {mapelList.map(m => <option key={m.id} value={m.id}>{m.nama_mapel}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Deskripsi (Opsional)</label>
                            <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input-standard min-h-[80px]" placeholder="Deskripsi singkat bank soal..."></textarea>
                        </div>
                    </div>
                </div>
            </CrudModal>

            <CrudModal show={showGenerateModal} onClose={closeGenerateModal} title="Generate Massal Bank Soal" subtitle="Buat bank soal untuk seluruh Mapel secara otomatis" icon="magic" onSubmit={handleGenerate} submitLabel="Generate" maxWidth="max-w-lg">
                <div>
                    <ModalSection label="Pengaturan Generate" />
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Nama / Prefix Proyek *</label>
                            <input type="text" required value={generatePrefix} onChange={(e) => setGeneratePrefix(e.target.value)} className="input-standard" placeholder="Contoh: UAS S1 2025" />
                            <p className="text-[10px] text-gray-400 mt-1">Sistem akan membuat bank soal dengan format "[Prefix] - [Nama Mapel]". Contoh: "UAS S1 2025 - Matematika".</p>
                        </div>
                    </div>
                </div>
            </CrudModal>
        </div>
    );
}
