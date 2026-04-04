import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/axios';

export default function SiswaJadwalUjian() {
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchExams = async () => {
            try {
                const response = await api.get('/siswa-panel/exams');
                setExams(response.data.data);
            } catch (error) {
                console.error("Failed to fetch exams", error);
            } finally {
                setLoading(false);
            }
        };
        fetchExams();
    }, []);

    const handleJoinExam = (exam) => {
        if (!exam.token) return;
        
        // Save exam token to localStorage so ExamRoom can use it when joining
        localStorage.setItem('cbt_exam_token', exam.token);
        
        // Navigate directly — the user is already authenticated via the main auth token
        navigate(`/cbt/exam/${exam.id}/room`);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-sky-500 mb-4"></div>
                <p className="text-gray-500 font-medium">Memuat Jadwal Ujian...</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-0 space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h1 className="text-2xl font-black text-gray-800 tracking-tight">Computer Based Test (CBT)</h1>
                    <p className="text-gray-500 text-sm mt-1">Daftar evaluasi dan ujian yang aktif untuk Anda.</p>
                </div>
                <div className="w-12 h-12 bg-sky-100 rounded-2xl flex items-center justify-center text-sky-600">
                    <i className="fas fa-laptop-code text-xl"></i>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {exams.length === 0 ? (
                    <div className="col-span-full md:col-span-2 lg:col-span-3 bg-white p-12 rounded-3xl border border-gray-100 flex flex-col items-center justify-center text-center">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                            <i className="fas fa-coffee text-3xl text-gray-400"></i>
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-2">Belum Ada Ujian</h3>
                        <p className="text-gray-500 text-sm max-w-sm">Saat ini tidak ada jadwal ujian yang aktif atau diterbitkan untuk kelas Anda. Silakan istirahat atau pelajari materi selanjutnya.</p>
                    </div>
                ) : (
                    exams.map((exam) => (
                        <div key={exam.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all flex flex-col group">
                            <div className={`h-2 w-full ${exam.session_status === 'finished' ? 'bg-emerald-500' : (exam.session_status === 'ongoing' ? 'bg-amber-500' : 'bg-sky-500')}`}></div>
                            
                            <div className="p-5 flex-1">
                                <div className="flex justify-between items-start mb-3">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-sky-600 bg-sky-50 px-2 py-1 rounded-md">
                                        {exam.mapel}
                                    </span>
                                    {exam.session_status === 'finished' ? (
                                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md flex items-center gap-1"><i className="fas fa-check-circle"></i> Selesai</span>
                                    ) : exam.session_status === 'ongoing' ? (
                                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md flex items-center gap-1"><i className="fas fa-spinner fa-spin"></i> Sedang Mengerjakan</span>
                                    ) : (
                                        <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-md"><i className="far fa-clock"></i> {exam.duration_minutes} Menit</span>
                                    )}
                                </div>
                                
                                <h3 className="text-lg font-bold text-gray-800 leading-tight mb-4 group-hover:text-sky-600 transition-colors line-clamp-2">
                                    {exam.name}
                                </h3>

                                <div className="space-y-2 mt-auto">
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <i className="fas fa-calendar-alt w-4 flex justify-center"></i>
                                        <span>{new Date(exam.start_time).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <i className="fas fa-clock w-4 flex justify-center"></i>
                                        <span>
                                            {new Date(exam.start_time).toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' })} 
                                            {' - '} 
                                            {new Date(exam.end_time).toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' })}
                                        </span>
                                    </div>
                                    {(exam.status === 'published' && exam.token && exam.session_status !== 'finished') && (
                                        <div className="flex items-center gap-2 text-xs text-gray-700 font-bold bg-gray-50 p-2 rounded-lg mt-3 border border-gray-100">
                                            <i className="fas fa-key text-sky-500"></i>
                                            Token: <span className="tracking-widest uppercase">{exam.token}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-4 bg-gray-50/50 border-t border-gray-50">
                                {exam.session_status === 'finished' ? (
                                    <div className="w-full py-2.5 px-4 bg-white border border-emerald-100 text-emerald-600 rounded-xl font-bold flex items-center justify-between">
                                        <span>Nilai Akhir:</span>
                                        <span className="text-lg">{exam.score !== null ? exam.score : '...'}</span>
                                    </div>
                                ) : (exam.status === 'published' && new Date() >= new Date(exam.start_time) && new Date() <= new Date(exam.end_time)) ? (
                                    <button 
                                        onClick={() => handleJoinExam(exam)}
                                        className="w-full py-2.5 px-4 bg-sky-500 text-white rounded-xl font-bold hover:bg-sky-600 transition-colors flex items-center justify-center gap-2 shadow-sm"
                                    >
                                        {exam.session_status === 'ongoing' ? (
                                            <><i className="fas fa-play"></i> Lanjutkan Ujian</>
                                        ) : (
                                            <><i className="fas fa-edit"></i> Mulai Kerjakan</>
                                        )}
                                    </button>
                                ) : (
                                    <button disabled className="w-full py-2.5 px-4 bg-gray-200 text-gray-500 rounded-xl font-bold cursor-not-allowed flex items-center justify-center gap-2">
                                        {new Date() < new Date(exam.start_time) ? 'Belum Dimulai' : 'Waktu Habis'}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
