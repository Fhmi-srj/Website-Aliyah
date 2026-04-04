import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../../../config/api';
import Swal from 'sweetalert2';

export default function ExamLogin() {
    const [nisn, setNisn] = useState('');
    const [token, setToken] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!nisn || !token) {
            Swal.fire({ icon: 'warning', title: 'Data Tidak Lengkap', text: 'NISN dan Token Ujian harus diisi!' });
            return;
        }

        try {
            setLoading(true);
            const res = await fetch(`${API_BASE}/cbt/student/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ nisn, token })
            });

            const result = await res.json();

            if (res.ok && result.success) {
                // Store student token
                localStorage.setItem('cbt_student_token', result.data.token);
                localStorage.setItem('cbt_student_data', JSON.stringify(result.data.student));
                
                // Redirect to Exam Room wrapper
                navigate(`/cbt/exam/${result.data.exam.id}/room`);
            } else {
                Swal.fire({ icon: 'error', title: 'Login Gagal', text: result.message || 'NISN atau Token tidak valid' });
            }
        } catch (error) {
            console.error('Login error:', error);
            Swal.fire({ icon: 'error', title: 'Error', text: 'Terjadi kesalahan sistem.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 to-indigo-50">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center flex-col items-center">
                    <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mb-4 shadow-xl shadow-primary/20 rotate-3 transition-transform hover:rotate-6">
                        <i className="fas fa-laptop-code text-4xl text-primary"></i>
                    </div>
                    <h2 className="mt-2 text-center text-3xl font-black text-gray-900 tracking-tight uppercase">Portal Ujian CBT</h2>
                    <p className="mt-2 text-center text-sm text-gray-500 font-medium">Silakan login untuk memulai sesi ujian Anda</p>
                </div>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow-2xl sm:rounded-3xl sm:px-10 border border-gray-100 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-indigo-500"></div>
                    
                    <form className="space-y-6" onSubmit={handleLogin}>
                        <div>
                            <label htmlFor="nisn" className="block text-xs font-bold text-gray-700 uppercase tracking-widest">
                                NISN (Nomor Induk Siswa Nasional)
                            </label>
                            <div className="mt-2 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <i className="fas fa-id-card text-gray-400"></i>
                                </div>
                                <input
                                    id="nisn" name="nisn" type="text" required
                                    value={nisn}
                                    onChange={(e) => setNisn(e.target.value)}
                                    className="appearance-none block w-full pl-10 px-3 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent sm:text-sm font-bold transition-all"
                                    placeholder="Masukkan NISN Anda"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="token" className="block text-xs font-bold text-gray-700 uppercase tracking-widest">
                                Token Ujian
                            </label>
                            <div className="mt-2 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <i className="fas fa-key text-gray-400"></i>
                                </div>
                                <input
                                    id="token" name="token" type="text" required
                                    value={token}
                                    onChange={(e) => setToken(e.target.value)}
                                    className="appearance-none block w-full pl-10 px-3 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent sm:text-sm font-bold uppercase transition-all tracking-widest"
                                    placeholder="Contoh: X7Y8Z9"
                                />
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-primary/30 text-sm font-black uppercase tracking-widest text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95"
                            >
                                {loading ? (
                                    <span className="flex items-center gap-2"><i className="fas fa-circle-notch fa-spin"></i> Memverifikasi...</span>
                                ) : (
                                    <span className="flex items-center gap-2"><i className="fas fa-sign-in-alt"></i> Masuk Ujian</span>
                                )}
                            </button>
                        </div>
                    </form>
                    
                    <div className="mt-8 text-center text-xs text-gray-400 font-medium">
                        <p>Aplikasi Ujian Berbasis Komputer</p>
                        <p className="mt-1">&copy; {new Date().getFullYear()} Hak Cipta Dilindungi</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
