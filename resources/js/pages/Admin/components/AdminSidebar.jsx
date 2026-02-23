import React, { useState, useMemo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useTahunAjaran } from '../../../contexts/TahunAjaranContext';
import { canAccessAdminPage, getRoleInfo } from '../../../config/roleConfig';
import Swal from 'sweetalert2';
import logoImage from '../../../../images/logo.png';

const menuItems = [
    {
        id: 'dashboard',
        label: 'Dashboard',
        icon: 'fa-home',
        path: '/dashboard',
    },
    {
        id: 'data-induk',
        label: 'Data Induk',
        icon: 'fa-database',
        children: [
            { id: 'siswa', label: 'Manajemen Siswa', path: '/data-induk/siswa', icon: 'fa-user-graduate' },
            { id: 'absensi-siswa', label: 'Absen dan Jurnal', path: '/data-induk/absensi-siswa', icon: 'fa-clipboard-list' },
            { id: 'alumni', label: 'Data Alumni', path: '/data-induk/alumni', icon: 'fa-graduation-cap' },
            { id: 'guru', label: 'Manajemen Guru', path: '/data-induk/guru', icon: 'fa-chalkboard-teacher' },
            { id: 'kelas', label: 'Manajemen Kelas', path: '/data-induk/kelas', icon: 'fa-door-open' },
            { id: 'mapel', label: 'Manajemen Mapel', path: '/data-induk/mapel', icon: 'fa-book' },
            { id: 'jadwal', label: 'Manajemen Jadwal', path: '/data-induk/jadwal', icon: 'fa-calendar-alt' },
            { id: 'jam-pelajaran', label: 'Jam Pelajaran', path: '/data-induk/jam-pelajaran', icon: 'fa-clock' },
            { id: 'kegiatan', label: 'Manajemen Kegiatan', path: '/data-induk/kegiatan', icon: 'fa-tasks' },
            { id: 'ekskul', label: 'Manajemen Ekstrakurikuler', path: '/data-induk/ekskul', icon: 'fa-futbol' },
            { id: 'rapat', label: 'Manajemen Rapat', path: '/data-induk/rapat', icon: 'fa-users' },
            { id: 'kalender', label: 'Kalender Pendidikan', path: '/data-induk/kalender', icon: 'fa-calendar-check' },
            { id: 'surat', label: 'Surat Menyurat', path: '/data-induk/surat', icon: 'fa-envelope' },
            { id: 'supervisi', label: 'Supervisi', path: '/data-induk/supervisi', icon: 'fa-clipboard-check' },
        ],
    },
    {
        id: 'transaksi',
        label: 'Transaksi',
        icon: 'fa-money-bill-wave',
        path: '/transaksi',
    },
    {
        id: 'bisyaroh',
        label: 'Bisyaroh',
        icon: 'fa-wallet',
        path: '/bisyaroh',
    },
    {
        id: 'manajemen-role',
        label: 'Manajemen Role',
        icon: 'fa-user-shield',
        path: '/manajemen-role',
    },
    {
        id: 'log-aktivitas',
        label: 'Log Aktivitas',
        icon: 'fa-history',
        path: '/log-aktivitas',
    },
    {
        id: 'profil',
        label: 'Profil',
        icon: 'fa-user',
        path: '/profil',
    },
    {
        id: 'pengaturan',
        label: 'Pengaturan',
        icon: 'fa-cog',
        path: '/pengaturan',
    },
];

// Custom sidebar toggle icon component
function SidebarToggleIcon({ size = 14 }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-green-700"
        >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="9" y1="3" x2="9" y2="21" />
        </svg>
    );
}

