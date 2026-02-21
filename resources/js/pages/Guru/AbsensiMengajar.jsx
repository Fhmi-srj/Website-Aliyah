import React, { useState, useEffect } from 'react';
import api from '../../lib/axios';
import { useAuth } from '../../contexts/AuthContext';
import { ModalBelumMulai, ModalAbsensiSiswa, ModalSudahAbsen } from './components/AbsensiModals';
import { AnimatedDayTabs } from './components/AnimatedTabs';
import SwipeableContent from './components/SwipeableContent';

function AbsensiMengajar() {
    const { user } = useAuth();
    const days = ['Sabtu', 'Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis'];

    // Get current day name in Indonesian
    const getTodayName = () => {
        const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        return dayNames[new Date().getDay()];
    };

    const [selectedDay, setSelectedDay] = useState(getTodayName());
    const [loading, setLoading] = useState(true);
    const [weeklySchedule, setWeeklySchedule] = useState({});
    const [tanggalHariIni, setTanggalHariIni] = useState('');
    const [tanggalRaw, setTanggalRaw] = useState('');
    const [guruData, setGuruData] = useState({ name: '', nip: '' });

    // Modal states
    const [selectedJadwal, setSelectedJadwal] = useState(null);
    const [modalType, setModalType] = useState(null);
    const [siswaList, setSiswaList] = useState([]);

    // Fetch jadwal for all days and guru profile
    useEffect(() => {
        const fetchWeeklySchedule = async () => {
            try {
                setLoading(true);
                const response = await api.get('/guru-panel/jadwal-seminggu');
                setWeeklySchedule(response.data.jadwal || {});
                setTanggalHariIni(response.data.tanggal || '');
                setTanggalRaw(response.data.tanggal_raw || '');
            } catch (err) {
                console.error('Error fetching weekly schedule:', err);
                // Fallback: fetch jadwal hari ini saja
                try {
                    const todayResponse = await api.get('/guru-panel/jadwal-hari-ini');
                    const todayName = getTodayName();
                    setWeeklySchedule({ [todayName]: todayResponse.data.jadwal || [] });
                    setTanggalHariIni(todayResponse.data.tanggal || '');
                    setTanggalRaw(todayResponse.data.tanggal_raw || '');
                } catch (e) {
                    console.error('Error fetching today schedule:', e);
                }
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

        fetchWeeklySchedule();
        fetchProfile();
    }, []);

    // Helper function untuk status color
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

    // Handle jadwal click
    const handleJadwalClick = async (jadwal) => {
        // Only allow interaction for today
        if (selectedDay !== getTodayName()) {
            return; // Just show, can't interact with other days
        }

        setSelectedJadwal(jadwal);

        // Treat 'terlewat' same as 'sedang_berlangsung' - both should open absensi modal
        const effectiveStatus = jadwal.status === 'terlewat' ? 'sedang_berlangsung' : jadwal.status;
        setModalType(effectiveStatus);

        // If sedang_berlangsung or terlewat, fetch siswa list
        if (jadwal.status === 'sedang_berlangsung' || jadwal.status === 'terlewat') {
            try {
                const response = await api.get(`/guru-panel/jadwal/${jadwal.id}/detail`);
                setSiswaList(response.data.siswa || []);
            } catch (err) {
                console.error('Error fetching siswa:', err);
                setSiswaList([]);
            }
        }
    };

    // Close modal
    const handleCloseModal = () => {
        setModalType(null);
        setSelectedJadwal(null);
        setSiswaList([]);
    };

    // Refresh after absensi success
    const handleAbsensiSuccess = async () => {
        handleCloseModal();
        try {
            const todayResponse = await api.get('/guru-panel/jadwal-hari-ini');
            const todayName = getTodayName();
            setWeeklySchedule(prev => ({
                ...prev,
                [todayName]: todayResponse.data.jadwal || []
            }));
        } catch (err) {
            console.error('Error refreshing jadwal:', err);
        }
    };

    const currentSchedule = weeklySchedule[selectedDay] || [];
    const isToday = selectedDay === getTodayName();
    const currentDayIndex = days.indexOf(selectedDay);

    // Handle swipe navigation
    const handleSwipeChange = (newIndex) => {
        if (newIndex >= 0 && newIndex < days.length) {
            setSelectedDay(days[newIndex]);
        }
    };

    // Loading skeleton
    if (loading) {
        return (
            <div className="animate-pulse">
                <div className="bg-green-200 h-24"></div>
                <div className="p-4 space-y-4">
                    <div className="bg-gray-200 rounded-xl h-14"></div>
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
            <div className="bg-gradient-to-r from-green-600 to-green-700 px-4 py-6 text-white">
                <h1 className="text-xl font-bold">Absensi Mengajar</h1>
                <p className="text-green-100 text-sm">Jadwal mengajar mingguan</p>
            </div>

            {/* Day Pills - Animated */}
            <div className="px-4 pt-4">
                <AnimatedDayTabs
                    days={days}
                    activeDay={selectedDay}
                    onDayChange={setSelectedDay}
                />
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
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span> Alpha
                </span>
            </div>

            {/* Swipeable Content Area */}
            <SwipeableContent
                currentIndex={currentDayIndex}
                totalItems={days.length}
                onIndexChange={handleSwipeChange}
            >
                {/* Info for non-today */}
                {!isToday && (
                    <div className="mx-4 mt-4 p-3 bg-blue-50 rounded-xl text-blue-600 text-sm flex items-center gap-2">
                        <i className="fas fa-info-circle"></i>
                        <span>Anda hanya bisa melakukan absensi untuk jadwal hari ini</span>
                    </div>
                )}

                {/* Class List */}
                <div className="p-4 space-y-3">
                    {currentSchedule.length > 0 ? (
                        currentSchedule.map(jadwal => {
                            const colors = getStatusColor(jadwal.status, jadwal.kehadiran_status);
                            const canInteract = isToday && jadwal.status !== 'sudah_absen';

                            return (
                                <button
                                    key={jadwal.id}
                                    onClick={() => isToday && handleJadwalClick(jadwal)}
                                    disabled={!isToday}
                                    className={`w-full bg-white rounded-xl shadow-sm p-4 transition-all border-l-4 ${colors.border} ${canInteract ? 'cursor-pointer hover:shadow-md' : 'cursor-default'
                                        } ${jadwal.status === 'sudah_absen' ? 'opacity-60' : ''} ${!isToday ? 'opacity-50' : ''}`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`w-12 h-12 ${colors.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                                            <i className={`fas fa-door-open ${colors.icon}`}></i>
                                        </div>
                                        <div className="flex-1 min-w-0 text-left">
                                            {/* Row 1: Mapel */}
                                            <p className="font-semibold text-gray-800 truncate">{jadwal.mapel}</p>
                                            {/* Row 2: Kelas */}
                                            <p className="text-xs text-gray-500 truncate">{jadwal.kelas}</p>
                                            {/* Row 3: Badge JP + Time + Status */}
                                            <div className="flex items-center justify-between mt-1.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">Jam ke {jadwal.jam_ke}</span>
                                                    <span className="text-[10px] text-gray-400">
                                                        {jadwal.jam_mulai?.substring(0, 5)} - {jadwal.jam_selesai?.substring(0, 5)}
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
                            <p className="text-gray-500 font-medium">Tidak ada jadwal</p>
                            <p className="text-gray-400 text-sm">Hari {selectedDay} tidak ada jadwal mengajar</p>
                        </div>
                    )}
                </div>
            </SwipeableContent>

            {/* Modals */}
            {modalType === 'belum_mulai' && selectedJadwal && (
                <ModalBelumMulai
                    jadwal={selectedJadwal}
                    tanggal={tanggalHariIni}
                    onClose={handleCloseModal}
                />
            )}

            {modalType === 'sedang_berlangsung' && selectedJadwal && (
                <ModalAbsensiSiswa
                    jadwal={selectedJadwal}
                    tanggal={tanggalRaw}
                    siswaList={siswaList}
                    onClose={handleCloseModal}
                    onSuccess={handleAbsensiSuccess}
                    guruName={guruData.name}
                    guruNip={guruData.nip}
                />
            )}

            {modalType === 'sudah_absen' && selectedJadwal && (
                <ModalSudahAbsen
                    jadwal={selectedJadwal}
                    onClose={handleCloseModal}
                />
            )}

        </div>
    );
}

export default AbsensiMengajar;
