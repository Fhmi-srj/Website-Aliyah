import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

function GuruLayout({ children }) {
    const [fabOpen, setFabOpen] = useState(false);
    const navigate = useNavigate();

    const handleAbsensiClick = (type) => {
        setFabOpen(false);
        navigate(`/guru/absensi/${type}`);
    };

    const navItems = [
        { to: '/guru', icon: 'fas fa-home', label: 'Beranda', end: true },
        { to: '/guru/pencarian', icon: 'fas fa-search', label: 'Cari' },
        { type: 'fab' }, // Placeholder for FAB
        { to: '/guru/riwayat', icon: 'fas fa-history', label: 'Riwayat' },
        { to: '/guru/profil', icon: 'fas fa-user', label: 'Profil' },
    ];

    const fabOptions = [
        { type: 'mengajar', icon: 'fas fa-chalkboard-teacher', label: 'Mengajar', position: 'left' },
        { type: 'kegiatan', icon: 'fas fa-calendar-check', label: 'Kegiatan', position: 'top' },
        { type: 'rapat', icon: 'fas fa-users', label: 'Rapat', position: 'right' },
    ];

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto relative">
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
                        src="/images/logo.png"
                        alt="Logo MA Mamba'ul Huda"
                        className="w-10 h-10 object-contain"
                    />
                    <div>
                        <h1 className="font-bold text-green-800 text-sm leading-tight">MA Mamba'ul Huda</h1>
                        <p className="text-[10px] text-green-600">Sistem Absensi Guru</p>
                    </div>
                </div>
                <button
                    onClick={() => navigate('/guru/profil')}
                    className="p-2 hover:bg-green-50 rounded-lg transition-colors"
                >
                    <i className="fas fa-cog text-green-600 text-lg"></i>
                </button>
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
                            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
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
                            <div className="w-10 h-10 bg-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
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
                    <div className="flex items-center justify-around h-16 px-2">
                        {navItems.map((item, idx) => {
                            if (item.type === 'fab') {
                                return (
                                    <button
                                        key="fab"
                                        onClick={() => setFabOpen(!fabOpen)}
                                        className={`-mt-6 w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 cursor-pointer bg-green-600 border-4 border-white ${fabOpen ? 'bg-red-500' : ''}`}
                                    >
                                        <i className={`${fabOpen ? 'fas fa-times' : 'fas fa-clipboard-check'} text-white text-lg`}></i>
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
                                        `flex flex-col items-center justify-center py-2 px-3 transition-colors ${isActive ? 'text-green-600' : 'text-gray-400 hover:text-green-500'}`
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
