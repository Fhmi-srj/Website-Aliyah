import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useTahunAjaran } from '../../../contexts/TahunAjaranContext';
import { getRoleInfo, canAccessAdminPage, hasAdminAccess, roleLabels, roleIcons } from '../../../config/roleConfig';
import RoleSwitcher from '../../../components/RoleSwitcher';
import { DesktopLeftPanel, DesktopRightPanel } from './GuruDesktopPanels';
import api from '../../../lib/axios';
import ScrollToTop from '../../../components/ScrollToTop';
import Swal from 'sweetalert2';
import logoImage from '../../../../images/logo.png';
import InstallPrompt from '../../../components/InstallPrompt';
import { showSwitchRolePopup } from '../../../utils/switchRolePopup';

function GuruLayout({ children }) {
    const [fabOpen, setFabOpen] = useState(false);
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const [tahunAjaranMenuOpen, setTahunAjaranMenuOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const navigate = useNavigate();
    const { user, logout, tahunAjaran: authTahunAjaran, activeRole, switchRole } = useAuth();
    const { activeTahunAjaran } = useTahunAjaran();
    const tahunAjaran = authTahunAjaran || activeTahunAjaran;
    const profileMenuRef = useRef(null);
    const mainRef = useRef(null);
    const canSeeTransaksi = canAccessAdminPage(activeRole, '/transaksi');
    const currentRoleInfo = getRoleInfo(activeRole);

    // Desktop panel data — fetched at layout level so panels persist across navigation
    const [dashboardData, setDashboardData] = useState(null);
    const [upcomingEvents, setUpcomingEvents] = useState([]);
    const [loadingDashboard, setLoadingDashboard] = useState(true);
    const [loadingUpcoming, setLoadingUpcoming] = useState(true);

    // Live attendance data for desktop
    const [liveAttendance, setLiveAttendance] = useState([]);
    const [liveStats, setLiveStats] = useState({ total: 0, hadir: 0, belum: 0 });
    const [loadingLive, setLoadingLive] = useState(true);
    const [isLibur, setIsLibur] = useState(false);
    const [liburKeterangan, setLiburKeterangan] = useState('');
    const [liburDateRange, setLiburDateRange] = useState('');

    // Detect mobile/desktop
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Fetch dashboard data for desktop panels
    useEffect(() => {
        if (isMobile) return; // Don't fetch on mobile — Beranda handles its own data

        const fetchDashboard = async () => {
            try {
                setLoadingDashboard(true);
                const response = await api.get('/guru-panel/dashboard');
                setDashboardData(response.data);
            } catch (err) {
                console.error('Error fetching dashboard for panels:', err);
            } finally {
                setLoadingDashboard(false);
            }
        };

        const fetchUpcomingEvents = async () => {
            try {
                setLoadingUpcoming(true);
                const response = await api.get('/guru-panel/upcoming-events');
                setUpcomingEvents(response.data.events || []);
            } catch (err) {
                console.error('Error fetching upcoming events for panels:', err);
            } finally {
                setLoadingUpcoming(false);
            }
        };

        fetchDashboard();
        fetchUpcomingEvents();

        // Fetch live attendance
        const fetchLiveAttendance = async () => {
            try {
                setLoadingLive(true);
                const response = await api.get('/guru-panel/live-attendance');
                if (response.data.is_libur) {
                    setIsLibur(true);
                    setLiburKeterangan(response.data.libur_keterangan || 'Hari Libur');
                    const mulai = response.data.libur_tanggal_mulai;
                    const akhir = response.data.libur_tanggal_berakhir;
                    setLiburDateRange(mulai && akhir ? `${mulai} - ${akhir}` : '');
                    setLiveAttendance([]);
                } else {
                    setIsLibur(false);
                    setLiveAttendance(response.data.data || []);
                }
                setLiveStats(response.data.stats || { total: 0, hadir: 0, belum: 0 });
            } catch (err) {
                console.error('Error fetching live attendance:', err);
            } finally {
                setLoadingLive(false);
            }
        };
        fetchLiveAttendance();
        const liveInterval = setInterval(fetchLiveAttendance, 60000);
        return () => clearInterval(liveInterval);
    }, [isMobile]);

    const handleAbsensiClick = (type) => {
        setFabOpen(false);
        navigate(`/guru/absensi/${type}`);
    };

    const handleLogout = async () => {
        setProfileMenuOpen(false);

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
            width: '85%',
            customClass: {
                popup: 'rounded-2xl !max-w-xs',
                title: '!text-base',
                htmlContainer: '!text-sm',
                confirmButton: 'rounded-xl px-4 !text-xs',
                cancelButton: 'rounded-xl px-4 !text-xs'
            }
        });

        if (result.isConfirmed) {
            await logout();
            navigate('/login');
        }
    };

    // Close profile menu on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
                setProfileMenuOpen(false);
                setTahunAjaranMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const hasMultipleRoles = (user?.roles?.length || 0) > 1;

    const handleSwitchRole = () => {
        showSwitchRolePopup({
            userRoles: user?.roles || [],
            activeRole,
            switchRole,
            navigate,
        });
    };

    const navItems = [
        { to: '/guru', icon: 'fas fa-home', label: 'Beranda', end: true },
        { to: '/guru/riwayat', icon: 'fas fa-history', label: 'Riwayat' },
        { type: 'fab' },
        { to: '/guru/pengaturan', icon: 'fas fa-cog', label: 'Pengaturan' },
        hasMultipleRoles
            ? { type: 'switch-role', icon: 'fas fa-exchange-alt', label: 'Ganti Peran' }
            : { to: '/guru/profil', icon: 'fas fa-user', label: 'Profil' },
    ];

    return (
        <div className="bg-gray-50 relative md:h-screen md:overflow-hidden">
            {/* PWA Install Prompt */}
            <InstallPrompt />

            {/* === DESKTOP LAYOUT (≥768px) — Unified theme === */}
            <div className="hidden md:flex flex-col h-screen w-full bg-white">
                {/* Unified Green Header Band */}
                <div className="flex-shrink-0 bg-gradient-to-r from-green-700 via-green-600 to-green-700 px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src={logoImage} alt="Logo" className="w-8 h-8 rounded-lg bg-white/20 p-0.5" />
                        <div>
                            <h1 className="text-white font-bold text-sm tracking-wide">MAHAKAM APP</h1>
                            <p className="text-green-200 text-[10px]">Sistem Informasi Terpadu</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 text-white text-xs">
                        <span className="flex items-center gap-1.5 bg-white/15 px-3 py-1.5 rounded-full backdrop-blur-sm">
                            <i className="fas fa-calendar-alt"></i>
                            {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                        {tahunAjaran && (
                            <span className="flex items-center gap-1.5 bg-white/15 px-3 py-1.5 rounded-full backdrop-blur-sm">
                                <i className="fas fa-graduation-cap"></i>
                                TA {tahunAjaran.nama}
                            </span>
                        )}
                        <span className="flex items-center gap-1.5 bg-white/15 px-3 py-1.5 rounded-full backdrop-blur-sm">
                            <i className="fas fa-user-circle"></i>
                            {dashboardData?.user?.name || 'Guru'}
                        </span>
                    </div>
                </div>

                {/* 3-Column Content Area */}
                <div className="flex-1 min-h-0 grid w-full" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                    {/* Kolom 1: Profil + Statistik */}
                    <div className="min-w-0 overflow-y-auto p-4 bg-gray-50/60 shadow-[2px_0_8px_-3px_rgba(0,0,0,0.08)] custom-scrollbar">
                        <DesktopLeftPanel
                            dashboardData={dashboardData}
                            loading={loadingDashboard}
                            activeRole={activeRole}
                            upcomingEvents={upcomingEvents}
                            tahunAjaran={tahunAjaran}
                            onLogout={logout}
                            liveAttendance={liveAttendance}
                            liveStats={liveStats}
                            loadingLive={loadingLive}
                            isLibur={isLibur}
                            liburKeterangan={liburKeterangan}
                            liburDateRange={liburDateRange}
                        />
                    </div>

                    {/* Kolom 2: Dynamic Content */}
                    <div ref={mainRef} className="min-w-0 overflow-y-auto bg-white custom-scrollbar">
                        <ScrollToTop containerRef={mainRef} />
                        {children}
                    </div>

                    {/* Kolom 3: Menu + Pengingat + Agenda */}
                    <div className="min-w-0 overflow-hidden flex flex-col p-4 bg-gray-50/60 shadow-[-2px_0_8px_-3px_rgba(0,0,0,0.08)]">
                        <DesktopRightPanel
                            dashboardData={dashboardData}
                            upcomingEvents={upcomingEvents}
                            loading={loadingDashboard}
                            loadingUpcoming={loadingUpcoming}
                        />
                    </div>
                </div>
            </div>

            {/* === MOBILE LAYOUT (<768px) === */}
            {/* Mobile wrapper */}
            <div className="md:hidden min-h-screen flex flex-col max-w-md mx-auto w-full">
                {/* Mobile Header */}
                <header className="bg-white px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-sm border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <img src={logoImage} alt="Logo" className="w-10 h-10 object-contain" />
                        <div>
                            <h1 className="font-bold text-green-800 text-sm leading-tight">MAHAKAM APP</h1>
                            <p className="text-[10px] text-green-600">Sistem Informasi Terpadu</p>
                        </div>
                    </div>

                    {/* Profile Icon with Dropdown */}
                    <div className="relative" ref={profileMenuRef}>
                        <button
                            onClick={() => { setProfileMenuOpen(!profileMenuOpen); setTahunAjaranMenuOpen(false); }}
                            className="p-2 hover:bg-green-50 rounded-lg transition-colors"
                        >
                            <i className="fas fa-user-circle text-green-600 text-xl"></i>
                        </button>

                        {profileMenuOpen && (
                            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50">
                                <button
                                    onClick={() => { setProfileMenuOpen(false); navigate('/guru/profil'); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                                >
                                    <i className="fas fa-user text-green-600"></i>
                                    <span className="text-sm text-gray-700">Profil</span>
                                </button>
                                <div className="border-t border-gray-100 px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <i className="fas fa-calendar-alt text-emerald-500"></i>
                                        <div>
                                            <span className="text-xs text-gray-400">Tahun Ajaran</span>
                                            <p className="text-sm font-medium text-gray-700">{tahunAjaran?.nama || 'Tidak dipilih'}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="border-t border-gray-100">
                                    <RoleSwitcher compact={true} onSwitch={() => { setProfileMenuOpen(false); window.location.reload(); }} />
                                </div>
                                <div className="border-t border-gray-100">
                                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition-colors text-left">
                                        <i className="fas fa-sign-out-alt text-red-500"></i>
                                        <span className="text-sm text-red-600">Keluar</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </header>

                {/* Mobile Main Content */}
                <main ref={mainRef} className="flex-1 overflow-auto pb-24">
                    <ScrollToTop containerRef={mainRef} />
                    {children}
                </main>
            </div>

            {/* === MOBILE-ONLY ELEMENTS === */}
            {/* FAB Overlay */}
            {fabOpen && (
                <div className="fixed inset-0 z-30 md:hidden" onClick={() => setFabOpen(false)} />
            )}

            {/* FAB Menu */}
            <div className={`fixed bottom-0 left-0 right-0 z-[35] md:hidden transition-all duration-300 ${fabOpen ? 'translate-y-0' : 'translate-y-full'}`}>
                <div
                    className="max-w-md mx-auto rounded-t-3xl overflow-hidden"
                    style={{
                        background: 'rgba(248, 250, 252, 0.98)',
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        boxShadow: '0 -4px 20px rgba(0,0,0,0.15), 0 -1px 3px rgba(0,0,0,0.08)'
                    }}
                >
                    <div className="px-4 pt-4 pb-20 space-y-1">
                        <button onClick={() => handleAbsensiClick('mengajar')} className="w-full flex items-center gap-3 py-2 px-2 hover:bg-gray-100/50 rounded-xl transition-colors">
                            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0"><i className="fas fa-chalkboard-teacher text-white text-sm"></i></div>
                            <div className="flex-1 text-left"><p className="font-semibold text-gray-800 text-sm">Absensi Mengajar</p><p className="text-xs text-gray-500">Guru</p></div>
                            <i className="fas fa-chevron-right text-green-500"></i>
                        </button>
                        <button onClick={() => handleAbsensiClick('kegiatan')} className="w-full flex items-center gap-3 py-2 px-2 hover:bg-gray-100/50 rounded-xl transition-colors">
                            <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0"><i className="fas fa-calendar-check text-white text-sm"></i></div>
                            <div className="flex-1 text-left"><p className="font-semibold text-gray-800 text-sm">Absensi Kegiatan</p><p className="text-xs text-gray-500">Kegiatan</p></div>
                            <i className="fas fa-chevron-right text-green-500"></i>
                        </button>
                        <button onClick={() => handleAbsensiClick('rapat')} className="w-full flex items-center gap-3 py-2 px-2 hover:bg-gray-100/50 rounded-xl transition-colors">
                            <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center flex-shrink-0"><i className="fas fa-users text-white text-sm"></i></div>
                            <div className="flex-1 text-left"><p className="font-semibold text-gray-800 text-sm">Absensi Rapat</p><p className="text-xs text-gray-500">Rapat</p></div>
                            <i className="fas fa-chevron-right text-green-500"></i>
                        </button>
                        {canSeeTransaksi && (
                            <>
                                <div className="border-t border-gray-200/60 my-1.5"></div>
                                <button onClick={() => { setFabOpen(false); navigate('/transaksi'); }} className="w-full flex items-center gap-3 py-2 px-2 hover:bg-gray-100/50 rounded-xl transition-colors">
                                    <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0"><i className="fas fa-money-bill-wave text-white text-sm"></i></div>
                                    <div className="flex-1 text-left"><p className="font-semibold text-gray-800 text-sm">Transaksi</p><p className="text-xs text-gray-500">Pemasukan & Pengeluaran</p></div>
                                    <i className="fas fa-chevron-right text-amber-500"></i>
                                </button>
                                <button onClick={() => { setFabOpen(false); navigate('/data-induk/kegiatan'); }} className="w-full flex items-center gap-3 py-2 px-2 hover:bg-gray-100/50 rounded-xl transition-colors">
                                    <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center flex-shrink-0"><i className="fas fa-tasks text-white text-sm"></i></div>
                                    <div className="flex-1 text-left"><p className="font-semibold text-gray-800 text-sm">Kegiatan</p><p className="text-xs text-gray-500">Manajemen Kegiatan</p></div>
                                    <i className="fas fa-chevron-right text-indigo-500"></i>
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden">
                <div className="max-w-md mx-auto bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.1)] border-t border-gray-100">
                    <div className="grid grid-cols-5 h-16">
                        {navItems.map((item, idx) => {
                            if (item.type === 'fab') {
                                return (
                                    <div key="fab" className="flex items-center justify-center">
                                        <button
                                            onClick={() => setFabOpen(!fabOpen)}
                                            className={`-mt-6 w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 cursor-pointer bg-green-600 border-4 border-white ${fabOpen ? 'bg-red-500' : ''}`}
                                        >
                                            <i className={`${fabOpen ? 'fas fa-times' : 'fas fa-clipboard-check'} text-white text-lg`}></i>
                                        </button>
                                    </div>
                                );
                            }
                            if (item.type === 'switch-role') {
                                return (
                                    <button
                                        key="switch-role"
                                        onClick={handleSwitchRole}
                                        className="flex flex-col items-center justify-center py-2 transition-colors text-gray-400 hover:text-green-500 cursor-pointer"
                                    >
                                        <i className={`${item.icon} text-lg`}></i>
                                        <span className="text-[10px] mt-1 font-medium">{item.label}</span>
                                    </button>
                                );
                            }
                            return (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    end={item.end}
                                    onClick={() => setFabOpen(false)}
                                    className={({ isActive }) =>
                                        `flex flex-col items-center justify-center py-2 transition-colors ${isActive ? 'text-green-600' : 'text-gray-400 hover:text-green-500'}`
                                    }
                                >
                                    <i className={`${item.icon} text-lg`}></i>
                                    <span className="text-[10px] mt-1 font-medium">{item.label}</span>
                                </NavLink>
                            );
                        })}
                    </div>
                </div>
            </nav>
        </div>
    );
}

export default GuruLayout;
