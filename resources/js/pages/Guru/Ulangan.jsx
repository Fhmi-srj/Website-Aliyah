import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import api from '../../lib/axios';
import { useAuth } from '../../contexts/AuthContext';

const LABEL_ULANGAN = {
    ulangan_harian: 'Ulangan Harian',
    uts: 'UTS',
    uas: 'UAS',
    quiz: 'Quiz',
};

const COLOR_ULANGAN = {
    ulangan_harian: 'bg-purple-100 text-purple-700',
    uts: 'bg-blue-100 text-blue-700',
    uas: 'bg-red-100 text-red-700',
    quiz: 'bg-amber-100 text-amber-700',
};

function Ulangan() {
    const { user } = useAuth();
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({ jenis_ulangan: '', mapel: '', kelas: '' });
    const [selected, setSelected] = useState(null); // detail view
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailData, setDetailData] = useState(null);
    const [nilaiEdit, setNilaiEdit] = useState({});
    const [saving, setSaving] = useState(false);

    const fetchList = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            if (filter.jenis_ulangan) params.jenis_ulangan = filter.jenis_ulangan;
            if (filter.mapel) params.mapel = filter.mapel;
            if (filter.kelas) params.kelas = filter.kelas;
            const res = await api.get('/guru-panel/ulangan', { params });
            setList(res.data.data || []);
        } catch (err) {
            console.error('Error fetching ulangan list:', err);
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => { fetchList(); }, [fetchList]);

    const openDetail = async (id) => {
        setSelected(id);
        setDetailLoading(true);
        try {
            const res = await api.get(`/guru-panel/ulangan/${id}`);
            setDetailData(res.data.data);
            // Pre-populate nilaiEdit with existing values
            const edit = {};
            (res.data.data.siswa || []).forEach(s => {
                if (s.nilai !== null && s.nilai !== undefined) {
                    edit[s.siswa_id] = { nilai: s.nilai, keterangan: s.keterangan || '' };
                }
            });
            setNilaiEdit(edit);
        } catch (err) {
            console.error('Error fetching detail:', err);
            alert('Gagal memuat detail ulangan');
            setSelected(null);
        } finally {
            setDetailLoading(false);
        }
    };

    const closeDetail = () => {
        setSelected(null);
        setDetailData(null);
        setNilaiEdit({});
    };

    const handleSaveNilai = async () => {
        if (!detailData) return;
        setSaving(true);
        try {
            const nilaiArr = Object.entries(nilaiEdit)
                .filter(([_, v]) => v.nilai !== '' && v.nilai !== undefined && v.nilai !== null)
                .map(([siswa_id, v]) => ({
                    siswa_id: parseInt(siswa_id),
                    nilai: parseFloat(v.nilai),
                    keterangan: v.keterangan || null,
                }));

            await api.post(`/guru-panel/ulangan/${detailData.id}/nilai`, { nilai_siswa: nilaiArr });
            alert('Nilai berhasil disimpan!');
            // Refresh detail
            openDetail(detailData.id);
            fetchList();
        } catch (err) {
            console.error('Error saving nilai:', err);
            alert(err.response?.data?.error || 'Gagal menyimpan nilai');
        } finally {
            setSaving(false);
        }
    };

    const handleExport = async (id) => {
        try {
            const res = await api.get(`/guru-panel/ulangan/${id}/export`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = `nilai_ulangan_${id}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Error exporting:', err);
            alert('Gagal mengunduh file');
        }
    };

    // Get unique mapel and kelas from list for filter
    const uniqueMapel = [...new Set(list.map(i => i.mapel))].sort();
    const uniqueKelas = [...new Set(list.map(i => i.kelas))].sort();

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-5 rounded-b-3xl shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                        <i className="fas fa-file-signature text-lg"></i>
                    </div>
                    <div>
                        <h1 className="text-lg font-bold">Ulangan</h1>
                        <p className="text-purple-200 text-xs">Kelola nilai ulangan & ujian</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex gap-2 flex-wrap">
                    <select
                        value={filter.jenis_ulangan}
                        onChange={e => setFilter(f => ({ ...f, jenis_ulangan: e.target.value }))}
                        className="bg-white/20 text-white border-0 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-white/50"
                    >
                        <option value="" className="text-gray-800">Semua Jenis</option>
                        <option value="ulangan_harian" className="text-gray-800">Ulangan Harian</option>
                        <option value="uts" className="text-gray-800">UTS</option>
                        <option value="uas" className="text-gray-800">UAS</option>
                        <option value="quiz" className="text-gray-800">Quiz</option>
                    </select>
                    {uniqueMapel.length > 0 && (
                        <select
                            value={filter.mapel}
                            onChange={e => setFilter(f => ({ ...f, mapel: e.target.value }))}
                            className="bg-white/20 text-white border-0 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-white/50"
                        >
                            <option value="" className="text-gray-800">Semua Mapel</option>
                            {uniqueMapel.map(m => <option key={m} value={m} className="text-gray-800">{m}</option>)}
                        </select>
                    )}
                    {uniqueKelas.length > 0 && (
                        <select
                            value={filter.kelas}
                            onChange={e => setFilter(f => ({ ...f, kelas: e.target.value }))}
                            className="bg-white/20 text-white border-0 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-white/50"
                        >
                            <option value="" className="text-gray-800">Semua Kelas</option>
                            {uniqueKelas.map(k => <option key={k} value={k} className="text-gray-800">{k}</option>)}
                        </select>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <i className="fas fa-spinner fa-spin text-purple-500 text-2xl mb-3"></i>
                        <p className="text-gray-500 text-sm">Memuat data ulangan...</p>
                    </div>
                ) : list.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                            <i className="fas fa-file-signature text-purple-400 text-2xl"></i>
                        </div>
                        <p className="text-gray-600 font-medium mb-1">Belum Ada Ulangan</p>
                        <p className="text-gray-400 text-xs">Ulangan akan muncul setelah Anda membuat absensi dengan mode Ulangan</p>
                    </div>
                ) : list.map(item => (
                    <div
                        key={item.id}
                        className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => openDetail(item.id)}
                    >
                        <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${COLOR_ULANGAN[item.jenis_ulangan] || 'bg-gray-100 text-gray-600'}`}>
                                        {item.jenis_ulangan_label}
                                    </span>
                                    {item.status_lengkap ? (
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">
                                            <i className="fas fa-check mr-0.5"></i>Lengkap
                                        </span>
                                    ) : (
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-semibold">
                                            <i className="fas fa-exclamation-triangle mr-0.5"></i>Belum Lengkap
                                        </span>
                                    )}
                                </div>
                                <h3 className="font-bold text-gray-800 text-sm truncate">{item.mapel}</h3>
                                <p className="text-xs text-gray-500">{item.kelas} • {item.jam}</p>
                            </div>
                            <i className="fas fa-chevron-right text-gray-300 text-sm mt-2"></i>
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                <i className="fas fa-calendar text-gray-400"></i>
                                {item.tanggal}
                            </div>
                            <div className="flex items-center gap-3 text-xs">
                                <span className="text-purple-600 font-medium">
                                    <i className="fas fa-pen mr-1"></i>{item.nilai_terisi}/{item.total_siswa}
                                </span>
                                {item.rata_rata !== null && (
                                    <span className="text-green-600 font-medium">
                                        <i className="fas fa-chart-bar mr-1"></i>Rata-rata: {item.rata_rata}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Detail Modal */}
            {selected && ReactDOM.createPortal(
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                    style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                    onClick={closeDetail}
                >
                    <div
                        className="bg-white rounded-2xl w-full max-w-md flex flex-col shadow-2xl overflow-hidden"
                        style={{ maxHeight: '90vh' }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 flex-shrink-0">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="font-bold">Detail Ulangan</h2>
                                    {detailData && (
                                        <p className="text-purple-200 text-xs">{detailData.mapel} • {detailData.kelas}</p>
                                    )}
                                </div>
                                <button onClick={closeDetail} className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-lg transition-colors">
                                    <i className="fas fa-times text-xl"></i>
                                </button>
                            </div>
                            {detailData && (
                                <div className="flex gap-4 mt-3 text-center">
                                    <div className="flex-1">
                                        <p className="text-xl font-bold">{detailData.siswa_hadir}</p>
                                        <p className="text-purple-200 text-[10px]">Hadir</p>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xl font-bold">{detailData.siswa_sakit}</p>
                                        <p className="text-purple-200 text-[10px]">Sakit</p>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xl font-bold">{detailData.siswa_izin}</p>
                                        <p className="text-purple-200 text-[10px]">Izin</p>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xl font-bold">{detailData.siswa_alpha}</p>
                                        <p className="text-purple-200 text-[10px]">Alpha</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {detailLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <i className="fas fa-spinner fa-spin text-purple-500 text-xl mr-2"></i>
                                    <span className="text-gray-500 text-sm">Memuat data...</span>
                                </div>
                            ) : detailData ? (
                                <>
                                    {/* Info */}
                                    <div className="bg-purple-50 rounded-xl p-3 text-sm space-y-1">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Tanggal</span>
                                            <span className="font-medium text-gray-800">{detailData.tanggal}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Jenis</span>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${COLOR_ULANGAN[detailData.jenis_ulangan] || ''}`}>
                                                {detailData.jenis_ulangan_label}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Jam</span>
                                            <span className="font-medium text-gray-800">{detailData.jam}</span>
                                        </div>
                                    </div>

                                    {/* Siswa & Nilai List */}
                                    <div>
                                        <h3 className="font-semibold text-gray-800 text-sm mb-2 flex items-center gap-2">
                                            <i className="fas fa-users text-purple-500"></i>
                                            Daftar Nilai Siswa
                                        </h3>
                                        <div className="space-y-2">
                                            {(detailData.siswa || []).map((s, idx) => (
                                                <div key={s.siswa_id} className="bg-white border border-gray-100 rounded-xl p-3">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-semibold text-gray-800 text-xs truncate">{idx + 1}. {s.nama}</p>
                                                            <p className="text-[10px] text-gray-400">{s.nis}</p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {s.sudah_diisi && (
                                                                <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-lg">
                                                                    {s.nilai}
                                                                </span>
                                                            )}
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max="100"
                                                                value={nilaiEdit[s.siswa_id]?.nilai ?? (s.nilai ?? '')}
                                                                onChange={e => setNilaiEdit(prev => ({
                                                                    ...prev,
                                                                    [s.siswa_id]: { ...(prev[s.siswa_id] || {}), nilai: e.target.value }
                                                                }))}
                                                                placeholder="Nilai"
                                                                className="w-16 border border-purple-200 bg-purple-50 rounded-lg px-2 py-1 text-sm text-center focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            ) : null}
                        </div>

                        {/* Modal Footer */}
                        <div className="flex-shrink-0 p-4 border-t border-gray-100 flex gap-2 bg-white">
                            <button
                                onClick={() => handleExport(detailData?.id)}
                                className="py-2.5 px-4 border border-purple-300 text-purple-600 rounded-xl text-sm font-medium hover:bg-purple-50 flex items-center gap-1.5"
                            >
                                <i className="fas fa-download"></i>
                                Export
                            </button>
                            <button
                                onClick={handleSaveNilai}
                                disabled={saving}
                                className="flex-1 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                            >
                                {saving ? (
                                    <i className="fas fa-spinner fa-spin"></i>
                                ) : (
                                    <>
                                        <i className="fas fa-save"></i>
                                        Simpan Nilai
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

export default Ulangan;
