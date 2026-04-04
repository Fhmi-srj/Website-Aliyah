import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import ScrollToTop from '../../../components/ScrollToTop';
import Swal from 'sweetalert2';
import api from '../../../lib/axios';
import logoImage from '../../../../images/logo.png';
import { DesktopLeftPanel, DesktopRightPanel } from './SiswaDesktopPanels';

export default function SiswaLayout({ children }) {
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const profileMenuRef = useRef(null);
    const mainRef = useRef(null);

    // Desktop panel data
    const [dashboardData, setDashboardData] = useState(null);
    const [loadingDashboard, setLoadingDashboard] = useState(true);

    // Detect mobile/desktop
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Fetch dashboard data for desktop panels
    useEffect(() => {
        if (isMobile) return;

        const fetchDashboard = async () => {
            try {
                setLoadingDashboard(true);
                const response = await api.get('/siswa-panel/dashboard');
                setDashboardData(response.data);
            } catch (err) {
                console.error('Error fetching dashboard for panels:', err);
            } finally {
                setLoadingDashboard(false);
            }
        };

        fetchDashboard();
    }, [isMobile]);

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
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const navItems = [
        { to: '/siswa', icon: 'fas fa-home', label: 'Beranda', end: true },
        { to: '/siswa/ujian', icon: 'fas fa-laptop-code', label: 'Ujian CBT' },
        { to: '/siswa/penilaian', icon: 'fas fa-star', label: 'Nilai' },
        { to: '/siswa/profil', icon: 'fas fa-user-circle', label: 'Profil' },
    ];

    return (
        <div className="bg-gray-50 relative md:h-screen md:overflow-hidden">
            {/* === DESKTOP LAYOUT (≥768px) === */}
            <div className="hidden md:flex flex-col h-screen w-full bg-white">
                {/* Unified Header Band for Student (Sky Blue Theme) */}
                <div className="flex-shrink-0 bg-gradient-to-r from-sky-600 via-sky-500 to-sky-600 px-6 py-3 flex items-center justify-between shadow-[0_2px_10px_rgba(0,0,0,0.1)] z-10">
                    <div className="flex items-center gap-3">
                        <img src={logoImage} alt="Logo" className="w-8 h-8 rounded-lg bg-white/20 p-0.5 shadow-sm" />
                        <div>
                            <h1 className="text-white font-bold text-sm tracking-wide">MAHAKAM APP</h1>
                            <p className="text-sky-100 text-[10px]">Portal Siswa</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-white text-xs font-medium">
                        <span className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm shadow-sm cursor-pointer hover:bg-white/20 transition-colors" onClick={() => navigate('/siswa/ujian')}>
                            <i className="fas fa-laptop-code"></i> Ujian CBT
                        </span>
                        <span className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm shadow-sm cursor-pointer hover:bg-white/20 transition-colors" onClick={() => navigate('/siswa/penilaian')}>
                            <i className="fas fa-star"></i> Nilai
                        </span>
                        <div className="h-4 w-px bg-white/30"></div>
                        <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm shadow-sm border-l-2 border-sky-400 pl-2">
                            <i className="fas fa-user-graduate bg-white text-sky-500 rounded-full w-5 h-5 flex items-center justify-center"></i>
                            {dashboardData?.user?.nama || user?.nama || 'Siswa'}
                        </span>
                    </div>
                </div>

                {/* 3-Column Content Area Desktop */}
                <div className="flex-1 min-h-0 grid w-full" style={{ gridTemplateColumns: 'minmax(250px, 1fr) 2fr minmax(250px, 1fr)' }}>
                    {/* Kolom 1: Profil */}
                    <div className="min-w-0 overflow-y-auto p-4 bg-gray-50/60 shadow-[2px_0_8px_-3px_rgba(0,0,0,0.08)] custom-scrollbar border-r border-sky-50 outline outline-1 outline-sky-100">
                        {loadingDashboard ? (
                            <div className="space-y-4 animate-pulse">
                                <div className="bg-sky-100 rounded-2xl h-40"></div>
                                <div className="bg-gray-100 rounded-2xl h-20"></div>
                            </div>
                        ) : (
                            <DesktopLeftPanel user={dashboardData?.user} onLogout={handleLogout} />
                        )}
                    </div>

                    {/* Kolom 2: Main Content */}
                    <div ref={mainRef} className="min-w-0 overflow-y-auto bg-white custom-scrollbar p-6">
                        <ScrollToTop containerRef={mainRef} />
                        {children}
                    </div>

                    {/* Kolom 3: Info Akademik */}
                    <div className="min-w-0 overflow-hidden flex flex-col p-4 bg-gray-50/60 shadow-[-2px_0_8px_-3px_rgba(0,0,0,0.08)] border-l border-sky-50 outline outline-1 outline-sky-100">
                        {loadingDashboard ? (
                            <div className="space-y-4 animate-pulse">
                                <div className="bg-orange-100 rounded-2xl h-36"></div>
                            </div>
                        ) : (
                            <DesktopRightPanel info={dashboardData?.info} />
                        )}
                    </div>
                </div>
            </div>

            {/* === MOBILE LAYOUT (<768px) === */}
            <div className="md:hidden min-h-screen flex flex-col max-w-md mx-auto w-full">
                {/* Mobile Header */}
                <header className="bg-white px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-[0_2px_10px_rgba(0,0,0,0.04)] border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <img src={logoImage} alt="Logo" className="w-10 h-10 object-contain drop-shadow-sm" />
                        <div>
                            <h1 className="font-extrabold text-sky-800 text-sm leading-tight tracking-tight">MAHAKAM APP</h1>
                            <p className="text-[10px] text-sky-500 font-medium">Portal Siswa</p>
                        </div>
                    </div>

                    {/* Profile Icon with Dropdown */}
                    <div className="relative" ref={profileMenuRef}>
                        <button
                            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                            className="p-2 hover:bg-sky-50 rounded-xl transition-colors border-2 border-transparent focus:border-sky-100"
                        >
                            <i className="fas fa-user-circle text-sky-500 text-2xl drop-shadow-sm"></i>
                        </button>

                        {profileMenuOpen && (
                            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-fadeIn">
                                <div className="px-4 py-3 bg-sky-50/50 border-b border-sky-100">
                                    <p className="text-xs text-slate-500 font-medium">Masuk sebagai</p>
                                    <p className="text-sm font-bold text-sky-800 truncate">{user?.nama}</p>
                                </div>
                                <button
                                    onClick={() => { setProfileMenuOpen(false); navigate('/siswa/profil'); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-sky-50 transition-colors text-left"
                                >
                                    <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center text-sky-600">
                                        <i className="fas fa-user-circle"></i>
                                    </div>
                                    <span className="text-sm text-slate-700 font-bold">Profil Ku</span>
                                </button>
                                <div className="border-t border-gray-100">
                                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition-colors text-left group">
                                        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
                                            <i className="fas fa-sign-out-alt"></i>
                                        </div>
                                        <span className="text-sm text-red-600 font-bold">Keluar</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </header>

                {/* Mobile Main Content */}
                <main ref={mainRef} className="flex-1 overflow-auto pb-24 bg-slate-50">
                    <ScrollToTop containerRef={mainRef} />
                    {children}
                </main>
            </div>

            {/* Bottom Navigation for Mobile */}
            <nav className="fixed bottom-0 left-0 right-0 z-[40] md:hidden pb-safe">
                <div className="max-w-md mx-auto bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.08)] border-t border-gray-100/80 rounded-t-[2rem]">
                    <div className="flex justify-around items-center h-16 px-2">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                end={item.end}
                                className={({ isActive }) =>
                                    `flex flex-col items-center justify-center py-2 transition-colors ${isActive ? 'text-sky-600' : 'text-slate-400 hover:text-sky-500'}`
                                }
                            >
                                <i className={`${item.icon} text-lg`}></i>
                                <span className="text-[10px] mt-1 font-medium">{item.label}</span>
                            </NavLink>
                        ))}
                    </div>
                </div>
            </nav>
        </div>
    );
}