function AdminSidebar({ onClose, isCollapsed, onToggleCollapse, institutionName, institutionLogo }) {
    const location = useLocation();
    const navigate = useNavigate();
    // Use AuthContext tahunAjaran with fallback to TahunAjaranContext
    const { logout, tahunAjaran: authTahunAjaran, activeRole, switchRole } = useAuth();
    const { activeTahunAjaran } = useTahunAjaran();
    const tahunAjaran = authTahunAjaran || activeTahunAjaran;
    const [expandedMenus, setExpandedMenus] = useState(['data-induk']);

    const currentRoleInfo = getRoleInfo(activeRole);
    const isSuperadmin = activeRole === 'superadmin';

    // Filter menu items based on active role
    const filteredMenuItems = useMemo(() => {
        if (isSuperadmin) return menuItems;

        return menuItems.reduce((acc, item) => {
            if (item.children) {
                // Filter children based on role access
                const allowedChildren = item.children.filter(child =>
                    canAccessAdminPage(activeRole, child.path)
                );
                if (allowedChildren.length > 0) {
                    acc.push({ ...item, children: allowedChildren });
                }
            } else {
                // Check if top-level item is accessible
                if (canAccessAdminPage(activeRole, item.path)) {
                    acc.push(item);
                }
            }
            return acc;
        }, []);
    }, [activeRole, isSuperadmin]);

    const toggleMenu = (menuId) => {
        setExpandedMenus(prev =>
            prev.includes(menuId)
                ? prev.filter(id => id !== menuId)
                : [...prev, menuId]
        );
    };

    const isChildActive = (children) => children?.some(child => location.pathname === child.path);

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

        if (result.isConfirmed) {
            await logout();
            navigate('/login');
        }
    };

    return (
        <div
            className="h-full overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
            style={{
                width: isCollapsed ? '70px' : '280px'
            }}
        >
            <div
                className="bg-white dark:bg-dark-surface h-full flex flex-col p-6 text-[13px] text-gray-600 dark:text-dark-text select-none transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] border-r border-gray-100 dark:border-dark-border"
                style={{
                    width: isCollapsed ? '70px' : '280px',
                    transform: isCollapsed ? 'translateX(0)' : 'translateX(0)'
                }}
            >
                {/* Header - different layout based on collapsed state */}
                <div className={`flex items-center mb-8 flex-shrink-0 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                    {isCollapsed ? (
                        /* Collapsed mode: Toggle button replaces logo */
                        <button
                            onClick={onToggleCollapse}
                            className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-gray-50 dark:hover:bg-dark-bg transition-all duration-200 ease-in-out cursor-pointer text-gray-400 dark:text-dark-muted hover:text-primary"
                            title="Expand Sidebar"
                        >
                            <i className="fas fa-bars text-lg"></i>
                        </button>
                    ) : (
                        /* Expanded mode: Logo + Text + Toggle button */
                        <>
                            <div className="flex items-center gap-3">
                                <img src={institutionLogo || logoImage} alt="Logo" className="w-10 h-10 object-contain" />
                                <div className="flex flex-col">
                                    <span className="font-bold text-gray-800 dark:text-dark-text text-sm tracking-tight whitespace-nowrap">
                                        {institutionName || 'MAHAKAM APP'}
                                    </span>
                                    <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">Sistem Informasi Terpadu</span>
                                </div>
                            </div>

                            <button
                                onClick={onToggleCollapse}
                                className="p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-bg transition-all duration-200 ease-in-out cursor-pointer text-gray-400 dark:text-dark-muted hover:text-primary"
                                title="Collapse Sidebar"
                            >
                                <i className="fas fa-chevron-left text-xs"></i>
                            </button>
                        </>
                    )}
                </div>

                {/* Role Badge - show which role is active */}
                {!isSuperadmin && !isCollapsed && (
                    <div className="mb-4 flex-shrink-0">
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-${currentRoleInfo.color}-50 border border-${currentRoleInfo.color}-200`}>
                            <i className={`fas ${currentRoleInfo.icon} text-${currentRoleInfo.color}-500 text-sm`}></i>
                            <span className={`text-xs font-semibold text-${currentRoleInfo.color}-700 flex-1`}>{currentRoleInfo.label}</span>
                        </div>
                    </div>
                )}
                {!isSuperadmin && isCollapsed && (
                    <div className="mb-4 flex-shrink-0 flex justify-center">
                        <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${currentRoleInfo.color}-50 text-${currentRoleInfo.color}-500`}
                            title={currentRoleInfo.label}
                        >
                            <i className={`fas ${currentRoleInfo.icon} text-sm`}></i>
                        </div>
                    </div>
                )}


                <nav className="flex flex-col space-y-1 text-gray-500 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                    {filteredMenuItems.map(item => (
                        <div key={item.id} className="relative">
                            {item.children ? (
                                // Parent menu with children
                                <>
                                    <button
                                        onClick={() => {
                                            if (isCollapsed) {
                                                onToggleCollapse();
                                            } else {
                                                toggleMenu(item.id);
                                            }
                                        }}
                                        className={`
                                        flex items-center px-4 py-3 rounded-xl w-full cursor-pointer
                                        focus:outline-none transition-all duration-200 ease-in-out group
                                        ${isChildActive(item.children) ? 'text-primary font-semibold' : 'hover:bg-gray-50 dark:hover:bg-dark-bg hover:text-gray-900 dark:hover:text-dark-text'}
                                        ${isCollapsed ? 'justify-center' : 'space-x-3'}
                                    `}
                                        title={isCollapsed ? item.label : ''}
                                    >
                                        <i className={`fas ${item.icon} text-[18px] ${isChildActive(item.children) ? 'text-primary' : 'text-gray-400 group-hover:text-primary'} flex-shrink-0`}></i>
                                        {!isCollapsed && (
                                            <>
                                                <span className="whitespace-nowrap flex-1 text-left">
                                                    {item.label}
                                                </span>
                                                <i className={`fas fa-chevron-right text-[10px] transition-transform duration-300 ${expandedMenus.includes(item.id) ? 'rotate-90' : ''
                                                    }`}></i>
                                            </>
                                        )}
                                    </button>

                                    {/* Submenu with smooth animation */}
                                    {!isCollapsed && (
                                        <div
                                            className={`
                                            overflow-hidden transition-all duration-300 ease-in-out
                                            ${expandedMenus.includes(item.id) ? 'max-h-[800px] opacity-100 mt-1' : 'max-h-0 opacity-0'}
                                        `}
                                        >
                                            <div className="ml-10 space-y-1 border-l-2 border-gray-100 dark:border-dark-border pl-4 py-1">
                                                {item.children.map(child => (
                                                    <NavLink
                                                        key={child.id}
                                                        to={child.path}
                                                        onClick={onClose}
                                                        className={({ isActive }) => `
                                                        flex items-center space-x-2 py-2 rounded-lg whitespace-nowrap cursor-pointer
                                                        focus:outline-none transition-all duration-200 ease-in-out
                                                        ${isActive
                                                                ? 'text-primary font-semibold'
                                                                : 'text-gray-400 dark:text-dark-muted hover:text-gray-900 dark:hover:text-dark-text'
                                                            }
                                                    `}
                                                    >
                                                        <span className="whitespace-nowrap">{child.label}</span>
                                                    </NavLink>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                // Regular menu item
                                <NavLink
                                    to={item.path}
                                    onClick={(e) => {
                                        if (isCollapsed) {
                                            e.preventDefault();
                                            onToggleCollapse();
                                        } else {
                                            onClose();
                                        }
                                    }}
                                    className={({ isActive }) => `
                                    flex items-center px-4 py-3 rounded-xl cursor-pointer
                                    focus:outline-none transition-all duration-200 ease-in-out group relative
                                    ${isActive
                                            ? 'bg-primary/5 text-primary font-semibold'
                                            : 'hover:bg-gray-50 dark:hover:bg-dark-bg hover:text-gray-900 dark:hover:text-dark-text'
                                        }
                                    ${isCollapsed ? 'justify-center' : 'space-x-3'}
                                `}
                                    title={isCollapsed ? item.label : ''}
                                >
                                    {({ isActive }) => (
                                        <>
                                            {isActive && !isCollapsed && (
                                                <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-primary rounded-r-full"></div>
                                            )}
                                            <i className={`fas ${item.icon} text-[18px] ${isActive ? 'text-primary' : 'text-gray-400 group-hover:text-primary'} flex-shrink-0`}></i>
                                            {!isCollapsed && (
                                                <span className="whitespace-nowrap">{item.label}</span>
                                            )}
                                        </>
                                    )}
                                </NavLink>
                            )}
                        </div>
                    ))}
                </nav>

                {/* Bottom Section */}
                <div className="flex-shrink-0 pt-6 border-t border-gray-100 dark:border-dark-border">
                    {/* User Profile Info - Expanded version */}
                    {!isCollapsed && (
                        <div className="mb-6 p-4 bg-primary/5 dark:bg-primary/10 rounded-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                                <i className="fas fa-university text-4xl text-primary"></i>
                            </div>
                            <p className="text-[11px] font-bold text-primary uppercase tracking-wider mb-1 truncate">{institutionName || 'MAHAKAM APP'}</p>
                            <p className="text-[10px] text-primary/60 dark:text-primary/70 leading-tight">Sistem Informasi Terpadu</p>
                        </div>
                    )}

                    <button
                        onClick={handleLogout}
                        className={`
                            flex items-center px-4 py-3 rounded-xl w-full cursor-pointer
                            focus:outline-none transition-all duration-200 ease-in-out
                            hover:bg-red-50 text-gray-400 hover:text-red-500 group
                            ${isCollapsed ? 'justify-center' : 'space-x-3'}
                        `}
                        title={isCollapsed ? 'Keluar' : ''}
                    >
                        <i className="fas fa-sign-out-alt text-[18px] group-hover:text-red-500 flex-shrink-0"></i>
                        {!isCollapsed && (
                            <span className="whitespace-nowrap">Keluar</span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default AdminSidebar;
