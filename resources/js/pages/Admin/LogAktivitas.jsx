import React, { useState, useEffect, useCallback } from 'react';
import { authFetch } from '../../config/api';
import Swal from 'sweetalert2';

const API_BASE = '/api';

function LogAktivitas() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({});
    const [modelTypes, setModelTypes] = useState([]);
    const [stats, setStats] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedLog, setSelectedLog] = useState(null);

    // Filters
    const [filters, setFilters] = useState({
        search: '',
        action: '',
        model_type: '',
        date_from: '',
        date_to: '',
        page: 1,
        per_page: 20,
    });

    // Fetch logs
    const fetchLogs = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value) params.append(key, value);
            });

            const response = await authFetch(`${API_BASE}/activity-logs?${params}`);
            const data = await response.json();

            if (data.success) {
                setLogs(data.data.data || []);
                setPagination({
                    current_page: data.data.current_page,
                    last_page: data.data.last_page,
                    per_page: data.data.per_page,
                    total: data.data.total,
                });
                setModelTypes(data.model_types || []);
            }
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    // Fetch stats
    const fetchStats = async () => {
        try {
            const response = await authFetch(`${API_BASE}/activity-logs/stats`);
            const data = await response.json();
            if (data.success) {
                setStats(data.data);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    useEffect(() => {
        fetchStats();
    }, []);

    // Handle filter change
    const handleFilterChange = (key, value) => {
        setFilters(prev => ({
            ...prev,
            [key]: value,
            page: key !== 'page' ? 1 : value, // Reset to page 1 when filter changes
        }));
    };

    // Handle restore
    const handleRestore = async (log) => {
        const result = await Swal.fire({
            title: 'Restore Data?',
            html: `
                <p class="text-gray-600">Apakah Anda yakin ingin memulihkan data ini?</p>
                <p class="text-sm text-gray-500 mt-2"><strong>${log.model_type}</strong>: ${log.description}</p>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#8B5CF6',
            cancelButtonColor: '#6B7280',
            confirmButtonText: 'Ya, Restore',
            cancelButtonText: 'Batal',
        });

        if (result.isConfirmed) {
            try {
                const response = await authFetch(`${API_BASE}/activity-logs/${log.id}/restore`, {
                    method: 'POST',
                });
                const data = await response.json();

                if (data.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Berhasil',
                        text: 'Data berhasil dipulihkan!',
                        timer: 1500,
                    });
                    fetchLogs();
                    fetchStats();
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Gagal',
                        text: data.message || 'Gagal memulihkan data',
                    });
                }
            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: error.message,
                });
            }
        }
    };

    // Get action badge color
    const getActionBadge = (action) => {
        const badges = {
            create: { bg: 'bg-green-100', text: 'text-green-700', icon: 'fa-plus' },
            update: { bg: 'bg-blue-100', text: 'text-blue-700', icon: 'fa-edit' },
            delete: { bg: 'bg-red-100', text: 'text-red-700', icon: 'fa-trash' },
            restore: { bg: 'bg-purple-100', text: 'text-purple-700', icon: 'fa-undo' },
            attendance: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: 'fa-calendar-check' },
        };
        return badges[action] || { bg: 'bg-gray-100', text: 'text-gray-700', icon: 'fa-circle' };
    };

    // Get readable model label
    const getModelLabel = (modelType) => {
        const labels = {
            'Guru': { label: 'Guru', bg: 'bg-indigo-100', text: 'text-indigo-700', icon: 'fa-chalkboard-teacher' },
            'Siswa': { label: 'Siswa', bg: 'bg-blue-100', text: 'text-blue-700', icon: 'fa-user-graduate' },
            'Kelas': { label: 'Kelas', bg: 'bg-purple-100', text: 'text-purple-700', icon: 'fa-door-open' },
            'Mapel': { label: 'Mapel', bg: 'bg-pink-100', text: 'text-pink-700', icon: 'fa-book' },
            'Jadwal': { label: 'Jadwal', bg: 'bg-cyan-100', text: 'text-cyan-700', icon: 'fa-calendar-alt' },
            'Kegiatan': { label: 'Kegiatan', bg: 'bg-orange-100', text: 'text-orange-700', icon: 'fa-tasks' },
            'Rapat': { label: 'Rapat', bg: 'bg-teal-100', text: 'text-teal-700', icon: 'fa-users' },
            'Kalender': { label: 'Kaldik', bg: 'bg-amber-100', text: 'text-amber-700', icon: 'fa-calendar-check' },
            'Ekstrakurikuler': { label: 'Ekskul', bg: 'bg-lime-100', text: 'text-lime-700', icon: 'fa-futbol' },
            'JamPelajaran': { label: 'Jam Pelajaran', bg: 'bg-rose-100', text: 'text-rose-700', icon: 'fa-clock' },
            'TahunAjaran': { label: 'Tahun Ajaran', bg: 'bg-sky-100', text: 'text-sky-700', icon: 'fa-graduation-cap' },
            'User': { label: 'User', bg: 'bg-gray-100', text: 'text-gray-700', icon: 'fa-user' },
            'Role': { label: 'Role', bg: 'bg-red-100', text: 'text-red-700', icon: 'fa-user-shield' },
            'AbsensiMengajar': { label: 'Absensi Mengajar', bg: 'bg-emerald-100', text: 'text-emerald-700', icon: 'fa-clipboard-check' },
            'AbsensiKegiatan': { label: 'Absensi Kegiatan', bg: 'bg-violet-100', text: 'text-violet-700', icon: 'fa-clipboard-list' },
            'AbsensiRapat': { label: 'Absensi Rapat', bg: 'bg-fuchsia-100', text: 'text-fuchsia-700', icon: 'fa-clipboard' },
        };
        return labels[modelType] || { label: modelType, bg: 'bg-gray-100', text: 'text-gray-700', icon: 'fa-database' };
    };

    // View detail
    const handleViewDetail = (log) => {
        setSelectedLog(log);
        setShowDetailModal(true);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">
                            <i className="fas fa-history text-green-600 mr-3"></i>
                            Log Aktivitas
                        </h1>
                        <p className="text-gray-500 text-sm mt-1">
                            Riwayat seluruh aktivitas di sistem
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <i className="fas fa-clock text-blue-600"></i>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-800">{stats.today}</p>
                                <p className="text-xs text-gray-500">Hari Ini</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                <i className="fas fa-plus text-green-600"></i>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-800">{stats.by_action?.create || 0}</p>
                                <p className="text-xs text-gray-500">Tambah</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                                <i className="fas fa-edit text-orange-600"></i>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-800">{stats.by_action?.update || 0}</p>
                                <p className="text-xs text-gray-500">Edit</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                                <i className="fas fa-trash text-red-600"></i>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-800">{stats.by_action?.delete || 0}</p>
                                <p className="text-xs text-gray-500">Hapus</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {/* Search */}
                    <div className="md:col-span-2 relative">
                        <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                        <input
                            type="text"
                            placeholder="Cari aktivitas..."
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                    </div>

                    {/* Action Filter */}
                    <select
                        value={filters.action}
                        onChange={(e) => handleFilterChange('action', e.target.value)}
                        className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                        <option value="">Semua Aksi</option>
                        <option value="create">Tambah</option>
                        <option value="update">Edit</option>
                        <option value="delete">Hapus</option>
                        <option value="restore">Restore</option>
                        <option value="attendance">Absensi</option>
                    </select>

                    {/* Model Type Filter */}
                    <select
                        value={filters.model_type}
                        onChange={(e) => handleFilterChange('model_type', e.target.value)}
                        className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                        <option value="">Semua Tabel</option>
                        {modelTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>

                    {/* Date Filter */}
                    <input
                        type="date"
                        value={filters.date_from}
                        onChange={(e) => handleFilterChange('date_from', e.target.value)}
                        className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
                    </div>
                ) : logs.length > 0 ? (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            Tanggal
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            User
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            Objek
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            Aktivitas
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            Detail
                                        </th>
                                        <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            Aksi
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {logs.map(log => {
                                        const badge = getActionBadge(log.action);
                                        return (
                                            <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">{log.created_at_formatted}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                                            <i className="fas fa-user text-green-600 text-sm"></i>
                                                        </div>
                                                        <span className="text-sm font-medium text-gray-900">{log.user_name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {(() => {
                                                        const modelInfo = getModelLabel(log.model_type);
                                                        return (
                                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${modelInfo.bg} ${modelInfo.text}`}>
                                                                <i className={`fas ${modelInfo.icon}`}></i>
                                                                {modelInfo.label}
                                                            </span>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                                                        <i className={`fas ${badge.icon}`}></i>
                                                        {log.action_label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="text-sm text-gray-700 max-w-xs truncate" title={log.description}>
                                                        {log.description}
                                                    </p>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex justify-center gap-2">
                                                        <button
                                                            onClick={() => handleViewDetail(log)}
                                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title="Lihat Detail"
                                                        >
                                                            <i className="fas fa-eye"></i>
                                                        </button>
                                                        {log.can_restore && (
                                                            <button
                                                                onClick={() => handleRestore(log)}
                                                                className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                                                title="Restore"
                                                            >
                                                                <i className="fas fa-undo"></i>
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {pagination.last_page > 1 && (
                            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                                <p className="text-sm text-gray-500">
                                    Menampilkan {logs.length} dari {pagination.total} aktivitas
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleFilterChange('page', pagination.current_page - 1)}
                                        disabled={pagination.current_page === 1}
                                        className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                    >
                                        <i className="fas fa-chevron-left"></i>
                                    </button>
                                    <span className="px-3 py-1 text-sm text-gray-600">
                                        {pagination.current_page} / {pagination.last_page}
                                    </span>
                                    <button
                                        onClick={() => handleFilterChange('page', pagination.current_page + 1)}
                                        disabled={pagination.current_page === pagination.last_page}
                                        className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                    >
                                        <i className="fas fa-chevron-right"></i>
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center py-12 text-gray-500">
                        <i className="fas fa-history text-4xl mb-3"></i>
                        <p>Tidak ada aktivitas ditemukan</p>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {showDetailModal && selectedLog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-gray-100">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-800">
                                    <i className="fas fa-info-circle text-blue-600 mr-2"></i>
                                    Detail Aktivitas
                                </h2>
                                <button
                                    onClick={() => setShowDetailModal(false)}
                                    className="p-2 hover:bg-gray-100 rounded-lg"
                                >
                                    <i className="fas fa-times text-gray-500"></i>
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-gray-500">Tanggal</label>
                                    <p className="font-medium text-gray-800">{selectedLog.created_at_formatted}</p>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500">User</label>
                                    <p className="font-medium text-gray-800">{selectedLog.user_name}</p>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500">Aksi</label>
                                    <p className="font-medium text-gray-800">{selectedLog.action_label}</p>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500">Tabel</label>
                                    <p className="font-medium text-gray-800">{selectedLog.model_type}</p>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-gray-500">Deskripsi</label>
                                <p className="font-medium text-gray-800 break-words whitespace-pre-wrap">{selectedLog.description}</p>
                            </div>

                            {/* Data Changes - Readable Format */}
                            {(() => {
                                const fieldLabels = {
                                    id: 'ID', nama: 'Nama', nama_kegiatan: 'Nama Kegiatan', kegiatan: 'Kegiatan',
                                    tanggal: 'Tanggal', tanggal_mulai: 'Tanggal Mulai', tanggal_selesai: 'Tanggal Selesai',
                                    waktu_mulai: 'Waktu Mulai', waktu_berakhir: 'Waktu Selesai',
                                    tempat: 'Tempat', deskripsi: 'Deskripsi', keterangan: 'Keterangan',
                                    status: 'Status', status_kbm: 'Status KBM', guru_id: 'ID Guru',
                                    siswa_id: 'ID Siswa', kelas_id: 'ID Kelas', mapel_id: 'ID Mapel',
                                    rab: 'RAB', nip: 'NIP', email: 'Email', jabatan: 'Jabatan',
                                    alamat: 'Alamat', no_hp: 'No. HP', jenis_kelamin: 'Jenis Kelamin',
                                    created_at: 'Dibuat', updated_at: 'Diperbarui', deleted_at: 'Dihapus',
                                    penanggung_jawab_id: 'PJ Kegiatan', tahun_ajaran_id: 'Tahun Ajaran',
                                };
                                const formatValue = (val) => {
                                    if (val === null || val === undefined) return '-';
                                    if (typeof val === 'boolean') return val ? 'Ya' : 'Tidak';
                                    if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}T/)) {
                                        const d = new Date(val);
                                        return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                                    }
                                    return String(val);
                                };
                                const getLabel = (key) => fieldLabels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

                                const oldVals = selectedLog.old_values || {};
                                const newVals = selectedLog.new_values || {};
                                const allKeys = [...new Set([...Object.keys(oldVals), ...Object.keys(newVals)])];
                                const hasOld = Object.keys(oldVals).length > 0;
                                const hasNew = Object.keys(newVals).length > 0;

                                if (allKeys.length === 0) return null;

                                // If both old and new exist, show comparison
                                if (hasOld && hasNew) {
                                    return (
                                        <div>
                                            <label className="text-xs text-gray-500 flex items-center gap-2 mb-2">
                                                <i className="fas fa-exchange-alt text-blue-500"></i>
                                                Perubahan Data
                                            </label>
                                            <div className="rounded-lg border border-gray-200 overflow-hidden">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="bg-gray-50">
                                                            <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600 w-1/4">Field</th>
                                                            <th className="text-left px-3 py-2 text-xs font-semibold text-red-600 w-[37.5%]">Sebelum</th>
                                                            <th className="text-left px-3 py-2 text-xs font-semibold text-green-600 w-[37.5%]">Sesudah</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {allKeys.map((key, i) => {
                                                            const oldVal = formatValue(oldVals[key]);
                                                            const newVal = formatValue(newVals[key]);
                                                            const changed = oldVal !== newVal;
                                                            return (
                                                                <tr key={key} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} ${changed ? '!bg-yellow-50' : ''}`}>
                                                                    <td className="px-3 py-2 text-xs font-medium text-gray-700 break-words">{getLabel(key)}</td>
                                                                    <td className={`px-3 py-2 text-xs break-all whitespace-pre-wrap ${changed ? 'text-red-600 line-through' : 'text-gray-600'}`}>{oldVal}</td>
                                                                    <td className={`px-3 py-2 text-xs break-all whitespace-pre-wrap ${changed ? 'text-green-700 font-semibold' : 'text-gray-600'}`}>{newVal}</td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    );
                                }

                                // Single view (create or delete)
                                const vals = hasNew ? newVals : oldVals;
                                const isCreate = hasNew && !hasOld;
                                return (
                                    <div>
                                        <label className="text-xs text-gray-500 flex items-center gap-2 mb-2">
                                            <i className={`fas ${isCreate ? 'fa-plus-circle text-green-500' : 'fa-minus-circle text-red-500'}`}></i>
                                            {isCreate ? 'Data Dibuat' : 'Data Dihapus'}
                                        </label>
                                        <div className={`rounded-lg border overflow-hidden ${isCreate ? 'border-green-200' : 'border-red-200'}`}>
                                            <table className="w-full text-sm">
                                                <tbody>
                                                    {Object.entries(vals).map(([key, val], i) => (
                                                        <tr key={key} className={i % 2 === 0 ? (isCreate ? 'bg-green-50/50' : 'bg-red-50/50') : 'bg-white'}>
                                                            <td className="px-3 py-2 text-xs font-medium text-gray-700 w-1/3 break-words">{getLabel(key)}</td>
                                                            <td className="px-3 py-2 text-xs text-gray-800 break-all whitespace-pre-wrap">{formatValue(val)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                            {selectedLog.can_restore && (
                                <button
                                    onClick={() => {
                                        setShowDetailModal(false);
                                        handleRestore(selectedLog);
                                    }}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                                >
                                    <i className="fas fa-undo"></i>
                                    Restore
                                </button>
                            )}
                            <button
                                onClick={() => setShowDetailModal(false)}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default LogAktivitas;
