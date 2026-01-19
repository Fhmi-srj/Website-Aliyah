import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import api from '../../lib/axios';
import { RiwayatSkeleton } from './components/Skeleton';
import { AnimatedTabsSimple } from './components/AnimatedTabs';

// Modal component for Riwayat Pertemuan
function ModalRiwayatPertemuan({ mapel, kelas, pertemuanList, onClose }) {
    const [selectedPertemuan, setSelectedPertemuan] = useState(null);
    const [pertemuanIndex, setPertemuanIndex] = useState(0);
    const [detailData, setDetailData] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // Fetch detail pertemuan (siswa list) from API
    const fetchDetailPertemuan = async (pertemuanId) => {
        setLoadingDetail(true);
        try {
            const response = await api.get(`/guru-panel/riwayat/mengajar/${pertemuanId}/detail`);
            if (response.data.success) {
                setDetailData(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching detail pertemuan:', error);
        } finally {
            setLoadingDetail(false);
        }
    };

    const handlePertemuanClick = (pertemuan, index) => {
        setSelectedPertemuan(pertemuan);
        setPertemuanIndex(index);
        fetchDetailPertemuan(pertemuan.id);
    };

    const handleBack = () => {
        setSelectedPertemuan(null);
        setDetailData(null);
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>

            {/* Modal */}
            <div className="relative bg-white w-full max-w-lg rounded-2xl h-[85vh] flex flex-col shadow-xl overflow-hidden">

                {/* View Container with proper height */}
                <div className="flex flex-col h-full min-h-0">
                    {!selectedPertemuan ? (
                        /* Pertemuan List View */
                        <>
                            {/* Header */}
                            <div className="flex-shrink-0 bg-gradient-to-r from-green-500 to-green-600 px-5 py-4 rounded-t-2xl">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                            <i className="fas fa-calendar-alt text-white"></i>
                                        </div>
                                        <div>
                                            <h2 className="text-white font-semibold text-lg">Riwayat Pertemuan</h2>
                                            <p className="text-green-100 text-sm">{mapel} - {kelas}</p>
                                        </div>
                                    </div>
                                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/20 rounded-lg transition-colors">
                                        <i className="fas fa-times text-lg"></i>
                                    </button>
                                </div>
                            </div>

                            {/* Pertemuan List */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {pertemuanList.map((item, index) => (
                                    <div
                                        key={item.id}
                                        onClick={() => handlePertemuanClick(item, index)}
                                        className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                                    >
                                        {/* Number Badge */}
                                        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                                            <span className="text-white font-bold text-sm">{index + 1}</span>
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-gray-800 text-sm">Pertemuan {index + 1}</p>
                                            <p className="text-xs text-gray-400">{item.tanggal}</p>
                                        </div>

                                        {/* Stats Badges */}
                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-bold">H:{item.hadir}</span>
                                            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-[10px] font-bold">I:{item.izin}</span>
                                            <span className="px-2 py-1 bg-red-100 text-red-500 rounded-full text-[10px] font-bold">A:{item.alpha}</span>
                                        </div>

                                        {/* Arrow */}
                                        <i className="fas fa-chevron-right text-gray-300 text-sm flex-shrink-0"></i>
                                    </div>
                                ))}

                                {pertemuanList.length === 0 && (
                                    <div className="text-center py-12">
                                        <i className="fas fa-calendar-times text-4xl text-gray-300 mb-3"></i>
                                        <p className="text-gray-500">Belum ada pertemuan</p>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="flex-shrink-0 p-4 border-t border-gray-100">
                                <button
                                    onClick={onClose}
                                    className="w-full py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-medium hover:shadow-lg transition-shadow"
                                >
                                    Tutup
                                </button>
                            </div>
                        </>
                    ) : (
                        /* Pertemuan Detail View */
                        <>
                            {/* Header */}
                            <div className="flex-shrink-0 bg-gradient-to-r from-green-500 to-green-600 px-4 py-4">
                                <div className="flex items-center justify-between mb-4">
                                    <button
                                        onClick={handleBack}
                                        className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/20 rounded-lg transition-colors"
                                    >
                                        <i className="fas fa-arrow-left"></i>
                                    </button>
                                    <div className="flex-1 text-center">
                                        <h2 className="text-white font-semibold">Pertemuan {pertemuanIndex + 1}</h2>
                                        <p className="text-green-100 text-xs">{mapel} • {kelas}</p>
                                    </div>
                                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/20 rounded-lg transition-colors">
                                        <i className="fas fa-times"></i>
                                    </button>
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="bg-white/20 rounded-xl py-3 text-center">
                                        <p className="text-2xl font-bold text-white">{detailData?.stats?.hadir || selectedPertemuan.hadir}</p>
                                        <p className="text-xs text-green-100">Hadir</p>
                                    </div>
                                    <div className="bg-white/20 rounded-xl py-3 text-center">
                                        <p className="text-2xl font-bold text-white">{detailData?.stats?.izin || selectedPertemuan.izin}</p>
                                        <p className="text-xs text-green-100">Izin</p>
                                    </div>
                                    <div className="bg-white/20 rounded-xl py-3 text-center">
                                        <p className="text-2xl font-bold text-white">{detailData?.stats?.alpha || selectedPertemuan.alpha}</p>
                                        <p className="text-xs text-green-100">Alpha</p>
                                    </div>
                                </div>
                            </div>

                            {/* Siswa List */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                                {loadingDetail ? (
                                    <div className="flex items-center justify-center py-12">
                                        <i className="fas fa-spinner fa-spin text-green-500 text-2xl"></i>
                                    </div>
                                ) : detailData?.siswa?.length > 0 ? (
                                    detailData.siswa.map((siswa) => (
                                        <div key={siswa.id} className="bg-white rounded-xl p-4 flex items-center gap-3 shadow-sm">
                                            {/* Avatar */}
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${siswa.status === 'H' ? 'bg-green-100 text-green-600' :
                                                siswa.status === 'I' || siswa.status === 'S' ? 'bg-yellow-100 text-yellow-600' :
                                                    'bg-red-100 text-red-500'
                                                }`}>
                                                <span className="font-semibold text-sm">{siswa.nama?.charAt(0) || '?'}</span>
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-gray-800 text-sm">{siswa.nama}</p>
                                                <p className="text-xs text-gray-400">{siswa.nis}</p>
                                            </div>

                                            {/* Status Badge */}
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${siswa.status === 'H' ? 'bg-green-100 text-green-600' :
                                                siswa.status === 'I' || siswa.status === 'S' ? 'bg-yellow-100 text-yellow-600' :
                                                    'bg-red-100 text-red-500'
                                                }`}>
                                                {siswa.status === 'H' ? 'Hadir' : siswa.status === 'I' ? 'Izin' : siswa.status === 'S' ? 'Sakit' : 'Alpha'}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-12">
                                        <i className="fas fa-users text-4xl text-gray-300 mb-3"></i>
                                        <p className="text-gray-500">Belum ada data siswa</p>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="flex-shrink-0 p-4 border-t border-gray-100 bg-white flex gap-3">
                                <button
                                    onClick={handleBack}
                                    className="flex-1 py-3 border border-gray-300 rounded-xl font-medium text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2"
                                >
                                    <i className="fas fa-arrow-left text-sm"></i>
                                    Kembali
                                </button>
                                <button
                                    className="flex-1 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-medium hover:shadow-lg flex items-center justify-center gap-2"
                                >
                                    <i className="fas fa-download text-sm"></i>
                                    Export
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}

function Riwayat() {
    const [activeTab, setActiveTab] = useState('mengajar');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedKelas, setSelectedKelas] = useState('semua');
    const [selectedTahunAjaran, setSelectedTahunAjaran] = useState('');
    const [loading, setLoading] = useState(false);
    const [initialLoad, setInitialLoad] = useState(true);

    // Data states
    const [mengajarData, setMengajarData] = useState([]);
    const [kegiatanData, setKegiatanData] = useState([]);
    const [rapatData, setRapatData] = useState([]);

    // Filter options
    const [kelasList, setKelasList] = useState([]);
    const [tahunAjaranList, setTahunAjaranList] = useState([]);

    // Modal state
    const [selectedMengajar, setSelectedMengajar] = useState(null);
    const [detailPertemuanData, setDetailPertemuanData] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    const tabs = [
        { id: 'mengajar', label: 'Mengajar' },
        { id: 'kegiatan', label: 'Kegiatan' },
        { id: 'rapat', label: 'Rapat' },
    ];

    // Fetch mengajar data
    const fetchMengajarData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (selectedTahunAjaran) params.append('tahun_ajaran', selectedTahunAjaran);
            if (selectedKelas !== 'semua') params.append('kelas', selectedKelas);
            if (searchQuery) params.append('search', searchQuery);

            const response = await api.get(`/guru-panel/riwayat/mengajar?${params}`);
            if (response.data.success) {
                setMengajarData(response.data.data);
                if (response.data.filters) {
                    setKelasList(response.data.filters.kelas_list || []);
                    setTahunAjaranList(response.data.filters.tahun_ajaran_list || []);
                    if (!selectedTahunAjaran && response.data.filters.tahun_ajaran_list?.length > 0) {
                        setSelectedTahunAjaran(response.data.filters.tahun_ajaran_list[0]);
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching mengajar data:', error);
        } finally {
            setLoading(false);
            setInitialLoad(false);
        }
    };

    // Fetch kegiatan data
    const fetchKegiatanData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchQuery) params.append('search', searchQuery);

            const response = await api.get(`/guru-panel/riwayat/kegiatan?${params}`);
            if (response.data.success) {
                setKegiatanData(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching kegiatan data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch rapat data
    const fetchRapatData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchQuery) params.append('search', searchQuery);

            const response = await api.get(`/guru-panel/riwayat/rapat?${params}`);
            if (response.data.success) {
                setRapatData(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching rapat data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch detail pertemuan (siswa list)
    const fetchDetailPertemuan = async (pertemuanId) => {
        setLoadingDetail(true);
        try {
            const response = await api.get(`/guru-panel/riwayat/mengajar/${pertemuanId}/detail`);
            if (response.data.success) {
                setDetailPertemuanData(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching detail pertemuan:', error);
        } finally {
            setLoadingDetail(false);
        }
    };

    // Refs to track initialization
    const isInitialMount = React.useRef(true);
    const hasFetchedInitial = React.useRef(false);

    // useEffect for initial load and tab changes
    useEffect(() => {
        if (activeTab === 'mengajar') {
            // Only fetch if we haven't already fetched or if this is a tab switch (not initial mount)
            if (!hasFetchedInitial.current || !isInitialMount.current) {
                fetchMengajarData();
                hasFetchedInitial.current = true;
            }
        } else if (activeTab === 'kegiatan') {
            fetchKegiatanData();
        } else if (activeTab === 'rapat') {
            fetchRapatData();
        }
        
        // After first render, mark as no longer initial mount
        if (isInitialMount.current) {
            isInitialMount.current = false;
        }
    }, [activeTab]);

    // useEffect for filter changes (mengajar only) - skip initial mount
    useEffect(() => {
        // Only trigger if not initial mount and we have valid filters
        if (!isInitialMount.current && activeTab === 'mengajar' && hasFetchedInitial.current) {
            fetchMengajarData();
        }
    }, [selectedKelas, selectedTahunAjaran]);

    // useEffect for search with debounce - skip initial mount
    useEffect(() => {
        // Skip the initial empty searchQuery
        if (isInitialMount.current) {
            return;
        }
        
        const timer = setTimeout(() => {
            if (activeTab === 'mengajar') {
                fetchMengajarData();
            } else if (activeTab === 'kegiatan') {
                fetchKegiatanData();
            } else if (activeTab === 'rapat') {
                fetchRapatData();
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Handle card click
    const handleMengajarClick = (item) => {
        setSelectedMengajar(item);
        setDetailPertemuanData(null);
    };

    // Show skeleton on initial load
    if (initialLoad) {
        return <RiwayatSkeleton />;
    }

    return (
        <div className="animate-fadeIn">
            {/* Header with Search and Tabs */}
            <div className="bg-white px-4 pt-4 pb-2 sticky top-0 z-10 border-b border-gray-100 space-y-3">
                {/* Search Bar */}
                <div className="relative">
                    <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                    <input
                        type="text"
                        placeholder="Cari kelas, guru, atau kegiatan..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    )}
                </div>

                {/* Tabs - Animated */}
                <AnimatedTabsSimple
                    tabs={tabs}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                />
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
                {/* Loading Indicator */}
                {loading && (
                    <div className="flex items-center justify-center py-8">
                        <i className="fas fa-spinner fa-spin text-green-500 text-2xl"></i>
                    </div>
                )}

                {/* Mengajar Tab */}
                {activeTab === 'mengajar' && !loading && (
                    <>
                        {/* Filters: Kelas and Tahun Ajaran */}
                        <div className="flex items-center gap-2">
                            {/* Kelas Filter */}
                            <select
                                value={selectedKelas}
                                onChange={(e) => setSelectedKelas(e.target.value)}
                                className="flex-1 px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent appearance-none cursor-pointer"
                                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', backgroundSize: '16px' }}
                            >
                                <option value="semua">Semua Kelas</option>
                                {kelasList.map(kelas => (
                                    <option key={kelas} value={kelas}>{kelas}</option>
                                ))}
                            </select>

                            {/* Tahun Ajaran Filter */}
                            <select
                                value={selectedTahunAjaran}
                                onChange={(e) => setSelectedTahunAjaran(e.target.value)}
                                className="flex-1 px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent appearance-none cursor-pointer"
                                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', backgroundSize: '16px' }}
                            >
                                {tahunAjaranList.map(ta => (
                                    <option key={ta} value={ta}>{ta}</option>
                                ))}
                            </select>
                        </div>

                        {/* Mengajar Cards */}
                        {mengajarData.length > 0 ? (
                            <div className="space-y-3">
                                {mengajarData.map((item) => (
                                    <div
                                        key={item.id}
                                        onClick={() => handleMengajarClick(item)}
                                        className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow"
                                    >
                                        <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                                            <i className="fas fa-chalkboard-teacher text-white"></i>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-800 text-sm">{item.mapel}</p>
                                            <p className="text-xs text-gray-500 truncate">{item.kelas}</p>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <p className="text-xs text-gray-500">{item.time}</p>
                                            <i className="fas fa-chevron-right text-gray-400 text-sm"></i>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <i className="fas fa-chalkboard-teacher text-4xl text-gray-300 mb-3"></i>
                                <p className="text-gray-500">Belum ada riwayat mengajar</p>
                            </div>
                        )}
                    </>
                )}

                {/* Kegiatan Tab */}
                {activeTab === 'kegiatan' && !loading && (
                    <>
                        {kegiatanData.length > 0 ? (
                            <div className="space-y-3">
                                {kegiatanData.map((item) => (
                                    <div key={item.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
                                        <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                                            <i className="fas fa-calendar-check text-white"></i>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-800 text-sm">{item.nama}</p>
                                            <p className="text-xs text-gray-500">{item.time}</p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-xs text-gray-400">{item.tanggal}</p>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${item.role === 'PJ' ? 'bg-green-100 text-green-700' :
                                                item.role === 'Pendamping' ? 'bg-green-100 text-green-700' :
                                                    'bg-gray-100 text-gray-600'
                                                }`}>
                                                {item.role}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <i className="fas fa-calendar-check text-4xl text-gray-300 mb-3"></i>
                                <p className="text-gray-500">Belum ada riwayat kegiatan</p>
                            </div>
                        )}
                    </>
                )}

                {/* Rapat Tab */}
                {activeTab === 'rapat' && !loading && (
                    <>
                        {rapatData.length > 0 ? (
                            <div className="space-y-3">
                                {rapatData.map((item) => (
                                    <div key={item.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
                                        <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                                            <i className="fas fa-users text-white"></i>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-800 text-sm">{item.nama}</p>
                                            <p className="text-xs text-gray-500">{item.time}</p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-xs text-gray-400">{item.tanggal}</p>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${item.role === 'Pimpinan' ? 'bg-green-100 text-green-700' :
                                                item.role === 'Sekretaris' ? 'bg-green-100 text-green-700' :
                                                    'bg-gray-100 text-gray-600'
                                                }`}>
                                                {item.role}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <i className="fas fa-users text-4xl text-gray-300 mb-3"></i>
                                <p className="text-gray-500">Belum ada riwayat rapat</p>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Modal Riwayat Pertemuan */}
            {selectedMengajar && (
                <ModalRiwayatPertemuan
                    mapel={selectedMengajar.mapel}
                    kelas={selectedMengajar.kelas}
                    pertemuanList={selectedMengajar.pertemuan}
                    onClose={() => setSelectedMengajar(null)}
                />
            )}
        </div>
    );
}

export default Riwayat;
