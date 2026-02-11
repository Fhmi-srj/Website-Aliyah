/**
 * Role Configuration
 * Defines menus, labels, and icons for each role
 */

// Role display labels
export const roleLabels = {
    guru: 'Guru',
    waka_kurikulum: 'Waka Kurikulum',
    waka_kesiswaan: 'Waka Kesiswaan',
    wali_kelas: 'Wali Kelas',
    kepala_madrasah: 'Kepala Madrasah',
    superadmin: 'Administrator',
};

// Role icons (FontAwesome)
export const roleIcons = {
    guru: 'fa-chalkboard-teacher',
    waka_kurikulum: 'fa-book',
    waka_kesiswaan: 'fa-users-cog',
    wali_kelas: 'fa-door-open',
    kepala_madrasah: 'fa-user-tie',
    superadmin: 'fa-shield-alt',
};

// Role colors for UI
export const roleColors = {
    guru: 'green',
    waka_kurikulum: 'blue',
    waka_kesiswaan: 'purple',
    wali_kelas: 'orange',
    kepala_madrasah: 'red',
    superadmin: 'gray',
};

// Role hierarchy levels (higher = more access)
export const roleLevels = {
    superadmin: 100,
    kepala_madrasah: 90,
    waka_kurikulum: 80,
    waka_kesiswaan: 80,
    wali_kelas: 50,
    guru: 10,
};

// Base menu items for Guru (all roles have these)
const baseGuruMenu = [
    { id: 'beranda', path: '/guru', label: 'Beranda', icon: 'fa-home', end: true },
    { id: 'pencarian', path: '/guru/pencarian', label: 'Pencarian', icon: 'fa-search' },
    { id: 'riwayat', path: '/guru/riwayat', label: 'Riwayat', icon: 'fa-history' },
];

