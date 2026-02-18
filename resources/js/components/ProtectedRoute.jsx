import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { hasAdminAccess, canAccessAdminPage } from '../config/roleConfig';

function ProtectedRoute({ children, roles = [], requiredRoles = [] }) {
    const { isAuthenticated, loading, hasAnyRole, activeRole, user } = useAuth();
    const location = useLocation();

    // Show loading while checking auth
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <i className="fas fa-spinner fa-spin text-green-600 text-3xl mb-3"></i>
                    <p className="text-gray-500 text-sm">Memuat...</p>
                </div>
            </div>
        );
    }

    // Not authenticated, redirect to login
    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Combine roles and requiredRoles for backward compatibility
    const allRequiredRoles = [...roles, ...requiredRoles];

    // Check role if specified
    if (allRequiredRoles.length > 0) {
        // For admin routes: check if user's active role has admin access
        const isAdminRoute = !location.pathname.startsWith('/guru');
        const isGuruRoute = location.pathname.startsWith('/guru');

        if (isAdminRoute && allRequiredRoles.some(r => r !== 'guru')) {
            // Admin section: check if active role has admin access
            if (hasAdminAccess(activeRole)) {
                // Check page-level access (superadmin gets all, others get filtered)
                if (!canAccessAdminPage(activeRole, location.pathname)) {
                    return <Navigate to="/dashboard" replace />;
                }
                return children;
            }
            // Active role doesn't have admin access, redirect to guru
            return <Navigate to="/guru" replace />;
        }

        if (isGuruRoute) {
            // Guru section: any authenticated user with guru-level role can access
            if (hasAnyRole('guru', 'wali_kelas', 'waka_kurikulum', 'waka_kesiswaan', 'kepala_madrasah', 'tata_usaha')) {
                return children;
            }
            // Superadmin-only user trying to access guru → redirect to admin
            return <Navigate to="/dashboard" replace />;
        }

        // Fallback: check any role match
        if (!hasAnyRole(...allRequiredRoles)) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                    <div className="text-center">
                        <i className="fas fa-lock text-red-500 text-4xl mb-3"></i>
                        <h2 className="text-xl font-semibold text-gray-800 mb-2">Akses Ditolak</h2>
                        <p className="text-gray-500 text-sm">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
                    </div>
                </div>
            );
        }
    }

    return children;
}

export default ProtectedRoute;
