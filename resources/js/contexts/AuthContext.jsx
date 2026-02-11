import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE } from '../config/api';
import { getDefaultRole, hasAdminAccess } from '../config/roleConfig';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('auth_token'));
    const [activeRole, setActiveRole] = useState(localStorage.getItem('active_role') || null);
    const [loading, setLoading] = useState(true);

    // Check auth on mount
    useEffect(() => {
        if (token) {
            fetchUser();
        } else {
            setLoading(false);
        }
    }, []);

    const fetchUser = async () => {
        try {
            const response = await fetch(`${API_BASE}/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                }
            });

            if (response.ok) {
                const data = await response.json();
                setUser(data.data);

                // Set default active role if not set
                const userRoles = data.data.roles || [];
                const savedRole = localStorage.getItem('active_role');

                // Verify saved role is still valid for this user
                const isValidRole = userRoles.some(r => r.name === savedRole);
                if (!savedRole || !isValidRole) {
                    const defaultRole = getDefaultRole(userRoles);
                    setActiveRole(defaultRole);
                    localStorage.setItem('active_role', defaultRole);
                }
            } else {
                // Token invalid, clear it
                logout();
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            logout();
        } finally {
            setLoading(false);
        }
    };

    const login = async (username, password, remember = false, tahunAjaranId = null) => {
        try {
            const response = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ username, password, remember, tahun_ajaran_id: tahunAjaranId })
            });

            const data = await response.json();

            if (data.success) {
                const authToken = data.data.token;
                const userData = data.data.user;
                const tahunAjaranData = data.data.tahun_ajaran;

                setToken(authToken);
                setUser(userData);
                localStorage.setItem('auth_token', authToken);

                // Store tahun ajaran info
                if (tahunAjaranData) {
                    localStorage.setItem('tahun_ajaran', JSON.stringify(tahunAjaranData));
                }

                // Set default active role based on user's roles
                const userRoles = userData.roles || [];
                const defaultRole = getDefaultRole(userRoles);
                setActiveRole(defaultRole);
                localStorage.setItem('active_role', defaultRole);

                return { success: true };
            } else {
                return { success: false, message: data.message };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: 'Gagal terhubung ke server' };
        }
    };

    const logout = async () => {
        try {
            if (token) {
                await fetch(`${API_BASE}/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json',
                    }
                });
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            setToken(null);
            setUser(null);
            setActiveRole(null);
            localStorage.removeItem('auth_token');
            localStorage.removeItem('active_role');
            localStorage.removeItem('tahun_ajaran');
        }
    };

    // Switch active role
    const switchRole = (roleName) => {
        // Verify user has this role
        const userRoles = user?.roles || [];
        const hasRole = userRoles.some(r => r.name === roleName);

        if (hasRole) {
            setActiveRole(roleName);
            localStorage.setItem('active_role', roleName);
            return true;
        }
        return false;
    };

    // Check if user has a specific role (legacy support)
    const hasRole = (...roles) => {
        return user && roles.includes(user.role);
    };

    // Check if user has any of the given roles (new multi-role)
    const hasAnyRole = (...roles) => {
        if (!user?.roles) return false;
        return user.roles.some(r => roles.includes(r.name));
    };

    // Get user's role names
    const getRoleNames = () => {
        if (!user?.roles) return [];
        return user.roles.map(r => r.name);
    };

    // Check if current active role has admin access
    const isAdminRole = () => {
        return hasAdminAccess(activeRole);
    };

    // Get current tahun ajaran from localStorage
    const getTahunAjaran = () => {
        try {
            const stored = localStorage.getItem('tahun_ajaran');
            return stored ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    };

    const value = {
        user,
        token,
        loading,
        isAuthenticated: !!user,
        activeRole,
        tahunAjaran: getTahunAjaran(),
        login,
        logout,
        switchRole,
        hasRole,
        hasAnyRole,
        getRoleNames,
        isAdminRole,
        getTahunAjaran,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthContext;

