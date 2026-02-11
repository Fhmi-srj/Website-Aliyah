import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { API_BASE, authFetch } from '../../../config/api';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import Pagination from '../../../components/Pagination';

const ITEMS_PER_PAGE_DEFAULT = 10;

function ManajemenJadwal() {
    const [data, setData] = useState([]);
    const [guruList, setGuruList] = useState([]);
    const [mapelList, setMapelList] = useState([]);
    const [kelasList, setKelasList] = useState([]);
    const [jamPelajaranList, setJamPelajaranList] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    const [tahunAjaranId, setTahunAjaranId] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [currentItem, setCurrentItem] = useState(null);
    const [isModalClosing, setIsModalClosing] = useState(false);
    const [formData, setFormData] = useState({
        jam_pelajaran_id: '',
        jam_pelajaran_sampai_id: '',
        guru_id: '',
        mapel_id: '',
        kelas_id: '',
        hari: 'Senin'
    });

    // Sorting state
    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState('asc');

    // Filter state
    const [filterHari, setFilterHari] = useState('');
    const [filterKelas, setFilterKelas] = useState('');
    const [activeFilter, setActiveFilter] = useState(null);

    // Mobile detection
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [expandedRows, setExpandedRows] = useState(new Set());

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE_DEFAULT);

    // Autocomplete state
    const [guruSearch, setGuruSearch] = useState('');
    const [showGuruDropdown, setShowGuruDropdown] = useState(false);
    const guruDropdownRef = useRef(null);

    const [mapelSearch, setMapelSearch] = useState('');
    const [showMapelDropdown, setShowMapelDropdown] = useState(false);
    const mapelDropdownRef = useRef(null);

    const hariList = ['Sabtu', 'Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis'];

    const fetchData = async (tahunId = tahunAjaranId) => {
        try {
            setLoading(true);
            const jadwalUrl = tahunId ? `${API_BASE}/jadwal?tahun_ajaran_id=${tahunId}` : `${API_BASE}/jadwal`;
            const [jadwalRes, guruRes, mapelRes, kelasRes, jamPelajaranRes] = await Promise.all([
                authFetch(jadwalUrl),
                authFetch(`${API_BASE}/guru`),
                authFetch(`${API_BASE}/mapel`),
                authFetch(`${API_BASE}/kelas`),
                authFetch(`${API_BASE}/jam-pelajaran`)
            ]);
            setData((await jadwalRes.json()).data || []);
            setGuruList((await guruRes.json()).data || []);
            setMapelList((await mapelRes.json()).data || []);
            setKelasList((await kelasRes.json()).data || []);
            setJamPelajaranList((await jamPelajaranRes.json()).data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(tahunAjaranId); }, [tahunAjaranId]);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const handleClick = (e) => {
            setActiveFilter(null);
            if (guruDropdownRef.current && !guruDropdownRef.current.contains(e.target)) setShowGuruDropdown(false);
            if (mapelDropdownRef.current && !mapelDropdownRef.current.contains(e.target)) setShowMapelDropdown(false);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const toggleRowExpand = (idx) => {
        setExpandedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(idx)) newSet.delete(idx);
            else newSet.add(idx);
            return newSet;
        });
    };

    const sortData = (dataToSort, column, direction) => {
        if (!column) return dataToSort;
        const dir = direction === 'asc' ? 1 : -1;
        return [...dataToSort].sort((a, b) => {
            let valA = a[column];
            let valB = b[column];
            if (column === 'guru') valA = a.guru?.nama || '';
            if (column === 'mapel') valA = a.mapel?.nama_mapel || '';
            if (column === 'kelas') valA = a.kelas?.nama_kelas || '';
            if (column === 'guru') valB = b.guru?.nama || '';
            if (column === 'mapel') valB = b.mapel?.nama_mapel || '';
            if (column === 'kelas') valB = b.kelas?.nama_kelas || '';
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();
            if (valA > valB) return dir;
            if (valA < valB) return -dir;
            return 0;
        });
    };

    const handleSort = (column) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const filteredData = (() => {
        let result = data.filter(item => {
            if (filterHari && item.hari !== filterHari) return false;
            if (filterKelas && item.kelas_id?.toString() !== filterKelas.toString()) return false;
            if (!search) return true;
            const s = search.toLowerCase();
            return (
                item.guru?.nama?.toLowerCase().includes(s) ||
                item.mapel?.nama_mapel?.toLowerCase().includes(s) ||
                item.kelas?.nama_kelas?.toLowerCase().includes(s) ||
                item.hari?.toLowerCase().includes(s)
            );
        });
        if (sortColumn) result = sortData(result, sortColumn, sortDirection);
        return result;
    })();

    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    useEffect(() => { setCurrentPage(1); }, [search, filterHari, filterKelas]);

    const handleExport = () => {
        const exportData = filteredData.map((item, idx) => ({
            'No': idx + 1,
            'Hari': item.hari,
            'Jam': `${item.jam_pelajaran?.jam_ke} (${item.jam_pelajaran?.mulai} - ${item.jam_pelajaran_sampai?.selesai || item.jam_pelajaran?.selesai})`,
            'Mapel': item.mapel?.nama_mapel,
            'Guru': item.guru?.nama,
            'Kelas': item.kelas?.nama_kelas
        }));
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Jadwal Pelajaran');
        XLSX.writeFile(wb, `Jadwal_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const openAddModal = () => {
        setModalMode('add');
        setFormData({
            jam_pelajaran_id: jamPelajaranList[0]?.id || '',
            jam_pelajaran_sampai_id: '',
            guru_id: '',
            mapel_id: '',
            kelas_id: kelasList[0]?.id || '',
            hari: 'Senin'
        });
        setGuruSearch('');
        setMapelSearch('');
        setIsModalClosing(false);
        setShowModal(true);
    };

    const openEditModal = (item) => {
        setModalMode('edit');
        setCurrentItem(item);
        setFormData({
            jam_pelajaran_id: item.jam_pelajaran_id || '',
            jam_pelajaran_sampai_id: item.jam_pelajaran_sampai_id || '',
            guru_id: item.guru_id || '',
            mapel_id: item.mapel_id || '',
            kelas_id: item.kelas_id || '',
            hari: item.hari || 'Senin'
        });
        setGuruSearch(item.guru?.nama || '');
        setMapelSearch(item.mapel?.nama_mapel || '');
        setIsModalClosing(false);
        setShowModal(true);
    };

    const closeModal = () => {
        setIsModalClosing(true);
        setTimeout(() => {
            setShowModal(false);
            setIsModalClosing(false);
        }, 200);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const url = modalMode === 'add' ? `${API_BASE}/jadwal` : `${API_BASE}/jadwal/${currentItem.id}`;
            const method = modalMode === 'add' ? 'POST' : 'PUT';
            const res = await authFetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                closeModal();
                fetchData();
                Swal.fire({ icon: 'success', title: 'Berhasil!', text: 'Jadwal tersimpan', timer: 1500, showConfirmButton: false });
            } else {
                const err = await res.json();
                Swal.fire({ icon: 'error', title: 'Gagal!', text: err.message || 'Terjadi kesalahan' });
            }
        } catch (error) { console.error('Error saving:', error); }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({ title: 'Hapus Jadwal?', text: 'Data tidak dapat dikembalikan!', icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc2626', cancelButtonColor: '#6b7280', confirmButtonText: 'Ya, Hapus!', cancelButtonText: 'Batal' });
        if (result.isConfirmed) {
            try {
                const res = await authFetch(`${API_BASE}/jadwal/${id}`, { method: 'DELETE', headers: { 'Accept': 'application/json' } });
                if (res.ok) {
                    fetchData();
                    Swal.fire({ icon: 'success', title: 'Terhapus!', text: 'Jadwal telah dihapus', timer: 1500, showConfirmButton: false });
                }
            } catch (error) { console.error('Error deleting:', error); }
        }
    };

    const SortableHeader = ({ label, column, filterable, filterOptions, filterValue, setFilterValue }) => (
        <th className="select-none py-4 px-2 cursor-pointer whitespace-nowrap group" onClick={() => !filterable && handleSort(column)}>
            <div className="flex items-center gap-1.5">
                <span onClick={(e) => { e.stopPropagation(); handleSort(column); }} className="hover:text-primary transition-colors">
                    {label}
                </span>
                <div className="flex flex-col text-[8px] leading-[4px] text-gray-300 dark:text-gray-600">
                    <i className={`fas fa-caret-up ${sortColumn === column && sortDirection === 'asc' ? 'text-primary' : ''}`}></i>
                    <i className={`fas fa-caret-down ${sortColumn === column && sortDirection === 'desc' ? 'text-primary' : ''}`}></i>
                </div>
                {filterable && (
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setActiveFilter(activeFilter === column ? null : column)} className={`ml-1 transition-colors ${filterValue ? 'text-primary' : 'text-gray-400 hover:text-primary dark:hover:text-gray-200'}`}>
                            <i className="fas fa-filter text-[10px]"></i>
                        </button>
                        {activeFilter === column && (
                            <div className="absolute top-full left-0 mt-2 bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-xl shadow-xl z-20 min-w-[150px] overflow-hidden animate-fadeIn">
                                {filterOptions.map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => { setFilterValue(opt.value); setActiveFilter(null); }}
                                        className={`block w-full text-left px-4 py-2.5 text-[11px] transition-colors hover:bg-primary/5 dark:hover:bg-primary/10 ${filterValue === opt.value ? 'bg-primary/10 text-primary font-bold dark:bg-primary/20' : 'dark:text-dark-text'}`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </th>
    );

    const filteredGuru = guruList.filter(g => g.nama?.toLowerCase().includes(guruSearch.toLowerCase()));
    const filteredMapel = mapelList.filter(m => m.nama_mapel?.toLowerCase().includes(mapelSearch.toLowerCase()));

    return (
        <div className="animate-fadeIn flex flex-col flex-grow max-w-full overflow-auto">
            {/* Header */}
            <header className="mb-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary to-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                            <i className="fas fa-calendar-alt text-white text-xl"></i>
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-gray-800 dark:text-dark-text uppercase tracking-tight">Jadwal Pelajaran</h1>
                            <p className="text-xs text-gray-400 mt-0.5 font-medium uppercase tracking-widest">Manajemen alokasi waktu & mata pelajaran</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 bg-gray-50/50 dark:bg-dark-bg/20 p-4 rounded-2xl border border-gray-100 dark:border-dark-border">
                <div className="flex items-center w-full md:w-[400px] relative group">
                    <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors"></i>
                    <input
                        aria-label="Cari jadwal"
                        className="w-full pl-11 pr-4 py-3 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all dark:text-dark-text placeholder-gray-400 shadow-sm"
                        placeholder="Cari guru, mapel, atau kelas..."
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 flex-wrap md:flex-nowrap items-center">
                    <button onClick={handleExport} className="btn-secondary px-5 py-2.5 flex items-center gap-2 font-black text-[10px] uppercase tracking-widest">
                        <i className="fas fa-file-export"></i>
                        <span>Export</span>
                    </button>
                    <button onClick={openAddModal} className="btn-primary px-6 py-2.5 flex items-center gap-2 group shadow-lg shadow-primary/20 font-black text-[10px] uppercase tracking-widest">
                        <i className="fas fa-plus group-hover:rotate-90 transition-transform"></i>
                        <span>Tambah Jadwal</span>
                    </button>
                </div>
            </div>

            {/* Table Section */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="ml-3 text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-widest">Menyusun Rencana...</span>
                </div>
            ) : (
                <div className="overflow-x-auto scrollbar-hide max-w-full bg-white dark:bg-dark-surface rounded-2xl shadow-soft border border-gray-100 dark:border-dark-border">
                    <table className={`admin-table ${isMobile ? '' : 'min-w-[1000px]'}`}>
                        <thead>
                            <tr>
                                <th className="select-none pl-8 py-4 w-10 text-center text-xs font-black text-gray-400 uppercase tracking-widest">No</th>
                                {isMobile && <th className="select-none py-4 text-center"></th>}
                                <SortableHeader
                                    label="Hari"
                                    column="hari"
                                    filterable
                                    filterOptions={[
                                        { label: 'Semua Hari', value: '' },
                                        ...hariList.map(h => ({ label: h, value: h }))
                                    ]}
                                    filterValue={filterHari}
                                    setFilterValue={setFilterHari}
                                />
                                <th className="select-none py-4 text-xs font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Jam Ke</th>
                                <SortableHeader label="Mata Pelajaran" column="mapel" />
                                <SortableHeader label="Guru Pengajar" column="guru" />
                                <SortableHeader
                                    label="Kelas"
                                    column="kelas"
                                    filterable
                                    filterOptions={[
                                        { label: 'Semua Kelas', value: '' },
                                        ...kelasList.map(k => ({ label: k.nama_kelas, value: k.id }))
                                    ]}
                                    filterValue={filterKelas}
                                    setFilterValue={setFilterKelas}
                                />
                                <th className="select-none py-4 text-center text-xs font-black text-gray-400 uppercase tracking-widest px-6">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.map((item, idx) => (
                                <React.Fragment key={item.id}>
                                    <tr className="hover:bg-gray-50/50 dark:hover:bg-dark-bg/20 transition-colors border-b border-gray-100 dark:border-dark-border last:border-0 group">
                                        <td className="pl-8 py-4 align-middle text-center text-xs font-bold text-gray-400 dark:text-gray-500">
                                            {(currentPage - 1) * itemsPerPage + idx + 1}
                                        </td>
                                        {isMobile && (
                                            <td className="py-4 align-middle text-center cursor-pointer px-2" onClick={() => toggleRowExpand(idx)}>
                                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${expandedRows.has(idx) ? 'bg-primary/10 text-primary' : 'bg-gray-100 dark:bg-dark-border text-gray-400'}`}>
                                                    <i className={`fas fa-${expandedRows.has(idx) ? 'minus' : 'plus'} text-[10px]`}></i>
                                                </div>
                                            </td>
                                        )}
                                        <td className="py-4 px-2 align-middle whitespace-nowrap">
                                            <span className="px-3 py-1 bg-gray-100 dark:bg-dark-bg/50 rounded-lg text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest">{item.hari}</span>
                                        </td>
                                        <td className="py-4 px-2 align-middle whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-primary uppercase">Jam {item.jam_pelajaran?.jam_ke}{item.jam_pelajaran_sampai_id ? ` - ${item.jam_pelajaran_sampai?.jam_ke}` : ''}</span>
                                                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium italic">({item.jam_pelajaran?.mulai} - {item.jam_pelajaran_sampai?.selesai || item.jam_pelajaran?.selesai})</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-2 align-middle whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-gray-700 dark:text-dark-text group-hover:text-primary transition-colors uppercase tracking-tight">{item.mapel?.nama_mapel}</span>
                                                <span className="text-[9px] text-gray-400 font-medium uppercase tracking-widest">{item.mapel?.kode_mapel}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-2 align-middle whitespace-nowrap">
                                            <span className="text-xs font-bold text-gray-600 dark:text-dark-text">{item.guru?.nama || '-'}</span>
                                        </td>
                                        <td className="py-4 px-2 align-middle whitespace-nowrap">
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-100 dark:border-emerald-900/10">
                                                {item.kelas?.nama_kelas}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 align-middle text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => openEditModal(item)} className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-100 transition-all flex items-center justify-center dark:bg-amber-900/20 dark:text-amber-400 hover:scale-110 active:scale-95" title="Edit Jadwal">
                                                    <i className="fas fa-edit text-[10px]"></i>
                                                </button>
                                                <button onClick={() => handleDelete(item.id)} className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all flex items-center justify-center dark:bg-rose-900/20 dark:text-rose-400 hover:scale-110 active:scale-95" title="Hapus Jadwal">
                                                    <i className="fas fa-trash text-[10px]"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    {isMobile && expandedRows.has(idx) && (
                                        <tr className="bg-gray-50/50 dark:bg-dark-bg/30 border-b border-gray-100 dark:border-dark-border">
                                            <td colSpan="8" className="px-8 py-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-1">
                                                        <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Detail Waktu</span>
                                                        <span className="text-xs font-bold text-gray-600 dark:text-dark-text italic">Sesi: {item.jam_pelajaran?.mulai} s/d {item.jam_pelajaran_sampai?.selesai || item.jam_pelajaran?.selesai}</span>
                                                    </div>
                                                    <div className="space-y-1 text-right">
                                                        <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Kode Mapel</span>
                                                        <span className="text-xs font-bold text-primary">{item.mapel?.kode_mapel || '-'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                            {filteredData.length === 0 && (
                                <tr>
                                    <td colSpan={isMobile ? 8 : 8} className="py-24 text-center">
                                        <div className="flex flex-col items-center justify-center gap-4 opacity-40">
                                            <i className="fas fa-calendar-times text-5xl"></i>
                                            <p className="text-xs font-black uppercase tracking-widest font-mono">Arsip Jadwal Tidak Ditemukan</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* Pagination Section */}
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-8 border-t border-gray-100 dark:border-dark-border bg-gray-50/30 dark:bg-dark-bg/10">
                        <div className="flex items-center gap-4">
                            <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                                {filteredData.length} Jadwal Terfilter
                            </span>
                        </div>
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                            totalItems={filteredData.length}
                            itemsPerPage={itemsPerPage}
                            onLimitChange={(limit) => {
                                setItemsPerPage(limit);
                                setCurrentPage(1);
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Modal Manajemen Jadwal */}
            {showModal && ReactDOM.createPortal(
                <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 backdrop-blur-sm ${isModalClosing ? 'opacity-0' : 'opacity-100'}`} style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }} onClick={closeModal}>
                    <div className={`bg-white dark:bg-dark-surface rounded-3xl shadow-2xl max-w-2xl w-full flex flex-col relative overflow-hidden transition-all duration-300 ${isModalClosing ? 'scale-95 translate-y-4 opacity-0' : 'scale-100 translate-y-0 opacity-100'}`} onClick={(e) => e.stopPropagation()}>
                        <div className="bg-gradient-to-r from-primary to-green-600 px-6 py-5 text-white relative">
                            <button onClick={closeModal} className="absolute top-4 right-4 text-white/80 hover:text-white cursor-pointer transition w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20" type="button"><i className="fas fa-times text-lg"></i></button>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                                    <i className={`fas fa-${modalMode === 'add' ? 'plus' : 'edit'} text-lg`}></i>
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold">{modalMode === 'add' ? 'Jadwal Baru' : 'Perbarui Jadwal'}</h2>
                                    <p className="text-xs text-white/80 mt-0.5 italic">Konfigurasi waktu dan pengajar</p>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                            <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh] scrollbar-hide">
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-4 px-1">Alokasi Waktu</label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Hari Pelaksanaan *</label>
                                            <select value={formData.hari} onChange={(e) => setFormData({ ...formData, hari: e.target.value })} className="input-standard outline-none">
                                                {hariList.map(h => <option key={h} value={h}>{h}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Unit Kelas *</label>
                                            <select required value={formData.kelas_id} onChange={(e) => setFormData({ ...formData, kelas_id: e.target.value })} className="input-standard outline-none">
                                                <option value="">-- Pilih Kelas --</option>
                                                {kelasList.map(k => <option key={k.id} value={k.id}>{k.nama_kelas}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Input Jam (Mulai) *</label>
                                            <select required value={formData.jam_pelajaran_id} onChange={(e) => setFormData({ ...formData, jam_pelajaran_id: e.target.value })} className="input-standard outline-none">
                                                <option value="">-- Pilih Jam --</option>
                                                {jamPelajaranList.map(j => <option key={j.id} value={j.id}>JAM {j.jam_ke} ({j.mulai} - {j.selesai})</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Sampai Jam (Opsional)</label>
                                            <select value={formData.jam_pelajaran_sampai_id} onChange={(e) => setFormData({ ...formData, jam_pelajaran_sampai_id: e.target.value })} className="input-standard outline-none">
                                                <option value="">-- Hanya 1 Jam --</option>
                                                {jamPelajaranList.map(j => <option key={j.id} value={j.id}>JAM {j.jam_ke} ({j.mulai} - {j.selesai})</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-4 px-1">Bidang Pelajaran & Pengajar</label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5 relative" ref={mapelDropdownRef}>
                                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Mata Pelajaran *</label>
                                            <div className="relative group">
                                                <i className="fas fa-book absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-primary transition-colors"></i>
                                                <input type="text" placeholder="Cari Mata Pelajaran..." value={mapelSearch} onChange={(e) => { setMapelSearch(e.target.value); setShowMapelDropdown(true); }} onFocus={() => setShowMapelDropdown(true)} className="input-standard pl-11" required />
                                            </div>
                                            {showMapelDropdown && (
                                                <div className="absolute z-50 mt-1 w-full bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-xl shadow-xl max-h-48 overflow-y-auto overflow-x-hidden animate-fadeIn">
                                                    {filteredMapel.map(m => (
                                                        <div key={m.id} onClick={() => { setFormData({ ...formData, mapel_id: m.id }); setMapelSearch(m.nama_mapel); setShowMapelDropdown(false); }} className="px-4 py-2.5 hover:bg-primary/5 cursor-pointer flex flex-col gap-0.5 border-b border-gray-50 dark:border-dark-border last:border-0">
                                                            <span className="text-xs font-bold text-gray-700 dark:text-dark-text">{m.nama_mapel}</span>
                                                            <span className="text-[10px] text-gray-400 font-mono tracking-wider">{m.kode_mapel}</span>
                                                        </div>
                                                    ))}
                                                    {filteredMapel.length === 0 && <div className="px-4 py-3 text-xs text-gray-400 italic font-medium">Mapel tidak ditemukan...</div>}
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-1.5 relative" ref={guruDropdownRef}>
                                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Guru Pengampu *</label>
                                            <div className="relative group">
                                                <i className="fas fa-chalkboard-teacher absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-primary transition-colors"></i>
                                                <input type="text" placeholder="Cari Nama Guru..." value={guruSearch} onChange={(e) => { setGuruSearch(e.target.value); setShowGuruDropdown(true); }} onFocus={() => setShowGuruDropdown(true)} className="input-standard pl-11" required />
                                            </div>
                                            {showGuruDropdown && (
                                                <div className="absolute z-50 mt-1 w-full bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-xl shadow-xl max-h-48 overflow-y-auto overflow-x-hidden animate-fadeIn">
                                                    {filteredGuru.map(g => (
                                                        <div key={g.id} onClick={() => { setFormData({ ...formData, guru_id: g.id }); setGuruSearch(g.nama); setShowGuruDropdown(false); }} className="px-4 py-2.5 hover:bg-primary/5 cursor-pointer flex flex-col gap-0.5 border-b border-gray-50 dark:border-dark-border last:border-0 border-r-4 border-r-transparent hover:border-r-primary transition-all">
                                                            <span className="text-xs font-bold text-gray-700 dark:text-dark-text">{g.nama}</span>
                                                            <span className="text-[10px] text-gray-400 font-medium">{g.nip || 'NIP -'}</span>
                                                        </div>
                                                    ))}
                                                    {filteredGuru.length === 0 && <div className="px-4 py-3 text-xs text-gray-400 italic font-medium">Guru tidak ditemukan...</div>}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 border-t border-gray-100 dark:border-dark-border flex gap-3 bg-gray-50/50 dark:bg-dark-bg/10">
                                <button type="button" onClick={closeModal} className="flex-1 px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-dark-border text-gray-600 dark:text-gray-400 hover:bg-white transition-all text-xs font-black uppercase tracking-widest">Batal</button>
                                <button type="submit" className="flex-1 px-4 py-3.5 rounded-2xl bg-primary text-white shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all text-xs font-black uppercase tracking-widest">Simpan Jadwal</button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
                .input-standard {
                    width: 100%;
                    background-color: #f9fafb;
                    border: 1px solid #e5e7eb;
                    border-radius: 1rem;
                    padding: 0.75rem 1rem;
                    font-size: 0.8125rem;
                    font-weight: 700;
                    color: #374151;
                    transition: all 0.2s;
                }
                .dark .input-standard {
                    background-color: rgba(17, 24, 39, 0.5);
                    border-color: #374151;
                    color: #f3f4f6;
                }
                .input-standard:focus {
                    outline: none;
                    box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1);
                    border-color: #10b981;
                }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            ` }} />
        </div>
    );
}

export default ManajemenJadwal;
