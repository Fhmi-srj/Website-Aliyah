import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/axios';

function JurnalKelas() {
    const navigate = useNavigate();

    // States
    const [loading, setLoading] = useState(true);
    const [kelasList, setKelasList] = useState([]);
    const [selectedKelas, setSelectedKelas] = useState('');
    const [selectedMonth, setSelectedMonth] = useState('');
    const [jurnalData, setJurnalData] = useState([]);
    const [loadingJurnal, setLoadingJurnal] = useState(false);

    // Month options
    const monthOptions = [
        { value: '', label: 'Pilih Bulan' },
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

    // Fetch kelas list on mount
    useEffect(() => {
        const fetchKelasList = async () => {
            try {
                const response = await api.get('/guru-panel/jurnal-kelas/list');
                if (response.data.success) {
                    setKelasList(response.data.data || []);
                }
            } catch (error) {
                console.error('Error fetching kelas list:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchKelasList();
    }, []);

    // Fetch jurnal when kelas or month changes
    useEffect(() => {
        if (selectedKelas) {
            fetchJurnalData();
        }
    }, [selectedKelas, selectedMonth]);

    const fetchJurnalData = async () => {
        if (!selectedKelas) return;

        setLoadingJurnal(true);
        try {
            const params = new URLSearchParams();
            if (selectedMonth) {
                const year = new Date().getFullYear();
                params.append('bulan', `${year}-${selectedMonth}`);
            }

            // For preview, just set empty - actual data will be in print view
            // We could add an API endpoint for preview data if needed
            setJurnalData([]);
        } catch (error) {
            console.error('Error fetching jurnal data:', error);
        } finally {
            setLoadingJurnal(false);
        }
    };

    const handlePrintJurnalKelas = () => {
        if (!selectedKelas) return;

        const token = localStorage.getItem('auth_token');
        let url = `/print/jurnal-kelas/${selectedKelas}?token=${token}`;

        if (selectedMonth) {
            const year = new Date().getFullYear();
            url += `&bulan=${year}-${selectedMonth}`;
        }

        window.open(url, '_blank');
    };

    if (loading) {
        return (
            <div className="animate-fadeIn">
                <div className="bg-white px-4 py-4 border-b border-gray-100">
                    <div className="h-6 bg-gray-200 rounded w-1/3 animate-pulse"></div>
                </div>
                <div className="p-4 space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-16 bg-gray-200 rounded-xl animate-pulse"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fadeIn">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-green-600 px-4 py-6 text-white">
                <div className="flex items-center gap-3 mb-2">
                    <button
                        onClick={() => navigate('/guru')}
                        className="w-8 h-8 flex items-center justify-center bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                    >
                        <i className="fas fa-arrow-left"></i>
                    </button>
                    <h1 className="text-xl font-bold">Jurnal Kelas</h1>
                </div>
                <p className="text-white/80 text-sm ml-11">Rekap pembelajaran per kelas</p>
            </div>

            {/* Filter Section */}
            <div className="p-4 bg-white border-b border-gray-100">
                <div className="space-y-3">
                    {/* Kelas Selector */}
                    <div>
                        <label className="text-xs text-gray-500 font-medium mb-1 block">Pilih Kelas</label>
                        <select
                            value={selectedKelas}
                            onChange={(e) => setSelectedKelas(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                        >
                            <option value="">-- Pilih Kelas --</option>
                            {kelasList.map((kelas) => (
                                <option key={kelas.id} value={kelas.id}>
                                    {kelas.nama_kelas}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Month Selector */}
                    <div>
                        <label className="text-xs text-gray-500 font-medium mb-1 block">Filter Bulan (Opsional)</label>
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                        >
                            {monthOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Print Button */}
                    {selectedKelas && (
                        <button
                            onClick={handlePrintJurnalKelas}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-colors"
                        >
                            <i className="fas fa-print"></i>
                            Cetak Jurnal Kelas
                        </button>
                    )}
                </div>
            </div>

            {/* Info Section */}
            <div className="p-4">
                {!selectedKelas ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i className="fas fa-book-open text-blue-500 text-2xl"></i>
                        </div>
                        <h3 className="font-semibold text-blue-800 mb-2">Pilih Kelas</h3>
                        <p className="text-blue-600 text-sm">
                            Silakan pilih kelas untuk melihat dan mencetak jurnal pembelajaran.
                        </p>
                    </div>
                ) : (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i className="fas fa-check-circle text-green-500 text-2xl"></i>
                        </div>
                        <h3 className="font-semibold text-green-800 mb-2">Siap Mencetak</h3>
                        <p className="text-green-600 text-sm mb-4">
                            Klik tombol "Cetak Jurnal Kelas" di atas untuk membuka halaman cetak.
                        </p>
                        <div className="text-xs text-green-500">
                            <i className="fas fa-info-circle mr-1"></i>
                            Halaman cetak akan menampilkan semua riwayat pembelajaran di kelas yang dipilih
                        </div>
                    </div>
                )}

                {/* Quick Info Cards */}
                <div className="mt-6 space-y-3">
                    <h4 className="text-sm font-medium text-gray-700">Informasi Jurnal Kelas:</h4>
                    <div className="grid grid-cols-1 gap-3">
                        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-green-500">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                    <i className="fas fa-chalkboard-teacher text-green-600"></i>
                                </div>
                                <div>
                                    <p className="font-medium text-gray-800">Rekap Pembelajaran</p>
                                    <p className="text-xs text-gray-500">Semua mapel yang diajar di kelas</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-blue-500">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                    <i className="fas fa-users text-blue-600"></i>
                                </div>
                                <div>
                                    <p className="font-medium text-gray-800">Multi Guru</p>
                                    <p className="text-xs text-gray-500">Mencakup semua guru yang mengajar</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-purple-500">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                    <i className="fas fa-calendar-alt text-purple-600"></i>
                                </div>
                                <div>
                                    <p className="font-medium text-gray-800">Filter Periode</p>
                                    <p className="text-xs text-gray-500">Dapat difilter per bulan</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default JurnalKelas;
