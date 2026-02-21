import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE, authFetch } from '../../config/api';
import { useAuth } from '../../contexts/AuthContext';
import { useTahunAjaran } from '../../contexts/TahunAjaranContext';
import { canAccessAdminPage } from '../../config/roleConfig';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Title, Tooltip, Legend, Filler);

function Dashboard() {
    const [stats, setStats] = useState(null);
    const [charts, setCharts] = useState(null);
    const [activity, setActivity] = useState(null);
    const [financial, setFinancial] = useState(null);
    const [loading, setLoading] = useState(true);

    const { tahunAjaran: authTahunAjaran, activeRole, user } = useAuth();
    const { activeTahunAjaran } = useTahunAjaran();
    const tahunAjaranId = authTahunAjaran?.id || activeTahunAjaran?.id;
    const isSuperadmin = activeRole === 'superadmin';
    const canSeeFinancial = canAccessAdminPage(activeRole, '/transaksi');

    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Quick navigation — filtered by role access
    const allMenuCards = [
        { to: '/data-induk/siswa', icon: 'fa-user-graduate', label: 'Siswa', color: 'blue' },
        { to: '/data-induk/guru', icon: 'fa-chalkboard-teacher', label: 'Guru', color: 'emerald' },
        { to: '/data-induk/kelas', icon: 'fa-door-open', label: 'Kelas', color: 'purple' },
        { to: '/data-induk/jadwal', icon: 'fa-calendar-alt', label: 'Jadwal', color: 'amber' },
        { to: '/data-induk/mapel', icon: 'fa-book', label: 'Mapel', color: 'teal' },
        { to: '/data-induk/kegiatan', icon: 'fa-tasks', label: 'Kegiatan', color: 'rose' },
        { to: '/data-induk/ekskul', icon: 'fa-futbol', label: 'Ekskul', color: 'cyan' },
        { to: '/data-induk/rapat', icon: 'fa-users', label: 'Rapat', color: 'orange' },
        { to: '/data-induk/absensi-siswa', icon: 'fa-clipboard-list', label: 'Absensi', color: 'lime' },
        { to: '/data-induk/supervisi', icon: 'fa-clipboard-check', label: 'Supervisi', color: 'indigo' },
    ];

    const menuCards = useMemo(() => {
        if (isSuperadmin) return allMenuCards;
        return allMenuCards.filter(c => canAccessAdminPage(activeRole, c.to));
    }, [activeRole, isSuperadmin]);

    // Fetch all dashboard data
    useEffect(() => {
        const fetchData = async () => {
            if (!tahunAjaranId) return;
            try {
                const taParam = `?tahun_ajaran_id=${tahunAjaranId}`;
                const fetches = [
                    authFetch(`${API_BASE}/dashboard/statistics${taParam}`),
                    authFetch(`${API_BASE}/dashboard/charts${taParam}`),
                    authFetch(`${API_BASE}/dashboard/recent-activity${taParam}`),
                ];
                if (canSeeFinancial) {
                    fetches.push(authFetch(`${API_BASE}/dashboard/financial-summary${taParam}`));
                }
                const results = await Promise.all(fetches);
                const statsData = await results[0].json();
                const chartsData = await results[1].json();
                const activityData = await results[2].json();
                if (statsData.success) setStats(statsData.data);
                if (chartsData.success) setCharts(chartsData.data);
                if (activityData.success) setActivity(activityData.data);
                if (canSeeFinancial && results[3]) {
                    const finData = await results[3].json();
                    if (finData.success) setFinancial(finData.data);
                }
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [tahunAjaranId, canSeeFinancial]);

    // Helpers
    const fmtRp = (n) => new Intl.NumberFormat('id-ID').format(Math.abs(n || 0));
    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    };
    const formatTime = (timeStr) => {
        if (!timeStr) return '-';
        if (timeStr.includes('T') || (timeStr.includes('-') && timeStr.includes(':'))) {
            return new Date(timeStr).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');
        }
        return timeStr.substring(0, 5);
    };
    const getActionStyle = (action) => {
        switch (action) {
            case 'create': return { icon: 'fa-plus-circle', color: 'emerald' };
            case 'update': return { icon: 'fa-edit', color: 'blue' };
            case 'delete': return { icon: 'fa-trash-alt', color: 'rose' };
            case 'restore': return { icon: 'fa-undo-alt', color: 'purple' };
            case 'attendance': return { icon: 'fa-calendar-check', color: 'amber' };
            case 'login': return { icon: 'fa-sign-in-alt', color: 'green' };
            case 'logout': return { icon: 'fa-sign-out-alt', color: 'gray' };
            case 'export': return { icon: 'fa-file-export', color: 'cyan' };
            case 'import': return { icon: 'fa-file-import', color: 'teal' };
            case 'approve': return { icon: 'fa-check-circle', color: 'green' };
            case 'reject': return { icon: 'fa-times-circle', color: 'red' };
            case 'upload': return { icon: 'fa-cloud-upload-alt', color: 'sky' };
            case 'download': return { icon: 'fa-cloud-download-alt', color: 'indigo' };
            case 'print': return { icon: 'fa-print', color: 'slate' };
            case 'send': return { icon: 'fa-paper-plane', color: 'violet' };
            default: return { icon: 'fa-info-circle', color: 'blue' };
        }
    };

    // Chart colors
    const chartColors = [
        'rgba(59, 130, 246, 0.8)',   // blue
        'rgba(16, 185, 129, 0.8)',   // emerald
        'rgba(139, 92, 246, 0.8)',   // purple
        'rgba(245, 158, 11, 0.8)',   // amber
        'rgba(20, 184, 166, 0.8)',   // teal
        'rgba(244, 63, 94, 0.8)',    // rose
        'rgba(6, 182, 212, 0.8)',    // cyan
        'rgba(249, 115, 22, 0.8)',   // orange
        'rgba(132, 204, 22, 0.8)',   // lime
        'rgba(99, 102, 241, 0.8)',   // indigo
    ];

    // Statistics cards
    const statCards = stats ? [
        { label: 'Total Siswa', value: stats.total_siswa, sub: `${stats.siswa_aktif} aktif`, icon: 'fa-user-graduate', gradient: 'from-blue-500 to-blue-600', light: 'bg-blue-50 text-blue-600', to: '/data-induk/siswa' },
        { label: 'Total Guru', value: stats.total_guru, sub: `${stats.guru_aktif} aktif`, icon: 'fa-chalkboard-teacher', gradient: 'from-emerald-500 to-emerald-600', light: 'bg-emerald-50 text-emerald-600', to: '/data-induk/guru' },
        { label: 'Total Kelas', value: stats.total_kelas, sub: `${stats.kelas_aktif} aktif`, icon: 'fa-door-open', gradient: 'from-purple-500 to-purple-600', light: 'bg-purple-50 text-purple-600', to: '/data-induk/kelas' },
        { label: 'Mata Pelajaran', value: stats.total_mapel, sub: `${stats.mapel_aktif} aktif`, icon: 'fa-book', gradient: 'from-amber-500 to-amber-600', light: 'bg-amber-50 text-amber-600', to: '/data-induk/mapel' },
        { label: 'Kegiatan', value: stats.total_kegiatan, sub: `${stats.kegiatan_aktif} aktif`, icon: 'fa-tasks', gradient: 'from-teal-500 to-teal-600', light: 'bg-teal-50 text-teal-600', to: '/data-induk/kegiatan' },
        { label: 'Rapat', value: stats.total_rapat, sub: `${stats.rapat_bulan_ini} bulan ini`, icon: 'fa-users', gradient: 'from-rose-500 to-rose-600', light: 'bg-rose-50 text-rose-600', to: '/data-induk/rapat' },
    ] : [];

    // Chart data
    const siswaPerKelasData = charts?.siswa_per_kelas ? {
        labels: charts.siswa_per_kelas.map(d => d.label),
        datasets: [{
            label: 'Jumlah Siswa',
            data: charts.siswa_per_kelas.map(d => d.count),
            backgroundColor: chartColors.slice(0, charts.siswa_per_kelas.length),
            borderRadius: 8,
            borderSkipped: false,
        }]
    } : null;

    const guruPerJabatanData = charts?.guru_per_jabatan ? {
        labels: charts.guru_per_jabatan.map(d => d.label),
        datasets: [{
            data: charts.guru_per_jabatan.map(d => d.count),
            backgroundColor: chartColors.slice(0, charts.guru_per_jabatan.length),
            borderWidth: 0,
            hoverOffset: 8,
        }]
    } : null;

    const kegiatanPerBulanData = charts?.kegiatan_per_bulan ? {
        labels: charts.kegiatan_per_bulan.map(d => d.label),
        datasets: [{
            label: 'Jumlah Kegiatan',
            data: charts.kegiatan_per_bulan.map(d => d.count),
            borderColor: 'rgba(16, 185, 129, 1)',
            backgroundColor: (ctx) => {
                const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 200);
                gradient.addColorStop(0, 'rgba(16, 185, 129, 0.3)');
                gradient.addColorStop(1, 'rgba(16, 185, 129, 0.02)');
                return gradient;
            },
            tension: 0.4,
            fill: true,
            pointBackgroundColor: 'rgba(16, 185, 129, 1)',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7,
        }]
    } : null;

    const barOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: true, position: 'bottom', labels: { boxWidth: 8, padding: 12, font: { size: 11, weight: '600' }, usePointStyle: true } },
            tooltip: {
                backgroundColor: 'rgba(17, 24, 39, 0.9)',
                titleFont: { size: 12, weight: '600' },
                bodyFont: { size: 11 },
                cornerRadius: 8,
                padding: 10,
            }
        },
        scales: {
            y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.04)' } },
            x: { ticks: { font: { size: 11 } }, grid: { display: false } }
        }
    };
    const pieOptions = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 10, padding: 10, font: { size: 11, weight: '500' }, usePointStyle: true } },
            tooltip: { backgroundColor: 'rgba(17, 24, 39, 0.9)', cornerRadius: 8, padding: 10 }
        }
    };
    const lineOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: { backgroundColor: 'rgba(17, 24, 39, 0.9)', cornerRadius: 8, padding: 10 }
        },
        scales: {
            y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.04)' } },
            x: { ticks: { font: { size: 10 } }, grid: { display: false } }
        }
    };

    // Combine upcoming events
    const upcomingEvents = useMemo(() => {
        const events = [];
        if (activity?.upcoming_kegiatan) {
            activity.upcoming_kegiatan.forEach(k => events.push({
                type: 'kegiatan', title: k.nama_kegiatan, date: k.waktu_mulai, location: k.tempat, icon: 'fa-tasks', color: 'teal'
            }));
        }
        if (activity?.upcoming_rapat) {
            activity.upcoming_rapat.forEach(r => events.push({
                type: 'rapat', title: r.agenda_rapat, date: r.tanggal, time: r.waktu_mulai, location: r.tempat, status: r.status, icon: 'fa-users', color: 'blue'
            }));
        }
        return events.sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 6);
    }, [activity]);

    // Loading state
    if (loading) {
        return (
            <div className="animate-fadeIn flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="relative w-16 h-16 mx-auto mb-4">
                        <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
                        <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                    </div>
                    <p className="text-gray-500 text-sm font-medium tracking-wide">Memuat data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fadeIn flex flex-col flex-grow max-w-full overflow-auto pb-6">

            {/* Welcome Banner */}
            <div className={`bg-gradient-to-r from-green-600 to-emerald-600 ${isMobile ? 'rounded-2xl p-3.5 mb-3' : 'rounded-3xl p-8 mb-6'} text-white relative overflow-hidden`}>
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4"></div>
                <div className="relative z-10">
                    <h1 className={`${isMobile ? 'text-base' : 'text-2xl'} font-bold mb-0.5`}>
                        Assalamu'alaikum, {user?.nama?.split(' ')[0] || 'Admin'} 👋
                    </h1>
                    <p className={`text-green-100 ${isMobile ? 'text-[11px]' : 'text-sm'}`}>
                        Selamat datang di Sistem Informasi MA Alhikam — {authTahunAjaran?.nama || activeTahunAjaran?.nama || 'Tahun Ajaran'}
                    </p>
                </div>
            </div>

            {/* Row 1: Statistics Cards */}
            <div className={`grid ${isMobile ? 'grid-cols-3 gap-2 mb-3' : 'grid-cols-3 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6'}`}>
                {statCards.map((card, idx) => (
                    <Link key={idx} to={card.to} className={`bg-white ${isMobile ? 'rounded-xl p-3' : 'rounded-2xl p-4'} shadow-soft border border-gray-50 hover:shadow-md transition-all duration-200 group cursor-pointer block`}>
                        <div className="flex items-center justify-between mb-2">
                            <div className={`${isMobile ? 'w-8 h-8 rounded-lg' : 'w-10 h-10 rounded-xl'} ${card.light} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                <i className={`fas ${card.icon} ${isMobile ? 'text-xs' : 'text-sm'}`}></i>
                            </div>
                        </div>
                        <p className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-gray-800 leading-none`}>{card.value}</p>
                        <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} font-semibold text-gray-500 mt-0.5`}>{card.label}</p>
                        <p className={`${isMobile ? 'text-[9px]' : 'text-[10px]'} font-medium text-gray-400 mt-0.5`}>{card.sub}</p>
                    </Link>
                ))}
            </div>

            {/* Row 2: Charts */}
            <div className={`grid grid-cols-1 lg:grid-cols-3 ${isMobile ? 'gap-3 mb-3' : 'gap-6 mb-6'}`}>
                {/* Distribusi Siswa per Kelas */}
                <div className={`lg:col-span-2 bg-white ${isMobile ? 'rounded-2xl p-3' : 'rounded-3xl p-6'} shadow-soft border border-gray-50`}>
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h2 className={`${isMobile ? 'text-sm' : 'text-base'} font-bold text-gray-800`}>Distribusi Siswa per Kelas</h2>
                            <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-gray-400 mt-0.5`}>Jumlah siswa di setiap kelas aktif</p>
                        </div>
                        <div className={`${isMobile ? 'w-7 h-7' : 'w-8 h-8'} rounded-lg bg-blue-50 flex items-center justify-center`}>
                            <i className="fas fa-chart-bar text-blue-500 text-xs"></i>
                        </div>
                    </div>
                    <div className={`${isMobile ? 'h-[200px]' : 'h-[260px]'}`}>
                        {siswaPerKelasData ? (
                            <Bar data={siswaPerKelasData} options={barOptions} />
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-400 text-xs font-medium">Belum ada data</div>
                        )}
                    </div>
                </div>

                {/* Guru per Jabatan */}
                <div className={`bg-white ${isMobile ? 'rounded-2xl p-3' : 'rounded-3xl p-6'} shadow-soft border border-gray-50`}>
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h2 className={`${isMobile ? 'text-sm' : 'text-base'} font-bold text-gray-800`}>Guru per Peran</h2>
                            <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-gray-400 mt-0.5`}>Komposisi peran guru aktif</p>
                        </div>
                        <div className={`${isMobile ? 'w-7 h-7' : 'w-8 h-8'} rounded-lg bg-emerald-50 flex items-center justify-center`}>
                            <i className="fas fa-chart-pie text-emerald-500 text-xs"></i>
                        </div>
                    </div>
                    <div className={`${isMobile ? 'h-[200px]' : 'h-[260px]'} flex items-center justify-center`}>
                        {guruPerJabatanData ? (
                            <Doughnut data={guruPerJabatanData} options={pieOptions} />
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-400 text-xs font-medium">Belum ada data</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Row 3: Agenda + Tren Kegiatan */}
            <div className={`grid grid-cols-1 lg:grid-cols-2 ${isMobile ? 'gap-3 mb-3' : 'gap-6 mb-6'}`}>
                {/* Agenda Mendatang */}
                <div className={`bg-white ${isMobile ? 'rounded-2xl p-3' : 'rounded-3xl p-6'} shadow-soft border border-gray-50`}>
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h2 className={`${isMobile ? 'text-sm' : 'text-base'} font-bold text-gray-800`}>Agenda Mendatang</h2>
                            <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-gray-400 mt-0.5`}>Kegiatan & rapat 7 hari ke depan</p>
                        </div>
                        <div className={`${isMobile ? 'w-7 h-7' : 'w-8 h-8'} rounded-lg bg-teal-50 flex items-center justify-center`}>
                            <i className="fas fa-calendar-check text-teal-500 text-xs"></i>
                        </div>
                    </div>
                    {upcomingEvents.length > 0 ? (
                        <div className={`space-y-2 ${isMobile ? 'max-h-[220px]' : 'max-h-[280px]'} overflow-y-auto pr-1 custom-scrollbar`}>
                            {upcomingEvents.map((event, idx) => (
                                <div key={idx} className={`flex items-start gap-2.5 ${isMobile ? 'p-2' : 'p-3'} rounded-xl bg-gray-50/60 hover:bg-gray-50 transition-colors group`}>
                                    <div className={`${isMobile ? 'w-7 h-7' : 'w-9 h-9'} rounded-lg bg-${event.color}-100 flex items-center justify-center flex-shrink-0`}>
                                        <i className={`fas ${event.icon} text-${event.color}-500 ${isMobile ? 'text-[10px]' : 'text-xs'}`}></i>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-700 leading-tight line-clamp-1">{event.title}</p>
                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                            <span className="text-[10px] text-gray-400 font-medium">
                                                <i className="fas fa-calendar-day mr-1"></i>{formatDate(event.date)}
                                            </span>
                                            {event.time && (
                                                <span className="text-[10px] text-gray-400 font-medium">
                                                    <i className="fas fa-clock mr-1"></i>{formatTime(event.time)}
                                                </span>
                                            )}
                                            {event.location && (
                                                <span className="text-[10px] text-gray-400 font-medium">
                                                    <i className="fas fa-map-marker-alt mr-1"></i>{event.location}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full bg-${event.color}-100 text-${event.color}-600 uppercase whitespace-nowrap`}>
                                        {event.type === 'kegiatan' ? 'Kegiatan' : 'Rapat'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <i className="fas fa-calendar-check text-3xl text-gray-200 mb-3"></i>
                            <p className="text-xs text-gray-400 font-medium">Tidak ada agenda mendatang</p>
                        </div>
                    )}
                </div>

                {/* Tren Kegiatan */}
                <div className={`bg-white ${isMobile ? 'rounded-2xl p-3' : 'rounded-3xl p-6'} shadow-soft border border-gray-50`}>
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h2 className={`${isMobile ? 'text-sm' : 'text-base'} font-bold text-gray-800`}>Tren Kegiatan</h2>
                            <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-gray-400 mt-0.5`}>Jumlah kegiatan per bulan (6 bulan terakhir)</p>
                        </div>
                        <div className={`${isMobile ? 'w-7 h-7' : 'w-8 h-8'} rounded-lg bg-green-50 flex items-center justify-center`}>
                            <i className="fas fa-chart-line text-green-500 text-xs"></i>
                        </div>
                    </div>
                    <div className={`${isMobile ? 'h-[200px]' : 'h-[260px]'}`}>
                        {kegiatanPerBulanData ? (
                            <Line data={kegiatanPerBulanData} options={lineOptions} />
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-400 text-xs font-medium">Belum ada data</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Row 3.5: Financial Summary - only for users with /transaksi access */}
            {canSeeFinancial && financial && (
                <div className={`${isMobile ? 'mb-3' : 'mb-6'}`}>
                    {/* Financial Stats Cards */}
                    <div className={`grid ${isMobile ? 'grid-cols-3 gap-2 mb-3' : 'grid-cols-3 gap-4 mb-6'}`}>
                        {/* Pemasukan */}
                        <div className={`bg-white ${isMobile ? 'rounded-xl p-3' : 'rounded-2xl p-5'} shadow-soft border border-gray-50 relative overflow-hidden`}>
                            <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-50 rounded-full -translate-y-1/3 translate-x-1/3"></div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className={`${isMobile ? 'w-7 h-7 rounded-lg' : 'w-9 h-9 rounded-xl'} bg-emerald-50 flex items-center justify-center`}>
                                        <i className={`fas fa-arrow-down text-emerald-500 ${isMobile ? 'text-[10px]' : 'text-xs'}`}></i>
                                    </div>
                                    <span className={`${isMobile ? 'text-[9px]' : 'text-[10px]'} font-black text-gray-400 uppercase tracking-widest`}>Pemasukan</span>
                                </div>
                                <p className={`${isMobile ? 'text-sm' : 'text-xl'} font-bold text-emerald-600 leading-none`}>Rp {fmtRp(financial.total_pemasukan)}</p>
                            </div>
                        </div>
                        {/* Pengeluaran */}
                        <div className={`bg-white ${isMobile ? 'rounded-xl p-3' : 'rounded-2xl p-5'} shadow-soft border border-gray-50 relative overflow-hidden`}>
                            <div className="absolute top-0 right-0 w-16 h-16 bg-rose-50 rounded-full -translate-y-1/3 translate-x-1/3"></div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className={`${isMobile ? 'w-7 h-7 rounded-lg' : 'w-9 h-9 rounded-xl'} bg-rose-50 flex items-center justify-center`}>
                                        <i className={`fas fa-arrow-up text-rose-500 ${isMobile ? 'text-[10px]' : 'text-xs'}`}></i>
                                    </div>
                                    <span className={`${isMobile ? 'text-[9px]' : 'text-[10px]'} font-black text-gray-400 uppercase tracking-widest`}>Pengeluaran</span>
                                </div>
                                <p className={`${isMobile ? 'text-sm' : 'text-xl'} font-bold text-rose-600 leading-none`}>Rp {fmtRp(financial.total_pengeluaran)}</p>
                            </div>
                        </div>
                        {/* Sisa Kas */}
                        <div className={`bg-white ${isMobile ? 'rounded-xl p-3' : 'rounded-2xl p-5'} shadow-soft border border-gray-50 relative overflow-hidden`}>
                            <div className={`absolute top-0 right-0 w-16 h-16 ${financial.sisa_kas >= 0 ? 'bg-blue-50' : 'bg-amber-50'} rounded-full -translate-y-1/3 translate-x-1/3`}></div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className={`${isMobile ? 'w-7 h-7 rounded-lg' : 'w-9 h-9 rounded-xl'} ${financial.sisa_kas >= 0 ? 'bg-blue-50' : 'bg-amber-50'} flex items-center justify-center`}>
                                        <i className={`fas fa-wallet ${financial.sisa_kas >= 0 ? 'text-blue-500' : 'text-amber-500'} ${isMobile ? 'text-[10px]' : 'text-xs'}`}></i>
                                    </div>
                                    <span className={`${isMobile ? 'text-[9px]' : 'text-[10px]'} font-black text-gray-400 uppercase tracking-widest`}>Sisa Kas</span>
                                </div>
                                <p className={`${isMobile ? 'text-sm' : 'text-xl'} font-bold ${financial.sisa_kas >= 0 ? 'text-blue-600' : 'text-amber-600'} leading-none`}>
                                    {financial.sisa_kas < 0 && '-'}Rp {fmtRp(financial.sisa_kas)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Per-User Breakdown */}
                    {financial.per_user?.length > 0 && (
                        <div className={`bg-white ${isMobile ? 'rounded-2xl p-3' : 'rounded-3xl p-6'} shadow-soft border border-gray-50`}>
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h2 className={`${isMobile ? 'text-sm' : 'text-base'} font-bold text-gray-800`}>Rekap Transaksi per User</h2>
                                    <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-gray-400 mt-0.5`}>Ringkasan pemasukan & pengeluaran tiap operator</p>
                                </div>
                                <div className={`${isMobile ? 'w-7 h-7' : 'w-8 h-8'} rounded-lg bg-indigo-50 flex items-center justify-center`}>
                                    <i className="fas fa-users-cog text-indigo-500 text-xs"></i>
                                </div>
                            </div>
                            <div className={`grid ${isMobile ? 'grid-cols-1 gap-2' : 'grid-cols-2 lg:grid-cols-3 gap-3'}`}>
                                {financial.per_user.map((u, idx) => (
                                    <div key={idx} className={`${isMobile ? 'p-2.5' : 'p-4'} rounded-xl bg-gray-50/60 border border-gray-100 hover:bg-gray-50 transition-colors`}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} rounded-lg bg-indigo-100 flex items-center justify-center`}>
                                                <i className={`fas fa-user text-indigo-500 ${isMobile ? 'text-[8px]' : 'text-[10px]'}`}></i>
                                            </div>
                                            <span className={`${isMobile ? 'text-[10px]' : 'text-xs'} font-bold text-gray-700 truncate`}>{u.name}</span>
                                        </div>
                                        <div className={`grid grid-cols-3 ${isMobile ? 'gap-1' : 'gap-2'}`}>
                                            <div>
                                                <p className={`${isMobile ? 'text-[8px]' : 'text-[9px]'} font-bold text-gray-400 uppercase tracking-wider`}>Masuk</p>
                                                <p className={`${isMobile ? 'text-[9px]' : 'text-[11px]'} font-bold text-emerald-600`}>Rp {fmtRp(u.pemasukan)}</p>
                                            </div>
                                            <div>
                                                <p className={`${isMobile ? 'text-[8px]' : 'text-[9px]'} font-bold text-gray-400 uppercase tracking-wider`}>Keluar</p>
                                                <p className={`${isMobile ? 'text-[9px]' : 'text-[11px]'} font-bold text-rose-600`}>Rp {fmtRp(u.pengeluaran)}</p>
                                            </div>
                                            <div>
                                                <p className={`${isMobile ? 'text-[8px]' : 'text-[9px]'} font-bold text-gray-400 uppercase tracking-wider`}>Sisa</p>
                                                <p className={`${isMobile ? 'text-[9px]' : 'text-[11px]'} font-bold ${u.sisa >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>{u.sisa < 0 && '-'}Rp {fmtRp(u.sisa)}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Row 4: Quick Navigation + Recent Activity */}
            <div className={`grid grid-cols-1 lg:grid-cols-2 ${isMobile ? 'gap-3' : 'gap-6'}`}>
                {/* Quick Navigation */}
                <div className={`bg-white ${isMobile ? 'rounded-2xl p-3' : 'rounded-3xl p-6'} shadow-soft border border-gray-50`}>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className={`${isMobile ? 'text-sm' : 'text-base'} font-bold text-gray-800`}>Navigasi Cepat</h2>
                        <div className={`${isMobile ? 'w-7 h-7' : 'w-8 h-8'} rounded-lg bg-gray-50 flex items-center justify-center`}>
                            <i className="fas fa-th-large text-gray-400 text-xs"></i>
                        </div>
                    </div>
                    <div className={`grid ${isMobile ? 'grid-cols-4 gap-2' : 'grid-cols-5 gap-4'}`}>
                        {menuCards.map((card, index) => (
                            <Link key={index} to={card.to} className="flex flex-col items-center group">
                                <div className={`${isMobile ? 'w-10 h-10 rounded-xl' : 'w-12 h-12 rounded-2xl'} bg-${card.color}-50 flex items-center justify-center mb-1.5 group-hover:bg-${card.color}-100 text-${card.color}-500 group-hover:text-${card.color}-700 transition-all duration-200 transform group-hover:-translate-y-1 shadow-sm group-hover:shadow-md`}>
                                    <i className={`fas ${card.icon} ${isMobile ? 'text-sm' : 'text-lg'}`}></i>
                                </div>
                                <span className={`${isMobile ? 'text-[8px]' : 'text-[10px]'} font-bold text-gray-500 group-hover:text-gray-800 transition-colors uppercase tracking-tight text-center`}>{card.label}</span>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Recent Activity */}
                <div className={`bg-white ${isMobile ? 'rounded-2xl p-3' : 'rounded-3xl p-6'} shadow-soft border border-gray-50`}>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className={`${isMobile ? 'text-sm' : 'text-base'} font-bold text-gray-800`}>Aktivitas Terbaru</h2>
                        <Link to="/log-aktivitas" className="text-[10px] font-bold text-primary uppercase tracking-wider hover:underline">Lihat Semua</Link>
                    </div>
                    {activity?.recent_logs?.length > 0 ? (
                        <div className={`space-y-2 ${isMobile ? 'max-h-[250px]' : 'max-h-[320px]'} overflow-y-auto pr-2 custom-scrollbar`}>
                            {activity.recent_logs.map((log, idx) => {
                                const style = getActionStyle(log.action);
                                return (
                                    <div key={idx} className="flex items-start gap-3 group cursor-default">
                                        <div className={`${isMobile ? 'w-7 h-7 rounded-lg' : 'w-9 h-9 rounded-xl'} bg-${style.color}-50 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-all`}>
                                            <i className={`fas ${style.icon} text-${style.color}-500 ${isMobile ? 'text-[10px]' : 'text-xs'}`}></i>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-semibold text-gray-700 leading-tight mb-1 line-clamp-2`}>{log.description}</p>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{log.user?.name || 'System'}</span>
                                                <span className="w-1 h-1 rounded-full bg-gray-200"></span>
                                                <span className="text-[9px] text-gray-400 font-bold uppercase">{formatTime(log.created_at)}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <i className="fas fa-inbox text-3xl text-gray-200 mb-3"></i>
                            <p className="text-xs text-gray-400 font-medium">Belum ada aktivitas terbaru</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Dashboard;
