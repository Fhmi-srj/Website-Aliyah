import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/axios';

const BULAN_LIST = [
    { value: 1, label: 'Januari' },
    { value: 2, label: 'Februari' },
    { value: 3, label: 'Maret' },
    { value: 4, label: 'April' },
    { value: 5, label: 'Mei' },
    { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' },
    { value: 8, label: 'Agustus' },
    { value: 9, label: 'September' },
    { value: 10, label: 'Oktober' },
    { value: 11, label: 'November' },
    { value: 12, label: 'Desember' },
];

function AbsenKelas() {
    const navigate = useNavigate();
    const { token } = useAuth();

    const [loading, setLoading] = useState(true);
    const [waliKelasInfo, setWaliKelasInfo] = useState(null);
    const [selectedBulan, setSelectedBulan] = useState(new Date().getMonth() + 1);
    const [selectedTahun, setSelectedTahun] = useState(new Date().getFullYear());
    const [notWaliKelas, setNotWaliKelas] = useState(false);

    const currentYear = new Date().getFullYear();
    const tahunOptions = [currentYear - 1, currentYear, currentYear + 1];

    // Fetch wali kelas info
    useEffect(() => {
        const fetchWaliKelasInfo = async () => {
            try {
                setLoading(true);
                const response = await api.get('/guru-panel/wali-kelas-info');
                if (response.data.success && response.data.data) {
                    setWaliKelasInfo(response.data.data);
                } else {
                    setNotWaliKelas(true);
                }
            } catch (error) {
                console.error('Error fetching wali kelas info:', error);
                setNotWaliKelas(true);
            } finally {
                setLoading(false);
            }
        };
        fetchWaliKelasInfo();
    }, []);

    const handleCetak = () => {
        if (!waliKelasInfo?.kelas_id) return;
        const printUrl = `/print/daftar-hadir-kelas/${waliKelasInfo.kelas_id}?bulan=${selectedBulan}&tahun=${selectedTahun}&token=${token}`;
        window.open(printUrl, '_blank');
    };

    if (loading) {
        return (
            <div className="p-4">
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                    <span className="ml-3 text-gray-600 text-sm">Memuat data...</span>
                </div>
            </div>
        );
    }

    if (notWaliKelas) {
        return (
            <div className="p-4">
                {/* Back button */}
                <button
                    onClick={() => navigate('/guru')}
                    className="flex items-center gap-2 text-green-600 mb-4 text-sm"
                >
                    <i className="fas fa-arrow-left"></i>
                    Kembali
                </button>

                <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 text-center">
                    <i className="fas fa-exclamation-triangle text-yellow-500 text-3xl mb-3"></i>
                    <h3 className="font-semibold text-yellow-800 mb-2">Bukan Wali Kelas</h3>
                    <p className="text-yellow-600 text-sm">
                        Anda belum ditugaskan sebagai wali kelas. Fitur ini hanya tersedia untuk guru yang bertugas sebagai wali kelas.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4">
            {/* Back button */}
            <button
                onClick={() => navigate('/guru')}
                className="flex items-center gap-2 text-green-600 mb-4 text-sm"
            >
                <i className="fas fa-arrow-left"></i>
                Kembali
            </button>

            {/* Page Header */}
            <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-2xl p-4 text-white mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                        <i className="fas fa-clipboard-list text-xl"></i>
                    </div>
                    <div>
                        <h2 className="font-bold text-base">Absen Kelas</h2>
                        <p className="text-green-100 text-xs">Cetak Daftar Hadir Peserta Didik</p>
                    </div>
                </div>
            </div>

            {/* Kelas Info Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <i className="fas fa-door-open text-green-600"></i>
                    </div>
                    <div>
                        <p className="font-semibold text-gray-800 text-sm">{waliKelasInfo.nama_kelas}</p>
                        <p className="text-xs text-gray-500">
                            Wali Kelas · {waliKelasInfo.jumlah_siswa || 0} siswa
                        </p>
                    </div>
                </div>
            </div>

            {/* Period Selectors */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
                <h3 className="font-semibold text-gray-800 text-sm mb-3 flex items-center gap-2">
                    <i className="fas fa-calendar text-green-500"></i>
                    Pilih Periode
                </h3>

                <div className="space-y-3">
                    {/* Bulan */}
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Bulan</label>
                        <select
                            value={selectedBulan}
                            onChange={(e) => setSelectedBulan(Number(e.target.value))}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:ring-2 focus:ring-green-400 focus:border-green-400 focus:outline-none"
                        >
                            {BULAN_LIST.map(b => (
                                <option key={b.value} value={b.value}>{b.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Tahun */}
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Tahun</label>
                        <select
                            value={selectedTahun}
                            onChange={(e) => setSelectedTahun(Number(e.target.value))}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:ring-2 focus:ring-green-400 focus:border-green-400 focus:outline-none"
                        >
                            {tahunOptions.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Info */}
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3 mb-4">
                <div className="flex items-start gap-2 text-blue-600 text-xs">
                    <i className="fas fa-info-circle mt-0.5"></i>
                    <span>
                        Daftar hadir akan dicetak untuk <strong>{BULAN_LIST.find(b => b.value === selectedBulan)?.label} {selectedTahun}</strong>.
                        Dokumen berformat A4 landscape dengan tanda tangan Kepala Madrasah dan Wali Kelas.
                    </span>
                </div>
            </div>

            {/* Print Button */}
            <button
                onClick={handleCetak}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-2xl font-semibold text-sm shadow-lg hover:shadow-xl transition-all active:scale-[0.98]"
            >
                <i className="fas fa-print"></i>
                Cetak Daftar Hadir
            </button>
        </div>
    );
}

export default AbsenKelas;