// Role-specific additional menus
export const roleMenus = {
    guru: {
        bottomNav: [
            { to: '/guru', icon: 'fas fa-home', label: 'Beranda', end: true },
            { to: '/guru/pencarian', icon: 'fas fa-search', label: 'Cari' },
            { type: 'fab' },
            { to: '/guru/riwayat', icon: 'fas fa-history', label: 'Riwayat' },
            { to: '/guru/pengaturan', icon: 'fas fa-cog', label: 'Pengaturan' },
        ],
        fabOptions: [
            { type: 'mengajar', icon: 'fas fa-chalkboard-teacher', label: 'Mengajar', position: 'left' },
            { type: 'kegiatan', icon: 'fas fa-calendar-check', label: 'Kegiatan', position: 'top' },
            { type: 'rapat', icon: 'fas fa-users', label: 'Rapat', position: 'right' },
        ],
        dropupMenu: [
            { id: 'sertifikat', path: '/guru/sertifikat', label: 'Sertifikat', icon: 'fa-certificate' },
            { id: 'sppd', path: '/guru/sppd', label: 'SPPD', icon: 'fa-file-alt' },
            { id: 'modul', path: '/guru/modul', label: 'Modul', icon: 'fa-book' },
            { id: 'download', path: '/guru/download', label: 'Download', icon: 'fa-download' },
            { id: 'profil', path: '/guru/profil', label: 'Profil', icon: 'fa-user' },
        ],
    },
    waka_kurikulum: {
        bottomNav: [
            { to: '/guru', icon: 'fas fa-home', label: 'Beranda', end: true },
            { to: '/guru/pencarian', icon: 'fas fa-search', label: 'Cari' },
            { type: 'fab' },
            { to: '/guru/riwayat', icon: 'fas fa-history', label: 'Riwayat' },
            { to: '/guru/pengaturan', icon: 'fas fa-cog', label: 'Pengaturan' },
        ],
        fabOptions: [
            { type: 'mengajar', icon: 'fas fa-chalkboard-teacher', label: 'Mengajar', position: 'left' },
            { type: 'kegiatan', icon: 'fas fa-calendar-check', label: 'Kegiatan', position: 'top' },
            { type: 'rapat', icon: 'fas fa-users', label: 'Rapat', position: 'right' },
        ],
        dropupMenu: [
            // Waka Kurikulum specific menus
            { id: 'rekap-absensi', path: '/waka/rekap-absensi', label: 'Rekap Absensi', icon: 'fa-chart-bar', isRoleSpecific: true },
            { id: 'kelola-jadwal', path: '/waka/kelola-jadwal', label: 'Kelola Jadwal', icon: 'fa-calendar-alt', isRoleSpecific: true },
            { id: 'divider-1', type: 'divider' },
            // Standard menus
            { id: 'sertifikat', path: '/guru/sertifikat', label: 'Sertifikat', icon: 'fa-certificate' },
            { id: 'sppd', path: '/guru/sppd', label: 'SPPD', icon: 'fa-file-alt' },
            { id: 'modul', path: '/guru/modul', label: 'Modul', icon: 'fa-book' },
            { id: 'download', path: '/guru/download', label: 'Download', icon: 'fa-download' },
            { id: 'profil', path: '/guru/profil', label: 'Profil', icon: 'fa-user' },
        ],
    },
    waka_kesiswaan: {
        bottomNav: [
            { to: '/guru', icon: 'fas fa-home', label: 'Beranda', end: true },
            { to: '/guru/pencarian', icon: 'fas fa-search', label: 'Cari' },
            { type: 'fab' },
            { to: '/guru/riwayat', icon: 'fas fa-history', label: 'Riwayat' },
            { to: '/guru/pengaturan', icon: 'fas fa-cog', label: 'Pengaturan' },
        ],
        fabOptions: [
            { type: 'mengajar', icon: 'fas fa-chalkboard-teacher', label: 'Mengajar', position: 'left' },
            { type: 'kegiatan', icon: 'fas fa-calendar-check', label: 'Kegiatan', position: 'top' },
            { type: 'rapat', icon: 'fas fa-users', label: 'Rapat', position: 'right' },
        ],
        dropupMenu: [
            // Waka Kesiswaan specific menus
            { id: 'data-siswa', path: '/waka/data-siswa', label: 'Data Siswa', icon: 'fa-user-graduate', isRoleSpecific: true },
            { id: 'kelola-ekskul', path: '/waka/kelola-ekskul', label: 'Kelola Ekskul', icon: 'fa-futbol', isRoleSpecific: true },
            { id: 'divider-1', type: 'divider' },
            // Standard menus
            { id: 'sertifikat', path: '/guru/sertifikat', label: 'Sertifikat', icon: 'fa-certificate' },
            { id: 'sppd', path: '/guru/sppd', label: 'SPPD', icon: 'fa-file-alt' },
            { id: 'modul', path: '/guru/modul', label: 'Modul', icon: 'fa-book' },
            { id: 'download', path: '/guru/download', label: 'Download', icon: 'fa-download' },
            { id: 'profil', path: '/guru/profil', label: 'Profil', icon: 'fa-user' },
        ],
    },
    wali_kelas: {
        bottomNav: [
            { to: '/guru', icon: 'fas fa-home', label: 'Beranda', end: true },
            { to: '/guru/pencarian', icon: 'fas fa-search', label: 'Cari' },
            { type: 'fab' },
            { to: '/guru/riwayat', icon: 'fas fa-history', label: 'Riwayat' },
            { to: '/guru/pengaturan', icon: 'fas fa-cog', label: 'Pengaturan' },
        ],
        fabOptions: [
            { type: 'mengajar', icon: 'fas fa-chalkboard-teacher', label: 'Mengajar', position: 'left' },
            { type: 'kegiatan', icon: 'fas fa-calendar-check', label: 'Kegiatan', position: 'top' },
            { type: 'rapat', icon: 'fas fa-users', label: 'Rapat', position: 'right' },
        ],
        dropupMenu: [
            // Wali Kelas specific menus
            { id: 'siswa-kelas', path: '/wali/siswa-kelas', label: 'Siswa Kelas Saya', icon: 'fa-users', isRoleSpecific: true },
            { id: 'rekap-kelas', path: '/wali/rekap-kelas', label: 'Rekap Kelas', icon: 'fa-file-alt', isRoleSpecific: true },
            { id: 'divider-1', type: 'divider' },
            // Standard menus
            { id: 'sertifikat', path: '/guru/sertifikat', label: 'Sertifikat', icon: 'fa-certificate' },
            { id: 'sppd', path: '/guru/sppd', label: 'SPPD', icon: 'fa-file-alt' },
            { id: 'modul', path: '/guru/modul', label: 'Modul', icon: 'fa-book' },
            { id: 'download', path: '/guru/download', label: 'Download', icon: 'fa-download' },
            { id: 'profil', path: '/guru/profil', label: 'Profil', icon: 'fa-user' },
        ],
    },
    kepala_madrasah: {
        bottomNav: [
            { to: '/guru', icon: 'fas fa-home', label: 'Beranda', end: true },
            { to: '/guru/pencarian', icon: 'fas fa-search', label: 'Cari' },
            { type: 'fab' },
            { to: '/guru/riwayat', icon: 'fas fa-history', label: 'Riwayat' },
            { to: '/guru/pengaturan', icon: 'fas fa-cog', label: 'Pengaturan' },
        ],
        fabOptions: [
            { type: 'mengajar', icon: 'fas fa-chalkboard-teacher', label: 'Mengajar', position: 'left' },
            { type: 'kegiatan', icon: 'fas fa-calendar-check', label: 'Kegiatan', position: 'top' },
            { type: 'rapat', icon: 'fas fa-users', label: 'Rapat', position: 'right' },
        ],
        dropupMenu: [
            // Kepala Madrasah specific menus
            { id: 'dashboard-kepala', path: '/kepala/dashboard', label: 'Dashboard Kepala', icon: 'fa-chart-line', isRoleSpecific: true },
            { id: 'approval', path: '/kepala/approval', label: 'Approval', icon: 'fa-check-circle', isRoleSpecific: true },
            { id: 'rekap-guru', path: '/kepala/rekap-guru', label: 'Rekap Semua Guru', icon: 'fa-users', isRoleSpecific: true },
            { id: 'divider-1', type: 'divider' },
            // Standard menus
            { id: 'sertifikat', path: '/guru/sertifikat', label: 'Sertifikat', icon: 'fa-certificate' },
            { id: 'sppd', path: '/guru/sppd', label: 'SPPD', icon: 'fa-file-alt' },
            { id: 'modul', path: '/guru/modul', label: 'Modul', icon: 'fa-book' },
            { id: 'download', path: '/guru/download', label: 'Download', icon: 'fa-download' },
            { id: 'profil', path: '/guru/profil', label: 'Profil', icon: 'fa-user' },
        ],
    },
};

// Get menu config for a role (fallback to guru if not found)
export const getMenuConfig = (roleName) => {
    return roleMenus[roleName] || roleMenus.guru;
};

// Get role display info
export const getRoleInfo = (roleName) => {
    return {
        name: roleName,
        label: roleLabels[roleName] || roleName,
        icon: roleIcons[roleName] || 'fa-user',
        color: roleColors[roleName] || 'gray',
        level: roleLevels[roleName] || 0,
    };
};

// Check if role has admin panel access
export const hasAdminAccess = (roleName) => {
    return roleName === 'superadmin';
};

// Get default role from user's roles array
export const getDefaultRole = (roles) => {
    if (!roles || roles.length === 0) return 'guru';

    // Prefer superadmin if exists
    if (roles.some(r => r.name === 'superadmin')) return 'superadmin';

    // Otherwise, find highest level role
    const sortedRoles = [...roles].sort((a, b) => {
        const levelA = roleLevels[a.name] || 0;
        const levelB = roleLevels[b.name] || 0;
        return levelB - levelA;
    });

    return sortedRoles[0]?.name || 'guru';
};
