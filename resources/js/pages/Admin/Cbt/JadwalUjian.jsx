import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import CrudModal, { ModalSection } from '../../../components/CrudModal';
import { API_BASE, authFetch } from '../../../config/api';
import Swal from 'sweetalert2';
import Pagination from '../../../components/Pagination';

const ITEMS_PER_PAGE_DEFAULT = 10;

export default function AdminJadwalUjian() {
    const [data, setData] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    
    const formatToLocalDatetime = (utcString) => {
        if (!utcString) return '';
        const date = new Date(utcString);
        date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
        return date.toISOString().slice(0, 16);
    };
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [printFilter, setPrintFilter] = useState('all'); // 'all' | 'published' | 'draft'
    const [printProjectFilter, setPrintProjectFilter] = useState(''); // '' = all projects
    const [activeProject, setActiveProject] = useState('all'); // 'all' | project_name
    const [projectList, setProjectList] = useState([]);
    const [selectedBulkProject, setSelectedBulkProject] = useState(''); // project name chosen in bulk modal
    const [bulkSessions, setBulkSessions] = useState([{ name_prefix: '', schedule_mode: 'sequential', start_date: '', time_start: '', time_end: '', skip_days: [0], duration_minutes: 60, randomize_questions: false, randomize_options: false, status: 'draft', bank_ids: [] }]);
    const [modalMode, setModalMode] = useState('add');
    const [currentItem, setCurrentItem] = useState(null);
    const navigate = useNavigate();
    const [showProctorDropdown, setShowProctorDropdown] = useState(false);
    const [proctorSearch, setProctorSearch] = useState('');
    const proctorDropdownRef = useRef(null);

    const [bankList, setBankList] = useState([]);
    const [proctorList, setProctorList] = useState([]);

    const [formData, setFormData] = useState({
        question_bank_id: '',
        name: '',
        duration_minutes: 60,
        start_time: '',
        end_time: '',
        randomize_questions: false,
        randomize_options: false,
        status: 'draft',
        proctor_ids: []
    });

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE_DEFAULT);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await authFetch(`${API_BASE}/cbt/exams`);
            const result = await response.json();
            setData(result.data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDropdowns = async () => {
        try {
            const resBank = await authFetch(`${API_BASE}/cbt/question-banks`);
            const bankResult = await resBank.json();
            setBankList(bankResult.data || []);
            
            const resProctor = await authFetch(`${API_BASE}/cbt/exams/proctors`);
            const proctorResult = await resProctor.json();
            setProctorList(proctorResult.data || []);

            const resProjects = await authFetch(`${API_BASE}/cbt/exams/projects`);
            const projectResult = await resProjects.json();
            setProjectList(projectResult.data || []);
        } catch (error) {
            console.error('Error fetching dropdowns:', error);
        }
    };

    useEffect(() => {
        fetchData();
        fetchDropdowns();
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Close proctor dropdown when clicking outside
    useEffect(() => {
        const handler = (e) => {
            if (proctorDropdownRef.current && !proctorDropdownRef.current.contains(e.target)) {
                setShowProctorDropdown(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const getItemProject = (item) => item.project_name || (item.name && item.name.includes(' - ') ? item.name.split(' - ')[0].trim() : null);

    const filteredData = data.filter(item => {
        const itemProj = getItemProject(item);
        if (activeProject === '__none__') {
            if (itemProj) return false;
        } else if (activeProject !== 'all') {
            if (itemProj !== activeProject) return false;
        }
        if (!search) return true;
        const s = search.toLowerCase();
        return (
            item.name?.toLowerCase().includes(s) ||
            item.question_bank?.name?.toLowerCase().includes(s) ||
            item.token?.toLowerCase().includes(s)
        );
    });

    // Refresh project list after fetch
    const refreshProjects = async () => {
        try {
            const res = await authFetch(`${API_BASE}/cbt/exams/projects`);
            const r = await res.json();
            setProjectList(r.data || []);
        } catch {}
    };

    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const openAddModal = () => {
        setModalMode('add');
        setFormData({
            question_bank_id: '', name: '', duration_minutes: 60,
            start_time: '', end_time: '', randomize_questions: false,
            randomize_options: false, status: 'draft', proctor_ids: []
        });
        setShowModal(true);
    };

    const openEditModal = (item) => {
        setModalMode('edit');
        setCurrentItem(item);
        setFormData({
            question_bank_id: item.question_bank_id || '',
            name: item.name || '',
            duration_minutes: item.duration_minutes || 60,
            start_time: formatToLocalDatetime(item.start_time),
            end_time: formatToLocalDatetime(item.end_time),
            randomize_questions: item.randomize_questions || false,
            randomize_options: item.randomize_options || false,
            status: item.status || 'draft',
            proctor_ids: item.proctor_ids || []
        });
        setShowModal(true);
    };

    const closeModal = () => setShowModal(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const url = modalMode === 'add' ? `${API_BASE}/cbt/exams` : `${API_BASE}/cbt/exams/${currentItem.id}`;
            const method = modalMode === 'add' ? 'POST' : 'PUT';
            
            // Format dates slightly if empty, nullify them to pass validation
            const payload = { ...formData };
            if (!payload.start_time) payload.start_time = null;
            if (!payload.end_time) payload.end_time = null;

            const response = await authFetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (response.ok) {
                closeModal();
                fetchData();
                Swal.fire({ icon: 'success', title: 'Berhasil!', text: `Jadwal ujian berhasil ${modalMode === 'add' ? 'ditambahkan' : 'diperbarui'}`, timer: 1500, showConfirmButton: false });
            } else {
                const error = await response.json();
                Swal.fire({ icon: 'error', title: 'Gagal!', text: error.message || 'Terjadi kesalahan' });
            }
        } catch (error) {
            console.error('Error saving:', error);
        }
    };

    const openBulkModal = () => {
        setSelectedBulkProject('');
        setBulkSessions([{ name_prefix: '', schedule_mode: 'sequential', start_date: '', time_start: '', time_end: '', skip_days: [0], duration_minutes: 60, randomize_questions: false, randomize_options: false, status: 'draft', bank_ids: [] }]);
        setShowBulkModal(true);
    };

    const handleBulkSubmit = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            // Sessions 2+ inherit name_prefix, bank_ids, randomize and status from session 1
            const base = bulkSessions[0];
            const mergedSessions = bulkSessions.map((s, i) =>
                i === 0 ? s : { ...s, name_prefix: base.name_prefix, bank_ids: base.bank_ids, randomize_questions: base.randomize_questions, randomize_options: base.randomize_options, status: base.status }
            );
            const payload = { sessions: mergedSessions };
            
            const response = await authFetch(`${API_BASE}/cbt/exams/bulk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (response.ok) {
                setShowBulkModal(false);
                fetchData();
                Swal.fire({ icon: 'success', title: 'Berhasil!', text: `Jadwal massal berhasil di-generate`, timer: 2000, showConfirmButton: false });
            } else {
                const error = await response.json();
                Swal.fire({ icon: 'error', title: 'Gagal!', text: error.message || 'Terjadi kesalahan' });
            }
        } catch (error) {
            console.error('Error saving bulk:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Yakin ingin menghapus?', text: 'Data tidak dapat dikembalikan!', icon: 'warning',
            showCancelButton: true, confirmButtonColor: '#dc2626', cancelButtonColor: '#6b7280', confirmButtonText: 'Ya, Hapus!'
        });
        if (!result.isConfirmed) return;
        try {
            const response = await authFetch(`${API_BASE}/cbt/exams/${id}`, { method: 'DELETE' });
            if (response.ok) {
                fetchData();
                Swal.fire({ icon: 'success', title: 'Terhapus!', text: 'Jadwal berhasil dihapus', timer: 1500, showConfirmButton: false });
            }
        } catch (error) {
            console.error('Error deleting:', error);
        }
    };

    const generateToken = async (id) => {
        try {
            const response = await authFetch(`${API_BASE}/cbt/exams/${id}/generate-token`, { method: 'POST' });
            if (response.ok) {
                fetchData();
                Swal.fire({ icon: 'success', title: 'Berhasil!', text: 'Token ujian baru telah digenerate', timer: 1500, showConfirmButton: false });
            }
        } catch (error) {
            console.error('Error generating token:', error);
        }
    };

    return (
        <div className="animate-fadeIn flex flex-col flex-grow max-w-full overflow-auto">
            <header className={`${isMobile ? 'mb-3 mobile-sticky-header pt-2 pb-2 px-1' : 'mb-6'}`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="page-header-icon w-12 h-12 bg-gradient-to-br from-primary to-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                            <i className="fas fa-calendar-alt text-white text-xl"></i>
                        </div>
                        <div>
                            <h1 className="page-header-title text-xl font-black text-gray-800 uppercase tracking-tight">Jadwal Ujian CBT</h1>
                            <p className="page-header-subtitle text-xs text-gray-400 mt-0.5 font-medium uppercase tracking-widest">Atur jadwal, durasi, dan rilis ujian</p>
                        </div>
                    </div>
                </div>
            </header>

            <div className={`${isMobile ? 'mobile-sticky-header' : ''}`}>
                <div className={`${isMobile ? 'mobile-controls-row bg-gray-50/50 rounded-xl border border-gray-100' : 'flex items-center gap-4 flex-wrap w-full mb-8 p-4 bg-gray-50/50 rounded-2xl border border-gray-100'}`}>
                    <div className={`${isMobile ? 'mobile-search-wrap' : 'relative group flex-1 min-w-[200px]'}`}>
                        <i className={`fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors ${isMobile ? 'text-[10px]' : ''}`}></i>
                        <input
                            aria-label="Cari ujian"
                            className={`w-full !pl-8 pr-2 ${isMobile ? 'py-1.5 text-[10px]' : 'py-3 text-sm'} bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder-gray-400 shadow-sm`}
                            placeholder="Cari nama ujian, token..."
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    
                    {/* PROJECT FILTER DROPDOWN */}
                    {(() => {
                        // Merge: from projectList (API) + from exam name prefix extraction
                        const nameBasedProjects = [...new Set(
                            data
                                .filter(x => !x.project_name && x.name && x.name.includes(' - '))
                                .map(x => x.name.split(' - ')[0].trim())
                        )].filter(Boolean);
                        const effectiveProjectList = [...new Set([...projectList, ...nameBasedProjects])].sort();
                        const hasNoProject = data.some(x => !x.project_name && (!x.name || !x.name.includes(' - ')));
                        const getItemProject = (item) => item.project_name || (item.name && item.name.includes(' - ') ? item.name.split(' - ')[0].trim() : null);

                        if (effectiveProjectList.length === 0 && !hasNoProject) return null;

                        return (
                            <div className="flex items-center gap-3">
                                <div className="relative flex-shrink-0">
                                    <select
                                        value={activeProject}
                                        onChange={e => { setActiveProject(e.target.value); setCurrentPage(1); }}
                                        className="appearance-none pl-8 pr-8 py-2.5 text-[10px] font-black uppercase tracking-widest bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-sm text-gray-700 cursor-pointer min-w-[160px]"
                                    >
                                        <option value="all">Semua Projek</option>
                                        {hasNoProject && (
                                            <option value="__none__">Tanpa Projek</option>
                                        )}
                                        {effectiveProjectList.map(proj => (
                                            <option key={proj} value={proj}>{proj}</option>
                                        ))}
                                    </select>
                                    <i className="fas fa-folder absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 text-xs pointer-events-none"></i>
                                    <i className="fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[9px] pointer-events-none"></i>
                                </div>
                                {activeProject !== 'all' && (
                                    <button
                                        onClick={() => { setActiveProject('all'); setCurrentPage(1); }}
                                        className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-primary transition-colors flex items-center gap-1"
                                    >
                                        <i className="fas fa-times text-[8px]"></i> Reset
                                    </button>
                                )}
                            </div>
                        );
                    })()}

                    <div className={`${isMobile ? 'mobile-btn-group' : 'flex gap-2 flex-wrap md:flex-nowrap items-center'}`}>
                        <button onClick={openBulkModal} className={`flex items-center gap-1 group shadow-md font-black uppercase tracking-widest bg-amber-500 text-white hover:bg-amber-600 transition-colors ${isMobile ? 'px-3 py-2 text-[9px] rounded-lg' : 'px-4 py-2.5 text-[10px] rounded-xl'}`} type="button">
                            <i className="fas fa-layer-group group-hover:-translate-y-0.5 transition-transform"></i>
                            <span>{isMobile ? 'Massal' : 'Jadwal Massal'}</span>
                        </button>
                        <button onClick={() => { setPrintFilter('all'); setPrintProjectFilter(''); setShowPrintModal(true); }} className={`flex items-center gap-1 group shadow-md font-black uppercase tracking-widest bg-indigo-500 text-white hover:bg-indigo-600 transition-colors ${isMobile ? 'px-3 py-2 text-[9px] rounded-lg' : 'px-4 py-2.5 text-[10px] rounded-xl'}`} type="button">
                            <i className="fas fa-print group-hover:-translate-y-0.5 transition-transform"></i>
                            <span>{isMobile ? 'Cetak' : 'Cetak PDF'}</span>
                        </button>
                        <button onClick={openAddModal} className={`btn-primary flex items-center gap-1 group shadow-lg shadow-primary/20 font-black uppercase tracking-widest ${isMobile ? '' : 'px-4 py-2.5 text-[10px] rounded-xl'}`} type="button">
                            <i className="fas fa-plus group-hover:rotate-90 transition-transform"></i>
                            <span>{isMobile ? 'Tambah' : 'Jadwal Baru'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="ml-3 text-sm font-medium text-gray-500">Memuat data...</span>
                </div>
            ) : (
                <div className={`bg-white rounded-2xl shadow-soft border border-gray-100 ${isMobile ? 'overflow-hidden' : 'overflow-x-auto scrollbar-hide'}`}>
                    <table className={`admin-table ${isMobile ? 'mobile-table-fixed' : 'min-w-[1000px]'}`}>
                        <thead>
                            <tr>
                                <th className="select-none pl-6 py-2.5 w-10 text-center text-xs font-black text-gray-400 uppercase tracking-widest">No</th>
                                <th className="select-none py-2.5 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Nama Ujian</th>
                                <th className="select-none py-2.5 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Bank Soal</th>
                                <th className="select-none py-2.5 text-center text-xs font-black text-gray-400 uppercase tracking-widest">Waktu & Durasi</th>
                                <th className="select-none py-2.5 text-center text-xs font-black text-gray-400 uppercase tracking-widest">Status</th>
                                <th className="select-none py-2.5 text-center text-xs font-black text-gray-400 uppercase tracking-widest px-6">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.map((item, idx) => (
                                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors border-b border-gray-100 last:border-0 group">
                                    <td className="pl-6 py-2.5 align-middle text-center text-xs font-bold text-gray-400 text-sm">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                                    <td className="py-2.5 px-2 align-middle">
                                        <div className="font-black text-gray-700 uppercase tracking-tight text-sm">{item.name}</div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="px-2 py-0.5 bg-gray-100 rounded-md text-[10px] font-bold text-gray-500 tracking-widest border border-gray-200">
                                                TOKEN: <span className="text-gray-800">{item.token}</span>
                                            </span>
                                            <button onClick={() => generateToken(item.id)} className="text-primary hover:text-green-600 text-[10px]" title="Generate Token Baru"><i className="fas fa-sync-alt"></i></button>
                                        </div>
                                    </td>
                                    <td className="py-2.5 px-2 align-middle text-sm font-semibold text-primary">
                                        {item.question_bank?.name || '-'}
                                        <div className="text-[10px] text-gray-400 mt-0.5 font-normal">Mapel: {item.question_bank?.mapel?.nama_mapel || '-'}</div>
                                    </td>
                                    <td className="py-2.5 px-2 align-middle text-center text-sm">
                                        <div className="font-bold text-gray-600">{item.duration_minutes} Menit</div>
                                        {item.start_time && <div className="text-[10px] text-gray-400 mt-0.5">{new Date(item.start_time).toLocaleString('id-ID')}</div>}
                                    </td>
                                    <td className="py-2.5 px-2 align-middle text-center">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${item.status === 'published' ? 'bg-green-50 text-green-600' : (item.status === 'finished' ? 'bg-gray-100 text-gray-500' : 'bg-amber-50 text-amber-600')}`}>
                                            {item.status}
                                        </span>
                                    </td>
                                    <td className="text-center py-2.5 px-6">
                                        <div className="flex items-center justify-center gap-1">
                                            <button onClick={() => navigate(`/cbt/hasil/${item.id}`)} className="action-btn w-8 h-8 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all flex items-center justify-center hover:scale-110 active:scale-95" title="Lihat Hasil & Koreksi"><i className="fas fa-clipboard-check"></i></button>
                                            <button onClick={() => openEditModal(item)} className="action-btn w-8 h-8 rounded-xl bg-orange-50 text-orange-600 hover:bg-orange-100 transition-all flex items-center justify-center hover:scale-110 active:scale-95" title="Edit Data"><i className="fas fa-edit"></i></button>
                                            <button onClick={() => handleDelete(item.id)} className="action-btn w-8 h-8 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all flex items-center justify-center hover:scale-110 active:scale-95" title="Hapus Data"><i className="fas fa-trash"></i></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredData.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center">
                                                <i className="fas fa-calendar-times text-2xl text-gray-300"></i>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-400">Jadwal Ujian Kosong</p>
                                                <p className="text-[11px] text-gray-400 mt-1 uppercase tracking-widest font-medium">Belum ada jadwal ujian yang ditambahkan</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-6 border-t border-gray-100 bg-gray-50/30">
                        <div className="flex items-center gap-3 order-2 md:order-1">
                            <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                                Total {filteredData.length} Jadwal Ujian
                            </span>
                        </div>
                        <div className="order-1 md:order-2">
                            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={filteredData.length} itemsPerPage={itemsPerPage} onLimitChange={(l) => { setItemsPerPage(l); setCurrentPage(1); }} />
                        </div>
                    </div>
                </div>
            )}

            {/* ===== PRINT PREVIEW MODAL ===== */}
            {showPrintModal && (() => {
                // Helper: get effective project for an exam
                // Uses project_name field if set, otherwise extracts prefix from exam name
                const getExamProject = (item) => {
                    if (item.project_name) return item.project_name;
                    if (item.name && item.name.includes(' - ')) return item.name.split(' - ')[0].trim();
                    return null;
                };

                // Distinct projects from ALL data
                const printProjects = [...new Set(data.map(getExamProject).filter(Boolean))].sort();

                const printData = data.filter(item => {
                    if (printProjectFilter && getExamProject(item) !== printProjectFilter) return false;
                    if (printFilter !== 'all' && item.status !== printFilter) return false;
                    return true;
                });
                // Group by date
                const grouped = {};
                printData.forEach(item => {
                    const dateKey = item.start_time
                        ? new Date(item.start_time).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                        : 'Tanpa Jadwal Tetap';
                    if (!grouped[dateKey]) grouped[dateKey] = [];
                    grouped[dateKey].push(item);
                });
                const sortedDates = Object.keys(grouped).sort((a, b) => {
                    const da = printData.find(x => (x.start_time ? new Date(x.start_time).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Tanpa Jadwal Tetap') === a)?.start_time;
                    const db = printData.find(x => (x.start_time ? new Date(x.start_time).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Tanpa Jadwal Tetap') === b)?.start_time;
                    if (!da) return 1; if (!db) return -1;
                    return new Date(da) - new Date(db);
                });

                const doPrint = () => {
                    const printContent = document.getElementById('print-jadwal-content');
                    const w = window.open('', '_blank', 'width=900,height=700');
                    w.document.write(`<!DOCTYPE html><html><head><title>Jadwal Ujian CBT</title><style>
                        * { box-sizing: border-box; margin: 0; padding: 0; }
                        body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1a1a1a; }
                        .print-wrapper { padding: 24px 32px; }
                        .header { display: flex; align-items: center; gap: 16px; border-bottom: 3px solid #16a34a; padding-bottom: 16px; margin-bottom: 20px; }
                        .logo-box { width: 56px; height: 56px; background: linear-gradient(135deg,#16a34a,#15803d); border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
                        .logo-box svg { width: 32px; height: 32px; fill: white; }
                        .school-name { font-size: 18px; font-weight: 900; color: #15803d; letter-spacing: -0.5px; }
                        .doc-title { font-size: 13px; color: #6b7280; font-weight: 600; margin-top: 2px; }
                        .meta-info { margin-bottom: 20px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 12px 16px; display: flex; gap: 32px; }
                        .meta-item { font-size: 11px; color: #374151; } .meta-item b { color: #15803d; }
                        .date-group { margin-bottom: 20px; }
                        .date-header { background: linear-gradient(90deg, #15803d, #16a34a); color: white; padding: 8px 14px; border-radius: 8px; font-size: 12px; font-weight: 800; letter-spacing: 0.5px; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
                        .date-num { background: rgba(255,255,255,0.2); border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 900; flex-shrink: 0; }
                        table { width: 100%; border-collapse: collapse; font-size: 11px; }
                        thead th { background: #f9fafb; border: 1px solid #e5e7eb; padding: 7px 10px; text-align: left; font-weight: 800; color: #374151; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
                        tbody td { border: 1px solid #e5e7eb; padding: 8px 10px; vertical-align: top; }
                        tbody tr:nth-child(even) td { background: #f9fafb; }
                        .name-cell { font-weight: 700; color: #111827; }
                        .sub-text { font-size: 10px; color: #6b7280; margin-top: 2px; }
                        .time-cell { font-weight: 700; color: #15803d; }
                        .duration-badge { display: inline-block; background: #dcfce7; color: #15803d; border-radius: 4px; padding: 2px 6px; font-size: 10px; font-weight: 700; }
                        .status-badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 700; }
                        .status-published { background: #dcfce7; color: #15803d; }
                        .status-draft { background: #fef3c7; color: #d97706; }
                        .status-finished { background: #f3f4f6; color: #6b7280; }
                        .proctor-tag { display: inline-block; background: #eff6ff; color: #2563eb; border-radius: 4px; padding: 1px 5px; font-size: 9px; font-weight: 600; margin: 1px; }
                        .footer { margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 12px; display: flex; justify-content: space-between; align-items: flex-end; }
                        .sign-box { text-align: center; }
                        .sign-line { width: 160px; border-top: 1px solid #374151; margin: 40px auto 4px; }
                        .sign-name { font-size: 11px; font-weight: 700; }
                        .sign-role { font-size: 10px; color: #6b7280; }
                        .print-date { font-size: 10px; color: #6b7280; }
                        .no-data { text-align: center; color: #9ca3af; padding: 24px; font-size: 12px; }
                        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
                    </style></head><body><div class="print-wrapper">${printContent.innerHTML}</div></body></html>`);
                    w.document.close();
                    setTimeout(() => { w.focus(); w.print(); }, 400);
                };

                const now = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

                return (
                    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm overflow-auto py-6 px-4 animate-fadeIn">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl flex flex-col" style={{maxHeight:'90vh'}}>
                            {/* Modal Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                                        <i className="fas fa-print text-white"></i>
                                    </div>
                                    <div>
                                        <h2 className="font-black text-gray-800 text-lg">Cetak Jadwal Ujian</h2>
                                        <p className="text-xs text-gray-400 font-medium">Preview sebelum dicetak / export PDF</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowPrintModal(false)} className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-all">
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>

                            {/* Controls Bar */}
                            <div className="px-6 py-3 bg-gray-50/50 border-b border-gray-100 flex flex-wrap items-center gap-3 flex-shrink-0">
                                {/* Status filter dropdown */}
                                <div className="relative flex-shrink-0">
                                    <select
                                        value={printFilter}
                                        onChange={e => setPrintFilter(e.target.value)}
                                        className="pl-8 pr-7 py-1.5 text-[10px] bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all shadow-sm font-black text-gray-600 cursor-pointer uppercase tracking-widest min-w-[130px]"
                                    >
                                        <option value="all">Semua Status</option>
                                        <option value="published">Published</option>
                                        <option value="draft">Draft</option>
                                    </select>
                                    <i className="fas fa-filter absolute left-2.5 top-1/2 -translate-y-1/2 text-indigo-400 text-[9px] pointer-events-none"></i>
                                    <i className="fas fa-chevron-down absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[8px] pointer-events-none"></i>
                                </div>

                                {/* Project filter dropdown — same style as Bank Soal */}
                                {printProjects.length > 0 && (
                                    <div className="relative flex-shrink-0">
                                        <select
                                            value={printProjectFilter}
                                            onChange={e => setPrintProjectFilter(e.target.value)}
                                            className="pl-7 pr-7 py-1.5 text-[10px] bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all shadow-sm font-black text-gray-600 cursor-pointer uppercase tracking-widest min-w-[150px]"
                                        >
                                            <option value="">Semua Projek</option>
                                            {printProjects.map(proj => (
                                                <option key={proj} value={proj}>{proj}</option>
                                            ))}
                                        </select>
                                        <i className="fas fa-folder absolute left-2.5 top-1/2 -translate-y-1/2 text-amber-500 text-[9px] pointer-events-none"></i>
                                        <i className="fas fa-chevron-down absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[8px] pointer-events-none"></i>
                                    </div>
                                )}

                                <div className="ml-auto flex items-center gap-2">
                                    <span className="text-[10px] font-medium text-gray-400">{printData.length} jadwal akan dicetak</span>
                                    <button onClick={doPrint} className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5 transition-all">
                                        <i className="fas fa-file-pdf"></i> Cetak / PDF
                                    </button>
                                </div>
                            </div>

                            {/* Preview Area */}
                            <div className="overflow-auto flex-1 p-6" style={{background:'#f8fafc'}}>
                                <div id="print-jadwal-content" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8" style={{minWidth:'720px'}}>
                                    {/* Document Header */}
                                    <div className="flex items-center gap-4 border-b-4 border-green-600 pb-5 mb-6">
                                        <div className="w-14 h-14 bg-gradient-to-br from-green-600 to-green-800 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                                            <i className="fas fa-graduation-cap text-white text-2xl"></i>
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-black text-green-700 text-xl tracking-tight">JADWAL UJIAN CBT</div>
                                            <div className="text-gray-500 text-sm font-semibold mt-0.5">
                                                {printProjectFilter ? `Projek: ${printProjectFilter}` : 'Computer Based Test — Sistem Ujian Digital'}
                                            </div>
                                            {printProjectFilter && (
                                                <div className="text-[10px] text-gray-400 mt-0.5">Computer Based Test — Sistem Ujian Digital</div>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] text-gray-400 font-medium">Dicetak pada</div>
                                            <div className="text-xs font-bold text-gray-600">{now}</div>
                                            <div className={`mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                                printFilter === 'published' ? 'bg-green-100 text-green-700' :
                                                printFilter === 'draft' ? 'bg-amber-100 text-amber-700' :
                                                'bg-gray-100 text-gray-600'
                                            }`}>
                                                {printProjectFilter ? `📁 ${printProjectFilter} · ` : ''}
                                                {printFilter === 'all' ? 'Semua Status' : printFilter} — {printData.length} Ujian
                                            </div>
                                        </div>
                                    </div>

                                    {/* Stats Row */}
                                    <div className="grid grid-cols-3 gap-3 mb-6">
                                        {[[
                                            printData.filter(x=>x.status==='published').length,
                                            'Dipublikasikan','check-circle','green'
                                        ],[
                                            printData.filter(x=>x.status==='draft').length,
                                            'Draft','clock','amber'
                                        ],[
                                            printData.length,
                                            'Total Ujian','calendar-alt','blue'
                                        ]].map(([num,label,icon,color]) => (
                                            <div key={label} className={`flex items-center gap-3 p-3 rounded-xl bg-${color}-50 border border-${color}-100`}>
                                                <div className={`w-9 h-9 rounded-lg bg-${color}-100 flex items-center justify-center flex-shrink-0`}>
                                                    <i className={`fas fa-${icon} text-${color}-600`}></i>
                                                </div>
                                                <div>
                                                    <div className={`text-xl font-black text-${color}-700`}>{num}</div>
                                                    <div className="text-[10px] text-gray-500 font-semibold">{label}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Grouped by Date */}
                                    {sortedDates.length === 0 ? (
                                        <div className="text-center py-12 text-gray-400">
                                            <i className="fas fa-calendar-times text-3xl mb-3 block"></i>
                                            <p className="font-bold">Tidak ada jadwal untuk dicetak</p>
                                        </div>
                                    ) : sortedDates.map(dateKey => (
                                        <div key={dateKey} className="mb-6">
                                            {/* Date Header */}
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="h-px flex-1 bg-gray-100"></div>
                                                <div className="flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-green-600 to-green-700 rounded-full">
                                                    <i className="fas fa-calendar-day text-white text-xs"></i>
                                                    <span className="text-white text-[11px] font-black uppercase tracking-wider">{dateKey}</span>
                                                    <span className="bg-white/20 text-white text-[10px] font-bold rounded-full px-2 py-0.5">{grouped[dateKey].length}</span>
                                                </div>
                                                <div className="h-px flex-1 bg-gray-100"></div>
                                            </div>

                                            {/* Table */}
                                            <div className="rounded-xl overflow-hidden border border-gray-100 shadow-sm">
                                                <table className="w-full text-xs">
                                                    <thead>
                                                        <tr className="bg-gray-50">
                                                            <th className="py-2.5 px-3 text-left font-black text-gray-500 uppercase tracking-widest text-[10px] border-b border-gray-100" style={{width:'32px'}}>#</th>
                                                            <th className="py-2.5 px-3 text-left font-black text-gray-500 uppercase tracking-widest text-[10px] border-b border-gray-100">Nama Ujian / Mapel</th>
                                                            <th className="py-2.5 px-3 text-center font-black text-gray-500 uppercase tracking-widest text-[10px] border-b border-gray-100">Jam</th>
                                                            <th className="py-2.5 px-3 text-center font-black text-gray-500 uppercase tracking-widest text-[10px] border-b border-gray-100">Durasi</th>
                                                            <th className="py-2.5 px-3 text-left font-black text-gray-500 uppercase tracking-widest text-[10px] border-b border-gray-100">Pengawas</th>
                                                            <th className="py-2.5 px-3 text-center font-black text-gray-500 uppercase tracking-widest text-[10px] border-b border-gray-100">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {grouped[dateKey].map((item, ri) => {
                                                            const proctorNames = (item.proctor_ids || []).map(pid => proctorList.find(g => g.id === pid)?.nama).filter(Boolean);
                                                            return (
                                                                <tr key={item.id} className={`border-b border-gray-50 last:border-0 ${ri % 2 === 1 ? 'bg-gray-50/40' : 'bg-white'}`}>
                                                                    <td className="py-2.5 px-3 text-center text-[10px] font-bold text-gray-400">{ri+1}</td>
                                                                    <td className="py-2.5 px-3">
                                                                        <div className="font-bold text-gray-800 text-[11px]">{item.name}</div>
                                                                        <div className="text-[10px] text-green-600 font-semibold mt-0.5">
                                                                            <i className="fas fa-book mr-1"></i>{item.question_bank?.mapel?.nama_mapel || '-'}
                                                                        </div>
                                                                        <div className="text-[9px] text-gray-400 font-mono mt-0.5">TOKEN: {item.token}</div>
                                                                    </td>
                                                                    <td className="py-2.5 px-3 text-center">
                                                                        {item.start_time ? (
                                                                            <>
                                                                                <div className="font-black text-green-700 text-[11px]">
                                                                                    {new Date(item.start_time).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}
                                                                                </div>
                                                                                {item.end_time && <div className="text-[9px] text-gray-400 font-semibold">s/d {new Date(item.end_time).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}</div>}
                                                                            </>
                                                                        ) : <span className="text-[10px] text-gray-300 italic">Bebas</span>}
                                                                    </td>
                                                                    <td className="py-2.5 px-3 text-center">
                                                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-lg text-[10px] font-bold">
                                                                            <i className="fas fa-clock text-[8px]"></i>{item.duration_minutes}'</span>
                                                                    </td>
                                                                    <td className="py-2.5 px-3">
                                                                        {proctorNames.length > 0 ? (
                                                                            <div className="flex flex-wrap gap-1">
                                                                                {proctorNames.map(n => (
                                                                                    <span key={n} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-[9px] font-bold">
                                                                                        <i className="fas fa-user text-[7px]"></i>{n}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        ) : <span className="text-[10px] text-gray-300 italic">Belum ditentukan</span>}
                                                                    </td>
                                                                    <td className="py-2.5 px-3 text-center">
                                                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-bold uppercase ${
                                                                            item.status === 'published' ? 'bg-green-100 text-green-700' :
                                                                            item.status === 'finished' ? 'bg-gray-100 text-gray-600' :
                                                                            'bg-amber-50 text-amber-600'
                                                                        }`}>
                                                                            <i className={`fas fa-${item.status==='published'?'check':'clock'} text-[8px]`}></i>
                                                                            {item.status}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Footer / Signature */}
                                    <div className="mt-8 pt-5 border-t border-gray-100 flex justify-between items-end">
                                        <div className="text-[10px] text-gray-400">
                                            <div className="font-bold text-gray-600 mb-1">Catatan</div>
                                            <div>• Jadwal dapat berubah sewaktu-waktu</div>
                                            <div>• TOKEN ujian bersifat rahasia</div>
                                            <div>• Peserta hadir 10 menit sebelum ujian</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-[10px] text-gray-500 mb-1">{now}</div>
                                            <div className="text-[10px] text-gray-400 mb-10">Kepala Sekolah / Panitia CBT</div>
                                            <div className="border-t border-gray-400 pt-1 w-44 mx-auto">
                                                <div className="text-[11px] font-bold text-gray-700">( _________________________ )</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer buttons */}
                            <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0 bg-gray-50/50 rounded-b-3xl">
                                <button onClick={() => setShowPrintModal(false)} className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-bold text-sm transition-all">
                                    <i className="fas fa-times mr-2"></i>Tutup
                                </button>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-gray-400 font-medium">
                                        <i className="fas fa-info-circle mr-1"></i>
                                        Klik "Cetak / PDF" → pilih "Save as PDF" di dialog printer
                                    </span>
                                    <button onClick={doPrint} className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:-translate-y-0.5 transition-all">
                                        <i className="fas fa-print"></i> Cetak / Download PDF
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            <CrudModal show={showModal} onClose={closeModal} title={modalMode === 'add' ? 'Tambah Jadwal Ujian' : 'Edit Jadwal Ujian'} subtitle="Pengaturan sesi ujian CBT" icon={modalMode === 'add' ? 'plus' : 'edit'} onSubmit={handleSubmit} submitLabel={modalMode === 'add' ? 'Simpan' : 'Perbarui'} maxWidth="max-w-lg">
                <div>
                    <ModalSection label="Informasi Utama" />
                    <div className="space-y-4 mb-4">
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Nama Ujian *</label>
                            <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input-standard" placeholder="Contoh: Ujian Akhir Semester Fisika X1" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Bank Soal yang Diujikan *</label>
                            <select required value={formData.question_bank_id} onChange={(e) => setFormData({ ...formData, question_bank_id: e.target.value })} className="input-standard">
                                <option value="">-- Pilih Bank Soal --</option>
                                {bankList.map(b => <option key={b.id} value={b.id}>[{b.kode_bank}] {b.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <ModalSection label="Pengaturan Waktu" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Waktu Mulai</label>
                            <input type="datetime-local" value={formData.start_time} onChange={(e) => setFormData({ ...formData, start_time: e.target.value })} className="input-standard" />
                            <p className="text-[9px] text-gray-400">Kosongkan jika ujian dapat diakses kapan saja</p>
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Waktu Selesai (Kadaluarsa)</label>
                            <input type="datetime-local" value={formData.end_time} onChange={(e) => setFormData({ ...formData, end_time: e.target.value })} className="input-standard" />
                        </div>
                        <div className="space-y-1.5 md:col-span-2">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Durasi (Menit) *</label>
                            <input type="number" min="1" required value={formData.duration_minutes} onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })} className="input-standard" placeholder="Contoh: 90" />
                        </div>
                    </div>

                    <ModalSection label="Pengawas Ujian" />
                    <div className="space-y-1.5 mb-4" ref={proctorDropdownRef}>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Pengawas Ujian (Pilih Satu atau Lebih)</label>
                        <button
                            type="button"
                            onClick={() => setShowProctorDropdown(!showProctorDropdown)}
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-left focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all flex items-center justify-between shadow-sm hover:border-gray-300"
                        >
                            <span className={`truncate mr-2 font-semibold text-sm ${formData.proctor_ids.length === 0 ? 'text-gray-300' : 'text-gray-700'}`}>
                                {formData.proctor_ids.length === 0
                                    ? 'Pilih pengawas ujian...'
                                    : formData.proctor_ids.length === proctorList.length
                                        ? `Semua (${proctorList.length})`
                                        : `${formData.proctor_ids.length} pengawas dipilih`}
                            </span>
                            <i className={`fas fa-chevron-down text-gray-300 transition-transform duration-300 ${showProctorDropdown ? 'rotate-180 text-primary' : ''}`}></i>
                        </button>

                        {showProctorDropdown && (
                            <div className="absolute z-50 mt-1 bg-white border border-gray-100 rounded-2xl shadow-2xl max-h-64 overflow-y-auto scrollbar-hide animate-fadeIn ring-1 ring-black/5" style={{width: 'calc(100% - 3rem)'}}>
                                {/* Search */}
                                <div className="sticky top-0 bg-white z-20 p-2 border-b border-gray-50">
                                    <input
                                        type="text"
                                        placeholder="Cari nama guru..."
                                        value={proctorSearch}
                                        onChange={(e) => setProctorSearch(e.target.value)}
                                        className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-gray-50/50"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                                {/* Select All */}
                                <label className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-primary/5 border-b border-gray-50 sticky top-[52px] bg-white/80 backdrop-blur-md z-10">
                                    <input
                                        type="checkbox"
                                        checked={proctorList.filter(g => g.nama?.toLowerCase().includes(proctorSearch.toLowerCase())).length > 0 && proctorList.filter(g => g.nama?.toLowerCase().includes(proctorSearch.toLowerCase())).every(g => formData.proctor_ids.includes(g.id))}
                                        onChange={() => {
                                            const filtered = proctorList.filter(g => g.nama?.toLowerCase().includes(proctorSearch.toLowerCase()));
                                            const allIds = filtered.map(g => g.id);
                                            const allSelected = allIds.every(id => formData.proctor_ids.includes(id));
                                            setFormData(prev => ({
                                                ...prev,
                                                proctor_ids: allSelected
                                                    ? prev.proctor_ids.filter(id => !allIds.includes(id))
                                                    : [...new Set([...prev.proctor_ids, ...allIds])]
                                            }));
                                        }}
                                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                    />
                                    <span className="text-[11px] font-black text-primary uppercase tracking-wider">
                                        {proctorList.filter(g => g.nama?.toLowerCase().includes(proctorSearch.toLowerCase())).every(g => formData.proctor_ids.includes(g.id)) ? 'Batal Semua' : 'Pilih Semua'}
                                    </span>
                                    <span className="ml-auto text-[10px] text-gray-400 font-bold">{formData.proctor_ids.length}/{proctorList.length}</span>
                                </label>
                                {/* Items */}
                                <div className="py-1">
                                    {proctorList.filter(g => g.nama?.toLowerCase().includes(proctorSearch.toLowerCase())).map(g => (
                                        <label
                                            key={g.id}
                                            className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors ${formData.proctor_ids.includes(g.id) ? 'bg-primary/5' : ''}`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={formData.proctor_ids.includes(g.id)}
                                                onChange={() => {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        proctor_ids: prev.proctor_ids.includes(g.id)
                                                            ? prev.proctor_ids.filter(id => id !== g.id)
                                                            : [...prev.proctor_ids, g.id]
                                                    }));
                                                }}
                                                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer transition-all"
                                            />
                                            <span className={`text-xs transition-all ${formData.proctor_ids.includes(g.id) ? 'text-primary font-bold' : 'text-gray-600 font-medium'}`}>
                                                {g.nama}
                                            </span>
                                        </label>
                                    ))}
                                    {proctorList.filter(g => g.nama?.toLowerCase().includes(proctorSearch.toLowerCase())).length === 0 && (
                                        <div className="py-4 text-center text-xs text-gray-400 italic">Guru tidak ditemukan...</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <ModalSection label="Keamanan & Status" />
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={formData.randomize_questions} onChange={(e) => setFormData({ ...formData, randomize_questions: e.target.checked })} className="sr-only peer" />
                                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                                </label>
                                <div>
                                    <span className="text-[11px] font-bold text-gray-700 block">Acak Soal</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={formData.randomize_options} onChange={(e) => setFormData({ ...formData, randomize_options: e.target.checked })} className="sr-only peer" />
                                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                                </label>
                                <div>
                                    <span className="text-[11px] font-bold text-gray-700 block">Acak Pilihan (A,B,C)</span>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status Publikasi *</label>
                            <select required value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="input-standard font-bold">
                                <option value="draft">Draft (Disembunyikan dari siswa)</option>
                                <option value="published">Published (Siswa dapat mengerjakan jika waktu sesuai)</option>
                                <option value="finished">Finished (Selesai, tidak bisa diakses lagi)</option>
                            </select>
                            <p className="text-[9px] text-gray-400 mt-1">Ubah ke "Published" agar siswa bisa melihat tes ini.</p>
                        </div>
                    </div>
                </div>
            </CrudModal>
            <CrudModal show={showBulkModal} onClose={() => setShowBulkModal(false)} title="Buat Jadwal Massal" subtitle="Generate banyak jadwal ujian sekaligus berdasarkan sesi" icon="layer-group" onSubmit={handleBulkSubmit} submitLabel="Generate Semua" maxWidth="max-w-4xl">
                <div className="space-y-6">
                    {bulkSessions.map((session, idx) => (
                        <div key={idx} className={`p-4 rounded-xl border ${idx === 0 ? 'bg-gray-50 border-gray-200' : 'bg-blue-50/40 border-blue-100'}`}>
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="font-bold text-sm text-gray-700 uppercase tracking-widest">
                                    <i className={`fas fa-clock ${idx === 0 ? 'text-primary' : 'text-blue-400'} mr-2`}></i>
                                    {idx === 0 ? 'Pengaturan Sesi Utama' : `Sesi ${idx + 1} — Hanya Tanggal & Jam`}
                                </h4>
                                {bulkSessions.length > 1 && (
                                    <button type="button" onClick={() => setBulkSessions(bulkSessions.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700 text-xs font-bold uppercase"><i className="fas fa-trash"></i> Hapus</button>
                                )}
                            </div>

                            {/* Mode selector — only on session 1 */}
                            {idx === 0 && (
                                <div className="flex flex-col md:flex-row gap-4 mb-4">
                                    <label className={`flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer p-3 border rounded-xl hover:bg-gray-50 flex-1 transition-all ${session.schedule_mode === 'sequential' ? 'border-primary ring-1 ring-primary/20 bg-primary/5' : 'border-gray-200'}`}>
                                        <input type="radio" value="sequential" className="w-4 h-4 text-primary focus:ring-primary/20" checked={session.schedule_mode === 'sequential'} onChange={e => { const newS = [...bulkSessions]; newS[idx].schedule_mode = e.target.value; setBulkSessions(newS); }} />
                                        <div className="flex flex-col ml-1">
                                            <span><i className="fas fa-calendar-day text-primary mr-1"></i> Distribusi Harian</span>
                                            <span className="text-[9px] text-gray-400 font-normal mt-0.5">1 Mapel = 1 Hari secara berurutan</span>
                                        </div>
                                    </label>
                                    <label className={`flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer p-3 border rounded-xl hover:bg-gray-50 flex-1 transition-all ${session.schedule_mode === 'parallel' ? 'border-primary ring-1 ring-primary/20 bg-primary/5' : 'border-gray-200'}`}>
                                        <input type="radio" value="parallel" className="w-4 h-4 text-primary focus:ring-primary/20" checked={session.schedule_mode === 'parallel'} onChange={e => { const newS = [...bulkSessions]; newS[idx].schedule_mode = e.target.value; setBulkSessions(newS); }} />
                                        <div className="flex flex-col ml-1">
                                            <span><i className="fas fa-layer-group text-primary mr-1"></i> Ujian Serentak</span>
                                            <span className="text-[9px] text-gray-400 font-normal mt-0.5">Semua mapel di hari dan jam yang sama persis</span>
                                        </div>
                                    </label>
                                </div>
                            )}

                            {/* Info banner for sessions 2+ */}
                            {idx > 0 && (
                                <div className="mb-4 flex items-start gap-2 p-2.5 bg-blue-50 border border-blue-100 rounded-lg">
                                    <i className="fas fa-info-circle text-blue-400 mt-0.5 flex-shrink-0 text-xs"></i>
                                    <p className="text-[10px] text-blue-600 font-medium">
                                        Nama ujian, bank soal, acak soal, dan status otomatis mengikuti <b>Sesi 1</b>. Cukup atur tanggal dan jam di bawah.
                                    </p>
                                </div>
                            )}

                            {/* Date & Time — always shown */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                <div className="space-y-1.5 col-span-2 md:col-span-1">
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Tgl Mulai *</label>
                                    <input type="date" required value={session.start_date} onChange={e => { const newS = [...bulkSessions]; newS[idx].start_date = e.target.value; setBulkSessions(newS); }} className="input-standard" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Jam Mulai *</label>
                                    <input type="time" required value={session.time_start} onChange={e => { const newS = [...bulkSessions]; newS[idx].time_start = e.target.value; setBulkSessions(newS); }} className="input-standard" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Jam Selesai</label>
                                    <input type="time" value={session.time_end} onChange={e => { const newS = [...bulkSessions]; newS[idx].time_end = e.target.value; setBulkSessions(newS); }} className="input-standard" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Durasi (Menit) *</label>
                                    <input type="number" min="1" required value={session.duration_minutes} onChange={e => { const newS = [...bulkSessions]; newS[idx].duration_minutes = parseInt(e.target.value) || 0; setBulkSessions(newS); }} className="input-standard" />
                                </div>
                            </div>

                            {/* Skip days — always shown for sequential mode */}
                            {(idx === 0 ? session.schedule_mode : bulkSessions[0].schedule_mode) === 'sequential' && (
                                <div className="mb-4 bg-orange-50 border border-orange-100 rounded-lg p-3">
                                    <label className="block text-[10px] font-bold text-orange-700 uppercase tracking-wider mb-2"><i className="fas fa-forward text-orange-500 mr-1"></i> Lewati Hari Libur (Jadwal akan digeser)</label>
                                    <div className="flex gap-6">
                                        <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                                            <input type="checkbox" className="w-4 h-4 text-orange-500 rounded border-gray-300 focus:ring-orange-500" checked={session.skip_days.includes(5)} onChange={e => {
                                                const newS = [...bulkSessions];
                                                if (e.target.checked) newS[idx].skip_days.push(5);
                                                else newS[idx].skip_days = newS[idx].skip_days.filter(d => d !== 5);
                                                setBulkSessions(newS);
                                            }} /> Lewati Jumat
                                        </label>
                                        <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                                            <input type="checkbox" className="w-4 h-4 text-orange-500 rounded border-gray-300 focus:ring-orange-500" checked={session.skip_days.includes(0)} onChange={e => {
                                                const newS = [...bulkSessions];
                                                if (e.target.checked) newS[idx].skip_days.push(0);
                                                else newS[idx].skip_days = newS[idx].skip_days.filter(d => d !== 0);
                                                setBulkSessions(newS);
                                            }} /> Lewati Minggu
                                        </label>
                                    </div>
                                </div>
                            )}

                            {/* Extended fields — session 1 only */}
                            {idx === 0 && (() => {
                                // Compute unique projects from bank names (prefix before " - ")
                                const bankProjects = [...new Set(
                                    bankList
                                        .map(b => b.name.includes(' - ') ? b.name.split(' - ')[0].trim() : null)
                                        .filter(Boolean)
                                )].sort();
                                // Banks belonging to the selected project
                                const projectBanks = selectedBulkProject
                                    ? bankList.filter(b => b.name.startsWith(selectedBulkProject + ' - ') || b.name === selectedBulkProject)
                                    : [];

                                const handleProjectSelect = (proj) => {
                                    setSelectedBulkProject(proj);
                                    const ids = proj
                                        ? bankList.filter(b => b.name.startsWith(proj + ' - ') || b.name === proj).map(b => b.id)
                                        : [];
                                    const newS = [...bulkSessions];
                                    newS[0].name_prefix = proj;
                                    newS[0].bank_ids = ids;
                                    setBulkSessions(newS);
                                };

                                return (
                                    <div className="pt-3 border-t border-gray-100 space-y-4">
                                        {/* Project picker */}
                                        <div className="space-y-1.5">
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                                <i className="fas fa-folder mr-1 text-amber-500"></i>
                                                Pilih Projek Bank Soal *
                                            </label>
                                            <select
                                                required
                                                value={selectedBulkProject}
                                                onChange={e => handleProjectSelect(e.target.value)}
                                                className="input-standard"
                                            >
                                                <option value="">-- Pilih Projek --</option>
                                                {bankProjects.map(proj => (
                                                    <option key={proj} value={proj}>{proj}</option>
                                                ))}
                                                {bankProjects.length === 0 && <option disabled>Belum ada projek di bank soal</option>}
                                            </select>
                                            {selectedBulkProject && (
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {projectBanks.map(b => (
                                                        <span key={b.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded-full text-[9px] font-bold">
                                                            <i className="fas fa-book text-[7px]"></i> {b.mapel?.nama_mapel || b.name}
                                                        </span>
                                                    ))}
                                                    <span className="text-[9px] text-gray-400 self-center ml-1">{projectBanks.length} Mapel akan di-generate</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Status only */}
                                        <div className="flex items-center gap-3">
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status Ujian</label>
                                            <select className="input-standard py-1 text-[10px] max-w-[160px]" value={session.status} onChange={e => { const newS = [...bulkSessions]; newS[idx].status = e.target.value; setBulkSessions(newS); }}>
                                                <option value="draft">Draft</option>
                                                <option value="published">Published</option>
                                            </select>
                                            <p className="text-[9px] text-gray-400">Acak soal/pilihan diatur di masing-masing bank soal.</p>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    ))}

                    <button
                        type="button"
                        onClick={() => {
                            const base = bulkSessions[0];
                            setBulkSessions([...bulkSessions, {
                                name_prefix: base.name_prefix,
                                schedule_mode: base.schedule_mode,
                                start_date: '',
                                time_start: base.time_start,
                                time_end: base.time_end,
                                skip_days: [...base.skip_days],
                                duration_minutes: base.duration_minutes,
                                randomize_questions: base.randomize_questions,
                                randomize_options: base.randomize_options,
                                status: base.status,
                                bank_ids: [...base.bank_ids]
                            }]);
                        }}
                        className="w-full py-3 border-2 border-dashed border-gray-300 text-gray-500 font-bold uppercase tracking-widest text-xs rounded-xl hover:border-primary hover:text-primary transition-colors flex justify-center items-center gap-2"
                    >
                        <i className="fas fa-plus-circle text-lg"></i> Tambah Sesi (Tanggal Berbeda)
                    </button>
                </div>
            </CrudModal>
        </div>
    );
}
