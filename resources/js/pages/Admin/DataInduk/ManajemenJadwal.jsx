import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { API_BASE, authFetch } from '../../../config/api';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import Pagination from '../../../components/Pagination';

function ManajemenJadwal() {
    const [data, setData] = useState([]);
    const [guruList, setGuruList] = useState([]);
    const [mapelList, setMapelList] = useState([]);
    const [kelasList, setKelasList] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [currentItem, setCurrentItem] = useState(null);
    const [isModalClosing, setIsModalClosing] = useState(false);
    const [formData, setFormData] = useState({
        jam_pelajaran: '1',
        jam_mulai: '07:00',
        jam_selesai: '08:30',
        guru_id: '',
        mapel_id: '',
        kelas_id: '',
        hari: 'Senin',
        semester: 'Ganjil',
        tahun_ajaran: '2025/2026',
        status: 'Aktif'
    });

    // Sorting state
    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState('asc');

    // Filter state
    const [filterHari, setFilterHari] = useState('');
    const [filterKelas, setFilterKelas] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [activeFilter, setActiveFilter] = useState(null);

    // Mobile detection
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [expandedRows, setExpandedRows] = useState(new Set());

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // File input ref for import
    const fileInputRef = useRef(null);
    const guruDropdownRef = useRef(null);

    // Guru autocomplete state
    const [guruSearch, setGuruSearch] = useState('');
    const [showGuruDropdown, setShowGuruDropdown] = useState(false);

    const hariList = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

    // Auto-calculate jam selesai based on jam pelajaran (1 JP = 90 menit)
    const calculateJamSelesai = (jamPelajaran, jamMulai) => {
        if (!jamPelajaran || !jamMulai) return '';
        const jp = parseInt(jamPelajaran);
        if (isNaN(jp) || jp < 1) return '';
        const [hours, mins] = jamMulai.split(':').map(Number);
        const totalMins = hours * 60 + mins + (jp * 90);
        const endHours = Math.floor(totalMins / 60);
        const endMins = totalMins % 60;
        return `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
    };

    // Handler for jam pelajaran change
    const handleJamPelajaranChange = (value) => {
        const jamSelesai = calculateJamSelesai(value, formData.jam_mulai);
        setFormData({ ...formData, jam_pelajaran: value, jam_selesai: jamSelesai });
    };

    // Handler for jam mulai change
    const handleJamMulaiChange = (value) => {
        const jamSelesai = calculateJamSelesai(formData.jam_pelajaran, value);
        setFormData({ ...formData, jam_mulai: value, jam_selesai: jamSelesai });
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const [jadwalRes, guruRes, mapelRes, kelasRes] = await Promise.all([
                authFetch(`${API_BASE}/jadwal`),
                authFetch(`${API_BASE}/guru`),
                authFetch(`${API_BASE}/mapel`),
                authFetch(`${API_BASE}/kelas`)
            ]);
            setData((await jadwalRes.json()).data || []);
            setGuruList((await guruRes.json()).data || []);
            setMapelList((await mapelRes.json()).data || []);
            setKelasList((await kelasRes.json()).data || []);
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
        const handleClick = (event) => {
            setActiveFilter(null);
            // Close guru dropdown on outside click
            if (guruDropdownRef.current && !guruDropdownRef.current.contains(event.target)) {
                setShowGuruDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
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
            if (column === 'guru') valA = a.guru?.nama || '';
            if (column === 'guru') valB = b.guru?.nama || '';
            if (column === 'mapel') valA = a.mapel?.nama_mapel || '';
            if (column === 'mapel') valB = b.mapel?.nama_mapel || '';
            if (column === 'kelas') valA = a.kelas?.nama_kelas || '';
            if (column === 'kelas') valB = b.kelas?.nama_kelas || '';
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

    // Get unique kelas for filter
    const uniqueKelas = [...new Set(data.map(item => item.kelas?.nama_kelas).filter(Boolean))];

    // Filter and sort data
    const filteredData = (() => {
        let result = data.filter(item => {
            if (filterHari && item.hari !== filterHari) return false;
            if (filterKelas && item.kelas?.nama_kelas !== filterKelas) return false;
            if (filterStatus && item.status !== filterStatus) return false;
            if (!search) return true;
            const s = search.toLowerCase();
            return (
                item.guru?.nama?.toLowerCase().includes(s) ||
                item.mapel?.nama_mapel?.toLowerCase().includes(s) ||
                item.kelas?.nama_kelas?.toLowerCase().includes(s) ||
                item.hari?.toLowerCase().includes(s) ||
                item.jam_ke?.toString().includes(s)
            );
        });
        return sortData(result, sortColumn, sortDirection);
    })();

    // Pagination logic
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Reset to page 1 when filter/search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [search, filterHari, filterKelas, filterStatus]);

    // Render status badge
    const renderStatus = (status) => {
        const isAktif = status?.toLowerCase() === 'aktif';
        return (
            <span className={`inline-flex items-center gap-1 font-semibold text-[11px] ${isAktif ? 'status-aktif' : 'status-tidak-aktif'}`}>
                <span className="status-bullet"></span>{status}
            </span>
        );
    };

    // Format time
    const formatTime = (time) => {
        if (!time) return '-';
        return time.substring(0, 5);
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
        const defaultJP = '1';
        const defaultMulai = '07:00';
        setGuruSearch(''); // Reset guru search
        setShowGuruDropdown(false);
        setFormData({
            jam_pelajaran: defaultJP,
            jam_mulai: defaultMulai,
            jam_selesai: calculateJamSelesai(defaultJP, defaultMulai),
            guru_id: '',
            mapel_id: mapelList.find(m => m.status === 'Aktif')?.id || '',
            kelas_id: kelasList.find(k => k.status === 'Aktif')?.id || '',
            hari: 'Senin',
            semester: 'Ganjil',
            tahun_ajaran: '2025/2026',
            status: 'Aktif'
        });
        setShowModal(true);
    };

    const openEditModal = (item) => {
        setModalMode('edit');
        setCurrentItem(item);
        const jp = item.jam_ke || '1';
        const mulai = item.jam_mulai ? item.jam_mulai.substring(0, 5) : '07:00';
        // Set guru search to current guru name
        const guru = guruList.find(g => g.id === item.guru_id);
        setGuruSearch(guru?.nama || '');
        setShowGuruDropdown(false);
        setFormData({
            jam_pelajaran: jp,
            jam_mulai: mulai,
            jam_selesai: item.jam_selesai ? item.jam_selesai.substring(0, 5) : calculateJamSelesai(jp, mulai),
            guru_id: item.guru_id || '',
            mapel_id: item.mapel_id || '',
            kelas_id: item.kelas_id || '',
            hari: item.hari || 'Senin',
            semester: item.semester || 'Ganjil',
            tahun_ajaran: item.tahun_ajaran || '2025/2026',
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
            const url = modalMode === 'add' ? `${API_BASE}/jadwal` : `${API_BASE}/jadwal/${currentItem.id}`;
            const method = modalMode === 'add' ? 'POST' : 'PUT';
            // Map jam_pelajaran to jam_ke for backend
            const submitData = {
                ...formData,
                jam_ke: formData.jam_pelajaran // Backend uses jam_ke
            };
            delete submitData.jam_pelajaran;
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
                    text: modalMode === 'add' ? 'Data jadwal berhasil ditambahkan' : 'Data jadwal berhasil diperbarui',
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
            const response = await authFetch(`${API_BASE}/jadwal/${id}`, {
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

                Swal.fire({ icon: 'info', title: 'Import', text: `Ditemukan ${jsonData.length} data. Fitur import jadwal memerlukan mapping ID guru/mapel/kelas.`, timer: 3000, showConfirmButton: false });
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
            'Hari': item.hari,
            'JP': item.jam_ke,
            'Jam Mulai': formatTime(item.jam_mulai),
            'Jam Selesai': formatTime(item.jam_selesai),
            'Mata Pelajaran': item.mapel?.nama_mapel || '-',
            'Guru': item.guru?.nama || '-',
            'Kelas': item.kelas?.nama_kelas || '-',
            'Semester': item.semester,
            'Tahun Ajaran': item.tahun_ajaran,
            'Status': item.status
        }));
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Data Jadwal');
        XLSX.writeFile(wb, `Data_Jadwal_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return (
        <div className="animate-fadeIn flex flex-col flex-grow max-w-full overflow-auto">
            <header className="mb-4">
                <h1 className="text-[#1f2937] font-semibold text-lg mb-1 select-none">Manajemen Jadwal</h1>
                <p className="text-[11px] text-[#6b7280] select-none">Kelola jadwal pelajaran sekolah</p>
            </header>

            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-4">
                <div className="flex items-center w-full md:w-1/3 border border-[#d1d5db] rounded-md px-3 py-1 text-[12px] focus-within:ring-1 focus-within:ring-green-400">
                    <input
                        className="w-full border-none focus:ring-0 focus:outline-none bg-transparent"
                        placeholder="Cari jadwal..."
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
                        <i className="fas fa-plus"></i> Tambah Jadwal
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
                    <table className={`w-full text-[12px] text-[#4a4a4a] border-separate border-spacing-y-[2px] ${isMobile ? '' : 'min-w-[1200px]'}`}>
                        <thead>
                            <tr className="text-left text-[#6b7280] select-none">
                                <th className="select-none pl-3 py-2 px-2 whitespace-nowrap">No</th>
                                {isMobile && <th className="select-none py-2 px-2 text-center whitespace-nowrap"></th>}
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
                                {!isMobile && <SortableHeader label="JP" column="jam_ke" />}
                                {!isMobile && <th className="select-none py-2 px-2 whitespace-nowrap">Waktu</th>}
                                <SortableHeader label="Mapel" column="mapel" />
                                {!isMobile && <SortableHeader label="Guru" column="guru" />}
                                {!isMobile && (
                                    <SortableHeader
                                        label="Kelas"
                                        column="kelas"
                                        filterable
                                        filterOptions={[
                                            { label: 'Semua', value: '' },
                                            ...uniqueKelas.map(k => ({ label: k, value: k }))
                                        ]}
                                        filterValue={filterKelas}
                                        setFilterValue={setFilterKelas}
                                    />
                                )}
                                {!isMobile && <SortableHeader label="Semester" column="semester" />}
                                {!isMobile && <SortableHeader label="Tahun Ajaran" column="tahun_ajaran" />}
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
                                        <td className="pl-3 py-2 px-2 align-middle select-none whitespace-nowrap">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                                        {isMobile && (
                                            <td
                                                className="py-2 px-2 align-middle select-none text-center cursor-pointer"
                                                onClick={() => toggleRowExpand(idx)}
                                            >
                                                <i className={`fas fa-${expandedRows.has(idx) ? 'minus' : 'plus'} text-green-700`}></i>
                                            </td>
                                        )}
                                        <td className="py-2 px-2 align-middle select-none whitespace-nowrap">{item.hari}</td>
                                        {!isMobile && <td className="py-2 px-2 align-middle select-none whitespace-nowrap">{item.jam_ke}</td>}
                                        {!isMobile && <td className="py-2 px-2 align-middle select-none whitespace-nowrap">{formatTime(item.jam_mulai)} - {formatTime(item.jam_selesai)}</td>}
                                        <td className="py-2 px-2 align-middle select-none whitespace-nowrap">{item.mapel?.nama_mapel || '-'}</td>
                                        {!isMobile && <td className="py-2 px-2 align-middle select-none whitespace-nowrap">{item.guru?.nama || '-'}</td>}
                                        {!isMobile && <td className="py-2 px-2 align-middle select-none whitespace-nowrap">{item.kelas?.nama_kelas || '-'}</td>}
                                        {!isMobile && <td className="py-2 px-2 align-middle select-none whitespace-nowrap">{item.semester}</td>}
                                        {!isMobile && <td className="py-2 px-2 align-middle select-none whitespace-nowrap">{item.tahun_ajaran}</td>}
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
                                            <td colSpan="6" className="px-4 py-3">
                                                <div className="grid grid-cols-2 gap-2 text-[11px]">
                                                    <div><strong>JP:</strong> {item.jam_ke}</div>
                                                    <div><strong>Waktu:</strong> {formatTime(item.jam_mulai)} - {formatTime(item.jam_selesai)}</div>
                                                    <div><strong>Guru:</strong> {item.guru?.nama || '-'}</div>
                                                    <div><strong>Kelas:</strong> {item.kelas?.nama_kelas || '-'}</div>
                                                    <div><strong>Semester:</strong> {item.semester}</div>
                                                    <div><strong>Tahun Ajaran:</strong> {item.tahun_ajaran}</div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                            {filteredData.length === 0 && (
                                <tr>
                                    <td colSpan={isMobile ? 6 : 12} className="text-center py-8 text-gray-500">
                                        {search || filterHari || filterKelas || filterStatus ? 'Tidak ada data yang sesuai filter/pencarian' : 'Belum ada data jadwal'}
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
                        itemsPerPage={itemsPerPage}
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
                                {modalMode === 'add' ? 'Tambah Jadwal' : 'Edit Jadwal'}
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
                                        <label className="block text-sm font-medium text-gray-700 mb-1 select-none">Jam Pelajaran *</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="8"
                                            required
                                            value={formData.jam_pelajaran}
                                            onChange={(e) => handleJamPelajaranChange(e.target.value)}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-green-400 focus:border-green-400"
                                            placeholder="1"
                                        />
                                        <p className="text-[10px] text-gray-500 mt-1">1 JP = 90 menit</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1 select-none">Jam Mulai *</label>
                                        <input
                                            type="time"
                                            required
                                            value={formData.jam_mulai}
                                            onChange={(e) => handleJamMulaiChange(e.target.value)}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-green-400 focus:border-green-400"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1 select-none">Jam Selesai <span className="text-gray-400 font-normal">(otomatis)</span></label>
                                        <input
                                            type="time"
                                            value={formData.jam_selesai}
                                            readOnly
                                            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-gray-100 text-gray-600 cursor-not-allowed"
                                        />
                                        <p className="text-[10px] text-gray-500 mt-1">Dihitung dari JP × 90 menit</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1 select-none">Mata Pelajaran *</label>
                                        <select
                                            required
                                            value={formData.mapel_id}
                                            onChange={(e) => setFormData({ ...formData, mapel_id: e.target.value })}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-green-400 focus:border-green-400"
                                        >
                                            <option value="">-- Pilih Mapel --</option>
                                            {mapelList.filter(m => m.status === 'Aktif').map(m => <option key={m.id} value={m.id}>{m.nama_mapel}</option>)}
                                        </select>
                                    </div>
                                    <div className="relative" ref={guruDropdownRef}>
                                        <label className="block text-sm font-medium text-gray-700 mb-1 select-none">Guru *</label>
                                        <input
                                            type="text"
                                            value={guruSearch}
                                            onChange={(e) => {
                                                setGuruSearch(e.target.value);
                                                setShowGuruDropdown(e.target.value.length >= 3);
                                                if (e.target.value.length < 3) {
                                                    setFormData({ ...formData, guru_id: '' });
                                                }
                                            }}
                                            onFocus={() => guruSearch.length >= 3 && setShowGuruDropdown(true)}
                                            placeholder="Ketik min 3 huruf..."
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-green-400 focus:border-green-400"
                                        />
                                        {!formData.guru_id && <p className="text-[10px] text-gray-500 mt-1">Minimal 3 huruf untuk mencari</p>}
                                        {formData.guru_id && (
                                            <p className="text-[10px] text-green-600 mt-1 flex items-center gap-1">
                                                <i className="fas fa-check-circle"></i>
                                                Guru terpilih
                                            </p>
                                        )}
                                        {showGuruDropdown && (
                                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                                                {guruList
                                                    .filter(g => g.status === 'Aktif' && g.nama.toLowerCase().includes(guruSearch.toLowerCase()))
                                                    .map(g => (
                                                        <div
                                                            key={g.id}
                                                            className={`px-3 py-2 cursor-pointer hover:bg-green-50 text-sm ${formData.guru_id === g.id ? 'bg-green-100' : ''}`}
                                                            onClick={() => {
                                                                setFormData({ ...formData, guru_id: g.id });
                                                                setGuruSearch(g.nama);
                                                                setShowGuruDropdown(false);
                                                            }}
                                                        >
                                                            {g.nama}
                                                        </div>
                                                    ))
                                                }
                                                {guruList.filter(g => g.status === 'Aktif' && g.nama.toLowerCase().includes(guruSearch.toLowerCase())).length === 0 && (
                                                    <div className="px-3 py-2 text-gray-500 text-sm">Tidak ditemukan</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1 select-none">Kelas *</label>
                                        <select
                                            required
                                            value={formData.kelas_id}
                                            onChange={(e) => setFormData({ ...formData, kelas_id: e.target.value })}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-green-400 focus:border-green-400"
                                        >
                                            <option value="">-- Pilih Kelas --</option>
                                            {kelasList.filter(k => k.status === 'Aktif').map(k => <option key={k.id} value={k.id}>{k.nama_kelas}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1 select-none">Semester *</label>
                                        <select
                                            required
                                            value={formData.semester}
                                            onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-green-400 focus:border-green-400"
                                        >
                                            <option value="Ganjil">Ganjil</option>
                                            <option value="Genap">Genap</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1 select-none">Tahun Ajaran *</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.tahun_ajaran}
                                            onChange={(e) => setFormData({ ...formData, tahun_ajaran: e.target.value })}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-green-400 focus:border-green-400"
                                            placeholder="2025/2026"
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

export default ManajemenJadwal;
