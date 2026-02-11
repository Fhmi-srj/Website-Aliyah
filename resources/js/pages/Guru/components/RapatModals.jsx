import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import api from '../../../lib/axios';
import SignatureCanvas from '../../../components/SignatureCanvas';

// Animated Modal Wrapper for smooth transitions
function AnimatedModalWrapper({ children, onClose, maxWidth = 'max-w-md' }) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => setIsVisible(true));
        });
        document.body.style.overflow = 'hidden';
        const handleEscape = (e) => { if (e.key === 'Escape') handleClose(); };
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.body.style.overflow = '';
            document.removeEventListener('keydown', handleEscape);
        };
    }, []);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(() => onClose(), 300);
    };

    return ReactDOM.createPortal(
        <div
            className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-all duration-300 ease-out ${isVisible ? 'bg-black/50' : 'bg-black/0'}`}
            onClick={handleClose}
        >
            <div
                className={`w-full ${maxWidth} transition-all duration-300 ease-out transform ${isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'}`}
                style={{ maxHeight: '90vh' }}
                onClick={(e) => e.stopPropagation()}
            >
                {typeof children === 'function' ? children(handleClose) : children}
            </div>
        </div>,
        document.body
    );
}
// Image compression utility
const compressImage = (file, maxWidth = 800, quality = 0.6) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Scale down if larger than maxWidth
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Convert to base64 with compression
                const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
                resolve(compressedBase64);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
};

// Modal Rapat Belum Mulai
export function ModalRapatBelumMulai({ rapat, onClose }) {
    const modalContent = (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-sm animate-slideUp" onClick={e => e.stopPropagation()}>
                <div className="p-6 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="fas fa-clock text-green-500 text-2xl"></i>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">Rapat Belum Dimulai</h3>
                    <p className="text-sm text-gray-500 mb-1">{rapat.agenda_rapat || rapat.name}</p>
                    <p className="text-xs text-gray-400">
                        <i className="fas fa-clock mr-1"></i>
                        {rapat.waktu_mulai?.substring(0, 5) || rapat.time} - {rapat.waktu_selesai?.substring(0, 5) || rapat.endTime}
                    </p>
                    <button
                        onClick={onClose}
                        className="mt-6 w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold"
                    >
                        Tutup
                    </button>
                </div>
            </div>
        </div>
    );
    return ReactDOM.createPortal(modalContent, document.body);
}

