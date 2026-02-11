import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useTahunAjaran } from '../../../contexts/TahunAjaranContext';
import AdminSidebar from './AdminSidebar';
import { API_BASE } from '../../../config/api';
import Swal from 'sweetalert2';
import logoImage from '../../../../images/logo.png';

function AdminLayout({ children }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const [moreMenuOpen, setMoreMenuOpen] = useState(false);
    const profileMenuRef = useRef(null);
    const moreMenuRef = useRef(null);

    // State for dark mode
    const [darkMode, setDarkMode] = useState(localStorage.getItem('dark_mode') === 'true');
    const [settings, setSettings] = useState(null);
    const { user, logout, tahunAjaran } = useAuth();

    const toggleCollapse = () => {
        setIsCollapsed(!isCollapsed);
    };

    // Toggle dark mode
    const toggleDarkMode = () => {
        const newMode = !darkMode;
        setDarkMode(newMode);
        localStorage.setItem('dark_mode', newMode);
        if (newMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    // Initialize dark mode on mount
    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
        }
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await fetch(`${API_BASE}/public/settings`);
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setSettings(data.data);
                }
            }
        } catch (error) {
            console.error('Failed to fetch public settings:', error);
        }
    };

    const handleLogout = async () => {
        setProfileMenuOpen(false);
        setMoreMenuOpen(false);

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
                popup: 'rounded-2xl !max-w-xs dark:bg-dark-surface dark:text-dark-text',
                title: '!text-base dark:text-dark-text',
                htmlContainer: '!text-sm dark:text-dark-muted',
                confirmButton: 'rounded-xl px-4 !text-xs',
                cancelButton: 'rounded-xl px-4 !text-xs'
            }
        });

        if (result.isConfirmed) {
            await logout();
            navigate('/login');
        }
    };

    // Close menus on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
                setProfileMenuOpen(false);
            }
            if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
                setMoreMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Check if current path starts with given path
    const isPathActive = (path) => location.pathname.startsWith(path);

    // Bottom navigation items for mobile (simplified: 3 items)
    const mobileNavItems = [
        { to: '/dashboard', icon: 'fas fa-home', label: 'Beranda', end: true },
        { type: 'more' }, // Placeholder for "Menu" dropup
        { to: '/pengaturan', icon: 'fas fa-cog', label: 'Pengaturan' },
    ];

    // All menu items for dropup
    const menuItems = [
        { id: 'siswa', label: 'Manajemen Siswa', path: '/data-induk/siswa', icon: 'fa-user-graduate' },
        { id: 'alumni', label: 'Data Alumni', path: '/data-induk/alumni', icon: 'fa-graduation-cap' },
        { id: 'guru', label: 'Manajemen Guru', path: '/data-induk/guru', icon: 'fa-chalkboard-teacher' },
        { id: 'kelas', label: 'Manajemen Kelas', path: '/data-induk/kelas', icon: 'fa-door-open' },
        { id: 'mapel', label: 'Manajemen Mapel', path: '/data-induk/mapel', icon: 'fa-book' },
        { id: 'jadwal', label: 'Manajemen Jadwal', path: '/data-induk/jadwal', icon: 'fa-calendar-alt' },
        { id: 'jam-pelajaran', label: 'Jam Pelajaran', path: '/data-induk/jam-pelajaran', icon: 'fa-clock' },
        { id: 'kegiatan', label: 'Manajemen Kegiatan', path: '/data-induk/kegiatan', icon: 'fa-tasks' },
        { id: 'ekskul', label: 'Manajemen Ekskul', path: '/data-induk/ekskul', icon: 'fa-futbol' },
        { id: 'rapat', label: 'Manajemen Rapat', path: '/data-induk/rapat', icon: 'fa-users' },
        { id: 'kalender', label: 'Kalender Pendidikan', path: '/data-induk/kalender', icon: 'fa-calendar-check' },
        { id: 'role', label: 'Manajemen Role', path: '/manajemen-role', icon: 'fa-user-shield' },
        { id: 'profil', label: 'Profil Saya', path: '/profil', icon: 'fa-user' },
    ];

    return (
        <div className="min-h-screen flex flex-col bg-[#f8f9fe] dark:bg-dark-bg transition-colors duration-300">
            <div className="w-full flex-1 flex">
                {/* Desktop Sidebar - Sticky */}
                <aside className="hidden md:block sticky top-0 h-screen flex-shrink-0 transition-all duration-300 ease-in-out z-40 bg-white dark:bg-dark-surface border-r border-gray-100 dark:border-dark-border">
                    <AdminSidebar
                        onClose={() => { }}
                        isCollapsed={isCollapsed}
                        onToggleCollapse={toggleCollapse}
                        institutionName={settings?.nama_lembaga || 'Aliyah'}
                        institutionLogo={settings?.logo_url || null}
                    />
                </aside>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Modern Top Header - Desktop & Mobile */}
                    <header className="sticky top-0 z-30 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-md border-b border-gray-100 dark:border-dark-border h-20 flex items-center px-4 md:px-8">
                        <div className="flex-1 flex items-center justify-between">
                            {/* Company Branding */}
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                                    {settings?.logo_url ? (
                                        <img src={settings.logo_url} alt="Logo" className="w-6 h-6 object-contain" />
                                    ) : (
                                        <i className="fas fa-university text-primary text-lg"></i>
                                    )}
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-gray-800 dark:text-dark-text leading-tight">{settings?.nama_lembaga || 'MA Aliyah'}</span>
                                    <span className="text-[10px] text-gray-500 dark:text-dark-muted font-bold uppercase tracking-wider">Administrator</span>
                                </div>
                            </div>

                            {/* Right Side: Tools & Profile */}
                            <div className="flex items-center gap-3 md:gap-6">
                                {/* Dark Mode Toggle */}
                                <button
                                    onClick={toggleDarkMode}
                                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-dark-bg text-gray-600 dark:text-yellow-400 hover:bg-gray-100 dark:hover:bg-dark-surface transition-all"
                                    title={darkMode ? "Switch to Light Mode" : "Dark Mode"}
                                >
                                    <i className={`fas ${darkMode ? 'fa-sun' : 'fa-moon'}`}></i>
                                </button>

                                {/* Notifications */}
                                <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-accent/10 text-accent hover:bg-accent/20 transition-all relative">
                                    <i className="fas fa-bell"></i>
                                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-dark-surface"></span>
                                </button>

                                {/* User Profile */}
                                <div className="relative group cursor-pointer" ref={profileMenuRef}>
                                    <div
                                        className="flex items-center gap-3 p-1 rounded-2xl hover:bg-gray-50 dark:hover:bg-dark-bg transition-all"
                                        onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                                    >
                                        <div className="w-10 h-10 rounded-xl overflow-hidden shadow-md">
                                            <img
                                                src={user?.foto ? `/storage/${user.foto}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.nama || 'Admin')}&background=5c67f2&color=fff`}
                                                alt="User"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="hidden lg:block text-left mr-2">
                                            <p className="text-xs font-bold text-gray-800 dark:text-dark-text leading-tight">{user?.nama?.split(' ')[0] || 'Admin'}</p>
                                            <p className="text-[10px] text-gray-500 dark:text-dark-muted font-medium tracking-wide">Admin</p>
                                        </div>
                                        <i className="fas fa-chevron-down text-[10px] text-gray-400 hidden lg:block"></i>
                                    </div>

                                    {/* Dropdown Menu */}
                                    {profileMenuOpen && (
                                        <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-dark-surface rounded-2xl shadow-deep border border-gray-50 dark:border-dark-border overflow-hidden z-50 animate-fadeIn text-sm">
                                            <div className="p-4 border-b border-gray-50 dark:border-dark-border">
                                                <p className="text-xs font-bold text-gray-800 dark:text-dark-text">{user?.nama || 'Administrator'}</p>
                                                <p className="text-[10px] text-gray-500 dark:text-dark-muted truncate">{user?.email || 'admin@alhikam.sch.id'}</p>
                                            </div>
                                            <button
                                                onClick={() => { setProfileMenuOpen(false); navigate('/profil'); }}
                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-dark-bg transition-colors text-left"
                                            >
                                                <i className="fas fa-user text-primary text-xs"></i>
                                                <span className="text-xs font-medium text-gray-700 dark:text-dark-text">Profil Saya</span>
                                            </button>
                                            <div className="px-4 py-2 bg-blue-50/50 dark:bg-blue-900/10 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <i className="fas fa-calendar-alt text-blue-500 text-xs"></i>
                                                    <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400">{tahunAjaran?.nama || 'N/A'}</span>
                                                </div>
                                            </div>
                                            <div className="p-1 border-t border-gray-50 dark:border-dark-border">
                                                <button
                                                    onClick={handleLogout}
                                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 transition-colors text-left rounded-xl"
                                                >
                                                    <i className="fas fa-sign-out-alt text-xs"></i>
                                                    <span className="text-xs font-bold">Keluar</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </header>

                    {/* Main Content Area */}
                    <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 bg-transparent pb-24 md:pb-8">
                        {children}
                    </main>
                </div>
            </div>

            {/* More Menu Overlay - only on mobile */}
            {moreMenuOpen && (
                <div
                    className="fixed inset-0 z-30 md:hidden"
                    onClick={() => setMoreMenuOpen(false)}
                />
            )}

            {/* Menu Dropup Container - Behind Navbar with Glassmorphism */}
            <div className={`fixed bottom-0 left-0 right-0 z-[35] md:hidden transition-all duration-300 ${moreMenuOpen ? 'translate-y-0' : 'translate-y-full'}`}>
                <div
                    className="max-w-full mx-auto rounded-t-3xl overflow-hidden"
                    style={{
                        background: darkMode ? 'rgba(30, 41, 59, 0.98)' : 'rgba(248, 250, 252, 0.98)',
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        boxShadow: darkMode ? '0 -4px 20px rgba(0,0,0,0.4), 0 -1px 3px rgba(0,0,0,0.2)' : '0 -4px 20px rgba(0,0,0,0.15), 0 -1px 3px rgba(0,0,0,0.08)'
                    }}
                    ref={moreMenuRef}
                >
                    {/* Menu Items */}
                    <div className="px-4 pt-4 pb-20 space-y-1 max-h-[60vh] overflow-y-auto custom-scrollbar">
                        <p className="text-xs text-gray-500 dark:text-dark-muted font-semibold mb-2 px-2 uppercase tracking-widest">Menu</p>
                        {menuItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => {
                                    setMoreMenuOpen(false);
                                    navigate(item.path);
                                }}
                                className={`w-full flex items-center gap-3 py-2.5 px-2 hover:bg-gray-100/50 dark:hover:bg-dark-surface/50 rounded-xl transition-colors ${isPathActive(item.path) ? 'bg-green-50 dark:bg-green-900/10' : ''}`}
                            >
                                <div className={`w-10 h-10 ${isPathActive(item.path) ? 'bg-green-500' : 'bg-gray-400'} rounded-full flex items-center justify-center flex-shrink-0`}>
                                    <i className={`fas ${item.icon} text-white text-sm`}></i>
                                </div>
                                <div className="flex-1 text-left">
                                    <p className={`font-semibold text-sm ${isPathActive(item.path) ? 'text-green-700' : 'text-gray-800'}`}>{item.label}</p>
                                </div>
                                <i className="fas fa-chevron-right text-gray-400"></i>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Navigation - Mobile Only */}
            <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden">
                <div className="bg-white dark:bg-dark-surface shadow-[0_-2px_10px_rgba(0,0,0,0.1)] border-t border-gray-100 dark:border-dark-border transition-colors duration-300">
                    <div className="grid grid-cols-3 h-16">
                        {mobileNavItems.map((item, idx) => {
                            if (item.type === 'more') {
                                const isMenuItemActive = menuItems.some(mi => isPathActive(mi.path));
                                return (
                                    <div key="more" className="flex items-center justify-center">
                                        <button
                                            onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                                            className={`-mt-6 w-14 h-14 rounded-full flex flex-col items-center justify-center shadow-xl transition-all duration-300 cursor-pointer border-4 border-white ${moreMenuOpen ? 'bg-red-500' : isMenuItemActive ? 'bg-green-700' : 'bg-green-600'}`}
                                        >
                                            <i className={`${moreMenuOpen ? 'fas fa-times' : 'fas fa-th-large'} text-white text-lg`}></i>
                                        </button>
                                        <span className="absolute bottom-1 text-[9px] font-medium text-gray-500">Menu</span>
                                    </div>
                                );
                            }
                            const isActive = item.end
                                ? location.pathname === item.to
                                : location.pathname.startsWith(item.to);
                            return (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    onClick={() => setMoreMenuOpen(false)}
                                    className={`flex flex-col items-center justify-center py-2 transition-colors ${isActive ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500 hover:text-green-500'}`}
                                >
                                    <i className={`${item.icon} text-xl`}></i>
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

export default AdminLayout;
