import React from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

/**
 * Desktop Left Panel — Profil Siswa
 */
export function DesktopLeftPanel({ user, onLogout }) {
    const navigate = useNavigate();

    const handleLogout = async () => {
        const result = await Swal.fire({
            title: 'Keluar dari Aplikasi?',
            text: 'Anda akan keluar dari portal siswa',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#EF4444',
            cancelButtonColor: '#6B7280',
            confirmButtonText: 'Ya, Keluar',
            cancelButtonText: 'Batal',
            reverseButtons: true,
            width: '85%',
            customClass: {
                popup: 'rounded-2xl !max-w-xs',
                title: '!text-base',
                htmlContainer: '!text-sm',
                confirmButton: 'rounded-xl px-4 !text-xs',
                cancelButton: 'rounded-xl px-4 !text-xs'
            }
        });
        if (result.isConfirmed && onLogout) {
            onLogout();
        }
    };

    return (
        <div className="h-full flex flex-col">
            {/* Top Content */}
            <div className="space-y-4">
                {/* Profile Card */}
                <div className="bg-gradient-to-br from-sky-500 to-sky-600 rounded-2xl p-5 text-white shadow-md">
                    <div className="flex flex-col items-center gap-3 text-center">
                        <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm overflow-hidden flex-shrink-0 shadow-inner">
                            <i className="fas fa-user-graduate text-3xl"></i>
                        </div>
                        <div className="min-w-0 w-full px-2">
                            <h2 className="font-bold text-lg leading-tight truncate drop-shadow-sm">{user?.nama || 'Siswa'}</h2>
                            <p className="text-sky-100 text-xs mt-1 bg-white/10 py-1 rounded-full border border-white/20">NISN: {user?.nisn || '-'}</p>
                        </div>
                    </div>
                </div>

                {/* Quick Info Class */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
                    <div className="w-12 h-12 bg-sky-50 rounded-xl flex items-center justify-center text-sky-500">
                        <i className="fas fa-building text-xl"></i>
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">Kelas Saat Ini</p>
                        <p className="font-bold text-gray-800 text-sm">{user?.kelas || 'Belum diatur'}</p>
                    </div>
                </div>
            </div>

            {/* Spacer */}
            <div className="flex-1"></div>

            {/* Bottom — Logout */}
            <div className="pt-3">
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 bg-white rounded-xl border border-gray-200 px-3 py-2.5 text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors text-sm font-medium cursor-pointer shadow-sm"
                >
                    <i className="fas fa-sign-out-alt"></i>
                    Keluar
                </button>
            </div>
        </div>
    );
}

/**
 * Desktop Right Panel — Informasi Akademik
 */
export function DesktopRightPanel({ info }) {
    return (
        <div className="h-full flex flex-col">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2 text-sm">
                <i className="fas fa-bullhorn text-amber-500"></i>
                Informasi Akademik
            </h3>

            {/* Pengingat / TA */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-4 custom-scrollbar">
                <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-5 relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-16 h-16 bg-orange-100 rounded-full blur-xl group-hover:bg-orange-200 transition-colors"></div>
                    <div className="relative z-10 flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 shadow-inner">
                            <i className="fas fa-info text-orange-500"></i>
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800 text-sm mb-1">Tahun Ajaran Aktif</h3>
                            <p className="text-xs text-gray-600 font-medium leading-relaxed">
                                Saat ini Anda berada di Tahun Ajaran <span className="font-bold text-orange-600">{info?.tahun_ajaran || '2025/2026'}</span>. Pastikan rajin mengecek jadwal ujian pada menu CBT!
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
