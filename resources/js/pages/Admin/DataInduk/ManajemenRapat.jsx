import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import CrudModal from '../../../components/CrudModal';
import { API_BASE, APP_BASE, authFetch } from '../../../config/api';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import Pagination from '../../../components/Pagination';
import SignatureCanvas from '../../../components/SignatureCanvas';


function ManajemenRapat() {
    const [data, setData] = useState([]);
    const [selectedItems, setSelectedItems] = useState(new Set());
    const [guruList, setGuruList] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    const [tahunAjaranId, setTahunAjaranId] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [currentItem, setCurrentItem] = useState(null);

    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [formData, setFormData] = useState({
        agenda_rapat: '',
        jenis_rapat: 'Rutin',
        pimpinan: '',
        sekretaris: '',
        pimpinan_id: null,
        sekretaris_id: null,
        peserta_rapat: [],
        peserta_eksternal: [],
        tanggal: '',
        waktu_mulai: '09:00',
        waktu_selesai: '11:00',
        tempat: '',
        status: 'Dijadwalkan'
    });

    const [pimpinanSearch, setPimpinanSearch] = useState('');
    const [sekretarisSearch, setSekretarisSearch] = useState('');
    const [pesertaSearch, setPesertaSearch] = useState('');
    const [showPimpinanDropdown, setShowPimpinanDropdown] = useState(false);
    const [showSekretarisDropdown, setShowSekretarisDropdown] = useState(false);
    const [showPesertaDropdown, setShowPesertaDropdown] = useState(false);

    const pimpinanDropdownRef = useRef(null);
    const sekretarisDropdownRef = useRef(null);
    const pesertaDropdownRef = useRef(null);

    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState('asc');

    const [filterJenis, setFilterJenis] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [activeFilter, setActiveFilter] = useState(null);

    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [expandedRows, setExpandedRows] = useState(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const [showAbsensiModal, setShowAbsensiModal] = useState(false);
    const [absensiData, setAbsensiData] = useState(null);
    const [loadingAbsensi, setLoadingAbsensi] = useState(false);

    const toggleRowExpand = (idx) => {
        setExpandedRows(prev => {
            const next = new Set(prev);
            if (next.has(idx)) next.delete(idx);
            else next.add(idx);
            return next;
        });
    };

    const addGuest = () => {
        setFormData(prev => ({
            ...prev,
            peserta_eksternal: [
                ...prev.peserta_eksternal,
                { nama: '', jabatan: '', ttd: null }
            ]
        }));
    };

    const removeGuest = (index) => {
        setFormData(prev => ({
            ...prev,
            peserta_eksternal: prev.peserta_eksternal.filter((_, i) => i !== index)
        }));
    };

    const updateGuest = (index, field, value) => {
        setFormData(prev => {
            const updated = [...prev.peserta_eksternal];
            updated[index] = { ...updated[index], [field]: value };
            return { ...prev, peserta_eksternal: updated };
        });
    };

    const jenisRapatList = ['Rutin', 'Koordinasi', 'Darurat', 'Evaluasi'];
    const statusList = ['Dijadwalkan', 'Berlangsung', 'Selesai', 'Dibatalkan'];

    const fetchData = async (tahunId = tahunAjaranId) => {
        try {
            setLoading(true);
            const rapatUrl = tahunId ? `${API_BASE}/rapat?tahun_ajaran_id=${tahunId}` : `${API_BASE}/rapat`;
            const [rapatRes, guruRes] = await Promise.all([
                authFetch(rapatUrl),
                authFetch(`${API_BASE}/guru`)
            ]);
            setData((await rapatRes.json()).data || []);
            setGuruList((await guruRes.json()).data || []);
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
        const handleClick = (e) => {
            setActiveFilter(null);
            if (pimpinanDropdownRef.current && !pimpinanDropdownRef.current.contains(e.target)) setShowPimpinanDropdown(false);
            if (sekretarisDropdownRef.current && !sekretarisDropdownRef.current.contains(e.target)) setShowSekretarisDropdown(false);
            if (pesertaDropdownRef.current && !pesertaDropdownRef.current.contains(e.target)) setShowPesertaDropdown(false);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
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

    const sortData = (dataToSort, column, direction) => {
        if (!column) return dataToSort;
        const dir = direction === 'asc' ? 1 : -1;
        return [...dataToSort].sort((a, b) => {
            let aVal = a[column] || '';
            let bVal = b[column] || '';
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
            if (filterJenis && item.jenis_rapat !== filterJenis) return false;
            if (filterStatus && item.status !== filterStatus) return false;
            if (!search) return true;
            const s = search.toLowerCase();
            return (
                item.agenda_rapat?.toLowerCase().includes(s) ||
                item.pimpinan?.toLowerCase().includes(s) ||
                item.tempat?.toLowerCase().includes(s)
            );
        });
        if (sortColumn) result = sortData(result, sortColumn, sortDirection);
        return result;
    })();

    const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);

    useEffect(() => {
        setCurrentPage(1);
        setSelectedItems(new Set());
    }, [search, filterJenis, filterStatus]);

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

    const handleBulkDelete = async (force = false) => {
        if (selectedItems.size === 0) return;

        if (!force) {
            const result = await Swal.fire({
                title: `Hapus ${selectedItems.size} agenda rapat?`,
                text: 'Data yang dihapus tidak dapat dikembalikan!',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#dc2626',
                cancelButtonColor: '#6b7280',
                confirmButtonText: 'Ya, Hapus Semua!',
                cancelButtonText: 'Batal'
            });
            if (!result.isConfirmed) return;
        }

        try {
            const response = await authFetch(`${API_BASE}/rapat/bulk-delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ ids: Array.from(selectedItems), force })
            });

            if (response.ok) {
                setSelectedItems(new Set());
                fetchData();
                Swal.fire({ icon: 'success', title: 'Terhapus!', text: `${selectedItems.size} agenda rapat telah dibersihkan`, timer: 1500, showConfirmButton: false });
            } else {
                const errData = await response.json().catch(() => null);
                if (errData?.requires_force) {
                    const forceResult = await Swal.fire({ title: 'Data Terkait Ditemukan!', html: `<p>${errData.message}</p>`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc2626', cancelButtonColor: '#6b7280', confirmButtonText: '⚠️ Hapus Paksa', cancelButtonText: 'Batal' });
                    if (forceResult.isConfirmed) handleBulkDelete(true);
                } else {
                    Swal.fire({ icon: 'error', title: 'Gagal!', text: errData?.message || 'Terjadi kesalahan' });
                }
            }
        } catch (error) {
            console.error('Error bulk delete:', error);
        }
    };

    // Export PDF
    const [pdfLoading, setPdfLoading] = useState(false);
    const handleExportPdf = async () => {
        try {
            setPdfLoading(true);
            const response = await authFetch(`${API_BASE}/export-pdf/rapat`);
            if (!response.ok) throw new Error('Gagal mengunduh PDF');
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Rapat_${new Date().toISOString().split('T')[0]}.pdf`;
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
            'Agenda': item.agenda_rapat,
            'Jenis': item.jenis_rapat,
            'Tanggal': item.tanggal,
            'Waktu': `${item.waktu_mulai} - ${item.waktu_selesai}`,
            'Tempat': item.tempat,
            'Pimpinan': item.pimpinan,
            'Status': item.status
        }));
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Data Rapat');
        XLSX.writeFile(wb, `Rapat_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const openAddModal = () => {
        setModalMode('add');
        setFormData({
            agenda_rapat: '',
            jenis_rapat: 'Rutin',
            pimpinan: '',
            sekretaris: '',
            pimpinan_id: null,
            sekretaris_id: null,
            peserta_rapat: [],
            peserta_eksternal: [],
            tanggal: '',
            waktu_mulai: '09:00',
            waktu_selesai: '11:00',
            tempat: '',
            status: 'Dijadwalkan'
        });
        setPimpinanSearch('');
        setSekretarisSearch('');
        setPesertaSearch('');
        setShowModal(true);
    };

    const openEditModal = (item) => {
        setModalMode('edit');
        setCurrentItem(item);
        setFormData({
            agenda_rapat: item.agenda_rapat || '',
            jenis_rapat: item.jenis_rapat || 'Rutin',
            pimpinan: item.pimpinan || '',
            sekretaris: item.sekretaris || '',
            pimpinan_id: item.pimpinan_id || null,
            sekretaris_id: item.sekretaris_id || null,
            peserta_rapat: (item.peserta_rapat || []).map(p => typeof p === 'object' ? p.id : p).filter(Boolean),
            peserta_eksternal: Array.isArray(item.peserta_eksternal) ? item.peserta_eksternal : [],
            tanggal: item.tanggal ? item.tanggal.substring(0, 10) : '',
            waktu_mulai: (item.waktu_mulai || '09:00').substring(0, 5),
            waktu_selesai: (item.waktu_selesai || '11:00').substring(0, 5),
            tempat: item.tempat || '',
            status: item.status || 'Dijadwalkan'
        });
        setPimpinanSearch(item.pimpinan || '');
        setSekretarisSearch(item.sekretaris || '');
        setPesertaSearch('');
        setShowModal(true);
    };

    const closeModal = () => setShowModal(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const url = modalMode === 'add' ? `${API_BASE}/rapat` : `${API_BASE}/rapat/${currentItem.id}`;
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
                Swal.fire({ icon: 'success', title: 'Berhasil!', text: 'Agenda rapat tersimpan', timer: 1500, showConfirmButton: false });
            } else {
                const errorData = await res.json().catch(() => null);
                const errorMsg = errorData?.message || errorData?.error || `Gagal menyimpan data (${res.status})`;
                Swal.fire({ icon: 'error', title: 'Gagal', text: errorMsg });
            }
        } catch (error) {
            console.error('Error saving:', error);
            Swal.fire({ icon: 'error', title: 'Error', text: 'Terjadi kesalahan jaringan' });
        }
    };

    const handleDelete = async (id, force = false) => {
        if (!force) {
            const result = await Swal.fire({
                title: 'Hapus Rapat?',
                text: 'Data notulensi dan absensi juga akan terhapus!',
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
            const url = force ? `${API_BASE}/rapat/${id}?force=true` : `${API_BASE}/rapat/${id}`;
            const res = await authFetch(url, { method: 'DELETE', headers: { 'Accept': 'application/json' } });
            if (res.ok) {
                Swal.fire({ icon: 'success', title: 'Terhapus!', text: 'Rapat telah dihapus', timer: 1500, showConfirmButton: false });
                fetchData();
            } else {
                const errData = await res.json().catch(() => null);
                if (errData?.requires_force) {
                    const forceResult = await Swal.fire({ title: 'Data Terkait Ditemukan!', html: `<p>${errData.message}</p>`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc2626', cancelButtonColor: '#6b7280', confirmButtonText: '⚠️ Hapus Paksa', cancelButtonText: 'Batal' });
                    if (forceResult.isConfirmed) handleDelete(id, true);
                } else {
                    Swal.fire({ icon: 'error', title: 'Gagal', text: errData?.message || 'Gagal menghapus rapat' });
                }
            }
        } catch (error) {
            console.error('Error deleting data:', error);
            Swal.fire('Gagal', 'Terjadi kesalahan saat menghapus data', 'error');
        }
    };

    const handlePrint = (item) => {
        const token = localStorage.getItem('auth_token');
        if (!item.absensi_id) {
            Swal.fire('Info', 'Absensi belum diisi', 'info');
            return;
        }
        const url = `${API_BASE}/guru-panel/print/hasil-rapat/${item.absensi_id}?token=${token}`;
        window.open(url, '_blank');
    };

    const openAbsensiModal = async (item) => {
        setCurrentItem(item);
        try {
            setLoadingAbsensi(true);
            const res = await authFetch(`${API_BASE}/rapat/${item.id}/absensi-admin`);
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

    const togglePeserta = (id) => {
        setFormData(prev => ({
            ...prev,
            peserta_rapat: prev.peserta_rapat.includes(id)
                ? prev.peserta_rapat.filter(pid => pid !== id)
                : [...prev.peserta_rapat, id]
        }));
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

    const filteredGuru = guruList.filter(g => g.nama?.toLowerCase().includes(pesertaSearch.toLowerCase()));

    return (
        <div className="animate-fadeIn flex flex-col flex-grow max-w-full overflow-auto">
            {/* Header */}
            <header className={`${isMobile ? 'mb-3 mobile-sticky-header pt-2 pb-2 px-1' : 'mb-6'}`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="page-header-icon w-12 h-12 bg-gradient-to-br from-primary to-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                            <i className="fas fa-handshake text-white text-xl"></i>
                        </div>
                        <div>
                            <h1 className="page-header-title text-xl font-black text-gray-800 dark:text-dark-text uppercase tracking-tight">Manajemen Rapat</h1>
                            <p className="page-header-subtitle text-xs text-gray-400 mt-0.5 font-medium uppercase tracking-widest">Atur jadwal koordinasi & forum diskusi</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Controls */}
            <div className={`${isMobile ? 'mobile-sticky-header' : ''}`}>
                <div className={`${isMobile ? 'mobile-controls-row bg-gray-50/50 rounded-xl border border-gray-100' : 'flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 p-4 bg-gray-50/50 dark:bg-dark-bg/20 rounded-2xl border border-gray-100 dark:border-dark-border'}`}>
                    <div className={`${isMobile ? 'mobile-search-wrap' : 'flex items-center w-full md:w-[400px]'} relative group`}>
                        <i className={`fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors ${isMobile ? 'text-[10px]' : ''}`}></i>
                        <input
                            aria-label="Cari rapat"
                            className={`w-full !pl-8 pr-2 ${isMobile ? 'py-1.5 text-[10px]' : 'py-3 text-sm'} bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all dark:text-dark-text placeholder-gray-400 shadow-sm`}
                            placeholder={isMobile ? 'Cari...' : 'Cari agenda, pimpinan, atau lokasi...'}
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className={`${isMobile ? 'mobile-btn-group' : 'flex gap-2 flex-wrap md:flex-nowrap items-center'}`}>
                        {selectedItems.size > 0 && (
                            <button onClick={handleBulkDelete} className={`bg-rose-500 text-white rounded-xl flex items-center gap-1 font-black uppercase tracking-widest hover:bg-rose-600 transition-all shadow-lg shadow-rose-200 ${isMobile ? '' : 'px-5 py-2.5 text-[10px]'}`}>
                                <i className="fas fa-trash"></i>
                                <span>({selectedItems.size})</span>
                            </button>
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
                            <i className="fas fa-calendar-plus group-hover:rotate-12 transition-transform"></i>
                            <span>{isMobile ? 'Tambah' : 'Buat Agenda'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Table Section */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="ml-3 text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-widest">Menyinkronkan Forum...</span>
                </div>
            ) : (
                <div className={`bg-white dark:bg-dark-surface rounded-2xl shadow-soft border border-gray-100 dark:border-dark-border ${isMobile ? '' : 'overflow-x-auto scrollbar-hide max-w-full'}`}>
                    <table className={`admin-table ${isMobile ? 'mobile-table-fixed' : 'min-w-[1200px]'}`}>
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
                                {isMobile && <th className="col-expand select-none py-1.5 text-center"></th>}
                                <SortableHeader label="Agenda Rapat" column="agenda_rapat" />
                                {!isMobile && (
                                    <SortableHeader
                                        label="Jenis"
                                        column="jenis_rapat"
                                        filterable
                                        filterOptions={[
                                            { label: 'Semua Jenis', value: '' },
                                            ...jenisRapatList.map(j => ({ label: j, value: j }))
                                        ]}
                                        filterValue={filterJenis}
                                        setFilterValue={setFilterJenis}
                                    />
                                )}
                                <SortableHeader label={isMobile ? 'Jadwal' : 'Jadwal & Lokasi'} column="tanggal" />
                                {!isMobile && <SortableHeader label="Pimpinan" column="pimpinan" />}
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
                                <th className={`select-none ${isMobile ? 'py-1.5 px-0 text-left' : 'py-2.5 px-6 text-center'} text-xs font-black text-gray-400 uppercase tracking-widest`} style={isMobile ? { width: '100px', overflow: 'visible' } : {}}>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.map((item, idx) => (
                                <React.Fragment key={item.id}>
                                    <tr className={`hover:bg-gray-50/50 dark:hover:bg-dark-bg/20 transition-colors border-b border-gray-100 dark:border-dark-border last:border-0 group ${selectedItems.has(item.id) ? 'bg-primary/5 dark:bg-primary/10' : ''}`}>
                                        {!isMobile && (
                                            <td className={`pl-6 ${isMobile ? 'py-1.5' : 'py-2.5'} align-middle text-center`}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedItems.has(item.id)}
                                                    onChange={() => handleSelectItem(item.id)}
                                                    className="w-4 h-4 rounded border-gray-300 dark:border-dark-border text-primary focus:ring-primary cursor-pointer"
                                                />
                                            </td>
                                        )}
                                        {!isMobile && (
                                            <td className={`${isMobile ? 'py-1.5' : 'py-2.5'} align-middle text-center text-xs font-bold text-gray-400 dark:text-gray-500`}>
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
                                            <div className="flex flex-col">
                                                <span className={`${isMobile ? 'text-[8px] leading-tight' : 'text-xs'} font-black text-gray-700 dark:text-dark-text group-hover:text-primary transition-colors uppercase tracking-tight ${isMobile ? 'whitespace-normal break-words' : ''}`}>{item.agenda_rapat}</span>
                                                <span className={`${isMobile ? 'text-[7px]' : 'text-[8px]'} text-gray-400 font-medium italic`}>Pimpinan: {item.pimpinan || '-'}</span>
                                            </div>
                                        </td>
                                        {!isMobile && (
                                            <td className="py-2.5 px-2 align-middle">
                                                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${item.jenis_rapat === 'Darurat' ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400' :
                                                    item.jenis_rapat === 'Evaluasi' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' :
                                                        'bg-primary/5 text-primary dark:bg-primary/20'
                                                    }`}>
                                                    {item.jenis_rapat}
                                                </span>
                                            </td>
                                        )}
                                        <td className={`${isMobile ? 'py-1 px-1' : 'py-2.5 px-2'} align-middle`}>
                                            <div className="flex flex-col gap-0.5">
                                                <div className={`flex items-center gap-1 ${isMobile ? 'text-[8px]' : 'text-[11px]'} font-bold text-gray-600 dark:text-gray-400`}>
                                                    <i className={`far fa-calendar-alt ${isMobile ? 'text-[7px]' : 'text-[9px]'} text-primary flex-shrink-0`}></i>
                                                    {item.tanggal ? item.tanggal.substring(0, 10) : '-'}
                                                </div>
                                                <div className={`flex items-center gap-1 ${isMobile ? 'text-[7px]' : 'text-[11px]'} text-gray-400`}>
                                                    <i className={`far fa-clock ${isMobile ? 'text-[6px]' : 'text-[9px]'} text-gray-300 flex-shrink-0`}></i>
                                                    {item.waktu_mulai || '00:00'} - {item.waktu_selesai || '00:00'}
                                                </div>
                                            </div>
                                        </td>
                                        {!isMobile && (
                                            <td className="py-2.5 px-2 align-middle">
                                                <span className="text-[11px] font-bold text-gray-600 dark:text-dark-text uppercase">{item.pimpinan}</span>
                                            </td>
                                        )}
                                        {!isMobile && (
                                            <td className="py-2.5 px-2 align-middle">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${item.status === 'Berlangsung' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' :
                                                    item.status === 'Selesai' ? 'bg-gray-50 text-gray-500 dark:bg-dark-bg/50 dark:text-gray-400' :
                                                        item.status === 'Dibatalkan' ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400' :
                                                            'bg-primary/5 text-primary dark:bg-primary/20'
                                                    }`}>
                                                    {item.status === 'Berlangsung' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>}
                                                    {item.status}
                                                </span>
                                            </td>
                                        )}
                                        <td className={`${isMobile ? 'py-1 px-0' : 'py-2.5 px-6'} align-middle text-center`} style={isMobile ? { overflow: 'visible' } : {}}>
                                            <div className={`flex items-center ${isMobile ? 'justify-start flex-nowrap gap-px' : 'justify-center gap-1'}`}>
                                                <button onClick={() => openAbsensiModal(item)} className={`${isMobile ? 'w-4 h-4' : 'w-8 h-8'} flex-shrink-0 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-all flex items-center justify-center`} title="Absensi">
                                                    <i className={`fas fa-clipboard-check ${isMobile ? 'text-[6px]' : 'text-[10px]'}`}></i>
                                                </button>
                                                {item.has_absensi && (
                                                    <button onClick={() => handlePrint(item)} className={`${isMobile ? 'w-4 h-4' : 'w-8 h-8'} flex-shrink-0 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all flex items-center justify-center`} title="Print">
                                                        <i className={`fas fa-print ${isMobile ? 'text-[6px]' : 'text-[10px]'}`}></i>
                                                    </button>
                                                )}
                                                <button onClick={() => openEditModal(item)} className={`${isMobile ? 'w-4 h-4' : 'w-8 h-8'} flex-shrink-0 rounded bg-orange-50 text-orange-600 hover:bg-orange-100 transition-all flex items-center justify-center`} title="Edit">
                                                    <i className={`fas fa-edit ${isMobile ? 'text-[6px]' : 'text-[10px]'}`}></i>
                                                </button>
                                                <button onClick={() => handleDelete(item.id)} className={`${isMobile ? 'w-4 h-4' : 'w-8 h-8'} flex-shrink-0 rounded bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all flex items-center justify-center`} title="Hapus">
                                                    <i className={`fas fa-trash ${isMobile ? 'text-[6px]' : 'text-[10px]'}`}></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    {isMobile && expandedRows.has(idx) && (
                                        <tr className="bg-gray-50/50 dark:bg-dark-bg/30 border-b border-gray-100 dark:border-dark-border animate-slideDown">
                                            <td colSpan="3" className="p-0">
                                                <div className="mobile-expand-grid">
                                                    <div className="expand-item"><span className="expand-label">Jenis</span><span className={`expand-value px-1.5 py-0.5 rounded-lg text-[8px] font-black uppercase ${item.jenis_rapat === 'Darurat' ? 'bg-rose-50 text-rose-600' : item.jenis_rapat === 'Evaluasi' ? 'bg-amber-50 text-amber-600' : 'bg-primary/5 text-primary'}`}>{item.jenis_rapat}</span></div>
                                                    <div className="expand-item"><span className="expand-label">Pimpinan</span><span className="expand-value">{item.pimpinan || '-'}</span></div>
                                                    <div className="expand-item">
                                                        <span className="expand-label">Status</span>
                                                        <span className={`expand-value px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase ${item.status === 'Berlangsung' ? 'bg-emerald-50 text-emerald-600' : item.status === 'Selesai' ? 'bg-gray-50 text-gray-500' : item.status === 'Dibatalkan' ? 'bg-rose-50 text-rose-600' : 'bg-primary/5 text-primary'}`}>{item.status}</span>
                                                    </div>
                                                    <div className="expand-item"><span className="expand-label">Tempat</span><span className="expand-value">{item.tempat || 'Internal School'}</span></div>
                                                    <div className="expand-item"><span className="expand-label">Partisipan</span><span className="expand-value">{(item.peserta_rapat || []).length} Internal / {(item.peserta_eksternal || []).length} Eksternal</span></div>
                                                    <div className="expand-item"><span className="expand-label">Sekretaris</span><span className="expand-value">{item.sekretaris || '-'}</span></div>
                                                    <div className="expand-item"><span className="expand-label">Notulen</span><span className="expand-value">{item.notulen || '-'}</span></div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                            {filteredData.length === 0 && (
                                <tr>
                                    <td colSpan={isMobile ? 3 : 8} className="py-24 text-center">
                                        <div className="flex flex-col items-center justify-center gap-4 opacity-40">
                                            <i className="fas fa-handshake text-5xl"></i>
                                            <p className="text-xs font-black uppercase tracking-widest">Belum ada agenda rapat yang dijadwalkan</p>
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
                                {filteredData.length} Rapat Terdata
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
                title={modalMode === 'add' ? 'Jadwalkan Rapat' : 'Perbarui Rapat'}
                subtitle="Atur pimpinan, notulis, dan absensi"
                icon={modalMode === 'add' ? 'plus-circle' : 'edit'}
                onSubmit={handleSubmit}
                submitLabel={modalMode === 'add' ? 'Jadwalkan Sekarang' : 'Simpan Perubahan'}
                maxWidth="max-w-5xl"
            >
                {/* Section 1: Agenda Data */}
                <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-4 px-1">Topik & Klasifikasi</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-1.5 md:col-span-2">
                            <label className="block text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wide">Agenda Utama Rapat *</label>
                            <input required type="text" value={formData.agenda_rapat} onChange={(e) => setFormData({ ...formData, agenda_rapat: e.target.value })} className="input-standard" placeholder="Contoh: Rapat Koordinasi Kesiswaan, Evaluasi Kurikulum..." />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wide">Tipe Rapat</label>
                            <select value={formData.jenis_rapat} onChange={(e) => setFormData({ ...formData, jenis_rapat: e.target.value })} className="input-standard outline-none">
                                {jenisRapatList.map(j => <option key={j} value={j}>{j}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status Agenda</label>
                            <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="input-standard outline-none">
                                {statusList.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Section 2: Logistics */}
                <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-4 px-1">Logistik Pertemuan</label>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                        <div className="space-y-1.5 md:col-span-1">
                            <label className="block text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wide">Tanggal *</label>
                            <input required type="date" value={formData.tanggal} onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })} className="input-standard" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wide">Mulai *</label>
                            <input required type="time" value={formData.waktu_mulai} onChange={(e) => setFormData({ ...formData, waktu_mulai: e.target.value })} className="input-standard" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wide">Selesai *</label>
                            <input required type="time" value={formData.waktu_selesai} onChange={(e) => setFormData({ ...formData, waktu_selesai: e.target.value })} className="input-standard" />
                        </div>
                        <div className="space-y-1.5 relative md:col-span-1">
                            <label className="block text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wide">Lokasi Rapat *</label>
                            <input required type="text" value={formData.tempat} onChange={(e) => setFormData({ ...formData, tempat: e.target.value })} className="input-standard" placeholder="Ruang Rapat, Aula..." />
                        </div>
                    </div>
                </div>

                {/* Section 3: Personnel */}
                <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-4 px-1">Kepemimpinan & Kesekretariatan</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5 relative" ref={pimpinanDropdownRef}>
                            <label className="block text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wide">Pimpinan Sidang *</label>
                            <div className="relative group">
                                <input
                                    type="text"
                                    placeholder="Cari atau Ketik Nama Pimpinan..."
                                    value={pimpinanSearch}
                                    onChange={(e) => { setPimpinanSearch(e.target.value); setFormData({ ...formData, pimpinan: e.target.value }); setShowPimpinanDropdown(true); }}
                                    onFocus={() => setShowPimpinanDropdown(true)}
                                    className="input-standard font-bold"
                                    required
                                />
                            </div>
                            {showPimpinanDropdown && pimpinanSearch && (
                                <div className="absolute z-50 mt-1 w-full bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-xl shadow-xl max-h-48 overflow-y-auto animate-fadeIn">
                                    {guruList.filter(g => g.nama?.toLowerCase().includes(pimpinanSearch.toLowerCase())).map(g => (
                                        <div key={g.id} onClick={() => { setFormData({ ...formData, pimpinan: g.nama, pimpinan_id: g.id }); setPimpinanSearch(g.nama); setShowPimpinanDropdown(false); }} className="px-4 py-2.5 hover:bg-primary/5 cursor-pointer flex flex-col gap-0.5 border-b border-gray-50 dark:border-dark-border last:border-0">
                                            <span className="text-xs font-bold text-gray-700 dark:text-dark-text">{g.nama}</span>
                                            <span className="text-[10px] text-gray-400">{g.jabatan || 'Tenaga Pendidik'}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="space-y-1.5 relative" ref={sekretarisDropdownRef}>
                            <label className="block text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wide">Notulis / Sekretaris *</label>
                            <div className="relative group">
                                <input
                                    type="text"
                                    placeholder="Cari atau Ketik Nama Notulis..."
                                    value={sekretarisSearch}
                                    onChange={(e) => { setSekretarisSearch(e.target.value); setFormData({ ...formData, sekretaris: e.target.value }); setShowSekretarisDropdown(true); }}
                                    onFocus={() => setShowSekretarisDropdown(true)}
                                    className="input-standard font-bold"
                                    required
                                />
                            </div>
                            {showSekretarisDropdown && sekretarisSearch && (
                                <div className="absolute z-50 mt-1 w-full bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-xl shadow-xl max-h-48 overflow-y-auto animate-fadeIn">
                                    {guruList.filter(g => g.nama?.toLowerCase().includes(sekretarisSearch.toLowerCase())).map(g => (
                                        <div key={g.id} onClick={() => { setFormData({ ...formData, sekretaris: g.nama, sekretaris_id: g.id }); setSekretarisSearch(g.nama); setShowSekretarisDropdown(false); }} className="px-4 py-2.5 hover:bg-primary/5 cursor-pointer flex flex-col border-b border-gray-50 dark:border-dark-border last:border-0">
                                            <span className="text-xs font-bold text-gray-700 dark:text-dark-text">{g.nama}</span>
                                            <span className="text-[10px] text-gray-400">{g.jabatan || 'Tenaga Pendidik'}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Section 4: Participants */}
                <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-4 px-1">Daftar Kehadiran Peserta</label>
                    <div className="space-y-5">
                        <div>
                            <label className="block text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Peserta Internal (Guru/Staff)</label>
                            <div className="relative" ref={pesertaDropdownRef}>
                                <button
                                    type="button"
                                    onClick={() => setShowPesertaDropdown(!showPesertaDropdown)}
                                    className="w-full bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl px-4 py-2.5 text-sm text-left focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all flex items-center justify-between shadow-sm hover:border-gray-300 dark:hover:border-gray-600"
                                >
                                    <span className={`truncate mr-2 font-semibold ${formData.peserta_rapat.length === 0 ? 'text-gray-300 dark:text-gray-600' : 'text-gray-700 dark:text-dark-text'}`}>
                                        {formData.peserta_rapat.length === 0 ? 'Pilih peserta guru/staff...' : formData.peserta_rapat.length === guruList.length ? `Semua (${guruList.length})` : `${formData.peserta_rapat.length} dipilih`}
                                    </span>
                                    <i className={`fas fa-chevron-down text-gray-300 transition-transform duration-300 ${showPesertaDropdown ? 'rotate-180 text-primary' : ''}`}></i>
                                </button>

                                {showPesertaDropdown && (
                                    <div className="absolute z-50 mt-2 w-full bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-2xl shadow-2xl max-h-64 overflow-y-auto scrollbar-hide animate-fadeIn ring-1 ring-black/5">
                                        {/* Search */}
                                        <div className="sticky top-0 bg-white dark:bg-dark-surface z-20 p-2 border-b border-gray-50 dark:border-dark-border">
                                            <input
                                                type="text"
                                                placeholder="Cari nama guru..."
                                                value={pesertaSearch}
                                                onChange={(e) => setPesertaSearch(e.target.value)}
                                                className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-gray-50/50 dark:bg-dark-bg/20"
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>
                                        {/* Select All */}
                                        <label className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-primary/5 border-b border-gray-50 dark:border-dark-border sticky top-[52px] bg-white/80 dark:bg-dark-surface/80 backdrop-blur-md z-10">
                                            <input
                                                type="checkbox"
                                                checked={filteredGuru.length > 0 && filteredGuru.every(g => formData.peserta_rapat.includes(g.id))}
                                                onChange={() => {
                                                    const allIds = filteredGuru.map(g => g.id);
                                                    const allSelected = allIds.every(id => formData.peserta_rapat.includes(id));
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        peserta_rapat: allSelected
                                                            ? prev.peserta_rapat.filter(id => !allIds.includes(id))
                                                            : [...new Set([...prev.peserta_rapat, ...allIds])]
                                                    }));
                                                }}
                                                className="w-4 h-4 rounded border-gray-300 dark:border-dark-border text-primary focus:ring-primary cursor-pointer"
                                            />
                                            <span className="text-[11px] font-black text-primary uppercase tracking-wider">
                                                {filteredGuru.length > 0 && filteredGuru.every(g => formData.peserta_rapat.includes(g.id)) ? 'Batal Semua' : 'Pilih Semua'}
                                            </span>
                                            <span className="ml-auto text-[10px] text-gray-400 font-bold">{formData.peserta_rapat.length}/{guruList.length}</span>
                                        </label>
                                        {/* Items */}
                                        <div className="py-1">
                                            {filteredGuru.map(g => (
                                                <label
                                                    key={g.id}
                                                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-bg/50 transition-colors ${formData.peserta_rapat.includes(g.id) ? 'bg-primary/5' : ''}`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.peserta_rapat.includes(g.id)}
                                                        onChange={() => togglePeserta(g.id)}
                                                        className="w-4 h-4 rounded border-gray-300 dark:border-dark-border text-primary focus:ring-primary cursor-pointer transition-all"
                                                    />
                                                    <span className={`text-xs transition-all ${formData.peserta_rapat.includes(g.id) ? 'text-primary font-bold' : 'text-gray-600 dark:text-dark-text font-medium'}`}>
                                                        {g.nama}
                                                    </span>
                                                </label>
                                            ))}
                                            {filteredGuru.length === 0 && (
                                                <div className="py-4 text-center text-xs text-gray-400 italic">Data guru tidak ditemukan...</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4 pt-2">
                            <div className="flex items-center justify-between px-1">
                                <label className="block text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wide">Peserta Eksternal (Tamu/Komite/Wali)</label>
                                <button
                                    type="button"
                                    onClick={addGuest}
                                    className="px-3 py-1 bg-primary text-white text-[10px] font-black uppercase rounded-lg hover:bg-primary/90 transition-all flex items-center gap-1.5"
                                >
                                    <i className="fas fa-plus"></i>
                                    Tambah Tamu
                                </button>
                            </div>

                            <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 scrollbar-hide">
                                {formData.peserta_eksternal.map((guest, idx) => (
                                    <div key={idx} className="p-4 bg-gray-50 dark:bg-dark-bg/20 rounded-2xl border border-gray-100 dark:border-dark-border grid grid-cols-1 md:grid-cols-12 gap-3 items-end group">
                                        <div className="md:col-span-1 flex items-center justify-center pb-2">
                                            <div className="w-8 h-8 bg-white dark:bg-dark-surface rounded-xl border border-gray-100 dark:border-dark-border flex items-center justify-center text-[10px] font-black text-gray-400">
                                                {idx + 1}
                                            </div>
                                        </div>
                                        <div className="md:col-span-5">
                                            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Nama Tamu</label>
                                            <input
                                                type="text"
                                                value={guest.nama}
                                                onChange={(e) => updateGuest(idx, 'nama', e.target.value)}
                                                placeholder="Contoh: Bpk. Ahmad"
                                                className="input-standard !py-2.5"
                                            />
                                        </div>
                                        <div className="md:col-span-5">
                                            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Jabatan / Keterangan</label>
                                            <input
                                                type="text"
                                                value={guest.jabatan}
                                                onChange={(e) => updateGuest(idx, 'jabatan', e.target.value)}
                                                placeholder="Contoh: Komite Sekolah"
                                                className="input-standard !py-2.5"
                                            />
                                        </div>
                                        <div className="md:col-span-1 flex items-center justify-center pb-1">
                                            <button
                                                type="button"
                                                onClick={() => removeGuest(idx)}
                                                className="w-9 h-9 bg-rose-50 dark:bg-rose-900/10 text-rose-500 rounded-xl hover:bg-rose-100 transition-all flex items-center justify-center shadow-sm border border-rose-100 dark:border-rose-900/20"
                                            >
                                                <i className="fas fa-trash-alt text-[11px]"></i>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {formData.peserta_eksternal.length === 0 && (
                                    <div className="py-8 text-center border-2 border-dashed border-gray-100 dark:border-dark-border rounded-2xl">
                                        <i className="fas fa-user-plus text-gray-200 text-3xl mb-3"></i>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Belum ada tamu eksternal</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </CrudModal>

            <style dangerouslySetInnerHTML={{
                __html: `
                .btn-primary { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border-radius: 1rem; transition: all 0.3s; }
                .btn-primary:hover { box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.25); transform: translateY(-1px); }
                .btn-secondary { background-color: white; color: #4b5563; border: 1px solid #e5e7eb; border-radius: 1rem; transition: all 0.2s; }
                .dark .btn-secondary { background-color: #1f2937; border-color: #374151; color: #9ca3af; }
                .input-standard { width: 100%; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 1rem; padding: 0.875rem 1.25rem; font-size: 0.8125rem; font-weight: 700; color: #374151; transition: all 0.2s; }
                .dark .input-standard { background-color: rgba(17, 24, 39, 0.5); border-color: #374151; color: #f3f4f6; }
                .input-standard:focus { outline: none; box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1); border-color: #10b981; background-color: white; }
                .dark .input-standard:focus { background-color: #111827; }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
                .shadow-soft { box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.04); }
                @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-slideDown { animation: slideDown 0.3s ease-out; }
            ` }} />
            {showAbsensiModal && (
                <AbsensiAdminModal
                    show={showAbsensiModal}
                    onClose={() => setShowAbsensiModal(false)}
                    rapat={currentItem}
                    initialData={absensiData}
                    onSuccess={() => {
                        setShowAbsensiModal(false);
                        fetchData();
                    }}
                />
            )}
        </div>
    );
}

function AbsensiAdminModal({ show, onClose, rapat, initialData, onSuccess }) {
    const [formData, setFormData] = useState({
        absensi_peserta: initialData?.absensi_peserta || [],
        notulensi: initialData?.notulensi || '',
        foto_rapat: initialData?.foto_rapat || [],
        peserta_eksternal: initialData?.peserta_eksternal || rapat?.peserta_eksternal || [],
    });
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [activeSignatureIndex, setActiveSignatureIndex] = useState(null);
    const [showSignatureCanvas, setShowSignatureCanvas] = useState(false);
    const [pesertaExpanded, setPesertaExpanded] = useState(true);
    const [tamuExpanded, setTamuExpanded] = useState(false);
    const fileInputRef = useRef(null);

    // Sync formData when initialData changes
    useEffect(() => {
        if (initialData) {
            const rawPE = initialData.peserta_eksternal || rapat?.peserta_eksternal || [];
            const normalizedPE = rawPE.map(g => ({
                ...g,
                ttd: g.ttd || g.tanda_tangan || null,
            }));
            setFormData({
                absensi_peserta: initialData.absensi_peserta || [],
                notulensi: initialData.notulensi || '',
                foto_rapat: initialData.foto_rapat || [],
                peserta_eksternal: normalizedPE,
            });
        }
    }, [initialData]);

    const addGuest = () => {
        setFormData(prev => ({
            ...prev,
            peserta_eksternal: [
                ...prev.peserta_eksternal,
                { nama: '', jabatan: '', ttd: null, status: 'Hadir' }
            ]
        }));
    };

    const removeGuest = (index) => {
        setFormData(prev => ({
            ...prev,
            peserta_eksternal: prev.peserta_eksternal.filter((_, i) => i !== index)
        }));
    };

    const updateGuest = (index, field, value) => {
        setFormData(prev => {
            const updated = [...prev.peserta_eksternal];
            updated[index] = { ...updated[index], [field]: value };
            return { ...prev, peserta_eksternal: updated };
        });
    };

    const openSignatureModal = (index) => {
        setActiveSignatureIndex(index);
        setShowSignatureCanvas(true);
    };

    const handleSaveSignature = (base64) => {
        if (activeSignatureIndex !== null) {
            updateGuest(activeSignatureIndex, 'ttd', base64);
        }
    };

    const handlePhotoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formDataUpload = new FormData();
        formDataUpload.append('foto', file);

        try {
            setUploading(true);
            const res = await authFetch(`${API_BASE}/rapat/absensi/upload-foto`, {
                method: 'POST',
                body: formDataUpload
            });
            const data = await res.json();
            if (data.success) {
                setFormData(prev => ({
                    ...prev,
                    foto_rapat: [...prev.foto_rapat, data.data.path]
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
        setFormData(prev => ({
            ...prev,
            foto_rapat: prev.foto_rapat.filter((_, i) => i !== index)
        }));
    };

    const updateStatus = (index, status) => {
        const updated = [...formData.absensi_peserta];
        updated[index].status = status;
        if (status !== 'I' && status !== 'S') updated[index].keterangan = '';
        setFormData({ ...formData, absensi_peserta: updated });
    };

    const updateKeterangan = (index, keterangan) => {
        const updated = [...formData.absensi_peserta];
        updated[index].keterangan = keterangan;
        setFormData({ ...formData, absensi_peserta: updated });
    };

    const handleSubmit = async (e) => {
        e?.preventDefault();
        try {
            setLoading(true);
            const res = await authFetch(`${API_BASE}/rapat/${rapat.id}/absensi-admin`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (data.success) {
                Swal.fire('Berhasil', 'Absensi berhasil disimpan', 'success');
                onSuccess();
            } else {
                Swal.fire('Gagal', data.error || 'Gagal menyimpan absensi', 'error');
            }
        } catch (error) {
            console.error('Error saving absensi:', error);
            Swal.fire('Error', 'Terjadi kesalahan saat menyimpan absensi', 'error');
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (time) => time ? time.substring(0, 5) : '-';

    const pesertaCounts = {
        hadir: formData.absensi_peserta.filter(p => p.status === 'H').length,
        sakit: formData.absensi_peserta.filter(p => p.status === 'S').length,
        izin: formData.absensi_peserta.filter(p => p.status === 'I').length,
        alpha: formData.absensi_peserta.filter(p => p.status === 'A').length,
    };

    const getRoleBorder = (role) => {
        if (role === 'Pimpinan') return 'border-2 border-purple-200';
        if (role === 'Sekretaris') return 'border-2 border-indigo-200';
        return 'border border-gray-100';
    };

    const getRoleBadge = (role) => {
        if (role === 'Pimpinan') return 'bg-purple-100 text-purple-700';
        if (role === 'Sekretaris') return 'bg-indigo-100 text-indigo-700';
        return '';
    };

    return ReactDOM.createPortal(
        <>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
                <div className="bg-white rounded-2xl w-full max-w-md flex flex-col shadow-2xl overflow-hidden" style={{ maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
                    {/* Gradient Header */}
                    <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 flex-shrink-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><i className="fas fa-gavel"></i></div>
                                <div>
                                    <h2 className="font-bold text-sm">{rapat?.agenda_rapat || 'Absensi Rapat'}</h2>
                                    <p className="text-green-100 text-xs"><i className="fas fa-map-marker-alt mr-1"></i>{rapat?.tempat || '-'} • {rapat?.waktu_mulai ? `${formatTime(rapat.waktu_mulai)} - ${formatTime(rapat.waktu_selesai)}` : '-'}</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-lg"><i className="fas fa-times text-xl"></i></button>
                        </div>
                        <div className="flex gap-4 mt-4 text-center">
                            <div className="flex-1"><p className="text-2xl font-bold">{pesertaCounts.hadir}</p><p className="text-xs text-green-100">Hadir</p></div>
                            <div className="flex-1"><p className="text-2xl font-bold">{pesertaCounts.sakit}</p><p className="text-xs text-green-100">Sakit</p></div>
                            <div className="flex-1"><p className="text-2xl font-bold">{pesertaCounts.izin}</p><p className="text-xs text-green-100">Izin</p></div>
                            <div className="flex-1"><p className="text-2xl font-bold">{pesertaCounts.alpha}</p><p className="text-xs text-green-100">Alpha</p></div>
                        </div>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {/* Kehadiran Peserta Section */}
                        <div>
                            <button type="button" onClick={() => setPesertaExpanded(!pesertaExpanded)} className="w-full flex items-center justify-between py-2 cursor-pointer">
                                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 cursor-pointer">
                                    <i className="fas fa-users text-green-600"></i> Kehadiran Peserta
                                    <span className="ml-1 text-xs font-normal text-gray-400">{formData.absensi_peserta.length} peserta</span>
                                </label>
                                <i className={`fas fa-chevron-${pesertaExpanded ? 'up' : 'down'} text-gray-400 text-xs`}></i>
                            </button>
                            {pesertaExpanded && (
                                <div className="space-y-1.5 mt-1">
                                    {formData.absensi_peserta.map((peserta, idx) => (
                                        <div key={idx} className={`bg-white rounded-lg px-2.5 py-2 ${getRoleBorder(peserta.role)}`}>
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-gray-800 text-xs truncate">{peserta.nama}</p>
                                                    {peserta.role && peserta.role !== 'Peserta' && (
                                                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${getRoleBadge(peserta.role)} mt-0.5`}>{peserta.role}</span>
                                                    )}
                                                </div>
                                                <div className="flex gap-0.5">
                                                    {['H', 'S', 'I', 'A'].map(s => (
                                                        <button key={s} type="button" onClick={() => updateStatus(idx, s)} className={`w-7 h-7 rounded-md text-[10px] font-bold transition-all ${peserta.status === s ? s === 'H' ? 'bg-green-500 text-white' : s === 'S' ? 'bg-orange-500 text-white' : s === 'I' ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}>{s}</button>
                                                    ))}
                                                </div>
                                            </div>
                                            {(peserta.status === 'I' || peserta.status === 'S') && (
                                                <input type="text" value={peserta.keterangan || ''} onChange={e => updateKeterangan(idx, e.target.value)} placeholder={`Keterangan ${peserta.status === 'I' ? 'izin' : 'sakit'}...`} className="w-full mt-1 border border-yellow-200 rounded-md p-1.5 text-xs focus:ring-2 focus:ring-yellow-400 bg-yellow-50" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Tamu Undangan Section */}
                        <div>
                            <button type="button" onClick={() => setTamuExpanded(!tamuExpanded)} className="w-full flex items-center justify-between py-2 cursor-pointer">
                                <label className="text-xs font-semibold text-gray-500 flex items-center gap-1 cursor-pointer">
                                    <i className="fas fa-user-tie text-blue-500"></i> Tamu Undangan ({formData.peserta_eksternal.length})
                                </label>
                                <i className={`fas fa-chevron-${tamuExpanded ? 'up' : 'down'} text-gray-400 text-xs`}></i>
                            </button>
                            {tamuExpanded && (
                                <div className="space-y-1 mt-1">
                                    {formData.peserta_eksternal.map((pe, idx) => (
                                        <div key={idx} className="bg-blue-50 rounded-lg px-2.5 py-1.5 border border-blue-100">
                                            <div className="flex items-center gap-1.5">
                                                <input type="text" value={pe.nama} onChange={(e) => updateGuest(idx, 'nama', e.target.value)} placeholder="Nama" className="flex-1 border border-blue-200 rounded px-2 py-1 text-xs bg-white focus:ring-1 focus:ring-blue-400" />
                                                <input type="text" value={pe.jabatan || ''} onChange={(e) => updateGuest(idx, 'jabatan', e.target.value)} placeholder="Jabatan" className="flex-1 border border-blue-200 rounded px-2 py-1 text-xs bg-white focus:ring-1 focus:ring-blue-400" />
                                                <button type="button" onClick={() => openSignatureModal(idx)} className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 cursor-pointer ${pe.ttd ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-500 hover:bg-indigo-100 hover:text-indigo-600'}`} title="Tanda tangan"><i className="fas fa-pen-fancy text-[10px]"></i></button>
                                                <span className="text-[10px] font-bold bg-green-500 text-white w-6 h-6 rounded flex items-center justify-center flex-shrink-0">H</span>
                                                <button type="button" onClick={() => removeGuest(idx)} className="text-red-400 hover:text-red-600 cursor-pointer flex-shrink-0"><i className="fas fa-times text-xs"></i></button>
                                            </div>
                                            {pe.ttd && <div className="mt-1 bg-white rounded p-1 border border-blue-100"><img src={pe.ttd} alt="TTD" className="h-8 object-contain" /></div>}
                                        </div>
                                    ))}
                                    <button type="button" onClick={addGuest} className="mt-1.5 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer">
                                        <i className="fas fa-plus-circle"></i> Tambah Tamu Undangan
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Notulensi */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Notulensi Rapat</label>
                            <textarea value={formData.notulensi} onChange={e => setFormData({ ...formData, notulensi: e.target.value })} placeholder="Isi notulensi/hasil rapat..." className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-green-400 min-h-[80px] resize-y" />
                        </div>

                        {/* Dokumentasi Rapat */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Dokumentasi Rapat <span className="font-normal text-gray-400 ml-1">({formData.foto_rapat.length} foto)</span></label>
                            {formData.foto_rapat.length > 0 && (
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                    {formData.foto_rapat.map((photo, index) => (
                                        <div key={index} className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
                                            <img src={photo.startsWith('data:image') ? photo : photo.startsWith('http') ? photo : (APP_BASE ? `${APP_BASE}/storage/${photo}` : `/storage/${photo}`)} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
                                            <button type="button" onClick={() => removePhoto(index)} className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"><i className="fas fa-times"></i></button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="space-y-2">
                                {uploading ? (
                                    <div className="flex items-center justify-center gap-2 text-gray-500 py-4">
                                        <i className="fas fa-spinner fa-spin"></i>
                                        <span className="text-sm">Memproses foto...</span>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-2">
                                        <label className="flex flex-col items-center justify-center border-2 border-dashed border-green-300 rounded-xl p-4 cursor-pointer hover:border-green-500 hover:bg-green-50 transition-all bg-green-50/30">
                                            <input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} className="hidden" disabled={uploading} />
                                            <i className="fas fa-camera text-green-500 text-2xl mb-2"></i>
                                            <span className="text-xs font-medium text-green-600">Ambil Foto</span>
                                        </label>
                                        <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-4 cursor-pointer hover:border-green-400 hover:bg-green-50 transition-all">
                                            <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" disabled={uploading} ref={fileInputRef} />
                                            <i className="fas fa-images text-gray-400 text-2xl mb-2"></i>
                                            <span className="text-xs font-medium text-gray-500">Pilih File</span>
                                        </label>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Fixed Footer */}
                    <div className="flex-shrink-0 p-4 border-t border-gray-100 flex gap-3 bg-white">
                        <button type="button" onClick={onClose} className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-600 font-medium hover:bg-gray-50">Batal</button>
                        <button type="button" onClick={handleSubmit} disabled={loading} className={`flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white hover:shadow-lg disabled:opacity-50`}>
                            {loading ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-save"></i>Simpan Absensi</>}
                        </button>
                    </div>
                </div>
            </div>
            <SignatureCanvas
                isOpen={showSignatureCanvas}
                onClose={() => setShowSignatureCanvas(false)}
                onSave={handleSaveSignature}
                title="Tanda Tangan Tamu"
            />
        </>,
        document.body
    );
}

export default ManajemenRapat;
