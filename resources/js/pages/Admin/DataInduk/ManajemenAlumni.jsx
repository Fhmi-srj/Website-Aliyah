import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { API_BASE, authFetch } from '../../../config/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useTahunAjaran } from '../../../contexts/TahunAjaranContext';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import Pagination from '../../../components/Pagination';

const ITEMS_PER_PAGE_DEFAULT = 10;

function ManajemenAlumni() {
    const [data, setData] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    // Tahun Ajaran
    const { tahunAjaran: authTahunAjaran } = useAuth();
    const { activeTahunAjaran } = useTahunAjaran();
    const tahunAjaranId = authTahunAjaran?.id || activeTahunAjaran?.id;

    // Sorting state
    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState('asc');

    // Filter state
    const [filterTahunLulus, setFilterTahunLulus] = useState('');
    const [activeFilter, setActiveFilter] = useState(null);

    // Mobile detection
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [expandedRows, setExpandedRows] = useState(new Set());

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE_DEFAULT);

    const fetchData = async () => {
        try {
            setLoading(true);
            const url = tahunAjaranId
                ? `${API_BASE}/siswa?status=Alumni&tahun_ajaran_id=${tahunAjaranId}`
                : `${API_BASE}/siswa?status=Alumni`;
            const res = await authFetch(url);
            const data = await res.json();
            setData(data.data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [tahunAjaranId]);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const handleClick = () => setActiveFilter(null);
        document.body.addEventListener('click', handleClick);
        return () => document.body.removeEventListener('click', handleClick);
    }, []);

    const sortData = (dataToSort, column, direction) => {
        if (!column) return dataToSort;
        const dir = direction === 'asc' ? 1 : -1;
        return [...dataToSort].sort((a, b) => {
            let valA = column === 'kelas' ? a.kelas?.nama_kelas : a[column];
            let valB = column === 'kelas' ? b.kelas?.nama_kelas : b[column];
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();
            if (valA > valB) return dir;
            if (valA < valB) return -dir;
            return 0;
        });
    };

    const handleSort = (column) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const toggleRow = (idx) => {
        setExpandedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(idx)) newSet.delete(idx);
            else newSet.add(idx);
            return newSet;
        });
    };

    const uniqueTahunLulus = [...new Set(data.map(s => s.kelas_history?.find(h => h.status === 'Lulus')?.tahun_ajaran?.nama).filter(Boolean))].sort();

    const filteredData = (() => {
        let result = data.filter(item => {
            const matchesSearch = !search || item.nama?.toLowerCase().includes(search.toLowerCase()) ||
                item.nis?.toLowerCase().includes(search.toLowerCase());
            const tahunLulus = item.kelas_history?.find(h => h.status === 'Lulus')?.tahun_ajaran?.nama;
            const matchesTahun = !filterTahunLulus || tahunLulus === filterTahunLulus;
            return matchesSearch && matchesTahun;
        });

        if (sortColumn) {
            result = sortData(result, sortColumn, sortDirection);
        }
        return result;
    })();

    const paginatedData = filteredData.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);

    useEffect(() => {
        setCurrentPage(1);
    }, [search, filterTahunLulus]);

    // Export PDF
    const [pdfLoading, setPdfLoading] = useState(false);
    const handleExportPdf = async () => {
        try {
            setPdfLoading(true);
            const response = await authFetch(`${API_BASE}/export-pdf/alumni`);
            if (!response.ok) throw new Error('Gagal mengunduh PDF');
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Alumni_${new Date().toISOString().split('T')[0]}.pdf`;
            link.click();
            setTimeout(() => URL.revokeObjectURL(link.href), 1000);
        } catch (error) {
            console.error('Error export PDF:', error);
            Swal.fire({ icon: 'error', title: 'Gagal!', text: 'Gagal mengunduh PDF', timer: 2000, showConfirmButton: false });
        } finally {
            setPdfLoading(false);
        }
    };

    const handleExport = () => {
        const exportData = filteredData.map((item, idx) => {
            const lulusRecord = item.kelas_history?.find(h => h.status === 'Lulus');
            return {
                'No': idx + 1,
                'Nama': item.nama,
                'NIS': item.nis,
                'NISN': item.nisn || '',
                'Kelas Terakhir': lulusRecord?.kelas?.nama_kelas || item.kelas?.nama_kelas || '',
                'Tahun Lulus': lulusRecord?.tahun_ajaran?.nama || '',
                'Asal Sekolah': item.asal_sekolah || ''
            };
        });
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Data Alumni');
        XLSX.writeFile(wb, `Data_Alumni_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const SortableHeader = ({ label, column, filterable, filterOptions, filterValue, setFilterValue }) => (
        <th className="select-none py-2.5 px-2 cursor-pointer whitespace-nowrap group" onClick={() => !filterable && handleSort(column)}>
            <div className="flex items-center gap-1.5">
                <span onClick={(e) => { e.stopPropagation(); handleSort(column); }} className="hover:text-primary transition-colors">
                    {label}
                </span>
                <div className="flex flex-col text-[8px] leading-[4px] text-gray-300 dark:text-gray-600">
                    <i className={`fas fa-caret-up ${sortColumn === column && sortDirection === 'asc' ? 'text-primary' : ''}`}></i>
                    <i className={`fas fa-caret-down ${sortColumn === column && sortDirection === 'desc' ? 'text-primary' : ''}`}></i>
                </div>
                {filterable && (
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setActiveFilter(activeFilter === column ? null : column)} className={`ml-1 transition-colors ${filterValue ? 'text-primary' : 'text-gray-400 hover:text-primary dark:hover:text-gray-200'}`}>
                            <i className="fas fa-filter text-[10px]"></i>
                        </button>
                        {activeFilter === column && (
                            <div className="absolute top-full left-0 mt-2 bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-xl shadow-xl z-20 min-w-[150px] overflow-hidden animate-fadeIn">
                                {filterOptions.map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => { setFilterValue(opt.value); setActiveFilter(null); }}
                                        className={`block w-full text-left px-4 py-2.5 text-[11px] transition-colors hover:bg-primary/5 dark:hover:bg-primary/10 ${filterValue === opt.value ? 'bg-primary/10 text-primary font-bold dark:bg-primary/20' : 'dark:text-dark-text'}`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </th>
    );

    return (
        <div className="animate-fadeIn flex flex-col flex-grow max-w-full overflow-auto">
            {/* Header */}
            <header className={`${isMobile ? 'mb-3 mobile-sticky-header pt-2 pb-2 px-1' : 'mb-6'}`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="page-header-icon w-12 h-12 bg-gradient-to-br from-primary to-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                            <i className="fas fa-graduation-cap text-white text-xl"></i>
                        </div>
                        <div>
                            <h1 className="page-header-title text-xl font-black text-gray-800 dark:text-dark-text uppercase tracking-tight">Data Alumni</h1>
                            <p className="page-header-subtitle text-xs text-gray-400 mt-0.5 font-medium uppercase tracking-widest">Arsip data siswa yang telah lulus</p>
                        </div>
                    </div>
                </div>
            </header>

            <div className={`${isMobile ? 'mobile-sticky-header' : ''}`}>
                <div className={`${isMobile ? 'mobile-controls-row bg-gray-50/50 rounded-xl border border-gray-100' : 'flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 p-4 bg-gray-50/50 dark:bg-dark-bg/20 rounded-2xl border border-gray-100 dark:border-dark-border'}`}>
                    <div className={`${isMobile ? 'mobile-search-wrap' : 'flex items-center w-full md:w-[400px]'} relative group`}>
                        <i className={`fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors ${isMobile ? 'text-[10px]' : ''}`}></i>
                        <input
                            aria-label="Cari alumni"
                            className={`w-full !pl-8 pr-2 ${isMobile ? 'py-1.5 text-[10px]' : 'py-3 text-sm'} bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all dark:text-dark-text placeholder-gray-400 shadow-sm`}
                            placeholder={isMobile ? 'Cari...' : 'Cari nama atau NIS...'}
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className={`${isMobile ? 'mobile-btn-group' : 'flex gap-2 flex-wrap md:flex-nowrap items-center'}`}>
                        <button onClick={handleExportPdf} disabled={pdfLoading} className={`btn-secondary flex items-center gap-1 font-black uppercase tracking-widest ${isMobile ? '' : 'px-5 py-3 text-[10px] rounded-xl'}`} type="button" title="Download PDF">
                            <i className={`fas ${pdfLoading ? 'fa-spinner fa-spin' : 'fa-file-pdf'}`}></i>
                            <span>PDF</span>
                        </button>
                        <button onClick={handleExport} className={`btn-secondary flex items-center gap-1 font-black uppercase tracking-widest ${isMobile ? '' : 'px-5 py-3 text-[10px] rounded-xl'}`}>
                            <i className="fas fa-file-export"></i>
                            <span>Export</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Card */}
            <div className={`relative overflow-hidden bg-gradient-to-br from-primary to-green-600 dark:from-primary/20 dark:to-green-900/20 rounded-3xl shadow-lg shadow-primary/10 ${isMobile ? 'p-4 mb-4' : 'p-8 mb-8'} text-white border border-white/10 group`}>
                <div className="relative z-10 flex justify-between items-center">
                    <div>
                        <p className="text-[10px] font-black opacity-80 uppercase tracking-[0.2em] mb-2">Total Alumni Terdata</p>
                        <div className="flex items-baseline gap-2">
                            <p className={`${isMobile ? 'text-3xl' : 'text-5xl'} font-black tracking-tighter`}>{data.length}</p>
                            <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-bold opacity-60`}>Siswa Lulus</span>
                        </div>
                    </div>
                    {!isMobile && (
                        <div className="w-20 h-20 rounded-[2rem] bg-white/10 backdrop-blur-xl flex items-center justify-center border border-white/20 transform group-hover:rotate-12 transition-transform duration-500">
                            <i className="fas fa-user-graduate text-3xl opacity-90"></i>
                        </div>
                    )}
                </div>
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl transition-all duration-700 group-hover:scale-150"></div>
                <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-primary-light/10 rounded-full blur-2xl group-hover:translate-x-full duration-1000"></div>
            </div>

            {/* Table Section */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="ml-3 text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-widest">Mengumpulkan Arsip...</span>
                </div>
            ) : (
                <div className={`bg-white dark:bg-dark-surface rounded-2xl shadow-soft border border-gray-100 dark:border-dark-border ${isMobile ? 'overflow-hidden' : 'overflow-x-auto scrollbar-hide max-w-full'}`}>
                    <table className={`admin-table ${isMobile ? 'mobile-table-fixed' : 'min-w-[800px]'}`}>
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-dark-border">
                                {!isMobile && <th className="select-none pl-6 py-2.5 w-16 text-center text-xs font-black text-gray-400 uppercase tracking-widest">No</th>}
                                {isMobile && <th className="select-none py-2.5 text-center"></th>}
                                <SortableHeader label="Nama Alumni" column="nama" />
                                {!isMobile && <SortableHeader label="NIS / NISN" column="nis" />}
                                {!isMobile && <th className="select-none py-2.5 text-xs font-black text-gray-400 uppercase tracking-widest">Kelas Terakhir</th>}
                                <SortableHeader
                                    label="Tahun Lulus"
                                    column="tahun_lulus"
                                    filterable
                                    filterOptions={[
                                        { label: 'Semua Angkatan', value: '' },
                                        ...uniqueTahunLulus.map(t => ({ label: t, value: t }))
                                    ]}
                                    filterValue={filterTahunLulus}
                                    setFilterValue={setFilterTahunLulus}
                                />
                                {!isMobile && <th className="select-none py-2.5 text-xs font-black text-gray-400 uppercase tracking-widest">Asal Sekolah</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.map((item, idx) => {
                                const lulusRecord = item.kelas_history?.find(h => h.status === 'Lulus');
                                return (
                                    <React.Fragment key={item.id}>
                                        <tr className="hover:bg-gray-50/50 dark:hover:bg-dark-bg/20 transition-colors border-b border-gray-100 dark:border-dark-border last:border-0 group">
                                            {!isMobile && (
                                                <td className="pl-6 py-2.5 align-middle text-center text-xs font-bold text-gray-400 dark:text-gray-500">
                                                    {(currentPage - 1) * itemsPerPage + idx + 1}
                                                </td>
                                            )}
                                            {isMobile && (
                                                <td className="py-1 align-middle text-center cursor-pointer px-1" onClick={() => toggleRow(idx)}>
                                                    <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${expandedRows.has(idx) ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-400'}`}>
                                                        <i className={`fas fa-chevron-${expandedRows.has(idx) ? 'up' : 'down'} text-[7px]`}></i>
                                                    </div>
                                                </td>
                                            )}
                                            <td className="py-2.5 px-2 align-middle whitespace-nowrap">
                                                <span className="text-sm font-black text-gray-700 dark:text-dark-text group-hover:text-primary transition-colors uppercase tracking-tight">{item.nama}</span>
                                            </td>
                                            {!isMobile && (
                                                <td className="py-2.5 px-2 align-middle whitespace-nowrap">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-dark-bg/50 rounded-lg text-[10px] font-bold text-gray-500 dark:text-gray-400 w-fit">{item.nis}</span>
                                                        <span className="text-[10px] text-gray-400 dark:text-gray-600 font-medium">NISN: {item.nisn || '-'}</span>
                                                    </div>
                                                </td>
                                            )}
                                            {!isMobile && (
                                                <td className="py-2.5 px-2 align-middle whitespace-nowrap">
                                                    <span className="text-xs font-bold text-gray-600 dark:text-dark-text uppercase tracking-wider">{lulusRecord?.kelas?.nama_kelas || item.kelas?.nama_kelas || '-'}</span>
                                                </td>
                                            )}
                                            <td className="py-2.5 px-2 align-middle whitespace-nowrap">
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-100 dark:border-emerald-900/10">
                                                    {lulusRecord?.tahun_ajaran?.nama || '-'}
                                                </span>
                                            </td>
                                            {!isMobile && (
                                                <td className="py-2.5 px-2 align-middle whitespace-nowrap">
                                                    <span className="text-xs font-medium text-gray-500 dark:text-dark-text italic">{item.asal_sekolah || '-'}</span>
                                                </td>
                                            )}
                                        </tr>
                                        {isMobile && expandedRows.has(idx) && (
                                            <tr className="bg-gray-50/50 dark:bg-dark-bg/30 border-b border-gray-100 dark:border-dark-border">
                                                <td colSpan="3" className="p-0">
                                                    <div className="mobile-expand-grid">
                                                        <div className="expand-item"><span className="expand-label">NIS</span><span className="expand-value">{item.nis}</span></div>
                                                        <div className="expand-item"><span className="expand-label">NISN</span><span className="expand-value">{item.nisn || '-'}</span></div>
                                                        <div className="expand-item"><span className="expand-label">Kelas Terakhir</span><span className="expand-value">{lulusRecord?.kelas?.nama_kelas || item.kelas?.nama_kelas || '-'}</span></div>
                                                        <div className="expand-item"><span className="expand-label">Asal Sekolah</span><span className="expand-value">{item.asal_sekolah || '-'}</span></div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                            {filteredData.length === 0 && (
                                <tr>
                                    <td colSpan={isMobile ? 8 : 7} className="py-24 text-center">
                                        <div className="flex flex-col items-center justify-center gap-4">
                                            <div className="w-20 h-20 bg-gray-50 dark:bg-dark-bg/20 rounded-[2rem] flex items-center justify-center relative overflow-hidden group">
                                                <i className="fas fa-graduation-cap text-3xl text-gray-200 dark:text-gray-700 transition-transform group-hover:scale-125"></i>
                                                <div className="absolute inset-0 border-2 border-dashed border-gray-100 dark:border-dark-border rounded-[2rem] animate-spin-slow"></div>
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Data Alumni Tidak Ditemukan</p>
                                                <p className="text-[11px] text-gray-400 mt-2 font-medium italic opacity-60">Gunakan kata kunci atau filter tahun lulus yang berbeda</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* Pagination Section */}
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-8 border-t border-gray-100 dark:border-dark-border bg-gray-50/30 dark:bg-dark-bg/10">
                        <div className="flex items-center gap-4">
                            <div className="px-4 py-2 bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border shadow-sm">
                                <span className="text-[11px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                                    {filteredData.length} Alumni Terfilter
                                </span>
                            </div>
                        </div>
                        {totalPages > 1 && (
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={setCurrentPage}
                                totalItems={filteredData.length}
                                itemsPerPage={itemsPerPage}
                                onLimitChange={(limit) => {
                                    setItemsPerPage(limit);
                                    setCurrentPage(1);
                                }}
                            />
                        )}
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin-slow {
                    animation: spin-slow 15s linear infinite;
                }
            ` }} />
        </div>
    );
}

export default ManajemenAlumni;
