import React, { useState, useEffect, useRef, useCallback } from 'react';
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

    // Activity log state
    const [activityLogs, setActivityLogs] = useState([]);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [logPage, setLogPage] = useState(1);
    const [logPerPage, setLogPerPage] = useState(10);
    const [logPagination, setLogPagination] = useState({ total: 0, last_page: 1, current_page: 1 });

    // Password change state
    const [passwords, setPasswords] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    // Profile edit state
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editForm, setEditForm] = useState({});

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

    // Fetch activity logs when Aktivitas tab becomes active or pagination changes
    const fetchActivityLogs = useCallback(async (page, perPage) => {
        try {
            setLoadingLogs(true);
            const response = await api.get('/guru-panel/activity-logs', {
                params: { page, per_page: perPage }
            });
            const paginatedData = response.data.data;
            setActivityLogs(paginatedData?.data || []);
            setLogPagination({
                total: paginatedData?.total || 0,
                last_page: paginatedData?.last_page || 1,
                current_page: paginatedData?.current_page || 1,
            });
        } catch (err) {
            console.error('Error fetching activity logs:', err);
        } finally {
            setLoadingLogs(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'aktivitas') {
            fetchActivityLogs(logPage, logPerPage);
        }
    }, [activeTab, logPage, logPerPage, fetchActivityLogs]);

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

    // Profile edit handlers
    const startEditing = () => {
        setEditForm({
            nama: profile?.name || '',
            email: profile?.email === '-' ? '' : (profile?.email || ''),
            kontak: profile?.kontak === '-' ? '' : (profile?.kontak || ''),
            alamat: profile?.alamat === '-' ? '' : (profile?.alamat || ''),
            tempat_lahir: profile?.tempat_lahir === '-' ? '' : (profile?.tempat_lahir || ''),
            tanggal_lahir: profile?.tanggal_lahir_raw || '',
            pendidikan: profile?.pendidikan === '-' ? '' : (profile?.pendidikan || ''),
            jenis_kelamin: profile?.jenis_kelamin_raw || 'L',
        });
        setIsEditing(true);
    };

    const cancelEditing = () => {
        setIsEditing(false);
        setEditForm({});
    };

    const handleEditChange = (field, value) => {
        setEditForm(prev => ({ ...prev, [field]: value }));
    };

    const handleSaveProfile = async () => {
        setSaving(true);
        try {
            await api.put('/guru-panel/profile', editForm);
            const response = await api.get('/guru-panel/profile');
            setProfile(response.data.user);
            setIsEditing(false);
            Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Profil berhasil diperbarui', timer: 1500, showConfirmButton: false });
        } catch (err) {
            console.error('Error saving profile:', err);
            const msg = err.response?.data?.message || err.response?.data?.error || 'Gagal menyimpan profil';
            Swal.fire({ icon: 'error', title: 'Gagal', text: msg });
        } finally {
            setSaving(false);
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
                        {/* Edit/Cancel Button */}
                        <div className="flex justify-end px-4 pt-3">
                            {isEditing ? (
                                <div className="flex gap-2">
                                    <button
                                        onClick={cancelEditing}
                                        className="px-3 py-1.5 text-xs text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                    >
                                        <i className="fas fa-times mr-1"></i>Batal
                                    </button>
                                    <button
                                        onClick={handleSaveProfile}
                                        disabled={saving}
                                        className="px-3 py-1.5 text-xs text-white bg-green-500 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                                    >
                                        {saving ? <i className="fas fa-spinner fa-spin mr-1"></i> : <i className="fas fa-check mr-1"></i>}
                                        Simpan
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={startEditing}
                                    className="px-3 py-1.5 text-xs text-green-600 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                                >
                                    <i className="fas fa-pen mr-1"></i>Edit Profil
                                </button>
                            )}
                        </div>

                        <div className="divide-y divide-gray-100">
                            {/* Nama - Editable */}
                            <div className="flex items-center gap-3 px-4 py-3">
                                <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                    <i className="fas fa-user text-green-600 text-sm"></i>
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs text-gray-400">Nama Lengkap</p>
                                    {isEditing ? (
                                        <input type="text" value={editForm.nama} onChange={e => handleEditChange('nama', e.target.value)}
                                            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent" />
                                    ) : (
                                        <p className="font-medium text-gray-800 text-sm">{profile?.name || '-'}</p>
                                    )}
                                </div>
                            </div>
                            {/* NIP - Read Only */}
                            <div className="flex items-center gap-3 px-4 py-3">
                                <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                                    <i className="fas fa-id-card text-gray-500 text-sm"></i>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400">NIP <span className="text-[10px] text-gray-300">(admin)</span></p>
                                    <p className="font-medium text-gray-800 text-sm">{profile?.nip || '-'}</p>
                                </div>
                            </div>
                            {/* Email - Editable */}
                            <div className="flex items-center gap-3 px-4 py-3">
                                <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                    <i className="fas fa-envelope text-green-600 text-sm"></i>
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs text-gray-400">Email <span className="text-[10px] text-green-500">(bisa dipakai login)</span></p>
                                    {isEditing ? (
                                        <input type="email" value={editForm.email} onChange={e => handleEditChange('email', e.target.value)}
                                            placeholder="contoh@email.com"
                                            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent" />
                                    ) : (
                                        <p className="font-medium text-gray-800 text-sm">{profile?.email || '-'}</p>
                                    )}
                                </div>
                            </div>
                            {/* Jabatan - Read Only */}
                            <div className="flex items-center gap-3 px-4 py-3">
                                <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                                    <i className="fas fa-briefcase text-gray-500 text-sm"></i>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400">Jabatan <span className="text-[10px] text-gray-300">(admin)</span></p>
                                    <p className="font-medium text-gray-800 text-sm">{profile?.jabatan || '-'}</p>
                                </div>
                            </div>
                            {/* Jenis Kelamin - Editable */}
                            <div className="flex items-center gap-3 px-4 py-3">
                                <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                    <i className="fas fa-venus-mars text-green-600 text-sm"></i>
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs text-gray-400">Jenis Kelamin</p>
                                    {isEditing ? (
                                        <select value={editForm.jenis_kelamin} onChange={e => handleEditChange('jenis_kelamin', e.target.value)}
                                            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent">
                                            <option value="L">Laki-laki</option>
                                            <option value="P">Perempuan</option>
                                        </select>
                                    ) : (
                                        <p className="font-medium text-gray-800 text-sm">{profile?.jenis_kelamin || '-'}</p>
                                    )}
                                </div>
                            </div>
                            {/* Tempat, Tanggal Lahir - Editable */}
                            <div className="flex items-center gap-3 px-4 py-3">
                                <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                    <i className="fas fa-map-marker-alt text-green-600 text-sm"></i>
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs text-gray-400">Tempat, Tanggal Lahir</p>
                                    {isEditing ? (
                                        <div className="flex gap-2">
                                            <input type="text" value={editForm.tempat_lahir} onChange={e => handleEditChange('tempat_lahir', e.target.value)}
                                                placeholder="Tempat lahir"
                                                className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent" />
                                            <input type="date" value={editForm.tanggal_lahir} onChange={e => handleEditChange('tanggal_lahir', e.target.value)}
                                                className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent" />
                                        </div>
                                    ) : (
                                        <p className="font-medium text-gray-800 text-sm">{profile?.tempat_lahir || '-'}, {profile?.tanggal_lahir || '-'}</p>
                                    )}
                                </div>
                            </div>
                            {/* Alamat - Editable */}
                            <div className="flex items-center gap-3 px-4 py-3">
                                <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                    <i className="fas fa-home text-green-600 text-sm"></i>
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs text-gray-400">Alamat</p>
                                    {isEditing ? (
                                        <textarea value={editForm.alamat} onChange={e => handleEditChange('alamat', e.target.value)}
                                            placeholder="Alamat lengkap"
                                            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent resize-y min-h-[40px]" />
                                    ) : (
                                        <p className="font-medium text-gray-800 text-sm">{profile?.alamat || '-'}</p>
                                    )}
                                </div>
                            </div>
                            {/* Pendidikan - Editable */}
                            <div className="flex items-center gap-3 px-4 py-3">
                                <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                    <i className="fas fa-graduation-cap text-green-600 text-sm"></i>
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs text-gray-400">Pendidikan</p>
                                    {isEditing ? (
                                        <input type="text" value={editForm.pendidikan} onChange={e => handleEditChange('pendidikan', e.target.value)}
                                            placeholder="S1 Pendidikan Islam"
                                            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent" />
                                    ) : (
                                        <p className="font-medium text-gray-800 text-sm">{profile?.pendidikan || '-'}</p>
                                    )}
                                </div>
                            </div>
                            {/* Kontak - Editable */}
                            <div className="flex items-center gap-3 px-4 py-3">
                                <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                    <i className="fas fa-phone text-green-600 text-sm"></i>
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs text-gray-400">Kontak</p>
                                    {isEditing ? (
                                        <input type="text" value={editForm.kontak} onChange={e => handleEditChange('kontak', e.target.value)}
                                            placeholder="08xxxxxxxxxx"
                                            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent" />
                                    ) : (
                                        <p className="font-medium text-gray-800 text-sm">{profile?.kontak || '-'}</p>
                                    )}
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
                    <div className="p-4">
                        {/* Header: total count + per page selector */}
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-xs text-gray-500">
                                <span className="font-semibold text-gray-700">{logPagination.total}</span> aktivitas
                            </p>
                            <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-gray-400">Tampilkan</span>
                                <select
                                    value={logPerPage}
                                    onChange={(e) => { setLogPerPage(Number(e.target.value)); setLogPage(1); }}
                                    className="text-xs bg-gray-100 border-0 rounded-lg px-2 py-1 text-gray-700 focus:ring-1 focus:ring-green-400 outline-none"
                                >
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                </select>
                            </div>
                        </div>

                        {loadingLogs ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                            </div>
                        ) : activityLogs.length === 0 ? (
                            <div className="py-12 text-center">
                                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <i className="fas fa-history text-gray-300 text-3xl"></i>
                                </div>
                                <p className="text-gray-500 font-medium">Belum Ada Aktivitas</p>
                                <p className="text-gray-400 text-sm mt-1">Aktivitas login, absensi, dll akan muncul di sini</p>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-2">
                                    {activityLogs.map((log) => {
                                        const iconMap = { login: 'fa-sign-in-alt', logout: 'fa-sign-out-alt', attendance: 'fa-clipboard-check', create: 'fa-plus-circle', update: 'fa-edit', delete: 'fa-trash-alt' };
                                        const colorMap = { login: 'bg-emerald-100 text-emerald-600', logout: 'bg-gray-100 text-gray-500', attendance: 'bg-yellow-100 text-yellow-600', create: 'bg-green-100 text-green-600', update: 'bg-blue-100 text-blue-600', delete: 'bg-red-100 text-red-600' };
                                        const badgeMap = { login: 'bg-emerald-100 text-emerald-700', logout: 'bg-gray-100 text-gray-700', attendance: 'bg-yellow-100 text-yellow-700', create: 'bg-green-100 text-green-700', update: 'bg-blue-100 text-blue-700', delete: 'bg-red-100 text-red-700' };
                                        const icon = iconMap[log.action] || 'fa-circle';
                                        const color = colorMap[log.action] || 'bg-gray-100 text-gray-500';
                                        const badge = badgeMap[log.action] || 'bg-gray-100 text-gray-700';
                                        return (
                                            <div key={log.id} className="flex items-start gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
                                                <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                                                    <i className={`fas ${icon} text-xs`}></i>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5 mb-0.5">
                                                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${badge}`}>
                                                            {log.action_label}
                                                        </span>
                                                    </div>
                                                    <p className="text-gray-700 text-xs leading-relaxed truncate">{log.description}</p>
                                                    <p className="text-[10px] text-gray-400 mt-0.5">{log.created_at_formatted}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Pagination Controls */}
                                {logPagination.last_page > 1 && (
                                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                                        <button
                                            onClick={() => setLogPage(p => Math.max(1, p - 1))}
                                            disabled={logPagination.current_page <= 1}
                                            className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-green-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <i className="fas fa-chevron-left text-[10px]"></i>
                                            Prev
                                        </button>
                                        <span className="text-xs text-gray-500">
                                            <span className="font-semibold text-gray-700">{logPagination.current_page}</span>
                                            {' / '}
                                            {logPagination.last_page}
                                        </span>
                                        <button
                                            onClick={() => setLogPage(p => Math.min(logPagination.last_page, p + 1))}
                                            disabled={logPagination.current_page >= logPagination.last_page}
                                            className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-green-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                        >
                                            Next
                                            <i className="fas fa-chevron-right text-[10px]"></i>
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
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
