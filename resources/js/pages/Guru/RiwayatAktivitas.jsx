import React, { useState, useEffect, useCallback } from "react";
import api from "../../lib/axios";

function RiwayatAktivitas() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actions, setActions] = useState([]);
    const [filterAction, setFilterAction] = useState('');
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [total, setTotal] = useState(0);

    const fetchLogs = useCallback(async () => {
        try {
            setLoading(true);
            const params = { page, per_page: 20 };
            if (filterAction) params.action = filterAction;
            const response = await api.get('/guru-panel/activity-logs', { params });
            setLogs(response.data.data?.data || []);
            setLastPage(response.data.data?.last_page || 1);
            setTotal(response.data.data?.total || 0);
            if (response.data.actions) {
                setActions(response.data.actions);
            }
        } catch (err) {
            console.error('Error fetching activity logs:', err);
        } finally {
            setLoading(false);
        }
    }, [page, filterAction]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    // Action icon mapping
    const getActionIcon = (action) => {
        switch (action) {
            case 'login': return 'fas fa-sign-in-alt';
            case 'logout': return 'fas fa-sign-out-alt';
            case 'attendance': return 'fas fa-clipboard-check';
            case 'create': return 'fas fa-plus-circle';
            case 'update': return 'fas fa-edit';
            case 'delete': return 'fas fa-trash-alt';
            case 'restore': return 'fas fa-undo';
            default: return 'fas fa-circle';
        }
    };

    // Action color mapping
    const getActionStyle = (action) => {
        switch (action) {
            case 'login': return { bg: 'bg-emerald-100', text: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700' };
            case 'logout': return { bg: 'bg-gray-100', text: 'text-gray-500', badge: 'bg-gray-100 text-gray-700' };
            case 'attendance': return { bg: 'bg-yellow-100', text: 'text-yellow-600', badge: 'bg-yellow-100 text-yellow-700' };
            case 'create': return { bg: 'bg-green-100', text: 'text-green-600', badge: 'bg-green-100 text-green-700' };
            case 'update': return { bg: 'bg-blue-100', text: 'text-blue-600', badge: 'bg-blue-100 text-blue-700' };
            case 'delete': return { bg: 'bg-red-100', text: 'text-red-600', badge: 'bg-red-100 text-red-700' };
            case 'restore': return { bg: 'bg-purple-100', text: 'text-purple-600', badge: 'bg-purple-100 text-purple-700' };
            default: return { bg: 'bg-gray-100', text: 'text-gray-500', badge: 'bg-gray-100 text-gray-700' };
        }
    };

    // Action label
    const getActionLabel = (action) => {
        switch (action) {
            case 'login': return 'Login';
            case 'logout': return 'Logout';
            case 'attendance': return 'Absensi';
            case 'create': return 'Tambah';
            case 'update': return 'Edit';
            case 'delete': return 'Hapus';
            case 'restore': return 'Restore';
            default: return action.charAt(0).toUpperCase() + action.slice(1);
        }
    };

    // Group logs by date
    const groupedLogs = logs.reduce((groups, log) => {
        const date = log.created_at.split(' ')[0]; // YYYY-MM-DD
        if (!groups[date]) groups[date] = [];
        groups[date].push(log);
        return groups;
    }, {});

    const formatDateHeader = (dateStr) => {
        try {
            const d = new Date(dateStr + 'T00:00:00');
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            if (d.getTime() === today.getTime()) return 'Hari Ini';
            if (d.getTime() === yesterday.getTime()) return 'Kemarin';
            return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        } catch {
            return dateStr;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            {/* Header */}
            <div className="bg-gradient-to-br from-violet-600 to-violet-700 px-4 pt-4 pb-8 text-white">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                        <i className="fas fa-stream text-lg"></i>
                    </div>
                    <div>
                        <h1 className="font-bold text-lg">Riwayat Aktivitas</h1>
                        <p className="text-violet-200 text-xs">Log aktivitas akun Anda</p>
                    </div>
                </div>

                {/* Stats */}
                <div className="bg-white/15 rounded-xl px-4 py-3 backdrop-blur-sm mt-3">
                    <div className="flex items-center justify-between">
                        <span className="text-violet-200 text-xs">Total aktivitas tercatat</span>
                        <span className="text-xl font-bold">{total}</span>
                    </div>
                </div>
            </div>

            {/* Filter */}
            <div className="px-4 -mt-4 mb-3">
                <div className="bg-white rounded-2xl p-3 shadow-sm">
                    <select
                        value={filterAction}
                        onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
                        className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400"
                    >
                        <option value="">Semua Aktivitas</option>
                        {actions.map(action => (
                            <option key={action} value={action}>
                                {getActionLabel(action)}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Content */}
            <div className="px-4 space-y-4">
                {loading ? (
                    <div className="bg-white rounded-2xl p-8 shadow-sm flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
                        <i className="fas fa-stream text-gray-300 text-4xl mb-3"></i>
                        <p className="text-gray-500 text-sm">Belum ada aktivitas tercatat</p>
                        <p className="text-gray-400 text-xs mt-1">Aktivitas login, absensi, dll akan muncul di sini</p>
                    </div>
                ) : (
                    <>
                        {Object.entries(groupedLogs).map(([date, dateLogs]) => (
                            <div key={date}>
                                {/* Date header */}
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs font-semibold text-gray-500">{formatDateHeader(date)}</span>
                                    <div className="flex-1 h-px bg-gray-200"></div>
                                    <span className="text-[10px] text-gray-400">{dateLogs.length} aktivitas</span>
                                </div>

                                {/* Timeline */}
                                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                                    {dateLogs.map((log, idx) => {
                                        const style = getActionStyle(log.action);
                                        const isLast = idx === dateLogs.length - 1;
                                        return (
                                            <div key={log.id} className={`flex items-start gap-3 px-4 py-3 ${!isLast ? 'border-b border-gray-50' : ''}`}>
                                                {/* Icon */}
                                                <div className={`w-9 h-9 rounded-xl ${style.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                                                    <i className={`${getActionIcon(log.action)} ${style.text} text-sm`}></i>
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${style.badge}`}>
                                                            {log.action_label}
                                                        </span>
                                                        {log.model_type && (
                                                            <span className="text-[9px] text-gray-400">
                                                                {log.model_type}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-gray-700 text-xs leading-relaxed">
                                                        {log.description}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400 mt-0.5">
                                                        {log.created_at_formatted}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}

                        {/* Pagination */}
                        {lastPage > 1 && (
                            <div className="flex items-center justify-center gap-2 pt-2 pb-4">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                                >
                                    <i className="fas fa-chevron-left text-[10px] mr-1"></i>
                                    Sebelumnya
                                </button>
                                <span className="text-xs text-gray-500">
                                    {page} / {lastPage}
                                </span>
                                <button
                                    onClick={() => setPage(p => Math.min(lastPage, p + 1))}
                                    disabled={page === lastPage}
                                    className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                                >
                                    Selanjutnya
                                    <i className="fas fa-chevron-right text-[10px] ml-1"></i>
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default RiwayatAktivitas;
