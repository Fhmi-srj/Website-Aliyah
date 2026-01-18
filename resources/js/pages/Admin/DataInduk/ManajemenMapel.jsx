import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { API_BASE, authFetch } from '../../../config/api';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import Pagination from '../../../components/Pagination';

const ITEMS_PER_PAGE = 10;

function ManajemenMapel() {
    const [data, setData] = useState([]);
    const [guruList, setGuruList] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [currentItem, setCurrentItem] = useState(null);
    const [isModalClosing, setIsModalClosing] = useState(false);
    const [formData, setFormData] = useState({
        nama_mapel: '',
        inisial: '',
        kode_mapel: '',
        tingkat: 'Semua',
        guru_pengampu_id: '',
        kkm: 75,
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
            const response = await authFetch(`${API_BASE}/mapel`);
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
            if (column === 'guru_pengampu') {
                valA = a.guru_pengampu?.nama || '';
                valB = b.guru_pengampu?.nama || '';
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
            if (filterTingkat && item.tingkat !== filterTingkat) return false;
            if (filterStatus && item.status !== filterStatus) return false;
            if (!search) return true;
            const s = search.toLowerCase();
            return (
                item.nama_mapel?.toLowerCase().includes(s) ||
                item.inisial?.toLowerCase().includes(s) ||
                item.kode_mapel?.toLowerCase().includes(s) ||
                item.guru_pengampu?.nama?.toLowerCase().includes(s)
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
    }, [search, filterTingkat, filterStatus]);

    // Render status badge
    const renderStatus = (status) => {
        const isAktif = status?.toLowerCase() === 'aktif';
        return (
            <span className={`inline-flex items-center gap-1 font-semibold text-[11px] ${isAktif ? 'status-aktif' : 'status-tidak-aktif'}`}>
                <span className="status-bullet"></span>{status}
            </span>
        );
    };

    // SortableHeader component
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

    // Modal functions
    const openAddModal = () => {
        setModalMode('add');
        setFormData({
            nama_mapel: '',
            inisial: '',
            kode_mapel: '',
            tingkat: 'Semua',
            guru_pengampu_id: '',
            kkm: 75,
            status: 'Aktif'
        });
        setShowModal(true);
    };

    const openEditModal = (item) => {
        setModalMode('edit');
        setCurrentItem(item);
        setFormData({
            nama_mapel: item.nama_mapel || '',
            inisial: item.inisial || '',
            kode_mapel: item.kode_mapel || '',
            tingkat: item.tingkat || 'Semua',
            guru_pengampu_id: item.guru_pengampu_id || '',
            kkm: item.kkm || 75,
            status: item.status || 'Aktif'
        });
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
            const url = modalMode === 'add' ? `${API_BASE}/mapel` : `${API_BASE}/mapel/${currentItem.id}`;
            const method = modalMode === 'add' ? 'POST' : 'PUT';
            const response = await authFetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    guru_pengampu_id: formData.guru_pengampu_id || null
                })
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
                Swal.fire({ icon: 'error', title: 'Gagal', text: error.message || 'Terjadi kesalahan', timer: 2000, showConfirmButton: false });
            }
        } catch (error) {
            console.error('Error saving:', error);
            Swal.fire({ icon: 'error', title: 'Gagal', text: 'Gagal menyimpan data', timer: 2000, showConfirmButton: false });
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
            cancelButtonText: 'Batal'
        });
        if (!result.isConfirmed) return;

        try {
            const response = await authFetch(`${API_BASE}/mapel/${id}`, {
                method: 'DELETE',
                headers: { 'Accept': 'application/json' }
            });
            if (response.ok) {
                fetchData();
                Swal.fire({ icon: 'success', title: 'Terhapus!', text: 'Data berhasil dihapus', timer: 1500, showConfirmButton: false });
            }
        } catch (error) {
            console.error('Error deleting:', error);
            Swal.fire({ icon: 'error', title: 'Gagal', text: 'Gagal menghapus data', timer: 2000, showConfirmButton: false });
        }
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

                let successCount = 0;
                for (const row of jsonData) {
                    const mapelData = {
                        nama_mapel: row['Nama Mapel'] || row['nama_mapel'] || '',
                        inisial: row['Inisial'] || row['inisial'] || '',
                        kode_mapel: row['Kode Mapel'] || row['kode_mapel'] || '',
                        tingkat: row['Tingkat'] || row['tingkat'] || 'Semua',
                        kkm: parseInt(row['KKM'] || row['kkm']) || 75,
                        status: row['Status'] || row['status'] || 'Aktif'
                    };
                    if (mapelData.nama_mapel && mapelData.inisial) {
                        try {
                            await authFetch(`${API_BASE}/mapel`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                                body: JSON.stringify(mapelData)
                            });
                            successCount++;
                        } catch (err) {
                            console.error('Error importing row:', err);
                        }
                    }
                }
                fetchData();
                Swal.fire({ icon: 'success', title: 'Import Berhasil', text: `${successCount} data berhasil diimport`, timer: 2000, showConfirmButton: false });
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
            'Nama Mapel': item.nama_mapel,
            'Inisial': item.inisial,
            'Kode Mapel': item.kode_mapel || '',
            'Tingkat': item.tingkat,
            'Guru Pengampu': item.guru_pengampu?.nama || '-',
            'KKM': item.kkm,
            'Status': item.status
        }));
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Data Mapel');
        XLSX.writeFile(wb, `Data_Mapel_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return (
        <div className="animate-fadeIn flex flex-col flex-grow max-w-full overflow-auto">
            <header className="mb-4">
                <h1 className="text-[#1f2937] font-semibold text-lg mb-1 select-none">Manajemen Mata Pelajaran</h1>
                <p className="text-[11px] text-[#6b7280] select-none">Kelola data mata pelajaran sekolah</p>
            </header>

            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-4">
                <div className="flex items-center w-full md:w-1/3 border border-[#d1d5db] rounded-md px-3 py-1 text-[12px] focus-within:ring-1 focus-within:ring-green-400">
                    <input
                        className="w-full border-none focus:ring-0 focus:outline-none bg-transparent"
                        placeholder="Cari mapel..."
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
                        <i className="fas fa-plus"></i> Tambah Mapel
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
                    <table className={`w-full text-[12px] text-[#4a4a4a] border-separate border-spacing-y-[2px] ${isMobile ? '' : 'min-w-[900px]'}`}>
                        <thead>
                            <tr className="text-left text-[#6b7280] select-none">
                                <th className="select-none pl-3 py-2 px-3 whitespace-nowrap">No</th>
                                {isMobile && <th className="select-none py-2 px-2 text-center whitespace-nowrap"></th>}
                                <SortableHeader label="Nama Mapel" column="nama_mapel" />
                                <SortableHeader label="Inisial" column="inisial" />
                                {!isMobile && <SortableHeader label="Kode" column="kode_mapel" />}
                                {!isMobile && (
                                    <SortableHeader
                                        label="Tingkat"
                                        column="tingkat"
                                        filterable
                                        filterOptions={[
                                            { label: 'Semua', value: '' },
                                            { label: 'X', value: 'X' },
                                            { label: 'XI', value: 'XI' },
                                            { label: 'XII', value: 'XII' },
                                            { label: 'Semua Tingkat', value: 'Semua' }
                                        ]}
                                        filterValue={filterTingkat}
                                        setFilterValue={setFilterTingkat}
                                    />
                                )}
                                {!isMobile && <SortableHeader label="Guru Pengampu" column="guru_pengampu" />}
                                {!isMobile && <SortableHeader label="KKM" column="kkm" />}
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
                                        <td className="py-2 px-3 align-middle select-none whitespace-nowrap">{item.nama_mapel}</td>
                                        <td className="py-2 px-3 align-middle select-none whitespace-nowrap">{item.inisial}</td>
                                        {!isMobile && <td className="py-2 px-3 align-middle select-none whitespace-nowrap">{item.kode_mapel || '-'}</td>}
                                        {!isMobile && <td className="py-2 px-3 align-middle select-none whitespace-nowrap">{item.tingkat}</td>}
                                        {!isMobile && <td className="py-2 px-3 align-middle select-none whitespace-nowrap">{item.guru_pengampu?.nama || '-'}</td>}
                                        {!isMobile && <td className="py-2 px-3 align-middle select-none whitespace-nowrap">{item.kkm}</td>}
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
                                                    <div><strong>Kode:</strong> {item.kode_mapel || '-'}</div>
                                                    <div><strong>Tingkat:</strong> {item.tingkat}</div>
                                                    <div><strong>Guru Pengampu:</strong> {item.guru_pengampu?.nama || '-'}</div>
                                                    <div><strong>KKM:</strong> {item.kkm}</div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                            {filteredData.length === 0 && (
                                <tr>
                                    <td colSpan={isMobile ? 6 : 9} className="text-center py-8 text-gray-500">
                                        {search || filterTingkat || filterStatus ? 'Tidak ada data yang sesuai filter/pencarian' : 'Belum ada data mata pelajaran'}
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
                                {modalMode === 'add' ? 'Tambah Data Mapel' : 'Edit Data Mapel'}
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
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1 select-none">Nama Mapel *</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.nama_mapel}
                                            onChange={(e) => setFormData({ ...formData, nama_mapel: e.target.value })}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-green-400 focus:border-green-400"
                                            placeholder="Matematika"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1 select-none">Inisial *</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.inisial}
                                            onChange={(e) => setFormData({ ...formData, inisial: e.target.value })}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-green-400 focus:border-green-400"
                                            placeholder="MTK"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1 select-none">Kode Mapel</label>
                                        <input
                                            type="text"
                                            value={formData.kode_mapel}
                                            onChange={(e) => setFormData({ ...formData, kode_mapel: e.target.value })}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-green-400 focus:border-green-400"
                                            placeholder="MAT001"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1 select-none">Tingkat *</label>
                                        <select
                                            required
                                            value={formData.tingkat}
                                            onChange={(e) => setFormData({ ...formData, tingkat: e.target.value })}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-green-400 focus:border-green-400"
                                        >
                                            <option value="X">X</option>
                                            <option value="XI">XI</option>
                                            <option value="XII">XII</option>
                                            <option value="Semua">Semua</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1 select-none">Guru Pengampu</label>
                                        <select
                                            value={formData.guru_pengampu_id}
                                            onChange={(e) => setFormData({ ...formData, guru_pengampu_id: e.target.value })}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-green-400 focus:border-green-400"
                                        >
                                            <option value="">-- Pilih Guru --</option>
                                            {guruList.filter(g => g.status === 'Aktif').map(guru => (
                                                <option key={guru.id} value={guru.id}>{guru.nama}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1 select-none">KKM *</label>
                                        <input
                                            type="number"
                                            required
                                            min="0"
                                            max="100"
                                            value={formData.kkm}
                                            onChange={(e) => setFormData({ ...formData, kkm: parseInt(e.target.value) || 0 })}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-green-400 focus:border-green-400"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1 select-none">Status *</label>
                                        <select
                                            required
                                            value={formData.status}
                                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-green-400 focus:border-green-400"
                                        >
                                            <option value="Aktif">Aktif</option>
                                            <option value="Tidak Aktif">Tidak Aktif</option>
                                        </select>
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

export default ManajemenMapel;
