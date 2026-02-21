import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/axios';
import { useAuth } from '../../contexts/AuthContext';
import { ModalAbsensiKegiatanPJ, ModalKegiatanBelumMulai, ModalKegiatanSudahAbsen, ModalAbsensiKegiatanPendamping } from './components/KegiatanModals';

function AbsensiKegiatan() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [kegiatanByDate, setKegiatanByDate] = useState({});
    const [guruData, setGuruData] = useState({ name: '', nip: '' });
    const [isUnlocked, setIsUnlocked] = useState(false);

    // Modal states
    const [selectedKegiatan, setSelectedKegiatan] = useState(null);
    const [modalType, setModalType] = useState(null);
    const [guruPendamping, setGuruPendamping] = useState([]);
    const [siswaList, setSiswaList] = useState([]);

    // Get today's date
    const today = new Date().toISOString().split('T')[0];

    // Flatten all kegiatan from all dates into a single list with date info
    const allKegiatan = useMemo(() => {
        const result = [];
        const sortedDates = Object.keys(kegiatanByDate).sort();

        for (const dateStr of sortedDates) {
            const items = kegiatanByDate[dateStr] || [];
            for (const item of items) {
                result.push({
                    ...item,
                    dateStr,
                    isToday: dateStr === today
                });
            }
        }
        return result;
    }, [kegiatanByDate, today]);

    // Fetch kegiatan (from today onwards)
    useEffect(() => {
        const fetchKegiatan = async () => {
            try {
                setLoading(true);
                const response = await api.get('/guru-panel/kegiatan-seminggu');
                setKegiatanByDate(response.data.kegiatan || {});
                setIsUnlocked(response.data.unlocked || false);
            } catch (err) {
                console.error('Error fetching kegiatan:', err);
                setKegiatanByDate({});
            } finally {
                setLoading(false);
            }
        };

        const fetchProfile = async () => {
            try {
                const response = await api.get('/guru-panel/profile');
                setGuruData({
                    name: response.data.nama || user?.name || 'Guru',
                    nip: response.data.nip || ''
                });
            } catch (err) {
                console.error('Error fetching profile:', err);
                setGuruData({ name: user?.name || 'Guru', nip: '' });
            }
        };

        fetchKegiatan();
        fetchProfile();
    }, []);

    // Format date for display
    const formatDate = (dateStr) => {
        const date = new Date(dateStr + 'T00:00:00');
        if (dateStr === today) return 'Hari ini';

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (dateStr === tomorrow.toISOString().split('T')[0]) return 'Besok';

        return date.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
    };

    // Helper function untuk menentukan status
    const getStatusColor = (status, kehadiranStatus) => {
        if (status === 'sudah_absen') {
            switch (kehadiranStatus) {
                case 'S':
                    return { border: 'border-l-blue-500', bg: 'bg-blue-100', icon: 'text-blue-500', label: 'Sakit', labelBg: 'bg-blue-100 text-blue-700' };
                case 'I':
                    return { border: 'border-l-amber-500', bg: 'bg-amber-100', icon: 'text-amber-500', label: 'Izin', labelBg: 'bg-amber-100 text-amber-700' };
                case 'A':
                    return { border: 'border-l-red-500', bg: 'bg-red-100', icon: 'text-red-500', label: 'Alpha', labelBg: 'bg-red-100 text-red-700' };
                case 'H':
                default:
                    return { border: 'border-l-green-500', bg: 'bg-green-100', icon: 'text-green-500', label: 'Hadir', labelBg: 'bg-green-100 text-green-700' };
            }
        }
        switch (status) {
            case 'sedang_berlangsung':
                return { border: 'border-l-red-500', bg: 'bg-red-100', icon: 'text-red-500', label: 'Belum Absen', labelBg: 'bg-red-100 text-red-700' };
            case 'terlewat':
                return { border: 'border-l-red-500', bg: 'bg-red-100', icon: 'text-red-500', label: 'Terlewat', labelBg: 'bg-red-100 text-red-700' };
            case 'belum_mulai':
            default:
                return { border: 'border-l-blue-500', bg: 'bg-blue-100', icon: 'text-blue-500', label: 'Akan Datang', labelBg: 'bg-blue-100 text-blue-700' };
        }
    };

    // Handle kegiatan click
    const handleKegiatanClick = async (item) => {
        // Only allow interaction for today's kegiatan
        if (!item.isToday) return;

        setSelectedKegiatan(item);

        // If unlocked + sudah_absen + pendamping, allow re-attendance
        if (isUnlocked && item.status_absensi === 'sudah_absen' && item.role === 'pendamping') {
            setModalType('sedang_berlangsung');
            return;
        }

        // If unlocked + sudah_absen + PJ, allow re-editing
        if (isUnlocked && item.status_absensi === 'sudah_absen' && item.role === 'penanggung_jawab') {
            setModalType('sedang_berlangsung');
            try {
                const response = await api.get(`/guru-panel/kegiatan/${item.id}/detail`);
                setGuruPendamping(response.data.guru_pendamping || []);
                setSiswaList(response.data.siswa || []);
            } catch (err) {
                console.error('Error fetching kegiatan detail:', err);
                setGuruPendamping([]);
                setSiswaList([]);
            }
            return;
        }

        // Treat 'terlewat' same as 'sedang_berlangsung'
        const effectiveStatus = item.status_absensi === 'terlewat' ? 'sedang_berlangsung' : item.status_absensi;
        setModalType(effectiveStatus);

        // If sedang_berlangsung or terlewat, fetch detail
        if (item.status_absensi === 'sedang_berlangsung' || item.status_absensi === 'terlewat') {
            try {
                const response = await api.get(`/guru-panel/kegiatan/${item.id}/detail`);
                setGuruPendamping(response.data.guru_pendamping || []);
                setSiswaList(response.data.siswa || []);
            } catch (err) {
                console.error('Error fetching kegiatan detail:', err);
                setGuruPendamping([]);
                setSiswaList([]);
            }
        }
    };

    // Close modal
    const handleCloseModal = () => {
        setModalType(null);
        setSelectedKegiatan(null);
        setGuruPendamping([]);
        setSiswaList([]);
    };

    // Refresh after absensi success
    const handleAbsensiSuccess = async () => {
        handleCloseModal();
        try {
            const response = await api.get('/guru-panel/kegiatan-seminggu');
            setKegiatanByDate(response.data.kegiatan || {});
            setIsUnlocked(response.data.unlocked || false);
        } catch (err) {
            console.error('Error refreshing kegiatan:', err);
        }
    };

    // Format time
    const formatTime = (datetime) => {
        if (!datetime) return '-';
        const d = new Date(datetime);
        return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    };

    // Get formatted date for modal
    const getFormattedDate = () => {
        if (!selectedKegiatan) return '';
        const date = new Date(selectedKegiatan.dateStr + 'T00:00:00');
        return date.toLocaleDateString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    // Loading skeleton
    if (loading) {
        return (
            <div className="animate-pulse">
                <div className="bg-green-200 h-24"></div>
                <div className="p-4 space-y-4">
                    <div className="bg-gray-200 rounded-xl h-20"></div>
                    <div className="bg-gray-200 rounded-xl h-20"></div>
                    <div className="bg-gray-200 rounded-xl h-20"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fadeIn">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-green-600 px-4 py-6 text-white">
                <h1 className="text-xl font-bold">Absensi Kegiatan</h1>
                <p className="text-green-100 text-sm">Jadwal kegiatan hari ini & mendatang</p>
            </div>

            {/* Legend */}
            <div className="px-4 pt-4 flex gap-2 flex-wrap">
                <span className="text-[10px] px-2 py-1 rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span> Hadir
                </span>
                <span className="text-[10px] px-2 py-1 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span> Sakit
                </span>
                <span className="text-[10px] px-2 py-1 rounded-full bg-amber-100 text-amber-700 flex items-center gap-1">
                    <span className="w-2 h-2 bg-amber-500 rounded-full"></span> Izin
                </span>
                <span className="text-[10px] px-2 py-1 rounded-full bg-red-100 text-red-700 flex items-center gap-1">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span> Alpha / Belum Absen
                </span>
                <span className="text-[10px] px-2 py-1 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1">
                    <span className="w-2 h-2 bg-blue-400 rounded-full"></span> Akan Datang
                </span>
            </div>

            {/* Activity List */}
            <div className="p-4 space-y-3">
                {allKegiatan.length > 0 ? (
                    allKegiatan.map((item, index) => {
                        const colors = getStatusColor(isUnlocked && item.status_absensi === 'sudah_absen' ? 'sedang_berlangsung' : item.status_absensi, item.kehadiran_status);
                        const canInteract = item.isToday && (item.status_absensi !== 'sudah_absen' || isUnlocked);
                        const isPJ = item.role === 'penanggung_jawab';

                        return (
                            <button
                                key={`${item.id}-${item.dateStr}`}
                                onClick={() => handleKegiatanClick(item)}
                                disabled={!item.isToday}
                                className={`w-full bg-white rounded-xl shadow-sm p-4 transition-all border-l-4 ${colors.border} ${canInteract ? 'cursor-pointer hover:shadow-md' : 'cursor-default'
                                    } ${item.status_absensi === 'sudah_absen' && !isUnlocked ? 'opacity-60' : ''} ${!item.isToday ? 'opacity-70' : ''}`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`w-12 h-12 ${colors.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                                        <i className={`fas fa-calendar-check ${colors.icon}`}></i>
                                    </div>
                                    <div className="flex-1 min-w-0 text-left">
                                        {/* Row 1: Title */}
                                        <p className="font-semibold text-gray-800 truncate">{item.nama_kegiatan}</p>
                                        {/* Row 2: Location */}
                                        <p className="text-xs text-gray-500 truncate">
                                            <i className="fas fa-map-marker-alt mr-1"></i>{item.tempat || '-'}
                                        </p>
                                        {/* Row 3: Kelas & Guru Pendamping */}
                                        <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-500">
                                            {item.kelas_peserta_list?.length > 0 && (
                                                <span className="flex items-center gap-1">
                                                    <i className="fas fa-users"></i>
                                                    {item.kelas_peserta_list.map(k => k.nama_kelas).join(', ')}
                                                </span>
                                            )}
                                            {item.guru_pendamping_list?.length > 0 && (
                                                <span className="flex items-center gap-1">
                                                    <i className="fas fa-chalkboard-teacher"></i>
                                                    {item.guru_pendamping_list.length} guru
                                                </span>
                                            )}
                                        </div>
                                        {/* Row 3: Badge PJ + Date + Time + Status */}
                                        <div className="flex items-center justify-between mt-1.5">
                                            <div className="flex items-center gap-2">
                                                {isPJ && (
                                                    <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">PJ</span>
                                                )}
                                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${item.isToday ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                    {formatDate(item.dateStr)}
                                                </span>
                                                <span className="text-[10px] text-gray-400">
                                                    {formatTime(item.waktu_mulai)} - {formatTime(item.waktu_berakhir)}
                                                </span>
                                            </div>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${colors.labelBg}`}>
                                                {colors.label}
                                            </span>

                                        </div>
                                    </div>
                                </div>
                            </button>
                        );
                    })
                ) : (
                    <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i className="fas fa-calendar-times text-gray-400 text-2xl"></i>
                        </div>
                        <p className="text-gray-500 font-medium">Tidak ada kegiatan</p>
                        <p className="text-gray-400 text-sm">Belum ada kegiatan yang dijadwalkan</p>
                    </div>
                )}
            </div>

            {/* Modals */}
            {modalType === 'belum_mulai' && selectedKegiatan && (
                <ModalKegiatanBelumMulai
                    kegiatan={selectedKegiatan}
                    tanggal={getFormattedDate()}
                    onClose={handleCloseModal}
                />
            )}

            {modalType === 'sedang_berlangsung' && selectedKegiatan && selectedKegiatan.role === 'penanggung_jawab' && (
                <ModalAbsensiKegiatanPJ
                    kegiatan={selectedKegiatan}
                    tanggal={getFormattedDate()}
                    guruPendamping={guruPendamping}
                    siswaList={siswaList}
                    onClose={handleCloseModal}
                    onSuccess={handleAbsensiSuccess}
                    guruName={guruData.name}
                    guruNip={guruData.nip}
                    isUnlocked={isUnlocked}
                />
            )}

            {modalType === 'sudah_absen' && selectedKegiatan && (
                <ModalKegiatanSudahAbsen
                    kegiatan={selectedKegiatan}
                    onClose={handleCloseModal}
                />
            )}

            {modalType === 'sedang_berlangsung' && selectedKegiatan && selectedKegiatan.role === 'pendamping' && (
                <ModalAbsensiKegiatanPendamping
                    kegiatan={selectedKegiatan}
                    tanggal={getFormattedDate()}
                    onClose={handleCloseModal}
                    onSuccess={handleAbsensiSuccess}
                    guruName={guruData.name}
                    guruNip={guruData.nip}
                    isUnlocked={isUnlocked}
                />
            )}
        </div>
    );
}

export default AbsensiKegiatan;
