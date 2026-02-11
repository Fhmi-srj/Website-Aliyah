import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE, authFetch } from '../config/api';

const TahunAjaranContext = createContext(null);

export function TahunAjaranProvider({ children }) {
    const [tahunAjaranList, setTahunAjaranList] = useState([]);
    const [activeTahunAjaran, setActiveTahunAjaran] = useState(null);
    const [loading, setLoading] = useState(true);

    // Fetch tahun ajaran list and active on mount
    useEffect(() => {
        fetchTahunAjaran();
    }, []);

    const fetchTahunAjaran = async () => {
        try {
            const [listRes, activeRes] = await Promise.all([
                authFetch(`${API_BASE}/tahun-ajaran`),
                authFetch(`${API_BASE}/tahun-ajaran/active`)
            ]);

            if (listRes.ok) {
                const listData = await listRes.json();
                setTahunAjaranList(listData.data || []);
            }

            if (activeRes.ok) {
                const activeData = await activeRes.json();
                setActiveTahunAjaran(activeData.data);
            }
        } catch (error) {
            console.error('Error fetching tahun ajaran:', error);
        } finally {
            setLoading(false);
        }
    };

    const setActive = async (tahunAjaranId) => {
        try {
            const response = await authFetch(`${API_BASE}/tahun-ajaran/set-active`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ tahun_ajaran_id: tahunAjaranId })
            });

            if (response.ok) {
                const data = await response.json();
                setActiveTahunAjaran(data.data);
                return { success: true };
            } else {
                const errorData = await response.json();
                return { success: false, message: errorData.message };
            }
        } catch (error) {
            console.error('Error setting active tahun ajaran:', error);
            return { success: false, message: 'Gagal mengubah tahun ajaran' };
        }
    };

    const value = {
        tahunAjaranList,
        activeTahunAjaran,
        loading,
        setActive,
        refresh: fetchTahunAjaran,
    };

    return (
        <TahunAjaranContext.Provider value={value}>
            {children}
        </TahunAjaranContext.Provider>
    );
}

export function useTahunAjaran() {
    const context = useContext(TahunAjaranContext);
    if (!context) {
        throw new Error('useTahunAjaran must be used within a TahunAjaranProvider');
    }
    return context;
}

export default TahunAjaranContext;
