import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useTahunAjaran } from '../../../contexts/TahunAjaranContext';
import { getRoleInfo } from '../../../config/roleConfig';
import RoleSwitcher from '../../../components/RoleSwitcher';
import Swal from 'sweetalert2';
import logoImage from '../../../../images/logo.png';
import InstallPrompt from '../../../components/InstallPrompt';

function GuruLayout({ children }) {
    const [fabOpen, setFabOpen] = useState(false);
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const [tahunAjaranMenuOpen, setTahunAjaranMenuOpen] = useState(false);
    const navigate = useNavigate();
    // Use AuthContext tahunAjaran with fallback to TahunAjaranContext
    const { logout, tahunAjaran: authTahunAjaran } = useAuth();
    const { activeTahunAjaran } = useTahunAjaran();
    const tahunAjaran = authTahunAjaran || activeTahunAjaran;
    const profileMenuRef = useRef(null);

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

    const navItems = [
        { to: '/guru', icon: 'fas fa-home', label: 'Beranda', end: true },
        { to: '/guru/riwayat', icon: 'fas fa-history', label: 'Riwayat' },
        { type: 'fab' }, // Placeholder for FAB
        { to: '/guru/pengaturan', icon: 'fas fa-cog', label: 'Pengaturan' },
        { to: '/guru/profil', icon: 'fas fa-user', label: 'Profil' },
    ];

    const fabOptions = [
        { type: 'mengajar', icon: 'fas fa-chalkboard-teacher', label: 'Mengajar', position: 'left' },
        { type: 'kegiatan', icon: 'fas fa-calendar-check', label: 'Kegiatan', position: 'top' },
        { type: 'rapat', icon: 'fas fa-users', label: 'Rapat', position: 'right' },
    ];

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto relative">
            {/* PWA Install Prompt */}
            <InstallPrompt />
            {/* Desktop Block Message */}
            <div className="hidden md:flex fixed inset-0 bg-gradient-to-br from-green-600 to-green-800 z-50 items-center justify-center">
                <div className="text-center text-white p-8">
                    <i className="fas fa-mobile-alt text-6xl mb-4"></i>
                    <h1 className="text-2xl font-bold mb-2">Gunakan Perangkat Mobile</h1>
                    <p className="text-green-100">Aplikasi Guru hanya tersedia di perangkat mobile.</p>
                    <p className="text-green-200 text-sm mt-4">Silakan buka di smartphone atau tablet Anda.</p>
                </div>
            </div>

            {/* Header - Logo and App Name */}
            <header className="bg-white px-4 py-3 flex items-center justify-between sticky top-0 z-40 md:hidden shadow-sm border-b border-gray-100">
                <div className="flex items-center gap-3">
                    <img
                        src={logoImage}
                        alt="Logo"
                        className="w-10 h-10 object-contain"
                    />
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

                    {/* Dropdown Menu */}
                    {profileMenuOpen && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50">
                            {/* Profil */}
                            <button
                                onClick={() => {
                                    setProfileMenuOpen(false);
                                    navigate('/guru/profil');
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                            >
                                <i className="fas fa-user text-green-600"></i>
                                <span className="text-sm text-gray-700">Profil</span>
                            </button>

                            {/* Tahun Ajaran - Text Only Display */}
                            <div className="border-t border-gray-100 px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <i className="fas fa-calendar-alt text-emerald-500"></i>
                                    <div>
                                        <span className="text-xs text-gray-400">Tahun Ajaran</span>
                                        <p className="text-sm font-medium text-gray-700">
                                            {tahunAjaran?.nama || 'Tidak dipilih'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Role Switcher */}
                            <div className="border-t border-gray-100">
                                <RoleSwitcher
                                    compact={true}
                                    onSwitch={() => {
                                        setProfileMenuOpen(false);
                                        window.location.reload();
                                    }}
                                />
                            </div>

                            {/* Logout */}
                            <div className="border-t border-gray-100">
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition-colors text-left"
                                >
                                    <i className="fas fa-sign-out-alt text-red-500"></i>
                                    <span className="text-sm text-red-600">Keluar</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-auto pb-24 md:hidden">
                {children}
            </main>

            {/* FAB Overlay - only darken background */}
            {fabOpen && (
                <div
                    className="fixed inset-0 z-30 md:hidden"
                    onClick={() => setFabOpen(false)}
                />
            )}

            {/* FAB Menu Container - Behind Navbar with Glassmorphism */}
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
                    {/* Menu Items */}
                    <div className="px-4 pt-4 pb-20 space-y-1">
                        {/* Absensi Mengajar */}
                        <button
                            onClick={() => handleAbsensiClick('mengajar')}
                            className="w-full flex items-center gap-3 py-2 px-2 hover:bg-gray-100/50 rounded-xl transition-colors"
                        >
                            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                                <i className="fas fa-chalkboard-teacher text-white text-sm"></i>
                            </div>
                            <div className="flex-1 text-left">
                                <p className="font-semibold text-gray-800 text-sm">Absensi Mengajar</p>
                                <p className="text-xs text-gray-500">Guru</p>
                            </div>
                            <i className="fas fa-chevron-right text-green-500"></i>
                        </button>

                        {/* Absensi Kegiatan */}
                        <button
                            onClick={() => handleAbsensiClick('kegiatan')}
                            className="w-full flex items-center gap-3 py-2 px-2 hover:bg-gray-100/50 rounded-xl transition-colors"
                        >
                            <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                                <i className="fas fa-calendar-check text-white text-sm"></i>
                            </div>
                            <div className="flex-1 text-left">
                                <p className="font-semibold text-gray-800 text-sm">Absensi Kegiatan</p>
                                <p className="text-xs text-gray-500">Kegiatan</p>
                            </div>
                            <i className="fas fa-chevron-right text-green-500"></i>
                        </button>

                        {/* Absensi Rapat */}
                        <button
                            onClick={() => handleAbsensiClick('rapat')}
                            className="w-full flex items-center gap-3 py-2 px-2 hover:bg-gray-100/50 rounded-xl transition-colors"
                        >
                            <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center flex-shrink-0">
                                <i className="fas fa-users text-white text-sm"></i>
                            </div>
                            <div className="flex-1 text-left">
                                <p className="font-semibold text-gray-800 text-sm">Absensi Rapat</p>
                                <p className="text-xs text-gray-500">Rapat</p>
                            </div>
                            <i className="fas fa-chevron-right text-green-500"></i>
                        </button>
                    </div>
                </div>
            </div>

            {/* Bottom Navigation - Above FAB Menu */}
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

