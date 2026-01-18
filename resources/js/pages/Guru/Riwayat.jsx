import React, { useState, useEffect } from 'react';
import api from '../../lib/axios';

function Riwayat() {
    const [activeTab, setActiveTab] = useState('mengajar');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedKelas, setSelectedKelas] = useState('semua');
    const [loading, setLoading] = useState(false);

    const tabs = [
        { id: 'mengajar', label: 'Mengajar' },
        { id: 'kegiatan', label: 'Kegiatan' },
        { id: 'rapat', label: 'Rapat' },
    ];

    // Mock data for mengajar - per mapel with different classes
    const mengajarHistory = [
        { id: 1, mapel: 'Matematika', kelas: 'X IPA 1', date: '18 Jan 2026', time: '07:45 - 09:15', hadir: 28, izin: 1, alpha: 1, total: 30 },
        { id: 2, mapel: 'Matematika', kelas: 'X IPA 2', date: '18 Jan 2026', time: '09:30 - 11:00', hadir: 29, izin: 0, alpha: 1, total: 30 },
        { id: 3, mapel: 'Matematika', kelas: 'XI IPA 1', date: '17 Jan 2026', time: '07:45 - 09:15', hadir: 30, izin: 0, alpha: 0, total: 30 },
        { id: 4, mapel: 'Matematika', kelas: 'XI IPA 2', date: '17 Jan 2026', time: '10:00 - 11:30', hadir: 27, izin: 2, alpha: 1, total: 30 },
        { id: 5, mapel: 'Matematika', kelas: 'X IPA 1', date: '16 Jan 2026', time: '07:45 - 09:15', hadir: 28, izin: 2, alpha: 0, total: 30 },
        { id: 6, mapel: 'Matematika', kelas: 'XII IPA 1', date: '16 Jan 2026', time: '13:00 - 14:30', hadir: 25, izin: 3, alpha: 2, total: 30 },
    ];

    // Get unique classes for filter
    const uniqueKelas = [...new Set(mengajarHistory.map(item => item.kelas))].sort();

    // Kegiatan history mock data
    const kegiatanHistory = [
        { id: 1, nama: 'Upacara Bendera', date: '18 Jan 2026', time: '07:00 - 08:00', status: 'PJ' },
        { id: 2, nama: 'Workshop Kurikulum', date: '15 Jan 2026', time: '09:00 - 12:00', status: 'Pendamping' },
        { id: 3, nama: 'Pelatihan K3S', date: '10 Jan 2026', time: '08:00 - 16:00', status: 'Peserta' },
    ];

    // Rapat history mock data
    const rapatHistory = [
        { id: 1, nama: 'Rapat Koordinasi Bulanan', date: '17 Jan 2026', time: '14:00 - 16:00', role: 'Sekretaris' },
        { id: 2, nama: 'Rapat Evaluasi Semester', date: '14 Jan 2026', time: '13:00 - 15:00', role: 'Peserta' },
        { id: 3, nama: 'Rapat Persiapan UAS', date: '10 Jan 2026', time: '10:00 - 12:00', role: 'Pimpinan' },
    ];

    // Filter mengajar by class and search
    const filteredMengajar = mengajarHistory.filter(item => {
        const matchesKelas = selectedKelas === 'semua' || item.kelas === selectedKelas;
        const matchesSearch = searchQuery.trim() === '' ||
            item.mapel.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.kelas.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesKelas && matchesSearch;
    });

    // Filter kegiatan by search
    const filteredKegiatan = kegiatanHistory.filter(item => {
        return searchQuery.trim() === '' ||
            item.nama.toLowerCase().includes(searchQuery.toLowerCase());
    });

    // Filter rapat by search
    const filteredRapat = rapatHistory.filter(item => {
        return searchQuery.trim() === '' ||
            item.nama.toLowerCase().includes(searchQuery.toLowerCase());
    });

    return (
        <div className="animate-fadeIn">
            {/* Header with Search and Tabs */}
            <div className="bg-white px-4 pt-4 pb-2 sticky top-0 z-10 border-b border-gray-100 space-y-3">
                {/* Search Bar */}
                <div className="relative">
                    <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                    <input
                        type="text"
                        placeholder="Cari kelas, guru, atau kegiatan..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    )}
                </div>

                {/* Tabs - 3 column grid like the design */}
                <div className="grid grid-cols-3 gap-1 bg-gray-100 p-1 rounded-xl">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
                                ? 'bg-green-600 text-white shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
                {/* Mengajar Tab */}
                {activeTab === 'mengajar' && (
                    <>
                        {/* Class Filter */}
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-600 whitespace-nowrap">Pilih kelas</span>
                            <select
                                value={selectedKelas}
                                onChange={(e) => setSelectedKelas(e.target.value)}
                                className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent appearance-none cursor-pointer"
                                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '20px' }}
                            >
                                <option value="semua">Semua Kelas</option>
                                {uniqueKelas.map(kelas => (
                                    <option key={kelas} value={kelas}>{kelas}</option>
                                ))}
                            </select>
                        </div>

                        {/* Mengajar Cards */}
                        {filteredMengajar.length > 0 ? (
                            <div className="space-y-3">
                                {filteredMengajar.map((item) => (
                                    <div key={item.id} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                                        {/* Card Header */}
                                        <div className="bg-gradient-to-r from-green-500 to-green-600 px-4 py-3 text-white">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h3 className="font-semibold text-sm">{item.mapel}</h3>
                                                    <p className="text-green-100 text-xs">{item.kelas}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs text-green-100">{item.date}</p>
                                                    <p className="text-xs font-medium">{item.time}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Card Body - Attendance Stats */}
                                        <div className="p-4">
                                            <div className="grid grid-cols-4 gap-2 text-center">
                                                <div className="bg-gray-50 rounded-xl py-2">
                                                    <p className="text-lg font-bold text-gray-800">{item.total}</p>
                                                    <p className="text-[10px] text-gray-500">Total</p>
                                                </div>
                                                <div className="bg-green-50 rounded-xl py-2">
                                                    <p className="text-lg font-bold text-green-600">{item.hadir}</p>
                                                    <p className="text-[10px] text-green-600">Hadir</p>
                                                </div>
                                                <div className="bg-yellow-50 rounded-xl py-2">
                                                    <p className="text-lg font-bold text-yellow-600">{item.izin}</p>
                                                    <p className="text-[10px] text-yellow-600">Izin</p>
                                                </div>
                                                <div className="bg-red-50 rounded-xl py-2">
                                                    <p className="text-lg font-bold text-red-500">{item.alpha}</p>
                                                    <p className="text-[10px] text-red-500">Alpha</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <i className="fas fa-chalkboard-teacher text-4xl text-gray-300 mb-3"></i>
                                <p className="text-gray-500">Belum ada riwayat mengajar</p>
                            </div>
                        )}
                    </>
                )}

                {/* Kegiatan Tab */}
                {activeTab === 'kegiatan' && (
                    <>
                        {filteredKegiatan.length > 0 ? (
                            <div className="space-y-3">
                                {filteredKegiatan.map((item) => (
                                    <div key={item.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
                                        <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                                            <i className="fas fa-calendar-check text-white"></i>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-800 text-sm">{item.nama}</p>
                                            <p className="text-xs text-gray-500">{item.time}</p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-xs text-gray-400">{item.date}</p>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${item.status === 'PJ' ? 'bg-green-100 text-green-700' :
                                                item.status === 'Pendamping' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-gray-100 text-gray-600'
                                                }`}>
                                                {item.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <i className="fas fa-calendar-check text-4xl text-gray-300 mb-3"></i>
                                <p className="text-gray-500">Belum ada riwayat kegiatan</p>
                            </div>
                        )}
                    </>
                )}

                {/* Rapat Tab */}
                {activeTab === 'rapat' && (
                    <>
                        {filteredRapat.length > 0 ? (
                            <div className="space-y-3">
                                {filteredRapat.map((item) => (
                                    <div key={item.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
                                        <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                                            <i className="fas fa-users text-white"></i>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-800 text-sm">{item.nama}</p>
                                            <p className="text-xs text-gray-500">{item.time}</p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-xs text-gray-400">{item.date}</p>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${item.role === 'Pimpinan' ? 'bg-green-100 text-green-700' :
                                                item.role === 'Sekretaris' ? 'bg-green-100 text-green-700' :
                                                    'bg-gray-100 text-gray-600'
                                                }`}>
                                                {item.role}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <i className="fas fa-users text-4xl text-gray-300 mb-3"></i>
                                <p className="text-gray-500">Belum ada riwayat rapat</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default Riwayat;
