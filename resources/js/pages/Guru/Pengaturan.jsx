import React, { useState, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';
import { API_BASE, authFetch } from '../../config/api';
import { isWebAuthnSupported, isPlatformAuthenticatorAvailable, registerCredential, getCredentials, deleteCredentialById } from '../../utils/webauthn';

function Pengaturan() {
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState({
        jadwal: false,
        kegiatan: false,
        rapat: false,
    });
    const [pushSupported, setPushSupported] = useState(false);
    const [currentEndpoint, setCurrentEndpoint] = useState(null);
    const [installPrompt, setInstallPrompt] = useState(null);
    const [showSafariGuide, setShowSafariGuide] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    // WebAuthn state
    const [webauthnSupported] = useState(isWebAuthnSupported());
    const [webauthnCredentials, setWebauthnCredentials] = useState([]);
    const [webauthnLoading, setWebauthnLoading] = useState(false);

    // Helper: Convert VAPID key from base64url to Uint8Array
    const urlBase64ToUint8Array = (base64String) => {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    };

    // Load push subscription status on mount
    useEffect(() => {
        const init = async () => {
            // Check if push is supported
            const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
            setPushSupported(supported);

            if (supported) {
                try {
                    const reg = await navigator.serviceWorker.ready;
                    const sub = await reg.pushManager.getSubscription();
                    if (sub) {
                        setCurrentEndpoint(sub.endpoint);
                        // Fetch preferences from backend
                        const res = await authFetch(`${API_BASE}/guru-panel/push/status?endpoint=${encodeURIComponent(sub.endpoint)}`);
                        const data = await res.json();
                        if (data.success && data.subscribed) {
                            setNotifications(data.preferences || { jadwal: true, kegiatan: true, rapat: true });
                        }
                    }
                } catch (err) {
                    console.error('Error loading push status:', err);
                }
            }

            setLoading(false);
        };
        init();

        // Load WebAuthn credentials
        if (webauthnSupported) {
            loadWebAuthnCredentials();
        }
    }, []);

    const loadWebAuthnCredentials = async () => {
        try {
            const token = localStorage.getItem('auth_token');
            if (!token) return;
            const creds = await getCredentials(token);
            setWebauthnCredentials(creds);
        } catch (err) {
            console.error('Failed to load WebAuthn credentials:', err);
        }
    };

    const handleRegisterWebAuthn = async () => {
        const token = localStorage.getItem('auth_token');
        if (!token) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Silakan login ulang terlebih dahulu.', confirmButtonColor: '#16a34a' });
            return;
        }

        setWebauthnLoading(true);
        try {
            await registerCredential(token);
            await loadWebAuthnCredentials();
            Swal.fire({
                icon: 'success',
                title: 'Berhasil!',
                text: 'Sidik jari berhasil didaftarkan. Sekarang Anda bisa login tanpa password.',
                timer: 3000,
                showConfirmButton: false,
                customClass: { popup: 'rounded-2xl !max-w-xs', title: '!text-base', htmlContainer: '!text-sm' }
            });
        } catch (err) {
            console.error('WebAuthn registration error:', err);
            const msg = err.name === 'NotAllowedError'
                ? 'Pendaftaran dibatalkan atau timeout.'
                : (err.message || 'Gagal mendaftarkan sidik jari.');
            Swal.fire({ icon: 'error', title: 'Gagal', text: msg, confirmButtonColor: '#16a34a' });
        }
        setWebauthnLoading(false);
    };

    const handleDeleteWebAuthn = async (credId) => {
        const result = await Swal.fire({
            title: 'Hapus Sidik Jari?',
            text: 'Anda tidak bisa login dengan sidik jari ini lagi.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Ya, Hapus',
            cancelButtonText: 'Batal',
            customClass: { popup: 'rounded-2xl !max-w-xs', title: '!text-base', htmlContainer: '!text-sm' }
        });

        if (!result.isConfirmed) return;

        try {
            const token = localStorage.getItem('auth_token');
            await deleteCredentialById(credId, token);
            await loadWebAuthnCredentials();
            Swal.fire({
                icon: 'success',
                title: 'Dihapus!',
                text: 'Sidik jari berhasil dihapus.',
                timer: 2000,
                showConfirmButton: false,
                customClass: { popup: 'rounded-2xl !max-w-xs', title: '!text-base' }
            });
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Gagal', text: 'Gagal menghapus credential.', confirmButtonColor: '#16a34a' });
        }
    };

    // Capture install prompt
    useEffect(() => {
        const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
        setIsStandalone(standalone);

        const handler = (e) => {
            e.preventDefault();
            setInstallPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    // Subscribe to push notifications
    const subscribePush = useCallback(async () => {
        try {
            // Request notification permission
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                Swal.fire({
                    icon: 'warning',
                    title: 'Izin Ditolak',
                    text: 'Anda perlu mengizinkan notifikasi di pengaturan browser untuk mengaktifkan fitur ini.',
                    confirmButtonColor: '#16a34a',
                    customClass: { popup: 'rounded-2xl !max-w-xs', title: '!text-base', htmlContainer: '!text-sm', confirmButton: 'rounded-xl px-4 !text-xs' }
                });
                return null;
            }

            // Get VAPID key from server
            const vapidRes = await authFetch(`${API_BASE}/guru-panel/push/vapid-key`);
            const vapidData = await vapidRes.json();
            if (!vapidData.success) throw new Error('Failed to get VAPID key');

            const reg = await navigator.serviceWorker.ready;
            const subscription = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidData.key),
            });

            const subJson = subscription.toJSON();

            // Send subscription to backend
            const res = await authFetch(`${API_BASE}/guru-panel/push/subscribe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    endpoint: subJson.endpoint,
                    keys: {
                        p256dh: subJson.keys.p256dh,
                        auth: subJson.keys.auth,
                    },
                    preferences: { jadwal: true, kegiatan: true, rapat: true },
                }),
            });

            const data = await res.json();
            if (data.success) {
                setCurrentEndpoint(subJson.endpoint);
                return subJson.endpoint;
            }
            return null;
        } catch (err) {
            console.error('Push subscribe error:', err);
            Swal.fire({
                icon: 'error',
                title: 'Gagal',
                text: 'Tidak dapat mengaktifkan notifikasi. Coba lagi nanti.',
                confirmButtonColor: '#16a34a',
                customClass: { popup: 'rounded-2xl !max-w-xs', title: '!text-base', htmlContainer: '!text-sm', confirmButton: 'rounded-xl px-4 !text-xs' }
            });
            return null;
        }
    }, []);

    // Unsubscribe from push notifications
    const unsubscribePush = useCallback(async (endpoint) => {
        try {
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.getSubscription();
            if (sub) await sub.unsubscribe();

            await authFetch(`${API_BASE}/guru-panel/push/unsubscribe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ endpoint }),
            });

            setCurrentEndpoint(null);
        } catch (err) {
            console.error('Push unsubscribe error:', err);
        }
    }, []);

    // Update preferences on server
    const updatePreferences = useCallback(async (endpoint, prefs) => {
        try {
            await authFetch(`${API_BASE}/guru-panel/push/preferences`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ endpoint, preferences: prefs }),
            });
        } catch (err) {
            console.error('Update preferences error:', err);
        }
    }, []);

    const handleToggle = async (key) => {
        if (!pushSupported) {
            Swal.fire({
                icon: 'info',
                title: 'Tidak Didukung',
                text: 'Browser Anda tidak mendukung push notification. Gunakan Chrome atau Firefox versi terbaru.',
                confirmButtonColor: '#16a34a',
                customClass: { popup: 'rounded-2xl !max-w-xs', title: '!text-base', htmlContainer: '!text-sm', confirmButton: 'rounded-xl px-4 !text-xs' }
            });
            return;
        }

        const newNotifs = { ...notifications, [key]: !notifications[key] };
        const anyEnabled = Object.values(newNotifs).some(v => v);

        if (!currentEndpoint && newNotifs[key]) {
            // First time enabling — subscribe
            const endpoint = await subscribePush();
            if (!endpoint) return;

            setNotifications(newNotifs);
            await updatePreferences(endpoint, newNotifs);
        } else if (currentEndpoint && !anyEnabled) {
            // All disabled — unsubscribe entirely
            setNotifications(newNotifs);
            await unsubscribePush(currentEndpoint);
        } else if (currentEndpoint) {
            // Just update preferences
            setNotifications(newNotifs);
            await updatePreferences(currentEndpoint, newNotifs);
        }

        Swal.fire({
            icon: 'success',
            title: 'Tersimpan',
            text: newNotifs[key] ? 'Notifikasi diaktifkan' : 'Notifikasi dinonaktifkan',
            timer: 1500,
            showConfirmButton: false,
            customClass: {
                popup: 'rounded-2xl !max-w-xs',
                title: '!text-base',
            }
        });
    };

    const showComingSoon = (feature) => {
        Swal.fire({
            icon: 'info',
            title: 'Segera Hadir',
            text: `Fitur ${feature} akan segera tersedia`,
            confirmButtonColor: '#16a34a',
            customClass: {
                popup: 'rounded-2xl !max-w-xs',
                title: '!text-base',
                htmlContainer: '!text-sm',
                confirmButton: 'rounded-xl px-4 !text-xs'
            }
        });
    };

    const settingsSections = [
        {
            title: 'Notifikasi & Pintasan',
            items: [
                {
                    icon: 'fa-calendar-alt',
                    label: 'Jadwal Mengajar',
                    type: 'toggle',
                    key: 'jadwal',
                    description: 'Pengingat jadwal mengajar'
                },
                {
                    icon: 'fa-calendar-check',
                    label: 'Kegiatan',
                    type: 'toggle',
                    key: 'kegiatan',
                    description: 'Notifikasi kegiatan sekolah'
                },
                {
                    icon: 'fa-users',
                    label: 'Rapat',
                    type: 'toggle',
                    key: 'rapat',
                    description: 'Pengingat jadwal rapat'
                },
                // Pintasan Layar items
                ...((!isStandalone && (installPrompt || !isIOS)) ? [{
                    icon: 'fa-mobile-alt',
                    label: 'Pasang Aplikasi',
                    type: 'action',
                    description: 'Tambah pintasan ke layar utama',
                    action: async () => {
                        if (installPrompt) {
                            installPrompt.prompt();
                            const { outcome } = await installPrompt.userChoice;
                            if (outcome === 'accepted') {
                                Swal.fire({ icon: 'success', title: 'Berhasil!', text: 'Aplikasi telah dipasang', timer: 2000, showConfirmButton: false, customClass: { popup: 'rounded-2xl !max-w-xs', title: '!text-base' } });
                            }
                            setInstallPrompt(null);
                        } else {
                            Swal.fire({ icon: 'info', title: 'Petunjuk', text: 'Gunakan menu browser → "Tambahkan ke Layar Utama" atau "Install App"', confirmButtonColor: '#16a34a', customClass: { popup: 'rounded-2xl !max-w-xs', title: '!text-base', htmlContainer: '!text-sm', confirmButton: 'rounded-xl px-4 !text-xs' } });
                        }
                    }
                }] : []),
                ...(isIOS ? [{
                    icon: 'fa-apple-alt',
                    label: 'Panduan iOS (Safari)',
                    type: 'action',
                    description: 'Cara pasang di iPhone / iPad',
                    action: () => setShowSafariGuide(true),
                }] : []),
                ...(isStandalone ? [{
                    icon: 'fa-check-circle',
                    label: 'Aplikasi Terpasang',
                    type: 'info',
                    value: '✓',
                    description: 'Pintasan sudah aktif di layar utama',
                }] : []),
            ].filter(item => item),
        },
        {
            title: 'Tampilan',
            items: [
                { icon: 'fa-moon', label: 'Mode Gelap', type: 'coming-soon', description: 'Tampilan gelap untuk mata' },
                { icon: 'fa-text-height', label: 'Ukuran Font', type: 'coming-soon', description: 'Sesuaikan ukuran teks' },
            ]
        },
        {
            title: 'Privasi & Keamanan',
            items: [
                { icon: 'fa-lock', label: 'Ubah Password', type: 'link', to: '/guru/profil', tab: 'keamanan' },
                ...(webauthnSupported ? [{
                    icon: 'fa-fingerprint',
                    label: 'Login Sidik Jari',
                    type: 'custom',
                    description: webauthnCredentials.length > 0
                        ? `${webauthnCredentials.length} perangkat terdaftar`
                        : 'Daftar untuk login tanpa password',
                    customContent: (
                        <div style={{ padding: '4px 16px 14px' }}>
                            {/* Hero Card */}
                            <div style={{
                                background: 'linear-gradient(135deg, #0f766e 0%, #0e7490 50%, #0369a1 100%)',
                                borderRadius: '16px',
                                padding: '16px',
                                marginBottom: '12px',
                                position: 'relative',
                                overflow: 'hidden',
                            }}>
                                {/* Background decoration */}
                                <div style={{
                                    position: 'absolute', top: '-20px', right: '-20px',
                                    width: '100px', height: '100px', borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.08)', pointerEvents: 'none',
                                }} />
                                <div style={{
                                    position: 'absolute', bottom: '-30px', left: '-10px',
                                    width: '80px', height: '80px', borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.05)', pointerEvents: 'none',
                                }} />

                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', position: 'relative', zIndex: 1 }}>
                                    {/* Animated fingerprint icon */}
                                    <div style={{
                                        width: '52px', height: '52px',
                                        background: 'rgba(255,255,255,0.15)',
                                        borderRadius: '14px', display: 'flex',
                                        alignItems: 'center', justifyContent: 'center',
                                        backdropFilter: 'blur(4px)',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        flexShrink: 0,
                                    }}>
                                        <i className="fas fa-fingerprint" style={{
                                            fontSize: '1.5rem', color: '#fff',
                                        }}></i>
                                    </div>
                                    <div>
                                        <div style={{
                                            color: '#fff', fontWeight: 700, fontSize: '0.9rem',
                                            marginBottom: '2px', letterSpacing: '-0.01em',
                                        }}>
                                            Login Biometrik
                                        </div>
                                        <div style={{
                                            color: 'rgba(255,255,255,0.7)', fontSize: '0.72rem',
                                            lineHeight: 1.4,
                                        }}>
                                            {webauthnCredentials.length > 0
                                                ? 'Login cepat tanpa password aktif ✓'
                                                : 'Scan sidik jari untuk login cepat'}
                                        </div>
                                    </div>
                                </div>

                                {/* Status badge */}
                                <div style={{
                                    marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px',
                                    position: 'relative', zIndex: 1,
                                }}>
                                    <div style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                                        background: webauthnCredentials.length > 0 ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.12)',
                                        borderRadius: '20px', padding: '4px 10px',
                                        fontSize: '0.68rem', color: '#fff', fontWeight: 500,
                                        border: webauthnCredentials.length > 0 ? '1px solid rgba(74,222,128,0.3)' : '1px solid rgba(255,255,255,0.15)',
                                    }}>
                                        <i className={`fas ${webauthnCredentials.length > 0 ? 'fa-shield-alt' : 'fa-info-circle'}`}
                                            style={{ fontSize: '0.6rem' }}></i>
                                        {webauthnCredentials.length > 0
                                            ? `${webauthnCredentials.length} Perangkat Aktif`
                                            : 'Belum Terdaftar'}
                                    </div>
                                </div>
                            </div>

                            {/* Registered credentials list */}
                            {webauthnCredentials.length > 0 && (
                                <div style={{ marginBottom: '10px' }}>
                                    {webauthnCredentials.map((cred, i) => (
                                        <div key={cred.id} style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '10px 12px',
                                            background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)',
                                            borderRadius: '12px',
                                            marginBottom: i < webauthnCredentials.length - 1 ? '6px' : 0,
                                            fontSize: '0.82rem',
                                            border: '1px solid rgba(22, 163, 74, 0.1)',
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{
                                                    width: '32px', height: '32px', borderRadius: '10px',
                                                    background: 'linear-gradient(135deg, #16a34a, #15803d)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    flexShrink: 0,
                                                }}>
                                                    <i className="fas fa-mobile-alt" style={{ color: '#fff', fontSize: '0.75rem' }}></i>
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.82rem' }}>
                                                        {cred.alias || `Perangkat ${i + 1}`}
                                                    </div>
                                                    <div style={{ color: '#94a3b8', fontSize: '0.68rem', marginTop: '1px' }}>
                                                        <i className="fas fa-clock" style={{ marginRight: '4px', fontSize: '0.6rem' }}></i>
                                                        {cred.created_at}
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteWebAuthn(cred.id)}
                                                style={{
                                                    background: '#fef2f2', border: '1px solid rgba(239,68,68,0.15)',
                                                    color: '#ef4444', cursor: 'pointer', padding: '6px 8px',
                                                    fontSize: '0.75rem', borderRadius: '8px',
                                                    transition: 'all 0.2s',
                                                }}
                                            >
                                                <i className="fas fa-trash-alt"></i>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Register button */}
                            <button
                                onClick={handleRegisterWebAuthn}
                                disabled={webauthnLoading}
                                style={{
                                    width: '100%', padding: '12px',
                                    background: webauthnCredentials.length > 0
                                        ? 'linear-gradient(135deg, #6366f1, #4f46e5)'
                                        : 'linear-gradient(135deg, #0891b2, #0e7490)',
                                    color: 'white', border: 'none', borderRadius: '12px', fontSize: '0.83rem',
                                    fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', gap: '8px', opacity: webauthnLoading ? 0.7 : 1,
                                    transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                                    letterSpacing: '-0.01em',
                                }}
                            >
                                {webauthnLoading ? (
                                    <><i className="fas fa-spinner fa-spin"></i> Mendaftarkan...</>
                                ) : (
                                    <><i className="fas fa-fingerprint"></i> {webauthnCredentials.length > 0 ? 'Tambah Perangkat Lain' : 'Daftarkan Sidik Jari'}</>
                                )}
                            </button>
                        </div>
                    ),
                }] : [{
                    icon: 'fa-fingerprint',
                    label: 'Login Sidik Jari',
                    type: 'info',
                    value: 'Tidak didukung',
                    description: 'Browser tidak mendukung WebAuthn'
                }]),
            ]
        },
        {
            title: 'Bantuan',
            items: [
                { icon: 'fa-question-circle', label: 'Pusat Bantuan', type: 'coming-soon' },
                { icon: 'fa-headset', label: 'Hubungi Admin', type: 'coming-soon' },
                { icon: 'fa-bug', label: 'Laporkan Masalah', type: 'coming-soon' },
            ]
        },
        {
            title: 'Tentang',
            items: [
                { icon: 'fa-info-circle', label: 'Tentang Aplikasi', type: 'info', value: 'v1.0.0' },
                { icon: 'fa-file-alt', label: 'Syarat & Ketentuan', type: 'coming-soon' },
                { icon: 'fa-shield-alt', label: 'Kebijakan Privasi', type: 'coming-soon' },
            ]
        },
    ];

    // Skeleton Loading
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 animate-pulse">
                {/* Header Skeleton */}
                <div className="bg-green-200 px-4 pt-6 pb-8">
                    <div className="h-5 bg-green-300 rounded w-28 mb-2"></div>
                    <div className="h-3 bg-green-300 rounded w-44"></div>
                </div>

                {/* Content Skeleton */}
                <div className="bg-white rounded-t-3xl -mt-4 min-h-screen">
                    <div className="px-4 py-5 space-y-6">
                        {/* Section 1 */}
                        <div>
                            <div className="h-3 bg-gray-200 rounded w-20 mb-3"></div>
                            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0">
                                        <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                                        <div className="flex-1">
                                            <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
                                            <div className="h-3 bg-gray-100 rounded w-40"></div>
                                        </div>
                                        <div className="w-11 h-6 bg-gray-200 rounded-full"></div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Section 2 */}
                        <div>
                            <div className="h-3 bg-gray-200 rounded w-16 mb-3"></div>
                            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                                {[1, 2].map((i) => (
                                    <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0">
                                        <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                                        <div className="flex-1">
                                            <div className="h-4 bg-gray-200 rounded w-24 mb-1"></div>
                                            <div className="h-3 bg-gray-100 rounded w-36"></div>
                                        </div>
                                        <div className="w-4 h-4 bg-gray-200 rounded"></div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Section 3 */}
                        <div>
                            <div className="h-3 bg-gray-200 rounded w-28 mb-3"></div>
                            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                                {[1, 2].map((i) => (
                                    <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0">
                                        <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                                        <div className="flex-1">
                                            <div className="h-4 bg-gray-200 rounded w-28"></div>
                                        </div>
                                        <div className="w-4 h-4 bg-gray-200 rounded"></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 animate-fadeIn">
            {/* Header */}
            <div className="bg-gradient-to-br from-green-600 to-green-700 px-4 pt-6 pb-8 text-white">
                <h1 className="text-lg font-bold mb-1">Pengaturan</h1>
                <p className="text-green-200 text-xs">Kelola preferensi aplikasi Anda</p>
            </div>

            {/* Content */}
            <div className="bg-white rounded-t-3xl -mt-4 pb-20">
                <div className="px-4 py-5 space-y-6">
                    {settingsSections.map((section, sectionIdx) => (
                        <div key={sectionIdx}>
                            {/* Section Title */}
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">
                                {section.title}
                            </h3>

                            {/* Section Items */}
                            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-100">
                                {section.items.map((item, itemIdx) => (
                                    <React.Fragment key={itemIdx}>
                                        <div
                                            className={`flex items-center gap-3 px-4 py-3 ${item.type === 'coming-soon' || item.type === 'link' || item.type === 'action'
                                                ? 'cursor-pointer hover:bg-gray-50 active:bg-gray-100'
                                                : ''
                                                }`}
                                            onClick={() => {
                                                if (item.type === 'coming-soon') {
                                                    showComingSoon(item.label);
                                                } else if (item.type === 'action' && item.action) {
                                                    item.action();
                                                }
                                            }}
                                        >
                                            {/* Icon */}
                                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                                <i className={`fas ${item.icon} text-green-600 text-sm`}></i>
                                            </div>

                                            {/* Label & Description */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-gray-800 font-medium">{item.label}</p>
                                                {item.description && (
                                                    <p className="text-xs text-gray-400 truncate">{item.description}</p>
                                                )}
                                            </div>

                                            {/* Right Side - Toggle, Arrow, or Value */}
                                            {item.type === 'toggle' && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleToggle(item.key);
                                                    }}
                                                    className={`w-11 h-6 rounded-full transition-colors relative ${notifications[item.key] ? 'bg-green-500' : 'bg-gray-300'
                                                        }`}
                                                >
                                                    <div
                                                        className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${notifications[item.key] ? 'translate-x-6' : 'translate-x-1'
                                                            }`}
                                                    />
                                                </button>
                                            )}

                                            {item.type === 'info' && (
                                                <span className="text-xs text-gray-400">{item.value}</span>
                                            )}

                                            {(item.type === 'coming-soon' || item.type === 'link' || item.type === 'action') && (
                                                <i className="fas fa-chevron-right text-gray-300 text-xs"></i>
                                            )}
                                        </div>
                                        {/* Custom content below item (e.g. WebAuthn credentials) */}
                                        {item.type === 'custom' && item.customContent}
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    ))}

                    {/* App Version Footer */}
                    <div className="text-center py-4">
                        <p className="text-xs text-gray-400">MAHAKAM APP</p>
                        <p className="text-xs text-gray-300">Sistem Informasi Terpadu v1.0.0</p>
                    </div>
                </div>
            </div>

            {/* Safari Guide Modal */}
            {showSafariGuide && (
                <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/40"
                    onClick={() => setShowSafariGuide(false)}>
                    <div className="bg-white rounded-t-3xl w-full max-w-md p-5 pb-8 animate-slideUp"
                        onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                                    <i className="fas fa-mobile-alt text-blue-600 text-xl"></i>
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800 text-sm">Panduan iOS Safari</h3>
                                    <p className="text-xs text-gray-400">Tambah ke Layar Utama</p>
                                </div>
                            </div>
                            <button onClick={() => setShowSafariGuide(false)} className="text-gray-300 p-1">
                                <i className="fas fa-times text-lg"></i>
                            </button>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <span className="text-blue-600 font-bold text-sm">1</span>
                                </div>
                                <p className="text-sm text-gray-700">
                                    Buka halaman ini di <strong>Safari</strong>
                                </p>
                            </div>
                            <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <span className="text-blue-600 font-bold text-sm">2</span>
                                </div>
                                <p className="text-sm text-gray-700">
                                    Ketuk <i className="fas fa-share-square text-blue-500 mx-1"></i> <strong>Share</strong> di bawah
                                </p>
                            </div>
                            <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <span className="text-blue-600 font-bold text-sm">3</span>
                                </div>
                                <p className="text-sm text-gray-700">
                                    Pilih <i className="fas fa-plus-square text-gray-500 mx-1"></i> <strong>"Tambahkan ke Layar Utama"</strong>
                                </p>
                            </div>
                            <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <span className="text-green-600 font-bold text-sm">4</span>
                                </div>
                                <p className="text-sm text-gray-700">
                                    Ketuk <strong>"Tambah"</strong> di pojok kanan atas
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Pengaturan;
