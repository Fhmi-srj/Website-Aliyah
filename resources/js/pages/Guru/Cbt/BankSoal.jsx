import React, { useState, useEffect } from 'react';
import CrudModal, { ModalSection } from '../../../components/CrudModal';
import { API_BASE, authFetch } from '../../../config/api';
import Swal from 'sweetalert2';
import Pagination from '../../../components/Pagination';
import { useNavigate } from 'react-router-dom';

const ITEMS_PER_PAGE_DEFAULT = 10;

export default function GuruBankSoal() {
    const navigate = useNavigate();
    const [data, setData] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE_DEFAULT);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [bankProjectFilter, setBankProjectFilter] = useState('');

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await authFetch(`${API_BASE}/guru-panel/cbt/question-banks`);
            const result = await response.json();
            setData(result.data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const bankProjects = [...new Set(
        data.map(b => b.name.includes(' - ') ? b.name.split(' - ')[0].trim() : null).filter(Boolean)
    )].sort();

    const filteredData = data.filter(item => {
        if (bankProjectFilter && !(item.name.startsWith(bankProjectFilter + ' - ') || item.name === bankProjectFilter)) return false;
        if (!search) return true;
        const s = search.toLowerCase();
        return (
            item.name?.toLowerCase().includes(s) ||
            item.kode_bank?.toLowerCase().includes(s) ||
            item.mapel?.nama_mapel?.toLowerCase().includes(s)
        );
    });

    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="animate-fadeIn flex flex-col flex-grow max-w-full overflow-auto">
            <header className={`${isMobile ? 'mb-3 mobile-sticky-header pt-2 pb-2 px-1' : 'mb-6'}`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="page-header-icon w-12 h-12 bg-gradient-to-br from-green-600 to-green-800 rounded-2xl flex items-center justify-center shadow-lg shadow-green-600/20">
                            <i className="fas fa-book-open text-white text-xl"></i>
                        </div>
                        <div>
                            <h1 className="page-header-title text-xl font-black text-gray-800 uppercase tracking-tight">CBT - Bank Soal</h1>
                            <p className="page-header-subtitle text-xs text-gray-400 mt-0.5 font-medium uppercase tracking-widest">Koleksi bank soal untuk mata pelajaran Anda</p>
                        </div>
                    </div>
                </div>
            </header>

            <div className={`${isMobile ? 'mobile-sticky-header' : ''}`}>
                <div className={`${isMobile ? 'mobile-controls-row bg-gray-50/50 rounded-xl border border-gray-100' : 'flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 p-4 bg-gray-50/50 rounded-2xl border border-gray-100'}`}>
                    <div className={`${isMobile ? 'mobile-search-wrap' : 'flex items-center w-full md:w-[280px]'} relative group`}>
                        <i className={`fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-green-600 transition-colors ${isMobile ? 'text-[10px]' : ''}`}></i>
                        <input
                            aria-label="Cari bank soal"
                            className={`w-full !pl-8 pr-2 ${isMobile ? 'py-1.5 text-[10px]' : 'py-3 text-sm'} bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-green-600/10 focus:border-green-600 transition-all placeholder-gray-400 shadow-sm`}
                            placeholder="Cari kode, nama bank, mapel..."
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    {!isMobile && bankProjects.length > 0 && (
                        <div className="relative flex-shrink-0">
                            <select
                                value={bankProjectFilter}
                                onChange={e => { setBankProjectFilter(e.target.value); setCurrentPage(1); }}
                                className="pl-8 pr-8 py-3 text-sm bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-green-600/10 focus:border-green-600 transition-all shadow-sm font-semibold text-gray-600 cursor-pointer min-w-[180px]"
                            >
                                <option value="">Semua Projek</option>
                                {bankProjects.map(proj => (
                                    <option key={proj} value={proj}>{proj}</option>
                                ))}
                            </select>
                            <i className="fas fa-folder absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 text-xs pointer-events-none"></i>
                            <i className="fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[9px] pointer-events-none"></i>
                        </div>
                    )}
                    <div className={`${isMobile ? 'mobile-btn-group' : 'flex gap-2 flex-wrap md:flex-nowrap items-center'}`}>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                    <span className="ml-3 text-sm font-medium text-gray-500">Memuat data...</span>
                </div>
            ) : (
                <div className={`bg-gray-50/30 rounded-2xl ${isMobile ? '' : 'border border-gray-100'} p-0`}>
                    {paginatedData.length > 0 ? (
                        <div className={`grid grid-cols-1 gap-3 ${isMobile ? 'py-2' : 'p-4'}`}>
                            {paginatedData.map((item, idx) => (
                                <button
                                    key={item.id}
                                    onClick={() => navigate(`/guru/cbt/bank-soal/${item.id}/soal`)}
                                    className="w-full relative bg-white rounded-xl shadow-sm p-4 transition-all border-l-4 border-green-500 cursor-pointer hover:shadow-md hover:-translate-y-[2px] text-left flex flex-col h-full group"
                                >
                                    <div className="flex items-start justify-between min-w-0 mb-4">
                                        <div className="min-w-0 pr-3">
                                            <p className="font-black text-gray-800 text-sm truncate uppercase tracking-tight group-hover:text-green-600 transition-colors">{item.name}</p>
                                            <p className="text-[10px] text-gray-400 font-mono mt-0.5"><i className="fas fa-fingerprint mr-1"></i>{item.kode_bank}</p>
                                        </div>
                                        <div className="flex-shrink-0">
                                            <span className="px-2.5 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold whitespace-nowrap">
                                                <i className="fas fa-list-ol mr-1"></i> {item.questions_count || 0} Soal
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-auto pt-3 border-t border-gray-50 flex items-center justify-between">
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[9px] text-gray-400 font-medium uppercase tracking-widest mb-0.5">Mata Pelajaran</span>
                                            <span className="text-xs font-bold text-green-600 truncate max-w-[150px]">{item.mapel?.nama_mapel || '-'}</span>
                                        </div>
                                        <div className="w-8 h-8 flex-shrink-0 rounded-full bg-green-50 group-hover:bg-green-500 text-green-600 group-hover:text-white flex items-center justify-center transition-colors">
                                            <i className="fas fa-chevron-right text-xs"></i>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="py-20 text-center bg-white rounded-2xl shadow-sm border border-gray-100">
                            <div className="flex flex-col items-center justify-center gap-3">
                                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center">
                                    <i className="fas fa-book-open text-2xl text-gray-300"></i>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-400">Data Bank Soal Kosong</p>
                                    <p className="text-[11px] text-gray-400 mt-1 uppercase tracking-widest font-medium">Belum ada bank soal untuk mata pelajaran Anda</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-6 border-t border-gray-100 bg-gray-50/30">
                        <div className="flex items-center gap-3 order-2 md:order-1">
                            <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse"></div>
                                Total {filteredData.length} Bank Soal
                            </span>
                        </div>
                        <div className="order-1 md:order-2">
                            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={filteredData.length} itemsPerPage={itemsPerPage} onLimitChange={(l) => { setItemsPerPage(l); setCurrentPage(1); }} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
