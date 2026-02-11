import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { API_BASE, authFetch } from '../../../config/api';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import Pagination from '../../../components/Pagination';

const ITEMS_PER_PAGE_DEFAULT = 10;

function ManajemenEkskul() {
    const [data, setData] = useState([]);
    const [guruList, setGuruList] = useState([]);
    const [siswaList, setSiswaList] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [currentItem, setCurrentItem] = useState(null);
    const [isModalClosing, setIsModalClosing] = useState(false);
    const [formData, setFormData] = useState({
        nama_ekskul: '',
        kategori: 'Olahraga',
        pembina_id: '',
        hari: 'Senin',
        jam_mulai: '14:00',
        jam_selesai: '16:00',
        tempat: '',
        deskripsi: '',
        status: 'Aktif'
    });

    // Sorting state
    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState('asc');

    // Filter state
    const [filterKategori, setFilterKategori] = useState('');
    const [filterHari, setFilterHari] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [activeFilter, setActiveFilter] = useState(null);

    // Mobile detection
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [expandedRows, setExpandedRows] = useState(new Set());

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE_DEFAULT);

    // Anggota modal state
    const [showAnggotaModal, setShowAnggotaModal] = useState(false);
    const [selectedEkskul, setSelectedEkskul] = useState(null);
    const [anggotaList, setAnggotaList] = useState([]);
    const [anggotaLoading, setAnggotaLoading] = useState(false);
    const [selectedSiswa, setSelectedSiswa] = useState('');
    const [anggotaSearch, setAnggotaSearch] = useState('');

    // File input ref for import
    const fileInputRef = useRef(null);

    const kategoriList = ['Olahraga', 'Seni', 'Akademik', 'Keagamaan'];
    const hariList = ['Sabtu', 'Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis'];

    const fetchData = async () => {
        try {
            setLoading(true);
            const [ekskulRes, guruRes, siswaRes] = await Promise.all([
                authFetch(`${API_BASE}/ekskul`),
                authFetch(`${API_BASE}/guru`),
                authFetch(`${API_BASE}/siswa`)
            ]);
            setData((await ekskulRes.json()).data || []);
            setGuruList((await guruRes.json()).data || []);
            setSiswaList((await siswaRes.json()).data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const handleClick = () => setActiveFilter(null);
        document.body.addEventListener('click', handleClick);
        return () => document.body.removeEventListener('click', handleClick);
    }, []);

    const toggleRowExpand = (idx) => {
        setExpandedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(idx)) {
                newSet.delete(idx);
            } else {
                newSet.add(idx);
            }
            return newSet;
        });
    };

    const sortData = (dataToSort, column, direction) => {
        if (!column) return dataToSort;
        const dir = direction === 'asc' ? 1 : -1;
        return [...dataToSort].sort((a, b) => {
            let valA = a[column];
            let valB = b[column];
            if (column === 'pembina') {
                valA = a.pembina?.nama || '';
                valB = b.pembina?.nama || '';
            }
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

    const renderStatus = (status) => {
        const isAktif = status === 'Aktif';
        return (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-200 ${isAktif
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
                : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'
                }`}>
                {isAktif && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>}
                {status}
            </span>
        );
    };

    const filteredData = (() => {
        let result = data.filter(item => {
            if (filterKategori && item.kategori !== filterKategori) return false;
            if (filterHari && item.hari !== filterHari) return false;
            if (filterStatus && item.status !== filterStatus) return false;
            if (!search) return true;
            const s = search.toLowerCase();
            return (
                item.nama_ekskul?.toLowerCase().includes(s) ||
                item.tempat?.toLowerCase().includes(s) ||
                item.pembina?.nama?.toLowerCase().includes(s)
            );
        });

        if (sortColumn) {
            result = sortData(result, sortColumn, sortDirection);
        }
        return result;
    })();

    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const paginatedData = filteredData.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    useEffect(() => {
        setCurrentPage(1);
    }, [search, filterKategori, filterHari, filterStatus]);

    const handleExport = () => {
        const exportData = filteredData.map((item, idx) => ({
            'No': idx + 1,
            'Nama Ekskul': item.nama_ekskul,
            'Kategori': item.kategori,
            'Pembina': item.pembina?.nama || '',
            'Jadwal': `${item.hari}, ${item.jam_mulai} - ${item.jam_selesai}`,
            'Tempat': item.tempat,
            'Status': item.status
        }));
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Data Ekskul');
        XLSX.writeFile(wb, `Data_Ekskul_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const openAddModal = () => {
        setModalMode('add');
        setFormData({
            nama_ekskul: '', kategori: 'Olahraga', pembina_id: guruList[0]?.id || '',
            hari: 'Senin', jam_mulai: '14:00', jam_selesai: '16:00', tempat: '',
            deskripsi: '', status: 'Aktif'
        });
        setIsModalClosing(false);
        setShowModal(true);
    };

    const openEditModal = (item) => {
        setModalMode('edit');
        setCurrentItem(item);
        setFormData({
            nama_ekskul: item.nama_ekskul || '',
            kategori: item.kategori || 'Olahraga',
            pembina_id: item.pembina_id || '',
            hari: item.hari || 'Senin',
            jam_mulai: item.jam_mulai || '14:00',
            jam_selesai: item.jam_selesai || '16:00',
            tempat: item.tempat || '',
            deskripsi: item.deskripsi || '',
            status: item.status || 'Aktif'
        });
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
            const url = modalMode === 'add' ? `${API_BASE}/ekskul` : `${API_BASE}/ekskul/${currentItem.id}`;
            const method = modalMode === 'add' ? 'POST' : 'PUT';
            const res = await authFetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                closeModal();
                fetchData();
                Swal.fire({ icon: 'success', title: 'Berhasil!', text: 'Data ekskul tersimpan', timer: 1500, showConfirmButton: false });
            }
        } catch (error) { console.error('Error saving:', error); }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({ title: 'Hapus Ekskul?', text: 'Data tidak dapat dikembalikan!', icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc2626', cancelButtonColor: '#6b7280', confirmButtonText: 'Ya, Hapus!', cancelButtonText: 'Batal' });
        if (result.isConfirmed) {
            try {
                const res = await authFetch(`${API_BASE}/ekskul/${id}`, { method: 'DELETE', headers: { 'Accept': 'application/json' } });
                if (res.ok) {
                    fetchData();
                    Swal.fire({ icon: 'success', title: 'Terhapus!', text: 'Ekskul telah dihapus', timer: 1500, showConfirmButton: false });
                }
            } catch (error) { console.error('Error deleting:', error); }
        }
    };

    // Anggota Management
    const openAnggotaModal = async (ekskul) => {
        setSelectedEkskul(ekskul);
        setShowAnggotaModal(true);
        setIsModalClosing(false);
        fetchAnggota(ekskul.id);
    };

    const fetchAnggota = async (ekskulId) => {
        setAnggotaLoading(true);
        try {
            const res = await authFetch(`${API_BASE}/ekskul/${ekskulId}/anggota`);
            const json = await res.json();
            setAnggotaList(json.data || []);
        } catch (error) { console.error('Error fetching anggota:', error); }
        setAnggotaLoading(false);
    };

    const handleAddAnggota = async () => {
        if (!selectedSiswa) return;
        try {
            const res = await authFetch(`${API_BASE}/ekskul/${selectedEkskul.id}/anggota`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ siswa_id: selectedSiswa })
            });
            if (res.ok) {
                setSelectedSiswa('');
                fetchAnggota(selectedEkskul.id);
            } else {
                const err = await res.json();
                Swal.fire({ icon: 'error', title: 'Gagal!', text: err.message || 'Siswa mungkin sudah terdaftar', timer: 2000, showConfirmButton: false });
            }
        } catch (error) { console.error('Error adding anggota:', error); }
    };

    const handleRemoveAnggota = async (anggotaId) => {
        try {
            const res = await authFetch(`${API_BASE}/ekskul-anggota/${anggotaId}`, { method: 'DELETE', headers: { 'Accept': 'application/json' } });
            if (res.ok) fetchAnggota(selectedEkskul.id);
        } catch (error) { console.error('Error removing anggota:', error); }
    };

    const closeAnggotaModal = () => {
        setIsModalClosing(true);
        setTimeout(() => {
            setShowAnggotaModal(false);
            setIsModalClosing(false);
            setSelectedEkskul(null);
            setAnggotaList([]);
        }, 200);
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

    return (
        <div className="animate-fadeIn flex flex-col flex-grow max-w-full overflow-auto">
            {/* Header */}
            <header className="mb-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary to-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                            <i className="fas fa-volleyball-ball text-white text-xl"></i>
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-gray-800 dark:text-dark-text uppercase tracking-tight">Ekstrakurikuler</h1>
                            <p className="text-xs text-gray-400 mt-0.5 font-medium uppercase tracking-widest">Wadah kreativitas dan bakat siswa</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 bg-gray-50/50 dark:bg-dark-bg/20 p-4 rounded-2xl border border-gray-100 dark:border-dark-border">
                <div className="flex items-center w-full md:w-[400px] relative group">
                    <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors"></i>
                    <input
                        aria-label="Cari ekskul"
                        className="w-full pl-11 pr-4 py-3 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all dark:text-dark-text placeholder-gray-400 shadow-sm"
                        placeholder="Cari nama ekskul, pembina..."
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
                        <span>Tambah Ekskul</span>
                    </button>
                </div>
            </div>

            {/* Table Section */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="ml-3 text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-widest">Menyiapkan Agenda...</span>
                </div>
            ) : (
                <div className="overflow-x-auto scrollbar-hide max-w-full bg-white dark:bg-dark-surface rounded-2xl shadow-soft border border-gray-100 dark:border-dark-border">
                    <table className={`admin-table ${isMobile ? '' : 'min-w-[1000px]'}`}>
                        <thead>
                            <tr>
                                <th className="select-none pl-8 py-4 w-10 text-center text-xs font-black text-gray-400 uppercase tracking-widest">No</th>
                                {isMobile && <th className="select-none py-4 text-center"></th>}
                                <SortableHeader label="Nama Ekskul" column="nama_ekskul" />
                                <SortableHeader
                                    label="Kategori"
                                    column="kategori"
                                    filterable
                                    filterOptions={[
                                        { label: 'Semua Kategori', value: '' },
                                        ...kategoriList.map(k => ({ label: k, value: k }))
                                    ]}
                                    filterValue={filterKategori}
                                    setFilterValue={setFilterKategori}
                                />
                                <SortableHeader label="Pembina" column="pembina" />
                                {!isMobile && (
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
                                )}
                                {!isMobile && <th className="select-none py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Jam</th>}
                                <SortableHeader
                                    label="Status"
                                    column="status"
                                    filterable
                                    filterOptions={[
                                        { label: 'Semua', value: '' },
                                        { label: 'Aktif', value: 'Aktif' },
                                        { label: 'Tidak Aktif', value: 'Tidak Aktif' }
                                    ]}
                                    filterValue={filterStatus}
                                    setFilterValue={setFilterStatus}
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
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-gray-700 dark:text-dark-text group-hover:text-primary transition-colors uppercase tracking-tight">{item.nama_ekskul}</span>
                                                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">Tempat: {item.tempat || '-'}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-2 align-middle whitespace-nowrap">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${item.kategori === 'Olahraga' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' :
                                                item.kategori === 'Seni' ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400' :
                                                    item.kategori === 'Akademik' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' :
                                                        'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
                                                }`}>
                                                {item.kategori}
                                            </span>
                                        </td>
                                        <td className="py-4 px-2 align-middle whitespace-nowrap">
                                            <span className="text-xs font-bold text-gray-600 dark:text-dark-text uppercase">{item.pembina?.nama || '-'}</span>
                                        </td>
                                        {!isMobile && (
                                            <td className="py-4 px-2 align-middle whitespace-nowrap">
                                                <span className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">{item.hari}</span>
                                            </td>
                                        )}
                                        {!isMobile && (
                                            <td className="py-4 px-2 align-middle whitespace-nowrap">
                                                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-600 dark:text-gray-400">
                                                    <i className="fas fa-clock text-[10px] text-gray-400"></i>
                                                    {item.jam_mulai} - {item.jam_selesai}
                                                </div>
                                            </td>
                                        )}
                                        <td className="py-4 px-2 align-middle whitespace-nowrap">{renderStatus(item.status)}</td>
                                        <td className="py-4 px-6 align-middle text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => openAnggotaModal(item)} className="w-8 h-8 rounded-xl bg-primary/10 text-primary hover:bg-primary transition-all hover:text-white flex items-center justify-center dark:bg-primary/20 dark:text-primary-light hover:scale-110 active:scale-95" title="Manajemen Anggota">
                                                    <i className="fas fa-users text-[10px]"></i>
                                                </button>
                                                <button onClick={() => openEditModal(item)} className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-100 transition-all flex items-center justify-center dark:bg-amber-900/20 dark:text-amber-400 hover:scale-110 active:scale-95" title="Edit Data">
                                                    <i className="fas fa-edit text-[10px]"></i>
                                                </button>
                                                <button onClick={() => handleDelete(item.id)} className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all flex items-center justify-center dark:bg-rose-900/20 dark:text-rose-400 hover:scale-110 active:scale-95" title="Hapus Data">
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
                                                        <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Jadwal</span>
                                                        <span className="text-xs font-bold text-gray-600 dark:text-dark-text">{item.hari}, {item.jam_mulai} - {item.jam_selesai}</span>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Tempat</span>
                                                        <span className="text-xs font-bold text-gray-600 dark:text-dark-text">{item.tempat || '-'}</span>
                                                    </div>
                                                    <div className="col-span-2 space-y-1">
                                                        <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Deskripsi</span>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium italic">{item.deskripsi || 'Tidak ada deskripsi'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>

                    {/* Pagination Section */}
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-8 border-t border-gray-100 dark:border-dark-border bg-gray-50/30 dark:bg-dark-bg/10">
                        <div className="flex items-center gap-4">
                            <span className="text-[11px] font-black text-gray-400 focus:text-primary transition-colors uppercase tracking-widest flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                                {filteredData.length} Ekskul Terdaftar
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

            {/* Modal Manajemen Ekskul */}
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
                                    <h2 className="text-lg font-bold">{modalMode === 'add' ? 'Ekskul Baru' : 'Perbarui Ekskul'}</h2>
                                    <p className="text-xs text-white/80 mt-0.5 italic">Detail informasi kegiatan ekstrakurikuler</p>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                            <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh] scrollbar-hide">
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Informasi Dasar</label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5 md:col-span-2">
                                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nama Ekskul *</label>
                                            <input type="text" required value={formData.nama_ekskul} onChange={(e) => setFormData({ ...formData, nama_ekskul: e.target.value })} className="input-standard" placeholder="Contoh: Sepak Bola, Paduan Suara..." />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Kategori *</label>
                                            <select value={formData.kategori} onChange={(e) => setFormData({ ...formData, kategori: e.target.value })} className="input-standard outline-none">
                                                {kategoriList.map(k => <option key={k} value={k}>{k}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pembina *</label>
                                            <select required value={formData.pembina_id} onChange={(e) => setFormData({ ...formData, pembina_id: e.target.value })} className="input-standard outline-none text-xs">
                                                <option value="">-- Pilih Guru Pembina --</option>
                                                {guruList.map(g => <option key={g.id} value={g.id}>{g.nama}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Jadwal & Lokasi</label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Hari Pelaksanaan *</label>
                                            <select value={formData.hari} onChange={(e) => setFormData({ ...formData, hari: e.target.value })} className="input-standard outline-none">
                                                {hariList.map(h => <option key={h} value={h}>{h}</option>)}
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1.5">
                                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Mulai *</label>
                                                <input type="time" value={formData.jam_mulai} onChange={(e) => setFormData({ ...formData, jam_mulai: e.target.value })} className="input-standard py-2" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Selesai *</label>
                                                <input type="time" value={formData.jam_selesai} onChange={(e) => setFormData({ ...formData, jam_selesai: e.target.value })} className="input-standard py-2" />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5 md:col-span-2">
                                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tempat / Lokasi *</label>
                                            <input type="text" required value={formData.tempat} onChange={(e) => setFormData({ ...formData, tempat: e.target.value })} className="input-standard" placeholder="Gedung Olahraga, Aula Utama, dll..." />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Tambahan</label>
                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status Kegiatan</label>
                                            <div className="flex gap-3">
                                                {['Aktif', 'Tidak Aktif'].map(s => (
                                                    <button key={s} type="button" onClick={() => setFormData({ ...formData, status: s })} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-2xl border transition-all ${formData.status === s ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-105' : 'bg-gray-50 dark:bg-dark-bg/50 border-gray-100 dark:border-dark-border text-gray-400'}`}>{s}</button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Deskripsi Singkat</label>
                                            <textarea value={formData.deskripsi} onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })} className="input-standard min-h-[100px] py-3 text-xs" placeholder="Ceritakan sedikit tentang kegiatan ekskul ini..."></textarea>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 border-t border-gray-100 dark:border-dark-border flex gap-3 bg-gray-50/50 dark:bg-dark-bg/10">
                                <button type="button" onClick={closeModal} className="flex-1 px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-dark-border text-gray-600 dark:text-gray-400 hover:bg-white transition-all text-[10px] font-black uppercase tracking-[0.2em]">Batal</button>
                                <button type="submit" className="flex-1 px-4 py-3.5 rounded-2xl bg-primary text-white shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all text-[10px] font-black uppercase tracking-[0.2em]">{modalMode === 'add' ? 'Daftarkan Ekskul' : 'Simpan Perubahan'}</button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Modal Manajemen Anggota */}
            {showAnggotaModal && ReactDOM.createPortal(
                <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 backdrop-blur-sm ${isModalClosing ? 'opacity-0' : 'opacity-100'}`} style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }} onClick={closeAnggotaModal}>
                    <div className={`bg-white dark:bg-dark-surface rounded-[2.5rem] shadow-2xl max-w-2xl w-full flex flex-col relative overflow-hidden transition-all duration-300 ${isModalClosing ? 'scale-95 translate-y-4 opacity-0' : 'scale-100 translate-y-0 opacity-100'}`} onClick={(e) => e.stopPropagation()}>
                        <div className="bg-gradient-to-br from-primary to-green-700 px-8 py-8 text-white relative">
                            <button onClick={closeAnggotaModal} className="absolute top-6 right-6 text-white/80 hover:text-white cursor-pointer transition w-10 h-10 flex items-center justify-center rounded-2xl hover:bg-white/20" type="button"><i className="fas fa-times text-xl"></i></button>
                            <div className="flex items-center gap-5">
                                <div className="w-14 h-14 bg-white/20 rounded-[1.25rem] flex items-center justify-center backdrop-blur-md shadow-inner">
                                    <i className="fas fa-users-cog text-xl"></i>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80 mb-1">Manajemen Peserta</p>
                                    <h2 className="text-2xl font-black uppercase tracking-tight leading-none">{selectedEkskul?.nama_ekskul}</h2>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col flex-1 overflow-hidden p-8">
                            {/* Form Tambah Anggota */}
                            <div className="bg-gray-50/50 dark:bg-dark-bg/20 rounded-3xl p-6 border border-gray-100 dark:border-dark-border mb-8">
                                <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 px-1">Registrasi Siswa Baru ke Ekskul</label>
                                <div className="flex gap-3">
                                    <div className="relative flex-1 group">
                                        <i className="fas fa-user-plus absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-primary transition-colors"></i>
                                        <select
                                            value={selectedSiswa}
                                            onChange={(e) => setSelectedSiswa(e.target.value)}
                                            className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-2xl text-xs font-bold text-gray-700 dark:text-dark-text outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all appearance-none"
                                        >
                                            <option value="">-- Cari Nama Siswa --</option>
                                            {siswaList.map(s => <option key={s.id} value={s.id}>{s.nama} ({s.kelas?.nama_kelas})</option>)}
                                        </select>
                                        <i className="fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 text-[10px] pointer-events-none group-focus-within:text-primary transition-colors"></i>
                                    </div>
                                    <button onClick={handleAddAnggota} className="bg-primary hover:bg-green-600 text-white px-8 rounded-2xl shadow-lg shadow-primary/20 transition-all font-black text-[10px] uppercase tracking-widest active:scale-95">Daftarkan</button>
                                </div>
                            </div>

                            {/* Daftar Anggota */}
                            <div className="flex-1 overflow-hidden flex flex-col">
                                <div className="flex items-center justify-between mb-4 px-2">
                                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Daftar Anggota Aktif</h3>
                                    <div className="relative group">
                                        <i className="fas fa-filter absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-[10px] group-focus-within:text-primary transition-colors"></i>
                                        <input
                                            type="text"
                                            placeholder="Cari di daftar..."
                                            value={anggotaSearch}
                                            onChange={(e) => setAnggotaSearch(e.target.value)}
                                            className="pl-8 pr-4 py-2 bg-gray-50 dark:bg-dark-bg/50 border border-gray-100 dark:border-dark-border rounded-xl text-[10px] font-bold text-gray-600 dark:text-dark-text outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto scrollbar-hide border border-gray-100 dark:border-dark-border rounded-3xl bg-white dark:bg-dark-surface shadow-inner">
                                    {anggotaLoading ? (
                                        <div className="h-full flex flex-col items-center justify-center gap-4 py-12">
                                            <div className="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Memverifikasi Peserta...</span>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-gray-50 dark:divide-dark-border/50">
                                            {anggotaList.filter(a => a.siswa?.nama?.toLowerCase().includes(anggotaSearch.toLowerCase())).map((anggota, idx) => (
                                                <div key={anggota.id} className="flex items-center justify-between p-5 hover:bg-gray-50 dark:hover:bg-dark-bg/20 transition-all group">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-dark-bg flex items-center justify-center text-[10px] font-black text-gray-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                                            {(idx + 1).toString().padStart(2, '0')}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <p className="text-sm font-black text-gray-700 dark:text-dark-text uppercase tracking-tight">{anggota.siswa?.nama}</p>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className="text-[9px] font-black text-primary bg-primary/5 px-1.5 py-0.5 rounded uppercase tracking-widest">{anggota.siswa?.kelas?.nama_kelas || 'N/A'}</span>
                                                                <span className="w-1 h-1 rounded-full bg-gray-200"></span>
                                                                <span className="text-[10px] text-gray-400 font-medium">SIS: {anggota.siswa?.nis}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleRemoveAnggota(anggota.id)}
                                                        className="w-10 h-10 rounded-[1.25rem] bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-all scale-0 group-hover:scale-100 active:scale-95 shadow-lg shadow-rose-500/10"
                                                        title="Keluarkan Peserta"
                                                    >
                                                        <i className="fas fa-user-minus text-xs"></i>
                                                    </button>
                                                </div>
                                            ))}
                                            {anggotaList.length === 0 && (
                                                <div className="h-full flex flex-col items-center justify-center gap-3 py-16 opacity-40">
                                                    <i className="fas fa-users-slash text-4xl text-gray-300"></i>
                                                    <p className="text-[10px] font-black uppercase tracking-widest">Belum Ada Peserta Terdaftar</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="px-8 pb-8 pt-2">
                            <button onClick={closeAnggotaModal} className="w-full py-4 rounded-2xl border border-gray-100 dark:border-dark-border text-gray-400 hover:text-gray-600 dark:hover:text-dark-text transition-all text-[10px] font-black uppercase tracking-[0.3em]">Selesai Konfigurasi</button>
                        </div>
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

export default ManajemenEkskul;
