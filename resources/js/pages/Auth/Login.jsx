import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { API_BASE } from '../../config/api';
import logoImage from '../../../images/logo.png';

function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [remember, setRemember] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Tahun Ajaran state
    const [tahunAjaranId, setTahunAjaranId] = useState('');
    const [tahunAjaranList, setTahunAjaranList] = useState([]);
    const [loadingTahun, setLoadingTahun] = useState(true);

    const { login } = useAuth();
    const navigate = useNavigate();

    // Fetch tahun ajaran list on mount
    useEffect(() => {
        const fetchTahunAjaran = async () => {
            try {
                const res = await fetch(`${API_BASE}/tahun-ajaran`);
                const data = await res.json();
                if (data.success) {
                    setTahunAjaranList(data.data || []);
                    // Auto-select the active one
                    const active = data.data?.find(t => t.is_active);
                    if (active) setTahunAjaranId(active.id.toString());
                }
            } catch (error) {
                console.error('Error fetching tahun ajaran:', error);
            } finally {
                setLoadingTahun(false);
            }
        };
        fetchTahunAjaran();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!tahunAjaranId) {
            setError('Pilih tahun ajaran terlebih dahulu');
            return;
        }

        setLoading(true);

        const result = await login(username, password, remember, parseInt(tahunAjaranId));

        if (result.success) {
            // Always redirect to dashboard after login
            navigate('/dashboard', { replace: true });
        } else {
            setError(result.message);
        }

        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100">
            <div className="w-full max-w-md mx-4">
                {/* Logo & Title */}
                <div className="text-center mb-8">
                    <img
                        src={logoImage}
                        alt="Logo MA ALHIKAM"
                        className="w-20 h-20 mx-auto mb-4"
                    />
                    <h1 className="text-2xl font-bold text-gray-800">MA ALHIKAM</h1>
                    <p className="text-gray-500 text-sm mt-1">Sistem Informasi Manajemen</p>
                </div>

                {/* Login Card */}
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <h2 className="text-xl font-semibold text-gray-800 text-center mb-6">Masuk ke Akun</h2>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                            <i className="fas fa-exclamation-circle"></i>
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        {/* Username */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Username
                            </label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                                    <i className="fas fa-user"></i>
                                </span>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all text-sm"
                                    placeholder="Masukkan username"
                                    required
                                    autoComplete="username"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                                    <i className="fas fa-lock"></i>
                                </span>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all text-sm"
                                    placeholder="Masukkan password"
                                    required
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                </button>
                            </div>
                        </div>

                        {/* Tahun Ajaran */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Tahun Ajaran
                            </label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                                    <i className="fas fa-calendar-alt"></i>
                                </span>
                                {loadingTahun ? (
                                    <div className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg text-sm text-gray-400 bg-gray-50">
                                        <i className="fas fa-spinner fa-spin mr-2"></i>Memuat...
                                    </div>
                                ) : (
                                    <select
                                        value={tahunAjaranId}
                                        onChange={(e) => setTahunAjaranId(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all text-sm appearance-none bg-white cursor-pointer"
                                        required
                                    >
                                        <option value="">-- Pilih Tahun Ajaran --</option>
                                        {tahunAjaranList.map(t => (
                                            <option key={t.id} value={t.id}>
                                                {t.nama} {t.is_active ? '(Aktif)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                )}
                                <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 pointer-events-none">
                                    <i className="fas fa-chevron-down text-xs"></i>
                                </span>
                            </div>
                        </div>

                        {/* Remember Me */}
                        <div className="mb-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={remember}
                                    onChange={(e) => setRemember(e.target.checked)}
                                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                />
                                <span className="text-sm text-gray-600">Ingat saya (30 hari)</span>
                            </label>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <i className="fas fa-spinner fa-spin"></i>
                                    <span>Memproses...</span>
                                </>
                            ) : (
                                <>
                                    <i className="fas fa-sign-in-alt"></i>
                                    <span>Masuk</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Quick Login for Testing */}
                {process.env.NODE_ENV === 'development' || true ? (
                    <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
                        <div className="flex items-center gap-2 text-yellow-700 mb-3">
                            <i className="fas fa-flask"></i>
                            <span className="text-sm font-medium">Quick Login (Testing Only)</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setUsername('admin');
                                    setPassword('password');
                                }}
                                className="py-2 px-3 bg-purple-500 hover:bg-purple-600 text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1"
                            >
                                <i className="fas fa-user-shield"></i>
                                <span>Admin</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setUsername('akromadabi');
                                    setPassword('password');
                                }}
                                className="py-2 px-3 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1"
                            >
                                <i className="fas fa-chalkboard-teacher"></i>
                                <span>Guru (Akrom)</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setUsername('adibkaromi');
                                    setPassword('password');
                                }}
                                className="py-2 px-3 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1"
                            >
                                <i className="fas fa-user-tie"></i>
                                <span>Guru (Adib)</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setUsername('fathina');
                                    setPassword('password');
                                }}
                                className="py-2 px-3 bg-pink-500 hover:bg-pink-600 text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1"
                            >
                                <i className="fas fa-female"></i>
                                <span>Guru (Dewi)</span>
                            </button>
                        </div>
                        <p className="text-[10px] text-yellow-600 mt-2 text-center">
                            Klik tombol lalu klik "Masuk"
                        </p>
                    </div>
                ) : null}

                {/* Footer */}
                <p className="text-center text-gray-400 text-xs mt-6">
                    © 2026 MA ALHIKAM. All rights reserved.
                </p>
            </div>
        </div>
    );
}

export default Login;
