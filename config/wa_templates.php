<?php

/**
 * WhatsApp Message Templates
 *
 * Variabel yang tersedia di template menggunakan format {variable_name}
 */

return [
    // === PERSONAL (ke guru) ===

    'reminder_mengajar' => <<<'TPL'
Assalamu'alaikum {guru_nama},

Pengingat absensi mengajar:
📚 Mapel: {mapel}
🏫 Kelas: {kelas}
⏰ Jam: {jam}
📅 {hari}, {tanggal}

Silakan isi absensi melalui link berikut (berlaku sampai jam 23:59 hari ini):
🔗 {link}

_Pesan otomatis dari MAHAKAM APP_
TPL,

    'reminder_kegiatan' => <<<'TPL'
Assalamu'alaikum {guru_nama},

Pengingat absensi kegiatan:
📋 Kegiatan: {kegiatan}
📍 Tempat: {tempat}
⏰ Waktu: {waktu}
📅 {tanggal}

Silakan isi absensi melalui link berikut:
🔗 {link}

_Pesan otomatis dari MAHAKAM APP_
TPL,

    'reminder_rapat' => <<<'TPL'
Assalamu'alaikum {guru_nama},

Pengingat absensi rapat:
📋 Agenda: {agenda}
📍 Tempat: {tempat}
⏰ Waktu: {waktu}
📅 {tanggal}

Silakan isi absensi melalui link berikut:
🔗 {link}

_Pesan otomatis dari MAHAKAM APP_
TPL,

    // === GRUP ===

    // Jadwal harian - content built in command, not template
    'jadwal_harian' => <<<'TPL'
*JADWAL HARI INI*
{hari}, {tanggal}

{daftar_jadwal}
TPL,

    // Rekap absensi - content built in command, not template
    'rekap_absensi' => <<<'TPL'
*LAPORAN KEHADIRAN HARI INI*
{hari}, {tanggal}

{daftar_rekap}
TPL,

    // Laporan rapat - content built in command
    'laporan_rapat' => <<<'TPL'
*LAPORAN RAPAT MA ALHIKAM*

Agenda : {agenda}
Tanggal : {tanggal}
Tempat : {tempat}
Pimpinan Rapat : {pimpinan}
Sekretaris Rapat : {sekretaris}

*Kehadiran Anggota :*
{daftar_kehadiran}

*Hasil Rapat :*
{notulensi}
TPL,

    // Laporan kegiatan - content built in command
    'laporan_kegiatan' => <<<'TPL'
*LAPORAN KEGIATAN MA ALHIKAM*

Kegiatan : {nama_kegiatan}
Tanggal : {tanggal}
Tempat : {tempat}
PJ : {penanggung_jawab}

*Kehadiran :*
{daftar_kehadiran}
TPL,

    // Undangan rapat H-2
    'undangan_rapat' => <<<'TPL'
*UNDANGAN RAPAT*
Yth. Segenap Dewan Guru MA Alhikam

Assalamu'alaikum warahmatullahi wabarakatuh.
Mengharap kehadiran Bapak Ibu pada

🗓️ : {tanggal}
🏛️ : {tempat}
📌 : {agenda}
⏰ : {waktu} WIB - Selesai

Demikian undangan ini disampaikan. Atas kehadirannya diucapkan terimakasih. 🙏
Wassalamu'alaikum warahmatullahi wabarakatuh.

Ttd,
Kepala MA Alhikam
{kepala_madrasah}

*NB.*
Pimpinan Rapat : {pimpinan}
Sekretaris Rapat : {sekretaris}
TPL,

    // Pengingat rapat hari H
    'pengingat_rapat' => <<<'TPL'
*PENGINGAT RAPAT HARI INI*
Yth. Segenap Dewan Guru MA Alhikam

Assalamu'alaikum warahmatullahi wabarakatuh.
Mengingatkan rapat hari ini:

🏛️ : {tempat}
📌 : {agenda}
⏰ : {waktu} WIB - Selesai

Mohon hadir tepat waktu. 🙏
Wassalamu'alaikum warahmatullahi wabarakatuh.

*NB.*
Pimpinan Rapat : {pimpinan}
Sekretaris Rapat : {sekretaris}
TPL,

    // Undangan kegiatan
    'undangan_kegiatan' => <<<'TPL'
*UNDANGAN KEGIATAN*
Yth. Segenap Dewan Guru MA Alhikam

Assalamu'alaikum warahmatullahi wabarakatuh.
Mengharap kehadiran Bapak Ibu pada kegiatan berikut:

🗓️ : {tanggal}
🏛️ : {tempat}
📌 : {nama_kegiatan}
⏰ : {waktu} WIB - Selesai

Demikian undangan ini disampaikan. Atas kehadirannya diucapkan terimakasih. 🙏
Wassalamu'alaikum warahmatullahi wabarakatuh.

Ttd,
Kepala MA Alhikam
{kepala_madrasah}

*NB.*
Penanggung Jawab : {penanggung_jawab}
TPL,

    // Pengingat kegiatan hari H
    'pengingat_kegiatan' => <<<'TPL'
*PENGINGAT KEGIATAN HARI INI*
Yth. Segenap Dewan Guru MA Alhikam

Assalamu'alaikum warahmatullahi wabarakatuh.
Mengingatkan kegiatan hari ini:

🏛️ : {tempat}
📌 : {nama_kegiatan}
⏰ : {waktu} WIB - Selesai

Mohon hadir tepat waktu. 🙏
Wassalamu'alaikum warahmatullahi wabarakatuh.

*NB.*
Penanggung Jawab : {penanggung_jawab}
TPL,
];
