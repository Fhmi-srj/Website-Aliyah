import React, { useState, useEffect, useCallback } from 'react';
import { authFetch } from '../../config/api';
import Swal from 'sweetalert2';

const API_BASE = '/api';

function ManajemenRole() {
    const [roles, setRoles] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showUserModal, setShowUserModal] = useState(false);
    const [selectedRole, setSelectedRole] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        display_name: '',
        description: '',
        level: 0,
    });
    const [searchTerm, setSearchTerm] = useState('');

    // Fetch data
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [rolesRes, usersRes] = await Promise.all([
                authFetch(`${API_BASE}/roles`),
                authFetch(`${API_BASE}/roles/users-list`)
            ]);

            const rolesData = await rolesRes.json();
            const usersData = await usersRes.json();

            setRoles(rolesData.data || []);
            setUsers(usersData.data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Handle form input change
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'level' ? parseInt(value) || 0 : value
        }));
    };

    // Open create modal
    const handleCreate = () => {
        setSelectedRole(null);
        setFormData({
            name: '',
            display_name: '',
            description: '',
            level: 0,
        });
        setShowModal(true);
    };

    // Open edit modal
    const handleEdit = (role) => {
        setSelectedRole(role);
        setFormData({
            name: role.name,
            display_name: role.display_name,
            description: role.description || '',
            level: role.level || 0,
        });
        setShowModal(true);
    };

    // Submit form
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const url = selectedRole
                ? `${API_BASE}/roles/${selectedRole.id}`
                : `${API_BASE}/roles`;
            const method = selectedRole ? 'PUT' : 'POST';

            const response = await authFetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const result = await response.json();

            if (result.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil',
                    text: result.message,
                    timer: 1500,
                });
                setShowModal(false);
                fetchData();
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Gagal',
                    text: result.message || 'Terjadi kesalahan',
                });
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message,
            });
        }
    };

    // Delete role
    const handleDelete = async (role) => {
        const coreRoles = ['superadmin', 'guru', 'kepala_madrasah'];
        if (coreRoles.includes(role.name)) {
            Swal.fire({
                icon: 'warning',
                title: 'Tidak Diizinkan',
                text: 'Role inti tidak dapat dihapus',
            });
            return;
        }

        const result = await Swal.fire({
            title: 'Hapus Role?',
            text: `Apakah Anda yakin ingin menghapus role "${role.display_name}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#EF4444',
            cancelButtonColor: '#6B7280',
            confirmButtonText: 'Ya, Hapus',
            cancelButtonText: 'Batal',
        });

        if (result.isConfirmed) {
            try {
                const response = await authFetch(`${API_BASE}/roles/${role.id}`, {
                    method: 'DELETE',
                });
                const data = await response.json();

                if (data.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Berhasil',
                        text: 'Role berhasil dihapus',
                        timer: 1500,
                    });
                    fetchData();
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Gagal',
                        text: data.message,
                    });
                }
            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: error.message,
                });
            }
        }
    };

    // Open user role assignment modal
    const handleManageUsers = (role) => {
        setSelectedRole(role);
        setShowUserModal(true);
    };

    // Get level color
    const getLevelColor = (level) => {
        if (level >= 90) return 'bg-red-500';
        if (level >= 70) return 'bg-orange-500';
        if (level >= 50) return 'bg-yellow-500';
        if (level >= 30) return 'bg-blue-500';
        return 'bg-gray-500';
    };

    // Filter roles by search
    const filteredRoles = roles.filter(role =>
        role.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        role.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">
                            <i className="fas fa-user-shield text-green-600 mr-3"></i>
                            Manajemen Role
                        </h1>
                        <p className="text-gray-500 text-sm mt-1">
                            Kelola role dan akses pengguna sistem
                        </p>
                    </div>
                    <button
                        onClick={handleCreate}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                        <i className="fas fa-plus"></i>
                        Tambah Role
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="relative">
                    <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                    <input
                        type="text"
                        placeholder="Cari role..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                </div>
            </div>

            {/* Role Cards */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredRoles.map(role => (
                        <div key={role.id} className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 ${getLevelColor(role.level)} rounded-lg flex items-center justify-center`}>
                                        <i className="fas fa-shield-alt text-white"></i>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-800">{role.display_name}</h3>
                                        <p className="text-xs text-gray-400 font-mono">{role.name}</p>
                                    </div>
                                </div>
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getLevelColor(role.level)} text-white`}>
                                    Level {role.level}
                                </span>
                            </div>

                            <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                                {role.description || 'Tidak ada deskripsi'}
                            </p>

                            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                <span className="text-sm text-gray-500">
                                    <i className="fas fa-users mr-1"></i>
                                    {role.users_count || 0} user
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleManageUsers(role)}
                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Kelola User"
                                    >
                                        <i className="fas fa-users-cog"></i>
                                    </button>
                                    <button
                                        onClick={() => handleEdit(role)}
                                        className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                                        title="Edit"
                                    >
                                        <i className="fas fa-edit"></i>
                                    </button>
                                    {!['superadmin', 'guru', 'kepala_madrasah'].includes(role.name) && (
                                        <button
                                            onClick={() => handleDelete(role)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Hapus"
                                        >
                                            <i className="fas fa-trash"></i>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {filteredRoles.length === 0 && (
                        <div className="col-span-full text-center py-12 text-gray-500">
                            <i className="fas fa-search text-4xl mb-3"></i>
                            <p>Tidak ada role ditemukan</p>
                        </div>
                    )}
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-gray-800">
                                    {selectedRole ? 'Edit Role' : 'Tambah Role Baru'}
                                </h2>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="p-2 hover:bg-gray-100 rounded-lg"
                                >
                                    <i className="fas fa-times text-gray-500"></i>
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Nama Role (slug)
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="contoh: waka_humas"
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono"
                                        required
                                        pattern="[a-z_]+"
                                        title="Hanya huruf kecil dan underscore"
                                        disabled={selectedRole && ['superadmin', 'guru'].includes(selectedRole.name)}
                                    />
                                    <p className="text-xs text-gray-400 mt-1">Huruf kecil dan underscore saja</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Nama Tampilan
                                    </label>
                                    <input
                                        type="text"
                                        name="display_name"
                                        value={formData.display_name}
                                        onChange={handleChange}
                                        placeholder="contoh: Waka Humas"
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Deskripsi
                                    </label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                        placeholder="Deskripsi role..."
                                        rows={3}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Level Akses (0-100)
                                    </label>
                                    <input
                                        type="number"
                                        name="level"
                                        value={formData.level}
                                        onChange={handleChange}
                                        min={0}
                                        max={100}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">Semakin tinggi, semakin banyak akses</p>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                    >
                                        {selectedRole ? 'Simpan' : 'Tambah'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* User Role Assignment Modal */}
            {showUserModal && selectedRole && (
                <UserRoleModal
                    role={selectedRole}
                    users={users}
                    onClose={() => {
                        setShowUserModal(false);
                        fetchData();
                    }}
                />
            )}
        </div>
    );
}

// Separate component for user role assignment
function UserRoleModal({ role, users, onClose }) {
    const [roleUsers, setRoleUsers] = useState([]);
    const [kelasList, setKelasList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUserForKelas, setSelectedUserForKelas] = useState(null);
    const [selectedKelasId, setSelectedKelasId] = useState('');
    const [assigning, setAssigning] = useState(false);

    const isWaliKelasRole = role.name === 'wali_kelas';

    useEffect(() => {
        fetchRoleUsers();
        if (isWaliKelasRole) {
            fetchKelasList();
        }
    }, [role.id]);

    const fetchRoleUsers = async () => {
        try {
            setLoading(true);
            const response = await authFetch(`${API_BASE}/roles/${role.id}/users`);
            const data = await response.json();
            setRoleUsers(data.data || []);
        } catch (error) {
            console.error('Error fetching role users:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchKelasList = async () => {
        try {
            const response = await authFetch(`${API_BASE}/kelas`);
            const data = await response.json();
            setKelasList(data.data || []);
        } catch (error) {
            console.error('Error fetching kelas:', error);
        }
    };

    const handleAssign = async (userId, kelasId = null) => {
        if (isWaliKelasRole && !kelasId) {
            // Show kelas selection modal for wali kelas
            setSelectedUserForKelas(userId);
            return;
        }

        setAssigning(true);
        try {
            const payload = {
                user_id: userId,
                role_id: role.id,
            };
            if (kelasId) {
                payload.kelas_id = kelasId;
            }

            const response = await authFetch(`${API_BASE}/roles/assign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await response.json();

            if (data.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil',
                    text: isWaliKelasRole ? 'Wali Kelas berhasil ditambahkan' : 'Role berhasil ditambahkan',
                    timer: 1500,
                });
                fetchRoleUsers();
                if (isWaliKelasRole) fetchKelasList(); // Refresh kelas list
                setSelectedUserForKelas(null);
                setSelectedKelasId('');
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Gagal',
                    text: data.message,
                });
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message,
            });
        } finally {
            setAssigning(false);
        }
    };

    const handleRemove = async (userId) => {
        try {
            const response = await authFetch(`${API_BASE}/roles/remove`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId,
                    role_id: role.id,
                }),
            });
            const data = await response.json();

            if (data.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil',
                    text: 'Role berhasil dihapus',
                    timer: 1500,
                });
                fetchRoleUsers();
                if (isWaliKelasRole) fetchKelasList(); // Refresh kelas list
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Gagal',
                    text: data.message,
                });
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message,
            });
        }
    };

    // Get kelas info for wali kelas users
    const getUserKelas = (userId) => {
        // Find user in users list to get their guru info
        const user = users.find(u => u.id === userId);
        if (!user?.guru_id) return null;
        // Find kelas with this guru as wali
        return kelasList.find(k => k.wali_kelas_id === user.guru_id);
    };

    const roleUserIds = roleUsers.map(u => u.id);
    const availableUsers = users.filter(u => !roleUserIds.includes(u.id));
    const filteredAvailableUsers = availableUsers.filter(u =>
        u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.username?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Get available kelas (without wali kelas)
    const availableKelas = kelasList.filter(k => !k.wali_kelas_id);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">
                                Kelola User - {role.display_name}
                            </h2>
                            <p className="text-sm text-gray-500">{roleUsers.length} user memiliki role ini</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-lg"
                        >
                            <i className="fas fa-times text-gray-500"></i>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {/* Current users with this role */}
                    <div className="mb-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">
                            <i className="fas fa-users text-green-500 mr-2"></i>
                            User dengan Role Ini
                        </h3>
                        {loading ? (
                            <div className="text-center py-4">
                                <div className="animate-spin rounded-full h-8 w-8 border-4 border-green-500 border-t-transparent mx-auto"></div>
                            </div>
                        ) : roleUsers.length > 0 ? (
                            <div className="space-y-2">
                                {roleUsers.map(user => {
                                    const userKelas = isWaliKelasRole ? getUserKelas(user.id) : null;
                                    return (
                                        <div key={user.id} className="flex items-center justify-between bg-green-50 p-3 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                                                    <i className="fas fa-user text-white text-sm"></i>
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-800">{user.name}</p>
                                                    <p className="text-xs text-gray-500">
                                                        @{user.username}
                                                        {isWaliKelasRole && userKelas && (
                                                            <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                                                                <i className="fas fa-chalkboard mr-1"></i>
                                                                {userKelas.nama_kelas}
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleRemove(user.id)}
                                                className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                                title="Hapus role"
                                            >
                                                <i className="fas fa-times"></i>
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-gray-400 text-sm py-4 text-center">Belum ada user dengan role ini</p>
                        )}
                    </div>

                    {/* Available users to add */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">
                            <i className="fas fa-user-plus text-blue-500 mr-2"></i>
                            Tambah User
                            {isWaliKelasRole && (
                                <span className="text-xs font-normal text-gray-400 ml-2">
                                    (Pilih user lalu pilih kelas)
                                </span>
                            )}
                        </h3>
                        <div className="relative mb-3">
                            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                            <input
                                type="text"
                                placeholder="Cari guru..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                            />
                        </div>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {filteredAvailableUsers.slice(0, 10).map(user => (
                                <div key={user.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
                                            <i className="fas fa-user text-white text-sm"></i>
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-800">{user.name}</p>
                                            <p className="text-xs text-gray-500">@{user.username}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleAssign(user.id)}
                                        className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                                        title="Tambah role"
                                    >
                                        <i className="fas fa-plus"></i>
                                    </button>
                                </div>
                            ))}
                            {filteredAvailableUsers.length > 10 && (
                                <p className="text-xs text-gray-400 text-center py-2">
                                    Menampilkan 10 dari {filteredAvailableUsers.length} user
                                </p>
                            )}
                            {filteredAvailableUsers.length === 0 && (
                                <p className="text-gray-400 text-sm py-4 text-center">Tidak ada user tersedia</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Kelas Selection Modal for Wali Kelas */}
            {selectedUserForKelas && isWaliKelasRole && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-xl w-full max-w-md p-6 animate-slideUp">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">
                            <i className="fas fa-chalkboard-teacher text-blue-500 mr-2"></i>
                            Pilih Kelas untuk Wali Kelas
                        </h3>
                        <p className="text-sm text-gray-500 mb-4">
                            User: <strong>{users.find(u => u.id === selectedUserForKelas)?.name}</strong>
                        </p>

                        {availableKelas.length > 0 ? (
                            <>
                                <select
                                    value={selectedKelasId}
                                    onChange={(e) => setSelectedKelasId(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mb-4"
                                >
                                    <option value="">-- Pilih Kelas --</option>
                                    {availableKelas.map(kelas => (
                                        <option key={kelas.id} value={kelas.id}>
                                            {kelas.nama_kelas} (Tingkat {kelas.tingkat})
                                        </option>
                                    ))}
                                </select>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            setSelectedUserForKelas(null);
                                            setSelectedKelasId('');
                                        }}
                                        className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        onClick={() => handleAssign(selectedUserForKelas, selectedKelasId)}
                                        disabled={!selectedKelasId || assigning}
                                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {assigning ? (
                                            <><i className="fas fa-spinner fa-spin mr-2"></i>Menyimpan...</>
                                        ) : (
                                            <><i className="fas fa-check mr-2"></i>Tetapkan</>
                                        )}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-4">
                                <i className="fas fa-exclamation-circle text-amber-500 text-3xl mb-2"></i>
                                <p className="text-gray-600">Semua kelas sudah memiliki wali kelas</p>
                                <button
                                    onClick={() => {
                                        setSelectedUserForKelas(null);
                                        setSelectedKelasId('');
                                    }}
                                    className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                                >
                                    Tutup
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default ManajemenRole;
