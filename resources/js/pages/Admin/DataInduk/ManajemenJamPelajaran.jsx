import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { API_BASE, authFetch } from '../../../config/api';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import Pagination from '../../../components/Pagination';

const ITEMS_PER_PAGE_DEFAULT = 10;

function ManajemenJamPelajaran() {
    const [data, setData] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [currentItem, setCurrentItem] = useState(null);
    const [isModalClosing, setIsModalClosing] = useState(false);
    const [formData, setFormData] = useState({
        jam_ke: '',
        jam_mulai: '07:00',
        jam_selesai: '07:45',
        keterangan: '',
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
            const response = await authFetch(`${API_BASE}/jam-pelajaran`);
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

    // Sorting function
    const sortData = (dataToSort, column, direction) => {
        if (!column) return dataToSort;
        return [...dataToSort].sort((a, b) => {
            let valA = a[column];
            let valB = b[column];
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();
            if (valA < valB) return direction === 'asc' ? -1 : 1;
            if (valA > valB) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    };

    const handleSort = (column) => {
        if (sortColumn === column) {
            if (sortDirection === 'asc') {
                setSortDirection('desc');
            } else if (sortDirection === 'desc') {
                setSortColumn(null);
                setSortDirection('asc');
            }
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    // Filtering and searching
    const filteredData = (() => {
        let result = data.filter(item => {
            if (filterStatus && item.status !== filterStatus) return false;
            return true;
        });

        if (search) {
            const s = search.toLowerCase();
            result = result.filter(item =>
                item.jam_ke?.toLowerCase().includes(s) ||
                item.jam_mulai?.toLowerCase().includes(s) ||
                item.jam_selesai?.toLowerCase().includes(s) ||
                item.keterangan?.toLowerCase().includes(s)
            );
        }
        return sortData(result, sortColumn, sortDirection);
    })();

    // Pagination logic
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Reset to page 1 when filter/search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [search, filterStatus]);

    // Format time display
    const formatTime = (time) => {
        if (!time) return '-';
        return time.substring(0, 5);
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

    const openAddModal = () => {
        setModalMode('add');
        setCurrentItem(null);
        setFormData({
            jam_ke: '',
            jam_mulai: '07:00',
            jam_selesai: '07:45',
            keterangan: '',
            status: 'Aktif'
        });
        setShowModal(true);
    };

    const openEditModal = (item) => {
        setModalMode('edit');
        setCurrentItem(item);
        setFormData({
            jam_ke: item.jam_ke || '',
            jam_mulai: formatTime(item.jam_mulai),
            jam_selesai: formatTime(item.jam_selesai),
            keterangan: item.keterangan || '',
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
            const url = modalMode === 'add' ? `${API_BASE}/jam-pelajaran` : `${API_BASE}/jam-pelajaran/${currentItem.id}`;
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
                    text: modalMode === 'add' ? 'Data jam pelajaran berhasil ditambahkan' : 'Data jam pelajaran berhasil diperbarui',
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
            const response = await authFetch(`${API_BASE}/jam-pelajaran/${id}`, {
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

    // Export to Excel
    const handleExport = () => {
        const exportData = filteredData.map((item, idx) => ({
            'No': idx + 1,
            'Jam Ke': item.jam_ke,
            'Jam Mulai': formatTime(item.jam_mulai),
            'Jam Selesai': formatTime(item.jam_selesai),
            'Keterangan': item.keterangan || '',
            'Status': item.status
        }));
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Jam Pelajaran');
        const today = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(wb, `Data_Jam_Pelajaran_${today}.xlsx`);
    };

    // Import from Excel
    const handleImport = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const wb = XLSX.read(evt.target.result, { type: 'binary' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 });

                // Find header row
                let headerRowIndex = 0;
                for (let i = 0; i < Math.min(5, jsonData.length); i++) {
                    const row = jsonData[i];
                    if (row && row.some(cell => typeof cell === 'string' && cell.toLowerCase().includes('jam'))) {
                        headerRowIndex = i;
                        break;
                    }
                }

                const headers = jsonData[headerRowIndex].map(h => String(h).toLowerCase().trim());
                const dataRows = jsonData.slice(headerRowIndex + 1);

                const findCol = (keywords) => headers.findIndex(h => keywords.some(k => h.includes(k)));
                const colJamKe = findCol(['jam ke', 'jam_ke', 'no']);
                const colJamMulai = findCol(['mulai', 'jam_mulai']);
                const colJamSelesai = findCol(['selesai', 'jam_selesai']);
                const colKeterangan = findCol(['keterangan', 'ket']);
                const colStatus = findCol(['status']);

                let successCount = 0;
                let failCount = 0;

                for (const row of dataRows) {
                    if (!row || row.length === 0) continue;
                    const jam_ke = row[colJamKe] ? String(row[colJamKe]).trim() : '';
                    const jam_mulai = row[colJamMulai] ? String(row[colJamMulai]).trim() : '';
                    const jam_selesai = row[colJamSelesai] ? String(row[colJamSelesai]).trim() : '';
                    const keterangan = colKeterangan >= 0 ? String(row[colKeterangan] || '').trim() : '';
                    const status = colStatus >= 0 && row[colStatus] ? String(row[colStatus]).trim() : 'Aktif';

                    if (!jam_ke || !jam_mulai || !jam_selesai) continue;

                    try {
                        const response = await authFetch(`${API_BASE}/jam-pelajaran`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                            body: JSON.stringify({ jam_ke, jam_mulai, jam_selesai, keterangan, status })
                        });
                        if (response.ok) successCount++;
                        else failCount++;
                    } catch (err) {
                        failCount++;
                    }
                }

                fetchData();
                Swal.fire({
                    icon: successCount > 0 ? 'success' : 'warning',
                    title: 'Import Selesai',
                    html: `Berhasil: ${successCount} data<br/>Gagal: ${failCount} data`,
                    timer: 3000,
                    showConfirmButton: false
                });
            } catch (error) {
                console.error('Import error:', error);
                Swal.fire({ icon: 'error', title: 'Gagal', text: 'Gagal membaca file Excel', timer: 2000, showConfirmButton: false });
            }
        };
        reader.readAsBinaryString(file);
        e.target.value = '';
    };

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

    return (
        <div className="animate-fadeIn flex flex-col flex-grow max-w-full overflow-auto">
            {/* Header */}
            <header className="mb-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary to-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                            <i className="fas fa-clock text-white text-xl"></i>
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-gray-800 dark:text-dark-text uppercase tracking-tight">
                                Jam Pelajaran
                            </h1>
                            <p className="text-xs text-gray-400 mt-0.5 font-medium uppercase tracking-widest">
                                Atur jadwal dan durasi jam belajar
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
                        aria-label="Cari jam pelajaran"
                        className="w-full pl-11 pr-4 py-3 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all dark:text-dark-text placeholder-gray-400 shadow-sm"
                        placeholder="Cari jam ke atau keterangan..."
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 flex-wrap md:flex-nowrap items-center">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImport}
                        accept=".xlsx,.xls"
                        className="hidden"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
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
                        <span>Tambah Jam</span>
                    </button>
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <i className="fas fa-spinner fa-spin text-green-600 text-2xl"></i>
                </div>
            ) : (
                <div className="overflow-x-auto scrollbar-hide max-w-full bg-white dark:bg-dark-surface rounded-2xl shadow-soft border border-gray-100 dark:border-dark-border">
                    <table className={`admin-table ${isMobile ? '' : 'min-w-[600px]'}`}>
                        <thead>
                            <tr>
                                <th className="select-none pl-6 py-4 w-10 text-center">No</th>
                                {isMobile && <th className="select-none py-4 text-center"></th>}
                                <SortableHeader label="Jam Ke" column="jam_ke" />
                                <SortableHeader label="Waktu" column="jam_mulai" />
                                {!isMobile && <SortableHeader label="Keterangan" column="keterangan" />}
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
                                <th className="select-none py-4 text-center whitespace-nowrap">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.map((item, idx) => (
                                <React.Fragment key={item.id}>
                                    <tr className="hover:bg-gray-50/50 dark:hover:bg-dark-bg/20 transition-colors border-b border-gray-100 dark:border-dark-border last:border-0 group">
                                        <td className="pl-6 py-4 align-middle text-center text-xs font-bold text-gray-400 dark:text-gray-500">
                                            {(currentPage - 1) * itemsPerPage + idx + 1}
                                        </td>
                                        {isMobile && (
                                            <td
                                                className="py-4 align-middle text-center cursor-pointer px-2"
                                                onClick={() => toggleRowExpand(idx)}
                                            >
                                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${expandedRows.has(idx) ? 'bg-primary/10 text-primary' : 'bg-gray-100 dark:bg-dark-border text-gray-400'}`}>
                                                    <i className={`fas fa-${expandedRows.has(idx) ? 'minus' : 'plus'} text-[10px]`}></i>
                                                </div>
                                            </td>
                                        )}
                                        <td className="py-4 px-2 align-middle whitespace-nowrap">
                                            <span className="text-sm font-black text-gray-700 dark:text-dark-text group-hover:text-primary transition-colors uppercase tracking-tight">
                                                Jam Ke-{item.jam_ke}
                                            </span>
                                        </td>
                                        <td className="py-4 px-2 align-middle whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                                    <i className="fas fa-clock text-xs"></i>
                                                </div>
                                                <span className="text-xs font-bold text-gray-600 dark:text-dark-text tracking-tight uppercase">
                                                    {formatTime(item.jam_mulai)} — {formatTime(item.jam_selesai)}
                                                </span>
                                            </div>
                                        </td>
                                        {!isMobile && (
                                            <td className="py-4 px-2 align-middle max-w-[200px]">
                                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 line-clamp-1 italic">
                                                    {item.keterangan || '-'}
                                                </p>
                                            </td>
                                        )}
                                        <td className="py-4 px-2 align-middle whitespace-nowrap">
                                            {renderStatus(item.status)}
                                        </td>
                                        <td className="py-4 px-6 align-middle text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => openEditModal(item)}
                                                    className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-100 transition-all flex items-center justify-center dark:bg-amber-900/20 dark:text-amber-400 hover:scale-110 active:scale-95"
                                                    title="Edit Data"
                                                >
                                                    <i className="fas fa-edit text-[10px]"></i>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all flex items-center justify-center dark:bg-rose-900/20 dark:text-rose-400 hover:scale-110 active:scale-95"
                                                    title="Hapus Data"
                                                >
                                                    <i className="fas fa-trash text-[10px]"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    {isMobile && expandedRows.has(idx) && (
                                        <tr className="bg-gray-50/50 dark:bg-dark-bg/30">
                                            <td colSpan="6" className="px-6 py-4">
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between text-[11px]">
                                                        <span className="font-black text-gray-400 uppercase tracking-widest">Keterangan:</span>
                                                        <span className="font-bold text-gray-600 dark:text-dark-text italic">{item.keterangan || '-'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                            {filteredData.length === 0 && (
                                <tr>
                                    <td colSpan={isMobile ? 6 : 6} className="py-20 text-center">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="w-16 h-16 bg-gray-50 dark:bg-dark-bg/20 rounded-2xl flex items-center justify-center">
                                                <i className="fas fa-calendar-times text-2xl text-gray-300 dark:text-gray-600"></i>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-400 dark:text-gray-500">Data Jam Pelajaran Kosong</p>
                                                <p className="text-[11px] text-gray-400 mt-1 uppercase tracking-widest font-medium">
                                                    {search || filterStatus
                                                        ? 'Tidak ada data yang sesuai filter/pencarian Anda'
                                                        : 'Belum ada data jam pelajaran yang tersedia'}
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
                                Total {filteredData.length} Jam Pelajaran
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

            {/* Modal with Portal */}
            {showModal && ReactDOM.createPortal(
                <div
                    className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 backdrop-blur-sm ${isModalClosing ? 'opacity-0' : 'opacity-100'}`}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
                    onClick={closeModal}
                >
                    <div
                        className={`bg-white dark:bg-dark-surface rounded-3xl shadow-2xl max-w-md w-full flex flex-col relative overflow-hidden transform transition-all duration-300 ${isModalClosing ? 'scale-95 translate-y-4 opacity-0' : 'scale-100 translate-y-0 opacity-100'}`}
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
                                    <i className={`fas fa-${modalMode === 'add' ? 'plus' : 'edit'} text-lg`}></i>
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold">
                                        {modalMode === 'add' ? 'Tambah Jam Baru' : 'Perbarui Jam'}
                                    </h2>
                                    <p className="text-xs text-white/80 mt-0.5 italic">Detail waktu pelaksanaan kegiatan belajar</p>
                                </div>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Informasi Waktu</label>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Jam Ke *</label>
                                        <input
                                            type="text"
                                            value={formData.jam_ke}
                                            onChange={(e) => setFormData({ ...formData, jam_ke: e.target.value })}
                                            className="input-standard"
                                            placeholder="Contoh: 1, 2, atau Istirahat"
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Jam Mulai *</label>
                                            <div className="relative">
                                                <i className="fas fa-clock absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                                                <input
                                                    type="time"
                                                    value={formData.jam_mulai}
                                                    onChange={(e) => setFormData({ ...formData, jam_mulai: e.target.value })}
                                                    className="input-standard pl-10"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Jam Selesai *</label>
                                            <div className="relative">
                                                <i className="fas fa-clock absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                                                <input
                                                    type="time"
                                                    value={formData.jam_selesai}
                                                    onChange={(e) => setFormData({ ...formData, jam_selesai: e.target.value })}
                                                    className="input-standard pl-10"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Tambahan</label>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Keterangan</label>
                                        <input
                                            type="text"
                                            value={formData.keterangan}
                                            onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                                            className="input-standard"
                                            placeholder="Opsional (Contoh: Jam Istirahat)"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Status Keaktifan *</label>
                                        <select
                                            value={formData.status}
                                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                            className="input-standard outline-none cursor-pointer"
                                        >
                                            <option value="Aktif">Aktif</option>
                                            <option value="Tidak Aktif">Tidak Aktif</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-dark-border">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-dark-surface transition-all text-xs font-black uppercase tracking-widest"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary flex-1 px-4 py-2.5 rounded-xl shadow-lg shadow-primary/20 text-xs font-black uppercase tracking-widest"
                                >
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

export default ManajemenJamPelajaran;
