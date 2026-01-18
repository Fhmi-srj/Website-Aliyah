import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/axios';
import {
    ModalRapatBelumMulai,
    ModalRapatSudahAbsen,
    ModalAbsensiRapatPimpinan,
    ModalAbsensiRapatPeserta,
    ModalAbsensiRapatSekretaris
} from './components/RapatModals';

function AbsensiRapat() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [rapatList, setRapatList] = useState([]);
    const [tanggal, setTanggal] = useState('');

    // Modal states
    const [selectedRapat, setSelectedRapat] = useState(null);
    const [modalType, setModalType] = useState(null);
    const [pimpinan, setPimpinan] = useState(null);
    const [pesertaList, setPesertaList] = useState([]);

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

    // Get role badge
    const getRoleBadge = (role) => {
        switch (role) {
            case 'pimpinan':
                return { label: 'Pimpinan', bg: 'bg-purple-100 text-purple-700' };
            case 'sekretaris':
                return { label: 'Sekretaris', bg: 'bg-blue-100 text-blue-700' };
            default:
                return { label: 'Peserta', bg: 'bg-gray-100 text-gray-700' };
        }
    };

    // Fetch rapat hari ini
    useEffect(() => {
        fetchRapatHariIni();
    }, []);

    const fetchRapatHariIni = async () => {
        try {
            setLoading(true);
            const response = await api.get('/guru-panel/rapat-hari-ini');
            setRapatList(response.data.rapat || []);
            setTanggal(response.data.tanggal || '');
        } catch (err) {
            console.error('Error fetching rapat:', err);
        } finally {
            setLoading(false);
        }
    };

    // Handle rapat click
    const handleRapatClick = async (rapat) => {
        setSelectedRapat(rapat);

        // For sudah_absen, show confirmation modal
        if (rapat.status_absensi === 'sudah_absen') {
            setModalType('sudah_absen');
            return;
        }

        // For belum_mulai, show info modal
        if (rapat.status_absensi === 'belum_mulai') {
            setModalType('belum_mulai');
            return;
        }

        // For sedang_berlangsung or terlewat, fetch detail and show absensi modal
        if (rapat.is_sekretaris) {
            // Sekretaris needs full data
            try {
                const response = await api.get(`/guru-panel/rapat/${rapat.id}/detail`);
                setPimpinan(response.data.pimpinan || null);
                setPesertaList(response.data.peserta || []);
            } catch (err) {
                console.error('Error fetching rapat detail:', err);
                setPimpinan(null);
                setPesertaList([]);
            }
        }

        setModalType('sedang_berlangsung');
    };

    // Close modal
    const handleCloseModal = () => {
        setModalType(null);
        setSelectedRapat(null);
        setPimpinan(null);
        setPesertaList([]);
    };

    // Refresh after absensi success
    const handleAbsensiSuccess = async () => {
        handleCloseModal();
        await fetchRapatHariIni();
    };

    if (loading) {
        return (
            <div className="animate-pulse">
                <div className="bg-green-200 px-4 py-6"></div>
                <div className="bg-white mx-4 -mt-3 rounded-xl h-16 mb-4"></div>
                <div className="p-4 space-y-3">
                    <div className="h-24 bg-gray-200 rounded-xl"></div>
                    <div className="h-24 bg-gray-200 rounded-xl"></div>
                    <div className="h-24 bg-gray-200 rounded-xl"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fadeIn">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-green-700 px-4 py-6 text-white">
                <h1 className="text-xl font-bold">Absensi Rapat</h1>
                <p className="text-green-100 text-sm">Pilih rapat untuk mengisi absensi</p>
            </div>

            {/* Today's Info */}
            <div className="bg-white mx-4 -mt-3 rounded-xl shadow-sm p-4 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <i className="fas fa-users text-green-600 text-lg"></i>
                    </div>
                    <div>
                        <p className="font-semibold text-gray-800">{tanggal}</p>
                        <p className="text-sm text-gray-500">{rapatList.length} rapat hari ini</p>
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

            {/* Meeting List */}
            <div className="p-4 space-y-3">
                <h2 className="font-semibold text-gray-800">Daftar Rapat</h2>

                {rapatList.length === 0 ? (
                    <div className="bg-gray-50 rounded-xl p-8 text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <i className="fas fa-calendar-times text-gray-300 text-2xl"></i>
                        </div>
                        <p className="text-gray-500 font-medium">Tidak ada rapat hari ini</p>
                        <p className="text-gray-400 text-sm mt-1">Anda tidak terjadwal dalam rapat hari ini</p>
                    </div>
                ) : (
                    rapatList.map(rapat => {
                        const colors = getStatusColor(rapat.status_absensi);
                        const roleBadge = getRoleBadge(rapat.role);
                        return (
                            <button
                                key={rapat.id}
                                onClick={() => handleRapatClick(rapat)}
                                className={`w-full bg-white rounded-xl shadow-sm p-4 cursor-pointer transition-all border-l-4 ${colors.border} hover:shadow-md text-left`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`w-12 h-12 ${colors.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                                        <i className={`fas fa-users ${colors.icon}`}></i>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        {/* Row 1: Title */}
                                        <p className="font-semibold text-gray-800 truncate">{rapat.agenda_rapat}</p>
                                        {/* Row 2: Location */}
                                        <p className="text-xs text-gray-500 truncate">
                                            <i className="fas fa-map-marker-alt mr-1"></i>{rapat.tempat}
                                        </p>
                                        {/* Row 3: Role Badge + Time + Status */}
                                        <div className="flex items-center justify-between mt-1.5">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${roleBadge.bg}`}>
                                                    {roleBadge.label}
                                                </span>
                                                <span className="text-[10px] text-gray-400">
                                                    {rapat.waktu_mulai?.substring(0, 5)} - {rapat.waktu_selesai?.substring(0, 5)}
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
                )}
            </div>

            {/* Modals */}
            {modalType === 'belum_mulai' && selectedRapat && (
                <ModalRapatBelumMulai
                    rapat={selectedRapat}
                    onClose={handleCloseModal}
                />
            )}

            {modalType === 'sudah_absen' && selectedRapat && (
                <ModalRapatSudahAbsen
                    rapat={selectedRapat}
                    onClose={handleCloseModal}
                />
            )}

            {modalType === 'sedang_berlangsung' && selectedRapat && selectedRapat.is_pimpinan && (
                <ModalAbsensiRapatPimpinan
                    rapat={selectedRapat}
                    onClose={handleCloseModal}
                    onSuccess={handleAbsensiSuccess}
                />
            )}

            {modalType === 'sedang_berlangsung' && selectedRapat && selectedRapat.is_sekretaris && (
                <ModalAbsensiRapatSekretaris
                    rapat={selectedRapat}
                    tanggal={tanggal}
                    pimpinan={pimpinan}
                    pesertaList={pesertaList}
                    onClose={handleCloseModal}
                    onSuccess={handleAbsensiSuccess}
                />
            )}

            {modalType === 'sedang_berlangsung' && selectedRapat && selectedRapat.is_peserta && !selectedRapat.is_pimpinan && !selectedRapat.is_sekretaris && (
                <ModalAbsensiRapatPeserta
                    rapat={selectedRapat}
                    onClose={handleCloseModal}
                    onSuccess={handleAbsensiSuccess}
                />
            )}
        </div>
    );
}

export default AbsensiRapat;
