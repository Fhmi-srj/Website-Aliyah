import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import CrudModal from '../../../components/CrudModal';
import { API_BASE } from '../../../config/api';
import { authFetch } from '../../../config/api';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import Pagination from '../../../components/Pagination';

// Image compression utility
const compressImage = (file, maxWidth = 800, quality = 0.6) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
};

// Likert scale labels
const LIKERT_LABELS = { 1: 'Belum Tampak', 2: 'Cukup', 3: 'Baik', 4: 'Sangat Baik' };
const LIKERT_COLORS = {
    1: 'bg-red-500 text-white shadow-red-200',
    2: 'bg-yellow-500 text-white shadow-yellow-200',
    3: 'bg-blue-500 text-white shadow-blue-200',
    4: 'bg-emerald-500 text-white shadow-emerald-200',
};

// Supervision assessment criteria
const BAGIAN_A = [
    { key: 'a1', label: 'Kelengkapan Komponen Minimum', desc: 'Modul ajar memuat Tujuan Pembelajaran, Langkah Pembelajaran, Rencana Asesmen, dan Media Pembelajaran.' },
    { key: 'a2', label: 'Kesesuaian dengan Karakteristik Siswa', desc: 'Modul ajar dirancang sesuai kesiapan belajar, minat, dan tingkat penguasaan peserta didik.' },
    { key: 'a3', label: 'Kualitas Penyajian Materi', desc: 'Modul ajar disusun secara fleksibel, jelas, sederhana, esensial, menarik, dan kontekstual.' },
    { key: 'a4', label: 'Instrumen Asesmen Terukur', desc: 'Terdapat instrumen dan rubrik penilaian yang jelas untuk mengukur ketercapaian tujuan pembelajaran.' },
];
const BAGIAN_B = [
    { key: 'b1', label: 'Pembelajaran Berdiferensiasi', desc: 'Pelaksanaan mengakomodasi kebutuhan belajar siswa serta memberikan scaffolding atau tantangan yang tepat.' },
    { key: 'b2', label: 'Keterlibatan & Interaksi Aktif', desc: 'Pendidik aktif mendengarkan, memberikan pertanyaan terbuka, serta melibatkan siswa dalam kolaborasi.' },
    { key: 'b3', label: 'Pemberian Umpan Balik', desc: 'Terdapat umpan balik konstruktif dari guru ke siswa, serta kesempatan refleksi diri dan umpan balik antar-teman.' },
    { key: 'b4', label: 'Pengembangan Karakter', desc: 'Pendidik menjadi teladan, membangun kesepakatan kelas, dan mengintegrasikan nilai-nilai Profil Pelajar Pancasila.' },
    { key: 'b5', label: 'Lingkungan Belajar Aman & Bahagia', desc: 'Proses belajar menumbuhkan rasa bahagia, aman, dan nyaman bagi peserta didik secara holistik.' },
];

