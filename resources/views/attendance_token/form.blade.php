<!DOCTYPE html>
<html lang="id">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Absensi - MAHAKAM APP</title>

    @php
        $logoLembaga = \App\Models\AppSetting::getValue('logo_lembaga');
        $logoUrl = $logoLembaga ? asset('storage/' . $logoLembaga) : asset('images/logo.png');
        $namaLembaga = \App\Models\AppSetting::getValue('nama_lembaga', 'MA Al-Hikam');
        $namaAplikasi = \App\Models\AppSetting::getValue('nama_aplikasi', 'MAHAKAM APP');
    @endphp

    <link rel="shortcut icon" href="{{ asset('favicon.ico') }}?v=1.1">
    <link rel="icon" type="image/png" href="{{ $logoUrl }}?v=1.1">
    <link rel="apple-touch-icon" href="{{ $logoUrl }}?v=1.1">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            background: #f0f2f5;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }
        /* Header */
        .header {
            background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
            color: white;
            padding: 16px 20px;
            display: flex;
            align-items: center;
            gap: 12px;
            position: sticky;
            top: 0;
            z-index: 10;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
        .header img {
            width: 36px;
            height: 36px;
            border-radius: 10px;
            background: white;
            padding: 2px;
        }
        .header-text h1 { font-size: 0.9rem; font-weight: 800; letter-spacing: 0.5px; }
        .header-text p { font-size: 0.7rem; opacity: 0.85; font-weight: 500; }

        /* Content */
        .content { flex: 1; padding: 16px; max-width: 480px; margin: 0 auto; width: 100%; }

        /* Badge */
        .type-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: #dcfce7;
            color: #166534;
            font-size: 0.7rem;
            font-weight: 700;
            padding: 4px 12px;
            border-radius: 20px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 12px;
        }

        /* Counter header for mengajar */
        .counter-header {
            background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
            border-radius: 16px;
            padding: 16px;
            margin-bottom: 12px;
            color: white;
            box-shadow: 0 4px 12px rgba(22,163,74,0.25);
        }
        .counter-header .counter-title {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 12px;
        }
        .counter-header .counter-title-left {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .counter-header .counter-icon {
            width: 40px;
            height: 40px;
            background: rgba(255,255,255,0.2);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .counter-header h2 { font-size: 0.95rem; font-weight: 700; }
        .counter-header .counter-subtitle { font-size: 0.7rem; color: rgba(255,255,255,0.8); }
        .counter-header .counter-close {
            width: 32px;
            height: 32px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: none;
            border: none;
            color: white;
            cursor: pointer;
        }
        .counter-grid {
            display: flex;
            gap: 4px;
            text-align: center;
        }
        .counter-grid .counter-item {
            flex: 1;
        }
        .counter-grid .counter-value {
            font-size: 1.5rem;
            font-weight: 800;
        }
        .counter-grid .counter-label {
            font-size: 0.65rem;
            color: rgba(255,255,255,0.8);
        }

        /* Guru card (non-mengajar) */
        .guru-card {
            background: white;
            border-radius: 14px;
            padding: 16px;
            margin-bottom: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.06);
            text-align: center;
        }
        .guru-card .avatar {
            width: 48px;
            height: 48px;
            border-radius: 14px;
            background: linear-gradient(135deg, #16a34a, #22c55e);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.2rem;
            font-weight: 800;
            margin: 0 auto 8px;
        }
        .guru-card .name { font-size: 0.95rem; font-weight: 700; color: #111; }
        .guru-card .date { font-size: 0.75rem; color: #888; margin-top: 2px; }

        /* Info grid */
        .info-grid {
            background: white;
            border-radius: 14px;
            padding: 4px 0;
            margin-bottom: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.06);
            overflow: hidden;
        }
        .info-row {
            display: flex;
            align-items: center;
            padding: 10px 16px;
            border-bottom: 1px solid #f3f4f6;
        }
        .info-row:last-child { border-bottom: none; }
        .info-row .icon-circle {
            width: 32px;
            height: 32px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.75rem;
            margin-right: 12px;
            flex-shrink: 0;
        }
        .icon-blue { background: #eff6ff; color: #3b82f6; }
        .icon-purple { background: #f3e8ff; color: #8b5cf6; }
        .icon-amber { background: #fffbeb; color: #f59e0b; }
        .icon-green { background: #ecfdf5; color: #10b981; }
        .info-row .info-label { font-size: 0.7rem; color: #999; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; }
        .info-row .info-value { font-size: 0.85rem; color: #222; font-weight: 600; }

        /* Section card */
        .section-card {
            background: white;
            border-radius: 14px;
            padding: 16px;
            margin-bottom: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.06);
            border: 2px solid #e5e7eb;
        }

        /* Guru self attendance */
        .guru-attendance {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .guru-attendance .guru-info {
            flex: 1;
            min-width: 0;
        }
        .guru-attendance .guru-name {
            font-weight: 700;
            color: #111;
            font-size: 0.9rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .guru-attendance .guru-role {
            font-size: 0.7rem;
            color: #999;
        }

        /* Status buttons */
        .status-btns {
            display: flex;
            gap: 4px;
        }
        .status-btn {
            width: 36px;
            height: 36px;
            border-radius: 10px;
            border: none;
            font-size: 0.8rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
            background: #f3f4f6;
            color: #9ca3af;
        }
        .status-btn:hover { background: #e5e7eb; }
        .status-btn.active-h { background: #22c55e; color: white; box-shadow: 0 2px 8px rgba(34,197,94,0.3); }
        .status-btn.active-s { background: #3b82f6; color: white; box-shadow: 0 2px 8px rgba(59,130,246,0.3); }
        .status-btn.active-i { background: #eab308; color: white; box-shadow: 0 2px 8px rgba(234,179,8,0.3); }
        .status-btn.active-a { background: #ef4444; color: white; box-shadow: 0 2px 8px rgba(239,68,68,0.3); }

        /* Notice bar */
        .notice {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 14px;
            border-radius: 12px;
            font-size: 0.8rem;
            margin-bottom: 12px;
        }
        .notice-h { background: #f0fdf4; color: #166534; }
        .notice-s { background: #eff6ff; color: #1e40af; }
        .notice-i { background: #fefce8; color: #854d0e; }
        .notice-a { background: #fef2f2; color: #991b1b; }

        /* Jenis kegiatan toggle */
        .toggle-group {
            display: flex;
            gap: 8px;
        }
        .toggle-btn {
            flex: 1;
            padding: 10px;
            border-radius: 12px;
            border: none;
            font-size: 0.8rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            background: #f3f4f6;
            color: #6b7280;
        }
        .toggle-btn:hover { background: #e5e7eb; }
        .toggle-btn.active-mengajar { background: #22c55e; color: white; box-shadow: 0 2px 8px rgba(34,197,94,0.3); }
        .toggle-btn.active-ulangan { background: #8b5cf6; color: white; box-shadow: 0 2px 8px rgba(139,92,246,0.3); }

        /* Form inputs */
        .form-label {
            font-size: 0.75rem;
            font-weight: 700;
            color: #555;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            margin-bottom: 6px;
            display: flex;
            align-items: center;
            gap: 4px;
        }
        .form-label .optional { font-weight: 400; color: #bbb; text-transform: none; font-size: 0.7rem; }
        .form-input {
            width: 100%;
            padding: 10px 14px;
            border: 1.5px solid #e5e7eb;
            border-radius: 10px;
            font-size: 0.85rem;
            font-family: inherit;
            transition: all 0.2s;
            outline: none;
            background: #fafafa;
            resize: vertical;
        }
        .form-input:focus { border-color: #16a34a; background: white; box-shadow: 0 0 0 3px rgba(22,163,74,0.1); }
        textarea.form-input { min-height: 60px; }
        select.form-input { appearance: auto; }

        /* Penilaian fields */
        .penilaian-input {
            width: 100%;
            padding: 10px 14px;
            border: 1.5px solid #ddd6fe;
            border-radius: 10px;
            font-size: 0.85rem;
            font-family: inherit;
            outline: none;
            background: #f5f3ff;
        }
        .penilaian-input:focus { border-color: #8b5cf6; box-shadow: 0 0 0 3px rgba(139,92,246,0.1); }

        /* Siswa list */
        .siswa-section {
            border: 2px solid #e5e7eb;
            border-radius: 14px;
            overflow: hidden;
            margin-bottom: 12px;
        }
        .siswa-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 14px 16px;
            background: linear-gradient(to right, #f0fdf4, #eef2ff);
            cursor: pointer;
            transition: all 0.2s;
            border: none;
            width: 100%;
            text-align: left;
        }
        .siswa-header:hover { background: linear-gradient(to right, #dcfce7, #e0e7ff); }
        .siswa-header-left {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .siswa-header-icon {
            width: 40px;
            height: 40px;
            background: #22c55e;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }
        .siswa-header-title { font-weight: 600; color: #111; font-size: 0.85rem; }
        .siswa-header-subtitle { font-size: 0.65rem; color: #666; }
        .siswa-header-chevron {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: white;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            transition: transform 0.3s;
        }
        .siswa-header-chevron.expanded { transform: rotate(180deg); }

        .siswa-list {
            max-height: 400px;
            overflow-y: auto;
            padding: 8px;
            transition: max-height 0.3s ease, opacity 0.3s ease;
        }
        .siswa-list.collapsed { max-height: 0; opacity: 0; padding: 0 8px; overflow: hidden; }

        .siswa-item {
            background: white;
            border: 1px solid #f3f4f6;
            border-radius: 12px;
            padding: 8px;
            margin-bottom: 6px;
        }
        .siswa-row {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .siswa-info {
            flex: 1;
            min-width: 0;
        }
        .siswa-name {
            font-weight: 600;
            font-size: 0.7rem;
            color: #111;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .siswa-nis { font-size: 0.6rem; color: #999; }

        /* Siswa status buttons (smaller) */
        .siswa-status-btns {
            display: flex;
            gap: 2px;
        }
        .siswa-status-btn {
            width: 24px;
            height: 24px;
            border-radius: 6px;
            border: none;
            font-size: 0.55rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.15s;
            background: #f3f4f6;
            color: #9ca3af;
        }
        .siswa-status-btn:hover { background: #e5e7eb; }
        .siswa-status-btn.active-h { background: #22c55e; color: white; }
        .siswa-status-btn.active-s { background: #3b82f6; color: white; }
        .siswa-status-btn.active-i { background: #eab308; color: white; }
        .siswa-status-btn.active-a { background: #ef4444; color: white; }

        /* Keterangan siswa */
        .siswa-keterangan {
            margin-top: 6px;
            width: 100%;
            padding: 6px 10px;
            border-radius: 8px;
            border: 1px solid #ddd;
            font-size: 0.75rem;
            font-family: inherit;
            outline: none;
        }
        .siswa-ket-s { border-color: #bfdbfe; background: #eff6ff; }
        .siswa-ket-s:focus { border-color: #3b82f6; }
        .siswa-ket-i { border-color: #fde68a; background: #fefce8; }
        .siswa-ket-i:focus { border-color: #eab308; }

        /* Nilai input */
        .siswa-nilai-row {
            margin-top: 6px;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .siswa-nilai-label { font-size: 0.65rem; color: #8b5cf6; font-weight: 600; white-space: nowrap; }
        .siswa-nilai-input {
            width: 60px;
            padding: 4px 8px;
            border: 1px solid #ddd6fe;
            background: #f5f3ff;
            border-radius: 8px;
            font-size: 0.75rem;
            text-align: center;
            font-family: inherit;
            outline: none;
        }
        .siswa-nilai-input:focus { border-color: #8b5cf6; box-shadow: 0 0 0 2px rgba(139,92,246,0.1); }
        .siswa-nilai-locked { font-size: 0.65rem; color: #999; font-style: italic; margin-top: 6px; }

        /* Footer buttons */
        .footer-buttons {
            display: flex;
            gap: 12px;
            padding: 0;
            margin-bottom: 16px;
        }
        .btn-cancel {
            flex: 1;
            padding: 14px;
            background: white;
            color: #6b7280;
            border: 2px solid #d1d5db;
            border-radius: 12px;
            font-size: 0.85rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            font-family: inherit;
        }
        .btn-cancel:hover { background: #f9fafb; }
        .btn-submit {
            flex: 1;
            padding: 14px;
            background: linear-gradient(135deg, #16a34a, #15803d);
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 0.85rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            box-shadow: 0 4px 12px rgba(22,163,74,0.3);
            font-family: inherit;
        }
        .btn-submit:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(22,163,74,0.35); }
        .btn-submit:active { transform: scale(0.98); }
        .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

        /* Footer */
        .footer {
            text-align: center;
            padding: 12px;
            color: #bbb;
            font-size: 0.65rem;
            font-weight: 600;
        }

        /* Conditional visibility */
        .hidden { display: none !important; }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        .content > * { animation: fadeIn 0.3s ease-out backwards; }
        .content > *:nth-child(2) { animation-delay: 0.05s; }
        .content > *:nth-child(3) { animation-delay: 0.1s; }
        .content > *:nth-child(4) { animation-delay: 0.15s; }
    </style>
</head>

<body>
    <div class="header">
        <img src="{{ $logoUrl }}" alt="Logo">
        <div class="header-text">
            <h1>{{ $namaLembaga }}</h1>
            <p>Sistem Absensi Digital</p>
        </div>
    </div>

    <div class="content">
        @if($token->type === 'mengajar' && $reference)
            {{-- ===== MENGAJAR FORM (full, matches logged-in UI) ===== --}}

            {{-- Counter Header --}}
            <div class="counter-header">
                <div class="counter-title">
                    <div class="counter-title-left">
                        <div class="counter-icon">
                            <i class="fas fa-clipboard-check"></i>
                        </div>
                        <div>
                            <h2>Input Absensi Siswa</h2>
                            <div class="counter-subtitle">{{ $reference->mapel->nama_mapel ?? '-' }} • {{ $reference->kelas->nama_kelas ?? '-' }}</div>
                        </div>
                    </div>
                </div>
                <div class="counter-grid">
                    <div class="counter-item">
                        <div class="counter-value" id="countHadir">{{ $siswaList->where('status', 'H')->count() ?: $siswaList->count() }}</div>
                        <div class="counter-label">Hadir</div>
                    </div>
                    <div class="counter-item">
                        <div class="counter-value" id="countSakit">{{ $siswaList->where('status', 'S')->count() }}</div>
                        <div class="counter-label">Sakit</div>
                    </div>
                    <div class="counter-item">
                        <div class="counter-value" id="countIzin">{{ $siswaList->where('status', 'I')->count() }}</div>
                        <div class="counter-label">Izin</div>
                    </div>
                    <div class="counter-item">
                        <div class="counter-value" id="countAlpha">{{ $siswaList->where('status', 'A')->count() }}</div>
                        <div class="counter-label">Alpha</div>
                    </div>
                </div>
            </div>

            <form method="POST" action="{{ url('/api/absen/' . $token->token) }}" id="absenForm">
                @csrf

                {{-- Guru Self-Attendance --}}
                <div class="section-card">
                    <div class="guru-attendance">
                        <div class="guru-info">
                            <div class="guru-name">{{ $token->guru->nama ?? '-' }}</div>
                            <div class="guru-role">Guru Pengajar</div>
                        </div>
                        <div class="status-btns">
                            <button type="button" class="status-btn active-h" data-guru-status="H" onclick="setGuruStatus('H')">H</button>
                            <button type="button" class="status-btn" data-guru-status="S" onclick="setGuruStatus('S')">S</button>
                            <button type="button" class="status-btn" data-guru-status="I" onclick="setGuruStatus('I')">I</button>
                            <button type="button" class="status-btn" data-guru-status="A" onclick="setGuruStatus('A')">A</button>
                        </div>
                    </div>
                    <input type="hidden" name="guru_status" id="guruStatusInput" value="H">

                    {{-- Guru Absence Fields (shown when S or I) --}}
                    <div id="guruAbsenceFields" class="hidden" style="margin-top: 12px;">
                        {{-- Keterangan --}}
                        <input type="text" name="guru_keterangan" id="guruKeteranganInput"
                            class="form-input" style="margin-bottom: 10px; border-color: #bfdbfe; background: #eff6ff;"
                            placeholder="Keterangan sakit...">

                        {{-- Guru Pengganti --}}
                        <div style="margin-bottom: 10px; position: relative;">
                            <label class="form-label">Guru Pengganti <span class="optional">(opsional)</span></label>
                            <div style="position: relative;">
                                <input type="text" id="guruSearchInput"
                                    class="form-input" style="padding-right: 32px;"
                                    placeholder="Ketik nama guru..."
                                    autocomplete="off"
                                    onfocus="showGuruDropdown()" oninput="filterGuru()">
                                <input type="hidden" name="guru_tugas_id" id="guruTugasIdInput" value="">
                                <button type="button" id="guruClearBtn" class="hidden"
                                    onclick="clearGuruSelection()"
                                    style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #999; cursor: pointer; font-size: 0.8rem;">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                            <div id="guruDropdown" class="hidden"
                                style="position: absolute; z-index: 50; width: 100%; margin-top: 4px; background: white; border: 1px solid #e5e7eb; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); max-height: 160px; overflow-y: auto;">
                                @foreach($guruList as $guru)
                                <button type="button" class="guru-dropdown-item"
                                    data-guru-id="{{ $guru->id }}" data-guru-nama="{{ $guru->nama }}"
                                    onclick="selectGuru({{ $guru->id }}, '{{ addslashes($guru->nama) }}')"
                                    style="width: 100%; text-align: left; padding: 8px 12px; border: none; border-bottom: 1px solid #f3f4f6; background: none; cursor: pointer; font-family: inherit;">
                                    <div style="font-weight: 600; font-size: 0.8rem; color: #111;">{{ $guru->nama }}</div>
                                    <div style="font-size: 0.65rem; color: #999;">{{ $guru->nip ?: 'Guru' }}</div>
                                </button>
                                @endforeach
                            </div>
                        </div>

                        {{-- Tugas untuk Siswa --}}
                        <div>
                            <label class="form-label">Tugas untuk Siswa <span style="color: #ef4444;">*</span></label>
                            <textarea name="tugas_siswa" id="tugasSiswaInput" class="form-input" style="min-height: 60px;"
                                placeholder="Tugas yang diberikan kepada siswa..."></textarea>
                        </div>
                    </div>
                </div>

                {{-- Notice --}}
                <div class="notice notice-h" id="statusNotice">
                    <i class="fas fa-check-circle" id="noticeIcon"></i>
                    <span id="noticeText">Dengan menyimpan absensi, Anda tercatat <strong>HADIR</strong> di kelas ini</span>
                </div>

                {{-- Jenis Kegiatan (only when guru=H) --}}
                <div class="section-card" id="jenisKegiatanSection">
                    <div class="form-label" style="margin-bottom: 10px;">Jenis Kegiatan</div>
                    <div class="toggle-group">
                        <button type="button" class="toggle-btn active-mengajar" data-jenis="mengajar" onclick="setJenisKegiatan('mengajar')">
                            <i class="fas fa-book"></i> Mengajar
                        </button>
                        <button type="button" class="toggle-btn" data-jenis="ulangan" onclick="setJenisKegiatan('ulangan')">
                            <i class="fas fa-file-signature"></i> Penilaian
                        </button>
                    </div>
                    <input type="hidden" name="jenis_kegiatan" id="jenisKegiatanInput" value="mengajar">

                    {{-- Penilaian sub-fields --}}
                    <div id="penilaianFields" class="hidden" style="margin-top: 12px;">
                        <div style="margin-bottom: 8px;">
                            <label class="form-label">Jenis Penilaian</label>
                            <select name="jenis_ulangan" class="penilaian-input" id="jenisUlanganSelect">
                                <option value="ulangan_harian">Penilaian Harian</option>
                                <option value="uts">UTS (Ujian Tengah Semester)</option>
                                <option value="uas">UAS (Ujian Akhir Semester)</option>
                                <option value="quiz">Quiz</option>
                            </select>
                        </div>
                        <div>
                            <label class="form-label">Judul/Materi Penilaian</label>
                            <input type="text" name="judul_ulangan" class="penilaian-input" placeholder="Contoh: Bab 3 - Sholat, Hukum Tajwid, dll">
                        </div>
                    </div>
                </div>

                {{-- Ringkasan Materi (when guru=H and jenis=mengajar) --}}
                <div id="ringkasanSection">
                    <div class="form-label"><i class="fas fa-pen"></i> Ringkasan Materi</div>
                    <textarea name="ringkasan_materi" class="form-input" id="ringkasanInput" placeholder="Isi ringkasan materi yang diajarkan..." style="margin-bottom: 12px;"></textarea>
                </div>

                {{-- Berita Acara (when guru=H and jenis=mengajar) --}}
                <div id="beritaAcaraSection">
                    <div class="form-label"><i class="fas fa-file-alt"></i> Berita Acara <span class="optional">(opsional)</span></div>
                    <textarea name="berita_acara" class="form-input" placeholder="Isi berita acara pembelajaran..." style="margin-bottom: 12px;"></textarea>
                </div>

                {{-- Siswa List (when guru=H) --}}
                <div class="siswa-section" id="siswaSection">
                    <button type="button" class="siswa-header" onclick="toggleSiswaList()">
                        <div class="siswa-header-left">
                            <div class="siswa-header-icon">
                                <i class="fas fa-users"></i>
                            </div>
                            <div>
                                <div class="siswa-header-title">Absensi Siswa</div>
                                <div class="siswa-header-subtitle" id="siswaSubtitle">
                                    <span style="color: #16a34a;">{{ $siswaList->count() }} hadir</span>
                                </div>
                            </div>
                        </div>
                        <div class="siswa-header-chevron expanded" id="siswaChevron">
                            <i class="fas fa-chevron-down" style="font-size: 0.7rem; color: #666;"></i>
                        </div>
                    </button>
                    <div class="siswa-list" id="siswaListContainer">
                        @foreach($siswaList as $siswa)
                        <div class="siswa-item" data-siswa-id="{{ $siswa['id'] }}">
                            <div class="siswa-row">
                                <div class="siswa-info">
                                    <div class="siswa-name">{{ $siswa['nama'] }}</div>
                                    <div class="siswa-nis">{{ $siswa['nis'] }}</div>
                                </div>
                                <div class="siswa-status-btns">
                                    <button type="button" class="siswa-status-btn {{ $siswa['status'] === 'H' ? 'active-h' : '' }}" data-status="H" onclick="setSiswaStatus({{ $siswa['id'] }}, 'H', this)">H</button>
                                    <button type="button" class="siswa-status-btn {{ $siswa['status'] === 'S' ? 'active-s' : '' }}" data-status="S" onclick="setSiswaStatus({{ $siswa['id'] }}, 'S', this)">S</button>
                                    <button type="button" class="siswa-status-btn {{ $siswa['status'] === 'I' ? 'active-i' : '' }}" data-status="I" onclick="setSiswaStatus({{ $siswa['id'] }}, 'I', this)">I</button>
                                    <button type="button" class="siswa-status-btn {{ $siswa['status'] === 'A' ? 'active-a' : '' }}" data-status="A" onclick="setSiswaStatus({{ $siswa['id'] }}, 'A', this)">A</button>
                                </div>
                            </div>
                            <input type="hidden" name="absensi_siswa[{{ $siswa['id'] }}]" value="{{ $siswa['status'] }}" class="siswa-status-input">
                            {{-- Keterangan (shown for S/I) --}}
                            <input type="text" name="absensi_siswa_ket[{{ $siswa['id'] }}]" value="{{ $siswa['keterangan'] }}"
                                class="siswa-keterangan siswa-ket-field {{ in_array($siswa['status'], ['S', 'I']) ? ($siswa['status'] === 'S' ? 'siswa-ket-s' : 'siswa-ket-i') : 'hidden' }}"
                                placeholder="{{ $siswa['status'] === 'S' ? 'Keterangan sakit...' : 'Keterangan izin...' }}">
                            {{-- Nilai (shown for ulangan + hadir) --}}
                            <div class="siswa-nilai-row siswa-nilai-field hidden">
                                <span class="siswa-nilai-label">Nilai:</span>
                                <input type="number" min="0" max="100" name="nilai_siswa[{{ $siswa['id'] }}]" class="siswa-nilai-input" placeholder="0-100">
                            </div>
                            <div class="siswa-nilai-locked siswa-nilai-locked-field hidden">
                                <i class="fas fa-lock" style="font-size: 0.5rem; margin-right: 2px;"></i>Nilai diisi via menu Penilaian (susulan)
                            </div>
                        </div>
                        @endforeach
                    </div>
                </div>

                <input type="hidden" name="keterangan" value="Hadir (via link WA)">

                {{-- Footer Buttons --}}
                <div class="footer-buttons">
                    <button type="button" class="btn-cancel" onclick="window.history.back()">Batal</button>
                    <button type="submit" class="btn-submit" id="submitBtn">
                        <i class="fas fa-save"></i> Simpan Absensi
                    </button>
                </div>
            </form>

        @else
            {{-- ===== NON-MENGAJAR FORM (role-aware: PJ kegiatan, sekretaris rapat, etc.) ===== --}}
            <div style="text-align: center;">
                <span class="type-badge">
                    @if($token->type === 'kegiatan')
                        <i class="fas fa-calendar-check"></i> Absensi Kegiatan
                        @if($role === 'penanggung_jawab') — Koordinator @endif
                    @else
                        <i class="fas fa-handshake"></i> Absensi Rapat
                        @if($role === 'sekretaris') — Sekretaris
                        @elseif($role === 'pimpinan') — Pimpinan
                        @endif
                    @endif
                </span>
            </div>

            <div class="guru-card">
                <div class="avatar">{{ strtoupper(substr($token->guru->nama ?? 'G', 0, 1)) }}</div>
                <div class="name">{{ $token->guru->nama ?? '-' }}</div>
                <div class="date">{{ $token->tanggal->translatedFormat('l, d F Y') }}</div>
            </div>

            <div class="info-grid">
                @if($token->type === 'kegiatan' && $reference)
                    <div class="info-row">
                        <div class="icon-circle icon-blue"><i class="fas fa-calendar"></i></div>
                        <div><div class="info-label">Kegiatan</div><div class="info-value">{{ $reference->nama_kegiatan }}</div></div>
                    </div>
                    <div class="info-row">
                        <div class="icon-circle icon-purple"><i class="fas fa-map-marker-alt"></i></div>
                        <div><div class="info-label">Tempat</div><div class="info-value">{{ $reference->tempat ?? '-' }}</div></div>
                    </div>
                    <div class="info-row">
                        <div class="icon-circle icon-amber"><i class="fas fa-clock"></i></div>
                        <div><div class="info-label">Waktu</div><div class="info-value">{{ \Carbon\Carbon::parse($reference->waktu_mulai)->format('H:i') }}</div></div>
                    </div>
                @elseif($token->type === 'rapat' && $reference)
                    <div class="info-row">
                        <div class="icon-circle icon-blue"><i class="fas fa-gavel"></i></div>
                        <div><div class="info-label">Agenda</div><div class="info-value">{{ $reference->agenda_rapat }}</div></div>
                    </div>
                    <div class="info-row">
                        <div class="icon-circle icon-purple"><i class="fas fa-map-marker-alt"></i></div>
                        <div><div class="info-label">Tempat</div><div class="info-value">{{ $reference->tempat ?? '-' }}</div></div>
                    </div>
                    <div class="info-row">
                        <div class="icon-circle icon-amber"><i class="fas fa-clock"></i></div>
                        <div><div class="info-label">Waktu</div><div class="info-value">{{ substr($reference->waktu_mulai, 0, 5) }} - {{ substr($reference->waktu_selesai, 0, 5) }}</div></div>
                    </div>
                @endif
            </div>

            @if($role === 'penanggung_jawab' && $token->type === 'kegiatan')
                {{-- =============== PJ KEGIATAN FULL FORM =============== --}}
                <form method="POST" action="{{ url('/api/absen/' . $token->token) }}" id="absenForm">
                    @csrf
                    <input type="hidden" name="is_coordinator_form" value="1">

                    @php
                        $pjCurStatus = $existingAbsensi->pj_status ?? 'H';
                        $existPendamping = $existingAbsensi->absensi_pendamping ?? [];
                        $existSiswa = $existingAbsensi->absensi_siswa ?? [];
                        $existFotos = $existingAbsensi->foto_kegiatan ?? [];
                    @endphp

                    {{-- PJ Self Status --}}
                    <div class="section-card">
                        <div class="guru-attendance">
                            <div class="guru-info">
                                <div class="guru-name">{{ $token->guru->nama ?? '-' }}</div>
                                <div class="guru-role" style="color: #16a34a; font-weight: 600;">Penanggung Jawab</div>
                            </div>
                            <div class="status-btns">
                                @foreach(['H','S','I','A'] as $st)
                                <button type="button" class="status-btn {{ $pjCurStatus === $st ? 'active-'.strtolower($st) : '' }}" onclick="setCoordStatus('pj_status', '{{ $st }}', this)">{{ $st }}</button>
                                @endforeach
                            </div>
                        </div>
                        <input type="hidden" name="pj_status" id="pj_status" value="{{ $pjCurStatus }}">
                        <input type="text" name="pj_keterangan" class="form-input {{ in_array($pjCurStatus, ['S','I']) ? '' : 'hidden' }}" id="pj_keterangan" style="margin-top: 10px;" placeholder="Keterangan..." value="{{ $existingAbsensi->pj_keterangan ?? '' }}">
                    </div>

                    {{-- Guru Pendamping Attendance --}}
                    @if(!empty($coordinatorData['pendamping_list']) && count($coordinatorData['pendamping_list']) > 0)
                    <div class="section-card">
                        <div class="form-label" style="margin-bottom: 10px;"><i class="fas fa-users"></i> Absensi Guru Pendamping</div>
                        @foreach($coordinatorData['pendamping_list'] as $idx => $guru)
                        @php
                            $gpStatus = 'A';
                            foreach($existPendamping as $ep) { if(($ep['guru_id'] ?? 0) == $guru->id) { $gpStatus = $ep['status'] ?? 'A'; break; } }
                        @endphp
                        <div class="guru-attendance" style="margin-bottom: 8px; padding: 8px; background: #f9fafb; border-radius: 10px;">
                            <div class="guru-info">
                                <div class="guru-name" style="font-size: 0.8rem;">{{ $guru->nama }}</div>
                                <div class="guru-role">Pendamping</div>
                            </div>
                            <div class="status-btns">
                                @foreach(['H','S','I','A'] as $st)
                                <button type="button" class="status-btn {{ $gpStatus === $st ? 'active-'.strtolower($st) : '' }}" onclick="setCoordStatus('pendamping_status_{{ $guru->id }}', '{{ $st }}', this)">{{ $st }}</button>
                                @endforeach
                            </div>
                            <input type="hidden" name="pendamping_status_{{ $guru->id }}" id="pendamping_status_{{ $guru->id }}" value="{{ $gpStatus }}" data-guru-id="{{ $guru->id }}">
                        </div>
                        @endforeach
                    </div>
                    @endif

                    {{-- Siswa Attendance --}}
                    @if(!empty($coordinatorData['siswa_list']) && count($coordinatorData['siswa_list']) > 0)
                    <div class="siswa-section">
                        <button type="button" class="siswa-header" onclick="toggleCoordSiswa()">
                            <div class="siswa-header-left">
                                <div class="siswa-header-icon"><i class="fas fa-user-graduate"></i></div>
                                <div>
                                    <div class="siswa-header-title">Absensi Siswa</div>
                                    <div class="siswa-header-subtitle" id="coordSiswaSubtitle">{{ count($coordinatorData['siswa_list']) }} siswa</div>
                                </div>
                            </div>
                            <div class="siswa-header-chevron" id="coordSiswaChevron"><i class="fas fa-chevron-down" style="font-size: 0.7rem; color: #666;"></i></div>
                        </button>
                        <div class="siswa-list collapsed" id="coordSiswaList">
                            @foreach($coordinatorData['siswa_list'] as $siswa)
                            @php
                                $ssStatus = 'A';
                                foreach($existSiswa as $es) { if(($es['siswa_id'] ?? 0) == $siswa['id']) { $ssStatus = $es['status'] ?? 'A'; break; } }
                            @endphp
                            <div class="siswa-item">
                                <div class="siswa-row">
                                    <div class="siswa-info">
                                        <div class="siswa-name">{{ $siswa['nama'] }}</div>
                                        <div class="siswa-nis">{{ $siswa['kelas'] ?? '' }} • {{ $siswa['nis'] ?? '' }}</div>
                                    </div>
                                    <div class="siswa-status-btns">
                                        @foreach(['H','S','I','A'] as $st)
                                        <button type="button" class="siswa-status-btn {{ $ssStatus === $st ? 'active-'.strtolower($st) : '' }}" onclick="setCoordSiswaStatus({{ $siswa['id'] }}, '{{ $st }}', this)">{{ $st }}</button>
                                        @endforeach
                                    </div>
                                </div>
                                <input type="hidden" name="siswa_status_{{ $siswa['id'] }}" id="siswa_status_{{ $siswa['id'] }}" value="{{ $ssStatus }}" data-siswa-id="{{ $siswa['id'] }}">
                            </div>
                            @endforeach
                        </div>
                    </div>
                    @endif

                    {{-- Berita Acara --}}
                    <div>
                        <div class="form-label"><i class="fas fa-file-alt"></i> Berita Acara <span class="optional">(opsional)</span></div>
                        <textarea name="berita_acara" class="form-input" placeholder="Isi berita acara kegiatan..." style="margin-bottom: 12px;">{{ $existingAbsensi->berita_acara ?? '' }}</textarea>
                    </div>

                    {{-- Foto Kegiatan --}}
                    <div class="section-card">
                        <div class="form-label"><i class="fas fa-camera"></i> Foto Kegiatan <span style="color: #ef4444;">* (min 2, max 4)</span></div>
                        <div id="photoPreviewContainer" style="display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0;"></div>
                        <div style="display: flex; gap: 8px;">
                            <button type="button" onclick="capturePhoto()" class="btn-cancel" style="flex: 1; font-size: 0.8rem; padding: 10px;">
                                <i class="fas fa-camera"></i> Kamera
                            </button>
                            <button type="button" onclick="selectPhoto()" class="btn-cancel" style="flex: 1; font-size: 0.8rem; padding: 10px;">
                                <i class="fas fa-image"></i> Galeri
                            </button>
                        </div>
                        <input type="file" id="photoFileInput" accept="image/*" class="hidden" onchange="handlePhotoSelect(event)">
                        <input type="file" id="cameraInput" accept="image/*" capture="environment" class="hidden" onchange="handlePhotoSelect(event)">
                    </div>

                    <div class="footer-buttons">
                        <button type="button" class="btn-cancel" onclick="window.history.back()">Batal</button>
                        <button type="submit" class="btn-submit" id="submitBtn">
                            <i class="fas fa-save"></i> Simpan Absensi
                        </button>
                    </div>
                </form>

            @elseif($role === 'sekretaris' && $token->type === 'rapat')
                {{-- =============== SEKRETARIS RAPAT FULL FORM =============== --}}
                <form method="POST" action="{{ url('/api/absen/' . $token->token) }}" id="absenForm">
                    @csrf
                    <input type="hidden" name="is_coordinator_form" value="1">

                    @php
                        $pimStatus = $existingAbsensi->pimpinan_status ?? 'H';
                        $sekStatus = $existingAbsensi->sekretaris_status ?? 'H';
                        $existPeserta = $existingAbsensi->absensi_peserta ?? [];
                    @endphp

                    {{-- Pimpinan Status --}}
                    <div class="section-card">
                        <div class="guru-attendance">
                            <div class="guru-info">
                                <div class="guru-name">{{ $coordinatorData['pimpinan_guru']->nama ?? '-' }}</div>
                                <div class="guru-role" style="color: #8b5cf6; font-weight: 600;">Pimpinan Rapat</div>
                            </div>
                            <div class="status-btns">
                                @foreach(['H','S','I','A'] as $st)
                                <button type="button" class="status-btn {{ $pimStatus === $st ? 'active-'.strtolower($st) : '' }}" onclick="setCoordStatus('pimpinan_status', '{{ $st }}', this)">{{ $st }}</button>
                                @endforeach
                            </div>
                        </div>
                        <input type="hidden" name="pimpinan_status" id="pimpinan_status" value="{{ $pimStatus }}">
                        <input type="text" name="pimpinan_keterangan" class="form-input {{ in_array($pimStatus, ['S','I']) ? '' : 'hidden' }}" id="pimpinan_keterangan" style="margin-top: 10px;" placeholder="Keterangan..." value="{{ $existingAbsensi->pimpinan_keterangan ?? '' }}">
                    </div>

                    {{-- Sekretaris Self Status --}}
                    <div class="section-card">
                        <div class="guru-attendance">
                            <div class="guru-info">
                                <div class="guru-name">{{ $coordinatorData['sekretaris_guru']->nama ?? '-' }}</div>
                                <div class="guru-role" style="color: #16a34a; font-weight: 600;">Sekretaris Rapat</div>
                            </div>
                            <div class="status-btns">
                                @foreach(['H','S','I','A'] as $st)
                                <button type="button" class="status-btn {{ $sekStatus === $st ? 'active-'.strtolower($st) : '' }}" onclick="setCoordStatus('sekretaris_status', '{{ $st }}', this)">{{ $st }}</button>
                                @endforeach
                            </div>
                        </div>
                        <input type="hidden" name="sekretaris_status" id="sekretaris_status" value="{{ $sekStatus }}">
                        <input type="text" name="sekretaris_keterangan" class="form-input {{ in_array($sekStatus, ['S','I']) ? '' : 'hidden' }}" id="sekretaris_keterangan" style="margin-top: 10px;" placeholder="Keterangan..." value="{{ $existingAbsensi->sekretaris_keterangan ?? '' }}">
                    </div>

                    {{-- Peserta Attendance --}}
                    @if(!empty($coordinatorData['peserta_list']) && count($coordinatorData['peserta_list']) > 0)
                    <div class="section-card">
                        <div class="form-label" style="margin-bottom: 10px;"><i class="fas fa-users"></i> Absensi Peserta Rapat</div>
                        @foreach($coordinatorData['peserta_list'] as $guru)
                        @php
                            $gpStatus = 'A';
                            foreach($existPeserta as $ep) { if(($ep['guru_id'] ?? 0) == $guru->id) { $gpStatus = $ep['status'] ?? 'A'; break; } }
                        @endphp
                        <div class="guru-attendance" style="margin-bottom: 8px; padding: 8px; background: #f9fafb; border-radius: 10px;">
                            <div class="guru-info">
                                <div class="guru-name" style="font-size: 0.8rem;">{{ $guru->nama }}</div>
                                <div class="guru-role">Peserta</div>
                            </div>
                            <div class="status-btns">
                                @foreach(['H','S','I','A'] as $st)
                                <button type="button" class="status-btn {{ $gpStatus === $st ? 'active-'.strtolower($st) : '' }}" onclick="setCoordStatus('peserta_status_{{ $guru->id }}', '{{ $st }}', this)">{{ $st }}</button>
                                @endforeach
                            </div>
                            <input type="hidden" name="peserta_status_{{ $guru->id }}" id="peserta_status_{{ $guru->id }}" value="{{ $gpStatus }}" data-guru-id="{{ $guru->id }}">
                        </div>
                        @endforeach
                    </div>
                    @endif

                    {{-- Notulensi --}}
                    <div>
                        <div class="form-label"><i class="fas fa-file-alt"></i> Notulensi <span style="color: #ef4444;">*</span></div>
                        <textarea name="notulensi" id="notulensiInput" class="form-input" style="min-height: 100px; margin-bottom: 12px;" placeholder="Isi notulensi rapat...">{{ $existingAbsensi->notulensi ?? '' }}</textarea>
                    </div>

                    {{-- Foto Rapat --}}
                    <div class="section-card">
                        <div class="form-label"><i class="fas fa-camera"></i> Foto Rapat <span style="color: #ef4444;">* (min 2, max 4)</span></div>
                        <div id="photoPreviewContainer" style="display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0;"></div>
                        <div style="display: flex; gap: 8px;">
                            <button type="button" onclick="capturePhoto()" class="btn-cancel" style="flex: 1; font-size: 0.8rem; padding: 10px;">
                                <i class="fas fa-camera"></i> Kamera
                            </button>
                            <button type="button" onclick="selectPhoto()" class="btn-cancel" style="flex: 1; font-size: 0.8rem; padding: 10px;">
                                <i class="fas fa-image"></i> Galeri
                            </button>
                        </div>
                        <input type="file" id="photoFileInput" accept="image/*" class="hidden" onchange="handlePhotoSelect(event)">
                        <input type="file" id="cameraInput" accept="image/*" capture="environment" class="hidden" onchange="handlePhotoSelect(event)">
                    </div>

                    <div class="footer-buttons">
                        <button type="button" class="btn-cancel" onclick="window.history.back()">Batal</button>
                        <button type="submit" class="btn-submit" id="submitBtn">
                            <i class="fas fa-save"></i> Simpan Absensi
                        </button>
                    </div>
                </form>

            @else
                {{-- =============== SIMPLE SELF-ATTENDANCE (pimpinan, peserta, pendamping) =============== --}}
                <form method="POST" action="{{ url('/api/absen/' . $token->token) }}" id="absenForm">
                    @csrf

                    @php $curStatus = $existingStatus['status'] ?? 'H'; @endphp

                    @if($existingStatus)
                    <div class="notice notice-h" style="margin-bottom: 12px; background: #fffbeb; color: #854d0e;">
                        <i class="fas fa-edit"></i>
                        <span>Anda sudah absen. Anda dapat mengubah status absensi di bawah ini.</span>
                    </div>
                    @endif

                    <div class="section-card">
                        <div class="guru-attendance">
                            <div class="guru-info">
                                <div class="guru-name">{{ $token->guru->nama ?? '-' }}</div>
                                <div class="guru-role">
                                    @if($role === 'pimpinan') Pimpinan Rapat
                                    @elseif($role === 'peserta' && $token->type === 'rapat') Peserta Rapat
                                    @elseif($role === 'pendamping') Guru Pendamping
                                    @else Peserta
                                    @endif
                                </div>
                            </div>
                            <div class="status-btns">
                                <button type="button" class="status-btn {{ $curStatus === 'H' ? 'active-h' : '' }}" data-rk-status="H" onclick="setRKStatus('H')">H</button>
                                <button type="button" class="status-btn {{ $curStatus === 'S' ? 'active-s' : '' }}" data-rk-status="S" onclick="setRKStatus('S')">S</button>
                                <button type="button" class="status-btn {{ $curStatus === 'I' ? 'active-i' : '' }}" data-rk-status="I" onclick="setRKStatus('I')">I</button>
                                <button type="button" class="status-btn {{ $curStatus === 'A' ? 'active-a' : '' }}" data-rk-status="A" onclick="setRKStatus('A')">A</button>
                            </div>
                        </div>
                        <input type="hidden" name="status" id="rkStatusInput" value="{{ $curStatus }}">
                        <input type="text" name="keterangan" id="rkKeteranganInput"
                            class="form-input {{ in_array($curStatus, ['S', 'I']) ? '' : 'hidden' }}"
                            style="margin-top: 10px; border-color: {{ $curStatus === 'S' ? '#bfdbfe' : '#fde68a' }}; background: {{ $curStatus === 'S' ? '#eff6ff' : '#fefce8' }};"
                            placeholder="{{ $curStatus === 'S' ? 'Keterangan sakit...' : 'Keterangan izin...' }}"
                            value="{{ $existingStatus['keterangan'] ?? '' }}">
                    </div>

                    <div class="notice notice-{{ strtolower($curStatus) }}" id="rkNotice" style="margin-bottom: 12px;">
                        <i class="fas fa-{{ $curStatus === 'H' ? 'check-circle' : ($curStatus === 'S' ? 'clinic-medical' : ($curStatus === 'I' ? 'info-circle' : 'exclamation-circle')) }}" id="rkNoticeIcon"></i>
                        <span id="rkNoticeText">
                            @if($curStatus === 'H') Dengan menyimpan, Anda tercatat <strong>HADIR</strong>
                            @elseif($curStatus === 'S') Anda tercatat <strong>SAKIT</strong>
                            @elseif($curStatus === 'I') Anda tercatat <strong>IZIN</strong>
                            @else Anda tercatat <strong>ALPHA</strong>
                            @endif
                        </span>
                    </div>

                    <div class="footer-buttons">
                        <button type="button" class="btn-cancel" onclick="window.history.back()">Batal</button>
                        <button type="submit" class="btn-submit" id="submitBtn">
                            <i class="fas fa-save"></i>
                            {{ $existingStatus ? 'Ubah Absensi' : 'Simpan Absensi' }}
                        </button>
                    </div>
                </form>
            @endif
        @endif
    </div>

    <div class="footer">{{ $namaAplikasi }} &copy; {{ date('Y') }} &middot; Pesan otomatis</div>

    @if($token->type === 'mengajar' && $reference)
    <script>
        // State
        let guruStatus = 'H';
        let jenisKegiatan = 'mengajar';
        let siswaExpanded = true;
        const siswaStatuses = {};

        // Initialize siswa statuses
        document.querySelectorAll('.siswa-item').forEach(item => {
            const id = item.dataset.siswaId;
            const hiddenInput = item.querySelector('.siswa-status-input');
            siswaStatuses[id] = hiddenInput.value || 'H';
        });

        function setGuruStatus(status) {
            guruStatus = status;
            document.getElementById('guruStatusInput').value = status;

            // Update button styles
            document.querySelectorAll('[data-guru-status]').forEach(btn => {
                btn.className = 'status-btn';
                if (btn.dataset.guruStatus === status) {
                    btn.classList.add('active-' + status.toLowerCase());
                }
            });

            // Update notice
            const notice = document.getElementById('statusNotice');
            const icon = document.getElementById('noticeIcon');
            const text = document.getElementById('noticeText');
            notice.className = 'notice notice-' + status.toLowerCase();

            const noticeData = {
                H: { icon: 'fa-check-circle', text: 'Dengan menyimpan absensi, Anda tercatat <strong>HADIR</strong> di kelas ini' },
                S: { icon: 'fa-clinic-medical', text: 'Anda tercatat <strong>SAKIT</strong> di kelas ini' },
                I: { icon: 'fa-info-circle', text: 'Anda tercatat <strong>IZIN</strong> di kelas ini' },
                A: { icon: 'fa-exclamation-circle', text: 'Anda tercatat <strong>ALPHA</strong> di kelas ini' },
            };
            icon.className = 'fas ' + noticeData[status].icon;
            text.innerHTML = noticeData[status].text;

            // Show/hide sections based on guru status
            const showWhenH = status === 'H';
            const showAbsence = status === 'S' || status === 'I';
            document.getElementById('jenisKegiatanSection').classList.toggle('hidden', !showWhenH);
            document.getElementById('siswaSection').classList.toggle('hidden', !showWhenH);
            document.getElementById('guruAbsenceFields').classList.toggle('hidden', !showAbsence);

            // Update keterangan placeholder based on status
            if (showAbsence) {
                const ketInput = document.getElementById('guruKeteranganInput');
                ketInput.placeholder = status === 'S' ? 'Keterangan sakit...' : 'Keterangan izin...';
                ketInput.style.borderColor = status === 'S' ? '#bfdbfe' : '#fde68a';
                ketInput.style.background = status === 'S' ? '#eff6ff' : '#fefce8';
            }

            updateTextSections();
        }

        function setJenisKegiatan(jenis) {
            jenisKegiatan = jenis;
            document.getElementById('jenisKegiatanInput').value = jenis;

            // Update toggle buttons
            document.querySelectorAll('[data-jenis]').forEach(btn => {
                btn.className = 'toggle-btn';
                if (btn.dataset.jenis === jenis) {
                    btn.classList.add('active-' + jenis);
                }
            });

            // Show/hide penilaian fields
            document.getElementById('penilaianFields').classList.toggle('hidden', jenis !== 'ulangan');

            updateTextSections();
            updateNilaiVisibility();
        }

        function updateTextSections() {
            const showMengajar = guruStatus === 'H' && jenisKegiatan === 'mengajar';
            document.getElementById('ringkasanSection').classList.toggle('hidden', !showMengajar);
            document.getElementById('beritaAcaraSection').classList.toggle('hidden', !showMengajar);
        }

        // Guru Pengganti search functions
        function showGuruDropdown() {
            document.getElementById('guruDropdown').classList.remove('hidden');
            filterGuru();
        }

        function filterGuru() {
            const search = document.getElementById('guruSearchInput').value.toLowerCase();
            const dropdown = document.getElementById('guruDropdown');
            const items = dropdown.querySelectorAll('.guru-dropdown-item');
            let visible = 0;

            items.forEach(item => {
                const nama = item.dataset.guruNama.toLowerCase();
                const show = nama.includes(search);
                item.style.display = show ? '' : 'none';
                if (show) visible++;
            });

            dropdown.classList.toggle('hidden', visible === 0 && !search);
        }

        function selectGuru(id, nama) {
            document.getElementById('guruTugasIdInput').value = id;
            document.getElementById('guruSearchInput').value = nama;
            document.getElementById('guruDropdown').classList.add('hidden');
            document.getElementById('guruClearBtn').classList.remove('hidden');
        }

        function clearGuruSelection() {
            document.getElementById('guruTugasIdInput').value = '';
            document.getElementById('guruSearchInput').value = '';
            document.getElementById('guruClearBtn').classList.add('hidden');
        }

        // Close guru dropdown when clicking outside
        document.addEventListener('click', function(e) {
            const dropdown = document.getElementById('guruDropdown');
            const searchInput = document.getElementById('guruSearchInput');
            if (dropdown && !dropdown.contains(e.target) && e.target !== searchInput) {
                dropdown.classList.add('hidden');
            }
        });

        function setSiswaStatus(siswaId, status, btn) {
            siswaStatuses[siswaId] = status;
            const item = btn.closest('.siswa-item');

            // Update hidden input
            item.querySelector('.siswa-status-input').value = status;

            // Update button styles
            item.querySelectorAll('.siswa-status-btn').forEach(b => {
                b.className = 'siswa-status-btn';
                if (b.dataset.status === status) {
                    b.classList.add('active-' + status.toLowerCase());
                }
            });

            // Show/hide keterangan
            const ketField = item.querySelector('.siswa-ket-field');
            if (status === 'S' || status === 'I') {
                ketField.classList.remove('hidden', 'siswa-ket-s', 'siswa-ket-i');
                ketField.classList.add(status === 'S' ? 'siswa-ket-s' : 'siswa-ket-i');
                ketField.placeholder = status === 'S' ? 'Keterangan sakit...' : 'Keterangan izin...';
            } else {
                ketField.classList.add('hidden');
                ketField.value = '';
            }

            // Update nilai visibility for this siswa
            updateSiswaNilai(item, siswaId, status);

            // Update counters
            updateCounters();
        }

        function updateSiswaNilai(item, siswaId, status) {
            const nilaiField = item.querySelector('.siswa-nilai-field');
            const lockedField = item.querySelector('.siswa-nilai-locked-field');

            if (jenisKegiatan === 'ulangan') {
                if (status === 'H') {
                    nilaiField.classList.remove('hidden');
                    lockedField.classList.add('hidden');
                } else {
                    nilaiField.classList.add('hidden');
                    lockedField.classList.remove('hidden');
                }
            } else {
                nilaiField.classList.add('hidden');
                lockedField.classList.add('hidden');
            }
        }

        function updateNilaiVisibility() {
            document.querySelectorAll('.siswa-item').forEach(item => {
                const id = item.dataset.siswaId;
                updateSiswaNilai(item, id, siswaStatuses[id]);
            });
        }

        function updateCounters() {
            let h = 0, s = 0, i = 0, a = 0;
            for (const id in siswaStatuses) {
                switch (siswaStatuses[id]) {
                    case 'H': h++; break;
                    case 'S': s++; break;
                    case 'I': i++; break;
                    case 'A': a++; break;
                }
            }
            document.getElementById('countHadir').textContent = h;
            document.getElementById('countSakit').textContent = s;
            document.getElementById('countIzin').textContent = i;
            document.getElementById('countAlpha').textContent = a;

            // Update siswa subtitle
            const parts = [];
            if (h > 0) parts.push(`<span style="color:#16a34a;">${h} hadir</span>`);
            if (s > 0) parts.push(`<span style="color:#3b82f6;">${s} sakit</span>`);
            if (i > 0) parts.push(`<span style="color:#eab308;">${i} izin</span>`);
            if (a > 0) parts.push(`<span style="color:#ef4444;">${a} alpha</span>`);
            document.getElementById('siswaSubtitle').innerHTML = parts.join(' • ');
        }

        function toggleSiswaList() {
            siswaExpanded = !siswaExpanded;
            const list = document.getElementById('siswaListContainer');
            const chevron = document.getElementById('siswaChevron');
            list.classList.toggle('collapsed', !siswaExpanded);
            chevron.classList.toggle('expanded', siswaExpanded);
        }

        // Form submission
        document.getElementById('absenForm').addEventListener('submit', function(e) {
            // Validate: ringkasan required when guru=H and jenis=mengajar
            if (guruStatus === 'H' && jenisKegiatan === 'mengajar') {
                const ringkasan = document.getElementById('ringkasanInput').value.trim();
                if (!ringkasan) {
                    e.preventDefault();
                    alert('Ringkasan Materi wajib diisi!');
                    return;
                }
            }
            // Validate: tugas siswa required when guru S/I
            if (guruStatus === 'S' || guruStatus === 'I') {
                const tugas = document.getElementById('tugasSiswaInput').value.trim();
                if (!tugas) {
                    e.preventDefault();
                    alert('Tugas untuk Siswa wajib diisi!');
                    return;
                }
            }

            const btn = document.getElementById('submitBtn');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';
        });
    </script>
    @else
    <script>
        const isCoordinatorForm = !!document.querySelector('[name="is_coordinator_form"]');

        if (isCoordinatorForm) {
            // ===== COORDINATOR FORM JS =====
            const photos = [];
            const MAX_PHOTOS = 4;

            function setCoordStatus(fieldId, status, btn) {
                document.getElementById(fieldId).value = status;

                // Update sibling buttons
                const parent = btn.closest('.status-btns');
                parent.querySelectorAll('.status-btn').forEach(b => {
                    b.className = 'status-btn';
                });
                btn.classList.add('active-' + status.toLowerCase());

                // Toggle keterangan field
                const ketId = fieldId.replace('_status', '_keterangan').replace('pendamping_status_', 'pendamping_keterangan_').replace('peserta_status_', 'peserta_keterangan_');
                const ketInput = document.getElementById(ketId);
                if (ketInput) {
                    if (status === 'S' || status === 'I') {
                        ketInput.classList.remove('hidden');
                    } else {
                        ketInput.classList.add('hidden');
                    }
                }
            }

            function setCoordSiswaStatus(siswaId, status, btn) {
                document.getElementById('siswa_status_' + siswaId).value = status;
                const parent = btn.closest('.siswa-status-btns');
                parent.querySelectorAll('.siswa-status-btn').forEach(b => b.className = 'siswa-status-btn');
                btn.classList.add('active-' + status.toLowerCase());
            }

            let coordSiswaExpanded = false;
            function toggleCoordSiswa() {
                coordSiswaExpanded = !coordSiswaExpanded;
                const list = document.getElementById('coordSiswaList');
                const chevron = document.getElementById('coordSiswaChevron');
                if (list) list.classList.toggle('collapsed', !coordSiswaExpanded);
                if (chevron) chevron.classList.toggle('expanded', coordSiswaExpanded);
            }

            function capturePhoto() {
                if (photos.length >= MAX_PHOTOS) { alert('Maksimal ' + MAX_PHOTOS + ' foto'); return; }
                document.getElementById('cameraInput').click();
            }

            function selectPhoto() {
                if (photos.length >= MAX_PHOTOS) { alert('Maksimal ' + MAX_PHOTOS + ' foto'); return; }
                document.getElementById('photoFileInput').click();
            }

            function handlePhotoSelect(event) {
                const file = event.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = function(e) {
                    photos.push(e.target.result);
                    renderPhotoPreview();
                };
                reader.readAsDataURL(file);
                event.target.value = '';
            }

            function removePhoto(idx) {
                photos.splice(idx, 1);
                renderPhotoPreview();
            }

            function renderPhotoPreview() {
                const container = document.getElementById('photoPreviewContainer');
                container.innerHTML = photos.map((src, i) =>
                    `<div style="position: relative; width: 70px; height: 70px;">
                        <img src="${src}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px; border: 2px solid #e5e7eb;">
                        <button type="button" onclick="removePhoto(${i})" style="position: absolute; top: -6px; right: -6px; background: #ef4444; color: white; border: none; border-radius: 50%; width: 20px; height: 20px; font-size: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center;">×</button>
                    </div>`
                ).join('');
            }

            // Submit coordinator form via fetch (JSON)
            document.getElementById('absenForm').addEventListener('submit', function(e) {
                e.preventDefault();

                if (photos.length < 2) {
                    alert('Minimal 2 foto harus diupload!');
                    return;
                }

                // Check notulensi for sekretaris
                const notulensiInput = document.getElementById('notulensiInput');
                if (notulensiInput && !notulensiInput.value.trim()) {
                    alert('Notulensi wajib diisi!');
                    return;
                }

                const btn = document.getElementById('submitBtn');
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengirim...';

                const form = this;
                const formData = new FormData(form);
                const payload = { is_coordinator_form: '1' };

                // Extract hidden token
                payload._token = formData.get('_token');

                // Detect form type
                const isKegiatan = !!document.getElementById('pj_status');
                const isRapat = !!document.getElementById('pimpinan_status');

                if (isKegiatan) {
                    // PJ Kegiatan form
                    payload.pj_status = formData.get('pj_status');
                    payload.pj_keterangan = formData.get('pj_keterangan') || null;
                    payload.berita_acara = formData.get('berita_acara') || null;
                    payload.foto_kegiatan = photos;

                    // Collect pendamping array
                    payload.absensi_pendamping = [];
                    document.querySelectorAll('[name^="pendamping_status_"]').forEach(input => {
                        const guruId = input.dataset.guruId;
                        if (guruId) {
                            payload.absensi_pendamping.push({
                                guru_id: parseInt(guruId),
                                status: input.value,
                                keterangan: null
                            });
                        }
                    });

                    // Collect siswa array
                    payload.absensi_siswa = [];
                    document.querySelectorAll('[name^="siswa_status_"]').forEach(input => {
                        const siswaId = input.dataset.siswaId;
                        if (siswaId) {
                            payload.absensi_siswa.push({
                                siswa_id: parseInt(siswaId),
                                status: input.value,
                                keterangan: null
                            });
                        }
                    });
                } else if (isRapat) {
                    // Sekretaris Rapat form
                    payload.pimpinan_status = formData.get('pimpinan_status');
                    payload.pimpinan_keterangan = formData.get('pimpinan_keterangan') || null;
                    payload.sekretaris_status = formData.get('sekretaris_status');
                    payload.sekretaris_keterangan = formData.get('sekretaris_keterangan') || null;
                    payload.notulensi = formData.get('notulensi') || '';
                    payload.foto_rapat = photos;

                    // Collect peserta array
                    payload.absensi_peserta = [];
                    document.querySelectorAll('[name^="peserta_status_"]').forEach(input => {
                        const guruId = input.dataset.guruId;
                        if (guruId) {
                            payload.absensi_peserta.push({
                                guru_id: parseInt(guruId),
                                status: input.value,
                                keterangan: null
                            });
                        }
                    });
                }

                fetch(form.action, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': payload._token,
                        'Accept': 'text/html'
                    },
                    body: JSON.stringify(payload)
                })
                .then(resp => resp.text())
                .then(html => {
                    document.open();
                    document.write(html);
                    document.close();
                })
                .catch(err => {
                    alert('Terjadi kesalahan: ' + err.message);
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-save"></i> Simpan Absensi';
                });
            });

        } else {
            // ===== SIMPLE SELF-ATTENDANCE JS =====
            let rkStatus = '{{ $existingStatus["status"] ?? "H" }}';

            window.setRKStatus = function(status) {
                rkStatus = status;
                document.getElementById('rkStatusInput').value = status;

                document.querySelectorAll('[data-rk-status]').forEach(btn => {
                    btn.className = 'status-btn';
                    if (btn.dataset.rkStatus === status) {
                        btn.classList.add('active-' + status.toLowerCase());
                    }
                });

                const ketInput = document.getElementById('rkKeteranganInput');
                if (status === 'S' || status === 'I') {
                    ketInput.classList.remove('hidden');
                    ketInput.placeholder = status === 'S' ? 'Keterangan sakit...' : 'Keterangan izin...';
                    ketInput.style.borderColor = status === 'S' ? '#bfdbfe' : '#fde68a';
                    ketInput.style.background = status === 'S' ? '#eff6ff' : '#fefce8';
                } else {
                    ketInput.classList.add('hidden');
                }

                const notice = document.getElementById('rkNotice');
                const icon = document.getElementById('rkNoticeIcon');
                const text = document.getElementById('rkNoticeText');
                notice.className = 'notice notice-' + status.toLowerCase();
                const data = {
                    H: { icon: 'fa-check-circle', text: 'Dengan menyimpan, Anda tercatat <strong>HADIR</strong>' },
                    S: { icon: 'fa-clinic-medical', text: 'Anda tercatat <strong>SAKIT</strong>' },
                    I: { icon: 'fa-info-circle', text: 'Anda tercatat <strong>IZIN</strong>' },
                    A: { icon: 'fa-exclamation-circle', text: 'Anda tercatat <strong>ALPHA</strong>' },
                };
                icon.className = 'fas ' + data[status].icon;
                text.innerHTML = data[status].text;
            };

            document.getElementById('absenForm').addEventListener('submit', function() {
                const btn = document.getElementById('submitBtn');
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';
            });
        }
    </script>
    @endif
</body>

</html>