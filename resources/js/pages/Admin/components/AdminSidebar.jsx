import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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
            { id: 'guru', label: 'Manajemen Guru', path: '/data-induk/guru', icon: 'fa-chalkboard-teacher' },
            { id: 'kelas', label: 'Manajemen Kelas', path: '/data-induk/kelas', icon: 'fa-door-open' },
            { id: 'mapel', label: 'Manajemen Mapel', path: '/data-induk/mapel', icon: 'fa-book' },
            { id: 'jadwal', label: 'Manajemen Jadwal', path: '/data-induk/jadwal', icon: 'fa-calendar-alt' },
            { id: 'kegiatan', label: 'Manajemen Kegiatan', path: '/data-induk/kegiatan', icon: 'fa-tasks' },
            { id: 'ekskul', label: 'Manajemen Ekstrakurikuler', path: '/data-induk/ekskul', icon: 'fa-futbol' },
            { id: 'rapat', label: 'Manajemen Rapat', path: '/data-induk/rapat', icon: 'fa-users' },
        ],
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

function AdminSidebar({ onClose, isCollapsed, onToggleCollapse }) {
    const location = useLocation();
    const [expandedMenus, setExpandedMenus] = useState(['data-induk']);

    const toggleMenu = (menuId) => {
        setExpandedMenus(prev =>
            prev.includes(menuId)
                ? prev.filter(id => id !== menuId)
                : [...prev, menuId]
        );
    };

    const isChildActive = (children) => children?.some(child => location.pathname === child.path);

    return (
        <div
            className="h-full overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
            style={{
                width: isCollapsed ? '70px' : '280px'
            }}
        >
            <div
                className="bg-[rgb(243,250,240)] h-full flex flex-col p-6 text-[12px] text-green-800 select-none transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-y-auto"
                style={{
                    width: isCollapsed ? '70px' : '280px',
                    transform: isCollapsed ? 'translateX(0)' : 'translateX(0)'
                }}
            >
                {/* Header - different layout based on collapsed state */}
                <div className={`flex items-center mb-6 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                    {isCollapsed ? (
                        /* Collapsed mode: Toggle button replaces logo - same styling as menu items */
                        <button
                            onClick={onToggleCollapse}
                            className="flex items-center justify-center px-3 py-2 rounded-lg hover:bg-white/50 transition-all duration-200 ease-in-out cursor-pointer"
                            title="Expand Sidebar"
                        >
                            <svg
                                width="16"
                                height="16"
                                viewBox="-1 -1 26 26"
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
                        </button>
                    ) : (
                        /* Expanded mode: Logo + Text + Toggle button */
                        <>
                            <div className="flex items-center">
                                <img
                                    alt="Logo utama MA ALHIKAM"
                                    className="w-6 h-6 flex-shrink-0"
                                    height="24"
                                    width="24"
                                    src={logoImage}
                                />
                                <span className="font-semibold text-green-800 text-lg ml-2 whitespace-nowrap">
                                    MA ALHIKAM
                                </span>
                            </div>

                            <button
                                onClick={onToggleCollapse}
                                className="p-1.5 rounded-lg hover:bg-white/70 transition-all duration-200 ease-in-out cursor-pointer"
                                title="Collapse Sidebar"
                            >
                                <SidebarToggleIcon size={18} />
                            </button>
                        </>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex flex-col space-y-2 text-green-800 flex-1">
                    {!isCollapsed && (
                        <h6 className="text-[11px] font-semibold mb-2 select-none whitespace-nowrap">
                            Main Menu
                        </h6>
                    )}

                    {menuItems.map(item => (
                        <div key={item.id}>
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
                                        flex items-center px-3 pr-4 py-2 rounded-lg w-full cursor-pointer
                                        focus:outline-none focus:ring-2 focus:ring-inset focus:ring-green-400
                                        transition-all duration-200 ease-in-out
                                        ${isChildActive(item.children) ? 'bg-white text-green-800 font-semibold' : 'hover:bg-white/50'}
                                        ${isCollapsed ? 'justify-center' : 'space-x-2'}
                                    `}
                                        title={isCollapsed ? item.label : ''}
                                    >
                                        <i className={`fas ${item.icon} text-[14px] text-green-700 flex-shrink-0`}></i>
                                        {!isCollapsed && (
                                            <>
                                                <span className="whitespace-nowrap flex-1 text-left">
                                                    {item.label}
                                                </span>
                                                <i className={`fas fa-chevron-down text-[10px] text-green-600 transition-transform duration-300 ${expandedMenus.includes(item.id) ? 'rotate-180' : ''
                                                    }`}></i>
                                            </>
                                        )}
                                    </button>

                                    {/* Submenu with smooth animation */}
                                    {!isCollapsed && (
                                        <div
                                            className={`
                                            overflow-hidden transition-all duration-300 ease-in-out
                                            ${expandedMenus.includes(item.id) ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}
                                        `}
                                        >
                                            <div className="ml-6 mt-1 space-y-1">
                                                {item.children.map(child => (
                                                    <NavLink
                                                        key={child.id}
                                                        to={child.path}
                                                        onClick={onClose}
                                                        className={({ isActive }) => `
                                                        flex items-center space-x-2 px-3 pr-4 py-2 rounded-lg whitespace-nowrap cursor-pointer
                                                        focus:outline-none focus:ring-2 focus:ring-inset focus:ring-green-400
                                                        transition-all duration-200 ease-in-out
                                                        ${isActive
                                                                ? 'bg-white text-green-800 font-semibold'
                                                                : 'hover:bg-white/50'
                                                            }
                                                    `}
                                                    >
                                                        <i className={`fas ${child.icon} text-[14px] text-green-700 flex-shrink-0`}></i>
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
                                    flex items-center px-3 pr-4 py-2 rounded-lg cursor-pointer
                                    focus:outline-none focus:ring-2 focus:ring-inset focus:ring-green-400
                                    transition-all duration-200 ease-in-out
                                    ${isActive
                                            ? 'bg-white text-green-800 font-semibold'
                                            : 'hover:bg-white/50'
                                        }
                                    ${isCollapsed ? 'justify-center' : 'space-x-2'}
                                `}
                                    title={isCollapsed ? item.label : ''}
                                >
                                    <i className={`fas ${item.icon} text-[14px] text-green-700 flex-shrink-0`}></i>
                                    {!isCollapsed && (
                                        <span className="whitespace-nowrap">{item.label}</span>
                                    )}
                                </NavLink>
                            )}
                        </div>
                    ))}
                </nav>
            </div>
        </div>
    );
}

export default AdminSidebar;
