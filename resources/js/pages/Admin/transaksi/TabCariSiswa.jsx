import React, { useState, useEffect } from 'react';
import { API_BASE, authFetch } from '../../../config/api';

export default function TabCariSiswa({ isMobile }) {
    const [search, setSearch] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [expandedRow, setExpandedRow] = useState(null);

    const fmt = (n) => new Intl.NumberFormat('id-ID').format(n || 0);

    const searchSiswa = async () => {
        setLoading(true);
        try {
            const r = await authFetch(`${API_BASE}/pembayaran/search-siswa?q=${encodeURIComponent(search)}`);
            const d = await r.json();
            if (d.success) setResults(d.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { const t = setTimeout(() => { if (search.length >= 2) searchSiswa(); else if (search === '') { searchSiswa(); } }, 300); return () => clearTimeout(t); }, [search]);
    useEffect(() => { searchSiswa(); }, []);

    const renderStatus = (status) => {
        const colors = { lunas: 'bg-emerald-50 text-emerald-600', cicilan: 'bg-amber-50 text-amber-600', belum: 'bg-rose-50 text-rose-600' };
        return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${colors[status] || colors.belum}`}>{status === 'lunas' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>}{status}</span>;
    };

    const getOverallStatus = (s) => {
        if (s.total_sisa <= 0 && s.total_tagihan > 0) return 'lunas';
        if (s.total_dibayar > 0) return 'cicilan';
        return 'belum';
    };

    return (
        <>
            {/* Search */}
            <div className={`${isMobile ? 'mobile-controls-row bg-gray-50/50 rounded-xl border border-gray-100' : 'flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 p-4 bg-gray-50/50 rounded-2xl border border-gray-100'}`}>
                <div className={`${isMobile ? 'mobile-search-wrap' : 'flex items-center w-full md:w-[400px]'} relative group`}>
                    <i className={`fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors ${isMobile ? 'text-[10px]' : ''}`}></i>
                    <input type="search" value={search} onChange={e => setSearch(e.target.value)}
                        className={`w-full !pl-8 pr-2 ${isMobile ? 'py-1.5 text-[10px]' : 'py-3 text-sm'} bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder-gray-400 shadow-sm`}
                        placeholder={isMobile ? 'Cari siswa...' : 'Cari nama, NIS, atau NISN...'} />
                </div>
            </div>

            {/* Results Table */}
            {loading ? (
                <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div><span className="ml-3 text-sm font-medium text-gray-500">Memuat...</span></div>
            ) : (
                <div className={`bg-white rounded-2xl shadow-soft border border-gray-100 ${isMobile ? 'overflow-hidden' : 'overflow-x-auto scrollbar-hide'}`}>
                    <table className={`admin-table ${isMobile ? 'mobile-table-fixed' : 'min-w-[800px]'}`}>
                        <thead><tr>
                            {isMobile && <th className="col-expand select-none py-1 text-center"></th>}
                            {!isMobile && <th className="select-none pl-6 py-2.5 w-10 text-center text-xs font-black text-gray-400 uppercase tracking-widest">No</th>}
                            <th className={`select-none py-2 ${isMobile ? 'px-2 text-[8px]' : 'px-3 text-xs'} font-black text-gray-400 uppercase tracking-widest`}>Nama</th>
                            {!isMobile && <th className="select-none py-2 px-3 text-xs font-black text-gray-400 uppercase tracking-widest">Kelas</th>}
                            <th className={`select-none py-2 ${isMobile ? 'px-2 text-[8px]' : 'px-3 text-xs'} font-black text-gray-400 uppercase tracking-widest`}>Tagihan</th>
                            {!isMobile && <th className="select-none py-2 px-3 text-xs font-black text-gray-400 uppercase tracking-widest">Dibayar</th>}
                            <th className={`select-none py-2 ${isMobile ? 'px-2 text-[8px]' : 'px-3 text-xs'} font-black text-gray-400 uppercase tracking-widest`}>Sisa</th>
                            <th className={`select-none py-2 ${isMobile ? 'px-2 text-[8px]' : 'px-3 text-xs'} font-black text-gray-400 uppercase tracking-widest`}>Status</th>
                        </tr></thead>
                        <tbody>
                            {results.map((s, idx) => (
                                <React.Fragment key={s.id}>
                                    <tr className="hover:bg-gray-50/50 transition-colors border-b border-gray-100 last:border-0 cursor-pointer" onClick={() => setExpandedRow(expandedRow === s.id ? null : s.id)}>
                                        {isMobile && <td className="py-1.5 px-1 text-center align-middle"><i className={`fas fa-chevron-${expandedRow === s.id ? 'up' : 'down'} text-[8px] text-gray-400`}></i></td>}
                                        {!isMobile && <td className="py-2.5 pl-6 align-middle text-center text-xs font-bold text-gray-400">{idx + 1}</td>}
                                        <td className={`py-2 ${isMobile ? 'px-2' : 'px-3'} align-middle`}>
                                            <div className="flex flex-col">
                                                <span className={`font-black text-gray-700 uppercase tracking-tight ${isMobile ? 'text-[10px] truncate max-w-[100px] block' : 'text-sm'}`}>{s.nama}</span>
                                                <span className={`text-gray-400 font-medium ${isMobile ? 'text-[7px]' : 'text-[7px]'}`}>NIS: {s.nis}{isMobile ? ` · ${s.kelas_nama}` : ''}</span>
                                            </div>
                                        </td>
                                        {!isMobile && <td className="py-2 px-3 align-middle"><span className="text-[11px] font-bold text-gray-600 uppercase">{s.kelas_nama}</span></td>}
                                        <td className={`py-2 ${isMobile ? 'px-2' : 'px-3'} align-middle`}><span className={`font-bold text-gray-600 ${isMobile ? 'text-[9px]' : 'text-sm'}`}>Rp {fmt(s.total_tagihan)}</span></td>
                                        {!isMobile && <td className="py-2 px-3 align-middle"><span className="text-sm font-bold text-emerald-600">Rp {fmt(s.total_dibayar)}</span></td>}
                                        <td className={`py-2 ${isMobile ? 'px-2' : 'px-3'} align-middle`}><span className={`font-bold text-rose-600 ${isMobile ? 'text-[9px]' : 'text-sm'}`}>Rp {fmt(s.total_sisa)}</span></td>
                                        <td className={`py-2 ${isMobile ? 'px-2' : 'px-3'} align-middle`}>{renderStatus(getOverallStatus(s))}</td>
                                    </tr>
                                    {expandedRow === s.id && s.tagihan?.length > 0 && (
                                        <tr><td colSpan={isMobile ? 5 : 7} className="p-0">
                                            <div className={`bg-gray-50/70 ${isMobile ? 'p-2' : 'p-4'} space-y-2`}>
                                                {s.tagihan.map(t => (
                                                    <div key={t.id} className={`flex items-center justify-between bg-white rounded-xl border border-gray-100 ${isMobile ? 'p-2' : 'p-3'}`}>
                                                        <div className="flex-1">
                                                            <span className={`font-bold text-gray-700 ${isMobile ? 'text-[9px]' : 'text-[11px]'}`}>{t.tagihan_nama}</span>
                                                            <div className={`text-gray-400 mt-0.5 ${isMobile ? 'text-[8px]' : 'text-[10px]'}`}>Rp {fmt(t.nominal)} · Dibayar Rp {fmt(t.total_dibayar)} · Sisa Rp {fmt(t.sisa)}</div>
                                                        </div>
                                                        {renderStatus(t.status)}
                                                    </div>
                                                ))}
                                            </div>
                                        </td></tr>
                                    )}
                                </React.Fragment>
                            ))}
                            {results.length === 0 && (
                                <tr><td colSpan={isMobile ? 5 : 7} className={`text-center ${isMobile ? 'py-8' : 'py-20'}`}>
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <div className={`bg-gray-50 rounded-2xl flex items-center justify-center ${isMobile ? 'w-12 h-12' : 'w-16 h-16'}`}><i className={`fas fa-users text-gray-300 ${isMobile ? 'text-xl' : 'text-2xl'}`}></i></div>
                                        <p className={`font-bold text-gray-400 ${isMobile ? 'text-[10px]' : 'text-sm'}`}>Tidak ada data siswa</p>
                                    </div>
                                </td></tr>
                            )}
                        </tbody>
                    </table>
                    <div className={`flex items-center justify-between border-t border-gray-100 bg-gray-50/30 ${isMobile ? 'p-3' : 'p-4'}`}>
                        <span className={`font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5 ${isMobile ? 'text-[9px]' : 'text-[11px]'}`}>
                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>{results.length} Siswa
                        </span>
                    </div>
                </div>
            )}
        </>
    );
}
