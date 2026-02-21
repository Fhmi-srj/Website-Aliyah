import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../lib/axios';
import { RiwayatSkeleton } from './components/Skeleton';
import { AnimatedTabsSimple } from './components/AnimatedTabs';
import { ModalRiwayatMengajar, ModalRiwayatKegiatanPJ, ModalRiwayatKegiatanPendamping, ModalRiwayatRapatPimpinan, ModalRiwayatRapatPeserta, ModalRiwayatRapatSekretaris, ModalTerlewat, ModalIzin } from './components/RiwayatModals';
import AbsensiModals from './components/AbsensiModals';
import KegiatanModals from './components/KegiatanModals';
import RapatModals from './components/RapatModals';

function Riwayat() {
    const [searchParams] = useSearchParams();

    // UI States - read initial tab from query params
    const initialTab = searchParams.get('tab') || 'mengajar';
    const [activeTab, setActiveTab] = useState(initialTab);
    const [loading, setLoading] = useState(false);
    const [initialLoad, setInitialLoad] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    // Unlock status from admin settings
    const [isUnlocked, setIsUnlocked] = useState(false);

    // Filter states
    const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'H', 'I', 'A'
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Mengajar-specific filter states
    const [mengajarMonthFilter, setMengajarMonthFilter] = useState('all'); // 'all' or '01'-'12'
    const [mengajarMapelFilter, setMengajarMapelFilter] = useState('all');
    const [mengajarKelasFilter, setMengajarKelasFilter] = useState('all');

    // Pagination states for mengajar
    const [mengajarPage, setMengajarPage] = useState(1);
    const [mengajarPerPage, setMengajarPerPage] = useState(10);

    // Data states
    const [mengajarData, setMengajarData] = useState([]);
    const [kegiatanData, setKegiatanData] = useState([]);
    const [rapatData, setRapatData] = useState([]);

    // Modal states
    const [selectedItem, setSelectedItem] = useState(null);
    const [modalType, setModalType] = useState(null); // 'hadir', 'terlewat', 'izin', 'unlocked'
    const [itemCategory, setItemCategory] = useState(null); // 'mengajar', 'kegiatan', 'rapat'

    // Kegiatan detail states for modal (guru pendamping and siswa)
    const [kegiatanGuruPendamping, setKegiatanGuruPendamping] = useState([]);
    const [kegiatanSiswaList, setKegiatanSiswaList] = useState([]);

    // Rapat detail states for modal (pimpinan and peserta)
    const [rapatPimpinan, setRapatPimpinan] = useState(null);
    const [rapatPesertaList, setRapatPesertaList] = useState([]);

    // Print selection states
    const [selectedRapatIds, setSelectedRapatIds] = useState([]);

    const tabs = [
        { id: 'mengajar', label: 'Mengajar' },
        { id: 'kegiatan', label: 'Kegiatan' },
        { id: 'rapat', label: 'Rapat' },
    ];

    // Fetch unlock status from admin settings
    const fetchUnlockStatus = async () => {
        try {
            const response = await api.get('/guru-panel/check-attendance-unlock');
            if (response.data.success) {
                setIsUnlocked(response.data.unlocked || false);
            }
        } catch (error) {
            console.error('Error checking unlock status:', error);
        }
    };

    // Check unlock status on mount
    useEffect(() => {
        fetchUnlockStatus();
    }, []);

    // Fetch mengajar data
    const fetchMengajarData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchQuery) params.append('search', searchQuery);

            const response = await api.get(`/guru-panel/riwayat/mengajar?${params}`);
            if (response.data.success) {
                setMengajarData(response.data.data || []);
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
                setKegiatanData(response.data.data || []);
            }
        } catch (error) {
            console.error('Error fetching kegiatan data:', error);
        } finally {
            setLoading(false);
            setInitialLoad(false);
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
                setRapatData(response.data.data || []);
            }
        } catch (error) {
            console.error('Error fetching rapat data:', error);
        } finally {
            setLoading(false);
            setInitialLoad(false);
        }
    };

    // Refs to track initialization
    const isInitialMount = React.useRef(true);
    const hasFetchedInitial = React.useRef(false);

    // useEffect for initial load and tab changes
    useEffect(() => {
        if (activeTab === 'mengajar') {
            if (!hasFetchedInitial.current || !isInitialMount.current) {
                fetchMengajarData();
                hasFetchedInitial.current = true;
            }
        } else if (activeTab === 'kegiatan') {
            fetchKegiatanData();
        } else if (activeTab === 'rapat') {
            fetchRapatData();
        }

        if (isInitialMount.current) {
            isInitialMount.current = false;
        }
    }, [activeTab]);

    // useEffect for search with debounce
    useEffect(() => {
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

    // Handle card click - determine which modal to show
    const handleCardClick = async (item, category) => {
        setSelectedItem(item);
        setItemCategory(category);

        // Fetch kegiatan detail if it's a kegiatan item
        if (category === 'kegiatan' && item.id) {
            try {
                const response = await api.get(`/guru-panel/kegiatan/${item.id}/detail`);
                setKegiatanGuruPendamping(response.data.guru_pendamping || []);
                setKegiatanSiswaList(response.data.siswa || []);
            } catch (err) {
                console.error('Error fetching kegiatan detail:', err);
                setKegiatanGuruPendamping([]);
                setKegiatanSiswaList([]);
            }
        }

        // Fetch rapat detail if it's a rapat item
        if (category === 'rapat' && item.id) {
            try {
                const response = await api.get(`/guru-panel/rapat/${item.id}/detail`);
                setRapatPimpinan(response.data.pimpinan || null);
                setRapatPesertaList(response.data.peserta || []);
            } catch (err) {
                console.error('Error fetching rapat detail:', err);
                setRapatPimpinan(null);
                setRapatPesertaList([]);
            }
        }

        // Determine modal type based on guru_status
        const status = item.guru_status || 'A'; // Default to alpha if no status
        const role = item.role || '';

        // Special case: PJ in Kegiatan and Sekretaris in Rapat should always see full details
        // even if they are Alpha, so they can view all attendance data
        const isPJKegiatan = category === 'kegiatan' && (role === 'PJ' || role === 'penanggung_jawab');
        const isSekretarisRapat = category === 'rapat' && role === 'Sekretaris';

        // Check if attendance is still editable (same day)
        const itemDate = item.tanggal_raw;
        const today = new Date().toISOString().split('T')[0];
        const isSameDay = itemDate === today;
        const itemIsUnlocked = item.is_unlocked === true || isUnlocked;

        if (status === 'H' || isPJKegiatan || isSekretarisRapat) {
            // If same day or admin unlocked, allow editing
            if (isSameDay || itemIsUnlocked) {
                setModalType('unlocked'); // Use editable modal
            } else {
                setModalType('hadir'); // Read-only modal
            }
        } else if (status === 'I' || status === 'S') {
            // Izin/Sakit - show izin modal or allow edit if unlocked
            if (isSameDay || itemIsUnlocked) {
                setModalType('unlocked');
            } else {
                setModalType('izin');
            }
        } else {
            // Alpha - If admin has unlocked attendance, allow editing instead of showing locked modal
            if (isUnlocked || itemIsUnlocked) {
                setModalType('unlocked'); // Use editable modal
            } else {
                setModalType('terlewat'); // Show locked modal
            }
        }
    };

    // Close modal
    const handleCloseModal = () => {
        setSelectedItem(null);
        setModalType(null);
        setItemCategory(null);
        setKegiatanGuruPendamping([]);
        setKegiatanSiswaList([]);
        setRapatPimpinan(null);
        setRapatPesertaList([]);
    };

    // Get status config - matches absensi page style
    const getStatusConfig = (status) => {
        switch (status) {
            case 'H':
                return {
                    border: 'border-green-500',
                    bg: 'bg-green-100',
                    icon: 'text-green-600',
                    label: 'Sudah Absen',
                    labelBg: 'bg-green-100 text-green-700',
                };
            case 'S':
                return {
                    border: 'border-orange-500',
                    bg: 'bg-orange-100',
                    icon: 'text-orange-600',
                    label: 'Sakit',
                    labelBg: 'bg-orange-100 text-orange-700',
                };
            case 'I':
                return {
                    border: 'border-yellow-500',
                    bg: 'bg-yellow-100',
                    icon: 'text-yellow-600',
                    label: 'Izin',
                    labelBg: 'bg-yellow-100 text-yellow-700',
                };
            case 'A':
            default:
                return {
                    border: 'border-red-500',
                    bg: 'bg-red-100',
                    icon: 'text-red-600',
                    label: 'Alpha',
                    labelBg: 'bg-red-100 text-red-700',
                };
        }
    };

    // Filter data by status and date range
    const filterData = (data) => {
        return data.filter(item => {
            // Status filter
            if (statusFilter !== 'all' && item.guru_status !== statusFilter) {
                return false;
            }

            // Date range filter
            const itemDate = item.tanggal_raw;
            if (dateFrom && itemDate < dateFrom) {
                return false;
            }
            if (dateTo && itemDate > dateTo) {
                return false;
            }

            return true;
        });
    };

    // Clear all filters
    const clearFilters = () => {
        setStatusFilter('all');
        setDateFrom('');
        setDateTo('');
        // Also clear mengajar-specific filters
        setMengajarMonthFilter('all');
        setMengajarMapelFilter('all');
        setMengajarKelasFilter('all');
        setMengajarPage(1);
    };

    // Clear mengajar-specific filters
    const clearMengajarFilters = () => {
        setMengajarMonthFilter('all');
        setMengajarMapelFilter('all');
        setMengajarKelasFilter('all');
        setMengajarPage(1);
    };

    // Get unique mapel list from mengajar data
    const uniqueMapelList = [...new Set(mengajarData.map(item => item.mapel))].filter(Boolean).sort();

    // Get unique kelas list from mengajar data
    const uniqueKelasList = [...new Set(mengajarData.map(item => item.kelas))].filter(Boolean).sort();

    // Month options
    const monthOptions = [
        { value: 'all', label: 'Bulan' },
        { value: '01', label: 'Januari' },
        { value: '02', label: 'Februari' },
        { value: '03', label: 'Maret' },
        { value: '04', label: 'April' },
        { value: '05', label: 'Mei' },
        { value: '06', label: 'Juni' },
        { value: '07', label: 'Juli' },
        { value: '08', label: 'Agustus' },
        { value: '09', label: 'September' },
        { value: '10', label: 'Oktober' },
        { value: '11', label: 'November' },
        { value: '12', label: 'Desember' },
    ];

    // Filter mengajar data with additional filters
    const filterMengajarData = (data) => {
        let filtered = data.filter(item => {
            // Status filter
            if (statusFilter !== 'all' && item.guru_status !== statusFilter) {
                return false;
            }

            // Date range filter
            const itemDate = item.tanggal_raw;
            if (dateFrom && itemDate < dateFrom) {
                return false;
            }
            if (dateTo && itemDate > dateTo) {
                return false;
            }

            // Month filter
            if (mengajarMonthFilter !== 'all') {
                const itemMonth = itemDate?.substring(5, 7); // Extract month from YYYY-MM-DD
                if (itemMonth !== mengajarMonthFilter) {
                    return false;
                }
            }

            // Mapel filter
            if (mengajarMapelFilter !== 'all' && item.mapel !== mengajarMapelFilter) {
                return false;
            }

            // Kelas filter
            if (mengajarKelasFilter !== 'all' && item.kelas !== mengajarKelasFilter) {
                return false;
            }

            return true;
        });

        return filtered;
    };

    // Get filtered data for current tab
    const getFilteredData = (tab) => {
        switch (tab) {
            case 'mengajar':
                return filterMengajarData(mengajarData);
            case 'kegiatan':
                return filterData(kegiatanData);
            case 'rapat':
                return filterData(rapatData);
            default:
                return [];
        }
    };

    // Get paginated mengajar data
    const getPaginatedMengajarData = () => {
        const filtered = filterMengajarData(mengajarData);
        const startIndex = (mengajarPage - 1) * mengajarPerPage;
        const endIndex = startIndex + mengajarPerPage;
        return {
            data: filtered.slice(startIndex, endIndex),
            totalItems: filtered.length,
            totalPages: Math.ceil(filtered.length / mengajarPerPage),
        };
    };

    // Check if any filter is active
    const hasMengajarFilters = mengajarMonthFilter !== 'all' || mengajarMapelFilter !== 'all' || mengajarKelasFilter !== 'all';
    const hasActiveFilters = statusFilter !== 'all' || dateFrom || dateTo || hasMengajarFilters;

    // Print handlers
    const handlePrintJurnalGuru = () => {
        const token = localStorage.getItem('auth_token');
        let url = `/print/jurnal-guru?token=${token}`;
        if (mengajarMonthFilter !== 'all') {
            const year = new Date().getFullYear();
            url += `&bulan=${year}-${mengajarMonthFilter}`;
        }
        if (mengajarMapelFilter !== 'all') {
            // Find mapel_id from mengajarData
            const mapelItem = mengajarData.find(item => item.mapel === mengajarMapelFilter);
            if (mapelItem?.mapel_id) url += `&mapel_id=${mapelItem.mapel_id}`;
        }
        if (mengajarKelasFilter !== 'all') {
            const kelasItem = mengajarData.find(item => item.kelas === mengajarKelasFilter);
            if (kelasItem?.kelas_id) url += `&kelas_id=${kelasItem.kelas_id}`;
        }
        window.open(url, '_blank');
    };

    const handlePrintHasilRapat = (absensiId) => {
        const token = localStorage.getItem('auth_token');
        window.open(`/print/hasil-rapat/${absensiId}?token=${token}`, '_blank');
    };



    const handleBulkPrintRapat = () => {
        const token = localStorage.getItem('auth_token');
        selectedRapatIds.forEach((id, index) => {
            // Stagger window opens to avoid popup blocking
            setTimeout(() => {
                window.open(`/print/hasil-rapat/${id}?token=${token}`, '_blank');
            }, index * 500);
        });
    };

    const toggleRapatSelection = (e, id) => {
        e.stopPropagation();
        setSelectedRapatIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    // Show skeleton on initial load
    if (initialLoad) {
        return <RiwayatSkeleton />;
    }

    return (
        <div className="animate-fadeIn">
            {/* Header with Search and Tabs */}
            <div className="bg-white px-4 pt-4 pb-2 sticky top-0 z-10 border-b border-gray-100 space-y-3">
                {/* Search Bar with Filter Toggle */}
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                        <input
                            type="text"
                            placeholder="Cari riwayat..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                        />
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`px-4 py-3 rounded-xl flex items-center gap-2 transition-all ${showFilters || hasActiveFilters
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-100 text-gray-600'
                            }`}
                    >
                        <i className="fas fa-filter"></i>
                        {hasActiveFilters && (
                            <span className="w-2 h-2 bg-white rounded-full"></span>
                        )}
                    </button>
                </div>

                {/* Filter Panel */}
                {showFilters && (
                    <div className="bg-gray-50 rounded-xl p-3 space-y-3 animate-fadeIn">
                        {/* Mengajar Filters - Only shown when Mengajar tab is active */}
                        {activeTab === 'mengajar' && (
                            <div>
                                <label className="text-xs text-gray-500 font-medium mb-2 block">Filter Mengajar</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {/* Month Filter */}
                                    <select
                                        value={mengajarMonthFilter}
                                        onChange={(e) => { setMengajarMonthFilter(e.target.value); setMengajarPage(1); }}
                                        className="w-full px-2 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-green-400"
                                    >
                                        {monthOptions.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>

                                    {/* Mapel Filter */}
                                    <select
                                        value={mengajarMapelFilter}
                                        onChange={(e) => { setMengajarMapelFilter(e.target.value); setMengajarPage(1); }}
                                        className="w-full px-2 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-green-400"
                                    >
                                        <option value="all">Mapel</option>
                                        {uniqueMapelList.map(mapel => (
                                            <option key={mapel} value={mapel}>{mapel}</option>
                                        ))}
                                    </select>

                                    {/* Kelas Filter */}
                                    <select
                                        value={mengajarKelasFilter}
                                        onChange={(e) => { setMengajarKelasFilter(e.target.value); setMengajarPage(1); }}
                                        className="w-full px-2 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-green-400"
                                    >
                                        <option value="all">Kelas</option>
                                        {uniqueKelasList.map(kelas => (
                                            <option key={kelas} value={kelas}>{kelas}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Status Filter */}
                        <div>
                            <label className="text-xs text-gray-500 font-medium mb-2 block">Status Kehadiran</label>
                            <div className="flex gap-2">
                                {[
                                    { value: 'all', label: 'Semua', color: 'gray' },
                                    { value: 'H', label: 'Hadir', color: 'green' },
                                    { value: 'I', label: 'Izin', color: 'yellow' },
                                    { value: 'A', label: 'Alpha', color: 'red' },
                                ].map((opt) => (
                                    <button
                                        key={opt.value}
                                        onClick={() => setStatusFilter(opt.value)}
                                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${statusFilter === opt.value
                                            ? opt.color === 'gray' ? 'bg-gray-600 text-white'
                                                : opt.color === 'green' ? 'bg-green-500 text-white'
                                                    : opt.color === 'yellow' ? 'bg-yellow-500 text-white'
                                                        : 'bg-red-500 text-white'
                                            : 'bg-white text-gray-600 border border-gray-200'
                                            }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Date Range Filter */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-gray-500 font-medium mb-1 block">Dari Tanggal</label>
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 font-medium mb-1 block">Sampai Tanggal</label>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                                />
                            </div>
                        </div>

                        {/* Clear Filters */}
                        {hasActiveFilters && (
                            <button
                                onClick={clearFilters}
                                className="w-full py-2 text-sm text-red-500 hover:text-red-600 font-medium"
                            >
                                <i className="fas fa-times mr-1"></i> Hapus Semua Filter
                            </button>
                        )}
                    </div>
                )}

                {/* Tabs */}
                <AnimatedTabsSimple
                    tabs={tabs}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                />
            </div>

            {/* Content Area */}
            <div className="p-4">
                {/* Loading State */}
                {loading && (
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                    </div>
                )}

                {/* Mengajar Tab */}
                {activeTab === 'mengajar' && !loading && (() => {
                    const { data: paginatedData, totalItems, totalPages } = getPaginatedMengajarData();
                    return (
                        <>
                            {/* Header with count and print button */}
                            <div className="flex items-center justify-between mb-2">
                                <div className="text-xs text-gray-500">
                                    Menampilkan {paginatedData.length} dari {totalItems} data
                                </div>
                                {totalItems > 0 && (
                                    <button
                                        onClick={handlePrintJurnalGuru}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white text-xs rounded-lg hover:bg-green-600 transition-colors"
                                    >
                                        <i className="fas fa-print"></i>
                                        Cetak Jurnal
                                    </button>
                                )}
                            </div>

                            {paginatedData.length > 0 ? (
                                <div className="space-y-3">
                                    {paginatedData.map((item) => {
                                        const colors = getStatusConfig(item.guru_status);
                                        return (
                                            <button
                                                key={item.id || `${item.jadwal_id}-${item.tanggal_raw}`}
                                                onClick={() => handleCardClick(item, 'mengajar')}
                                                className={`w-full bg-white rounded-xl shadow-sm p-4 transition-all border-l-4 ${colors.border} cursor-pointer hover:shadow-md`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="flex-1 min-w-0 text-left">
                                                        {/* Row 1: Mapel */}
                                                        <p className="font-semibold text-gray-800 truncate">{item.mapel}</p>
                                                        {/* Row 2: Kelas */}
                                                        <p className="text-xs text-gray-500 truncate">{item.kelas}</p>
                                                        {/* Row 3: Tanggal + Time + Status */}
                                                        <div className="flex items-center justify-between mt-1.5">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] text-gray-400">{item.tanggal}</span>
                                                                <span className="text-[10px] text-gray-400">{item.waktu}</span>
                                                            </div>
                                                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${colors.labelBg}`}>
                                                                {colors.label}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <i className="fas fa-chalkboard-teacher text-gray-400 text-2xl"></i>
                                    </div>
                                    <p className="text-gray-500 font-medium">Tidak ada riwayat</p>
                                    <p className="text-gray-400 text-sm">Belum ada riwayat mengajar</p>
                                </div>
                            )}

                            {/* Pagination Controls */}
                            {totalItems > 0 && (
                                <div className="bg-white rounded-xl shadow-sm p-3 mt-4">
                                    <div className="flex items-center justify-between">
                                        {/* Per page selector */}
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-500">Tampilkan:</span>
                                            <select
                                                value={mengajarPerPage}
                                                onChange={(e) => { setMengajarPerPage(Number(e.target.value)); setMengajarPage(1); }}
                                                className="px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-green-400"
                                            >
                                                {[10, 20, 50, 100].map(n => (
                                                    <option key={n} value={n}>{n}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Page navigation */}
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setMengajarPage(p => Math.max(1, p - 1))}
                                                disabled={mengajarPage === 1}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${mengajarPage === 1
                                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                    : 'bg-green-500 text-white hover:bg-green-600'
                                                    }`}
                                            >
                                                <i className="fas fa-chevron-left mr-1"></i> Prev
                                            </button>

                                            <span className="text-xs text-gray-600 px-2">
                                                {mengajarPage} / {totalPages || 1}
                                            </span>

                                            <button
                                                onClick={() => setMengajarPage(p => Math.min(totalPages, p + 1))}
                                                disabled={mengajarPage >= totalPages}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${mengajarPage >= totalPages
                                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                    : 'bg-green-500 text-white hover:bg-green-600'
                                                    }`}
                                            >
                                                Next <i className="fas fa-chevron-right ml-1"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    );
                })()}

                {/* Kegiatan Tab */}
                {activeTab === 'kegiatan' && !loading && (() => {
                    const filteredData = getFilteredData('kegiatan');
                    return (
                        <>


                            {filteredData.length > 0 ? (
                                <div className="space-y-3">
                                    {filteredData.map((item) => {
                                        const colors = getStatusConfig(item.guru_status);
                                        return (
                                            <div
                                                key={item.id || `kegiatan-${item.tanggal_raw}-${item.nama}`}
                                                className={`relative bg-white rounded-xl shadow-sm transition-all border-l-4 ${colors.border}`}
                                            >


                                                <button
                                                    onClick={() => handleCardClick(item, 'kegiatan')}
                                                    className="w-full p-4 cursor-pointer hover:shadow-md text-left"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-semibold text-gray-800 truncate">{item.nama}</p>
                                                            <p className="text-xs text-gray-500 truncate">
                                                                <i className="fas fa-map-marker-alt mr-1"></i>{item.lokasi || '-'}
                                                            </p>
                                                            <div className="flex items-center justify-between mt-1.5">
                                                                <div className="flex items-center gap-2">
                                                                    {item.role && (
                                                                        <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">{item.role}</span>
                                                                    )}
                                                                    <span className="text-[10px] text-gray-400">{item.tanggal}</span>
                                                                </div>
                                                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${colors.labelBg}`}>
                                                                    {colors.label}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </button>


                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <i className="fas fa-calendar-check text-gray-400 text-2xl"></i>
                                    </div>
                                    <p className="text-gray-500 font-medium">Tidak ada riwayat</p>
                                    <p className="text-gray-400 text-sm">Belum ada riwayat kegiatan</p>
                                </div>
                            )}
                        </>
                    );
                })()}

                {/* Rapat Tab */}
                {activeTab === 'rapat' && !loading && (() => {
                    const filteredData = getFilteredData('rapat');
                    return (
                        <>
                            {/* Bulk action bar */}
                            {selectedRapatIds.length > 0 && (
                                <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 mb-3 flex items-center justify-between animate-fadeIn">
                                    <span className="text-sm text-purple-700">
                                        <i className="fas fa-check-circle mr-1"></i>
                                        {selectedRapatIds.length} rapat dipilih
                                    </span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setSelectedRapatIds([])}
                                            className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800"
                                        >
                                            Batal
                                        </button>
                                        <button
                                            onClick={handleBulkPrintRapat}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500 text-white text-xs rounded-lg hover:bg-purple-600 transition-colors"
                                        >
                                            <i className="fas fa-print"></i>
                                            Cetak Terpilih
                                        </button>
                                    </div>
                                </div>
                            )}

                            {filteredData.length > 0 ? (
                                <div className="space-y-3">
                                    {filteredData.map((item) => {
                                        const colors = getStatusConfig(item.guru_status);
                                        const isSelected = selectedRapatIds.includes(item.absensi_id);
                                        return (
                                            <div
                                                key={item.id || `rapat-${item.tanggal_raw}-${item.nama}`}
                                                className={`relative bg-white rounded-xl shadow-sm transition-all border-l-4 ${colors.border} ${isSelected ? 'ring-2 ring-purple-400' : ''}`}
                                            >
                                                {/* Checkbox */}
                                                {item.absensi_id && (
                                                    <div className="absolute top-3 left-3 z-10">
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={(e) => toggleRapatSelection(e, item.absensi_id)}
                                                            className="w-4 h-4 rounded border-gray-300 text-purple-500 focus:ring-purple-400"
                                                        />
                                                    </div>
                                                )}

                                                <button
                                                    onClick={() => handleCardClick(item, 'rapat')}
                                                    className="w-full p-4 cursor-pointer hover:shadow-md text-left"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className={`flex-1 min-w-0 ${item.absensi_id ? 'pl-6' : ''}`}>
                                                            <p className="font-semibold text-gray-800 truncate">{item.nama}</p>
                                                            <p className="text-xs text-gray-500 truncate">
                                                                <i className="fas fa-map-marker-alt mr-1"></i>{item.lokasi || '-'}
                                                            </p>
                                                            <div className="flex items-center justify-between mt-1.5">
                                                                <div className="flex items-center gap-2">
                                                                    {item.role && (
                                                                        <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium">{item.role}</span>
                                                                    )}
                                                                    <span className="text-[10px] text-gray-400">{item.tanggal}</span>
                                                                </div>
                                                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${colors.labelBg}`}>
                                                                    {colors.label}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </button>

                                                {/* Print button */}
                                                {item.absensi_id && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handlePrintHasilRapat(item.absensi_id); }}
                                                        className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-green-100 text-gray-500 hover:text-green-600 rounded-full transition-colors"
                                                        title="Cetak Berita Acara"
                                                    >
                                                        <i className="fas fa-print text-sm"></i>
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <i className="fas fa-users text-gray-400 text-2xl"></i>
                                    </div>
                                    <p className="text-gray-500 font-medium">Tidak ada riwayat</p>
                                    <p className="text-gray-400 text-sm">Belum ada riwayat rapat</p>
                                </div>
                            )}
                        </>
                    );
                })()}
            </div>

            {/* Modals */}
            {selectedItem && modalType === 'hadir' && itemCategory === 'mengajar' && (
                <ModalRiwayatMengajar
                    item={selectedItem}
                    onClose={handleCloseModal}
                />
            )}

            {/* Kegiatan modals by role */}
            {selectedItem && modalType === 'hadir' && itemCategory === 'kegiatan' && (selectedItem.role === 'PJ' || selectedItem.role === 'penanggung_jawab') && (
                <ModalRiwayatKegiatanPJ item={selectedItem} onClose={handleCloseModal} />
            )}
            {selectedItem && modalType === 'hadir' && itemCategory === 'kegiatan' && selectedItem.role !== 'PJ' && selectedItem.role !== 'penanggung_jawab' && (
                <ModalRiwayatKegiatanPendamping item={selectedItem} onClose={handleCloseModal} />
            )}

            {/* Rapat modals by role */}
            {selectedItem && modalType === 'hadir' && itemCategory === 'rapat' && selectedItem.role === 'Pimpinan' && (
                <ModalRiwayatRapatPimpinan item={selectedItem} onClose={handleCloseModal} />
            )}
            {selectedItem && modalType === 'hadir' && itemCategory === 'rapat' && selectedItem.role === 'Sekretaris' && (
                <ModalRiwayatRapatSekretaris item={selectedItem} onClose={handleCloseModal} />
            )}
            {selectedItem && modalType === 'hadir' && itemCategory === 'rapat' && selectedItem.role !== 'Pimpinan' && selectedItem.role !== 'Sekretaris' && (
                <ModalRiwayatRapatPeserta item={selectedItem} onClose={handleCloseModal} />
            )}

            {selectedItem && modalType === 'terlewat' && (
                <ModalTerlewat
                    item={selectedItem}
                    type={itemCategory}
                    onClose={handleCloseModal}
                />
            )}

            {selectedItem && modalType === 'izin' && (
                <ModalIzin
                    item={selectedItem}
                    type={itemCategory}
                    onClose={handleCloseModal}
                />
            )}

            {/* Unlocked Modals - Edit forms when admin has unlocked attendance */}
            {selectedItem && modalType === 'unlocked' && itemCategory === 'mengajar' && (
                <AbsensiModals.ModalAbsensiSiswa
                    jadwal={selectedItem}
                    tanggal={selectedItem.tanggal_raw}
                    siswaList={[]} // Will be fetched inside modal
                    onClose={handleCloseModal}
                    onSuccess={() => {
                        handleCloseModal();
                        fetchMengajarData(); // Refresh data
                    }}
                    isUnlocked={true}
                />
            )}

            {/* Kegiatan PJ */}
            {selectedItem && modalType === 'unlocked' && itemCategory === 'kegiatan' && (selectedItem.role === 'PJ' || selectedItem.role === 'penanggung_jawab') && (
                <KegiatanModals.ModalAbsensiKegiatanPJ
                    kegiatan={selectedItem}
                    tanggal={selectedItem.tanggal_raw}
                    guruPendamping={kegiatanGuruPendamping}
                    siswaList={kegiatanSiswaList}
                    onClose={handleCloseModal}
                    onSuccess={() => {
                        handleCloseModal();
                        fetchKegiatanData();
                    }}
                    isUnlocked={true}
                />
            )}
            {/* Kegiatan Pendamping */}
            {selectedItem && modalType === 'unlocked' && itemCategory === 'kegiatan' && selectedItem.role !== 'PJ' && selectedItem.role !== 'penanggung_jawab' && (
                <KegiatanModals.ModalAbsensiKegiatanPendamping
                    kegiatan={selectedItem}
                    tanggal={selectedItem.tanggal_raw}
                    onClose={handleCloseModal}
                    onSuccess={() => {
                        handleCloseModal();
                        fetchKegiatanData();
                    }}
                    isUnlocked={true}
                />
            )}

            {/* Rapat Pimpinan */}
            {selectedItem && modalType === 'unlocked' && itemCategory === 'rapat' && selectedItem.role === 'Pimpinan' && (
                <RapatModals.ModalAbsensiRapatPimpinan
                    rapat={selectedItem}
                    tanggal={selectedItem.tanggal_raw}
                    onClose={handleCloseModal}
                    onSuccess={() => {
                        handleCloseModal();
                        fetchRapatData();
                    }}
                    isUnlocked={true}
                />
            )}
            {/* Rapat Sekretaris */}
            {selectedItem && modalType === 'unlocked' && itemCategory === 'rapat' && selectedItem.role === 'Sekretaris' && (
                <RapatModals.ModalAbsensiRapatSekretaris
                    rapat={selectedItem}
                    tanggal={selectedItem.tanggal_raw}
                    pimpinan={rapatPimpinan}
                    pesertaList={rapatPesertaList}
                    onClose={handleCloseModal}
                    onSuccess={() => {
                        handleCloseModal();
                        fetchRapatData();
                    }}
                    isUnlocked={true}
                />
            )}
            {/* Rapat Peserta */}
            {selectedItem && modalType === 'unlocked' && itemCategory === 'rapat' && selectedItem.role !== 'Pimpinan' && selectedItem.role !== 'Sekretaris' && (
                <RapatModals.ModalAbsensiRapatPeserta
                    rapat={selectedItem}
                    tanggal={selectedItem.tanggal_raw}
                    role={selectedItem.role}
                    onClose={handleCloseModal}
                    onSuccess={() => {
                        handleCloseModal();
                        fetchRapatData();
                    }}
                    isUnlocked={true}
                />
            )}
        </div>
    );
}

export default Riwayat;
