import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE, authFetch } from '../../config/api';
import { useAuth } from '../../contexts/AuthContext';
import { useTahunAjaran } from '../../contexts/TahunAjaranContext';
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
} from 'chart.js';
import { Bar, Pie, Line, Doughnut } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

function Dashboard() {
    const [stats, setStats] = useState(null);
    const [charts, setCharts] = useState(null);
    const [activity, setActivity] = useState(null);
    const [loading, setLoading] = useState(true);

    // Get Tahun Ajaran from contexts (AuthContext has priority)
    const { tahunAjaran: authTahunAjaran } = useAuth();
    const { activeTahunAjaran } = useTahunAjaran();
    const tahunAjaranId = authTahunAjaran?.id || activeTahunAjaran?.id;

    // Quick navigation cards
    const menuCards = [
        { to: '/data-induk/siswa', icon: 'fa-user-graduate', label: 'Siswa' },
        { to: '/data-induk/guru', icon: 'fa-chalkboard-teacher', label: 'Guru' },
        { to: '/data-induk/kelas', icon: 'fa-door-open', label: 'Kelas' },
        { to: '/data-induk/jadwal', icon: 'fa-calendar-alt', label: 'Jadwal' },
        { to: '/data-induk/mapel', icon: 'fa-book', label: 'Mapel' },
        { to: '/data-induk/kegiatan', icon: 'fa-tasks', label: 'Kegiatan' },
        { to: '/data-induk/ekskul', icon: 'fa-futbol', label: 'Ekskul' },
        { to: '/data-induk/rapat', icon: 'fa-users', label: 'Rapat' },
    ];

    // Fetch all dashboard data
    useEffect(() => {
        const fetchData = async () => {
            if (!tahunAjaranId) return;

            try {
                const taParam = `?tahun_ajaran_id=${tahunAjaranId}`;
                const [statsRes, chartsRes, activityRes] = await Promise.all([
                    authFetch(`${API_BASE}/dashboard/statistics${taParam}`),
                    authFetch(`${API_BASE}/dashboard/charts${taParam}`),
                    authFetch(`${API_BASE}/dashboard/recent-activity${taParam}`)
                ]);

                const statsData = await statsRes.json();
                const chartsData = await chartsRes.json();
                const activityData = await activityRes.json();

                if (statsData.success) setStats(statsData.data);
                if (chartsData.success) setCharts(chartsData.data);
                if (activityData.success) setActivity(activityData.data);
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [tahunAjaranId]);

    // Chart colors
    const chartColors = [
        'rgba(34, 197, 94, 0.8)',   // green
        'rgba(59, 130, 246, 0.8)',  // blue
        'rgba(168, 85, 247, 0.8)',  // purple
        'rgba(249, 115, 22, 0.8)', // orange
        'rgba(236, 72, 153, 0.8)', // pink
        'rgba(20, 184, 166, 0.8)', // teal
        'rgba(239, 68, 68, 0.8)',  // red
        'rgba(234, 179, 8, 0.8)',  // yellow
    ];

    // Format date
    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const formatTime = (timeStr) => {
        if (!timeStr) return '-';
        return timeStr.substring(0, 5);
    };

    // Statistics cards data
    // Statistics cards data with vibrant colors
    const statCards = stats ? [
        { label: 'Total Sales', value: `$${stats.total_siswa}k`, sub: '+8% from yesterday', icon: 'fa-user-graduate', bg: 'bg-secondary/10', text: 'text-secondary' },
        { label: 'Total Order', value: stats.total_guru, sub: '+5% from yesterday', icon: 'fa-chalkboard-teacher', bg: 'bg-accent/10', text: 'text-accent' },
        { label: 'Product Sold', value: stats.total_kelas, sub: '+1.2% from yesterday', icon: 'fa-door-open', bg: 'bg-success/10', text: 'text-success' },
        { label: 'New Customers', value: stats.total_mapel, sub: '0.5% from yesterday', icon: 'fa-book', bg: 'bg-primary/10', text: 'text-primary' },
    ] : [];

    // Prepare chart data
    const siswaPerKelasData = charts?.siswa_per_kelas ? {
        labels: charts.siswa_per_kelas.map(d => d.label),
        datasets: [{
            label: 'Jumlah Siswa',
            data: charts.siswa_per_kelas.map(d => d.count),
            backgroundColor: chartColors,
            borderRadius: 6,
        }]
    } : null;

    const guruPerJabatanData = charts?.guru_per_jabatan ? {
        labels: charts.guru_per_jabatan.map(d => d.label),
        datasets: [{
            data: charts.guru_per_jabatan.map(d => d.count),
            backgroundColor: chartColors,
        }]
    } : null;

    const kegiatanPerBulanData = charts?.kegiatan_per_bulan ? {
        labels: charts.kegiatan_per_bulan.map(d => d.label),
        datasets: [{
            label: 'Jumlah Kegiatan',
            data: charts.kegiatan_per_bulan.map(d => d.count),
            borderColor: 'rgba(34, 197, 94, 1)',
            backgroundColor: 'rgba(34, 197, 94, 0.2)',
            tension: 0.4,
            fill: true,
        }]
    } : null;

    const ekskulPerKategoriData = charts?.ekskul_per_kategori ? {
        labels: charts.ekskul_per_kategori.map(d => d.label),
        datasets: [{
            data: charts.ekskul_per_kategori.map(d => d.count),
            backgroundColor: chartColors.slice(0, 4),
        }]
    } : null;

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
        },
        scales: {
            y: { beginAtZero: true, ticks: { stepSize: 1 } }
        }
    };

    const pieOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 12, padding: 10, font: { size: 11 } } },
        }
    };

    if (loading) {
        return (
            <div className="animate-fadeIn flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="relative w-16 h-16 mx-auto mb-4">
                        <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
                        <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                    </div>
                    <p className="text-gray-500 text-sm font-medium tracking-wide">Analysing data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fadeIn flex flex-col flex-grow max-w-full overflow-auto pb-6">
            {/* Header */}
            <header className="mb-8 select-none">
                <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Dashboard</h1>
            </header>

            {/* Top Row: Today's Sales & Visitor Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Today's Sales - Inspiration style */}
                <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-soft border border-white">
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <h2 className="text-lg font-bold text-gray-800">Today's Sales</h2>
                            <p className="text-xs text-gray-400 font-medium">Sales Summery</p>
                        </div>
                        <button className="flex items-center gap-2 px-3 py-2 border border-gray-100 rounded-xl text-[10px] font-bold text-gray-600 hover:bg-gray-50 transition-all">
                            <i className="fas fa-file-export"></i>
                            Export
                        </button>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                        {statCards.map((card, idx) => (
                            <div key={idx} className={`${card.bg} rounded-2xl p-4 transition-all hover:scale-[1.02] cursor-default group`}>
                                <div className={`w-10 h-10 rounded-full bg-white flex items-center justify-center mb-4 shadow-sm group-hover:shadow-md transition-all`}>
                                    <i className={`fas ${card.icon} ${card.text} text-sm`}></i>
                                </div>
                                <p className="text-xl font-bold text-gray-800 leading-none">{card.value}</p>
                                <p className="text-[10px] text-gray-600 font-bold mt-2 truncate">{card.label}</p>
                                <p className={`text-[8px] font-bold mt-1 ${card.text}`}>{card.sub}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Visitor Insights - Simplified inspiration style */}
                <div className="bg-white rounded-3xl p-6 shadow-soft border border-white">
                    <h2 className="text-lg font-bold text-gray-800 mb-6">Visitor Insights</h2>
                    <div className="h-[180px] relative">
                        {kegiatanPerBulanData ? (
                            <Line data={kegiatanPerBulanData} options={{
                                ...chartOptions,
                                scales: { ...chartOptions.scales, x: { display: false }, y: { display: true, ticks: { display: false }, grid: { display: false } } }
                            }} />
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-400 text-xs font-medium">No data available</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Middle Row: Charts & Revenue */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                {/* Total Revenue Part - Bar Chart */}
                <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-soft border border-white">
                    <h2 className="text-lg font-bold text-gray-800 mb-6">Total Revenue</h2>
                    <div className="h-[250px]">
                        {siswaPerKelasData ? (
                            <Bar data={siswaPerKelasData} options={{
                                ...chartOptions,
                                plugins: { ...chartOptions.plugins, legend: { display: true, position: 'bottom', labels: { boxWidth: 8, font: { size: 10, weight: 'bold' } } } }
                            }} />
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-400 text-xs">No data</div>
                        )}
                    </div>
                </div>

                {/* Customer Satisfaction - Simplified Radar/Doughnut */}
                <div className="bg-white rounded-3xl p-6 shadow-soft border border-white">
                    <h2 className="text-lg font-bold text-gray-800 mb-6">Customer Satisfaction</h2>
                    <div className="h-[250px] flex items-center justify-center">
                        {guruPerJabatanData ? (
                            <Doughnut data={guruPerJabatanData} options={pieOptions} />
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-400 text-xs">No data</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Row: Activities & Quick Nav */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Quick Navigation Cards */}
                <div className="bg-white rounded-3xl p-6 shadow-soft border border-white">
                    <h2 className="text-lg font-bold text-gray-800 mb-6">Quick Navigation</h2>
                    <div className="grid grid-cols-4 gap-4">
                        {menuCards.map((card, index) => (
                            <Link
                                key={index}
                                to={card.to}
                                className="flex flex-col items-center group"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mb-2 group-hover:bg-primary group-hover:text-white transition-all transform group-hover:-translate-y-1 shadow-sm">
                                    <i className={`fas ${card.icon} text-lg`}></i>
                                </div>
                                <span className="text-[10px] font-bold text-gray-500 group-hover:text-gray-800 transition-colors uppercase tracking-tight">{card.label}</span>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Recent Activity List */}
                <div className="bg-white rounded-3xl p-6 shadow-soft border border-white">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-gray-800">Recent Activity</h2>
                        <Link to="/log-aktivitas" className="text-[10px] font-bold text-primary uppercase tracking-wider">See All</Link>
                    </div>
                    {activity?.upcoming_kegiatan?.length > 0 ? (
                        <div className="space-y-4">
                            {activity.upcoming_kegiatan.slice(0, 3).map((item, idx) => (
                                <div key={idx} className="flex items-center gap-4 group cursor-pointer">
                                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/10 transition-all">
                                        <i className="fas fa-tasks text-gray-400 group-hover:text-primary transition-colors"></i>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-800 truncate">{item.nama_kegiatan}</p>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                                            {formatDate(item.waktu_mulai)} • {item.tempat || 'N/A'}
                                        </p>
                                    </div>
                                    <i className="fas fa-chevron-right text-[10px] text-gray-200 group-hover:text-gray-400 transition-all"></i>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10">
                            <i className="fas fa-inbox text-3xl text-gray-100 mb-2"></i>
                            <p className="text-xs text-gray-400 font-medium">No recent activities found</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Dashboard;
