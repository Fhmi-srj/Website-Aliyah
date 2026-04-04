import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE, authFetch } from '../../../config/api';
import Swal from 'sweetalert2';

export default function AdminHasilUjian() {
    const { id } = useParams(); // exam_id
    const navigate = useNavigate();
    
    const [exam, setExam] = useState(null);
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Grading Modal State
    const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
    const [selectedSession, setSelectedSession] = useState(null);
    const [answersData, setAnswersData] = useState([]);
    const [loadingAnswers, setLoadingAnswers] = useState(false);
    const [gradeInputs, setGradeInputs] = useState({});
    const [isSaving, setIsSaving] = useState(false);
    const [showEssayOnly, setShowEssayOnly] = useState(false);

    useEffect(() => {
        fetchResults();
    }, [id]);

    const fetchResults = async () => {
        try {
            setLoading(true);
            const res = await authFetch(`${API_BASE}/cbt/exams/${id}/results`);
            const data = await res.json();
            setExam(data.exam);
            setSessions(data.sessions);
        } catch (error) {
            console.error('Failed to fetch results:', error);
            Swal.fire({ icon: 'error', title: 'Error', text: 'Gagal mengambil data hasil ujian.' });
        } finally {
            setLoading(false);
        }
    };

    const openGradeModal = async (session) => {
        setIsGradeModalOpen(true);
        setSelectedSession(session);
        setAnswersData([]);
        setGradeInputs({});
        setShowEssayOnly(false);
        
        try {
            setLoadingAnswers(true);
            const res = await authFetch(`${API_BASE}/cbt/exams/${id}/results/${session.siswa_id}`);
            if (res.ok) {
                const data = await res.json();
                setAnswersData(data.answers);
                
                // Initialize grade inputs with existing scores
                const initialGrades = {};
                data.answers.forEach(ans => {
                    initialGrades[ans.id] = ans.score_awarded ?? '';
                });
                setGradeInputs(initialGrades);
            }
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Gagal mengambil jawaban siswa.' });
        } finally {
            setLoadingAnswers(false);
        }
    };

    const handleSaveGrades = async () => {
        setIsSaving(true);
        try {
            const payload = {
                grades: Object.keys(gradeInputs).map(ansId => ({
                    answer_id: parseInt(ansId),
                    score_awarded: parseFloat(gradeInputs[ansId]) || 0
                }))
            };

            const res = await authFetch(`${API_BASE}/cbt/exams/${id}/results/${selectedSession.siswa_id}/grade`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const result = await res.json();
                Swal.fire({ icon: 'success', title: 'Tersimpan!', text: `Nilai berhasil disimpan. Total: ${result.new_score}`, timer: 1800, showConfirmButton: false });
                setIsGradeModalOpen(false);
                fetchResults();
            } else {
                Swal.fire({ icon: 'error', title: 'Gagal', text: 'Gagal menyimpan nilai.' });
            }
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Terjadi kesalahan sistem.' });
        } finally {
            setIsSaving(false);
        }
    };

    const hasEssay = answersData.some(a => a.question?.type === 'essay');
    const displayedAnswers = showEssayOnly ? answersData.filter(a => a.question?.type === 'essay') : answersData;

    if (loading) return (
        <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
    );
    if (!exam) return <div className="p-6 text-center text-red-500">Data ujian tidak ditemukan.</div>;

    return (
        <div className="animate-fadeIn flex flex-col flex-grow max-w-full overflow-auto">
            {/* Header */}
            <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/cbt/jadwal')} className="w-10 h-10 rounded-xl flex-shrink-0 bg-white border border-gray-200 text-gray-500 hover:text-primary hover:border-primary flex items-center justify-center transition-all shadow-sm">
                        <i className="fas fa-arrow-left"></i>
                    </button>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-lg md:text-xl font-black text-gray-800 uppercase tracking-tight truncate">Hasil Ujian: {exam.name}</h1>
                        <p className="text-[10px] md:text-xs text-gray-400 mt-0.5 font-medium uppercase tracking-widest truncate">
                            Bank Soal: {exam.question_bank?.name} &bull; {sessions.length} Peserta
                        </p>
                    </div>
                </div>
            </header>

            {/* Content Table */}
            <div className="bg-white rounded-2xl shadow-soft border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 font-bold tracking-wider w-12">No</th>
                                <th className="px-6 py-4 font-bold tracking-wider">Siswa</th>
                                <th className="px-6 py-4 font-bold tracking-wider">Kelas</th>
                                <th className="px-6 py-4 font-bold tracking-wider">Status</th>
                                <th className="px-6 py-4 font-bold tracking-wider text-center">Score Total</th>
                                <th className="px-6 py-4 font-bold tracking-wider text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {sessions.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center">
                                        <i className="fas fa-inbox text-3xl text-gray-300 mb-2 block"></i>
                                        <span className="text-gray-400 font-medium">Belum ada siswa yang mengerjakan ujian ini.</span>
                                    </td>
                                </tr>
                            ) : (
                                sessions.map((s, index) => (
                                    <tr key={s.id} className="hover:bg-gray-50/50 group transition-colors">
                                        <td className="px-6 py-4 w-12">{index + 1}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-800">{s.siswa?.nama}</div>
                                            <div className="text-xs text-gray-500">{s.siswa?.nisn}</div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">{s.siswa?.kelas?.kode_kelas || '-'}</td>
                                        <td className="px-6 py-4">
                                            {s.status === 'finished' ? (
                                                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-widest border border-green-200">Selesai</span>
                                            ) : s.status === 'ongoing' ? (
                                                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-widest border border-blue-200">Mengerjakan</span>
                                            ) : (
                                                <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-widest border border-gray-200">Belum</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="font-black text-primary text-base">{s.score !== null ? s.score : '-'}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button 
                                                onClick={() => openGradeModal(s)}
                                                className="action-btn w-auto px-4 h-8 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-all font-bold text-xs"
                                                title="Lihat Jawaban & Koreksi Esai"
                                            >
                                                <i className="fas fa-edit mr-1"></i> Koreksi / Detail
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Grading Modal */}
            {isGradeModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
                                    <i className="fas fa-check-double"></i>
                                </div>
                                <div>
                                    <h2 className="font-black text-gray-800 text-base uppercase tracking-tight">Koreksi Jawaban</h2>
                                    <p className="text-xs text-gray-500 font-medium">{selectedSession?.siswa?.nama} &bull; {selectedSession?.siswa?.kelas?.kode_kelas}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {hasEssay && (
                                    <button
                                        onClick={() => setShowEssayOnly(!showEssayOnly)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${showEssayOnly ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-amber-600 border-amber-200 hover:bg-amber-50'}`}
                                    >
                                        <i className="fas fa-filter mr-1"></i> {showEssayOnly ? 'Tampilkan Semua' : 'Esai Saja'}
                                    </button>
                                )}
                                <button onClick={() => setIsGradeModalOpen(false)} className="w-8 h-8 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center transition-all">
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {loadingAnswers ? (
                                <div className="py-16 flex flex-col items-center justify-center gap-3">
                                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                                    <p className="text-gray-400 text-sm font-medium">Memuat jawaban siswa...</p>
                                </div>
                            ) : answersData.length === 0 ? (
                                <div className="py-16 text-center">
                                    <i className="fas fa-inbox text-4xl text-gray-300 mb-3 block"></i>
                                    <p className="text-gray-400 font-medium">Tidak ada jawaban yang tersimpan.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {displayedAnswers.map((ans, idx) => {
                                        const isEssay = ans.question?.type === 'essay';
                                        const maxScore = ans.question?.weight ?? 1;
                                        const currentScore = parseFloat(gradeInputs[ans.id]) || 0;
                                        const pct = maxScore > 0 ? Math.min(100, (currentScore / maxScore) * 100) : 0;

                                        return (
                                            <div key={ans.id} className={`border rounded-2xl overflow-hidden ${isEssay ? 'border-amber-200 bg-amber-50/20' : 'border-gray-200 bg-gray-50/20'}`}>
                                                {/* Question Header */}
                                                <div className={`px-4 py-2.5 flex items-center gap-2 ${isEssay ? 'bg-amber-50 border-b border-amber-100' : 'bg-gray-50 border-b border-gray-100'}`}>
                                                    <span className="text-xs font-bold bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                                                        No. {answersData.indexOf(ans) + 1}
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${isEssay ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                                        {ans.question?.type?.replace('_', ' ')}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 font-bold ml-auto">Bobot: {maxScore}</span>
                                                </div>

                                                <div className="p-4">
                                                    <div className="flex gap-4 flex-col md:flex-row">
                                                        <div className="flex-1 space-y-3">
                                                            {/* Question Content */}
                                                            <div className="prose prose-sm max-w-none text-gray-800 font-medium" dangerouslySetInnerHTML={{ __html: ans.question?.content }} />
                                                            
                                                            {/* Student Answer */}
                                                            <div className="bg-white border border-gray-200 rounded-xl p-3">
                                                                <div className="font-bold text-gray-400 mb-1.5 text-[10px] uppercase tracking-widest">Jawaban Siswa:</div>
                                                                {ans.answer ? (
                                                                    <div className={`text-sm font-medium whitespace-pre-wrap ${isEssay ? 'text-gray-800' : 'text-gray-700'}`}>{ans.answer}</div>
                                                                ) : (
                                                                    <div className="text-red-400 italic text-sm">— Tidak menjawab —</div>
                                                                )}
                                                            </div>

                                                            {/* Correct Answer (for non-essay) */}
                                                            {!isEssay && ans.question?.correct_answer && (
                                                                <div className="flex items-center gap-2 text-xs text-green-700 font-bold bg-green-50 px-3 py-2 rounded-lg border border-green-100">
                                                                    <i className="fas fa-check-circle"></i>
                                                                    Kunci Jawaban: {ans.question.correct_answer?.replace(/["\[\]]/g, '')}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Score Input */}
                                                        <div className="w-full md:w-36 flex-shrink-0">
                                                            <div className={`rounded-xl border p-4 text-center ${isEssay ? 'border-amber-200 bg-amber-50' : 'border-blue-100 bg-blue-50/50'}`}>
                                                                <label className={`block text-[10px] font-black mb-2 uppercase tracking-widest ${isEssay ? 'text-amber-600' : 'text-blue-600'}`}>
                                                                    {isEssay ? '✏️ Nilai Esai' : 'Skor Nilai'}
                                                                </label>
                                                                <input 
                                                                    type="number"
                                                                    step="0.5"
                                                                    min="0"
                                                                    max={maxScore}
                                                                    value={gradeInputs[ans.id] ?? ''}
                                                                    onChange={(e) => setGradeInputs({...gradeInputs, [ans.id]: e.target.value})}
                                                                    className={`w-full text-center font-black text-xl p-2 border rounded-lg outline-none transition-all ${isEssay ? 'border-amber-300 focus:ring-2 focus:ring-amber-400 bg-white' : 'border-gray-300 focus:ring-2 focus:ring-primary bg-white'}`}
                                                                    disabled={!isEssay}
                                                                />
                                                                <div className="text-[10px] text-gray-400 font-bold mt-1.5">Maks: {maxScore}</div>
                                                                {isEssay && (
                                                                    <div className="mt-2">
                                                                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                                            <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }}></div>
                                                                        </div>
                                                                        <div className="text-[10px] text-gray-400 mt-1">{pct.toFixed(0)}%</div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="flex justify-between items-center gap-3 p-6 border-t border-gray-100 bg-gray-50/50">
                            <div className="text-xs text-gray-400 font-medium">
                                {hasEssay ? (
                                    <span className="text-amber-600 font-bold"><i className="fas fa-info-circle mr-1"></i>Input nilai hanya untuk soal esai</span>
                                ) : (
                                    <span>Semua soal dinilai otomatis oleh sistem</span>
                                )}
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsGradeModalOpen(false)}
                                    className="px-5 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-all text-sm"
                                >
                                    Tutup
                                </button>
                                {hasEssay && (
                                    <button
                                        type="button"
                                        onClick={handleSaveGrades}
                                        disabled={isSaving}
                                        className="px-5 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 shadow-lg shadow-primary/30 transition-all flex items-center gap-2 text-sm disabled:opacity-60"
                                    >
                                        {isSaving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Menyimpan...</> : <><i className="fas fa-save"></i> Simpan Nilai Esai</>}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
