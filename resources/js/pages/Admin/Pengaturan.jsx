﻿import React, { useState, useEffect, useRef } from 'react';
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

    // AI / Gemini settings
    const [geminiApiKey, setGeminiApiKey] = useState('');
    const [showApiKey, setShowApiKey] = useState(false);
    const [savingApiKey, setSavingApiKey] = useState(false);

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

    // WhatsApp state
    const [waStatus, setWaStatus] = useState({ configured: false, sender: '', url: false });
    const [waLoading, setWaLoading] = useState(false);
    const [waTestNumbers, setWaTestNumbers] = useState({});
    const [waTestSending, setWaTestSending] = useState({});
    const [waTestResults, setWaTestResults] = useState({});
    const [waSchedule, setWaSchedule] = useState({
        wa_schedule_time: '06:30',
        wa_recap_time: '13:30',
        wa_activity_report_time: '18:00',
        wa_meeting_invite_time: '07:00',
        wa_absen_reminder_delay: 30,
    });
    const [waScheduleLoading, setWaScheduleLoading] = useState(false);
    const [waScheduleSaving, setWaScheduleSaving] = useState(false);
    const kopInputRef = useRef(null);

    // Mobile layout state
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [mobileActiveSection, setMobileActiveSection] = useState(null);
    const [mobileSearch, setMobileSearch] = useState('');

    // Confirmation modal state
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [pendingUnlockValue, setPendingUnlockValue] = useState(null);
    const [countdown, setCountdown] = useState(5);
    const [canConfirm, setCanConfirm] = useState(false);

    // Fetch server settings on mount
    useEffect(() => {
        fetchServerSettings();
        fetchWaStatus();
        fetchWaScheduleSettings();
    }, []);

    // Mobile resize listener
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
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

                // Set Gemini API key
                setGeminiApiKey(data.data.gemini_api_key?.value || '');

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

    // WhatsApp functions
    const fetchWaStatus = async () => {
        setWaLoading(true);
        try {
            const response = await authFetch(`${API_BASE}/whatsapp/status`);
            const data = await response.json();
            if (data.success) {
                setWaStatus(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch WA status:', error);
        } finally {
            setWaLoading(false);
        }
    };

    const fetchWaScheduleSettings = async () => {
        setWaScheduleLoading(true);
        try {
            const response = await authFetch(`${API_BASE}/whatsapp/schedule-settings`);
            const data = await response.json();
            if (data.success) {
                setWaSchedule(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch WA schedule settings:', error);
        } finally {
            setWaScheduleLoading(false);
        }
    };

    const saveWaScheduleSettings = async () => {
        setWaScheduleSaving(true);
        try {
            const response = await authFetch(`${API_BASE}/whatsapp/schedule-settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(waSchedule),
            });
            const data = await response.json();
            if (data.success) {
                Swal.fire({ icon: 'success', title: 'Berhasil', text: data.message, timer: 2000 });
            } else {
                Swal.fire({ icon: 'error', title: 'Gagal', text: data.message });
            }
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Gagal menyimpan pengaturan' });
        } finally {
            setWaScheduleSaving(false);
        }
    };

    const handleTestTemplate = async (type) => {
        const number = waTestNumbers[type];
        if (!number || number.length < 10) {
            Swal.fire({ icon: 'warning', title: 'Perhatian', text: 'Masukkan nomor tujuan yang valid (min 10 digit)' });
            return;
        }
        setWaTestSending(prev => ({ ...prev, [type]: true }));
        setWaTestResults(prev => ({ ...prev, [type]: null }));
        try {
            const response = await authFetch(`${API_BASE}/whatsapp/send-test-template`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, number }),
            });
            const data = await response.json();
            setWaTestResults(prev => ({ ...prev, [type]: data }));
            if (data.success) {
                Swal.fire({ icon: 'success', title: 'Terkirim!', text: 'Pesan test berhasil dikirim', timer: 2000, showConfirmButton: false });
            }
        } catch (error) {
            setWaTestResults(prev => ({ ...prev, [type]: { success: false, message: 'Error: ' + error.message } }));
        } finally {
            setWaTestSending(prev => ({ ...prev, [type]: false }));
        }
    };

    const tabs = [
        { id: 'lembaga', label: 'Lembaga', icon: 'fa-building' },
        { id: 'absensi', label: 'Absensi', icon: 'fa-clipboard-check' },
        { id: 'whatsapp', label: 'WhatsApp', icon: 'fab fa-whatsapp' },
        { id: 'ai', label: 'AI / Gemini', icon: 'fa-robot' },
        { id: 'tampilan', label: 'Tampilan', icon: 'fa-palette' },
        { id: 'notifikasi', label: 'Notifikasi', icon: 'fa-bell' },
        { id: 'akun', label: 'Akun', icon: 'fa-user-cog' },
        { id: 'tentang', label: 'Tentang', icon: 'fa-info-circle' },
    ];

    // Grouped sections for mobile Instagram-style layout
    const mobileSections = [
        {
            title: 'Pengaturan Sekolah',
            items: [
                { id: 'lembaga', label: 'Informasi Lembaga', subtitle: 'Nama, logo, kop surat', icon: 'fa-building' },
                { id: 'absensi', label: 'Absensi', subtitle: 'Token, validasi kehadiran', icon: 'fa-clipboard-check' },
            ]
        },
        {
            title: 'Integrasi',
            items: [
                { id: 'whatsapp', label: 'WhatsApp', subtitle: 'Notifikasi, jadwal pesan', icon: 'fab fa-whatsapp' },
                { id: 'ai', label: 'AI / Gemini', subtitle: 'API key, fitur AI', icon: 'fa-robot' },
            ]
        },
        {
            title: 'Preferensi',
            items: [
                { id: 'tampilan', label: 'Tampilan', subtitle: 'Dark mode, sidebar', icon: 'fa-palette' },
                { id: 'notifikasi', label: 'Notifikasi', subtitle: 'Email, browser, push', icon: 'fa-bell' },
            ]
        },
        {
            title: 'Lainnya',
            items: [
                { id: 'akun', label: 'Akun', subtitle: 'Password, logout', icon: 'fa-user-cog' },
                { id: 'tentang', label: 'Tentang Aplikasi', subtitle: 'Versi, developer', icon: 'fa-info-circle' },
            ]
        },
    ];


    // On mobile, use mobileActiveSection as the effective tab
    const effectiveTab = isMobile && mobileActiveSection ? mobileActiveSection : activeTab;

    // Search-filtered mobile sections
    const filteredSections = mobileSearch
        ? mobileSections.map(section => ({
            ...section,
            items: section.items.filter(item =>
                item.label.toLowerCase().includes(mobileSearch.toLowerCase()) ||
                item.subtitle.toLowerCase().includes(mobileSearch.toLowerCase())
            )
        })).filter(section => section.items.length > 0)
        : mobileSections;

    // Shared tab content renderer - used by BOTH mobile accordion and desktop
    const renderTabContent = (tabId) => {
        switch (tabId) {
            case 'lembaga':
                return (
                    <div className="space-y-6">
                        {loadingServerSettings ? (
                            <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-10 w-10 border-4 border-green-500 border-t-transparent mx-auto"></div>
                                <p className="text-gray-500 mt-2 text-sm">Memuat pengaturan...</p>
                            </div>
                        ) : (
                            <>
                                {/* Logo & Nama */}
                                <div className={`grid ${isMobile ? 'grid-cols-1' : 'md:grid-cols-3'} gap-6`}>
                                    {/* Logo Upload */}
                                    <div className="md:col-span-1">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Logo Lembaga</label>
                                        <div className="relative">
                                            <div
                                                onClick={() => logoInputRef.current?.click()}
                                                className="w-full aspect-square border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-green-500 hover:bg-green-50 transition-all"
                                            >
                                                {institutionData.logo_lembaga ? (
                                                    <img src={`/storage/${institutionData.logo_lembaga}`} alt="Logo" className="w-full h-full object-contain p-4" />
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
                                            <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1">Menjadi logo website & OG Image</p>
                                    </div>

                                    {/* Nama & Moto */}
                                    <div className="md:col-span-2 space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lembaga</label>
                                            <input type="text" value={institutionData.nama_lembaga} onChange={(e) => handleInstitutionChange('nama_lembaga', e.target.value)}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" placeholder="Nama Madrasah/Sekolah" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Moto Lembaga
                                                <span className="text-xs text-gray-400 ml-2">(Meta Description & OG Tag)</span>
                                            </label>
                                            <textarea value={institutionData.moto_lembaga} onChange={(e) => handleInstitutionChange('moto_lembaga', e.target.value)}
                                                rows={2} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" placeholder="Moto atau tagline lembaga" />
                                        </div>
                                    </div>
                                </div>

                                {/* Kontak */}
                                <div className="border-t border-gray-100 pt-6">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                        <i className="fas fa-address-card text-blue-500"></i>
                                        Informasi Kontak
                                    </h4>
                                    <div className={`grid ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2'} gap-4`}>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
                                            <textarea value={institutionData.alamat_lembaga} onChange={(e) => handleInstitutionChange('alamat_lembaga', e.target.value)}
                                                rows={2} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm" />
                                        </div>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Telepon</label>
                                                <input type="text" value={institutionData.telepon_lembaga} onChange={(e) => handleInstitutionChange('telepon_lembaga', e.target.value)}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                                <input type="email" value={institutionData.email_lembaga} onChange={(e) => handleInstitutionChange('email_lembaga', e.target.value)}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Kop Surat */}
                                <div className="border-t border-gray-100 pt-6">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                        <i className="fas fa-file-alt text-purple-500"></i>
                                        Kop Surat
                                        <span className="text-xs text-gray-400 font-normal ml-2">Untuk dokumen resmi dan cetak surat</span>
                                    </h4>
                                    <div className={`grid ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2'} gap-6`}>
                                        {/* Kop Image Upload */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Gambar Kop Surat (Opsional)</label>
                                            <div
                                                onClick={() => kopInputRef.current?.click()}
                                                className="w-full h-32 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-all relative"
                                            >
                                                {institutionData.kop_image ? (
                                                    <img src={`/storage/${institutionData.kop_image}`} alt="Kop" className="h-full object-contain" />
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
                                            <input ref={kopInputRef} type="file" accept="image/*" onChange={handleKopUpload} className="hidden" />
                                            <p className="text-xs text-gray-400 mt-1">Jika ada gambar, akan menggantikan teks kop</p>
                                        </div>

                                        {/* Kop Text Fields */}
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">Baris 1 (Yayasan)</label>
                                                <input type="text" value={institutionData.kop_surat.baris_1} onChange={(e) => handleKopChange('baris_1', e.target.value)}
                                                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">Baris 2 (Nama Lembaga)</label>
                                                <input type="text" value={institutionData.kop_surat.baris_2} onChange={(e) => handleKopChange('baris_2', e.target.value)}
                                                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">Baris 3 (Akreditasi/Status)</label>
                                                <input type="text" value={institutionData.kop_surat.baris_3} onChange={(e) => handleKopChange('baris_3', e.target.value)}
                                                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Save Button */}
                                <div className={`flex ${isMobile ? 'flex-col gap-3' : 'justify-between items-center'} pt-4 border-t border-gray-100`}>
                                    <button onClick={() => navigate('/pergantian-tahun')}
                                        className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2">
                                        <i className="fas fa-calendar-plus"></i> Pergantian Tahun Ajaran
                                    </button>
                                    <button onClick={handleSaveInstitution} disabled={savingInstitution}
                                        className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50">
                                        {savingInstitution ? (<><i className="fas fa-spinner fa-spin mr-2"></i>Menyimpan...</>) : (<><i className="fas fa-save mr-2"></i>Simpan Pengaturan</>)}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                );

            case 'absensi':
                return (
                    <div className="space-y-6">
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
                                    <input type="checkbox" checked={unlockAllAttendance} onChange={(e) => openConfirmModal(e.target.checked)}
                                        disabled={loadingServerSettings || savingUnlock} className="sr-only peer" />
                                    <div className={`w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-amber-500 ${savingUnlock ? 'opacity-50' : ''}`}></div>
                                    {savingUnlock && <i className="fas fa-spinner fa-spin ml-2 text-amber-600"></i>}
                                </label>
                            </div>
                        </div>

                        {/* Info Box */}
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <h4 className="font-medium text-blue-800 flex items-center gap-2 mb-2">
                                <i className="fas fa-info-circle"></i> Informasi Kunci Absensi
                            </h4>
                            <ul className="text-sm text-blue-700 space-y-1">
                                <li className="flex items-start gap-2"><i className="fas fa-check text-blue-500 mt-0.5"></i><span>Ketika <strong>terkunci</strong> (default): Guru hanya bisa absensi sesuai jadwal yang aktif (hari ini)</span></li>
                                <li className="flex items-start gap-2"><i className="fas fa-check text-blue-500 mt-0.5"></i><span>Ketika <strong>terbuka</strong>: Guru dapat mengisi absensi untuk jadwal yang sudah terlewat</span></li>
                                <li className="flex items-start gap-2"><i className="fas fa-check text-blue-500 mt-0.5"></i><span>Berlaku untuk: Absensi Mengajar, Kegiatan, dan Rapat</span></li>
                            </ul>
                        </div>
                    </div>
                );

            case 'whatsapp':
                return (
                    <div className="space-y-6">
                        {/* Status Card */}
                        <div className={`p-4 rounded-lg border ${waStatus.configured ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${waStatus.configured ? 'bg-green-500' : 'bg-red-500'}`}>
                                        <i className={`fas ${waStatus.configured ? 'fa-check' : 'fa-times'} text-white`}></i>
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-gray-800">{waStatus.configured ? 'MPWA Terkonfigurasi' : 'MPWA Belum Dikonfigurasi'}</h4>
                                        <p className="text-sm text-gray-500">
                                            {waStatus.configured ? `Sender: ${waStatus.sender}` : 'Periksa MPWA_URL, MPWA_API_KEY, dan MPWA_SENDER di file .env'}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={fetchWaStatus} disabled={waLoading} className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm transition-colors">
                                    {waLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-sync-alt"></i>}
                                </button>
                            </div>
                        </div>

                        {/* Configuration Info */}
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <h4 className="font-medium text-blue-800 flex items-center gap-2 mb-2">
                                <i className="fas fa-info-circle"></i> Konfigurasi MPWA
                            </h4>
                            <div className="text-sm text-blue-700 space-y-1">
                                <p>Konfigurasi WhatsApp diatur melalui file <code className="bg-blue-100 px-1.5 py-0.5 rounded text-xs">.env</code> di server:</p>
                                <ul className="ml-4 mt-2 space-y-1">
                                    <li className="flex items-center gap-2"><code className="bg-blue-100 px-1.5 py-0.5 rounded text-xs">MPWA_URL</code><span>- URL endpoint MPWA</span></li>
                                    <li className="flex items-center gap-2"><code className="bg-blue-100 px-1.5 py-0.5 rounded text-xs">MPWA_API_KEY</code><span>- API Key dari MPWA</span></li>
                                    <li className="flex items-center gap-2"><code className="bg-blue-100 px-1.5 py-0.5 rounded text-xs">MPWA_SENDER</code><span>- Nomor pengirim (format 62xxx)</span></li>
                                </ul>
                            </div>
                        </div>

                        {/* Schedule Settings Section */}
                        <div className="border-t border-gray-100 pt-6">
                            <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                <i className="fas fa-clock text-blue-500"></i> Jadwal Notifikasi Otomatis
                            </h4>
                            <p className="text-xs text-gray-500 mb-4">Atur waktu pengiriman notifikasi otomatis ke grup dan guru personal. Perubahan berlaku setelah disimpan.</p>

                            {waScheduleLoading ? (
                                <div className="text-center py-4"><i className="fas fa-spinner fa-spin text-gray-400"></i></div>
                            ) : (
                                <div className="space-y-3">
                                    <div className={`grid grid-cols-1 ${isMobile ? '' : 'md:grid-cols-2'} gap-4`}>
                                        {[
                                            { key: 'jadwal_harian', type: 'jadwal_harian', label: 'Jadwal Harian (Grup)', icon: 'fa-calendar-day', iconColor: 'text-blue-500', timeKey: 'wa_schedule_time', desc: 'Kirim daftar jadwal mengajar hari ini' },
                                            { key: 'rekap_absensi', type: 'rekap_absensi', label: 'Rekap Absensi (Grup)', icon: 'fa-chart-bar', iconColor: 'text-green-500', timeKey: 'wa_recap_time', desc: 'Kirim rekap siapa yang sudah/belum absen' },
                                            { key: 'laporan_kegiatan', type: 'laporan_kegiatan', label: 'Laporan Kegiatan/Rapat (Grup)', icon: 'fa-clipboard-list', iconColor: 'text-purple-500', timeKey: 'wa_activity_report_time', desc: 'Kirim hasil kegiatan & rapat hari ini' },
                                            { key: 'undangan_rapat', type: 'undangan_rapat', label: 'Undangan & Pengingat Rapat (Grup)', icon: 'fa-bullhorn', iconColor: 'text-orange-500', timeKey: 'wa_meeting_invite_time', desc: 'Kirim undangan H-2 dan pengingat hari H' },
                                        ].map(section => (
                                            <div key={section.key} className="p-3 bg-gray-50 rounded-lg space-y-2">
                                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                                    <i className={`fas ${section.icon} ${section.iconColor} mr-1`}></i> {section.label}
                                                </label>
                                                <input type="time" value={waSchedule[section.timeKey]} onChange={(e) => setWaSchedule({ ...waSchedule, [section.timeKey]: e.target.value })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500" />
                                                <p className="text-xs text-gray-400">{section.desc}</p>
                                                <div className="flex items-center gap-2 pt-1 border-t border-gray-200 mt-2">
                                                    <input type="text" placeholder="08xx / 62xx" value={waTestNumbers[section.type] || ''}
                                                        onChange={(e) => setWaTestNumbers(prev => ({ ...prev, [section.type]: e.target.value }))}
                                                        className="flex-1 px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-green-500" />
                                                    <button onClick={() => handleTestTemplate(section.type)}
                                                        disabled={waTestSending[section.type] || !waStatus.configured || !waTestNumbers[section.type]}
                                                        className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap">
                                                        {waTestSending[section.type] ? <><i className="fas fa-spinner fa-spin"></i></> : <><i className="fab fa-whatsapp"></i> Test</>}
                                                    </button>
                                                </div>
                                                {waTestResults[section.type] && (
                                                    <p className={`text-xs mt-1 ${waTestResults[section.type].success ? 'text-green-600' : 'text-red-500'}`}>
                                                        <i className={`fas ${waTestResults[section.type].success ? 'fa-check-circle' : 'fa-times-circle'} mr-1`}></i>
                                                        {waTestResults[section.type].success ? 'Terkirim!' : waTestResults[section.type].message}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                                        <label className="block text-xs font-medium text-gray-600 mb-1"><i className="fas fa-stopwatch text-red-500 mr-1"></i> Delay Reminder Absen (Personal)</label>
                                        <div className="flex items-center gap-2">
                                            <input type="number" min="5" max="120" value={waSchedule.wa_absen_reminder_delay}
                                                onChange={(e) => setWaSchedule({ ...waSchedule, wa_absen_reminder_delay: parseInt(e.target.value) || 30 })}
                                                className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500" />
                                            <span className="text-sm text-gray-500">menit setelah jam mulai</span>
                                        </div>
                                        <p className="text-xs text-gray-400">Kirim reminder ke HP guru jika belum absen</p>
                                        <div className="flex items-center gap-2 pt-1 border-t border-gray-200 mt-2">
                                            <input type="text" placeholder="08xx / 62xx" value={waTestNumbers['reminder_absen'] || ''}
                                                onChange={(e) => setWaTestNumbers(prev => ({ ...prev, reminder_absen: e.target.value }))}
                                                className="flex-1 px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-green-500" />
                                            <button onClick={() => handleTestTemplate('reminder_absen')}
                                                disabled={waTestSending['reminder_absen'] || !waStatus.configured || !waTestNumbers['reminder_absen']}
                                                className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap">
                                                {waTestSending['reminder_absen'] ? <><i className="fas fa-spinner fa-spin"></i></> : <><i className="fab fa-whatsapp"></i> Test</>}
                                            </button>
                                        </div>
                                        {waTestResults['reminder_absen'] && (
                                            <p className={`text-xs mt-1 ${waTestResults['reminder_absen'].success ? 'text-green-600' : 'text-red-500'}`}>
                                                <i className={`fas ${waTestResults['reminder_absen'].success ? 'fa-check-circle' : 'fa-times-circle'} mr-1`}></i>
                                                {waTestResults['reminder_absen'].success ? 'Terkirim!' : waTestResults['reminder_absen'].message}
                                            </p>
                                        )}
                                    </div>
                                    <button onClick={saveWaScheduleSettings} disabled={waScheduleSaving}
                                        className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 flex items-center gap-2">
                                        {waScheduleSaving ? (<><i className="fas fa-spinner fa-spin"></i>Menyimpan...</>) : (<><i className="fas fa-save"></i>Simpan Jadwal</>)}
                                    </button>
                                </div>
                            )}
                        </div>

                    </div>
                );

            case 'tampilan':
                return (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div>
                                <h4 className="font-medium text-gray-800">Sidebar Compact</h4>
                                <p className="text-sm text-gray-500">Sidebar default dalam mode compact</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={settings.sidebarCollapsed} onChange={(e) => handleSettingChange('sidebarCollapsed', e.target.checked)} className="sr-only peer" />
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
                                    <input type="checkbox" checked={settings.darkMode} onChange={(e) => handleSettingChange('darkMode', e.target.checked)} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                </label>
                            </div>
                        </div>
                    </div>
                );

            case 'notifikasi':
                return (
                    <div className="space-y-6">
                        <div className="space-y-4">
                            {['Notifikasi Browser', 'Notifikasi Kegiatan', 'Notifikasi Rapat'].map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <div>
                                        <h4 className="font-medium text-gray-800">{item}</h4>
                                        <p className="text-sm text-gray-500">
                                            {idx === 0 ? 'Terima notifikasi di browser' : idx === 1 ? 'Pengingat kegiatan yang akan datang' : 'Pengingat rapat yang dijadwalkan'}
                                        </p>
                                    </div>
                                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">Coming Soon</span>
                                </div>
                            ))}
                        </div>
                    </div>
                );

            case 'akun':
                return (
                    <div className="space-y-6">
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-medium text-gray-800">Keluar dari Akun</h4>
                                    <p className="text-sm text-gray-500">Akhiri sesi dan kembali ke halaman login</p>
                                </div>
                                <button onClick={handleLogout} disabled={logoutLoading}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50">
                                    {logoutLoading ? (<><i className="fas fa-spinner fa-spin mr-2"></i>Keluar...</>) : (<><i className="fas fa-sign-out-alt mr-2"></i>Keluar</>)}
                                </button>
                            </div>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-medium text-gray-800">Hapus Cache Browser</h4>
                                    <p className="text-sm text-gray-500">Bersihkan data cache aplikasi</p>
                                </div>
                                <button onClick={() => { localStorage.clear(); sessionStorage.clear(); window.location.reload(); }}
                                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium">
                                    <i className="fas fa-broom mr-2"></i>Hapus Cache
                                </button>
                            </div>
                        </div>
                    </div>
                );

            case 'tentang':
                return (
                    <div className="space-y-6">
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
                            <p>Â© 2026 MA Al-Hikam. All rights reserved.</p>
                        </div>
                    </div>
                );

            case 'ai':
                return (
                    <div className="space-y-6">
                        {/* Status */}
                        <div className={`p-4 rounded-lg ${geminiApiKey ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${geminiApiKey ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                                <span className={`text-sm font-medium ${geminiApiKey ? 'text-green-700' : 'text-gray-500'}`}>
                                    {geminiApiKey ? 'API Key terkonfigurasi' : 'API Key belum diatur'}
                                </span>
                            </div>
                        </div>
                        {/* API Key Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Gemini API Key</label>
                            <div className="relative">
                                <input type={showApiKey ? 'text' : 'password'} value={geminiApiKey} onChange={(e) => setGeminiApiKey(e.target.value)}
                                    className="w-full px-4 py-2.5 pr-20 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm font-mono" placeholder="AIzaSy..." />
                                <button type="button" onClick={() => setShowApiKey(!showApiKey)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs text-gray-500 hover:text-gray-700 transition-colors">
                                    <i className={`fas ${showApiKey ? 'fa-eye-slash' : 'fa-eye'} mr-1`}></i>{showApiKey ? 'Sembunyikan' : 'Tampilkan'}
                                </button>
                            </div>
                            <p className="text-xs text-gray-400 mt-2">
                                Dapatkan API key dari <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">Google AI Studio</a>
                            </p>
                        </div>
                        {/* Save Button */}
                        <div className="flex justify-end pt-2 border-t border-gray-100">
                            <button
                                onClick={async () => {
                                    setSavingApiKey(true);
                                    try {
                                        const ok = await saveInstitutionSetting('gemini_api_key', geminiApiKey);
                                        if (ok) { Swal.fire({ icon: 'success', title: 'Berhasil', text: 'API Key Gemini berhasil disimpan', timer: 1500, showConfirmButton: false }); }
                                        else { Swal.fire({ icon: 'error', title: 'Gagal', text: 'Gagal menyimpan API Key' }); }
                                    } catch { Swal.fire({ icon: 'error', title: 'Error', text: 'Terjadi kesalahan' }); }
                                    finally { setSavingApiKey(false); }
                                }}
                                disabled={savingApiKey}
                                className="px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50">
                                {savingApiKey ? (<><i className="fas fa-spinner fa-spin mr-2"></i>Menyimpan...</>) : (<><i className="fas fa-save mr-2"></i>Simpan API Key</>)}
                            </button>
                        </div>
                        {/* Info Box */}
                        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                            <h4 className="font-medium text-purple-800 flex items-center gap-2 mb-2"><i className="fas fa-info-circle"></i> Tentang Integrasi AI</h4>
                            <ul className="text-sm text-purple-700 space-y-1">
                                <li className="flex items-start gap-2"><i className="fas fa-check text-purple-500 mt-0.5"></i><span>AI akan digunakan untuk <strong>membaca undangan</strong> dan auto-fill data surat</span></li>
                                <li className="flex items-start gap-2"><i className="fas fa-check text-purple-500 mt-0.5"></i><span>Membantu <strong>generate konten surat</strong> dari template dan laporan</span></li>
                                <li className="flex items-start gap-2"><i className="fas fa-check text-purple-500 mt-0.5"></i><span>API key disimpan secara aman di server</span></li>
                            </ul>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    // Confirmation modal (shared between mobile/desktop)
    const confirmationModal = showConfirmModal && ReactDOM.createPortal(
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
                            <h3 className="text-lg font-bold">{pendingUnlockValue ? 'Buka Kunci Absensi?' : 'Kunci Absensi?'}</h3>
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
                        <button onClick={closeConfirmModal} className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium">
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
    );

    // ======================== MOBILE VIEW ========================
    if (isMobile) {
        return (
            <div className="animate-fadeIn">
                {/* Search bar */}
                <div className="relative mb-4">
                    <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                    <input
                        type="text"
                        placeholder="Cari pengaturan..."
                        value={mobileSearch}
                        onChange={(e) => setMobileSearch(e.target.value)}
                        className="w-full pl-9 pr-9 py-2.5 bg-gray-100 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white border border-transparent focus:border-green-300 transition-all"
                    />
                    {mobileSearch && (
                        <button onClick={() => setMobileSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            <i className="fas fa-times text-xs"></i>
                        </button>
                    )}
                </div>

                {filteredSections.length === 0 && (
                    <div className="text-center py-12">
                        <i className="fas fa-search text-gray-300 text-3xl mb-3"></i>
                        <p className="text-gray-400 text-sm">Tidak ada pengaturan yang cocok</p>
                    </div>
                )}

                <div className="space-y-5">
                    {filteredSections.map((section) => (
                        <div key={section.title}>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">{section.title}</p>
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                {section.items.map((item, idx) => (
                                    <div key={item.id}>
                                        <button
                                            onClick={() => setMobileActiveSection(prev => prev === item.id ? null : item.id)}
                                            className={`w-full flex items-center gap-3.5 px-4 py-3.5 text-left transition-colors ${mobileActiveSection === item.id ? 'bg-green-50' : 'hover:bg-gray-50 active:bg-gray-100'
                                                } ${idx > 0 ? 'border-t border-gray-50' : ''}`}
                                        >
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${mobileActiveSection === item.id ? 'bg-green-100' : 'bg-gray-100'
                                                }`}>
                                                <i className={`${item.icon.startsWith('fab') ? '' : 'fas '}${item.icon} ${mobileActiveSection === item.id ? 'text-green-600' : 'text-gray-500'
                                                    } text-sm`}></i>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-semibold ${mobileActiveSection === item.id ? 'text-green-700' : 'text-gray-800'}`}>{item.label}</p>
                                                <p className="text-[11px] text-gray-400 mt-0.5">{item.subtitle}</p>
                                            </div>
                                            <i className={`fas fa-chevron-down text-gray-300 text-xs transition-transform duration-200 ${mobileActiveSection === item.id ? 'rotate-180 !text-green-500' : ''
                                                }`}></i>
                                        </button>

                                        {/* Expanded content */}
                                        {mobileActiveSection === item.id && (
                                            <div className="border-t border-gray-100 px-4 py-4 bg-gray-50/50 animate-fadeIn">
                                                {renderTabContent(item.id)}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {confirmationModal}
            </div>
        );
    }

    // ======================== DESKTOP VIEW ========================
    return (
        <div className="animate-fadeIn">
            <header className="mb-6">
                <h1 className="text-[#1f2937] font-semibold text-xl mb-1">Pengaturan</h1>
                <p className="text-[12px] text-[#6b7280]">Konfigurasi sistem dan preferensi aplikasi</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Sidebar */}
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
                                <i className={`${tab.icon.startsWith('fab') ? '' : 'fas '}${tab.icon} w-5`}></i>
                                <span className="text-sm">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Area */}
                <div className="lg:col-span-3">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        {/* Tab header */}
                        {tabs.find(t => t.id === activeTab) && (
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-6">
                                <i className={`${tabs.find(t => t.id === activeTab).icon.startsWith('fab') ? '' : 'fas '}${tabs.find(t => t.id === activeTab).icon} text-green-600`}></i>
                                {tabs.find(t => t.id === activeTab).label}
                            </h3>
                        )}
                        {renderTabContent(activeTab)}
                    </div>
                </div>
            </div>

            {confirmationModal}
        </div>
    );
}

export default Pengaturan;
