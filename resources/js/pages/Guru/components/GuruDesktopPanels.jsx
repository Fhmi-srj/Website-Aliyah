import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatedTabs } from './AnimatedTabs';
import RoleSwitcher from '../../../components/RoleSwitcher';
import { useAuth } from '../../../contexts/AuthContext';
import { getRoleInfo, hasAdminAccess } from '../../../config/roleConfig';
import Swal from 'sweetalert2';
import { showSwitchRolePopup } from '../../../utils/switchRolePopup';

/**
 * Desktop Left Panel — Profil + Statistik
 * Extracted from Beranda.jsx for persistent display in desktop layout
 */
export function DesktopLeftPanel({ dashboardData, loading, activeRole, upcomingEvents, tahunAjaran, onLogout }) {
    const navigate = useNavigate();
    const [statsTab, setStatsTab] = useState('mengajar');

    const statsTabs = [
        { id: 'mengajar', label: 'Mengajar', icon: 'fa-chalkboard-teacher' },
        { id: 'kegiatan', label: 'Kegiatan', icon: 'fa-calendar-check' },
        { id: 'rapat', label: 'Rapat', icon: 'fa-users' },
    ];

    if (loading) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="bg-green-100 rounded-2xl h-40"></div>
                <div className="bg-gray-100 rounded-2xl h-48"></div>
            </div>
        );
    }

    if (!dashboardData) return null;

    const { stats, today } = dashboardData;
    const userData = dashboardData.user;
    const currentStats = stats?.[statsTab] || { total: 0, hadir: 0, izin: 0, alpha: 0, percentage: 0 };

    // Filter today's events
    const todayEvents = (upcomingEvents || []).filter(event => {
        const today = new Date();
        const todayDay = today.getDate();
        const todayMonth = today.getMonth();
        if (event.rawDate) {
            const eventDate = new Date(event.rawDate);
            return eventDate.getDate() === todayDay && eventDate.getMonth() === todayMonth;
        }
        // Fallback: try matching day number in the date string
        return event.date && event.date.includes(String(todayDay).padStart(2, '0'));
    }).slice(0, 5);

    const handleLogout = async () => {
        const result = await Swal.fire({
            title: 'Keluar dari Aplikasi?',
            text: 'Anda akan keluar dari akun ini',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#EF4444',
            cancelButtonColor: '#6B7280',
            confirmButtonText: 'Ya, Keluar',
            cancelButtonText: 'Batal',
            reverseButtons: true,
        });
        if (result.isConfirmed && onLogout) {
            onLogout();
        }
    };

    return (
        <div className="h-full flex flex-col">
            {/* Top Content */}
            <div className="space-y-4">
                {/* Profile Card */}
                <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-2xl p-5 text-white">
                    <div className="flex items-center gap-3">
                        <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm overflow-hidden flex-shrink-0">
                            {userData.foto_url ? (
                                <img src={userData.foto_url} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <i className="fas fa-user text-xl"></i>
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <h2 className="font-bold text-base leading-tight truncate">{userData.name || 'Guru'}</h2>
                            <p className="text-green-200 text-xs truncate">{userData.nip || '-'} · {userData.jabatan || 'Guru'}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                            <span className="bg-white/20 px-3 py-1.5 rounded-full text-xs backdrop-blur-sm">
                                <i className="fas fa-bell mr-0.5"></i>
                                {today?.scheduleCount || 0}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Statistik */}
                <div>
                    <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2 text-sm">
                        <i className="fas fa-chart-pie text-green-500"></i>
                        Statistik Kehadiran
                    </h3>
                    <AnimatedTabs tabs={statsTabs} activeTab={statsTab} onTabChange={setStatsTab} className="mb-3" />
                    <div className="flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm">
                        <div className="relative w-20 h-20 flex-shrink-0 cursor-pointer hover:scale-105 transition-transform" onClick={() => navigate(`/guru/riwayat?tab=${statsTab}`)}>
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                <path d="M18 2.5a15.5 15.5 0 1 1 0 31 15.5 15.5 0 0 1 0-31" fill="none" stroke="#e5e7eb" strokeWidth="3.5" />
                                <path d="M18 2.5a15.5 15.5 0 1 1 0 31 15.5 15.5 0 0 1 0-31" fill="none" stroke="url(#gradient-desktop)" strokeWidth="3.5" strokeDasharray={`${currentStats.percentage}, 100`} strokeLinecap="round" />
                                <defs>
                                    <linearGradient id="gradient-desktop" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#10b981" />
                                        <stop offset="100%" stopColor="#059669" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-base font-bold text-green-600">{currentStats.percentage}%</span>
                            </div>
                        </div>
                        <div className="flex-1 grid grid-cols-2 gap-2">
                            <div className="bg-green-50 rounded-xl p-3 text-center cursor-pointer hover:bg-green-100 transition-colors" onClick={() => navigate(`/guru/riwayat?tab=${statsTab}`)}>
                                <p className="text-green-600 font-bold text-xl">{currentStats.hadir}</p>
                                <p className="text-gray-500 text-[10px]">Hadir</p>
                            </div>
                            <div className="bg-yellow-50 rounded-xl p-3 text-center cursor-pointer hover:bg-yellow-100 transition-colors" onClick={() => navigate(`/guru/riwayat?tab=${statsTab}`)}>
                                <p className="text-yellow-600 font-bold text-xl">{currentStats.izin}</p>
                                <p className="text-gray-500 text-[10px]">Izin</p>
                            </div>
                            <div className="bg-red-50 rounded-xl p-3 text-center cursor-pointer hover:bg-red-100 transition-colors" onClick={() => navigate(`/guru/riwayat?tab=${statsTab}`)}>
                                <p className="text-red-600 font-bold text-xl">{currentStats.alpha}</p>
                                <p className="text-gray-500 text-[10px]">Alpha</p>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-3 text-center cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => navigate(`/guru/riwayat?tab=${statsTab}`)}>
                                <p className="text-gray-600 font-bold text-xl">{currentStats.total}</p>
                                <p className="text-gray-500 text-[10px]">Total</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Spacer */}
            <div className="flex-1"></div>

            {/* Bottom — Role Switcher + Logout */}
            <div className="space-y-2 pt-3">
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                    <RoleSwitcher compact={true} onSwitch={() => window.location.reload()} />
                </div>
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 bg-white rounded-xl border border-gray-200 px-3 py-2 text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors text-xs font-medium cursor-pointer shadow-sm"
                >
                    <i className="fas fa-sign-out-alt"></i>
                    Keluar
                </button>
            </div>
        </div>
    );
}


