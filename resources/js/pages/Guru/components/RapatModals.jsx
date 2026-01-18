import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import api from '../../../lib/axios';

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

// Modal Rapat Sudah Absen
export function ModalRapatSudahAbsen({ rapat, onClose }) {
    const modalContent = (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-sm animate-slideUp" onClick={e => e.stopPropagation()}>
                <div className="p-6 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="fas fa-check-circle text-green-500 text-2xl"></i>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">Absensi Sudah Dilakukan</h3>
                    <p className="text-sm text-gray-500 mb-1">{rapat.agenda_rapat || rapat.name}</p>
                    <p className="text-xs text-green-600">
                        <i className="fas fa-check mr-1"></i>
                        Anda sudah melakukan absensi untuk rapat ini
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

// Modal Absensi Rapat untuk Pimpinan (Self-attend only)
export function ModalAbsensiRapatPimpinan({ rapat, onClose, onSuccess }) {
    const [status, setStatus] = useState('H');
    const [keterangan, setKeterangan] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await api.post('/guru-panel/rapat/absensi-pimpinan', {
                rapat_id: rapat.id,
                status,
                keterangan: keterangan || null,
            });
            onSuccess?.();
        } catch (err) {
            console.error('Error submitting absensi pimpinan:', err);
            alert(err.response?.data?.error || 'Gagal menyimpan absensi');
        } finally {
            setLoading(false);
        }
    };

    const modalContent = (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-sm animate-slideUp max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="bg-gradient-to-r from-green-600 to-green-700 p-4 rounded-t-2xl text-white">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-lg">Absensi Pimpinan Rapat</h3>
                        <button onClick={onClose} className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                    <p className="text-green-200 text-sm">{rapat.agenda_rapat || rapat.name}</p>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    {/* Status Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Status Kehadiran Anda</label>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { value: 'H', label: 'Hadir', color: 'green' },
                                { value: 'I', label: 'Izin', color: 'yellow' },
                                { value: 'A', label: 'Alpha', color: 'red' },
                            ].map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => setStatus(opt.value)}
                                    className={`py-3 rounded-xl font-medium text-sm transition-all ${status === opt.value
                                        ? `bg-${opt.color}-500 text-white shadow-lg`
                                        : `bg-${opt.color}-100 text-${opt.color}-700`
                                        }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Keterangan */}
                    {status !== 'H' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Keterangan</label>
                            <input
                                type="text"
                                value={keterangan}
                                onChange={(e) => setKeterangan(e.target.value)}
                                placeholder="Alasan izin/tidak hadir"
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                            />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100">
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-4 rounded-xl font-semibold disabled:opacity-50"
                    >
                        {loading ? (
                            <span><i className="fas fa-spinner fa-spin mr-2"></i>Menyimpan...</span>
                        ) : (
                            <span><i className="fas fa-check mr-2"></i>Simpan Absensi</span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
    return ReactDOM.createPortal(modalContent, document.body);
}

// Modal Absensi Rapat untuk Peserta/Guru (Self-attend only) - styled like ModalAbsensiKegiatanPendamping
export function ModalAbsensiRapatPeserta({ rapat, tanggal, role, onClose, onSuccess }) {
    const [status, setStatus] = useState('A'); // Default Alpha like pendamping
    const [keterangan, setKeterangan] = useState('');
    const [loading, setLoading] = useState(false);
    const [guruName, setGuruName] = useState('');
    const [guruNip, setGuruNip] = useState('');
    const [alreadyAttended, setAlreadyAttended] = useState(false);
    const [existingStatus, setExistingStatus] = useState(null);

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

    // Check if already attended
    useEffect(() => {
        const checkStatus = async () => {
            try {
                const response = await api.get(`/guru-panel/rapat/${rapat.id}/check-status`);
                if (response.data.attended) {
                    setAlreadyAttended(true);
                    setExistingStatus(response.data.status);
                    setStatus(response.data.status);
                    setKeterangan(response.data.keterangan || '');
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
                <div className={`bg-gradient-to-r ${role === 'pimpinan' ? 'from-green-600 to-green-700' : 'from-green-600 to-green-700'} text-white p-4 flex-shrink-0`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                <i className="fas fa-users"></i>
                            </div>
                            <div>
                                <h2 className="font-bold text-sm">{rapat.agenda_rapat || rapat.name}</h2>
                                <p className={`${role === 'pimpinan' ? 'text-green-100' : 'text-green-100'} text-xs`}>Absensi {roleInfo.label}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-lg transition-colors">
                            <i className="fas fa-times text-xl"></i>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                                <p className="text-sm text-gray-800 font-medium">{tanggal || '-'}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <i className="fas fa-clock text-gray-400 mt-0.5 w-4"></i>
                            <div>
                                <p className="text-xs text-gray-500">Waktu</p>
                                <p className="text-sm text-gray-800 font-medium">{formatTime(rapat.waktu_mulai)} - {formatTime(rapat.waktu_selesai)}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <i className="fas fa-map-marker-alt text-gray-400 mt-0.5 w-4"></i>
                            <div>
                                <p className="text-xs text-gray-500">Tempat</p>
                                <p className="text-sm text-gray-800 font-medium">{rapat.tempat || rapat.location || '-'}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <i className="fas fa-user-edit text-gray-400 mt-0.5 w-4"></i>
                            <div>
                                <p className="text-xs text-gray-500">Sekretaris</p>
                                <p className="text-sm text-gray-800 font-medium">{rapat.sekretaris?.nama || '-'}</p>
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
                                            onClick={() => setStatus(s)}
                                            className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${status === s
                                                ? s === 'H' ? 'bg-green-500 text-white shadow-md'
                                                    : s === 'I' ? 'bg-yellow-500 text-white shadow-md'
                                                        : 'bg-red-500 text-white shadow-md'
                                                : s === 'H' ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                                    : s === 'I' ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
                                                        : 'bg-red-100 text-red-600 hover:bg-red-200'
                                                }`}
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
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex-shrink-0 p-4 border-t border-gray-100 flex gap-3 bg-white">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-600 font-medium hover:bg-gray-50"
                    >
                        Batal
                    </button>
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
                </div>
            </div>
        </div>,
        document.body
    );
}

// Modal Absensi Rapat untuk Sekretaris (Full form) - styled like ModalAbsensiKegiatanPJ
export function ModalAbsensiRapatSekretaris({ rapat, tanggal, pimpinan, pesertaList, onClose, onSuccess }) {
    const [sekretarisStatus, setSekretarisStatus] = useState('A');
    const [sekretarisKeterangan, setSekretarisKeterangan] = useState('');
    const [pimpinanStatus, setPimpinanStatus] = useState('A');
    const [pimpinanKeterangan, setPimpinanKeterangan] = useState('');
    const [pimpinanSelfAttended, setPimpinanSelfAttended] = useState(false);
    const [absensiPeserta, setAbsensiPeserta] = useState([]);
    const [notulensi, setNotulensi] = useState('');
    const [fotoRapat, setFotoRapat] = useState([]);
    const [loading, setLoading] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [pimpinanExpanded, setPimpinanExpanded] = useState(true);
    const [pesertaExpanded, setPesertaExpanded] = useState(false);
    const [sekretarisName, setSekretarisName] = useState('');
    const [sekretarisNip, setSekretarisNip] = useState('');

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

    useEffect(() => {
        setAbsensiPeserta(pesertaList.map(g => ({
            guru_id: g.id,
            nama: g.nama,
            nip: g.nip,
            status: 'A',
            keterangan: '',
            self_attended: false
        })));
    }, [pesertaList]);

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

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-md flex flex-col shadow-2xl overflow-hidden" style={{ maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><i className="fas fa-users"></i></div>
                            <div>
                                <h2 className="font-bold text-sm">{rapat.agenda_rapat || rapat.name}</h2>
                                <p className="text-green-100 text-xs"><i className="fas fa-map-marker-alt mr-1"></i>{rapat.tempat || '-'} • {formatTime(rapat.waktu_mulai)} - {formatTime(rapat.waktu_selesai)}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-lg"><i className="fas fa-times text-xl"></i></button>
                    </div>
                    <div className="flex gap-6 mt-4 text-center">
                        <div className="flex-1"><p className="text-2xl font-bold">{pesertaCounts.hadir}</p><p className="text-xs text-green-100">Hadir</p></div>
                        <div className="flex-1"><p className="text-2xl font-bold">{pesertaCounts.izin}</p><p className="text-xs text-green-100">Izin</p></div>
                        <div className="flex-1"><p className="text-2xl font-bold">{pesertaCounts.alpha}</p><p className="text-xs text-green-100">Alpha</p></div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Info Badge */}
                    <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                        <div className="flex items-center gap-2 text-green-700 text-sm font-medium"><i className="fas fa-user-edit"></i><span>Anda adalah Sekretaris Rapat</span></div>
                    </div>

                    {/* Read-only Info */}
                    <div className="bg-gray-50 rounded-xl p-3 space-y-2 text-sm">
                        <div className="flex items-start gap-2"><i className="fas fa-user-tie text-gray-400 mt-0.5 w-4"></i><div><span className="text-gray-500">Pimpinan: </span><span className="text-gray-700">{pimpinan?.nama || '-'}</span></div></div>
                        <div className="flex items-start gap-2"><i className="fas fa-users text-gray-400 mt-0.5 w-4"></i><div><span className="text-gray-500">Peserta: </span><span className="text-gray-700">{pesertaList.length} guru</span></div></div>
                    </div>

                    {/* Sekretaris Card */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Kehadiran Anda</label>
                        <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-lg flex-shrink-0">{sekretarisName?.charAt(0)?.toUpperCase() || 'S'}</div>
                                <div className="flex-1 min-w-0"><p className="font-bold text-gray-800 truncate">{sekretarisName || 'Loading...'}</p><p className="text-xs text-gray-400">{sekretarisNip || 'Sekretaris'}</p></div>
                                <div className="flex gap-1.5">
                                    {['H', 'I', 'A'].map(s => (
                                        <button key={s} onClick={() => setSekretarisStatus(s)} className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${sekretarisStatus === s ? s === 'H' ? 'bg-green-500 text-white shadow-md' : s === 'I' ? 'bg-yellow-500 text-white shadow-md' : 'bg-red-500 text-white shadow-md' : s === 'H' ? 'bg-green-100 text-green-600 hover:bg-green-200' : s === 'I' ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}>{s}</button>
                                    ))}
                                </div>
                            </div>
                            {sekretarisStatus === 'I' && <input type="text" value={sekretarisKeterangan} onChange={e => setSekretarisKeterangan(e.target.value)} placeholder="Keterangan izin..." className="w-full mt-2 border border-yellow-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-yellow-400 bg-yellow-50" />}
                        </div>
                    </div>

                    {/* Pimpinan Section - Collapsible */}
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                        <button type="button" onClick={() => setPimpinanExpanded(!pimpinanExpanded)} className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-pink-50 hover:from-green-100 hover:to-pink-100 transition-all">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center"><i className="fas fa-user-tie text-white"></i></div>
                                <div className="text-left"><p className="font-semibold text-gray-800">Pimpinan Rapat</p><p className="text-xs text-gray-500">{pimpinan?.nama || '-'}{pimpinanSelfAttended && <span className="text-green-600 ml-1">• Sudah absen mandiri</span>}</p></div>
                            </div>
                            <div className={`w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center transition-transform duration-300 ${pimpinanExpanded ? 'rotate-180' : ''}`}><i className="fas fa-chevron-down text-gray-500 text-sm"></i></div>
                        </button>
                        <div className={`transition-all duration-300 overflow-hidden ${pimpinanExpanded ? 'max-h-[200px] opacity-100' : 'max-h-0 opacity-0'}`}>
                            <div className="p-3">
                                <div className={`bg-white rounded-xl p-3 ${pimpinanSelfAttended ? 'border-2 border-green-400 shadow-sm' : 'border border-gray-100'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${pimpinanSelfAttended ? 'bg-green-100 text-green-600' : 'bg-green-100 text-green-600'}`}>{pimpinanSelfAttended ? <i className="fas fa-check"></i> : pimpinan?.nama?.charAt(0)?.toUpperCase() || 'P'}</div>
                                        <div className="flex-1 min-w-0"><p className="font-semibold text-gray-800 text-sm truncate flex items-center gap-1">{pimpinan?.nama || 'Pimpinan'}{pimpinanSelfAttended && <span className="text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full">Self</span>}</p><p className="text-xs text-gray-400">{pimpinan?.nip || 'Pimpinan Rapat'}</p></div>
                                        <div className="flex gap-1">
                                            {['H', 'I', 'A'].map(s => (
                                                <button key={s} onClick={() => setPimpinanStatus(s)} className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${pimpinanStatus === s ? s === 'H' ? 'bg-green-500 text-white' : s === 'I' ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white' : s === 'H' ? 'bg-green-100 text-green-600 hover:bg-green-200' : s === 'I' ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}>{s}</button>
                                            ))}
                                        </div>
                                    </div>
                                    {pimpinanStatus === 'I' && <input type="text" value={pimpinanKeterangan} onChange={e => setPimpinanKeterangan(e.target.value)} placeholder="Keterangan izin..." className="w-full mt-2 border border-yellow-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-yellow-400 bg-yellow-50" />}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Peserta Section - Collapsible */}
                    {absensiPeserta.length > 0 && (
                        <div className="border border-gray-200 rounded-xl overflow-hidden">
                            <button type="button" onClick={() => setPesertaExpanded(!pesertaExpanded)} className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center"><i className="fas fa-users text-white"></i></div>
                                    <div className="text-left"><p className="font-semibold text-gray-800">Peserta Rapat</p><p className="text-xs text-gray-500"><span className="text-green-600">{pesertaCounts.hadir} hadir</span> • <span className="text-yellow-600">{pesertaCounts.izin} izin</span> • <span className="text-red-600">{pesertaCounts.alpha} alpha</span> • <span className="text-green-600">{absensiPeserta.filter(g => g.self_attended).length} mandiri</span></p></div>
                                </div>
                                <div className={`w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center transition-transform duration-300 ${pesertaExpanded ? 'rotate-180' : ''}`}><i className="fas fa-chevron-down text-gray-500 text-sm"></i></div>
                            </button>
                            <div className={`transition-all duration-300 overflow-hidden ${pesertaExpanded ? 'max-h-[350px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                <div className="p-3 space-y-2 max-h-[350px] overflow-y-auto">
                                    {absensiPeserta.map((guru, index) => (
                                        <div key={guru.guru_id} className={`bg-white rounded-xl p-3 ${guru.self_attended ? 'border-2 border-green-400 shadow-sm' : 'border border-gray-100'}`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${guru.self_attended ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>{guru.self_attended ? <i className="fas fa-check"></i> : guru.nama?.charAt(0)?.toUpperCase() || 'G'}</div>
                                                <div className="flex-1 min-w-0"><p className="font-semibold text-gray-800 text-sm truncate flex items-center gap-1">{guru.nama}{guru.self_attended && <span className="text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full">Self</span>}</p><p className="text-xs text-gray-400">{guru.nip || 'Peserta'}</p></div>
                                                <div className="flex gap-1">
                                                    {['H', 'I', 'A'].map(s => (
                                                        <button key={s} onClick={() => updatePesertaStatus(index, s)} className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${guru.status === s ? s === 'H' ? 'bg-green-500 text-white' : s === 'I' ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white' : s === 'H' ? 'bg-green-100 text-green-600 hover:bg-green-200' : s === 'I' ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}>{s}</button>
                                                    ))}
                                                </div>
                                            </div>
                                            {guru.status === 'I' && <input type="text" value={guru.keterangan} onChange={e => updatePesertaKeterangan(index, e.target.value)} placeholder="Keterangan izin..." className="w-full mt-2 border border-yellow-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-yellow-400 bg-yellow-50" />}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

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
                            <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-4 cursor-pointer hover:border-green-400 hover:bg-green-50 transition-all">
                                <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" disabled={uploadingPhoto} />
                                {uploadingPhoto ? <div className="flex items-center gap-2 text-gray-500"><i className="fas fa-spinner fa-spin"></i><span className="text-sm">Memproses foto...</span></div> : <><i className="fas fa-camera text-gray-400 text-2xl mb-2"></i><span className="text-sm text-gray-500">Klik untuk upload foto</span><span className="text-xs text-gray-400">{fotoRapat.length}/4 foto</span></>}
                            </label>
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
    );
}
