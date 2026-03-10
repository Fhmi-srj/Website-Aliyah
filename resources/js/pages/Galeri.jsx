import React, { useState, useEffect, useCallback } from 'react';
import api from '../lib/axios';

const TYPE_CONFIG = {
    mengajar: { label: 'Mengajar', color: 'emerald', icon: 'fa-chalkboard-teacher' },
    penilaian: { label: 'Penilaian', color: 'blue', icon: 'fa-file-signature' },
    kegiatan: { label: 'Kegiatan', color: 'amber', icon: 'fa-calendar-check' },
    rapat: { label: 'Rapat', color: 'purple', icon: 'fa-users' },
};

const MONTHS = [
    { value: '', label: 'Semua Bulan' },
    { value: '1', label: 'Januari' }, { value: '2', label: 'Februari' }, { value: '3', label: 'Maret' },
    { value: '4', label: 'April' }, { value: '5', label: 'Mei' }, { value: '6', label: 'Juni' },
    { value: '7', label: 'Juli' }, { value: '8', label: 'Agustus' }, { value: '9', label: 'September' },
    { value: '10', label: 'Oktober' }, { value: '11', label: 'November' }, { value: '12', label: 'Desember' },
];

function Galeri({ isAdmin = false }) {
    const [photos, setPhotos] = useState([]);
    const [stats, setStats] = useState({ mengajar: 0, penilaian: 0, kegiatan: 0, rapat: 0, total: 0 });
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    // Filters
    const [activeType, setActiveType] = useState('all');
    const [month, setMonth] = useState('');
    const [year, setYear] = useState(new Date().getFullYear().toString());
    const [search, setSearch] = useState('');
    const [searchDebounced, setSearchDebounced] = useState('');

    // Lightbox
    const [lightbox, setLightbox] = useState(null);
    const [lightboxIdx, setLightboxIdx] = useState(0);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => setSearchDebounced(search), 400);
        return () => clearTimeout(timer);
    }, [search]);

    // Determine API base path
    const apiBase = isAdmin ? '' : '/guru-panel';

    const fetchPhotos = useCallback(async (page = 1, append = false) => {
        if (page === 1) setLoading(true); else setLoadingMore(true);
        try {
            const params = new URLSearchParams();
            if (activeType !== 'all') params.append('type', activeType);
            if (month) params.append('month', month);
            if (year) params.append('year', year);
            if (searchDebounced) params.append('search', searchDebounced);
            params.append('page', page);
            params.append('per_page', '30');

            const res = await api.get(`${apiBase}/gallery?${params.toString()}`);
            if (res.data.success) {
                setPhotos(prev => append ? [...prev, ...res.data.data] : res.data.data);
                setStats(res.data.stats);
                setPagination(res.data.pagination);
            }
        } catch (err) {
            console.error('Error fetching gallery:', err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [activeType, month, year, searchDebounced, apiBase]);

    useEffect(() => {
        fetchPhotos(1);
    }, [fetchPhotos]);

    const loadMore = () => {
        if (pagination.current_page < pagination.last_page) {
            fetchPhotos(pagination.current_page + 1, true);
        }
    };

    const openLightbox = (idx) => {
        setLightboxIdx(idx);
        setLightbox(photos[idx]);
        document.body.style.overflow = 'hidden';
    };

    const closeLightbox = () => {
        setLightbox(null);
        document.body.style.overflow = '';
    };

    const navigateLightbox = (dir) => {
        const newIdx = lightboxIdx + dir;
        if (newIdx >= 0 && newIdx < photos.length) {
            setLightboxIdx(newIdx);
            setLightbox(photos[newIdx]);
        }
    };

    // Handle keyboard navigation in lightbox
    useEffect(() => {
        if (!lightbox) return;
        const handleKey = (e) => {
            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowLeft') navigateLightbox(-1);
            if (e.key === 'ArrowRight') navigateLightbox(1);
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [lightbox, lightboxIdx]);

    const handleDownload = async (url, filename) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename || `foto_${Date.now()}.jpg`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(blobUrl);
        } catch (err) {
            console.error('Download failed:', err);
            window.open(url, '_blank');
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return '';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

    // Filter handler that doesn't re-count (stats are always for unfiltered "all")
    const handleTypeFilter = (type) => {
        setActiveType(prev => prev === type ? 'all' : type);
    };

    return (
        <div className="min-h-screen">
            {/* Header Banner - Green gradient matching other guru pages */}
            <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-5 rounded-b-3xl shadow-lg mb-4">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                        <i className="fas fa-images text-lg"></i>
                    </div>
                    <div>
                        <h1 className="text-lg font-bold">Galeri Dokumentasi</h1>
                        <p className="text-green-200 text-xs">Foto dokumentasi kegiatan madrasah</p>
                    </div>
                </div>

                {/* Filter Grid 2x2 */}
                <div className="grid grid-cols-2 gap-2">
                    {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                        <button
                            key={key}
                            onClick={() => handleTypeFilter(key)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${activeType === key
                                ? 'bg-white text-green-700'
                                : 'bg-white/20 text-white/80 hover:bg-white/30'
                                }`}
                        >
                            <i className={`fas ${cfg.icon}`}></i>
                            {cfg.label}
                            <span className={`ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeType === key ? 'bg-green-100 text-green-700' : 'bg-white/20 text-white'
                                }`}>{stats[key] || 0}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Filter Bar */}
            <div className="flex gap-2 mb-4 px-4">
                <div className="relative flex-1">
                    <i className="fas fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Cari..."
                        className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 text-xs focus:ring-2 focus:ring-green-400 focus:border-transparent bg-white"
                    />
                </div>
                <select
                    value={month}
                    onChange={e => setMonth(e.target.value)}
                    className="px-2 py-2 rounded-lg border border-gray-200 text-xs focus:ring-2 focus:ring-green-400 focus:border-transparent bg-white"
                >
                    {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <select
                    value={year}
                    onChange={e => setYear(e.target.value)}
                    className="px-2 py-2 rounded-lg border border-gray-200 text-xs focus:ring-2 focus:ring-green-400 focus:border-transparent bg-white w-[72px]"
                >
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>

            {/* Photo Grid */}
            {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 px-4">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="bg-gray-100 rounded-xl animate-pulse aspect-square"></div>
                    ))}
                </div>
            ) : photos.length === 0 ? (
                <div className="text-center py-12 px-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <i className="fas fa-images text-gray-300 text-2xl"></i>
                    </div>
                    <p className="text-gray-500 font-medium text-sm">Belum ada foto dokumentasi</p>
                    <p className="text-gray-400 text-xs mt-1">Foto yang diupload saat absensi akan muncul di sini</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 px-4">
                        {photos.map((photo, idx) => {
                            const cfg = TYPE_CONFIG[photo.type] || TYPE_CONFIG.mengajar;
                            return (
                                <div
                                    key={photo.id}
                                    className="group relative bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-all cursor-pointer"
                                    onClick={() => openLightbox(idx)}
                                >
                                    <div className="aspect-square overflow-hidden bg-gray-100">
                                        <img
                                            src={photo.url}
                                            alt={photo.label}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                            loading="lazy"
                                            onError={e => { e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23f3f4f6" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%239ca3af" font-size="12">No Image</text></svg>'; }}
                                        />
                                    </div>

                                    {/* Hover Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end">
                                        <div className="p-2.5 text-white w-full">
                                            <p className="text-[11px] font-semibold truncate">{photo.label}</p>
                                            <p className="text-[9px] opacity-80">{photo.guru_nama}</p>
                                        </div>
                                    </div>

                                    {/* Type Badge */}
                                    <div className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-${cfg.color}-500 text-white shadow-sm`}>
                                        {cfg.label}
                                    </div>

                                    {/* Date + Size */}
                                    <div className="absolute top-1.5 right-1.5 flex flex-col gap-0.5 items-end">
                                        <span className="px-1.5 py-0.5 rounded text-[8px] font-medium bg-black/40 text-white backdrop-blur-sm">
                                            {formatDate(photo.tanggal)}
                                        </span>
                                        {photo.file_size && (
                                            <span className="px-1.5 py-0.5 rounded text-[7px] font-medium bg-black/30 text-white/90 backdrop-blur-sm">
                                                {formatFileSize(photo.file_size)}
                                            </span>
                                        )}
                                    </div>

                                    {/* Download button on hover */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDownload(photo.url, `${photo.type}_${photo.tanggal}.jpg`); }}
                                        className="absolute bottom-1.5 right-1.5 w-7 h-7 bg-white/90 hover:bg-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                                    >
                                        <i className="fas fa-download text-gray-600 text-[10px]"></i>
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* Load More */}
                    {pagination.current_page < pagination.last_page && (
                        <div className="text-center mt-4">
                            <button
                                onClick={loadMore}
                                disabled={loadingMore}
                                className="px-5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-700 hover:bg-gray-50 hover:shadow-sm transition-all disabled:opacity-50"
                            >
                                {loadingMore ? (
                                    <><i className="fas fa-spinner fa-spin mr-1.5"></i>Memuat...</>
                                ) : (
                                    <>Muat Lebih Banyak <span className="text-gray-400 ml-1">({pagination.total - photos.length} lagi)</span></>
                                )}
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Lightbox Modal */}
            {lightbox && (
                <div
                    className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center"
                    onClick={closeLightbox}
                >
                    {/* Close */}
                    <button onClick={closeLightbox} className="absolute top-3 right-3 w-9 h-9 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors z-10">
                        <i className="fas fa-times text-lg"></i>
                    </button>

                    {/* Download */}
                    <button
                        onClick={e => { e.stopPropagation(); handleDownload(lightbox.url, `${lightbox.type}_${lightbox.tanggal}.jpg`); }}
                        className="absolute top-3 right-14 w-9 h-9 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors z-10"
                    >
                        <i className="fas fa-download text-sm"></i>
                    </button>

                    {/* Nav Prev */}
                    {lightboxIdx > 0 && (
                        <button onClick={e => { e.stopPropagation(); navigateLightbox(-1); }} className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors z-10">
                            <i className="fas fa-chevron-left"></i>
                        </button>
                    )}

                    {/* Nav Next */}
                    {lightboxIdx < photos.length - 1 && (
                        <button onClick={e => { e.stopPropagation(); navigateLightbox(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors z-10">
                            <i className="fas fa-chevron-right"></i>
                        </button>
                    )}

                    {/* Image + Info */}
                    <div className="max-w-[90vw] max-h-[85vh] flex flex-col items-center" onClick={e => e.stopPropagation()}>
                        <img src={lightbox.url} alt={lightbox.label} className="max-w-full max-h-[72vh] object-contain rounded-lg shadow-2xl" />
                        <div className="mt-3 text-center text-white">
                            <div className="flex items-center justify-center gap-2 mb-1">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold bg-${(TYPE_CONFIG[lightbox.type] || TYPE_CONFIG.mengajar).color}-500`}>
                                    {(TYPE_CONFIG[lightbox.type] || TYPE_CONFIG.mengajar).label}
                                </span>
                                {lightbox.file_size && (
                                    <span className="text-[10px] text-white/60">{formatFileSize(lightbox.file_size)}</span>
                                )}
                            </div>
                            <p className="font-semibold text-sm">{lightbox.label}</p>
                            <p className="text-xs text-white/70">{lightbox.guru_nama} • {formatDate(lightbox.tanggal)}</p>
                            {lightbox.sublabel && <p className="text-[10px] text-white/50 mt-0.5">{lightbox.sublabel}</p>}
                            <p className="text-[10px] text-white/40 mt-1">{lightboxIdx + 1} / {photos.length}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Galeri;
