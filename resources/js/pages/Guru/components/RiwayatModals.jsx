import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import api from '../../../lib/axios';

// Animated Modal Wrapper for smooth transitions
function AnimatedModalWrapper({ children, onClose, maxWidth = 'max-w-md' }) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => setIsVisible(true));
        });
        document.body.style.overflow = 'hidden';
        const handleEscape = (e) => { if (e.key === 'Escape') handleClose(); };
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
            className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-all duration-300 ease-out ${isVisible ? 'bg-black/50' : 'bg-black/0'}`}
            onClick={handleClose}
        >
            <div
                className={`w-full ${maxWidth} transition-all duration-300 ease-out transform ${isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'}`}
                style={{ maxHeight: '90vh' }}
                onClick={(e) => e.stopPropagation()}
            >
                {typeof children === 'function' ? children(handleClose) : children}
            </div>
        </div>,
        document.body
    );
}
// =============================================
// MODAL RIWAYAT MENGAJAR - Read-only version of ModalAbsensiSiswa
// =============================================
export function ModalRiwayatMengajar({ item, onClose }) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [siswaExpanded, setSiswaExpanded] = useState(true);

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                const response = await api.get(`/guru-panel/riwayat/mengajar/${item.id}/detail`);
                if (response.data.success) setData(response.data.data);
            } catch (error) {
                console.error('Error fetching detail:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchDetail();
    }, [item.id]);

    const counts = data ? {
        hadir: data.siswa?.filter(s => s.status === 'H').length || 0,
        izin: data.siswa?.filter(s => s.status === 'I' || s.status === 'S').length || 0,
        alpha: data.siswa?.filter(s => s.status === 'A').length || 0,
    } : { hadir: 0, izin: 0, alpha: 0 };

    const guruStatus = data?.guru_status || 'H';
    const guruKeterangan = data?.guru_keterangan || '';

    return (
        <AnimatedModalWrapper onClose={onClose}>
            {(handleClose) => (
                <div className="bg-white rounded-2xl w-full flex flex-col shadow-2xl overflow-hidden" style={{ maxHeight: '85vh' }}>
                    {/* Header */}
                    <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 flex-shrink-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><i className="fas fa-clipboard-check"></i></div>
                                <div>
                                    <h2 className="font-bold">Riwayat Absensi Mengajar</h2>
                                    <p className="text-green-100 text-xs">{item.mapel} • {item.kelas}</p>
                                </div>
                            </div>
                            <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-lg"><i className="fas fa-times text-xl"></i></button>
                        </div>
                        <div className="flex gap-6 mt-4 text-center">
                            {loading ? (
                                <>
                                    <div className="flex-1"><div className="h-8 w-8 mx-auto bg-white/30 rounded animate-pulse"></div><p className="text-xs text-green-100 mt-1">Hadir</p></div>
                                    <div className="flex-1"><div className="h-8 w-8 mx-auto bg-white/30 rounded animate-pulse"></div><p className="text-xs text-green-100 mt-1">Izin</p></div>
                                    <div className="flex-1"><div className="h-8 w-8 mx-auto bg-white/30 rounded animate-pulse"></div><p className="text-xs text-green-100 mt-1">Alpha</p></div>
                                </>
                            ) : (
                                <>
                                    <div className="flex-1"><p className="text-2xl font-bold">{counts.hadir}</p><p className="text-xs text-green-100">Hadir</p></div>
                                    <div className="flex-1"><p className="text-2xl font-bold">{counts.izin}</p><p className="text-xs text-green-100">Izin</p></div>
                                    <div className="flex-1"><p className="text-2xl font-bold">{counts.alpha}</p><p className="text-xs text-green-100">Alpha</p></div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {loading ? (
                            <div className="space-y-4 animate-pulse">
                                <div className="h-20 bg-gray-100 rounded-2xl"></div>
                                <div className="h-16 bg-gray-100 rounded-xl"></div>
                                <div className="h-16 bg-gray-100 rounded-xl"></div>
                                <div className="h-32 bg-gray-100 rounded-xl"></div>
                            </div>
                        ) : (
                            <>
                                {/* Guru Card */}
                                <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-lg">{data?.guru_name?.charAt(0)?.toUpperCase() || 'G'}</div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-gray-800 truncate">{data?.guru_name || 'Guru'}</p>
                                            <p className="text-xs text-gray-400">{data?.guru_nip || 'Guru Pengajar'}</p>
                                        </div>
                                        <div className={`px-3 py-2 rounded-lg text-sm font-bold ${guruStatus === 'H' ? 'bg-green-500 text-white' : guruStatus === 'I' ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white'}`}>
                                            {guruStatus === 'H' ? 'HADIR' : guruStatus === 'I' ? 'IZIN' : 'ALPHA'}
                                        </div>
                                    </div>
                                    {guruStatus === 'I' && guruKeterangan && (
                                        <div className="mt-3 p-2.5 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800"><i className="fas fa-info-circle mr-2"></i>{guruKeterangan}</div>
                                    )}
                                </div>

                                {/* Info Notice */}
                                <div className={`flex items-center gap-2 text-sm p-3 rounded-xl ${guruStatus === 'H' ? 'bg-green-50 text-green-700' : guruStatus === 'I' ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'}`}>
                                    <i className={`fas ${guruStatus === 'H' ? 'fa-check-circle' : guruStatus === 'I' ? 'fa-info-circle' : 'fa-exclamation-circle'}`}></i>
                                    <span>{guruStatus === 'H' ? 'Guru tercatat HADIR' : guruStatus === 'I' ? 'Guru tercatat IZIN' : 'Guru tercatat ALPHA'}</span>
                                </div>

                                {/* Ringkasan Materi */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Ringkasan Materi</label>
                                    <div className="w-full border border-gray-200 rounded-xl p-3 text-sm bg-gray-50 text-gray-700 min-h-[80px]">{data?.ringkasan_materi || '-'}</div>
                                </div>

                                {/* Berita Acara */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Berita Acara</label>
                                    <div className="w-full border border-gray-200 rounded-xl p-3 text-sm bg-gray-50 text-gray-700 min-h-[80px]">{data?.berita_acara || '-'}</div>
                                </div>

                                {/* Siswa List */}
                                {data?.siswa && data.siswa.length > 0 && (
                                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                                        <button type="button" onClick={() => setSiswaExpanded(!siswaExpanded)} className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-indigo-50">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center"><i className="fas fa-users text-white"></i></div>
                                                <div className="text-left">
                                                    <p className="font-semibold text-gray-800">Absensi Siswa</p>
                                                    <p className="text-xs text-gray-500"><span className="text-green-600">{counts.hadir} hadir</span> • <span className="text-yellow-600">{counts.izin} izin</span> • <span className="text-red-600">{counts.alpha} alpha</span></p>
                                                </div>
                                            </div>
                                            <div className={`w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center transition-transform ${siswaExpanded ? 'rotate-180' : ''}`}><i className="fas fa-chevron-down text-gray-500 text-sm"></i></div>
                                        </button>
                                        {siswaExpanded && (
                                            <div className="p-3 space-y-2 max-h-[400px] overflow-y-auto">
                                                {data.siswa.map((siswa, index) => (
                                                    <div key={index} className="bg-white border border-gray-100 rounded-xl p-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 font-semibold">{siswa.nama?.charAt(0)?.toUpperCase() || 'S'}</div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-semibold text-gray-800 text-sm truncate">{siswa.nama}</p>
                                                                <p className="text-xs text-gray-400">{siswa.nis}</p>
                                                            </div>
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${siswa.status === 'H' ? 'bg-green-500 text-white' : siswa.status === 'I' || siswa.status === 'S' ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white'}`}>{siswa.status === 'S' ? 'I' : siswa.status}</div>
                                                        </div>
                                                        {(siswa.status === 'I' || siswa.status === 'S') && siswa.keterangan && (
                                                            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">{siswa.keterangan}</div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex-shrink-0 p-4 border-t border-gray-100 bg-white">
                        <button onClick={handleClose} className="w-full py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-medium active:scale-[0.98] transition-transform">Tutup</button>
                    </div>
                </div>
            )}
        </AnimatedModalWrapper>
    );
}

// =============================================
// MODAL RIWAYAT KEGIATAN PJ - Read-only version
// =============================================
export function ModalRiwayatKegiatanPJ({ item, onClose }) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [pendampingExpanded, setPendampingExpanded] = useState(true);
    const [siswaExpanded, setSiswaExpanded] = useState(false);

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                const response = await api.get(`/guru-panel/riwayat/kegiatan/${item.id}/detail`);
                if (response.data.success) setData(response.data.data);
            } catch (error) { console.error('Error:', error); }
            finally { setLoading(false); }
        };
        fetchDetail();
    }, [item.id]);

    const siswaCounts = data?.siswa ? {
        hadir: data.siswa.filter(s => s.status === 'H').length,
        izin: data.siswa.filter(s => s.status === 'I').length,
        alpha: data.siswa.filter(s => s.status === 'A').length,
    } : { hadir: 0, izin: 0, alpha: 0 };

    // Use item.guru_status for header color (available immediately)
    const guruStatus = item.guru_status || 'H';

    const getHeaderGradient = () => {
        if (guruStatus === 'H') return 'bg-gradient-to-r from-green-600 to-green-700';
        if (guruStatus === 'I') return 'bg-gradient-to-r from-yellow-500 to-yellow-600';
        return 'bg-gradient-to-r from-red-500 to-red-600';
    };

    const getSubtitleColor = () => {
        if (guruStatus === 'H') return 'text-green-100';
        if (guruStatus === 'I') return 'text-yellow-100';
        return 'text-red-100';
    };

    return (
        <AnimatedModalWrapper onClose={onClose}>
            {(handleClose) => (
                <div className="bg-white rounded-2xl w-full flex flex-col shadow-2xl overflow-hidden" style={{ maxHeight: '85vh' }}>
                    {/* Header */}
                    <div className={`text-white p-4 flex-shrink-0 ${getHeaderGradient()}`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><i className="fas fa-calendar-check"></i></div>
                                <div>
                                    <h2 className="font-bold text-sm">{item.nama}</h2>
                                    <p className={`text-xs ${getSubtitleColor()}`}><i className="fas fa-map-marker-alt mr-1"></i>{item.lokasi || '-'} • {item.time || '-'}</p>
                                </div>
                            </div>
                            <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-lg"><i className="fas fa-times text-xl"></i></button>
                        </div>
                        <div className="flex gap-6 mt-4 text-center">
                            {loading ? (
                                <>
                                    <div className="flex-1"><div className="h-8 w-8 mx-auto bg-white/30 rounded animate-pulse"></div><p className={`text-xs ${getSubtitleColor()} mt-1`}>Hadir</p></div>
                                    <div className="flex-1"><div className="h-8 w-8 mx-auto bg-white/30 rounded animate-pulse"></div><p className={`text-xs ${getSubtitleColor()} mt-1`}>Izin</p></div>
                                    <div className="flex-1"><div className="h-8 w-8 mx-auto bg-white/30 rounded animate-pulse"></div><p className={`text-xs ${getSubtitleColor()} mt-1`}>Alpha</p></div>
                                </>
                            ) : (
                                <>
                                    <div className="flex-1"><p className="text-2xl font-bold">{siswaCounts.hadir}</p><p className={`text-xs ${getSubtitleColor()}`}>Hadir</p></div>
                                    <div className="flex-1"><p className="text-2xl font-bold">{siswaCounts.izin}</p><p className={`text-xs ${getSubtitleColor()}`}>Izin</p></div>
                                    <div className="flex-1"><p className="text-2xl font-bold">{siswaCounts.alpha}</p><p className={`text-xs ${getSubtitleColor()}`}>Alpha</p></div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {loading ? (
                            <div className="space-y-4 animate-pulse">
                                <div className="h-12 bg-gray-100 rounded-xl"></div>
                                <div className="h-20 bg-gray-100 rounded-2xl"></div>
                                <div className="h-24 bg-gray-100 rounded-xl"></div>
                            </div>
                        ) : (
                            <>
                                {/* Info Badge */}
                                <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                                    <div className="flex items-center gap-2 text-green-700 text-sm font-medium"><i className="fas fa-user-tie"></i><span>Penanggung Jawab Kegiatan</span></div>
                                </div>

                                {/* PJ Status */}
                                <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <div><p className="text-sm text-gray-500">Kehadiran Anda</p><p className="font-bold text-gray-800">Penanggung Jawab</p></div>
                                        <div className={`px-3 py-2 rounded-lg text-sm font-bold ${guruStatus === 'H' ? 'bg-green-500 text-white' : guruStatus === 'I' ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white'}`}>
                                            {guruStatus === 'H' ? 'HADIR' : guruStatus === 'I' ? 'IZIN' : 'ALPHA'}
                                        </div>
                                    </div>
                                </div>

                                {/* Guru Pendamping */}
                                <div className="border border-gray-200 rounded-xl overflow-hidden">
                                    <button onClick={() => setPendampingExpanded(!pendampingExpanded)} className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-pink-50">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center"><i className="fas fa-chalkboard-teacher text-white"></i></div>
                                            <div className="text-left"><p className="font-semibold text-gray-800">Guru Pendamping</p><p className="text-xs text-gray-500">{data?.guru_pendamping?.length || 0} guru</p></div>
                                        </div>
                                        <div className={`w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center transition-transform ${pendampingExpanded ? 'rotate-180' : ''}`}><i className="fas fa-chevron-down text-gray-500 text-sm"></i></div>
                                    </button>
                                    {pendampingExpanded && data?.guru_pendamping?.length > 0 && (
                                        <div className="p-3 space-y-2">
                                            {data.guru_pendamping.map((guru, i) => (
                                                <div key={i} className="bg-white border rounded-xl p-3 flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-semibold">{guru.nama?.charAt(0) || 'G'}</div>
                                                        <div><p className="font-semibold text-gray-800 text-sm">{guru.nama}</p><p className="text-xs text-gray-400">{guru.nip || 'Pendamping'}</p></div>
                                                    </div>
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${guru.status === 'H' ? 'bg-green-500 text-white' : guru.status === 'I' ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white'}`}>{guru.status}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Siswa */}
                                <div className="border border-gray-200 rounded-xl overflow-hidden">
                                    <button onClick={() => setSiswaExpanded(!siswaExpanded)} className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-cyan-50">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center"><i className="fas fa-user-graduate text-white"></i></div>
                                            <div className="text-left"><p className="font-semibold text-gray-800">Siswa Peserta</p><p className="text-xs text-gray-500"><span className="text-green-600">{siswaCounts.hadir} hadir</span> • <span className="text-yellow-600">{siswaCounts.izin} izin</span> • <span className="text-red-600">{siswaCounts.alpha} alpha</span></p></div>
                                        </div>
                                        <div className={`w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center transition-transform ${siswaExpanded ? 'rotate-180' : ''}`}><i className="fas fa-chevron-down text-gray-500 text-sm"></i></div>
                                    </button>
                                    {siswaExpanded && data?.siswa?.length > 0 && (
                                        <div className="p-3 space-y-2 max-h-[300px] overflow-y-auto">
                                            {data.siswa.map((siswa, i) => (
                                                <div key={i} className="bg-white border rounded-xl p-3 flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 font-semibold">{siswa.nama?.charAt(0) || 'S'}</div>
                                                        <div><p className="font-semibold text-gray-800 text-sm">{siswa.nama}</p><p className="text-xs text-gray-400">{siswa.nis}</p></div>
                                                    </div>
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${siswa.status === 'H' ? 'bg-green-500 text-white' : siswa.status === 'I' ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white'}`}>{siswa.status}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Berita Acara */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Berita Acara</label>
                                    <div className="w-full border border-gray-200 rounded-xl p-3 text-sm bg-gray-50 text-gray-700 min-h-[80px]">{data?.berita_acara || '-'}</div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex-shrink-0 p-4 border-t border-gray-100 bg-white">
                        <button onClick={handleClose} className={`w-full py-3 text-white rounded-xl font-medium active:scale-[0.98] transition-transform ${guruStatus === 'H' ? 'bg-gradient-to-r from-green-500 to-green-600' : guruStatus === 'I' ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' : 'bg-gradient-to-r from-red-500 to-red-600'}`}>Tutup</button>
                    </div>
                </div>
            )}
        </AnimatedModalWrapper>
    );
}

// =============================================
// MODAL RIWAYAT KEGIATAN PENDAMPING - Read-only
// =============================================
export function ModalRiwayatKegiatanPendamping({ item, onClose }) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                const response = await api.get(`/guru-panel/riwayat/kegiatan/${item.id}/detail`);
                if (response.data.success) setData(response.data.data);
            } catch (error) { console.error('Error:', error); }
            finally { setLoading(false); }
        };
        fetchDetail();
    }, [item.id]);

    const guruStatus = item.guru_status || 'H';

    return (
        <AnimatedModalWrapper onClose={onClose}>
            {(handleClose) => (
                <div className="bg-white rounded-2xl w-full flex flex-col shadow-2xl overflow-hidden" style={{ maxHeight: '85vh' }}>
                    {/* Header */}
                    <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 flex-shrink-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><i className="fas fa-calendar-check"></i></div>
                                <div><h2 className="font-bold text-sm">{item.nama}</h2><p className="text-green-100 text-xs">Absensi Pendamping</p></div>
                            </div>
                            <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-lg"><i className="fas fa-times text-xl"></i></button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {loading ? (
                            <div className="space-y-4 animate-pulse">
                                <div className="h-12 bg-gray-100 rounded-xl"></div>
                                <div className="h-24 bg-gray-100 rounded-xl"></div>
                                <div className="h-20 bg-gray-100 rounded-2xl"></div>
                            </div>
                        ) : (
                            <>
                                {/* Info Badge */}
                                <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                                    <div className="flex items-center gap-2 text-green-700 text-sm font-medium"><i className="fas fa-user-friends"></i><span>Guru Pendamping</span></div>
                                </div>

                                {/* Activity Info */}
                                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                                    <div className="flex items-start gap-3"><i className="fas fa-calendar text-gray-400 mt-0.5 w-4"></i><div><p className="text-xs text-gray-500">Tanggal</p><p className="text-sm text-gray-800 font-medium">{item.tanggal}</p></div></div>
                                    <div className="flex items-start gap-3"><i className="fas fa-clock text-gray-400 mt-0.5 w-4"></i><div><p className="text-xs text-gray-500">Waktu</p><p className="text-sm text-gray-800 font-medium">{item.time || '-'}</p></div></div>
                                    <div className="flex items-start gap-3"><i className="fas fa-map-marker-alt text-gray-400 mt-0.5 w-4"></i><div><p className="text-xs text-gray-500">Tempat</p><p className="text-sm text-gray-800 font-medium">{item.lokasi || '-'}</p></div></div>
                                </div>

                                {/* Status Card */}
                                <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <div><p className="text-sm text-gray-500">Kehadiran Anda</p><p className="font-bold text-gray-800">Pendamping</p></div>
                                        <div className={`px-3 py-2 rounded-lg text-sm font-bold ${guruStatus === 'H' ? 'bg-green-500 text-white' : guruStatus === 'I' ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white'}`}>
                                            {guruStatus === 'H' ? 'HADIR' : guruStatus === 'I' ? 'IZIN' : 'ALPHA'}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex-shrink-0 p-4 border-t border-gray-100 bg-white">
                        <button onClick={handleClose} className="w-full py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-medium active:scale-[0.98] transition-transform">Tutup</button>
                    </div>
                </div>
            )}
        </AnimatedModalWrapper>
    );
}

// =============================================
// MODAL RIWAYAT RAPAT PIMPINAN - Read-only
// =============================================
export function ModalRiwayatRapatPimpinan({ item, onClose }) {
    const guruStatus = item.guru_status || 'H';
    return (
        <AnimatedModalWrapper onClose={onClose} maxWidth="max-w-sm">
            {(handleClose) => (
                <div className="bg-white rounded-2xl w-full max-h-[85vh] overflow-y-auto">
                    <div className="bg-gradient-to-r from-green-600 to-green-700 p-4 rounded-t-2xl text-white">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-bold text-lg">Riwayat Pimpinan Rapat</h3>
                            <button onClick={handleClose} className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center"><i className="fas fa-times"></i></button>
                        </div>
                        <p className="text-green-200 text-sm">{item.nama}</p>
                    </div>
                    <div className="p-4 space-y-4">
                        <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                            <div className="flex justify-between"><span className="text-xs text-gray-400">Tanggal</span><span className="text-sm font-medium">{item.tanggal}</span></div>
                            <div className="flex justify-between"><span className="text-xs text-gray-400">Waktu</span><span className="text-sm font-medium">{item.time || '-'}</span></div>
                            <div className="flex justify-between"><span className="text-xs text-gray-400">Tempat</span><span className="text-sm font-medium">{item.lokasi || '-'}</span></div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Status Kehadiran</label>
                            <div className="grid grid-cols-3 gap-2">
                                {[{ v: 'H', l: 'Hadir', c: 'green' }, { v: 'I', l: 'Izin', c: 'yellow' }, { v: 'A', l: 'Alpha', c: 'red' }].map(opt => (
                                    <div key={opt.v} className={`py-3 rounded-xl font-medium text-sm text-center ${guruStatus === opt.v ? `bg-${opt.c}-500 text-white` : `bg-${opt.c}-100 text-${opt.c}-700`}`}>{opt.l}</div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="p-4 border-t border-gray-100">
                        <button onClick={handleClose} className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-4 rounded-xl font-semibold active:scale-[0.98] transition-transform">Tutup</button>
                    </div>
                </div>
            )}
        </AnimatedModalWrapper>
    );
}

// =============================================
// MODAL RIWAYAT RAPAT PESERTA - Read-only
// =============================================
export function ModalRiwayatRapatPeserta({ item, onClose }) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                const response = await api.get(`/guru-panel/riwayat/rapat/${item.id}/detail`);
                if (response.data.success) setData(response.data.data);
            } catch (error) { console.error('Error:', error); }
            finally { setLoading(false); }
        };
        fetchDetail();
    }, [item.id]);

    // Use item.guru_status for immediate display
    const guruStatus = item.guru_status || 'H';
    const role = item.role || 'Peserta';

    return (
        <AnimatedModalWrapper onClose={onClose}>
            {(handleClose) => (
                <div className="bg-white rounded-2xl w-full flex flex-col shadow-2xl overflow-hidden" style={{ maxHeight: '85vh' }}>
                    <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 flex-shrink-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><i className="fas fa-users"></i></div>
                                <div><h2 className="font-bold text-sm">{item.nama}</h2><p className="text-green-100 text-xs">Riwayat {role}</p></div>
                            </div>
                            <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-lg"><i className="fas fa-times text-xl"></i></button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {loading ? (
                            <div className="space-y-4 animate-pulse">
                                <div className="h-12 bg-gray-100 rounded-xl"></div>
                                <div className="h-24 bg-gray-100 rounded-xl"></div>
                                <div className="h-20 bg-gray-100 rounded-2xl"></div>
                            </div>
                        ) : (
                            <>
                                <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                                    <div className="flex items-center gap-2 text-green-700 text-sm font-medium"><i className="fas fa-user-friends"></i><span>Anda adalah {role}</span></div>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                                    <div className="flex items-start gap-3"><i className="fas fa-calendar text-gray-400 mt-0.5 w-4"></i><div><p className="text-xs text-gray-500">Tanggal</p><p className="text-sm text-gray-800 font-medium">{item.tanggal}</p></div></div>
                                    <div className="flex items-start gap-3"><i className="fas fa-clock text-gray-400 mt-0.5 w-4"></i><div><p className="text-xs text-gray-500">Waktu</p><p className="text-sm text-gray-800 font-medium">{item.time || '-'}</p></div></div>
                                    <div className="flex items-start gap-3"><i className="fas fa-map-marker-alt text-gray-400 mt-0.5 w-4"></i><div><p className="text-xs text-gray-500">Tempat</p><p className="text-sm text-gray-800 font-medium">{item.lokasi || '-'}</p></div></div>
                                </div>
                                <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <div><p className="text-sm text-gray-500">Kehadiran Anda</p><p className="font-bold text-gray-800">{role}</p></div>
                                        <div className={`px-3 py-2 rounded-lg text-sm font-bold ${guruStatus === 'H' ? 'bg-green-500 text-white' : guruStatus === 'I' ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white'}`}>
                                            {guruStatus === 'H' ? 'HADIR' : guruStatus === 'I' ? 'IZIN' : 'ALPHA'}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                    <div className="flex-shrink-0 p-4 border-t border-gray-100 bg-white">
                        <button onClick={handleClose} className="w-full py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-medium active:scale-[0.98] transition-transform">Tutup</button>
                    </div>
                </div>
            )}
        </AnimatedModalWrapper>
    );
}

// =============================================
// MODAL RIWAYAT RAPAT SEKRETARIS - Read-only (Full form)
// =============================================
export function ModalRiwayatRapatSekretaris({ item, onClose }) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [pimpinanExpanded, setPimpinanExpanded] = useState(true);
    const [pesertaExpanded, setPesertaExpanded] = useState(false);

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                const response = await api.get(`/guru-panel/riwayat/rapat/${item.id}/detail`);
                if (response.data.success) setData(response.data.data);
            } catch (error) { console.error('Error:', error); }
            finally { setLoading(false); }
        };
        fetchDetail();
    }, [item.id]);

    // Use item.guru_status from prop (available immediately) for header color
    const guruStatus = item.guru_status || 'H';
    const pesertaCounts = data?.peserta ? {
        hadir: data.peserta.filter(g => g.status === 'H').length,
        izin: data.peserta.filter(g => g.status === 'I').length,
        alpha: data.peserta.filter(g => g.status === 'A').length,
    } : { hadir: 0, izin: 0, alpha: 0 };

    // Header color based on item.guru_status (available immediately)
    const getHeaderGradient = () => {
        if (guruStatus === 'H') return 'bg-gradient-to-r from-green-600 to-green-700';
        if (guruStatus === 'I') return 'bg-gradient-to-r from-yellow-500 to-yellow-600';
        return 'bg-gradient-to-r from-red-500 to-red-600';
    };

    const getSubtitleColor = () => {
        if (guruStatus === 'H') return 'text-green-100';
        if (guruStatus === 'I') return 'text-yellow-100';
        return 'text-red-100';
    };

    return (
        <AnimatedModalWrapper onClose={onClose}>
            {(handleClose) => (
                <div className="bg-white rounded-2xl w-full flex flex-col shadow-2xl overflow-hidden" style={{ maxHeight: '85vh' }}>
                    <div className={`text-white p-4 flex-shrink-0 ${getHeaderGradient()}`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><i className="fas fa-users"></i></div>
                                <div><h2 className="font-bold text-sm">{item.nama}</h2><p className={`text-xs ${getSubtitleColor()}`}><i className="fas fa-map-marker-alt mr-1"></i>{item.lokasi || '-'} • {item.time || '-'}</p></div>
                            </div>
                            <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-lg"><i className="fas fa-times text-xl"></i></button>
                        </div>
                        <div className="flex gap-6 mt-4 text-center">
                            {loading ? (
                                <>
                                    <div className="flex-1"><div className="h-8 w-8 mx-auto bg-white/30 rounded animate-pulse"></div><p className={`text-xs ${getSubtitleColor()} mt-1`}>Hadir</p></div>
                                    <div className="flex-1"><div className="h-8 w-8 mx-auto bg-white/30 rounded animate-pulse"></div><p className={`text-xs ${getSubtitleColor()} mt-1`}>Izin</p></div>
                                    <div className="flex-1"><div className="h-8 w-8 mx-auto bg-white/30 rounded animate-pulse"></div><p className={`text-xs ${getSubtitleColor()} mt-1`}>Alpha</p></div>
                                </>
                            ) : (
                                <>
                                    <div className="flex-1"><p className="text-2xl font-bold">{pesertaCounts.hadir}</p><p className={`text-xs ${getSubtitleColor()}`}>Hadir</p></div>
                                    <div className="flex-1"><p className="text-2xl font-bold">{pesertaCounts.izin}</p><p className={`text-xs ${getSubtitleColor()}`}>Izin</p></div>
                                    <div className="flex-1"><p className="text-2xl font-bold">{pesertaCounts.alpha}</p><p className={`text-xs ${getSubtitleColor()}`}>Alpha</p></div>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {loading ? (
                            <div className="space-y-4 animate-pulse">
                                <div className="h-12 bg-gray-100 rounded-xl"></div>
                                <div className="h-20 bg-gray-100 rounded-2xl"></div>
                                <div className="h-24 bg-gray-100 rounded-xl"></div>
                                <div className="h-24 bg-gray-100 rounded-xl"></div>
                            </div>
                        ) : (
                            <>
                                <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                                    <div className="flex items-center gap-2 text-green-700 text-sm font-medium"><i className="fas fa-user-edit"></i><span>Sekretaris Rapat</span></div>
                                </div>
                                <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <div><p className="text-sm text-gray-500">Kehadiran Anda</p><p className="font-bold text-gray-800">Sekretaris</p></div>
                                        <div className={`px-3 py-2 rounded-lg text-sm font-bold ${guruStatus === 'H' ? 'bg-green-500 text-white' : guruStatus === 'I' ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white'}`}>
                                            {guruStatus === 'H' ? 'HADIR' : guruStatus === 'I' ? 'IZIN' : 'ALPHA'}
                                        </div>
                                    </div>
                                </div>

                                {/* Pimpinan Section */}
                                <div className="border border-gray-200 rounded-xl overflow-hidden">
                                    <button onClick={() => setPimpinanExpanded(!pimpinanExpanded)} className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-pink-50">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center"><i className="fas fa-user-tie text-white"></i></div>
                                            <div className="text-left"><p className="font-semibold text-gray-800">Pimpinan Rapat</p><p className="text-xs text-gray-500">{data?.pimpinan?.nama || '-'}</p></div>
                                        </div>
                                        <div className={`w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center transition-transform ${pimpinanExpanded ? 'rotate-180' : ''}`}><i className="fas fa-chevron-down text-gray-500 text-sm"></i></div>
                                    </button>
                                    {pimpinanExpanded && data?.pimpinan && (
                                        <div className="p-3">
                                            <div className="bg-white border rounded-xl p-3 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-semibold">{data.pimpinan.nama?.charAt(0) || 'P'}</div>
                                                    <div><p className="font-semibold text-gray-800 text-sm">{data.pimpinan.nama}</p><p className="text-xs text-gray-400">{data.pimpinan.nip || 'Pimpinan'}</p></div>
                                                </div>
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${data.pimpinan.status === 'H' ? 'bg-green-500 text-white' : data.pimpinan.status === 'I' ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white'}`}>{data.pimpinan.status || 'H'}</div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Peserta Section */}
                                <div className="border border-gray-200 rounded-xl overflow-hidden">
                                    <button onClick={() => setPesertaExpanded(!pesertaExpanded)} className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center"><i className="fas fa-users text-white"></i></div>
                                            <div className="text-left"><p className="font-semibold text-gray-800">Peserta Rapat</p><p className="text-xs text-gray-500"><span className="text-green-600">{pesertaCounts.hadir} hadir</span> • <span className="text-yellow-600">{pesertaCounts.izin} izin</span> • <span className="text-red-600">{pesertaCounts.alpha} alpha</span></p></div>
                                        </div>
                                        <div className={`w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center transition-transform ${pesertaExpanded ? 'rotate-180' : ''}`}><i className="fas fa-chevron-down text-gray-500 text-sm"></i></div>
                                    </button>
                                    {pesertaExpanded && data?.peserta?.length > 0 && (
                                        <div className="p-3 space-y-2 max-h-[350px] overflow-y-auto">
                                            {data.peserta.map((guru, i) => (
                                                <div key={i} className="bg-white border rounded-xl p-3 flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-semibold">{guru.nama?.charAt(0) || 'G'}</div>
                                                        <div><p className="font-semibold text-gray-800 text-sm">{guru.nama}</p><p className="text-xs text-gray-400">{guru.nip || 'Peserta'}</p></div>
                                                    </div>
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${guru.status === 'H' ? 'bg-green-500 text-white' : guru.status === 'I' ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white'}`}>{guru.status}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Notulensi */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Notulensi Rapat</label>
                                    <div className="w-full border border-gray-200 rounded-xl p-3 text-sm bg-gray-50 text-gray-700 min-h-[80px]">{data?.notulensi || '-'}</div>
                                </div>
                            </>
                        )}
                    </div>
                    <div className="flex-shrink-0 p-4 border-t border-gray-100 bg-white">
                        <button onClick={handleClose} className={`w-full py-3 text-white rounded-xl font-medium active:scale-[0.98] transition-transform ${guruStatus === 'H' ? 'bg-gradient-to-r from-green-500 to-green-600' : guruStatus === 'I' ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' : 'bg-gradient-to-r from-red-500 to-red-600'}`}>Tutup</button>
                    </div>
                </div>
            )}
        </AnimatedModalWrapper>
    );
}

// =============================================
// MODAL TERLEWAT (Alpha)
// =============================================
export function ModalTerlewat({ item, type, onClose }) {
    const getTypeLabel = () => {
        switch (type) {
            case 'mengajar': return 'mengajar';
            case 'kegiatan': return 'kegiatan';
            case 'rapat': return 'rapat';
            default: return 'jadwal';
        }
    };
    return (
        <AnimatedModalWrapper onClose={onClose} maxWidth="max-w-sm">
            {(handleClose) => (
                <div className="bg-white rounded-2xl w-full shadow-2xl overflow-hidden">
                    <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-5 text-center">
                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3"><i className="fas fa-lock text-3xl"></i></div>
                        <h2 className="font-bold text-lg">Absensi Terkunci</h2>
                        <p className="text-red-100 text-sm mt-1">Jadwal {getTypeLabel()} terlewat</p>
                    </div>
                    <div className="p-5 space-y-4">
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                            <div className="flex items-start gap-3"><i className="fas fa-exclamation-triangle text-red-500 mt-0.5"></i><div><p className="text-sm font-medium text-red-800">Tidak ada data absensi</p><p className="text-xs text-red-600 mt-1">Status: <span className="font-bold">Alpha</span></p></div></div>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                            <div className="flex justify-between"><span className="text-xs text-gray-400">Jadwal</span><span className="text-sm font-medium text-gray-800">{item.nama || item.mapel || '-'}</span></div>
                            {item.kelas && <div className="flex justify-between"><span className="text-xs text-gray-400">Kelas</span><span className="text-sm font-medium text-gray-800">{item.kelas}</span></div>}
                            <div className="flex justify-between"><span className="text-xs text-gray-400">Tanggal</span><span className="text-sm font-medium text-gray-800">{item.tanggal}</span></div>
                        </div>
                        <div className="text-center text-xs text-gray-400"><i className="fas fa-info-circle mr-1"></i>Hubungi admin jika ada kesalahan</div>
                    </div>
                    <div className="p-4 border-t border-gray-100">
                        <button onClick={handleClose} className="w-full py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl font-medium active:scale-[0.98] transition-transform">Tutup</button>
                    </div>
                </div>
            )}
        </AnimatedModalWrapper>
    );
}

// =============================================
// MODAL IZIN
// =============================================
export function ModalIzin({ item, type, onClose }) {
    const getTypeLabel = () => {
        switch (type) {
            case 'mengajar': return 'mengajar';
            case 'kegiatan': return 'kegiatan';
            case 'rapat': return 'rapat';
            default: return 'jadwal';
        }
    };
    return (
        <AnimatedModalWrapper onClose={onClose} maxWidth="max-w-sm">
            {(handleClose) => (
                <div className="bg-white rounded-2xl w-full shadow-2xl overflow-hidden">
                    <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white p-5 text-center">
                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3"><i className="fas fa-user-clock text-3xl"></i></div>
                        <h2 className="font-bold text-lg">Izin</h2>
                        <p className="text-yellow-100 text-sm mt-1">Anda izin di jadwal {getTypeLabel()} ini</p>
                    </div>
                    <div className="p-5 space-y-4">
                        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                            <div className="flex justify-between"><span className="text-xs text-gray-400">Jadwal</span><span className="text-sm font-medium text-gray-800">{item.nama || item.mapel || '-'}</span></div>
                            {item.kelas && <div className="flex justify-between"><span className="text-xs text-gray-400">Kelas</span><span className="text-sm font-medium text-gray-800">{item.kelas}</span></div>}
                            <div className="flex justify-between"><span className="text-xs text-gray-400">Tanggal</span><span className="text-sm font-medium text-gray-800">{item.tanggal}</span></div>
                        </div>
                        {item.guru_keterangan && (
                            <div><label className="block text-sm font-semibold text-gray-700 mb-2">Keterangan Izin</label><div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm text-gray-700">{item.guru_keterangan}</div></div>
                        )}
                    </div>
                    <div className="p-4 border-t border-gray-100">
                        <button onClick={handleClose} className="w-full py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-xl font-medium active:scale-[0.98] transition-transform">Tutup</button>
                    </div>
                </div>
            )}
        </AnimatedModalWrapper>
    );
}

