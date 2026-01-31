import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

// Animated Modal Wrapper for smooth transitions
function AnimatedModalWrapper({ children, onClose, maxWidth = 'max-w-sm' }) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Trigger animation after mount
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                setIsVisible(true);
            });
        });

        // Lock body scroll
        document.body.style.overflow = 'hidden';

        // Escape key handler
        const handleEscape = (e) => {
            if (e.key === 'Escape') handleClose();
        };
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.body.style.overflow = '';
            document.removeEventListener('keydown', handleEscape);
        };
    }, []);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(() => onClose(), 300);
    };

    return ReactDOM.createPortal(
        <div
            className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-all duration-300 ease-out ${isVisible ? 'bg-black/50' : 'bg-black/0'
                }`}
            onClick={handleClose}
        >
            <div
                className={`w-full ${maxWidth} transition-all duration-300 ease-out transform ${isVisible
                        ? 'opacity-100 scale-100 translate-y-0'
                        : 'opacity-0 scale-95 translate-y-4'
                    }`}
                onClick={(e) => e.stopPropagation()}
            >
                {typeof children === 'function' ? children(handleClose) : children}
            </div>
        </div>,
        document.body
    );
}

// =============================================
// MODAL DETAIL JADWAL MENGAJAR
// =============================================
export function ModalDetailJadwalMengajar({ item, onClose, onAbsensi }) {
    const isActive = item.isToday;

    return (
        <AnimatedModalWrapper onClose={onClose}>
            {(handleClose) => (
                <div className="bg-white rounded-2xl w-full shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                <i className="fas fa-chalkboard-teacher text-xl"></i>
                            </div>
                            <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-lg transition-colors">
                                <i className="fas fa-times text-xl"></i>
                            </button>
                        </div>
                        <h2 className="font-bold text-lg">{item.mapel || item.title}</h2>
                        <p className="text-green-100 text-sm">{item.kelas}</p>
                    </div>

                    {/* Content */}
                    <div className="p-5 space-y-4">
                        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                            <div className="flex items-center gap-3">
                                <i className="fas fa-calendar-day text-gray-400 w-5"></i>
                                <div>
                                    <p className="text-xs text-gray-500">Hari</p>
                                    <p className="text-sm font-medium text-gray-800">{item.hari}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <i className="fas fa-clock text-gray-400 w-5"></i>
                                <div>
                                    <p className="text-xs text-gray-500">Waktu</p>
                                    <p className="text-sm font-medium text-gray-800">{item.jam_mulai} - {item.jam_selesai}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <i className="fas fa-users text-gray-400 w-5"></i>
                                <div>
                                    <p className="text-xs text-gray-500">Kelas</p>
                                    <p className="text-sm font-medium text-gray-800">{item.kelas}</p>
                                </div>
                            </div>
                        </div>

                        {/* Status Badge */}
                        <div className={`flex items-center gap-2 text-sm p-3 rounded-xl ${isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            <i className={`fas ${isActive ? 'fa-check-circle' : 'fa-info-circle'}`}></i>
                            <span>{isActive ? 'Jadwal hari ini - siap absensi' : 'Bukan jadwal hari ini'}</span>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-gray-100 space-y-2">
                        <button
                            onClick={() => isActive && onAbsensi(item)}
                            disabled={!isActive}
                            className={`w-full py-3 rounded-xl font-medium transition-all ${isActive
                                    ? 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:shadow-lg active:scale-[0.98]'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                }`}
                        >
                            <i className="fas fa-clipboard-check mr-2"></i>
                            {isActive ? 'Lakukan Absensi' : 'Tidak Tersedia'}
                        </button>
                        <button onClick={handleClose} className="w-full py-2 text-gray-500 text-sm hover:text-gray-700 transition-colors">
                            Tutup
                        </button>
                    </div>
                </div>
            )}
        </AnimatedModalWrapper>
    );
}

