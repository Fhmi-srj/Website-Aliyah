import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/axios';
import { useAuth } from '../../contexts/AuthContext';
import { ModalAbsensiKegiatanPJ, ModalKegiatanBelumMulai, ModalKegiatanSudahAbsen, ModalAbsensiKegiatanPendamping } from './components/KegiatanModals';

function AbsensiKegiatan() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [kegiatan, setKegiatan] = useState([]);
    const [tanggalHariIni, setTanggalHariIni] = useState('');
    const [guruData, setGuruData] = useState({ name: '', nip: '' });

    // Modal states
    const [selectedKegiatan, setSelectedKegiatan] = useState(null);
    const [modalType, setModalType] = useState(null);
    const [guruPendamping, setGuruPendamping] = useState([]);
    const [siswaList, setSiswaList] = useState([]);

    // Fetch kegiatan hari ini
    useEffect(() => {
        const fetchKegiatan = async () => {
            try {
                setLoading(true);
                const response = await api.get('/guru-panel/kegiatan-hari-ini');
                setKegiatan(response.data.kegiatan || []);
                setTanggalHariIni(response.data.tanggal || '');
            } catch (err) {
                console.error('Error fetching kegiatan:', err);
                setKegiatan([]);
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

    // Helper function untuk menentukan status
    const getStatusColor = (status) => {
        switch (status) {
            case 'sudah_absen':
                return { border: 'border-l-green-500', bg: 'bg-green-100', icon: 'text-green-500', label: 'Sudah Absen', labelBg: 'bg-green-100 text-green-700' };
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
        setSelectedKegiatan(item);

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
            const response = await api.get('/guru-panel/kegiatan-hari-ini');
            setKegiatan(response.data.kegiatan || []);
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

    // Loading skeleton
    if (loading) {
        return (
            <div className="animate-pulse">
                <div className="bg-green-200 h-24"></div>
                <div className="p-4 space-y-4">
                    <div className="bg-gray-200 rounded-xl h-14"></div>
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
                <p className="text-green-100 text-sm">Pilih kegiatan untuk mengisi absensi</p>
            </div>


            {/* Today's Info */}
            <div className="bg-white mx-4 -mt-3 rounded-xl shadow-sm p-4 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <i className="fas fa-calendar-check text-green-500 text-lg"></i>
                    </div>
                    <div>
                        <p className="font-semibold text-gray-800">{tanggalHariIni}</p>
                        <p className="text-sm text-gray-500">{kegiatan.length} kegiatan hari ini</p>
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="px-4 pt-4 flex gap-2 flex-wrap">
                <span className="text-[10px] px-2 py-1 rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span> Sudah Absen
                </span>
                <span className="text-[10px] px-2 py-1 rounded-full bg-red-100 text-red-700 flex items-center gap-1">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span> Belum Absen
                </span>
                <span className="text-[10px] px-2 py-1 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span> Akan Datang
                </span>
            </div>

            {/* Activity List */}
            <div className="p-4 space-y-3">
                <h2 className="font-semibold text-gray-800">Pilih Kegiatan</h2>
                {kegiatan.length > 0 ? (
                    kegiatan.map(item => {
                        const colors = getStatusColor(item.status_absensi);
                        const canInteract = item.status_absensi !== 'sudah_absen';
                        const isPJ = item.role === 'penanggung_jawab';

                        return (
                            <button
                                key={item.id}
                                onClick={() => handleKegiatanClick(item)}
                                className={`w-full bg-white rounded-xl shadow-sm p-4 cursor-pointer transition-all border-l-4 ${colors.border
                                    } ${item.status_absensi === 'sudah_absen' ? 'opacity-60' : 'hover:shadow-md'}`}
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
                                        {/* Row 3: Badge PJ + Time + Status */}
                                        <div className="flex items-center justify-between mt-1.5">
                                            <div className="flex items-center gap-2">
                                                {isPJ && (
                                                    <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">PJ</span>
                                                )}
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
                        <p className="text-gray-400 text-sm">Anda tidak memiliki kegiatan hari ini</p>
                    </div>
                )}
            </div>

            {/* Modals */}
            {modalType === 'belum_mulai' && selectedKegiatan && (
                <ModalKegiatanBelumMulai
                    kegiatan={selectedKegiatan}
                    tanggal={tanggalHariIni}
                    onClose={handleCloseModal}
                />
            )}

            {modalType === 'sedang_berlangsung' && selectedKegiatan && selectedKegiatan.role === 'penanggung_jawab' && (
                <ModalAbsensiKegiatanPJ
                    kegiatan={selectedKegiatan}
                    tanggal={tanggalHariIni}
                    guruPendamping={guruPendamping}
                    siswaList={siswaList}
                    onClose={handleCloseModal}
                    onSuccess={handleAbsensiSuccess}
                    guruName={guruData.name}
                    guruNip={guruData.nip}
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
                    tanggal={tanggalHariIni}
                    onClose={handleCloseModal}
                    onSuccess={handleAbsensiSuccess}
                    guruName={guruData.name}
                    guruNip={guruData.nip}
                />
            )}
        </div>
    );
}

export default AbsensiKegiatan;
