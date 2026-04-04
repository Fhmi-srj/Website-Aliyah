import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Swal from 'sweetalert2';
import api from '../../lib/axios';

const LoginSiswa = () => {
    const [nisn, setNisn] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();
    const { loginWithToken } = useAuth(); // Assuming loginWithToken just sets user and token

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await api.post('/siswa-panel/login', {
                nisn: nisn,
                password: nisn // Password is NISN
            });

            if (response.data.token) {
                // We use standard login token logic similar to Guru/Admin
                localStorage.setItem('token', response.data.token);
                // Trigger refresh or context update
                window.location.href = '/siswa';
            }
        } catch (error) {
            console.error('Login error:', error);
            const message = error.response?.data?.message || 'NISN atau kata sandi tidak valid. Pastikan Anda memasukkan NISN yang benar.';
            Swal.fire({
                icon: 'error',
                title: 'Login Gagal',
                text: message,
                confirmButtonColor: '#0EA5E9',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-sm relative">
                <div className="bg-white rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-gray-100 relative z-10 transition-transform hover:-translate-y-1 duration-300">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-sky-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-sky-100/50">
                            <i className="fas fa-user-graduate text-2xl text-sky-500"></i>
                        </div>
                        <h2 className="text-2xl font-black text-gray-800 tracking-tight">Login Siswa</h2>
                        <p className="text-sm text-gray-500 mt-2 font-medium">Portal Akademik Mahakam</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider ml-1">
                                Nomor Induk Siswa Nasional (NISN)
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <i className="fas fa-id-card text-gray-400 group-focus-within:text-sky-500 transition-colors"></i>
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={nisn}
                                    onChange={(e) => setNisn(e.target.value)}
                                    className="w-full pl-11 pr-12 py-3.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all font-medium placeholder:font-normal placeholder-gray-400 outline-none text-center"
                                    placeholder="Masukkan NISN Anda"
                                    required
                                    autoComplete="username"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-sky-500"
                                >
                                    <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                </button>
                            </div>
                            <p className="text-[10px] text-gray-400 text-center mt-2 italic">* Saat ini sandi otomatis samadengan NISN</p>
                        </div>
                        
                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`w-full py-3.5 px-4 bg-sky-500 text-white rounded-xl font-bold tracking-wide transition-all ${isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-sky-600 hover:shadow-lg hover:shadow-sky-500/30'}`}
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <i className="fas fa-circle-notch fa-spin"></i>
                                    Memverifikasi...
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    Masuk Portal Siswa
                                    <i className="fas fa-arrow-right"></i>
                                </span>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-gray-100 text-center">
                        <button onClick={() => navigate('/login')} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-sky-600 transition-colors font-medium">
                            <i className="fas fa-arrow-left"></i>
                            Kembali ke Portal Login Utama
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginSiswa;
