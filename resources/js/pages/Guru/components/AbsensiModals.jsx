import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import api from '../../../lib/axios';

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
export function ModalAbsensiSiswa({ jadwal, tanggal, siswaList, onClose, onSuccess, guruName = 'Guru', guruNip = '' }) {
    const [ringkasanMateri, setRingkasanMateri] = useState('');
    const [beritaAcara, setBeritaAcara] = useState('');
    const [absensiSiswa, setAbsensiSiswa] = useState([]);
    const [loading, setLoading] = useState(false);
    const [guruStatus, setGuruStatus] = useState('A'); // Default Alpha
    const [siswaExpanded, setSiswaExpanded] = useState(true); // Collapsible state

    useEffect(() => {
        // Initialize absensi siswa list
        setAbsensiSiswa(siswaList.map(s => ({
            siswa_id: s.id,
            nama: s.nama,
            nis: s.nis,
            status: 'H',
            keterangan: ''
        })));
    }, [siswaList]);

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
        izin: absensiSiswa.filter(s => s.status === 'I').length,
        alpha: absensiSiswa.filter(s => s.status === 'A').length,
    };

    const updateStatus = (index, status) => {
        const updated = [...absensiSiswa];
        updated[index].status = status;
        if (status !== 'I') {
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

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await api.post('/guru-panel/absensi', {
                jadwal_id: jadwal.id,
                ringkasan_materi: ringkasanMateri,
                berita_acara: beritaAcara,
                guru_status: guruStatus,
                absensi_siswa: absensiSiswa.map(s => ({
                    siswa_id: s.siswa_id,
                    status: s.status,
                    keterangan: s.keterangan || null
                }))
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
                <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                <i className="fas fa-clipboard-check"></i>
                            </div>
                            <div>
                                <h2 className="font-bold">Input Absensi Siswa</h2>
                                <p className="text-green-100 text-xs">{jadwal.mapel} • {jadwal.kelas}</p>
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
                            <p className="text-xs text-green-100">Hadir</p>
                        </div>
                        <div className="flex-1">
                            <p className="text-2xl font-bold">{counts.izin}</p>
                            <p className="text-xs text-green-100">Izin</p>
                        </div>
                        <div className="flex-1">
                            <p className="text-2xl font-bold">{counts.alpha}</p>
                            <p className="text-xs text-green-100">Alpha</p>
                        </div>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
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

                            {/* Status Buttons */}
                            <div className="flex gap-1.5">
                                <button
                                    onClick={() => setGuruStatus('H')}
                                    className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${guruStatus === 'H'
                                        ? 'bg-green-500 text-white shadow-md'
                                        : 'bg-green-100 text-green-600 hover:bg-green-200'
                                        }`}
                                >H</button>
                                <button
                                    onClick={() => setGuruStatus('I')}
                                    className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${guruStatus === 'I'
                                        ? 'bg-yellow-500 text-white shadow-md'
                                        : 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
                                        }`}
                                >I</button>
                                <button
                                    onClick={() => setGuruStatus('A')}
                                    className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${guruStatus === 'A'
                                        ? 'bg-red-500 text-white shadow-md'
                                        : 'bg-red-100 text-red-600 hover:bg-red-200'
                                        }`}
                                >A</button>
                            </div>
                        </div>
                    </div>

                    {/* Info Notice */}
                    <div className={`flex items-center gap-2 text-sm p-3 rounded-xl ${guruStatus === 'H'
                        ? 'bg-green-50 text-green-700'
                        : guruStatus === 'I'
                            ? 'bg-yellow-50 text-yellow-700'
                            : 'bg-red-50 text-red-700'
                        }`}>
                        <i className={`fas ${guruStatus === 'H' ? 'fa-check-circle' : guruStatus === 'I' ? 'fa-info-circle' : 'fa-exclamation-circle'}`}></i>
                        <span>
                            {guruStatus === 'H' && <>Dengan menyimpan absensi, Anda tercatat <strong>HADIR</strong> di kelas ini</>}
                            {guruStatus === 'I' && <>Anda tercatat <strong>IZIN</strong> di kelas ini</>}
                            {guruStatus === 'A' && <>Anda tercatat <strong>ALPHA</strong> di kelas ini</>}
                        </span>
                    </div>

                    {/* Ringkasan Materi */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Ringkasan Materi</label>
                        <textarea
                            value={ringkasanMateri}
                            onChange={e => handleRingkasanChange(e.target.value)}
                            placeholder="Isi ringkasan materi yang diajarkan..."
                            className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent min-h-[80px] resize-y"
                        />
                    </div>

                    {/* Berita Acara */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Berita Acara</label>
                        <textarea
                            value={beritaAcara}
                            onChange={e => handleBeritaAcaraChange(e.target.value)}
                            placeholder="Isi berita acara pembelajaran..."
                            className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent min-h-[80px] resize-y"
                        />
                    </div>

                    {/* Siswa List - Collapsible */}
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
                                    <div key={siswa.siswa_id} className="bg-white border border-gray-100 rounded-xl p-3">
                                        <div className="flex items-center gap-3">
                                            {/* Avatar */}
                                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 font-semibold flex-shrink-0">
                                                {siswa.nama?.charAt(0)?.toUpperCase() || 'S'}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-gray-800 text-sm truncate">{siswa.nama}</p>
                                                <p className="text-xs text-gray-400">{siswa.nis}</p>
                                            </div>

                                            {/* Status Buttons */}
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => updateStatus(index, 'H')}
                                                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${siswa.status === 'H'
                                                        ? 'bg-green-500 text-white'
                                                        : 'bg-green-100 text-green-600 hover:bg-green-200'
                                                        }`}
                                                >H</button>
                                                <button
                                                    onClick={() => updateStatus(index, 'I')}
                                                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${siswa.status === 'I'
                                                        ? 'bg-yellow-500 text-white'
                                                        : 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
                                                        }`}
                                                >I</button>
                                                <button
                                                    onClick={() => updateStatus(index, 'A')}
                                                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${siswa.status === 'A'
                                                        ? 'bg-red-500 text-white'
                                                        : 'bg-red-100 text-red-600 hover:bg-red-200'
                                                        }`}
                                                >A</button>
                                            </div>
                                        </div>

                                        {/* Keterangan field for Izin */}
                                        {siswa.status === 'I' && (
                                            <input
                                                type="text"
                                                value={siswa.keterangan}
                                                onChange={e => updateKeterangan(index, e.target.value)}
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
        </div>,
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
