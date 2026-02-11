import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/axios';
import Swal from 'sweetalert2';
import SwipeableContent from './components/SwipeableContent';
import { AnimatedTabs } from './components/AnimatedTabs';
import SignatureCanvas from '../../components/SignatureCanvas';

function Profil() {
    const { logout } = useAuth();
    const [activeTab, setActiveTab] = useState('identitas');
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [uploadingTtd, setUploadingTtd] = useState(false);
    const [showSignatureCanvas, setShowSignatureCanvas] = useState(false);
    const fileInputRef = useRef(null);
    const ttdInputRef = useRef(null);

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

    // Handle photo upload
    const handlePhotoClick = () => {
        fileInputRef.current?.click();
    };

    const handlePhotoChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            Swal.fire({
                icon: 'error',
                title: 'File Terlalu Besar',
                text: 'Ukuran foto maksimal 2MB',
                confirmButtonColor: '#22c55e'
            });
            return;
        }

        // Validate file type
        if (!['image/jpeg', 'image/png', 'image/jpg', 'image/gif'].includes(file.type)) {
            Swal.fire({
                icon: 'error',
                title: 'Format Tidak Didukung',
                text: 'Gunakan format JPG, PNG, atau GIF',
                confirmButtonColor: '#22c55e'
            });
            return;
        }

        try {
            setUploadingPhoto(true);
            const formData = new FormData();
            formData.append('photo', file);

            const response = await api.post('/guru-panel/upload-photo', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.data.success) {
                setProfile(prev => ({ ...prev, foto_url: response.data.photo_url }));
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil',
                    text: 'Foto profil berhasil diperbarui',
                    confirmButtonColor: '#22c55e',
                    timer: 2000,
                    showConfirmButton: false
                });
            }
        } catch (err) {
            console.error('Error uploading photo:', err);
            Swal.fire({
                icon: 'error',
                title: 'Gagal Upload',
                text: err.response?.data?.message || 'Terjadi kesalahan saat mengupload foto',
                confirmButtonColor: '#22c55e'
            });
        } finally {
            setUploadingPhoto(false);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    // Handle TTD upload
    const handleTtdClick = () => {
        ttdInputRef.current?.click();
    };

    // Handle canvas signature save
    const handleCanvasTtdSave = async (base64) => {
        try {
            setUploadingTtd(true);
            const response = await api.post('/guru-panel/upload-ttd', {
                ttd_base64: base64
            });
            if (response.data.success) {
                setProfile(prev => ({ ...prev, ttd_url: response.data.ttd_url }));
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil',
                    text: 'Tanda tangan berhasil disimpan',
                    confirmButtonColor: '#22c55e',
                    timer: 2000,
                    showConfirmButton: false
                });
            }
        } catch (err) {
            console.error('Error saving canvas TTD:', err);
            Swal.fire({
                icon: 'error',
                title: 'Gagal',
                text: err.response?.data?.message || 'Terjadi kesalahan saat menyimpan TTD',
                confirmButtonColor: '#22c55e'
            });
        } finally {
            setUploadingTtd(false);
        }
    };

    const handleTtdChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            Swal.fire({
                icon: 'error',
                title: 'File Terlalu Besar',
                text: 'Ukuran file maksimal 2MB',
                confirmButtonColor: '#22c55e'
            });
            return;
        }

        if (!['image/jpeg', 'image/png', 'image/jpg', 'image/gif'].includes(file.type)) {
            Swal.fire({
                icon: 'error',
                title: 'Format Tidak Didukung',
                text: 'Gunakan format JPG, PNG, atau GIF',
                confirmButtonColor: '#22c55e'
            });
            return;
        }

        try {
            setUploadingTtd(true);
            const formData = new FormData();
            formData.append('ttd', file);

            const response = await api.post('/guru-panel/upload-ttd', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.data.success) {
                setProfile(prev => ({ ...prev, ttd_url: response.data.ttd_url }));
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil',
                    text: 'Tanda tangan berhasil diperbarui',
                    confirmButtonColor: '#22c55e',
                    timer: 2000,
                    showConfirmButton: false
                });
            }
        } catch (err) {
            console.error('Error uploading TTD:', err);
            Swal.fire({
                icon: 'error',
                title: 'Gagal Upload',
                text: err.response?.data?.message || 'Terjadi kesalahan saat mengupload TTD',
                confirmButtonColor: '#22c55e'
            });
        } finally {
            setUploadingTtd(false);
            if (ttdInputRef.current) {
                ttdInputRef.current.value = '';
            }
        }
    };

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

    const currentTabIndex = tabs.findIndex(t => t.id === activeTab);

    // Handle swipe navigation
    const handleSwipeChange = (newIndex) => {
        if (newIndex >= 0 && newIndex < tabs.length) {
            setActiveTab(tabs[newIndex].id);
        }
    };

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
            {/* Hidden File Inputs */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoChange}
                accept="image/jpeg,image/png,image/jpg,image/gif"
                className="hidden"
            />
            <input
                type="file"
                ref={ttdInputRef}
                onChange={handleTtdChange}
                accept="image/jpeg,image/png,image/jpg,image/gif"
                className="hidden"
            />

            {/* Profile Header with Green Background */}
            <div className="bg-gradient-to-b from-green-600 to-green-600 px-4 pt-8 pb-12 text-center text-white">
                {/* Avatar */}
                <div className="relative inline-block mb-4">
                    <div
                        className="w-24 h-24 bg-green-500/40 rounded-full flex items-center justify-center border-4 border-green-400/30 overflow-hidden cursor-pointer"
                        onClick={handlePhotoClick}
                    >
                        {uploadingPhoto ? (
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                        ) : profile?.foto_url ? (
                            <img
                                src={profile.foto_url}
                                alt="Profile"
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <i className="fas fa-user-friends text-4xl text-white/90"></i>
                        )}
                    </div>
                    {/* Camera Button */}
                    <button
                        onClick={handlePhotoClick}
                        disabled={uploadingPhoto}
                        className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform disabled:opacity-50"
                    >
                        <i className="fas fa-camera text-green-600 text-sm"></i>
                    </button>
                </div>

                {/* Name and Email */}
                <h2 className="font-bold text-xl">{profile?.name || '-'}</h2>
                <p className="text-green-200 text-sm mb-3">{profile?.email || '-'}</p>

                {/* Print Button */}
                <button
                    onClick={() => window.open(`/print/profil?token=${localStorage.getItem('auth_token')}`, '_blank')}
                    className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full text-sm transition-colors"
                >
                    <i className="fas fa-print"></i>
                    Cetak Profil
                </button>
            </div>

            {/* Tab Navigation - Animated */}
            <div className="bg-white sticky top-0 z-10 px-4 py-3 border-b border-gray-100">
                <AnimatedTabs
                    tabs={tabs}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                />
            </div>

            {/* Tab Content */}
            <SwipeableContent
                currentIndex={currentTabIndex}
                totalItems={tabs.length}
                onIndexChange={handleSwipeChange}
                className="bg-white"
            >
                {/* Identitas Tab */}
                {activeTab === 'identitas' && (
                    <>
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

                        {/* TTD Upload Section */}
                        <div className="px-4 py-4">
                            <div className="border-2 border-dashed border-gray-200 rounded-xl p-4">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                        <i className="fas fa-signature text-green-600 text-sm"></i>
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-800 text-sm">Tanda Tangan (TTD)</p>
                                        <p className="text-xs text-gray-400">Digunakan pada cetak hasil rapat</p>
                                    </div>
                                </div>

                                {profile?.ttd_url ? (
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="bg-gray-50 rounded-lg p-3 w-full flex justify-center">
                                            <img
                                                src={profile.ttd_url}
                                                alt="Tanda Tangan"
                                                className="max-h-24 object-contain"
                                            />
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={handleTtdClick}
                                                disabled={uploadingTtd}
                                                className="text-sm text-green-600 hover:text-green-700 font-medium flex items-center gap-1 disabled:opacity-50"
                                            >
                                                <i className="fas fa-cloud-upload-alt text-xs"></i> Upload
                                            </button>
                                            <span className="text-gray-300">|</span>
                                            <button
                                                onClick={() => setShowSignatureCanvas(true)}
                                                disabled={uploadingTtd}
                                                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 disabled:opacity-50"
                                            >
                                                <i className="fas fa-pen-fancy text-xs"></i> Tulis TTD
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleTtdClick}
                                            disabled={uploadingTtd}
                                            className="flex-1 py-5 border border-gray-200 rounded-xl bg-gray-50 hover:bg-green-50 hover:border-green-300 transition-colors flex flex-col items-center gap-2 disabled:opacity-50"
                                        >
                                            {uploadingTtd ? (
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                                            ) : (
                                                <>
                                                    <i className="fas fa-cloud-upload-alt text-xl text-gray-400"></i>
                                                    <span className="text-xs text-gray-500">Upload File</span>
                                                </>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => setShowSignatureCanvas(true)}
                                            disabled={uploadingTtd}
                                            className="flex-1 py-5 border border-gray-200 rounded-xl bg-gray-50 hover:bg-indigo-50 hover:border-indigo-300 transition-colors flex flex-col items-center gap-2 disabled:opacity-50"
                                        >
                                            <i className="fas fa-pen-fancy text-xl text-indigo-400"></i>
                                            <span className="text-xs text-gray-500">Tulis TTD</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
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
            </SwipeableContent>

            {/* Bottom Spacing */}
            <div className="h-16"></div>

            {/* Signature Canvas Modal */}
            <SignatureCanvas
                isOpen={showSignatureCanvas}
                onClose={() => setShowSignatureCanvas(false)}
                onSave={handleCanvasTtdSave}
                title="Tulis Tanda Tangan"
            />
        </div>
    );
}

export default Profil;
