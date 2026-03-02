import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import api from '../../lib/axios';
import { useAuth } from '../../contexts/AuthContext';

const PROFIL_KUMER = [
    { key: 'beriman', label: 'Beriman, Bertakwa, dan Berakhlak Mulia' },
    { key: 'berkebinekaan', label: 'Berkebinekaan Global' },
    { key: 'bernalar', label: 'Bernalar Kritis' },
    { key: 'mandiri', label: 'Mandiri' },
    { key: 'gotong_royong', label: 'Bergotong Royong' },
    { key: 'kreatif', label: 'Kreatif' },
];

const PROFIL_KBC = [
    { key: 'cinta_allah', label: '❤️ Cinta kepada Allah' },
    { key: 'cinta_ilmu', label: '📚 Cinta kepada Ilmu' },
    { key: 'cinta_sesama', label: '💛 Cinta kepada Diri Sendiri & Sesama' },
    { key: 'cinta_alam', label: '🌿 Cinta kepada Alam/Lingkungan' },
    { key: 'cinta_tanah_air', label: '🇮🇩 Cinta kepada Tanah Air' },
];

function getProfilOptions(kurikulum) {
    if (kurikulum === 'kbc') return PROFIL_KBC;
    if (kurikulum === 'kolaborasi') return [...PROFIL_KUMER, ...PROFIL_KBC];
    return PROFIL_KUMER;
}

function getProfilLabel(kurikulum) {
    if (kurikulum === 'kbc') return 'Pilar Cinta (KBC)';
    if (kurikulum === 'kolaborasi') return 'Profil Pelajar & Pilar Cinta';
    return 'Profil Pelajar Pancasila';
}

const FASE_MAP = {
    '10': 'E', '11': 'F', '12': 'F',
    'X': 'E', 'XI': 'F', 'XII': 'F',
};

function getFaseFromKelas(kelas) {
    if (!kelas) return '';
    for (const [k, v] of Object.entries(FASE_MAP)) {
        if (kelas.includes(k)) return v;
    }
    return '';
}

