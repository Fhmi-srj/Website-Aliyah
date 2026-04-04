import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE } from '../../../config/api';
import { useAuth } from '../../../contexts/AuthContext';
import Swal from 'sweetalert2';
import CbtExamUI from '../../../components/CbtExamUI';

export default function ExamRoom() {
    const { id } = useParams(); // Exam ID
    const navigate = useNavigate();
    const { token: authToken } = useAuth();

    const [session, setSession] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
    const [answers, setAnswers] = useState({});
    const [loading, setLoading] = useState(true);
    const [timeLeft, setTimeLeft] = useState(null);
    const videoRef = useRef(null);

    // Initial Load & Auth Check
    useEffect(() => {
        // Fetch Exam Questions
        const loadExam = async () => {
            const token = authToken || localStorage.getItem('auth_token');
            if (!token) return navigate('/siswa', { replace: true });

            try {
                const examToken = localStorage.getItem('cbt_exam_token') || '';
                // Join the Exam
                await fetch(`${API_BASE}/cbt/student/exams/${id}/join`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: examToken })
                });

                const qRes = await fetch(`${API_BASE}/cbt/student/exams/${id}/questions`, {
                    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
                });
                
                if (qRes.ok) {
                    const data = await qRes.json();
                    setSession(data.session);
                    setQuestions(data.questions);

                    // Initialize answers from localStorage if any
                    const saved = localStorage.getItem(`cbt_ans_${data.session.id}`);
                    if (saved) setAnswers(JSON.parse(saved));

                    // Start camera
                    startWebcam();
                } else {
                    Swal.fire({ icon: 'error', title: 'Akses Ditolak', text: 'Sesi ujian Anda tidak valid atau Anda belum bergabung.' });
                    navigate('/siswa/ujian');
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        loadExam();

        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                const tracks = videoRef.current.srcObject.getTracks();
                tracks.forEach(track => track.stop());
            }
        };
    }, [id, navigate, authToken]);

    // Timer Logic Placeholder
    useEffect(() => {
        if (!session) return;
        // Basic timer logic: if we know duration_minutes from session.exam...
        // For now, simple mockup
        const interval = setInterval(() => {
            // tick down
        }, 1000);
        return () => clearInterval(interval);
    }, [session]);

    const startWebcam = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.warn('Webcam not available or denied', err);
        }
    };

    const handleAnswer = async (qId, answerValue) => {
        const newAnswers = { ...answers, [qId]: answerValue };
        setAnswers(newAnswers);
        
        // Offline Fallback
        if (session) localStorage.setItem(`cbt_ans_${session.id}`, JSON.stringify(newAnswers));

        // Background Sync Setup
        const token = authToken || localStorage.getItem('auth_token');
        fetch(`${API_BASE}/cbt/student/exams/${id}/answer`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ question_id: qId, answer: answerValue })
        }).catch(() => console.warn('Offline mode: Answer saved locally for sync'));
    };

    const finishExam = async () => {
        const conf = await Swal.fire({
            title: 'Selesai Ujian?',
            text: 'Pastikan semua soal telah dijawab. Waktu Anda tidak dapat dikembalikan.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Selesai & Kumpulkan',
            cancelButtonText: 'Periksa Kembali'
        });

        if (conf.isConfirmed) {
            const token = authToken || localStorage.getItem('auth_token');
            try {
                await fetch(`${API_BASE}/cbt/student/exams/${id}/finish`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
                });
                localStorage.removeItem('cbt_exam_token');
                Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Ujian telah diselesaikan.' }).then(() => {
                    navigate('/siswa/ujian');
                });
            } catch (err) {
                console.error(err);
            }
        }
    };

    if (loading) return <div className="p-10 flex justify-center"><i className="fas fa-spinner fa-spin text-4xl text-primary"></i></div>;
    if (questions.length === 0) return <div className="p-10 text-center">Soal belum tersedia untuk ujian ini.</div>;

    const currentQ = questions[currentQuestionIdx];
    let opts = [];
    try { opts = typeof currentQ.options === 'string' ? JSON.parse(currentQ.options) : (currentQ.options || []); } catch(e){}

    return (
        <CbtExamUI 
            questions={questions}
            currentQuestionIdx={currentQuestionIdx}
            setCurrentQuestionIdx={setCurrentQuestionIdx}
            answers={answers}
            handleAnswer={handleAnswer}
            finishExam={finishExam}
            videoRef={videoRef}
            timeLeft="01:45:00"
            isPreview={false}
        />
    );
}
