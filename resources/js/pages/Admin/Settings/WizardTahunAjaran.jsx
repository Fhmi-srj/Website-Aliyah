import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE, authFetch } from '../../../config/api';
import Swal from 'sweetalert2';

const WizardTahunAjaran = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [tahunAjaranList, setTahunAjaranList] = useState([]);

    // Form data
    const [formData, setFormData] = useState({
        nama: '',
        source_tahun_id: '',
        copy_kelas: true,
        copy_jadwal: true,
        copy_kegiatan: true,
        copy_kalender: true,
        copy_ekskul: true,
        copy_rapat: true
    });

    // Calculated dates based on nama
    const getCalculatedDates = () => {
        const nama = formData.nama.trim();
        const match = nama.match(/^(\d{4})\/(\d{4})$/);
        if (match) {
            const startYear = parseInt(match[1]);
            const endYear = parseInt(match[2]);
            return {
                tanggal_mulai: `${startYear}-07-01`,
                tanggal_selesai: `${endYear}-06-30`
            };
        }
        return { tanggal_mulai: null, tanggal_selesai: null };
    };

    // Preview data
    const [previewData, setPreviewData] = useState(null);

    // Student mappings
    const [studentMappings, setStudentMappings] = useState([]);
    const [kelasOptions, setKelasOptions] = useState([]);

    // Step 2 filters
    const [searchQuery, setSearchQuery] = useState('');
    const [filterKelas, setFilterKelas] = useState('');
    const [filterTingkat, setFilterTingkat] = useState('');

    // Fetch tahun ajaran list on mount
    useEffect(() => {
        const fetchTahunAjaran = async () => {
            try {
                const response = await authFetch(`${API_BASE}/tahun-ajaran`);
                const data = await response.json();
                if (data.success) {
                    setTahunAjaranList(data.data);
                    // Default to active tahun ajaran
                    const active = data.data.find(t => t.is_active);
                    if (active) {
                        setFormData(prev => ({ ...prev, source_tahun_id: active.id.toString() }));
                    }
                }
            } catch (error) {
                console.error('Error fetching tahun ajaran:', error);
            }
        };
        fetchTahunAjaran();
    }, []);

    // Fetch preview when source changes
    useEffect(() => {
        if (formData.source_tahun_id) {
            fetchPreviewData();
        }
    }, [formData.source_tahun_id]);

    const fetchPreviewData = async () => {
        try {
            setLoading(true);
            const response = await authFetch(`${API_BASE}/tahun-ajaran/wizard/preview?source_tahun_id=${formData.source_tahun_id}`);
            const data = await response.json();
            if (data.success) {
                setPreviewData(data.data);
                setKelasOptions(data.data.kelas || []);
            }
        } catch (error) {
            console.error('Error fetching preview:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStudentMappings = async () => {
        try {
            setLoading(true);
            const url = `${API_BASE}/tahun-ajaran/wizard/student-mappings?source_tahun_id=${formData.source_tahun_id}`;
            console.log('Fetching student mappings from:', url);
            const response = await authFetch(url);
            const data = await response.json();
            console.log('Student mappings response:', data);
            if (data.success) {
                console.log('Setting student mappings:', data.data);
                setStudentMappings(data.data);
            } else {
                console.error('API returned success=false:', data);
            }
        } catch (error) {
            console.error('Error fetching student mappings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleNext = async () => {
        if (step === 1) {
            // Validate step 1
            const dates = getCalculatedDates();
            if (!formData.nama || !formData.source_tahun_id) {
                Swal.fire({ icon: 'error', title: 'Error', text: 'Semua field harus diisi' });
                return;
            }
            if (!dates.tanggal_mulai) {
                Swal.fire({ icon: 'error', title: 'Error', text: 'Format tahun ajaran harus YYYY/YYYY (contoh: 2026/2027)' });
                return;
            }
            await fetchStudentMappings();
        }
        setStep(step + 1);
    };

    const handleBack = () => {
        if (step > 1) setStep(step - 1);
    };

    const updateStudentAction = (siswaId, action) => {
        setStudentMappings(prev => prev.map(s =>
            s.siswa_id === siswaId ? { ...s, action } : s
        ));
    };

    const executeWizard = async () => {
        const confirmed = await Swal.fire({
            title: 'Konfirmasi',
            text: 'Yakin ingin membuat tahun ajaran baru?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Ya, Buat',
            cancelButtonText: 'Batal'
        });

        if (!confirmed.isConfirmed) return;

        try {
            setLoading(true);
            const dates = getCalculatedDates();
            const response = await authFetch(`${API_BASE}/tahun-ajaran/wizard/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    tanggal_mulai: dates.tanggal_mulai,
                    tanggal_selesai: dates.tanggal_selesai,
                    siswa_mappings: studentMappings
                })
            });
            const data = await response.json();
            if (data.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil!',
                    text: 'Tahun ajaran baru berhasil dibuat',
                    timer: 2000,
                    showConfirmButton: false
                });
                navigate('/admin/settings');
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: error.message || 'Gagal membuat tahun ajaran' });
        } finally {
            setLoading(false);
        }
    };

    const renderStep1 = () => (
        <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-800">Step 1: Informasi Tahun Ajaran Baru</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nama Tahun Ajaran *</label>
                    <input
                        type="text"
                        value={formData.nama}
                        onChange={(e) => setFormData(prev => ({ ...prev, nama: e.target.value }))}
                        placeholder="contoh: 2026/2027"
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">Format: YYYY/YYYY</p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Copy Template dari *</label>
                    <select
                        value={formData.source_tahun_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, source_tahun_id: e.target.value }))}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                    >
                        <option value="">Pilih Tahun Ajaran</option>
                        {tahunAjaranList.map(t => (
                            <option key={t.id} value={t.id}>{t.nama} {t.is_active && '(Aktif)'}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Auto-calculated dates display */}
            {formData.nama && getCalculatedDates().tanggal_mulai && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="font-medium text-green-800 mb-2 flex items-center gap-2">
                        <i className="fas fa-calendar-check"></i>
                        Periode Tahun Ajaran (Otomatis)
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-gray-600">Tanggal Mulai:</span>
                            <span className="ml-2 font-semibold text-green-700">1 Juli {formData.nama.split('/')[0]}</span>
                        </div>
                        <div>
                            <span className="text-gray-600">Tanggal Selesai:</span>
                            <span className="ml-2 font-semibold text-green-700">30 Juni {formData.nama.split('/')[1]}</span>
                        </div>
                    </div>
                </div>
            )}

            {previewData && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-medium text-blue-800 mb-3">Preview Data dari Tahun Sumber</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">{previewData.counts.kelas}</span>
                            <span>Kelas</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded">{previewData.counts.siswa}</span>
                            <span>Siswa</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">{previewData.counts.jadwal}</span>
                            <span>Jadwal</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded">{previewData.counts.kegiatan}</span>
                            <span>Kegiatan</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="bg-red-100 text-red-800 px-2 py-1 rounded">{previewData.counts.kalender}</span>
                            <span>Kalender</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">{previewData.counts.ekskul}</span>
                            <span>Ekskul</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="bg-pink-100 text-pink-800 px-2 py-1 rounded">{previewData.counts.rapat}</span>
                            <span>Rapat</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-gray-50 border rounded-lg p-4">
                <h3 className="font-medium text-gray-800 mb-3">Pilih Data yang Akan Di-copy</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                        { key: 'copy_kelas', label: 'Kelas' },
                        { key: 'copy_jadwal', label: 'Jadwal Pelajaran' },
                        { key: 'copy_kegiatan', label: 'Kegiatan' },
                        { key: 'copy_kalender', label: 'Kalender Pendidikan' },
                        { key: 'copy_ekskul', label: 'Ekstrakurikuler' },
                        { key: 'copy_rapat', label: 'Rapat' }
                    ].map(item => (
                        <label key={item.key} className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData[item.key]}
                                onChange={(e) => setFormData(prev => ({ ...prev, [item.key]: e.target.checked }))}
                                className="rounded"
                            />
                            {item.label}
                        </label>
                    ))}
                </div>
            </div>
        </div>
    );

    // Get unique kelas and tingkat for filters
    const uniqueKelas = [...new Set(studentMappings.map(s => s.current_kelas).filter(Boolean))];
    const uniqueTingkat = [...new Set(studentMappings.map(s => s.current_tingkat).filter(Boolean))].sort((a, b) => a - b);

    // Filtered students
    const filteredStudents = studentMappings.filter(student => {
        const matchSearch = !searchQuery ||
            student.nama?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            student.nis?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchKelas = !filterKelas || student.current_kelas === filterKelas;
        const matchTingkat = !filterTingkat || String(student.current_tingkat) === filterTingkat;
        return matchSearch && matchKelas && matchTingkat;
    });

    // Bulk action for filtered students
    const setBulkAction = (action) => {
        const filteredIds = new Set(filteredStudents.map(s => s.siswa_id));
        setStudentMappings(prev => prev.map(s =>
            filteredIds.has(s.siswa_id) ? { ...s, action } : s
        ));
    };

    const renderStep2 = () => (
        <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Step 2: Review Kenaikan Siswa</h2>
            <p className="text-sm text-gray-600">
                Atur status setiap siswa untuk tahun ajaran baru. Siswa kelas XII otomatis disarankan untuk lulus.
            </p>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                    <input
                        type="text"
                        placeholder="Cari nama/NIS..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                    />
                </div>
                <div>
                    <select
                        value={filterKelas}
                        onChange={(e) => setFilterKelas(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                    >
                        <option value="">Semua Kelas</option>
                        {uniqueKelas.map(k => (
                            <option key={k} value={k}>{k}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <select
                        value={filterTingkat}
                        onChange={(e) => setFilterTingkat(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                    >
                        <option value="">Semua Tingkat</option>
                        {uniqueTingkat.map(t => (
                            <option key={t} value={t}>Tingkat {t}</option>
                        ))}
                    </select>
                </div>
                <div className="text-sm text-gray-600 flex items-center">
                    Menampilkan: <strong className="ml-1">{filteredStudents.length}</strong> / {studentMappings.length} siswa
                </div>
            </div>

            {/* Bulk Actions */}
            <div className="flex flex-wrap gap-2">
                <span className="text-sm text-gray-600 self-center">Aksi Masal:</span>
                <button
                    onClick={() => setBulkAction('naik')}
                    className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded hover:bg-green-200 flex items-center gap-1"
                >
                    ✅ Set Naik
                </button>
                <button
                    onClick={() => setBulkAction('tinggal')}
                    className="text-xs bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded hover:bg-yellow-200 flex items-center gap-1"
                >
                    🔄 Set Tinggal
                </button>
                <button
                    onClick={() => setBulkAction('lulus')}
                    className="text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded hover:bg-blue-200 flex items-center gap-1"
                >
                    🎓 Set Lulus
                </button>
                <button
                    onClick={() => setBulkAction('mutasi')}
                    className="text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded hover:bg-red-200 flex items-center gap-1"
                >
                    🚫 Set Mutasi
                </button>
            </div>

            <div className="overflow-x-auto max-h-[350px] overflow-y-auto border rounded-lg">
                <table className="w-full text-sm">
                    <thead className="bg-gray-100 sticky top-0">
                        <tr>
                            <th className="text-left py-2 px-3">Nama</th>
                            <th className="text-left py-2 px-3">NIS</th>
                            <th className="text-left py-2 px-3">Kelas</th>
                            <th className="text-left py-2 px-3">Tingkat</th>
                            <th className="text-left py-2 px-3">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {filteredStudents.map(student => (
                            <tr key={student.siswa_id} className={`hover:bg-gray-50 ${student.action === 'lulus' ? 'bg-blue-50' :
                                student.action === 'mutasi' ? 'bg-red-50' :
                                    student.action === 'tinggal' ? 'bg-yellow-50' : ''
                                }`}>
                                <td className="py-2 px-3">{student.nama}</td>
                                <td className="py-2 px-3">{student.nis}</td>
                                <td className="py-2 px-3">{student.current_kelas}</td>
                                <td className="py-2 px-3">{student.current_tingkat}</td>
                                <td className="py-2 px-3">
                                    <select
                                        value={student.action}
                                        onChange={(e) => updateStudentAction(student.siswa_id, e.target.value)}
                                        className="text-xs border rounded px-2 py-1"
                                    >
                                        <option value="naik">✅ Naik Kelas</option>
                                        <option value="tinggal">🔄 Tinggal Kelas</option>
                                        <option value="lulus">🎓 Lulus</option>
                                        <option value="mutasi">🚫 Mutasi</option>
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 text-sm">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>✅ Naik: <strong>{studentMappings.filter(s => s.action === 'naik').length}</strong></div>
                    <div>🔄 Tinggal: <strong>{studentMappings.filter(s => s.action === 'tinggal').length}</strong></div>
                    <div>🎓 Lulus: <strong>{studentMappings.filter(s => s.action === 'lulus').length}</strong></div>
                    <div>🚫 Mutasi: <strong>{studentMappings.filter(s => s.action === 'mutasi').length}</strong></div>
                </div>
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-800">Step 3: Konfirmasi</h2>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-medium text-green-800 mb-3">Ringkasan Tahun Ajaran Baru</h3>
                <div className="space-y-2 text-sm">
                    <div><strong>Nama:</strong> {formData.nama}</div>
                    <div><strong>Periode:</strong> {formData.tanggal_mulai} s/d {formData.tanggal_selesai}</div>
                </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-800 mb-3">Data yang Akan Di-copy</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                    {formData.copy_kelas && <div>✅ Kelas ({previewData?.counts?.kelas || 0})</div>}
                    {formData.copy_jadwal && <div>✅ Jadwal ({previewData?.counts?.jadwal || 0})</div>}
                    {formData.copy_kegiatan && <div>✅ Kegiatan ({previewData?.counts?.kegiatan || 0})</div>}
                    {formData.copy_kalender && <div>✅ Kalender ({previewData?.counts?.kalender || 0})</div>}
                    {formData.copy_ekskul && <div>✅ Ekskul ({previewData?.counts?.ekskul || 0})</div>}
                    {formData.copy_rapat && <div>✅ Rapat ({previewData?.counts?.rapat || 0})</div>}
                </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-medium text-yellow-800 mb-3">Ringkasan Siswa</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>✅ Naik: <strong>{studentMappings.filter(s => s.action === 'naik').length}</strong></div>
                    <div>🔄 Tinggal: <strong>{studentMappings.filter(s => s.action === 'tinggal').length}</strong></div>
                    <div>🎓 Lulus: <strong>{studentMappings.filter(s => s.action === 'lulus').length}</strong></div>
                    <div>🚫 Mutasi: <strong>{studentMappings.filter(s => s.action === 'mutasi').length}</strong></div>
                </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-700">
                    <strong>Perhatian:</strong> Setelah proses ini dijalankan, tahun ajaran baru akan dibuat dengan data yang telah dikonfigurasi.
                    Pastikan semua pengaturan sudah benar sebelum melanjutkan.
                </p>
            </div>
        </div>
    );

    return (
        <div className="bg-white rounded-xl shadow-sm p-6">
            {/* Progress Steps */}
            <div className="flex items-center justify-center mb-8">
                {[1, 2, 3].map((s, idx) => (
                    <React.Fragment key={s}>
                        <div className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-semibold ${step === s ? 'bg-green-600 text-white' :
                            step > s ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
                            }`}>
                            {step > s ? '✓' : s}
                        </div>
                        {idx < 2 && (
                            <div className={`w-20 h-1 mx-2 ${step > s ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        )}
                    </React.Fragment>
                ))}
            </div>

            {/* Step Content */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700"></div>
                    <span className="ml-3 text-gray-600">Memuat data...</span>
                </div>
            ) : (
                <>
                    {step === 1 && renderStep1()}
                    {step === 2 && renderStep2()}
                    {step === 3 && renderStep3()}
                </>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t">
                <button
                    onClick={() => step === 1 ? navigate('/pengaturan') : handleBack()}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center gap-2"
                >
                    <i className="fas fa-arrow-left"></i> {step === 1 ? 'Batal' : 'Kembali'}
                </button>

                {step < 3 ? (
                    <button
                        onClick={handleNext}
                        disabled={loading}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
                    >
                        Lanjut <i className="fas fa-arrow-right"></i>
                    </button>
                ) : (
                    <button
                        onClick={executeWizard}
                        disabled={loading}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
                    >
                        <i className="fas fa-check"></i> Buat Tahun Ajaran Baru
                    </button>
                )}
            </div>
        </div>
    );
};

export default WizardTahunAjaran;
