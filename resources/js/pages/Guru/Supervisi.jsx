import React, { useState, useEffect } from "react";
import api from "../../lib/axios";
import { API_BASE } from "../../config/api";

function Supervisi() {
    const [supervisiData, setSupervisiData] = useState({ jadwal: [], hasil: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSupervisi = async () => {
            try {
                setLoading(true);
                const response = await api.get('/guru-panel/supervisi');
                setSupervisiData({
                    jadwal: response.data.jadwal || [],
                    hasil: response.data.hasil || [],
                });
            } catch (err) {
                console.error('Error fetching supervisi:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchSupervisi();
    }, []);

    // Helper: format date
    const formatTanggal = (dateStr) => {
        if (!dateStr) return '-';
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
        } catch (e) { return dateStr; }
    };

    // Helper: calculate supervisi scores
    const calcSupervisiScores = (hasil_supervisi) => {
        if (!hasil_supervisi) return { rataA: 0, rataB: 0, rataTotal: 0, predikat: '-' };
        const a = hasil_supervisi.bagian_a || {};
        const b = hasil_supervisi.bagian_b || {};
        const valsA = Object.values(a).map(Number).filter(v => v > 0);
        const valsB = Object.values(b).map(Number).filter(v => v > 0);
        const rataA = valsA.length > 0 ? valsA.reduce((s, v) => s + v, 0) / valsA.length : 0;
        const rataB = valsB.length > 0 ? valsB.reduce((s, v) => s + v, 0) / valsB.length : 0;
        const all = [...valsA, ...valsB];
        const rataTotal = all.length > 0 ? all.reduce((s, v) => s + v, 0) / all.length : 0;
        let predikat = 'Kurang';
        if (rataTotal >= 3.5) predikat = 'Sangat Baik';
        else if (rataTotal >= 2.5) predikat = 'Baik';
        else if (rataTotal >= 1.5) predikat = 'Cukup';
        return { rataA: rataA.toFixed(2), rataB: rataB.toFixed(2), rataTotal: rataTotal.toFixed(2), predikat };
    };

    // Helper: open print supervisi PDF
    const handlePrintSupervisi = (item) => {
        const token = localStorage.getItem('auth_token');
        const url = `${API_BASE}/supervisi/${item.id}/print-supervisi?token=${token}`;
        window.open(url, '_blank');
    };

    const totalJadwal = supervisiData.jadwal.length;
    const totalHasil = supervisiData.hasil.length;

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            {/* Header */}
            <div className="bg-gradient-to-br from-green-600 to-green-700 px-4 pt-4 pb-8 text-white">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                        <i className="fas fa-clipboard-check text-lg"></i>
                    </div>
                    <div>
                        <h1 className="font-bold text-lg">Supervisi</h1>
                        <p className="text-green-200 text-xs">Jadwal & Hasil Supervisi Anda</p>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="bg-white/15 rounded-xl px-4 py-3 backdrop-blur-sm">
                        <p className="text-2xl font-bold">{totalJadwal}</p>
                        <p className="text-green-200 text-xs">Dijadwalkan</p>
                    </div>
                    <div className="bg-white/15 rounded-xl px-4 py-3 backdrop-blur-sm">
                        <p className="text-2xl font-bold">{totalHasil}</p>
                        <p className="text-green-200 text-xs">Selesai</p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="px-4 -mt-4 space-y-4">
                {loading ? (
                    <div className="bg-white rounded-2xl p-8 shadow-sm flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                    </div>
                ) : totalJadwal === 0 && totalHasil === 0 ? (
                    <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
                        <i className="fas fa-clipboard-check text-gray-300 text-4xl mb-3"></i>
                        <p className="text-gray-500 text-sm">Belum ada jadwal supervisi</p>
                        <p className="text-gray-400 text-xs mt-1">Data supervisi akan muncul setelah admin menjadwalkan</p>
                    </div>
                ) : (
                    <>
                        {/* Jadwal Supervisi (Pending) */}
                        {totalJadwal > 0 && (
                            <div className="bg-white rounded-2xl p-4 shadow-sm">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <i className="fas fa-clock text-yellow-500 text-xs"></i>
                                    Jadwal Pelaksanaan
                                    <span className="ml-auto text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                                        {totalJadwal}
                                    </span>
                                </h3>
                                <div className="space-y-3">
                                    {supervisiData.jadwal.map((item) => (
                                        <div
                                            key={item.id}
                                            className="bg-yellow-50/50 rounded-xl px-4 py-3 border border-yellow-100"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center flex-shrink-0">
                                                    <i className="fas fa-calendar-day text-yellow-600"></i>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-gray-800 text-sm font-medium truncate">
                                                        {item.mapel?.nama_mapel || 'Supervisi'}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                                            <i className="far fa-calendar-alt text-[8px]"></i>
                                                            {formatTanggal(item.tanggal)}
                                                        </span>
                                                        <span className="text-[10px] text-gray-400 flex items-center gap-1 truncate">
                                                            <i className="fas fa-user-tie text-[8px]"></i>
                                                            {item.supervisor?.nama || '-'}
                                                        </span>
                                                    </div>
                                                    {item.kelas && (
                                                        <span className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                                                            <i className="fas fa-door-open text-[8px]"></i>
                                                            {item.kelas?.nama_kelas || '-'}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-[9px] px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 font-semibold flex-shrink-0">
                                                    Dijadwalkan
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Hasil Supervisi (Completed) */}
                        {totalHasil > 0 && (
                            <div className="bg-white rounded-2xl p-4 shadow-sm">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <i className="fas fa-check-circle text-green-500 text-xs"></i>
                                    Hasil Supervisi
                                    <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                                        {totalHasil}
                                    </span>
                                </h3>
                                <div className="space-y-3">
                                    {supervisiData.hasil.map((item) => {
                                        const scores = calcSupervisiScores(item.hasil_supervisi);
                                        const predikatColor = scores.predikat === 'Sangat Baik' ? 'bg-emerald-100 text-emerald-700'
                                            : scores.predikat === 'Baik' ? 'bg-blue-100 text-blue-700'
                                                : scores.predikat === 'Cukup' ? 'bg-yellow-100 text-yellow-700'
                                                    : 'bg-red-100 text-red-700';
                                        return (
                                            <div
                                                key={item.id}
                                                className="bg-green-50/30 rounded-xl px-4 py-3 border border-green-100"
                                            >
                                                {/* Header row */}
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                                                        <i className="fas fa-clipboard-check text-green-600"></i>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-gray-800 text-sm font-medium truncate">
                                                            {item.mapel?.nama_mapel || 'Supervisi'}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                            <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                                                <i className="far fa-calendar-alt text-[8px]"></i>
                                                                {formatTanggal(item.tanggal)}
                                                            </span>
                                                            <span className="text-[10px] text-gray-400 flex items-center gap-1 truncate">
                                                                <i className="fas fa-user-tie text-[8px]"></i>
                                                                {item.supervisor?.nama || '-'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <span className={`text-[9px] px-2 py-1 rounded-full font-semibold flex-shrink-0 ${predikatColor}`}>
                                                        {scores.predikat}
                                                    </span>
                                                </div>

                                                {/* Score bars */}
                                                <div className="space-y-2 mb-3">
                                                    <div>
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="text-[10px] text-gray-500 font-medium">Perencanaan (A)</span>
                                                            <span className="text-[10px] font-bold text-gray-700">{scores.rataA}/4</span>
                                                        </div>
                                                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                                                            <div
                                                                className="bg-gradient-to-r from-green-400 to-green-500 h-1.5 rounded-full transition-all"
                                                                style={{ width: `${(scores.rataA / 4) * 100}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="text-[10px] text-gray-500 font-medium">Pelaksanaan (B)</span>
                                                            <span className="text-[10px] font-bold text-gray-700">{scores.rataB}/4</span>
                                                        </div>
                                                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                                                            <div
                                                                className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-1.5 rounded-full transition-all"
                                                                style={{ width: `${(scores.rataB / 4) * 100}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Footer: average + download */}
                                                <div className="flex items-center justify-between pt-2 border-t border-green-100/50">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] text-gray-400">Rata-rata:</span>
                                                        <span className="text-sm font-bold text-green-600">{scores.rataTotal}</span>
                                                        <span className="text-[10px] text-gray-400">/4</span>
                                                    </div>
                                                    <button
                                                        onClick={() => handlePrintSupervisi(item)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg text-[10px] font-semibold hover:shadow-md transition-all hover:scale-[1.02] active:scale-95"
                                                    >
                                                        <i className="fas fa-file-pdf"></i>
                                                        Download PDF
                                                    </button>
                                                </div>

                                                {/* Catatan if available */}
                                                {item.catatan && (
                                                    <div className="mt-2 pt-2 border-t border-green-100/50">
                                                        <p className="text-[10px] text-gray-400 mb-0.5">Catatan:</p>
                                                        <p className="text-xs text-gray-600">{item.catatan}</p>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default Supervisi;
