import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './pages/Admin/components/AdminLayout';
import Login from './pages/Auth/Login';
import Dashboard from './pages/Admin/Dashboard';
import Profil from './pages/Admin/Profil';
import Pengaturan from './pages/Admin/Pengaturan';
import ManajemenSiswa from './pages/Admin/DataInduk/ManajemenSiswa';
import ManajemenGuru from './pages/Admin/DataInduk/ManajemenGuru';
import ManajemenKelas from './pages/Admin/DataInduk/ManajemenKelas';
import ManajemenMapel from './pages/Admin/DataInduk/ManajemenMapel';
import ManajemenJadwal from './pages/Admin/DataInduk/ManajemenJadwal';
import ManajemenKegiatan from './pages/Admin/DataInduk/ManajemenKegiatan';
import ManajemenEkskul from './pages/Admin/DataInduk/ManajemenEkskul';
import ManajemenRapat from './pages/Admin/DataInduk/ManajemenRapat';

// Guru Pages
import GuruLayout from './pages/Guru/components/GuruLayout';
import GuruBeranda from './pages/Guru/Beranda';
import GuruPencarian from './pages/Guru/Pencarian';
import GuruRiwayat from './pages/Guru/Riwayat';
import GuruJadwal from './pages/Guru/Jadwal';
import GuruProfil from './pages/Guru/Profil';
import AbsensiMengajar from './pages/Guru/AbsensiMengajar';
import AbsensiKegiatan from './pages/Guru/AbsensiKegiatan';
import AbsensiRapat from './pages/Guru/AbsensiRapat';
import Sertifikat from './pages/Guru/Sertifikat';
import SPPD from './pages/Guru/SPPD';
import Modul from './pages/Guru/Modul';
import Download from './pages/Guru/Download';

function App() {
    return (
        <AuthProvider>
            <Routes>
                {/* Public Route */}
                <Route path="/login" element={<Login />} />

                {/* Guru Routes - Mobile Only */}
                <Route
                    path="/guru/*"
                    element={
                        <ProtectedRoute requiredRoles={['guru']}>
                            <GuruLayout>
                                <Routes>
                                    <Route index element={<GuruBeranda />} />
                                    <Route path="pencarian" element={<GuruPencarian />} />
                                    <Route path="riwayat" element={<GuruRiwayat />} />
                                    <Route path="jadwal" element={<GuruJadwal />} />
                                    <Route path="profil" element={<GuruProfil />} />
                                    <Route path="absensi/mengajar" element={<AbsensiMengajar />} />
                                    <Route path="absensi/kegiatan" element={<AbsensiKegiatan />} />
                                    <Route path="absensi/rapat" element={<AbsensiRapat />} />
                                    <Route path="sertifikat" element={<Sertifikat />} />
                                    <Route path="sppd" element={<SPPD />} />
                                    <Route path="modul" element={<Modul />} />
                                    <Route path="download" element={<Download />} />
                                </Routes>
                            </GuruLayout>
                        </ProtectedRoute>
                    }
                />

                {/* Admin Routes */}
                <Route
                    path="/*"
                    element={
                        <ProtectedRoute requiredRoles={['superadmin']}>
                            <AdminLayout>
                                <Routes>
                                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                                    <Route path="/dashboard" element={<Dashboard />} />
                                    <Route path="/profil" element={<Profil />} />
                                    <Route path="/pengaturan" element={<Pengaturan />} />
                                    <Route path="/data-induk/siswa" element={<ManajemenSiswa />} />
                                    <Route path="/data-induk/guru" element={<ManajemenGuru />} />
                                    <Route path="/data-induk/kelas" element={<ManajemenKelas />} />
                                    <Route path="/data-induk/mapel" element={<ManajemenMapel />} />
                                    <Route path="/data-induk/jadwal" element={<ManajemenJadwal />} />
                                    <Route path="/data-induk/kegiatan" element={<ManajemenKegiatan />} />
                                    <Route path="/data-induk/ekskul" element={<ManajemenEkskul />} />
                                    <Route path="/data-induk/rapat" element={<ManajemenRapat />} />
                                </Routes>
                            </AdminLayout>
                        </ProtectedRoute>
                    }
                />
            </Routes>
        </AuthProvider>
    );
}

export default App;
