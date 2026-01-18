import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { API_BASE, authFetch } from '../../../config/api';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import Pagination from '../../../components/Pagination';

const ITEMS_PER_PAGE = 10;
function ManajemenEkskul() {
    const [data, setData] = useState([]);
    const [guruList, setGuruList] = useState([]);
    const [siswaList, setSiswaList] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [currentItem, setCurrentItem] = useState(null);
    const [isModalClosing, setIsModalClosing] = useState(false);
    const [formData, setFormData] = useState({
        nama_ekskul: '',
        kategori: 'Olahraga',
        pembina_id: '',
        hari: 'Senin',
        jam_mulai: '14:00',
        jam_selesai: '16:00',
        tempat: '',
        deskripsi: '',
        status: 'Aktif'
    });

    // Sorting state
    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState('asc');

    // Filter state
    const [filterKategori, setFilterKategori] = useState('');
    const [filterHari, setFilterHari] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [activeFilter, setActiveFilter] = useState(null);

    // Mobile detection
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [expandedRows, setExpandedRows] = useState(new Set());

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);

    // Anggota modal state
    const [showAnggotaModal, setShowAnggotaModal] = useState(false);
    const [selectedEkskul, setSelectedEkskul] = useState(null);
    const [anggotaList, setAnggotaList] = useState([]);
    const [anggotaLoading, setAnggotaLoading] = useState(false);
    const [selectedSiswa, setSelectedSiswa] = useState('');
    const [anggotaSearch, setAnggotaSearch] = useState('');

    // File input ref for import
    const fileInputRef = useRef(null);

    const kategoriList = ['Olahraga', 'Seni', 'Akademik', 'Keagamaan'];
    const hariList = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

    const fetchData = async () => {
        try {
            setLoading(true);
            const [ekskulRes, guruRes, siswaRes] = await Promise.all([
                authFetch(`${API_BASE}/ekskul`),
                authFetch(`${API_BASE}/guru`),
                authFetch(`${API_BASE}/siswa`)
            ]);
            setData((await ekskulRes.json()).data || []);
            setGuruList((await guruRes.json()).data || []);
            setSiswaList((await siswaRes.json()).data || []);
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
            if (column === 'pembina') {
                valA = a.pembina?.nama || '';
                valB = b.pembina?.nama || '';
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
            if (filterKategori && item.kategori !== filterKategori) return false;
            if (filterHari && item.hari !== filterHari) return false;
            if (filterStatus && item.status !== filterStatus) return false;
            if (!search) return true;
            const s = search.toLowerCase();
            return (
                item.nama_ekskul?.toLowerCase().includes(s) ||
                item.tempat?.toLowerCase().includes(s) ||
                item.pembina?.nama?.toLowerCase().includes(s)
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
    }, [search, filterKategori, filterHari, filterStatus]);

    // Format time
    const formatTime = (time) => {
        if (!time) return '-';
        return time.substring(0, 5);
    };

    // Render status badge
    const renderStatus = (status) => {
        const isAktif = status?.toLowerCase() === 'aktif';
        return (
            <span className={`inline-flex items-center gap-1 font-semibold text-[11px] ${isAktif ? 'status-aktif' : 'status-tidak-aktif'}`}>
                <span className="status-bullet"></span>{status}
            </span>
        );
    };

    // Render kategori badge
    const renderKategori = (kategori) => {
        const kategoriClass = {
            'Olahraga': 'bg-blue-100 text-blue-700',
            'Seni': 'bg-purple-100 text-purple-700',
            'Akademik': 'bg-green-100 text-green-700',
            'Keagamaan': 'bg-yellow-100 text-yellow-700'
        };
        return (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${kategoriClass[kategori] || 'bg-gray-100 text-gray-700'}`}>
                {kategori}
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
            nama_ekskul: '',
            kategori: 'Olahraga',
            pembina_id: '',
            hari: 'Senin',
            jam_mulai: '14:00',
            jam_selesai: '16:00',
            tempat: '',
            deskripsi: '',
            status: 'Aktif'
        });
        setShowModal(true);
    };

    const openEditModal = (item) => {
        setModalMode('edit');
        setCurrentItem(item);
        setFormData({
            nama_ekskul: item.nama_ekskul || '',
            kategori: item.kategori || 'Olahraga',
            pembina_id: item.pembina_id || '',
            hari: item.hari || 'Senin',
            jam_mulai: item.jam_mulai ? item.jam_mulai.substring(0, 5) : '14:00',
            jam_selesai: item.jam_selesai ? item.jam_selesai.substring(0, 5) : '16:00',
            tempat: item.tempat || '',
            deskripsi: item.deskripsi || '',
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
            const url = modalMode === 'add' ? `${API_BASE}/ekskul` : `${API_BASE}/ekskul/${currentItem.id}`;
            const method = modalMode === 'add' ? 'POST' : 'PUT';
            const response = await authFetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    pembina_id: formData.pembina_id || null
                })
            });
            if (response.ok) {
                closeModal();
                fetchData();
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil!',
                    text: modalMode === 'add' ? 'Ekstrakurikuler berhasil ditambahkan' : 'Ekstrakurikuler berhasil diperbarui',
                    timer: 1500,
                    showConfirmButton: false,
                    customClass: { container: 'swal-above-modal' }
                });
            } else {
                const error = await response.json();
                Swal.fire({ icon: 'error', title: 'Gagal', text: error.message || 'Terjadi kesalahan', timer: 2000, showConfirmButton: false, customClass: { container: 'swal-above-modal' } });
            }
        } catch (error) {
            console.error('Error saving:', error);
            Swal.fire({ icon: 'error', title: 'Gagal', text: 'Gagal menyimpan data', timer: 2000, showConfirmButton: false, customClass: { container: 'swal-above-modal' } });
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
            cancelButtonText: 'Batal',
            customClass: { container: 'swal-above-modal' }
        });
        if (!result.isConfirmed) return;

        try {
            const response = await authFetch(`${API_BASE}/ekskul/${id}`, {
                method: 'DELETE',
                headers: { 'Accept': 'application/json' }
            });
            if (response.ok) {
                fetchData();
                Swal.fire({ icon: 'success', title: 'Terhapus!', text: 'Data berhasil dihapus', timer: 1500, showConfirmButton: false, customClass: { container: 'swal-above-modal' } });
            }
        } catch (error) {
            console.error('Error deleting:', error);
            Swal.fire({ icon: 'error', title: 'Gagal', text: 'Gagal menghapus data', timer: 2000, showConfirmButton: false, customClass: { container: 'swal-above-modal' } });
        }
    };

    // Anggota management functions
    const openAnggotaModal = async (ekskul) => {
        setSelectedEkskul(ekskul);
        setShowAnggotaModal(true);
        setAnggotaLoading(true);
        try {
            const response = await authFetch(`${API_BASE}/ekskul/${ekskul.id}/anggota`);
            const result = await response.json();
            setAnggotaList(result.data || []);
        } catch (error) {
            console.error('Error fetching anggota:', error);
        } finally {
            setAnggotaLoading(false);
        }
    };

    const handleAddAnggota = async () => {
        if (!selectedSiswa) {
            Swal.fire({ icon: 'warning', title: 'Perhatian', text: 'Pilih siswa terlebih dahulu', customClass: { container: 'swal-above-modal' } });
            return;
        }
        try {
            const response = await authFetch(`${API_BASE}/ekskul/${selectedEkskul.id}/anggota`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ siswa_id: selectedSiswa })
            });
            if (response.ok) {
                setSelectedSiswa('');
                openAnggotaModal(selectedEkskul); // Refresh list
                fetchData(); // Refresh count
                Swal.fire({ icon: 'success', title: 'Berhasil!', text: 'Anggota berhasil ditambahkan', timer: 1500, showConfirmButton: false, customClass: { container: 'swal-above-modal' } });
            } else {
                const error = await response.json();
                Swal.fire({ icon: 'error', title: 'Gagal', text: error.message || 'Gagal menambahkan anggota', timer: 2000, showConfirmButton: false, customClass: { container: 'swal-above-modal' } });
            }
        } catch (error) {
            console.error('Error adding anggota:', error);
            Swal.fire({ icon: 'error', title: 'Gagal', text: 'Gagal menambahkan anggota', timer: 2000, showConfirmButton: false, customClass: { container: 'swal-above-modal' } });
        }
    };

    const handleRemoveAnggota = async (siswaId) => {
        const result = await Swal.fire({
            title: 'Konfirmasi Hapus',
            text: 'Hapus siswa ini dari ekskul?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Ya, Hapus!',
            cancelButtonText: 'Batal',
            customClass: { container: 'swal-above-modal' }
        });
        if (!result.isConfirmed) return;

        try {
            const response = await authFetch(`${API_BASE}/ekskul/${selectedEkskul.id}/anggota/${siswaId}`, {
                method: 'DELETE',
                headers: { 'Accept': 'application/json' }
            });
            if (response.ok) {
                openAnggotaModal(selectedEkskul); // Refresh list
                fetchData(); // Refresh count
                Swal.fire({ icon: 'success', title: 'Terhapus!', text: 'Anggota berhasil dihapus', timer: 1500, showConfirmButton: false, customClass: { container: 'swal-above-modal' } });
            }
        } catch (error) {
            console.error('Error removing anggota:', error);
            Swal.fire({ icon: 'error', title: 'Gagal', text: 'Gagal menghapus anggota', timer: 2000, showConfirmButton: false, customClass: { container: 'swal-above-modal' } });
        }
    };

    // Get available siswa (not already member) - only filter after 3+ chars typed
    const availableSiswa = (() => {
        if (anggotaSearch.length < 3 || selectedSiswa) return [];
        const search = anggotaSearch.toLowerCase();
        return siswaList.filter(s =>
            s.status === 'Aktif' &&
            !anggotaList.some(a => a.id === s.id) &&
            (s.nama?.toLowerCase().includes(search) || s.nis?.toLowerCase().includes(search))
        );
    })();

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

                Swal.fire({ icon: 'info', title: 'Import', text: `Ditemukan ${jsonData.length} data. Fitur import ekskul memerlukan format khusus.` });
            } catch (error) {
                console.error('Error reading Excel:', error);
                Swal.fire({ icon: 'error', title: 'Gagal', text: 'Gagal membaca file Excel' });
            }
        };
        reader.readAsBinaryString(file);
        e.target.value = '';
    };

    // Export Excel
    const handleExportExcel = () => {
        const exportData = filteredData.map((item, idx) => ({
            'No': idx + 1,
            'Nama Ekskul': item.nama_ekskul,
            'Kategori': item.kategori,
            'Pembina': item.pembina?.nama || '-',
            'Hari': item.hari,
            'Jam': `${formatTime(item.jam_mulai)} - ${formatTime(item.jam_selesai)}`,
            'Tempat': item.tempat || '-',
            'Jumlah Anggota': item.anggota_count || 0,
            'Status': item.status
        }));
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Data Ekskul');
        XLSX.writeFile(wb, `Data_Ekskul_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return (
        <div className="animate-fadeIn flex flex-col flex-grow max-w-full overflow-auto">
            <header className="mb-4">
                <h1 className="text-[#1f2937] font-semibold text-lg mb-1 select-none">Manajemen Ekstrakurikuler</h1>
                <p className="text-[11px] text-[#6b7280] select-none">Kelola kegiatan ekstrakurikuler sekolah</p>
            </header>

            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-4">
                <div className="flex items-center w-full md:w-1/3 border border-[#d1d5db] rounded-md px-3 py-1 text-[12px] focus-within:ring-1 focus-within:ring-green-400">
                    <input
                        className="w-full border-none focus:ring-0 focus:outline-none bg-transparent"
                        placeholder="Cari ekskul..."
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
                        <i className="fas fa-plus"></i> Tambah Ekskul
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
                                <SortableHeader label="Nama Ekskul" column="nama_ekskul" />
                                <SortableHeader
                                    label="Kategori"
                                    column="kategori"
                                    filterable
                                    filterOptions={[
                                        { label: 'Semua', value: '' },
                                        ...kategoriList.map(k => ({ label: k, value: k }))
                                    ]}
                                    filterValue={filterKategori}
                                    setFilterValue={setFilterKategori}
                                />
                                {!isMobile && <SortableHeader label="Pembina" column="pembina" />}
                                {!isMobile && (
                                    <SortableHeader
                                        label="Hari"
                                        column="hari"
                                        filterable
                                        filterOptions={[
                                            { label: 'Semua', value: '' },
                                            ...hariList.map(h => ({ label: h, value: h }))
                                        ]}
                                        filterValue={filterHari}
                                        setFilterValue={setFilterHari}
                                    />
                                )}
                                {!isMobile && <th className="select-none py-2 px-2 whitespace-nowrap">Jam</th>}
                                {!isMobile && <SortableHeader label="Tempat" column="tempat" />}
                                {!isMobile && <th className="select-none py-2 px-2 whitespace-nowrap text-center">Anggota</th>}
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
                                        <td className="py-2 px-2 align-middle select-none">{item.nama_ekskul}</td>
                                        <td className="py-2 px-2 align-middle select-none whitespace-nowrap">{renderKategori(item.kategori)}</td>
                                        {!isMobile && <td className="py-2 px-2 align-middle select-none whitespace-nowrap">{item.pembina?.nama || '-'}</td>}
                                        {!isMobile && <td className="py-2 px-2 align-middle select-none whitespace-nowrap">{item.hari}</td>}
                                        {!isMobile && <td className="py-2 px-2 align-middle select-none whitespace-nowrap">{formatTime(item.jam_mulai)} - {formatTime(item.jam_selesai)}</td>}
                                        {!isMobile && <td className="py-2 px-2 align-middle select-none whitespace-nowrap">{item.tempat || '-'}</td>}
                                        {!isMobile && <td className="py-2 px-2 align-middle select-none whitespace-nowrap text-center">{item.anggota_count || 0}</td>}
                                        <td className="py-2 px-2 align-middle select-none whitespace-nowrap">{renderStatus(item.status)}</td>
                                        <td className="py-2 px-2 align-middle text-center select-none whitespace-nowrap">
                                            <button onClick={() => openAnggotaModal(item)} className="text-blue-600 hover:text-blue-800 mr-2 cursor-pointer" title="Kelola Anggota">
                                                <i className="fas fa-users"></i>
                                            </button>
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
                                                    <div><strong>Pembina:</strong> {item.pembina?.nama || '-'}</div>
                                                    <div><strong>Hari:</strong> {item.hari}</div>
                                                    <div><strong>Jam:</strong> {formatTime(item.jam_mulai)} - {formatTime(item.jam_selesai)}</div>
                                                    <div><strong>Tempat:</strong> {item.tempat || '-'}</div>
                                                    <div><strong>Anggota:</strong> {item.anggota_count || 0} siswa</div>
                                                    {item.deskripsi && <div className="col-span-2"><strong>Deskripsi:</strong> {item.deskripsi}</div>}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                            {filteredData.length === 0 && (
                                <tr>
                                    <td colSpan={isMobile ? 6 : 11} className="text-center py-8 text-gray-500">
                                        {search || filterKategori || filterHari || filterStatus ? 'Tidak ada data yang sesuai filter/pencarian' : 'Belum ada data ekstrakurikuler'}
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
                                {modalMode === 'add' ? 'Tambah Ekstrakurikuler' : 'Edit Ekstrakurikuler'}
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
                                        <label className="block text-sm font-medium text-gray-700 mb-1 select-none">Nama Ekstrakurikuler *</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.nama_ekskul}
                                            onChange={(e) => setFormData({ ...formData, nama_ekskul: e.target.value })}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-green-400 focus:border-green-400"
                                            placeholder="Pramuka, Futsal, PMR, dll"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1 select-none">Kategori *</label>
                                        <select
                                            required
                                            value={formData.kategori}
                                            onChange={(e) => setFormData({ ...formData, kategori: e.target.value })}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-green-400 focus:border-green-400"
                                        >
                                            {kategoriList.map(k => <option key={k} value={k}>{k}</option>)}
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
                                            <option value="Aktif">Aktif</option>
                                            <option value="Tidak Aktif">Tidak Aktif</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1 select-none">Pembina</label>
                                        <select
                                            value={formData.pembina_id}
                                            onChange={(e) => setFormData({ ...formData, pembina_id: e.target.value })}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-green-400 focus:border-green-400"
                                        >
                                            <option value="">-- Pilih Guru --</option>
                                            {guruList.filter(g => g.status === 'Aktif').map(g => <option key={g.id} value={g.id}>{g.nama}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1 select-none">Hari *</label>
                                        <select
                                            required
                                            value={formData.hari}
                                            onChange={(e) => setFormData({ ...formData, hari: e.target.value })}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-green-400 focus:border-green-400"
                                        >
                                            {hariList.map(h => <option key={h} value={h}>{h}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1 select-none">Jam Mulai</label>
                                        <input
                                            type="time"
                                            value={formData.jam_mulai}
                                            onChange={(e) => setFormData({ ...formData, jam_mulai: e.target.value })}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-green-400 focus:border-green-400"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1 select-none">Jam Selesai</label>
                                        <input
                                            type="time"
                                            value={formData.jam_selesai}
                                            onChange={(e) => setFormData({ ...formData, jam_selesai: e.target.value })}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-green-400 focus:border-green-400"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1 select-none">Tempat</label>
                                        <input
                                            type="text"
                                            value={formData.tempat}
                                            onChange={(e) => setFormData({ ...formData, tempat: e.target.value })}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-green-400 focus:border-green-400"
                                            placeholder="Lapangan, Aula, Lab, dll"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1 select-none">Deskripsi</label>
                                        <textarea
                                            value={formData.deskripsi}
                                            onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                                            rows={3}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-green-400 focus:border-green-400"
                                            placeholder="Deskripsi singkat ekskul..."
                                        />
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

            {/* Anggota Modal with Portal */}
            {showAnggotaModal && ReactDOM.createPortal(
                <div
                    className="fixed inset-0 flex items-center justify-center p-4"
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)', zIndex: 9999 }}
                    onClick={() => setShowAnggotaModal(false)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
                        style={{ animation: 'popup-in 0.3s ease' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-800 select-none">
                                    Kelola Anggota - {selectedEkskul?.nama_ekskul}
                                </h2>
                                <p className="text-[11px] text-gray-500 select-none mt-1">
                                    Total anggota aktif: {anggotaList.length} siswa
                                </p>
                            </div>
                            <button
                                onClick={() => setShowAnggotaModal(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                            >
                                <i className="fas fa-times text-xl"></i>
                            </button>
                        </div>

                        {/* Add Member Section */}
                        <div className="p-4 border-b border-gray-100 bg-gray-50">
                            <label className="block text-sm font-medium text-gray-700 mb-1 select-none">Tambah Anggota</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Ketik minimal 3 huruf untuk mencari siswa..."
                                    value={anggotaSearch}
                                    onChange={(e) => setAnggotaSearch(e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-green-400 focus:border-green-400"
                                />
                                {/* Autocomplete dropdown */}
                                {anggotaSearch.length >= 3 && availableSiswa.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                                        {availableSiswa.slice(0, 10).map(s => (
                                            <button
                                                key={s.id}
                                                onClick={() => {
                                                    setSelectedSiswa(s.id);
                                                    setAnggotaSearch(`${s.nama} (${s.nis})`);
                                                }}
                                                className={`block w-full text-left px-3 py-2 text-sm hover:bg-green-50 ${selectedSiswa === s.id ? 'bg-green-100 text-green-700' : ''}`}
                                            >
                                                <span className="font-medium">{s.nama}</span>
                                                <span className="text-gray-500 ml-2">({s.nis})</span>
                                            </button>
                                        ))}
                                        {availableSiswa.length > 10 && (
                                            <div className="px-3 py-2 text-[10px] text-gray-500 border-t">
                                                Menampilkan 10 dari {availableSiswa.length} hasil. Ketik lebih spesifik.
                                            </div>
                                        )}
                                    </div>
                                )}
                                {anggotaSearch.length >= 3 && availableSiswa.length === 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 px-3 py-2 text-sm text-gray-500">
                                        Tidak ditemukan siswa yang cocok
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2 mt-2">
                                <button
                                    onClick={handleAddAnggota}
                                    disabled={!selectedSiswa}
                                    className={`flex-1 px-4 py-2 text-sm font-semibold rounded-md flex items-center justify-center gap-2 cursor-pointer ${selectedSiswa ? 'bg-green-700 text-white hover:bg-green-800' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                                >
                                    <i className="fas fa-plus"></i> Tambah Anggota
                                </button>
                                {selectedSiswa && (
                                    <button
                                        onClick={() => { setSelectedSiswa(''); setAnggotaSearch(''); }}
                                        className="px-3 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer"
                                        title="Batal"
                                    >
                                        <i className="fas fa-times"></i>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Members List */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {anggotaLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-700"></div>
                                    <span className="ml-2 text-gray-600 text-sm">Memuat anggota...</span>
                                </div>
                            ) : anggotaList.length === 0 ? (
                                <div className="text-center py-8 text-gray-500 text-sm">
                                    Belum ada anggota di ekskul ini
                                </div>
                            ) : (
                                <table className="w-full text-[12px] text-[#4a4a4a]">
                                    <thead>
                                        <tr className="text-left text-[#6b7280] border-b">
                                            <th className="py-2 px-2">No</th>
                                            <th className="py-2 px-2">NIS</th>
                                            <th className="py-2 px-2">Nama</th>
                                            <th className="py-2 px-2">Tgl Daftar</th>
                                            <th className="py-2 px-2 text-center">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {anggotaList.map((anggota, idx) => (
                                            <tr key={anggota.id} className="border-b hover:bg-gray-50">
                                                <td className="py-2 px-2">{idx + 1}</td>
                                                <td className="py-2 px-2">{anggota.nis}</td>
                                                <td className="py-2 px-2">{anggota.nama}</td>
                                                <td className="py-2 px-2">
                                                    {anggota.pivot?.tanggal_daftar ? new Date(anggota.pivot.tanggal_daftar).toLocaleDateString('id-ID') : '-'}
                                                </td>
                                                <td className="py-2 px-2 text-center">
                                                    <button
                                                        onClick={() => handleRemoveAnggota(anggota.id)}
                                                        className="text-red-600 hover:text-red-800 cursor-pointer"
                                                        title="Hapus dari Ekskul"
                                                    >
                                                        <i className="fas fa-user-minus"></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="flex justify-end gap-3 p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
                            <button
                                onClick={() => setShowAnggotaModal(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

export default ManajemenEkskul;

