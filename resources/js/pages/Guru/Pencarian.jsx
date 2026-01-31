import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/axios';
import {
    ModalDetailJadwalMengajar,
    ModalDetailJadwalKegiatan,
    ModalDetailJadwalRapat,
    ModalAbsensiFromSearch
} from './components/SearchModals';

function Pencarian() {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('all');
    const [hari, setHari] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    // Modal states
    const [selectedItem, setSelectedItem] = useState(null);
    const [modalType, setModalType] = useState(null);

    const categories = [
        { value: 'all', icon: 'fas fa-search', label: 'Semua', color: 'bg-gray-500' },
        { value: 'jadwal', icon: 'fas fa-chalkboard-teacher', label: 'Jadwal', color: 'bg-green-500' },
        { value: 'kegiatan', icon: 'fas fa-calendar-check', label: 'Kegiatan', color: 'bg-blue-500' },
        { value: 'rapat', icon: 'fas fa-users', label: 'Rapat', color: 'bg-purple-500' },
        { value: 'absensi', icon: 'fas fa-clipboard-check', label: 'Absensi', color: 'bg-orange-500' },
    ];

    const days = ['Sabtu', 'Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis'];

    // Debounce function
    const debounce = (func, delay) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func(...args), delay);
        };
    };

    // Search function
    const performSearch = async (query, cat, day) => {
        if (query.length < 2 && !day) {
            setResults([]);
            setSearched(false);
            return;
        }

        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (query) params.append('q', query);
            if (cat && cat !== 'all') params.append('category', cat);
            if (day) params.append('hari', day);

            const response = await api.get(`/guru-panel/search?${params.toString()}`);
            setResults(response.data.results || []);
            setSearched(true);
        } catch (err) {
            console.error('Search error:', err);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    // Debounced search (300ms)
    const debouncedSearch = useCallback(
        debounce((query, cat, day) => performSearch(query, cat, day), 300),
        []
    );

    // Effect to trigger search on input change
    useEffect(() => {
        debouncedSearch(search, category, hari);
    }, [search, category, hari]);

    // Get color classes for result item
    const getColorClasses = (color) => {
        const colors = {
            green: { bg: 'bg-green-100', text: 'text-green-600', icon: 'text-green-500' },
            blue: { bg: 'bg-blue-100', text: 'text-blue-600', icon: 'text-blue-500' },
            purple: { bg: 'bg-purple-100', text: 'text-purple-600', icon: 'text-purple-500' },
            orange: { bg: 'bg-orange-100', text: 'text-orange-600', icon: 'text-orange-500' },
        };
        return colors[color] || colors.green;
    };

    // Handle item click
    const handleItemClick = (item) => {
        setSelectedItem(item);
        setModalType(item.type);
    };

    // Handle close modal
    const handleCloseModal = () => {
        setSelectedItem(null);
        setModalType(null);
    };

    // Handle absensi navigation
    const handleAbsensi = (item) => {
        handleCloseModal();

        switch (item.type) {
            case 'jadwal':
                navigate('/guru/absensi-mengajar', { state: { jadwalId: item.id } });
                break;
            case 'kegiatan':
                navigate('/guru/kegiatan');
                break;
            case 'rapat':
                navigate('/guru/rapat');
                break;
            default:
                break;
        }
    };

    // Render modal based on type
    const renderModal = () => {
        if (!selectedItem || !modalType) return null;

        switch (modalType) {
            case 'jadwal':
                return (
                    <ModalDetailJadwalMengajar
                        item={selectedItem}
                        onClose={handleCloseModal}
                        onAbsensi={handleAbsensi}
                    />
                );
            case 'kegiatan':
                return (
                    <ModalDetailJadwalKegiatan
                        item={selectedItem}
                        onClose={handleCloseModal}
                        onAbsensi={handleAbsensi}
                    />
                );
            case 'rapat':
                return (
                    <ModalDetailJadwalRapat
                        item={selectedItem}
                        onClose={handleCloseModal}
                        onAbsensi={handleAbsensi}
                    />
                );
            case 'absensi':
                return (
                    <ModalAbsensiFromSearch
                        item={selectedItem}
                        onClose={handleCloseModal}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div className="p-4 animate-fadeIn">
            {/* Search Bar */}
            <div className="relative mb-4">
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari jadwal, kegiatan, atau rapat..."
                    className="w-full bg-white rounded-xl px-4 py-3 pl-12 text-sm shadow-sm border-0 focus:ring-2 focus:ring-green-400 focus:outline-none"
                />
                <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                {loading && (
                    <i className="fas fa-spinner fa-spin absolute right-4 top-1/2 -translate-y-1/2 text-green-500"></i>
                )}
            </div>

            {/* Category Filter */}
            <div className="mb-4">
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {categories.map((cat) => (
                        <button
                            key={cat.value}
                            onClick={() => setCategory(cat.value)}
                            className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-medium transition-all ${category === cat.value
                                ? 'bg-green-500 text-white shadow-md'
                                : 'bg-white text-gray-600 shadow-sm hover:bg-gray-50'
                                }`}
                        >
                            <i className={`${cat.icon} mr-2`}></i>
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Day Filter (only for jadwal) */}
            {(category === 'all' || category === 'jadwal') && (
                <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-2">Filter Hari:</p>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        <button
                            onClick={() => setHari('')}
                            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${hari === ''
                                ? 'bg-green-500 text-white'
                                : 'bg-white text-gray-500 shadow-sm hover:bg-gray-50'
                                }`}
                        >
                            Semua
                        </button>
                        {days.map((day) => (
                            <button
                                key={day}
                                onClick={() => setHari(day)}
                                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${hari === day
                                    ? 'bg-green-500 text-white'
                                    : 'bg-white text-gray-500 shadow-sm hover:bg-gray-50'
                                    }`}
                            >
                                {day}
                            </button>
                        ))}
                    </div>
                </div>
            )}


            {/* Search Results Loading Skeleton */}
            {loading && searched && (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden animate-pulse">
                    <div className="p-3 border-b border-gray-100">
                        <div className="h-5 bg-gray-200 rounded w-32"></div>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="p-3 flex items-start gap-3">
                                <div className="w-10 h-10 bg-gray-200 rounded-lg flex-shrink-0"></div>
                                <div className="flex-1 min-w-0 space-y-2">
                                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                                    <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <div className="h-5 bg-gray-200 rounded-full w-14"></div>
                                    <div className="w-4 h-4 bg-gray-200 rounded"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {searched && !loading && (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <div className="p-3 border-b border-gray-100">
                        <h3 className="font-semibold text-gray-800 text-sm">
                            Hasil Pencarian
                            <span className="text-gray-400 font-normal ml-2">({results.length})</span>
                        </h3>
                    </div>

                    {results.length > 0 ? (
                        <div className="divide-y divide-gray-50">
                            {results.map((item, idx) => {
                                const colors = getColorClasses(item.color);
                                return (
                                    <div
                                        key={`${item.type}-${item.id}-${idx}`}
                                        className="p-3 hover:bg-gray-50 transition-colors cursor-pointer active:bg-gray-100"
                                        onClick={() => handleItemClick(item)}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`w-10 h-10 ${colors.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                                                <i className={`fas ${item.icon} ${colors.icon}`}></i>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-gray-800 text-sm truncate">{item.title}</p>
                                                <p className="text-xs text-gray-500 truncate">{item.subtitle}</p>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    <i className="fas fa-clock mr-1"></i>{item.time}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {item.isToday && item.type !== 'absensi' && (
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500 text-white font-medium">
                                                        Hari ini
                                                    </span>
                                                )}
                                                <span className={`text-[10px] px-2 py-1 rounded-full ${colors.bg} ${colors.text} font-medium capitalize`}>
                                                    {item.type}
                                                </span>
                                                <i className="fas fa-chevron-right text-gray-300 text-xs"></i>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="p-8 text-center">
                            <i className="fas fa-search text-gray-300 text-3xl mb-3"></i>
                            <p className="text-gray-400 text-sm">Tidak ada hasil ditemukan</p>
                            <p className="text-gray-300 text-xs mt-1">Coba kata kunci lain</p>
                        </div>
                    )}
                </div>
            )}

            {/* Initial State */}
            {!searched && (
                <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="fas fa-search text-green-500 text-2xl"></i>
                    </div>
                    <h3 className="font-semibold text-gray-800 mb-2">Cari Data</h3>
                    <p className="text-gray-400 text-sm">
                        Ketik minimal 2 karakter untuk mencari<br />
                        jadwal, kegiatan, atau rapat
                    </p>
                </div>
            )}

            {/* Render Modals */}
            {renderModal()}
        </div>
    );
}

export default Pencarian;
