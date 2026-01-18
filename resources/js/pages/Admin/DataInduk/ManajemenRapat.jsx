import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { API_BASE, authFetch } from '../../../config/api';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import Pagination from '../../../components/Pagination';

const ITEMS_PER_PAGE = 10;
function ManajemenRapat() {
    const [data, setData] = useState([]);
    const [guruList, setGuruList] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [currentItem, setCurrentItem] = useState(null);
    const [isModalClosing, setIsModalClosing] = useState(false);
    const [formData, setFormData] = useState({
        agenda_rapat: '',
        jenis_rapat: 'Rutin',
        pimpinan: '',
        sekretaris: '',
        pimpinan_id: null,
        sekretaris_id: null,
        peserta_rapat: [],
        tanggal: '',
        waktu_mulai: '09:00',
        waktu_selesai: '11:00',
        tempat: '',
        status: 'Dijadwalkan'
    });

    // Autocomplete state
    const [pimpinanSearch, setPimpinanSearch] = useState('');
    const [sekretarisSearch, setSekretarisSearch] = useState('');
    const [pesertaSearch, setPesertaSearch] = useState('');
    const [showPimpinanDropdown, setShowPimpinanDropdown] = useState(false);
    const [showSekretarisDropdown, setShowSekretarisDropdown] = useState(false);

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

    const jenisRapatList = ['Rutin', 'Koordinasi', 'Darurat', 'Evaluasi'];
    const statusList = ['Dijadwalkan', 'Berlangsung', 'Selesai', 'Dibatalkan'];

    const fetchData = async () => {
        try {
            setLoading(true);
            const [rapatRes, guruRes] = await Promise.all([
                authFetch(`${API_BASE}/rapat`),
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

    useEffect(() => { fetchData(); }, []);

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

    // Filter and sort data
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

    // Autocomplete filtered guru
    const filteredPimpinan = guruList.filter(g =>
        g.status === 'Aktif' &&
        pimpinanSearch.length >= 2 &&
        g.nama?.toLowerCase().includes(pimpinanSearch.toLowerCase())
    ).slice(0, 10);

    const filteredSekretaris = guruList.filter(g =>
        g.status === 'Aktif' &&
        sekretarisSearch.length >= 2 &&
        g.nama?.toLowerCase().includes(sekretarisSearch.toLowerCase())
    ).slice(0, 10);

    // Format date
    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    // Format time
    const formatTime = (time) => {
        if (!time) return '-';
        return time.substring(0, 5);
    };

    // Render status badge
    const renderStatus = (status) => {
        const statusClass = {
            'Dijadwalkan': 'status-aktif',
            'Berlangsung': 'text-blue-600',
            'Selesai': 'text-gray-500',
            'Dibatalkan': 'status-tidak-aktif'
        };
        return (
            <span className={`inline-flex items-center gap-1 font-semibold text-[11px] ${statusClass[status] || ''}`}>
                <span className="status-bullet"></span>{status}
            </span>
        );
    };

    // Render jenis badge
    const renderJenis = (jenis) => {
        const jenisClass = {
            'Rutin': 'bg-blue-100 text-blue-700',
            'Koordinasi': 'bg-purple-100 text-purple-700',
            'Darurat': 'bg-red-100 text-red-700',
            'Evaluasi': 'bg-yellow-100 text-yellow-700'
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
            agenda_rapat: '',
            jenis_rapat: 'Rutin',
            pimpinan: '',
            sekretaris: '',
            pimpinan_id: null,
            sekretaris_id: null,
            peserta_rapat: [],
            tanggal: '',
            waktu_mulai: '09:00',
            waktu_selesai: '11:00',
            tempat: '',
            status: 'Dijadwalkan'
        });
        setPimpinanSearch('');
        setSekretarisSearch('');
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
            peserta_rapat: item.peserta_rapat || [],
            tanggal: item.tanggal?.split('T')[0] || '',
            waktu_mulai: item.waktu_mulai ? item.waktu_mulai.substring(0, 5) : '09:00',
            waktu_selesai: item.waktu_selesai ? item.waktu_selesai.substring(0, 5) : '11:00',
            tempat: item.tempat || '',
            status: item.status || 'Dijadwalkan'
        });
        setPimpinanSearch(item.pimpinan || '');
        setSekretarisSearch(item.sekretaris || '');
        setShowModal(true);
    };

    const closeModal = () => {
        setIsModalClosing(true);
        setTimeout(() => {
            setShowModal(false);
            setIsModalClosing(false);
            setShowPimpinanDropdown(false);
            setShowSekretarisDropdown(false);
        }, 200);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const url = modalMode === 'add' ? `${API_BASE}/rapat` : `${API_BASE}/rapat/${currentItem.id}`;
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
                    text: modalMode === 'add' ? 'Rapat berhasil ditambahkan' : 'Rapat berhasil diperbarui',
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
            const response = await authFetch(`${API_BASE}/rapat/${id}`, {
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

                Swal.fire({ icon: 'info', title: 'Import', text: `Ditemukan ${jsonData.length} data. Fitur import rapat memerlukan format khusus.`, timer: 3000, showConfirmButton: false });
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
            'Agenda Rapat': item.agenda_rapat,
            'Jenis': item.jenis_rapat,
            'Tanggal': formatDate(item.tanggal),
            'Waktu': `${formatTime(item.waktu_mulai)} - ${formatTime(item.waktu_selesai)}`,
            'Tempat': item.tempat || '-',
            'Pimpinan': item.pimpinan,
            'Sekretaris': item.sekretaris || '-',
            'Status': item.status
        }));
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Data Rapat');
        XLSX.writeFile(wb, `Data_Rapat_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return (
        <div className="animate-fadeIn flex flex-col flex-grow max-w-full overflow-auto">
            <header className="mb-4">
                <h1 className="text-[#1f2937] font-semibold text-lg mb-1 select-none">Manajemen Rapat</h1>
                <p className="text-[11px] text-[#6b7280] select-none">Kelola jadwal dan informasi rapat sekolah</p>
            </header>

            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-4">
                <div className="flex items-center w-full md:w-1/3 border border-[#d1d5db] rounded-md px-3 py-1 text-[12px] focus-within:ring-1 focus-within:ring-green-400">
                    <input
                        className="w-full border-none focus:ring-0 focus:outline-none bg-transparent"
                        placeholder="Cari rapat..."
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
                        <i className="fas fa-plus"></i> Tambah Rapat
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
                    <table className={`w-full text-[12px] text-[#4a4a4a] border-separate border-spacing-y-[2px] ${isMobile ? '' : 'min-w-[1000px]'}`}>
                        <thead>
                            <tr className="text-left text-[#6b7280] select-none">
                                <th className="select-none pl-3 py-2 px-2 whitespace-nowrap">No</th>
                                {isMobile && <th className="select-none py-2 px-2 text-center whitespace-nowrap"></th>}
                                <SortableHeader label="Agenda" column="agenda_rapat" />
                                <SortableHeader
                                    label="Jenis"
                                    column="jenis_rapat"
                                    filterable
                                    filterOptions={[
                                        { label: 'Semua', value: '' },
                                        ...jenisRapatList.map(j => ({ label: j, value: j }))
                                    ]}
                                    filterValue={filterJenis}
                                    setFilterValue={setFilterJenis}
                                />
                                {!isMobile && <SortableHeader label="Tanggal" column="tanggal" />}
                                {!isMobile && <th className="select-none py-2 px-2 whitespace-nowrap">Waktu</th>}
                                {!isMobile && <SortableHeader label="Tempat" column="tempat" />}
                                {!isMobile && <SortableHeader label="Pimpinan" column="pimpinan" />}
                                {!isMobile && <SortableHeader label="Sekretaris" column="sekretaris" />}
                                {!isMobile && <th className="select-none py-2 px-2 whitespace-nowrap">Peserta</th>}
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
                                        <td className="py-2 px-2 align-middle select-none">{item.agenda_rapat}</td>
                                        <td className="py-2 px-2 align-middle select-none whitespace-nowrap">{renderJenis(item.jenis_rapat)}</td>
                                        {!isMobile && <td className="py-2 px-2 align-middle select-none whitespace-nowrap">{formatDate(item.tanggal)}</td>}
                                        {!isMobile && <td className="py-2 px-2 align-middle select-none whitespace-nowrap">{formatTime(item.waktu_mulai)} - {formatTime(item.waktu_selesai)}</td>}
                                        {!isMobile && <td className="py-2 px-2 align-middle select-none whitespace-nowrap">{item.tempat || '-'}</td>}
                                        {!isMobile && <td className="py-2 px-2 align-middle select-none whitespace-nowrap">{item.pimpinan || '-'}</td>}
                                        {!isMobile && <td className="py-2 px-2 align-middle select-none whitespace-nowrap">{item.sekretaris || '-'}</td>}
                                        {!isMobile && (
                                            <td className="py-2 px-2 align-middle select-none whitespace-nowrap">
                                                {(() => {
                                                    const peserta = item.peserta_rapat || [];
                                                    const count = peserta.length;
                                                    if (count === 0) return <span className="text-gray-400">-</span>;
                                                    const pesertaNames = peserta.map(id => {
                                                        const guru = guruList.find(g => g.id === id);
                                                        return guru ? guru.nama : `ID:${id}`;
                                                    });
                                                    return (
                                                        <span className="relative group">
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700 cursor-default">
                                                                <i className="fas fa-users mr-1"></i>{count} peserta
                                                            </span>
                                                            <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block z-20">
                                                                <div className="bg-gray-800 text-white text-xs rounded-lg px-3 py-2 max-w-[200px] shadow-lg">
                                                                    <p className="font-semibold mb-1">Peserta Rapat:</p>
                                                                    {pesertaNames.map((name, i) => (
                                                                        <p key={i} className="text-gray-200">{i + 1}. {name}</p>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </span>
                                                    );
                                                })()}
                                            </td>
                                        )}
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
                                            <td colSpan="5" className="px-4 py-3">
                                                <div className="grid grid-cols-2 gap-2 text-[11px]">
                                                    <div><strong>Tanggal:</strong> {formatDate(item.tanggal)}</div>
                                                    <div><strong>Waktu:</strong> {formatTime(item.waktu_mulai)} - {formatTime(item.waktu_selesai)}</div>
                                                    <div><strong>Tempat:</strong> {item.tempat || '-'}</div>
                                                    <div><strong>Pimpinan:</strong> {item.pimpinan || '-'}</div>
                                                    <div><strong>Sekretaris:</strong> {item.sekretaris || '-'}</div>
                                                    <div className="col-span-2">
                                                        <strong>Peserta:</strong>{' '}
                                                        {(() => {
                                                            const peserta = item.peserta_rapat || [];
                                                            if (peserta.length === 0) return '-';
                                                            const pesertaNames = peserta.map(id => {
                                                                const guru = guruList.find(g => g.id === id);
                                                                return guru ? guru.nama : `ID:${id}`;
                                                            });
                                                            const maxShow = 2;
                                                            if (pesertaNames.length <= maxShow) {
                                                                return pesertaNames.join(', ');
                                                            }
                                                            return `${pesertaNames.slice(0, maxShow).join(', ')} +${pesertaNames.length - maxShow} lainnya`;
                                                        })()}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                            {filteredData.length === 0 && (
                                <tr>
                                    <td colSpan={isMobile ? 5 : 11} className="text-center py-8 text-gray-500">
                                        {search || filterJenis || filterStatus ? 'Tidak ada data yang sesuai filter/pencarian' : 'Belum ada data rapat'}
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
                                {modalMode === 'add' ? 'Tambah Rapat' : 'Edit Rapat'}
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
                                        <label className="block text-sm font-medium text-gray-700 mb-1 select-none">Agenda Rapat *</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.agenda_rapat}
                                            onChange={(e) => setFormData({ ...formData, agenda_rapat: e.target.value })}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-green-400 focus:border-green-400"
                                            placeholder="Rapat Pembagian Rapor"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1 select-none">Jenis Rapat *</label>
                                        <select
                                            required
                                            value={formData.jenis_rapat}
                                            onChange={(e) => setFormData({ ...formData, jenis_rapat: e.target.value })}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-green-400 focus:border-green-400"
                                        >
                                            {jenisRapatList.map(j => <option key={j} value={j}>{j}</option>)}
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
                                        <label className="block text-sm font-medium text-gray-700 mb-1 select-none">Tanggal *</label>
                                        <input
                                            type="date"
                                            required
                                            value={formData.tanggal}
                                            onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-green-400 focus:border-green-400"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1 select-none">Tempat *</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.tempat}
                                            onChange={(e) => setFormData({ ...formData, tempat: e.target.value })}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-green-400 focus:border-green-400"
                                            placeholder="Ruang Rapat"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1 select-none">Waktu Mulai *</label>
                                        <input
                                            type="time"
                                            required
                                            value={formData.waktu_mulai}
                                            onChange={(e) => setFormData({ ...formData, waktu_mulai: e.target.value })}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-green-400 focus:border-green-400"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1 select-none">Waktu Selesai *</label>
                                        <input
                                            type="time"
                                            required
                                            value={formData.waktu_selesai}
                                            onChange={(e) => setFormData({ ...formData, waktu_selesai: e.target.value })}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-green-400 focus:border-green-400"
                                        />
                                    </div>
                                    {/* Pimpinan with Autocomplete */}
                                    <div className="relative">
                                        <label className="block text-sm font-medium text-gray-700 mb-1 select-none">Pimpinan Rapat *</label>
                                        <input
                                            type="text"
                                            required
                                            value={pimpinanSearch}
                                            onChange={(e) => {
                                                setPimpinanSearch(e.target.value);
                                                setFormData({ ...formData, pimpinan: e.target.value });
                                                setShowPimpinanDropdown(true);
                                            }}
                                            onFocus={() => setShowPimpinanDropdown(true)}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-green-400 focus:border-green-400"
                                            placeholder="Ketik nama guru..."
                                        />
                                        {showPimpinanDropdown && filteredPimpinan.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-20 max-h-40 overflow-y-auto">
                                                {filteredPimpinan.map(g => (
                                                    <button
                                                        key={g.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setPimpinanSearch(g.nama);
                                                            setFormData({ ...formData, pimpinan: g.nama, pimpinan_id: g.id });
                                                            setShowPimpinanDropdown(false);
                                                        }}
                                                        className="block w-full text-left px-3 py-2 text-sm hover:bg-green-50"
                                                    >
                                                        {g.nama}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {/* Sekretaris with Autocomplete */}
                                    <div className="relative">
                                        <label className="block text-sm font-medium text-gray-700 mb-1 select-none">Sekretaris</label>
                                        <input
                                            type="text"
                                            value={sekretarisSearch}
                                            onChange={(e) => {
                                                setSekretarisSearch(e.target.value);
                                                setFormData({ ...formData, sekretaris: e.target.value });
                                                setShowSekretarisDropdown(true);
                                            }}
                                            onFocus={() => setShowSekretarisDropdown(true)}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-green-400 focus:border-green-400"
                                            placeholder="Ketik nama guru..."
                                        />
                                        {showSekretarisDropdown && filteredSekretaris.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-20 max-h-40 overflow-y-auto">
                                                {filteredSekretaris.map(g => (
                                                    <button
                                                        key={g.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setSekretarisSearch(g.nama);
                                                            setFormData({ ...formData, sekretaris: g.nama, sekretaris_id: g.id });
                                                            setShowSekretarisDropdown(false);
                                                        }}
                                                        className="block w-full text-left px-3 py-2 text-sm hover:bg-green-50"
                                                    >
                                                        {g.nama}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {/* Peserta Rapat Multi-select */}
                                <div className="p-6 border-t border-gray-100">
                                    <label className="block text-sm font-medium text-gray-700 mb-2 select-none">
                                        <i className="fas fa-users mr-2 text-green-600"></i>
                                        Peserta Rapat
                                    </label>
                                    {/* Search Input */}
                                    <div className="relative mb-2">
                                        <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                                        <input
                                            type="text"
                                            value={pesertaSearch}
                                            onChange={(e) => setPesertaSearch(e.target.value)}
                                            placeholder="Cari nama guru..."
                                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-green-400 focus:border-green-400"
                                        />
                                        {pesertaSearch && (
                                            <button
                                                type="button"
                                                onClick={() => setPesertaSearch('')}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                            >
                                                <i className="fas fa-times text-sm"></i>
                                            </button>
                                        )}
                                    </div>
                                    <div className="border border-gray-300 rounded-md px-3 py-2 min-h-[100px] max-h-[150px] overflow-y-auto bg-gray-50">
                                        {(() => {
                                            const availableGuru = guruList
                                                .filter(g => g.id !== formData.pimpinan_id && g.id !== formData.sekretaris_id)
                                                .filter(g => !pesertaSearch || g.nama.toLowerCase().includes(pesertaSearch.toLowerCase()) || (g.nip && g.nip.includes(pesertaSearch)));

                                            if (availableGuru.length === 0) {
                                                return <p className="text-sm text-gray-400 py-2">{pesertaSearch ? 'Tidak ditemukan' : 'Pilih pimpinan dan sekretaris terlebih dahulu'}</p>;
                                            }

                                            return availableGuru.map(g => (
                                                <label key={g.id} className="flex items-center gap-2 py-1.5 px-2 hover:bg-white rounded cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={(formData.peserta_rapat || []).includes(g.id)}
                                                        onChange={(e) => {
                                                            const current = formData.peserta_rapat || [];
                                                            if (e.target.checked) {
                                                                setFormData({ ...formData, peserta_rapat: [...current, g.id] });
                                                            } else {
                                                                setFormData({ ...formData, peserta_rapat: current.filter(id => id !== g.id) });
                                                            }
                                                        }}
                                                        className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                                                    />
                                                    <span className="text-sm text-gray-700">{g.nama}</span>
                                                    <span className="text-xs text-gray-400">({g.nip || '-'})</span>
                                                </label>
                                            ));
                                        })()}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        <i className="fas fa-info-circle mr-1"></i>
                                        {(formData.peserta_rapat || []).length} peserta dipilih
                                    </p>
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

export default ManajemenRapat;
