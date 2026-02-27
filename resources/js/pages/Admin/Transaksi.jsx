import React, { useState, useEffect } from 'react';
import { API_BASE, authFetch } from '../../config/api';
import Swal from 'sweetalert2';
import TabInputTagihan from './transaksi/TabInputTagihan';
import TabBayarTagihan from './transaksi/TabBayarTagihan';

import TabPemasukan from './transaksi/TabPemasukan';
import TabPengeluaran from './transaksi/TabPengeluaran';

function Transaksi() {
    const [activeTab, setActiveTab] = useState('pengeluaran');
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const h = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', h);
        return () => window.removeEventListener('resize', h);
    }, []);

    const tabs = [
        { id: 'pengeluaran', label: 'Pengeluaran', icon: 'fa-arrow-up' },
        { id: 'pemasukan', label: 'Pemasukan', icon: 'fa-arrow-down' },
        { id: 'bayar', label: 'Bayar Tagihan', mobileLabel: 'Bayar', icon: 'fa-hand-holding-usd' },
        { id: 'input', label: 'Input Tagihan', icon: 'fa-file-invoice-dollar' },
    ];

    return (
        <div className="animate-fadeIn flex flex-col flex-grow max-w-full overflow-auto">
            <header className={`${isMobile ? 'mb-3 mobile-sticky-header pt-2 pb-2 px-1' : 'mb-6'}`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="page-header-icon w-12 h-12 bg-gradient-to-br from-primary to-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                            <i className="fas fa-money-bill-wave text-white text-xl"></i>
                        </div>
                        <div>
                            <h1 className="page-header-title text-xl font-black text-gray-800 uppercase tracking-tight">Transaksi Keuangan</h1>
                            <p className="page-header-subtitle text-xs text-gray-400 mt-0.5 font-medium uppercase tracking-widest">Kelola tagihan, pemasukan & pengeluaran</p>
                        </div>
                    </div>
                </div>
            </header>

            <div className={`${isMobile ? 'mb-3' : 'mb-6'}`}>
                <div className={`flex bg-gray-50/50 rounded-2xl border border-gray-100 ${isMobile ? 'gap-0 p-1 overflow-x-auto scrollbar-hide' : 'gap-1 p-1.5 flex-wrap'}`}>
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center justify-center gap-1 rounded-xl font-black uppercase tracking-widest transition-all whitespace-nowrap ${isMobile ? 'flex-1 px-2 py-1.5 text-[8px]' : 'gap-2 px-4 py-2.5 text-[10px]'} ${activeTab === tab.id
                                ? 'bg-white text-primary shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600 hover:bg-white/50'}`}>
                            <i className={`fas ${tab.icon} ${isMobile ? 'text-[9px]' : ''}`}></i>
                            {isMobile ? (tab.mobileLabel || tab.label.split(' ').pop()) : tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {activeTab === 'input' && <TabInputTagihan isMobile={isMobile} />}
            {activeTab === 'bayar' && <TabBayarTagihan isMobile={isMobile} />}

            {activeTab === 'pemasukan' && <TabPemasukan isMobile={isMobile} />}
            {activeTab === 'pengeluaran' && <TabPengeluaran isMobile={isMobile} />}
        </div>
    );
}

export default Transaksi;