function ManajemenSupervisi() {
    const [data, setData] = useState([]);
    const [selectedItems, setSelectedItems] = useState(new Set());
    const [guruList, setGuruList] = useState([]);
    const [mapelList, setMapelList] = useState([]);
    const [jadwalList, setJadwalList] = useState([]);
    const [kelasList, setKelasList] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    const [tahunAjaranId, setTahunAjaranId] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
    const [currentItem, setCurrentItem] = useState(null);

    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [formData, setFormData] = useState({
        supervisor_id: null,
        guru_id: null,
        mapel_id: '',
        kelas_id: '',
        tanggal: '',
    });

    const [supervisorSearch, setSupervisorSearch] = useState('');
    const [guruSearch, setGuruSearch] = useState('');
    const [showSupervisorDropdown, setShowSupervisorDropdown] = useState(false);
    const [showGuruDropdown, setShowGuruDropdown] = useState(false);

    const supervisorDropdownRef = useRef(null);
    const guruDropdownRef = useRef(null);

    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState('asc');
    const [activeFilter, setActiveFilter] = useState(null);

    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [expandedRows, setExpandedRows] = useState(new Set());
    const [currentPage, setCurrentPage] = useState(1);

    // Wizard popup state
    const [showWizard, setShowWizard] = useState(false);
    const [wizardStep, setWizardStep] = useState(1);
    const [wizardItem, setWizardItem] = useState(null);
    const [wizardSubmitting, setWizardSubmitting] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [wizardData, setWizardData] = useState({
        kelas: '',
        topik: '',
        bagian_a: {},
        bagian_b: {},
        dokumentasi: [],
    });

    const toggleRowExpand = (idx) => {
        setExpandedRows(prev => {
            const next = new Set(prev);
            if (next.has(idx)) next.delete(idx);
            else next.add(idx);
            return next;
        });
    };

    const fetchData = async (tahunId = tahunAjaranId) => {
        try {
            setLoading(true);
            const supervisiUrl = tahunId ? `${API_BASE}/supervisi?tahun_ajaran_id=${tahunId}` : `${API_BASE}/supervisi`;
            const [supervisiRes, guruRes, mapelRes, jadwalRes, kelasRes] = await Promise.all([
                authFetch(supervisiUrl),
                authFetch(`${API_BASE}/guru`),
                authFetch(`${API_BASE}/mapel`),
                authFetch(`${API_BASE}/jadwal`),
                authFetch(`${API_BASE}/kelas`),
            ]);
            setData((await supervisiRes.json()).data || []);
            setGuruList((await guruRes.json()).data || []);
            setMapelList((await mapelRes.json()).data || []);
            setJadwalList((await jadwalRes.json()).data || []);
            setKelasList((await kelasRes.json()).data || []);
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
            if (supervisorDropdownRef.current && !supervisorDropdownRef.current.contains(e.target)) setShowSupervisorDropdown(false);
            if (guruDropdownRef.current && !guruDropdownRef.current.contains(e.target)) setShowGuruDropdown(false);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            return `${day}-${month}-${year}`;
        } catch (e) {
            return dateStr;
        }
    };

    const sortData = (dataToSort, column, direction) => {
        if (!column) return dataToSort;
        const dir = direction === 'asc' ? 1 : -1;
        return [...dataToSort].sort((a, b) => {
            let aVal, bVal;
            if (column === 'supervisor') {
                aVal = a.supervisor?.nama || '';
                bVal = b.supervisor?.nama || '';
            } else if (column === 'guru') {
                aVal = a.guru?.nama || '';
                bVal = b.guru?.nama || '';
            } else if (column === 'mapel') {
                aVal = a.mapel?.nama_mapel || '';
                bVal = b.mapel?.nama_mapel || '';
            } else {
                aVal = a[column] || '';
                bVal = b[column] || '';
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

    // Get mapel options filtered by selected guru (via jadwal)
    const getGuruMapelList = (guruId) => {
        if (!guruId) return [];
        const guruJadwal = jadwalList.filter(j => j.guru_id === guruId);
        const mapelIds = [...new Set(guruJadwal.map(j => j.mapel_id))];
        return mapelList.filter(m => mapelIds.includes(m.id));
    };

    const filteredMapelList = getGuruMapelList(formData.guru_id);

    // Get kelas options filtered by guru + mapel (via jadwal)
    const getGuruKelasList = (guruId, mapelId) => {
        if (!guruId || !mapelId) return [];
        const matched = jadwalList.filter(j => j.guru_id === guruId && j.mapel_id === Number(mapelId));
        const kelasIds = [...new Set(matched.map(j => j.kelas_id))];
        return kelasList.filter(k => kelasIds.includes(k.id));
    };

    const filteredKelasList = getGuruKelasList(formData.guru_id, formData.mapel_id);

    // Get allowed days of the week based on guru + mapel + kelas jadwal
    const HARI_MAP = { 'Minggu': 0, 'Senin': 1, 'Selasa': 2, 'Rabu': 3, 'Kamis': 4, 'Jumat': 5, 'Sabtu': 6 };
    const getAllowedDays = () => {
        if (!formData.guru_id || !formData.mapel_id || !formData.kelas_id) return null;
        const matched = jadwalList.filter(j =>
            j.guru_id === formData.guru_id &&
            j.mapel_id === Number(formData.mapel_id) &&
            j.kelas_id === Number(formData.kelas_id) &&
            j.status === 'Aktif'
        );
        const days = [...new Set(matched.map(j => j.hari))];
        return { names: days, numbers: days.map(d => HARI_MAP[d]).filter(n => n !== undefined) };
    };

    const allowedDays = getAllowedDays();

    // Validate if a date falls on an allowed day
    const isDateAllowed = (dateStr) => {
        if (!allowedDays || allowedDays.numbers.length === 0) return true;
        const d = new Date(dateStr);
        return allowedDays.numbers.includes(d.getDay());
    };

    const filteredData = (() => {
        let result = data.filter(item => {
            if (!search) return true;
            const s = search.toLowerCase();
            return (
                item.supervisor?.nama?.toLowerCase().includes(s) ||
                item.guru?.nama?.toLowerCase().includes(s) ||
                item.mapel?.nama_mapel?.toLowerCase().includes(s)
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
    }, [search]);

    const handleSelectItem = (id) => {
        const newSelected = new Set(selectedItems);
        if (newSelected.has(id)) newSelected.delete(id);
        else newSelected.add(id);
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
            title: `Hapus ${selectedItems.size} data supervisi?`,
            text: 'Data yang dihapus tidak dapat dikembalikan!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Ya, Hapus Semua!',
            cancelButtonText: 'Batal',
        });
        if (!result.isConfirmed) return;
        try {
            const response = await authFetch(`${API_BASE}/supervisi/bulk-delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({ ids: Array.from(selectedItems) }),
            });
            if (response.ok) {
                setSelectedItems(new Set());
                fetchData();
                Swal.fire({ icon: 'success', title: 'Terhapus!', text: `${selectedItems.size} data supervisi berhasil dihapus`, timer: 1500, showConfirmButton: false });
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
            const response = await authFetch(`${API_BASE}/export-pdf/supervisi`);
            if (!response.ok) throw new Error('Gagal mengunduh PDF');
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Supervisi_${new Date().toISOString().split('T')[0]}.pdf`;
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
            No: idx + 1,
            Supervisor: item.supervisor?.nama || '-',
            'Guru Yang Disupervisi': item.guru?.nama || '-',
            Mapel: item.mapel?.nama_mapel || '-',
            Tanggal: item.tanggal ? item.tanggal.substring(0, 10) : '-',
        }));
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Data Supervisi');
        XLSX.writeFile(wb, `Supervisi_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const resetForm = () => {
        setFormData({
            supervisor_id: null,
            guru_id: null,
            mapel_id: '',
            kelas_id: '',
            tanggal: '',
        });
        setSupervisorSearch('');
        setGuruSearch('');
    };

    const openAddModal = () => {
        setModalMode('add');
        setCurrentItem(null);
        resetForm();
        setShowModal(true);
    };

    const openEditModal = (item) => {
        setModalMode('edit');
        setCurrentItem(item);
        // Try to find matching kelas_id from jadwal
        let kelasId = '';
        if (item.guru_id && item.mapel_id) {
            const matched = jadwalList.filter(j => j.guru_id === item.guru_id && j.mapel_id === item.mapel_id);
            if (matched.length === 1) {
                kelasId = matched[0].kelas_id;
            } else if (item.kelas) {
                // Try matching by kelas name
                const byName = matched.find(j => {
                    const k = kelasList.find(kl => kl.id === j.kelas_id);
                    return k && k.nama_kelas === item.kelas;
                });
                if (byName) kelasId = byName.kelas_id;
            }
        }
        setFormData({
            supervisor_id: item.supervisor_id,
            guru_id: item.guru_id,
            mapel_id: item.mapel_id || '',
            kelas_id: kelasId,
            tanggal: item.tanggal ? item.tanggal.substring(0, 10) : '',
        });
        setSupervisorSearch(item.supervisor?.nama || '');
        setGuruSearch(item.guru?.nama || '');
        setShowModal(true);
    };

    const closeModal = () => setShowModal(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const url = modalMode === 'add' ? `${API_BASE}/supervisi` : `${API_BASE}/supervisi/${currentItem.id}`;
            const method = modalMode === 'add' ? 'POST' : 'PUT';
            const payload = { ...formData, tahun_ajaran_id: tahunAjaranId };
            const res = await authFetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                closeModal();
                fetchData();
                Swal.fire({ icon: 'success', title: 'Berhasil!', text: modalMode === 'add' ? 'Jadwal supervisi tersimpan' : 'Data supervisi diperbarui', timer: 1500, showConfirmButton: false });
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

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Hapus Supervisi?',
            text: 'Data supervisi akan dihapus secara permanen!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Ya, Hapus!',
            cancelButtonText: 'Batal',
        });
        if (result.isConfirmed) {
            try {
                const res = await authFetch(`${API_BASE}/supervisi/${id}`, { method: 'DELETE', headers: { Accept: 'application/json' } });
                if (res.ok) {
                    Swal.fire({ icon: 'success', title: 'Terhapus!', text: 'Data supervisi telah dihapus', timer: 1500, showConfirmButton: false });
                    fetchData();
                }
            } catch (error) {
                console.error('Error deleting data:', error);
                Swal.fire('Gagal', 'Terjadi kesalahan saat menghapus data', 'error');
            }
        }
    };

    // === Wizard Popup Handlers ===
    const openSupervisiPopup = (item) => {
        setWizardItem(item);
        setWizardStep(1);
        // Pre-fill if existing data
        if (item.hasil_supervisi && item.kelas) {
            setWizardData({
                kelas: item.kelas || '',
                topik: item.topik || '',
                bagian_a: item.hasil_supervisi?.bagian_a || {},
                bagian_b: item.hasil_supervisi?.bagian_b || {},
                dokumentasi: item.dokumentasi || [],
            });
        } else {
            setWizardData({ kelas: '', topik: '', bagian_a: {}, bagian_b: {}, dokumentasi: [] });
        }
        setShowWizard(true);
    };

    const handleWizardNext = () => {
        if (wizardStep === 1) {
            if (!wizardData.kelas || !wizardData.topik.trim()) {
                Swal.fire({ icon: 'warning', title: 'Data belum lengkap', text: 'Kelas dan Topik harus diisi', timer: 2000, showConfirmButton: false });
                return;
            }
        }
        if (wizardStep === 2) {
            const allA = BAGIAN_A.every(item => wizardData.bagian_a[item.key]);
            if (!allA) {
                Swal.fire({ icon: 'warning', title: 'Penilaian belum lengkap', text: 'Semua item Bagian A harus dinilai', timer: 2000, showConfirmButton: false });
                return;
            }
        }
        setWizardStep(wizardStep + 1);
    };

    const handleWizardSubmit = async () => {
        // Validate step 3
        const allB = BAGIAN_B.every(item => wizardData.bagian_b[item.key]);
        if (!allB) {
            Swal.fire({ icon: 'warning', title: 'Penilaian belum lengkap', text: 'Semua item Bagian B harus dinilai', timer: 2000, showConfirmButton: false });
            return;
        }
        if (wizardData.dokumentasi.length < 2) {
            Swal.fire({ icon: 'warning', title: 'Foto kurang', text: 'Minimal upload 2 foto dokumentasi', timer: 2000, showConfirmButton: false });
            return;
        }

        setWizardSubmitting(true);
        try {
            const response = await authFetch(`${API_BASE}/supervisi/${wizardItem.id}/submit-hasil`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({
                    kelas: wizardData.kelas,
                    topik: wizardData.topik,
                    hasil_supervisi: { bagian_a: wizardData.bagian_a, bagian_b: wizardData.bagian_b },
                    dokumentasi: wizardData.dokumentasi,
                }),
            });
            if (response.ok) {
                setShowWizard(false);
                fetchData();
                Swal.fire({ icon: 'success', title: 'Berhasil!', text: 'Hasil supervisi berhasil disimpan', timer: 1500, showConfirmButton: false });
            } else {
                const errData = await response.json();
                Swal.fire({ icon: 'error', title: 'Gagal', text: errData.message || 'Terjadi kesalahan' });
            }
        } catch (error) {
            console.error('Submit supervisi error:', error);
            Swal.fire({ icon: 'error', title: 'Error', text: 'Tidak dapat mengirim data' });
        } finally {
            setWizardSubmitting(false);
        }
    };

    const handleWizardPhotoUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        const remainingSlots = 4 - wizardData.dokumentasi.length;
        const filesToProcess = files.slice(0, remainingSlots);
        if (filesToProcess.length === 0) { Swal.fire({ icon: 'info', title: 'Maksimal 4 foto', timer: 1500, showConfirmButton: false }); return; }

        setUploadingPhoto(true);
        try {
            const compressedPhotos = await Promise.all(filesToProcess.map(file => compressImage(file, 800, 0.6)));
            setWizardData(prev => ({ ...prev, dokumentasi: [...prev.dokumentasi, ...compressedPhotos] }));
        } catch (err) {
            console.error('Error compressing photos:', err);
            Swal.fire({ icon: 'error', title: 'Gagal', text: 'Gagal memproses foto' });
        } finally {
            setUploadingPhoto(false);
        }
        e.target.value = '';
    };

    const handlePrint = (item) => {
        const token = localStorage.getItem('auth_token');
        const url = `${API_BASE}/supervisi/${item.id}/print-supervisi?token=${token}`;
        window.open(url, '_blank');
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

    return (
        <div className="animate-fadeIn flex flex-col flex-grow max-w-full overflow-auto">
            {/* Header */}
            <header className={`${isMobile ? 'mb-3 mobile-sticky-header pt-2 pb-2 px-1' : 'mb-6'}`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="page-header-icon w-12 h-12 bg-gradient-to-br from-primary to-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                            <i className="fas fa-clipboard-check text-white text-xl"></i>
                        </div>
                        <div>
                            <h1 className="page-header-title text-xl font-black text-gray-800 dark:text-dark-text uppercase tracking-tight">Supervisi</h1>
                            <p className="page-header-subtitle text-xs text-gray-400 mt-0.5 font-medium uppercase tracking-widest">Kelola jadwal & hasil supervisi guru</p>
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
                            aria-label="Cari supervisi"
                            className={`w-full !pl-8 pr-2 ${isMobile ? 'py-1.5 text-[10px]' : 'py-3 text-sm'} bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all dark:text-dark-text placeholder-gray-400 shadow-sm`}
                            placeholder={isMobile ? 'Cari...' : 'Cari supervisor, guru, atau mapel...'}
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
                            <i className="fas fa-plus-circle group-hover:rotate-12 transition-transform"></i>
                            <span>{isMobile ? 'Tambah' : 'Tambah Jadwal'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Table Section */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="ml-3 text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-widest">Memuat data supervisi...</span>
                </div>
            ) : (
                <div className={`bg-white dark:bg-dark-surface rounded-2xl shadow-soft border border-gray-100 dark:border-dark-border ${isMobile ? '' : 'overflow-x-auto scrollbar-hide max-w-full'}`}>
                    <table className={`admin-table ${isMobile ? 'mobile-table-fixed' : 'min-w-[900px]'}`}>
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
                                <SortableHeader label="Supervisor" column="supervisor" />
                                <SortableHeader label={isMobile ? 'Guru' : 'Guru Yang Disupervisi'} column="guru" />
                                {!isMobile && <SortableHeader label="Mapel" column="mapel" />}
                                <SortableHeader label="Tanggal" column="tanggal" />
                                <th className={`select-none ${isMobile ? 'py-1.5 px-0 text-left' : 'py-2.5 px-6 text-center'} text-xs font-black text-gray-400 uppercase tracking-widest`} style={isMobile ? { width: '100px', overflow: 'visible' } : {}}>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.map((item, idx) => (
                                <React.Fragment key={item.id}>
                                    <tr className={`hover:bg-gray-50/50 dark:hover:bg-dark-bg/20 transition-colors border-b border-gray-100 dark:border-dark-border last:border-0 group ${selectedItems.has(item.id) ? 'bg-primary/5 dark:bg-primary/10' : ''}`}>
                                        {!isMobile && (
                                            <td className={`pl-6 py-2.5 align-middle text-center`}>
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
                                            <div className="flex flex-col">
                                                <span className={`${isMobile ? 'text-[8px] leading-tight' : 'text-xs'} font-black text-gray-700 dark:text-dark-text group-hover:text-primary transition-colors uppercase tracking-tight ${isMobile ? 'whitespace-normal break-words' : ''}`}>{item.supervisor?.nama || '-'}</span>
                                                {!isMobile && <span className="text-[8px] text-gray-400 font-medium italic">{item.supervisor?.jabatan || 'Tenaga Pendidik'}</span>}
                                            </div>
                                        </td>
                                        <td className={`${isMobile ? 'py-1 px-1' : 'py-2.5 px-2'} align-middle`}>
                                            <div className="flex flex-col">
                                                <span className={`${isMobile ? 'text-[8px] leading-tight' : 'text-xs'} font-bold text-gray-600 dark:text-dark-text uppercase tracking-tight`}>{item.guru?.nama || '-'}</span>
                                                {!isMobile && <span className="text-[8px] text-gray-400 font-medium">NIP: {item.guru?.nip || '-'}</span>}
                                            </div>
                                        </td>
                                        {!isMobile && (
                                            <td className="py-2.5 px-2 align-middle">
                                                <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-primary/5 text-primary dark:bg-primary/20">
                                                    {item.mapel?.nama_mapel || '-'}
                                                </span>
                                            </td>
                                        )}
                                        <td className={`${isMobile ? 'py-1 px-1' : 'py-2.5 px-2'} align-middle`}>
                                            <div className={`flex items-center gap-1 ${isMobile ? 'text-[8px]' : 'text-[11px]'} font-bold text-gray-600 dark:text-gray-400`}>
                                                <i className={`far fa-calendar-alt ${isMobile ? 'text-[7px]' : 'text-[9px]'} text-primary flex-shrink-0`}></i>
                                                {item.tanggal ? item.tanggal.substring(0, 10) : '-'}
                                            </div>
                                        </td>
                                        <td className={`${isMobile ? 'py-1 px-0' : 'py-2.5 px-6'} align-middle text-center`} style={isMobile ? { overflow: 'visible' } : {}}>
                                            <div className={`flex items-center ${isMobile ? 'justify-start flex-nowrap gap-px' : 'justify-center gap-1'}`}>
                                                <button onClick={() => openSupervisiPopup(item)} className={`${isMobile ? 'w-4 h-4' : 'w-8 h-8'} flex-shrink-0 rounded ${item.status === 'selesai' ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' : 'bg-primary/10 text-primary hover:bg-primary/20'} transition-all flex items-center justify-center`} title={item.status === 'selesai' ? 'Lihat/Edit Hasil' : 'Isi Supervisi'}>
                                                    <i className={`fas ${item.status === 'selesai' ? 'fa-eye' : 'fa-clipboard-check'} ${isMobile ? 'text-[6px]' : 'text-[10px]'}`}></i>
                                                </button>
                                                <button onClick={() => handlePrint(item)} className={`${isMobile ? 'w-4 h-4' : 'w-8 h-8'} flex-shrink-0 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all flex items-center justify-center`} title="Cetak">
                                                    <i className={`fas fa-print ${isMobile ? 'text-[6px]' : 'text-[10px]'}`}></i>
                                                </button>
                                                <button onClick={() => openEditModal(item)} className={`${isMobile ? 'w-4 h-4' : 'w-8 h-8'} flex-shrink-0 rounded bg-orange-50 text-orange-600 hover:bg-orange-100 transition-all flex items-center justify-center`} title="Edit Jadwal">
                                                    <i className={`fas fa-pen ${isMobile ? 'text-[6px]' : 'text-[10px]'}`}></i>
                                                </button>
                                                <button onClick={() => handleDelete(item.id)} className={`${isMobile ? 'w-4 h-4' : 'w-8 h-8'} flex-shrink-0 rounded bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all flex items-center justify-center`} title="Hapus">
                                                    <i className={`fas fa-trash ${isMobile ? 'text-[6px]' : 'text-[10px]'}`}></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    {isMobile && expandedRows.has(idx) && (
                                        <tr className="bg-gray-50/50 dark:bg-dark-bg/30 border-b border-gray-100 dark:border-dark-border animate-slideDown">
                                            <td colSpan="4" className="p-0">
                                                <div className="mobile-expand-grid">
                                                    <div className="expand-item"><span className="expand-label">Mapel</span><span className="expand-value">{item.mapel?.nama_mapel || '-'}</span></div>
                                                    <div className="expand-item"><span className="expand-label">Jabatan Supervisor</span><span className="expand-value">{item.supervisor?.jabatan || '-'}</span></div>
                                                    <div className="expand-item"><span className="expand-label">NIP Guru</span><span className="expand-value">{item.guru?.nip || '-'}</span></div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                            {filteredData.length === 0 && (
                                <tr>
                                    <td colSpan={isMobile ? 4 : 7} className="py-24 text-center">
                                        <div className="flex flex-col items-center justify-center gap-4 opacity-40">
                                            <i className="fas fa-clipboard-check text-5xl"></i>
                                            <p className="text-xs font-black uppercase tracking-widest">Belum ada jadwal supervisi</p>
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
                                {filteredData.length} Data Supervisi
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

            {/* Modal */}
            <CrudModal
                show={showModal}
                onClose={closeModal}
                title={modalMode === 'add' ? 'Tambah Jadwal Supervisi' : 'Edit Jadwal Supervisi'}
                subtitle="Atur jadwal kunjungan supervisi"
                icon={modalMode === 'add' ? 'plus-circle' : 'edit'}
                onSubmit={handleSubmit}
                submitLabel={modalMode === 'add' ? 'Simpan Jadwal' : 'Simpan Perubahan'}
                maxWidth="max-w-3xl"
            >
                {/* Section 1: Supervisor & Guru */}
                <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-4 px-1">Data Supervisi</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Supervisor */}
                        <div className="space-y-1.5 relative" ref={supervisorDropdownRef}>
                            <label className="block text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wide">Supervisor *</label>
                            <div className="relative group">
                                <input
                                    type="text"
                                    placeholder="Cari nama supervisor..."
                                    value={supervisorSearch}
                                    onChange={(e) => { setSupervisorSearch(e.target.value); setShowSupervisorDropdown(true); }}
                                    onFocus={() => setShowSupervisorDropdown(true)}
                                    className="input-standard font-bold"
                                    required
                                />
                            </div>
                            {showSupervisorDropdown && supervisorSearch && (
                                <div className="absolute z-50 mt-1 w-full bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-xl shadow-xl max-h-48 overflow-y-auto animate-fadeIn">
                                    {guruList.filter(g => g.nama?.toLowerCase().includes(supervisorSearch.toLowerCase())).map(g => (
                                        <div key={g.id} onClick={() => { setFormData({ ...formData, supervisor_id: g.id }); setSupervisorSearch(g.nama); setShowSupervisorDropdown(false); }} className="px-4 py-2.5 hover:bg-primary/5 cursor-pointer flex flex-col gap-0.5 border-b border-gray-50 dark:border-dark-border last:border-0">
                                            <span className="text-xs font-bold text-gray-700 dark:text-dark-text">{g.nama}</span>
                                            <span className="text-[10px] text-gray-400">{g.jabatan || 'Tenaga Pendidik'}</span>
                                        </div>
                                    ))}
                                    {guruList.filter(g => g.nama?.toLowerCase().includes(supervisorSearch.toLowerCase())).length === 0 && (
                                        <div className="px-4 py-3 text-center text-[11px] text-gray-400">Tidak ditemukan</div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Guru Yang Disupervisi */}
                        <div className="space-y-1.5 relative" ref={guruDropdownRef}>
                            <label className="block text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wide">Guru Yang Disupervisi *</label>
                            <div className="relative group">
                                <input
                                    type="text"
                                    placeholder="Cari nama guru..."
                                    value={guruSearch}
                                    onChange={(e) => { setGuruSearch(e.target.value); setShowGuruDropdown(true); }}
                                    onFocus={() => setShowGuruDropdown(true)}
                                    className="input-standard font-bold"
                                    required
                                />
                            </div>
                            {showGuruDropdown && guruSearch && (
                                <div className="absolute z-50 mt-1 w-full bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-xl shadow-xl max-h-48 overflow-y-auto animate-fadeIn">
                                    {guruList.filter(g => g.nama?.toLowerCase().includes(guruSearch.toLowerCase())).map(g => (
                                        <div key={g.id} onClick={() => { setFormData({ ...formData, guru_id: g.id, mapel_id: '', kelas_id: '', tanggal: '' }); setGuruSearch(g.nama); setShowGuruDropdown(false); }} className="px-4 py-2.5 hover:bg-primary/5 cursor-pointer flex flex-col gap-0.5 border-b border-gray-50 dark:border-dark-border last:border-0">
                                            <span className="text-xs font-bold text-gray-700 dark:text-dark-text">{g.nama}</span>
                                            <span className="text-[10px] text-gray-400">{g.jabatan || 'Tenaga Pendidik'} · NIP: {g.nip || '-'}</span>
                                        </div>
                                    ))}
                                    {guruList.filter(g => g.nama?.toLowerCase().includes(guruSearch.toLowerCase())).length === 0 && (
                                        <div className="px-4 py-3 text-center text-[11px] text-gray-400">Tidak ditemukan</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Section 2: Mapel, Kelas & Tanggal */}
                <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-4 px-1">Detail Kunjungan</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {/* Mata Pelajaran */}
                        <div className="space-y-1.5">
                            <label className="block text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wide">Mata Pelajaran *</label>
                            <select
                                value={formData.mapel_id}
                                onChange={(e) => setFormData({ ...formData, mapel_id: e.target.value, kelas_id: '', tanggal: '' })}
                                className="input-standard outline-none"
                                required
                                disabled={!formData.guru_id}
                            >
                                <option value="">{formData.guru_id ? 'Pilih Mapel' : 'Pilih guru dulu'}</option>
                                {filteredMapelList.map(m => (
                                    <option key={m.id} value={m.id}>{m.nama_mapel}</option>
                                ))}
                            </select>
                            {formData.guru_id && filteredMapelList.length === 0 && (
                                <p className="text-[10px] text-orange-500 font-medium">Guru ini belum memiliki jadwal mapel</p>
                            )}
                        </div>

                        {/* Kelas */}
                        <div className="space-y-1.5">
                            <label className="block text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wide">Kelas *</label>
                            <select
                                value={formData.kelas_id}
                                onChange={(e) => setFormData({ ...formData, kelas_id: e.target.value, tanggal: '' })}
                                className="input-standard outline-none"
                                required
                                disabled={!formData.mapel_id}
                            >
                                <option value="">{formData.mapel_id ? 'Pilih Kelas' : 'Pilih mapel dulu'}</option>
                                {filteredKelasList.map(k => (
                                    <option key={k.id} value={k.id}>{k.nama_kelas}</option>
                                ))}
                            </select>
                            {formData.mapel_id && filteredKelasList.length === 0 && (
                                <p className="text-[10px] text-orange-500 font-medium">Tidak ada kelas untuk mapel ini</p>
                            )}
                        </div>

                        {/* Tanggal */}
                        <div className="space-y-1.5">
                            <label className="block text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wide">Tanggal *</label>
                            <input
                                required
                                type="date"
                                value={formData.tanggal}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val && allowedDays && allowedDays.numbers.length > 0 && !isDateAllowed(val)) {
                                        Swal.fire({
                                            icon: 'warning',
                                            title: 'Hari tidak sesuai jadwal',
                                            text: `Guru hanya mengajar mapel & kelas ini pada hari ${allowedDays.names.join(', ')}`,
                                            timer: 3000,
                                            showConfirmButton: false,
                                        });
                                        return;
                                    }
                                    setFormData({ ...formData, tanggal: val });
                                }}
                                className="input-standard"
                                disabled={!formData.kelas_id}
                            />
                            {allowedDays && allowedDays.names.length > 0 && (
                                <p className="text-[10px] text-primary font-semibold flex items-center gap-1">
                                    <i className="fas fa-info-circle text-[8px]"></i>
                                    Jadwal: {allowedDays.names.join(', ')}
                                </p>
                            )}
                            {formData.kelas_id && (!allowedDays || allowedDays.names.length === 0) && (
                                <p className="text-[10px] text-orange-500 font-medium">Tidak ada jadwal aktif untuk kombinasi ini</p>
                            )}
                        </div>
                    </div>
                </div>
            </CrudModal>

            {/* Wizard Popup */}
            {showWizard && wizardItem && ReactDOM.createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setShowWizard(false)}>
                    <div className="bg-white dark:bg-dark-surface rounded-2xl w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden" style={{ maxHeight: '92vh' }} onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="bg-gradient-to-r from-primary to-green-600 text-white p-5 flex-shrink-0">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center">
                                        <i className="fas fa-clipboard-check text-lg"></i>
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-sm">Form Supervisi Pembelajaran</h2>
                                        <p className="text-green-100 text-xs">{wizardItem.guru?.nama} · {wizardItem.mapel?.nama_mapel}</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowWizard(false)} className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-lg transition-colors">
                                    <i className="fas fa-times text-xl"></i>
                                </button>
                            </div>
                            {/* Stepper */}
                            <div className="flex items-center gap-2 mt-4">
                                {[1, 2, 3].map(step => (
                                    <div key={step} className="flex-1 flex items-center gap-2">
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${wizardStep >= step ? 'bg-white text-primary' : 'bg-white/20 text-white/60'}`}>{step}</div>
                                        <span className={`text-[10px] font-medium hidden md:block ${wizardStep >= step ? 'text-white' : 'text-white/40'}`}>
                                            {step === 1 ? 'Data Awal' : step === 2 ? 'Perencanaan' : 'Pelaksanaan'}
                                        </span>
                                        {step < 3 && <div className={`flex-1 h-0.5 rounded-full ${wizardStep > step ? 'bg-white' : 'bg-white/20'}`}></div>}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-5">
                            {wizardStep === 1 && (
                                <>
                                    <div className="bg-gray-50 dark:bg-dark-bg/30 rounded-xl p-4 space-y-3">
                                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Informasi Guru</h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div><span className="text-[10px] text-gray-400 block">Nama Guru</span><span className="text-sm font-bold text-gray-700">{wizardItem.guru?.nama || '-'}</span></div>
                                            <div><span className="text-[10px] text-gray-400 block">NIP</span><span className="text-sm font-bold text-gray-700">{wizardItem.guru?.nip || '-'}</span></div>
                                            <div><span className="text-[10px] text-gray-400 block">Mata Pelajaran</span><span className="text-sm font-bold text-primary">{wizardItem.mapel?.nama_mapel || '-'}</span></div>
                                            <div><span className="text-[10px] text-gray-400 block">Tanggal</span><span className="text-sm font-bold text-gray-700">{wizardItem.tanggal?.substring(0, 10) || '-'}</span></div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Detail Kunjungan</h3>
                                        <div className="space-y-1.5">
                                            <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wide">Kelas *</label>
                                            <select value={wizardData.kelas} onChange={(e) => setWizardData({ ...wizardData, kelas: e.target.value })} className="input-standard" required>
                                                <option value="">-- Pilih Kelas --</option>
                                                {kelasList.map(k => (
                                                    <option key={k.id} value={k.nama_kelas}>{k.nama_kelas}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wide">Topik / Materi Pembelajaran *</label>
                                            <input type="text" value={wizardData.topik} onChange={(e) => setWizardData({ ...wizardData, topik: e.target.value })} className="input-standard" placeholder="Topik yang sedang diajarkan" required />
                                        </div>
                                    </div>
                                </>
                            )}

                            {wizardStep === 2 && (
                                <>
                                    <div className="flex items-center gap-3 mb-1">
                                        <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center"><i className="fas fa-book text-blue-600 text-sm"></i></div>
                                        <div>
                                            <h3 className="text-sm font-bold text-gray-800">Bagian A: Perencanaan Pembelajaran</h3>
                                            <p className="text-[10px] text-gray-400">Penilaian Modul Ajar</p>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        {BAGIAN_A.map(item => (
                                            <div key={item.key} className="bg-gray-50 dark:bg-dark-bg/30 rounded-xl p-4 space-y-3">
                                                <div>
                                                    <h4 className="text-xs font-bold text-gray-700">{item.label}</h4>
                                                    <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">{item.desc}</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    {[1, 2, 3, 4].map(val => (
                                                        <button
                                                            key={val}
                                                            type="button"
                                                            onClick={() => setWizardData({ ...wizardData, bagian_a: { ...wizardData.bagian_a, [item.key]: val } })}
                                                            className={`flex-1 py-2.5 rounded-xl text-[10px] font-bold transition-all shadow-sm ${wizardData.bagian_a[item.key] === val
                                                                ? LIKERT_COLORS[val]
                                                                : 'bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border text-gray-500 hover:border-primary/30'
                                                                }`}
                                                        >
                                                            <span className="block text-base font-black">{val}</span>
                                                            <span className="block mt-0.5 leading-tight">{LIKERT_LABELS[val]}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            {wizardStep === 3 && (
                                <>
                                    <div className="flex items-center gap-3 mb-1">
                                        <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center"><i className="fas fa-chalkboard-teacher text-emerald-600 text-sm"></i></div>
                                        <div>
                                            <h3 className="text-sm font-bold text-gray-800">Bagian B: Pelaksanaan Pembelajaran</h3>
                                            <p className="text-[10px] text-gray-400">Penilaian Proses Mengajar</p>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        {BAGIAN_B.map(item => (
                                            <div key={item.key} className="bg-gray-50 dark:bg-dark-bg/30 rounded-xl p-4 space-y-3">
                                                <div>
                                                    <h4 className="text-xs font-bold text-gray-700">{item.label}</h4>
                                                    <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">{item.desc}</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    {[1, 2, 3, 4].map(val => (
                                                        <button
                                                            key={val}
                                                            type="button"
                                                            onClick={() => setWizardData({ ...wizardData, bagian_b: { ...wizardData.bagian_b, [item.key]: val } })}
                                                            className={`flex-1 py-2.5 rounded-xl text-[10px] font-bold transition-all shadow-sm ${wizardData.bagian_b[item.key] === val
                                                                ? LIKERT_COLORS[val]
                                                                : 'bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border text-gray-500 hover:border-primary/30'
                                                                }`}
                                                        >
                                                            <span className="block text-base font-black">{val}</span>
                                                            <span className="block mt-0.5 leading-tight">{LIKERT_LABELS[val]}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Photo Upload */}
                                    <div className="mt-6">
                                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Dokumentasi Foto <span className="text-red-500">*</span> <span className="font-normal text-gray-400">(Min 2, Max 4)</span></h3>
                                        {wizardData.dokumentasi.length > 0 && (
                                            <div className="grid grid-cols-2 gap-2 mb-3">
                                                {wizardData.dokumentasi.map((photo, index) => (
                                                    <div key={index} className="relative aspect-video rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                                                        <img src={photo} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
                                                        <button onClick={() => setWizardData({ ...wizardData, dokumentasi: wizardData.dokumentasi.filter((_, i) => i !== index) })} className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 shadow-md">
                                                            <i className="fas fa-times"></i>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {wizardData.dokumentasi.length < 4 && (
                                            <div className="space-y-2">
                                                {uploadingPhoto ? (
                                                    <div className="flex items-center justify-center gap-2 text-gray-500 py-6">
                                                        <i className="fas fa-spinner fa-spin"></i>
                                                        <span className="text-sm">Memproses foto...</span>
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <label className="flex flex-col items-center justify-center border-2 border-dashed border-green-300 rounded-xl p-4 cursor-pointer hover:border-green-500 hover:bg-green-50 transition-all bg-green-50/30">
                                                            <input type="file" accept="image/*" capture="environment" onChange={handleWizardPhotoUpload} className="hidden" />
                                                            <i className="fas fa-camera text-green-500 text-2xl mb-2"></i>
                                                            <span className="text-xs font-medium text-green-600">Ambil Foto</span>
                                                        </label>
                                                        <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-4 cursor-pointer hover:border-green-400 hover:bg-green-50 transition-all">
                                                            <input type="file" accept="image/*" multiple onChange={handleWizardPhotoUpload} className="hidden" />
                                                            <i className="fas fa-images text-gray-400 text-2xl mb-2"></i>
                                                            <span className="text-xs font-medium text-gray-500">Pilih File</span>
                                                        </label>
                                                    </div>
                                                )}
                                                <p className="text-xs text-gray-400 text-center">{wizardData.dokumentasi.length}/4 foto (auto compress)</p>
                                            </div>
                                        )}
                                        {wizardData.dokumentasi.length < 2 && (
                                            <p className="text-xs text-red-500 mt-1"><i className="fas fa-exclamation-circle mr-1"></i>Minimal upload 2 foto dokumentasi</p>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex-shrink-0 p-4 border-t border-gray-100 dark:border-dark-border flex gap-3 bg-white dark:bg-dark-surface">
                            {wizardStep > 1 && (
                                <button onClick={() => setWizardStep(wizardStep - 1)} className="flex-1 py-3 border border-gray-300 dark:border-dark-border rounded-xl text-gray-600 dark:text-gray-400 font-bold text-sm hover:bg-gray-50 dark:hover:bg-dark-bg/30 transition-all flex items-center justify-center gap-2">
                                    <i className="fas fa-arrow-left text-xs"></i> Kembali
                                </button>
                            )}
                            {wizardStep < 3 ? (
                                <button onClick={handleWizardNext} className="flex-1 py-3 bg-gradient-to-r from-primary to-green-600 text-white rounded-xl font-bold text-sm hover:shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2">
                                    Lanjut <i className="fas fa-arrow-right text-xs"></i>
                                </button>
                            ) : (
                                <button onClick={handleWizardSubmit} disabled={wizardSubmitting || wizardData.dokumentasi.length < 2} className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${wizardData.dokumentasi.length >= 2 ? 'bg-gradient-to-r from-primary to-green-600 text-white hover:shadow-lg shadow-primary/20' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
                                    {wizardSubmitting ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-save"></i> Simpan Hasil</>}
                                </button>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

export default ManajemenSupervisi;
