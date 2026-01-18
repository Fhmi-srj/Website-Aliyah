import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/axios';
import Swal from 'sweetalert2';

function Profil() {
    const { logout } = useAuth();
    const [activeTab, setActiveTab] = useState('identitas');
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    // Password change state
    const [passwords, setPasswords] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    // Fetch profile data
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                setLoading(true);
                const response = await api.get('/guru-panel/profile');
                setProfile(response.data.user);
            } catch (err) {
                console.error('Error fetching profile:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

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
            width: '90%',
            customClass: {
                popup: 'rounded-2xl !max-w-xs',
                confirmButton: 'rounded-xl px-4 text-sm',
                cancelButton: 'rounded-xl px-4 text-sm'
            }
        });

        if (result.isConfirmed) {
            await logout();
        }
    };

    const handlePasswordChange = (e) => {
        setPasswords({ ...passwords, [e.target.name]: e.target.value });
    };

    const handleSubmitPassword = (e) => {
        e.preventDefault();
        if (passwords.newPassword !== passwords.confirmPassword) {
            alert('Password baru tidak cocok!');
            return;
        }
        // TODO: Implement password change API
        alert('Fitur ubah password akan segera tersedia');
    };

    const tabs = [
        { id: 'identitas', icon: 'fas fa-user', label: 'Identitas' },
        { id: 'keamanan', icon: 'fas fa-shield-alt', label: 'Keamanan' },
        { id: 'aktivitas', icon: 'fas fa-history', label: 'Aktivitas' },
    ];

    if (loading) {
        return (
            <div className="animate-pulse min-h-screen bg-white">
                {/* Header Skeleton */}
                <div className="bg-green-200 px-4 pt-8 pb-12 text-center">
                    <div className="w-24 h-24 bg-green-300 rounded-full mx-auto mb-4"></div>
                    <div className="h-5 bg-green-300 rounded w-40 mx-auto mb-2"></div>
                    <div className="h-4 bg-green-300 rounded w-32 mx-auto"></div>
                </div>
                {/* Tabs Skeleton */}
                <div className="bg-white border-b border-gray-200">
                    <div className="flex justify-around py-4">
                        <div className="w-16 h-12 bg-gray-200 rounded"></div>
                        <div className="w-16 h-12 bg-gray-200 rounded"></div>
                        <div className="w-16 h-12 bg-gray-200 rounded"></div>
                    </div>
                </div>
                {/* Content Skeleton */}
                <div className="p-4 space-y-3">
                    <div className="h-16 bg-gray-200 rounded-xl"></div>
                    <div className="h-16 bg-gray-200 rounded-xl"></div>
                    <div className="h-16 bg-gray-200 rounded-xl"></div>
                    <div className="h-16 bg-gray-200 rounded-xl"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fadeIn min-h-screen bg-white">
            {/* Profile Header with Green Background */}
            <div className="bg-gradient-to-b from-green-600 to-green-600 px-4 pt-8 pb-12 text-center text-white">
                {/* Avatar */}
                <div className="relative inline-block mb-4">
                    <div className="w-24 h-24 bg-green-500/40 rounded-full flex items-center justify-center border-4 border-green-400/30">
                        <i className="fas fa-user-friends text-4xl text-white/90"></i>
                    </div>
                    {/* Camera Button */}
                    <button className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg">
                        <i className="fas fa-camera text-green-600 text-sm"></i>
                    </button>
                </div>

                {/* Name and Email */}
                <h2 className="font-bold text-xl">{profile?.name || '-'}</h2>
                <p className="text-green-200 text-sm">{profile?.email || '-'}</p>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="flex">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 py-4 flex flex-col items-center gap-1 transition-colors ${activeTab === tab.id
                                ? 'text-green-600 border-b-2 border-green-600'
                                : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            <i className={`${tab.icon} text-xl`}></i>
                            <span className="text-xs font-medium">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            <div className="bg-white">
                {/* Identitas Tab */}
                {activeTab === 'identitas' && (
                    <div className="divide-y divide-gray-100">
                        <div className="flex items-center gap-3 px-4 py-3">
                            <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <i className="fas fa-user text-green-600 text-sm"></i>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400">Nama Lengkap</p>
                                <p className="font-medium text-gray-800 text-sm">{profile?.name || '-'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 px-4 py-3">
                            <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <i className="fas fa-id-card text-green-600 text-sm"></i>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400">NIP</p>
                                <p className="font-medium text-gray-800 text-sm">{profile?.nip || '-'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 px-4 py-3">
                            <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <i className="fas fa-envelope text-green-600 text-sm"></i>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400">Email</p>
                                <p className="font-medium text-gray-800 text-sm">{profile?.email || '-'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 px-4 py-3">
                            <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <i className="fas fa-briefcase text-green-600 text-sm"></i>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400">Jabatan</p>
                                <p className="font-medium text-gray-800 text-sm">{profile?.jabatan || '-'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 px-4 py-3">
                            <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <i className="fas fa-venus-mars text-green-600 text-sm"></i>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400">Jenis Kelamin</p>
                                <p className="font-medium text-gray-800 text-sm">{profile?.jenis_kelamin || '-'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 px-4 py-3">
                            <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <i className="fas fa-map-marker-alt text-green-600 text-sm"></i>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400">Tempat, Tanggal Lahir</p>
                                <p className="font-medium text-gray-800 text-sm">{profile?.tempat_lahir || '-'}, {profile?.tanggal_lahir || '-'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 px-4 py-3">
                            <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <i className="fas fa-home text-green-600 text-sm"></i>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400">Alamat</p>
                                <p className="font-medium text-gray-800 text-sm">{profile?.alamat || '-'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 px-4 py-3">
                            <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <i className="fas fa-graduation-cap text-green-600 text-sm"></i>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400">Pendidikan</p>
                                <p className="font-medium text-gray-800 text-sm">{profile?.pendidikan || '-'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 px-4 py-3">
                            <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <i className="fas fa-phone text-green-600 text-sm"></i>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400">Kontak</p>
                                <p className="font-medium text-gray-800 text-sm">{profile?.kontak || '-'}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Keamanan Tab */}
                {activeTab === 'keamanan' && (
                    <div className="p-4">
                        <form onSubmit={handleSubmitPassword} className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-500 mb-1">Password Saat Ini</label>
                                <input
                                    type="password"
                                    name="currentPassword"
                                    value={passwords.currentPassword}
                                    onChange={handlePasswordChange}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                                    placeholder="Masukkan password saat ini"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-500 mb-1">Password Baru</label>
                                <input
                                    type="password"
                                    name="newPassword"
                                    value={passwords.newPassword}
                                    onChange={handlePasswordChange}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                                    placeholder="Masukkan password baru"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-500 mb-1">Konfirmasi Password Baru</label>
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    value={passwords.confirmPassword}
                                    onChange={handlePasswordChange}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                                    placeholder="Konfirmasi password baru"
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
                            >
                                <i className="fas fa-save mr-2"></i>
                                Simpan Password
                            </button>
                        </form>

                        {/* Logout Button */}
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center justify-center gap-2 mt-6 py-3 bg-red-50 text-red-600 rounded-xl font-semibold hover:bg-red-100 transition-colors"
                        >
                            <i className="fas fa-sign-out-alt"></i>
                            Keluar
                        </button>
                    </div>
                )}

                {/* Aktivitas Tab */}
                {activeTab === 'aktivitas' && (
                    <div className="py-12 text-center">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i className="fas fa-history text-gray-300 text-3xl"></i>
                        </div>
                        <p className="text-gray-500 font-medium">Riwayat Aktivitas</p>
                        <p className="text-gray-400 text-sm mt-1">Aktivitas login akan ditampilkan di sini</p>
                    </div>
                )}
            </div>

            {/* Bottom Spacing */}
            <div className="h-20"></div>
        </div>
    );
}

export default Profil;
