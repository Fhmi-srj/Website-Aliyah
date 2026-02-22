import React, { useState, useEffect, useRef } from 'react';
import CrudModal from '../../../components/CrudModal';
import DateRangePicker from '../../../components/DateRangePicker';
import { API_BASE, authFetch } from '../../../config/api';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import Pagination from '../../../components/Pagination';

const ITEMS_PER_PAGE_DEFAULT = 10;

function ManajemenKalender() {
    const [data, setData] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedItems, setSelectedItems] = useState(new Set());
    const [modalMode, setModalMode] = useState('add');
    const [currentItem, setCurrentItem] = useState(null);

    const [formData, setFormData] = useState({
        tanggal_mulai: '',
        tanggal_berakhir: '',
        kegiatan: '',
        status_kbm: 'Aktif',
        guru_id: '',
        keterangan: 'Kegiatan',
        tempat: '',
        rab: ''
    });

    const [guruList, setGuruList] = useState([]);
    const [guruSearch, setGuruSearch] = useState('');
    const [showGuruDropdown, setShowGuruDropdown] = useState(false);
    const guruDropdownRef = useRef(null);

    // Sorting state
    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState('asc');

    // Filter state
    const [filterKeterangan, setFilterKeterangan] = useState('');
    const [filterStatusKbm, setFilterStatusKbm] = useState('');
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
            const [calendarRes, guruRes] = await Promise.all([
                authFetch(`${API_BASE}/kalender`),
                authFetch(`${API_BASE}/guru`)
            ]);
            setData((await calendarRes.json()).data || []);
            setGuruList((await guruRes.json()).data || []);
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
        const handleClick = (e) => {
            setActiveFilter(null);
            if (guruDropdownRef.current && !guruDropdownRef.current.contains(e.target)) setShowGuruDropdown(false);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const sortData = (dataToSort, column, direction) => {
        if (!column) return dataToSort;
        const dir = direction === 'asc' ? 1 : -1;
        return [...dataToSort].sort((a, b) => {
            let aVal = a[column] || '';
            let bVal = b[column] || '';
            if (column === 'guru') {
                aVal = a.guru?.nama || '';
                bVal = b.guru?.nama || '';
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

    const filteredData = (() => {
        let result = data.filter(item => {
            if (filterKeterangan && item.keterangan !== filterKeterangan) return false;
            if (filterStatusKbm && item.status_kbm !== filterStatusKbm) return false;
            if (!search) return true;
            const s = search.toLowerCase();
            return (
                item.kegiatan?.toLowerCase().includes(s) ||
                item.guru?.nama?.toLowerCase().includes(s) ||
                item.keterangan?.toLowerCase().includes(s)
            );
        });
        if (sortColumn) result = sortData(result, sortColumn, sortDirection);
        return result;
    })();

    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    useEffect(() => { setCurrentPage(1); }, [search, filterKeterangan, filterStatusKbm]);

    // Export PDF
    const [pdfLoading, setPdfLoading] = useState(false);
    const handleExportPdf = async () => {
        try {
            setPdfLoading(true);
            const response = await authFetch(`${API_BASE}/export-pdf/kalender`);
            if (!response.ok) throw new Error('Gagal mengunduh PDF');
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Kalender_${new Date().toISOString().split('T')[0]}.pdf`;
            link.click();
            setTimeout(() => URL.revokeObjectURL(link.href), 1000);
        } catch (error) {
            console.error('Error export PDF:', error);
            Swal.fire({ icon: 'error', title: 'Gagal!', text: 'Gagal mengunduh PDF', timer: 2000, showConfirmButton: false });
        } finally {
            setPdfLoading(false);
        }
    };

    const handleExport = () => {
        const exportData = filteredData.map((item, idx) => ({
            'No': idx + 1,
            'Tanggal Mulai': item.tanggal_mulai,
            'Tanggal Selesai': item.tanggal_berakhir,
            'Kegiatan': item.kegiatan,
            'Tipe': item.keterangan,
            'Tempat': item.tempat || '',
            'Status KBM': item.status_kbm,
            'Penanggung Jawab': item.guru?.nama || '',
            'RAB': item.rab || ''
        }));
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Kalender Pendidikan');
        XLSX.writeFile(wb, `Kalender_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const openAddModal = () => {
        setModalMode('add');
        setFormData({
            tanggal_mulai: '',
            tanggal_berakhir: '',
            kegiatan: '',
            status_kbm: 'Aktif',
            guru_id: '',
            keterangan: 'Kegiatan',
            tempat: '',
            rab: ''
        });
        setGuruSearch('');
        setShowModal(true);
    };

    const openEditModal = (item) => {
        setModalMode('edit');
        setCurrentItem(item);
        setFormData({
            tanggal_mulai: item.tanggal_mulai ? item.tanggal_mulai.slice(0, 16) : '',
            tanggal_berakhir: item.tanggal_berakhir ? item.tanggal_berakhir.slice(0, 16) : '',
            kegiatan: item.kegiatan || '',
            status_kbm: item.status_kbm || 'Aktif',
            guru_id: item.guru_id || '',
            keterangan: item.keterangan || 'Kegiatan',
            tempat: item.tempat || '',
            rab: item.rab || ''
        });
        setGuruSearch(item.guru?.nama || '');
        setShowModal(true);
    };

    const closeModal = () => setShowModal(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const url = modalMode === 'add' ? `${API_BASE}/kalender` : `${API_BASE}/kalender/${currentItem.id}`;
            const method = modalMode === 'add' ? 'POST' : 'PUT';
            const res = await authFetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                closeModal();
                fetchData();
                Swal.fire({ icon: 'success', title: 'Berhasil!', text: 'Agenda tersimpan', timer: 1500, showConfirmButton: false });
            } else {
                const errData = await res.json().catch(() => null);
                Swal.fire({ icon: 'error', title: 'Gagal', text: errData?.message || 'Gagal menyimpan data' });
            }
        } catch (error) {
            console.error('Error saving:', error);
            Swal.fire({ icon: 'error', title: 'Error', text: 'Terjadi kesalahan jaringan' });
        }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({ title: 'Hapus Agenda?', text: 'Data tidak dapat dikembalikan!', icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc2626', cancelButtonColor: '#6b7280', confirmButtonText: 'Ya, Hapus!', cancelButtonText: 'Batal' });
        if (result.isConfirmed) {
            try {
                const res = await authFetch(`${API_BASE}/kalender/${id}`, { method: 'DELETE', headers: { 'Accept': 'application/json' } });
                if (res.ok) {
                    fetchData();
                    Swal.fire({ icon: 'success', title: 'Terhapus!', text: 'Agenda telah dihapus', timer: 1500, showConfirmButton: false });
                } else {
                    const errData = await res.json().catch(() => null);
                    Swal.fire({ icon: 'error', title: 'Gagal', text: errData?.message || 'Gagal menghapus data' });
                }
            } catch (error) {
                console.error('Error deleting:', error);
                Swal.fire({ icon: 'error', title: 'Error', text: 'Terjadi kesalahan jaringan' });
            }
        }
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
            const response = await authFetch(`${API_BASE}/kalender/bulk-delete`, {
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
            }
        } catch (error) {
            console.error('Error bulk delete:', error);
        }
    };

    const handleBulkUpdateStatus = async () => {
        if (selectedItems.size === 0) return;

        const { value: status } = await Swal.fire({
            title: 'Ganti Status Masal',
            input: 'select',
            inputOptions: {
                'Aktif': 'Aktif',
                'Libur': 'Libur / Tidak Aktif'
            },
            inputPlaceholder: 'Pilih Status',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            confirmButtonText: 'Simpan',
            cancelButtonText: 'Batal'
        });

        if (!status) return;

        try {
            const response = await authFetch(`${API_BASE}/kalender/bulk-status-kbm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({
                    ids: Array.from(selectedItems),
                    status_kbm: status
                })
            });

            if (response.ok) {
                const data = await response.json();
                setSelectedItems(new Set());
                fetchData();
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil!',
                    text: data.message,
                    timer: 1500,
                    showConfirmButton: false
                });
            }
        } catch (error) {
            console.error('Error bulk status update:', error);
            Swal.fire('Error', 'Gagal memperbarui status', 'error');
        }
    };

    const handleBulkUpdateType = async () => {
        if (selectedItems.size === 0) return;

        const { value: keterangan } = await Swal.fire({
            title: 'Ganti Tipe Masal',
            input: 'select',
            inputOptions: {
                'Kegiatan': 'Kegiatan',
                'Keterangan': 'Keterangan'
            },
            inputPlaceholder: 'Pilih Tipe',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            confirmButtonText: 'Simpan',
            cancelButtonText: 'Batal'
        });

        if (!keterangan) return;

        try {
            const response = await authFetch(`${API_BASE}/kalender/bulk-keterangan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({
                    ids: Array.from(selectedItems),
                    keterangan: keterangan
                })
            });

            if (response.ok) {
                const data = await response.json();
                setSelectedItems(new Set());
                fetchData();
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil!',
                    text: data.message,
                    timer: 1500,
                    showConfirmButton: false
                });
            }
        } catch (error) {
            console.error('Error bulk type update:', error);
            Swal.fire('Error', 'Gagal memperbarui tipe', 'error');
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

    const filteredGuru = guruList.filter(g => g.nama?.toLowerCase().includes(guruSearch.toLowerCase()));

    const formatCurrency = (val) => {
        if (!val) return 'Rp 0';
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
    };

    return (
        <div className="animate-fadeIn flex flex-col flex-grow max-w-full overflow-auto text-gray-700 dark:text-dark-text">
            {/* Header */}
            <header className={`${isMobile ? 'mb-3 mobile-sticky-header pt-2 pb-2 px-1' : 'mb-6'}`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="page-header-icon w-12 h-12 bg-gradient-to-br from-primary to-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                            <i className="fas fa-calendar-day text-white text-xl"></i>
                        </div>
                        <div>
                            <h1 className="page-header-title text-xl font-black text-gray-800 dark:text-dark-text uppercase tracking-tight">Kalender Pendidikan</h1>
                            <p className="page-header-subtitle text-xs text-gray-400 mt-0.5 font-medium uppercase tracking-widest">Agenda kegiatan & hari libur sekolah</p>
                        </div>
                    </div>
                </div>
            </header>

            <div className={`${isMobile ? 'mobile-sticky-header' : ''}`}>
                <div className={`${isMobile ? 'mobile-controls-row bg-gray-50/50 rounded-xl border border-gray-100' : 'flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 p-4 bg-gray-50/50 dark:bg-dark-bg/20 rounded-2xl border border-gray-100 dark:border-dark-border'}`}>
                    <div className={`${isMobile ? 'mobile-search-wrap' : 'flex items-center w-full md:w-[400px]'} relative group`}>
                        <i className={`fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors ${isMobile ? 'text-[10px]' : ''}`}></i>
                        <input
                            aria-label="Cari agenda"
                            className={`w-full !pl-8 pr-2 ${isMobile ? 'py-1.5 text-[10px]' : 'py-3 text-sm'} bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all dark:text-dark-text placeholder-gray-400 shadow-sm`}
                            placeholder={isMobile ? 'Cari...' : 'Cari nama kegiatan...'}
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className={`${isMobile ? 'mobile-btn-group' : 'flex gap-2 flex-wrap md:flex-nowrap items-center'}`}>
                        {selectedItems.size > 0 && (
                            <div className="flex gap-1 animate-slideDown">
                                <button onClick={handleBulkDelete} className={`bg-rose-500 text-white rounded-xl flex items-center gap-1 font-black uppercase tracking-widest hover:bg-rose-600 transition-all shadow-lg shadow-rose-200 ${isMobile ? 'px-2 py-1 text-[8px]' : 'px-5 py-2.5 text-[10px]'}`}>
                                    <i className="fas fa-trash"></i>
                                    <span>({selectedItems.size})</span>
                                </button>
                                <button onClick={handleBulkUpdateStatus} className={`bg-amber-500 text-white rounded-xl flex items-center gap-1 font-black uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-amber-200 ${isMobile ? 'px-2 py-1 text-[8px]' : 'px-5 py-2.5 text-[10px]'}`}>
                                    <i className="fas fa-sync-alt"></i>
                                    <span>({selectedItems.size})</span>
                                </button>
                                <button onClick={handleBulkUpdateType} className={`bg-blue-500 text-white rounded-xl flex items-center gap-1 font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg shadow-blue-200 ${isMobile ? 'px-2 py-1 text-[8px]' : 'px-5 py-2.5 text-[10px]'}`}>
                                    <i className="fas fa-tags"></i>
                                    <span>({selectedItems.size})</span>
                                </button>
                            </div>
                        )}
                        <button onClick={handleExportPdf} disabled={pdfLoading} className={`btn-secondary flex items-center gap-1 font-black uppercase tracking-widest ${isMobile ? '' : 'px-5 py-2.5 text-[10px] rounded-xl'}`} type="button" title="Download PDF">
                            <i className={`fas ${pdfLoading ? 'fa-spinner fa-spin' : 'fa-file-pdf'}`}></i>
                            <span>PDF</span>
                        </button>
                        <button onClick={handleExport} className={`btn-secondary flex items-center gap-1 font-black uppercase tracking-widest ${isMobile ? '' : 'px-5 py-2.5 text-[10px] rounded-xl'}`}>
                            <i className="fas fa-file-export"></i>
                            <span>Export</span>
                        </button>
                        <button onClick={openAddModal} className={`btn-primary flex items-center gap-1 group shadow-lg shadow-primary/20 font-black uppercase tracking-widest ${isMobile ? '' : 'px-4 py-2.5 text-[10px] rounded-xl'}`}>
                            <i className="fas fa-plus group-hover:rotate-90 transition-transform"></i>
                            <span>{isMobile ? 'Tambah' : 'Tambah Agenda'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Table Section */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="ml-3 text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-widest">Memetakan Waktu...</span>
                </div>
            ) : (
                <div className={`bg-white dark:bg-dark-surface rounded-2xl shadow-soft border border-gray-100 dark:border-dark-border ${isMobile ? 'overflow-hidden' : 'overflow-x-auto scrollbar-hide max-w-full'}`}>
                    <table className={`admin-table ${isMobile ? 'mobile-table-fixed' : 'min-w-[1000px]'}`}>
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
                                {isMobile && <th className="col-expand select-none py-2.5 text-center"></th>}
                                <SortableHeader label="Mulai" column="tanggal_mulai" />
                                {!isMobile && <SortableHeader label="Berakhir" column="tanggal_berakhir" />}
                                <SortableHeader label="Nama Kegiatan" column="kegiatan" />
                                {!isMobile && (
                                    <SortableHeader
                                        label="Tipe"
                                        column="keterangan"
                                        filterable
                                        filterOptions={[
                                            { label: 'Semua Tipe', value: '' },
                                            { label: 'Kegiatan', value: 'Kegiatan' },
                                            { label: 'Keterangan', value: 'Keterangan' }
                                        ]}
                                        filterValue={filterKeterangan}
                                        setFilterValue={setFilterKeterangan}
                                    />
                                )}
                                {!isMobile && (
                                    <SortableHeader
                                        label="Status KBM"
                                        column="status_kbm"
                                        filterable
                                        filterOptions={[
                                            { label: 'Semua Status', value: '' },
                                            { label: 'Aktif', value: 'Aktif' },
                                            { label: 'Libur', value: 'Libur' }
                                        ]}
                                        filterValue={filterStatusKbm}
                                        setFilterValue={setFilterStatusKbm}
                                    />
                                )}
                                {!isMobile && <SortableHeader label="Penanggung Jawab" column="guru" />}
                                <th className="select-none py-2.5 text-center text-xs font-black text-gray-400 uppercase tracking-widest px-6">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.map((item, idx) => (
                                <React.Fragment key={item.id}>
                                    <tr className={`hover:bg-gray-50/50 dark:hover:bg-dark-bg/20 transition-colors border-b border-gray-100 dark:border-dark-border last:border-0 group ${selectedItems.has(item.id) ? 'bg-primary/5 dark:bg-primary/10' : ''}`}>
                                        {!isMobile && (
                                            <td className="pl-6 py-2.5 align-middle text-center">
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
                                        <td className={`${isMobile ? 'py-1 px-1' : 'py-2.5 px-2'} align-middle`}>
                                            {isMobile ? (
                                                <div className="flex flex-col">
                                                    <span className="text-[8px] font-black text-gray-700 dark:text-dark-text uppercase tracking-tight leading-tight">{item.tanggal_mulai ? item.tanggal_mulai.substring(0, 10).split('-').reverse().join('-') : '-'}</span>
                                                    <span className="text-[7px] text-gray-400 font-medium">{item.tanggal_mulai ? item.tanggal_mulai.substring(11, 16) : ''}</span>
                                                </div>
                                            ) : (
                                                <span className="text-xs font-black text-gray-700 dark:text-dark-text uppercase tracking-tight">{formatDateTime(item.tanggal_mulai)}</span>
                                            )}
                                        </td>
                                        {!isMobile && (
                                            <td className="py-2.5 px-2 align-middle whitespace-nowrap">
                                                <span className="text-xs font-black text-gray-700 dark:text-dark-text uppercase tracking-tight">{item.tanggal_berakhir ? formatDateTime(item.tanggal_berakhir) : '-'}</span>
                                            </td>
                                        )}
                                        <td className={`${isMobile ? 'py-1 px-1' : 'py-2.5 px-2'} align-middle`}>
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`${isMobile ? 'text-[8px] leading-tight whitespace-normal break-words' : 'text-sm'} font-black text-gray-700 dark:text-dark-text group-hover:text-primary transition-colors uppercase tracking-tight`}>{item.kegiatan}</span>
                                                    {!isMobile && item.kegiatan_id && (
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-500 dark:bg-indigo-900/20 dark:text-indigo-400 text-[9px] font-black uppercase" title="Terhubung ke Manajemen Kegiatan">
                                                            <i className="fas fa-link text-[8px]"></i>
                                                            Kegiatan
                                                        </span>
                                                    )}
                                                </div>
                                                {item.tempat && (
                                                    <span className={`${isMobile ? 'text-[7px]' : 'text-[10px]'} text-gray-400 font-medium`}>
                                                        <i className="fas fa-map-marker-alt text-[9px] mr-1"></i>
                                                        {item.tempat}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        {!isMobile && (
                                            <td className="py-2.5 px-2 align-middle whitespace-nowrap">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${item.keterangan === 'Keterangan' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' :
                                                    'bg-primary/5 text-primary dark:bg-primary/20 dark:text-primary-light'
                                                    }`}>
                                                    {item.keterangan}
                                                </span>
                                            </td>
                                        )}
                                        {!isMobile && (
                                            <td className="py-2.5 px-2 align-middle whitespace-nowrap">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${item.status_kbm === 'Aktif'
                                                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
                                                    : 'bg-gray-50 text-gray-400 dark:bg-dark-bg/40 dark:text-gray-600'
                                                    }`}>
                                                    {item.status_kbm === 'Aktif' && <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>}
                                                    {item.status_kbm}
                                                </span>
                                            </td>
                                        )}
                                        {!isMobile && (
                                            <td className="py-2.5 px-2 align-middle whitespace-nowrap">
                                                <span className="text-xs font-bold text-gray-600 dark:text-dark-text uppercase">{item.guru?.nama || '-'}</span>
                                            </td>
                                        )}
                                        <td className={`${isMobile ? 'py-1 px-2' : 'py-2.5 px-6'} align-middle text-center`}>
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => openEditModal(item)} className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} rounded-xl bg-orange-50 text-orange-600 hover:bg-orange-100 transition-all flex items-center justify-center dark:bg-orange-900/20 dark:text-orange-400 hover:scale-110 active:scale-95`} title="Edit Data">
                                                    <i className={`fas fa-edit ${isMobile ? 'text-[8px]' : 'text-[10px]'}`}></i>
                                                </button>
                                                <button onClick={() => handleDelete(item.id)} className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all flex items-center justify-center dark:bg-rose-900/20 dark:text-rose-400 hover:scale-110 active:scale-95`} title="Hapus Data">
                                                    <i className={`fas fa-trash ${isMobile ? 'text-[8px]' : 'text-[10px]'}`}></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    {isMobile && expandedRows.has(idx) && (
                                        <tr className="bg-gray-50/50 dark:bg-dark-bg/30 border-b border-gray-100 dark:border-dark-border">
                                            <td colSpan="4" className="p-0">
                                                <div className="mobile-expand-grid">
                                                    <div className="expand-item"><span className="expand-label">Berakhir</span><span className="expand-value">{item.tanggal_berakhir ? formatDateTime(item.tanggal_berakhir) : '-'}</span></div>
                                                    <div className="expand-item"><span className="expand-label">Tipe</span><span className="expand-value">{item.keterangan}</span></div>
                                                    <div className="expand-item"><span className="expand-label">Status KBM</span><span className="expand-value">{item.status_kbm}</span></div>
                                                    <div className="expand-item"><span className="expand-label">PJ</span><span className="expand-value">{item.guru?.nama || '-'}</span></div>
                                                    {item.tempat && <div className="expand-item"><span className="expand-label">Tempat</span><span className="expand-value">{item.tempat}</span></div>}
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
                            <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                                {filteredData.length} Agenda Terfilter
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
                title={modalMode === 'add' ? 'Agenda Baru' : 'Perbarui Agenda'}
                subtitle="Konfigurasi hari dan rincian kegiatan"
                icon={modalMode === 'add' ? 'plus' : 'edit'}
                onSubmit={handleSubmit}
                submitLabel={modalMode === 'add' ? 'Jadwalkan Agenda' : 'Simpan Agenda'}
                maxWidth="max-w-2xl"
            >
                {/* Sync notice for linked kegiatan */}
                {modalMode === 'edit' && currentItem?.kegiatan_id && (
                    <div className="flex items-start gap-3 p-3.5 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 rounded-xl">
                        <i className="fas fa-link text-indigo-500 mt-0.5"></i>
                        <div>
                            <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300">Terhubung ke Manajemen Kegiatan</p>
                            <p className="text-[10px] text-indigo-500 dark:text-indigo-400 mt-0.5">Perubahan nama, tanggal, tempat & PJ akan otomatis tersinkronisasi ke halaman Kegiatan.</p>
                        </div>
                    </div>
                )}
                <DateRangePicker
                    startDate={formData.tanggal_mulai}
                    endDate={formData.tanggal_berakhir}
                    onStartChange={(val) => setFormData(prev => ({ ...prev, tanggal_mulai: val }))}
                    onEndChange={(val) => setFormData(prev => ({ ...prev, tanggal_berakhir: val }))}
                    label="Penjadwalan"
                />
                <div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5 md:col-span-2">
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Nama Kegiatan / Agenda *</label>
                            <input type="text" required value={formData.kegiatan} onChange={(e) => setFormData({ ...formData, kegiatan: e.target.value })} className="input-standard" placeholder="Contoh: Rapat Wali Murid, Libur Semester..." />
                        </div>
                        <div className="space-y-1.5 md:col-span-2">
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Tempat / Lokasi</label>
                            <input type="text" value={formData.tempat} onChange={(e) => setFormData({ ...formData, tempat: e.target.value })} className="input-standard" placeholder="Aula Utama, Lapangan, dll..." />
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-4 px-1">Klasifikasi & Penanggung Jawab</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Tipe Agenda</label>
                            <select value={formData.keterangan} onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })} className="input-standard outline-none">
                                <option value="Kegiatan">Kegiatan</option>
                                <option value="Keterangan">Keterangan</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Status KBM</label>
                            <select value={formData.status_kbm} onChange={(e) => setFormData({ ...formData, status_kbm: e.target.value })} className="input-standard outline-none">
                                <option value="Aktif">Aktif (Tetap Belajar)</option>
                                <option value="Libur">Libur / Tidak Aktif</option>
                            </select>
                        </div>
                        <div className="space-y-1.5 relative md:col-span-2" ref={guruDropdownRef}>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Penanggung Jawab (Opsional)</label>
                            <div className="relative group">
                                <input
                                    type="text"
                                    placeholder="Cari Nama Guru PJ..."
                                    value={guruSearch}
                                    onChange={(e) => { setGuruSearch(e.target.value); setShowGuruDropdown(true); }}
                                    onFocus={() => setShowGuruDropdown(true)}
                                    className="input-standard font-bold"
                                />
                            </div>
                            {showGuruDropdown && (
                                <div className="absolute z-50 mt-1 w-full bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-xl shadow-xl max-h-48 overflow-y-auto animate-fadeIn">
                                    {filteredGuru.map(g => (
                                        <div key={g.id} onClick={() => { setFormData({ ...formData, guru_id: g.id }); setGuruSearch(g.nama); setShowGuruDropdown(false); }} className="px-4 py-2.5 hover:bg-primary/5 cursor-pointer flex flex-col gap-0.5 border-b border-gray-50 dark:border-dark-border last:border-0 border-r-4 border-r-transparent hover:border-r-primary transition-all">
                                            <span className="text-xs font-bold text-gray-700 dark:text-dark-text uppercase">{g.nama}</span>
                                            <span className="text-[10px] text-gray-400 font-medium tracking-wider">{g.nip || 'NIP -'}</span>
                                        </div>
                                    ))}
                                    {filteredGuru.length === 0 && <div className="px-4 py-3 text-xs text-gray-400 italic">Guru tidak ditemukan...</div>}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-4 px-1">Estimasi Anggaran</label>
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nilai RAB (IDR)</label>
                        <input type="number" value={formData.rab} onChange={(e) => setFormData({ ...formData, rab: e.target.value })} className="input-standard" placeholder="0" />
                    </div>
                </div>
            </CrudModal>

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
                @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-slideDown { animation: slideDown 0.3s ease-out; }
            ` }} />
        </div>
    );
}

export default ManajemenKalender;
