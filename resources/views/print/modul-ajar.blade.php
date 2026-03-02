@extends('print.layout')

@section('title', 'Modul Ajar - {{ $modul->mapel }}')

@section('content')
    {{-- Header Banner --}}
    <div class="modul-header">
        <div class="modul-header-icon">📘</div>
        <div class="modul-header-text">
            <h1>MODUL AJAR</h1>
            <p>Kurikulum Merdeka</p>
        </div>
    </div>

    {{-- Informasi Umum --}}
    <div class="info-card">
        <div class="info-card-title">📋 Informasi Umum</div>
        <table class="info-table">
            <tr>
                <td class="info-td-label">Mata Pelajaran</td>
                <td class="info-td-sep">:</td>
                <td class="info-td-value"><strong>{{ $modul->mapel }}</strong></td>
                <td class="info-td-label">Kelas / Fase</td>
                <td class="info-td-sep">:</td>
                <td class="info-td-value">
                    <strong>{{ $modul->kelas }}{{ $modul->fase ? ' / Fase ' . $modul->fase : '' }}</strong>
                </td>
            </tr>
            <tr>
                <td class="info-td-label">Semester</td>
                <td class="info-td-sep">:</td>
                <td class="info-td-value">{{ $modul->semester }}</td>
                <td class="info-td-label">Alokasi Waktu</td>
                <td class="info-td-sep">:</td>
                <td class="info-td-value">{{ $modul->alokasi_waktu ?? '-' }}</td>
            </tr>
            <tr>
                <td class="info-td-label">Bab / Materi</td>
                <td class="info-td-sep">:</td>
                <td class="info-td-value"><strong>{{ $modul->bab_materi }}</strong></td>
                <td class="info-td-label">Guru Pengampu</td>
                <td class="info-td-sep">:</td>
                <td class="info-td-value">{{ $guru->nama ?? '-' }}</td>
            </tr>
        </table>
    </div>

    {{-- A. Tujuan Pembelajaran --}}
    <div class="section-card">
        <div class="section-card-header section-green">
            <span class="section-letter">A</span>
            <span>Tujuan Pembelajaran</span>
        </div>
        <div class="section-card-body">
            {!! nl2br(e($modul->tujuan_pembelajaran)) !!}
        </div>
    </div>

    {{-- B. Profil Pelajar / Pilar Cinta --}}
    @php
        $selectedProfil = $modul->profil_pelajar ?? [];
        $kbcKeys = ['cinta_allah', 'cinta_ilmu', 'cinta_sesama', 'cinta_alam', 'cinta_tanah_air'];
        $kumerKeys = ['beriman', 'berkebinekaan', 'bernalar', 'mandiri', 'gotong_royong', 'kreatif'];
        $hasKbc = count(array_intersect($selectedProfil, $kbcKeys)) > 0;
        $hasKumer = count(array_intersect($selectedProfil, $kumerKeys)) > 0;
    @endphp

    @if($hasKumer)
        <div class="section-card">
            <div class="section-card-header section-blue">
                <span class="section-letter">B</span>
                <span>Profil Pelajar Pancasila</span>
            </div>
            <div class="section-card-body">
                <div class="profil-grid">
                    @foreach($kumerKeys as $key)
                        @if(isset($profilLabels[$key]))
                            <div class="profil-chip {{ in_array($key, $selectedProfil) ? 'profil-active' : 'profil-inactive' }}">
                                <span class="profil-icon">{{ in_array($key, $selectedProfil) ? '✅' : '⬜' }}</span>
                                <span>{{ $profilLabels[$key] }}</span>
                            </div>
                        @endif
                    @endforeach
                </div>
            </div>
        </div>
    @endif

    @if($hasKbc)
        <div class="section-card">
            <div class="section-card-header section-pink">
                <span class="section-letter">{{ $hasKumer ? 'C' : 'B' }}</span>
                <span>5 Pilar Cinta (KBC)</span>
            </div>
            <div class="section-card-body">
                <div class="profil-grid">
                    @foreach($kbcKeys as $key)
                        @if(isset($profilLabels[$key]))
                            <div class="profil-chip {{ in_array($key, $selectedProfil) ? 'profil-active-pink' : 'profil-inactive' }}">
                                <span class="profil-icon">{{ in_array($key, $selectedProfil) ? '✅' : '⬜' }}</span>
                                <span>{{ $profilLabels[$key] }}</span>
                            </div>
                        @endif
                    @endforeach
                </div>
            </div>
        </div>
    @endif

    @if(!$hasKumer && !$hasKbc)
        <div class="section-card">
            <div class="section-card-header section-blue">
                <span class="section-letter">B</span>
                <span>Profil Pelajar Pancasila</span>
            </div>
            <div class="section-card-body">
                <div class="profil-grid">
                    @foreach($kumerKeys as $key)
                        <div class="profil-chip profil-inactive">
                            <span class="profil-icon">⬜</span>
                            <span>{{ $profilLabels[$key] }}</span>
                        </div>
                    @endforeach
                </div>
            </div>
        </div>
    @endif

    {{-- C. Kegiatan Pembelajaran --}}
    <div class="section-card">
        <div class="section-card-header section-purple">
            <span class="section-letter">C</span>
            <span>Kegiatan Pembelajaran</span>
        </div>
        <div class="section-card-body no-padding">
            <table class="activity-table">
                <tr class="activity-row">
                    <td class="activity-label activity-label-pendahuluan">
                        <div class="activity-badge">🟢</div>
                        <strong>Pendahuluan</strong>
                    </td>
                    <td class="activity-content">{!! nl2br(e($modul->kegiatan_pendahuluan)) !!}</td>
                </tr>
                <tr class="activity-row">
                    <td class="activity-label activity-label-inti">
                        <div class="activity-badge">🔵</div>
                        <strong>Inti</strong>
                    </td>
                    <td class="activity-content">{!! nl2br(e($modul->kegiatan_inti)) !!}</td>
                </tr>
                <tr class="activity-row">
                    <td class="activity-label activity-label-penutup">
                        <div class="activity-badge">🟡</div>
                        <strong>Penutup</strong>
                    </td>
                    <td class="activity-content">{!! nl2br(e($modul->kegiatan_penutup)) !!}</td>
                </tr>
            </table>
        </div>
    </div>

    {{-- D. Asesmen --}}
    <div class="section-card">
        <div class="section-card-header section-orange">
            <span class="section-letter">D</span>
            <span>Asesmen</span>
        </div>
        <div class="section-card-body no-padding">
            <table class="activity-table">
                <tr class="activity-row">
                    <td class="activity-label activity-label-formatif">
                        <div class="activity-badge">📝</div>
                        <strong>Formatif</strong>
                    </td>
                    <td class="activity-content">{!! nl2br(e($modul->asesmen_formatif ?? '-')) !!}</td>
                </tr>
                <tr class="activity-row">
                    <td class="activity-label activity-label-sumatif">
                        <div class="activity-badge">📊</div>
                        <strong>Sumatif</strong>
                    </td>
                    <td class="activity-content">{!! nl2br(e($modul->asesmen_sumatif ?? '-')) !!}</td>
                </tr>
            </table>
        </div>
    </div>

    {{-- E. Media & Sumber Belajar --}}
    @if($modul->media_sumber)
        <div class="section-card">
            <div class="section-card-header section-teal">
                <span class="section-letter">E</span>
                <span>Media & Sumber Belajar</span>
            </div>
            <div class="section-card-body">
                {!! nl2br(e($modul->media_sumber)) !!}
            </div>
        </div>
    @endif

    {{-- Signature Section --}}
    <div class="signature-section">
        <div style="text-align: center; margin-bottom: 20px;">
            <p>{{ $alamat }}, {{ $tanggalCetak }}</p>
        </div>
        <div class="signature-row">
            <div class="signature-box">
                <p>Guru Pengampu,</p>
                <div class="signature-space"></div>
                <p class="signature-name">{{ $guru->nama ?? '........................' }}</p>
                @if($guru->nip ?? null)
                    <p>NIP. {{ $guru->nip }}</p>
                @endif
            </div>
            <div class="signature-box">
                <p>Kepala Madrasah,</p>
                <div class="signature-space">
                    @if(isset($qrCode))
                        <img src="{{ $qrCode }}" alt="QR Verifikasi" class="qr-code-img">
                    @endif
                </div>
                <p class="signature-name">{{ $kepala['nama'] ?? '........................' }}</p>
                @if($kepala['nip'] ?? null)
                    <p>NIP. {{ $kepala['nip'] }}</p>
                @endif
            </div>
        </div>
    </div>
