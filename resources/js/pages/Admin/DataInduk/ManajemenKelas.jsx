import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { API_BASE, authFetch } from '../../../config/api';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import Pagination from '../../../components/Pagination';

const ITEMS_PER_PAGE = 10;

function ManajemenKelas() {
    const [data, setData] = useState([]);
    const [guruList, setGuruList] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [currentItem, setCurrentItem] = useState(null);
    const [isModalClosing, setIsModalClosing] = useState(false);
    const [formData, setFormData] = useState({
        nama_kelas: '',
        inisial: '',
        tingkat: 'X',
        wali_kelas_id: '',
        kapasitas: 36,
        status: 'Aktif'
    });

    // Sorting state
    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState('asc');

    // Filter state
    const [filterTingkat, setFilterTingkat] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [activeFilter, setActiveFilter] = useState(null);

    // Mobile detection
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [expandedRows, setExpandedRows] = useState(new Set());

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);

    // File input ref for import
    const fileInputRef = useRef(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await authFetch(`${API_BASE}/kelas`);
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
        fetchData();
        fetchGuruList();
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

    // Handle column sort
    const handleSort = (column) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    // Filter and sort data
    let filteredData = data.filter(item => {
        if (filterTingkat && item.tingkat !== filterTingkat) return false;
        if (filterStatus && item.status !== filterStatus) return false;

        if (!search) return true;
        const s = search.toLowerCase();
        return item.nama_kelas?.toLowerCase().includes(s) ||
            item.inisial?.toLowerCase().includes(s) ||
            item.wali_kelas?.nama?.toLowerCase().includes(s);
    });

    if (sortColumn) {
        filteredData = sortData(filteredData, sortColumn, sortDirection);
    }

    // Pagination
    const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
    const paginatedData = filteredData.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [search, filterTingkat, filterStatus]);

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

            let successCount = 0;
            for (const row of jsonData) {
                try {
                    const response = await authFetch(`${API_BASE}/kelas`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                        body: JSON.stringify({
                            nama_kelas: row['Nama Kelas'] || row['nama_kelas'] || '',
                            inisial: row['Inisial'] || row['inisial'] || '',
                            tingkat: row['Tingkat'] || row['tingkat'] || 'X',
                            kapasitas: row['Kapasitas'] || row['kapasitas'] || 36,
                            status: row['Status'] || row['status'] || 'Aktif'
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

    // Export Excel
    const handleExport = () => {
        const exportData = filteredData.map((item, idx) => ({
            'No': idx + 1,
            'Nama Kelas': item.nama_kelas,
            'Inisial': item.inisial,
            'Tingkat': item.tingkat,
            'Wali Kelas': item.wali_kelas?.nama || '-',
            'Kapasitas': item.kapasitas,
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
            tingkat: 'X',
            wali_kelas_id: '',
            kapasitas: 36,
            status: 'Aktif'
        });
        setIsModalClosing(false);
        setShowModal(true);
    };

    const openEditModal = (item) => {
        setModalMode('edit');
        setCurrentItem(item);
        setFormData({
            nama_kelas: item.nama_kelas || '',
            inisial: item.inisial || '',
            tingkat: item.tingkat || 'X',
            wali_kelas_id: item.wali_kelas_id || '',
            kapasitas: item.kapasitas || 36,
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
            const url = modalMode === 'add' ? `${API_BASE}/kelas` : `${API_BASE}/kelas/${currentItem.id}`;
            const method = modalMode === 'add' ? 'POST' : 'PUT';
            const submitData = { ...formData };
            if (!submitData.wali_kelas_id) submitData.wali_kelas_id = null;

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
                    showConfirmButton: false,
                    customClass: { container: 'swal-above-modal' }
                });
            } else {
                const error = await response.json();
                Swal.fire({
                    icon: 'error',
                    title: 'Gagal!',
                    text: error.message || 'Terjadi kesalahan',
                    timer: 2000,
                    showConfirmButton: false,
                    customClass: { container: 'swal-above-modal' }
                });
            }
        } catch (error) {
            console.error('Error saving:', error);
            Swal.fire({
                icon: 'error',
                title: 'Gagal!',
                text: 'Gagal menyimpan data',
                timer: 2000,
                showConfirmButton: false,
                customClass: { container: 'swal-above-modal' }
            });
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
            cancelButtonText: 'Batal',
            customClass: { container: 'swal-above-modal' }
        });

        if (!result.isConfirmed) return;

        try {
            const response = await authFetch(`${API_BASE}/kelas/${id}`, {
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
                    showConfirmButton: false,
                    customClass: { container: 'swal-above-modal' }
                });
            }
        } catch (error) {
            console.error('Error deleting:', error);
        }
    };

    // Render status with bullet
    const renderStatus = (status) => {
        const isAktif = status?.toLowerCase() === 'aktif';
        return (
            <span className={`inline-flex items-center gap-1 font-semibold text-[11px] ${isAktif ? 'status-aktif' : 'status-tidak-aktif'}`}>
                <span className="status-bullet"></span>{status}
            </span>
        );
    };

    // Sortable header component with optional filter
    const SortableHeader = ({ label, column, filterable, filterOptions, filterValue, setFilterValue }) => (
        <th
            className="select-none py-2 px-3 cursor-pointer whitespace-nowrap"
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

    return (
        <div className="animate-fadeIn flex flex-col flex-grow max-w-full overflow-auto">
            {/* Header */}
            <header className="mb-4">
                <h1 className="text-[#1f2937] font-semibold text-lg mb-1 select-none">Manajemen Kelas</h1>
                <p className="text-[11px] text-[#6b7280] select-none">Kelola data kelas di sini</p>
            </header>

            {/* Controls */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-4">
                <div className="flex items-center w-full md:w-1/3 border border-[#d1d5db] rounded-md px-3 py-1 text-[12px] text-[#4a4a4a] focus-within:ring-2 focus-within:ring-green-400 focus-within:border-green-400">
                    <input
                        className="w-full border-none focus:ring-0 focus:outline-none bg-transparent"
                        placeholder="Cari data kelas..."
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 flex-wrap md:flex-nowrap w-full md:w-auto justify-between md:justify-start">
                    <button
                        onClick={handleImportClick}
                        className="bg-green-700 text-white text-[12px] font-semibold px-2 py-1 rounded-md hover:bg-green-800 transition select-none flex items-center gap-2 flex-1 md:flex-none cursor-pointer"
                        type="button"
                    >
                        <i className="fas fa-file-import"></i> Import Excel
                    </button>
                    <button
                        onClick={handleExport}
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
                        <i className="fas fa-plus"></i> Tambah Kelas
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
                <div className="overflow-x-auto scrollbar-hide max-w-full">
                    <table className={`w-full text-[12px] text-[#4a4a4a] border-separate border-spacing-y-[2px] ${isMobile ? '' : 'min-w-[800px]'}`}>
                        <thead>
                            <tr className="text-left text-[#6b7280] select-none">
                                <th className="select-none pl-3 py-2 px-3 whitespace-nowrap">No</th>
                                {isMobile && <th className="select-none py-2 px-2 text-center whitespace-nowrap"></th>}
                                <SortableHeader label="Nama Kelas" column="nama_kelas" />
                                {!isMobile && <SortableHeader label="Inisial" column="inisial" />}
                                {!isMobile && (
                                    <SortableHeader
                                        label="Tingkat"
                                        column="tingkat"
                                        filterable
                                        filterOptions={[
                                            { label: 'Semua', value: '' },
                                            { label: 'X', value: 'X' },
                                            { label: 'XI', value: 'XI' },
                                            { label: 'XII', value: 'XII' }
                                        ]}
                                        filterValue={filterTingkat}
                                        setFilterValue={setFilterTingkat}
                                    />
                                )}
                                <SortableHeader label="Wali Kelas" column="wali_kelas" />
                                {!isMobile && <SortableHeader label="Kapasitas" column="kapasitas" />}
                                {!isMobile && <th className="select-none py-2 px-3 whitespace-nowrap">Jumlah Siswa</th>}
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
                                <th className="select-none py-2 px-3 text-center whitespace-nowrap">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.map((item, idx) => (
                                <React.Fragment key={item.id}>
                                    <tr className="hover:bg-green-50 bg-gray-50 align-top">
                                        <td className="pl-3 py-2 px-3 align-middle select-none whitespace-nowrap">{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                                        {isMobile && (
                                            <td
                                                className="py-2 px-2 align-middle select-none text-center cursor-pointer"
                                                onClick={() => toggleRowExpand(idx)}
                                            >
                                                <i className={`fas fa-${expandedRows.has(idx) ? 'minus' : 'plus'} text-green-700`}></i>
                                            </td>
                                        )}
                                        <td className="py-2 px-3 align-middle select-none whitespace-nowrap">{item.nama_kelas}</td>
                                        {!isMobile && <td className="py-2 px-3 align-middle select-none whitespace-nowrap">{item.inisial}</td>}
                                        {!isMobile && <td className="py-2 px-3 align-middle select-none whitespace-nowrap">{item.tingkat}</td>}
                                        <td className="py-2 px-3 align-middle select-none whitespace-nowrap">{item.wali_kelas?.nama || '-'}</td>
                                        {!isMobile && <td className="py-2 px-3 align-middle select-none whitespace-nowrap">{item.kapasitas}</td>}
                                        {!isMobile && <td className="py-2 px-3 align-middle select-none whitespace-nowrap">{item.siswa_count || 0}</td>}
                                        <td className="py-2 px-3 align-middle select-none whitespace-nowrap">{renderStatus(item.status)}</td>
                                        <td className="py-2 px-3 align-middle text-center select-none whitespace-nowrap">
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
                                                    <div><strong>Inisial:</strong> {item.inisial}</div>
                                                    <div><strong>Tingkat:</strong> {item.tingkat}</div>
                                                    <div><strong>Kapasitas:</strong> {item.kapasitas}</div>
                                                    <div><strong>Jumlah Siswa:</strong> {item.siswa_count || 0}</div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                            {filteredData.length === 0 && (
                                <tr>
                                    <td colSpan={isMobile ? 6 : 9} className="text-center py-8 text-gray-500">
                                        {search || filterTingkat || filterStatus ? 'Tidak ada data yang sesuai filter/pencarian' : 'Belum ada data kelas'}
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

            {/* Modal with Portal - renders at body level like SweetAlert */}
            {showModal && ReactDOM.createPortal(
                <div
                    className={`fixed inset-0 flex items-center justify-center p-4 transition-opacity duration-200 ${isModalClosing ? 'opacity-0' : 'opacity-100'}`}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)', zIndex: 9999 }}
                    onClick={closeModal}
                >
                    <div
                        className={`bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col relative transition-all duration-200 ${isModalClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}
                        onClick={(e) => e.stopPropagation()}
                        style={{ animation: isModalClosing ? 'none' : 'modalIn 0.2s ease-out' }}
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-gray-200">
                            <button
                                onClick={closeModal}
                                className="absolute top-3 right-3 text-gray-600 hover:text-gray-900 cursor-pointer"
                                type="button"
                            >
                                <i className="fas fa-times fa-lg"></i>
                            </button>
                            <h3 className="text-lg font-semibold text-[#1f2937] select-none">
                                {modalMode === 'add' ? 'Tambah Kelas' : 'Edit Kelas'}
                            </h3>
                        </div>

                        {/* Form content */}
                        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                                {/* Row 1: Nama Kelas, Inisial */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-700 mb-1">Nama Kelas *</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.nama_kelas}
                                            onChange={(e) => setFormData({ ...formData, nama_kelas: e.target.value })}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:border-green-400 focus:outline-none"
                                            placeholder="Contoh: X IPA 1"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-700 mb-1">Inisial *</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.inisial}
                                            onChange={(e) => setFormData({ ...formData, inisial: e.target.value })}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:border-green-400 focus:outline-none"
                                            placeholder="Contoh: XIPA1"
                                        />
                                    </div>
                                </div>

                                {/* Row 2: Tingkat, Status */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-700 mb-1">Tingkat *</label>
                                        <select
                                            required
                                            value={formData.tingkat}
                                            onChange={(e) => setFormData({ ...formData, tingkat: e.target.value })}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:border-green-400 focus:outline-none"
                                        >
                                            <option value="X">X (Kelas 10)</option>
                                            <option value="XI">XI (Kelas 11)</option>
                                            <option value="XII">XII (Kelas 12)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-700 mb-1">Status *</label>
                                        <select
                                            required
                                            value={formData.status}
                                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:border-green-400 focus:outline-none"
                                        >
                                            <option value="Aktif">Aktif</option>
                                            <option value="Tidak Aktif">Tidak Aktif</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Row 3: Wali Kelas, Kapasitas */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-700 mb-1">Wali Kelas</label>
                                        <select
                                            value={formData.wali_kelas_id}
                                            onChange={(e) => setFormData({ ...formData, wali_kelas_id: e.target.value })}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:border-green-400 focus:outline-none"
                                        >
                                            <option value="">-- Pilih Wali Kelas --</option>
                                            {guruList.filter(g => g.status === 'Aktif').map(guru => (
                                                <option key={guru.id} value={guru.id}>{guru.nama}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-700 mb-1">Kapasitas</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="100"
                                            value={formData.kapasitas}
                                            onChange={(e) => setFormData({ ...formData, kapasitas: parseInt(e.target.value) || 36 })}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:border-green-400 focus:outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex justify-end gap-3 rounded-b-2xl">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2 rounded border border-green-600 text-green-700 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-400 cursor-pointer"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded bg-green-700 text-white hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-400 cursor-pointer"
                                >
                                    {modalMode === 'add' ? 'Simpan' : 'Perbarui'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* CSS Animation Keyframes */}
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
        </div>
    );
}

export default ManajemenKelas;
