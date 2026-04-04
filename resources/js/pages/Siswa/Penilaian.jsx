import React, { useState, useEffect } from 'react';
import api from '../../lib/axios';

const COLOR_ULANGAN = {
    ulangan_harian: 'bg-emerald-100 text-emerald-700',
    uts: 'bg-blue-100 text-blue-700',
    uas: 'bg-red-100 text-red-700',
    quiz: 'bg-amber-100 text-amber-700',
};

export default function SiswaPenilaian() {
    const [data, setData] = useState([]);
    const [summary, setSummary] = useState({ total: 0, rata_rata: 0 });
    const [filters, setFilters] = useState({ mapel: [] });
    const [loading, setLoading] = useState(true);

    const [selectedMapel, setSelectedMapel] = useState('');
    const [selectedJenis, setSelectedJenis] = useState('');

    useEffect(() => {
        const fetchPenilaian = async () => {
            setLoading(true);
            try {
                const params = {};
                if (selectedMapel) params.mapel = selectedMapel;
                if (selectedJenis) params.jenis_ulangan = selectedJenis;
                
                const res = await api.get('/siswa-panel/penilaian', { params });
                setData(res.data.data || []);
                setSummary(res.data.summary || { total: 0, rata_rata: 0 });
                setFilters(res.data.filters || { mapel: [] });
            } catch (error) {
                console.error("Failed to fetch penilaian", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPenilaian();
    }, [selectedMapel, selectedJenis]);

    return (
        <div className="animate-fadeIn p-4 md:p-6 lg:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
                        <i className="fas fa-star text-xl"></i>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800 tracking-tight">Daftar Nilai</h1>
                        <p className="text-sm text-gray-500">Lihat hasil penilaian dan ujian Anda</p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <select
                        value={selectedJenis}
                        onChange={(e) => setSelectedJenis(e.target.value)}
                        className="bg-gray-50 border-0 rounded-xl px-4 py-2 text-sm font-medium text-gray-600 focus:ring-2 focus:ring-purple-500/20 w-32 md:w-auto"
                    >
                        <option value="">Semua Jenis</option>
                        <option value="ulangan_harian">Penilaian Harian</option>
                        <option value="uts">UTS</option>
                        <option value="uas">UAS</option>
                        <option value="quiz">Quiz</option>
                    </select>

                    <select
                        value={selectedMapel}
                        onChange={(e) => setSelectedMapel(e.target.value)}
                        className="bg-gray-50 border-0 rounded-xl px-4 py-2 text-sm font-medium text-gray-600 focus:ring-2 focus:ring-purple-500/20 flex-1 md:w-auto"
                    >
                        <option value="">Semua Mapel</option>
                        {filters.mapel.map(m => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-lg">
                        <i className="fas fa-clipboard-list"></i>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-medium">Total Penilaian</p>
                        <p className="text-xl font-bold text-gray-800">{summary.total}</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center text-lg">
                        <i className="fas fa-chart-line"></i>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-medium">Rata-rata Nilai</p>
                        <p className="text-xl font-bold text-gray-800">{summary.rata_rata}</p>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                    <i className="fas fa-spinner fa-spin text-purple-500 text-2xl mb-3"></i>
                    <p className="text-gray-500 text-sm">Memuat data nilai...</p>
                </div>
            ) : data.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-3xl border border-gray-100 shadow-sm">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <i className="fas fa-folder-open text-gray-400 text-3xl"></i>
                    </div>
                    <p className="text-gray-800 font-bold mb-1">Belum Ada Nilai</p>
                    <p className="text-gray-500 text-sm max-w-sm px-4">
                        Data penilaian belum tersedia atau belum ada nilai yang dimasukkan oleh guru.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {data.map(item => (
                        <div key={item.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-purple-50 to-transparent -mr-4 -mt-4 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <div>
                                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${COLOR_ULANGAN[item.jenis_ulangan] || 'bg-gray-100 text-gray-600'}`}>
                                        {item.jenis_ulangan_label}
                                    </span>
                                    <h3 className="font-bold text-gray-800 text-base mt-2 line-clamp-1" title={item.mapel}>{item.mapel}</h3>
                                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1" title={item.materi}>{item.materi}</p>
                                </div>
                                <div className="text-right flex-shrink-0 ml-3">
                                    <div className="bg-purple-50 text-purple-700 font-extrabold text-2xl px-3 py-1.5 rounded-xl border border-purple-100 shadow-sm">
                                        {item.nilai !== null ? item.nilai : '-'}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-2 mt-4 pt-4 border-t border-gray-50 relative z-10 text-xs">
                                <div className="flex items-center gap-2 text-gray-600">
                                    <i className="fas fa-calendar-alt w-4 text-gray-400 text-center"></i>
                                    <span>{item.tanggal}</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600">
                                    <i className="fas fa-chalkboard-teacher w-4 text-gray-400 text-center"></i>
                                    <span className="line-clamp-1" title={item.guru}>{item.guru}</span>
                                </div>
                                {item.keterangan && (
                                    <div className="flex items-start gap-2 text-gray-600 bg-gray-50 p-2 rounded-lg mt-2">
                                        <i className="fas fa-comment-alt w-4 text-gray-400 text-center mt-0.5"></i>
                                        <span className="italic">{item.keterangan}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
