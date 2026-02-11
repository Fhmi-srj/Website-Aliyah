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
// Modal 1: Belum Mulai (Biru)
export function ModalBelumMulai({ jadwal, tanggal, onClose }) {
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
                {/* Icon */}
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-clock text-green-500 text-3xl"></i>
                </div>

                {/* Title */}
                <h2 className="text-xl font-bold text-gray-800 mb-2">Mata Pelajaran Belum Dimulai</h2>
                <p className="text-gray-500 mb-4">{jadwal.mapel} - {jadwal.kelas}</p>

                {/* Info Box */}
                <div className="bg-gray-50 rounded-xl p-4 text-left mb-4 space-y-2">
                    <div className="flex items-center gap-3 text-gray-600">
                        <i className="fas fa-calendar text-gray-400"></i>
                        <span>{tanggal}</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-600">
                        <i className="fas fa-clock text-gray-400"></i>
                        <span>{jadwal.jam_mulai} - {jadwal.jam_selesai}</span>
                    </div>
                </div>

                {/* Notice */}
                <div className="flex items-center justify-center gap-2 text-green-600 text-sm mb-6">
                    <i className="fas fa-info-circle"></i>
                    <span>Silakan kembali saat mata pelajaran dimulai</span>
                </div>

                {/* Button */}
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

// Modal 2: Form Absensi Siswa (Scrollable)
export function ModalAbsensiSiswa({ jadwal, tanggal, siswaList, onClose, onSuccess, guruName = 'Guru', guruNip = '', isUnlocked = false }) {
    const [ringkasanMateri, setRingkasanMateri] = useState(jadwal?.ringkasan_materi || '');
    const [beritaAcara, setBeritaAcara] = useState(jadwal?.berita_acara || '');
    const [absensiSiswa, setAbsensiSiswa] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetchingSiswa, setFetchingSiswa] = useState(false);
    const [guruStatus, setGuruStatus] = useState(jadwal?.guru_status || 'H'); // Use jadwal's guru_status if available
    const [guruKeterangan, setGuruKeterangan] = useState(jadwal?.guru_keterangan || ''); // Use jadwal's keterangan if available
    const [siswaExpanded, setSiswaExpanded] = useState(true); // Collapsible state

    // Guru Tugas fields - for when guru is absent
    const [guruTugasId, setGuruTugasId] = useState(jadwal?.guru_tugas_id || '');
    const [guruTugasNama, setGuruTugasNama] = useState(''); // Selected guru name
    const [guruSearch, setGuruSearch] = useState(''); // Search input
    const [showGuruDropdown, setShowGuruDropdown] = useState(false);
    const [tugasSiswa, setTugasSiswa] = useState(jadwal?.tugas_siswa || '');
    const [guruList, setGuruList] = useState([]);
    const [loadingGuru, setLoadingGuru] = useState(false);


    useEffect(() => {
        // In unlocked mode with existing absensi record, always fetch to get guru_status and existing data
        if (isUnlocked && jadwal?.id) {
            fetchExistingAbsensiById(jadwal.id);
        }
        // If no existing absensi but has jadwal_id (new record in unlocked mode), fetch fresh siswa list
        else if (isUnlocked && siswaList.length === 0 && jadwal?.jadwal_id) {
            fetchExistingAbsensi();
        }
        // Normal mode: initialize absensi siswa list
        else if (siswaList.length > 0) {
            setAbsensiSiswa(siswaList.map(s => ({
                siswa_id: s.id,
                nama: s.nama,
                nis: s.nis,
                status: 'H',
                keterangan: ''
            })));
        }
    }, [siswaList, isUnlocked, jadwal]);


    // Fetch siswa list for unlocked mode - fetch from jadwal
    const fetchExistingAbsensi = async () => {
        setFetchingSiswa(true);
        try {
            const response = await api.get(`/guru-panel/jadwal/${jadwal.jadwal_id}/siswa`);
            if (response.data.success) {
                setAbsensiSiswa((response.data.data || []).map(s => ({
                    siswa_id: s.id,
                    nama: s.nama,
                    nis: s.nis,
                    status: 'H',
                    keterangan: ''
                })));
            }
        } catch (error) {
            console.error('Error fetching siswa list:', error);
        } finally {
            setFetchingSiswa(false);
        }
    };

    // Fetch existing absensi by ID (for editing from riwayat)
    const fetchExistingAbsensiById = async (absensiId) => {
        setFetchingSiswa(true);
        try {
            const response = await api.get(`/guru-panel/riwayat/mengajar/${absensiId}/detail`);
            if (response.data.success) {
                const data = response.data.data;
                // Set ringkasan materi and berita acara
                setRingkasanMateri(data.ringkasan_materi || '');
                setBeritaAcara(data.berita_acara || '');
                setGuruStatus(data.guru_status || 'H');
                setGuruKeterangan(data.guru_keterangan || '');

                // Set guru tugas (replacement teacher) data
                if (data.guru_tugas_id) {
                    setGuruTugasId(data.guru_tugas_id);
                    setGuruSearch(data.guru_tugas_nama || '');
                }

                // Set tugas siswa (task for students)
                setTugasSiswa(data.tugas_siswa || '');

                // If siswa list exists, use it; otherwise fetch from jadwal
                if (data.siswa && data.siswa.length > 0) {
                    setAbsensiSiswa(data.siswa.map(s => ({
                        siswa_id: s.siswa_id,
                        nama: s.nama,
                        nis: s.nis,
                        status: s.status || 'H',
                        keterangan: s.keterangan || ''
                    })));
                } else if (data.jadwal_id) {
                    // Siswa list is empty (e.g., guru was absent), fetch from jadwal
                    try {
                        const siswaResponse = await api.get(`/guru-panel/jadwal/${data.jadwal_id}/siswa`);
                        if (siswaResponse.data.success) {
                            setAbsensiSiswa((siswaResponse.data.data || []).map(s => ({
                                siswa_id: s.id,
                                nama: s.nama,
                                nis: s.nis,
                                status: 'H',
                                keterangan: ''
                            })));
                        }
                    } catch (err) {
                        console.error('Error fetching siswa from jadwal:', err);
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching existing absensi:', error);
        } finally {
            setFetchingSiswa(false);
        }
    };

    // Auto-hadir when any field changes
    const handleRingkasanChange = (value) => {
        setRingkasanMateri(value);
        if (guruStatus === 'A') setGuruStatus('H');
    };

    const handleBeritaAcaraChange = (value) => {
        setBeritaAcara(value);
        if (guruStatus === 'A') setGuruStatus('H');
    };

    const counts = {
        hadir: absensiSiswa.filter(s => s.status === 'H').length,
        sakit: absensiSiswa.filter(s => s.status === 'S').length,
        izin: absensiSiswa.filter(s => s.status === 'I').length,
        alpha: absensiSiswa.filter(s => s.status === 'A').length,
    };

    const updateStatus = (index, status) => {
        const updated = [...absensiSiswa];
        updated[index].status = status;
        if (status !== 'I' && status !== 'S') {
            updated[index].keterangan = '';
        }
        setAbsensiSiswa(updated);
        // Auto-hadir guru when changing student status
        if (guruStatus === 'A') setGuruStatus('H');
    };

    const updateKeterangan = (index, keterangan) => {
        const updated = [...absensiSiswa];
        updated[index].keterangan = keterangan;
        setAbsensiSiswa(updated);
    };


    // Fetch guru list when guru status changes to I or S
    useEffect(() => {
        if ((guruStatus === 'I' || guruStatus === 'S') && guruList.length === 0) {
            fetchGuruList();
        }
    }, [guruStatus]);

    const fetchGuruList = async () => {
        setLoadingGuru(true);
        try {
            const response = await api.get('/guru-panel/guru-list');
            setGuruList(response.data.data || []);
        } catch (err) {
            console.error('Error fetching guru list:', err);
        } finally {
            setLoadingGuru(false);
        }
    };

    const handleSubmit = async () => {
        // Validation: ringkasan materi required only if guru is present (H)
        if (guruStatus === 'H' && !ringkasanMateri.trim()) {
            alert('Ringkasan Materi wajib diisi!');
            return;
        }
        // Tugas siswa wajib saat guru izin/sakit
        if ((guruStatus === 'I' || guruStatus === 'S') && !tugasSiswa.trim()) {
            alert('Tugas untuk Siswa wajib diisi!');
            return;
        }
        // Berita acara is optional now

        setLoading(true);
        try {
            await api.post('/guru-panel/absensi', {
                jadwal_id: jadwal.jadwal_id || jadwal.id,
                tanggal: tanggal, // Include tanggal for unlocked mode
                ringkasan_materi: guruStatus === 'H' ? ringkasanMateri : null,
                berita_acara: guruStatus === 'H' ? beritaAcara : null,
                guru_status: guruStatus,
                guru_keterangan: guruStatus !== 'H' ? guruKeterangan : null,
                guru_tugas_id: (guruStatus === 'I' || guruStatus === 'S') ? (guruTugasId || null) : null,
                tugas_siswa: (guruStatus === 'I' || guruStatus === 'S') ? (tugasSiswa || null) : null,
                is_unlocked: isUnlocked, // Flag to indicate this is unlocked submission
                absensi_siswa: guruStatus === 'H' ? absensiSiswa.map(s => ({
                    siswa_id: s.siswa_id,
                    status: s.status,
                    keterangan: s.keterangan || null
                })) : [] // Empty if guru is absent
            });
            onSuccess();
        } catch (err) {
            console.error('Error saving absensi:', err);
            alert(err.response?.data?.error || 'Gagal menyimpan absensi');
        } finally {
            setLoading(false);
        }
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
                <div className={`${isUnlocked ? 'bg-gradient-to-r from-amber-500 to-amber-600' : 'bg-gradient-to-r from-green-600 to-green-700'} text-white p-4 flex-shrink-0`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                <i className={`fas ${isUnlocked ? 'fa-unlock' : 'fa-clipboard-check'}`}></i>
                            </div>
                            <div>
                                <h2 className="font-bold">{isUnlocked ? 'Isi Absensi (Dibuka Kembali)' : 'Input Absensi Siswa'}</h2>
                                <p className={`${isUnlocked ? 'text-amber-100' : 'text-green-100'} text-xs`}>{jadwal.mapel} • {jadwal.kelas}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-lg transition-colors">
                            <i className="fas fa-times text-xl"></i>
                        </button>
                    </div>

                    {/* Counter */}
                    <div className="flex gap-6 mt-4 text-center">
                        <div className="flex-1">
                            <p className="text-2xl font-bold">{counts.hadir}</p>
                            <p className={`text-xs ${isUnlocked ? 'text-amber-100' : 'text-green-100'}`}>Hadir</p>
                        </div>
                        <div className="flex-1">
                            <p className="text-2xl font-bold">{counts.sakit}</p>
                            <p className={`text-xs ${isUnlocked ? 'text-amber-100' : 'text-green-100'}`}>Sakit</p>
                        </div>
                        <div className="flex-1">
                            <p className="text-2xl font-bold">{counts.izin}</p>
                            <p className={`text-xs ${isUnlocked ? 'text-amber-100' : 'text-green-100'}`}>Izin</p>
                        </div>
                        <div className="flex-1">
                            <p className="text-2xl font-bold">{counts.alpha}</p>
                            <p className={`text-xs ${isUnlocked ? 'text-amber-100' : 'text-green-100'}`}>Alpha</p>
                        </div>
                    </div>
                </div>

                {/* Scrollable Content */}
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

                    {/* Loading state for fetching siswa */}
                    {fetchingSiswa && (
                        <div className="flex items-center justify-center py-4">
                            <i className="fas fa-spinner fa-spin text-green-500 mr-2"></i>
                            <span className="text-gray-500 text-sm">Memuat daftar siswa...</span>
                        </div>
                    )}

                    {/* Guru Self-Attendance Card */}
                    <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            {/* Avatar */}
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-lg flex-shrink-0">
                                {guruName?.charAt(0)?.toUpperCase() || 'G'}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-gray-800 truncate">{guruName}</p>
                                <p className="text-xs text-gray-400">{guruNip || 'Guru Pengajar'}</p>
                            </div>

                            {/* Status Buttons - HSIA */}
                            <div className="flex gap-1">
                                <button
                                    onClick={() => setGuruStatus('H')}
                                    className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${guruStatus === 'H'
                                        ? 'bg-green-500 text-white shadow-md'
                                        : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                                        }`}
                                >H</button>
                                <button
                                    onClick={() => setGuruStatus('S')}
                                    className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${guruStatus === 'S'
                                        ? 'bg-blue-500 text-white shadow-md'
                                        : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                                        }`}
                                >S</button>
                                <button
                                    onClick={() => setGuruStatus('I')}
                                    className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${guruStatus === 'I'
                                        ? 'bg-yellow-500 text-white shadow-md'
                                        : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                                        }`}
                                >I</button>
                                <button
                                    onClick={() => setGuruStatus('A')}
                                    className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${guruStatus === 'A'
                                        ? 'bg-red-500 text-white shadow-md'
                                        : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                                        }`}
                                >A</button>
                            </div>
                        </div>

                        {/* Guru Tugas Section - Only show when guru is Izin or Sakit */}
                        {(guruStatus === 'I' || guruStatus === 'S') && (
                            <div className="mt-3 space-y-3">
                                {/* Keterangan */}
                                <input
                                    type="text"
                                    value={guruKeterangan}
                                    onChange={e => setGuruKeterangan(e.target.value)}
                                    placeholder={guruStatus === 'S' ? "Keterangan sakit..." : "Keterangan izin..."}
                                    className={`w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:border-transparent ${guruStatus === 'S' ? 'border-blue-200 bg-blue-50 focus:ring-blue-400' : 'border-yellow-200 bg-yellow-50 focus:ring-yellow-400'}`}
                                />

                                {/* Guru Tugas - Searchable Autocomplete */}
                                <div className="relative">
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Guru Pengganti (opsional)</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={guruTugasNama || guruSearch}
                                            onChange={e => {
                                                setGuruSearch(e.target.value);
                                                setGuruTugasNama('');
                                                setGuruTugasId('');
                                                setShowGuruDropdown(true);
                                            }}
                                            onFocus={() => setShowGuruDropdown(true)}
                                            placeholder="Ketik nama guru..."
                                            className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent bg-white pr-8"
                                            disabled={loadingGuru}
                                        />
                                        {guruTugasId && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setGuruTugasId('');
                                                    setGuruTugasNama('');
                                                    setGuruSearch('');
                                                }}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
                                            >
                                                <i className="fas fa-times text-sm"></i>
                                            </button>
                                        )}
                                    </div>
                                    {/* Dropdown hasil pencarian */}
                                    {showGuruDropdown && guruSearch && !guruTugasNama && (
                                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                                            {guruList
                                                .filter(g => g.nama.toLowerCase().includes(guruSearch.toLowerCase()))
                                                .slice(0, 5)
                                                .map(g => (
                                                    <button
                                                        key={g.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setGuruTugasId(g.id);
                                                            setGuruTugasNama(g.nama);
                                                            setGuruSearch('');
                                                            setShowGuruDropdown(false);
                                                        }}
                                                        className="w-full text-left px-3 py-2 text-sm hover:bg-green-50 border-b border-gray-100 last:border-b-0"
                                                    >
                                                        <p className="font-medium text-gray-800">{g.nama}</p>
                                                        <p className="text-xs text-gray-400">{g.nip || 'Guru'}</p>
                                                    </button>
                                                ))
                                            }
                                            {guruList.filter(g => g.nama.toLowerCase().includes(guruSearch.toLowerCase())).length === 0 && (
                                                <p className="px-3 py-2 text-sm text-gray-400">Tidak ditemukan</p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Tugas Siswa - WAJIB */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Tugas untuk Siswa <span className="text-red-500">*</span></label>
                                    <textarea
                                        value={tugasSiswa}
                                        onChange={e => setTugasSiswa(e.target.value)}
                                        placeholder="Tugas yang diberikan kepada siswa..."
                                        className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent min-h-[60px] resize-y"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Info Notice */}
                    <div className={`flex items-center gap-2 text-sm p-3 rounded-xl ${guruStatus === 'H'
                        ? 'bg-green-50 text-green-700'
                        : guruStatus === 'S'
                            ? 'bg-blue-50 text-blue-700'
                            : guruStatus === 'I'
                                ? 'bg-yellow-50 text-yellow-700'
                                : 'bg-red-50 text-red-700'
                        }`}>
                        <i className={`fas ${guruStatus === 'H' ? 'fa-check-circle' : guruStatus === 'S' ? 'fa-clinic-medical' : guruStatus === 'I' ? 'fa-info-circle' : 'fa-exclamation-circle'}`}></i>
                        <span>
                            {guruStatus === 'H' && <>Dengan menyimpan absensi, Anda tercatat <strong>HADIR</strong> di kelas ini</>}
                            {guruStatus === 'S' && <>Anda tercatat <strong>SAKIT</strong> di kelas ini</>}
                            {guruStatus === 'I' && <>Anda tercatat <strong>IZIN</strong> di kelas ini</>}
                            {guruStatus === 'A' && <>Anda tercatat <strong>ALPHA</strong> di kelas ini</>}
                        </span>
                    </div>

                    {/* Ringkasan Materi - only show when guru is present (H) */}
                    {guruStatus === 'H' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Ringkasan Materi</label>
                            <textarea
                                value={ringkasanMateri}
                                onChange={e => handleRingkasanChange(e.target.value)}
                                placeholder="Isi ringkasan materi yang diajarkan..."
                                className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent min-h-[80px] resize-y"
                            />
                        </div>
                    )}

                    {/* Berita Acara - only show when guru is present (H) */}
                    {guruStatus === 'H' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Berita Acara <span className="text-gray-400 text-xs">(opsional)</span></label>
                            <textarea
                                value={beritaAcara}
                                onChange={e => handleBeritaAcaraChange(e.target.value)}
                                placeholder="Isi berita acara pembelajaran..."
                                className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent min-h-[80px] resize-y"
                            />
                        </div>
                    )}

                    {/* Siswa List - Collapsible - only show when guru is present (H) */}
                    {guruStatus === 'H' && (
                        <div className="border border-gray-200 rounded-xl overflow-hidden">
                            {/* Collapsible Header */}
                            <button
                                type="button"
                                onClick={() => setSiswaExpanded(!siswaExpanded)}
                                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-indigo-50 hover:from-green-100 hover:to-indigo-100 transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
                                        <i className="fas fa-users text-white"></i>
                                    </div>
                                    <div className="text-left">
                                        <p className="font-semibold text-gray-800">Absensi Siswa</p>
                                        <p className="text-xs text-gray-500">
                                            <span className="text-green-600">{counts.hadir} hadir</span>
                                            <span className="mx-1">•</span>
                                            <span className="text-blue-600">{counts.sakit} sakit</span>
                                            <span className="mx-1">•</span>
                                            <span className="text-yellow-600">{counts.izin} izin</span>
                                            <span className="mx-1">•</span>
                                            <span className="text-red-600">{counts.alpha} alpha</span>
                                        </p>
                                    </div>
                                </div>
                                <div className={`w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center transition-transform duration-300 ${siswaExpanded ? 'rotate-180' : ''}`}>
                                    <i className="fas fa-chevron-down text-gray-500 text-sm"></i>
                                </div>
                            </button>

                            {/* Collapsible Content */}
                            <div
                                className={`transition-all duration-300 ease-in-out overflow-hidden ${siswaExpanded ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}`}
                            >
                                <div className="p-3 space-y-2 max-h-[400px] overflow-y-auto">
                                    {absensiSiswa.map((siswa, index) => (
                                        <div key={siswa.siswa_id} className="bg-white border border-gray-100 rounded-xl p-2">
                                            <div className="flex items-center gap-1.5">
                                                {/* Info - no avatar */}
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-gray-800 text-[0.7rem] sm:text-[0.8rem] truncate">{siswa.nama}</p>
                                                    <p className="text-[0.6rem] sm:text-[0.65rem] text-gray-400">{siswa.nis}</p>
                                                </div>

                                                {/* Status Buttons - HSIA */}
                                                <div className="flex gap-0.5">
                                                    <button
                                                        onClick={() => updateStatus(index, 'H')}
                                                        className={`w-6 h-6 rounded text-[0.6rem] font-bold transition-all ${siswa.status === 'H'
                                                            ? 'bg-green-500 text-white'
                                                            : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                                                            }`}
                                                    >H</button>
                                                    <button
                                                        onClick={() => updateStatus(index, 'S')}
                                                        className={`w-6 h-6 rounded text-[0.6rem] font-bold transition-all ${siswa.status === 'S'
                                                            ? 'bg-blue-500 text-white'
                                                            : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                                                            }`}
                                                    >S</button>
                                                    <button
                                                        onClick={() => updateStatus(index, 'I')}
                                                        className={`w-6 h-6 rounded text-[0.6rem] font-bold transition-all ${siswa.status === 'I'
                                                            ? 'bg-yellow-500 text-white'
                                                            : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                                                            }`}
                                                    >I</button>
                                                    <button
                                                        onClick={() => updateStatus(index, 'A')}
                                                        className={`w-6 h-6 rounded text-[0.6rem] font-bold transition-all ${siswa.status === 'A'
                                                            ? 'bg-red-500 text-white'
                                                            : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                                                            }`}
                                                    >A</button>
                                                </div>
                                            </div>

                                            {/* Keterangan field for Izin or Sakit */}
                                            {(siswa.status === 'I' || siswa.status === 'S') && (
                                                <input
                                                    type="text"
                                                    value={siswa.keterangan}
                                                    onChange={e => updateKeterangan(index, e.target.value)}
                                                    placeholder={siswa.status === 'S' ? "Keterangan sakit..." : "Keterangan izin..."}
                                                    className={`w-full mt-2 border rounded-lg p-2 text-sm focus:ring-2 focus:border-transparent ${siswa.status === 'S' ? 'border-blue-200 bg-blue-50 focus:ring-blue-400' : 'border-yellow-200 bg-yellow-50 focus:ring-yellow-400'}`}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
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
                        disabled={loading}
                        className="flex-1 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-medium hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
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
        </div >,
        document.body
    );
}

// Modal 3: Sudah Absen (Hijau)
export function ModalSudahAbsen({ jadwal, onClose }) {
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
                {/* Icon */}
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-check text-green-500 text-3xl"></i>
                </div>

                {/* Title */}
                <h2 className="text-xl font-bold text-gray-800 mb-2">Absensi Sudah Dilakukan</h2>
                <p className="text-gray-500 mb-4">{jadwal.mapel} - {jadwal.kelas}</p>

                {/* Status Box */}
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                    <div className="flex items-center justify-center gap-2 text-green-600 font-semibold">
                        <i className="fas fa-check-circle"></i>
                        <span>Status Anda : HADIR</span>
                    </div>
                    <p className="text-sm text-green-600 mt-2">
                        Anda sudah membuka absensi dan tercatat hadir di mata pelajaran ini
                    </p>
                </div>

                {/* Button */}
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

// Note: ModalTerlewat removed - logic conflicts with daily schedule reset
// When day changes, schedules reset to 'belum_mulai' so terlewat status is not needed

export default { ModalBelumMulai, ModalAbsensiSiswa, ModalSudahAbsen };