@endsection

@section('styles')
    <style>
        /* ── Header Banner ── */
        .modul-header {
            display: flex;
            align-items: center;
            gap: 15px;
            background: linear-gradient(135deg, #166534, #15803d);
            color: #fff;
            padding: 16px 24px;
            border-radius: 10px;
            margin-bottom: 20px;
        }

        .modul-header-icon {
            font-size: 32pt;
            line-height: 1;
        }

        .modul-header-text h1 {
            font-size: 18pt;
            font-weight: bold;
            letter-spacing: 2px;
            margin: 0;
            text-decoration: none;
            text-transform: uppercase;
        }

        .modul-header-text p {
            font-size: 10pt;
            opacity: 0.85;
            margin: 2px 0 0 0;
        }

        /* ── Info Card ── */
        .info-card {
            border: 1.5px solid #d1d5db;
            border-radius: 10px;
            margin-bottom: 18px;
            overflow: hidden;
        }

        .info-card-title {
            background: #f9fafb;
            padding: 8px 16px;
            font-weight: bold;
            font-size: 10pt;
            color: #374151;
            border-bottom: 1.5px solid #d1d5db;
        }

        .info-table {
            width: 100%;
            border-collapse: collapse;
            margin: 0;
        }

        .info-table tr {
            border: none;
        }

        .info-table td {
            border: none;
            padding: 6px 12px;
            font-size: 11pt;
            vertical-align: top;
        }

        .info-td-label {
            width: 120px;
            color: #6b7280;
            white-space: nowrap;
        }

        .info-td-sep {
            width: 14px;
            color: #6b7280;
        }

        .info-td-value {
            color: #111827;
        }

        /* ── Section Cards ── */
        .section-card {
            border: 1.5px solid #d1d5db;
            border-radius: 10px;
            margin-bottom: 16px;
            overflow: hidden;
            page-break-inside: avoid;
        }

        .section-card-header {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 16px;
            font-weight: bold;
            font-size: 11pt;
            color: #fff;
        }

        .section-letter {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 26px;
            height: 26px;
            background: rgba(255, 255, 255, 0.25);
            border-radius: 6px;
            font-size: 12pt;
            font-weight: bold;
        }

        .section-card-body {
            padding: 14px 16px;
            font-size: 11pt;
            line-height: 1.7;
            color: #1f2937;
            text-align: justify;
        }

        .section-card-body.no-padding {
            padding: 0;
        }

        /* Section color variants */
        .section-green {
            background: linear-gradient(135deg, #166534, #16a34a);
        }

        .section-blue {
            background: linear-gradient(135deg, #1e40af, #3b82f6);
        }

        .section-purple {
            background: linear-gradient(135deg, #6b21a8, #9333ea);
        }

        .section-orange {
            background: linear-gradient(135deg, #c2410c, #ea580c);
        }

        .section-teal {
            background: linear-gradient(135deg, #0f766e, #14b8a6);
        }

        .section-pink {
            background: linear-gradient(135deg, #be185d, #ec4899);
        }

        /* ── Profil Grid ── */
        .profil-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }

        .profil-chip {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            border-radius: 8px;
            font-size: 10pt;
            width: calc(50% - 4px);
        }

        .profil-active {
            background: #dcfce7;
            border: 1px solid #86efac;
            color: #166534;
            font-weight: bold;
        }

        .profil-active-pink {
            background: #fce7f3;
            border: 1px solid #f9a8d4;
            color: #9d174d;
            font-weight: bold;
        }

        .profil-inactive {
            background: #f3f4f6;
            border: 1px solid #e5e7eb;
            color: #9ca3af;
        }

        .profil-icon {
            font-size: 12pt;
        }

        /* ── Activity Table ── */
        .activity-table {
            width: 100%;
            border-collapse: collapse;
            margin: 0;
        }

        .activity-table tr {
            border: none;
        }

        .activity-table td {
            border: none;
            padding: 12px 16px;
            vertical-align: top;
            font-size: 11pt;
        }

        .activity-row {
            border-bottom: 1px solid #e5e7eb;
        }

        .activity-row:last-child {
            border-bottom: none;
        }

        .activity-label {
            width: 120px;
            text-align: center;
            vertical-align: middle;
        }

        .activity-badge {
            font-size: 14pt;
            margin-bottom: 2px;
        }

        .activity-content {
            line-height: 1.7;
            color: #374151;
            text-align: justify;
        }

        /* background tints for activity labels */
        .activity-label-pendahuluan {
            background: #f0fdf4;
        }

        .activity-label-inti {
            background: #eff6ff;
        }

        .activity-label-penutup {
            background: #fefce8;
        }

        .activity-label-formatif {
            background: #fff7ed;
        }

        .activity-label-sumatif {
            background: #fef2f2;
        }

        /* ── QR Code ── */
        .qr-code-img {
            width: 80px;
            height: 80px;
            object-fit: contain;
        }

        /* ── Print Adjustments ── */
        @media print {
            .modul-header {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }

            .section-card-header {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }

            .profil-active,
            .profil-inactive {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }

            .activity-label-pendahuluan,
            .activity-label-inti,
            .activity-label-penutup,
            .activity-label-formatif,
            .activity-label-sumatif {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
        }
    </style>
@endsection