import React, { useState, useMemo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useTahunAjaran } from '../../../contexts/TahunAjaranContext';
import { canAccessAdminPage, getRoleInfo } from '../../../config/roleConfig';
import RoleSwitcher from '../../../components/RoleSwitcher';
import Swal from 'sweetalert2';
import logoImage from '../../../../images/logo.png';

const menuItems = [
    {
        id: 'beranda',
        label: 'Beranda',
        icon: 'fa-home',
        path: '/guru',
        end: true,
    },
    {
        id: 'absensi',
        label: 'Absensi',
        icon: 'fa-clipboard-check',
        children: [
            { id: 'mengajar', label: 'Absensi Mengajar', path: '/guru/absensi/mengajar', icon: 'fa-chalkboard-teacher' },
            { id: 'kegiatan', label: 'Absensi Kegiatan', path: '/guru/absensi/kegiatan', icon: 'fa-calendar-check' },
            { id: 'rapat', label: 'Absensi Rapat', path: '/guru/absensi/rapat', icon: 'fa-users' },
        ],
    },
    {
        id: 'riwayat',
        label: 'Riwayat',
        icon: 'fa-history',
        path: '/guru/riwayat',
    },
    {
        id: 'pengaturan',
        label: 'Pengaturan',
        icon: 'fa-cog',
        path: '/guru/pengaturan',
    },
    {
        id: 'profil',
        label: 'Profil',
        icon: 'fa-user',
        path: '/guru/profil',
    },
];