// =============================================
// MODAL DETAIL JADWAL KEGIATAN
// =============================================
export function ModalDetailJadwalKegiatan({ item, onClose, onAbsensi }) {
    const isActive = item.isToday;

    return (
        <AnimatedModalWrapper onClose={onClose}>
            {(handleClose) => (
                <div className="bg-white rounded-2xl w-full shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                <i className="fas fa-calendar-check text-xl"></i>
                            </div>
                            <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-lg transition-colors">
                                <i className="fas fa-times text-xl"></i>
                            </button>
                        </div>
                        <h2 className="font-bold text-lg">{item.nama || item.title}</h2>
                        <p className="text-blue-100 text-sm">{item.role === 'PJ' ? 'Penanggung Jawab' : 'Pendamping'}</p>
                    </div>

                    {/* Content */}
                    <div className="p-5 space-y-4">
                        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                            <div className="flex items-center gap-3">
                                <i className="fas fa-calendar text-gray-400 w-5"></i>
                                <div>
                                    <p className="text-xs text-gray-500">Tanggal</p>
                                    <p className="text-sm font-medium text-gray-800">{item.time || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <i className="fas fa-map-marker-alt text-gray-400 w-5"></i>
                                <div>
                                    <p className="text-xs text-gray-500">Tempat</p>
                                    <p className="text-sm font-medium text-gray-800">{item.lokasi || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <i className="fas fa-user-tag text-gray-400 w-5"></i>
                                <div>
                                    <p className="text-xs text-gray-500">Peran Anda</p>
                                    <p className="text-sm font-medium text-gray-800">{item.role === 'PJ' ? 'Penanggung Jawab' : 'Pendamping'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Status Badge */}
                        <div className={`flex items-center gap-2 text-sm p-3 rounded-xl ${isActive ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                            <i className={`fas ${isActive ? 'fa-check-circle' : 'fa-info-circle'}`}></i>
                            <span>{isActive ? 'Kegiatan hari ini - siap absensi' : 'Bukan kegiatan hari ini'}</span>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-gray-100 space-y-2">
                        <button
                            onClick={() => isActive && onAbsensi(item)}
                            disabled={!isActive}
                            className={`w-full py-3 rounded-xl font-medium transition-all ${isActive
                                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:shadow-lg active:scale-[0.98]'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                }`}
                        >
                            <i className="fas fa-clipboard-check mr-2"></i>
                            {isActive ? 'Lakukan Absensi' : 'Tidak Tersedia'}
                        </button>
                        <button onClick={handleClose} className="w-full py-2 text-gray-500 text-sm hover:text-gray-700 transition-colors">
                            Tutup
                        </button>
                    </div>
                </div>
            )}
        </AnimatedModalWrapper>
    );
}

// =============================================
// MODAL DETAIL JADWAL RAPAT
// =============================================
export function ModalDetailJadwalRapat({ item, onClose, onAbsensi }) {
    const isActive = item.isToday;

    return (
        <AnimatedModalWrapper onClose={onClose}>
            {(handleClose) => (
                <div className="bg-white rounded-2xl w-full shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                <i className="fas fa-users text-xl"></i>
                            </div>
                            <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-lg transition-colors">
                                <i className="fas fa-times text-xl"></i>
                            </button>
                        </div>
                        <h2 className="font-bold text-lg">{item.nama || item.title}</h2>
                        <p className="text-purple-100 text-sm">{item.jenis || 'Rapat'}</p>
                    </div>

                    {/* Content */}
                    <div className="p-5 space-y-4">
                        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                            <div className="flex items-center gap-3">
                                <i className="fas fa-calendar text-gray-400 w-5"></i>
                                <div>
                                    <p className="text-xs text-gray-500">Tanggal & Waktu</p>
                                    <p className="text-sm font-medium text-gray-800">{item.time || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <i className="fas fa-map-marker-alt text-gray-400 w-5"></i>
                                <div>
                                    <p className="text-xs text-gray-500">Tempat</p>
                                    <p className="text-sm font-medium text-gray-800">{item.lokasi || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <i className="fas fa-user-tag text-gray-400 w-5"></i>
                                <div>
                                    <p className="text-xs text-gray-500">Peran Anda</p>
                                    <p className="text-sm font-medium text-gray-800">{item.role}</p>
                                </div>
                            </div>
                        </div>

                        {/* Status Badge */}
                        <div className={`flex items-center gap-2 text-sm p-3 rounded-xl ${isActive ? 'bg-purple-50 text-purple-700' : 'bg-gray-100 text-gray-500'}`}>
                            <i className={`fas ${isActive ? 'fa-check-circle' : 'fa-info-circle'}`}></i>
                            <span>{isActive ? 'Rapat hari ini - siap absensi' : 'Bukan rapat hari ini'}</span>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-gray-100 space-y-2">
                        <button
                            onClick={() => isActive && onAbsensi(item)}
                            disabled={!isActive}
                            className={`w-full py-3 rounded-xl font-medium transition-all ${isActive
                                    ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:shadow-lg active:scale-[0.98]'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                }`}
                        >
                            <i className="fas fa-clipboard-check mr-2"></i>
                            {isActive ? 'Lakukan Absensi' : 'Tidak Tersedia'}
                        </button>
                        <button onClick={handleClose} className="w-full py-2 text-gray-500 text-sm hover:text-gray-700 transition-colors">
                            Tutup
                        </button>
                    </div>
                </div>
            )}
        </AnimatedModalWrapper>
    );
}

// =============================================
// MODAL RIWAYAT ABSENSI DARI PENCARIAN
// =============================================
export function ModalAbsensiFromSearch({ item, onClose }) {
    const getStatusFromSubtitle = () => {
        if (!item.subtitle) return 'H';
        if (item.subtitle.includes('Hadir')) return 'H';
        if (item.subtitle.includes('Izin')) return 'I';
        return 'A';
    };

    const status = getStatusFromSubtitle();
    const statusColors = {
        'H': { bg: 'from-green-600 to-green-700', badge: 'bg-green-500', text: 'HADIR' },
        'I': { bg: 'from-yellow-500 to-yellow-600', badge: 'bg-yellow-500', text: 'IZIN' },
        'A': { bg: 'from-red-500 to-red-600', badge: 'bg-red-500', text: 'ALPHA' }
    };
    const color = statusColors[status];

    const getType = () => {
        if (item.subtitle?.includes('[Mengajar]')) return 'Mengajar';
        if (item.subtitle?.includes('[Kegiatan')) return 'Kegiatan';
        if (item.subtitle?.includes('[Rapat')) return 'Rapat';
        return 'Absensi';
    };

    return (
        <AnimatedModalWrapper onClose={onClose}>
            {(handleClose) => (
                <div className="bg-white rounded-2xl w-full shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className={`bg-gradient-to-r ${color.bg} text-white p-5`}>
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                <i className={`fas ${item.icon || 'fa-clipboard-check'} text-xl`}></i>
                            </div>
                            <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-lg transition-colors">
                                <i className="fas fa-times text-xl"></i>
                            </button>
                        </div>
                        <h2 className="font-bold text-lg">{item.title}</h2>
                        <p className="text-white/80 text-sm">Riwayat {getType()}</p>
                    </div>

                    {/* Content */}
                    <div className="p-5 space-y-4">
                        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                            <div className="flex items-center gap-3">
                                <i className="fas fa-clock text-gray-400 w-5"></i>
                                <div>
                                    <p className="text-xs text-gray-500">Waktu</p>
                                    <p className="text-sm font-medium text-gray-800">{item.time || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <i className="fas fa-info-circle text-gray-400 w-5"></i>
                                <div>
                                    <p className="text-xs text-gray-500">Keterangan</p>
                                    <p className="text-sm font-medium text-gray-800">{item.subtitle?.replace(/\[.*?\]\s*/, '') || 'N/A'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Status Card */}
                        <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Status Kehadiran</p>
                                    <p className="font-bold text-gray-800">{getType()}</p>
                                </div>
                                <div className={`px-4 py-2 rounded-lg text-sm font-bold ${color.badge} text-white`}>
                                    {color.text}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-gray-100">
                        <button onClick={handleClose} className={`w-full py-3 bg-gradient-to-r ${color.bg} text-white rounded-xl font-medium active:scale-[0.98] transition-transform`}>
                            Tutup
                        </button>
                    </div>
                </div>
            )}
        </AnimatedModalWrapper>
    );
}

export default { ModalDetailJadwalMengajar, ModalDetailJadwalKegiatan, ModalDetailJadwalRapat, ModalAbsensiFromSearch };
