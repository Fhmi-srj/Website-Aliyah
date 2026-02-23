import React, { useState, useEffect } from 'react';

const DISMISS_KEY = 'pwa_install_dismissed';
const DISMISS_DAYS = 7;

function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showBanner, setShowBanner] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        // Check if already installed (standalone mode)
        const standalone = window.matchMedia('(display-mode: standalone)').matches
            || window.navigator.standalone === true;
        setIsStandalone(standalone);
        if (standalone) return;

        // Check if dismissed recently
        const dismissed = localStorage.getItem(DISMISS_KEY);
        if (dismissed) {
            const dismissedDate = new Date(dismissed);
            const now = new Date();
            const diffDays = (now - dismissedDate) / (1000 * 60 * 60 * 24);
            if (diffDays < DISMISS_DAYS) return;
        }

        // Detect iOS
        const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        setIsIOS(ios);

        // For Chrome/Edge Android — capture beforeinstallprompt
        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            // Small delay so page loads first
            setTimeout(() => setShowBanner(true), 2000);
        };

        window.addEventListener('beforeinstallprompt', handler);

        // For iOS — show after 3 seconds if on Safari
        if (ios) {
            const isSafari = /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS/.test(navigator.userAgent);
            if (isSafari) {
                setTimeout(() => setShowBanner(true), 3000);
            }
        }

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setShowBanner(false);
        }
        setDeferredPrompt(null);
    };

    const handleDismiss = () => {
        setShowBanner(false);
        localStorage.setItem(DISMISS_KEY, new Date().toISOString());
    };

    if (!showBanner || isStandalone) return null;

    // iOS Safari Guide
    if (isIOS) {
        return (
            <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/40 animate-fadeIn"
                onClick={handleDismiss}>
                <div className="bg-white rounded-t-3xl w-full max-w-md p-5 pb-8 animate-slideUp"
                    onClick={(e) => e.stopPropagation()}>
                    {/* Close button */}
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center">
                                <i className="fas fa-mobile-alt text-green-600 text-xl"></i>
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800 text-sm">Tambahkan ke Layar Utama</h3>
                                <p className="text-xs text-gray-400">Akses cepat dari home screen</p>
                            </div>
                        </div>
                        <button onClick={handleDismiss} className="text-gray-300 p-1">
                            <i className="fas fa-times text-lg"></i>
                        </button>
                    </div>

                    {/* Steps */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <span className="text-blue-600 font-bold text-sm">1</span>
                            </div>
                            <p className="text-sm text-gray-700">
                                Ketuk tombol <i className="fas fa-share-square text-blue-500 mx-1"></i> <strong>Share</strong> di bawah Safari
                            </p>
                        </div>
                        <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <span className="text-blue-600 font-bold text-sm">2</span>
                            </div>
                            <p className="text-sm text-gray-700">
                                Scroll & pilih <i className="fas fa-plus-square text-gray-500 mx-1"></i> <strong>"Tambahkan ke Layar Utama"</strong>
                            </p>
                        </div>
                        <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <span className="text-green-600 font-bold text-sm">3</span>
                            </div>
                            <p className="text-sm text-gray-700">
                                Ketuk <strong>"Tambah"</strong> di pojok kanan atas
                            </p>
                        </div>
                    </div>

                    {/* Arrow indicator pointing down */}
                    <div className="flex justify-center mt-4">
                        <div className="animate-bounce">
                            <i className="fas fa-chevron-down text-gray-300 text-xl"></i>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Chrome/Edge Android Banner
    return (
        <div className="fixed bottom-20 left-3 right-3 z-[9999] animate-slideUp">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                        <i className="fas fa-mobile-alt text-green-600 text-xl"></i>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-800 text-sm">Pasang Aplikasi</h3>
                        <p className="text-xs text-gray-400 truncate">Tambahkan pintasan ke layar utama HP</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                            onClick={handleDismiss}
                            className="text-xs text-gray-400 px-2 py-1.5"
                        >
                            Nanti
                        </button>
                        <button
                            onClick={handleInstall}
                            className="bg-green-600 text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-green-700 transition-colors"
                        >
                            Pasang
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default InstallPrompt;
