import React, { useState, useEffect, useRef } from 'react';
import CrudModal from '../../../components/CrudModal';
import { API_BASE, APP_BASE, authFetch } from '../../../config/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useTahunAjaran } from '../../../contexts/TahunAjaranContext';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import Pagination from '../../../components/Pagination';


function ManajemenKegiatan() {
    const [data, setData] = useState([]);
    const [selectedItems, setSelectedItems] = useState(new Set());
    const [guruList, setGuruList] = useState([]);
    const [kalenderList, setKalenderList] = useState([]);
    const [kelasList, setKelasList] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    const { tahunAjaran: authTahunAjaran } = useAuth();
    const { activeTahunAjaran } = useTahunAjaran();
    const tahunAjaranId = authTahunAjaran?.id || activeTahunAjaran?.id;

    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [currentItem, setCurrentItem] = useState(null);

    const [formData, setFormData] = useState({
        nama_kegiatan: '',
        jenis_kegiatan: 'Rutin',
        waktu_mulai: '',
        waktu_berakhir: '',
        tempat: '',
        penanggung_jawab_id: '',
        guru_pendamping: [],
        kelas_peserta: [],
        deskripsi: '',
        status: 'Aktif',
        kalender_id: ''
    });

    const [pjSearch, setPjSearch] = useState('');
    const [showPjDropdown, setShowPjDropdown] = useState(false);
    const [gpSearch, setGpSearch] = useState('');
    const [showGpDropdown, setShowGpDropdown] = useState(false);
    const [showKelasDropdown, setShowKelasDropdown] = useState(false);

    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState('asc');

    const [filterJenis, setFilterJenis] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [activeFilter, setActiveFilter] = useState(null);

    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [expandedRows, setExpandedRows] = useState(new Set());
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [showAbsensiModal, setShowAbsensiModal] = useState(false);
    const [absensiData, setAbsensiData] = useState(null);
    const [loadingAbsensi, setLoadingAbsensi] = useState(false);

    const fileInputRef = useRef(null);
    const gpDropdownRef = useRef(null);
    const kelasDropdownRef = useRef(null);
    const pjDropdownRef = useRef(null);

    const jenisKegiatanList = ['Rutin', 'Tahunan', 'Insidental'];
    const statusList = ['Aktif', 'Selesai', 'Dibatalkan'];

    const fetchData = async (tahunId = tahunAjaranId) => {
        if (!tahunId) return;
        try {
            setLoading(true);
            const taParam = `?tahun_ajaran_id=${tahunId}`;
            const [kegiatanRes, guruRes, kelasRes, kalenderRes] = await Promise.all([
                authFetch(`${API_BASE}/kegiatan${taParam}`),
                authFetch(`${API_BASE}/guru`),
                authFetch(`${API_BASE}/kelas${taParam}`),
                authFetch(`${API_BASE}/kalender`)
            ]);
            setData((await kegiatanRes.json()).data || []);
            setGuruList((await guruRes.json()).data || []);
            setKelasList((await kelasRes.json()).data || []);
            setKalenderList((await kalenderRes.json()).data || []);
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
        const handleClickOutside = (e) => {
            setActiveFilter(null);
            if (pjDropdownRef.current && !pjDropdownRef.current.contains(e.target)) setShowPjDropdown(false);
            if (gpDropdownRef.current && !gpDropdownRef.current.contains(e.target)) setShowGpDropdown(false);
            if (kelasDropdownRef.current && !kelasDropdownRef.current.contains(e.target)) setShowKelasDropdown(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const formatDateTime = (dateStr) => {
        if (!dateStr) return '-';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            const seconds = String(d.getSeconds()).padStart(2, '0');
            return `${day}-${month}-${year} | ${hours}:${minutes}:${seconds}`;
        } catch (e) {
            return dateStr;
        }
    };

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
            let aVal = a[column] || '';
            let bVal = b[column] || '';
            if (column === 'pj') {
                aVal = a.penanggungjawab?.nama || '';
                bVal = b.penanggungjawab?.nama || '';
            }
            if (typeof aVal === 'string') aVal = aVal.toLowerCase();
            if (typeof bVal === 'string') bVal = bVal.toLowerCase();
            if (aVal < bVal) return -dir;
            if (aVal > bVal) return dir;
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
            if (filterJenis && item.jenis_kegiatan !== filterJenis) return false;
            if (filterStatus && item.status !== filterStatus) return false;
            if (!search) return true;
            const s = search.toLowerCase();
            return (
                item.nama_kegiatan?.toLowerCase().includes(s) ||
                item.penanggungjawab?.nama?.toLowerCase().includes(s) ||
                item.tempat?.toLowerCase().includes(s)
            );
        });
        if (sortColumn) result = sortData(result, sortColumn, sortDirection);
        return result;
    })();

    const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);

    useEffect(() => { setCurrentPage(1); }, [search, filterJenis, filterStatus]);

    const openAddModal = () => {
        setModalMode('add');
        setFormData({
            nama_kegiatan: '',
            jenis_kegiatan: 'Rutin',
            waktu_mulai: '',
            waktu_berakhir: '',
            tempat: '',
            penanggung_jawab_id: '',
            guru_pendamping: [],
            kelas_peserta: [],
            deskripsi: '',
            status: 'Aktif',
            kalender_id: ''
        });
        setPjSearch('');
        setGpSearch('');
        setShowModal(true);
    };

    // Convert ISO/any date string to datetime-local format (YYYY-MM-DDTHH:MM)
    const toDatetimeLocal = (val) => {
        if (!val) return '';
        try {
            const d = new Date(val);
            if (isNaN(d.getTime())) return '';
            const pad = (n) => String(n).padStart(2, '0');
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        } catch { return ''; }
    };

    const openEditModal = (item) => {
        setModalMode('edit');
        setCurrentItem(item);
        setFormData({
            nama_kegiatan: item.nama_kegiatan || '',
            jenis_kegiatan: item.jenis_kegiatan || 'Rutin',
            waktu_mulai: toDatetimeLocal(item.waktu_mulai),
            waktu_berakhir: toDatetimeLocal(item.waktu_berakhir),
            tempat: item.tempat || '',
            penanggung_jawab_id: item.penanggung_jawab_id || '',
            guru_pendamping: (item.guru_pendamping || []).map(g => typeof g === 'object' ? g.id : g),
            kelas_peserta: (item.kelas_peserta || []).map(k => typeof k === 'object' ? k.id : k),
            deskripsi: item.deskripsi || '',
            status: item.status || 'Aktif',
            kalender_id: item.kalender_id || (item.kalender?.id || '')
        });
        setPjSearch(item.penanggungjawab?.nama || '');
        setGpSearch('');
        setShowModal(true);
    };

    const handleSelectItem = (id) => {
        const newSelected = new Set(selectedItems);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedItems(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedItems.size === paginatedData.length && paginatedData.length > 0) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(paginatedData.map(item => item.id)));
        }
    };

    const handleBulkDelete = async () => {
        if (selectedItems.size === 0) return;

        const result = await Swal.fire({
            title: `Hapus ${selectedItems.size} agenda?`,
            text: 'Data yang dihapus tidak dapat dikembalikan!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Ya, Hapus Semua!',
            cancelButtonText: 'Batal'
        });

        if (!result.isConfirmed) return;

        try {
            const response = await authFetch(`${API_BASE}/kegiatan/bulk-delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ ids: Array.from(selectedItems) })
            });

            if (response.ok) {
                setSelectedItems(new Set());
                fetchData();
                Swal.fire({
                    icon: 'success',
                    title: 'Terhapus!',
                    text: `${selectedItems.size} agenda telah dibersihkan`,
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                const errData = await response.json().catch(() => null);
                Swal.fire({ icon: 'error', title: 'Gagal', text: errData?.message || 'Gagal menghapus data' });
            }
        } catch (error) {
            console.error('Error bulk delete:', error);
            Swal.fire({ icon: 'error', title: 'Error', text: 'Terjadi kesalahan jaringan' });
        }
    };

    const handleExport = () => {
        const exportData = filteredData.map((item, idx) => ({
            'No': idx + 1,
            'Kegiatan': item.nama_kegiatan,
            'Jenis': item.jenis_kegiatan,
            'Mulai': formatDateTime(item.waktu_mulai),
            'Selesai': formatDateTime(item.waktu_berakhir),
            'Tempat': item.tempat,
            'PJ': item.penanggung_jawab?.nama,
            'Status': item.status
        }));
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Data Kegiatan');
        XLSX.writeFile(wb, `Data_Kegiatan_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const closeModal = () => setShowModal(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const url = modalMode === 'add' ? `${API_BASE}/kegiatan` : `${API_BASE}/kegiatan/${currentItem.id}`;
            const method = modalMode === 'add' ? 'POST' : 'PUT';
            const payload = { ...formData, tahun_ajaran_id: tahunAjaranId };
            const res = await authFetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                closeModal();
                fetchData();
                Swal.fire({ icon: 'success', title: 'Berhasil!', text: 'Data kegiatan tersimpan', timer: 1500, showConfirmButton: false });
            } else {
                const errData = await res.json().catch(() => null);
                Swal.fire('Gagal', errData?.message || 'Terjadi kesalahan saat menyimpan', 'error');
            }
        } catch (error) {
            console.error('Error saving:', error);
            Swal.fire('Gagal', 'Terjadi kesalahan saat menyimpan data', 'error');
        }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Hapus Kegiatan?',
            text: 'Data absensi terkait juga akan terhapus!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Ya, Hapus!',
            cancelButtonText: 'Batal'
        });

        if (result.isConfirmed) {
            try {
                const res = await authFetch(`${API_BASE}/kegiatan/${id}`, { method: 'DELETE', headers: { 'Accept': 'application/json' } });
                if (res.ok) {
                    Swal.fire({ icon: 'success', title: 'Terhapus!', text: 'Kegiatan telah dihapus', timer: 1500, showConfirmButton: false });
                    fetchData();
                } else {
                    const errData = await res.json().catch(() => null);
                    Swal.fire({ icon: 'error', title: 'Gagal', text: errData?.message || 'Gagal menghapus kegiatan' });
                }
            } catch (error) {
                console.error('Error deleting data:', error);
                Swal.fire('Gagal', 'Terjadi kesalahan saat menghapus data', 'error');
            }
        }
    };

    const handlePrint = (item) => {
        const token = localStorage.getItem('auth_token');
        if (!item.absensi_id) {
            Swal.fire('Info', 'Absensi belum diisi', 'info');
            return;
        }
        const url = `${API_BASE}/guru-panel/print/hasil-kegiatan/${item.absensi_id}?token=${token}`;
        window.open(url, '_blank');
    };

    const openAbsensiModal = async (item) => {
        setCurrentItem(item);
        try {
            setLoadingAbsensi(true);
            const res = await authFetch(`${API_BASE}/kegiatan/${item.id}/absensi-admin`);
            const result = await res.json();
            if (result.success) {
                setAbsensiData(result.data);
                setShowAbsensiModal(true);
            } else {
                Swal.fire('Error', result.error || 'Gagal memuat data absensi', 'error');
            }
        } catch (error) {
            console.error('Error fetching absensi:', error);
            Swal.fire('Error', 'Gagal memuat data absensi', 'error');
        } finally {
            setLoadingAbsensi(false);
        }
    };

    const toggleGp = (id) => {
        setFormData(prev => ({
            ...prev,
            guru_pendamping: prev.guru_pendamping.includes(id)
                ? prev.guru_pendamping.filter(gid => gid !== id)
                : [...prev.guru_pendamping, id]
        }));
    };

    const toggleKelas = (id) => {
        setFormData(prev => ({
            ...prev,
            kelas_peserta: prev.kelas_peserta.includes(id)
                ? prev.kelas_peserta.filter(kid => kid !== id)
                : [...prev.kelas_peserta, id]
        }));
    };

    const handleLinkKaldik = (kalId) => {
        if (!kalId) return;
        const kal = kalenderList.find(k => k.id === parseInt(kalId));
        if (kal) {
            setFormData(prev => ({
                ...prev,
                waktu_mulai: kal.tanggal_mulai ? kal.tanggal_mulai.slice(0, 16) : prev.waktu_mulai,
                waktu_berakhir: kal.tanggal_berakhir ? kal.tanggal_berakhir.slice(0, 16) : prev.waktu_berakhir,
                tempat: kal.tempat || prev.tempat,
                penanggung_jawab_id: kal.guru_id || prev.penanggung_jawab_id,
                kalender_id: kal.id,
            }));
            if (kal.guru?.nama) {
                setPjSearch(kal.guru.nama);
            }
            toast.success(`Terhubung ke Agenda: ${kal.kegiatan.trim()}`, {
                icon: '🔗',
                description: 'Data waktu, tempat, dan PJ telah disesuaikan.',
                duration: 3000
            });
        }
    };

    // Smart Auto-Fill when typing name
    useEffect(() => {
        if (modalMode === 'add' && formData.nama_kegiatan.length > 3) {
            const exactMatch = kalenderList.find(k =>
                k.kegiatan.trim().toLowerCase() === formData.nama_kegiatan.trim().toLowerCase() &&
                !k.kegiatan_id
            );

            if (exactMatch) {
                if (formData.kalender_id !== exactMatch.id) {
                    handleLinkKaldik(exactMatch.id);
                }
            } else if (formData.kalender_id) {
                // If it was linked but name no longer matches exactly, clear the link
                setFormData(prev => ({ ...prev, kalender_id: '' }));
            }
        }
    }, [formData.nama_kegiatan, kalenderList, modalMode]);

    const SortableHeader = ({ label, column, filterable, filterOptions, filterValue, setFilterValue }) => (
        <th className="select-none py-2.5 px-2 cursor-pointer whitespace-nowrap group" onClick={() => !filterable && handleSort(column)}>
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

    const filteredGp = guruList.filter(g => g.nama?.toLowerCase().includes(gpSearch.toLowerCase()));
    const filteredPj = guruList.filter(g => g.nama?.toLowerCase().includes(pjSearch.toLowerCase()));

    return (
        <div className="animate-fadeIn flex flex-col flex-grow max-w-full overflow-auto">
            {/* Header */}
            <header className={`${isMobile ? 'mb-3 mobile-sticky-header pt-2 pb-2 px-1' : 'mb-6'}`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="page-header-icon w-12 h-12 bg-gradient-to-br from-primary to-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                            <i className="fas fa-skating text-white text-xl"></i>
                        </div>
                        <div>
                            <h1 className="page-header-title text-xl font-black text-gray-800 dark:text-dark-text uppercase tracking-tight">Manajemen Kegiatan</h1>
                            <p className="page-header-subtitle text-xs text-gray-400 mt-0.5 font-medium uppercase tracking-widest">Atur agenda rutin & event spesial sekolah</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Controls */}
            <div className={`flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 bg-gray-50/50 dark:bg-dark-bg/20 p-4 rounded-2xl border border-gray-100 dark:border-dark-border ${isMobile ? 'mobile-sticky-header !mb-3 !p-2 !rounded-xl' : ''}`}>
                <div className={`flex items-center w-full ${isMobile ? '' : 'md:w-[400px]'} relative group`}>
                    <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors"></i>
                    <input
                        aria-label="Cari kegiatan"
                        className={`w-full pl-11 pr-4 ${isMobile ? 'py-2 text-xs' : 'py-3 text-sm'} bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all dark:text-dark-text placeholder-gray-400 shadow-sm`}
                        placeholder="Cari nama kegiatan, tempat, PJ..."
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className={`flex gap-2 items-center ${isMobile ? 'w-full' : 'flex-nowrap'}`}>
                    {selectedItems.size > 0 && (
                        <button onClick={handleBulkDelete} className={`bg-rose-500 text-white ${isMobile ? 'flex-1 py-2.5' : 'px-5 py-2.5'} rounded-xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest hover:bg-rose-600 transition-all shadow-lg shadow-rose-200`}>
                            <i className="fas fa-trash"></i>
                            <span>Hapus ({selectedItems.size})</span>
                        </button>
                    )}
                    <button onClick={handleExport} className={`btn-secondary ${isMobile ? 'flex-1 py-2.5' : 'px-5 py-2.5'} flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest`}>
                        <i className="fas fa-file-export"></i>
                        <span>Export</span>
                    </button>
                    <button onClick={openAddModal} className={`btn-primary ${isMobile ? 'flex-1 py-2.5' : 'px-4 py-2.5'} flex items-center justify-center gap-2 group shadow-lg shadow-primary/20 font-black text-[10px] uppercase tracking-widest`}>
                        <i className="fas fa-plus group-hover:rotate-90 transition-transform"></i>
                        <span>{isMobile ? 'Tambah' : 'Tambah Kegiatan'}</span>
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
                    <table className={`admin-table ${isMobile ? '' : 'min-w-[1200px]'}`}>
                        <thead>
                            <tr>
                                {!isMobile && (
                                    <th className="select-none pl-6 py-2.5 w-10 text-center">
                                        <input
                                            type="checkbox"
                                            checked={paginatedData.length > 0 && selectedItems.size === paginatedData.length}
                                            onChange={handleSelectAll}
                                            className="w-4 h-4 rounded border-gray-300 dark:border-dark-border text-primary focus:ring-primary cursor-pointer"
                                        />
                                    </th>
                                )}
                                {!isMobile && <th className="select-none py-2.5 w-10 text-center text-xs font-black text-gray-400 uppercase tracking-widest">No</th>}
                                {isMobile && <th className="select-none py-2.5 text-center"></th>}
                                <SortableHeader label="Kegiatan" column="nama_kegiatan" />
                                <SortableHeader
                                    label="Jenis"
                                    column="jenis_kegiatan"
                                    filterable
                                    filterOptions={[
                                        { label: 'Semua Jenis', value: '' },
                                        ...jenisKegiatanList.map(j => ({ label: j, value: j }))
                                    ]}
                                    filterValue={filterJenis}
                                    setFilterValue={setFilterJenis}
                                />
                                {!isMobile && <SortableHeader label="Mulai" column="waktu_mulai" />}
                                {!isMobile && <SortableHeader label="Selesai" column="waktu_berakhir" />}
                                {!isMobile && <SortableHeader label="Tempat" column="tempat" />}
                                {!isMobile && <SortableHeader label="Penanggung Jawab" column="pj" />}
                                {!isMobile && (
                                    <SortableHeader
                                        label="Status"
                                        column="status"
                                        filterable
                                        filterOptions={[
                                            { label: 'Semua Status', value: '' },
                                            ...statusList.map(s => ({ label: s, value: s }))
                                        ]}
                                        filterValue={filterStatus}
                                        setFilterValue={setFilterStatus}
                                    />
                                )}
                                <th className="select-none py-2.5 text-center text-xs font-black text-gray-400 uppercase tracking-widest px-6">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.map((item, idx) => (
                                <React.Fragment key={item.id}>
                                    <tr className={`hover:bg-gray-50/50 dark:hover:bg-dark-bg/20 transition-colors border-b border-gray-100 dark:border-dark-border last:border-0 group ${selectedItems.has(item.id) ? 'bg-primary/5 dark:bg-primary/10' : ''}`}>
                                        {!isMobile && (
                                            <td className="pl-6 py-2.5 align-middle">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedItems.has(item.id)}
                                                    onChange={() => handleSelectItem(item.id)}
                                                    className="w-4 h-4 rounded border-gray-300 dark:border-dark-border text-primary focus:ring-primary cursor-pointer"
                                                />
                                            </td>
                                        )}
                                        {!isMobile && (
                                            <td className="py-2.5 align-middle text-center text-xs font-bold text-gray-400 dark:text-gray-500">
                                                {(currentPage - 1) * itemsPerPage + idx + 1}
                                            </td>
                                        )}
                                        {isMobile && (
                                            <td className="py-1 align-middle text-center cursor-pointer px-1" onClick={() => toggleRowExpand(idx)}>
                                                <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${expandedRows.has(idx) ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-400'}`}>
                                                    <i className={`fas fa-chevron-${expandedRows.has(idx) ? 'up' : 'down'} text-[7px]`}></i>
                                                </div>
                                            </td>
                                        )}
                                        <td className="py-2.5 px-2 align-middle">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-gray-700 dark:text-dark-text group-hover:text-primary transition-colors uppercase tracking-tight">{item.nama_kegiatan}</span>
                                                <span className="text-[9px] text-gray-400 dark:text-gray-500 font-medium truncate max-w-[200px]">{item.deskripsi || '-'}</span>
                                            </div>
                                        </td>
                                        <td className="py-2.5 px-2 align-middle">
                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${item.jenis_kegiatan === 'Tahunan' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' :
                                                item.jenis_kegiatan === 'Insidental' ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400' :
                                                    'bg-primary/5 text-primary dark:bg-primary/20'
                                                }`}>
                                                {item.jenis_kegiatan}
                                            </span>
                                        </td>
                                        {!isMobile && (
                                            <td className="py-2.5 px-2 align-middle whitespace-nowrap">
                                                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-600 dark:text-gray-400">
                                                    <i className="far fa-calendar-alt text-[10px] text-primary"></i>
                                                    <span className="uppercase tracking-tight">{formatDateTime(item.waktu_mulai)}</span>
                                                </div>
                                            </td>
                                        )}
                                        {!isMobile && (
                                            <td className="py-2.5 px-2 align-middle whitespace-nowrap">
                                                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-600 dark:text-gray-400">
                                                    <i className="fas fa-clock text-[10px] text-primary"></i>
                                                    <span className="uppercase tracking-tight">{item.waktu_berakhir ? formatDateTime(item.waktu_berakhir) : '-'}</span>
                                                </div>
                                            </td>
                                        )}
                                        {!isMobile && (
                                            <td className="py-2.5 px-2 align-middle">
                                                <div className="flex items-center gap-1.5 text-[10px] font-medium text-gray-400">
                                                    <i className="fas fa-map-marker-alt text-[9px]"></i>
                                                    {item.tempat}
                                                </div>
                                            </td>
                                        )}
                                        {!isMobile && (
                                            <td className="py-2.5 px-2 align-middle">
                                                <span className="text-xs font-bold text-gray-600 dark:text-dark-text uppercase">{item.penanggungjawab?.nama || '-'}</span>
                                            </td>
                                        )}
                                        {!isMobile && (
                                            <td className="py-2.5 px-2 align-middle">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${item.status === 'Aktif' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' :
                                                    item.status === 'Selesai' ? 'bg-gray-50 text-gray-500 dark:bg-dark-bg/50 dark:text-gray-400' :
                                                        'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'
                                                    }`}>
                                                    {item.status === 'Aktif' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>}
                                                    {item.status}
                                                </span>
                                            </td>
                                        )}
                                        <td className={`${isMobile ? 'py-1 px-2' : 'py-2.5 px-6'} align-middle text-center`}>
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => openAbsensiModal(item)} className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-all flex items-center justify-center dark:bg-primary/20 hover:scale-110 active:scale-95`} title="Absensi">
                                                    <i className={`fas fa-clipboard-check ${isMobile ? 'text-[8px]' : 'text-[10px]'}`}></i>
                                                </button>
                                                {item.has_absensi && (
                                                    <button onClick={() => handlePrint(item)} className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all flex items-center justify-center dark:bg-emerald-900/20 dark:text-emerald-400 hover:scale-110 active:scale-95`} title="Print Hasil Kegiatan">
                                                        <i className={`fas fa-print ${isMobile ? 'text-[8px]' : 'text-[10px]'}`}></i>
                                                    </button>
                                                )}
                                                <button onClick={() => openEditModal(item)} className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} rounded-xl bg-orange-50 text-orange-600 hover:bg-orange-100 transition-all flex items-center justify-center dark:bg-orange-900/20 dark:text-orange-400 hover:scale-110 active:scale-95`} title="Edit">
                                                    <i className={`fas fa-edit ${isMobile ? 'text-[8px]' : 'text-[10px]'}`}></i>
                                                </button>
                                                <button onClick={() => handleDelete(item.id)} className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all flex items-center justify-center dark:bg-rose-900/20 dark:text-rose-400 hover:scale-110 active:scale-95`} title="Hapus">
                                                    <i className={`fas fa-trash ${isMobile ? 'text-[8px]' : 'text-[10px]'}`}></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    {isMobile && expandedRows.has(idx) && (
                                        <tr className="bg-gray-50/50 dark:bg-dark-bg/30 border-b border-gray-100 dark:border-dark-border animate-slideDown">
                                            <td colSpan="4" className="p-0">
                                                <div className="mobile-expand-grid">
                                                    <div className="expand-item"><span className="expand-label">Mulai</span><span className="expand-value">{formatDateTime(item.waktu_mulai)}</span></div>
                                                    <div className="expand-item"><span className="expand-label">Selesai</span><span className="expand-value">{item.waktu_berakhir ? formatDateTime(item.waktu_berakhir) : '-'}</span></div>
                                                    <div className="expand-item"><span className="expand-label">Tempat</span><span className="expand-value">{item.tempat}</span></div>
                                                    <div className="expand-item"><span className="expand-label">PJ</span><span className="expand-value">{item.penanggungjawab?.nama || '-'}</span></div>
                                                    <div className="expand-item"><span className="expand-label">Status</span><span className="expand-value">{item.status}</span></div>
                                                    <div className="expand-item">
                                                        <span className="expand-label">Pendamping</span>
                                                        <span className="expand-value">
                                                            {(item.guru_pendamping || []).map(g => g.nama).join(', ') || '-'}
                                                        </span>
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
                                            <i className="fas fa-skating text-5xl"></i>
                                            <p className="text-xs font-black uppercase tracking-widest">Belum ada agenda yang tercatat</p>
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
                                {filteredData.length} Agenda Ditemukan
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

            <CrudModal
                show={showModal}
                onClose={closeModal}
                title={modalMode === 'add' ? 'Agendakan Kegiatan' : 'Perbarui Rincian Agenda'}
                subtitle="Atur waktu, tempat, dan pelaksana kegiatan"
                icon={modalMode === 'add' ? 'calendar-plus' : 'edit'}
                onSubmit={handleSubmit}
                submitLabel={modalMode === 'add' ? 'Jadwalkan Agenda' : 'Simpan Perubahan'}
                maxWidth="max-w-4xl"
            >
                {/* Section 1: Basic Info */}
                <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-4 px-1">Informasi Dasar Kegiatan</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Auto-linking is active, manual dropdown removed */}
                        <div className="space-y-1.5 md:col-span-2">
                            <label className="block text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wide">Nama Agenda *</label>
                            <input required type="text" value={formData.nama_kegiatan} onChange={(e) => setFormData({ ...formData, nama_kegiatan: e.target.value })} className="input-standard" placeholder="Contoh: Class Meeting Semester 1, Upacara HUT RI..." />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wide">Jenis Kegiatan</label>
                            <select value={formData.jenis_kegiatan} onChange={(e) => setFormData({ ...formData, jenis_kegiatan: e.target.value })} className="input-standard outline-none">
                                {jenisKegiatanList.map(j => <option key={j} value={j}>{j}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status Saat Ini</label>
                            <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="input-standard outline-none">
                                {statusList.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Section 2: Time and Place */}
                <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-4 px-1">Waktu & Lokasi</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div className="space-y-1.5">
                            <label className="block text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wide">Mulai Pelaksanaan *</label>
                            <input required type="datetime-local" value={formData.waktu_mulai} onChange={(e) => setFormData({ ...formData, waktu_mulai: e.target.value })} className="input-standard" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wide">Selesai (Estimasi)</label>
                            <input type="datetime-local" value={formData.waktu_berakhir} onChange={(e) => setFormData({ ...formData, waktu_berakhir: e.target.value })} className="input-standard" />
                        </div>
                        <div className="space-y-1.5 relative">
                            <label className="block text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wide">Tempat / Lokasi *</label>
                            <input required type="text" value={formData.tempat} onChange={(e) => setFormData({ ...formData, tempat: e.target.value })} className="input-standard" placeholder="Gedung Olahraga, Aula..." />
                        </div>
                    </div>
                </div>

                {/* Section 3: Personnel */}
                <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-4 px-1">Pelaksana & Peserta</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* PJ Autocomplete */}
                        <div className="space-y-1.5 relative" ref={pjDropdownRef}>
                            <label className="block text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wide">Penanggung Jawab *</label>
                            <div className="relative group">
                                <input
                                    type="text"
                                    placeholder="Cari Nama Guru PJ..."
                                    value={pjSearch}
                                    onChange={(e) => { setPjSearch(e.target.value); setShowPjDropdown(true); }}
                                    onFocus={() => setShowPjDropdown(true)}
                                    className="input-standard font-bold"
                                    required
                                />
                            </div>
                            {showPjDropdown && (
                                <div className="absolute z-50 mt-1 w-full bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-xl shadow-xl max-h-48 overflow-y-auto animate-fadeIn">
                                    {filteredPj.map(g => (
                                        <div key={g.id} onClick={() => { setFormData({ ...formData, penanggung_jawab_id: g.id }); setPjSearch(g.nama); setShowPjDropdown(false); }} className="px-4 py-2.5 hover:bg-primary/5 cursor-pointer flex flex-col gap-0.5 border-b border-gray-50 dark:border-dark-border last:border-0 border-r-4 border-r-transparent hover:border-r-primary transition-all">
                                            <span className="text-xs font-bold text-gray-700 dark:text-dark-text uppercase">{g.nama}</span>
                                            <span className="text-[10px] text-gray-400 font-medium tracking-wider">{g.nip || 'NIP -'}</span>
                                        </div>
                                    ))}
                                    {filteredPj.length === 0 && <div className="px-4 py-3 text-xs text-gray-400 italic">Guru tidak ditemukan...</div>}
                                </div>
                            )}
                        </div>

                        {/* GP Multiple Select */}
                        <div className="space-y-1.5 relative" ref={gpDropdownRef}>
                            <label className="block text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wide">Guru Pendamping (Beberapa)</label>
                            <div className="relative group">
                                <input
                                    type="text"
                                    placeholder="Pilih Guru Pendamping..."
                                    value={gpSearch}
                                    onChange={(e) => { setGpSearch(e.target.value); setShowGpDropdown(true); }}
                                    onFocus={() => setShowGpDropdown(true)}
                                    className="input-standard"
                                />
                            </div>
                            {showGpDropdown && (
                                <div className="absolute z-50 mt-1 w-full bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-xl shadow-xl max-h-48 overflow-y-auto animate-fadeIn">
                                    <div onClick={() => {
                                        const allIds = filteredGp.map(g => g.id);
                                        const allSelected = allIds.every(id => formData.guru_pendamping.includes(id));
                                        setFormData(prev => ({
                                            ...prev,
                                            guru_pendamping: allSelected
                                                ? prev.guru_pendamping.filter(id => !allIds.includes(id))
                                                : [...new Set([...prev.guru_pendamping, ...allIds])]
                                        }));
                                    }} className={`px-4 py-2.5 cursor-pointer flex items-center justify-between border-b-2 border-gray-100 dark:border-dark-border sticky top-0 bg-white dark:bg-dark-surface z-10 ${filteredGp.length > 0 && filteredGp.every(g => formData.guru_pendamping.includes(g.id)) ? 'bg-primary/10 text-primary' : 'hover:bg-gray-50'}`}>
                                        <span className="text-xs font-black uppercase tracking-wide"><i className="fas fa-check-double mr-2 text-[10px]"></i>{filteredGp.length > 0 && filteredGp.every(g => formData.guru_pendamping.includes(g.id)) ? 'Hapus Semua' : 'Pilih Semua'}</span>
                                        <span className="text-[10px] text-gray-400 font-bold">{formData.guru_pendamping.length}/{guruList.length}</span>
                                    </div>
                                    {filteredGp.map(g => (
                                        <div key={g.id} onClick={() => toggleGp(g.id)} className={`px-4 py-2.5 hover:bg-primary/5 cursor-pointer flex items-center justify-between border-b border-gray-50 dark:border-dark-border last:border-0 ${formData.guru_pendamping.includes(g.id) ? 'bg-primary/5 text-primary' : ''}`}>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold dark:text-dark-text">{g.nama}</span>
                                                <span className="text-[10px] text-gray-400">{g.jabatan || 'Guru'}</span>
                                            </div>
                                            {formData.guru_pendamping.includes(g.id) && <i className="fas fa-check text-[10px]"></i>}
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="flex flex-wrap gap-1 mt-2">
                                {formData.guru_pendamping.map(id => {
                                    const g = guruList.find(x => x.id === id);
                                    return g ? (
                                        <span key={id} onClick={() => toggleGp(id)} className="px-2 py-1 bg-gray-100 dark:bg-dark-bg/50 rounded-lg text-[9px] font-bold text-gray-600 dark:text-gray-400 group cursor-pointer hover:bg-rose-50 hover:text-rose-600 transition-colors">
                                            {g.nama} <i className="fas fa-times ml-1 opacity-0 group-hover:opacity-100"></i>
                                        </span>
                                    ) : null;
                                })}
                            </div>
                        </div>

                        {/* Kelas Multi Select */}
                        <div className="space-y-1.5 relative md:col-span-2" ref={kelasDropdownRef}>
                            <label className="block text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wide">Target Kelas Peserta</label>
                            <div onClick={() => setShowKelasDropdown(!showKelasDropdown)} className="input-standard cursor-pointer flex items-center justify-between group h-auto min-h-[46px] py-2 px-4 shadow-sm">
                                <div className="flex flex-wrap gap-1.5">
                                    {formData.kelas_peserta.length > 0 ? (
                                        formData.kelas_peserta.map(id => {
                                            const k = kelasList.find(x => x.id === id);
                                            return k ? (
                                                <span key={id} className="px-2 py-0.5 bg-primary/10 text-primary rounded-md text-[10px] font-black tracking-wide uppercase">
                                                    {k.nama_kelas}
                                                </span>
                                            ) : null;
                                        })
                                    ) : (
                                        <span className="text-gray-400 italic">Pilih satu atau beberapa kelas...</span>
                                    )}
                                </div>
                                <i className={`fas fa-chevron-down text-gray-300 group-hover:text-primary transition-transform ${showKelasDropdown ? 'rotate-180' : ''}`}></i>
                            </div>
                            {showKelasDropdown && (
                                <div className="absolute z-50 mt-1 w-full bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-xl shadow-xl max-h-48 overflow-y-auto animate-fadeIn grid grid-cols-2 md:grid-cols-4 p-2 gap-1">
                                    {kelasList.map(k => (
                                        <div key={k.id} onClick={() => toggleKelas(k.id)} className={`px-3 py-2 rounded-lg cursor-pointer text-center text-[10px] font-black uppercase tracking-wider transition-all border ${formData.kelas_peserta.includes(k.id)
                                            ? 'bg-primary text-white border-primary shadow-md shadow-primary/20'
                                            : 'bg-gray-50 dark:bg-dark-bg/40 text-gray-500 border-transparent hover:border-gray-200 dark:hover:border-dark-border'
                                            }`}>
                                            {k.nama_kelas}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Section 4: Additional Info */}
                <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-4 px-1">Deskripsi Tambahan</label>
                    <div className="space-y-1.5">
                        <textarea
                            rows="4"
                            value={formData.deskripsi}
                            onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                            className="input-standard !h-auto py-3 leading-relaxed font-medium"
                            placeholder="Informasikan detail kegiatan, perlengkapan yang harus dibawa, atau catatan penting lainnya..."
                        ></textarea>
                    </div>
                </div>
            </CrudModal>

            <style dangerouslySetInnerHTML={{
                __html: `
                .btn-primary {
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    color: white;
                    border-radius: 1rem;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .btn-primary:hover {
                    box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.25);
                    transform: translateY(-1px);
                }
                .btn-secondary {
                    background-color: white;
                    color: #4b5563;
                    border: 1px solid #e5e7eb;
                    border-radius: 1rem;
                    transition: all 0.2s;
                }
                .dark .btn-secondary {
                    background-color: #1f2937;
                    border-color: #374151;
                    color: #9ca3af;
                }
                .input-standard {
                    width: 100%;
                    background-color: #f9fafb;
                    border: 1px solid #e5e7eb;
                    border-radius: 1rem;
                    padding: 0.875rem 1.25rem;
                    font-size: 0.8125rem;
                    font-weight: 700;
                    color: #374151;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
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
                    background-color: white;
                }
                .dark .input-standard:focus {
                    background-color: #111827;
                }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
                .shadow-soft {
                    box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.04);
                }
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-slideDown { animation: slideDown 0.3s ease-out; }
            ` }} />
            {showAbsensiModal && (
                <AbsensiKegiatanAdminModal
                    show={showAbsensiModal}
                    onClose={() => setShowAbsensiModal(false)}
                    kegiatan={currentItem}
                    initialData={absensiData}
                    guruList={guruList}
                    onSuccess={() => {
                        setShowAbsensiModal(false);
                        fetchData();
                    }}
                />
            )}
        </div>
    );
}

function AbsensiKegiatanAdminModal({ show, onClose, kegiatan, initialData, onSuccess, guruList }) {
    const [formData, setFormData] = useState({
        absensi_pendamping: initialData?.absensi_pendamping || [],
        berita_acara: initialData?.berita_acara || '',
        foto_kegiatan: initialData?.foto_kegiatan || [],
    });
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    const handlePhotoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formDataUpload = new FormData();
        formDataUpload.append('foto', file);

        try {
            setUploading(true);
            const res = await authFetch(`${API_BASE}/kegiatan/absensi/upload-foto`, {
                method: 'POST',
                body: formDataUpload
            });
            const data = await res.json();
            if (data.success) {
                setFormData(prev => ({
                    ...prev,
                    foto_kegiatan: [...prev.foto_kegiatan, data.data.path]
                }));
            } else {
                Swal.fire('Gagal', data.message || 'Gagal upload foto', 'error');
            }
        } catch (error) {
            console.error('Error uploading photo:', error);
            Swal.fire('Error', 'Terjadi kesalahan saat upload foto', 'error');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const removePhoto = (index) => {
        const updated = [...formData.foto_kegiatan];
        updated.splice(index, 1);
        setFormData({ ...formData, foto_kegiatan: updated });
    };

    const updateStatus = (index, status) => {
        const updated = [...formData.absensi_pendamping];
        updated[index].status = status;
        setFormData({ ...formData, absensi_pendamping: updated });
    };

    const updateKeterangan = (index, keterangan) => {
        const updated = [...formData.absensi_pendamping];
        updated[index].keterangan = keterangan;
        setFormData({ ...formData, absensi_pendamping: updated });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            const res = await authFetch(`${API_BASE}/kegiatan/${kegiatan.id}/absensi-admin`, {
                method: 'PUT',
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (data.success) {
                Swal.fire('Berhasil', 'Absensi kegiatan berhasil disimpan', 'success');
                onSuccess();
            } else {
                Swal.fire('Gagal', data.error || 'Gagal menyimpan absensi', 'error');
            }
        } catch (error) {
            console.error('Error saving absensi kegiatan:', error);
            Swal.fire('Error', 'Terjadi kesalahan saat menyimpan absensi', 'error');
        } finally {
            setLoading(false);
        }
    };

    return ReactDOM.createPortal(
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 ${show ? 'opacity-100 visible bg-black/50' : 'opacity-0 invisible'}`}>
            <div className={`bg-white dark:bg-dark-card w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${show ? 'scale-100' : 'scale-95'}`}>
                <div className="bg-primary p-6 text-white flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-black uppercase tracking-widest">Absensi Kegiatan</h3>
                        <p className="text-xs text-primary-light font-medium mt-1">{kegiatan?.nama_kegiatan}</p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/20 hover:bg-white/30 transition-colors">
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-6 custom-scrollbar">
                        {/* Summary Stats */}
                        <div className="grid grid-cols-4 gap-4">
                            <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-2xl text-center">
                                <div className="text-xl font-black text-emerald-600 mb-1">{formData.absensi_pendamping.filter(p => p.status === 'H').length}</div>
                                <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Hadir</div>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl text-center">
                                <div className="text-xl font-black text-blue-600 mb-1">{formData.absensi_pendamping.filter(p => p.status === 'S').length}</div>
                                <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Sakit</div>
                            </div>
                            <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-2xl text-center">
                                <div className="text-xl font-black text-amber-600 mb-1">{formData.absensi_pendamping.filter(p => p.status === 'I').length}</div>
                                <div className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Izin</div>
                            </div>
                            <div className="bg-rose-50 dark:bg-rose-900/10 p-4 rounded-2xl text-center">
                                <div className="text-xl font-black text-rose-600 mb-1">{formData.absensi_pendamping.filter(p => p.status === 'A').length}</div>
                                <div className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Alpha</div>
                            </div>
                        </div>

                        {/* PJ Status (Simplification for Admin, can be added if needed) */}
                        <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
                            <p className="text-xs font-black text-primary uppercase tracking-widest mb-1">Penanggung Jawab</p>
                            <p className="text-sm font-bold text-gray-700 dark:text-dark-text">{kegiatan?.penanggungjawab?.nama || '-'}</p>
                        </div>

                        {/* Pendamping List */}
                        <div className="space-y-3">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">Guru Pendamping</label>
                            {formData.absensi_pendamping.length === 0 ? (
                                <p className="text-center py-2.5 text-xs text-gray-400 italic bg-gray-50 rounded-xl">Tidak ada guru pendamping</p>
                            ) : formData.absensi_pendamping.map((p, idx) => {
                                const guru = guruList.find(g => g.id === p.guru_id);
                                return (
                                    <div key={idx} className="bg-gray-50 dark:bg-dark-bg p-4 rounded-2xl border border-gray-100 dark:border-dark-border flex items-center justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-gray-700 dark:text-dark-text truncate">{guru?.nama || p.nama || `Guru #${p.guru_id}`}</p>
                                        </div>
                                        <div className="flex gap-1.5">
                                            {['H', 'S', 'I', 'A'].map(s => (
                                                <button
                                                    key={s}
                                                    type="button"
                                                    onClick={() => updateStatus(idx, s)}
                                                    className={`w-8 h-8 rounded-lg text-xs font-black transition-all ${p.status === s
                                                        ? s === 'H' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' :
                                                            s === 'S' ? 'bg-blue-500 text-white shadow-lg shadow-blue-200' :
                                                                s === 'I' ? 'bg-amber-500 text-white shadow-lg shadow-amber-200' :
                                                                    'bg-rose-500 text-white shadow-lg shadow-rose-200'
                                                        : 'bg-white dark:bg-dark-card text-gray-400 hover:bg-gray-100'
                                                        }`}
                                                >
                                                    {s}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Foto Dokumentasi */}
                        <div className="space-y-3">
                            <label className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest px-2 flex items-center gap-2">
                                <i className="fas fa-camera text-primary"></i>
                                Dokumentasi Kegiatan
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {formData.foto_kegiatan.map((foto, idx) => (
                                    <div key={idx} className="group relative aspect-square rounded-2xl overflow-hidden border-2 border-gray-100 dark:border-dark-border bg-gray-50 dark:bg-dark-bg shadow-sm">
                                        <img
                                            src={foto.startsWith('data:image') ? foto : foto.startsWith('http') ? foto : (APP_BASE ? `${APP_BASE}/storage/${foto}` : `/storage/${foto}`)}
                                            alt={`Dokumentasi ${idx + 1}`}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                            onError={(e) => { e.target.style.display = 'none'; }}
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                            <i className="fas fa-search-plus text-white text-xl"></i>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removePhoto(idx)}
                                            className="absolute top-2 right-2 w-7 h-7 bg-rose-500 text-white rounded-lg flex items-center justify-center shadow-lg hover:bg-rose-600 transition-all opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100"
                                        >
                                            <i className="fas fa-trash-alt text-[10px]"></i>
                                        </button>
                                    </div>
                                ))}

                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 dark:border-dark-border bg-gray-50/50 dark:bg-dark-bg/20 flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/5 hover:text-primary transition-all group disabled:opacity-50"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-dark-border shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                                        {uploading ? (
                                            <i className="fas fa-spinner fa-spin text-primary"></i>
                                        ) : (
                                            <i className="fas fa-plus text-gray-400 group-hover:text-primary transition-colors"></i>
                                        )}
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-primary transition-colors">
                                        {uploading ? 'Uploading...' : 'Tambah Foto'}
                                    </span>
                                </button>

                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handlePhotoUpload}
                                    className="hidden"
                                    accept="image/*"
                                />
                            </div>
                        </div>

                        {/* Berita Acara */}
                        <div className="space-y-3">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">Berita Acara</label>
                            <textarea
                                value={formData.berita_acara}
                                onChange={(e) => setFormData({ ...formData, berita_acara: e.target.value })}
                                className="w-full h-32 bg-gray-50 dark:bg-dark-bg border border-gray-100 dark:border-dark-border rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all dark:text-dark-text text-gray-700"
                                placeholder="Masukkan berita acara/laporan kegiatan..."
                            />
                        </div>
                    </div>

                    <div className="mt-8 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 rounded-2xl bg-gray-100 dark:bg-dark-bg text-gray-600 dark:text-gray-400 font-black uppercase tracking-widest text-xs hover:bg-gray-200 dark:hover:bg-dark-border transition-all"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-[2] py-2.5 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-xs hover:shadow-lg hover:shadow-primary/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading && <i className="fas fa-spinner fa-spin"></i>}
                            Simpan Absensi
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}

export default ManajemenKegiatan;
