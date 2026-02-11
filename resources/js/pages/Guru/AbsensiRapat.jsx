import React, { useState, useEffect, useMemo } from 'react';
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
    const [rapatByDate, setRapatByDate] = useState({});

    // Modal states
    const [selectedRapat, setSelectedRapat] = useState(null);
    const [modalType, setModalType] = useState(null);
    const [pimpinan, setPimpinan] = useState(null);
    const [pesertaList, setPesertaList] = useState([]);

    // Get today's date
    const today = new Date().toISOString().split('T')[0];

    // Flatten all rapat from all dates into a single list with date info
    const allRapat = useMemo(() => {
        const result = [];
        const sortedDates = Object.keys(rapatByDate).sort();

        for (const dateStr of sortedDates) {
            const items = rapatByDate[dateStr] || [];
            for (const item of items) {
                result.push({
                    ...item,
                    dateStr,
                    isToday: dateStr === today
                });
            }
        }
        return result;
    }, [rapatByDate, today]);

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
    const getStatusColor = (statusAbsensi, guruStatus) => {
        // If sudah_absen, show based on actual attendance status
        if (statusAbsensi === 'sudah_absen') {
            switch (guruStatus) {
                case 'H':
                    return { border: 'border-l-green-500', bg: 'bg-green-100', icon: 'text-green-500', label: 'Hadir', labelBg: 'bg-green-100 text-green-700' };
                case 'I':
                    return { border: 'border-l-yellow-500', bg: 'bg-yellow-100', icon: 'text-yellow-500', label: 'Izin', labelBg: 'bg-yellow-100 text-yellow-700' };
                case 'A':
                    return { border: 'border-l-red-500', bg: 'bg-red-100', icon: 'text-red-500', label: 'Alpha', labelBg: 'bg-red-100 text-red-700' };
                default:
                    return { border: 'border-l-green-500', bg: 'bg-green-100', icon: 'text-green-500', label: 'Sudah Absen', labelBg: 'bg-green-100 text-green-700' };
            }
        }

        switch (statusAbsensi) {
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

    // Fetch rapat (from today onwards)
    useEffect(() => {
        fetchRapatSeminggu();
    }, []);

    const fetchRapatSeminggu = async () => {
        try {
            setLoading(true);
            const response = await api.get('/guru-panel/rapat-seminggu');
            setRapatByDate(response.data.rapat || {});
        } catch (err) {
            console.error('Error fetching rapat:', err);
            setRapatByDate({});
        } finally {
            setLoading(false);
        }
    };

    // Get formatted date for modal
    const getFormattedDate = () => {
        if (!selectedRapat) return '';
        const date = new Date(selectedRapat.dateStr + 'T00:00:00');
        return date.toLocaleDateString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    // Handle rapat click
    const handleRapatClick = async (rapat) => {
        // Only allow interaction for today's rapat
        if (!rapat.isToday) return;

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
        await fetchRapatSeminggu();
    };

    if (loading) {
        return (
            <div className="animate-pulse">
                <div className="bg-green-200 px-4 py-6"></div>
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
                <p className="text-green-100 text-sm">Jadwal rapat hari ini & mendatang</p>
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
                {allRapat.length === 0 ? (
                    <div className="bg-gray-50 rounded-xl p-8 text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <i className="fas fa-calendar-times text-gray-300 text-2xl"></i>
                        </div>
                        <p className="text-gray-500 font-medium">Tidak ada rapat</p>
                        <p className="text-gray-400 text-sm mt-1">Belum ada rapat yang dijadwalkan</p>
                    </div>
                ) : (
                    allRapat.map((rapat, index) => {
                        const colors = getStatusColor(rapat.status_absensi, rapat.guru_status);
                        const roleBadge = getRoleBadge(rapat.role);
                        const canInteract = rapat.isToday && rapat.status_absensi !== 'sudah_absen';

                        return (
                            <button
                                key={`${rapat.id}-${rapat.dateStr}`}
                                onClick={() => handleRapatClick(rapat)}
                                disabled={!rapat.isToday}
                                className={`w-full bg-white rounded-xl shadow-sm p-4 transition-all border-l-4 ${colors.border} text-left ${canInteract ? 'cursor-pointer hover:shadow-md' : 'cursor-default'
                                    } ${rapat.status_absensi === 'sudah_absen' ? 'opacity-60' : ''} ${!rapat.isToday ? 'opacity-70' : ''}`}
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
                                            <i className="fas fa-map-marker-alt mr-1"></i>{rapat.tempat || '-'}
                                        </p>
                                        {/* Row 3: Role Badge + Date + Time + Status */}
                                        <div className="flex items-center justify-between mt-1.5">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${roleBadge.bg}`}>
                                                    {roleBadge.label}
                                                </span>
                                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${rapat.isToday ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                    {formatDate(rapat.dateStr)}
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
                <ModalAbsensiRapatPeserta
                    rapat={selectedRapat}
                    tanggal={getFormattedDate()}
                    role="pimpinan"
                    onClose={handleCloseModal}
                    onSuccess={handleAbsensiSuccess}
                />
            )}

            {modalType === 'sedang_berlangsung' && selectedRapat && selectedRapat.is_sekretaris && (
                <ModalAbsensiRapatSekretaris
                    rapat={selectedRapat}
                    tanggal={getFormattedDate()}
                    pimpinan={pimpinan}
                    pesertaList={pesertaList}
                    onClose={handleCloseModal}
                    onSuccess={handleAbsensiSuccess}
                />
            )}

            {modalType === 'sedang_berlangsung' && selectedRapat && !selectedRapat.is_pimpinan && !selectedRapat.is_sekretaris && (
                <ModalAbsensiRapatPeserta
                    rapat={selectedRapat}
                    tanggal={getFormattedDate()}
                    role="peserta"
                    onClose={handleCloseModal}
                    onSuccess={handleAbsensiSuccess}
                />
            )}
        </div>
    );
}

export default AbsensiRapat;
