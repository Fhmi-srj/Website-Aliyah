import React, { useState } from 'react';
import { API_BASE, authFetch } from '../config/api';

/**
 * AiTextArea — Textarea with "✨ Rapihkan dengan AI" button.
 * Shows a preview of AI-formatted text that user can accept or reject.
 *
 * Props:
 *   value: string
 *   onChange: (newValue: string) => void
 *   placeholder?: string
 *   context: 'notulensi' | 'keterangan'
 *   label?: string
 *   required?: boolean
 *   className?: string (additional classes for textarea)
 */
export default function AiTextArea({ value, onChange, placeholder, context = 'notulensi', label, required, className = '' }) {
    const [aiLoading, setAiLoading] = useState(false);
    const [aiPreview, setAiPreview] = useState(null);

    const handleRapikan = async () => {
        if (!value || value.trim().length < 5) return;
        try {
            setAiLoading(true);
            setAiPreview(null);
            const res = await authFetch(`${API_BASE}/ai/rapikan-teks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: value, context })
            });
            const data = await res.json();
            if (data.success) {
                setAiPreview(data.result);
            } else {
                alert(data.message || 'Gagal merapikan teks');
            }
        } catch (error) {
            console.error('AI rapikan error:', error);
            alert('Terjadi kesalahan saat menghubungi AI');
        } finally {
            setAiLoading(false);
        }
    };

    const acceptPreview = () => {
        onChange(aiPreview);
        setAiPreview(null);
    };

    const rejectPreview = () => {
        setAiPreview(null);
    };

    // Simple markdown to HTML converter for preview
    const renderMarkdown = (text) => {
        if (!text) return '';
        return text
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/^(\d+)\.\s/gm, '<span class="text-green-600 font-bold">$1.</span> ')
            .replace(/^[-•]\s/gm, '<span class="text-green-600 font-bold">•</span> ')
            .replace(/\n/g, '<br/>');
    };

    return (
        <div>
            {label && (
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}
            <textarea
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder || 'Isi teks...'}
                className={`w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-green-400 min-h-[80px] resize-y ${className}`}
            />

            {/* AI Rapihkan Button */}
            {value && value.trim().length >= 5 && !aiPreview && (
                <button
                    type="button"
                    onClick={handleRapikan}
                    disabled={aiLoading}
                    className="mt-1.5 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-all disabled:opacity-50 disabled:cursor-wait"
                >
                    {aiLoading ? (
                        <>
                            <i className="fas fa-spinner fa-spin text-[10px]"></i>
                            <span>Merapikan...</span>
                        </>
                    ) : (
                        <>
                            <span>✨</span>
                            <span>Rapihkan dengan AI</span>
                        </>
                    )}
                </button>
            )}

            {/* AI Preview */}
            {aiPreview && (
                <div className="mt-2 border border-purple-200 rounded-xl overflow-hidden animate-fadeIn">
                    <div className="bg-purple-50 px-3 py-2 flex items-center gap-2 border-b border-purple-200">
                        <span className="text-xs font-bold text-purple-700">✨ Hasil AI</span>
                        <span className="text-[10px] text-purple-400">Preview — pilih terima atau tolak</span>
                    </div>
                    <div
                        className="p-3 text-sm text-gray-700 bg-white leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(aiPreview) }}
                    />
                    <div className="flex gap-2 p-2 bg-purple-50 border-t border-purple-200">
                        <button
                            type="button"
                            onClick={acceptPreview}
                            className="flex-1 py-1.5 text-xs font-bold text-white bg-green-500 rounded-lg hover:bg-green-600 transition-all flex items-center justify-center gap-1"
                        >
                            <i className="fas fa-check"></i> Terima
                        </button>
                        <button
                            type="button"
                            onClick={rejectPreview}
                            className="flex-1 py-1.5 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all flex items-center justify-center gap-1"
                        >
                            <i className="fas fa-times"></i> Tolak
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
