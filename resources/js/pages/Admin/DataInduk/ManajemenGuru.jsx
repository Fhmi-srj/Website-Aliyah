import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { API_BASE, authFetch } from '../../../config/api';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import Pagination from '../../../components/Pagination';

const ITEMS_PER_PAGE = 10;

function ManajemenGuru() {
    const [data, setData] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [currentItem, setCurrentItem] = useState(null);
    const [isModalClosing, setIsModalClosing] = useState(false);
    const [formData, setFormData] = useState({
        username: '', password: '', nama: '', nip: '', email: '', sk: '',
        jenis_kelamin: 'L', tempat_lahir: '', tanggal_lahir: '',
        alamat: '', pendidikan: '', kontak: '', tmt: '', jabatan: '', status: 'Aktif'
    });

    // Sorting state
    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState('asc');

    // Filter state
    const [filterStatus, setFilterStatus] = useState('');
    const [filterJabatan, setFilterJabatan] = useState('');
    const [filterJk, setFilterJk] = useState('');
    const [activeFilter, setActiveFilter] = useState(null);

    // Mobile expandable rows
    const [expandedRows, setExpandedRows] = useState(new Set());

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);

    // File input ref for import
    const fileInputRef = useRef(null);

    // Fetch data from API
    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await authFetch(`${API_BASE}/guru`);
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

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
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
            if (column === 'jenis_kelamin') {
                valA = valA === 'l' ? 'laki-laki' : 'perempuan';
                valB = valB === 'l' ? 'laki-laki' : 'perempuan';
            }
            if (column === 'tanggal_lahir' || column === 'tmt') {
                valA = valA ? new Date(valA) : new Date(0);
                valB = valB ? new Date(valB) : new Date(0);
            }
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

    // Get unique jabatan for filter
    const uniqueJabatan = [...new Set(data.map(d => d.jabatan).filter(Boolean))].sort();

    // Filter and sort data
    let filteredData = data.filter(item => {
        if (filterStatus && item.status?.toLowerCase() !== filterStatus.toLowerCase()) return false;
        if (filterJabatan && item.jabatan?.toLowerCase() !== filterJabatan.toLowerCase()) return false;
        if (filterJk && item.jenis_kelamin !== filterJk) return false;

        if (!search) return true;
        const s = search.toLowerCase();
        return item.nama?.toLowerCase().includes(s) ||
            item.nip?.includes(s) ||
            item.username?.toLowerCase().includes(s) ||
            item.jabatan?.toLowerCase().includes(s) ||
            item.pendidikan?.toLowerCase().includes(s) ||
            (item.jenis_kelamin === 'L' ? 'laki-laki' : 'perempuan').includes(s);
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
    }, [search, filterStatus, filterJabatan, filterJk]);

    const renderStatus = (status) => {
        const isAktif = status?.toLowerCase() === 'aktif';
        return (
            <span className={`inline-flex items-center gap-1 font-semibold text-[11px] ${isAktif ? 'status-aktif' : 'status-tidak-aktif'}`}>
                <span className="status-bullet"></span>
                {status}
            </span>
        );
    };

    const toggleRowExpand = (idx) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(idx)) {
            newExpanded.delete(idx);
        } else {
            newExpanded.add(idx);
        }
        setExpandedRows(newExpanded);
    };

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

            const mappedData = jsonData.map(row => ({
                nama: row['Nama'] || row['nama'] || '',
                username: row['Username'] || row['username'] || '',
                nip: String(row['NIP'] || row['nip'] || ''),
                sk: row['SK'] || row['sk'] || '',
                jenis_kelamin: (row['JK'] || row['jenis_kelamin'] || 'L').toString().toUpperCase() === 'P' ? 'P' : 'L',
                status: row['Status'] || row['status'] || 'Aktif',
                alamat: row['Alamat'] || row['alamat'] || '',
                tanggal_lahir: row['Tanggal Lahir'] || row['tanggal_lahir'] || '',
                tempat_lahir: row['Tempat Lahir'] || row['tempat_lahir'] || '',
                pendidikan: row['Pendidikan'] || row['pendidikan'] || '',
                kontak: row['Kontak'] || row['kontak'] || '',
                tmt: row['TMT'] || row['tmt'] || '',
                jabatan: row['Jabatan'] || row['jabatan'] || ''
            }));

            Swal.fire({
                icon: 'success',
                title: 'Berhasil!',
                text: `Berhasil membaca ${mappedData.length} data dari Excel.`,
                timer: 1500,
                showConfirmButton: false
            });
            console.log('Imported data:', mappedData);
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
            'Username': item.username,
            'Nama': item.nama,
            'NIP': item.nip,
            'SK': item.sk,
            'Jenis Kelamin': item.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan',
            'Jabatan': item.jabatan,
            'Pendidikan': item.pendidikan,
            'Alamat': item.alamat,
            'Tempat Lahir': item.tempat_lahir,
            'Tanggal Lahir': formatDate(item.tanggal_lahir),
            'Kontak': item.kontak,
            'TMT': formatDate(item.tmt),
            'Status': item.status
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Data Guru');
        XLSX.writeFile(wb, `Data_Guru_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const openAddModal = () => {
        setModalMode('add');
        setFormData({
            username: '', password: '', nama: '', nip: '', sk: '',
            jenis_kelamin: 'L', tempat_lahir: '', tanggal_lahir: '',
            alamat: '', pendidikan: '', kontak: '', tmt: '', jabatan: '', status: 'Aktif'
        });
        setIsModalClosing(false);
        setShowModal(true);
    };

    const openEditModal = (item) => {
        setModalMode('edit');
        setCurrentItem(item);
        setFormData({
            username: item.username || '',
            password: '', // Password tidak di-load untuk keamanan
            nama: item.nama || '',
            nip: item.nip || '',
            email: item.email || '',
            sk: item.sk || '',
            jenis_kelamin: item.jenis_kelamin || 'L',
            tempat_lahir: item.tempat_lahir || '',
            tanggal_lahir: item.tanggal_lahir?.split('T')[0] || '',
            alamat: item.alamat || '',
            pendidikan: item.pendidikan || '',
            kontak: item.kontak || '',
            tmt: item.tmt?.split('T')[0] || '',
            jabatan: item.jabatan || '',
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
            const url = modalMode === 'add'
                ? `${API_BASE}/guru`
                : `${API_BASE}/guru/${currentItem.id}`;
            const method = modalMode === 'add' ? 'POST' : 'PUT';

            // Jika mode edit dan password kosong, hapus dari payload
            const payload = { ...formData };
            if (modalMode === 'edit' && !payload.password) {
                delete payload.password;
            }

            const response = await authFetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                closeModal();
                fetchData();
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil!',
                    text: modalMode === 'add' ? 'Data guru berhasil ditambahkan' : 'Data guru berhasil diperbarui',
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

    const handleDelete = async (id) => {
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

        try {
            const response = await authFetch(`${API_BASE}/guru/${id}`, {
                method: 'DELETE',
                headers: { 'Accept': 'application/json' }
            });
            if (response.ok) {
                fetchData();
                Swal.fire({
                    icon: 'success',
                    title: 'Terhapus!',
                    text: 'Data guru berhasil dihapus',
                    timer: 1500,
                    showConfirmButton: false
                });
            }
        } catch (error) {
            console.error('Error deleting:', error);
        }
    };

    useEffect(() => {
        const handleClick = () => setActiveFilter(null);
        document.body.addEventListener('click', handleClick);
        return () => document.body.removeEventListener('click', handleClick);
    }, []);

    // Sortable header component
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

    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return (
        <div className="animate-fadeIn flex flex-col flex-grow max-w-full overflow-auto">
            {/* Header */}
            <header className="mb-4 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex flex-col md:flex-row md:items-center md:gap-6 w-full">
                    <div className="flex flex-row items-center justify-between w-full md:w-auto gap-3 md:gap-6">
                        <div>
                            <h1 className="text-[#1f2937] font-semibold text-lg mb-1 select-none">
                                Manajemen Guru
                            </h1>
                            <p className="text-[11px] text-[#6b7280] select-none">
                                Kelola data guru dan tenaga pendidik
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Controls */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-4">
                <div className="flex items-center w-full md:w-1/3 border border-[#d1d5db] rounded-md px-3 py-1 text-[12px] text-[#4a4a4a] focus-within:ring-2 focus-within:ring-green-400 focus-within:border-green-400">
                    <input
                        aria-label="Cari data guru"
                        className="w-full border-none focus:ring-0 focus:outline-none bg-transparent"
                        placeholder="Cari data guru..."
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
                        title="Import data guru dari Excel"
                    >
                        <i className="fas fa-file-import"></i> Import Excel
                    </button>
                    <button
                        onClick={handleExport}
                        className="bg-green-700 text-white text-[12px] font-semibold px-2 py-1 rounded-md hover:bg-green-800 transition select-none flex items-center gap-2 flex-1 md:flex-none cursor-pointer"
                        type="button"
                        title="Export data guru ke Excel"
                    >
                        <i className="fas fa-file-export"></i> Export Excel
                    </button>
                    <button
                        onClick={openAddModal}
                        className="bg-green-700 text-white text-[12px] font-semibold px-2 py-1 rounded-md hover:bg-green-800 transition select-none flex items-center gap-2 flex-1 md:flex-none cursor-pointer"
                        type="button"
                        title="Tambah data guru"
                    >
                        <i className="fas fa-plus"></i> Tambah Guru
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
                    <table aria-label="Tabel data guru" className={`w-full text-[12px] text-[#4a4a4a] border-separate border-spacing-y-[2px] ${isMobile ? '' : 'min-w-[1400px]'}`}>
                        <thead>
                            <tr className="text-left text-[#6b7280] select-none">
                                <th className="select-none pl-3 py-2 whitespace-nowrap">No</th>
                                {isMobile && <th className="select-none py-2 text-center"></th>}
                                <SortableHeader label="Nama" column="nama" />
                                <SortableHeader label="NIP" column="nip" />
                                {!isMobile && <SortableHeader label="Email" column="email" />}
                                {!isMobile && <SortableHeader label="SK" column="sk" />}
                                {!isMobile && <SortableHeader label="Username" column="username" />}
                                <SortableHeader
                                    label="Jabatan"
                                    column="jabatan"
                                    filterable
                                    filterOptions={[
                                        { label: 'Semua', value: '' },
                                        ...uniqueJabatan.map(j => ({ label: j, value: j }))
                                    ]}
                                    filterValue={filterJabatan}
                                    setFilterValue={setFilterJabatan}
                                />
                                {!isMobile && (
                                    <SortableHeader
                                        label="JK"
                                        column="jenis_kelamin"
                                        filterable
                                        filterOptions={[
                                            { label: 'Semua', value: '' },
                                            { label: 'Laki-laki', value: 'L' },
                                            { label: 'Perempuan', value: 'P' }
                                        ]}
                                        filterValue={filterJk}
                                        setFilterValue={setFilterJk}
                                    />
                                )}
                                {!isMobile && <SortableHeader label="Pendidikan" column="pendidikan" />}
                                {!isMobile && <SortableHeader label="Tempat Lahir" column="tempat_lahir" />}
                                {!isMobile && <SortableHeader label="Tanggal Lahir" column="tanggal_lahir" />}
                                {!isMobile && <SortableHeader label="Alamat" column="alamat" />}
                                {!isMobile && <SortableHeader label="Kontak" column="kontak" />}
                                {!isMobile && <SortableHeader label="TMT" column="tmt" />}
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
                                        <td className="pl-3 pr-2 py-2 align-middle select-none whitespace-nowrap">{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                                        {isMobile && (
                                            <td
                                                className="px-2 py-2 align-middle select-none text-center cursor-pointer"
                                                onClick={() => toggleRowExpand(idx)}
                                            >
                                                <i className={`fas fa-${expandedRows.has(idx) ? 'minus' : 'plus'} text-green-700`}></i>
                                            </td>
                                        )}
                                        <td className="px-2 py-2 align-middle select-none whitespace-nowrap">{item.nama}</td>
                                        <td className="px-2 py-2 align-middle select-none whitespace-nowrap">{item.nip || '-'}</td>
                                        {!isMobile && <td className="px-2 py-2 align-middle select-none whitespace-nowrap">{item.email || '-'}</td>}
                                        {!isMobile && <td className="px-2 py-2 align-middle select-none whitespace-nowrap">{item.sk || '-'}</td>}
                                        {!isMobile && <td className="px-2 py-2 align-middle select-none whitespace-nowrap">{item.username}</td>}
                                        <td className="px-2 py-2 align-middle select-none whitespace-nowrap">{item.jabatan || '-'}</td>
                                        {!isMobile && <td className="px-2 py-2 align-middle select-none whitespace-nowrap text-center">{item.jenis_kelamin === 'L' ? 'L' : 'P'}</td>}
                                        {!isMobile && <td className="px-2 py-2 align-middle select-none whitespace-nowrap">{item.pendidikan || '-'}</td>}
                                        {!isMobile && <td className="px-2 py-2 align-middle select-none whitespace-nowrap">{item.tempat_lahir || '-'}</td>}
                                        {!isMobile && <td className="px-2 py-2 align-middle select-none whitespace-nowrap">{formatDate(item.tanggal_lahir) || '-'}</td>}
                                        {!isMobile && <td className="px-2 py-2 align-middle select-none whitespace-nowrap max-w-[200px] truncate" title={item.alamat}>{item.alamat || '-'}</td>}
                                        {!isMobile && <td className="px-2 py-2 align-middle select-none whitespace-nowrap">{item.kontak || '-'}</td>}
                                        {!isMobile && <td className="px-2 py-2 align-middle select-none whitespace-nowrap">{formatDate(item.tmt) || '-'}</td>}
                                        <td className="px-2 py-2 align-middle select-none whitespace-nowrap">{renderStatus(item.status)}</td>
                                        <td className="px-2 py-2 align-middle text-center select-none whitespace-nowrap">
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
                                            <td colSpan="7" className="px-4 py-3">
                                                <div className="grid grid-cols-2 gap-2 text-[11px]">
                                                    <div><strong>Username:</strong> {item.username}</div>
                                                    <div><strong>Email:</strong> {item.email || '-'}</div>
                                                    <div><strong>JK:</strong> {item.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</div>
                                                    <div><strong>Pendidikan:</strong> {item.pendidikan || '-'}</div>
                                                    <div><strong>Kontak:</strong> {item.kontak || '-'}</div>
                                                    <div><strong>SK:</strong> {item.sk || '-'}</div>
                                                    <div><strong>TMT:</strong> {formatDate(item.tmt) || '-'}</div>
                                                    <div><strong>Tempat Lahir:</strong> {item.tempat_lahir || '-'}</div>
                                                    <div><strong>Tanggal Lahir:</strong> {formatDate(item.tanggal_lahir) || '-'}</div>
                                                    <div className="col-span-2"><strong>Alamat:</strong> {item.alamat || '-'}</div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                            {filteredData.length === 0 && (
                                <tr>
                                    <td colSpan={isMobile ? 7 : 16} className="text-center py-8 text-gray-500">
                                        {search || filterStatus || filterJabatan || filterJk
                                            ? 'Tidak ada data yang sesuai filter/pencarian'
                                            : 'Belum ada data guru'}
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
                        className={`bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col relative transition-all duration-200 ${isModalClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}
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
                                {modalMode === 'add' ? 'Tambah Guru' : 'Edit Guru'}
                            </h3>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                                {/* Row 1: Username, Password */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-700 mb-1">Username *</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.username}
                                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:border-green-400 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-700 mb-1">
                                            Password {modalMode === 'add' ? '*' : '(kosongkan jika tidak diubah)'}
                                        </label>
                                        <input
                                            type="password"
                                            required={modalMode === 'add'}
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:border-green-400 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Row 2: Nama, NIP */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-700 mb-1">Nama Lengkap *</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.nama}
                                            onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:border-green-400 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-700 mb-1">NIP</label>
                                        <input
                                            type="text"
                                            value={formData.nip}
                                            onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:border-green-400 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Row 2.5: Email */}
                                <div>
                                    <label className="block text-sm text-gray-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:border-green-400 focus:outline-none"
                                        placeholder="contoh@email.com"
                                    />
                                </div>

                                {/* Row 3: Jenis Kelamin, Status */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-700 mb-1">Jenis Kelamin *</label>
                                        <select
                                            required
                                            value={formData.jenis_kelamin}
                                            onChange={(e) => setFormData({ ...formData, jenis_kelamin: e.target.value })}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:border-green-400 focus:outline-none"
                                        >
                                            <option value="L">Laki-laki</option>
                                            <option value="P">Perempuan</option>
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

                                {/* Row 4: Jabatan, Pendidikan */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-700 mb-1">Jabatan</label>
                                        <input
                                            type="text"
                                            value={formData.jabatan}
                                            onChange={(e) => setFormData({ ...formData, jabatan: e.target.value })}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:border-green-400 focus:outline-none"
                                            placeholder="Contoh: Guru BK, Wali Kelas, dll"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-700 mb-1">Pendidikan</label>
                                        <input
                                            type="text"
                                            value={formData.pendidikan}
                                            onChange={(e) => setFormData({ ...formData, pendidikan: e.target.value })}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:border-green-400 focus:outline-none"
                                            placeholder="Contoh: S1 Pendidikan"
                                        />
                                    </div>
                                </div>

                                {/* Row 5: SK, TMT */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-700 mb-1">Nomor SK</label>
                                        <input
                                            type="text"
                                            value={formData.sk}
                                            onChange={(e) => setFormData({ ...formData, sk: e.target.value })}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:border-green-400 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-700 mb-1">TMT (Tanggal Mulai Tugas)</label>
                                        <input
                                            type="date"
                                            value={formData.tmt}
                                            onChange={(e) => setFormData({ ...formData, tmt: e.target.value })}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:border-green-400 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Row 6: Tempat Lahir, Tanggal Lahir */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-700 mb-1">Tempat Lahir</label>
                                        <input
                                            type="text"
                                            value={formData.tempat_lahir}
                                            onChange={(e) => setFormData({ ...formData, tempat_lahir: e.target.value })}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:border-green-400 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-700 mb-1">Tanggal Lahir</label>
                                        <input
                                            type="date"
                                            value={formData.tanggal_lahir}
                                            onChange={(e) => setFormData({ ...formData, tanggal_lahir: e.target.value })}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:border-green-400 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Row 7: Kontak */}
                                <div>
                                    <label className="block text-sm text-gray-700 mb-1">Kontak (No. HP)</label>
                                    <input
                                        type="text"
                                        value={formData.kontak}
                                        onChange={(e) => setFormData({ ...formData, kontak: e.target.value })}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:border-green-400 focus:outline-none"
                                        placeholder="08xxxxxxxxxx"
                                    />
                                </div>

                                {/* Row 8: Alamat */}
                                <div>
                                    <label className="block text-sm text-gray-700 mb-1">Alamat</label>
                                    <textarea
                                        value={formData.alamat}
                                        onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:border-green-400 focus:outline-none resize-y"
                                        rows="2"
                                    ></textarea>
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

            {/* CSS Animation */}
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

export default ManajemenGuru;
