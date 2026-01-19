import React, { useState, useEffect } from 'react';
import api from '../../lib/axios';
import { ModalAbsensiKegiatanPJ, ModalKegiatanBelumMulai, ModalKegiatanSudahAbsen, ModalAbsensiKegiatanPendamping } from './components/KegiatanModals';
import { ModalRapatBelumMulai, ModalRapatSudahAbsen, ModalAbsensiRapatPeserta, ModalAbsensiRapatSekretaris } from './components/RapatModals';
import { JadwalSkeleton } from './components/Skeleton';
import { AnimatedTabsSimple } from './components/AnimatedTabs';

function Jadwal() {
    const [activeTab, setActiveTab] = useState('kegiatan');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [initialLoad, setInitialLoad] = useState(true);

    // Data states
    const [kegiatanList, setKegiatanList] = useState([]);
    const [rapatList, setRapatList] = useState([]);

    // Modal states for kegiatan
    const [selectedKegiatan, setSelectedKegiatan] = useState(null);
    const [kegiatanModalType, setKegiatanModalType] = useState(null);
    const [guruPendamping, setGuruPendamping] = useState([]);
    const [kegiatanSiswaList, setKegiatanSiswaList] = useState([]);

    // Modal states for rapat
    const [selectedRapat, setSelectedRapat] = useState(null);
    const [rapatModalType, setRapatModalType] = useState(null);
    const [rapatPimpinan, setRapatPimpinan] = useState(null);
    const [rapatPesertaList, setRapatPesertaList] = useState([]);

    const tabs = [
        { id: 'kegiatan', label: 'Kegiatan' },
        { id: 'rapat', label: 'Rapat' },
    ];

    // Get status color based on status
    const getStatusColor = (status) => {
        switch (status) {
            case 'sudah_absen':
            case 'attended':
                return { border: 'border-l-green-500', bg: 'bg-green-50', text: 'text-green-600', badge: 'bg-green-100 text-green-700', label: 'Sudah Absen' };
            case 'sedang_berlangsung':
            case 'ongoing':
            case 'terlewat':
            case 'missed':
                return { border: 'border-l-red-500', bg: 'bg-red-50', text: 'text-red-600', badge: 'bg-red-100 text-red-700', label: status === 'terlewat' || status === 'missed' ? 'Terlewat' : 'Belum Absen' };
            case 'belum_mulai':
            case 'upcoming':
            default:
                return { border: 'border-l-blue-500', bg: 'bg-blue-50', text: 'text-blue-600', badge: 'bg-blue-100 text-blue-700', label: 'Akan Datang' };
        }
    };

    // Format date helper
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
        return date.toLocaleDateString('id-ID', options);
    };

    // Fetch data
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const endpoint = activeTab === 'kegiatan'
                    ? '/guru-panel/jadwal/kegiatan'
                    : '/guru-panel/jadwal/rapat';

                const response = await api.get(endpoint, {
                    params: { search: searchQuery }
                });

                if (activeTab === 'kegiatan') {
                    setKegiatanList(response.data.data || []);
                } else {
                    setRapatList(response.data.data || []);
                }
            } catch (error) {
                console.error('Error fetching jadwal:', error);
            } finally {
                setLoading(false);
                setInitialLoad(false);
            }
        };

        const debounceTimer = setTimeout(fetchData, 300);
        return () => clearTimeout(debounceTimer);
    }, [activeTab, searchQuery]);

    // Handle kegiatan click
    const handleKegiatanClick = async (kegiatan) => {
        setSelectedKegiatan(kegiatan);

        if (kegiatan.status === 'sudah_absen' || kegiatan.status === 'attended') {
            setKegiatanModalType('sudah_absen');
        } else if (kegiatan.status === 'belum_mulai' || kegiatan.status === 'upcoming') {
            setKegiatanModalType('belum_mulai');
        } else {
            // Fetch detail for active kegiatan
            try {
                const response = await api.get(`/guru-panel/kegiatan/${kegiatan.id}/detail`);
                setGuruPendamping(response.data.pendamping || []);
                setKegiatanSiswaList(response.data.siswa || []);

                if (kegiatan.isPJ) {
                    setKegiatanModalType('pj');
                } else {
                    setKegiatanModalType('pendamping');
                }
            } catch (error) {
                console.error('Error fetching kegiatan detail:', error);
            }
        }
    };

    // Handle rapat click
    const handleRapatClick = async (rapat) => {
        setSelectedRapat(rapat);

        if (rapat.status === 'sudah_absen' || rapat.status === 'attended') {
            setRapatModalType('sudah_absen');
        } else if (rapat.status === 'belum_mulai' || rapat.status === 'upcoming') {
            setRapatModalType('belum_mulai');
        } else {
            // Fetch detail for active rapat
            try {
                const response = await api.get(`/guru-panel/rapat/${rapat.id}/detail`);
                setRapatPimpinan(response.data.pimpinan || null);
                setRapatPesertaList(response.data.peserta || []);

                if (rapat.role === 'sekretaris') {
                    setRapatModalType('sekretaris');
                } else {
                    setRapatModalType('peserta');
                }
            } catch (error) {
                console.error('Error fetching rapat detail:', error);
            }
        }
    };

    // Close handlers
    const handleCloseKegiatanModal = () => {
        setSelectedKegiatan(null);
        setKegiatanModalType(null);
    };

    const handleCloseRapatModal = () => {
        setSelectedRapat(null);
        setRapatModalType(null);
    };

    // Success handlers
    const handleKegiatanAbsensiSuccess = () => {
        handleCloseKegiatanModal();
        // Refresh data
        setSearchQuery(prev => prev);
    };

    const handleRapatAbsensiSuccess = () => {
        handleCloseRapatModal();
        // Refresh data
        setSearchQuery(prev => prev);
    };

    // Get current data based on tab
    const currentData = activeTab === 'kegiatan' ? kegiatanList : rapatList;

    // Filter data by search
    const filteredData = currentData.filter(item =>
        item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Group data by date
    const groupedByDate = filteredData.reduce((acc, item) => {
        const date = item.date || item.tanggal || 'Unknown';
        if (!acc[date]) {
            acc[date] = [];
        }
        acc[date].push(item);
        return acc;
    }, {});

    // Show full skeleton only on initial load
    if (initialLoad) {
        return <JadwalSkeleton />;
    }

    return (
        <div className="p-4 space-y-4">
            {/* Search Bar */}
            <div className="relative">
                <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                <input
                    type="text"
                    placeholder={`Cari ${activeTab}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
            </div>

            {/* Tabs - Animated */}
            <AnimatedTabsSimple
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
            />

            {/* Content */}
            <div className="space-y-4">
                {loading ? (
                    <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-gray-200 animate-pulse">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                                    <div className="h-5 bg-gray-200 rounded-full w-20"></div>
                                </div>
                                <div className="space-y-2">
                                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                                    <div className="h-3 bg-gray-200 rounded w-28"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : Object.keys(groupedByDate).length > 0 ? (
                    Object.entries(groupedByDate).map(([date, items]) => (
                        <div key={date} className="space-y-3">
                            {/* Cards - tanggal di dalam card */}
                            {items.map((item) => {
                                const colors = getStatusColor(item.status);
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => activeTab === 'kegiatan'
                                            ? handleKegiatanClick(item)
                                            : handleRapatClick(item)
                                        }
                                        className={`w-full bg-white rounded-xl p-4 shadow-sm border-l-4 ${colors.border} text-left hover:shadow-md transition-shadow`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-semibold text-gray-800 text-sm line-clamp-2">{item.name}</h4>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${colors.badge}`}>
                                                {colors.label}
                                            </span>
                                        </div>
                                        <div className="space-y-1 text-xs text-gray-500">
                                            <div className="flex items-center gap-1">
                                                <i className="fas fa-calendar-alt w-4"></i>
                                                <span>{formatDate(item.date || item.tanggal)}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <i className="fas fa-map-marker-alt w-4"></i>
                                                <span>{item.location}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <i className="fas fa-clock w-4"></i>
                                                <span>{item.time}</span>
                                            </div>
                                        </div>
                                        {/* Role badge */}
                                        {(item.isPJ || item.role) && (
                                            <div className="mt-2">
                                                <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${item.isPJ ? 'bg-blue-100 text-blue-700' :
                                                    item.role === 'pimpinan' ? 'bg-purple-100 text-purple-700' :
                                                        item.role === 'sekretaris' ? 'bg-blue-100 text-blue-700' :
                                                            'bg-green-100 text-green-700'
                                                    }`}>
                                                    {item.isPJ ? 'PJ' :
                                                        item.role === 'pimpinan' ? 'Pimpinan' :
                                                            item.role === 'sekretaris' ? 'Sekretaris' : 'Peserta'}
                                                </span>
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    ))
                ) : (
                    <div className="text-center py-12">
                        <i className={`fas ${activeTab === 'kegiatan' ? 'fa-calendar-check' : 'fa-users'} text-4xl text-gray-300 mb-3`}></i>
                        <p className="text-gray-500">
                            Tidak ada {activeTab} dalam 7 hari ke depan
                        </p>
                    </div>
                )}
            </div>

            {/* Kegiatan Modals */}
            {selectedKegiatan && kegiatanModalType === 'belum_mulai' && (
                <ModalKegiatanBelumMulai
                    kegiatan={selectedKegiatan}
                    tanggal={formatDate(selectedKegiatan.date || selectedKegiatan.tanggal)}
                    onClose={handleCloseKegiatanModal}
                />
            )}
            {selectedKegiatan && kegiatanModalType === 'sudah_absen' && (
                <ModalKegiatanSudahAbsen
                    kegiatan={selectedKegiatan}
                    onClose={handleCloseKegiatanModal}
                />
            )}
            {selectedKegiatan && kegiatanModalType === 'pj' && (
                <ModalAbsensiKegiatanPJ
                    kegiatan={selectedKegiatan}
                    pendamping={guruPendamping}
                    siswaList={kegiatanSiswaList}
                    onClose={handleCloseKegiatanModal}
                    onSuccess={handleKegiatanAbsensiSuccess}
                />
            )}
            {selectedKegiatan && kegiatanModalType === 'pendamping' && (
                <ModalAbsensiKegiatanPendamping
                    kegiatan={selectedKegiatan}
                    tanggal={formatDate(selectedKegiatan.date || selectedKegiatan.tanggal)}
                    onClose={handleCloseKegiatanModal}
                    onSuccess={handleKegiatanAbsensiSuccess}
                />
            )}

            {/* Rapat Modals */}
            {selectedRapat && rapatModalType === 'belum_mulai' && (
                <ModalRapatBelumMulai
                    rapat={selectedRapat}
                    onClose={handleCloseRapatModal}
                />
            )}
            {selectedRapat && rapatModalType === 'sudah_absen' && (
                <ModalRapatSudahAbsen
                    rapat={selectedRapat}
                    onClose={handleCloseRapatModal}
                />
            )}
            {selectedRapat && rapatModalType === 'sekretaris' && (
                <ModalAbsensiRapatSekretaris
                    rapat={selectedRapat}
                    tanggal={formatDate(selectedRapat.date || selectedRapat.tanggal)}
                    pimpinan={rapatPimpinan}
                    pesertaList={rapatPesertaList}
                    onClose={handleCloseRapatModal}
                    onSuccess={handleRapatAbsensiSuccess}
                />
            )}
            {selectedRapat && rapatModalType === 'peserta' && (
                <ModalAbsensiRapatPeserta
                    rapat={selectedRapat}
                    tanggal={formatDate(selectedRapat.date || selectedRapat.tanggal)}
                    role={selectedRapat.role}
                    onClose={handleCloseRapatModal}
                    onSuccess={handleRapatAbsensiSuccess}
                />
            )}
        </div>
    );
}

export default Jadwal;
