import React, { useEffect } from 'react';

export default function CbtExamUI({
    questions,
    currentQuestionIdx,
    setCurrentQuestionIdx,
    answers,
    handleAnswer,
    finishExam,
    videoRef,
    timeLeft = "01:45:00",
    isPreview = false,
    onClosePreview
}) {
    const [fontSizeMultiplier, setFontSizeMultiplier] = React.useState(1);

    if (!questions || questions.length === 0) {
        return <div className="p-10 text-center">Soal belum tersedia untuk ujian ini.</div>;
    }

    const currentQ = questions[currentQuestionIdx];
    if (!currentQ) return null;

    let opts = [];
    try { opts = typeof currentQ.options === 'string' ? JSON.parse(currentQ.options) : (currentQ.options || []); } catch (e) {}

    // Normalize correct_answer to always be an array of uppercase strings (for preview mode)
    let correctAnswerArr = [];
    try {
        const ca = currentQ.correct_answer;
        if (ca) {
            const parsed = typeof ca === 'string' ? JSON.parse(ca) : ca;
            correctAnswerArr = Array.isArray(parsed)
                ? parsed.map(a => String(a).toUpperCase())
                : [String(parsed).toUpperCase()];
        }
    } catch (e) {
        if (currentQ.correct_answer) {
            correctAnswerArr = [String(currentQ.correct_answer).toUpperCase()];
        }
    }

    // Keyboard controls
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ignore if user is typing in an input or textarea
            if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
            
            const q = questions[currentQuestionIdx];
            if (!q) return;

            // Navigasi soal
            if (e.key === 'ArrowRight') {
                if (currentQuestionIdx < questions.length - 1) setCurrentQuestionIdx(prev => prev + 1);
                return;
            }
            if (e.key === 'ArrowLeft') {
                if (currentQuestionIdx > 0) setCurrentQuestionIdx(prev => prev - 1);
                return;
            }

            const key = String(e.key).toUpperCase();
            
            if (q.type === 'multiple_choice' || q.type === 'true_false') {
                let validIds = [];
                if (q.type === 'true_false') validIds = ['A', 'B'];
                else validIds = opts.map(o => String(o.id).toUpperCase());
                
                if (validIds.includes(key)) {
                    handleAnswer(q.id, key);
                }
            } else if (q.type === 'ms_choice') {
                const validIds = opts.map(o => String(o.id).toUpperCase());
                if (validIds.includes(key)) {
                    let currentAns = Array.isArray(answers[q.id]) ? [...answers[q.id]] : [];
                    if (currentAns.includes(key)) currentAns = currentAns.filter(id => id !== key);
                    else currentAns.push(key);
                    handleAnswer(q.id, currentAns);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentQuestionIdx, questions, answers, handleAnswer, opts]);

    return (
        <div className={`w-full max-w-7xl mx-auto px-4 py-6 md:p-6 flex flex-col md:flex-row gap-6 md:gap-8 ${isPreview ? 'bg-gray-50' : ''}`}>
            <div className="w-full md:flex-1">
                {/* Question Area */}
                <div className="bg-white rounded-3xl shadow-soft border border-gray-100 p-6 md:p-8 relative overflow-hidden">
                    {isPreview && (
                        <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-bl-xl shadow-sm z-10">
                            Mode Pendidik (Preview)
                        </div>
                    )}
                    <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
                        <div className="flex items-center gap-3">
                            <div className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-black uppercase tracking-widest border border-blue-100">
                                Soal No. {currentQuestionIdx + 1}
                            </div>
                            <div className="text-xs font-bold text-gray-400">
                                Bobot: {currentQ.weight}
                            </div>
                        </div>
                        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                            <button onClick={() => setFontSizeMultiplier(prev => Math.max(0.75, prev - 0.25))} className="px-3 py-1.5 hover:bg-gray-200 text-gray-600 transition-colors border-r border-gray-200" title="Perkecil Teks">
                                <span className="font-bold text-[10px]">A-</span>
                            </button>
                            <button onClick={() => setFontSizeMultiplier(1)} className="px-3 py-1.5 hover:bg-gray-200 text-gray-600 transition-colors border-r border-gray-200" title="Teks Normal">
                                <span className="font-bold text-xs">A</span>
                            </button>
                            <button onClick={() => setFontSizeMultiplier(prev => Math.min(1.75, prev + 0.25))} className="px-3 py-1.5 hover:bg-gray-200 text-gray-600 transition-colors" title="Perbesar Teks">
                                <span className="font-bold text-sm">A+</span>
                            </button>
                        </div>
                    </div>
                    
                    <div 
                        className="prose max-w-none text-gray-800 font-medium leading-relaxed mb-8" 
                        style={{ fontSize: `${1.125 * fontSizeMultiplier}rem` }}
                        dangerouslySetInnerHTML={{ __html: currentQ.content }}
                    ></div>
                    
                    {currentQ.type === 'multiple_choice' && (
                        <div className="space-y-3">
                            {opts.map(opt => {
                                const isSelected = answers[currentQ.id] === opt.id;
                                // In preview mode, use pre-normalized correctAnswerArr
                                const isCorrect = isPreview && correctAnswerArr.includes(String(opt.id).toUpperCase());
                                const isWrong = isSelected && !isCorrect;

                                let borderClass = 'border-gray-100 bg-gray-50 hover:border-gray-300';
                                let circleClass = 'bg-white border border-gray-300 text-gray-500';
                                if (isPreview) {
                                    if (isCorrect) {
                                        borderClass = 'border-green-400 bg-green-50';
                                        circleClass = 'bg-green-500 text-white';
                                    } else if (isWrong) {
                                        borderClass = 'border-red-400 bg-red-50';
                                        circleClass = 'bg-red-400 text-white';
                                    } else if (isSelected) {
                                        borderClass = 'border-primary bg-primary/5';
                                        circleClass = 'bg-primary text-white';
                                    }
                                } else {
                                    if (isSelected) {
                                        borderClass = 'border-primary bg-primary/5';
                                        circleClass = 'bg-primary text-white';
                                    }
                                }

                                return (
                                    <label key={opt.id} className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${borderClass}`}>
                                        <div className={`w-8 h-8 rounded-full flex flex-shrink-0 items-center justify-center font-black ${circleClass}`} style={{ fontSize: `${0.875 * Math.min(fontSizeMultiplier, 1.2)}rem` }}>
                                            {isPreview && isCorrect ? <i className="fas fa-check"></i> : opt.id}
                                        </div>
                                        <span className="text-gray-700 font-medium" style={{ fontSize: `${1 * fontSizeMultiplier}rem` }}>{opt.text}</span>
                                        {isPreview && isCorrect && (
                                            <span className="ml-auto text-[9px] font-black uppercase tracking-widest text-green-600 bg-green-100 px-2 py-0.5 rounded-full flex-shrink-0">Jawaban Benar</span>
                                        )}
                                        <input 
                                            type="radio" 
                                            name={`q_${currentQ.id}`} 
                                            value={opt.id} 
                                            checked={isSelected}
                                            onChange={() => handleAnswer(currentQ.id, opt.id)}
                                            className="sr-only" 
                                        />
                                    </label>
                                );
                            })}
                        </div>
                    )}

                    {currentQ.type === 'ms_choice' && (
                        <div className="space-y-3">
                            <p className="text-[10px] text-amber-600 bg-amber-50 inline-block px-3 py-1.5 rounded-lg border border-amber-100 font-bold uppercase tracking-widest mb-2">
                                <i className="fas fa-info-circle mr-1"></i> Jawaban bisa lebih dari satu
                            </p>
                            {opts.map(opt => {
                                const isChecked = Array.isArray(answers[currentQ.id]) && answers[currentQ.id].includes(opt.id);
                                // In preview mode, use pre-normalized correctAnswerArr
                                const isCorrect = isPreview && correctAnswerArr.includes(String(opt.id).toUpperCase());
                                const isWrong = isChecked && !isCorrect;

                                let borderClass = 'border-gray-100 bg-gray-50 hover:border-gray-300';
                                let boxClass = 'bg-white border border-gray-300 text-gray-500';
                                if (isPreview) {
                                    if (isCorrect) {
                                        borderClass = 'border-green-400 bg-green-50';
                                        boxClass = 'bg-green-500 text-white';
                                    } else if (isWrong) {
                                        borderClass = 'border-red-400 bg-red-50';
                                        boxClass = 'bg-red-400 text-white';
                                    } else if (isChecked) {
                                        borderClass = 'border-primary bg-primary/5';
                                        boxClass = 'bg-primary text-white';
                                    }
                                } else {
                                    if (isChecked) {
                                        borderClass = 'border-primary bg-primary/5';
                                        boxClass = 'bg-primary text-white';
                                    }
                                }

                                return (
                                    <label key={opt.id} className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${borderClass}`}>
                                        <div className={`w-8 h-8 rounded-lg flex flex-shrink-0 items-center justify-center font-black ${boxClass}`} style={{ fontSize: `${0.875 * Math.min(fontSizeMultiplier, 1.2)}rem` }}>
                                            {(isChecked || (isPreview && isCorrect)) ? <i className="fas fa-check"></i> : opt.id}
                                        </div>
                                        <span className="text-gray-700 font-medium" style={{ fontSize: `${1 * fontSizeMultiplier}rem` }}>{opt.text}</span>
                                        {isPreview && isCorrect && (
                                            <span className="ml-auto text-[9px] font-black uppercase tracking-widest text-green-600 bg-green-100 px-2 py-0.5 rounded-full flex-shrink-0">✓ Benar</span>
                                        )}
                                        <input 
                                            type="checkbox" 
                                            checked={isChecked}
                                            onChange={(e) => {
                                                let currentAns = Array.isArray(answers[currentQ.id]) ? [...answers[currentQ.id]] : [];
                                                if (e.target.checked) currentAns.push(opt.id);
                                                else currentAns = currentAns.filter(id => id !== opt.id);
                                                handleAnswer(currentQ.id, currentAns);
                                            }}
                                            className="sr-only" 
                                        />
                                    </label>
                                );
                            })}
                        </div>
                    )}

                    {currentQ.type === 'true_false' && (
                        <div className="grid grid-cols-2 gap-4 mt-8">
                            {[
                                { id: 'A', text: 'PERNYATAAN BENAR', icon: 'check-circle', color: 'green' },
                                { id: 'B', text: 'PERNYATAAN SALAH', icon: 'times-circle', color: 'red' }
                            ].map(opt => {
                                const isSelected = answers[currentQ.id] === opt.id;
                                return (
                                    <label key={opt.id} className={`flex flex-col items-center justify-center p-6 md:p-10 rounded-3xl border-[3px] cursor-pointer transition-all ${isSelected ? (opt.id === 'A' ? 'border-green-500 bg-green-50 shadow-lg shadow-green-500/20 text-green-700' : 'border-red-500 bg-red-50 shadow-lg shadow-red-500/20 text-red-700') : 'border-gray-100 bg-gray-50 hover:border-gray-300 hover:bg-white text-gray-400'}`}>
                                        <i className={`fas fa-${opt.icon} mb-3 ${isSelected ? (opt.id === 'A' ? 'text-green-500' : 'text-red-500') : 'text-gray-300'}`} style={{ fontSize: `${2.25 * Math.min(fontSizeMultiplier, 1.3)}rem` }}></i>
                                        <span className={`font-black tracking-widest text-center uppercase`} style={{ fontSize: `${0.875 * fontSizeMultiplier}rem` }}>{opt.text}</span>
                                        <input 
                                            type="radio" 
                                            checked={isSelected}
                                            onChange={() => handleAnswer(currentQ.id, opt.id)}
                                            className="sr-only" 
                                        />
                                    </label>
                                );
                            })}
                        </div>
                    )}

                    {currentQ.type === 'matching' && opts.length > 0 && (() => {
                        const rightList = [...opts].map(o => o.right).sort((a,b) => a.localeCompare(b));
                        return (
                            <div className="mt-4 border border-gray-200 rounded-3xl overflow-hidden bg-gray-50/50 p-4 md:p-6 space-y-4 shadow-inner">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs"><i className="fas fa-link"></i></span>
                                    Cocokkan Pasangan Sebelah Kiri dan Kanan
                                </p>
                                {opts.map((opt, i) => {
                                    const ansObj = (typeof answers[currentQ.id] === 'object' && answers[currentQ.id] !== null && !Array.isArray(answers[currentQ.id])) ? answers[currentQ.id] : {};
                                    const selectedVal = ansObj[opt.left] || '';
                                    return (
                                        <div key={i} className="flex flex-col md:flex-row md:items-center gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm transition-all hover:border-primary/50">
                                            <div className="flex-1 font-bold text-gray-700" style={{ fontSize: `${0.875 * fontSizeMultiplier}rem` }}>
                                                {opt.left}
                                            </div>
                                            <div className="text-gray-300 hidden md:block"><i className="fas fa-arrow-right"></i></div>
                                            <div className="flex-shrink-0 w-full md:w-[60%]">
                                                <select 
                                                    value={selectedVal}
                                                    onChange={(e) => {
                                                        const newAns = { ...ansObj, [opt.left]: e.target.value };
                                                        handleAnswer(currentQ.id, newAns);
                                                    }}
                                                    className={`w-full font-semibold outline-none focus:ring-4 focus:ring-primary/20 border-2 rounded-xl p-3.5 appearance-none cursor-pointer text-ellipsis overflow-hidden ${selectedVal ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 bg-gray-50 text-gray-500'}`}
                                                    style={{ fontSize: `${0.875 * fontSizeMultiplier}rem`, backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right .5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}
                                                >
                                                    <option value="" disabled>-- Pilih Pasangan --</option>
                                                    {rightList.map((r, ri) => <option key={ri} value={r}>{r}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })()}

                    {currentQ.type === 'essay' && (
                        <div className="mt-4">
                            <textarea 
                                value={answers[currentQ.id] || ''}
                                onChange={(e) => handleAnswer(currentQ.id, e.target.value)}
                                className="w-full p-4 border border-gray-300 rounded-2xl min-h-[200px] focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-y text-gray-700"
                                placeholder="Tuliskan jawaban Anda di sini..."
                            ></textarea>
                        </div>
                    )}
                </div>

                {/* Navigation Controls */}
                <div className="mt-6 flex justify-between items-center">
                    <button 
                        disabled={currentQuestionIdx === 0} 
                        onClick={() => setCurrentQuestionIdx(prev => prev - 1)}
                        className="px-6 py-3 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-gray-50 disabled:opacity-50 transition-all flex items-center gap-2"
                    >
                        <i className="fas fa-arrow-left"></i> Sebelumnya
                    </button>
                    
                    {currentQuestionIdx === questions.length - 1 ? (
                        <button onClick={isPreview ? onClosePreview : finishExam} className={`px-6 py-3 border rounded-xl font-black uppercase tracking-widest text-xs shadow-lg transition-all flex items-center gap-2 ${isPreview ? 'bg-yellow-500 border-yellow-600 text-white hover:bg-yellow-600 shadow-yellow-500/30' : 'bg-green-500 border-green-600 text-white hover:bg-green-600 shadow-green-500/30'}`}>
                            {isPreview ? 'Tutup Preview' : 'Kumpulkan'} <i className={isPreview ? "fas fa-times" : "fas fa-check"}></i>
                        </button>
                    ) : (
                        <button 
                            onClick={() => setCurrentQuestionIdx(prev => prev + 1)}
                            className="px-6 py-3 bg-primary text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-primary/90 shadow-lg shadow-primary/30 transition-all flex items-center gap-2"
                        >
                            Selanjutnya <i className="fas fa-arrow-right"></i>
                        </button>
                    )}
                </div>
            </div>

            {/* Right Sidebar - Pagination & Camera */}
            <div className="w-full md:w-80 flex flex-col gap-6">
                {/* Timer Box */}
                <div className="bg-gray-800 text-white rounded-3xl p-6 text-center shadow-xl border border-gray-700">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Sisa Waktu</div>
                    <div className="text-4xl font-black font-mono tracking-tight">{timeLeft}</div>
                </div>

                {/* Question Navigator */}
                <div className="bg-white rounded-3xl p-6 shadow-soft border border-gray-100">
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-4 border-b pb-2 border-gray-100">Navigasi Soal</h3>
                    <div className="grid grid-cols-5 gap-2">
                        {questions.map((q, idx) => {
                            let isAnswered = false;
                            if (q.type === 'matching') {
                                isAnswered = answers[q.id] && typeof answers[q.id] === 'object' && !Array.isArray(answers[q.id]) && Object.keys(answers[q.id]).length > 0;
                            } else if (q.type === 'ms_choice') {
                                isAnswered = Array.isArray(answers[q.id]) && answers[q.id].length > 0;
                            } else {
                                isAnswered = answers[q.id] !== undefined && answers[q.id] !== '';
                            }
                            const isCurrent = currentQuestionIdx === idx;
                            return (
                                <button 
                                    key={q.id}
                                    onClick={() => setCurrentQuestionIdx(idx)}
                                    className={`w-10 h-10 rounded-xl font-bold text-sm flex items-center justify-center transition-all ${isCurrent ? 'ring-4 ring-primary/30 border border-primary bg-primary text-white' : isAnswered ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'}`}
                                >
                                    {idx + 1}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Webcam Box */}
                <div className="bg-black rounded-3xl overflow-hidden aspect-video relative flex items-center justify-center border-4 border-gray-200 shadow-inner">
                    {isPreview ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90 z-10">
                            <div className="text-center p-4">
                                <i className="fas fa-video-slash text-gray-600 text-4xl mb-3"></i>
                                <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest leading-relaxed">Kamera Non-Aktif<br/>(Mode Preview)</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <video ref={videoRef} autoPlay playsInline muted className="min-w-full min-h-full object-cover transform -scale-x-100 opacity-60"></video>
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <i className="fas fa-expand text-white/30 text-5xl opacity-0"></i>
                            </div>
                            <div className="absolute bottom-2 left-2 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                <span className="text-[8px] text-white font-bold uppercase tracking-widest">Pengawasan Aktif</span>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
