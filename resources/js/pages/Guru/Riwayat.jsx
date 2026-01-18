import React, { useState } from 'react';

function Riwayat() {
    const [activeTab, setActiveTab] = useState('mengajar');
    const [searchQuery, setSearchQuery] = useState('');

    const tabs = [
        { id: 'mengajar', label: 'Mengajar' },
        { id: 'kegiatan', label: 'Kegiatan' },
        { id: 'rapat', label: 'Rapat' },
    ];

    const history = [
        { type: 'mengajar', title: 'Absensi Mengajar', desc: 'Matematika - X IPA 1', time: '07:45', date: 'Hari ini', icon: 'fas fa-chalkboard-teacher', color: 'bg-green-500' },
        { type: 'mengajar', title: 'Absensi Mengajar', desc: 'Matematika - X IPA 2', time: '09:15', date: 'Hari ini', icon: 'fas fa-chalkboard-teacher', color: 'bg-green-500' },
        { type: 'rapat', title: 'Absensi Rapat', desc: 'Rapat Koordinasi Bulanan', time: '14:00', date: 'Kemarin', icon: 'fas fa-users', color: 'bg-green-600' },
        { type: 'kegiatan', title: 'Absensi Kegiatan', desc: 'Upacara Bendera', time: '07:00', date: '14 Jan 2026', icon: 'fas fa-calendar-check', color: 'bg-green-500' },
        { type: 'mengajar', title: 'Absensi Mengajar', desc: 'Matematika - XI IPA 1', time: '10:45', date: '14 Jan 2026', icon: 'fas fa-chalkboard-teacher', color: 'bg-green-500' },
    ];

    const filteredHistory = history.filter(h => {
        const matchesTab = h.type === activeTab;
        const matchesSearch = searchQuery.trim() === '' ||
            h.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            h.desc.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesTab && matchesSearch;
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

            {/* History List */}
            <div className="p-4 space-y-3">
                {filteredHistory.map((item, idx) => (
                    <div key={idx} className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
                        <div className={`w-12 h-12 ${item.color} rounded-full flex items-center justify-center flex-shrink-0`}>
                            <i className={`${item.icon} text-white`}></i>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-800 text-sm">{item.title}</p>
                            <p className="text-xs text-gray-500 truncate">{item.desc}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                            <p className="text-xs text-gray-400">{item.date}</p>
                            <p className="text-xs text-gray-500">{item.time}</p>
                        </div>
                    </div>
                ))}

                {filteredHistory.length === 0 && (
                    <div className="text-center py-12">
                        <i className="fas fa-clock text-4xl text-gray-300 mb-3"></i>
                        <p className="text-gray-500">Belum ada riwayat</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Riwayat;