function Modul() {
    const { authFetch } = useAuth();
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ mapel: '', kelas: '', status: '' });
    const [filterOptions, setFilterOptions] = useState({ mapel: [], kelas: [] });
    const [jadwalOptions, setJadwalOptions] = useState({ mapel: [], kelas: [], pairs: [] });
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState(null);
    const [showDetail, setShowDetail] = useState(null);
    const [saving, setSaving] = useState(false);

    const emptyForm = {
        mapel: '', kelas: '', fase: '', semester: 1, bab_materi: '',
        kurikulum: 'kolaborasi',
        tanggal: new Date().toISOString().split('T')[0],
        alokasi_waktu: '4 x 45 menit',
        tujuan_pembelajaran: 'Siswa mampu memahami dan menjelaskan materi yang diajarkan dengan baik dan benar',
        profil_pelajar: ['beriman', 'bernalar'],
        kegiatan_pendahuluan: '1. Salam pembuka dan berdoa bersama\n2. Mengecek kehadiran siswa\n3. Memberikan motivasi dan apersepsi\n4. Menyampaikan tujuan pembelajaran',
        kegiatan_inti: '1. Guru menjelaskan materi pokok\n2. Siswa mengamati dan mencatat poin penting\n3. Diskusi kelompok tentang materi\n4. Presentasi hasil diskusi\n5. Guru memberikan umpan balik',
        kegiatan_penutup: '1. Guru bersama siswa menyimpulkan materi\n2. Refleksi pembelajaran\n3. Guru menyampaikan tugas dan materi selanjutnya\n4. Doa penutup dan salam',
        asesmen_formatif: 'Tanya jawab lisan, observasi keaktifan siswa',
        asesmen_sumatif: 'Tes tertulis, penugasan',
        media_sumber: 'Buku paket, Al-Quran, papan tulis, LCD proyektor',
    };
    const [form, setForm] = useState(emptyForm);
    const [formStep, setFormStep] = useState(0);

    const fetchList = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            if (filters.mapel) params.mapel = filters.mapel;
            if (filters.kelas) params.kelas = filters.kelas;
            if (filters.status) params.status = filters.status;
            const res = await api.get('/guru-panel/modul', { params });
            setList(res.data.data || []);
            setFilterOptions(res.data.filters || { mapel: [], kelas: [] });
            if (res.data.jadwal) {
                setJadwalOptions(res.data.jadwal);
            }
        } catch (err) {
            console.error('Error fetching modul:', err);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => { fetchList(); }, [fetchList]);

    // Get kelas options filtered by selected mapel
    const getKelasForMapel = (mapel) => {
        if (!mapel || !jadwalOptions.pairs?.length) return jadwalOptions.kelas || [];
        const filtered = jadwalOptions.pairs.filter(p => p.mapel === mapel).map(p => p.kelas);
        return [...new Set(filtered)].sort();
    };

    const openCreate = () => {
        setForm(emptyForm);
        setEditId(null);
        setFormStep(0);
        setShowForm(true);
    };

    const openEdit = async (modul) => {
        try {
            const res = await api.get(`/guru-panel/modul/${modul.id}`);
            const d = res.data.data;
            setForm({
                mapel: d.mapel || '', kelas: d.kelas || '', fase: d.fase || '',
                semester: d.semester || 1, bab_materi: d.bab_materi || '',
                tanggal: d.tanggal || new Date().toISOString().split('T')[0],
                kurikulum: d.kurikulum || (() => {
                    const pp = d.profil_pelajar || [];
                    const hasKbc = pp.some(k => k.startsWith('cinta_'));
                    const hasKumer = pp.some(k => !k.startsWith('cinta_'));
                    if (hasKbc && hasKumer) return 'kolaborasi';
                    if (hasKbc) return 'kbc';
                    return 'kumer';
                })(),
                alokasi_waktu: d.alokasi_waktu || '',
                tujuan_pembelajaran: d.tujuan_pembelajaran || '',
                profil_pelajar: d.profil_pelajar || [],
                kegiatan_pendahuluan: d.kegiatan_pendahuluan || '',
                kegiatan_inti: d.kegiatan_inti || '',
                kegiatan_penutup: d.kegiatan_penutup || '',
                asesmen_formatif: d.asesmen_formatif || '',
                asesmen_sumatif: d.asesmen_sumatif || '',
                media_sumber: d.media_sumber || '',
            });
            setEditId(modul.id);
            setFormStep(0);
            setShowForm(true);
        } catch (err) {
            alert('Gagal memuat data modul');
        }
    };

    const handleSave = async () => {
        if (!form.mapel || !form.kelas || !form.bab_materi || !form.tujuan_pembelajaran || !form.kegiatan_pendahuluan || !form.kegiatan_inti || !form.kegiatan_penutup) {
            alert('Harap isi semua field yang wajib!');
            return;
        }
        setSaving(true);
        try {
            const payload = { ...form, fase: form.fase || getFaseFromKelas(form.kelas) };
            if (editId) {
                await api.put(`/guru-panel/modul/${editId}`, payload);
            } else {
                await api.post('/guru-panel/modul', payload);
            }
            setShowForm(false);
            fetchList();
        } catch (err) {
            alert(err.response?.data?.error || 'Gagal menyimpan modul');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Hapus modul ajar ini?')) return;
        try {
            await api.delete(`/guru-panel/modul/${id}`);
            fetchList();
            setShowDetail(null);
        } catch (err) {
            alert(err.response?.data?.error || 'Gagal menghapus');
        }
    };

    const handleLock = async (id) => {
        if (!confirm('Kunci modul ini? Modul terkunci tidak bisa diedit.')) return;
        try {
            await api.post(`/guru-panel/modul/${id}/lock`);
            fetchList();
            setShowDetail(null);
        } catch (err) {
            alert(err.response?.data?.error || 'Gagal mengunci');
        }
    };

    const handleUnlock = async (id) => {
        if (!confirm('Buka kunci modul? Modul akan kembali menjadi draft.')) return;
        try {
            await api.post(`/guru-panel/modul/${id}/unlock`);
            fetchList();
            setShowDetail(null);
        } catch (err) {
            alert(err.response?.data?.error || 'Gagal membuka kunci');
        }
    };

    const handleDuplicate = async (id) => {
        try {
            await api.post(`/guru-panel/modul/${id}/duplicate`);
            fetchList();
            setShowDetail(null);
        } catch (err) {
            alert(err.response?.data?.error || 'Gagal menduplikat');
        }
    };

    const handleExportPdf = (id) => {
        const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
        window.open(`/api/guru-panel/modul/${id}/pdf?token=${token}`, '_blank');
    };

    const viewDetail = async (modul) => {
        try {
            const res = await api.get(`/guru-panel/modul/${modul.id}`);
            setShowDetail(res.data.data);
        } catch (err) {
            alert('Gagal memuat detail');
        }
    };

    const updateField = (key, val) => {
        setForm(prev => {
            const newForm = { ...prev, [key]: val };
            if (key === 'kelas') newForm.fase = getFaseFromKelas(val);
            if (key === 'mapel') newForm.kelas = ''; // Reset kelas when mapel changes
            return newForm;
        });
    };

    const toggleProfil = (key) => {
        setForm(prev => ({
            ...prev,
            profil_pelajar: prev.profil_pelajar.includes(key)
                ? prev.profil_pelajar.filter(k => k !== key)
                : [...prev.profil_pelajar, key],
        }));
    };

    // Get unique mapel and kelas from list for filter
    const uniqueMapel = filterOptions.mapel?.length > 0
        ? filterOptions.mapel
        : [...new Set(list.map(i => i.mapel))].sort();
    const uniqueKelas = filterOptions.kelas?.length > 0
        ? filterOptions.kelas
        : [...new Set(list.map(i => i.kelas))].sort();

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            {/* Header - Green theme matching app */}
            <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-5 rounded-b-3xl shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                        <i className="fas fa-book text-lg"></i>
                    </div>
                    <div>
                        <h1 className="text-lg font-bold">Modul Ajar</h1>
                        <p className="text-green-200 text-xs">Kelola modul ajar per bab/materi</p>
                    </div>
                </div>
                {/* Filters */}
                <div className="grid grid-cols-3 gap-2">
                    {uniqueMapel.length > 0 && (
                        <select value={filters.mapel} onChange={e => setFilters(f => ({ ...f, mapel: e.target.value }))} className="bg-white/20 text-white border-0 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-white/50">
                            <option value="" className="text-gray-800">Semua Mapel</option>
                            {uniqueMapel.map(m => <option key={m} value={m} className="text-gray-800">{m}</option>)}
                        </select>
                    )}
                    {uniqueKelas.length > 0 && (
                        <select value={filters.kelas} onChange={e => setFilters(f => ({ ...f, kelas: e.target.value }))} className="bg-white/20 text-white border-0 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-white/50">
                            <option value="" className="text-gray-800">Semua Kelas</option>
                            {uniqueKelas.map(k => <option key={k} value={k} className="text-gray-800">{k}</option>)}
                        </select>
                    )}
                    <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} className="bg-white/20 text-white border-0 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-white/50">
                        <option value="" className="text-gray-800">Semua Status</option>
                        <option value="draft" className="text-gray-800">Draft</option>
                        <option value="locked" className="text-gray-800">Terkunci</option>
                    </select>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <i className="fas fa-spinner fa-spin text-green-500 text-2xl mb-3"></i>
                        <p className="text-gray-500 text-sm">Memuat modul ajar...</p>
                    </div>
                ) : list.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                            <i className="fas fa-book text-green-400 text-2xl"></i>
                        </div>
                        <p className="text-gray-600 font-medium mb-1">Belum Ada Modul</p>
                        <p className="text-gray-400 text-xs">Tekan tombol + untuk membuat modul ajar baru</p>
                    </div>
                ) : list.map(item => (
                    <div key={item.id} onClick={() => viewDetail(item)}
                        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow cursor-pointer">
                        <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-gray-800 text-sm truncate">{item.bab_materi}</h3>
                                <p className="text-xs text-gray-500 mt-0.5">{item.mapel} • {item.kelas}{item.fase ? ` • Fase ${item.fase}` : ''}</p>
                            </div>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ml-2 ${item.status === 'locked'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-yellow-100 text-yellow-700'
                                }`}>
                                {item.status === 'locked' ? '🔒 Terkunci' : '📝 Draft'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-[11px] text-gray-400">
                                <span><i className="fas fa-calendar mr-1"></i>{item.created_at}</span>
                                <span>Semester {item.semester}</span>
                                {item.alokasi_waktu && <span>{item.alokasi_waktu}</span>}
                            </div>
                            {item.status === 'locked' && (
                                <button onClick={(e) => { e.stopPropagation(); handleExportPdf(item.id); }}
                                    className="flex items-center gap-1 text-[10px] text-green-600 bg-green-50 hover:bg-green-100 px-2 py-0.5 rounded-full font-medium transition-colors"
                                    title="Cetak PDF">
                                    <i className="fas fa-file-pdf"></i> PDF
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* FAB */}
            <button onClick={openCreate}
                className="fixed bottom-20 right-4 w-14 h-14 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:shadow-xl active:scale-95 transition-all z-50">
                <i className="fas fa-plus"></i>
            </button>

            {/* Form Modal */}
            {showForm && <FormModal
                form={form} updateField={updateField} toggleProfil={toggleProfil}
                onSave={handleSave} onClose={() => setShowForm(false)}
                saving={saving} isEdit={!!editId}
                formStep={formStep} setFormStep={setFormStep}
                jadwalOptions={jadwalOptions} getKelasForMapel={getKelasForMapel}
            />}

            {/* Detail Modal */}
            {showDetail && <DetailModal
                data={showDetail}
                onClose={() => setShowDetail(null)}
                onEdit={() => { setShowDetail(null); openEdit(showDetail); }}
                onDelete={() => handleDelete(showDetail.id)}
                onLock={() => handleLock(showDetail.id)}
                onUnlock={() => handleUnlock(showDetail.id)}
                onDuplicate={() => handleDuplicate(showDetail.id)}
                onExportPdf={() => handleExportPdf(showDetail.id)}
            />}
        </div>
    );
}

// ── Form Modal (multi-step) ──
function FormModal({ form, updateField, toggleProfil, onSave, onClose, saving, isEdit, formStep, setFormStep, jadwalOptions, getKelasForMapel }) {
    const steps = ['Info Umum', 'Tujuan & Profil', 'Kegiatan', 'Asesmen & Media'];
    const [generating, setGenerating] = useState(false);

    const mapelList = jadwalOptions?.mapel || [];
    const kelasList = getKelasForMapel ? getKelasForMapel(form.mapel) : (jadwalOptions?.kelas || []);

    const canGenerate = form.mapel && form.kelas && form.bab_materi;

    const handleGenerateAI = async () => {
        if (!canGenerate) {
            alert('Isi Mapel, Kelas, dan Bab/Materi terlebih dahulu');
            return;
        }
        setGenerating(true);
        try {
            const res = await api.post('/guru-panel/modul/generate-ai', {
                mapel: form.mapel,
                kelas: form.kelas,
                bab_materi: form.bab_materi,
                semester: form.semester,
                fase: form.fase,
                kurikulum: form.kurikulum,
            });
            const d = res.data.data;
            if (d) {
                // Update all generated fields
                if (d.tujuan_pembelajaran) updateField('tujuan_pembelajaran', d.tujuan_pembelajaran);
                if (d.profil_pelajar) updateField('profil_pelajar', d.profil_pelajar);
                if (d.kegiatan_pendahuluan) updateField('kegiatan_pendahuluan', d.kegiatan_pendahuluan);
                if (d.kegiatan_inti) updateField('kegiatan_inti', d.kegiatan_inti);
                if (d.kegiatan_penutup) updateField('kegiatan_penutup', d.kegiatan_penutup);
                if (d.asesmen_formatif) updateField('asesmen_formatif', d.asesmen_formatif);
                if (d.asesmen_sumatif) updateField('asesmen_sumatif', d.asesmen_sumatif);
                if (d.media_sumber) updateField('media_sumber', d.media_sumber);
                // Auto-advance to step 1 to show generated content
                setFormStep(1);
            }
        } catch (err) {
            alert(err.response?.data?.error || 'Gagal generate AI. Coba lagi.');
        } finally {
            setGenerating(false);
        }
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-md flex flex-col shadow-2xl overflow-hidden" style={{ maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <h2 className="font-bold">{isEdit ? 'Edit Modul Ajar' : 'Buat Modul Ajar'}</h2>
                        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-lg"><i className="fas fa-times"></i></button>
                    </div>
                    <div className="flex gap-1.5 mt-3">
                        {steps.map((s, i) => (
                            <button key={i} onClick={() => setFormStep(i)}
                                className={`flex-1 py-1 text-[10px] rounded-lg font-medium transition-all ${i === formStep ? 'bg-white text-green-700' : 'bg-white/20 text-white/70 hover:bg-white/30'}`}>
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                {/* AI Generating overlay */}
                {generating && (
                    <div className="absolute inset-0 z-50 bg-white/90 flex flex-col items-center justify-center rounded-2xl">
                        <div className="relative w-16 h-16 mb-4">
                            <div className="absolute inset-0 border-4 border-green-200 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-green-500 rounded-full border-t-transparent animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center text-xl">✨</div>
                        </div>
                        <p className="text-green-700 font-bold text-sm">AI sedang generate konten...</p>
                        <p className="text-gray-400 text-xs mt-1">Menyesuaikan dengan {form.mapel} - {form.bab_materi}</p>
                    </div>
                )}

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {formStep === 0 && <>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Mata Pelajaran <span className="text-red-500">*</span></label>
                            {mapelList.length > 0 ? (
                                <select value={form.mapel} onChange={e => updateField('mapel', e.target.value)} className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent">
                                    <option value="">-- Pilih Mapel --</option>
                                    {mapelList.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            ) : (
                                <input type="text" value={form.mapel} onChange={e => updateField('mapel', e.target.value)} placeholder="Contoh: Fiqih" className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent" />
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Kelas <span className="text-red-500">*</span></label>
                                {kelasList.length > 0 ? (
                                    <select value={form.kelas} onChange={e => updateField('kelas', e.target.value)} className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent">
                                        <option value="">-- Pilih Kelas --</option>
                                        {kelasList.map(k => <option key={k} value={k}>{k}</option>)}
                                    </select>
                                ) : (
                                    <input type="text" value={form.kelas} onChange={e => updateField('kelas', e.target.value)} placeholder="Contoh: XI IPA" className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent" />
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Fase</label>
                                <input type="text" value={form.fase} readOnly placeholder="Auto" className="w-full border border-gray-200 rounded-xl p-3 text-sm bg-gray-50 text-gray-500" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Semester <span className="text-red-500">*</span></label>
                                <select value={form.semester} onChange={e => updateField('semester', parseInt(e.target.value))} className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent">
                                    <option value={1}>Semester 1</option>
                                    <option value={2}>Semester 2</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Alokasi Waktu</label>
                                <input type="text" value={form.alokasi_waktu} onChange={e => updateField('alokasi_waktu', e.target.value)} placeholder="4 x 45 menit" className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
                                <input type="date" value={form.tanggal} onChange={e => updateField('tanggal', e.target.value)} className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Kurikulum <span className="text-red-500">*</span></label>
                                <select value={form.kurikulum} onChange={e => updateField('kurikulum', e.target.value)} className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent">
                                    <option value="kumer">📗 Kumer</option>
                                    <option value="kbc">💖 KBC</option>
                                    <option value="kolaborasi">🤝 Kolaborasi</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Bab / Materi Pokok <span className="text-red-500">*</span></label>
                            <input type="text" value={form.bab_materi} onChange={e => updateField('bab_materi', e.target.value)} placeholder="Contoh: Muamalah" className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent" />
                        </div>

                        {/* AI Generate Button */}
                        {canGenerate && (
                            <button
                                onClick={handleGenerateAI}
                                disabled={generating}
                                className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl font-medium hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                <span className="text-lg">✨</span> Generate dengan AI
                            </button>
                        )}
                    </>}

                    {formStep === 1 && <>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tujuan Pembelajaran <span className="text-red-500">*</span></label>
                            <textarea value={form.tujuan_pembelajaran} onChange={e => updateField('tujuan_pembelajaran', e.target.value)} placeholder="Siswa mampu memahami dan menjelaskan..." className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent min-h-[120px] resize-y" />
                        </div>
                        {form.kurikulum === 'kolaborasi' ? (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">📗 Profil Pelajar Pancasila</label>
                                    <div className="space-y-2">
                                        {PROFIL_KUMER.map(opt => (
                                            <label key={opt.key} className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 hover:bg-green-50 cursor-pointer transition-colors">
                                                <input type="checkbox" checked={form.profil_pelajar.includes(opt.key)} onChange={() => toggleProfil(opt.key)}
                                                    className="w-4 h-4 text-green-600 rounded focus:ring-green-400" />
                                                <span className="text-sm text-gray-700">{opt.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">💖 5 Pilar Cinta (KBC)</label>
                                    <div className="space-y-2">
                                        {PROFIL_KBC.map(opt => (
                                            <label key={opt.key} className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 hover:bg-pink-50 cursor-pointer transition-colors">
                                                <input type="checkbox" checked={form.profil_pelajar.includes(opt.key)} onChange={() => toggleProfil(opt.key)}
                                                    className="w-4 h-4 text-pink-600 rounded focus:ring-pink-400" />
                                                <span className="text-sm text-gray-700">{opt.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">{getProfilLabel(form.kurikulum)}</label>
                                <div className="space-y-2">
                                    {getProfilOptions(form.kurikulum).map(opt => (
                                        <label key={opt.key} className={`flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 cursor-pointer transition-colors ${form.kurikulum === 'kbc' ? 'hover:bg-pink-50' : 'hover:bg-green-50'}`}>
                                            <input type="checkbox" checked={form.profil_pelajar.includes(opt.key)} onChange={() => toggleProfil(opt.key)}
                                                className={`w-4 h-4 rounded ${form.kurikulum === 'kbc' ? 'text-pink-600 focus:ring-pink-400' : 'text-green-600 focus:ring-green-400'}`} />
                                            <span className="text-sm text-gray-700">{opt.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>}

                    {formStep === 2 && <>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Kegiatan Pendahuluan <span className="text-red-500">*</span></label>
                            <textarea value={form.kegiatan_pendahuluan} onChange={e => updateField('kegiatan_pendahuluan', e.target.value)} placeholder="Salam pembuka, berdoa, motivasi, apersepsi..." className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent min-h-[80px] resize-y" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Kegiatan Inti <span className="text-red-500">*</span></label>
                            <textarea value={form.kegiatan_inti} onChange={e => updateField('kegiatan_inti', e.target.value)} placeholder="Penjelasan materi, diskusi kelompok, praktik..." className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent min-h-[120px] resize-y" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Kegiatan Penutup <span className="text-red-500">*</span></label>
                            <textarea value={form.kegiatan_penutup} onChange={e => updateField('kegiatan_penutup', e.target.value)} placeholder="Kesimpulan, refleksi, tugas, doa penutup..." className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent min-h-[80px] resize-y" />
                        </div>
                    </>}

                    {formStep === 3 && <>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Asesmen Formatif</label>
                            <textarea value={form.asesmen_formatif} onChange={e => updateField('asesmen_formatif', e.target.value)} placeholder="Tanya jawab, observasi, kuis singkat..." className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent min-h-[80px] resize-y" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Asesmen Sumatif</label>
                            <textarea value={form.asesmen_sumatif} onChange={e => updateField('asesmen_sumatif', e.target.value)} placeholder="Tes tertulis, presentasi, praktik..." className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent min-h-[80px] resize-y" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Media & Sumber Belajar</label>
                            <textarea value={form.media_sumber} onChange={e => updateField('media_sumber', e.target.value)} placeholder="Buku paket, Al-Quran, papan tulis, LCD..." className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent min-h-[80px] resize-y" />
                        </div>
                    </>}
                </div>

                {/* Footer */}
                <div className="flex-shrink-0 p-4 border-t border-gray-100 bg-white">
                    <div className="flex gap-3">
                        {formStep > 0 && (
                            <button onClick={() => setFormStep(s => s - 1)} className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-600 font-medium hover:bg-gray-50">
                                <i className="fas fa-arrow-left mr-2"></i>Sebelumnya
                            </button>
                        )}
                        {formStep < 3 ? (
                            <button onClick={() => setFormStep(s => s + 1)} className="flex-1 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-medium hover:shadow-lg">
                                Selanjutnya<i className="fas fa-arrow-right ml-2"></i>
                            </button>
                        ) : (
                            <button onClick={onSave} disabled={saving} className="flex-1 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-medium hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
                                {saving ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-save"></i> Simpan Modul</>}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}

// ── Detail Modal ──
function DetailModal({ data, onClose, onEdit, onDelete, onLock, onUnlock, onDuplicate, onExportPdf }) {
    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-md flex flex-col shadow-2xl overflow-hidden" style={{ maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
                <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="font-bold">Detail Modul Ajar</h2>
                            <p className="text-green-200 text-xs">{data.mapel} • {data.kelas}</p>
                        </div>
                        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-lg"><i className="fas fa-times text-xl"></i></button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <span className={`text-xs px-3 py-1 rounded-full font-medium ${data.status === 'locked' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {data.status === 'locked' ? '🔒 Terkunci' : '📝 Draft'}
                        </span>
                        <span className="text-xs text-gray-400">{data.updated_at}</span>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 text-sm">
                        <div className="flex"><span className="text-gray-500 w-28">Bab/Materi</span><span className="font-medium text-gray-800">: {data.bab_materi}</span></div>
                        <div className="flex"><span className="text-gray-500 w-28">Fase</span><span className="text-gray-800">: {data.fase || '-'}</span></div>
                        <div className="flex"><span className="text-gray-500 w-28">Semester</span><span className="text-gray-800">: {data.semester}</span></div>
                        <div className="flex"><span className="text-gray-500 w-28">Alokasi Waktu</span><span className="text-gray-800">: {data.alokasi_waktu || '-'}</span></div>
                    </div>

                    <Section title="Tujuan Pembelajaran" icon="fa-bullseye" color="green">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap text-justify">{data.tujuan_pembelajaran}</p>
                    </Section>

                    {data.profil_pelajar?.length > 0 && (() => {
                        const hasKbc = data.profil_pelajar.some(k => k.startsWith('cinta_'));
                        const hasKumer = data.profil_pelajar.some(k => !k.startsWith('cinta_'));
                        return (
                            <>
                                {hasKumer && (
                                    <Section title="Profil Pelajar Pancasila" icon="fa-star" color="amber">
                                        <div className="flex flex-wrap gap-1.5">
                                            {PROFIL_KUMER.filter(o => data.profil_pelajar.includes(o.key)).map(o => (
                                                <span key={o.key} className="text-[10px] bg-amber-50 text-amber-700 px-2 py-1 rounded-full border border-amber-200">{o.label}</span>
                                            ))}
                                        </div>
                                    </Section>
                                )}
                                {hasKbc && (
                                    <Section title="5 Pilar Cinta (KBC)" icon="fa-heart" color="pink">
                                        <div className="flex flex-wrap gap-1.5">
                                            {PROFIL_KBC.filter(o => data.profil_pelajar.includes(o.key)).map(o => (
                                                <span key={o.key} className="text-[10px] bg-pink-50 text-pink-700 px-2 py-1 rounded-full border border-pink-200">{o.label}</span>
                                            ))}
                                        </div>
                                    </Section>
                                )}
                            </>
                        );
                    })()}

                    <Section title="Kegiatan Pembelajaran" icon="fa-chalkboard-teacher" color="blue">
                        <div className="space-y-3">
                            <div><label className="text-xs font-semibold text-blue-600 mb-1 block">Pendahuluan</label><p className="text-sm text-gray-700 whitespace-pre-wrap text-justify">{data.kegiatan_pendahuluan}</p></div>
                            <div><label className="text-xs font-semibold text-blue-600 mb-1 block">Inti</label><p className="text-sm text-gray-700 whitespace-pre-wrap text-justify">{data.kegiatan_inti}</p></div>
                            <div><label className="text-xs font-semibold text-blue-600 mb-1 block">Penutup</label><p className="text-sm text-gray-700 whitespace-pre-wrap text-justify">{data.kegiatan_penutup}</p></div>
                        </div>
                    </Section>

                    {(data.asesmen_formatif || data.asesmen_sumatif) && (
                        <Section title="Asesmen" icon="fa-clipboard-check" color="green">
                            <div className="space-y-3">
                                {data.asesmen_formatif && <div><label className="text-xs font-semibold text-green-600 mb-1 block">Formatif</label><p className="text-sm text-gray-700 whitespace-pre-wrap text-justify">{data.asesmen_formatif}</p></div>}
                                {data.asesmen_sumatif && <div><label className="text-xs font-semibold text-green-600 mb-1 block">Sumatif</label><p className="text-sm text-gray-700 whitespace-pre-wrap text-justify">{data.asesmen_sumatif}</p></div>}
                            </div>
                        </Section>
                    )}

                    {data.media_sumber && (
                        <Section title="Media & Sumber Belajar" icon="fa-laptop" color="teal">
                            <p className="text-sm text-gray-700 whitespace-pre-wrap text-justify">{data.media_sumber}</p>
                        </Section>
                    )}
                </div>

                <div className="flex-shrink-0 p-4 border-t border-gray-100 bg-white">
                    <div className="grid grid-cols-2 gap-2 mb-2">
                        {data.status === 'draft' ? (
                            <>
                                <button onClick={onEdit} className="py-2.5 bg-orange-50 text-orange-600 rounded-xl text-sm font-medium hover:bg-orange-100 flex items-center justify-center gap-1.5">
                                    <i className="fas fa-edit text-xs"></i> Edit
                                </button>
                                <button onClick={onLock} className="py-2.5 bg-green-50 text-green-600 rounded-xl text-sm font-medium hover:bg-green-100 flex items-center justify-center gap-1.5">
                                    <i className="fas fa-lock text-xs"></i> Kunci
                                </button>
                            </>
                        ) : (
                            <>
                                <button onClick={onUnlock} className="py-2.5 bg-yellow-50 text-yellow-600 rounded-xl text-sm font-medium hover:bg-yellow-100 flex items-center justify-center gap-1.5">
                                    <i className="fas fa-unlock text-xs"></i> Buka Kunci
                                </button>
                                <button onClick={onExportPdf} className="py-2.5 bg-blue-50 text-blue-600 rounded-xl text-sm font-medium hover:bg-blue-100 flex items-center justify-center gap-1.5">
                                    <i className="fas fa-file-pdf text-xs"></i> Cetak PDF
                                </button>
                            </>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={onDuplicate} className="py-2.5 bg-purple-50 text-purple-600 rounded-xl text-sm font-medium hover:bg-purple-100 flex items-center justify-center gap-1.5">
                            <i className="fas fa-copy text-xs"></i> Duplikat
                        </button>
                        {data.status === 'draft' && (
                            <button onClick={onDelete} className="py-2.5 bg-red-50 text-red-600 rounded-xl text-sm font-medium hover:bg-red-100 flex items-center justify-center gap-1.5">
                                <i className="fas fa-trash text-xs"></i> Hapus
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}

function Section({ title, icon, color, children }) {
    const colors = {
        green: 'bg-green-50 text-green-700 border-green-200',
        blue: 'bg-blue-50 text-blue-700 border-blue-200',
        amber: 'bg-amber-50 text-amber-700 border-amber-200',
        teal: 'bg-teal-50 text-teal-700 border-teal-200',
        purple: 'bg-purple-50 text-purple-700 border-purple-200',
    };
    return (
        <div className={`rounded-xl border p-3 ${colors[color] || colors.green}`}>
            <h4 className="text-xs font-bold mb-2 flex items-center gap-1.5">
                <i className={`fas ${icon} text-[10px]`}></i> {title}
            </h4>
            {children}
        </div>
    );
}

export default Modul;
