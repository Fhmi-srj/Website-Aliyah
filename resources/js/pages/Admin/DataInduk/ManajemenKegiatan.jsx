import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { API_BASE, authFetch } from '../../../config/api';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import Pagination from '../../../components/Pagination';

const ITEMS_PER_PAGE = 10;
function ManajemenKegiatan() {
    const [data, setData] = useState([]);
    const [guruList, setGuruList] = useState([]);
    const [kelasList, setKelasList] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [currentItem, setCurrentItem] = useState(null);
    const [isModalClosing, setIsModalClosing] = useState(false);
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
        status: 'Aktif'
    });

    // Autocomplete states
    const [pjSearch, setPjSearch] = useState('');
    const [showPjDropdown, setShowPjDropdown] = useState(false);
    const [gpSearch, setGpSearch] = useState('');
    const [showGpDropdown, setShowGpDropdown] = useState(false);
    const [showKelasDropdown, setShowKelasDropdown] = useState(false);

    // Sorting state
    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState('asc');

    // Filter state
    const [filterJenis, setFilterJenis] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [activeFilter, setActiveFilter] = useState(null);

    // Mobile detection
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [expandedRows, setExpandedRows] = useState(new Set());

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);

    // File input ref for import
    const fileInputRef = useRef(null);
    const gpDropdownRef = useRef(null);
    const kelasDropdownRef = useRef(null);
    const pjDropdownRef = useRef(null);

    const jenisKegiatanList = ['Rutin', 'Tahunan', 'Insidental'];
    const statusList = ['Aktif', 'Selesai', 'Dibatalkan'];

    const fetchData = async () => {
        try {
            setLoading(true);
            const [kegiatanRes, guruRes, kelasRes] = await Promise.all([
                authFetch(`${API_BASE}/kegiatan`),
                authFetch(`${API_BASE}/guru`),
                authFetch(`${API_BASE}/kelas`)
            ]);
            setData((await kegiatanRes.json()).data || []);
            setGuruList((await guruRes.json()).data || []);
            setKelasList((await kelasRes.json()).data || []);
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
        const handleClickOutside = (event) => {
            setActiveFilter(null);
            // Check if click is outside dropdown refs
            if (pjDropdownRef.current && !pjDropdownRef.current.contains(event.target)) {
                setShowPjDropdown(false);
            }
            if (gpDropdownRef.current && !gpDropdownRef.current.contains(event.target)) {
                setShowGpDropdown(false);
            }
            if (kelasDropdownRef.current && !kelasDropdownRef.current.contains(event.target)) {
                setShowKelasDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Toggle row expand for mobile
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

    // Sort function
    const sortData = (dataToSort, column, direction) => {
        if (!column) return dataToSort;
        const dir = direction === 'asc' ? 1 : -1;
        return [...dataToSort].sort((a, b) => {
            let valA = a[column];
            let valB = b[column];
            if (column === 'penanggungjawab') {
                valA = a.penanggungjawab?.nama || '';
                valB = b.penanggungjawab?.nama || '';
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

    // Filter and sort data
    const filteredData = (() => {
        let result = data.filter(item => {
            if (filterJenis && item.jenis_kegiatan !== filterJenis) return false;
            if (filterStatus && item.status !== filterStatus) return false;
            if (!search) return true;
            const s = search.toLowerCase();
            return (
                item.nama_kegiatan?.toLowerCase().includes(s) ||
                item.tempat?.toLowerCase().includes(s) ||
                item.peserta?.toLowerCase().includes(s) ||
                item.penanggungjawab?.nama?.toLowerCase().includes(s)
            );
        });
        return sortData(result, sortColumn, sortDirection);
    })();

    // Pagination
    const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
    const paginatedData = filteredData.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [search, filterJenis, filterStatus]);

    // Format datetime
    const formatDateTime = (dateStr) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        const date = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        return `${date} ${time}`;
    };

    // Format for input (use local time, not UTC)
    const formatDateTimeForInput = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    // Render status badge
    const renderStatus = (status) => {
        const statusClass = {
            'Aktif': 'status-aktif',
            'Selesai': 'bg-blue-100 text-blue-700',
            'Dibatalkan': 'status-tidak-aktif'
        };
        return (
            <span className={`inline-flex items-center gap-1 font-semibold text-[11px] px-2 py-0.5 rounded-full ${statusClass[status] || 'bg-gray-100 text-gray-700'}`}>
                {status === 'Aktif' && <span className="status-bullet"></span>}
                {status}
            </span>
        );
    };

    // Render jenis badge
    const renderJenis = (jenis) => {
        const jenisClass = {
            'Rutin': 'bg-green-100 text-green-700',
            'Tahunan': 'bg-purple-100 text-purple-700',
            'Insidental': 'bg-orange-100 text-orange-700'
        };
        return (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${jenisClass[jenis] || 'bg-gray-100 text-gray-700'}`}>
                {jenis}
            </span>
        );
    };

    // SortableHeader component
    const SortableHeader = ({ label, column, filterable, filterOptions, filterValue, setFilterValue }) => (
        <th
            className="select-none py-2 px-2 cursor-pointer whitespace-nowrap"
            onClick={() => !filterable && handleSort(column)}
        >
            <div className="flex items-center gap-1">
                <span
                    onClick={(e) => { e.stopPropagation(); handleSort(column); }}
                    className="cursor-pointer"
                >
                    {label}
                </span>
                {sortColumn === column ? (
                    <i className={`fas fa-sort-${sortDirection === 'asc' ? 'up' : 'down'} text-green-700`}></i>
                ) : (
                    <i className="fas fa-sort text-green-700 opacity-50"></i>
                )}
                {filterable && (
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => setActiveFilter(activeFilter === column ? null : column)}
                            className={`ml-1 ${filterValue ? 'text-green-700' : 'text-gray-400'}`}
                        >
                            <i className="fas fa-filter text-[10px]"></i>
                        </button>
                        {activeFilter === column && (
                            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-10 min-w-[120px]">
                                {filterOptions.map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => { setFilterValue(opt.value); setActiveFilter(null); }}
                                        className={`block w-full text-left px-3 py-1 text-[11px] hover:bg-green-50 ${filterValue === opt.value ? 'bg-green-100 text-green-700' : ''}`}
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

    // Modal functions
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
            status: 'Aktif'
        });
        setPjSearch('');
        setGpSearch('');
        setShowModal(true);
    };

    const openEditModal = (item) => {
        setModalMode('edit');
        setCurrentItem(item);
        setFormData({
            nama_kegiatan: item.nama_kegiatan || '',
            jenis_kegiatan: item.jenis_kegiatan || 'Rutin',
            waktu_mulai: formatDateTimeForInput(item.waktu_mulai),
            waktu_berakhir: formatDateTimeForInput(item.waktu_berakhir),
            tempat: item.tempat || '',
            penanggung_jawab_id: item.penanggung_jawab_id || '',
            guru_pendamping: item.guru_pendamping || [],
            kelas_peserta: item.kelas_peserta || [],
            deskripsi: item.deskripsi || '',
            status: item.status || 'Aktif'
        });
        // Set PJ search to current name
        const pjGuru = guruList.find(g => g.id === item.penanggung_jawab_id);
        setPjSearch(pjGuru?.nama || '');
        setGpSearch('');
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
            const url = modalMode === 'add' ? `${API_BASE}/kegiatan` : `${API_BASE}/kegiatan/${currentItem.id}`;
            const method = modalMode === 'add' ? 'POST' : 'PUT';
            const response = await authFetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    penanggung_jawab_id: formData.penanggung_jawab_id || null
                })
            });
            if (response.ok) {
                closeModal();
                fetchData();
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil!',
                    text: modalMode === 'add' ? 'Kegiatan berhasil ditambahkan' : 'Kegiatan berhasil diperbarui',
                    timer: 1500,
                    showConfirmButton: false,
                    customClass: { container: 'swal-above-modal' }
                });
            } else {
                const error = await response.json();
                Swal.fire({ icon: 'error', title: 'Gagal', text: error.message || 'Terjadi kesalahan', timer: 2000, showConfirmButton: false, customClass: { container: 'swal-above-modal' } });
            }
        } catch (error) {
            console.error('Error saving:', error);
            Swal.fire({ icon: 'error', title: 'Gagal', text: 'Gagal menyimpan data', timer: 2000, showConfirmButton: false, customClass: { container: 'swal-above-modal' } });
        }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Konfirmasi Hapus',
            text: 'Yakin ingin menghapus data ini?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Ya, Hapus!',
            cancelButtonText: 'Batal',
            customClass: { container: 'swal-above-modal' }
        });
        if (!result.isConfirmed) return;

        try {
            const response = await authFetch(`${API_BASE}/kegiatan/${id}`, {
                method: 'DELETE',
                headers: { 'Accept': 'application/json' }
            });
            if (response.ok) {
                fetchData();
                Swal.fire({ icon: 'success', title: 'Terhapus!', text: 'Data berhasil dihapus', timer: 1500, showConfirmButton: false, customClass: { container: 'swal-above-modal' } });
            }
        } catch (error) {
            console.error('Error deleting:', error);
            Swal.fire({ icon: 'error', title: 'Gagal', text: 'Gagal menghapus data', timer: 2000, showConfirmButton: false, customClass: { container: 'swal-above-modal' } });
        }
    };

    // Helper functions for multi-select
    const toggleGuruPendamping = (guruId) => {
        setFormData(prev => ({
            ...prev,
            guru_pendamping: prev.guru_pendamping.includes(guruId)
                ? prev.guru_pendamping.filter(id => id !== guruId)
                : [...prev.guru_pendamping, guruId]
        }));
    };

    const toggleKelasPeserta = (kelasId) => {
        setFormData(prev => ({
            ...prev,
            kelas_peserta: prev.kelas_peserta.includes(kelasId)
                ? prev.kelas_peserta.filter(id => id !== kelasId)
                : [...prev.kelas_peserta, kelasId]
        }));
    };

    const selectAllGuru = () => {
        const activeGuruIds = guruList
            .filter(g => g.status === 'Aktif' && g.id !== formData.penanggung_jawab_id)
            .map(g => g.id);
        setFormData(prev => ({ ...prev, guru_pendamping: activeGuruIds }));
    };

    const selectAllKelas = () => {
        const activeKelasIds = kelasList.filter(k => k.status === 'Aktif').map(k => k.id);
        setFormData(prev => ({ ...prev, kelas_peserta: activeKelasIds }));
    };

    // Get selected names for display
    const getGuruPendampingNames = () => {
        return guruList
            .filter(g => formData.guru_pendamping.includes(g.id))
            .map(g => g.nama)
            .join(', ') || 'Pilih guru pendamping...';
    };

    const getKelasPesertaNames = () => {
        return kelasList
            .filter(k => formData.kelas_peserta.includes(k.id))
            .map(k => k.nama_kelas)
            .join(', ') || 'Pilih kelas peserta...';
    };

    // Import Excel
    const handleImportExcel = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const jsonData = XLSX.utils.sheet_to_json(ws);

                Swal.fire({ icon: 'info', title: 'Import', text: `Ditemukan ${jsonData.length} data. Fitur import kegiatan memerlukan format khusus.`, timer: 3000, showConfirmButton: false });
            } catch (error) {
                console.error('Error reading Excel:', error);
                Swal.fire({ icon: 'error', title: 'Gagal', text: 'Gagal membaca file Excel', timer: 2000, showConfirmButton: false });
            }
        };
        reader.readAsBinaryString(file);
        e.target.value = '';
    };

    // Export Excel
    const handleExportExcel = () => {
        const exportData = filteredData.map((item, idx) => ({
            'No': idx + 1,
            'Nama Kegiatan': item.nama_kegiatan,
            'Jenis': item.jenis_kegiatan,
            'Waktu Mulai': formatDateTime(item.waktu_mulai),
            'Waktu Selesai': formatDateTime(item.waktu_berakhir),
            'Tempat': item.tempat || '-',
            'Penanggung Jawab': item.penanggungjawab?.nama || '-',
            'Guru Pendamping': item.guru_pendamping_names?.join(', ') || '-',
            'Peserta': item.peserta || '-',
            'Deskripsi': item.deskripsi || '-',
            'Status': item.status
        }));
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Data Kegiatan');
        XLSX.writeFile(wb, `Data_Kegiatan_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    // Filtered guru list for autocomplete
    const filteredGuruPj = guruList.filter(g =>
        g.status === 'Aktif' &&
        g.nama.toLowerCase().includes(pjSearch.toLowerCase())
    );

    const filteredGuruGp = guruList.filter(g =>
        g.status === 'Aktif' &&
        g.nama.toLowerCase().includes(gpSearch.toLowerCase()) &&
        g.id !== formData.penanggung_jawab_id // Exclude penanggung jawab
    );

    const filteredKelas = kelasList.filter(k =>
        k.status === 'Aktif'
    );

    return (
        <div className="animate-fadeIn flex flex-col flex-grow max-w-full overflow-auto">
            <header className="mb-4">
                <h1 className="text-[#1f2937] font-semibold text-lg mb-1 select-none">Manajemen Kegiatan</h1>
                <p className="text-[11px] text-[#6b7280] select-none">Kelola kegiatan sekolah</p>
            </header>

            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-4">
                <div className="flex items-center w-full md:w-1/3 border border-[#d1d5db] rounded-md px-3 py-1 text-[12px] focus-within:ring-1 focus-within:ring-green-400">
                    <input
                        className="w-full border-none focus:ring-0 focus:outline-none bg-transparent"
                        placeholder="Cari kegiatan..."
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 flex-wrap md:flex-nowrap w-full md:w-auto justify-between md:justify-start">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImportExcel}
                        accept=".xlsx,.xls"
                        className="hidden"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-green-700 text-white text-[12px] font-semibold px-2 py-1 rounded-md hover:bg-green-800 transition select-none flex items-center gap-2 flex-1 md:flex-none cursor-pointer"
                        type="button"
                    >
                        <i className="fas fa-file-import"></i> Import Excel
                    </button>
                    <button
                        onClick={handleExportExcel}
                        className="bg-green-700 text-white text-[12px] font-semibold px-2 py-1 rounded-md hover:bg-green-800 transition select-none flex items-center gap-2 flex-1 md:flex-none cursor-pointer"
                        type="button"
                    >
                        <i className="fas fa-file-export"></i> Export Excel
                    </button>
                    <button
                        onClick={openAddModal}
                        className="bg-green-700 text-white text-[12px] font-semibold px-2 py-1 rounded-md hover:bg-green-800 transition select-none flex items-center gap-2 flex-1 md:flex-none cursor-pointer"
                        type="button"
                    >
                        <i className="fas fa-plus"></i> Tambah Kegiatan
                    </button>
                </div>
            </div>

            {/* Loading State */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700"></div>
                    <span className="ml-3 text-gray-600">Memuat data...</span>
                </div>
            ) : (
                <div className="overflow-x-auto scrollbar-hide max-w-full">
                    <table className={`w-full text-[12px] text-[#4a4a4a] border-separate border-spacing-y-[2px] ${isMobile ? '' : 'min-w-[1200px]'}`}>
                        <thead>
                            <tr className="text-left text-[#6b7280] select-none">
                                <th className="select-none pl-3 py-2 px-2 whitespace-nowrap">No</th>
                                {isMobile && <th className="select-none py-2 px-2 text-center whitespace-nowrap"></th>}
                                <SortableHeader label="Nama Kegiatan" column="nama_kegiatan" />
                                <SortableHeader
                                    label="Jenis"
                                    column="jenis_kegiatan"
                                    filterable
                                    filterOptions={[
                                        { label: 'Semua', value: '' },
                                        ...jenisKegiatanList.map(j => ({ label: j, value: j }))
                                    ]}
                                    filterValue={filterJenis}
                                    setFilterValue={setFilterJenis}
                                />
                                {!isMobile && <th className="select-none py-2 px-2 whitespace-nowrap">Waktu Mulai</th>}
                                {!isMobile && <th className="select-none py-2 px-2 whitespace-nowrap">Waktu Selesai</th>}
                                {!isMobile && <SortableHeader label="Tempat" column="tempat" />}
                                {!isMobile && <SortableHeader label="Penanggung Jawab" column="penanggungjawab" />}
                                {!isMobile && <th className="select-none py-2 px-2 whitespace-nowrap">Guru Pendamping</th>}
                                {!isMobile && <SortableHeader label="Peserta" column="peserta" />}
                                <SortableHeader
                                    label="Status"
                                    column="status"
                                    filterable
                                    filterOptions={[
                                        { label: 'Semua', value: '' },
                                        ...statusList.map(s => ({ label: s, value: s }))
                                    ]}
                                    filterValue={filterStatus}
                                    setFilterValue={setFilterStatus}
                                />
                                <th className="select-none py-2 px-2 text-center whitespace-nowrap">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.map((item, idx) => (
                                <React.Fragment key={item.id}>
                                    <tr className="hover:bg-green-50 bg-gray-50 align-top">
                                        <td className="pl-3 py-2 px-2 align-middle select-none whitespace-nowrap">{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                                        {isMobile && (
                                            <td
                                                className="py-2 px-2 align-middle select-none text-center cursor-pointer"
                                                onClick={() => toggleRowExpand(idx)}
                                            >
                                                <i className={`fas fa-${expandedRows.has(idx) ? 'minus' : 'plus'} text-green-700`}></i>
                                            </td>
                                        )}
                                        <td className="py-2 px-2 align-middle select-none">{item.nama_kegiatan}</td>
                                        <td className="py-2 px-2 align-middle select-none whitespace-nowrap">{renderJenis(item.jenis_kegiatan)}</td>
                                        {!isMobile && <td className="py-2 px-2 align-middle select-none whitespace-nowrap">{formatDateTime(item.waktu_mulai)}</td>}
                                        {!isMobile && <td className="py-2 px-2 align-middle select-none whitespace-nowrap">{formatDateTime(item.waktu_berakhir)}</td>}
                                        {!isMobile && <td className="py-2 px-2 align-middle select-none whitespace-nowrap">{item.tempat || '-'}</td>}
                                        {!isMobile && <td className="py-2 px-2 align-middle select-none whitespace-nowrap">{item.penanggungjawab?.nama || '-'}</td>}
                                        {!isMobile && <td className="py-2 px-2 align-middle select-none max-w-[150px] truncate" title={item.guru_pendamping_names?.join(', ')}>{item.guru_pendamping_names?.join(', ') || '-'}</td>}
                                        {!isMobile && <td className="py-2 px-2 align-middle select-none whitespace-nowrap">{item.peserta || '-'}</td>}
                                        <td className="py-2 px-2 align-middle select-none whitespace-nowrap">{renderStatus(item.status)}</td>
                                        <td className="py-2 px-2 align-middle text-center select-none whitespace-nowrap">
                                            <button onClick={() => openEditModal(item)} className="text-green-700 hover:text-green-900 mr-2 cursor-pointer" title="Ubah">
                                                <i className="fas fa-edit"></i>
                                            </button>
                                            <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800 cursor-pointer" title="Hapus">
                                                <i className="fas fa-trash"></i>
                                            </button>
                                        </td>
                                    </tr>
                                    {isMobile && expandedRows.has(idx) && (
                                        <tr className="bg-green-50">
                                            <td colSpan="6" className="px-4 py-3">
                                                <div className="grid grid-cols-2 gap-2 text-[11px]">
                                                    <div><strong>Waktu Mulai:</strong> {formatDateTime(item.waktu_mulai)}</div>
                                                    <div><strong>Waktu Selesai:</strong> {formatDateTime(item.waktu_berakhir)}</div>
                                                    <div><strong>Tempat:</strong> {item.tempat || '-'}</div>
                                                    <div><strong>PJ:</strong> {item.penanggungjawab?.nama || '-'}</div>
                                                    <div className="col-span-2"><strong>Guru Pendamping:</strong> {item.guru_pendamping_names?.join(', ') || '-'}</div>
                                                    <div><strong>Peserta:</strong> {item.peserta || '-'}</div>
                                                    {item.deskripsi && <div className="col-span-2"><strong>Deskripsi:</strong> {item.deskripsi}</div>}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                            {filteredData.length === 0 && (
                                <tr>
                                    <td colSpan={isMobile ? 6 : 12} className="text-center py-8 text-gray-500">
                                        {search || filterJenis || filterStatus ? 'Tidak ada data yang sesuai filter/pencarian' : 'Belum ada data kegiatan'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        totalItems={filteredData.length}
                        itemsPerPage={ITEMS_PER_PAGE}
                    />
                </div>
            )}

            {/* Modal with Portal */}
            {showModal && ReactDOM.createPortal(
                <div
                    className={`fixed inset-0 flex items-center justify-center p-4 transition-opacity duration-200 ${isModalClosing ? 'opacity-0' : 'opacity-100'}`}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)', zIndex: 9999 }}
                    onClick={closeModal}
                >
                    <div
                        className={`bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col transition-all duration-200 ${isModalClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}
                        style={{ animation: isModalClosing ? 'popup-out 0.2s ease' : 'popup-in 0.3s ease' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <h2 className="text-lg font-semibold text-gray-800 select-none">
                                {modalMode === 'add' ? 'Tambah Kegiatan' : 'Edit Kegiatan'}
                            </h2>
                            <button
                                onClick={closeModal}
                                className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                            >
                                <i className="fas fa-times text-xl"></i>
                            </button>
                        </div>

                        {/* Modal Body - Scrollable */}
                        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1 select-none">Nama Kegiatan *</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.nama_kegiatan}
                                            onChange={(e) => setFormData({ ...formData, nama_kegiatan: e.target.value })}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-green-400 focus:border-green-400"
                                            placeholder="Upacara Bendera"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1 select-none">Jenis Kegiatan *</label>
                                        <select
                                            required
                                            value={formData.jenis_kegiatan}
                                            onChange={(e) => setFormData({ ...formData, jenis_kegiatan: e.target.value })}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-green-400 focus:border-green-400"
                                        >
                                            {jenisKegiatanList.map(j => <option key={j} value={j}>{j}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1 select-none">Status *</label>
                                        <select
                                            required
                                            value={formData.status}
                                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-green-400 focus:border-green-400"
                                        >
                                            {statusList.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1 select-none">Waktu Mulai *</label>
                                        <input
                                            type="datetime-local"
                                            required
                                            value={formData.waktu_mulai}
                                            onChange={(e) => setFormData({ ...formData, waktu_mulai: e.target.value })}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-green-400 focus:border-green-400"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1 select-none">Waktu Selesai *</label>
                                        <input
                                            type="datetime-local"
                                            required
                                            value={formData.waktu_berakhir}
                                            onChange={(e) => setFormData({ ...formData, waktu_berakhir: e.target.value })}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-green-400 focus:border-green-400"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1 select-none">Tempat</label>
                                        <input
                                            type="text"
                                            value={formData.tempat}
                                            onChange={(e) => setFormData({ ...formData, tempat: e.target.value })}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-green-400 focus:border-green-400"
                                            placeholder="Lapangan, Aula, dll"
                                        />
                                    </div>

                                    {/* Penanggung Jawab - Autocomplete Single Select */}
                                    <div className="relative" ref={pjDropdownRef}>
                                        <label className="block text-sm font-medium text-gray-700 mb-1 select-none">Penanggung Jawab</label>
                                        <input
                                            type="text"
                                            value={pjSearch}
                                            onChange={(e) => { setPjSearch(e.target.value); setShowPjDropdown(true); }}
                                            onFocus={() => setShowPjDropdown(true)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-green-400 focus:border-green-400"
                                            placeholder="Ketik nama guru..."
                                        />
                                        {showPjDropdown && filteredGuruPj.length > 0 && (
                                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                                                {filteredGuruPj.map(g => (
                                                    <button
                                                        key={g.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData({ ...formData, penanggung_jawab_id: g.id });
                                                            setPjSearch(g.nama);
                                                            setShowPjDropdown(false);
                                                        }}
                                                        className={`w-full text-left px-3 py-2 text-sm hover:bg-green-50 ${formData.penanggung_jawab_id === g.id ? 'bg-green-100' : ''}`}
                                                    >
                                                        {g.nama}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Guru Pendamping - Multi Select Dropdown */}
                                    <div className="md:col-span-2 relative" ref={gpDropdownRef}>
                                        <label className="block text-sm font-medium text-gray-700 mb-1 select-none">Guru Pendamping</label>
                                        <div
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm cursor-pointer bg-white min-h-[38px] flex items-center justify-between"
                                            onClick={(e) => { e.stopPropagation(); setShowGpDropdown(!showGpDropdown); }}
                                        >
                                            <span className={formData.guru_pendamping.length ? 'text-gray-800' : 'text-gray-400'}>
                                                {formData.guru_pendamping.length > 0
                                                    ? `${formData.guru_pendamping.length} guru dipilih`
                                                    : 'Pilih guru pendamping...'}
                                            </span>
                                            <i className={`fas fa-chevron-${showGpDropdown ? 'up' : 'down'} text-gray-400`}></i>
                                        </div>
                                        {showGpDropdown && (
                                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg" onClick={(e) => e.stopPropagation()}>
                                                <div className="p-2 border-b border-gray-100">
                                                    <input
                                                        type="text"
                                                        value={gpSearch}
                                                        onChange={(e) => setGpSearch(e.target.value)}
                                                        className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
                                                        placeholder="Cari guru..."
                                                    />
                                                </div>
                                                <label className="flex items-center gap-2 px-3 py-2 hover:bg-green-50 cursor-pointer border-b border-gray-100">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.guru_pendamping.length === guruList.filter(g => g.status === 'Aktif').length}
                                                        onChange={() => formData.guru_pendamping.length === guruList.filter(g => g.status === 'Aktif').length
                                                            ? setFormData({ ...formData, guru_pendamping: [] })
                                                            : selectAllGuru()}
                                                        className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                                                    />
                                                    <span className="text-sm font-medium">Pilih Semua Guru</span>
                                                </label>
                                                <div className="max-h-40 overflow-y-auto">
                                                    {filteredGuruGp.map(g => (
                                                        <label key={g.id} className="flex items-center gap-2 px-3 py-2 hover:bg-green-50 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={formData.guru_pendamping.includes(g.id)}
                                                                onChange={() => toggleGuruPendamping(g.id)}
                                                                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                                                            />
                                                            <span className="text-sm">{g.nama}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Peserta Kelas - Multi Select Dropdown */}
                                    <div className="md:col-span-2 relative" ref={kelasDropdownRef}>
                                        <label className="block text-sm font-medium text-gray-700 mb-1 select-none">Peserta (Kelas)</label>
                                        <div
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm cursor-pointer bg-white min-h-[38px] flex items-center justify-between"
                                            onClick={(e) => { e.stopPropagation(); setShowKelasDropdown(!showKelasDropdown); }}
                                        >
                                            <span className={formData.kelas_peserta.length ? 'text-gray-800' : 'text-gray-400'}>
                                                {formData.kelas_peserta.length > 0
                                                    ? `${formData.kelas_peserta.length} kelas dipilih`
                                                    : 'Pilih kelas peserta...'}
                                            </span>
                                            <i className={`fas fa-chevron-${showKelasDropdown ? 'up' : 'down'} text-gray-400`}></i>
                                        </div>
                                        {showKelasDropdown && (
                                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg" onClick={(e) => e.stopPropagation()}>
                                                <label className="flex items-center gap-2 px-3 py-2 hover:bg-green-50 cursor-pointer border-b border-gray-100">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.kelas_peserta.length === kelasList.filter(k => k.status === 'Aktif').length}
                                                        onChange={() => formData.kelas_peserta.length === kelasList.filter(k => k.status === 'Aktif').length
                                                            ? setFormData({ ...formData, kelas_peserta: [] })
                                                            : selectAllKelas()}
                                                        className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                                                    />
                                                    <span className="text-sm font-medium">Pilih Semua Kelas</span>
                                                </label>
                                                <div className="max-h-40 overflow-y-auto">
                                                    {filteredKelas.map(k => (
                                                        <label key={k.id} className="flex items-center gap-2 px-3 py-2 hover:bg-green-50 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={formData.kelas_peserta.includes(k.id)}
                                                                onChange={() => toggleKelasPeserta(k.id)}
                                                                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                                                            />
                                                            <span className="text-sm">{k.nama_kelas}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1 select-none">Deskripsi</label>
                                        <textarea
                                            value={formData.deskripsi}
                                            onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                                            rows={3}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-green-400 focus:border-green-400"
                                            placeholder="Deskripsi singkat kegiatan..."
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer - Sticky */}
                            <div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-green-700 text-white text-sm font-semibold rounded-md hover:bg-green-800 flex items-center gap-2 cursor-pointer"
                                >
                                    <i className="fas fa-save"></i>
                                    {modalMode === 'add' ? 'Simpan' : 'Perbarui'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

export default ManajemenKegiatan;
