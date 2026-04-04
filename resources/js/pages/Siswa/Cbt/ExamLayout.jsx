import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

export default function ExamLayout() {
    const navigate = useNavigate();
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
            if (!document.fullscreenElement) {
                Swal.fire({
                    title: 'Peringatan Keamanan',
                    text: 'Anda keluar dari mode layar penuh. Aktivitas ini dicatat.',
                    icon: 'warning',
                    confirmButtonText: 'Kembali Ujian',
                    allowOutsideClick: false
                }).then(() => {
                    requestFullscreen();
                });
            }
        };

        const handleVisibilityChange = () => {
            if (document.hidden) {
                // In actual deployment, we send a fraud_log via API here
                console.warn('Student switched tabs or minimized browser');
            }
        };

        // Prevent Right Click
        const handleContextMenu = (e) => e.preventDefault();
        
        // Prevent Keyboard Shortcuts (Copy, Paste, DevTools)
        const handleKeyDown = (e) => {
            if ((e.ctrlKey && ['c', 'v', 'p'].includes(e.key.toLowerCase())) || e.key === 'F12') {
                e.preventDefault();
            }
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        document.addEventListener('contextmenu', handleContextMenu);
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            document.removeEventListener('contextmenu', handleContextMenu);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const requestFullscreen = () => {
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch((err) => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans select-none">
            {/* Header / Navbar - Minimal, only showing Exam Info & Timer */}
            <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                        <i className="fas fa-laptop-code text-primary text-xl"></i>
                    </div>
                    <div>
                        <h1 className="font-black text-gray-800 text-lg uppercase tracking-tight">CBT MADRASAH</h1>
                        <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded font-bold uppercase tracking-widest border border-red-100">Distraction Free Mode</span>
                    </div>
                </div>

                {!isFullscreen && (
                    <button onClick={requestFullscreen} className="bg-primary text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/30 flex items-center gap-2 hover:bg-primary/90 transition-colors animate-pulse">
                        <i className="fas fa-expand"></i> Masuk Layar Penuh
                    </button>
                )}
            </header>

            <main className="flex-grow flex scrollbar-hide">
                <Outlet />
            </main>
        </div>
    );
}