function GuruSidebar({ isCollapsed, onToggleCollapse }) {
    const location = useLocation();
    const navigate = useNavigate();
    const { logout, tahunAjaran: authTahunAjaran, activeRole } = useAuth();
    const { activeTahunAjaran } = useTahunAjaran();
    const tahunAjaran = authTahunAjaran || activeTahunAjaran;
    const [expandedMenus, setExpandedMenus] = useState(['absensi']);
    const canSeeTransaksi = canAccessAdminPage(activeRole, '/transaksi');
    const currentRoleInfo = getRoleInfo(activeRole);

    // Build final menu with conditional items
    const finalMenuItems = useMemo(() => {
        const items = [...menuItems];
        if (canSeeTransaksi) {
            // Insert before pengaturan
            const pengaturanIdx = items.findIndex(i => i.id === 'pengaturan');
            items.splice(pengaturanIdx, 0,
                {
                    id: 'transaksi',
                    label: 'Transaksi',
                    icon: 'fa-money-bill-wave',
                    path: '/transaksi',
                },
                {
                    id: 'kegiatan-admin',
                    label: 'Kegiatan',
                    icon: 'fa-tasks',
                    path: '/data-induk/kegiatan',
                }
            );
        }
        return items;
    }, [canSeeTransaksi]);

    const toggleMenu = (menuId) => {
        setExpandedMenus(prev =>
            prev.includes(menuId)
                ? prev.filter(id => id !== menuId)
                : [...prev, menuId]
        );
    };

    const isChildActive = (children) => children?.some(child => location.pathname.startsWith(child.path));

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
            style={{ width: isCollapsed ? '70px' : '260px' }}
        >
            <div
                className="bg-white h-full flex flex-col p-5 text-[13px] text-gray-600 select-none transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] border-r border-gray-100"
                style={{ width: isCollapsed ? '70px' : '260px' }}
            >
                {/* Header */}
                <div className={`flex items-center mb-6 flex-shrink-0 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                    {isCollapsed ? (
                        <button
                            onClick={onToggleCollapse}
                            className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-green-50 transition-all duration-200 cursor-pointer text-gray-400 hover:text-green-600"
                            title="Expand Sidebar"
                        >
                            <i className="fas fa-bars text-lg"></i>
                        </button>
                    ) : (
                        <>
                            <div className="flex items-center gap-3">
                                <img src={logoImage} alt="Logo" className="w-10 h-10 object-contain" />
                                <div className="flex flex-col">
                                    <span className="font-bold text-green-800 text-sm tracking-tight whitespace-nowrap">MAHAKAM APP</span>
                                    <span className="text-[10px] text-green-600 font-medium whitespace-nowrap">Panel Guru</span>
                                </div>
                            </div>
                            <button
                                onClick={onToggleCollapse}
                                className="p-2 rounded-lg hover:bg-green-50 transition-all duration-200 cursor-pointer text-gray-400 hover:text-green-600"
                                title="Collapse Sidebar"
                            >
                                <i className="fas fa-chevron-left text-xs"></i>
                            </button>
                        </>
                    )}
                </div>

                {/* Role Badge */}
                {!isCollapsed && (
                    <div className="mb-4 flex-shrink-0">
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-50 border border-green-200">
                            <i className="fas fa-chalkboard-teacher text-green-500 text-sm"></i>
                            <span className="text-xs font-semibold text-green-700 flex-1">{currentRoleInfo.label}</span>
                        </div>
                    </div>
                )}
                {isCollapsed && (
                    <div className="mb-4 flex-shrink-0 flex justify-center">
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center bg-green-50 text-green-500"
                            title={currentRoleInfo.label}
                        >
                            <i className="fas fa-chalkboard-teacher text-sm"></i>
                        </div>
                    </div>
                )}

                {/* Tahun Ajaran Badge */}
                {!isCollapsed && (
                    <div className="mb-4 flex-shrink-0">
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50/80">
                            <i className="fas fa-calendar-alt text-emerald-500 text-xs"></i>
                            <div>
                                <span className="text-[10px] text-gray-400 block leading-tight">Tahun Ajaran</span>
                                <span className="text-xs font-bold text-emerald-700">{tahunAjaran?.nama || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Navigation */}
                <nav className="flex flex-col space-y-1 text-gray-500 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                    {finalMenuItems.map(item => (
                        <div key={item.id} className="relative">
                            {item.children ? (
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
                                            flex items-center px-3 py-2.5 rounded-xl w-full cursor-pointer
                                            focus:outline-none transition-all duration-200 ease-in-out group
                                            ${isChildActive(item.children) ? 'text-green-600 font-semibold' : 'hover:bg-green-50/50 hover:text-gray-900'}
                                            ${isCollapsed ? 'justify-center' : 'space-x-3'}
                                        `}
                                        title={isCollapsed ? item.label : ''}
                                    >
                                        <i className={`fas ${item.icon} text-[16px] ${isChildActive(item.children) ? 'text-green-600' : 'text-gray-400 group-hover:text-green-500'} flex-shrink-0`}></i>
                                        {!isCollapsed && (
                                            <>
                                                <span className="whitespace-nowrap flex-1 text-left">{item.label}</span>
                                                <i className={`fas fa-chevron-right text-[10px] transition-transform duration-300 ${expandedMenus.includes(item.id) ? 'rotate-90' : ''}`}></i>
                                            </>
                                        )}
                                    </button>

                                    {/* Submenu */}
                                    {!isCollapsed && (
                                        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${expandedMenus.includes(item.id) ? 'max-h-[400px] opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                                            <div className="ml-9 space-y-0.5 border-l-2 border-green-100 pl-3 py-1">
                                                {item.children.map(child => (
                                                    <NavLink
                                                        key={child.id}
                                                        to={child.path}
                                                        className={({ isActive }) => `
                                                            flex items-center gap-2 py-2 px-2 rounded-lg whitespace-nowrap cursor-pointer
                                                            focus:outline-none transition-all duration-200 ease-in-out text-[12px]
                                                            ${isActive
                                                                ? 'text-green-600 font-semibold bg-green-50'
                                                                : 'text-gray-400 hover:text-green-600 hover:bg-green-50/50'
                                                            }
                                                        `}
                                                    >
                                                        <i className={`fas ${child.icon} text-[12px]`}></i>
                                                        <span>{child.label}</span>
                                                    </NavLink>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <NavLink
                                    to={item.path}
                                    end={item.end}
                                    onClick={(e) => {
                                        if (isCollapsed) {
                                            e.preventDefault();
                                            onToggleCollapse();
                                        }
                                    }}
                                    className={({ isActive }) => `
                                        flex items-center px-3 py-2.5 rounded-xl cursor-pointer
                                        focus:outline-none transition-all duration-200 ease-in-out group relative
                                        ${isActive
                                            ? 'bg-green-50 text-green-600 font-semibold'
                                            : 'hover:bg-green-50/50 hover:text-gray-900'
                                        }
                                        ${isCollapsed ? 'justify-center' : 'space-x-3'}
                                    `}
                                    title={isCollapsed ? item.label : ''}
                                >
                                    {({ isActive }) => (
                                        <>
                                            {isActive && !isCollapsed && (
                                                <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-green-500 rounded-r-full"></div>
                                            )}
                                            <i className={`fas ${item.icon} text-[16px] ${isActive ? 'text-green-600' : 'text-gray-400 group-hover:text-green-500'} flex-shrink-0`}></i>
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
                <div className="flex-shrink-0 pt-4 border-t border-gray-100 space-y-2">
                    {/* Role Switcher */}
                    {!isCollapsed && (
                        <div className="mb-1">
                            <RoleSwitcher
                                compact={true}
                                onSwitch={() => window.location.reload()}
                            />
                        </div>
                    )}

                    {/* Logout */}
                    <button
                        onClick={handleLogout}
                        className={`
                            flex items-center px-3 py-2.5 rounded-xl w-full cursor-pointer
                            focus:outline-none transition-all duration-200 ease-in-out
                            hover:bg-red-50 text-gray-400 hover:text-red-500 group
                            ${isCollapsed ? 'justify-center' : 'space-x-3'}
                        `}
                        title={isCollapsed ? 'Keluar' : ''}
                    >
                        <i className="fas fa-sign-out-alt text-[16px] group-hover:text-red-500 flex-shrink-0"></i>
                        {!isCollapsed && (
                            <span className="whitespace-nowrap">Keluar</span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default GuruSidebar;