/**
 * Desktop Right Panel — Menu Utama + Pengingat + Agenda 7 Hari
 * Extracted from Beranda.jsx for persistent display in desktop layout
 */
export function DesktopRightPanel({ dashboardData, upcomingEvents, loading, loadingUpcoming }) {
    const navigate = useNavigate();
    const { user, activeRole, switchRole } = useAuth();

    const handleSwitchRole = () => {
        showSwitchRolePopup({
            userRoles: user?.roles || [],
            activeRole,
            switchRole,
            navigate,
        });
    };

    const reminders = dashboardData?.reminders || [];

    if (loading) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="bg-gray-100 rounded-2xl h-36"></div>
                <div className="bg-gray-100 rounded-2xl h-24"></div>
                <div className="bg-gray-100 rounded-2xl h-40"></div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Menu Utama — Fixed, always visible */}
            <div className="flex-shrink-0 pb-4">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2 text-sm">
                    <i className="fas fa-th-large text-green-500"></i>
                    Menu Utama
                </h3>
                <div className="grid grid-cols-4 gap-2.5">
                    {[
                        { path: '/guru/riwayat', icon: 'fa-history', label: 'Riwayat' },
                        { path: '/guru/pengaturan', icon: 'fa-cog', label: 'Pengaturan' },
                        { path: '/guru/profil', icon: 'fa-user', label: 'Profil' },
                        { path: '/guru/absensi/mengajar', icon: 'fa-chalkboard-teacher', label: 'Mengajar' },
                        { path: '/guru/absensi/rapat', icon: 'fa-users', label: 'Rapat' },
                        { path: '/guru/ulangan', icon: 'fa-file-signature', label: 'Penilaian' },
                        { path: '/guru/modul', icon: 'fa-book', label: 'Modul' },
                        { path: '/guru/supervisi', icon: 'fa-clipboard-check', label: 'Supervisi' },
                    ].map((item) => (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl text-white cursor-pointer hover:shadow-lg transition-all hover:scale-[1.03]"
                        >
                            <i className={`fas ${item.icon} text-xl`}></i>
                            <span className="text-[10px] font-medium leading-tight text-center">{item.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Pengingat + Agenda — Scrollable area */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-5 custom-scrollbar">
                {/* Pengingat */}
                {reminders && reminders.length > 0 && (
                    <div>
                        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2 text-sm">
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
                                    className="w-full flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm cursor-pointer hover:shadow-md transition-all text-left"
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${reminder.priority === 'high' ? 'bg-red-100' : reminder.type === 'next' ? 'bg-blue-100' : 'bg-yellow-100'}`}>
                                        <i className={`fas ${reminder.type === 'mengajar' ? 'fa-chalkboard-teacher' : reminder.type === 'kegiatan' ? 'fa-calendar-check' : reminder.type === 'rapat' ? 'fa-users' : 'fa-clock'} text-sm ${reminder.priority === 'high' ? 'text-red-500' : reminder.type === 'next' ? 'text-blue-500' : 'text-yellow-500'}`}></i>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-gray-800 text-sm font-medium truncate">{reminder.title}</p>
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

                {/* Agenda 7 Hari Ke Depan */}
                <div>
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2 text-sm">
                        <i className="fas fa-calendar-alt text-green-500"></i>
                        Agenda 7 Hari
                    </h3>
                    {loadingUpcoming ? (
                        <div className="flex items-center justify-center py-6">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
                        </div>
                    ) : upcomingEvents && upcomingEvents.length > 0 ? (
                        <div className="space-y-2">
                            {upcomingEvents.map((event, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => {
                                        if (event.type === 'mengajar') navigate('/guru/absensi/mengajar');
                                        else if (event.type === 'kegiatan') navigate('/guru/absensi/kegiatan');
                                        else if (event.type === 'rapat') navigate('/guru/absensi/rapat');
                                    }}
                                    className="w-full flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm cursor-pointer hover:shadow-md transition-all text-left"
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${event.type === 'mengajar' ? 'bg-green-100' : event.type === 'kegiatan' ? 'bg-emerald-100' : 'bg-teal-100'}`}>
                                        <i className={`fas ${event.type === 'mengajar' ? 'fa-chalkboard-teacher text-green-600' : event.type === 'kegiatan' ? 'fa-calendar-check text-emerald-600' : 'fa-users text-teal-600'} text-sm`}></i>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-gray-800 text-sm font-medium truncate">
                                            {event.type === 'mengajar' ? event.date : event.title}
                                        </p>
                                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                            {event.type === 'mengajar' && event.title && (
                                                <span className="text-[10px] text-gray-500 font-medium">{event.title}</span>
                                            )}
                                            {event.type !== 'mengajar' && (
                                                <span className="text-[10px] text-gray-400">{event.date}</span>
                                            )}
                                            {event.time && (
                                                <span className="text-[10px] text-gray-400">{event.time}</span>
                                            )}
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${event.type === 'mengajar' ? 'bg-green-100 text-green-700' : event.type === 'kegiatan' ? 'bg-emerald-100 text-emerald-700' : 'bg-teal-100 text-teal-700'}`}>
                                                {event.type === 'mengajar' ? 'Mengajar' : event.type === 'kegiatan' ? 'Kegiatan' : 'Rapat'}
                                            </span>
                                            {event.type === 'mengajar' && event.subtitle && (
                                                <span className="text-[9px] px-1.5 py-0.5 rounded font-medium bg-blue-100 text-blue-700">{event.subtitle}</span>
                                            )}
                                        </div>
                                        {event.type !== 'mengajar' && event.subtitle && (
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
