import React, { useState, useEffect, useRef } from 'react';
import CrudModal, { ModalSection } from '../../../components/CrudModal';
import { API_BASE, authFetch } from '../../../config/api';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import Pagination from '../../../components/Pagination';

const ITEMS_PER_PAGE_DEFAULT = 10;

function ManajemenMapel() {
    const [data, setData] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [currentItem, setCurrentItem] = useState(null);

    const [formData, setFormData] = useState({
        nama_mapel: '',
        kode_mapel: '',
        status: 'Aktif',
        is_non_akademik: false
    });

    // Sorting state
    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState('asc');

    // Filter state
    const [filterStatus, setFilterStatus] = useState('');
    const [filterTipe, setFilterTipe] = useState('');
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
            const response = await authFetch(`${API_BASE}/mapel`);
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
            if (filterStatus && item.status !== filterStatus) return false;
            if (filterTipe === 'akademik' && item.is_non_akademik) return false;
            if (filterTipe === 'non_akademik' && !item.is_non_akademik) return false;
            if (!search) return true;
            const s = search.toLowerCase();
            return (
                item.nama_mapel?.toLowerCase().includes(s) ||
                item.kode_mapel?.toLowerCase().includes(s)
            );
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
    }, [search, filterStatus, filterTipe]);

    const openAddModal = () => {
        setModalMode('add');
        setFormData({
            nama_mapel: '',
            kode_mapel: '',
            status: 'Aktif',
            is_non_akademik: false
        });

        setShowModal(true);
    };

    const openEditModal = (item) => {
        setModalMode('edit');
        setCurrentItem(item);
        setFormData({
            nama_mapel: item.nama_mapel || '',
            kode_mapel: item.kode_mapel || '',
            status: item.status || 'Aktif',
            is_non_akademik: item.is_non_akademik || false
        });
        setShowModal(true);
    };

    const closeModal = () => setShowModal(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const url = modalMode === 'add' ? `${API_BASE}/mapel` : `${API_BASE}/mapel/${currentItem.id}`;
            const method = modalMode === 'add' ? 'POST' : 'PUT';
            const response = await authFetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (response.ok) {
                closeModal();
                fetchData();
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil!',
                    text: modalMode === 'add' ? 'Data mapel berhasil ditambahkan' : 'Data mapel berhasil diperbarui',
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
            const url = force ? `${API_BASE}/mapel/${id}?force=true` : `${API_BASE}/mapel/${id}`;
            const response = await authFetch(url, {
                method: 'DELETE',
                headers: { 'Accept': 'application/json' }
            });
            if (response.ok) {
                fetchData();
                Swal.fire({ icon: 'success', title: 'Terhapus!', text: 'Data mapel berhasil dihapus', timer: 1500, showConfirmButton: false });
            } else {
                const error = await response.json();
                if (error.requires_force) {
                    const forceResult = await Swal.fire({ title: 'Data Terkait Ditemukan!', html: `<p>${error.message}</p>`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc2626', cancelButtonColor: '#6b7280', confirmButtonText: '⚠️ Hapus Paksa', cancelButtonText: 'Batal' });
                    if (forceResult.isConfirmed) handleDelete(id, true);
                } else {
                    Swal.fire({ icon: 'error', title: 'Gagal!', text: error.message || 'Terjadi kesalahan' });
                }
            }
        } catch (error) {
            console.error('Error deleting:', error);
        }
    };
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
                const mapelData = {
                    nama_mapel: row['Nama Mapel'] || row['nama_mapel'] || '',
                    kode_mapel: row['Kode Mapel'] || row['kode_mapel'] || '',
                    status: row['Status'] || row['status'] || 'Aktif'
                };
                if (mapelData.nama_mapel) {
                    try {
                        const response = await authFetch(`${API_BASE}/mapel`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                            body: JSON.stringify(mapelData)
                        });
                        if (response.ok) successCount++;
                    } catch (err) {
                        console.error('Error importing row:', err);
                    }
                }
            }
            fetchData();
            Swal.fire({
                icon: 'success',
                title: 'Berhasil!',
                text: `Berhasil mengimport ${successCount} dari ${jsonData.length} data mapel`,
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
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`${API_BASE}/export-pdf/mapel`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/pdf',
                },
            });
            console.log('PDF Response status:', response.status);
            console.log('PDF Response type:', response.headers.get('content-type'));
            if (!response.ok) {
                const text = await response.text();
                console.error('PDF Error response:', text);
                throw new Error('Gagal mengunduh PDF');
            }
            const blob = await response.blob();
            console.log('PDF Blob size:', blob.size, 'type:', blob.type);
            if (blob.size === 0) {
                throw new Error('PDF kosong (0 bytes)');
            }
            const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Data_Mapel_${new Date().toISOString().split('T')[0]}.pdf`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => window.URL.revokeObjectURL(url), 5000);
        } catch (error) {
            console.error('Error export PDF:', error);
            Swal.fire({ icon: 'error', title: 'Gagal!', text: error.message || 'Gagal mengunduh PDF', timer: 3000, showConfirmButton: false });
        } finally {
            setPdfLoading(false);
        }
    };

    // Export Excel
    const handleExportExcel = () => {
        const exportData = filteredData.map((item, idx) => ({
            'No': idx + 1,
            'Nama Mapel': item.nama_mapel,
            'Kode Mapel': item.kode_mapel || '',
            'Status': item.status
        }));
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Data Mapel');
        XLSX.writeFile(wb, `Data_Mapel_${new Date().toISOString().split('T')[0]}.xlsx`);
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
                            <i className="fas fa-book text-white text-xl"></i>
                        </div>
                        <div>
                            <h1 className="page-header-title text-xl font-black text-gray-800 uppercase tracking-tight">Mata Pelajaran</h1>
                            <p className="page-header-subtitle text-xs text-gray-400 mt-0.5 font-medium uppercase tracking-widest">Kelola kurikulum dan daftar mata pelajaran</p>
                        </div>
                    </div>
                </div>
            </header>

            <div className={`${isMobile ? 'mobile-sticky-header' : ''}`}>
                <div className={`${isMobile ? 'mobile-controls-row bg-gray-50/50 rounded-xl border border-gray-100' : 'flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 p-4 bg-gray-50/50 rounded-2xl border border-gray-100'}`}>
                    <div className={`${isMobile ? 'mobile-search-wrap' : 'flex items-center w-full md:w-[400px]'} relative group`}>
                        <i className={`fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors ${isMobile ? 'text-[10px]' : ''}`}></i>
                        <input
                            aria-label="Cari mapel"
                            className={`w-full !pl-8 pr-2 ${isMobile ? 'py-1.5 text-[10px]' : 'py-3 text-sm'} bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder-gray-400 shadow-sm`}
                            placeholder={isMobile ? 'Cari...' : 'Cari nama mapel atau kode...'}
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
                        <button onClick={handleExportExcel} className={`btn-secondary flex items-center gap-1 font-black uppercase tracking-widest ${isMobile ? '' : 'px-5 py-2.5 text-[10px] rounded-xl'}`} type="button">
                            <i className="fas fa-file-export"></i>
                            <span>Export</span>
                        </button>
                        <button onClick={openAddModal} className={`btn-primary flex items-center gap-1 group shadow-lg shadow-primary/20 font-black uppercase tracking-widest ${isMobile ? '' : 'px-4 py-2.5 text-[10px] rounded-xl'}`} type="button">
                            <i className="fas fa-plus group-hover:rotate-90 transition-transform"></i>
                            <span>{isMobile ? 'Tambah' : 'Tambah Mapel'}</span>
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
                    <table className={`admin-table ${isMobile ? 'mobile-table-fixed' : 'min-w-[700px]'}`}>
                        <thead>
                            <tr>
                                {!isMobile && <th className="select-none pl-6 py-2.5 w-10 text-center text-xs font-black text-gray-400 uppercase tracking-widest">No</th>}
                                {isMobile && <th className="col-expand select-none py-1 text-center"></th>}
                                <SortableHeader label="Nama Mata Pelajaran" column="nama_mapel" />
                                {!isMobile && <SortableHeader label="Kode" column="kode_mapel" />}
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
                                {!isMobile && (
                                    <SortableHeader
                                        label="Tipe"
                                        column="is_non_akademik"
                                        filterable
                                        filterOptions={[
                                            { label: 'Semua', value: '' },
                                            { label: 'Akademik', value: 'akademik' },
                                            { label: 'Non-Akademik', value: 'non_akademik' }
                                        ]}
                                        filterValue={filterTipe}
                                        setFilterValue={setFilterTipe}
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
                                                {item.nama_mapel}
                                            </span>
                                            {item.is_non_akademik && (
                                                <span className="inline-flex items-center ml-1.5 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-600 text-[7px] font-black uppercase tracking-wider">Non-Akademik</span>
                                            )}
                                        </td>
                                        {!isMobile && (
                                            <td className="py-2.5 px-2 align-middle whitespace-nowrap">
                                                <span className="px-2 py-1 bg-gray-100 rounded-lg text-[10px] font-bold text-gray-500">{item.kode_mapel || '-'}</span>
                                            </td>
                                        )}
                                        {!isMobile && (
                                            <td className="py-2.5 px-2 align-middle whitespace-nowrap">{renderStatus(item.status)}</td>
                                        )}
                                        {!isMobile && (
                                            <td className="py-2.5 px-2 align-middle whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${item.is_non_akademik ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                                                    {item.is_non_akademik ? 'Non-Akademik' : 'Akademik'}
                                                </span>
                                            </td>
                                        )}
                                        <td className={`text-center ${isMobile ? 'py-1 px-1' : 'py-2.5 px-6'}`}>
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
                                            <td colSpan="3" className="p-0">
                                                <div className="mobile-expand-grid">
                                                    <div className="expand-item">
                                                        <span className="expand-label">Kode</span>
                                                        <span className="expand-value">{item.kode_mapel || '-'}</span>
                                                    </div>
                                                    <div className="expand-item">
                                                        <span className="expand-label">Status</span>
                                                        <span className="expand-value">{renderStatus(item.status)}</span>
                                                    </div>
                                                    <div className="expand-item">
                                                        <span className="expand-label">Tipe</span>
                                                        <span className={`expand-value text-[9px] font-bold ${item.is_non_akademik ? 'text-amber-600' : 'text-blue-600'}`}>
                                                            {item.is_non_akademik ? 'Non-Akademik' : 'Akademik'}
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
                                    <td colSpan={isMobile ? 5 : 6} className="py-20 text-center">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="w-16 h-16 bg-gray-50 dark:bg-dark-bg/20 rounded-2xl flex items-center justify-center">
                                                <i className="fas fa-folder-open text-2xl text-gray-300 dark:text-gray-600"></i>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-400 dark:text-gray-500">Data Mapel Kosong</p>
                                                <p className="text-[11px] text-gray-400 mt-1 uppercase tracking-widest font-medium">
                                                    {search || filterStatus || filterTipe
                                                        ? 'Tidak ada data yang sesuai filter/pencarian Anda'
                                                        : 'Belum ada data mata pelajaran yang tersedia'}
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
                                Total {filteredData.length} Mata Pelajaran
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
            )
            }

            {/* Modal */}
            <CrudModal
                show={showModal}
                onClose={closeModal}
                title={modalMode === 'add' ? 'Tambah Mapel Baru' : 'Perbarui Mata Pelajaran'}
                subtitle="Lengkapi informasi detail kurikulum"
                icon={modalMode === 'add' ? 'plus' : 'edit'}
                onSubmit={handleSubmit}
                submitLabel={modalMode === 'add' ? 'Simpan' : 'Perbarui'}
                maxWidth="max-w-lg"
            >
                <div>
                    <ModalSection label="Informasi Mata Pelajaran" />
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nama Mata Pelajaran *</label>
                            <input
                                type="text"
                                required
                                value={formData.nama_mapel}
                                onChange={(e) => setFormData({ ...formData, nama_mapel: e.target.value })}
                                className="input-standard"
                                placeholder="Contoh: Matematika"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Kode Mapel</label>
                            <input
                                type="text"
                                value={formData.kode_mapel}
                                onChange={(e) => setFormData({ ...formData, kode_mapel: e.target.value })}
                                className="input-standard"
                                placeholder="Contoh: MAT001"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status Keaktifan *</label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                className="input-standard outline-none appearance-none"
                            >
                                <option value="Aktif">Aktif</option>
                                <option value="Tidak Aktif">Tidak Aktif</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50/50 border border-amber-100">
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.is_non_akademik}
                                    onChange={(e) => setFormData({ ...formData, is_non_akademik: e.target.checked })}
                                    className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                            </label>
                            <div>
                                <span className="text-xs font-bold text-amber-700">Non-Akademik</span>
                                <p className="text-[9px] text-amber-500 mt-0.5">Kegiatan rutin (Senam, Upacara, dll)</p>
                            </div>
                        </div>
                    </div>
                </div>
            </CrudModal>
        </div >
    );
}

export default ManajemenMapel;
