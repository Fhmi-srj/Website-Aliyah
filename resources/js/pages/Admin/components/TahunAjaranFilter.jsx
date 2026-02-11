import React, { useState, useRef, useEffect } from 'react';
import { API_BASE, authFetch } from '../../../config/api';

function TahunAjaranFilter({ value, onChange }) {
    const [tahunAjaranList, setTahunAjaranList] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const dropdownRef = useRef(null);

    // Fetch tahun ajaran list on mount
    useEffect(() => {
        fetchTahunAjaran();
    }, []);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchTahunAjaran = async () => {
        try {
            const response = await authFetch(`${API_BASE}/tahun-ajaran`);
            if (response.ok) {
                const data = await response.json();
                setTahunAjaranList(data.data || []);
                // No auto-selection - start with 'Semua Tahun Ajaran' which is empty value
            }
        } catch (error) {
            console.error('Error fetching tahun ajaran:', error);
        } finally {
            setLoading(false);
        }
    };

    const selectedTahunAjaran = tahunAjaranList.find(ta => ta.id === value);

    const handleSelect = (id) => {
        onChange(id);
        setIsOpen(false);
    };

    if (loading) {
        return (
            <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-500">
                <i className="fas fa-spinner fa-spin"></i>
                <span>Loading...</span>
            </div>
        );
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
                <i className="fas fa-calendar-alt text-green-600"></i>
                <span className="font-medium text-gray-700">
                    {selectedTahunAjaran?.nama || 'Pilih Tahun Ajaran'}
                </span>
                <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'} text-xs text-gray-400`}></i>
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-100 overflow-hidden z-50">
                    <div className="py-1">
                        <button
                            onClick={() => handleSelect('')}
                            className={`w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 transition-colors text-left ${!value ? 'bg-green-50 text-green-700' : 'text-gray-700'}`}
                        >
                            <i className={`fas ${!value ? 'fa-check-circle text-green-500' : 'fa-circle text-gray-300'} text-xs`}></i>
                            <span className={!value ? 'font-medium' : ''}>Semua Tahun Ajaran</span>
                        </button>
                        {tahunAjaranList.map((ta) => (
                            <button
                                key={ta.id}
                                onClick={() => handleSelect(ta.id)}
                                className={`w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 transition-colors text-left ${value === ta.id ? 'bg-green-50 text-green-700' : 'text-gray-700'
                                    }`}
                            >
                                <i className={`fas ${value === ta.id ? 'fa-check-circle text-green-500' : 'fa-circle text-gray-300'} text-xs`}></i>
                                <span className={value === ta.id ? 'font-medium' : ''}>{ta.nama}</span>
                            </button>
                        ))}
                        {tahunAjaranList.length === 0 && (
                            <p className="px-4 py-2 text-sm text-gray-400">Tidak ada data</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default TahunAjaranFilter;
