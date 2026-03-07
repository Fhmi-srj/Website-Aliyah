import React, { useState, useEffect, useCallback } from 'react';
import { authFetch } from '../../config/api';
import Swal from 'sweetalert2';

const API_BASE = '/api';

function Nota() {
    const [activeTab, setActiveTab] = useState('generate');
    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [formData, setFormData] = useState({});
    const [history, setHistory] = useState([]);
    const [historyPagination, setHistoryPagination] = useState({});
    const [loading, setLoading] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [generating, setGenerating] = useState(false);

    // Preset state
    const [selectedPreset, setSelectedPreset] = useState(null);

    // Template CRUD modal state
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [templateForm, setTemplateForm] = useState({ nama: '', fields: [], layout_html: '', is_active: true });

    // ── Fetch Templates ────────────────────────────────────────────
    const fetchTemplates = useCallback(async () => {
        try {
            setLoading(true);
            const response = await authFetch(`${API_BASE}/nota/templates`);
            const data = await response.json();
            setTemplates(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching templates:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // ── Fetch History ──────────────────────────────────────────────
    const fetchHistory = useCallback(async (page = 1) => {
        try {
            setHistoryLoading(true);
            const response = await authFetch(`${API_BASE}/nota/history?page=${page}`);
            const data = await response.json();
            setHistory(data.data || []);
            setHistoryPagination({
                current_page: data.current_page,
                last_page: data.last_page,
                total: data.total,
            });
        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setHistoryLoading(false);
        }
    }, []);

    useEffect(() => { fetchTemplates(); }, [fetchTemplates]);
    useEffect(() => { if (activeTab === 'riwayat') fetchHistory(); }, [activeTab, fetchHistory]);

    // ── Preset handlers ─────────────────────────────────────────────
    const handleSelectPreset = (preset) => {
        setSelectedPreset(preset);
        setFormData(preset.data || {});
    };

    const handleClearPreset = () => {
        setSelectedPreset(null);
        setFormData({});
    };

    const handleSaveAsPreset = async () => {
        if (!selectedTemplate) return;
        const hasData = Object.values(formData).some(v => v?.toString().trim());
        if (!hasData) {
            Swal.fire({ icon: 'warning', title: 'Form masih kosong', text: 'Isi data terlebih dahulu sebelum menyimpan sebagai preset' });
            return;
        }

        const { value: nama } = await Swal.fire({
            title: 'Simpan sebagai Preset',
            input: 'text',
            inputLabel: 'Nama Preset (contoh: Listrik PLN, Indihome, Toko ABC)',
            inputPlaceholder: 'Masukkan nama preset...',
            showCancelButton: true,
            confirmButtonColor: '#F59E0B',
            confirmButtonText: 'Simpan',
            cancelButtonText: 'Batal',
            inputValidator: (value) => { if (!value) return 'Nama preset wajib diisi'; },
        });

        if (nama) {
            try {
                const response = await authFetch(`${API_BASE}/nota/presets`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nota_template_id: selectedTemplate.id, nama, data: formData }),
                });
                const preset = await response.json();
                if (preset.id) {
                    Swal.fire({ icon: 'success', title: `Preset "${nama}" tersimpan!`, timer: 1500, showConfirmButton: false });
                    fetchTemplates(); // refresh presets
                }
            } catch (e) {
                Swal.fire({ icon: 'error', title: 'Gagal menyimpan preset', text: e.message });
            }
        }
    };

    const handleDeletePreset = async (presetId, presetName) => {
        const result = await Swal.fire({
            title: `Hapus preset "${presetName}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#EF4444',
            confirmButtonText: 'Hapus',
            cancelButtonText: 'Batal',
        });
        if (result.isConfirmed) {
            try {
                await authFetch(`${API_BASE}/nota/presets/${presetId}`, { method: 'DELETE' });
                if (selectedPreset?.id === presetId) { setSelectedPreset(null); }
                fetchTemplates();
            } catch (e) {
                Swal.fire({ icon: 'error', title: 'Gagal', text: e.message });
            }
        }
    };

    // ── Generate Nota ──────────────────────────────────────────────
    const handleGenerate = async () => {
        if (!selectedTemplate) return;

        // Validate required fields
        const requiredFields = selectedTemplate.fields.filter(f => f.required);
        const missing = requiredFields.filter(f => !formData[f.key]?.toString().trim());
        if (missing.length > 0) {
            Swal.fire({ icon: 'warning', title: 'Field wajib belum diisi', html: `<p class="text-gray-600">${missing.map(f => f.label).join(', ')}</p>` });
            return;
        }

        try {
            setGenerating(true);
            const response = await authFetch(`${API_BASE}/nota/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nota_template_id: selectedTemplate.id, data: formData }),
            });
            const result = await response.json();

            if (result.id) {
                // Open print page in new window
                const token = localStorage.getItem('auth_token');
                window.open(`${API_BASE}/nota/print/${result.id}?token=${token}`, '_blank');

                Swal.fire({ icon: 'success', title: 'Nota berhasil dibuat!', text: 'Halaman cetak terbuka di tab baru', timer: 2000, showConfirmButton: false });
                setFormData({});
            }
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Gagal', text: error.message });
        } finally {
            setGenerating(false);
        }
    };

    // ── Template CRUD ──────────────────────────────────────────────
    const handleSaveTemplate = async () => {
        if (!templateForm.nama || !templateForm.layout_html || templateForm.fields.length === 0) {
            Swal.fire({ icon: 'warning', title: 'Lengkapi data template', text: 'Nama, fields, dan layout HTML wajib diisi' });
            return;
        }

        try {
            const url = editingTemplate ? `${API_BASE}/nota/templates/${editingTemplate.id}` : `${API_BASE}/nota/templates`;
            const method = editingTemplate ? 'PUT' : 'POST';

            const response = await authFetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(templateForm),
            });
            const data = await response.json();

            if (data.id) {
                Swal.fire({ icon: 'success', title: editingTemplate ? 'Template diperbarui' : 'Template dibuat', timer: 1500, showConfirmButton: false });
                setShowTemplateModal(false);
                setEditingTemplate(null);
                setTemplateForm({ nama: '', fields: [], layout_html: '', is_active: true });
                fetchTemplates();
            }
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Gagal', text: error.message });
        }
    };

    const handleDeleteTemplate = async (id) => {
        const result = await Swal.fire({
            title: 'Hapus template?',
            text: 'Template dan semua riwayat nota akan dihapus',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#EF4444',
            cancelButtonColor: '#6B7280',
            confirmButtonText: 'Ya, Hapus',
            cancelButtonText: 'Batal',
        });

        if (result.isConfirmed) {
            try {
                await authFetch(`${API_BASE}/nota/templates/${id}`, { method: 'DELETE' });
                Swal.fire({ icon: 'success', title: 'Dihapus', timer: 1500, showConfirmButton: false });
                fetchTemplates();
            } catch (error) {
                Swal.fire({ icon: 'error', title: 'Gagal', text: error.message });
            }
        }
    };

    const handleEditTemplate = (template) => {
        setEditingTemplate(template);
        setTemplateForm({
            nama: template.nama,
            fields: template.fields || [],
            layout_html: template.layout_html || '',
            is_active: template.is_active,
        });
        setShowTemplateModal(true);
    };

    const handleAddField = () => {
        setTemplateForm(prev => ({
            ...prev,
            fields: [...prev.fields, { key: '', label: '', type: 'text', required: false }],
        }));
    };

    const handleFieldChange = (index, key, value) => {
        setTemplateForm(prev => {
            const fields = [...prev.fields];
            fields[index] = { ...fields[index], [key]: value };
            // Auto-generate key from label
            if (key === 'label') {
                fields[index].key = value.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
            }
            return { ...prev, fields };
        });
    };

    const handleRemoveField = (index) => {
        setTemplateForm(prev => ({
            ...prev,
            fields: prev.fields.filter((_, i) => i !== index),
        }));
    };

    // ── Delete History ──────────────────────────────────────────────
    const handleDeleteHistory = async (id) => {
        const result = await Swal.fire({
            title: 'Hapus riwayat nota?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#EF4444',
            confirmButtonText: 'Hapus',
            cancelButtonText: 'Batal',
        });
        if (result.isConfirmed) {
            try {
                await authFetch(`${API_BASE}/nota/history/${id}`, { method: 'DELETE' });
                fetchHistory(historyPagination.current_page);
            } catch (e) {
                Swal.fire({ icon: 'error', title: 'Gagal', text: e.message });
            }
        }
    };

    // ── Reprint from history ────────────────────────────────────────
    const handleReprint = (id) => {
        const token = localStorage.getItem('auth_token');
        window.open(`${API_BASE}/nota/print/${id}?token=${token}`, '_blank');
    };

    // ── Tabs config ─────────────────────────────────────────────────
    const tabs = [
        { id: 'generate', label: 'Generate Nota', icon: 'fa-file-invoice' },
        { id: 'template', label: 'Template', icon: 'fa-layer-group' },
        { id: 'riwayat', label: 'Riwayat', icon: 'fa-history' },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <header className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-200">
                            <i className="fas fa-receipt text-white text-xl"></i>
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-gray-800 uppercase tracking-tight">Generate Nota</h1>
                            <p className="text-xs text-gray-400 mt-0.5 font-medium uppercase tracking-widest">
                                Buat nota dan struk untuk laporan
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm p-1.5 flex gap-1">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${activeTab === tab.id
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                            }`}
                    >
                        <i className={`fas ${tab.icon}`}></i>
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* ═══════════════ TAB: GENERATE ═══════════════ */}
            {activeTab === 'generate' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Left: Template selection */}
                    <div className="bg-white rounded-xl shadow-sm p-5">
                        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <i className="fas fa-list text-amber-500"></i> Pilih Template
                        </h3>
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-4 border-amber-400 border-t-transparent"></div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {templates.filter(t => t.is_active).map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => { setSelectedTemplate(t); setSelectedPreset(null); setFormData({}); }}
                                        className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all duration-200 cursor-pointer ${selectedTemplate?.id === t.id
                                            ? 'border-amber-400 bg-amber-50 text-amber-800'
                                            : 'border-gray-100 hover:border-amber-200 hover:bg-amber-50/50 text-gray-700'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedTemplate?.id === t.id ? 'bg-amber-400 text-white' : 'bg-gray-100 text-gray-400'
                                                }`}>
                                                <i className="fas fa-file-invoice text-sm"></i>
                                            </div>
                                            <div>
                                                <div className="font-semibold text-sm">{t.nama}</div>
                                                <div className="text-xs text-gray-400">{(t.fields || []).length} field</div>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                                {templates.filter(t => t.is_active).length === 0 && (
                                    <p className="text-center text-gray-400 text-sm py-8">Belum ada template aktif</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right: Form */}
                    <div className="md:col-span-2 bg-white rounded-xl shadow-sm p-5">
                        {selectedTemplate ? (
                            <>
                                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                    <i className="fas fa-edit text-amber-500"></i>
                                    Isi Data — {selectedTemplate.nama}
                                </h3>

                                {/* ── Preset Selector ── */}
                                {(() => {
                                    const presets = selectedTemplate.presets || [];
                                    return presets.length > 0 || true ? (
                                        <div className="mb-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-3 border border-amber-100">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                                                    <i className="fas fa-bookmark"></i> Preset Tersimpan
                                                </span>
                                                {selectedPreset && (
                                                    <button onClick={handleClearPreset} className="text-[10px] text-gray-400 hover:text-gray-600 cursor-pointer flex items-center gap-1">
                                                        <i className="fas fa-times"></i> Reset
                                                    </button>
                                                )}
                                            </div>
                                            {presets.length > 0 ? (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {presets.map(p => (
                                                        <div key={p.id} className="group relative">
                                                            <button
                                                                onClick={() => handleSelectPreset(p)}
                                                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${selectedPreset?.id === p.id
                                                                        ? 'bg-amber-500 text-white shadow-md'
                                                                        : 'bg-white text-gray-600 hover:bg-amber-100 hover:text-amber-700 border border-gray-200'
                                                                    }`}
                                                            >
                                                                <i className="fas fa-bookmark text-[10px]"></i>
                                                                {p.nama}
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleDeletePreset(p.id, p.nama); }}
                                                                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow"
                                                                title="Hapus preset"
                                                            >
                                                                <i className="fas fa-times"></i>
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-[11px] text-amber-600/60">Belum ada preset. Isi form → klik "Simpan Preset" untuk menyimpan data yang sering dipakai.</p>
                                            )}
                                        </div>
                                    ) : null;
                                })()}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {(selectedTemplate.fields || []).map(field => (
                                        <div key={field.key} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                                                {field.label}
                                                {field.required && <span className="text-red-500 ml-1">*</span>}
                                            </label>
                                            {field.type === 'textarea' ? (
                                                <textarea
                                                    value={formData[field.key] || ''}
                                                    onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-transparent text-sm"
                                                    rows={3}
                                                    placeholder={field.label}
                                                />
                                            ) : (
                                                <input
                                                    type={field.type === 'number' ? 'number' : 'text'}
                                                    value={formData[field.key] || ''}
                                                    onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-transparent text-sm"
                                                    placeholder={field.label}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-6 flex items-center justify-between">
                                    <button
                                        onClick={handleSaveAsPreset}
                                        className="px-4 py-2 bg-white border border-amber-300 text-amber-700 rounded-xl text-sm font-medium hover:bg-amber-50 transition-all cursor-pointer flex items-center gap-2"
                                    >
                                        <i className="fas fa-bookmark"></i> Simpan Preset
                                    </button>
                                    <button
                                        onClick={handleGenerate}
                                        disabled={generating}
                                        className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold text-sm shadow-lg shadow-orange-200 hover:shadow-xl transition-all duration-200 disabled:opacity-50 cursor-pointer flex items-center gap-2"
                                    >
                                        {generating ? (
                                            <><i className="fas fa-spinner fa-spin"></i> Memproses...</>
                                        ) : (
                                            <><i className="fas fa-print"></i> Cetak Nota</>
                                        )}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                                <i className="fas fa-hand-pointer text-5xl mb-4"></i>
                                <p className="font-medium">Pilih template di sebelah kiri</p>
                                <p className="text-sm">untuk mulai mengisi nota</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ═══════════════ TAB: TEMPLATE ═══════════════ */}
            {activeTab === 'template' && (
                <div className="bg-white rounded-xl shadow-sm p-5">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <i className="fas fa-layer-group text-amber-500"></i> Kelola Template
                        </h3>
                        <button
                            onClick={() => { setEditingTemplate(null); setTemplateForm({ nama: '', fields: [], layout_html: '', is_active: true }); setShowTemplateModal(true); }}
                            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2"
                        >
                            <i className="fas fa-plus"></i> Template Baru
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-10 w-10 border-4 border-amber-400 border-t-transparent"></div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {templates.map(t => (
                                <div key={t.id} className="border border-gray-100 rounded-xl p-4 hover:border-amber-200 hover:shadow-md transition-all duration-200">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                                                <i className="fas fa-file-invoice text-amber-600"></i>
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-800 text-sm">{t.nama}</h4>
                                                <p className="text-xs text-gray-400">{(t.fields || []).length} field</p>
                                            </div>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${t.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                            {t.is_active ? 'Aktif' : 'Nonaktif'}
                                        </span>
                                    </div>

                                    <div className="flex flex-wrap gap-1 mb-3">
                                        {(t.fields || []).slice(0, 4).map(f => (
                                            <span key={f.key} className="px-2 py-0.5 bg-gray-50 rounded text-[10px] text-gray-500">{f.label}</span>
                                        ))}
                                        {(t.fields || []).length > 4 && (
                                            <span className="px-2 py-0.5 bg-gray-50 rounded text-[10px] text-gray-400">+{(t.fields || []).length - 4} lainnya</span>
                                        )}
                                    </div>

                                    <div className="flex gap-2">
                                        <button onClick={() => handleEditTemplate(t)} className="flex-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors cursor-pointer">
                                            <i className="fas fa-edit mr-1"></i> Edit
                                        </button>
                                        <button onClick={() => handleDeleteTemplate(t.id)} className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors cursor-pointer">
                                            <i className="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ═══════════════ TAB: RIWAYAT ═══════════════ */}
            {activeTab === 'riwayat' && (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    {historyLoading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-10 w-10 border-4 border-amber-400 border-t-transparent"></div>
                        </div>
                    ) : history.length > 0 ? (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Tanggal</th>
                                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Template</th>
                                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Data</th>
                                            <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {history.map(h => (
                                            <tr key={h.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                                    {new Date(h.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                                                        <i className="fas fa-file-invoice"></i>
                                                        {h.template?.nama || '-'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                                                    {h.data ? Object.entries(h.data).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(', ') : '-'}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className="flex justify-center gap-2">
                                                        <button onClick={() => handleReprint(h.id)} className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer" title="Cetak Ulang">
                                                            <i className="fas fa-print"></i>
                                                        </button>
                                                        <button onClick={() => handleDeleteHistory(h.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer" title="Hapus">
                                                            <i className="fas fa-trash"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {historyPagination.last_page > 1 && (
                                <div className="px-4 py-2.5 border-t border-gray-100 flex items-center justify-between">
                                    <p className="text-sm text-gray-500">{history.length} dari {historyPagination.total} nota</p>
                                    <div className="flex gap-1.5 items-center">
                                        <button onClick={() => fetchHistory(historyPagination.current_page - 1)} disabled={historyPagination.current_page === 1} className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50 cursor-pointer">
                                            <i className="fas fa-chevron-left"></i>
                                        </button>
                                        <span className="px-3 py-1 text-sm text-gray-600">{historyPagination.current_page}/{historyPagination.last_page}</span>
                                        <button onClick={() => fetchHistory(historyPagination.current_page + 1)} disabled={historyPagination.current_page === historyPagination.last_page} className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50 cursor-pointer">
                                            <i className="fas fa-chevron-right"></i>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-12 text-gray-400">
                            <i className="fas fa-receipt text-5xl mb-3"></i>
                            <p className="font-medium">Belum ada riwayat nota</p>
                            <p className="text-sm">Generate nota pertama Anda di tab "Generate Nota"</p>
                        </div>
                    )}
                </div>
            )}

            {/* ═══════════════ TEMPLATE MODAL ═══════════════ */}
            {showTemplateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-800">
                                <i className="fas fa-layer-group text-amber-500 mr-2"></i>
                                {editingTemplate ? 'Edit Template' : 'Template Baru'}
                            </h2>
                            <button onClick={() => setShowTemplateModal(false)} className="p-2 hover:bg-gray-100 rounded-lg cursor-pointer">
                                <i className="fas fa-times text-gray-500"></i>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 space-y-5">
                            {/* Nama */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nama Template</label>
                                <input
                                    type="text"
                                    value={templateForm.nama}
                                    onChange={e => setTemplateForm(prev => ({ ...prev, nama: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-400"
                                    placeholder="e.g., BRI m-Commerce, Shopee, Toko ABC"
                                />
                            </div>

                            {/* Active toggle */}
                            <div className="flex items-center gap-3">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={templateForm.is_active}
                                        onChange={e => setTemplateForm(prev => ({ ...prev, is_active: e.target.checked }))}
                                        className="sr-only peer"
                                    />
                                    <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                                </label>
                                <span className="text-sm text-gray-700">Template Aktif</span>
                            </div>

                            {/* Fields */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-semibold text-gray-700">Fields (Kolom Input)</label>
                                    <button onClick={handleAddField} className="px-3 py-1 bg-amber-50 text-amber-600 rounded-lg text-xs font-medium hover:bg-amber-100 cursor-pointer">
                                        <i className="fas fa-plus mr-1"></i> Tambah Field
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {templateForm.fields.map((field, idx) => (
                                        <div key={idx} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                                            <input
                                                type="text"
                                                value={field.label}
                                                onChange={e => handleFieldChange(idx, 'label', e.target.value)}
                                                className="flex-1 px-2 py-1.5 border border-gray-200 rounded text-sm"
                                                placeholder="Label field"
                                            />
                                            <select
                                                value={field.type}
                                                onChange={e => handleFieldChange(idx, 'type', e.target.value)}
                                                className="px-2 py-1.5 border border-gray-200 rounded text-sm w-24"
                                            >
                                                <option value="text">Text</option>
                                                <option value="number">Number</option>
                                                <option value="date">Date</option>
                                                <option value="textarea">Textarea</option>
                                            </select>
                                            <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={field.required || false}
                                                    onChange={e => handleFieldChange(idx, 'required', e.target.checked)}
                                                    className="rounded text-amber-500"
                                                />
                                                Wajib
                                            </label>
                                            <button onClick={() => handleRemoveField(idx)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer">
                                                <i className="fas fa-times text-xs"></i>
                                            </button>
                                        </div>
                                    ))}
                                    {templateForm.fields.length === 0 && (
                                        <p className="text-center text-gray-400 text-sm py-4">Belum ada field. Klik "Tambah Field" untuk menambahkan.</p>
                                    )}
                                </div>
                            </div>

                            {/* Layout HTML */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                    Layout HTML
                                    <span className="text-xs text-gray-400 font-normal ml-2">
                                        Gunakan <code className="bg-gray-100 px-1 rounded">{'{nama_field}'}</code> sebagai placeholder
                                    </span>
                                </label>
                                <textarea
                                    value={templateForm.layout_html}
                                    onChange={e => setTemplateForm(prev => ({ ...prev, layout_html: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-400 font-mono text-xs"
                                    rows={12}
                                    placeholder="<div>... {field_key} ...</div>"
                                />
                            </div>
                        </div>

                        <div className="p-5 border-t border-gray-100 flex justify-end gap-3">
                            <button onClick={() => setShowTemplateModal(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 cursor-pointer">
                                Batal
                            </button>
                            <button onClick={handleSaveTemplate} className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-semibold shadow-md hover:shadow-lg cursor-pointer">
                                <i className="fas fa-save mr-2"></i>
                                {editingTemplate ? 'Simpan Perubahan' : 'Buat Template'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Nota;
