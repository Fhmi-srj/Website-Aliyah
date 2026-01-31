import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import api from '../../../lib/axios';

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

// Modal Absensi Kegiatan untuk Penanggung Jawab
export function ModalAbsensiKegiatanPJ({ kegiatan, tanggal, guruPendamping, siswaList, onClose, onSuccess, guruName, guruNip }) {
    const [pjStatus, setPjStatus] = useState('A'); // Default Alpha
    const [pjKeterangan, setPjKeterangan] = useState('');
    const [absensiPendamping, setAbsensiPendamping] = useState([]);
    const [absensiSiswa, setAbsensiSiswa] = useState([]);
    const [beritaAcara, setBeritaAcara] = useState('');
    const [fotoKegiatan, setFotoKegiatan] = useState([]); // Array of base64
    const [loading, setLoading] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [activeKelas, setActiveKelas] = useState(null);
    const [pendampingExpanded, setPendampingExpanded] = useState(true);
    const [siswaExpanded, setSiswaExpanded] = useState(false);

    // Get unique kelas list from siswaList
    const kelasList = [...new Set(siswaList.map(s => s.kelas))].filter(Boolean).sort();

    useEffect(() => {
        // Initialize absensi pendamping (default Alpha)
        setAbsensiPendamping(guruPendamping.map(g => ({
            guru_id: g.id,
            nama: g.nama,
            nip: g.nip,
            status: 'A',
            keterangan: '',
            self_attended: false
        })));

        // Initialize absensi siswa (default Hadir)
        setAbsensiSiswa(siswaList.map(s => ({
            siswa_id: s.id,
            nama: s.nama,
            nis: s.nis,
            kelas: s.kelas,
            status: 'H',
            keterangan: ''
        })));
    }, [guruPendamping, siswaList]);

    // Polling for realtime pendamping status updates
    useEffect(() => {
        const fetchPendampingStatus = async () => {
            try {
                const response = await api.get(`/guru-panel/kegiatan/${kegiatan.id}/absensi-pendamping`);
                const serverData = response.data.data || [];

                if (serverData.length > 0) {
                    setAbsensiPendamping(prev => prev.map(guru => {
                        const serverEntry = serverData.find(s => s.guru_id == guru.guru_id);
                        if (serverEntry && serverEntry.self_attended) {
                            return {
                                ...guru,
                                status: serverEntry.status,
                                keterangan: serverEntry.keterangan || '',
                                self_attended: true
                            };
                        }
                        return guru;
                    }));
                }
            } catch (err) {
                console.error('Error fetching pendamping status:', err);
            }
        };

        // Fetch immediately
        fetchPendampingStatus();

        // Poll every 5 seconds
        const interval = setInterval(fetchPendampingStatus, 5000);

        return () => clearInterval(interval);
    }, [kegiatan.id]);

    // Auto-hadir PJ when any field changes
    const autoHadirPj = () => {
        if (pjStatus === 'A') setPjStatus('H');
    };

    const handleBeritaAcaraChange = (value) => {
        setBeritaAcara(value);
        autoHadirPj();
    };

    const updatePendampingStatus = (index, status) => {
        const updated = [...absensiPendamping];
        updated[index].status = status;
        if (status !== 'I') updated[index].keterangan = '';
        setAbsensiPendamping(updated);
        autoHadirPj();
    };

    const updatePendampingKeterangan = (index, keterangan) => {
        const updated = [...absensiPendamping];
        updated[index].keterangan = keterangan;
        setAbsensiPendamping(updated);
    };

    const updateSiswaStatus = (index, status) => {
        const updated = [...absensiSiswa];
        updated[index].status = status;
        if (status !== 'I') updated[index].keterangan = '';
        setAbsensiSiswa(updated);
        autoHadirPj();
    };

    const updateSiswaKeterangan = (index, keterangan) => {
        const updated = [...absensiSiswa];
        updated[index].keterangan = keterangan;
        setAbsensiSiswa(updated);
    };

    // Handle photo upload with compression
    const handlePhotoUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const remainingSlots = 4 - fotoKegiatan.length;
        const filesToProcess = files.slice(0, remainingSlots);

        if (filesToProcess.length === 0) {
            alert('Maksimal 4 foto');
            return;
        }

        setUploadingPhoto(true);
        try {
            const compressedPhotos = await Promise.all(
                filesToProcess.map(file => compressImage(file, 800, 0.6))
            );
            setFotoKegiatan(prev => [...prev, ...compressedPhotos]);
            autoHadirPj();
        } catch (err) {
            console.error('Error compressing photos:', err);
            alert('Gagal memproses foto');
        } finally {
            setUploadingPhoto(false);
        }
        e.target.value = '';
    };

    const removePhoto = (index) => {
        setFotoKegiatan(prev => prev.filter((_, i) => i !== index));
    };

    // Counts for header
    const siswaCounts = {
        hadir: absensiSiswa.filter(s => s.status === 'H').length,
        izin: absensiSiswa.filter(s => s.status === 'I').length,
        alpha: absensiSiswa.filter(s => s.status === 'A').length,
    };

    const canSubmit = fotoKegiatan.length >= 2;

    const handleSubmit = async () => {
        if (!canSubmit) {
            alert('Minimal upload 2 foto kegiatan');
            return;
        }

        setLoading(true);
        try {
            await api.post('/guru-panel/kegiatan/absensi', {
                kegiatan_id: kegiatan.id,
                pj_status: pjStatus,
                pj_keterangan: pjKeterangan || null,
                absensi_pendamping: absensiPendamping.map(p => ({
                    guru_id: p.guru_id,
                    status: p.status,
                    keterangan: p.keterangan || null
                })),
                absensi_siswa: absensiSiswa.map(s => ({
                    siswa_id: s.siswa_id,
                    status: s.status,
                    keterangan: s.keterangan || null
                })),
                berita_acara: beritaAcara || null,
                foto_kegiatan: fotoKegiatan
            });
            onSuccess();
        } catch (err) {
            console.error('Error saving absensi:', err);
            alert(err.response?.data?.error || 'Gagal menyimpan absensi');
        } finally {
            setLoading(false);
        }
    };

    // Format time
    const formatTime = (datetime) => {
        if (!datetime) return '-';
        const d = new Date(datetime);
        return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    };

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
                {/* Fixed Header */}
                <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                <i className="fas fa-calendar-check"></i>
                            </div>
                            <div>
                                <h2 className="font-bold text-sm">{kegiatan.nama_kegiatan}</h2>
                                <p className="text-green-100 text-xs">
                                    <i className="fas fa-map-marker-alt mr-1"></i>{kegiatan.tempat || '-'} • {formatTime(kegiatan.waktu_mulai)} - {formatTime(kegiatan.waktu_berakhir)}
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-lg transition-colors">
                            <i className="fas fa-times text-xl"></i>
                        </button>
                    </div>

                    {/* Counter */}
                    <div className="flex gap-6 mt-4 text-center">
                        <div className="flex-1">
                            <p className="text-2xl font-bold">{siswaCounts.hadir}</p>
                            <p className="text-xs text-green-100">Hadir</p>
                        </div>
                        <div className="flex-1">
                            <p className="text-2xl font-bold">{siswaCounts.izin}</p>
                            <p className="text-xs text-green-100">Izin</p>
                        </div>
                        <div className="flex-1">
                            <p className="text-2xl font-bold">{siswaCounts.alpha}</p>
                            <p className="text-xs text-green-100">Alpha</p>
                        </div>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Info Badge - Penanggung Jawab */}
                    <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                        <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
                            <i className="fas fa-user-tie"></i>
                            <span>Anda adalah Penanggung Jawab Kegiatan</span>
                        </div>
                    </div>

                    {/* Info Read-only */}
                    <div className="bg-gray-50 rounded-xl p-3 space-y-2 text-sm">
                        <div className="flex items-start gap-2">
                            <i className="fas fa-users text-gray-400 mt-0.5 w-4"></i>
                            <div>
                                <span className="text-gray-500">Guru Pendamping: </span>
                                <span className="text-gray-700">{guruPendamping.map(g => g.nama).join(', ') || '-'}</span>
                            </div>
                        </div>
                        <div className="flex items-start gap-2">
                            <i className="fas fa-user-graduate text-gray-400 mt-0.5 w-4"></i>
                            <div>
                                <span className="text-gray-500">Peserta: </span>
                                <span className="text-gray-700">{siswaList.length} siswa</span>
                            </div>
                        </div>
                    </div>

                    {/* Absensi PJ Card */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Kehadiran Anda</label>
                        <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-lg flex-shrink-0">
                                    {guruName?.charAt(0)?.toUpperCase() || 'G'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-gray-800 truncate">{guruName}</p>
                                    <p className="text-xs text-gray-400">{guruNip || 'Penanggung Jawab'}</p>
                                </div>
                                <div className="flex gap-1.5">
                                    {['H', 'I', 'A'].map(status => (
                                        <button
                                            key={status}
                                            onClick={() => setPjStatus(status)}
                                            className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${pjStatus === status
                                                ? status === 'H' ? 'bg-green-500 text-white shadow-md'
                                                    : status === 'I' ? 'bg-yellow-500 text-white shadow-md'
                                                        : 'bg-red-500 text-white shadow-md'
                                                : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                                                }`}
                                        >{status}</button>
                                    ))}
                                </div>
                            </div>
                            {pjStatus === 'I' && (
                                <input
                                    type="text"
                                    value={pjKeterangan}
                                    onChange={e => setPjKeterangan(e.target.value)}
                                    placeholder="Keterangan izin..."
                                    className="w-full mt-2 border border-yellow-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-yellow-400 focus:border-transparent bg-yellow-50"
                                />
                            )}
                        </div>
                    </div>

                    {/* Absensi Guru Pendamping Section - Collapsible */}
                    {absensiPendamping.length > 0 && (
                        <div className="border border-gray-200 rounded-xl overflow-hidden">
                            {/* Collapsible Header */}
                            <button
                                type="button"
                                onClick={() => setPendampingExpanded(!pendampingExpanded)}
                                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-pink-50 hover:from-green-100 hover:to-pink-100 transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
                                        <i className="fas fa-chalkboard-teacher text-white"></i>
                                    </div>
                                    <div className="text-left">
                                        <p className="font-semibold text-gray-800">Guru Pendamping</p>
                                        <p className="text-xs text-gray-500">
                                            {absensiPendamping.length} guru
                                            <span className="mx-1">•</span>
                                            <span className="text-green-600">{absensiPendamping.filter(g => g.self_attended).length} sudah absen mandiri</span>
                                        </p>
                                    </div>
                                </div>
                                <div className={`w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center transition-transform duration-300 ${pendampingExpanded ? 'rotate-180' : ''}`}>
                                    <i className="fas fa-chevron-down text-gray-500 text-sm"></i>
                                </div>
                            </button>

                            {/* Collapsible Content */}
                            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${pendampingExpanded ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                <div className="p-3 space-y-2 max-h-[300px] overflow-y-auto">
                                    {absensiPendamping.map((guru, index) => (
                                        <div
                                            key={guru.guru_id}
                                            className={`bg-white rounded-xl p-3 ${guru.self_attended
                                                ? 'border-2 border-green-400 shadow-sm'
                                                : 'border border-gray-100'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold flex-shrink-0 ${guru.self_attended
                                                    ? 'bg-green-100 text-green-600'
                                                    : 'bg-green-100 text-green-600'}`}>
                                                    {guru.self_attended ? (
                                                        <i className="fas fa-check"></i>
                                                    ) : (
                                                        guru.nama?.charAt(0)?.toUpperCase() || 'G'
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-gray-800 text-sm truncate flex items-center gap-1">
                                                        {guru.nama}
                                                        {guru.self_attended && (
                                                            <span className="text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full">
                                                                Self
                                                            </span>
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-gray-400">{guru.nip || 'Pendamping'}</p>
                                                </div>
                                                <div className="flex gap-1">
                                                    {['H', 'I', 'A'].map(status => (
                                                        <button
                                                            key={status}
                                                            onClick={() => updatePendampingStatus(index, status)}
                                                            className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${guru.status === status
                                                                ? status === 'H' ? 'bg-green-500 text-white'
                                                                    : status === 'I' ? 'bg-yellow-500 text-white'
                                                                        : 'bg-red-500 text-white'
                                                                : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                                                                }`}
                                                        >{status}</button>
                                                    ))}
                                                </div>
                                            </div>
                                            {guru.status === 'I' && (
                                                <input
                                                    type="text"
                                                    value={guru.keterangan}
                                                    onChange={e => updatePendampingKeterangan(index, e.target.value)}
                                                    placeholder="Keterangan izin..."
                                                    className="w-full mt-2 border border-yellow-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-yellow-400 focus:border-transparent bg-yellow-50"
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Absensi Siswa Section - Collapsible */}
                    {absensiSiswa.length > 0 && (
                        <div className="border border-gray-200 rounded-xl overflow-hidden">
                            {/* Collapsible Header */}
                            <button
                                type="button"
                                onClick={() => setSiswaExpanded(!siswaExpanded)}
                                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-cyan-50 hover:from-green-100 hover:to-cyan-100 transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
                                        <i className="fas fa-user-graduate text-white"></i>
                                    </div>
                                    <div className="text-left">
                                        <p className="font-semibold text-gray-800">
                                            {kelasList.length === 1 ? `Siswa ${kelasList[0]}` : 'Siswa Peserta'}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            <span className="text-green-600">{siswaCounts.hadir} hadir</span>
                                            <span className="mx-1">•</span>
                                            <span className="text-yellow-600">{siswaCounts.izin} izin</span>
                                            <span className="mx-1">•</span>
                                            <span className="text-red-600">{siswaCounts.alpha} alpha</span>
                                        </p>
                                    </div>
                                </div>
                                <div className={`w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center transition-transform duration-300 ${siswaExpanded ? 'rotate-180' : ''}`}>
                                    <i className="fas fa-chevron-down text-gray-500 text-sm"></i>
                                </div>
                            </button>

                            {/* Collapsible Content */}
                            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${siswaExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                <div className="p-3">
                                    {/* Pill-style Class Selector with Sliding Indicator */}
                                    {kelasList.length > 1 && (
                                        <div className="bg-gray-100 rounded-full p-1 mb-3 relative">
                                            {/* Sliding Indicator */}
                                            <div
                                                className="absolute top-1 bottom-1 bg-green-500 rounded-full shadow-md transition-all duration-300 ease-in-out"
                                                style={{
                                                    width: `calc(${100 / kelasList.length}% - 4px)`,
                                                    left: `calc(${((activeKelas ? kelasList.indexOf(activeKelas) : 0) * (100 / kelasList.length))}% + 2px)`,
                                                }}
                                            />
                                            {/* Buttons */}
                                            <div className="relative flex gap-1">
                                                {kelasList.map(kelas => (
                                                    <button
                                                        key={kelas}
                                                        onClick={() => setActiveKelas(activeKelas === kelas ? null : kelas)}
                                                        className={`flex-1 py-2 rounded-full text-xs font-semibold text-center transition-colors duration-200 z-10 ${(activeKelas === kelas || (activeKelas === null && kelasList.indexOf(kelas) === 0))
                                                            ? 'text-white'
                                                            : 'text-gray-600 hover:text-gray-800'
                                                            }`}
                                                    >
                                                        {kelas}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Student List - filtered by active class */}
                                    <div className="space-y-2 max-h-[350px] overflow-y-auto">
                                        {absensiSiswa
                                            .map((siswa, index) => ({ ...siswa, originalIndex: index }))
                                            .filter(siswa => {
                                                if (kelasList.length <= 1) return true;
                                                const selectedKelas = activeKelas || kelasList[0];
                                                return siswa.kelas === selectedKelas;
                                            })
                                            .map((siswa) => (
                                                <div key={siswa.siswa_id} className="bg-white border border-gray-100 rounded-xl p-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 font-semibold flex-shrink-0">
                                                            {siswa.nama?.charAt(0)?.toUpperCase() || 'S'}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-semibold text-gray-800 text-sm truncate">{siswa.nama}</p>
                                                            <p className="text-xs text-gray-400">{siswa.nis}</p>
                                                        </div>
                                                        <div className="flex gap-1">
                                                            {['H', 'I', 'A'].map(status => (
                                                                <button
                                                                    key={status}
                                                                    onClick={() => updateSiswaStatus(siswa.originalIndex, status)}
                                                                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${siswa.status === status
                                                                        ? status === 'H' ? 'bg-green-500 text-white'
                                                                            : status === 'I' ? 'bg-yellow-500 text-white'
                                                                                : 'bg-red-500 text-white'
                                                                        : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                                                                        }`}
                                                                >{status}</button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    {siswa.status === 'I' && (
                                                        <input
                                                            type="text"
                                                            value={siswa.keterangan}
                                                            onChange={e => updateSiswaKeterangan(siswa.originalIndex, e.target.value)}
                                                            placeholder="Keterangan izin..."
                                                            className="w-full mt-2 border border-yellow-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-yellow-400 focus:border-transparent bg-yellow-50"
                                                        />
                                                    )}
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Berita Acara */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Berita Acara</label>
                        <textarea
                            value={beritaAcara}
                            onChange={e => handleBeritaAcaraChange(e.target.value)}
                            placeholder="Isi berita acara kegiatan..."
                            className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent min-h-[80px] resize-y"
                        />
                    </div>

                    {/* Upload Foto Kegiatan */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Foto Kegiatan <span className="text-red-500">*</span>
                            <span className="font-normal text-gray-400 ml-1">(Min 2, Max 4)</span>
                        </label>

                        {/* Photo Preview Grid */}
                        {fotoKegiatan.length > 0 && (
                            <div className="grid grid-cols-2 gap-2 mb-2">
                                {fotoKegiatan.map((photo, index) => (
                                    <div key={index} className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
                                        <img src={photo} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
                                        <button
                                            onClick={() => removePhoto(index)}
                                            className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                                        >
                                            <i className="fas fa-times"></i>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Upload Buttons - Camera and File */}
                        {fotoKegiatan.length < 4 && (
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
                                            <input
                                                type="file"
                                                accept="image/*"
                                                capture="environment"
                                                onChange={handlePhotoUpload}
                                                className="hidden"
                                                disabled={uploadingPhoto}
                                            />
                                            <i className="fas fa-camera text-green-500 text-2xl mb-2"></i>
                                            <span className="text-xs font-medium text-green-600">Ambil Foto</span>
                                        </label>

                                        {/* File Gallery Button */}
                                        <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-4 cursor-pointer hover:border-green-400 hover:bg-green-50 transition-all">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                multiple
                                                onChange={handlePhotoUpload}
                                                className="hidden"
                                                disabled={uploadingPhoto}
                                            />
                                            <i className="fas fa-images text-gray-400 text-2xl mb-2"></i>
                                            <span className="text-xs font-medium text-gray-500">Pilih File</span>
                                        </label>
                                    </div>
                                )}
                                <p className="text-xs text-gray-400 text-center">{fotoKegiatan.length}/4 foto</p>
                            </div>
                        )}

                        {/* Validation message */}
                        {fotoKegiatan.length < 2 && (
                            <p className="text-xs text-red-500 mt-1">
                                <i className="fas fa-exclamation-circle mr-1"></i>
                                Minimal upload 2 foto kegiatan
                            </p>
                        )}
                    </div>
                </div>

                {/* Fixed Footer */}
                <div className="flex-shrink-0 p-4 border-t border-gray-100 flex gap-3 bg-white">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-600 font-medium hover:bg-gray-50"
                    >
                        Batal
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !canSubmit}
                        className={`flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 ${canSubmit
                            ? 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:shadow-lg'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            } disabled:opacity-50`}
                    >
                        {loading ? (
                            <i className="fas fa-spinner fa-spin"></i>
                        ) : (
                            <>
                                <i className="fas fa-save"></i>
                                Simpan Absensi
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

// Modal Belum Mulai
export function ModalKegiatanBelumMulai({ kegiatan, tanggal, onClose }) {
    const formatTime = (datetime) => {
        if (!datetime) return '-';
        const d = new Date(datetime);
        return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    };

    return ReactDOM.createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl w-full max-w-sm p-6 text-center shadow-2xl"
                style={{ animation: 'fadeIn 0.2s ease-out' }}
                onClick={e => e.stopPropagation()}
            >
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-clock text-green-500 text-3xl"></i>
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">Kegiatan Belum Dimulai</h2>
                <p className="text-gray-500 mb-4">{kegiatan.nama_kegiatan}</p>

                <div className="bg-gray-50 rounded-xl p-4 text-left mb-4 space-y-2">
                    <div className="flex items-center gap-3 text-gray-600">
                        <i className="fas fa-calendar text-gray-400"></i>
                        <span>{tanggal}</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-600">
                        <i className="fas fa-clock text-gray-400"></i>
                        <span>{formatTime(kegiatan.waktu_mulai)} - {formatTime(kegiatan.waktu_berakhir)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-600">
                        <i className="fas fa-map-marker-alt text-gray-400"></i>
                        <span>{kegiatan.tempat || '-'}</span>
                    </div>
                </div>

                <div className="flex items-center justify-center gap-2 text-green-600 text-sm mb-6">
                    <i className="fas fa-info-circle"></i>
                    <span>Silakan kembali saat kegiatan dimulai</span>
                </div>

                <button
                    onClick={onClose}
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                    Mengerti
                </button>
            </div>
        </div>,
        document.body
    );
}

// Modal Sudah Absen
export function ModalKegiatanSudahAbsen({ kegiatan, onClose }) {
    return ReactDOM.createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl w-full max-w-sm p-6 text-center shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-check text-green-500 text-3xl"></i>
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">Absensi Sudah Dilakukan</h2>
                <p className="text-gray-500 mb-4">{kegiatan.nama_kegiatan}</p>

                <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                    <div className="flex items-center justify-center gap-2 text-green-600 font-semibold">
                        <i className="fas fa-check-circle"></i>
                        <span>Absensi kegiatan sudah tersimpan</span>
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                    OK
                </button>
            </div>
        </div>,
        document.body
    );
}

// Modal Absensi Kegiatan untuk Guru Pendamping (Self-Attendance)
export function ModalAbsensiKegiatanPendamping({ kegiatan, tanggal, onClose, onSuccess, guruName, guruNip }) {
    const [status, setStatus] = useState('A'); // Default Alpha
    const [keterangan, setKeterangan] = useState('');
    const [loading, setLoading] = useState(false);
    const [alreadyAttended, setAlreadyAttended] = useState(false);
    const [existingStatus, setExistingStatus] = useState(null);

    // Check if already attended
    useEffect(() => {
        const checkStatus = async () => {
            try {
                const response = await api.get(`/guru-panel/kegiatan/${kegiatan.id}/check-pendamping-status`);
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
    }, [kegiatan.id]);

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await api.post('/guru-panel/kegiatan/absensi-pendamping', {
                kegiatan_id: kegiatan.id,
                status,
                keterangan: keterangan || null
            });
            onSuccess();
        } catch (err) {
            console.error('Error saving absensi:', err);
            alert(err.response?.data?.error || 'Gagal menyimpan absensi');
        } finally {
            setLoading(false);
        }
    };

    // Format time
    const formatTime = (datetime) => {
        if (!datetime) return '-';
        const d = new Date(datetime);
        return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    };

    // Format date
    const formatDate = (datetime) => {
        if (!datetime) return '-';
        const d = new Date(datetime);
        return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    };

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
                <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                <i className="fas fa-calendar-check"></i>
                            </div>
                            <div>
                                <h2 className="font-bold text-sm">{kegiatan.nama_kegiatan || kegiatan.name}</h2>
                                <p className="text-green-100 text-xs">Absensi Pendamping</p>
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
                    <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                        <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
                            <i className="fas fa-user-friends"></i>
                            <span>Anda adalah Guru Pendamping</span>
                        </div>
                    </div>

                    {/* Activity Info */}
                    <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                        <div className="flex items-start gap-3">
                            <i className="fas fa-calendar text-gray-400 mt-0.5 w-4"></i>
                            <div>
                                <p className="text-xs text-gray-500">Tanggal</p>
                                <p className="text-sm text-gray-800 font-medium">{kegiatan.waktu_mulai ? formatDate(kegiatan.waktu_mulai) : (tanggal || kegiatan.date || kegiatan.tanggal || '-')}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <i className="fas fa-clock text-gray-400 mt-0.5 w-4"></i>
                            <div>
                                <p className="text-xs text-gray-500">Waktu</p>
                                <p className="text-sm text-gray-800 font-medium">{kegiatan.waktu_mulai ? `${formatTime(kegiatan.waktu_mulai)} - ${formatTime(kegiatan.waktu_berakhir)}` : (kegiatan.time || '-')}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <i className="fas fa-map-marker-alt text-gray-400 mt-0.5 w-4"></i>
                            <div>
                                <p className="text-xs text-gray-500">Tempat</p>
                                <p className="text-sm text-gray-800 font-medium">{kegiatan.tempat || kegiatan.location || '-'}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <i className="fas fa-user-tie text-gray-400 mt-0.5 w-4"></i>
                            <div>
                                <p className="text-xs text-gray-500">Penanggung Jawab</p>
                                <p className="text-sm text-gray-800 font-medium">{kegiatan.penanggungjawab?.nama || kegiatan.pj || '-'}</p>
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
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-lg flex-shrink-0">
                                    {guruName?.charAt(0)?.toUpperCase() || 'G'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-gray-800 truncate">{guruName}</p>
                                    <p className="text-xs text-gray-400">{guruNip || 'Pendamping'}</p>
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
                                                : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
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
                        className="flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white hover:shadow-lg disabled:opacity-50"
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

export default { ModalAbsensiKegiatanPJ, ModalKegiatanBelumMulai, ModalKegiatanSudahAbsen, ModalAbsensiKegiatanPendamping };

