import React, { useState, useEffect, useRef } from 'react';
import CrudModal, { ModalSection } from '../../../components/CrudModal';
import { API_BASE, authFetch } from '../../../config/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useTahunAjaran } from '../../../contexts/TahunAjaranContext';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import Pagination from '../../../components/Pagination';

const ITEMS_PER_PAGE_DEFAULT = 10;

function ManajemenSiswa() {
    const [data, setData] = useState([]);
    const [kelasList, setKelasList] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [currentItem, setCurrentItem] = useState(null);

    const [formData, setFormData] = useState({
        nama: '', status: 'Aktif', nis: '', nisn: '', kelas_id: '',
        jenis_kelamin: 'L', alamat: '', tanggal_lahir: '', tempat_lahir: '',
        asal_sekolah: '', nama_ayah: '', nama_ibu: '', kontak_ortu: ''
    });

    // Tahun Ajaran
    const { tahunAjaran: authTahunAjaran } = useAuth();
    const { activeTahunAjaran } = useTahunAjaran();
    const tahunAjaranId = authTahunAjaran?.id || activeTahunAjaran?.id;

    // Sorting state
    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState('asc');

    // Filter state
    const [filterStatus, setFilterStatus] = useState('');
    const [filterKelas, setFilterKelas] = useState('');
    const [filterJk, setFilterJk] = useState('');
    const [activeFilter, setActiveFilter] = useState(null);

    // Mobile detection
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [expandedRows, setExpandedRows] = useState(new Set());

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE_DEFAULT);

    // Bulk selection state
    const [selectedItems, setSelectedItems] = useState(new Set());

    // File input ref for import
    const fileInputRef = useRef(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [siswaRes, kelasRes] = await Promise.all([
                authFetch(`${API_BASE}/siswa${tahunAjaranId ? `?tahun_ajaran_id=${tahunAjaranId}` : ''}`),
                authFetch(`${API_BASE}/kelas${tahunAjaranId ? `?tahun_ajaran_id=${tahunAjaranId}` : ''}`)
            ]);
            const siswaData = await siswaRes.json();
            const kelasData = await kelasRes.json();
            setData(siswaData.data || []);
            setKelasList(kelasData.data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (tahunAjaranId) {
            fetchData();
        }
    }, [tahunAjaranId]);

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

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    };

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
            let valA = column === 'kelas' ? a.kelas?.nama_kelas : a[column];
            let valB = column === 'kelas' ? b.kelas?.nama_kelas : b[column];

            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();

            if (column === 'jenis_kelamin') {
                valA = valA === 'l' ? 'laki-laki' : 'perempuan';
                valB = valB === 'l' ? 'laki-laki' : 'perempuan';
            }

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

    const uniqueKelas = [...new Set(data.map(d => d.kelas?.nama_kelas).filter(Boolean))].sort();

    const filteredData = (() => {
        let result = data.filter(item => {
            if (filterStatus && item.status !== filterStatus) return false;
            if (filterKelas && item.kelas?.nama_kelas !== filterKelas) return false;
            if (filterJk && item.jenis_kelamin !== filterJk) return false;
            if (!search) return true;
            const s = search.toLowerCase();
            return item.nama?.toLowerCase().includes(s) ||
                item.nis?.includes(s) ||
                item.nisn?.includes(s) ||
                item.kelas?.nama_kelas?.toLowerCase().includes(s) ||
                (item.jenis_kelamin === 'L' ? 'laki-laki' : 'perempuan').includes(s);
        });

        if (sortColumn) {
            result = sortData(result, sortColumn, sortDirection);
        }
        return result;
    })();

    // Pagination
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const paginatedData = filteredData.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    useEffect(() => {
        setCurrentPage(1);
        setSelectedItems(new Set());
    }, [search, filterStatus, filterKelas, filterJk]);

    // Bulk selection
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
        if (selectedItems.size === paginatedData.length) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(paginatedData.map(item => item.id)));
        }
    };

    const handleBulkDelete = async (force = false) => {
        if (selectedItems.size === 0) return;

        if (!force) {
            const result = await Swal.fire({
                title: `Hapus ${selectedItems.size} siswa?`,
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
            const response = await authFetch(`${API_BASE}/siswa/bulk-delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ ids: Array.from(selectedItems), force })
            });

            if (response.ok) {
                setSelectedItems(new Set());
                fetchData();
                Swal.fire({ icon: 'success', title: 'Terhapus!', text: `${selectedItems.size} siswa berhasil dihapus`, timer: 1500, showConfirmButton: false });
            } else {
                const error = await response.json();
                if (error.requires_force) {
                    const forceResult = await Swal.fire({ title: 'Data Terkait Ditemukan!', html: `<p>${error.message}</p>`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc2626', cancelButtonColor: '#6b7280', confirmButtonText: '⚠️ Hapus Paksa', cancelButtonText: 'Batal' });
                    if (forceResult.isConfirmed) handleBulkDelete(true);
                } else {
                    Swal.fire({ icon: 'error', title: 'Gagal!', text: error.message || 'Terjadi kesalahan' });
                }
            }
        } catch (error) {
            console.error('Error bulk delete:', error);
        }
    };

    // Import Excel
    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            const kelasMap = {};
            kelasList.forEach(k => {
                kelasMap[k.nama_kelas?.toUpperCase()] = k.id;
            });

            let successCount = 0;
            let failCount = 0;

            Swal.fire({
                title: 'Mengimport data...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            for (const row of jsonData) {
                const nama = row['Nama'] || row['nama'];
                if (!nama) continue;

                const kelasName = String(row['Kelas'] || row['kelas'] || '').toUpperCase();
                const kelasId = kelasMap[kelasName];
                const jkStr = String(row['Jenis Kelamin'] || row['JK'] || 'L').toUpperCase();

                const payload = {
                    nama: nama,
                    status: row['Status'] || 'Aktif',
                    nis: String(row['NIS'] || '').trim(),
                    nisn: String(row['NISN'] || '').trim() || null,
                    kelas_id: kelasId,
                    jenis_kelamin: jkStr.startsWith('P') ? 'P' : 'L',
                    alamat: row['Alamat'] || null,
                    tempat_lahir: row['Tempat Lahir'] || null,
                    asal_sekolah: row['Asal Sekolah'] || null,
                    nama_ayah: row['Nama Ayah'] || null,
                    nama_ibu: row['Nama Ibu'] || null,
                    kontak_ortu: String(row['Kontak Ortu'] || '') || null
                };

                try {
                    const res = await authFetch(`${API_BASE}/siswa`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    if (res.ok) successCount++;
                    else failCount++;
                } catch (err) {
                    failCount++;
                }
            }

            Swal.close();
            fetchData();
            Swal.fire({
                icon: 'success',
                title: 'Import Selesai',
                text: `Berhasil: ${successCount} | Gagal: ${failCount}`,
                timer: 2000,
                showConfirmButton: false
            });
        } catch (error) {
            console.error('Error importing Excel:', error);
        }
        e.target.value = '';
    };

    // Export PDF
    const [pdfLoading, setPdfLoading] = useState(false);
    const handleExportPdf = async () => {
        try {
            setPdfLoading(true);
            const params = new URLSearchParams();
            if (tahunAjaranId) params.append('tahun_ajaran_id', tahunAjaranId);
            const url = `${API_BASE}/export-pdf/siswa${params.toString() ? '?' + params.toString() : ''}`;
            const response = await authFetch(url);
            if (!response.ok) throw new Error('Gagal mengunduh PDF');
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Data_Siswa_${new Date().toISOString().split('T')[0]}.pdf`;
            link.click();
            setTimeout(() => URL.revokeObjectURL(link.href), 1000);
        } catch (error) {
            console.error('Error export PDF:', error);
            Swal.fire({ icon: 'error', title: 'Gagal!', text: 'Gagal mengunduh PDF', timer: 2000, showConfirmButton: false });
        } finally {
            setPdfLoading(false);
        }
    };

    // Export Excel
    const handleExport = () => {
        const exportData = filteredData.map((item, idx) => ({
            'No': idx + 1,
            'Nama': item.nama,
            'Status': item.status,
            'NIS': item.nis,
            'NISN': item.nisn,
            'Kelas': item.kelas?.nama_kelas || '',
            'Jenis Kelamin': item.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan',
            'Alamat': item.alamat,
            'Tempat Lahir': item.tempat_lahir,
            'Asal Sekolah': item.asal_sekolah,
            'Nama Ayah': item.nama_ayah,
            'Nama Ibu': item.nama_ibu,
            'Kontak Ortu': item.kontak_ortu
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Data Siswa');
        XLSX.writeFile(wb, `Data_Siswa_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const openAddModal = () => {
        setModalMode('add');
        setFormData({
            nama: '', status: 'Aktif', nis: '', nisn: '', kelas_id: kelasList[0]?.id || '',
            jenis_kelamin: 'L', alamat: '', tanggal_lahir: '', tempat_lahir: '',
            asal_sekolah: '', nama_ayah: '', nama_ibu: '', kontak_ortu: ''
        });

        setShowModal(true);
    };

    const openEditModal = (item) => {
        setModalMode('edit');
        setCurrentItem(item);
        setFormData({
            nama: item.nama || '',
            status: item.status || 'Aktif',
            nis: item.nis || '',
            nisn: item.nisn || '',
            kelas_id: item.kelas_id || '',
            jenis_kelamin: item.jenis_kelamin || 'L',
            alamat: item.alamat || '',
            tanggal_lahir: item.tanggal_lahir?.split('T')[0] || '',
            tempat_lahir: item.tempat_lahir || '',
            asal_sekolah: item.asal_sekolah || '',
            nama_ayah: item.nama_ayah || '',
            nama_ibu: item.nama_ibu || '',
            kontak_ortu: item.kontak_ortu || ''
        });

        setShowModal(true);
    };

    const closeModal = () => setShowModal(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const url = modalMode === 'add' ? `${API_BASE}/siswa` : `${API_BASE}/siswa/${currentItem.id}`;
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
                    text: modalMode === 'add' ? 'Data siswa berhasil ditambahkan' : 'Data siswa berhasil diperbarui',
                    timer: 1500,
                    showConfirmButton: false
                });
            }
        } catch (error) {
            console.error('Error saving:', error);
        }
    };

    const handleDelete = async (id, force = false) => {
        if (!force) {
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
        }

        try {
            const url = force ? `${API_BASE}/siswa/${id}?force=true` : `${API_BASE}/siswa/${id}`;
            const response = await authFetch(url, {
                method: 'DELETE',
                headers: { 'Accept': 'application/json' }
            });
            if (response.ok) {
                fetchData();
                Swal.fire({ icon: 'success', title: 'Terhapus!', text: 'Data siswa berhasil dihapus', timer: 1500, showConfirmButton: false });
            } else {
                const error = await response.json();
                if (error.requires_force) {
                    const forceResult = await Swal.fire({ title: 'Data Terkait Ditemukan!', html: `<p>${error.message}</p>`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc2626', cancelButtonColor: '#6b7280', confirmButtonText: '⚠️ Hapus Paksa', cancelButtonText: 'Batal' });
                    if (forceResult.isConfirmed) handleDelete(id, true);
                } else {
                    Swal.fire({ icon: 'error', title: 'Gagal!', text: error.message || 'Terjadi kesalahan' });
                }
            }
        } catch (error) {
            console.error('Error deleting:', error);
        }
    };

    // Sortable header component
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

    return (
        <div className="animate-fadeIn flex flex-col flex-grow max-w-full overflow-auto">
            {/* Header */}
            <header className={`${isMobile ? 'mb-3 mobile-sticky-header pt-2 pb-2 px-1' : 'mb-6'}`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="page-header-icon w-12 h-12 bg-gradient-to-br from-primary to-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                            <i className="fas fa-user-graduate text-white text-xl"></i>
                        </div>
                        <div>
                            <h1 className="page-header-title text-xl font-black text-gray-800 uppercase tracking-tight">Manajemen Siswa</h1>
                            <p className="page-header-subtitle text-xs text-gray-400 mt-0.5 font-medium uppercase tracking-widest">Database siswa terpadu Aliyah</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Controls */}
            <div className={`${isMobile ? 'mobile-sticky-header' : ''}`}>
                <div className={`${isMobile ? 'mobile-controls-row bg-gray-50/50 rounded-xl border border-gray-100' : 'flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 p-4 bg-gray-50/50 rounded-2xl border border-gray-100'}`}>
                    {isMobile ? (
                        <div className="flex gap-1.5 w-full">
                            <div className="relative group" style={{ width: '40%' }}>
                                <i className="fas fa-filter absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors text-[10px]"></i>
                                <select
                                    value={filterKelas}
                                    onChange={(e) => setFilterKelas(e.target.value)}
                                    className="w-full !pl-7 pr-2 py-1.5 text-[10px] bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-gray-600 shadow-sm appearance-none font-bold"
                                >
                                    <option value="">Semua Kelas</option>
                                    {uniqueKelas.map(k => <option key={k} value={k}>{k}</option>)}
                                </select>
                            </div>
                            <div className="relative group" style={{ width: '60%' }}>
                                <i className="fas fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors text-[10px]"></i>
                                <input
                                    aria-label="Cari siswa"
                                    className="w-full !pl-7 pr-2 py-1.5 text-[10px] bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder-gray-400 shadow-sm"
                                    placeholder="Cari nama siswa..."
                                    type="search"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center w-full md:w-[400px] relative group">
                            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors"></i>
                            <input
                                aria-label="Cari siswa"
                                className="w-full !pl-8 pr-2 py-3 text-sm bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder-gray-400 shadow-sm"
                                placeholder="Cari nama, NIS, atau kelas..."
                                type="search"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    )}
                    <div className={`${isMobile ? 'mobile-btn-group' : 'flex gap-2 flex-wrap md:flex-nowrap items-center'}`}>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx,.xls" className="hidden" />
                        {selectedItems.size > 0 && (
                            <button onClick={handleBulkDelete} className={`bg-rose-500 text-white flex items-center gap-1 font-black uppercase tracking-widest hover:bg-rose-600 transition-all shadow-lg shadow-rose-200 ${isMobile ? '' : 'px-5 py-2.5 text-[10px] rounded-xl'}`}>
                                <i className="fas fa-trash"></i>
                                <span>{isMobile ? selectedItems.size : `Hapus (${selectedItems.size})`}</span>
                            </button>
                        )}
                        <button onClick={handleExportPdf} disabled={pdfLoading} className={`btn-secondary flex items-center gap-1 font-black uppercase tracking-widest ${isMobile ? '' : 'px-5 py-2.5 text-[10px] rounded-xl'}`} type="button" title="Download PDF">
                            <i className={`fas ${pdfLoading ? 'fa-spinner fa-spin' : 'fa-file-pdf'}`}></i>
                            <span>PDF</span>
                        </button>
                        <button onClick={() => fileInputRef.current?.click()} className={`btn-secondary flex items-center gap-1 font-black uppercase tracking-widest ${isMobile ? '' : 'px-5 py-2.5 text-[10px] rounded-xl'}`}>
                            <i className="fas fa-file-import"></i>
                            <span>{isMobile ? 'Import' : 'Import'}</span>
                        </button>
                        <button onClick={handleExport} className={`btn-secondary flex items-center gap-1 font-black uppercase tracking-widest ${isMobile ? '' : 'px-5 py-2.5 text-[10px] rounded-xl'}`}>
                            <i className="fas fa-file-export"></i>
                            <span>Export</span>
                        </button>
                        <button onClick={openAddModal} className={`btn-primary flex items-center gap-1 group shadow-lg shadow-primary/20 font-black uppercase tracking-widest ${isMobile ? '' : 'px-4 py-2.5 text-[10px] rounded-xl'}`}>
                            <i className="fas fa-plus group-hover:rotate-90 transition-transform"></i>
                            <span>{isMobile ? 'Tambah' : 'Tambah Siswa'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Table Section */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="ml-3 text-sm font-medium text-gray-500 dark:text-gray-400">Memuat data...</span>
                </div>
            ) : (
                <div className={`bg-white rounded-2xl shadow-soft border border-gray-100 ${isMobile ? 'overflow-hidden' : 'overflow-x-auto scrollbar-hide'}`}>
                    <table className={`admin-table ${isMobile ? 'mobile-table-fixed' : 'min-w-[1000px]'}`}>
                        <thead>
                            <tr>
                                {!isMobile && (
                                    <th className="select-none pl-6 py-2.5 w-10">
                                        <input
                                            type="checkbox"
                                            checked={paginatedData.length > 0 && selectedItems.size === paginatedData.length}
                                            onChange={handleSelectAll}
                                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                        />
                                    </th>
                                )}
                                {!isMobile && <th className="select-none pl-6 py-2.5 w-10 text-center text-xs font-black text-gray-400 uppercase tracking-widest">No</th>}
                                {isMobile && <th className="col-expand select-none py-1 text-center"></th>}
                                <SortableHeader label="Nama Lengkap" column="nama" />
                                <SortableHeader
                                    label="Kelas"
                                    column="kelas"
                                    filterable
                                    filterOptions={[
                                        { label: 'Semua Kelas', value: '' },
                                        ...uniqueKelas.map(k => ({ label: k, value: k }))
                                    ]}
                                    filterValue={filterKelas}
                                    setFilterValue={setFilterKelas}
                                />
                                {!isMobile && <SortableHeader label="NIS" column="nis" />}
                                {!isMobile && (
                                    <SortableHeader
                                        label="Gender"
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
                                {!isMobile && (
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
                                )}
                                <th className={`select-none py-2.5 text-center text-xs font-black text-gray-400 uppercase tracking-widest ${isMobile ? 'px-2' : 'px-6'}`}>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.map((item, idx) => (
                                <React.Fragment key={item.id}>
                                    <tr key={item.id} className={`hover:bg-gray-50/50 transition-colors border-b border-gray-100 last:border-0 group ${selectedItems.has(item.id) ? 'bg-primary/5' : ''}`}>
                                        {!isMobile && (
                                            <td className="pl-6 py-2.5 align-middle">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedItems.has(item.id)}
                                                    onChange={() => handleSelectItem(item.id)}
                                                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                                />
                                            </td>
                                        )}
                                        {!isMobile && (
                                            <td className="py-2.5 align-middle text-center text-xs font-bold text-gray-400">
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
                                        <td className={`${isMobile ? 'py-1.5 pl-1 pr-1' : 'py-2.5 px-2'} align-middle`}>
                                            <div className="flex flex-col">
                                                <span className={`${isMobile ? 'text-[10px]' : 'text-sm'} font-black text-gray-700 group-hover:text-primary transition-colors uppercase tracking-tight truncate max-w-[140px] md:max-w-none`}>{item.nama}</span>
                                                <span className={`${isMobile ? 'text-[7px]' : 'text-[8px]'} text-gray-400 font-medium leading-none`}>NISN: {item.nisn || '-'}</span>
                                            </div>
                                        </td>
                                        <td className={`${isMobile ? 'py-1.5 px-1' : 'py-2.5 px-2'} align-middle whitespace-nowrap`}>
                                            <span className={`${isMobile ? 'text-[9px]' : 'text-[11px]'} font-bold text-gray-600 uppercase`}>{item.kelas?.nama_kelas || '-'}</span>
                                        </td>
                                        {!isMobile && (
                                            <td className="py-2.5 px-2 align-middle whitespace-nowrap">
                                                <span className="px-1.5 py-0.5 bg-gray-100 rounded-lg text-[10px] text-gray-500">{item.nis}</span>
                                            </td>
                                        )}
                                        {!isMobile && (
                                            <td className="py-2.5 px-2 align-middle text-center">
                                                <span className={`w-8 h-8 inline-flex items-center justify-center rounded-xl text-[10px] font-black ${item.jenis_kelamin === 'L' ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'}`}>
                                                    {item.jenis_kelamin}
                                                </span>
                                            </td>
                                        )}
                                        {!isMobile && <td className="py-2.5 px-2 align-middle whitespace-nowrap">{renderStatus(item.status)}</td>}
                                        <td className={`${isMobile ? 'py-1.5 px-1' : 'py-2.5 px-6'} align-middle text-center`}>
                                            <div className="flex items-center justify-center gap-1">
                                                <button onClick={() => openEditModal(item)} className={`action-btn ${isMobile ? 'w-6 h-6' : 'w-8 h-8'} rounded-xl bg-orange-50 text-orange-600 hover:bg-orange-100 transition-all flex items-center justify-center hover:scale-110 active:scale-95`} title="Edit Data">
                                                    <i className={`fas fa-edit ${isMobile ? 'text-[8px]' : 'text-[10px]'}`}></i>
                                                </button>
                                                <button onClick={() => handleDelete(item.id)} className={`action-btn ${isMobile ? 'w-6 h-6' : 'w-8 h-8'} rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all flex items-center justify-center hover:scale-110 active:scale-95`} title="Hapus Data">
                                                    <i className={`fas fa-trash ${isMobile ? 'text-[8px]' : 'text-[10px]'}`}></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    {isMobile && expandedRows.has(idx) && (
                                        <tr>
                                            <td colSpan="4" className="p-0">
                                                <div className="mobile-expand-grid">
                                                    <div className="expand-item">
                                                        <span className="expand-label">NIS</span>
                                                        <span className="expand-value">{item.nis || '-'}</span>
                                                    </div>
                                                    <div className="expand-item">
                                                        <span className="expand-label">Status</span>
                                                        <span className="expand-value">{renderStatus(item.status)}</span>
                                                    </div>
                                                    <div className="expand-item">
                                                        <span className="expand-label">L/P</span>
                                                        <span className="expand-value">{item.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</span>
                                                    </div>
                                                    <div className="expand-item">
                                                        <span className="expand-label">Tgl Lahir</span>
                                                        <span className="expand-value">{formatDate(item.tanggal_lahir)}</span>
                                                    </div>
                                                    <div className="expand-item full-width">
                                                        <span className="expand-label">Alamat</span>
                                                        <span className="expand-value">{item.alamat || '-'}</span>
                                                    </div>
                                                    <div className="expand-item">
                                                        <span className="expand-label">Ortu / Wali</span>
                                                        <span className="expand-value">{item.nama_ayah || item.nama_ibu || '-'}</span>
                                                    </div>
                                                    <div className="expand-item">
                                                        <span className="expand-label">Kontak</span>
                                                        <span className="expand-value">{item.kontak_ortu || '-'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                            {filteredData.length === 0 && (
                                <tr>
                                    <td colSpan={isMobile ? 8 : 9} className="py-20 text-center">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="w-16 h-16 bg-gray-50 dark:bg-dark-bg/20 rounded-2xl flex items-center justify-center">
                                                <i className="fas fa-user-slash text-2xl text-gray-300 dark:text-gray-600"></i>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-400 dark:text-gray-500">Data Siswa Kosong</p>
                                                <p className="text-[11px] text-gray-400 mt-1 uppercase tracking-widest font-medium">Tidak ada data yang sesuai filter/pencarian Anda</p>
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
                                Total {filteredData.length} Siswa Aktif
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

            {/* Modal */}
            <CrudModal
                show={showModal}
                onClose={closeModal}
                title={modalMode === 'add' ? 'Registrasi Siswa Baru' : 'Perbarui Profil Siswa'}
                subtitle="Lengkapi data pribadi dan akademik siswa"
                icon={modalMode === 'add' ? 'plus' : 'edit'}
                onSubmit={handleSubmit}
                submitLabel={modalMode === 'add' ? 'Simpan' : 'Perbarui'}
                maxWidth="max-w-2xl"
                isMobile={isMobile}
            >
                {/* Academic Info */}
                <div className={`${isMobile ? 'space-y-3' : ''}`}>
                    <ModalSection label="Informasi Akademik" isMobile={isMobile} />
                    <div className={`grid grid-cols-1 md:grid-cols-2 ${isMobile ? 'gap-2.5' : 'gap-4'}`}>
                        <div className="space-y-1 md:col-span-2">
                            <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nama Lengkap *</label>
                            <input type="text" required value={formData.nama} onChange={(e) => setFormData({ ...formData, nama: e.target.value })} className={`input-standard ${isMobile ? 'py-1.5 px-3 text-xs' : ''}`} placeholder="Sesuai Akta Kelahiran/IJAZAH" />
                        </div>
                        <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">NIS *</label>
                            <input type="text" required value={formData.nis} onChange={(e) => setFormData({ ...formData, nis: e.target.value })} className={`input-standard ${isMobile ? 'py-1.5 px-3 text-xs' : ''}`} placeholder="Nomor Induk Siswa" />
                        </div>
                        <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">NISN</label>
                            <input type="text" value={formData.nisn} onChange={(e) => setFormData({ ...formData, nisn: e.target.value })} className={`input-standard ${isMobile ? 'py-1.5 px-3 text-xs' : ''}`} placeholder="Nomor Induk Siswa Nasional" />
                        </div>
                        <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Kelas *</label>
                            <select required value={formData.kelas_id} onChange={(e) => setFormData({ ...formData, kelas_id: e.target.value })} className={`input-standard appearance-none outline-none ${isMobile ? 'py-1.5 px-3 text-xs' : ''}`}>
                                {kelasList.map(k => <option key={k.id} value={k.id}>{k.nama_kelas}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status *</label>
                            <select required value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className={`input-standard appearance-none outline-none ${isMobile ? 'py-1.5 px-3 text-xs' : ''}`}>
                                <option value="Aktif">Aktif</option>
                                <option value="Tidak Aktif">Tidak Aktif</option>
                                <option value="Lulus">Lulus</option>
                                <option value="Pindah">Pindah</option>
                                <option value="Dikeluarkan">Dikeluarkan</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Personal Info */}
                <div>
                    <ModalSection label="Biodata Pribadi" isMobile={isMobile} />
                    <div className={`grid grid-cols-1 md:grid-cols-2 ${isMobile ? 'gap-2.5' : 'gap-4'}`}>
                        <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Jenis Kelamin *</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button type="button" onClick={() => setFormData({ ...formData, jenis_kelamin: 'L' })} className={`py-1.5 text-[10px] font-black rounded-xl border transition-all ${formData.jenis_kelamin === 'L' ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'bg-gray-50 dark:bg-dark-bg/50 border-gray-100 dark:border-dark-border text-gray-400'}`}>Laki-laki</button>
                                <button type="button" onClick={() => setFormData({ ...formData, jenis_kelamin: 'P' })} className={`py-1.5 text-[10px] font-black rounded-xl border transition-all ${formData.jenis_kelamin === 'P' ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'bg-gray-50 dark:bg-dark-bg/50 border-gray-100 dark:border-dark-border text-gray-400'}`}>Perempuan</button>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tgl Lahir</label>
                            <input type="date" value={formData.tanggal_lahir} onChange={(e) => setFormData({ ...formData, tanggal_lahir: e.target.value })} className={`input-standard ${isMobile ? 'py-1.5 px-3 text-xs' : ''}`} />
                        </div>
                        <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tempat Lahir</label>
                            <input type="text" value={formData.tempat_lahir} onChange={(e) => setFormData({ ...formData, tempat_lahir: e.target.value })} className={`input-standard ${isMobile ? 'py-1.5 px-3 text-xs' : ''}`} placeholder="Kota Kelahiran" />
                        </div>
                        <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Asal Sekolah</label>
                            <input type="text" value={formData.asal_sekolah} onChange={(e) => setFormData({ ...formData, asal_sekolah: e.target.value })} className={`input-standard ${isMobile ? 'py-1.5 px-3 text-xs' : ''}`} placeholder="SMP/MTs Asal" />
                        </div>
                        <div className="space-y-1 md:col-span-2">
                            <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Alamat Lengkap</label>
                            <textarea value={formData.alamat} onChange={(e) => setFormData({ ...formData, alamat: e.target.value })} className={`input-standard min-h-[60px] ${isMobile ? 'py-1.5 px-3 text-[11px]' : 'py-3'}`} placeholder="Jalan, No Rumah, Desa, Kec, Kab"></textarea>
                        </div>
                    </div>
                </div>

                {/* Parent Info */}
                <div>
                    <ModalSection label="Kontak Orang Tua / Wali" isMobile={isMobile} />
                    <div className={`grid grid-cols-1 md:grid-cols-2 ${isMobile ? 'gap-2.5' : 'gap-4'}`}>
                        <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nama Ayah</label>
                            <input type="text" value={formData.nama_ayah} onChange={(e) => setFormData({ ...formData, nama_ayah: e.target.value })} className={`input-standard ${isMobile ? 'py-1.5 px-3 text-xs' : ''}`} placeholder="Nama Lengkap Ayah" />
                        </div>
                        <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nama Ibu</label>
                            <input type="text" value={formData.nama_ibu} onChange={(e) => setFormData({ ...formData, nama_ibu: e.target.value })} className={`input-standard ${isMobile ? 'py-1.5 px-3 text-xs' : ''}`} placeholder="Nama Lengkap Ibu" />
                        </div>
                        <div className="space-y-1 md:col-span-2">
                            <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nomor HP / WhatsApp *</label>
                            <input type="text" value={formData.kontak_ortu} onChange={(e) => setFormData({ ...formData, kontak_ortu: e.target.value })} className={`input-standard ${isMobile ? 'py-1.5 px-3 text-xs' : ''}`} placeholder="08XXXXXXXXXX" />
                        </div>
                    </div>
                </div>
            </CrudModal>

        </div>
    );
}

export default ManajemenSiswa;
