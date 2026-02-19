import React, { useState, useEffect, useRef } from 'react';
import CrudModal, { ModalSection } from '../../../components/CrudModal';
import { API_BASE, authFetch } from '../../../config/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useTahunAjaran } from '../../../contexts/TahunAjaranContext';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import Pagination from '../../../components/Pagination';

const ITEMS_PER_PAGE_DEFAULT = 10;

function ManajemenKelas() {
    const [data, setData] = useState([]);
    const [guruList, setGuruList] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    // Get Tahun Ajaran from contexts (AuthContext has priority)
    const { tahunAjaran: authTahunAjaran } = useAuth();
    const { activeTahunAjaran } = useTahunAjaran();
    const tahunAjaranId = authTahunAjaran?.id || activeTahunAjaran?.id;

    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [currentItem, setCurrentItem] = useState(null);

    const [formData, setFormData] = useState({
        nama_kelas: '',
        inisial: '',
        wali_kelas_id: '',
        status: 'Aktif'
    });

    // Sorting state
    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState('asc');

    // Filter state
    const [filterStatus, setFilterStatus] = useState('');
    const [activeFilter, setActiveFilter] = useState(null);

    // Mobile detection
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [expandedRows, setExpandedRows] = useState(new Set());

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE_DEFAULT);

    // File input ref for import
    const fileInputRef = useRef(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            let url = `${API_BASE}/kelas`;
            if (tahunAjaranId) {
                url += `?tahun_ajaran_id=${tahunAjaranId}`;
            }
            const response = await authFetch(url);
            const result = await response.json();
            setData(result.data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchGuruList = async () => {
        try {
            const response = await authFetch(`${API_BASE}/guru`);
            const result = await response.json();
            setGuruList(result.data || []);
        } catch (error) {
            console.error('Error fetching guru:', error);
        }
    };

    useEffect(() => {
        if (tahunAjaranId) {
            fetchData();
        }
        fetchGuruList();
    }, [tahunAjaranId]);

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

            // Handle nested objects (like wali_kelas.nama)
            if (column === 'wali_kelas') {
                valA = a.wali_kelas?.nama || '';
                valB = b.wali_kelas?.nama || '';
            }

            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();
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
            if (filterStatus && item.status !== filterStatus) return false;
            if (!search) return true;
            const s = search.toLowerCase();
            return item.nama_kelas?.toLowerCase().includes(s) ||
                item.inisial?.toLowerCase().includes(s) ||
                item.wali_kelas?.nama?.toLowerCase().includes(s);
        });

        if (sortColumn) {
            result = sortData(result, sortColumn, sortDirection);
        }
        return result;
    })();

    // Pagination
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const paginatedData = filteredData.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [search, filterStatus]);

    // Import Excel
    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            let successCount = 0;
            for (const row of jsonData) {
                try {
                    const response = await authFetch(`${API_BASE}/kelas`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                        body: JSON.stringify({
                            nama_kelas: row['Nama Kelas'] || row['nama_kelas'] || '',
                            inisial: row['Inisial'] || row['inisial'] || '',
                            status: row['Status'] || row['status'] || 'Aktif',
                            tahun_ajaran_id: tahunAjaranId
                        })
                    });
                    if (response.ok) successCount++;
                } catch (err) {
                    console.error('Error importing row:', err);
                }
            }

            fetchData();
            Swal.fire({
                icon: 'success',
                title: 'Berhasil!',
                text: `Berhasil mengimport ${successCount} dari ${jsonData.length} data kelas`,
                timer: 1500,
                showConfirmButton: false
            });
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

    // Export PDF
    const [pdfLoading, setPdfLoading] = useState(false);
    const handleExportPdf = async () => {
        try {
            setPdfLoading(true);
            const params = new URLSearchParams();
            if (tahunAjaranId) params.append('tahun_ajaran_id', tahunAjaranId);
            const url = `${API_BASE}/export-pdf/kelas${params.toString() ? '?' + params.toString() : ''}`;
            const response = await authFetch(url);
            if (!response.ok) throw new Error('Gagal mengunduh PDF');
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Data_Kelas_${new Date().toISOString().split('T')[0]}.pdf`;
            link.click();
            setTimeout(() => URL.revokeObjectURL(link.href), 1000);
        } catch (error) {
            console.error('Error export PDF:', error);
            Swal.fire({ icon: 'error', title: 'Gagal!', text: 'Gagal mengunduh PDF', timer: 2000, showConfirmButton: false });
        } finally {
            setPdfLoading(false);
        }
    };

    // Export Excel
    const handleExport = () => {
        const exportData = filteredData.map((item, idx) => ({
            'No': idx + 1,
            'Nama Kelas': item.nama_kelas,
            'Inisial': item.inisial,
            'Wali Kelas': item.wali_kelas?.nama || '-',
            'Jumlah Siswa': item.siswa_count || 0,
            'Status': item.status
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Data Kelas');
        XLSX.writeFile(wb, `Data_Kelas_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const openAddModal = () => {
        setModalMode('add');
        setFormData({
            nama_kelas: '',
            inisial: '',
            wali_kelas_id: '',
            status: 'Aktif'
        });

        setShowModal(true);
    };

    const openEditModal = (item) => {
        setModalMode('edit');
        setCurrentItem(item);
        setFormData({
            nama_kelas: item.nama_kelas || '',
            inisial: item.inisial || '',
            wali_kelas_id: item.wali_kelas_id || '',
            status: item.status || 'Aktif'
        });

        setShowModal(true);
    };

    const closeModal = () => setShowModal(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const url = modalMode === 'add' ? `${API_BASE}/kelas` : `${API_BASE}/kelas/${currentItem.id}`;
            const method = modalMode === 'add' ? 'POST' : 'PUT';
            const submitData = { ...formData, tahun_ajaran_id: tahunAjaranId };
            if (!submitData.wali_kelas_id) delete submitData.wali_kelas_id;

            const response = await authFetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(submitData)
            });
            if (response.ok) {
                closeModal();
                fetchData();
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil!',
                    text: modalMode === 'add' ? 'Data kelas berhasil ditambahkan' : 'Data kelas berhasil diperbarui',
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

    const handleDelete = async (id, force = false) => {
        if (!force) {
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
        }

        try {
            const url = force ? `${API_BASE}/kelas/${id}?force=true` : `${API_BASE}/kelas/${id}`;
            const response = await authFetch(url, {
                method: 'DELETE',
                headers: { 'Accept': 'application/json' }
            });
            if (response.ok) {
                fetchData();
                Swal.fire({
                    icon: 'success',
                    title: 'Terhapus!',
                    text: 'Data kelas berhasil dihapus',
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                const error = await response.json();
                if (error.requires_force) {
                    const forceResult = await Swal.fire({
                        title: 'Data Terkait Ditemukan!',
                        html: `<p>${error.message}</p>`,
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#dc2626',
                        cancelButtonColor: '#6b7280',
                        confirmButtonText: '⚠️ Hapus Paksa',
                        cancelButtonText: 'Batal'
                    });
                    if (forceResult.isConfirmed) handleDelete(id, true);
                } else {
                    Swal.fire({ icon: 'error', title: 'Gagal!', text: error.message || 'Terjadi kesalahan' });
                }
            }
        } catch (error) {
            console.error('Error deleting:', error);
        }
    };
    // Sortable header component
    const SortableHeader = ({ label, column, filterable, filterOptions, filterValue, setFilterValue }) => (
        <th
            className="select-none py-2.5 px-2 cursor-pointer whitespace-nowrap group"
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

    return (
        <div className="animate-fadeIn flex flex-col flex-grow max-w-full overflow-auto">
            {/* Header */}
            <header className={`${isMobile ? 'mb-3 mobile-sticky-header pt-2 pb-2 px-1' : 'mb-6'}`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="page-header-icon w-12 h-12 bg-gradient-to-br from-primary to-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                            <i className="fas fa-school text-white text-xl"></i>
                        </div>
                        <div>
                            <h1 className="page-header-title text-xl font-black text-gray-800 uppercase tracking-tight">Manajemen Kelas</h1>
                            <p className="page-header-subtitle text-xs text-gray-400 mt-0.5 font-medium uppercase tracking-widest">Kelola data kelas dan pembagian wali kelas</p>
                        </div>
                    </div>
                </div>
            </header>

            <div className={`${isMobile ? 'mobile-sticky-header' : ''}`}>
                <div className={`${isMobile ? 'mobile-controls-row bg-gray-50/50 rounded-xl border border-gray-100' : 'flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 p-4 bg-gray-50/50 rounded-2xl border border-gray-100'}`}>
                    <div className={`${isMobile ? 'mobile-search-wrap' : 'flex items-center w-full md:w-[400px]'} relative group`}>
                        <i className={`fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors ${isMobile ? 'text-[10px]' : ''}`}></i>
                        <input
                            aria-label="Cari kelas"
                            className={`w-full !pl-8 pr-2 ${isMobile ? 'py-1.5 text-[10px]' : 'py-3 text-sm'} bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder-gray-400 shadow-sm`}
                            placeholder={isMobile ? 'Cari...' : 'Cari nama kelas, inisial atau wali kelas...'}
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className={`${isMobile ? 'mobile-btn-group' : 'flex gap-2 flex-wrap md:flex-nowrap items-center'}`}>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx,.xls" className="hidden" />
                        <button onClick={handleExportPdf} disabled={pdfLoading} className={`btn-secondary flex items-center gap-1 font-black uppercase tracking-widest ${isMobile ? '' : 'px-5 py-2.5 text-[10px] rounded-xl'}`} type="button" title="Download PDF">
                            <i className={`fas ${pdfLoading ? 'fa-spinner fa-spin' : 'fa-file-pdf'}`}></i>
                            <span>PDF</span>
                        </button>
                        <button onClick={() => fileInputRef.current?.click()} className={`btn-secondary flex items-center gap-1 font-black uppercase tracking-widest ${isMobile ? '' : 'px-5 py-2.5 text-[10px] rounded-xl'}`} type="button">
                            <i className="fas fa-file-import"></i>
                            <span>Import</span>
                        </button>
                        <button onClick={handleExport} className={`btn-secondary flex items-center gap-1 font-black uppercase tracking-widest ${isMobile ? '' : 'px-5 py-2.5 text-[10px] rounded-xl'}`} type="button">
                            <i className="fas fa-file-export"></i>
                            <span>Export</span>
                        </button>
                        <button onClick={openAddModal} className={`btn-primary flex items-center gap-1 group shadow-lg shadow-primary/20 font-black uppercase tracking-widest ${isMobile ? '' : 'px-4 py-2.5 text-[10px] rounded-xl'}`} type="button">
                            <i className="fas fa-plus group-hover:rotate-90 transition-transform"></i>
                            <span>{isMobile ? 'Tambah' : 'Tambah Kelas'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Table Section */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="ml-3 text-sm font-medium text-gray-500 dark:text-gray-400">Memuat data...</span>
                </div>
            ) : (
                <div className={`bg-white rounded-2xl shadow-soft border border-gray-100 ${isMobile ? 'overflow-hidden' : 'overflow-x-auto scrollbar-hide'}`}>
                    <table className={`admin-table ${isMobile ? 'mobile-table-fixed' : 'min-w-[800px]'}`}>
                        <thead>
                            <tr>
                                {!isMobile && <th className="select-none pl-6 py-2.5 w-10 text-center text-xs font-black text-gray-400 uppercase tracking-widest">No</th>}
                                {isMobile && <th className="col-expand select-none py-1 text-center"></th>}
                                <SortableHeader label="Nama Kelas" column="nama_kelas" />
                                {!isMobile && <SortableHeader label="Inisial" column="inisial" />}
                                <SortableHeader label="Wali Kelas" column="wali_kelas" />
                                {!isMobile && <th className="select-none py-2.5 text-center text-xs font-black text-gray-400 uppercase tracking-widest">Jumlah Siswa</th>}
                                {!isMobile && (
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
                                )}
                                <th className={`select-none py-2.5 text-center text-xs font-black text-gray-400 uppercase tracking-widest ${isMobile ? 'px-2' : 'px-6'}`}>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.map((item, idx) => (
                                <React.Fragment key={item.id}>
                                    <tr className="hover:bg-gray-50/50 transition-colors border-b border-gray-100 last:border-0 group">
                                        {!isMobile && (
                                            <td className="pl-6 py-2.5 align-middle text-center text-xs font-bold text-gray-400">
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
                                        <td className={`${isMobile ? 'py-1.5 px-1' : 'py-2.5 px-2'} align-middle whitespace-nowrap`}>
                                            <span className={`${isMobile ? 'text-[10px]' : 'text-sm'} font-black text-gray-700 group-hover:text-primary transition-colors uppercase tracking-tight`}>
                                                {item.nama_kelas}
                                            </span>
                                        </td>
                                        {!isMobile && (
                                            <td className="py-2.5 px-2 align-middle whitespace-nowrap">
                                                <span className="px-2 py-1 bg-gray-100 rounded-lg text-[10px] font-bold text-gray-500">{item.inisial}</span>
                                            </td>
                                        )}
                                        <td className={`${isMobile ? 'py-1.5 px-1' : 'py-2.5 px-2'} align-middle whitespace-nowrap`}>
                                            <div className="flex items-center gap-1.5">
                                                {!isMobile && (
                                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                                                        <i className="fas fa-user-tie text-[10px]"></i>
                                                    </div>
                                                )}
                                                <span className={`${isMobile ? 'text-[9px]' : 'text-xs'} font-bold text-gray-600`}>
                                                    {item.wali_kelas?.nama || 'Belum Ditentukan'}
                                                </span>
                                            </div>
                                        </td>
                                        {!isMobile && (
                                            <td className="py-2.5 px-2 align-middle text-center whitespace-nowrap">
                                                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
                                                    <i className="fas fa-user-graduate text-[10px]"></i>
                                                    <span className="text-xs font-black">{item.siswa_count || 0}</span>
                                                </div>
                                            </td>
                                        )}
                                        {!isMobile && (
                                            <td className="py-2.5 px-2 align-middle whitespace-nowrap">{renderStatus(item.status)}</td>
                                        )}
                                        <td className={`${isMobile ? 'py-1.5 px-1' : 'py-2.5 px-6'} align-middle text-center`}>
                                            <div className="flex items-center justify-center gap-1">
                                                <button onClick={() => openEditModal(item)} className={`action-btn ${isMobile ? 'w-6 h-6' : 'w-8 h-8'} rounded-xl bg-orange-50 text-orange-600 hover:bg-orange-100 transition-all flex items-center justify-center hover:scale-110 active:scale-95`} title="Edit Data">
                                                    <i className={`fas fa-edit ${isMobile ? 'text-[8px]' : 'text-[10px]'}`}></i>
                                                </button>
                                                <button onClick={() => handleDelete(item.id)} className={`action-btn ${isMobile ? 'w-6 h-6' : 'w-8 h-8'} rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all flex items-center justify-center hover:scale-110 active:scale-95`} title="Hapus Data">
                                                    <i className={`fas fa-trash ${isMobile ? 'text-[8px]' : 'text-[10px]'}`}></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    {isMobile && expandedRows.has(idx) && (
                                        <tr>
                                            <td colSpan="4" className="p-0">
                                                <div className="mobile-expand-grid">
                                                    <div className="expand-item">
                                                        <span className="expand-label">Inisial</span>
                                                        <span className="expand-value">{item.inisial}</span>
                                                    </div>
                                                    <div className="expand-item">
                                                        <span className="expand-label">Jumlah Siswa</span>
                                                        <span className="expand-value">{item.siswa_count || 0} Orang</span>
                                                    </div>
                                                    <div className="expand-item">
                                                        <span className="expand-label">Status</span>
                                                        <span className="expand-value">{renderStatus(item.status)}</span>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                            {filteredData.length === 0 && (
                                <tr>
                                    <td colSpan={isMobile ? 6 : 8} className="py-20 text-center">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="w-16 h-16 bg-gray-50 dark:bg-dark-bg/20 rounded-2xl flex items-center justify-center">
                                                <i className="fas fa-folder-open text-2xl text-gray-300 dark:text-gray-600"></i>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-400 dark:text-gray-500">Data Kelas Kosong</p>
                                                <p className="text-[11px] text-gray-400 mt-1 uppercase tracking-widest font-medium">
                                                    {search || filterStatus
                                                        ? 'Tidak ada data yang sesuai filter/pencarian Anda'
                                                        : 'Belum ada data kelas yang tersedia'}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* Footer / Pagination */}
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-6 border-t border-gray-100 dark:border-dark-border bg-gray-50/30 dark:bg-dark-bg/10">
                        <div className="flex items-center gap-3 order-2 md:order-1">
                            <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                                Total {filteredData.length} Kelas Terdaftar
                            </span>
                        </div>

                        <div className="order-1 md:order-2">
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
                </div>
            )}

            {/* Modal */}
            <CrudModal
                show={showModal}
                onClose={closeModal}
                title={modalMode === 'add' ? 'Tambah Kelas Baru' : 'Perbarui Data Kelas'}
                subtitle="Lengkapi informasi detail unit kelas"
                icon={modalMode === 'add' ? 'plus' : 'edit'}
                onSubmit={handleSubmit}
                submitLabel={modalMode === 'add' ? 'Simpan' : 'Perbarui'}
                maxWidth="max-w-lg"
                isMobile={isMobile}
            >
                <div>
                    <ModalSection label="Informasi Dasar" isMobile={isMobile} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nama Kelas *</label>
                            <input
                                type="text"
                                required
                                value={formData.nama_kelas}
                                onChange={(e) => setFormData({ ...formData, nama_kelas: e.target.value })}
                                className={`w-full bg-gray-50 dark:bg-dark-bg/50 border border-gray-200 dark:border-dark-border rounded-xl ${isMobile ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm'} focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all dark:text-dark-text placeholder-gray-400 shadow-sm`}
                                placeholder="Contoh: X IPA 1"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Inisial *</label>
                            <input
                                type="text"
                                required
                                value={formData.inisial}
                                onChange={(e) => setFormData({ ...formData, inisial: e.target.value })}
                                className={`w-full bg-gray-50 dark:bg-dark-bg/50 border border-gray-200 dark:border-dark-border rounded-xl ${isMobile ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm'} focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all dark:text-dark-text placeholder-gray-400 shadow-sm`}
                                placeholder="Contoh: XIPA1"
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <ModalSection label="Personalia & Status" isMobile={isMobile} />
                    <div className={`${isMobile ? 'space-y-2' : 'space-y-4'}`}>
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Wali Kelas</label>
                            <select
                                value={formData.wali_kelas_id}
                                onChange={(e) => setFormData({ ...formData, wali_kelas_id: e.target.value })}
                                className={`w-full bg-gray-50 dark:bg-dark-bg/50 border border-gray-200 dark:border-dark-border rounded-xl ${isMobile ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm'} focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all dark:text-dark-text outline-none appearance-none cursor-pointer`}
                            >
                                <option value="">Pilih Wali Kelas (Opsional)</option>
                                {guruList.filter(g => g.status === 'Aktif').map(guru => (
                                    <option key={guru.id} value={guru.id}>{guru.nama}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status Keaktifan *</label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                className={`w-full bg-gray-50 dark:bg-dark-bg/50 border border-gray-200 dark:border-dark-border rounded-xl ${isMobile ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm'} focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all dark:text-dark-text outline-none appearance-none cursor-pointer`}
                            >
                                <option value="Aktif">Aktif</option>
                                <option value="Tidak Aktif">Tidak Aktif</option>
                            </select>
                        </div>
                    </div>
                </div>
            </CrudModal>
        </div>
    );
}

export default ManajemenKelas;
