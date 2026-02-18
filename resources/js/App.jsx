import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { TahunAjaranProvider } from './contexts/TahunAjaranContext';
import ProtectedRoute from './components/ProtectedRoute';
import { getAdminRoles } from './config/roleConfig';
import AdminLayout from './pages/Admin/components/AdminLayout';
import Login from './pages/Auth/Login';
import Dashboard from './pages/Admin/Dashboard';
import Profil from './pages/Admin/Profil';
import Pengaturan from './pages/Admin/Pengaturan';
import ManajemenSiswa from './pages/Admin/DataInduk/ManajemenSiswa';
import ManajemenAlumni from './pages/Admin/DataInduk/ManajemenAlumni';
import ManajemenGuru from './pages/Admin/DataInduk/ManajemenGuru';
import ManajemenKelas from './pages/Admin/DataInduk/ManajemenKelas';
import ManajemenMapel from './pages/Admin/DataInduk/ManajemenMapel';
import ManajemenJadwal from './pages/Admin/DataInduk/ManajemenJadwal';
import ManajemenKegiatan from './pages/Admin/DataInduk/ManajemenKegiatan';
import ManajemenEkskul from './pages/Admin/DataInduk/ManajemenEkskul';
import ManajemenRapat from './pages/Admin/DataInduk/ManajemenRapat';
import ManajemenJamPelajaran from './pages/Admin/DataInduk/ManajemenJamPelajaran';
import ManajemenKalender from './pages/Admin/DataInduk/ManajemenKalender';
import SuratMenyurat from './pages/Admin/DataInduk/SuratMenyurat';
import ManajemenSupervisi from './pages/Admin/DataInduk/ManajemenSupervisi';
import AbsensiSiswa from './pages/Admin/DataInduk/AbsensiSiswa';
import ManajemenRole from './pages/Admin/ManajemenRole';
import LogAktivitas from './pages/Admin/LogAktivitas';
import Transaksi from './pages/Admin/Transaksi';
import PergantianTahun from './pages/Admin/Settings/WizardTahunAjaran';

// Guru Pages
import GuruLayout from './pages/Guru/components/GuruLayout';
import GuruBeranda from './pages/Guru/Beranda';
import GuruPencarian from './pages/Guru/Pencarian';
import GuruRiwayat from './pages/Guru/Riwayat';

import GuruProfil from './pages/Guru/Profil';
import GuruPengaturan from './pages/Guru/Pengaturan';
import AbsensiMengajar from './pages/Guru/AbsensiMengajar';
import AbsensiKegiatan from './pages/Guru/AbsensiKegiatan';
import AbsensiRapat from './pages/Guru/AbsensiRapat';
import Sertifikat from './pages/Guru/Sertifikat';
import SPPD from './pages/Guru/SPPD';
import Modul from './pages/Guru/Modul';
import Download from './pages/Guru/Download';
import JurnalKelas from './pages/Guru/JurnalKelas';
import AbsenKelas from './pages/Guru/AbsenKelas';

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
                            <TahunAjaranProvider>
                                <GuruLayout>
                                    <Routes>
                                        <Route index element={<GuruBeranda />} />
                                        <Route path="pencarian" element={<GuruPencarian />} />
                                        <Route path="riwayat" element={<GuruRiwayat />} />

                                        <Route path="profil" element={<GuruProfil />} />
                                        <Route path="pengaturan" element={<GuruPengaturan />} />
                                        <Route path="absensi/mengajar" element={<AbsensiMengajar />} />
                                        <Route path="absensi/kegiatan" element={<AbsensiKegiatan />} />
                                        <Route path="absensi/rapat" element={<AbsensiRapat />} />
                                        <Route path="sertifikat" element={<Sertifikat />} />
                                        <Route path="sppd" element={<SPPD />} />
                                        <Route path="modul" element={<Modul />} />
                                        <Route path="download" element={<Download />} />
                                        <Route path="jurnal-kelas" element={<JurnalKelas />} />
                                        <Route path="absen-kelas" element={<AbsenKelas />} />
                                    </Routes>
                                </GuruLayout>
                            </TahunAjaranProvider>
                        </ProtectedRoute>
                    }
                />

                {/* Admin Routes - accessible by all roles with admin access */}
                <Route
                    path="/*"
                    element={
                        <ProtectedRoute requiredRoles={getAdminRoles()}>
                            <TahunAjaranProvider>
                                <AdminLayout>
                                    <Routes>
                                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                                        <Route path="/dashboard" element={<Dashboard />} />
                                        <Route path="/profil" element={<Profil />} />
                                        <Route path="/pengaturan" element={<Pengaturan />} />
                                        <Route path="/pergantian-tahun" element={<PergantianTahun />} />
                                        <Route path="/manajemen-role" element={<ManajemenRole />} />
                                        <Route path="/transaksi" element={<Transaksi />} />
                                        <Route path="/log-aktivitas" element={<LogAktivitas />} />
                                        <Route path="/data-induk" element={<Navigate to="/data-induk/siswa" replace />} />
                                        <Route path="/data-induk/siswa" element={<ManajemenSiswa />} />
                                        <Route path="/data-induk/absensi-siswa" element={<AbsensiSiswa />} />
                                        <Route path="/data-induk/alumni" element={<ManajemenAlumni />} />
                                        <Route path="/data-induk/guru" element={<ManajemenGuru />} />
                                        <Route path="/data-induk/kelas" element={<ManajemenKelas />} />
                                        <Route path="/data-induk/mapel" element={<ManajemenMapel />} />
                                        <Route path="/data-induk/jadwal" element={<ManajemenJadwal />} />
                                        <Route path="/data-induk/kegiatan" element={<ManajemenKegiatan />} />
                                        <Route path="/data-induk/ekskul" element={<ManajemenEkskul />} />
                                        <Route path="/data-induk/rapat" element={<ManajemenRapat />} />
                                        <Route path="/data-induk/jam-pelajaran" element={<ManajemenJamPelajaran />} />
                                        <Route path="/data-induk/kalender" element={<ManajemenKalender />} />
                                        <Route path="/data-induk/surat" element={<SuratMenyurat />} />
                                        <Route path="/data-induk/supervisi" element={<ManajemenSupervisi />} />
                                    </Routes>
                                </AdminLayout>
                            </TahunAjaranProvider>
                        </ProtectedRoute>
                    }
                />
            </Routes>
        </AuthProvider>
    );
}

export default App;
