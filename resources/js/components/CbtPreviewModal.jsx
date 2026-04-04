import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import CbtExamUI from './CbtExamUI';

export default function CbtPreviewModal({ show, onClose, questions }) {
    const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
    const [answers, setAnswers] = useState({});

    // Reset state when opened
    useEffect(() => {
        if (show) {
            setCurrentQuestionIdx(0);
            setAnswers({});
        }
    }, [show]);

    if (!show) return null;

    const handleAnswer = (qId, answerValue) => {
        setAnswers({ ...answers, [qId]: answerValue });
    };

    const modalContent = (
        <div className="fixed inset-0 z-[5000] bg-gray-50 flex flex-col w-full h-full overflow-y-auto">
            {/* Minimal Header just for Preview Mode indication */}
            <div className="bg-yellow-400 text-yellow-900 px-6 py-2 flex justify-between items-center shadow-md z-10 sticky top-0">
                <div className="font-black tracking-widest text-xs uppercase flex items-center gap-2">
                    <i className="fas fa-exclamation-triangle"></i>
                    Mode Pratinjau (Preview Ujian)
                </div>
                <button 
                    onClick={onClose}
                    className="w-8 h-8 rounded-full bg-yellow-500/50 hover:bg-yellow-500 flex items-center justify-center transition-all shadow-sm"
                >
                    <i className="fas fa-times"></i>
                </button>
            </div>
            
            {/* Main Exam UI */}
            <div className="flex-1 flex w-full">
                <CbtExamUI 
                    questions={questions}
                    currentQuestionIdx={currentQuestionIdx}
                    setCurrentQuestionIdx={setCurrentQuestionIdx}
                    answers={answers}
                    handleAnswer={handleAnswer}
                    finishExam={() => {}} // Won't be called because isPreview is true
                    videoRef={null}
                    timeLeft="--:--:--" // Static for preview
                    isPreview={true}
                    onClosePreview={onClose} // Handled dynamically
                />
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
