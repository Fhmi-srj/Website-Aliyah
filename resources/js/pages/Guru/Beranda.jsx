import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../lib/axios";
import { BerandaSkeleton } from "./components/Skeleton";
import { AnimatedTabs } from "./components/AnimatedTabs";

function Beranda() {
    const navigate = useNavigate();
    const { user } = useAuth();

    // State for dashboard data
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dashboardData, setDashboardData] = useState({
        user: { name: "", nip: "", jabatan: "" },
        today: { date: "", scheduleCount: 0 },
        stats: {
            mengajar: { total: 0, hadir: 0, izin: 0, sakit: 0, percentage: 0 },
            kegiatan: { total: 0, hadir: 0, izin: 0, sakit: 0, percentage: 0 },
            rapat: { total: 0, hadir: 0, izin: 0, sakit: 0, percentage: 0 },
        },
        reminders: [],
    });

    // State for upcoming events (next 7 days)
    const [upcomingEvents, setUpcomingEvents] = useState([]);

    const [loadingUpcoming, setLoadingUpcoming] = useState(true);

    // Stats tab state
    const [statsTab, setStatsTab] = useState("mengajar");

    const statsTabs = [
        { id: "mengajar", label: "Mengajar", icon: "fa-chalkboard-teacher" },
        { id: "kegiatan", label: "Kegiatan", icon: "fa-calendar-check" },
        { id: "rapat", label: "Rapat", icon: "fa-users" },
    ];

    // Fetch dashboard data
    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                setLoading(true);
                const response = await api.get("/guru-panel/dashboard");
                setDashboardData(response.data);
                setError(null);
            } catch (err) {
                console.error("Error fetching dashboard:", err);
                const errorMsg =
                    err.response?.data?.message ||
                    err.message ||
                    "Gagal memuat data dashboard";
                setError(errorMsg);
            } finally {
                setLoading(false);
            }
        };

        // Fetch upcoming events for next 7 days
        const fetchUpcomingEvents = async () => {
            try {
                setLoadingUpcoming(true);
                const response = await api.get('/guru-panel/upcoming-events');
                setUpcomingEvents(response.data.events || []);
            } catch (err) {
                console.error('Error fetching upcoming events:', err);
            } finally {
                setLoadingUpcoming(false);
            }
        };

        fetchDashboard();
        fetchUpcomingEvents();
    }, []);



    // Loading state
    if (loading) {
        return <BerandaSkeleton />;
    }

    // Error state
    if (error) {
        return (
            <div className="p-4">
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                    <i className="fas fa-exclamation-circle text-red-500 text-2xl mb-2"></i>
                    <p className="text-red-600">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-3 px-4 py-2 bg-red-500 text-white rounded-lg text-sm"
                    >
                        Coba Lagi
                    </button>
                </div>
            </div>
        );
    }

    const { stats, reminders, today } = dashboardData;
    const userData = dashboardData.user;

    // Get current tab's stats
    const currentStats = stats?.[statsTab] || {
        total: 0,
        hadir: 0,
        izin: 0,
        alpha: 0,
        percentage: 0,
    };

    return (
        <div className="min-h-screen bg-white flex flex-col">
            {/* Header Section - Full width green */}
            <div className="bg-gradient-to-br from-green-600 to-green-700 px-4 pt-4 pb-8 text-white">
                {/* User Info */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm overflow-hidden">
                        {userData.foto_url ? (
                            <img src={userData.foto_url} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <i className="fas fa-user text-xl"></i>
                        )}
                    </div>
                    <div className="flex-1">
                        <p className="text-green-100 text-xs">
                            Selamat Datang,
                        </p>
                        <h2 className="font-bold text-lg">
                            {userData.name || user?.name || "Guru"}
                        </h2>
                        <p className="text-green-200 text-xs">
                            {userData.nip || "-"} · {userData.jabatan || "Guru"}
                        </p>
                    </div>
                </div>

                {/* Date Badge */}
                <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 bg-white/20 px-3 py-1.5 rounded-full backdrop-blur-sm">
                        <i className="fas fa-calendar-alt"></i>
                        {today?.date ||
                            new Date().toLocaleDateString("id-ID", {
                                weekday: "long",
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                            })}
                    </span>
                    <span className="bg-white/20 px-3 py-1.5 rounded-full backdrop-blur-sm">
                        <i className="fas fa-bell mr-1"></i>
                        {today?.scheduleCount || 0} Jadwal
                    </span>
                </div>
            </div>

            {/* Main Content Area - Rounded top */}
            <div className="flex-1 bg-white rounded-t-3xl -mt-4 px-4 pt-5 pb-20 space-y-5">
                {/* Statistik Section - No card, direct content */}
                <div>
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <i className="fas fa-chart-pie text-green-500"></i>
                        Statistik
                    </h3>

                    {/* Stats Tabs - Animated sliding indicator */}
                    <AnimatedTabs
                        tabs={statsTabs}
                        activeTab={statsTab}
                        onTabChange={setStatsTab}
                        className="mb-4"
                    />

                    {/* Stats Display - Horizontal layout */}
                    <div className="flex items-center gap-4 bg-white rounded-2xl p-4">
                        {/* Progress Circle - clickable */}
                        <div
                            className="relative w-20 h-20 flex-shrink-0 cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => navigate(`/guru/riwayat?tab=${statsTab}`)}
                        >
                            <svg
                                className="w-full h-full transform -rotate-90"
                                viewBox="0 0 36 36"
                            >
                                <path
                                    d="M18 2.5a15.5 15.5 0 1 1 0 31 15.5 15.5 0 0 1 0-31"
                                    fill="none"
                                    stroke="#e5e7eb"
                                    strokeWidth="3"
                                />
                                <path
                                    d="M18 2.5a15.5 15.5 0 1 1 0 31 15.5 15.5 0 0 1 0-31"
                                    fill="none"
                                    stroke="url(#gradient)"
                                    strokeWidth="3"
                                    strokeDasharray={`${currentStats.percentage}, 100`}
                                    strokeLinecap="round"
                                />
                                <defs>
                                    <linearGradient
                                        id="gradient"
                                        x1="0%"
                                        y1="0%"
                                        x2="100%"
                                        y2="0%"
                                    >
                                        <stop offset="0%" stopColor="#10b981" />
                                        <stop
                                            offset="100%"
                                            stopColor="#059669"
                                        />
                                    </linearGradient>
                                </defs>
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-lg font-bold text-green-600">
                                    {currentStats.percentage}%
                                </span>
                            </div>
                        </div>

                        {/* Stats Grid - clickable boxes */}
                        <div className="flex-1 grid grid-cols-2 gap-2 text-xs">
                            <div
                                className="bg-green-50 rounded-xl p-2.5 text-center cursor-pointer hover:bg-green-100 transition-colors hover:scale-[1.02]"
                                onClick={() => navigate(`/guru/riwayat?tab=${statsTab}`)}
                            >
                                <p className="text-green-600 font-bold text-lg">
                                    {currentStats.hadir}
                                </p>
                                <p className="text-gray-500 text-[10px]">
                                    Hadir
                                </p>
                            </div>
                            <div
                                className="bg-yellow-50 rounded-xl p-2.5 text-center cursor-pointer hover:bg-yellow-100 transition-colors hover:scale-[1.02]"
                                onClick={() => navigate(`/guru/riwayat?tab=${statsTab}`)}
                            >
                                <p className="text-yellow-600 font-bold text-lg">
                                    {currentStats.izin}
                                </p>
                                <p className="text-gray-500 text-[10px]">
                                    Izin
                                </p>
                            </div>
                            <div
                                className="bg-red-50 rounded-xl p-2.5 text-center cursor-pointer hover:bg-red-100 transition-colors hover:scale-[1.02]"
                                onClick={() => navigate(`/guru/riwayat?tab=${statsTab}`)}
                            >
                                <p className="text-red-600 font-bold text-lg">
                                    {currentStats.alpha}
                                </p>
                                <p className="text-gray-500 text-[10px]">
                                    Alpha
                                </p>
                            </div>
                            <div
                                className="bg-gray-50 rounded-xl p-2.5 text-center cursor-pointer hover:bg-gray-100 transition-colors hover:scale-[1.02]"
                                onClick={() => navigate(`/guru/riwayat?tab=${statsTab}`)}
                            >
                                <p className="text-gray-600 font-bold text-lg">
                                    {currentStats.total}
                                </p>
                                <p className="text-gray-500 text-[10px]">
                                    Total
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Menu Utama - No card wrapper, direct grid */}
                <div>
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <i className="fas fa-th-large text-green-500"></i>
                        Menu Utama
                    </h3>
                    <div className="grid grid-cols-4 gap-3">
                        <button
                            onClick={() => navigate("/guru/absensi/mengajar")}
                            className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl text-white cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"
                        >
                            <i className="fas fa-chalkboard-teacher text-xl"></i>
                            <span className="text-[10px] font-medium">
                                Mengajar
                            </span>
                        </button>
                        <button
                            onClick={() => navigate("/guru/absensi/kegiatan")}
                            className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl text-white cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"
                        >
                            <i className="fas fa-calendar-check text-xl"></i>
                            <span className="text-[10px] font-medium">
                                Kegiatan
                            </span>
                        </button>
                        <button
                            onClick={() => navigate("/guru/absensi/rapat")}
                            className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl text-white cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"
                        >
                            <i className="fas fa-users text-xl"></i>
                            <span className="text-[10px] font-medium">
                                Rapat
                            </span>
                        </button>
                        <button
                            onClick={() => navigate("/guru/ulangan")}
                            className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl text-white cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"
                        >
                            <i className="fas fa-file-signature text-xl"></i>
                            <span className="text-[10px] font-medium">
                                Ulangan
                            </span>
                        </button>
                        <button
                            onClick={() => navigate("/guru/sertifikat")}
                            className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl text-white cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"
                        >
                            <i className="fas fa-certificate text-xl"></i>
                            <span className="text-[10px] font-medium">
                                Sertifikat
                            </span>
                        </button>
                        <button
                            onClick={() => navigate("/guru/sppd")}
                            className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl text-white cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"
                        >
                            <i className="fas fa-file-alt text-xl"></i>
                            <span className="text-[10px] font-medium">
                                SPPD
                            </span>
                        </button>
                        <button
                            onClick={() => navigate("/guru/modul")}
                            className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl text-white cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"
                        >
                            <i className="fas fa-book text-xl"></i>
                            <span className="text-[10px] font-medium">
                                Modul
                            </span>
                        </button>
                        <button
                            onClick={() => navigate("/guru/download")}
                            className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl text-white cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"
                        >
                            <i className="fas fa-download text-xl"></i>
                            <span className="text-[10px] font-medium">
                                Download
                            </span>
                        </button>
                        <button
                            onClick={() => navigate("/guru/jurnal-kelas")}
                            className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl text-white cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"
                        >
                            <i className="fas fa-book-open text-xl"></i>
                            <span className="text-[10px] font-medium">
                                Jurnal Kelas
                            </span>
                        </button>
                        <button
                            onClick={() => navigate("/guru/absen-kelas")}
                            className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl text-white cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"
                        >
                            <i className="fas fa-clipboard-list text-xl"></i>
                            <span className="text-[10px] font-medium">
                                Absen Kelas
                            </span>
                        </button>
                        <button
                            onClick={() => navigate("/guru/supervisi")}
                            className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl text-white cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"
                        >
                            <i className="fas fa-clipboard-check text-xl"></i>
                            <span className="text-[10px] font-medium">
                                Supervisi
                            </span>
                        </button>
                    </div>
                </div>

                {/* Pengingat - Compact list without card */}
                {reminders && reminders.length > 0 && (
                    <div>
                        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                            <i className="fas fa-bell text-green-500"></i>
                            Pengingat
                        </h3>
                        <div className="space-y-2">
                            {reminders.map((reminder, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => {
                                        if (reminder.type === 'mengajar' || reminder.type === 'next') {
                                            navigate('/guru/absensi/mengajar');
                                        } else if (reminder.type === 'kegiatan') {
                                            navigate('/guru/absensi/kegiatan');
                                        } else if (reminder.type === 'rapat') {
                                            navigate('/guru/absensi/rapat');
                                        }
                                    }}
                                    className="w-full flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm cursor-pointer hover:shadow-md transition-all hover:scale-[1.01] text-left"
                                >
                                    <div
                                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${reminder.priority === "high"
                                            ? "bg-red-100"
                                            : reminder.type === "next"
                                                ? "bg-blue-100"
                                                : "bg-yellow-100"
                                            }`}
                                    >
                                        <i
                                            className={`fas ${reminder.type === "mengajar"
                                                ? "fa-chalkboard-teacher"
                                                : reminder.type === "kegiatan"
                                                    ? "fa-calendar-check"
                                                    : reminder.type === "rapat"
                                                        ? "fa-users"
                                                        : "fa-clock"
                                                } ${reminder.priority === "high"
                                                    ? "text-red-500"
                                                    : reminder.type === "next"
                                                        ? "text-blue-500"
                                                        : "text-yellow-500"
                                                }`}
                                        ></i>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-gray-800 text-sm font-medium truncate">
                                            {reminder.title}
                                        </p>
                                        <p className="text-gray-500 text-xs truncate">
                                            {new Date().toLocaleDateString('id-ID', { weekday: 'long' })} · {reminder.description}
                                        </p>
                                    </div>
                                    <i className="fas fa-chevron-right text-gray-300 text-xs"></i>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Agenda Mendatang - Next 7 Days */}
                <div>
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <i className="fas fa-calendar-alt text-green-500"></i>
                        Agenda 7 Hari Ke Depan
                    </h3>
                    {loadingUpcoming ? (
                        <div className="flex items-center justify-center py-6">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
                        </div>
                    ) : upcomingEvents.length > 0 ? (
                        <div className="space-y-2">
                            {upcomingEvents.map((event, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => {
                                        if (event.type === 'mengajar') {
                                            navigate('/guru/absensi/mengajar');
                                        } else if (event.type === 'kegiatan') {
                                            navigate('/guru/absensi/kegiatan');
                                        } else if (event.type === 'rapat') {
                                            navigate('/guru/absensi/rapat');
                                        }
                                    }}
                                    className="w-full flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm cursor-pointer hover:shadow-md transition-all hover:scale-[1.01] text-left"
                                >
                                    <div
                                        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${event.type === 'mengajar' ? 'bg-green-100' :
                                            event.type === 'kegiatan' ? 'bg-emerald-100' : 'bg-teal-100'
                                            }`}
                                    >
                                        <i
                                            className={`fas ${event.type === 'mengajar' ? 'fa-chalkboard-teacher text-green-600' :
                                                event.type === 'kegiatan' ? 'fa-calendar-check text-emerald-600' :
                                                    'fa-users text-teal-600'
                                                }`}
                                        ></i>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-gray-800 text-sm font-medium truncate">{event.title}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[10px] text-gray-400">{event.date}</span>
                                            {event.time && (
                                                <span className="text-[10px] text-gray-400">{event.time}</span>
                                            )}
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${event.type === 'mengajar' ? 'bg-green-100 text-green-700' :
                                                event.type === 'kegiatan' ? 'bg-emerald-100 text-emerald-700' :
                                                    'bg-teal-100 text-teal-700'
                                                }`}>
                                                {event.type === 'mengajar' ? 'Mengajar' :
                                                    event.type === 'kegiatan' ? 'Kegiatan' : 'Rapat'}
                                            </span>
                                        </div>
                                        {event.subtitle && (
                                            <p className="text-xs text-gray-500 truncate mt-0.5">{event.subtitle}</p>
                                        )}
                                    </div>
                                    <i className="fas fa-chevron-right text-gray-300 text-xs"></i>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-gray-50 rounded-xl p-6 text-center">
                            <i className="fas fa-calendar-check text-gray-300 text-2xl mb-2"></i>
                            <p className="text-gray-500 text-sm">Tidak ada agenda dalam 7 hari ke depan</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Beranda;
