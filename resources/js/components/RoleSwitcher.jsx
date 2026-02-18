import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { roleLabels, roleIcons, roleColors, getRoleInfo, hasAdminAccess } from '../config/roleConfig';

/**
 * RoleSwitcher Component
 * Dropdown to switch between user's available roles
 */
function RoleSwitcher({ onSwitch, compact = false }) {
    const { user, activeRole, switchRole } = useAuth();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const userRoles = user?.roles || [];
    const currentRoleInfo = getRoleInfo(activeRole);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleRoleSwitch = (roleName) => {
        if (roleName !== activeRole) {
            const success = switchRole(roleName);
            if (success) {
                setIsOpen(false);
                // Navigate based on role type
                if (hasAdminAccess(roleName)) {
                    navigate('/dashboard');
                } else {
                    navigate('/guru');
                }
                if (onSwitch) {
                    onSwitch(roleName);
                }
            }
        } else {
            setIsOpen(false);
        }
    };

    // Don't show if user has only one role
    if (userRoles.length <= 1) {
        return null;
    }

    const getColorClasses = (color, isActive = false) => {
        const colors = {
            green: isActive ? 'bg-green-100 text-green-700 border-green-300' : 'hover:bg-green-50',
            emerald: isActive ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'hover:bg-emerald-50',
            teal: isActive ? 'bg-teal-100 text-teal-700 border-teal-300' : 'hover:bg-teal-50',
            lime: isActive ? 'bg-lime-100 text-lime-700 border-lime-300' : 'hover:bg-lime-50',
            gray: isActive ? 'bg-gray-100 text-gray-700 border-gray-300' : 'hover:bg-gray-50',
        };
        return colors[color] || colors.green;
    };

    if (compact) {
        // Compact version for mobile dropdown menus
        return (
            <div className="w-full" ref={dropdownRef}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                >
                    <div className="flex items-center gap-3">
                        <i className={`fas ${currentRoleInfo.icon} text-${currentRoleInfo.color}-500`}></i>
                        <div>
                            <span className="text-sm text-gray-700">Peran Aktif</span>
                            <p className="text-xs text-gray-400">{currentRoleInfo.label}</p>
                        </div>
                    </div>
                    <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'} text-xs text-gray-400`}></i>
                </button>

                {isOpen && (
                    <div className="bg-gray-50 py-1">
                        {userRoles.map((role) => {
                            const roleInfo = getRoleInfo(role.name);
                            const isActive = role.name === activeRole;
                            return (
                                <button
                                    key={role.id}
                                    onClick={() => handleRoleSwitch(role.name)}
                                    className={`w-full flex items-center gap-3 px-6 py-2 transition-colors text-left ${isActive ? 'bg-green-50' : 'hover:bg-gray-100'
                                        }`}
                                >
                                    <i className={`fas ${isActive ? 'fa-check-circle text-green-500' : 'fa-circle text-gray-300'} text-xs`}></i>
                                    <i className={`fas ${roleInfo.icon} text-${roleInfo.color}-500 text-sm`}></i>
                                    <span className={`text-sm ${isActive ? 'text-green-700 font-medium' : 'text-gray-600'}`}>
                                        {roleInfo.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    // Full version for standalone use
    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${getColorClasses(currentRoleInfo.color, true)
                    }`}
            >
                <i className={`fas ${currentRoleInfo.icon}`}></i>
                <span className="text-sm font-medium">{currentRoleInfo.label}</span>
                <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'} text-xs ml-1`}></i>
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50">
                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                        <p className="text-xs text-gray-500 font-medium">Ganti Peran</p>
                    </div>
                    <div className="py-1">
                        {userRoles.map((role) => {
                            const roleInfo = getRoleInfo(role.name);
                            const isActive = role.name === activeRole;
                            return (
                                <button
                                    key={role.id}
                                    onClick={() => handleRoleSwitch(role.name)}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left ${isActive
                                        ? `bg-${roleInfo.color}-50 border-l-2 border-${roleInfo.color}-500`
                                        : 'hover:bg-gray-50'
                                        }`}
                                >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isActive ? `bg-${roleInfo.color}-500` : 'bg-gray-200'
                                        }`}>
                                        <i className={`fas ${roleInfo.icon} ${isActive ? 'text-white' : 'text-gray-500'} text-sm`}></i>
                                    </div>
                                    <div className="flex-1">
                                        <p className={`text-sm ${isActive ? 'font-semibold text-gray-800' : 'text-gray-700'}`}>
                                            {roleInfo.label}
                                        </p>
                                    </div>
                                    {isActive && (
                                        <i className="fas fa-check text-green-500 text-sm"></i>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

export default RoleSwitcher;
