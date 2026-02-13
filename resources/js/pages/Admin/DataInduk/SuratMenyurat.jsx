import React, { useState, useEffect, useRef } from 'react';
import CrudModal from '../../../components/CrudModal';
import { API_BASE, APP_BASE, authFetch } from '../../../config/api';
import Swal from 'sweetalert2';
import Pagination from '../../../components/Pagination';

const KODE_SURAT = {
    '001': 'Kepala Madrasah',
    '002': 'Waka Kurikulum',
    '003': 'Waka Kesiswaan',
    '004': 'Kepala Tata Usaha',
    '005': 'BK',
};

const JENIS_SURAT = {
    '001': 'Undangan',
    '002': 'Surat Tugas',
    '003': 'Surat Kuasa',
    '004': 'Pemberitahuan',
    '005': 'Surat Keputusan',
    '006': 'Surat Keterangan',
    '007': 'SK Aktif Guru',
    '008': 'SK Aktif Siswa',
    '009': 'SPPD',
};

// Jenis surat that have auto-generate templates
const TEMPLATE_JENIS = ['007', '008', '009'];

function SuratMenyurat() {
    const [activeTab, setActiveTab] = useState('keluar');
    const [data, setData] = useState([]);
    const [selectedItems, setSelectedItems] = useState(new Set());
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    const [tahunAjaranId, setTahunAjaranId] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [currentItem, setCurrentItem] = useState(null);

    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [formData, setFormData] = useState({
        kode_surat: '001',
        jenis_surat: '001',
        tanggal: new Date().toISOString().substring(0, 10),
        keterangan: '',
    });

    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState('asc');
    const [filterKode, setFilterKode] = useState('');
    const [filterJenis, setFilterJenis] = useState('');
    const [activeFilter, setActiveFilter] = useState(null);

    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [expandedRows, setExpandedRows] = useState(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    // Surat Masuk states
    const [masukData, setMasukData] = useState([]);
    const [masukLoading, setMasukLoading] = useState(true);
    const [masukSearch, setMasukSearch] = useState('');
    const [masukSelectedItems, setMasukSelectedItems] = useState(new Set());
    const [masukCurrentPage, setMasukCurrentPage] = useState(1);
    const [masukItemsPerPage, setMasukItemsPerPage] = useState(10);
    const [masukSortColumn, setMasukSortColumn] = useState(null);
    const [masukSortDirection, setMasukSortDirection] = useState('asc');
    const [masukExpandedRows, setMasukExpandedRows] = useState(new Set());
    const [showMasukModal, setShowMasukModal] = useState(false);
    const [masukModalMode, setMasukModalMode] = useState('add');
    const [masukCurrentItem, setMasukCurrentItem] = useState(null);
    const [masukFormData, setMasukFormData] = useState({
        tanggal: new Date().toISOString().substring(0, 10),
        tanggal_surat: '',
        pengirim: '', perihal: '', agenda: '', nomor_surat: '', keterangan: '',
    });
    const [masukFilePreview, setMasukFilePreview] = useState(null);
    const [masukFileBase64, setMasukFileBase64] = useState(null);
    const [scanning, setScanning] = useState(false);

    // Template Surat states (for jenis 007/008/009 inside Tambah modal)
    const [templateSelectedIds, setTemplateSelectedIds] = useState([]);
    const [templateForm, setTemplateForm] = useState({ keperluan: '', tujuan: '', kendaraan: '' });
    const [templateGuruList, setTemplateGuruList] = useState([]);
    const [templateSiswaList, setTemplateSiswaList] = useState([]);
    const [templateSearchPeople, setTemplateSearchPeople] = useState('');

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
            let url = `${API_BASE}/surat-keluar`;
            if (tahunId) url += `?tahun_ajaran_id=${tahunId}`;
            const res = await authFetch(url);
            const result = await res.json();
            if (result.success) setData(result.data);
        } catch (error) {
            console.error('Error fetching surat keluar:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => { fetchData(tahunAjaranId); }, [tahunAjaranId]);

    useEffect(() => {
        setCurrentPage(1);
        setSelectedItems(new Set());
    }, [search, filterKode, filterJenis]);

    const handleSort = (column) => {
        if (sortColumn === column) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const sortData = (arr, col, dir) => {
        return [...arr].sort((a, b) => {
            let valA = a[col], valB = b[col];
            if (typeof valA === 'string') { valA = valA.toLowerCase(); valB = (valB || '').toLowerCase(); }
            if (valA < valB) return dir === 'asc' ? -1 : 1;
            if (valA > valB) return dir === 'asc' ? 1 : -1;
            return 0;
        });
    };

    const filteredData = (() => {
        let result = data.filter(item => {
            if (filterKode && item.kode_surat !== filterKode) return false;
            if (filterJenis && item.jenis_surat !== filterJenis) return false;
            if (!search) return true;
            const s = search.toLowerCase();
            return (
                item.nomor_surat?.toLowerCase().includes(s) ||
                item.keterangan?.toLowerCase().includes(s) ||
                item.admin_name?.toLowerCase().includes(s) ||
                KODE_SURAT[item.kode_surat]?.toLowerCase().includes(s) ||
                JENIS_SURAT[item.jenis_surat]?.toLowerCase().includes(s)
            );
        });
        if (sortColumn) result = sortData(result, sortColumn, sortDirection);
        return result;
    })();

    const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);

    const openAddModal = async () => {
        setModalMode('add');
        setCurrentItem(null);
        setFormData({
            kode_surat: '001',
            jenis_surat: '001',
            tanggal: new Date().toISOString().substring(0, 10),
            keterangan: '',
        });
        setTemplateSelectedIds([]);
        setTemplateForm({ keperluan: '', tujuan: '', kendaraan: '' });
        setTemplateSearchPeople('');
        setShowModal(true);
        // Fetch guru/siswa data for template types
        try {
            const res = await authFetch(`${API_BASE}/template-surat/data`);
            const json = await res.json();
            if (json.success) {
                setTemplateGuruList(json.guru || []);
                setTemplateSiswaList(json.siswa || []);
            }
        } catch (err) {
            console.error('Failed to load template data:', err);
        }
    };

    const openEditModal = async (item) => {
        setModalMode('edit');
        setCurrentItem(item);
        setFormData({
            kode_surat: item.kode_surat || '001',
            jenis_surat: item.jenis_surat || '001',
            tanggal: item.tanggal ? item.tanggal.substring(0, 10) : '',
            keterangan: item.keterangan || '',
        });
        // Populate template states from saved data
        const td = item.template_data || {};
        setTemplateSelectedIds(td.orang_ids || []);
        setTemplateForm({
            keperluan: td.keperluan || '',
            tujuan: td.tujuan || '',
            kendaraan: td.kendaraan || '',
        });
        setTemplateSearchPeople('');
        setShowModal(true);
        // Fetch guru/siswa data for template types
        if (TEMPLATE_JENIS.includes(item.jenis_surat)) {
            try {
                const res = await authFetch(`${API_BASE}/template-surat/data`);
                const json = await res.json();
                if (json.success) {
                    setTemplateGuruList(json.guru || []);
                    setTemplateSiswaList(json.siswa || []);
                }
            } catch (err) {
                console.error('Failed to load template data:', err);
            }
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setCurrentItem(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const isTemplate = TEMPLATE_JENIS.includes(formData.jenis_surat);
        // Validate template fields
        if (isTemplate && templateSelectedIds.length === 0) {
            Swal.fire({ icon: 'warning', title: 'Pilih minimal satu orang', timer: 2000, showConfirmButton: false });
            return;
        }
        try {
            const url = modalMode === 'add' ? `${API_BASE}/surat-keluar` : `${API_BASE}/surat-keluar/${currentItem.id}`;
            const method = modalMode === 'add' ? 'POST' : 'PUT';
            const payload = { ...formData, tahun_ajaran_id: tahunAjaranId || null };
            // Add template_data for template types (add & edit)
            if (isTemplate) {
                payload.template_data = {
                    orang_ids: templateSelectedIds,
                    keperluan: templateForm.keperluan,
                    tujuan: templateForm.tujuan,
                    kendaraan: templateForm.kendaraan,
                };
            }
            const res = await authFetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if (result.success || res.ok) {
                closeModal();
                fetchData();
                Swal.fire({ icon: 'success', title: 'Berhasil!', text: result.message || 'Surat keluar tersimpan', timer: 1500, showConfirmButton: false });
            } else {
                Swal.fire({ icon: 'error', title: 'Gagal', text: result.message || 'Gagal menyimpan' });
            }
        } catch (error) {
            console.error('Error saving:', error);
            Swal.fire({ icon: 'error', title: 'Error', text: 'Terjadi kesalahan' });
        }
    };

    const handleDelete = async (item) => {
        const result = await Swal.fire({
            icon: 'warning',
            title: 'Hapus Surat?',
            html: `<p class="text-sm text-gray-600">Nomor: <strong>${item.nomor_surat}</strong></p>`,
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Hapus',
            cancelButtonText: 'Batal',
        });
        if (result.isConfirmed) {
            try {
                const res = await authFetch(`${API_BASE}/surat-keluar/${item.id}`, { method: 'DELETE' });
                if (res.ok) {
                    fetchData();
                    Swal.fire({ icon: 'success', title: 'Dihapus!', timer: 1500, showConfirmButton: false });
                } else {
                    const errData = await res.json().catch(() => null);
                    Swal.fire({ icon: 'error', title: 'Gagal', text: errData?.message || 'Gagal menghapus surat' });
                }
            } catch (error) {
                console.error('Error deleting:', error);
                Swal.fire({ icon: 'error', title: 'Error', text: 'Terjadi kesalahan jaringan' });
            }
        }
    };

    const handleBulkDelete = async () => {
        if (selectedItems.size === 0) return;
        const result = await Swal.fire({
            icon: 'warning',
            title: `Hapus ${selectedItems.size} surat?`,
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Hapus Semua',
            cancelButtonText: 'Batal',
        });
        if (result.isConfirmed) {
            try {
                const res = await authFetch(`${API_BASE}/surat-keluar/bulk-delete`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ids: Array.from(selectedItems) })
                });
                if (res.ok) {
                    setSelectedItems(new Set());
                    fetchData();
                    Swal.fire({ icon: 'success', title: 'Dihapus!', timer: 1500, showConfirmButton: false });
                } else {
                    const errData = await res.json().catch(() => null);
                    Swal.fire({ icon: 'error', title: 'Gagal', text: errData?.message || 'Gagal menghapus surat' });
                }
            } catch (error) {
                console.error('Error bulk deleting:', error);
                Swal.fire({ icon: 'error', title: 'Error', text: 'Terjadi kesalahan jaringan' });
            }
        }
    };

    const handleFileUpload = async (item) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const fd = new FormData();
            fd.append('file', file);
            try {
                setUploading(true);
                const res = await authFetch(`${API_BASE}/surat-keluar/${item.id}/upload`, {
                    method: 'POST',
                    body: fd,
                });
                const result = await res.json();
                if (result.success) {
                    fetchData();
                    Swal.fire({ icon: 'success', title: 'Berhasil!', text: 'File berhasil diupload', timer: 1500, showConfirmButton: false });
                }
            } catch (error) {
                console.error('Error uploading:', error);
            } finally {
                setUploading(false);
            }
        };
        input.click();
    };

    const toggleSelectAll = () => {
        if (selectedItems.size === paginatedData.length) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(paginatedData.map(d => d.id)));
        }
    };

    const toggleSelect = (id) => {
        setSelectedItems(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            const day = String(d.getDate()).padStart(2, '0');
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
            return `${day} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
        } catch { return dateStr; }
    };

    // Generate preview nomor surat
    const previewNomor = (() => {
        const bulanRomawi = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
        const d = formData.tanggal ? new Date(formData.tanggal) : new Date();
        const bulan = bulanRomawi[d.getMonth()] || 'I';
        const tahun = d.getFullYear();
        return `##/${formData.kode_surat}/${formData.jenis_surat}/${bulan}/${tahun}`;
    })();

    // ===================== SURAT MASUK FUNCTIONS =====================

    const fetchMasukData = async (tahunId = tahunAjaranId) => {
        try {
            setMasukLoading(true);
            let url = `${API_BASE}/surat-masuk`;
            if (tahunId) url += `?tahun_ajaran_id=${tahunId}`;
            const res = await authFetch(url);
            const result = await res.json();
            if (result.success) setMasukData(result.data);
        } catch (error) {
            console.error('Error fetching surat masuk:', error);
        } finally {
            setMasukLoading(false);
        }
    };

    useEffect(() => { if (activeTab === 'masuk') fetchMasukData(tahunAjaranId); }, [activeTab, tahunAjaranId]);

    const compressImage = (file, maxSizeKB = 200) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const MAX_WIDTH = 1200;
                    if (width > MAX_WIDTH) {
                        height = (height * MAX_WIDTH) / width;
                        width = MAX_WIDTH;
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    let quality = 0.8;
                    let result = canvas.toDataURL('image/jpeg', quality);
                    // Iteratively reduce quality to hit target size
                    while (result.length * 0.75 / 1024 > maxSizeKB && quality > 0.1) {
                        quality -= 0.05;
                        result = canvas.toDataURL('image/jpeg', quality);
                    }
                    resolve(result);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    };

    const handleMasukFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Hanya file gambar (JPG/PNG) yang diterima' });
            return;
        }
        try {
            const compressed = await compressImage(file, 200);
            setMasukFilePreview(compressed);
            setMasukFileBase64(compressed);
            // Auto-trigger AI scan
            setScanning(true);
            try {
                const res = await authFetch(`${API_BASE}/surat-masuk/scan`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: compressed }),
                });
                const result = await res.json();
                if (result.success) {
                    setMasukFormData(prev => ({
                        ...prev,
                        pengirim: result.data.pengirim || prev.pengirim,
                        perihal: result.data.perihal || prev.perihal,
                        agenda: result.data.agenda || prev.agenda,
                        nomor_surat: result.data.nomor_surat || prev.nomor_surat,
                        tanggal_surat: result.data.tanggal_surat || prev.tanggal_surat,
                    }));
                    Swal.fire({ icon: 'success', title: 'AI Scan Berhasil!', text: 'Data surat berhasil dibaca', timer: 2000, showConfirmButton: false });
                } else {
                    Swal.fire({ icon: 'warning', title: 'AI Gagal', text: result.message || 'Silakan isi manual', timer: 2000, showConfirmButton: false });
                }
            } catch (scanErr) {
                console.error('AI scan error:', scanErr);
                Swal.fire({ icon: 'info', title: 'File terupload', text: 'AI scan gagal, silakan isi data manual', timer: 2000, showConfirmButton: false });
            } finally {
                setScanning(false);
            }
        } catch (err) {
            console.error('Compress error:', err);
        }
    };

    const openMasukAddModal = () => {
        setMasukModalMode('add');
        setMasukCurrentItem(null);
        setMasukFormData({ tanggal: new Date().toISOString().substring(0, 10), tanggal_surat: '', pengirim: '', perihal: '', agenda: '', nomor_surat: '', keterangan: '' });
        setMasukFilePreview(null);
        setMasukFileBase64(null);
        setShowMasukModal(true);
    };

    const openMasukEditModal = (item) => {
        setMasukModalMode('edit');
        setMasukCurrentItem(item);
        setMasukFormData({
            tanggal: item.tanggal ? item.tanggal.substring(0, 10) : '',
            tanggal_surat: item.tanggal_surat ? item.tanggal_surat.substring(0, 10) : '',
            pengirim: item.pengirim || '', perihal: item.perihal || '',
            agenda: item.agenda || '', nomor_surat: item.nomor_surat || '',
            keterangan: item.keterangan || '',
        });
        setMasukFilePreview(item.file_url || null);
        setMasukFileBase64(null);
        setShowMasukModal(true);
    };

    const handleMasukSubmit = async (e) => {
        e.preventDefault();
        try {
            const url = masukModalMode === 'add' ? `${API_BASE}/surat-masuk` : `${API_BASE}/surat-masuk/${masukCurrentItem.id}`;
            const method = masukModalMode === 'add' ? 'POST' : 'PUT';
            const payload = { ...masukFormData, tahun_ajaran_id: tahunAjaranId || null };
            if (masukFileBase64) payload.file_surat = masukFileBase64;
            const res = await authFetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(payload),
            });
            const result = await res.json();
            if (result.success || res.ok) {
                setShowMasukModal(false);
                fetchMasukData();
                Swal.fire({ icon: 'success', title: 'Berhasil!', text: result.message || 'Surat masuk tersimpan', timer: 1500, showConfirmButton: false });
            } else {
                Swal.fire({ icon: 'error', title: 'Gagal', text: result.message || 'Gagal menyimpan' });
            }
        } catch (error) {
            console.error('Error saving:', error);
            Swal.fire({ icon: 'error', title: 'Error', text: 'Terjadi kesalahan' });
        }
    };

    const handleMasukDelete = async (item) => {
        const result = await Swal.fire({
            icon: 'warning', title: 'Hapus Surat Masuk?',
            html: `<p class="text-sm text-gray-600">Dari: <strong>${item.pengirim || '-'}</strong></p>`,
            showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Hapus', cancelButtonText: 'Batal',
        });
        if (result.isConfirmed) {
            try {
                const res = await authFetch(`${API_BASE}/surat-masuk/${item.id}`, { method: 'DELETE' });
                if (res.ok) {
                    fetchMasukData();
                    Swal.fire({ icon: 'success', title: 'Dihapus!', timer: 1500, showConfirmButton: false });
                }
            } catch (error) { console.error('Error deleting:', error); }
        }
    };

    const handleMasukBulkDelete = async () => {
        if (masukSelectedItems.size === 0) return;
        const result = await Swal.fire({
            icon: 'warning', title: `Hapus ${masukSelectedItems.size} surat?`,
            showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Hapus Semua', cancelButtonText: 'Batal',
        });
        if (result.isConfirmed) {
            try {
                const res = await authFetch(`${API_BASE}/surat-masuk/bulk-delete`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ids: Array.from(masukSelectedItems) }),
                });
                if (res.ok) { setMasukSelectedItems(new Set()); fetchMasukData(); Swal.fire({ icon: 'success', title: 'Dihapus!', timer: 1500, showConfirmButton: false }); }
            } catch (error) { console.error('Error bulk deleting:', error); }
        }
    };

    const masukFilteredData = (() => {
        let result = masukData.filter(item => {
            if (!masukSearch) return true;
            const s = masukSearch.toLowerCase();
            return (
                item.pengirim?.toLowerCase().includes(s) ||
                item.perihal?.toLowerCase().includes(s) ||
                item.agenda?.toLowerCase().includes(s) ||
                item.nomor_surat?.toLowerCase().includes(s) ||
                item.admin_name?.toLowerCase().includes(s)
            );
        });
        if (masukSortColumn) result = sortData(result, masukSortColumn, masukSortDirection);
        return result;
    })();

    const masukPaginatedData = masukFilteredData.slice((masukCurrentPage - 1) * masukItemsPerPage, masukCurrentPage * masukItemsPerPage);
    const masukTotalPages = Math.ceil(masukFilteredData.length / masukItemsPerPage);

    const handleMasukSort = (column) => {
        if (masukSortColumn === column) {
            setMasukSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setMasukSortColumn(column);
            setMasukSortDirection('asc');
        }
    };

    const MasukSortHeader = ({ label, column }) => (
        <th className="select-none py-2.5 px-2 cursor-pointer whitespace-nowrap group" onClick={() => handleMasukSort(column)}>
            <div className="flex items-center gap-1.5">
                <span className="hover:text-primary transition-colors">{label}</span>
                <div className="flex flex-col text-[8px] leading-[4px] text-gray-300 dark:text-gray-600">
                    <i className={`fas fa-caret-up ${masukSortColumn === column && masukSortDirection === 'asc' ? 'text-primary' : ''}`}></i>
                    <i className={`fas fa-caret-down ${masukSortColumn === column && masukSortDirection === 'desc' ? 'text-primary' : ''}`}></i>
                </div>
            </div>
        </th>
    );

    // ===================== END SURAT MASUK FUNCTIONS =====================

    // ===================== TEMPLATE HELPERS =====================
    const toggleTemplateSelect = (id) => {
        setTemplateSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const getFilteredTemplateList = () => {
        const list = formData.jenis_surat === '008' ? templateSiswaList : templateGuruList;
        if (!templateSearchPeople) return list;
        const q = templateSearchPeople.toLowerCase();
        return list.filter(p => p.nama.toLowerCase().includes(q) || (p.nip || p.nisn || '').toLowerCase().includes(q));
    };
    // ===================== END TEMPLATE HELPERS =====================

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
                    <div className="relative ml-1" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setActiveFilter(activeFilter === column ? null : column)} className={`text-[10px] transition ${filterValue ? 'text-primary' : 'text-gray-300  hover:text-gray-500'}`}>
                            <i className="fas fa-filter"></i>
                        </button>
                        {activeFilter === column && (
                            <div className="absolute top-full left-0 mt-1 bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-lg shadow-xl z-50 min-w-[140px] p-1">
                                <button onClick={() => { setFilterValue(''); setActiveFilter(null); }} className={`w-full text-left text-[11px] px-3 py-1.5 rounded ${!filterValue ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-gray-50 dark:hover:bg-dark-bg/40'}`}>Semua</button>
                                {Object.entries(filterOptions).map(([key, val]) => (
                                    <button key={key} onClick={() => { setFilterValue(key); setActiveFilter(null); }} className={`w-full text-left text-[11px] px-3 py-1.5 rounded ${filterValue === key ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-gray-50 dark:hover:bg-dark-bg/40'}`}>{val}</button>
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
                        <div className="page-header-icon w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                            <i className="fas fa-envelope text-white text-xl"></i>
                        </div>
                        <div>
                            <h1 className="page-header-title text-xl font-black text-gray-800 dark:text-dark-text uppercase tracking-tight">Surat Menyurat</h1>
                            <p className="page-header-subtitle text-xs text-gray-400 mt-0.5 font-medium uppercase tracking-widest">Kelola dokumen surat keluar & masuk</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 p-1 bg-gray-100 dark:bg-dark-bg/40 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('keluar')}
                    className={`px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'keluar'
                        ? 'bg-white dark:bg-dark-surface text-amber-600 shadow-sm'
                        : 'text-gray-400 hover:text-gray-600'}`}
                >
                    <i className="fas fa-paper-plane mr-2"></i>Surat Keluar
                </button>
                <button
                    onClick={() => setActiveTab('masuk')}
                    className={`px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'masuk'
                        ? 'bg-white dark:bg-dark-surface text-amber-600 shadow-sm'
                        : 'text-gray-400 hover:text-gray-600'}`}
                >
                    <i className="fas fa-inbox mr-2"></i>Surat Masuk
                </button>
            </div>

            {/* Surat Masuk */}
            {activeTab === 'masuk' && (
                <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-dark-border overflow-hidden">
                    {/* Toolbar */}
                    <div className={`${isMobile ? 'p-3' : 'p-6'} border-b border-gray-100 dark:border-dark-border`}>
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                            <div className="flex items-center gap-2 flex-wrap">
                                <button onClick={openMasukAddModal} className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest hover:shadow-lg hover:shadow-amber-500/20 transition-all flex items-center gap-2">
                                    <i className="fas fa-plus"></i>{isMobile ? '' : 'Tambah Surat'}
                                </button>
                                {masukSelectedItems.size > 0 && (
                                    <button onClick={handleMasukBulkDelete} className="bg-red-500 text-white px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-red-600 transition-all flex items-center gap-2">
                                        <i className="fas fa-trash"></i>Hapus ({masukSelectedItems.size})
                                    </button>
                                )}
                            </div>
                            <div className="relative w-full md:w-80">
                                <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs"></i>
                                <input type="text" placeholder="Cari pengirim, perihal, nomor surat..." value={masukSearch} onChange={(e) => { setMasukSearch(e.target.value); setMasukCurrentPage(1); }}
                                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-100 dark:border-dark-border bg-gray-50/50 dark:bg-dark-bg/20 text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all outline-none" />
                            </div>
                        </div>
                    </div>

                    {masukLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="flex flex-col items-center gap-4">
                                <div className="relative w-12 h-12">
                                    <div className="absolute inset-0 rounded-full border-4 border-amber-500/20"></div>
                                    <div className="absolute inset-0 rounded-full border-4 border-amber-500 border-t-transparent animate-spin"></div>
                                </div>
                                <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">Memuat data...</span>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table */}
                            {!isMobile && (
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-gray-100 dark:border-dark-border text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            <th className="py-3 px-4 w-10">
                                                <input type="checkbox" checked={masukPaginatedData.length > 0 && masukSelectedItems.size === masukPaginatedData.length} onChange={() => { if (masukSelectedItems.size === masukPaginatedData.length) setMasukSelectedItems(new Set()); else setMasukSelectedItems(new Set(masukPaginatedData.map(d => d.id))); }} className="rounded border-gray-300" />
                                            </th>
                                            <MasukSortHeader label="No" column="id" />
                                            <MasukSortHeader label="Tanggal Diterima" column="tanggal" />
                                            <MasukSortHeader label="Tgl Surat" column="tanggal_surat" />
                                            <MasukSortHeader label="Admin" column="admin_name" />
                                            <MasukSortHeader label="Pengirim" column="pengirim" />
                                            <MasukSortHeader label="Perihal" column="perihal" />
                                            <MasukSortHeader label="Agenda" column="agenda" />
                                            <MasukSortHeader label="Nomor Surat" column="nomor_surat" />
                                            <th className="py-3 px-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">File</th>
                                            <th className="py-3 px-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {masukPaginatedData.map((item, idx) => (
                                            <tr key={item.id} className="border-b border-gray-50 dark:border-dark-border/50 hover:bg-amber-50/30 dark:hover:bg-dark-bg/20 transition-colors group">
                                                <td className="py-3 px-4">
                                                    <input type="checkbox" checked={masukSelectedItems.has(item.id)} onChange={() => { setMasukSelectedItems(prev => { const n = new Set(prev); if (n.has(item.id)) n.delete(item.id); else n.add(item.id); return n; }); }} className="rounded border-gray-300" />
                                                </td>
                                                <td className="py-3 px-2"><span className="text-xs font-bold text-gray-500">{(masukCurrentPage - 1) * masukItemsPerPage + idx + 1}</span></td>
                                                <td className="py-3 px-2"><span className="text-xs text-gray-600 dark:text-gray-400">{formatDate(item.tanggal)}</span></td>
                                                <td className="py-3 px-2"><span className="text-xs text-gray-600 dark:text-gray-400">{formatDate(item.tanggal_surat)}</span></td>
                                                <td className="py-3 px-2"><span className="text-xs font-bold text-gray-700 dark:text-dark-text">{item.admin_name}</span></td>
                                                <td className="py-3 px-2"><span className="text-xs text-gray-700 dark:text-dark-text font-medium">{item.pengirim || '-'}</span></td>
                                                <td className="py-3 px-2"><span className="text-xs text-gray-500 line-clamp-1 max-w-[180px]">{item.perihal || '-'}</span></td>
                                                <td className="py-3 px-2"><span className="text-xs text-gray-500 line-clamp-1 max-w-[120px]">{item.agenda || '-'}</span></td>
                                                <td className="py-3 px-2">
                                                    <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 rounded-lg">{item.nomor_surat || '-'}</span>
                                                </td>
                                                <td className="py-3 px-2">
                                                    {item.file_url ? (
                                                        <a href={item.file_url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-green-600 hover:text-green-700 flex items-center gap-1">
                                                            <i className="fas fa-file-image"></i>Lihat
                                                        </a>
                                                    ) : <span className="text-[10px] text-gray-300">-</span>}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                        <button onClick={() => openMasukEditModal(item)} className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 hover:bg-amber-100 transition-all flex items-center justify-center" title="Edit">
                                                            <i className="fas fa-pen text-[10px]"></i>
                                                        </button>
                                                        <button onClick={() => handleMasukDelete(item)} className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 transition-all flex items-center justify-center" title="Hapus">
                                                            <i className="fas fa-trash text-[10px]"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {masukFilteredData.length === 0 && (
                                            <tr><td colSpan={11} className="py-24 text-center">
                                                <div className="flex flex-col items-center justify-center gap-4 opacity-40">
                                                    <i className="fas fa-inbox text-5xl"></i>
                                                    <p className="text-xs font-black uppercase tracking-widest">Belum ada surat masuk tercatat</p>
                                                </div>
                                            </td></tr>
                                        )}
                                    </tbody>
                                </table>
                            )}

                            {/* Mobile Cards */}
                            {isMobile && (
                                <div className="divide-y divide-gray-50 dark:divide-dark-border/50">
                                    {masukPaginatedData.map((item, idx) => (
                                        <div key={item.id} className="p-3">
                                            <div className="flex items-start justify-between" onClick={() => setMasukExpandedRows(prev => { const n = new Set(prev); if (n.has(idx)) n.delete(idx); else n.add(idx); return n; })}>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <input type="checkbox" checked={masukSelectedItems.has(item.id)} onChange={(e) => { e.stopPropagation(); setMasukSelectedItems(prev => { const n = new Set(prev); if (n.has(item.id)) n.delete(item.id); else n.add(item.id); return n; }); }} className="rounded border-gray-300" />
                                                        {item.nomor_surat && <span className="text-[10px] font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded">{item.nomor_surat}</span>}
                                                    </div>
                                                    <p className="text-xs font-bold text-gray-700 dark:text-dark-text truncate">{item.pengirim || 'Tanpa Pengirim'}</p>
                                                    <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(item.tanggal)} · Surat: {formatDate(item.tanggal_surat)} · {item.admin_name}</p>
                                                </div>
                                                <i className={`fas fa-chevron-${masukExpandedRows.has(idx) ? 'up' : 'down'} text-gray-300 text-[10px] mt-2`}></i>
                                            </div>
                                            {masukExpandedRows.has(idx) && (
                                                <div className="mt-2 pt-2 border-t border-gray-100 dark:border-dark-border space-y-1">
                                                    {item.perihal && <p className="text-[11px] text-gray-500"><strong>Perihal:</strong> {item.perihal}</p>}
                                                    {item.agenda && <p className="text-[11px] text-gray-500"><strong>Agenda:</strong> {item.agenda}</p>}
                                                    {item.keterangan && <p className="text-[11px] text-gray-500"><strong>Ket:</strong> {item.keterangan}</p>}
                                                    <div className="flex gap-2 pt-1">
                                                        <button onClick={() => openMasukEditModal(item)} className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-600 text-[10px] font-bold"><i className="fas fa-pen mr-1"></i>Edit</button>
                                                        <button onClick={() => handleMasukDelete(item)} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-500 text-[10px] font-bold"><i className="fas fa-trash mr-1"></i>Hapus</button>
                                                        {item.file_url && <a href={item.file_url} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-[10px] font-bold"><i className="fas fa-file mr-1"></i>File</a>}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {masukFilteredData.length === 0 && (
                                        <div className="py-16 text-center"><div className="flex flex-col items-center gap-3 opacity-40"><i className="fas fa-inbox text-4xl"></i><p className="text-[10px] font-black uppercase tracking-widest">Belum ada surat masuk</p></div></div>
                                    )}
                                </div>
                            )}

                            {/* Pagination */}
                            <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-8 border-t border-gray-100 dark:border-dark-border bg-gray-50/30 dark:bg-dark-bg/10">
                                <div className="flex items-center gap-4">
                                    <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                        {masukFilteredData.length} Surat Masuk
                                    </span>
                                </div>
                                <Pagination currentPage={masukCurrentPage} totalPages={masukTotalPages} onPageChange={setMasukCurrentPage}
                                    totalItems={masukFilteredData.length} itemsPerPage={masukItemsPerPage}
                                    onLimitChange={(limit) => { setMasukItemsPerPage(limit); setMasukCurrentPage(1); }} />
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Surat Keluar */}
            {activeTab === 'keluar' && (
                <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-dark-border overflow-hidden">
                    {/* Toolbar */}
                    <div className={`${isMobile ? 'p-3' : 'p-6'} border-b border-gray-100 dark:border-dark-border`}>
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                            <div className="flex items-center gap-2 flex-wrap">
                                <button onClick={openAddModal} className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest hover:shadow-lg hover:shadow-amber-500/20 transition-all flex items-center gap-2">
                                    <i className="fas fa-plus"></i>{isMobile ? '' : 'Tambah Surat'}
                                </button>
                                {selectedItems.size > 0 && (
                                    <button onClick={handleBulkDelete} className="bg-red-500 text-white px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-red-600 transition-all flex items-center gap-2">
                                        <i className="fas fa-trash"></i>Hapus ({selectedItems.size})
                                    </button>
                                )}
                            </div>
                            <div className="relative w-full md:w-80">
                                <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs"></i>
                                <input
                                    type="text"
                                    placeholder="Cari nomor surat, keterangan..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-100 dark:border-dark-border bg-gray-50/50 dark:bg-dark-bg/20 text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Loading */}
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="flex flex-col items-center gap-4">
                                <div className="relative w-12 h-12">
                                    <div className="absolute inset-0 rounded-full border-4 border-amber-500/20"></div>
                                    <div className="absolute inset-0 rounded-full border-4 border-amber-500 border-t-transparent animate-spin"></div>
                                </div>
                                <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">Memuat data...</span>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table */}
                            {!isMobile && (
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-gray-100 dark:border-dark-border text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            <th className="py-3 px-4 w-10">
                                                <input type="checkbox" checked={paginatedData.length > 0 && selectedItems.size === paginatedData.length} onChange={toggleSelectAll} className="rounded border-gray-300" />
                                            </th>
                                            <SortableHeader label="No" column="nomor_urut" />
                                            <SortableHeader label="Admin" column="admin_name" />
                                            <SortableHeader label="Kode Surat" column="kode_surat" filterable filterOptions={KODE_SURAT} filterValue={filterKode} setFilterValue={setFilterKode} />
                                            <SortableHeader label="Jenis Surat" column="jenis_surat" filterable filterOptions={JENIS_SURAT} filterValue={filterJenis} setFilterValue={setFilterJenis} />
                                            <SortableHeader label="Tanggal" column="tanggal" />
                                            <th className="py-3 px-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Nomor Surat</th>
                                            <th className="py-3 px-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Keterangan</th>
                                            <th className="py-3 px-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">File</th>
                                            <th className="py-3 px-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedData.map((item, idx) => (
                                            <tr key={item.id} className="border-b border-gray-50 dark:border-dark-border/50 hover:bg-amber-50/30 dark:hover:bg-dark-bg/20 transition-colors group">
                                                <td className="py-3 px-4">
                                                    <input type="checkbox" checked={selectedItems.has(item.id)} onChange={() => toggleSelect(item.id)} className="rounded border-gray-300" />
                                                </td>
                                                <td className="py-3 px-2">
                                                    <span className="text-xs font-bold text-gray-500">{(currentPage - 1) * itemsPerPage + idx + 1}</span>
                                                </td>
                                                <td className="py-3 px-2">
                                                    <span className="text-xs font-bold text-gray-700 dark:text-dark-text">{item.admin_name}</span>
                                                </td>
                                                <td className="py-3 px-2">
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
                                                        {item.kode_surat} - {KODE_SURAT[item.kode_surat] || item.kode_surat}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-2">
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-[10px] font-bold">
                                                        {item.jenis_surat} - {JENIS_SURAT[item.jenis_surat] || item.jenis_surat}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-2">
                                                    <span className="text-xs text-gray-600 dark:text-gray-400">{formatDate(item.tanggal)}</span>
                                                </td>
                                                <td className="py-3 px-2">
                                                    <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 rounded-lg">{item.nomor_surat}</span>
                                                </td>
                                                <td className="py-3 px-2">
                                                    <span className="text-xs text-gray-500 line-clamp-1 max-w-[200px]">{item.keterangan || '-'}</span>
                                                </td>
                                                <td className="py-3 px-2">
                                                    {item.file_url ? (
                                                        <a href={item.file_url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-green-600 hover:text-green-700 flex items-center gap-1">
                                                            <i className="fas fa-file-alt"></i>Lihat
                                                        </a>
                                                    ) : (
                                                        <span className="text-[10px] text-gray-300">-</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                        {item.file_url && (
                                                            <a href={item.file_url} download className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 hover:bg-blue-100 transition-all flex items-center justify-center" title="Download File">
                                                                <i className="fas fa-download text-[10px]"></i>
                                                            </a>
                                                        )}
                                                        <button onClick={() => handleFileUpload(item)} className="w-7 h-7 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 hover:bg-green-100 transition-all flex items-center justify-center" title="Upload File">
                                                            <i className="fas fa-upload text-[10px]"></i>
                                                        </button>
                                                        <button onClick={() => openEditModal(item)} className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 hover:bg-amber-100 transition-all flex items-center justify-center" title="Edit">
                                                            <i className="fas fa-pen text-[10px]"></i>
                                                        </button>
                                                        <button onClick={() => handleDelete(item)} className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 transition-all flex items-center justify-center" title="Hapus">
                                                            <i className="fas fa-trash text-[10px]"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredData.length === 0 && (
                                            <tr>
                                                <td colSpan={10} className="py-24 text-center">
                                                    <div className="flex flex-col items-center justify-center gap-4 opacity-40">
                                                        <i className="fas fa-envelope-open-text text-5xl"></i>
                                                        <p className="text-xs font-black uppercase tracking-widest">Belum ada surat keluar yang tercatat</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            )}

                            {/* Mobile Cards */}
                            {isMobile && (
                                <div className="divide-y divide-gray-50 dark:divide-dark-border/50">
                                    {paginatedData.map((item, idx) => (
                                        <div key={item.id} className="p-3">
                                            <div className="flex items-start justify-between" onClick={() => toggleRowExpand(idx)}>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <input type="checkbox" checked={selectedItems.has(item.id)} onChange={(e) => { e.stopPropagation(); toggleSelect(item.id); }} className="rounded border-gray-300" />
                                                        <span className="text-[10px] font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded">{item.nomor_surat}</span>
                                                    </div>
                                                    <p className="text-xs font-bold text-gray-700 dark:text-dark-text truncate">{KODE_SURAT[item.kode_surat]} — {JENIS_SURAT[item.jenis_surat]}</p>
                                                    <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(item.tanggal)} · {item.admin_name}</p>
                                                </div>
                                                <i className={`fas fa-chevron-${expandedRows.has(idx) ? 'up' : 'down'} text-gray-300 text-[10px] mt-2`}></i>
                                            </div>
                                            {expandedRows.has(idx) && (
                                                <div className="mt-2 pt-2 border-t border-gray-100 dark:border-dark-border space-y-2">
                                                    {item.keterangan && <p className="text-[11px] text-gray-500">{item.keterangan}</p>}
                                                    <div className="flex gap-2">
                                                        {item.file_url && (
                                                            <a href={item.file_url} download className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-[10px] font-bold"><i className="fas fa-download mr-1"></i>Download</a>
                                                        )}
                                                        <button onClick={() => handleFileUpload(item)} className="px-3 py-1.5 rounded-lg bg-green-50 text-green-600 text-[10px] font-bold"><i className="fas fa-upload mr-1"></i>Upload</button>
                                                        <button onClick={() => openEditModal(item)} className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-600 text-[10px] font-bold"><i className="fas fa-pen mr-1"></i>Edit</button>
                                                        <button onClick={() => handleDelete(item)} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-500 text-[10px] font-bold"><i className="fas fa-trash mr-1"></i>Hapus</button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {filteredData.length === 0 && (
                                        <div className="py-16 text-center">
                                            <div className="flex flex-col items-center gap-3 opacity-40">
                                                <i className="fas fa-envelope-open-text text-4xl"></i>
                                                <p className="text-[10px] font-black uppercase tracking-widest">Belum ada surat keluar</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Pagination */}
                            <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-8 border-t border-gray-100 dark:border-dark-border bg-gray-50/30 dark:bg-dark-bg/10">
                                <div className="flex items-center gap-4">
                                    <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                        {filteredData.length} Surat Terdata
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
                        </>
                    )}
                </div>
            )}

            {/* Add/Edit Modal */}
            <CrudModal
                show={showModal}
                onClose={closeModal}
                title={modalMode === 'add' ? 'Tambah Surat Keluar' : 'Edit Surat Keluar'}
                subtitle="Isi data surat untuk generate nomor otomatis"
                icon={modalMode === 'add' ? 'plus-circle' : 'edit'}
                onSubmit={handleSubmit}
                submitLabel={modalMode === 'add' ? 'Simpan & Generate Nomor' : 'Simpan Perubahan'}
                maxWidth="max-w-2xl"
            >
                <div className="space-y-5">
                    {/* Preview Nomor Surat */}
                    <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 rounded-2xl border border-amber-100 dark:border-amber-800/30">
                        <label className="block text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2">Preview Nomor Surat</label>
                        <div className="text-lg font-mono font-black text-amber-800 dark:text-amber-300 tracking-wider">
                            {previewNomor}
                        </div>
                        <p className="text-[10px] text-amber-500 mt-1">## = nomor urut otomatis dari sistem</p>
                    </div>

                    {/* Kode Surat & Jenis Surat */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                            <label className="block text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wide">Kode Surat (Penandatangan) *</label>
                            <select
                                value={formData.kode_surat}
                                onChange={(e) => setFormData({ ...formData, kode_surat: e.target.value })}
                                className="input-standard outline-none"
                            >
                                {Object.entries(KODE_SURAT).map(([code, label]) => (
                                    <option key={code} value={code}>{code} — {label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wide">Jenis Surat *</label>
                            <select
                                value={formData.jenis_surat}
                                onChange={(e) => setFormData({ ...formData, jenis_surat: e.target.value })}
                                className="input-standard outline-none"
                            >
                                {Object.entries(JENIS_SURAT).map(([code, label]) => (
                                    <option key={code} value={code}>{code} — {label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Tanggal */}
                    <div className="space-y-1.5">
                        <label className="block text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wide">Tanggal Surat *</label>
                        <input
                            required
                            type="date"
                            value={formData.tanggal}
                            onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                            className="input-standard"
                        />
                    </div>

                    {/* Keterangan */}
                    <div className="space-y-1.5">
                        <label className="block text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wide">Keterangan / Perihal</label>
                        <textarea
                            value={formData.keterangan}
                            onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                            rows={3}
                            className="input-standard"
                            placeholder="Isi perihal atau keterangan surat..."
                        />
                    </div>

                    {/* Template Fields (for jenis 007/008/009) */}
                    {TEMPLATE_JENIS.includes(formData.jenis_surat) && (
                        <>
                            {/* Divider */}
                            <div className="flex items-center gap-2 pt-2">
                                <div className="w-1.5 h-4 bg-emerald-500 rounded-full"></div>
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Data Template</h3>
                                <span className="text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full font-bold">
                                    <i className="fas fa-file-word mr-1"></i>Auto Generate .docx
                                </span>
                            </div>

                            {/* Multi-select People */}
                            <div className="space-y-1.5">
                                <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wide">
                                    Pilih {formData.jenis_surat === '008' ? 'Siswa' : 'Guru'} *
                                    {templateSelectedIds.length > 0 && <span className="text-emerald-600 ml-2">({templateSelectedIds.length} dipilih)</span>}
                                </label>
                                <div className="relative mb-2">
                                    <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs"></i>
                                    <input type="text" placeholder="Cari nama..." value={templateSearchPeople} onChange={(e) => setTemplateSearchPeople(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-100 dark:border-dark-border bg-gray-50/50 dark:bg-dark-bg/20 text-xs outline-none focus:ring-2 focus:ring-emerald-500/20" />
                                </div>
                                <div className="border border-gray-100 dark:border-dark-border rounded-xl max-h-48 overflow-y-auto divide-y divide-gray-50 dark:divide-dark-border/50">
                                    {getFilteredTemplateList().map(person => (
                                        <label key={person.id} className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition ${templateSelectedIds.includes(person.id) ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''}`}>
                                            <input type="checkbox" checked={templateSelectedIds.includes(person.id)} onChange={() => toggleTemplateSelect(person.id)} className="rounded border-gray-300 text-emerald-500" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-gray-700 dark:text-dark-text truncate">{person.nama}</p>
                                                <p className="text-[10px] text-gray-400">
                                                    {person.nip ? `NIP: ${person.nip}` : person.nisn ? `NISN: ${person.nisn}` : person.nis ? `NIS: ${person.nis}` : '-'}
                                                    {person.jabatan ? ` — ${person.jabatan}` : person.kelas ? ` — Kelas ${person.kelas}` : ''}
                                                </p>
                                            </div>
                                        </label>
                                    ))}
                                    {getFilteredTemplateList().length === 0 && (
                                        <div className="px-4 py-6 text-center text-xs text-gray-400"><i className="fas fa-search mr-2"></i>Tidak ditemukan</div>
                                    )}
                                </div>
                            </div>

                            {/* SPPD extra fields */}
                            {formData.jenis_surat === '009' && (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wide">Tujuan *</label>
                                            <input type="text" value={templateForm.tujuan} onChange={(e) => setTemplateForm({ ...templateForm, tujuan: e.target.value })} className="input-standard" placeholder="Tujuan perjalanan dinas" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wide">Kendaraan</label>
                                            <input type="text" value={templateForm.kendaraan} onChange={(e) => setTemplateForm({ ...templateForm, kendaraan: e.target.value })} className="input-standard" placeholder="Jenis kendaraan" />
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Keperluan */}
                            <div className="space-y-1.5">
                                <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wide">Keperluan</label>
                                <textarea value={templateForm.keperluan} onChange={(e) => setTemplateForm({ ...templateForm, keperluan: e.target.value })}
                                    rows={2} className="input-standard" placeholder={formData.jenis_surat === '009' ? 'Keperluan perjalanan dinas...' : 'Keperluan surat keterangan...'} />
                            </div>
                        </>
                    )}
                </div>
            </CrudModal>

            {/* Surat Masuk Add/Edit Modal */}
            <CrudModal
                show={showMasukModal}
                onClose={() => setShowMasukModal(false)}
                title={masukModalMode === 'add' ? 'Tambah Surat Masuk' : 'Edit Surat Masuk'}
                subtitle="Upload surat untuk auto-scan data dengan AI"
                icon={masukModalMode === 'add' ? 'inbox' : 'edit'}
                onSubmit={handleMasukSubmit}
                submitLabel={masukModalMode === 'add' ? 'Simpan Surat Masuk' : 'Simpan Perubahan'}
                maxWidth="max-w-3xl"
            >
                <div className="space-y-5">
                    {/* Upload Area */}
                    <div className="space-y-2">
                        <label className="block text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wide">Upload Surat (JPG/PNG — auto compress & AI scan)</label>
                        <div className="relative">
                            <input type="file" accept="image/*" onChange={handleMasukFileChange} className="hidden" id="masuk-file-input" />
                            <label htmlFor="masuk-file-input"
                                className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-amber-200 dark:border-amber-800/40 rounded-2xl cursor-pointer hover:border-amber-400 hover:bg-amber-50/30 dark:hover:bg-amber-900/10 transition-all">
                                {masukFilePreview ? (
                                    <div className="relative w-full">
                                        <img src={masukFilePreview} alt="Preview" className="max-h-48 mx-auto rounded-xl object-contain" />
                                        {scanning ? (
                                            <div className="absolute inset-0 bg-white/80 dark:bg-dark-bg/80 rounded-xl flex flex-col items-center justify-center gap-2">
                                                <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                                                <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest">AI sedang membaca surat...</span>
                                            </div>
                                        ) : (
                                            <div className="absolute top-2 right-2 bg-green-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                                                <i className="fas fa-check mr-1"></i>Siap
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl flex items-center justify-center mb-3">
                                            <i className="fas fa-cloud-upload-alt text-amber-500 text-2xl"></i>
                                        </div>
                                        <p className="text-xs font-bold text-gray-500">Klik atau drag file surat kesini</p>
                                        <p className="text-[10px] text-gray-400 mt-1">JPG, PNG — akan di-compress & scan AI otomatis</p>
                                    </>
                                )}
                            </label>
                        </div>
                    </div>

                    {/* Tanggal Diterima & Tanggal Surat */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="block text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wide">Tanggal Diterima *</label>
                            <input required type="date" value={masukFormData.tanggal}
                                onChange={(e) => setMasukFormData({ ...masukFormData, tanggal: e.target.value })}
                                className="input-standard" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wide">Tanggal Surat</label>
                            <input type="date" value={masukFormData.tanggal_surat}
                                onChange={(e) => setMasukFormData({ ...masukFormData, tanggal_surat: e.target.value })}
                                className="input-standard" />
                        </div>
                    </div>

                    {/* Pengirim & Nomor Surat */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="block text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wide">Pengirim</label>
                            <input type="text" value={masukFormData.pengirim}
                                onChange={(e) => setMasukFormData({ ...masukFormData, pengirim: e.target.value })}
                                className="input-standard" placeholder="Nama pengirim surat" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wide">Nomor Surat</label>
                            <input type="text" value={masukFormData.nomor_surat}
                                onChange={(e) => setMasukFormData({ ...masukFormData, nomor_surat: e.target.value })}
                                className="input-standard" placeholder="Nomor surat masuk" />
                        </div>
                    </div>

                    {/* Perihal */}
                    <div className="space-y-1.5">
                        <label className="block text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wide">Perihal</label>
                        <input type="text" value={masukFormData.perihal}
                            onChange={(e) => setMasukFormData({ ...masukFormData, perihal: e.target.value })}
                            className="input-standard" placeholder="Perihal/tentang surat" />
                    </div>

                    {/* Agenda */}
                    <div className="space-y-1.5">
                        <label className="block text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wide">Agenda</label>
                        <input type="text" value={masukFormData.agenda}
                            onChange={(e) => setMasukFormData({ ...masukFormData, agenda: e.target.value })}
                            className="input-standard" placeholder="Agenda surat" />
                    </div>

                    {/* Keterangan */}
                    <div className="space-y-1.5">
                        <label className="block text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wide">Keterangan</label>
                        <textarea value={masukFormData.keterangan}
                            onChange={(e) => setMasukFormData({ ...masukFormData, keterangan: e.target.value })}
                            rows={3} className="input-standard" placeholder="Keterangan tambahan..." />
                    </div>
                </div>
            </CrudModal>

        </div>
    );
}

export default SuratMenyurat;