// Modal Rapat Sudah Absen - View Results (Read-Only)
export function ModalRapatSudahAbsen({ rapat, onClose }) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [selectedPhoto, setSelectedPhoto] = useState(null);

    useEffect(() => {
        const fetchRapatDetail = async () => {
            try {
                const response = await api.get(`/guru-panel/riwayat/rapat/${rapat.id}/detail`);
                if (response.data.success) {
                    setData(response.data.data);
                }
            } catch (err) {
                console.error('Error fetching rapat detail:', err);
            } finally {
                setLoading(false);
            }
        };
        if (rapat?.id) {
            fetchRapatDetail();
        }
    }, [rapat?.id]);

    // Calculate attendance counts
    const getCounts = () => {
        if (!data) return { hadir: 0, sakit: 0, izin: 0, alpha: 0 };
        let hadir = 0, sakit = 0, izin = 0, alpha = 0;

        // Count pimpinan
        if (data.pimpinan?.status === 'H') hadir++;
        else if (data.pimpinan?.status === 'S') sakit++;
        else if (data.pimpinan?.status === 'I') izin++;
        else if (data.pimpinan?.status === 'A') alpha++;

        // Count sekretaris
        if (data.sekretaris?.status === 'H') hadir++;
        else if (data.sekretaris?.status === 'S') sakit++;
        else if (data.sekretaris?.status === 'I') izin++;
        else if (data.sekretaris?.status === 'A') alpha++;

        // Count peserta
        if (data.peserta && Array.isArray(data.peserta)) {
            data.peserta.forEach(p => {
                if (p.status === 'H') hadir++;
                else if (p.status === 'S') sakit++;
                else if (p.status === 'I') izin++;
                else if (p.status === 'A') alpha++;
            });
        }

        return { hadir, sakit, izin, alpha };
    };

    const counts = getCounts();
    const photos = data?.foto_rapat || [];

    const modalContent = (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col animate-slideUp"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-4 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                <i className="fas fa-clipboard-check text-lg"></i>
                            </div>
                            <div>
                                <h2 className="font-bold text-sm">Hasil Rapat</h2>
                                <p className="text-green-100 text-xs truncate max-w-[200px]">{rapat.agenda_rapat || rapat.nama || rapat.name || '-'}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-lg transition-colors">
                            <i className="fas fa-times text-xl"></i>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <i className="fas fa-spinner fa-spin text-green-500 text-2xl"></i>
                        </div>
                    ) : (
                        <>
                            {/* Attendance Stats */}
                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <i className="fas fa-users text-green-500"></i>
                                    Rekap Kehadiran
                                </h3>
                                <div className="grid grid-cols-4 gap-2">
                                    <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                                        <div className="text-2xl font-bold text-green-600">{counts.hadir}</div>
                                        <div className="text-xs text-gray-500">Hadir</div>
                                    </div>
                                    <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                                        <div className="text-2xl font-bold text-orange-500">{counts.sakit}</div>
                                        <div className="text-xs text-gray-500">Sakit</div>
                                    </div>
                                    <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                                        <div className="text-2xl font-bold text-yellow-500">{counts.izin}</div>
                                        <div className="text-xs text-gray-500">Izin</div>
                                    </div>
                                    <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                                        <div className="text-2xl font-bold text-red-500">{counts.alpha}</div>
                                        <div className="text-xs text-gray-500">Alpha</div>
                                    </div>
                                </div>
                            </div>

                            {/* Notulensi */}
                            {data?.notulensi && (
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                        <i className="fas fa-file-alt text-blue-500"></i>
                                        Notulensi Rapat
                                    </h3>
                                    <div className="bg-white rounded-lg p-3 border border-gray-100">
                                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{data.notulensi}</p>
                                    </div>
                                </div>
                            )}

                            {/* Photos */}
                            {photos.length > 0 && (
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                        <i className="fas fa-images text-purple-500"></i>
                                        Dokumentasi Rapat ({photos.length} foto)
                                    </h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        {photos.map((photo, index) => (
                                            <div
                                                key={index}
                                                className="aspect-video rounded-lg overflow-hidden bg-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                                                onClick={() => setSelectedPhoto(photo)}
                                            >
                                                <img src={photo} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Peserta List */}
                            {data?.peserta && data.peserta.length > 0 && (
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                        <i className="fas fa-list text-gray-500"></i>
                                        Daftar Kehadiran
                                    </h3>
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {/* Pimpinan */}
                                        {data.pimpinan && (
                                            <div className="bg-white rounded-lg p-2 flex items-center justify-between border border-green-100">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded">Pimpinan</span>
                                                    <span className="text-sm font-medium text-gray-700 truncate max-w-[120px]">{data.pimpinan.nama}</span>
                                                </div>
                                                <span className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center text-white
                                                    ${data.pimpinan.status === 'H' ? 'bg-green-500' :
                                                        data.pimpinan.status === 'S' ? 'bg-orange-500' :
                                                            data.pimpinan.status === 'I' ? 'bg-yellow-500' : 'bg-red-500'}`}>
                                                    {data.pimpinan.status}
                                                </span>
                                            </div>
                                        )}
                                        {/* Sekretaris */}
                                        {data.sekretaris && (
                                            <div className="bg-white rounded-lg p-2 flex items-center justify-between border border-blue-100">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">Sekretaris</span>
                                                    <span className="text-sm font-medium text-gray-700 truncate max-w-[120px]">{data.sekretaris.nama}</span>
                                                </div>
                                                <span className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center text-white
                                                    ${data.sekretaris.status === 'H' ? 'bg-green-500' :
                                                        data.sekretaris.status === 'S' ? 'bg-orange-500' :
                                                            data.sekretaris.status === 'I' ? 'bg-yellow-500' : 'bg-red-500'}`}>
                                                    {data.sekretaris.status}
                                                </span>
                                            </div>
                                        )}
                                        {/* Peserta */}
                                        {data.peserta.map((p, idx) => (
                                            <div key={idx} className="bg-white rounded-lg p-2 flex items-center justify-between border border-gray-100">
                                                <span className="text-sm text-gray-700 truncate max-w-[180px]">{p.nama}</span>
                                                <span className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center text-white
                                                    ${p.status === 'H' ? 'bg-green-500' :
                                                        p.status === 'S' ? 'bg-orange-500' :
                                                            p.status === 'I' ? 'bg-yellow-500' : 'bg-red-500'}`}>
                                                    {p.status}
                                                </span>
                                            </div>
                                        ))}
                                        {/* Peserta Eksternal (Tamu Undangan) */}
                                        {(data?.peserta_eksternal || rapat?.peserta_eksternal || []).length > 0 && (data?.peserta_eksternal || rapat?.peserta_eksternal || []).map((pe, idx) => (
                                            <div key={`ext-${idx}`} className="bg-blue-50 rounded-lg p-2 flex items-center justify-between border border-blue-100">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">Tamu</span>
                                                    <span className="text-sm font-medium text-gray-700 truncate max-w-[120px]">{pe.nama}</span>
                                                    {pe.jabatan && <span className="text-xs text-blue-400">({pe.jabatan})</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="flex-shrink-0 p-4 border-t border-gray-100 bg-white">
                    <button onClick={onClose} className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors">
                        Tutup
                    </button>
                </div>
            </div>

            {/* Photo Lightbox */}
            {selectedPhoto && (
                <div
                    className="fixed inset-0 bg-black/90 flex items-center justify-center z-[10000] p-4"
                    onClick={() => setSelectedPhoto(null)}
                >
                    <button
                        onClick={() => setSelectedPhoto(null)}
                        className="absolute top-4 right-4 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30"
                    >
                        <i className="fas fa-times text-xl"></i>
                    </button>
                    <img
                        src={selectedPhoto}
                        alt="Foto Rapat"
                        className="max-w-full max-h-full object-contain rounded-lg"
                        onClick={e => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
    return ReactDOM.createPortal(modalContent, document.body);
}

// Modal Absensi Rapat untuk Pimpinan (Full form - same as Sekretaris) - can edit kehadiran, notulensi, dokumentasi
export function ModalAbsensiRapatPimpinan({ rapat, tanggal, onClose, onSuccess, isUnlocked = false }) {
    const [pimpinanStatus, setPimpinanStatus] = useState('H');
    const [pimpinanKeterangan, setPimpinanKeterangan] = useState('');
    const [sekretarisStatus, setSekretarisStatus] = useState('A');
    const [sekretarisKeterangan, setSekretarisKeterangan] = useState('');
    const [sekretarisSelfAttended, setSekretarisSelfAttended] = useState(false);
    const [absensiPeserta, setAbsensiPeserta] = useState([]);
    const [pesertaEksternal, setPesertaEksternal] = useState(rapat?.peserta_eksternal || []);
    const [notulensi, setNotulensi] = useState('');
    const [fotoRapat, setFotoRapat] = useState([]);
    const [loading, setLoading] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [ttdOverrides, setTtdOverrides] = useState({});
    const [showSignatureCanvas, setShowSignatureCanvas] = useState(false);
    const [signatureTarget, setSignatureTarget] = useState(null); // { type: 'tamu', index: idx } or { type: 'guru', guruId: id }
    const [sekretarisExpanded, setSekretarisExpanded] = useState(true);
    const [pesertaExpanded, setPesertaExpanded] = useState(false);
    const [pimpinanName, setPimpinanName] = useState('');
    const [pimpinanNip, setPimpinanNip] = useState('');
    const [loadingExisting, setLoadingExisting] = useState(true);
    const [sekretarisInfo, setSekretarisInfo] = useState(null);

    // Fetch pimpinan info
    useEffect(() => {
        const fetchPimpinanInfo = async () => {
            try {
                const response = await api.get('/guru-panel/dashboard');
                setPimpinanName(response.data.user?.name || '');
                setPimpinanNip(response.data.user?.nip || '');
            } catch (err) {
                console.error('Error fetching pimpinan info:', err);
            }
        };
        fetchPimpinanInfo();
    }, []);

    // Get sekretaris info from rapat data
    useEffect(() => {
        if (rapat?.sekretaris) {
            setSekretarisInfo(rapat.sekretaris);
        }
    }, [rapat]);

    // Fetch existing absensi data to pre-fill the form
    useEffect(() => {
        const fetchExistingAbsensi = async () => {
            if (!rapat?.id) return;

            try {
                setLoadingExisting(true);
                const response = await api.get(`/guru-panel/rapat/${rapat.id}/absensi`);

                if (response.data.has_absensi && response.data.data) {
                    const data = response.data.data;

                    // Pre-fill pimpinan status
                    if (data.pimpinan_status) {
                        setPimpinanStatus(data.pimpinan_status);
                        setPimpinanKeterangan(data.pimpinan_keterangan || '');
                    }

                    // Pre-fill sekretaris status
                    if (data.sekretaris_status) {
                        setSekretarisStatus(data.sekretaris_status);
                        setSekretarisKeterangan(data.sekretaris_keterangan || '');
                    }

                    // Pre-fill peserta absensi
                    if (data.absensi_peserta && data.absensi_peserta.length > 0) {
                        setAbsensiPeserta(prev => {
                            if (prev.length === 0) {
                                return data.absensi_peserta.map(p => ({
                                    guru_id: p.guru_id,
                                    nama: p.nama || '',
                                    nip: p.nip || '',
                                    status: p.status || 'A',
                                    keterangan: p.keterangan || '',
                                    self_attended: p.self_attended || false
                                }));
                            }
                            return prev.map(guru => {
                                const savedPeserta = data.absensi_peserta.find(p => p.guru_id === guru.guru_id);
                                if (savedPeserta) {
                                    return {
                                        ...guru,
                                        status: savedPeserta.status || 'A',
                                        keterangan: savedPeserta.keterangan || '',
                                        self_attended: savedPeserta.self_attended || false
                                    };
                                }
                                return guru;
                            });
                        });
                    }

                    // Pre-fill notulensi
                    if (data.notulensi) {
                        setNotulensi(data.notulensi);
                    }

                    // Pre-fill photos
                    if (data.foto_rapat && data.foto_rapat.length > 0) {
                        setFotoRapat(data.foto_rapat);
                    }
                }
            } catch (err) {
                console.error('Error fetching existing absensi:', err);
            } finally {
                setLoadingExisting(false);
            }
        };

        fetchExistingAbsensi();
    }, [rapat?.id]);

    // Fetch peserta list from API
    useEffect(() => {
        if (rapat?.id) {
            const fetchPeserta = async () => {
                try {
                    const response = await api.get(`/guru-panel/riwayat/rapat/${rapat.id}/detail`);
                    if (response.data.success) {
                        const data = response.data.data;
                        // Set sekretaris info if available
                        if (data.sekretaris) {
                            setSekretarisInfo(data.sekretaris);
                            setSekretarisStatus(data.sekretaris.status || 'A');
                            setSekretarisSelfAttended(data.sekretaris.status !== 'A');
                        }
                        // Set peserta list from API with their current status
                        if (data.peserta && data.peserta.length > 0) {
                            const excludeIds = [rapat?.pimpinan_id, rapat?.sekretaris_id].filter(Boolean);
                            setAbsensiPeserta(data.peserta
                                .filter(g => g.nama && !g.nama.toLowerCase().includes('semua guru'))
                                .filter(g => !excludeIds.includes(g.id))
                                .map(g => ({
                                    guru_id: g.id,
                                    nama: g.nama,
                                    nip: g.nip,
                                    status: g.status || 'A',
                                    keterangan: '',
                                    self_attended: g.status !== 'A'
                                })));
                        }
                        // Set notulensi if available
                        if (data.notulensi) {
                            setNotulensi(data.notulensi);
                        }
                        // Load existing photos if available
                        if (data.foto_rapat && Array.isArray(data.foto_rapat) && data.foto_rapat.length > 0) {
                            setFotoRapat(data.foto_rapat);
                        }
                    }
                } catch (err) {
                    console.error('Error fetching peserta list:', err);
                }
            };
            fetchPeserta();
        }
    }, [rapat?.id]);

    // Poll for self-attended peserta updates
    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const response = await api.get(`/guru-panel/rapat/${rapat.id}/absensi-peserta`);
                const serverData = response.data;
                if (serverData.sekretaris && serverData.sekretaris.self_attended) {
                    setSekretarisStatus(serverData.sekretaris.status);
                    setSekretarisKeterangan(serverData.sekretaris.keterangan || '');
                    setSekretarisSelfAttended(true);
                }
                if (serverData.peserta && serverData.peserta.length > 0) {
                    setAbsensiPeserta(prev => prev.map(guru => {
                        const serverEntry = serverData.peserta.find(s => s.guru_id == guru.guru_id);
                        if (serverEntry && serverEntry.self_attended) {
                            return { ...guru, status: serverEntry.status, keterangan: serverEntry.keterangan || '', self_attended: true };
                        }
                        return guru;
                    }));
                }
            } catch (err) {
                console.error('Error fetching status:', err);
            }
        };
        fetchStatus();
        const interval = setInterval(fetchStatus, 5000);
        return () => clearInterval(interval);
    }, [rapat.id]);

    const autoHadirPimpinan = () => {
        if (pimpinanStatus === 'A') setPimpinanStatus('H');
    };

    const handleNotulensiChange = (value) => {
        setNotulensi(value);
        autoHadirPimpinan();
    };

    const updatePesertaStatus = (index, status) => {
        const updated = [...absensiPeserta];
        updated[index].status = status;
        if (status !== 'I') updated[index].keterangan = '';
        setAbsensiPeserta(updated);
        autoHadirPimpinan();
    };

    const updatePesertaKeterangan = (index, keterangan) => {
        const updated = [...absensiPeserta];
        updated[index].keterangan = keterangan;
        setAbsensiPeserta(updated);
    };

    const handlePhotoUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        const remainingSlots = 4 - fotoRapat.length;
        const filesToProcess = files.slice(0, remainingSlots);
        if (filesToProcess.length === 0) { alert('Maksimal 4 foto'); return; }
        setUploadingPhoto(true);
        try {
            const compressedPhotos = await Promise.all(filesToProcess.map(file => compressImage(file, 800, 0.6)));
            setFotoRapat(prev => [...prev, ...compressedPhotos]);
            autoHadirPimpinan();
        } catch (err) {
            console.error('Error compressing photos:', err);
            alert('Gagal memproses foto');
        } finally {
            setUploadingPhoto(false);
        }
        e.target.value = '';
    };

    const removePhoto = (index) => {
        setFotoRapat(prev => prev.filter((_, i) => i !== index));
    };

    const pesertaCounts = {
        hadir: absensiPeserta.filter(g => g.status === 'H').length,
        sakit: absensiPeserta.filter(g => g.status === 'S').length,
        izin: absensiPeserta.filter(g => g.status === 'I').length,
        alpha: absensiPeserta.filter(g => g.status === 'A').length,
    };

    const canSubmit = fotoRapat.length >= 2 && notulensi.trim();

    const handleSubmit = async () => {
        if (!canSubmit) {
            if (!notulensi.trim()) { alert('Notulensi rapat wajib diisi'); return; }
            if (fotoRapat.length < 2) { alert('Minimal upload 2 foto dokumentasi rapat'); return; }
        }
        setLoading(true);
        try {
            // Use the same API as sekretaris - both roles submit identical data
            await api.post('/guru-panel/rapat/absensi-sekretaris', {
                rapat_id: rapat.id,
                pimpinan_status: pimpinanStatus,
                pimpinan_keterangan: pimpinanKeterangan || null,
                sekretaris_status: sekretarisStatus,
                sekretaris_keterangan: sekretarisKeterangan || null,
                absensi_peserta: absensiPeserta.map(g => ({ guru_id: g.guru_id, status: g.status, keterangan: g.keterangan || null })),
                notulensi,
                foto_rapat: fotoRapat,
                peserta_eksternal: pesertaEksternal.filter(pe => pe.nama?.trim()),
                ttd_overrides: Object.keys(ttdOverrides).length > 0 ? ttdOverrides : undefined,
            });
            onSuccess?.();
        } catch (err) {
            console.error('Error submitting absensi:', err);
            alert(err.response?.data?.error || 'Gagal menyimpan absensi');
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (time) => time ? time.substring(0, 5) : '-';

    const handleSignatureSave = (base64) => {
        if (!signatureTarget) return;
        if (signatureTarget.type === 'tamu') {
            const u = [...pesertaEksternal];
            u[signatureTarget.index] = { ...u[signatureTarget.index], ttd: base64 };
            setPesertaEksternal(u);
        } else if (signatureTarget.type === 'guru') {
            setTtdOverrides(prev => ({ ...prev, [signatureTarget.guruId]: base64 }));
        }
    };

    return (
        <>
            {ReactDOM.createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
                    <div className="bg-white rounded-2xl w-full max-w-md flex flex-col shadow-2xl overflow-hidden" style={{ maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className={`${isUnlocked ? 'bg-gradient-to-r from-amber-500 to-amber-600' : 'bg-gradient-to-r from-green-600 to-green-700'} text-white p-4 flex-shrink-0`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><i className={`fas ${isUnlocked ? 'fa-unlock' : 'fa-gavel'}`}></i></div>
                                    <div>
                                        <h2 className="font-bold text-sm">{isUnlocked ? 'Isi Absensi (Dibuka Kembali)' : (rapat.agenda_rapat || rapat.name)}</h2>
                                        <p className={`${isUnlocked ? 'text-amber-100' : 'text-green-100'} text-xs`}><i className="fas fa-map-marker-alt mr-1"></i>{rapat.tempat || rapat.location || '-'} • {rapat.waktu_mulai ? `${formatTime(rapat.waktu_mulai)} - ${formatTime(rapat.waktu_selesai)}` : (rapat.time || '-')}</p>
                                    </div>
                                </div>
                                <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-lg"><i className="fas fa-times text-xl"></i></button>
                            </div>
                            <div className="flex gap-4 mt-4 text-center">
                                <div className="flex-1"><p className="text-2xl font-bold">{pesertaCounts.hadir}</p><p className={`text-xs ${isUnlocked ? 'text-amber-100' : 'text-green-100'}`}>Hadir</p></div>
                                <div className="flex-1"><p className="text-2xl font-bold">{pesertaCounts.sakit}</p><p className={`text-xs ${isUnlocked ? 'text-amber-100' : 'text-green-100'}`}>Sakit</p></div>
                                <div className="flex-1"><p className="text-2xl font-bold">{pesertaCounts.izin}</p><p className={`text-xs ${isUnlocked ? 'text-amber-100' : 'text-green-100'}`}>Izin</p></div>
                                <div className="flex-1"><p className="text-2xl font-bold">{pesertaCounts.alpha}</p><p className={`text-xs ${isUnlocked ? 'text-amber-100' : 'text-green-100'}`}>Alpha</p></div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {/* Unlocked Info Banner */}
                            {isUnlocked && (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                                    <div className="flex items-start gap-2">
                                        <i className="fas fa-info-circle text-amber-500 mt-0.5"></i>
                                        <div>
                                            <p className="text-sm font-medium text-amber-800">Absensi Dibuka Kembali</p>
                                            <p className="text-xs text-amber-600 mt-1">Admin telah membuka kunci absensi. Anda dapat mengisi data absensi yang terlewat.</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Kehadiran Peserta - Unified List */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                    <i className="fas fa-users text-green-600"></i> Kehadiran Peserta
                                    <span className="ml-auto text-xs font-normal text-gray-400">{absensiPeserta.length + 2} peserta</span>
                                </label>
                                <div className="space-y-1.5">
                                    {/* Pimpinan (Self) */}
                                    <div className="bg-white rounded-lg px-2.5 py-2 border-2 border-purple-200">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-gray-800 text-xs truncate">{pimpinanName || 'Loading...'}</p>
                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-700 mt-0.5">Pimpinan</span>
                                            </div>
                                            <div className="flex gap-0.5">
                                                {['H', 'S', 'I', 'A'].map(s => (
                                                    <button key={s} onClick={() => setPimpinanStatus(s)} className={`w-7 h-7 rounded-md text-[10px] font-bold transition-all ${pimpinanStatus === s ? s === 'H' ? 'bg-green-500 text-white' : s === 'S' ? 'bg-orange-500 text-white' : s === 'I' ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}>{s}</button>
                                                ))}
                                            </div>
                                        </div>
                                        {(pimpinanStatus === 'I' || pimpinanStatus === 'S') && <input type="text" value={pimpinanKeterangan} onChange={e => setPimpinanKeterangan(e.target.value)} placeholder={`Keterangan ${pimpinanStatus === 'I' ? 'izin' : 'sakit'}...`} className="w-full mt-1 border border-yellow-200 rounded-md p-1.5 text-xs focus:ring-2 focus:ring-yellow-400 bg-yellow-50" />}
                                    </div>

                                    {/* Sekretaris */}
                                    <div className={`bg-white rounded-lg px-2.5 py-2 ${sekretarisSelfAttended ? 'border-2 border-green-400' : 'border-2 border-indigo-200'}`}>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-gray-800 text-xs truncate flex items-center gap-1">{sekretarisInfo?.nama || rapat?.sekretaris_nama || 'Sekretaris'}{sekretarisSelfAttended && <span className="text-[10px] bg-green-100 text-green-600 px-1 py-0.5 rounded-full">Self</span>}</p>
                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 text-indigo-700 mt-0.5">Sekretaris</span>
                                            </div>
                                            <div className="flex gap-0.5">
                                                {['H', 'S', 'I', 'A'].map(s => (
                                                    <button key={s} onClick={() => setSekretarisStatus(s)} className={`w-7 h-7 rounded-md text-[10px] font-bold transition-all ${sekretarisStatus === s ? s === 'H' ? 'bg-green-500 text-white' : s === 'S' ? 'bg-orange-500 text-white' : s === 'I' ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}>{s}</button>
                                                ))}
                                            </div>
                                        </div>
                                        {(sekretarisStatus === 'I' || sekretarisStatus === 'S') && <input type="text" value={sekretarisKeterangan} onChange={e => setSekretarisKeterangan(e.target.value)} placeholder={`Keterangan ${sekretarisStatus === 'I' ? 'izin' : 'sakit'}...`} className="w-full mt-1 border border-yellow-200 rounded-md p-1.5 text-xs focus:ring-2 focus:ring-yellow-400 bg-yellow-50" />}
                                    </div>

                                    {/* Other Peserta */}
                                    {absensiPeserta.map((guru, index) => (
                                        <div key={guru.guru_id} className={`bg-white rounded-lg px-2.5 py-2 ${guru.self_attended ? 'border-2 border-green-400' : 'border border-gray-100'}`}>
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-gray-800 text-xs truncate flex items-center gap-1">{guru.nama}{guru.self_attended && <span className="text-[10px] bg-green-100 text-green-600 px-1 py-0.5 rounded-full">Self</span>}</p>
                                                    <p className="text-[10px] text-gray-400 truncate">{guru.nip || ''}</p>
                                                </div>
                                                <div className="flex gap-0.5">
                                                    {['H', 'S', 'I', 'A'].map(s => (
                                                        <button key={s} onClick={() => updatePesertaStatus(index, s)} className={`w-7 h-7 rounded-md text-[10px] font-bold transition-all ${guru.status === s ? s === 'H' ? 'bg-green-500 text-white' : s === 'S' ? 'bg-orange-500 text-white' : s === 'I' ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}>{s}</button>
                                                    ))}
                                                </div>
                                            </div>
                                            {(guru.status === 'I' || guru.status === 'S') && <input type="text" value={guru.keterangan} onChange={e => updatePesertaKeterangan(index, e.target.value)} placeholder={`Keterangan ${guru.status === 'I' ? 'izin' : 'sakit'}...`} className="w-full mt-1 border border-yellow-200 rounded-md p-1.5 text-xs focus:ring-2 focus:ring-yellow-400 bg-yellow-50" />}
                                        </div>
                                    ))}
                                </div>

                                {/* Peserta Eksternal (Tamu Undangan) */}
                                <div className="mt-3">
                                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
                                        <i className="fas fa-user-tie text-blue-500"></i> Tamu Undangan ({pesertaEksternal.length})
                                    </label>
                                    <div className="space-y-1">
                                        {pesertaEksternal.map((pe, idx) => (
                                            <div key={idx} className="bg-blue-50 rounded-lg px-2.5 py-1.5 border border-blue-100">
                                                <div className="flex items-center gap-1.5">
                                                    <input type="text" value={pe.nama} onChange={(e) => { const u = [...pesertaEksternal]; u[idx] = { ...u[idx], nama: e.target.value }; setPesertaEksternal(u); }} placeholder="Nama" className="flex-1 border border-blue-200 rounded px-2 py-1 text-xs bg-white focus:ring-1 focus:ring-blue-400" />
                                                    <input type="text" value={pe.jabatan || ''} onChange={(e) => { const u = [...pesertaEksternal]; u[idx] = { ...u[idx], jabatan: e.target.value }; setPesertaEksternal(u); }} placeholder="Jabatan" className="flex-1 border border-blue-200 rounded px-2 py-1 text-xs bg-white focus:ring-1 focus:ring-blue-400" />
                                                    <button type="button" onClick={() => { setSignatureTarget({ type: 'tamu', index: idx }); setShowSignatureCanvas(true); }} className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 cursor-pointer ${pe.ttd ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-500 hover:bg-indigo-100 hover:text-indigo-600'}`} title="Tanda tangan"><i className="fas fa-pen-fancy text-[10px]"></i></button>
                                                    <span className="text-[10px] font-bold bg-green-500 text-white w-6 h-6 rounded flex items-center justify-center flex-shrink-0">H</span>
                                                    <button type="button" onClick={() => setPesertaEksternal(pesertaEksternal.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 cursor-pointer flex-shrink-0"><i className="fas fa-times text-xs"></i></button>
                                                </div>
                                                {pe.ttd && <div className="mt-1 bg-white rounded p-1 border border-blue-100"><img src={pe.ttd} alt="TTD" className="h-8 object-contain" /></div>}
                                            </div>
                                        ))}
                                    </div>
                                    <button type="button" onClick={() => setPesertaEksternal([...pesertaEksternal, { nama: '', jabatan: '' }])} className="mt-1.5 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer">
                                        <i className="fas fa-plus-circle"></i> Tambah Tamu Undangan
                                    </button>
                                </div>
                            </div>

                            {/* Notulensi */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Notulensi Rapat <span className="text-red-500">*</span></label>
                                <textarea value={notulensi} onChange={e => handleNotulensiChange(e.target.value)} placeholder="Isi notulensi/hasil rapat..." className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-green-400 min-h-[80px] resize-y" />
                            </div>

                            {/* Dokumentasi Rapat */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Dokumentasi Rapat <span className="text-red-500">*</span> <span className="font-normal text-gray-400 ml-1">(Min 2, Max 4)</span></label>
                                {fotoRapat.length > 0 && (
                                    <div className="grid grid-cols-2 gap-2 mb-2">
                                        {fotoRapat.map((photo, index) => (
                                            <div key={index} className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
                                                <img src={photo} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
                                                <button onClick={() => removePhoto(index)} className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"><i className="fas fa-times"></i></button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {fotoRapat.length < 4 && (
                                    <div className="space-y-2">
                                        {uploadingPhoto ? (
                                            <div className="flex items-center justify-center gap-2 text-gray-500 py-4">
                                                <i className="fas fa-spinner fa-spin"></i>
                                                <span className="text-sm">Memproses foto...</span>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-2">
                                                {/* Camera Capture Button */}
                                                <label className="flex flex-col items-center justify-center border-2 border-dashed border-green-300 rounded-xl p-4 cursor-pointer hover:border-green-500 hover:bg-green-50 transition-all bg-green-50/30">
                                                    <input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} className="hidden" disabled={uploadingPhoto} />
                                                    <i className="fas fa-camera text-green-500 text-2xl mb-2"></i>
                                                    <span className="text-xs font-medium text-green-600">Ambil Foto</span>
                                                </label>

                                                {/* File Gallery Button */}
                                                <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-4 cursor-pointer hover:border-green-400 hover:bg-green-50 transition-all">
                                                    <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" disabled={uploadingPhoto} />
                                                    <i className="fas fa-images text-gray-400 text-2xl mb-2"></i>
                                                    <span className="text-xs font-medium text-gray-500">Pilih File</span>
                                                </label>
                                            </div>
                                        )}
                                        <p className="text-xs text-gray-400 text-center">{fotoRapat.length}/4 foto</p>
                                    </div>
                                )}
                                {fotoRapat.length < 2 && <p className="text-xs text-red-500 mt-1"><i className="fas fa-exclamation-circle mr-1"></i>Minimal upload 2 foto dokumentasi rapat</p>}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex-shrink-0 p-4 border-t border-gray-100 flex gap-3 bg-white">
                            <button onClick={onClose} className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-600 font-medium hover:bg-gray-50">Batal</button>
                            <button onClick={handleSubmit} disabled={loading || !canSubmit} className={`flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 ${canSubmit ? 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:shadow-lg' : 'bg-gray-300 text-gray-500 cursor-not-allowed'} disabled:opacity-50`}>
                                {loading ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-save"></i>Simpan Absensi</>}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            <SignatureCanvas
                isOpen={showSignatureCanvas}
                onClose={() => { setShowSignatureCanvas(false); setSignatureTarget(null); }}
                onSave={handleSignatureSave}
                title="Tanda Tangan Tamu"
            />
        </>
    );
}

// Modal Absensi Rapat untuk Peserta/Guru (Self-attend only) - styled like ModalAbsensiKegiatanPendamping
export function ModalAbsensiRapatPeserta({ rapat, tanggal, role, onClose, onSuccess, isUnlocked = false }) {
    const [status, setStatus] = useState('A'); // Default Alpha like pendamping
    const [keterangan, setKeterangan] = useState('');
    const [loading, setLoading] = useState(false);
    const [guruName, setGuruName] = useState('');
    const [guruNip, setGuruNip] = useState('');
    const [alreadyAttended, setAlreadyAttended] = useState(false);
    const [existingStatus, setExistingStatus] = useState(null);
    const [rapatDetail, setRapatDetail] = useState(null);
    const [selectedPhoto, setSelectedPhoto] = useState(null);

    // Fetch current guru info
    useEffect(() => {
        const fetchGuruInfo = async () => {
            try {
                const response = await api.get('/guru-panel/dashboard');
                setGuruName(response.data.user?.name || '');
                setGuruNip(response.data.user?.nip || '');
            } catch (err) {
                console.error('Error fetching guru info:', err);
            }
        };
        fetchGuruInfo();
    }, []);

    // Check if already attended and fetch rapat detail for read-only view
    useEffect(() => {
        const checkStatus = async () => {
            try {
                const response = await api.get(`/guru-panel/rapat/${rapat.id}/check-status`);
                if (response.data.attended) {
                    setAlreadyAttended(true);
                    setExistingStatus(response.data.status);
                    setStatus(response.data.status);
                    setKeterangan(response.data.keterangan || '');

                    // Fetch full rapat detail for read-only view (notulensi, photos, peserta list)
                    try {
                        const detailResponse = await api.get(`/guru-panel/riwayat/rapat/${rapat.id}/detail`);
                        if (detailResponse.data.success) {
                            setRapatDetail(detailResponse.data.data);
                        }
                    } catch (detailErr) {
                        console.error('Error fetching rapat detail:', detailErr);
                    }
                }
            } catch (err) {
                console.error('Error checking status:', err);
            }
        };
        checkStatus();
    }, [rapat.id]);

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await api.post('/guru-panel/rapat/absensi-peserta', {
                rapat_id: rapat.id,
                status,
                keterangan: keterangan || null,
            });
            onSuccess?.();
        } catch (err) {
            console.error('Error submitting absensi peserta:', err);
            alert(err.response?.data?.error || 'Gagal menyimpan absensi');
        } finally {
            setLoading(false);
        }
    };

    // Format time
    const formatTime = (time) => {
        if (!time) return '-';
        return time.substring(0, 5);
    };

    // Get role label and color
    const getRoleInfo = () => {
        if (role === 'pimpinan') {
            return { label: 'Pimpinan Rapat', color: 'green', icon: 'fa-user-tie' };
        }
        return { label: 'Peserta Rapat', color: 'green', icon: 'fa-user-friends' };
    };

    const roleInfo = getRoleInfo();

    // Read-only mode: user already attended and attendance is not unlocked
    const readOnlyMode = alreadyAttended && !isUnlocked;

    return ReactDOM.createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl w-full max-w-md flex flex-col shadow-2xl overflow-hidden"
                style={{ maxHeight: '90vh' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className={`${isUnlocked ? 'bg-gradient-to-r from-amber-500 to-amber-600' : `bg-gradient-to-r ${role === 'pimpinan' ? 'from-green-600 to-green-700' : 'from-green-600 to-green-700'}`} text-white p-4 flex-shrink-0`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                <i className={`fas ${isUnlocked ? 'fa-unlock' : 'fa-users'}`}></i>
                            </div>
                            <div>
                                <h2 className="font-bold text-sm">{isUnlocked ? 'Isi Absensi (Dibuka Kembali)' : (rapat.agenda_rapat || rapat.name)}</h2>
                                <p className={`${isUnlocked ? 'text-amber-100' : `${role === 'pimpinan' ? 'text-green-100' : 'text-green-100'}`} text-xs`}>Absensi {roleInfo.label}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-lg transition-colors">
                            <i className="fas fa-times text-xl"></i>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Unlocked Info Banner */}
                    {isUnlocked && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                            <div className="flex items-start gap-2">
                                <i className="fas fa-info-circle text-amber-500 mt-0.5"></i>
                                <div>
                                    <p className="text-sm font-medium text-amber-800">Absensi Dibuka Kembali</p>
                                    <p className="text-xs text-amber-600 mt-1">Admin telah membuka kunci absensi. Anda dapat mengisi data absensi yang terlewat.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Info Badge */}
                    <div className={`${role === 'pimpinan' ? 'bg-green-50 border-green-200' : 'bg-green-50 border-green-200'} border rounded-xl p-3`}>
                        <div className={`flex items-center gap-2 ${role === 'pimpinan' ? 'text-green-700' : 'text-green-700'} text-sm font-medium`}>
                            <i className={`fas ${roleInfo.icon}`}></i>
                            <span>Anda adalah {roleInfo.label}</span>
                        </div>
                    </div>

                    {/* Meeting Info */}
                    <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                        <div className="flex items-start gap-3">
                            <i className="fas fa-calendar text-gray-400 mt-0.5 w-4"></i>
                            <div>
                                <p className="text-xs text-gray-500">Tanggal</p>
                                <p className="text-sm text-gray-800 font-medium">{rapatDetail?.tanggal || tanggal || rapat.date || rapat.tanggal || '-'}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <i className="fas fa-clock text-gray-400 mt-0.5 w-4"></i>
                            <div>
                                <p className="text-xs text-gray-500">Waktu</p>
                                <p className="text-sm text-gray-800 font-medium">
                                    {rapatDetail?.waktu_mulai ? `${formatTime(rapatDetail.waktu_mulai)} - ${formatTime(rapatDetail.waktu_selesai)}` :
                                        rapat.waktu_mulai ? `${formatTime(rapat.waktu_mulai)} - ${formatTime(rapat.waktu_selesai)}` : (rapat.time || '-')}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <i className="fas fa-map-marker-alt text-gray-400 mt-0.5 w-4"></i>
                            <div>
                                <p className="text-xs text-gray-500">Tempat</p>
                                <p className="text-sm text-gray-800 font-medium">{rapatDetail?.tempat || rapat.tempat || rapat.location || '-'}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <i className="fas fa-user-tie text-gray-400 mt-0.5 w-4"></i>
                            <div>
                                <p className="text-xs text-gray-500">Pimpinan</p>
                                <p className="text-sm text-gray-800 font-medium">{rapatDetail?.pimpinan?.nama || rapat.pimpinan?.nama || rapat.pimpinan_nama || '-'}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <i className="fas fa-users text-gray-400 mt-0.5 w-4"></i>
                            <div>
                                <p className="text-xs text-gray-500">Peserta</p>
                                <p className="text-sm text-gray-800 font-medium">{rapatDetail?.peserta?.length || rapat.peserta_count || rapat.peserta_rapat?.length || '0'} guru</p>
                            </div>
                        </div>
                    </div>

                    {/* Already Attended Notice */}
                    {alreadyAttended && (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                            <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
                                <i className="fas fa-check-circle"></i>
                                <span>Anda sudah mengisi absensi (Status: {existingStatus})</span>
                            </div>
                        </div>
                    )}

                    {/* Attendance Card */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Kehadiran Anda</label>
                        <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 ${role === 'pimpinan' ? 'bg-green-100 text-green-600' : 'bg-green-100 text-green-600'} rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0`}>
                                    {guruName?.charAt(0)?.toUpperCase() || 'G'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-gray-800 truncate">{guruName || 'Loading...'}</p>
                                    <p className="text-xs text-gray-400">{guruNip || roleInfo.label}</p>
                                </div>
                                <div className="flex gap-1.5">
                                    {['H', 'I', 'A'].map(s => (
                                        <button
                                            key={s}
                                            onClick={() => !readOnlyMode && setStatus(s)}
                                            disabled={readOnlyMode}
                                            className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${status === s
                                                ? s === 'H' ? 'bg-green-500 text-white shadow-md'
                                                    : s === 'I' ? 'bg-yellow-500 text-white shadow-md'
                                                        : 'bg-red-500 text-white shadow-md'
                                                : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                                                } ${readOnlyMode ? 'cursor-not-allowed opacity-70' : ''}`}
                                        >{s}</button>
                                    ))}
                                </div>
                            </div>
                            {status === 'I' && (
                                <input
                                    type="text"
                                    value={keterangan}
                                    onChange={e => setKeterangan(e.target.value)}
                                    placeholder="Keterangan izin..."
                                    className="w-full mt-2 border border-yellow-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-yellow-400 focus:border-transparent bg-yellow-50"
                                    disabled={readOnlyMode}
                                />
                            )}
                        </div>
                    </div>

                    {/* Show Full Rapat Results when already attended (even if unlocked) */}
                    {alreadyAttended && rapatDetail && (
                        <>
                            {/* Attendance Stats */}
                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <i className="fas fa-users text-green-500"></i>
                                    Rekap Kehadiran
                                </h3>
                                <div className="grid grid-cols-4 gap-2">
                                    {(() => {
                                        let counts = { H: 0, S: 0, I: 0, A: 0 };
                                        if (rapatDetail.pimpinan?.status) counts[rapatDetail.pimpinan.status]++;
                                        if (rapatDetail.sekretaris?.status) counts[rapatDetail.sekretaris.status]++;
                                        (rapatDetail.peserta || []).forEach(p => { if (p.status) counts[p.status]++; });
                                        return (
                                            <>
                                                <div className="bg-white rounded-lg p-2 text-center shadow-sm">
                                                    <div className="text-xl font-bold text-green-600">{counts.H}</div>
                                                    <div className="text-xs text-gray-500">Hadir</div>
                                                </div>
                                                <div className="bg-white rounded-lg p-2 text-center shadow-sm">
                                                    <div className="text-xl font-bold text-orange-500">{counts.S}</div>
                                                    <div className="text-xs text-gray-500">Sakit</div>
                                                </div>
                                                <div className="bg-white rounded-lg p-2 text-center shadow-sm">
                                                    <div className="text-xl font-bold text-yellow-500">{counts.I}</div>
                                                    <div className="text-xs text-gray-500">Izin</div>
                                                </div>
                                                <div className="bg-white rounded-lg p-2 text-center shadow-sm">
                                                    <div className="text-xl font-bold text-red-500">{counts.A}</div>
                                                    <div className="text-xs text-gray-500">Alpha</div>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Notulensi */}
                            {rapatDetail.notulensi && (
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                        <i className="fas fa-file-alt text-blue-500"></i>
                                        Notulensi Rapat
                                    </h3>
                                    <div className="bg-white rounded-lg p-3 border border-gray-100">
                                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{rapatDetail.notulensi}</p>
                                    </div>
                                </div>
                            )}

                            {/* Photos */}
                            {rapatDetail.foto_rapat && rapatDetail.foto_rapat.length > 0 && (
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                        <i className="fas fa-images text-purple-500"></i>
                                        Dokumentasi ({rapatDetail.foto_rapat.length} foto)
                                    </h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        {rapatDetail.foto_rapat.map((photo, index) => (
                                            <div
                                                key={index}
                                                className="aspect-video rounded-lg overflow-hidden bg-gray-200 cursor-pointer hover:opacity-90"
                                                onClick={() => setSelectedPhoto(photo)}
                                            >
                                                <img src={photo} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Peserta List */}
                            <div className="bg-gray-50 rounded-xl p-4">
                                <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                    <i className="fas fa-list text-gray-500"></i>
                                    Daftar Kehadiran
                                </h3>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {rapatDetail.pimpinan && (
                                        <div className="bg-white rounded-lg p-2 flex items-center justify-between border border-green-100">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded">Pimpinan</span>
                                                <span className="text-sm font-medium text-gray-700 truncate max-w-[100px]">{rapatDetail.pimpinan.nama}</span>
                                            </div>
                                            <span className={`w-6 h-6 rounded text-xs font-bold flex items-center justify-center text-white
                                                ${rapatDetail.pimpinan.status === 'H' ? 'bg-green-500' :
                                                    rapatDetail.pimpinan.status === 'S' ? 'bg-orange-500' :
                                                        rapatDetail.pimpinan.status === 'I' ? 'bg-yellow-500' : 'bg-red-500'}`}>
                                                {rapatDetail.pimpinan.status}
                                            </span>
                                        </div>
                                    )}
                                    {rapatDetail.sekretaris && (
                                        <div className="bg-white rounded-lg p-2 flex items-center justify-between border border-blue-100">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">Sekretaris</span>
                                                <span className="text-sm font-medium text-gray-700 truncate max-w-[100px]">{rapatDetail.sekretaris.nama}</span>
                                            </div>
                                            <span className={`w-6 h-6 rounded text-xs font-bold flex items-center justify-center text-white
                                                ${rapatDetail.sekretaris.status === 'H' ? 'bg-green-500' :
                                                    rapatDetail.sekretaris.status === 'S' ? 'bg-orange-500' :
                                                        rapatDetail.sekretaris.status === 'I' ? 'bg-yellow-500' : 'bg-red-500'}`}>
                                                {rapatDetail.sekretaris.status}
                                            </span>
                                        </div>
                                    )}
                                    {(rapatDetail.peserta || []).map((p, idx) => (
                                        <div key={idx} className="bg-white rounded-lg p-2 flex items-center justify-between border border-gray-100">
                                            <span className="text-sm text-gray-700 truncate max-w-[160px]">{p.nama}</span>
                                            <span className={`w-6 h-6 rounded text-xs font-bold flex items-center justify-center text-white
                                                ${p.status === 'H' ? 'bg-green-500' :
                                                    p.status === 'S' ? 'bg-orange-500' :
                                                        p.status === 'I' ? 'bg-yellow-500' : 'bg-red-500'}`}>
                                                {p.status}
                                            </span>
                                        </div>
                                    ))}
                                    {/* Peserta Eksternal (Tamu Undangan) */}
                                    {(rapatDetail.peserta_eksternal || rapat?.peserta_eksternal || []).map((pe, idx) => (
                                        <div key={`ext-${idx}`} className="bg-blue-50 rounded-lg p-2 flex items-center justify-between border border-blue-100">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">Tamu</span>
                                                <span className="text-sm font-medium text-gray-700 truncate max-w-[100px]">{pe.nama}</span>
                                                {pe.jabatan && <span className="text-xs text-blue-400">({pe.jabatan})</span>}
                                            </div>
                                            <span className="w-6 h-6 rounded text-xs font-bold flex items-center justify-center text-white bg-green-500">H</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="flex-shrink-0 p-4 border-t border-gray-100 flex gap-3 bg-white">
                    <button
                        onClick={onClose}
                        className={`${readOnlyMode ? 'w-full' : 'flex-1'} py-3 border border-gray-300 rounded-xl text-gray-600 font-medium hover:bg-gray-50`}
                    >
                        {readOnlyMode ? 'Tutup' : 'Batal'}
                    </button>
                    {!readOnlyMode && (
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className={`flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 bg-gradient-to-r ${role === 'pimpinan' ? 'from-green-500 to-green-600' : 'from-green-500 to-green-600'} text-white hover:shadow-lg disabled:opacity-50`}
                        >
                            {loading ? (
                                <i className="fas fa-spinner fa-spin"></i>
                            ) : (
                                <>
                                    <i className="fas fa-save"></i>
                                    {alreadyAttended ? 'Update Absensi' : 'Simpan Absensi'}
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* Photo Lightbox */}
            {selectedPhoto && (
                <div
                    className="fixed inset-0 bg-black/90 flex items-center justify-center z-[10000] p-4"
                    onClick={() => setSelectedPhoto(null)}
                >
                    <button
                        onClick={() => setSelectedPhoto(null)}
                        className="absolute top-4 right-4 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30"
                    >
                        <i className="fas fa-times text-xl"></i>
                    </button>
                    <img
                        src={selectedPhoto}
                        alt="Foto Rapat"
                        className="max-w-full max-h-full object-contain rounded-lg"
                        onClick={e => e.stopPropagation()}
                    />
                </div>
            )}
        </div>,
        document.body
    );
}

// Modal Absensi Rapat untuk Sekretaris (Full form) - styled like ModalAbsensiKegiatanPJ
export function ModalAbsensiRapatSekretaris({ rapat, tanggal, pimpinan, pesertaList, onClose, onSuccess, isUnlocked = false }) {
    const [sekretarisStatus, setSekretarisStatus] = useState('A');
    const [sekretarisKeterangan, setSekretarisKeterangan] = useState('');
    const [pimpinanStatus, setPimpinanStatus] = useState('A');
    const [pimpinanKeterangan, setPimpinanKeterangan] = useState('');
    const [pimpinanSelfAttended, setPimpinanSelfAttended] = useState(false);
    const [absensiPeserta, setAbsensiPeserta] = useState([]);
    const [pesertaEksternal, setPesertaEksternal] = useState(rapat?.peserta_eksternal || []);
    const [notulensi, setNotulensi] = useState('');
    const [fotoRapat, setFotoRapat] = useState([]);
    const [loading, setLoading] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [ttdOverrides, setTtdOverrides] = useState({});
    const [showSignatureCanvas, setShowSignatureCanvas] = useState(false);
    const [signatureTarget, setSignatureTarget] = useState(null);
    const [pimpinanExpanded, setPimpinanExpanded] = useState(true);
    const [pesertaExpanded, setPesertaExpanded] = useState(false);
    const [sekretarisName, setSekretarisName] = useState('');
    const [sekretarisNip, setSekretarisNip] = useState('');
    const [loadingExisting, setLoadingExisting] = useState(true);

    useEffect(() => {
        const fetchSekretarisInfo = async () => {
            try {
                const response = await api.get('/guru-panel/dashboard');
                setSekretarisName(response.data.user?.name || '');
                setSekretarisNip(response.data.user?.nip || '');
            } catch (err) {
                console.error('Error fetching sekretaris info:', err);
            }
        };
        fetchSekretarisInfo();
    }, []);

    // Fetch existing absensi data to pre-fill the form
    useEffect(() => {
        const fetchExistingAbsensi = async () => {
            if (!rapat?.id) return;

            try {
                setLoadingExisting(true);
                const response = await api.get(`/guru-panel/rapat/${rapat.id}/absensi`);

                if (response.data.has_absensi && response.data.data) {
                    const data = response.data.data;

                    // Pre-fill sekretaris status
                    if (data.sekretaris_status) {
                        setSekretarisStatus(data.sekretaris_status);
                        setSekretarisKeterangan(data.sekretaris_keterangan || '');
                    }

                    // Pre-fill pimpinan status
                    if (data.pimpinan_status) {
                        setPimpinanStatus(data.pimpinan_status);
                        setPimpinanKeterangan(data.pimpinan_keterangan || '');
                    }

                    // Pre-fill peserta absensi
                    if (data.absensi_peserta && data.absensi_peserta.length > 0) {
                        setAbsensiPeserta(prev => {
                            if (prev.length === 0) {
                                // If no peserta yet, use from absensi data
                                return data.absensi_peserta.map(p => ({
                                    guru_id: p.guru_id,
                                    nama: p.nama || '',
                                    nip: p.nip || '',
                                    status: p.status || 'A',
                                    keterangan: p.keterangan || '',
                                    self_attended: p.self_attended || false
                                }));
                            }
                            // Merge with existing peserta list
                            return prev.map(guru => {
                                const savedPeserta = data.absensi_peserta.find(p => p.guru_id === guru.guru_id);
                                if (savedPeserta) {
                                    return {
                                        ...guru,
                                        status: savedPeserta.status || 'A',
                                        keterangan: savedPeserta.keterangan || '',
                                        self_attended: savedPeserta.self_attended || false
                                    };
                                }
                                return guru;
                            });
                        });
                    }

                    // Pre-fill notulensi
                    if (data.notulensi) {
                        setNotulensi(data.notulensi);
                    }

                    // Pre-fill photos
                    if (data.foto_rapat && data.foto_rapat.length > 0) {
                        setFotoRapat(data.foto_rapat);
                    }
                }
            } catch (err) {
                console.error('Error fetching existing absensi:', err);
            } finally {
                setLoadingExisting(false);
            }
        };

        fetchExistingAbsensi();
    }, [rapat?.id]);

    // Fetch peserta list from API if not provided
    useEffect(() => {
        if (pesertaList && pesertaList.length > 0) {
            // Use the provided pesertaList, exclude pimpinan/sekretaris
            const excludeIds = [rapat?.pimpinan_id, rapat?.sekretaris_id].filter(Boolean);
            setAbsensiPeserta(pesertaList
                .filter(g => !excludeIds.includes(g.id))
                .map(g => ({
                    guru_id: g.id,
                    nama: g.nama,
                    nip: g.nip,
                    status: 'A',
                    keterangan: '',
                    self_attended: false
                })));
        } else if (rapat?.id) {
            // Fetch from detailRapat API
            const fetchPeserta = async () => {
                try {
                    const response = await api.get(`/guru-panel/riwayat/rapat/${rapat.id}/detail`);
                    if (response.data.success) {
                        const data = response.data.data;
                        // Set pimpinan status if available
                        if (data.pimpinan) {
                            setPimpinanStatus(data.pimpinan.status || 'A');
                            setPimpinanSelfAttended(data.pimpinan.status !== 'A');
                        }
                        // Set peserta list from API with their current status
                        if (data.peserta && data.peserta.length > 0) {
                            const excludeIds = [rapat?.pimpinan_id, rapat?.sekretaris_id].filter(Boolean);
                            setAbsensiPeserta(data.peserta
                                .filter(g => g.nama && !g.nama.toLowerCase().includes('semua guru'))
                                .filter(g => !excludeIds.includes(g.id))
                                .map(g => ({
                                    guru_id: g.id,
                                    nama: g.nama,
                                    nip: g.nip,
                                    status: g.status || 'A',
                                    keterangan: '',
                                    self_attended: g.status !== 'A'
                                })));
                        }
                        // Set notulensi if available
                        if (data.notulensi) {
                            setNotulensi(data.notulensi);
                        }
                        // Load existing photos if available
                        if (data.foto_rapat && Array.isArray(data.foto_rapat) && data.foto_rapat.length > 0) {
                            setFotoRapat(data.foto_rapat);
                        }
                    }
                } catch (err) {
                    console.error('Error fetching peserta list:', err);
                }
            };
            fetchPeserta();
        }
    }, [pesertaList, rapat?.id]);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const response = await api.get(`/guru-panel/rapat/${rapat.id}/absensi-peserta`);
                const serverData = response.data;
                if (serverData.pimpinan && serverData.pimpinan.self_attended) {
                    setPimpinanStatus(serverData.pimpinan.status);
                    setPimpinanKeterangan(serverData.pimpinan.keterangan || '');
                    setPimpinanSelfAttended(true);
                }
                if (serverData.peserta && serverData.peserta.length > 0) {
                    setAbsensiPeserta(prev => prev.map(guru => {
                        const serverEntry = serverData.peserta.find(s => s.guru_id == guru.guru_id);
                        if (serverEntry && serverEntry.self_attended) {
                            return { ...guru, status: serverEntry.status, keterangan: serverEntry.keterangan || '', self_attended: true };
                        }
                        return guru;
                    }));
                }
            } catch (err) {
                console.error('Error fetching status:', err);
            }
        };
        fetchStatus();
        const interval = setInterval(fetchStatus, 5000);
        return () => clearInterval(interval);
    }, [rapat.id]);

    const autoHadirSekretaris = () => {
        if (sekretarisStatus === 'A') setSekretarisStatus('H');
    };

    const handleNotulensiChange = (value) => {
        setNotulensi(value);
        autoHadirSekretaris();
    };

    const updatePesertaStatus = (index, status) => {
        const updated = [...absensiPeserta];
        updated[index].status = status;
        if (status !== 'I') updated[index].keterangan = '';
        setAbsensiPeserta(updated);
        autoHadirSekretaris();
    };

    const updatePesertaKeterangan = (index, keterangan) => {
        const updated = [...absensiPeserta];
        updated[index].keterangan = keterangan;
        setAbsensiPeserta(updated);
    };

    const handlePhotoUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        const remainingSlots = 4 - fotoRapat.length;
        const filesToProcess = files.slice(0, remainingSlots);
        if (filesToProcess.length === 0) { alert('Maksimal 4 foto'); return; }
        setUploadingPhoto(true);
        try {
            const compressedPhotos = await Promise.all(filesToProcess.map(file => compressImage(file, 800, 0.6)));
            setFotoRapat(prev => [...prev, ...compressedPhotos]);
            autoHadirSekretaris();
        } catch (err) {
            console.error('Error compressing photos:', err);
            alert('Gagal memproses foto');
        } finally {
            setUploadingPhoto(false);
        }
        e.target.value = '';
    };

    const removePhoto = (index) => {
        setFotoRapat(prev => prev.filter((_, i) => i !== index));
    };

    const pesertaCounts = {
        hadir: absensiPeserta.filter(g => g.status === 'H').length,
        sakit: absensiPeserta.filter(g => g.status === 'S').length,
        izin: absensiPeserta.filter(g => g.status === 'I').length,
        alpha: absensiPeserta.filter(g => g.status === 'A').length,
    };

    const canSubmit = fotoRapat.length >= 2 && notulensi.trim();

    const handleSubmit = async () => {
        if (!canSubmit) {
            if (!notulensi.trim()) { alert('Notulensi rapat wajib diisi'); return; }
            if (fotoRapat.length < 2) { alert('Minimal upload 2 foto dokumentasi rapat'); return; }
        }
        setLoading(true);
        try {
            await api.post('/guru-panel/rapat/absensi-sekretaris', {
                rapat_id: rapat.id,
                sekretaris_status: sekretarisStatus,
                sekretaris_keterangan: sekretarisKeterangan || null,
                pimpinan_status: pimpinanStatus,
                pimpinan_keterangan: pimpinanKeterangan || null,
                absensi_peserta: absensiPeserta.map(g => ({ guru_id: g.guru_id, status: g.status, keterangan: g.keterangan || null })),
                notulensi,
                foto_rapat: fotoRapat,
                peserta_eksternal: pesertaEksternal.filter(pe => pe.nama?.trim()),
                ttd_overrides: Object.keys(ttdOverrides).length > 0 ? ttdOverrides : undefined,
            });
            onSuccess?.();
        } catch (err) {
            console.error('Error submitting absensi:', err);
            alert(err.response?.data?.error || 'Gagal menyimpan absensi');
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (time) => time ? time.substring(0, 5) : '-';

    const handleSignatureSave = (base64) => {
        if (!signatureTarget) return;
        if (signatureTarget.type === 'tamu') {
            const u = [...pesertaEksternal];
            u[signatureTarget.index] = { ...u[signatureTarget.index], ttd: base64 };
            setPesertaEksternal(u);
        } else if (signatureTarget.type === 'guru') {
            setTtdOverrides(prev => ({ ...prev, [signatureTarget.guruId]: base64 }));
        }
    };

    return (
        <>
            {ReactDOM.createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
                    <div className="bg-white rounded-2xl w-full max-w-md flex flex-col shadow-2xl overflow-hidden" style={{ maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className={`${isUnlocked ? 'bg-gradient-to-r from-amber-500 to-amber-600' : 'bg-gradient-to-r from-green-600 to-green-700'} text-white p-4 flex-shrink-0`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><i className={`fas ${isUnlocked ? 'fa-unlock' : 'fa-users'}`}></i></div>
                                    <div>
                                        <h2 className="font-bold text-sm">{isUnlocked ? 'Isi Absensi (Dibuka Kembali)' : (rapat.agenda_rapat || rapat.name)}</h2>
                                        <p className={`${isUnlocked ? 'text-amber-100' : 'text-green-100'} text-xs`}><i className="fas fa-map-marker-alt mr-1"></i>{rapat.tempat || rapat.location || '-'} • {rapat.waktu_mulai ? `${formatTime(rapat.waktu_mulai)} - ${formatTime(rapat.waktu_selesai)}` : (rapat.time || '-')}</p>
                                    </div>
                                </div>
                                <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-lg"><i className="fas fa-times text-xl"></i></button>
                            </div>
                            <div className="flex gap-4 mt-4 text-center">
                                <div className="flex-1"><p className="text-2xl font-bold">{pesertaCounts.hadir}</p><p className={`text-xs ${isUnlocked ? 'text-amber-100' : 'text-green-100'}`}>Hadir</p></div>
                                <div className="flex-1"><p className="text-2xl font-bold">{pesertaCounts.sakit}</p><p className={`text-xs ${isUnlocked ? 'text-amber-100' : 'text-green-100'}`}>Sakit</p></div>
                                <div className="flex-1"><p className="text-2xl font-bold">{pesertaCounts.izin}</p><p className={`text-xs ${isUnlocked ? 'text-amber-100' : 'text-green-100'}`}>Izin</p></div>
                                <div className="flex-1"><p className="text-2xl font-bold">{pesertaCounts.alpha}</p><p className={`text-xs ${isUnlocked ? 'text-amber-100' : 'text-green-100'}`}>Alpha</p></div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {/* Unlocked Info Banner */}
                            {isUnlocked && (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                                    <div className="flex items-start gap-2">
                                        <i className="fas fa-info-circle text-amber-500 mt-0.5"></i>
                                        <div>
                                            <p className="text-sm font-medium text-amber-800">Absensi Dibuka Kembali</p>
                                            <p className="text-xs text-amber-600 mt-1">Admin telah membuka kunci absensi. Anda dapat mengisi data absensi yang terlewat.</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Kehadiran Peserta - Unified List */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                    <i className="fas fa-users text-green-600"></i> Kehadiran Peserta
                                    <span className="ml-auto text-xs font-normal text-gray-400">{absensiPeserta.length + 2} peserta</span>
                                </label>
                                <div className="space-y-1.5">
                                    {/* Sekretaris (Self) */}
                                    <div className="bg-white rounded-lg px-2.5 py-2 border-2 border-indigo-200">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-gray-800 text-xs truncate">{sekretarisName || 'Loading...'}</p>
                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 text-indigo-700 mt-0.5">Sekretaris</span>
                                            </div>
                                            <div className="flex gap-0.5">
                                                {['H', 'S', 'I', 'A'].map(s => (
                                                    <button key={s} onClick={() => setSekretarisStatus(s)} className={`w-7 h-7 rounded-md text-[10px] font-bold transition-all ${sekretarisStatus === s ? s === 'H' ? 'bg-green-500 text-white' : s === 'S' ? 'bg-orange-500 text-white' : s === 'I' ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}>{s}</button>
                                                ))}
                                            </div>
                                        </div>
                                        {(sekretarisStatus === 'I' || sekretarisStatus === 'S') && <input type="text" value={sekretarisKeterangan} onChange={e => setSekretarisKeterangan(e.target.value)} placeholder={`Keterangan ${sekretarisStatus === 'I' ? 'izin' : 'sakit'}...`} className="w-full mt-1 border border-yellow-200 rounded-md p-1.5 text-xs focus:ring-2 focus:ring-yellow-400 bg-yellow-50" />}
                                    </div>

                                    {/* Pimpinan */}
                                    <div className={`bg-white rounded-lg px-2.5 py-2 ${pimpinanSelfAttended ? 'border-2 border-green-400' : 'border-2 border-purple-200'}`}>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-gray-800 text-xs truncate flex items-center gap-1">{pimpinan?.nama || 'Pimpinan'}{pimpinanSelfAttended && <span className="text-[10px] bg-green-100 text-green-600 px-1 py-0.5 rounded-full">Self</span>}</p>
                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-700 mt-0.5">Pimpinan</span>
                                            </div>
                                            <div className="flex gap-0.5">
                                                {['H', 'S', 'I', 'A'].map(s => (
                                                    <button key={s} onClick={() => setPimpinanStatus(s)} className={`w-7 h-7 rounded-md text-[10px] font-bold transition-all ${pimpinanStatus === s ? s === 'H' ? 'bg-green-500 text-white' : s === 'S' ? 'bg-orange-500 text-white' : s === 'I' ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}>{s}</button>
                                                ))}
                                            </div>
                                        </div>
                                        {(pimpinanStatus === 'I' || pimpinanStatus === 'S') && <input type="text" value={pimpinanKeterangan} onChange={e => setPimpinanKeterangan(e.target.value)} placeholder={`Keterangan ${pimpinanStatus === 'I' ? 'izin' : 'sakit'}...`} className="w-full mt-1 border border-yellow-200 rounded-md p-1.5 text-xs focus:ring-2 focus:ring-yellow-400 bg-yellow-50" />}
                                    </div>

                                    {/* Other Peserta */}
                                    {absensiPeserta.map((guru, index) => (
                                        <div key={guru.guru_id} className={`bg-white rounded-lg px-2.5 py-2 ${guru.self_attended ? 'border-2 border-green-400' : 'border border-gray-100'}`}>
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-gray-800 text-xs truncate flex items-center gap-1">{guru.nama}{guru.self_attended && <span className="text-[10px] bg-green-100 text-green-600 px-1 py-0.5 rounded-full">Self</span>}</p>
                                                    <p className="text-[10px] text-gray-400 truncate">{guru.nip || ''}</p>
                                                </div>
                                                <div className="flex gap-0.5">
                                                    {['H', 'S', 'I', 'A'].map(s => (
                                                        <button key={s} onClick={() => updatePesertaStatus(index, s)} className={`w-7 h-7 rounded-md text-[10px] font-bold transition-all ${guru.status === s ? s === 'H' ? 'bg-green-500 text-white' : s === 'S' ? 'bg-orange-500 text-white' : s === 'I' ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}>{s}</button>
                                                    ))}
                                                </div>
                                            </div>
                                            {(guru.status === 'I' || guru.status === 'S') && <input type="text" value={guru.keterangan} onChange={e => updatePesertaKeterangan(index, e.target.value)} placeholder={`Keterangan ${guru.status === 'I' ? 'izin' : 'sakit'}...`} className="w-full mt-1 border border-yellow-200 rounded-md p-1.5 text-xs focus:ring-2 focus:ring-yellow-400 bg-yellow-50" />}
                                        </div>
                                    ))}
                                </div>

                                {/* Peserta Eksternal (Tamu Undangan) */}
                                <div className="mt-3">
                                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
                                        <i className="fas fa-user-tie text-blue-500"></i> Tamu Undangan ({pesertaEksternal.length})
                                    </label>
                                    <div className="space-y-1">
                                        {pesertaEksternal.map((pe, idx) => (
                                            <div key={idx} className="bg-blue-50 rounded-lg px-2.5 py-1.5 border border-blue-100">
                                                <div className="flex items-center gap-1.5">
                                                    <input type="text" value={pe.nama} onChange={(e) => { const u = [...pesertaEksternal]; u[idx] = { ...u[idx], nama: e.target.value }; setPesertaEksternal(u); }} placeholder="Nama" className="flex-1 border border-blue-200 rounded px-2 py-1 text-xs bg-white focus:ring-1 focus:ring-blue-400" />
                                                    <input type="text" value={pe.jabatan || ''} onChange={(e) => { const u = [...pesertaEksternal]; u[idx] = { ...u[idx], jabatan: e.target.value }; setPesertaEksternal(u); }} placeholder="Jabatan" className="flex-1 border border-blue-200 rounded px-2 py-1 text-xs bg-white focus:ring-1 focus:ring-blue-400" />
                                                    <button type="button" onClick={() => { setSignatureTarget({ type: 'tamu', index: idx }); setShowSignatureCanvas(true); }} className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 cursor-pointer ${pe.ttd ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-500 hover:bg-indigo-100 hover:text-indigo-600'}`} title="Tanda tangan"><i className="fas fa-pen-fancy text-[10px]"></i></button>
                                                    <span className="text-[10px] font-bold bg-green-500 text-white w-6 h-6 rounded flex items-center justify-center flex-shrink-0">H</span>
                                                    <button type="button" onClick={() => setPesertaEksternal(pesertaEksternal.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 cursor-pointer flex-shrink-0"><i className="fas fa-times text-xs"></i></button>
                                                </div>
                                                {pe.ttd && <div className="mt-1 bg-white rounded p-1 border border-blue-100"><img src={pe.ttd} alt="TTD" className="h-8 object-contain" /></div>}
                                            </div>
                                        ))}
                                    </div>
                                    <button type="button" onClick={() => setPesertaEksternal([...pesertaEksternal, { nama: '', jabatan: '' }])} className="mt-1.5 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer">
                                        <i className="fas fa-plus-circle"></i> Tambah Tamu Undangan
                                    </button>
                                </div>
                            </div>

                            {/* Notulensi */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Notulensi Rapat <span className="text-red-500">*</span></label>
                                <textarea value={notulensi} onChange={e => handleNotulensiChange(e.target.value)} placeholder="Isi notulensi/hasil rapat..." className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-green-400 min-h-[80px] resize-y" />
                            </div>

                            {/* Dokumentasi Rapat */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Dokumentasi Rapat <span className="text-red-500">*</span> <span className="font-normal text-gray-400 ml-1">(Min 2, Max 4)</span></label>
                                {fotoRapat.length > 0 && (
                                    <div className="grid grid-cols-2 gap-2 mb-2">
                                        {fotoRapat.map((photo, index) => (
                                            <div key={index} className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
                                                <img src={photo} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
                                                <button onClick={() => removePhoto(index)} className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"><i className="fas fa-times"></i></button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {fotoRapat.length < 4 && (
                                    <div className="space-y-2">
                                        {uploadingPhoto ? (
                                            <div className="flex items-center justify-center gap-2 text-gray-500 py-4">
                                                <i className="fas fa-spinner fa-spin"></i>
                                                <span className="text-sm">Memproses foto...</span>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-2">
                                                {/* Camera Capture Button */}
                                                <label className="flex flex-col items-center justify-center border-2 border-dashed border-green-300 rounded-xl p-4 cursor-pointer hover:border-green-500 hover:bg-green-50 transition-all bg-green-50/30">
                                                    <input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} className="hidden" disabled={uploadingPhoto} />
                                                    <i className="fas fa-camera text-green-500 text-2xl mb-2"></i>
                                                    <span className="text-xs font-medium text-green-600">Ambil Foto</span>
                                                </label>

                                                {/* File Gallery Button */}
                                                <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-4 cursor-pointer hover:border-green-400 hover:bg-green-50 transition-all">
                                                    <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" disabled={uploadingPhoto} />
                                                    <i className="fas fa-images text-gray-400 text-2xl mb-2"></i>
                                                    <span className="text-xs font-medium text-gray-500">Pilih File</span>
                                                </label>
                                            </div>
                                        )}
                                        <p className="text-xs text-gray-400 text-center">{fotoRapat.length}/4 foto</p>
                                    </div>
                                )}
                                {fotoRapat.length < 2 && <p className="text-xs text-red-500 mt-1"><i className="fas fa-exclamation-circle mr-1"></i>Minimal upload 2 foto dokumentasi rapat</p>}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex-shrink-0 p-4 border-t border-gray-100 flex gap-3 bg-white">
                            <button onClick={onClose} className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-600 font-medium hover:bg-gray-50">Batal</button>
                            <button onClick={handleSubmit} disabled={loading || !canSubmit} className={`flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 ${canSubmit ? 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:shadow-lg' : 'bg-gray-300 text-gray-500 cursor-not-allowed'} disabled:opacity-50`}>
                                {loading ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-save"></i>Simpan Absensi</>}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            <SignatureCanvas
                isOpen={showSignatureCanvas}
                onClose={() => { setShowSignatureCanvas(false); setSignatureTarget(null); }}
                onSave={handleSignatureSave}
                title="Tanda Tangan Tamu"
            />
        </>
    );
}

// Default export for compatibility with default import
const RapatModals = {
    ModalRapatBelumMulai,
    ModalRapatSudahAbsen,
    ModalAbsensiRapatPimpinan,
    ModalAbsensiRapatPeserta,
    ModalAbsensiRapatSekretaris,
};

export default RapatModals;
