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
export function DesktopLeftPanel({ dashboardData, loading, activeRole, upcomingEvents, tahunAjaran, onLogout, liveAttendance, liveStats, loadingLive, isLibur, liburKeterangan, liburDateRange }) {
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
    const currentStats = stats?.[statsTab] || { hadir: 0, izin: 0, sakit: 0, alpha: 0, percentage: 0 };

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
                            <div className="bg-blue-50 rounded-xl p-3 text-center cursor-pointer hover:bg-blue-100 transition-colors" onClick={() => navigate(`/guru/riwayat?tab=${statsTab}`)}>
                                <p className="text-blue-600 font-bold text-xl">{currentStats.sakit}</p>
                                <p className="text-gray-500 text-[10px]">Sakit</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Live Kehadiran Mengajar */}
            <div className="mt-4">
                <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2 text-sm">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    Kehadiran Mengajar
                    {!loadingLive && !isLibur && (
                        <span className="ml-auto text-[10px] font-normal text-gray-400">
                            {liveStats.hadir}/{liveStats.total} hadir
                        </span>
                    )}
                </h3>
                {loadingLive ? (
                    <div className="space-y-1.5">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-gray-100 rounded-lg h-10 animate-pulse"></div>
                        ))}
                    </div>
                ) : isLibur ? (
                    <div className="text-center py-5 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-100">
                        <div className="text-3xl mb-2"><i className="fas fa-school text-amber-400"></i></div>
                        <p className="text-xs font-semibold text-amber-700">KBM Libur</p>
                        <p className="text-[10px] text-amber-500 mt-0.5">{liburKeterangan}</p>
                        {liburDateRange && (
                            <p className="text-[9px] text-amber-400 mt-0.5">
                                <i className="fas fa-calendar-alt mr-0.5"></i>{liburDateRange}
                            </p>
                        )}
                    </div>
                ) : liveAttendance.length === 0 ? (
                    <div className="text-center py-4 text-gray-400 text-xs">
                        <i className="fas fa-coffee text-lg mb-1 block"></i>
                        Tidak ada jadwal hari ini
                    </div>
                ) : (
                    <>
                        <div className="flex gap-1.5 mb-2">
                            <div className="flex-1 bg-green-50 rounded-lg px-2 py-1.5 text-center">
                                <p className="text-sm font-bold text-green-600">{liveStats.hadir}</p>
                                <p className="text-[8px] text-green-500 font-medium">Hadir</p>
                            </div>
                            <div className="flex-1 bg-amber-50 rounded-lg px-2 py-1.5 text-center">
                                <p className="text-sm font-bold text-amber-600">{liveStats.belum}</p>
                                <p className="text-[8px] text-amber-500 font-medium">Belum</p>
                            </div>
                            <div className="flex-1 bg-gray-50 rounded-lg px-2 py-1.5 text-center">
                                <p className="text-sm font-bold text-gray-600">{liveStats.total}</p>
                                <p className="text-[8px] text-gray-500 font-medium">Total</p>
                            </div>
                        </div>
                        <div className="space-y-1 max-h-[200px] overflow-y-auto custom-scrollbar">
                            {liveAttendance.map((item, idx) => {
                                let cfg = {
                                    sudah_absen: { bg: 'bg-green-100', text: 'text-green-700', label: 'Hadir', icon: 'fa-check-circle' },
                                    sedang_berlangsung: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Berlangsung', icon: 'fa-clock' },
                                    terlewat: { bg: 'bg-red-100', text: 'text-red-700', label: 'Belum', icon: 'fa-exclamation-circle' },
                                    belum_mulai: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Nanti', icon: 'fa-hourglass-half' },
                                }[item.status] || { bg: 'bg-gray-100', text: 'text-gray-500', label: '-', icon: 'fa-circle' };

                                // Override for actual attendance status
                                if (item.status === 'sudah_absen' && item.guru_status) {
                                    if (item.guru_status === 'S') {
                                        cfg = { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Sakit', icon: 'fa-briefcase-medical' };
                                    } else if (item.guru_status === 'I') {
                                        cfg = { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Izin', icon: 'fa-envelope-open-text' };
                                    } else if (item.guru_status === 'A') {
                                        cfg = { bg: 'bg-red-100', text: 'text-red-700', label: 'Alpha', icon: 'fa-times-circle' };
                                    }
                                }
                                return (
                                    <div key={idx} className="flex items-center gap-2 bg-white rounded-lg px-2.5 py-2 border border-gray-50">
                                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                            {item.guru_foto ? (
                                                <img src={item.guru_foto} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <i className="fas fa-user text-green-500 text-[10px]"></i>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[11px] font-semibold text-gray-800 truncate">{item.guru_nama}</p>
                                            <p className="text-[9px] text-gray-400 truncate">{item.jam_mulai} · {item.mapel} · {item.kelas}</p>
                                        </div>
                                        <span className={`flex-shrink-0 text-[8px] px-1.5 py-0.5 rounded-full font-semibold ${cfg.bg} ${cfg.text}`}>
                                            <i className={`fas ${cfg.icon} mr-0.5`}></i> {cfg.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
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
                        { path: '/guru/galeri', icon: 'fa-images', label: 'Galeri' },
                        { path: '/guru/cbt/bank-soal', icon: 'fa-database', label: 'Bank Soal' },
                        { path: '/guru/cbt/jadwal', icon: 'fa-laptop-code', label: 'Jadwal Ujian' },
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
