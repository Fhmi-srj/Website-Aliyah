import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { API_BASE, authFetch } from '../../config/api';
import Swal from 'sweetalert2';

export default function SiswaProfil() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [passwordForm, setPasswordForm] = useState({
        current_password: '',
        new_password: '',
        new_password_confirmation: ''
    });

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        
        if (passwordForm.new_password !== passwordForm.new_password_confirmation) {
            Swal.fire({
                icon: 'error',
                title: 'Password tidak cocok',
                text: 'Konfirmasi password baru tidak sama dengan password baru.'
            });
            return;
        }

        if (passwordForm.new_password.length < 6) {
            Swal.fire({
                icon: 'error',
                title: 'Password Terlalu Pendek',
                text: 'Password baru minimal 6 karakter.'
            });
            return;
        }

        setLoading(true);
        try {
            const response = await authFetch(`${API_BASE}/siswa-panel/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(passwordForm)
            });

            const data = await response.json();

            if (response.ok) {
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil!',
                    text: data.message
                });
                setPasswordForm({
                    current_password: '',
                    new_password: '',
                    new_password_confirmation: ''
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Gagal',
                    text: data.message || 'Terjadi kesalahan saat mengubah password.'
                });
            }
        } catch (error) {
            console.error('Password change error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Terjadi kesalahan sistem.'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 md:p-8 animate-fadeIn max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                    <i className="fas fa-user-circle text-white text-xl"></i>
                </div>
                <div>
                    <h1 className="text-xl font-black text-gray-800 uppercase tracking-tight">Profil Siswa</h1>
                    <p className="text-xs text-gray-400 mt-0.5 font-medium uppercase tracking-widest">Pengaturan Akun & Keamanan</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Profile Card */}
                <div className="md:col-span-1">
                    <div className="bg-white rounded-2xl p-6 shadow-soft border border-gray-100 flex flex-col items-center text-center">
                        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                            <i className="fas fa-user-graduate text-4xl text-primary"></i>
                        </div>
                        <h2 className="font-bold text-gray-800 text-lg">{user?.nama || 'Siswa'}</h2>
                        <p className="text-sm text-gray-500 font-medium mb-1">NISN: {user?.nisn || '-'}</p>
                        <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold uppercase rounded-lg mt-2 tracking-wide">
                            {user?.kelas?.nama_kelas || 'Kelas Auth'}
                        </span>
                    </div>
                </div>

                {/* Password Change Form */}
                <div className="md:col-span-2">
                    <div className="bg-white rounded-2xl p-6 shadow-soft border border-gray-100">
                        <h3 className="text-base font-bold text-gray-800 flex items-center gap-2 mb-6 border-b pb-4">
                            <i className="fas fa-lock text-primary"></i>
                            Ubah Password
                        </h3>

                        <form onSubmit={handlePasswordChange} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Password Saat Ini</label>
                                <input 
                                    type="password" 
                                    required
                                    value={passwordForm.current_password}
                                    onChange={(e) => setPasswordForm({...passwordForm, current_password: e.target.value})}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                                    placeholder="Masukkan password saat ini (Default: NISN)"
                                />
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Password Baru</label>
                                    <input 
                                        type="password" 
                                        required
                                        minLength={6}
                                        value={passwordForm.new_password}
                                        onChange={(e) => setPasswordForm({...passwordForm, new_password: e.target.value})}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                                        placeholder="Min. 6 karakter"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Konfirmasi Password Baru</label>
                                    <input 
                                        type="password" 
                                        required
                                        minLength={6}
                                        value={passwordForm.new_password_confirmation}
                                        onChange={(e) => setPasswordForm({...passwordForm, new_password_confirmation: e.target.value})}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                                        placeholder="Ketik ulang password baru"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end">
                                <button 
                                    type="submit" 
                                    disabled={loading}
                                    className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-all disabled:opacity-70 flex items-center gap-2 shadow-lg shadow-primary/30"
                                >
                                    {loading ? (
                                        <><i className="fas fa-circle-notch fa-spin"></i> Menyimpan...</>
                                    ) : (
                                        <><i className="fas fa-save"></i> Simpan Password</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
