import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { API_BASE, APP_BASE, authFetch } from '../../../config/api';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import Pagination from '../../../components/Pagination';
import SignatureCanvas from '../../../components/SignatureCanvas';


function ManajemenRapat() {
    const [data, setData] = useState([]);
    const [guruList, setGuruList] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    const [tahunAjaranId, setTahunAjaranId] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [currentItem, setCurrentItem] = useState(null);
    const [isModalClosing, setIsModalClosing] = useState(false);
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

    useEffect(() => { setCurrentPage(1); }, [search, filterJenis, filterStatus]);

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
        setIsModalClosing(false);
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
            peserta_rapat: (item.peserta_rapat || []).map(p => p.id),
            peserta_eksternal: item.peserta_eksternal || [],
            tanggal: item.tanggal || '',
            waktu_mulai: item.waktu_mulai || '09:00',
            waktu_selesai: item.waktu_selesai || '11:00',
            tempat: item.tempat || '',
            status: item.status || 'Dijadwalkan'
        });
        setPimpinanSearch(item.pimpinan || '');
        setSekretarisSearch(item.sekretaris || '');
        setPesertaSearch('');
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
            }
        } catch (error) { console.error('Error saving:', error); }
    };

    const handleDelete = async (id) => {
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

        if (result.isConfirmed) {
            try {
                const res = await authFetch(`${API_BASE}/rapat/${id}`, { method: 'DELETE', headers: { 'Accept': 'application/json' } });
                if (res.ok) {
                    Swal.fire({ icon: 'success', title: 'Terhapus!', text: 'Rapat telah dihapus', timer: 1500, showConfirmButton: false });
                    fetchData();
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
        <th className="select-none py-4 px-2 cursor-pointer whitespace-nowrap group" onClick={() => !filterable && handleSort(column)}>
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
            <header className="mb-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary to-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                            <i className="fas fa-handshake text-white text-xl"></i>
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-gray-800 dark:text-dark-text uppercase tracking-tight">Manajemen Rapat</h1>
                            <p className="text-xs text-gray-400 mt-0.5 font-medium uppercase tracking-widest">Atur jadwal koordinasi & forum diskusi</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 bg-gray-50/50 dark:bg-dark-bg/20 p-4 rounded-2xl border border-gray-100 dark:border-dark-border">
                <div className="flex items-center w-full md:w-[400px] relative group">
                    <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors"></i>
                    <input
                        aria-label="Cari rapat"
                        className="w-full pl-11 pr-4 py-3 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all dark:text-dark-text placeholder-gray-400 shadow-sm"
                        placeholder="Cari agenda, pimpinan, atau lokasi..."
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 flex-wrap md:flex-nowrap items-center">
                    <button onClick={handleExport} className="btn-secondary px-5 py-2.5 flex items-center gap-2 font-black text-[10px] uppercase tracking-widest">
                        <i className="fas fa-file-export"></i>
                        <span>Export</span>
                    </button>
                    <button onClick={openAddModal} className="btn-primary px-6 py-2.5 flex items-center gap-2 group shadow-lg shadow-primary/20 font-black text-[10px] uppercase tracking-widest">
                        <i className="fas fa-plus group-hover:rotate-90 transition-transform"></i>
                        <span>Buat Agenda</span>
                    </button>
                </div>
            </div>

            {/* Table Section */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="ml-3 text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-widest">Menyinkronkan Forum...</span>
                </div>
            ) : (
                <div className="overflow-x-auto scrollbar-hide max-w-full bg-white dark:bg-dark-surface rounded-2xl shadow-soft border border-gray-100 dark:border-dark-border">
                    <table className={`admin-table ${isMobile ? '' : 'min-w-[1200px]'}`}>
                        <thead>
                            <tr>
                                <th className="select-none pl-8 py-4 w-10 text-center text-xs font-black text-gray-400 uppercase tracking-widest">No</th>
                                {isMobile && <th className="select-none py-4 text-center"></th>}
                                <SortableHeader label="Agenda Rapat" column="agenda_rapat" />
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
                                <SortableHeader label="Jadwal & Lokasi" column="tanggal" />
                                <SortableHeader label="Pimpinan" column="pimpinan" />
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
                                <th className="select-none py-4 text-center text-xs font-black text-gray-400 uppercase tracking-widest px-6">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.map((item, idx) => (
                                <React.Fragment key={item.id}>
                                    <tr className="hover:bg-gray-50/50 dark:hover:bg-dark-bg/20 transition-colors border-b border-gray-100 dark:border-dark-border last:border-0 group">
                                        <td className="pl-8 py-4 align-middle text-center text-xs font-bold text-gray-400 dark:text-gray-500">
                                            {(currentPage - 1) * itemsPerPage + idx + 1}
                                        </td>
                                        {isMobile && (
                                            <td className="py-4 align-middle text-center cursor-pointer px-2" onClick={() => toggleRowExpand(idx)}>
                                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${expandedRows.has(idx) ? 'bg-primary/10 text-primary' : 'bg-gray-100 dark:bg-dark-border text-gray-400'}`}>
                                                    <i className={`fas fa-${expandedRows.has(idx) ? 'minus' : 'plus'} text-[10px]`}></i>
                                                </div>
                                            </td>
                                        )}
                                        <td className="py-4 px-2 align-middle">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-gray-700 dark:text-dark-text group-hover:text-primary transition-colors uppercase tracking-tight">{item.agenda_rapat}</span>
                                                <span className="text-[9px] text-gray-400 font-medium italic">Sekretaris: {item.sekretaris || '-'}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-2 align-middle">
                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${item.jenis_rapat === 'Darurat' ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400' :
                                                item.jenis_rapat === 'Evaluasi' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' :
                                                    'bg-primary/5 text-primary dark:bg-primary/20'
                                                }`}>
                                                {item.jenis_rapat}
                                            </span>
                                        </td>
                                        <td className="py-4 px-2 align-middle">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-600 dark:text-gray-400">
                                                    <i className="far fa-calendar-alt text-[10px] text-primary"></i>
                                                    {item.tanggal}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[10px] font-medium text-gray-400">
                                                    <i className="far fa-clock text-[10px] text-emerald-500"></i>
                                                    {item.waktu_mulai} - {item.waktu_selesai}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-2 align-middle">
                                            <span className="text-xs font-bold text-gray-600 dark:text-dark-text uppercase">{item.pimpinan}</span>
                                        </td>
                                        <td className="py-4 px-2 align-middle">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${item.status === 'Berlangsung' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' :
                                                item.status === 'Selesai' ? 'bg-gray-50 text-gray-500 dark:bg-dark-bg/50 dark:text-gray-400' :
                                                    item.status === 'Dibatalkan' ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400' :
                                                        'bg-primary/5 text-primary dark:bg-primary/20'
                                                }`}>
                                                {item.status === 'Berlangsung' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>}
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 align-middle text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => openAbsensiModal(item)} className="w-8 h-8 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-all flex items-center justify-center dark:bg-primary/20 hover:scale-110 active:scale-95" title="Absensi">
                                                    <i className="fas fa-clipboard-check text-[10px]"></i>
                                                </button>
                                                {item.has_absensi && (
                                                    <button onClick={() => handlePrint(item)} className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 hover:bg-purple-100 transition-all flex items-center justify-center dark:bg-purple-900/20 dark:text-purple-400 hover:scale-110 active:scale-95" title="Print Hasil Rapat">
                                                        <i className="fas fa-print text-[10px]"></i>
                                                    </button>
                                                )}
                                                <button onClick={() => openEditModal(item)} className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-100 transition-all flex items-center justify-center dark:bg-amber-900/20 dark:text-amber-400 hover:scale-110 active:scale-95" title="Edit">
                                                    <i className="fas fa-edit text-[10px]"></i>
                                                </button>
                                                <button onClick={() => handleDelete(item.id)} className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all flex items-center justify-center dark:bg-rose-900/20 dark:text-rose-400 hover:scale-110 active:scale-95" title="Hapus">
                                                    <i className="fas fa-trash text-[10px]"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    {isMobile && expandedRows.has(idx) && (
                                        <tr className="bg-gray-50/50 dark:bg-dark-bg/30 border-b border-gray-100 dark:border-dark-border animate-slideDown">
                                            <td colSpan="8" className="px-8 py-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-1">
                                                        <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Tempat</span>
                                                        <span className="text-xs font-bold text-gray-600 dark:text-gray-400">{item.tempat || 'Internal School'}</span>
                                                    </div>
                                                    <div className="space-y-1 text-right">
                                                        <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Partisipan</span>
                                                        <span className="text-xs font-bold text-primary">{(item.peserta_rapat || []).length} Internal / {(item.peserta_eksternal || []).length} Eksternal</span>
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

            {/* Modal Manajemen Rapat */}
            {showModal && ReactDOM.createPortal(
                <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 backdrop-blur-sm ${isModalClosing ? 'opacity-0' : 'opacity-100'}`} style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }} onClick={closeModal}>
                    <div className={`bg-white dark:bg-dark-surface rounded-3xl shadow-2xl max-w-5xl w-full flex flex-col relative overflow-hidden transition-all duration-300 ${isModalClosing ? 'scale-95 translate-y-4 opacity-0' : 'scale-100 translate-y-0 opacity-100'}`} onClick={(e) => e.stopPropagation()}>
                        <div className="bg-gradient-to-r from-primary to-green-600 px-6 py-5 text-white relative">
                            <button onClick={closeModal} className="absolute top-4 right-4 text-white/80 hover:text-white cursor-pointer transition w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20" type="button"><i className="fas fa-times text-lg"></i></button>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                                    <i className={`fas fa-${modalMode === 'add' ? 'plus-circle' : 'edit'} text-lg`}></i>
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold">{modalMode === 'add' ? 'Jadwalkan Pertemuan' : 'Perbarui Konfigurasi Rapat'}</h2>
                                    <p className="text-xs text-white/80 mt-0.5 font-medium italic">Atur pimpinan, notulis, dan daftar kehadiran</p>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                            <div className="p-8 space-y-8 overflow-y-auto max-h-[75vh] scrollbar-hide">
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
                                            <div className="relative group">
                                                <i className="fas fa-building absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-primary transition-colors"></i>
                                                <input required type="text" value={formData.tempat} onChange={(e) => setFormData({ ...formData, tempat: e.target.value })} className="input-standard pl-11" placeholder="Ruang Rapat, Aula..." />
                                            </div>
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
                                                <i className="fas fa-user-tie absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-primary transition-colors"></i>
                                                <input
                                                    type="text"
                                                    placeholder="Cari atau Ketik Nama Pimpinan..."
                                                    value={pimpinanSearch}
                                                    onChange={(e) => { setPimpinanSearch(e.target.value); setFormData({ ...formData, pimpinan: e.target.value }); setShowPimpinanDropdown(true); }}
                                                    onFocus={() => setShowPimpinanDropdown(true)}
                                                    className="input-standard pl-11 font-bold"
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
                                                <i className="fas fa-edit absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-primary transition-colors"></i>
                                                <input
                                                    type="text"
                                                    placeholder="Cari atau Ketik Nama Notulis..."
                                                    value={sekretarisSearch}
                                                    onChange={(e) => { setSekretarisSearch(e.target.value); setFormData({ ...formData, sekretaris: e.target.value }); setShowSekretarisDropdown(true); }}
                                                    onFocus={() => setShowSekretarisDropdown(true)}
                                                    className="input-standard pl-11 font-bold"
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
                                        <div className="relative" ref={pesertaDropdownRef}>
                                            <label className="block text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Peserta Internal (Guru/Staff)</label>
                                            <div className="relative group">
                                                <i className="fas fa-users absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-primary transition-colors"></i>
                                                <input
                                                    type="text"
                                                    placeholder="Cari & Tandai Nama Peserta..."
                                                    value={pesertaSearch}
                                                    onChange={(e) => { setPesertaSearch(e.target.value); setShowPesertaDropdown(true); }}
                                                    onFocus={() => setShowPesertaDropdown(true)}
                                                    className="input-standard pl-11"
                                                />
                                            </div>
                                            {showPesertaDropdown && (
                                                <div className="absolute z-50 mt-1 w-full bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-xl shadow-xl max-h-48 overflow-y-auto p-2 grid grid-cols-1 md:grid-cols-2 gap-1 animate-fadeIn">
                                                    {filteredGuru.map(g => (
                                                        <div key={g.id} onClick={() => togglePeserta(g.id)} className={`px-4 py-2 rounded-lg cursor-pointer flex items-center justify-between transition-all ${formData.peserta_rapat.includes(g.id)
                                                            ? 'bg-primary/10 text-primary border-primary/20'
                                                            : 'hover:bg-gray-50 dark:hover:bg-dark-bg/40'
                                                            }`}>
                                                            <span className="text-xs font-bold">{g.nama}</span>
                                                            {formData.peserta_rapat.includes(g.id) && <i className="fas fa-check-circle text-[10px]"></i>}
                                                        </div>
                                                    ))}
                                                    {filteredGuru.length === 0 && <div className="col-span-2 py-3 text-center text-xs text-gray-400 italic">Data guru tidak ditemukan...</div>}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {formData.peserta_rapat.map(id => {
                                                const g = guruList.find(x => x.id === id);
                                                return g ? (
                                                    <span key={id} onClick={() => togglePeserta(id)} className="px-3 py-1.5 bg-gray-100 dark:bg-dark-bg/50 rounded-xl text-[10px] font-bold text-gray-600 dark:text-gray-400 flex items-center gap-2 group cursor-pointer hover:bg-rose-50 hover:text-rose-600 transition-all">
                                                        {g.nama} <i className="fas fa-times text-[8px] opacity-40 group-hover:opacity-100"></i>
                                                    </span>
                                                ) : null;
                                            })}
                                            {formData.peserta_rapat.length === 0 && <span className="text-[10px] text-gray-400 italic">Belum ada peserta internal terpilih...</span>}
                                        </div>

                                        <div className="space-y-1.5 pt-2">
                                            <label className="block text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wide">Peserta Eksternal (Tamu/Komite/Wali - Pisahkan dengan Koma)</label>
                                            <textarea
                                                rows="2"
                                                className="input-standard !h-auto py-3 leading-relaxed font-medium"
                                                placeholder="Contoh: Bapak Ahmad (Komite), Ibu Sari (Wali Murid)..."
                                                value={formData.peserta_eksternal.join(', ')}
                                                onChange={(e) => setFormData({ ...formData, peserta_eksternal: e.target.value.split(',').map(s => s.trim()).filter(s => s !== '') })}
                                            ></textarea>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 border-t border-gray-100 dark:border-dark-border flex gap-4 bg-gray-50/50 dark:bg-dark-bg/10">
                                <button type="button" onClick={closeModal} className="flex-1 px-4 py-4 rounded-2xl border border-gray-200 dark:border-dark-border text-gray-600 dark:text-gray-400 hover:bg-white transition-all text-xs font-black uppercase tracking-widest">Batal</button>
                                <button type="submit" className="flex-[2] px-4 py-4 rounded-2xl bg-primary text-white shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all text-sm font-black uppercase tracking-widest tracking-[0.1em]">{modalMode === 'add' ? 'Jadwalkan Sekarang' : 'Simpan Perubahan'}</button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

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
    const fileInputRef = useRef(null);

    const addGuest = () => {
        setFormData(prev => ({
            ...prev,
            peserta_eksternal: [
                ...prev.peserta_eksternal,
                { nama: '', jabatan: '', tanda_tangan: null, status: 'Hadir' }
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
            updateGuest(activeSignatureIndex, 'tanda_tangan', base64);
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
        const updated = [...formData.foto_rapat];
        updated.splice(index, 1);
        setFormData({ ...formData, foto_rapat: updated });
    };

    const updateStatus = (index, status) => {
        const updated = [...formData.absensi_peserta];
        updated[index].status = status;
        setFormData({ ...formData, absensi_peserta: updated });
    };

    const updateKeterangan = (index, keterangan) => {
        const updated = [...formData.absensi_peserta];
        updated[index].keterangan = keterangan;
        setFormData({ ...formData, absensi_peserta: updated });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            const res = await authFetch(`${API_BASE}/rapat/${rapat.id}/absensi-admin`, {
                method: 'PUT',
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

    return ReactDOM.createPortal(
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 ${show ? 'opacity-100 visible bg-black/50' : 'opacity-0 invisible'}`}>
            <div className={`bg-white dark:bg-dark-card w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${show ? 'scale-100' : 'scale-95'}`}>
                <div className="bg-primary p-6 text-white flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-black uppercase tracking-widest">Manajemen Absensi</h3>
                        <p className="text-xs text-primary-light font-medium mt-1">{rapat?.agenda_rapat}</p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/20 hover:bg-white/30 transition-colors">
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-6 custom-scrollbar">
                        {/* External Participants Section */}
                        <div className="space-y-4">
                            <label className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest px-2">Peserta Eksternal (Tamu/Wali)</label>

                            <div className="space-y-3">
                                {formData.peserta_eksternal.map((guest, idx) => (
                                    <div key={idx} className="bg-gray-50 dark:bg-dark-bg/40 p-4 rounded-2xl border border-gray-100 dark:border-dark-border animate-slideDown">
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                                            <div className="md:col-span-4">
                                                <input
                                                    type="text"
                                                    value={guest.nama}
                                                    onChange={(e) => updateGuest(idx, 'nama', e.target.value)}
                                                    placeholder="Nama Tamu"
                                                    className="w-full bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all dark:text-dark-text"
                                                />
                                            </div>
                                            <div className="md:col-span-4">
                                                <input
                                                    type="text"
                                                    value={guest.jabatan}
                                                    onChange={(e) => updateGuest(idx, 'jabatan', e.target.value)}
                                                    placeholder="Jabatan"
                                                    className="w-full bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-xl px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/20 transition-all dark:text-dark-text"
                                                />
                                            </div>
                                            <div className="md:col-span-4 flex items-center justify-end gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => openSignatureModal(idx)}
                                                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${guest.tanda_tangan ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'bg-white dark:bg-dark-card text-gray-400 border border-gray-100 dark:border-dark-border hover:bg-gray-50'}`}
                                                    title="Tanda Tangan"
                                                >
                                                    {guest.tanda_tangan ? (
                                                        <img src={guest.tanda_tangan} className="w-6 h-6 object-contain" alt="TTD" />
                                                    ) : (
                                                        <i className="fas fa-signature text-xs"></i>
                                                    )}
                                                </button>
                                                <div className="px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-100 dark:border-emerald-900/20">
                                                    Hadir
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeGuest(idx)}
                                                    className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all flex items-center justify-center dark:bg-rose-900/20 dark:text-rose-400"
                                                >
                                                    <i className="fas fa-trash-alt text-xs"></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {formData.peserta_eksternal.length === 0 && (
                                    <div className="py-8 text-center bg-gray-50/50 dark:bg-dark-bg/20 rounded-2xl border-2 border-dashed border-gray-100 dark:border-dark-border">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Belum ada tamu yang ditambahkan</p>
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={addGuest}
                                    className="w-full py-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-dark-border text-gray-400 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                                >
                                    <i className="fas fa-plus"></i> Tambah Tamu
                                </button>
                            </div>
                        </div>
                        {/* Summary Stats */}
                        <div className="grid grid-cols-4 gap-4">
                            <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-2xl text-center">
                                <div className="text-xl font-black text-emerald-600 mb-1">{formData.absensi_peserta.filter(p => p.status === 'H').length}</div>
                                <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Hadir</div>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl text-center">
                                <div className="text-xl font-black text-blue-600 mb-1">{formData.absensi_peserta.filter(p => p.status === 'S').length}</div>
                                <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Sakit</div>
                            </div>
                            <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-2xl text-center">
                                <div className="text-xl font-black text-amber-600 mb-1">{formData.absensi_peserta.filter(p => p.status === 'I').length}</div>
                                <div className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Izin</div>
                            </div>
                            <div className="bg-rose-50 dark:bg-rose-900/10 p-4 rounded-2xl text-center">
                                <div className="text-xl font-black text-rose-600 mb-1">{formData.absensi_peserta.filter(p => p.status === 'A').length}</div>
                                <div className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Alpha</div>
                            </div>
                        </div>

                        {/* Attendance List */}
                        <div className="space-y-3">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">Daftar Kehadiran</label>
                            {formData.absensi_peserta.map((peserta, idx) => (
                                <div key={idx} className="bg-gray-50 dark:bg-dark-bg p-4 rounded-2xl border border-gray-100 dark:border-dark-border flex items-center justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-700 dark:text-dark-text truncate">{peserta.nama}</p>
                                        <p className="text-[10px] text-gray-400 font-medium uppercase">{peserta.role || 'Peserta'}</p>
                                    </div>
                                    <div className="flex gap-1.5">
                                        {['H', 'S', 'I', 'A'].map(s => (
                                            <button
                                                key={s}
                                                type="button"
                                                onClick={() => updateStatus(idx, s)}
                                                className={`w-8 h-8 rounded-lg text-xs font-black transition-all ${peserta.status === s
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
                            ))}
                        </div>

                        {/* Foto Dokumentasi */}
                        <div className="space-y-3">
                            <label className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest px-2 flex items-center gap-2">
                                <i className="fas fa-camera text-primary"></i>
                                Dokumentasi Rapat
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {formData.foto_rapat.map((foto, idx) => (
                                    <div key={idx} className="group relative aspect-square rounded-2xl overflow-hidden border-2 border-gray-100 dark:border-dark-border bg-gray-50 dark:bg-dark-bg shadow-sm">
                                        <img
                                            src={foto.startsWith('http') ? foto : (APP_BASE ? `${APP_BASE}/storage/${foto}` : `/storage/${foto}`)}
                                            alt={`Dokumentasi ${idx + 1}`}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
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

                        {/* Notulensi */}
                        <div className="space-y-3">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">Notulensi Rapat</label>
                            <textarea
                                value={formData.notulensi}
                                onChange={(e) => setFormData({ ...formData, notulensi: e.target.value })}
                                className="w-full h-32 bg-gray-50 dark:bg-dark-bg border border-gray-100 dark:border-dark-border rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all dark:text-dark-text"
                                placeholder="Masukkan hasil rapat di sini..."
                            />
                        </div>
                    </div>

                    <div className="mt-8 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-4 rounded-2xl bg-gray-100 dark:bg-dark-bg text-gray-600 dark:text-gray-400 font-black uppercase tracking-widest text-xs hover:bg-gray-200 dark:hover:bg-dark-border transition-all"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-[2] py-4 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-xs hover:shadow-lg hover:shadow-primary/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading && <i className="fas fa-spinner fa-spin"></i>}
                            Simpan Perubahan
                        </button>
                    </div>
                    <SignatureCanvas
                        isOpen={showSignatureCanvas}
                        onClose={() => setShowSignatureCanvas(false)}
                        onSave={handleSaveSignature}
                        title="Tanda Tangan Tamu"
                    />
                </form>
            </div>
        </div>,
        document.body
    );
}

export default ManajemenRapat;
