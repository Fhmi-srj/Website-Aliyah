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
    waka_kurikulum: 'emerald',
    waka_kesiswaan: 'teal',
    wali_kelas: 'lime',
    kepala_madrasah: 'green',
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
            { id: 'supervisi', path: '/guru/supervisi', label: 'Supervisi', icon: 'fa-clipboard-check' },
            { id: 'riwayat-aktivitas', path: '/guru/riwayat-aktivitas', label: 'Riwayat Aktivitas', icon: 'fa-stream' },
            { id: 'divider-0', type: 'divider' },
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
            { id: 'supervisi', path: '/guru/supervisi', label: 'Supervisi', icon: 'fa-clipboard-check' },
            { id: 'riwayat-aktivitas', path: '/guru/riwayat-aktivitas', label: 'Riwayat Aktivitas', icon: 'fa-stream' },
            { id: 'divider-2', type: 'divider' },
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
            { id: 'supervisi', path: '/guru/supervisi', label: 'Supervisi', icon: 'fa-clipboard-check' },
            { id: 'riwayat-aktivitas', path: '/guru/riwayat-aktivitas', label: 'Riwayat Aktivitas', icon: 'fa-stream' },
            { id: 'divider-2', type: 'divider' },
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
            { id: 'supervisi', path: '/guru/supervisi', label: 'Supervisi', icon: 'fa-clipboard-check' },
            { id: 'riwayat-aktivitas', path: '/guru/riwayat-aktivitas', label: 'Riwayat Aktivitas', icon: 'fa-stream' },
            { id: 'divider-2', type: 'divider' },
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
            { id: 'supervisi', path: '/guru/supervisi', label: 'Supervisi', icon: 'fa-clipboard-check' },
            { id: 'riwayat-aktivitas', path: '/guru/riwayat-aktivitas', label: 'Riwayat Aktivitas', icon: 'fa-stream' },
            { id: 'divider-2', type: 'divider' },
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

// Dynamic role page permissions (populated from API)
// Fallback defaults used before API data loads
let _dynamicRolePages = {
    superadmin: '*',
    kepala_madrasah: '*',
    waka_kurikulum: [
        '/dashboard',
        '/data-induk/jadwal',
        '/data-induk/jam-pelajaran',
        '/data-induk/mapel',
        '/data-induk/kelas',
        '/data-induk/kalender',
        '/data-induk/absensi-siswa',
        '/data-induk/ekskul',
        '/data-induk/rapat',
        '/data-induk/surat',
        '/profil',
    ],
    waka_kesiswaan: [
        '/dashboard',
        '/data-induk/siswa',
        '/data-induk/alumni',
        '/data-induk/ekskul',
        '/data-induk/kegiatan',
        '/data-induk/absensi-siswa',
        '/data-induk/kalender',
        '/profil',
    ],
    wali_kelas: [
        '/dashboard',
        '/data-induk/absensi-siswa',
        '/profil',
    ],
    tata_usaha: [
        '/dashboard',
        '/data-induk/siswa',
        '/data-induk/alumni',
        '/data-induk/ekskul',
        '/data-induk/kegiatan',
        '/data-induk/absensi-siswa',
        '/data-induk/kalender',
        '/data-induk/surat',
        '/transaksi',
        '/profil',
    ],
};

// Set dynamic role pages from API data (called after login/fetchUser)
export const setDynamicRolePages = (roles) => {
    if (!roles || !Array.isArray(roles)) return;

    roles.forEach(role => {
        if (role.allowed_pages !== null && role.allowed_pages !== undefined) {
            _dynamicRolePages[role.name] = role.allowed_pages;
        }
    });
};

// Get the current dynamic role pages (for ManajemenRole UI)
export const getDynamicRolePages = () => _dynamicRolePages;

// All available admin pages for the permission UI
export const allAdminPages = [
    { path: '/dashboard', label: 'Dashboard', icon: 'fa-home', group: 'Umum' },
    { path: '/data-induk/siswa', label: 'Manajemen Siswa', icon: 'fa-user-graduate', group: 'Data Induk' },
    { path: '/data-induk/absensi-siswa', label: 'Absen dan Jurnal', icon: 'fa-clipboard-list', group: 'Data Induk' },
    { path: '/data-induk/alumni', label: 'Data Alumni', icon: 'fa-graduation-cap', group: 'Data Induk' },
    { path: '/data-induk/guru', label: 'Manajemen Guru', icon: 'fa-chalkboard-teacher', group: 'Data Induk' },
    { path: '/data-induk/kelas', label: 'Manajemen Kelas', icon: 'fa-door-open', group: 'Data Induk' },
    { path: '/data-induk/mapel', label: 'Manajemen Mapel', icon: 'fa-book', group: 'Data Induk' },
    { path: '/data-induk/jadwal', label: 'Manajemen Jadwal', icon: 'fa-calendar-alt', group: 'Data Induk' },
    { path: '/data-induk/jam-pelajaran', label: 'Jam Pelajaran', icon: 'fa-clock', group: 'Data Induk' },
    { path: '/data-induk/kegiatan', label: 'Manajemen Kegiatan', icon: 'fa-tasks', group: 'Data Induk' },
    { path: '/data-induk/ekskul', label: 'Manajemen Ekstrakurikuler', icon: 'fa-futbol', group: 'Data Induk' },
    { path: '/data-induk/rapat', label: 'Manajemen Rapat', icon: 'fa-users', group: 'Data Induk' },
    { path: '/data-induk/kalender', label: 'Kalender Pendidikan', icon: 'fa-calendar-check', group: 'Data Induk' },
    { path: '/data-induk/surat', label: 'Surat Menyurat', icon: 'fa-envelope', group: 'Data Induk' },
    { path: '/data-induk/supervisi', label: 'Supervisi', icon: 'fa-clipboard-check', group: 'Data Induk' },
    { path: '/transaksi', label: 'Transaksi', icon: 'fa-money-bill-wave', group: 'Umum' },
    { path: '/bisyaroh', label: 'Bisyaroh', icon: 'fa-wallet', group: 'Umum' },
    { path: '/manajemen-role', label: 'Manajemen Role', icon: 'fa-user-shield', group: 'Sistem' },
    { path: '/log-aktivitas', label: 'Log Aktivitas', icon: 'fa-history', group: 'Sistem' },
    { path: '/profil', label: 'Profil', icon: 'fa-user', group: 'Umum' },
    { path: '/pengaturan', label: 'Pengaturan', icon: 'fa-cog', group: 'Sistem' },
];

// Check if role has admin panel access
export const hasAdminAccess = (roleName) => {
    return roleName in _dynamicRolePages;
};

// Check if a specific admin path is allowed for a role
export const canAccessAdminPage = (roleName, path) => {
    const pages = _dynamicRolePages[roleName];
    if (!pages) return false;
    if (pages === '*') return true;
    if (!Array.isArray(pages)) return false;
    return pages.some(p => path === p || path.startsWith(p + '/'));
};

// Get all admin-access role names
export const getAdminRoles = () => {
    return Object.keys(_dynamicRolePages);
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

