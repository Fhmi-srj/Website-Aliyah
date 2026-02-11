import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { API_BASE, authFetch } from '../../../config/api';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import Pagination from '../../../components/Pagination';
import SignatureCanvas from '../../../components/SignatureCanvas';

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50, 100];
const DEFAULT_ITEMS_PER_PAGE = 10;

function ManajemenGuru() {
    const [data, setData] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    // Tahun Ajaran filter state
    const [tahunAjaranId, setTahunAjaranId] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [currentItem, setCurrentItem] = useState(null);
    const [isModalClosing, setIsModalClosing] = useState(false);
    const [formData, setFormData] = useState({
        username: '', password: '', nama: '', nip: '', email: '', sk: '',
        jenis_kelamin: 'L', tempat_lahir: '', tanggal_lahir: '',
        alamat: '', pendidikan: '', kontak: '', tmt: '', jabatan: '', status: 'Aktif'
    });

    // Sorting state
    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState('asc');

    // Filter state
    const [filterStatus, setFilterStatus] = useState('');
    const [filterJabatan, setFilterJabatan] = useState('');
    const [filterJk, setFilterJk] = useState('');
    const [activeFilter, setActiveFilter] = useState(null);

    // Mobile expandable rows
    const [expandedRows, setExpandedRows] = useState(new Set());

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);

    // Bulk selection state
    const [selectedItems, setSelectedItems] = useState(new Set());

    // File input ref for import
    const fileInputRef = useRef(null);

    // TTD upload state
    const [uploadingTtd, setUploadingTtd] = useState(false);
    const [showSignatureCanvas, setShowSignatureCanvas] = useState(false);
    const ttdInputRef = useRef(null);

    // Fetch data from API
    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await authFetch(`${API_BASE}/guru`);
            const result = await response.json();
            setData(result.data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    };

    // Sort function
    const sortData = (dataToSort, column, direction) => {
        if (!column) return dataToSort;
        const dir = direction === 'asc' ? 1 : -1;
        return [...dataToSort].sort((a, b) => {
            let valA = a[column];
            let valB = b[column];
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();
            if (column === 'jenis_kelamin') {
                valA = valA === 'l' ? 'laki-laki' : 'perempuan';
                valB = valB === 'l' ? 'laki-laki' : 'perempuan';
            }
            if (column === 'tanggal_lahir' || column === 'tmt') {
                valA = valA ? new Date(valA) : new Date(0);
                valB = valB ? new Date(valB) : new Date(0);
            }
            if (valA > valB) return dir;
            if (valA < valB) return -dir;
            return 0;
        });
    };

    // Handle column sort
    const handleSort = (column) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    // Get unique jabatan for filter
    const uniqueJabatan = [...new Set(data.map(d => d.jabatan).filter(Boolean))].sort();

    // Filter and sort data
    let filteredData = data.filter(item => {
        if (filterStatus && item.status?.toLowerCase() !== filterStatus.toLowerCase()) return false;
        if (filterJabatan && item.jabatan?.toLowerCase() !== filterJabatan.toLowerCase()) return false;
        if (filterJk && item.jenis_kelamin !== filterJk) return false;

        if (!search) return true;
        const s = search.toLowerCase();
        return item.nama?.toLowerCase().includes(s) ||
            item.nip?.includes(s) ||
            item.username?.toLowerCase().includes(s) ||
            item.jabatan?.toLowerCase().includes(s) ||
            item.pendidikan?.toLowerCase().includes(s) ||
            (item.jenis_kelamin === 'L' ? 'laki-laki' : 'perempuan').includes(s);
    });

    if (sortColumn) {
        filteredData = sortData(filteredData, sortColumn, sortDirection);
    }

    // Pagination
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const paginatedData = filteredData.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
        setSelectedItems(new Set());
    }, [search, filterStatus, filterJabatan, filterJk, itemsPerPage]);

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

    const toggleRowExpand = (idx) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(idx)) {
            newExpanded.delete(idx);
        } else {
            newExpanded.add(idx);
        }
        setExpandedRows(newExpanded);
    };

    // Bulk selection handlers
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
        if (selectedItems.size === paginatedData.length) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(paginatedData.map(item => item.id)));
        }
    };

    const handleBulkDelete = async () => {
        if (selectedItems.size === 0) return;

        const result = await Swal.fire({
            title: `Hapus ${selectedItems.size} guru?`,
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
            const response = await authFetch(`${API_BASE}/guru/bulk-delete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ ids: Array.from(selectedItems) })
            });

            if (response.ok) {
                setSelectedItems(new Set());
                fetchData();
                Swal.fire({
                    icon: 'success',
                    title: 'Terhapus!',
                    text: `${selectedItems.size} guru berhasil dihapus`,
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                const error = await response.json();
                Swal.fire({
                    icon: 'error',
                    title: 'Gagal!',
                    text: error.message || 'Terjadi kesalahan',
                    timer: 2000,
                    showConfirmButton: false
                });
            }
        } catch (error) {
            console.error('Error bulk delete:', error);
            Swal.fire({
                icon: 'error',
                title: 'Gagal!',
                text: 'Gagal menghapus data',
                timer: 2000,
                showConfirmButton: false
            });
        }
    };

    // Import Excel
    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            const mappedData = jsonData.map(row => ({
                nama: row['Nama'] || row['nama'] || '',
                username: row['Username'] || row['username'] || '',
                nip: String(row['NIP'] || row['nip'] || ''),
                sk: row['SK'] || row['sk'] || '',
                jenis_kelamin: (row['JK'] || row['jenis_kelamin'] || 'L').toString().toUpperCase() === 'P' ? 'P' : 'L',
                status: row['Status'] || row['status'] || 'Aktif',
                alamat: row['Alamat'] || row['alamat'] || '',
                tanggal_lahir: row['Tanggal Lahir'] || row['tanggal_lahir'] || '',
                tempat_lahir: row['Tempat Lahir'] || row['tempat_lahir'] || '',
                pendidikan: row['Pendidikan'] || row['pendidikan'] || '',
                kontak: row['Kontak'] || row['kontak'] || '',
                tmt: row['TMT'] || row['tmt'] || '',
                jabatan: row['Jabatan'] || row['jabatan'] || ''
            }));

            Swal.fire({
                icon: 'success',
                title: 'Berhasil!',
                text: `Berhasil membaca ${mappedData.length} data dari Excel.`,
                timer: 1500,
                showConfirmButton: false
            });
            console.log('Imported data:', mappedData);
        } catch (error) {
            console.error('Error importing Excel:', error);
            Swal.fire({
                icon: 'error',
                title: 'Gagal!',
                text: 'Gagal membaca file Excel',
                timer: 2000,
                showConfirmButton: false
            });
        }
        e.target.value = '';
    };

    // Export Excel
    const handleExport = () => {
        const exportData = filteredData.map((item, idx) => ({
            'No': idx + 1,
            'Username': item.username,
            'Nama': item.nama,
            'NIP': item.nip,
            'SK': item.sk,
            'Jenis Kelamin': item.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan',
            'Jabatan': item.jabatan,
            'Pendidikan': item.pendidikan,
            'Alamat': item.alamat,
            'Tempat Lahir': item.tempat_lahir,
            'Tanggal Lahir': formatDate(item.tanggal_lahir),
            'Kontak': item.kontak,
            'TMT': formatDate(item.tmt),
            'Status': item.status
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Data Guru');
        XLSX.writeFile(wb, `Data_Guru_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const openAddModal = () => {
        setModalMode('add');
        setFormData({
            username: '', password: '', nama: '', nip: '', sk: '',
            jenis_kelamin: 'L', tempat_lahir: '', tanggal_lahir: '',
            alamat: '', pendidikan: '', kontak: '', tmt: '', jabatan: '', status: 'Aktif'
        });
        setIsModalClosing(false);
        setShowModal(true);
    };

    const openEditModal = (item) => {
        setModalMode('edit');
        setCurrentItem(item);
        setFormData({
            username: item.username || '',
            password: '', // Password tidak di-load untuk keamanan
            nama: item.nama || '',
            nip: item.nip || '',
            email: item.email || '',
            sk: item.sk || '',
            jenis_kelamin: item.jenis_kelamin || 'L',
            tempat_lahir: item.tempat_lahir || '',
            tanggal_lahir: item.tanggal_lahir?.split('T')[0] || '',
            alamat: item.alamat || '',
            pendidikan: item.pendidikan || '',
            kontak: item.kontak || '',
            tmt: item.tmt?.split('T')[0] || '',
            jabatan: item.jabatan || '',
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
            const url = modalMode === 'add'
                ? `${API_BASE}/guru`
                : `${API_BASE}/guru/${currentItem.id}`;
            const method = modalMode === 'add' ? 'POST' : 'PUT';

            // Jika mode edit dan password kosong, hapus dari payload
            const payload = { ...formData };
            if (modalMode === 'edit' && !payload.password) {
                delete payload.password;
            }

            const response = await authFetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                closeModal();
                fetchData();
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil!',
                    text: modalMode === 'add' ? 'Data guru berhasil ditambahkan' : 'Data guru berhasil diperbarui',
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                const error = await response.json();
                Swal.fire({
                    icon: 'error',
                    title: 'Gagal!',
                    text: error.message || 'Terjadi kesalahan',
                    timer: 2000,
                    showConfirmButton: false
                });
            }
        } catch (error) {
            console.error('Error saving:', error);
            Swal.fire({
                icon: 'error',
                title: 'Gagal!',
                text: 'Gagal menyimpan data',
                timer: 2000,
                showConfirmButton: false
            });
        }
    };

    // Handle TTD upload for a guru (admin)
    const handleTtdUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !currentItem?.id) return;

        if (file.size > 2 * 1024 * 1024) {
            Swal.fire({ icon: 'error', title: 'File Terlalu Besar', text: 'Ukuran file maksimal 2MB', timer: 2000, showConfirmButton: false });
            return;
        }

        if (!['image/jpeg', 'image/png', 'image/jpg', 'image/gif'].includes(file.type)) {
            Swal.fire({ icon: 'error', title: 'Format Tidak Didukung', text: 'Gunakan format JPG, PNG, atau GIF', timer: 2000, showConfirmButton: false });
            return;
        }

        try {
            setUploadingTtd(true);
            const formData = new FormData();
            formData.append('ttd', file);

            const response = await authFetch(`${API_BASE}/guru/${currentItem.id}/upload-ttd`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                // Update local data
                setData(prev => prev.map(item =>
                    item.id === currentItem.id
                        ? { ...item, ttd_url: result.ttd_url, ttd: result.ttd }
                        : item
                ));
                setCurrentItem(prev => ({ ...prev, ttd_url: result.ttd_url, ttd: result.ttd }));
                Swal.fire({ icon: 'success', title: 'Berhasil!', text: 'Tanda tangan berhasil diperbarui', timer: 1500, showConfirmButton: false });
            } else {
                Swal.fire({ icon: 'error', title: 'Gagal!', text: result.message || 'Terjadi kesalahan', timer: 2000, showConfirmButton: false });
            }
        } catch (error) {
            console.error('Error uploading TTD:', error);
            Swal.fire({ icon: 'error', title: 'Gagal!', text: 'Gagal mengupload tanda tangan', timer: 2000, showConfirmButton: false });
        } finally {
            setUploadingTtd(false);
            if (ttdInputRef.current) ttdInputRef.current.value = '';
        }
    };

    // Handle canvas TTD save (admin)
    const handleCanvasTtdSave = async (base64) => {
        if (!currentItem?.id) return;
        try {
            setUploadingTtd(true);
            const response = await authFetch(`${API_BASE}/guru/${currentItem.id}/upload-ttd`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ttd_base64: base64 })
            });
            const result = await response.json();
            if (result.success) {
                setData(prev => prev.map(item =>
                    item.id === currentItem.id
                        ? { ...item, ttd_url: result.ttd_url, ttd: result.ttd }
                        : item
                ));
                setCurrentItem(prev => ({ ...prev, ttd_url: result.ttd_url, ttd: result.ttd }));
                Swal.fire({ icon: 'success', title: 'Berhasil!', text: 'Tanda tangan berhasil disimpan', timer: 1500, showConfirmButton: false });
            } else {
                Swal.fire({ icon: 'error', title: 'Gagal!', text: result.message || 'Terjadi kesalahan', timer: 2000, showConfirmButton: false });
            }
        } catch (error) {
            console.error('Error saving canvas TTD:', error);
            Swal.fire({ icon: 'error', title: 'Gagal!', text: 'Gagal menyimpan tanda tangan', timer: 2000, showConfirmButton: false });
        } finally {
            setUploadingTtd(false);
        }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Yakin ingin menghapus?',
            text: 'Data yang dihapus tidak dapat dikembalikan!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Ya, Hapus!',
            cancelButtonText: 'Batal'
        });

        if (!result.isConfirmed) return;

        try {
            const response = await authFetch(`${API_BASE}/guru/${id}`, {
                method: 'DELETE',
                headers: { 'Accept': 'application/json' }
            });
            if (response.ok) {
                fetchData();
                Swal.fire({
                    icon: 'success',
                    title: 'Terhapus!',
                    text: 'Data guru berhasil dihapus',
                    timer: 1500,
                    showConfirmButton: false
                });
            }
        } catch (error) {
            console.error('Error deleting:', error);
        }
    };

    useEffect(() => {
        const handleClick = () => setActiveFilter(null);
        document.body.addEventListener('click', handleClick);
        return () => document.body.removeEventListener('click', handleClick);
    }, []);

    // Sortable header component
    const SortableHeader = ({ label, column, filterable, filterOptions, filterValue, setFilterValue }) => (
        <th
            className="select-none py-4 px-2 cursor-pointer whitespace-nowrap group"
            onClick={() => !filterable && handleSort(column)}
        >
            <div className="flex items-center gap-1.5">
                <span
                    onClick={(e) => { e.stopPropagation(); handleSort(column); }}
                    className="hover:text-primary transition-colors"
                >
                    {label}
                </span>
                <div className="flex flex-col text-[8px] leading-[4px] text-gray-300 dark:text-gray-600">
                    <i className={`fas fa-caret-up ${sortColumn === column && sortDirection === 'asc' ? 'text-primary' : ''}`}></i>
                    <i className={`fas fa-caret-down ${sortColumn === column && sortDirection === 'desc' ? 'text-primary' : ''}`}></i>
                </div>
                {filterable && (
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => setActiveFilter(activeFilter === column ? null : column)}
                            className={`ml-1 transition-colors ${filterValue ? 'text-primary' : 'text-gray-400 hover:text-primary dark:hover:text-gray-200'}`}
                        >
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

    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return (
        <div className="animate-fadeIn flex flex-col flex-grow max-w-full overflow-auto">
            {/* Header */}
            <header className="mb-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary to-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                            <i className="fas fa-chalkboard-teacher text-white text-xl"></i>
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-gray-800 dark:text-dark-text uppercase tracking-tight">
                                Manajemen Guru
                            </h1>
                            <p className="text-xs text-gray-400 mt-0.5 font-medium uppercase tracking-widest">
                                Kelola data guru dan tenaga pendidik
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 bg-gray-50/50 dark:bg-dark-bg/20 p-4 rounded-2xl border border-gray-100 dark:border-dark-border">
                <div className="flex items-center w-full md:w-[400px] relative group">
                    <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors"></i>
                    <input
                        aria-label="Cari data guru"
                        className="w-full pl-11 pr-4 py-3 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all dark:text-dark-text placeholder-gray-400 shadow-sm"
                        placeholder="Cari data guru (Nama, NIP, Email)..."
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 flex-wrap md:flex-nowrap items-center">
                    {selectedItems.size > 0 && (
                        <button
                            onClick={handleBulkDelete}
                            className="btn-danger flex items-center gap-2 group px-5 py-2.5 shadow-lg shadow-rose-200 dark:shadow-none font-black text-[10px] uppercase tracking-widest"
                            type="button"
                        >
                            <i className="fas fa-trash scale-110 group-hover:rotate-12 transition-transform"></i>
                            <span>Hapus ({selectedItems.size})</span>
                        </button>
                    )}
                    <button
                        onClick={handleImportClick}
                        className="btn-secondary px-5 py-2.5 flex items-center gap-2 font-black text-[10px] uppercase tracking-widest"
                        type="button"
                    >
                        <i className="fas fa-file-import"></i>
                        <span>Import</span>
                    </button>
                    <button
                        onClick={handleExport}
                        className="btn-secondary px-5 py-2.5 flex items-center gap-2 font-black text-[10px] uppercase tracking-widest"
                        type="button"
                    >
                        <i className="fas fa-file-export"></i>
                        <span>Export</span>
                    </button>
                    <button
                        onClick={openAddModal}
                        className="btn-primary px-6 py-2.5 flex items-center gap-2 group shadow-lg shadow-primary/20 font-black text-[10px] uppercase tracking-widest"
                        type="button"
                    >
                        <i className="fas fa-plus group-hover:rotate-90 transition-transform"></i>
                        <span>Tambah Guru</span>
                    </button>
                </div>
            </div>

            {/* Hidden file input for import */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileChange}
            />

            {/* Loading State */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700"></div>
                    <span className="ml-3 text-gray-600">Memuat data...</span>
                </div>
            ) : (
                <div className="overflow-x-auto scrollbar-hide max-w-full bg-white dark:bg-dark-surface rounded-2xl shadow-soft border border-gray-100 dark:border-dark-border">
                    <table aria-label="Tabel data guru" className={`admin-table ${isMobile ? '' : 'min-w-[1400px]'}`}>
                        <thead>
                            <tr>
                                <th className="select-none pl-6 py-4 w-10">
                                    <input
                                        type="checkbox"
                                        checked={paginatedData.length > 0 && selectedItems.size === paginatedData.length}
                                        onChange={handleSelectAll}
                                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                    />
                                </th>
                                <th className="select-none py-4 text-center">No</th>
                                {isMobile && <th className="select-none py-4"></th>}
                                <SortableHeader label="Nama" column="nama" />
                                <SortableHeader label="NIP" column="nip" />
                                {!isMobile && <SortableHeader label="Email" column="email" />}
                                <SortableHeader
                                    label="Jabatan"
                                    column="jabatan"
                                    filterable
                                    filterOptions={[
                                        { label: 'Semua', value: '' },
                                        ...uniqueJabatan.map(j => ({ label: j, value: j }))
                                    ]}
                                    filterValue={filterJabatan}
                                    setFilterValue={setFilterJabatan}
                                />
                                {!isMobile && (
                                    <SortableHeader
                                        label="JK"
                                        column="jenis_kelamin"
                                        filterable
                                        filterOptions={[
                                            { label: 'Semua', value: '' },
                                            { label: 'Laki-laki', value: 'L' },
                                            { label: 'Perempuan', value: 'P' }
                                        ]}
                                        filterValue={filterJk}
                                        setFilterValue={setFilterJk}
                                    />
                                )}
                                {!isMobile && <SortableHeader label="Pendidikan" column="pendidikan" />}
                                {!isMobile && <SortableHeader label="TMT" column="tmt" />}
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
                                <th className="select-none py-4 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.map((item, idx) => (
                                <React.Fragment key={item.id}>
                                    <tr className={selectedItems.has(item.id) ? 'bg-primary/5' : ''}>
                                        <td className="pl-6 py-4 align-middle">
                                            <input
                                                type="checkbox"
                                                checked={selectedItems.has(item.id)}
                                                onChange={() => handleSelectItem(item.id)}
                                                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                            />
                                        </td>
                                        <td className="py-4 text-center">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                                        {isMobile && (
                                            <td
                                                className="px-2 py-2 align-middle select-none text-center cursor-pointer"
                                                onClick={() => toggleRowExpand(idx)}
                                            >
                                                <i className={`fas fa-${expandedRows.has(idx) ? 'minus' : 'plus'} text-green-700`}></i>
                                            </td>
                                        )}
                                        <td className="px-2 py-2 align-middle select-none whitespace-nowrap dark:text-dark-text">{item.nama}</td>
                                        <td className="px-2 py-2 align-middle select-none whitespace-nowrap dark:text-dark-text">{item.nip || '-'}</td>
                                        {!isMobile && <td className="px-2 py-2 align-middle select-none whitespace-nowrap dark:text-dark-text">{item.email || '-'}</td>}
                                        <td className="px-2 py-2 align-middle select-none whitespace-nowrap">
                                            {item.roles?.length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {item.roles.map((role, i) => (
                                                        <span key={i} className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] rounded-full">
                                                            {role}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : '-'}
                                        </td>
                                        {!isMobile && <td className="px-2 py-2 align-middle select-none whitespace-nowrap text-center dark:text-dark-text">{item.jenis_kelamin === 'L' ? 'L' : 'P'}</td>}
                                        {!isMobile && <td className="px-2 py-2 align-middle select-none whitespace-nowrap dark:text-dark-text">{item.pendidikan || '-'}</td>}
                                        {!isMobile && <td className="px-2 py-2 align-middle select-none whitespace-nowrap dark:text-dark-text">{formatDate(item.tmt) || '-'}</td>}
                                        <td className="px-2 py-2 align-middle select-none whitespace-nowrap">{renderStatus(item.status)}</td>
                                        <td className="py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => openEditModal(item)}
                                                    className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors flex items-center justify-center dark:bg-blue-900/20 dark:text-blue-400"
                                                    title="Edit Data"
                                                >
                                                    <i className="fas fa-edit text-xs"></i>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    className="w-8 h-8 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors flex items-center justify-center dark:bg-red-900/20 dark:text-red-400"
                                                    title="Hapus Data"
                                                >
                                                    <i className="fas fa-trash text-xs"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    {isMobile && expandedRows.has(idx) && (
                                        <tr className="bg-gray-50 dark:bg-dark-bg/50">
                                            <td colSpan="7" className="px-4 py-3">
                                                <div className="grid grid-cols-2 gap-2 text-[11px] dark:text-dark-text">
                                                    <div><strong>Username:</strong> {item.username}</div>
                                                    <div><strong>Email:</strong> {item.email || '-'}</div>
                                                    <div><strong>JK:</strong> {item.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</div>
                                                    <div><strong>Pendidikan:</strong> {item.pendidikan || '-'}</div>
                                                    <div><strong>Kontak:</strong> {item.kontak || '-'}</div>
                                                    <div><strong>SK:</strong> {item.sk || '-'}</div>
                                                    <div><strong>TMT:</strong> {formatDate(item.tmt) || '-'}</div>
                                                    <div><strong>Tempat Lahir:</strong> {item.tempat_lahir || '-'}</div>
                                                    <div><strong>Tanggal Lahir:</strong> {formatDate(item.tanggal_lahir) || '-'}</div>
                                                    <div className="col-span-2"><strong>Alamat:</strong> {item.alamat || '-'}</div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                            {filteredData.length === 0 && (
                                <tr>
                                    <td colSpan={isMobile ? 7 : 16} className="py-20 text-center">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="w-16 h-16 bg-gray-50 dark:bg-dark-bg/20 rounded-2xl flex items-center justify-center">
                                                <i className="fas fa-user-slash text-2xl text-gray-300 dark:text-gray-600"></i>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-400 dark:text-gray-500">Data Guru Tidak Ditemukan</p>
                                                <p className="text-[11px] text-gray-400 mt-1 uppercase tracking-widest font-medium">
                                                    {search || filterStatus || filterJabatan || filterJk
                                                        ? 'Coba sesuaikan kata kunci atau filter pencarian Anda'
                                                        : 'Belum ada data guru yang tersedia'}
                                                </p>
                                            </div>
                                            {(search || filterStatus || filterJabatan || filterJk) && (
                                                <button
                                                    onClick={() => {
                                                        setSearch('');
                                                        setFilterStatus('');
                                                        setFilterJabatan('');
                                                        setFilterJk('');
                                                    }}
                                                    className="mt-4 text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
                                                >
                                                    Reset Pencarian
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* Pagination & Footer */}
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-6 border-t border-gray-100 dark:border-dark-border bg-gray-50/30 dark:bg-dark-bg/10 rounded-b-2xl">
                        <div className="flex items-center gap-4 order-2 md:order-1">
                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                <div className="w-1 h-1 rounded-full bg-primary animate-pulse"></div>
                                {filteredData.length} Total Data
                            </span>
                        </div>

                        <div className="order-1 md:order-2">
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={setCurrentPage}
                                totalItems={filteredData.length}
                                itemsPerPage={itemsPerPage}
                            />
                        </div>
                    </div>

                    {/* Floating Action Bar for Bulk Delete */}
                    {selectedItems.size > 0 && (
                        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 z-50 animate-pulse-subtle">
                            <span className="font-medium">{selectedItems.size} item dipilih</span>
                            <button
                                onClick={() => setSelectedItems(new Set())}
                                className="text-gray-300 hover:text-white transition-colors cursor-pointer"
                                title="Batalkan pilihan"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                            <div className="w-px h-6 bg-gray-600"></div>
                            <button
                                onClick={handleBulkDelete}
                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-full font-medium transition-colors flex items-center gap-2 cursor-pointer"
                            >
                                <i className="fas fa-trash"></i>
                                Hapus
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Modal with Portal */}
            {showModal && ReactDOM.createPortal(
                <div
                    className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 backdrop-blur-sm ${isModalClosing ? 'opacity-0' : 'opacity-100'}`}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
                    onClick={closeModal}
                >
                    <div
                        className={`bg-white dark:bg-dark-surface rounded-3xl shadow-2xl max-w-2xl w-full flex flex-col relative overflow-hidden transform transition-all duration-300 ${isModalClosing ? 'scale-95 translate-y-4 opacity-0' : 'scale-100 translate-y-0 opacity-100'}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-primary to-green-600 px-6 py-5 text-white relative">
                            <button
                                onClick={closeModal}
                                className="absolute top-4 right-4 text-white/80 hover:text-white cursor-pointer transition w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20"
                                type="button"
                                aria-label="Tutup Modal"
                            >
                                <i className="fas fa-times text-lg"></i>
                            </button>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                                    <i className={`fas fa-${modalMode === 'add' ? 'plus' : 'user-edit'} text-lg`}></i>
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold">
                                        {modalMode === 'add' ? 'Tambah Guru Baru' : 'Perbarui Data Guru'}
                                    </h2>
                                    <p className="text-xs text-white/80 mt-0.5">Lengkapi informasi detail tenaga pendidik</p>
                                </div>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide max-h-[70vh]">
                                {/* Section: Akun */}
                                <div>
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-1.5 h-4 bg-primary rounded-full"></div>
                                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Informasi Akun</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Username *</label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.username}
                                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                                className="w-full bg-gray-50 dark:bg-dark-bg/50 border border-gray-200 dark:border-dark-border rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all dark:text-dark-text placeholder-gray-400"
                                                placeholder="Username untuk login"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">
                                                Password {modalMode === 'add' ? '*' : '(Kosongkan jika tetap)'}
                                            </label>
                                            <input
                                                type="password"
                                                required={modalMode === 'add'}
                                                value={formData.password}
                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                className="w-full bg-gray-50 dark:bg-dark-bg/50 border border-gray-200 dark:border-dark-border rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all dark:text-dark-text placeholder-gray-400"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Section: Data Diri */}
                                <div>
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-1.5 h-4 bg-primary rounded-full"></div>
                                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Data Pribadi</h3>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Nama Lengkap *</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={formData.nama}
                                                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                                                    className="w-full bg-gray-50 dark:bg-dark-bg/50 border border-gray-200 dark:border-dark-border rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all dark:text-dark-text placeholder-gray-400"
                                                    placeholder="Nama lengkap beserta gelar"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">NIP</label>
                                                <input
                                                    type="text"
                                                    value={formData.nip}
                                                    onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                                                    className="w-full bg-gray-50 dark:bg-dark-bg/50 border border-gray-200 dark:border-dark-border rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all dark:text-dark-text placeholder-gray-400"
                                                    placeholder="Nomor Induk Pegawai"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Email</label>
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                className="w-full bg-gray-50 dark:bg-dark-bg/50 border border-gray-200 dark:border-dark-border rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all dark:text-dark-text placeholder-gray-400"
                                                placeholder="contoh@aliyah.sch.id"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Jenis Kelamin *</label>
                                                <select
                                                    required
                                                    value={formData.jenis_kelamin}
                                                    onChange={(e) => setFormData({ ...formData, jenis_kelamin: e.target.value })}
                                                    className="w-full bg-gray-50 dark:bg-dark-bg/50 border border-gray-200 dark:border-dark-border rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all dark:text-dark-text outline-none cursor-pointer"
                                                >
                                                    <option value="L">Laki-laki</option>
                                                    <option value="P">Perempuan</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Kontak (WA/HP)</label>
                                                <input
                                                    type="text"
                                                    value={formData.kontak}
                                                    onChange={(e) => setFormData({ ...formData, kontak: e.target.value })}
                                                    className="w-full bg-gray-50 dark:bg-dark-bg/50 border border-gray-200 dark:border-dark-border rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all dark:text-dark-text placeholder-gray-400"
                                                    placeholder="08xxxxxxxxxx"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Tempat Lahir</label>
                                                <input
                                                    type="text"
                                                    value={formData.tempat_lahir}
                                                    onChange={(e) => setFormData({ ...formData, tempat_lahir: e.target.value })}
                                                    className="w-full bg-gray-50 dark:bg-dark-bg/50 border border-gray-200 dark:border-dark-border rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all dark:text-dark-text placeholder-gray-400"
                                                    placeholder="Kota/Kabupaten"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Tanggal Lahir</label>
                                                <input
                                                    type="date"
                                                    value={formData.tanggal_lahir}
                                                    onChange={(e) => setFormData({ ...formData, tanggal_lahir: e.target.value })}
                                                    className="w-full bg-gray-50 dark:bg-dark-bg/50 border border-gray-200 dark:border-dark-border rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all dark:text-dark-text outline-none cursor-pointer"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Section: Kepegawaian */}
                                <div>
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-1.5 h-4 bg-primary rounded-full"></div>
                                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Informasi Kepegawaian</h3>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Jabatan</label>
                                                <input
                                                    type="text"
                                                    value={formData.jabatan}
                                                    onChange={(e) => setFormData({ ...formData, jabatan: e.target.value })}
                                                    className="w-full bg-gray-50 dark:bg-dark-bg/50 border border-gray-200 dark:border-dark-border rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all dark:text-dark-text placeholder-gray-400"
                                                    placeholder="Contoh: Guru Wali Kelas"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Status Keaktifan *</label>
                                                <select
                                                    required
                                                    value={formData.status}
                                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                                    className="w-full bg-gray-50 dark:bg-dark-bg/50 border border-gray-200 dark:border-dark-border rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all dark:text-dark-text outline-none cursor-pointer"
                                                >
                                                    <option value="Aktif">Aktif</option>
                                                    <option value="Tidak Aktif">Tidak Aktif</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Pendidikan Terakhir</label>
                                                <input
                                                    type="text"
                                                    value={formData.pendidikan}
                                                    onChange={(e) => setFormData({ ...formData, pendidikan: e.target.value })}
                                                    className="w-full bg-gray-50 dark:bg-dark-bg/50 border border-gray-200 dark:border-dark-border rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all dark:text-dark-text placeholder-gray-400"
                                                    placeholder="Contoh: S1 Pendidikan"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Nomor SK</label>
                                                <input
                                                    type="text"
                                                    value={formData.sk}
                                                    onChange={(e) => setFormData({ ...formData, sk: e.target.value })}
                                                    className="w-full bg-gray-50 dark:bg-dark-bg/50 border border-gray-200 dark:border-dark-border rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all dark:text-dark-text placeholder-gray-400"
                                                    placeholder="Nomor SK Pengangkatan"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">TMT (Terhitung Mulai Tugas)</label>
                                            <input
                                                type="date"
                                                value={formData.tmt}
                                                onChange={(e) => setFormData({ ...formData, tmt: e.target.value })}
                                                className="w-full bg-gray-50 dark:bg-dark-bg/50 border border-gray-200 dark:border-dark-border rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all dark:text-dark-text outline-none cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Section: Tanda Tangan */}
                                {modalMode === 'edit' && (
                                    <div className="p-4 bg-gray-50 dark:bg-dark-bg/20 rounded-2xl border border-gray-100 dark:border-dark-border">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="w-1.5 h-4 bg-indigo-500 rounded-full"></div>
                                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Tanda Tangan Digital</h3>
                                        </div>

                                        {currentItem?.ttd_url ? (
                                            <div className="flex items-center gap-6">
                                                <div className="p-3 bg-white dark:bg-dark-surface rounded-xl border border-gray-100 dark:border-dark-border shadow-sm group relative overflow-hidden">
                                                    <img src={currentItem.ttd_url} alt="TTD" className="h-16 object-contain min-w-[100px]" />
                                                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                                                </div>
                                                <div className="flex flex-col gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => ttdInputRef.current?.click()}
                                                        disabled={uploadingTtd}
                                                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-emerald-600 hover:text-emerald-700 transition-colors disabled:opacity-50"
                                                    >
                                                        <i className="fas fa-upload"></i> Ganti File
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowSignatureCanvas(true)}
                                                        disabled={uploadingTtd}
                                                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-indigo-600 hover:text-indigo-700 transition-colors disabled:opacity-50"
                                                    >
                                                        <i className="fas fa-pen-nib"></i> Tulis Ulang
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => ttdInputRef.current?.click()}
                                                    disabled={uploadingTtd}
                                                    className="flex flex-col items-center justify-center p-4 border border-dashed border-gray-300 dark:border-dark-border rounded-2xl hover:bg-emerald-50 dark:hover:bg-emerald-900/10 hover:border-emerald-300 transition-all group disabled:opacity-50"
                                                >
                                                    <i className="fas fa-file-upload text-gray-400 group-hover:text-emerald-500 transition-colors mb-2 text-xl"></i>
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-emerald-600">Upload File</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowSignatureCanvas(true)}
                                                    disabled={uploadingTtd}
                                                    className="flex flex-col items-center justify-center p-4 border border-dashed border-gray-300 dark:border-dark-border rounded-2xl hover:bg-indigo-50 dark:hover:bg-indigo-900/10 hover:border-indigo-300 transition-all group disabled:opacity-50"
                                                >
                                                    <i className="fas fa-signature text-gray-400 group-hover:text-indigo-500 transition-colors mb-2 text-xl"></i>
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-indigo-600">Tulis Manual</span>
                                                </button>
                                            </div>
                                        )}
                                        <input
                                            ref={ttdInputRef}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleTtdUpload}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="p-6 border-t border-gray-100 dark:border-dark-border flex justify-end gap-3 bg-gray-50/50 dark:bg-dark-bg/20">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-6 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-dark-surface transition-all text-[11px] font-black uppercase tracking-widest"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary px-8 py-2.5 rounded-xl shadow-lg shadow-primary/20 text-[11px] font-black uppercase tracking-widest"
                                >
                                    {modalMode === 'add' ? 'Simpan Data' : 'Perbarui Data'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* CSS Animation */}
            <style>{`
                @keyframes modalIn {
                    from {
                        opacity: 0;
                        transform: scale(0.95) translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                }
            `}</style>

            {/* Signature Canvas Modal */}
            <SignatureCanvas
                isOpen={showSignatureCanvas}
                onClose={() => setShowSignatureCanvas(false)}
                onSave={handleCanvasTtdSave}
                title="Tulis Tanda Tangan"
            />
        </div>
    );
}

export default ManajemenGuru;
