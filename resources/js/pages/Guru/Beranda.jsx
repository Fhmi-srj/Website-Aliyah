import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/axios';
import { ModalBelumMulai, ModalAbsensiSiswa, ModalSudahAbsen } from './components/AbsensiModals';
import { ModalAbsensiKegiatanPJ, ModalKegiatanBelumMulai, ModalKegiatanSudahAbsen, ModalAbsensiKegiatanPendamping } from './components/KegiatanModals';
import { ModalRapatBelumMulai, ModalRapatSudahAbsen, ModalAbsensiRapatPeserta, ModalAbsensiRapatSekretaris } from './components/RapatModals';

function Beranda() {
    const navigate = useNavigate();
    const { user } = useAuth();

    // State for dashboard data
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dashboardData, setDashboardData] = useState({
        user: { name: '', nip: '', jabatan: '' },
        today: { date: '', scheduleCount: 0 },
        todaySchedule: [],
        todayActivities: [],
        todayMeetings: [],
        stats: { totalMengajar: 0, hadir: 0, izin: 0, sakit: 0, percentage: 0 },
        reminders: []
    });

    // State for jadwal absensi modals
    const [jadwalList, setJadwalList] = useState([]);
    const [tanggalJadwal, setTanggalJadwal] = useState('');
    const [selectedJadwal, setSelectedJadwal] = useState(null);
    const [modalType, setModalType] = useState(null); // 'belum_mulai', 'sedang_berlangsung', 'sudah_absen', 'terlewat'
    const [siswaList, setSiswaList] = useState([]);

    // State for kegiatan modals
    const [selectedKegiatan, setSelectedKegiatan] = useState(null);
    const [kegiatanModalType, setKegiatanModalType] = useState(null);
    const [guruPendamping, setGuruPendamping] = useState([]);
    const [kegiatanSiswaList, setKegiatanSiswaList] = useState([]);

    // State for rapat modals
    const [selectedRapat, setSelectedRapat] = useState(null);
    const [rapatModalType, setRapatModalType] = useState(null);
    const [rapatPimpinan, setRapatPimpinan] = useState(null);
    const [rapatPesertaList, setRapatPesertaList] = useState([]);

    // Helper function untuk menentukan status berdasarkan waktu (synced with AbsensiKegiatan)
    const getStatusColor = (status) => {
        switch (status) {
            case 'sudah_absen':
            case 'attended':
                return { border: 'border-l-green-500', bg: 'bg-green-100', text: 'text-green-600', label: 'Sudah Absen' };
            case 'sedang_berlangsung':
            case 'ongoing':
            case 'terlewat':
            case 'missed':
                return { border: 'border-l-red-500', bg: 'bg-red-100', text: 'text-red-600', label: status === 'terlewat' || status === 'missed' ? 'Terlewat' : 'Belum Absen' };
            case 'belum_mulai':
            case 'upcoming':
            default:
                return { border: 'border-l-blue-500', bg: 'bg-blue-100', text: 'text-blue-600', label: 'Akan Datang' };
        }
    };

    // Fetch dashboard data
    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                setLoading(true);
                console.log('Fetching dashboard from:', '/guru-panel/dashboard');
                const response = await api.get('/guru-panel/dashboard');
                console.log('Dashboard response:', response.data);
                setDashboardData(response.data);
                setError(null);
            } catch (err) {
                console.error('Error fetching dashboard:', err);
                console.error('Error response:', err.response?.data);
                console.error('Error status:', err.response?.status);
                const errorMsg = err.response?.data?.message || err.message || 'Gagal memuat data dashboard';
                setError(errorMsg);
            } finally {
                setLoading(false);
            }
        };

        const fetchJadwalHariIni = async () => {
            try {
                const response = await api.get('/guru-panel/jadwal-hari-ini');
                setJadwalList(response.data.jadwal || []);
                setTanggalJadwal(response.data.tanggal || '');
            } catch (err) {
                console.error('Error fetching jadwal:', err);
            }
        };

        fetchDashboard();
        fetchJadwalHariIni();
    }, []);

    // Handle jadwal click
    const handleJadwalClick = async (jadwal) => {
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

    // Close modal and refresh jadwal
    const handleCloseModal = () => {
        setModalType(null);
        setSelectedJadwal(null);
        setSiswaList([]);
    };

    // Refresh jadwal after successful absensi
    const handleAbsensiSuccess = async () => {
        handleCloseModal();
        try {
            const response = await api.get('/guru-panel/jadwal-hari-ini');
            setJadwalList(response.data.jadwal || []);
        } catch (err) {
            console.error('Error refreshing jadwal:', err);
        }
    };

    // Get status color for jadwal
    const getJadwalStatusColor = (status) => {
        switch (status) {
            case 'sudah_absen':
                return { border: 'border-l-green-500', text: 'text-green-600' };
            case 'sedang_berlangsung':
            case 'terlewat':
                return { border: 'border-l-red-500', text: 'text-red-600' };
            case 'belum_mulai':
            default:
                return { border: 'border-l-blue-500', text: 'text-blue-600' };
        }
    };

    // Handle kegiatan click - open modal based on status
    const handleKegiatanClick = async (kegiatan) => {
        setSelectedKegiatan(kegiatan);

        // Treat 'terlewat' same as 'sedang_berlangsung'
        const effectiveStatus = kegiatan.status === 'terlewat' ? 'sedang_berlangsung' : kegiatan.status;
        setKegiatanModalType(effectiveStatus);

        // If sedang_berlangsung or terlewat, fetch detail
        if (kegiatan.status === 'sedang_berlangsung' || kegiatan.status === 'terlewat') {
            try {
                const response = await api.get(`/guru-panel/kegiatan/${kegiatan.id}/detail`);
                setGuruPendamping(response.data.guru_pendamping || []);
                setKegiatanSiswaList(response.data.siswa || []);
            } catch (err) {
                console.error('Error fetching kegiatan detail:', err);
                setGuruPendamping([]);
                setKegiatanSiswaList([]);
            }
        }
    };

    // Close kegiatan modal
    const handleCloseKegiatanModal = () => {
        setKegiatanModalType(null);
        setSelectedKegiatan(null);
        setGuruPendamping([]);
        setKegiatanSiswaList([]);
    };

    // Refresh dashboard after kegiatan absensi success
    const handleKegiatanAbsensiSuccess = async () => {
        handleCloseKegiatanModal();
        try {
            const response = await api.get('/guru-panel/dashboard');
            setDashboardData(response.data);
        } catch (err) {
            console.error('Error refreshing dashboard:', err);
        }
    };

    // Handle rapat click - open modal based on status and role
    const handleRapatClick = async (rapat) => {
        setSelectedRapat(rapat);

        // Treat 'terlewat' same as 'sedang_berlangsung'
        const effectiveStatus = rapat.status === 'terlewat' ? 'sedang_berlangsung' : rapat.status;
        setRapatModalType(effectiveStatus);

        // If sedang_berlangsung or terlewat, fetch detail
        if (rapat.status === 'sedang_berlangsung' || rapat.status === 'terlewat') {
            try {
                const response = await api.get(`/guru-panel/rapat/${rapat.id}/detail`);
                setRapatPimpinan(response.data.pimpinan || null);
                setRapatPesertaList(response.data.peserta || []);
            } catch (err) {
                console.error('Error fetching rapat detail:', err);
                setRapatPimpinan(null);
                setRapatPesertaList([]);
            }
        }
    };

    // Close rapat modal
    const handleCloseRapatModal = () => {
        setRapatModalType(null);
        setSelectedRapat(null);
        setRapatPimpinan(null);
        setRapatPesertaList([]);
    };

    // Refresh dashboard after rapat absensi success
    const handleRapatAbsensiSuccess = async () => {
        handleCloseRapatModal();
        try {
            const response = await api.get('/guru-panel/dashboard');
            setDashboardData(response.data);
        } catch (err) {
            console.error('Error refreshing dashboard:', err);
        }
    };


    // Loading state
    if (loading) {
        return (
            <div className="p-4 space-y-4 animate-pulse">
                <div className="bg-green-200 rounded-2xl h-32"></div>
                <div className="bg-gray-200 rounded-2xl h-40"></div>
                <div className="bg-gray-200 rounded-2xl h-24"></div>
                <div className="bg-gray-200 rounded-2xl h-24"></div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="p-4">
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                    <i className="fas fa-exclamation-circle text-red-500 text-2xl mb-2"></i>
                    <p className="text-red-600">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-3 px-4 py-2 bg-red-500 text-white rounded-lg text-sm"
                    >
                        Coba Lagi
                    </button>
                </div>
            </div>
        );
    }

    const { todaySchedule, todayActivities, todayMeetings, stats, reminders, today } = dashboardData;
    const userData = dashboardData.user;

    return (
        <div className="p-4 space-y-4 animate-fadeIn">
            {/* Welcome Card */}
            <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-4 text-white shadow-lg">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                        <i className="fas fa-user text-2xl"></i>
                    </div>
                    <div className="flex-1">
                        <p className="text-green-100 text-xs">Selamat Datang,</p>
                        <h2 className="font-bold text-lg">{userData.name || user?.name || 'Guru'}</h2>
                        <p className="text-green-200 text-xs mt-0.5">
                            <i className="fas fa-id-badge mr-1"></i>
                            {userData.nip || 'NIP: -'} • {userData.jabatan || 'Guru'}
                        </p>
                    </div>
                </div>
                <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-xs">
                    <span className="text-green-100">
                        <i className="fas fa-calendar mr-1"></i>
                        {today.date || 'Memuat...'}
                    </span>
                    <span className="bg-white/20 px-2 py-1 rounded-full">
                        <i className="fas fa-chalkboard mr-1"></i>
                        {today.scheduleCount || 0} Jadwal Hari Ini
                    </span>
                </div>
            </div>

            {/* Statistik Absensi */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <i className="fas fa-chart-pie text-green-600"></i>
                    Statistik Absensi Bulan Ini
                </h3>

                {/* Simple Chart Visual */}
                <div className="flex items-center gap-4">
                    <div className="relative w-20 h-20">
                        <svg className="w-20 h-20 transform -rotate-90">
                            <circle cx="40" cy="40" r="32" stroke="#e5e7eb" strokeWidth="8" fill="none" />
                            <circle
                                cx="40" cy="40" r="32"
                                stroke="url(#greenGradient)"
                                strokeWidth="8"
                                fill="none"
                                strokeDasharray={`${stats.percentage * 2.01} 999`}
                                strokeLinecap="round"
                            />
                            <defs>
                                <linearGradient id="greenGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#22c55e" />
                                    <stop offset="100%" stopColor="#16a34a" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-lg font-bold text-green-600">{stats.percentage}%</span>
                        </div>
                    </div>
                    <div className="flex-1 grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-green-50 rounded-lg p-2">
                            <p className="text-green-600 font-semibold">{stats.hadir}</p>
                            <p className="text-gray-500">Hadir</p>
                        </div>
                        <div className="bg-yellow-50 rounded-lg p-2">
                            <p className="text-yellow-600 font-semibold">{stats.izin}</p>
                            <p className="text-gray-500">Izin</p>
                        </div>
                        <div className="bg-red-50 rounded-lg p-2">
                            <p className="text-red-600 font-semibold">{stats.sakit}</p>
                            <p className="text-gray-500">Sakit</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2">
                            <p className="text-gray-600 font-semibold">{stats.totalMengajar}</p>
                            <p className="text-gray-500">Total</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Jadwal Hari Ini - Horizontal Scroll (From API with click handlers) */}
            <div>
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2 px-1">
                    <i className="fas fa-chalkboard-teacher text-green-600"></i>
                    Jadwal Mengajar Hari Ini
                </h3>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
                    {jadwalList.length > 0 ? jadwalList.map((item) => {
                        const colors = getJadwalStatusColor(item.status);
                        return (
                            <button
                                key={item.id}
                                onClick={() => handleJadwalClick(item)}
                                className={`flex-shrink-0 w-40 bg-white rounded-xl p-3 shadow-sm border-l-4 ${colors.border} text-left cursor-pointer hover:shadow-md transition-shadow`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="font-medium text-gray-800 text-sm">{item.mapel}</div>
                                    <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">{item.jam_ke} JP</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-500">
                                        <i className="fas fa-door-open mr-1"></i>{item.kelas}
                                    </span>
                                    <span className={`${colors.text} font-semibold`}>
                                        {item.jam_mulai?.substring(0, 5)}
                                    </span>
                                </div>
                            </button>
                        );
                    }) : (
                        <div className="flex-shrink-0 w-full bg-gray-50 rounded-xl p-4 text-center text-gray-400 text-sm">
                            Tidak ada jadwal mengajar hari ini
                        </div>
                    )}
                </div>
            </div>

            {/* Jadwal Kegiatan - Horizontal Scroll (only show if data exists) */}
            {todayActivities.length > 0 && (
                <div>
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2 px-1">
                        <i className="fas fa-calendar-check text-green-500"></i>
                        Kegiatan Hari Ini
                    </h3>
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
                        {todayActivities.map((item) => {
                            const colors = getStatusColor(item.status);
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => handleKegiatanClick(item)}
                                    className={`flex-shrink-0 w-44 bg-white rounded-xl p-3 shadow-sm border-l-4 ${colors.border} text-left cursor-pointer hover:shadow-md transition-shadow`}
                                >
                                    <div className="font-medium text-gray-800 text-sm mb-1 line-clamp-2 leading-tight">{item.name}</div>
                                    <div className="text-[10px] text-gray-500 truncate mb-1">
                                        <i className="fas fa-map-marker-alt mr-1"></i>{item.location}
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className={`text-[10px] ${colors.text} font-semibold`}>{item.time}</span>
                                        {item.isPJ && (
                                            <span className="text-[8px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">PJ</span>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Jadwal Rapat - Horizontal Scroll (only show if data exists) */}
            {todayMeetings.length > 0 && (
                <div>
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2 px-1">
                        <i className="fas fa-users text-green-700"></i>
                        Rapat Hari Ini
                    </h3>
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
                        {todayMeetings.map((item) => {
                            const colors = getStatusColor(item.status);
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => handleRapatClick(item)}
                                    className={`flex-shrink-0 w-44 bg-white rounded-xl p-3 shadow-sm border-l-4 ${colors.border} text-left cursor-pointer hover:shadow-md transition-shadow`}
                                >
                                    <div className="font-medium text-gray-800 text-sm mb-1 line-clamp-2 leading-tight">{item.name}</div>
                                    <div className="text-[10px] text-gray-500 truncate mb-1">
                                        <i className="fas fa-map-marker-alt mr-1"></i>{item.location}
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className={`text-[10px] ${colors.text} font-semibold`}>{item.time}</span>
                                        {item.role && (
                                            <span className={`text-[8px] px-1.5 py-0.5 rounded font-medium ${item.role === 'pimpinan' ? 'bg-purple-100 text-purple-700' :
                                                item.role === 'sekretaris' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-green-100 text-green-700'
                                                }`}>
                                                {item.role === 'pimpinan' ? 'Pimpinan' : item.role === 'sekretaris' ? 'Sekretaris' : 'Peserta'}
                                            </span>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Menu Cepat Absensi */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <i className="fas fa-bolt text-green-500"></i>
                    Menu Cepat
                </h3>
                <div className="grid grid-cols-3 gap-3">
                    <button
                        onClick={() => navigate('/guru/absensi/mengajar')}
                        className="flex flex-col items-center gap-2 p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl text-white cursor-pointer hover:shadow-lg transition-shadow"
                    >
                        <i className="fas fa-chalkboard-teacher text-xl"></i>
                        <span className="text-[10px] font-medium">Mengajar</span>
                    </button>
                    <button
                        onClick={() => navigate('/guru/absensi/kegiatan')}
                        className="flex flex-col items-center gap-2 p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl text-white cursor-pointer hover:shadow-lg transition-shadow"
                    >
                        <i className="fas fa-calendar-check text-xl"></i>
                        <span className="text-[10px] font-medium">Kegiatan</span>
                    </button>
                    <button
                        onClick={() => navigate('/guru/absensi/rapat')}
                        className="flex flex-col items-center gap-2 p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl text-white cursor-pointer hover:shadow-lg transition-shadow"
                    >
                        <i className="fas fa-users text-xl"></i>
                        <span className="text-[10px] font-medium">Rapat</span>
                    </button>
                </div>
            </div>

            {/* Pengingat Penting */}
            {reminders.length > 0 && (
                <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl p-4 border border-red-100">
                    <h3 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
                        <i className="fas fa-bell text-red-500 animate-pulse"></i>
                        Pengingat Penting
                    </h3>
                    <div className="space-y-2">
                        {reminders.map((reminder, index) => {
                            const isHigh = reminder.priority === 'high';
                            const isMedium = reminder.priority === 'medium';
                            const borderColor = isHigh ? 'border-l-red-500' : isMedium ? 'border-l-orange-500' : 'border-l-green-500';
                            const bgColor = isHigh ? 'bg-red-100' : isMedium ? 'bg-orange-100' : 'bg-green-100';
                            const iconColor = isHigh ? 'text-red-500' : isMedium ? 'text-orange-500' : 'text-green-500';
                            const icon = reminder.type === 'mengajar' ? 'fa-exclamation-triangle' :
                                reminder.type === 'kegiatan' ? 'fa-calendar-times' :
                                    reminder.type === 'rapat' ? 'fa-clock' : 'fa-chalkboard';

                            return (
                                <div key={index} className={`bg-white rounded-xl p-3 flex items-center gap-3 border-l-4 ${borderColor}`}>
                                    <div className={`w-10 h-10 ${bgColor} rounded-full flex items-center justify-center flex-shrink-0`}>
                                        <i className={`fas ${icon} ${iconColor}`}></i>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-gray-800">{reminder.title}</p>
                                        <p className="text-xs text-gray-500">{reminder.description}</p>
                                    </div>
                                    {reminder.type === 'mengajar' || reminder.type === 'kegiatan' ? (
                                        <button
                                            onClick={() => navigate(`/guru/absensi/${reminder.type}`)}
                                            className={`text-xs ${isHigh ? 'bg-red-500' : 'bg-orange-500'} text-white px-3 py-1.5 rounded-full cursor-pointer hover:opacity-90`}
                                        >
                                            Absen
                                        </button>
                                    ) : reminder.countdown ? (
                                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-medium">
                                            <i className="fas fa-hourglass-half mr-1"></i>{reminder.countdown}m
                                        </span>
                                    ) : (
                                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                                            <i className="fas fa-arrow-right mr-1"></i>Next
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Modals for Absensi */}
            {modalType === 'belum_mulai' && selectedJadwal && (
                <ModalBelumMulai
                    jadwal={selectedJadwal}
                    tanggal={tanggalJadwal}
                    onClose={handleCloseModal}
                />
            )}

            {modalType === 'sedang_berlangsung' && selectedJadwal && (
                <ModalAbsensiSiswa
                    jadwal={selectedJadwal}
                    tanggal={tanggalJadwal}
                    siswaList={siswaList}
                    onClose={handleCloseModal}
                    onSuccess={handleAbsensiSuccess}
                    guruName={dashboardData.user.name}
                    guruNip={dashboardData.user.nip}
                />
            )}

            {modalType === 'sudah_absen' && selectedJadwal && (
                <ModalSudahAbsen
                    jadwal={selectedJadwal}
                    onClose={handleCloseModal}
                />
            )}

            {/* Kegiatan Modals */}
            {kegiatanModalType === 'belum_mulai' && selectedKegiatan && (
                <ModalKegiatanBelumMulai
                    kegiatan={selectedKegiatan}
                    onClose={handleCloseKegiatanModal}
                />
            )}

            {kegiatanModalType === 'sedang_berlangsung' && selectedKegiatan && selectedKegiatan.isPJ && (
                <ModalAbsensiKegiatanPJ
                    kegiatan={{
                        ...selectedKegiatan,
                        nama_kegiatan: selectedKegiatan.name,
                        tempat: selectedKegiatan.location,
                        waktu_mulai: selectedKegiatan.time,
                        waktu_berakhir: selectedKegiatan.endTime,
                    }}
                    tanggal={today?.date || '-'}
                    guruPendamping={guruPendamping}
                    siswaList={kegiatanSiswaList}
                    onClose={handleCloseKegiatanModal}
                    onSuccess={handleKegiatanAbsensiSuccess}
                    guruName={dashboardData.user.name}
                    guruNip={dashboardData.user.nip}
                />
            )}

            {kegiatanModalType === 'sedang_berlangsung' && selectedKegiatan && !selectedKegiatan.isPJ && (
                <ModalAbsensiKegiatanPendamping
                    kegiatan={{
                        ...selectedKegiatan,
                        nama_kegiatan: selectedKegiatan.name,
                        tempat: selectedKegiatan.location,
                        waktu_mulai: selectedKegiatan.time,
                        waktu_berakhir: selectedKegiatan.endTime,
                    }}
                    onClose={handleCloseKegiatanModal}
                    onSuccess={handleKegiatanAbsensiSuccess}
                />
            )}

            {kegiatanModalType === 'sudah_absen' && selectedKegiatan && (
                <ModalKegiatanSudahAbsen
                    kegiatan={{
                        ...selectedKegiatan,
                        nama_kegiatan: selectedKegiatan.name,
                    }}
                    onClose={handleCloseKegiatanModal}
                />
            )}

            {/* Rapat Modals */}
            {rapatModalType === 'belum_mulai' && selectedRapat && (
                <ModalRapatBelumMulai
                    rapat={{
                        ...selectedRapat,
                        agenda_rapat: selectedRapat.name,
                        tempat: selectedRapat.location,
                    }}
                    onClose={handleCloseRapatModal}
                />
            )}

            {rapatModalType === 'sedang_berlangsung' && selectedRapat && selectedRapat.role === 'sekretaris' && (
                <ModalAbsensiRapatSekretaris
                    rapat={{
                        ...selectedRapat,
                        agenda_rapat: selectedRapat.name,
                        tempat: selectedRapat.location,
                        waktu_mulai: selectedRapat.time,
                        waktu_selesai: selectedRapat.endTime,
                    }}
                    tanggal={today?.date || '-'}
                    pimpinan={rapatPimpinan}
                    pesertaList={rapatPesertaList}
                    onClose={handleCloseRapatModal}
                    onSuccess={handleRapatAbsensiSuccess}
                />
            )}

            {rapatModalType === 'sedang_berlangsung' && selectedRapat && selectedRapat.role !== 'sekretaris' && (
                <ModalAbsensiRapatPeserta
                    rapat={{
                        ...selectedRapat,
                        agenda_rapat: selectedRapat.name,
                        tempat: selectedRapat.location,
                        waktu_mulai: selectedRapat.time,
                        waktu_selesai: selectedRapat.endTime,
                    }}
                    tanggal={today?.date || '-'}
                    role={selectedRapat.role}
                    onClose={handleCloseRapatModal}
                    onSuccess={handleRapatAbsensiSuccess}
                />
            )}

            {rapatModalType === 'sudah_absen' && selectedRapat && (
                <ModalRapatSudahAbsen
                    rapat={{
                        ...selectedRapat,
                        agenda_rapat: selectedRapat.name,
                    }}
                    onClose={handleCloseRapatModal}
                />
            )}

        </div>
    );
}

export default Beranda;
