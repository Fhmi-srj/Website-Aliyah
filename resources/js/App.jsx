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
import ManajemenKegiatanEkstra from './Pages/Admin/DataInduk/ManajemenKegiatanEkstra';
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
import Bisyaroh from './pages/Admin/Bisyaroh';
import Nota from './pages/Admin/Nota';
import PergantianTahun from './pages/Admin/Settings/WizardTahunAjaran';

// Admin CBT Pages
import AdminCbtBankSoal from './pages/Admin/Cbt/BankSoal';
import AdminCbtJadwal from './pages/Admin/Cbt/JadwalUjian';
import AdminCbtHasil from './pages/Admin/Cbt/HasilUjian';
import AdminCbtSoal from './pages/Admin/Cbt/Soal';

// Guru Pages
import GuruLayout from './pages/Guru/components/GuruLayout';
import GuruBeranda from './pages/Guru/Beranda';
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
import GuruSupervisi from './pages/Guru/Supervisi';
import RiwayatAktivitas from './pages/Guru/RiwayatAktivitas';
import GuruUlangan from './pages/Guru/Ulangan';
import Galeri from './pages/Galeri';

// Guru CBT Pages
import GuruCbtBankSoal from './pages/Guru/Cbt/BankSoal';
import GuruCbtJadwal from './pages/Guru/Cbt/JadwalUjian';
import GuruCbtHasil from './pages/Guru/Cbt/HasilUjian';
import GuruCbtSoal from './pages/Guru/Cbt/Soal';

// Siswa Panel Pages
import SiswaLayout from './pages/Siswa/components/SiswaLayout';
import SiswaBeranda from './pages/Siswa/Beranda';
import SiswaJadwalUjian from './pages/Siswa/JadwalUjian';

// Siswa CBT Pages
import ExamLayout from './pages/Siswa/Cbt/ExamLayout';
import ExamRoom from './pages/Siswa/Cbt/ExamRoom';

// Siswa Setting Pages
import SiswaProfil from './pages/Siswa/Profil';
import SiswaPenilaian from './pages/Siswa/Penilaian';

function App() {
    return (
        <AuthProvider>
            <Routes>
                {/* Public Route */}
                <Route path="/login" element={<Login />} />
                
                {/* Siswa Panel Routes */}
                <Route
                    path="/siswa/*"
                    element={
                        <ProtectedRoute requiredRoles={['siswa']}>
                            <TahunAjaranProvider>
                                <SiswaLayout>
                                    <Routes>
                                        <Route index element={<SiswaBeranda />} />
                                        <Route path="ujian" element={<SiswaJadwalUjian />} />
                                        <Route path="profil" element={<SiswaProfil />} />
                                        <Route path="penilaian" element={<SiswaPenilaian />} />
                                    </Routes>
                                </SiswaLayout>
                            </TahunAjaranProvider>
                        </ProtectedRoute>
                    }
                />
                
                {/* Siswa CBT Routes - protected, uses same siswa auth token */}
                <Route
                    path="/cbt/exam"
                    element={
                        <ProtectedRoute requiredRoles={['siswa']}>
                            <ExamLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route path=":id/room" element={<ExamRoom />} />
                </Route>

                {/* Guru Routes - Mobile Only */}
                <Route
                    path="/guru/*"
                    element={
                        <ProtectedRoute requiredRoles={['guru']}>
                            <TahunAjaranProvider>
                                <GuruLayout>
                                    <Routes>
                                        <Route index element={<GuruBeranda />} />
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
                                        <Route path="supervisi" element={<GuruSupervisi />} />
                                        <Route path="riwayat-aktivitas" element={<RiwayatAktivitas />} />
                                        <Route path="ulangan" element={<GuruUlangan />} />
                                        <Route path="galeri" element={<Galeri />} />
                                        <Route path="cbt/bank-soal" element={<GuruCbtBankSoal />} />
                                        <Route path="cbt/bank-soal/:id/soal" element={<GuruCbtSoal />} />
                                        <Route path="cbt/jadwal" element={<GuruCbtJadwal />} />
                                        <Route path="cbt/hasil/:id" element={<GuruCbtHasil />} />
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
                                        <Route path="/bisyaroh" element={<Bisyaroh />} />
                                        <Route path="/generate-nota" element={<Nota />} />
                                        <Route path="/log-aktivitas" element={<LogAktivitas />} />
                                        <Route path="/galeri" element={<Galeri isAdmin />} />
                                        <Route path="/data-induk" element={<Navigate to="/data-induk/siswa" replace />} />
                                        <Route path="/data-induk/siswa" element={<ManajemenSiswa />} />
                                        <Route path="/data-induk/absensi-siswa" element={<AbsensiSiswa />} />
                                        <Route path="/data-induk/alumni" element={<ManajemenAlumni />} />
                                        <Route path="/data-induk/guru" element={<ManajemenGuru />} />
                                        <Route path="/data-induk/kelas" element={<ManajemenKelas />} />
                                        <Route path="/data-induk/mapel" element={<ManajemenMapel />} />
                                        <Route path="/data-induk/jadwal" element={<ManajemenJadwal />} />
                                        <Route path="/data-induk/kegiatan" element={<ManajemenKegiatan />} />
                                        <Route path="/data-induk/kegiatan-ekstra" element={<ManajemenKegiatanEkstra />} />
                                        <Route path="/data-induk/ekskul" element={<ManajemenEkskul />} />
                                        <Route path="/data-induk/rapat" element={<ManajemenRapat />} />
                                        <Route path="/data-induk/jam-pelajaran" element={<ManajemenJamPelajaran />} />
                                        <Route path="/data-induk/kalender" element={<ManajemenKalender />} />
                                        <Route path="/data-induk/surat" element={<SuratMenyurat />} />
                                        <Route path="/data-induk/supervisi" element={<ManajemenSupervisi />} />
                                        {/* Admin CBT Routes */}
                                        <Route path="/cbt/bank-soal" element={<AdminCbtBankSoal />} />
                                        <Route path="/cbt/bank-soal/:id/soal" element={<AdminCbtSoal />} />
                                        <Route path="/cbt/jadwal" element={<AdminCbtJadwal />} />
                                        <Route path="/cbt/hasil/:id" element={<AdminCbtHasil />} />
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
