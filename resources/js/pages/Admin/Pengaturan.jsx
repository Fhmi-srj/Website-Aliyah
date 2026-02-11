import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { API_BASE, authFetch } from '../../config/api';
import Swal from 'sweetalert2';

function Pengaturan() {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [activeTab, setActiveTab] = useState('lembaga');
    const [settings, setSettings] = useState({
        // Tampilan
        sidebarCollapsed: localStorage.getItem('sidebar_collapsed') === 'true',
        darkMode: localStorage.getItem('dark_mode') === 'true',
        // Notifikasi
        notifikasiEmail: true,
        notifikasiBrowser: true,
        notifikasiKegiatan: true,
        notifikasiRapat: true,
    });
    const [logoutLoading, setLogoutLoading] = useState(false);

    // Server settings
    const [unlockAllAttendance, setUnlockAllAttendance] = useState(false);
    const [loadingServerSettings, setLoadingServerSettings] = useState(true);
    const [savingUnlock, setSavingUnlock] = useState(false);

    // Institution settings
    const [institutionData, setInstitutionData] = useState({
        nama_lembaga: '',
        moto_lembaga: '',
        alamat_lembaga: '',
        telepon_lembaga: '',
        email_lembaga: '',
        logo_lembaga: null,
        kop_surat: {
            baris_1: '',
            baris_2: '',
            baris_3: '',
            alamat: '',
            telepon: '',
            email: '',
            website: '',
        },
        kop_image: null,
    });
    const [savingInstitution, setSavingInstitution] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingKop, setUploadingKop] = useState(false);
    const logoInputRef = useRef(null);
    const kopInputRef = useRef(null);

    // Confirmation modal state
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [pendingUnlockValue, setPendingUnlockValue] = useState(null);
    const [countdown, setCountdown] = useState(5);
    const [canConfirm, setCanConfirm] = useState(false);

    // Fetch server settings on mount
    useEffect(() => {
        fetchServerSettings();
    }, []);

    // Countdown effect for confirmation modal
    useEffect(() => {
        let timer;
        if (showConfirmModal && countdown > 0) {
            timer = setTimeout(() => {
                setCountdown(prev => prev - 1);
            }, 1000);
        } else if (countdown === 0) {
            setCanConfirm(true);
        }
        return () => clearTimeout(timer);
    }, [showConfirmModal, countdown]);

    const fetchServerSettings = async () => {
        try {
            setLoadingServerSettings(true);
            const response = await authFetch(`${API_BASE}/settings`);
            const data = await response.json();

            if (data.success) {
                setUnlockAllAttendance(data.data.unlock_all_attendance?.value || false);

                // Set institution data
                setInstitutionData({
                    nama_lembaga: data.data.nama_lembaga?.value || '',
                    moto_lembaga: data.data.moto_lembaga?.value || '',
                    alamat_lembaga: data.data.alamat_lembaga?.value || '',
                    telepon_lembaga: data.data.telepon_lembaga?.value || '',
                    email_lembaga: data.data.email_lembaga?.value || '',
                    logo_lembaga: data.data.logo_lembaga?.value || null,
                    kop_surat: data.data.kop_surat?.value || {
                        baris_1: '',
                        baris_2: '',
                        baris_3: '',
                        alamat: '',
                        telepon: '',
                        email: '',
                        website: '',
                    },
                    kop_image: data.data.kop_image?.value || null,
                });
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error);
        } finally {
            setLoadingServerSettings(false);
        }
    };

    // Modal animation state
    const [isClosing, setIsClosing] = useState(false);

    const openConfirmModal = (newValue) => {
        setPendingUnlockValue(newValue);
        setCountdown(5);
        setCanConfirm(false);
        setIsClosing(false);
        setShowConfirmModal(true);
    };

    const closeConfirmModal = () => {
        setIsClosing(true);
        setTimeout(() => {
            setShowConfirmModal(false);
            setPendingUnlockValue(null);
            setCountdown(5);
            setCanConfirm(false);
            setIsClosing(false);
        }, 300);
    };

    const handleConfirmUnlock = async () => {
        if (!canConfirm) return;

        closeConfirmModal();

        try {
            setSavingUnlock(true);

            const response = await authFetch(`${API_BASE}/settings/unlock_all_attendance`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ value: pendingUnlockValue }),
            });

            const data = await response.json();

            if (data.success) {
                setUnlockAllAttendance(pendingUnlockValue);
                Swal.fire({
                    icon: 'success',
                    title: pendingUnlockValue ? 'Kunci Absensi Dibuka' : 'Kunci Absensi Diterapkan',
                    text: pendingUnlockValue
                        ? 'Semua guru sekarang dapat mengisi absensi yang sudah terlewat.'
                        : 'Absensi kembali mengikuti aturan waktu normal.',
                    timer: 2000,
                    showConfirmButton: false,
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Gagal',
                    text: data.message || 'Gagal menyimpan pengaturan',
                });
            }
        } catch (error) {
            console.error('Failed to save setting:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Terjadi kesalahan saat menyimpan pengaturan',
            });
        } finally {
            setSavingUnlock(false);
        }
    };

    const handleSettingChange = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));

        if (key === 'sidebarCollapsed') {
            localStorage.setItem('sidebar_collapsed', value);
        } else if (key === 'darkMode') {
            localStorage.setItem('dark_mode', value);
            if (value) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        }
    };

    const handleInstitutionChange = (field, value) => {
        setInstitutionData(prev => ({ ...prev, [field]: value }));
    };

    const handleKopChange = (field, value) => {
        setInstitutionData(prev => ({
            ...prev,
            kop_surat: { ...prev.kop_surat, [field]: value }
        }));
    };

    const saveInstitutionSetting = async (key, value) => {
        try {
            const response = await authFetch(`${API_BASE}/settings/${key}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ value }),
            });
            return response.ok;
        } catch (error) {
            console.error(`Failed to save ${key}:`, error);
            return false;
        }
    };

    const handleSaveInstitution = async () => {
        setSavingInstitution(true);
        try {
            const saves = await Promise.all([
                saveInstitutionSetting('nama_lembaga', institutionData.nama_lembaga),
                saveInstitutionSetting('moto_lembaga', institutionData.moto_lembaga),
                saveInstitutionSetting('alamat_lembaga', institutionData.alamat_lembaga),
                saveInstitutionSetting('telepon_lembaga', institutionData.telepon_lembaga),
                saveInstitutionSetting('email_lembaga', institutionData.email_lembaga),
                saveInstitutionSetting('kop_surat', institutionData.kop_surat),
            ]);

            if (saves.every(Boolean)) {
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil',
                    text: 'Pengaturan lembaga berhasil disimpan',
                    timer: 2000,
                    showConfirmButton: false,
                });
            } else {
                Swal.fire({
                    icon: 'warning',
                    title: 'Sebagian Gagal',
                    text: 'Beberapa pengaturan gagal disimpan',
                });
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Gagal menyimpan pengaturan lembaga',
            });
        } finally {
            setSavingInstitution(false);
        }
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('logo', file);

        setUploadingLogo(true);
        try {
            const response = await authFetch(`${API_BASE}/settings/upload-logo`, {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (data.success) {
                setInstitutionData(prev => ({ ...prev, logo_lembaga: data.data.path }));
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil',
                    text: 'Logo berhasil diupload',
                    timer: 1500,
                    showConfirmButton: false,
                });
            } else {
                Swal.fire({ icon: 'error', title: 'Gagal', text: data.message || 'Gagal upload logo' });
            }
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Gagal upload logo' });
        } finally {
            setUploadingLogo(false);
        }
    };

    const handleKopUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('kop', file);

        setUploadingKop(true);
        try {
            const response = await authFetch(`${API_BASE}/settings/upload-kop`, {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (data.success) {
                setInstitutionData(prev => ({ ...prev, kop_image: data.data.path }));
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil',
                    text: 'Kop surat berhasil diupload',
                    timer: 1500,
                    showConfirmButton: false,
                });
            } else {
                Swal.fire({ icon: 'error', title: 'Gagal', text: data.message || 'Gagal upload kop' });
            }
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Gagal upload kop' });
        } finally {
            setUploadingKop(false);
        }
    };

    const handleLogout = async () => {
        setLogoutLoading(true);
        await logout();
    };

    const tabs = [
        { id: 'lembaga', label: 'Lembaga', icon: 'fa-building' },
        { id: 'absensi', label: 'Absensi', icon: 'fa-clipboard-check' },
        { id: 'tampilan', label: 'Tampilan', icon: 'fa-palette' },
        { id: 'notifikasi', label: 'Notifikasi', icon: 'fa-bell' },
        { id: 'akun', label: 'Akun', icon: 'fa-user-cog' },
        { id: 'tentang', label: 'Tentang', icon: 'fa-info-circle' },
    ];

    return (
        <div className="animate-fadeIn">
            <header className="mb-6">
                <h1 className="text-[#1f2937] font-semibold text-xl mb-1">
                    Pengaturan
                </h1>
                <p className="text-[12px] text-[#6b7280]">
                    Konfigurasi sistem dan preferensi aplikasi
                </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Sidebar Tabs */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${activeTab === tab.id
                                    ? 'bg-green-50 text-green-700 font-medium'
                                    : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                <i className={`fas ${tab.icon} w-5`}></i>
                                <span className="text-sm">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Area */}
                <div className="lg:col-span-3">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">

                        {/* Lembaga Tab */}
                        {activeTab === 'lembaga' && (
                            <div className="space-y-6">
                                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                    <i className="fas fa-building text-green-600"></i>
                                    Pengaturan Lembaga
                                </h3>

                                {loadingServerSettings ? (
                                    <div className="text-center py-8">
                                        <div className="animate-spin rounded-full h-10 w-10 border-4 border-green-500 border-t-transparent mx-auto"></div>
                                        <p className="text-gray-500 mt-2 text-sm">Memuat pengaturan...</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Logo & Nama */}
                                        <div className="grid md:grid-cols-3 gap-6">
                                            {/* Logo Upload */}
                                            <div className="md:col-span-1">
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Logo Lembaga
                                                </label>
                                                <div className="relative">
                                                    <div
                                                        onClick={() => logoInputRef.current?.click()}
                                                        className="w-full aspect-square border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-green-500 hover:bg-green-50 transition-all"
                                                    >
                                                        {institutionData.logo_lembaga ? (
                                                            <img
                                                                src={`/storage/${institutionData.logo_lembaga}`}
                                                                alt="Logo"
                                                                className="w-full h-full object-contain p-4"
                                                            />
                                                        ) : (
                                                            <>
                                                                <i className="fas fa-cloud-upload-alt text-3xl text-gray-400 mb-2"></i>
                                                                <span className="text-xs text-gray-500">Klik untuk upload</span>
                                                            </>
                                                        )}
                                                        {uploadingLogo && (
                                                            <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-xl">
                                                                <i className="fas fa-spinner fa-spin text-green-600 text-2xl"></i>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <input
                                                        ref={logoInputRef}
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleLogoUpload}
                                                        className="hidden"
                                                    />
                                                </div>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    Menjadi logo website & OG Image
                                                </p>
                                            </div>

                                            {/* Nama & Moto */}
                                            <div className="md:col-span-2 space-y-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Nama Lembaga
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={institutionData.nama_lembaga}
                                                        onChange={(e) => handleInstitutionChange('nama_lembaga', e.target.value)}
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                                        placeholder="Nama Madrasah/Sekolah"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Moto Lembaga
                                                        <span className="text-xs text-gray-400 ml-2">(Meta Description & OG Tag)</span>
                                                    </label>
                                                    <textarea
                                                        value={institutionData.moto_lembaga}
                                                        onChange={(e) => handleInstitutionChange('moto_lembaga', e.target.value)}
                                                        rows={2}
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                                        placeholder="Moto atau tagline lembaga"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Kontak */}
                                        <div className="border-t border-gray-100 pt-6">
                                            <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                                <i className="fas fa-address-card text-blue-500"></i>
                                                Informasi Kontak
                                            </h4>
                                            <div className="grid md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Alamat
                                                    </label>
                                                    <textarea
                                                        value={institutionData.alamat_lembaga}
                                                        onChange={(e) => handleInstitutionChange('alamat_lembaga', e.target.value)}
                                                        rows={2}
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                                                    />
                                                </div>
                                                <div className="space-y-3">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Telepon
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={institutionData.telepon_lembaga}
                                                            onChange={(e) => handleInstitutionChange('telepon_lembaga', e.target.value)}
                                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Email
                                                        </label>
                                                        <input
                                                            type="email"
                                                            value={institutionData.email_lembaga}
                                                            onChange={(e) => handleInstitutionChange('email_lembaga', e.target.value)}
                                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Kop Surat */}
                                        <div className="border-t border-gray-100 pt-6">
                                            <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                                <i className="fas fa-file-alt text-purple-500"></i>
                                                Kop Surat
                                                <span className="text-xs text-gray-400 font-normal ml-2">
                                                    Untuk dokumen resmi dan cetak surat
                                                </span>
                                            </h4>

                                            <div className="grid md:grid-cols-2 gap-6">
                                                {/* Kop Image Upload */}
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Gambar Kop Surat (Opsional)
                                                    </label>
                                                    <div
                                                        onClick={() => kopInputRef.current?.click()}
                                                        className="w-full h-32 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-all relative"
                                                    >
                                                        {institutionData.kop_image ? (
                                                            <img
                                                                src={`/storage/${institutionData.kop_image}`}
                                                                alt="Kop"
                                                                className="h-full object-contain"
                                                            />
                                                        ) : (
                                                            <div className="text-center">
                                                                <i className="fas fa-image text-2xl text-gray-400 mb-1"></i>
                                                                <p className="text-xs text-gray-500">Upload gambar kop</p>
                                                            </div>
                                                        )}
                                                        {uploadingKop && (
                                                            <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-xl">
                                                                <i className="fas fa-spinner fa-spin text-purple-600 text-xl"></i>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <input
                                                        ref={kopInputRef}
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleKopUpload}
                                                        className="hidden"
                                                    />
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        Jika ada gambar, akan menggantikan teks kop
                                                    </p>
                                                </div>

                                                {/* Kop Text Fields */}
                                                <div className="space-y-3">
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-600 mb-1">Baris 1 (Yayasan)</label>
                                                        <input
                                                            type="text"
                                                            value={institutionData.kop_surat.baris_1}
                                                            onChange={(e) => handleKopChange('baris_1', e.target.value)}
                                                            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-600 mb-1">Baris 2 (Nama Lembaga)</label>
                                                        <input
                                                            type="text"
                                                            value={institutionData.kop_surat.baris_2}
                                                            onChange={(e) => handleKopChange('baris_2', e.target.value)}
                                                            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-600 mb-1">Baris 3 (Akreditasi/Status)</label>
                                                        <input
                                                            type="text"
                                                            value={institutionData.kop_surat.baris_3}
                                                            onChange={(e) => handleKopChange('baris_3', e.target.value)}
                                                            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Save Button */}
                                        <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                                            <button
                                                onClick={() => navigate('/pergantian-tahun')}
                                                className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
                                            >
                                                <i className="fas fa-calendar-plus"></i>
                                                Pergantian Tahun Ajaran
                                            </button>
                                            <button
                                                onClick={handleSaveInstitution}
                                                disabled={savingInstitution}
                                                className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
                                            >
                                                {savingInstitution ? (
                                                    <><i className="fas fa-spinner fa-spin mr-2"></i>Menyimpan...</>
                                                ) : (
                                                    <><i className="fas fa-save mr-2"></i>Simpan Pengaturan</>
                                                )}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Absensi Tab */}
                        {activeTab === 'absensi' && (
                            <div className="space-y-6">
                                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                    <i className="fas fa-clipboard-check text-green-600"></i>
                                    Pengaturan Absensi
                                </h3>

                                {/* Unlock All Attendance Toggle */}
                                <div className={`p-4 rounded-lg ${unlockAllAttendance ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50'}`}>
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 pr-4">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-medium text-gray-800">
                                                    {unlockAllAttendance ? (
                                                        <><i className="fas fa-unlock text-amber-600 mr-2"></i>Kunci Absensi Terbuka</>
                                                    ) : (
                                                        <><i className="fas fa-lock text-gray-600 mr-2"></i>Kunci Absensi</>
                                                    )}
                                                </h4>
                                            </div>
                                            <p className="text-sm text-gray-500 mb-2">
                                                Buka kunci semua absensi secara universal. Ketika diaktifkan, guru dapat mengisi form absensi yang sudah terlewat waktu normalnya.
                                            </p>
                                            {unlockAllAttendance && (
                                                <div className="flex items-center gap-2 text-amber-700 text-xs bg-amber-100 px-3 py-1.5 rounded-full inline-flex">
                                                    <i className="fas fa-exclamation-triangle"></i>
                                                    <span>Semua absensi terbuka - guru dapat mengisi kapan saja</span>
                                                </div>
                                            )}
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={unlockAllAttendance}
                                                onChange={(e) => openConfirmModal(e.target.checked)}
                                                disabled={loadingServerSettings || savingUnlock}
                                                className="sr-only peer"
                                            />
                                            <div className={`w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-amber-500 ${savingUnlock ? 'opacity-50' : ''}`}>
                                            </div>
                                            {savingUnlock && (
                                                <i className="fas fa-spinner fa-spin ml-2 text-amber-600"></i>
                                            )}
                                        </label>
                                    </div>
                                </div>

                                {/* Info Box */}
                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <h4 className="font-medium text-blue-800 flex items-center gap-2 mb-2">
                                        <i className="fas fa-info-circle"></i>
                                        Informasi Kunci Absensi
                                    </h4>
                                    <ul className="text-sm text-blue-700 space-y-1">
                                        <li className="flex items-start gap-2">
                                            <i className="fas fa-check text-blue-500 mt-0.5"></i>
                                            <span>Ketika <strong>terkunci</strong> (default): Guru hanya bisa absensi sesuai jadwal yang aktif (hari ini)</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <i className="fas fa-check text-blue-500 mt-0.5"></i>
                                            <span>Ketika <strong>terbuka</strong>: Guru dapat mengisi absensi untuk jadwal yang sudah terlewat</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <i className="fas fa-check text-blue-500 mt-0.5"></i>
                                            <span>Berlaku untuk: Absensi Mengajar, Kegiatan, dan Rapat</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        )}

                        {/* Tampilan Tab */}
                        {activeTab === 'tampilan' && (
                            <div className="space-y-6">
                                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                    <i className="fas fa-palette text-green-600"></i>
                                    Pengaturan Tampilan
                                </h3>

                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <div>
                                        <h4 className="font-medium text-gray-800">Sidebar Compact</h4>
                                        <p className="text-sm text-gray-500">Sidebar default dalam mode compact</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={settings.sidebarCollapsed}
                                            onChange={(e) => handleSettingChange('sidebarCollapsed', e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-bg rounded-lg border border-transparent dark:border-dark-border">
                                    <div>
                                        <h4 className="font-medium text-gray-800 dark:text-dark-text">Mode Gelap</h4>
                                        <p className="text-sm text-gray-500 dark:text-dark-muted">Tampilan gelap untuk kenyamanan mata</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={settings.darkMode}
                                                onChange={(e) => handleSettingChange('darkMode', e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Notifikasi Tab */}
                        {activeTab === 'notifikasi' && (
                            <div className="space-y-6">
                                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                    <i className="fas fa-bell text-green-600"></i>
                                    Pengaturan Notifikasi
                                </h3>

                                <div className="space-y-4">
                                    {['Notifikasi Browser', 'Notifikasi Kegiatan', 'Notifikasi Rapat'].map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                            <div>
                                                <h4 className="font-medium text-gray-800">{item}</h4>
                                                <p className="text-sm text-gray-500">
                                                    {idx === 0 ? 'Terima notifikasi di browser' : idx === 1 ? 'Pengingat kegiatan yang akan datang' : 'Pengingat rapat yang dijadwalkan'}
                                                </p>
                                            </div>
                                            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">
                                                Coming Soon
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Akun Tab */}
                        {activeTab === 'akun' && (
                            <div className="space-y-6">
                                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                    <i className="fas fa-user-cog text-green-600"></i>
                                    Pengaturan Akun
                                </h3>

                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="font-medium text-gray-800">Keluar dari Akun</h4>
                                            <p className="text-sm text-gray-500">Akhiri sesi dan kembali ke halaman login</p>
                                        </div>
                                        <button
                                            onClick={handleLogout}
                                            disabled={logoutLoading}
                                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50"
                                        >
                                            {logoutLoading ? (
                                                <><i className="fas fa-spinner fa-spin mr-2"></i>Keluar...</>
                                            ) : (
                                                <><i className="fas fa-sign-out-alt mr-2"></i>Keluar</>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="font-medium text-gray-800">Hapus Cache Browser</h4>
                                            <p className="text-sm text-gray-500">Bersihkan data cache aplikasi</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                localStorage.clear();
                                                sessionStorage.clear();
                                                window.location.reload();
                                            }}
                                            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                                        >
                                            <i className="fas fa-broom mr-2"></i>
                                            Hapus Cache
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tentang Tab */}
                        {activeTab === 'tentang' && (
                            <div className="space-y-6">
                                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                    <i className="fas fa-info-circle text-green-600"></i>
                                    Tentang Aplikasi
                                </h3>

                                <div className="text-center py-8">
                                    <div className="bg-gradient-to-br from-green-400 to-green-600 rounded-2xl w-20 h-20 flex items-center justify-center mx-auto mb-4 shadow-lg">
                                        <i className="fas fa-school text-white text-3xl"></i>
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-800">SIMAKA</h2>
                                    <p className="text-gray-500 text-sm">Sistem Informasi MA Al-Hikam</p>
                                    <p className="text-gray-400 text-xs mt-1">Versi 1.0.0</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {[
                                        { icon: 'fa-code', title: 'Framework', desc: 'Laravel + React' },
                                        { icon: 'fa-database', title: 'Database', desc: 'MySQL' },
                                        { icon: 'fa-paint-brush', title: 'Styling', desc: 'Tailwind CSS' },
                                        { icon: 'fa-shield-alt', title: 'Auth', desc: 'Laravel Sanctum' },
                                    ].map((item, idx) => (
                                        <div key={idx} className="p-4 bg-gray-50 rounded-lg text-center">
                                            <i className={`fas ${item.icon} text-green-600 text-2xl mb-2`}></i>
                                            <h4 className="font-medium text-gray-800 text-sm">{item.title}</h4>
                                            <p className="text-gray-500 text-xs">{item.desc}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="text-center text-sm text-gray-400 pt-4 border-t border-gray-100">
                                    <p>© 2026 MA Al-Hikam. All rights reserved.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Confirmation Modal */}
            {showConfirmModal && ReactDOM.createPortal(
                <div
                    className={`fixed inset-0 bg-white/25 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 transition-all duration-300 ease-out ${isClosing ? 'opacity-0' : 'opacity-100'}`}
                    onClick={closeConfirmModal}
                >
                    <div
                        className={`bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden ${isClosing ? 'animate-slideDown' : 'animate-slideUp'}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={`p-5 ${pendingUnlockValue ? 'bg-amber-500' : 'bg-green-500'}`}>
                            <div className="flex items-center gap-3 text-white">
                                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                                    <i className={`fas ${pendingUnlockValue ? 'fa-unlock' : 'fa-lock'} text-2xl`}></i>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold">
                                        {pendingUnlockValue ? 'Buka Kunci Absensi?' : 'Kunci Absensi?'}
                                    </h3>
                                    <p className="text-sm text-white/80">Konfirmasi perubahan pengaturan</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-5">
                            <div className="space-y-3 mb-5">
                                <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <i className="fas fa-exclamation-circle text-red-500 mt-0.5"></i>
                                    <div className="text-sm text-red-700">
                                        <strong>Peringatan Penting!</strong>
                                        <p className="mt-1">
                                            {pendingUnlockValue
                                                ? 'Membuka kunci akan memungkinkan SEMUA guru mengisi absensi untuk jadwal yang sudah terlewat.'
                                                : 'Mengunci akan membatasi guru hanya bisa absensi pada jadwal yang aktif hari ini.'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="text-center mb-5">
                                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${canConfirm ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {canConfirm ? (
                                        <><i className="fas fa-check-circle"></i><span>Anda dapat mengkonfirmasi sekarang</span></>
                                    ) : (
                                        <><i className="fas fa-clock"></i><span>Tunggu {countdown} detik untuk konfirmasi</span></>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={closeConfirmModal}
                                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                                >
                                    <i className="fas fa-times mr-2"></i>Batal
                                </button>
                                <button
                                    onClick={handleConfirmUnlock}
                                    disabled={!canConfirm}
                                    className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${canConfirm
                                        ? pendingUnlockValue
                                            ? 'bg-amber-500 text-white hover:bg-amber-600'
                                            : 'bg-green-500 text-white hover:bg-green-600'
                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                        }`}
                                >
                                    {canConfirm ? (
                                        <><i className={`fas ${pendingUnlockValue ? 'fa-unlock' : 'fa-lock'} mr-2`}></i>Konfirmasi</>
                                    ) : (
                                        <><span className="inline-flex items-center justify-center w-6 h-6 bg-gray-300 rounded-full text-gray-500 text-sm mr-2">{countdown}</span>Konfirmasi</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

export default Pengaturan;
