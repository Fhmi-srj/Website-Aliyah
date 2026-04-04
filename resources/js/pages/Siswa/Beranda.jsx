import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/axios';

export default function SiswaBeranda() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const navigate = useNavigate();

    // Detect mobile/desktop
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const response = await api.get('/siswa-panel/dashboard');
                setData(response.data);
            } catch (error) {
                console.error("Failed to fetch dashboard", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboard();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-sky-500 mb-4"></div>
                <p className="text-gray-500 font-medium">Menyesuaikan Ruang Belajar...</p>
            </div>
        );
    }

    const { user, info } = data || {};

    if (!isMobile) {
        return (
            <div className="animate-fadeIn p-4 md:p-0">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2 text-lg">
                    <i className="fas fa-th-large text-sky-500"></i>
                    Menu Utama
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white p-6 rounded-3xl shadow-soft border border-gray-100">
                    <button 
                        onClick={() => navigate('/siswa/ujian')} 
                        className="bg-transparent border-0 shadow-none p-5 rounded-3xl hover:-translate-y-1 transition-all group flex flex-col items-center justify-center gap-3"
                    >
                        <div className="w-14 h-14 bg-gradient-to-br from-sky-400 to-sky-500 text-white rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-sky-500/30 transition-all">
                            <i className="fas fa-laptop-code text-2xl"></i>
                        </div>
                        <span className="font-bold text-xs text-gray-700 tracking-wide text-center">Ujian CBT</span>
                    </button>
                    
                    <button 
                        onClick={() => navigate('/siswa/penilaian')} 
                        className="bg-transparent border-0 shadow-none p-5 rounded-3xl hover:-translate-y-1 transition-all group flex flex-col items-center justify-center gap-3"
                    >
                        <div className="w-14 h-14 bg-gradient-to-br from-purple-400 to-purple-500 text-white rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-purple-500/30 transition-all">
                            <i className="fas fa-star text-2xl"></i>
                        </div>
                        <span className="font-bold text-xs text-gray-700 tracking-wide text-center">Nilai</span>
                    </button>
                    
                    <button 
                        onClick={() => navigate('/siswa/profil')} 
                        className="bg-transparent border-0 shadow-none p-5 rounded-3xl hover:-translate-y-1 transition-all group flex flex-col items-center justify-center gap-3"
                    >
                        <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-amber-500 text-white rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-amber-500/30 transition-all">
                            <i className="fas fa-user-circle text-2xl"></i>
                        </div>
                        <span className="font-bold text-xs text-gray-700 tracking-wide text-center">Profil Ku</span>
                    </button>
                    
                    <div className="bg-transparent border-0 shadow-none p-5 rounded-3xl opacity-50 flex flex-col items-center justify-center gap-3">
                        <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center grayscale">
                            <i className="fas fa-book-open text-2xl"></i>
                        </div>
                        <span className="font-bold text-xs text-gray-700 tracking-wide text-center">Materi<br/><span className="text-[9px] font-normal text-gray-400 shadow-none grayscale-0">Segera Hadir</span></span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col animate-fadeIn">
            {/* Header Section - Full width Sky Blue */}
            <div className="bg-gradient-to-br from-sky-600 to-sky-700 px-4 pt-4 pb-10 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                
                {/* User Info */}
                <div className="relative z-10 flex items-center gap-3 mb-5">
                    <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm overflow-hidden border border-white/20 shadow-inner flex-shrink-0">
                        <i className="fas fa-user-graduate text-xl drop-shadow-sm"></i>
                    </div>
                    <div className="flex-1">
                        <p className="text-sky-100 text-xs tracking-wide">Selamat Datang,</p>
                        <h2 className="font-bold text-lg drop-shadow-sm capitalize">{user?.nama || 'Siswa'}</h2>
                        <p className="text-sky-200 text-xs tracking-wider">NISN: {user?.nisn || '-'}</p>
                    </div>
                </div>

                {/* Badge Info */}
                <div className="relative z-10 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 bg-white/20 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/10 shadow-sm font-medium">
                        <i className="fas fa-calendar-alt"></i>
                        TA {info?.tahun_ajaran || '-'}
                    </span>
                    <span className="bg-white/20 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/10 shadow-sm font-medium tracking-wide">
                        <i className="fas fa-building mr-1"></i> Kelas {user?.kelas || '-'}
                    </span>
                </div>
            </div>

            {/* Main Content Area - Rounded top */}
            <div className="flex-1 bg-slate-50 rounded-t-[2rem] -mt-5 px-4 pt-6 pb-24 space-y-6 relative z-10 shadow-[0_-4px_15px_rgba(0,0,0,0.05)]">
                
                {/* Menu Utama - Compact Grid like Guru */}
                <div>
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2 text-sm ml-1">
                        <i className="fas fa-th-large text-sky-500"></i>
                        Menu Utama
                    </h3>
                    <div className="grid grid-cols-4 gap-3">
                        <button
                            onClick={() => navigate("/siswa/ujian")}
                            className="flex flex-col items-center gap-2 p-3.5 bg-gradient-to-br from-sky-500 to-sky-600 rounded-2xl text-white cursor-pointer shadow-sm hover:shadow-md transition-all hover:scale-[1.03]"
                        >
                            <i className="fas fa-laptop-code text-xl"></i>
                            <span className="text-[10px] font-medium leading-tight text-center">Ujian CBT</span>
                        </button>
                        
                        <button
                            onClick={() => navigate("/siswa/penilaian")}
                            className="flex flex-col items-center gap-2 p-3.5 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl text-white cursor-pointer shadow-sm hover:shadow-md transition-all hover:scale-[1.03]"
                        >
                            <i className="fas fa-star text-xl"></i>
                            <span className="text-[10px] font-medium leading-tight text-center">Nilai</span>
                        </button>

                        <button
                            onClick={() => navigate("/siswa/profil")}
                            className="flex flex-col items-center gap-2 p-3.5 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl text-white cursor-pointer shadow-sm hover:shadow-md transition-all hover:scale-[1.03]"
                        >
                            <i className="fas fa-user-circle text-xl"></i>
                            <span className="text-[10px] font-medium leading-tight text-center">Profil</span>
                        </button>
                        
                        <div className="flex flex-col items-center gap-2 p-3.5 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-2xl text-white opacity-50 cursor-not-allowed">
                            <i className="fas fa-book-open text-xl"></i>
                            <span className="text-[10px] font-medium leading-tight text-center">Materi</span>
                        </div>
                    </div>
                </div>

                {/* Info Akademik - List Style */}
                <div>
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2 text-sm ml-1">
                        <i className="fas fa-bullhorn text-amber-500"></i>
                        Informasi Akademik
                    </h3>
                    
                    <div className="space-y-3">
                        <div className="w-full flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100/50">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-orange-100">
                                <i className="fas fa-info text-orange-500 text-sm"></i>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-gray-800 text-xs font-bold truncate">Disiplin dan Tepat Waktu</p>
                                <p className="text-gray-500 text-[10px] leading-tight mt-0.5">
                                    Pastikan selalu mengecek jadwal Ujian CBT agar tidak tertinggal.
                                </p>
                            </div>
                        </div>

                        <div className="w-full flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100/50">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-sky-100">
                                <i className="fas fa-laptop-house text-sky-500 text-sm"></i>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-gray-800 text-xs font-bold truncate">Tryout CBT</p>
                                <p className="text-gray-500 text-[10px] leading-tight mt-0.5">
                                    Selalu gunakan Browser versi terbaru untuk kenyamanan akses.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
