import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { API_BASE } from '../../config/api';
import { hasAdminAccess } from '../../config/roleConfig';
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
            const activeRole = localStorage.getItem('active_role') || 'guru';
            if (hasAdminAccess(activeRole)) {
                navigate('/dashboard', { replace: true });
            } else {
                navigate('/guru', { replace: true });
            }
        } else {
            setError(result.message);
        }

        setLoading(false);
    };

    return (
        <>
            <style>{cssStyles}</style>
            <div className="login-container">
                {/* Desktop Left Panel - Branding */}
                <div className="login-left">
                    <img src={logoImage} alt="Logo MA ALHIKAM" className="login-left-logo" />
                    <h1>MA ALHIKAM</h1>
                    <p>Sistem Informasi Manajemen</p>
                </div>

                {/* Mobile Header */}
                <div className="mobile-header">
                    <div className="mobile-header-content">
                        <img src={logoImage} alt="Logo MA ALHIKAM" />
                        <h1>MA ALHIKAM</h1>
                        <p>Sistem Informasi Manajemen</p>
                    </div>
                </div>

                {/* Right Panel - Form */}
                <div className="login-right">
                    <div className="login-form">
                        <h2>Masuk ke Akun</h2>
                        <p>Silakan login untuk melanjutkan</p>

                        {/* Error Alert */}
                        {error && (
                            <div className="alert alert-danger">
                                <i className="fas fa-exclamation-circle"></i>
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            {/* Username */}
                            <div className="form-group">
                                <label htmlFor="username">Username</label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.85rem', pointerEvents: 'none', zIndex: 1 }}><i className="fas fa-user"></i></span>
                                    <input
                                        type="text"
                                        id="username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="Masukkan username"
                                        required
                                        autoComplete="username"
                                        style={{ paddingLeft: '40px' }}
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div className="form-group">
                                <label htmlFor="password">Password</label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.85rem', pointerEvents: 'none', zIndex: 1 }}><i className="fas fa-lock"></i></span>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        id="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Masukkan password"
                                        required
                                        autoComplete="current-password"
                                        style={{ paddingLeft: '40px', paddingRight: '48px' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '5px', fontSize: '1rem' }}
                                    >
                                        <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                    </button>
                                </div>
                            </div>

                            {/* Tahun Ajaran */}
                            <div className="form-group">
                                <label htmlFor="tahun-ajaran">Tahun Ajaran</label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.85rem', pointerEvents: 'none', zIndex: 1 }}><i className="fas fa-calendar-alt"></i></span>
                                    {loadingTahun ? (
                                        <div className="select-loading" style={{ paddingLeft: '40px' }}>
                                            <i className="fas fa-spinner fa-spin"></i> Memuat...
                                        </div>
                                    ) : (
                                        <select
                                            id="tahun-ajaran"
                                            value={tahunAjaranId}
                                            onChange={(e) => setTahunAjaranId(e.target.value)}
                                            required
                                            style={{ paddingLeft: '40px' }}
                                        >
                                            <option value="">-- Pilih Tahun Ajaran --</option>
                                            {tahunAjaranList.map(t => (
                                                <option key={t.id} value={t.id}>
                                                    {t.nama} {t.is_active ? '(Aktif)' : ''}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                    <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.7rem', pointerEvents: 'none' }}><i className="fas fa-chevron-down"></i></span>
                                </div>
                            </div>

                            {/* Remember Me */}
                            <div className="form-group">
                                <div className="remember-me" onClick={() => setRemember(!remember)}>
                                    <span className={`checkmark ${remember ? 'checked' : ''}`}>
                                        <i className="fas fa-check"></i>
                                    </span>
                                    <span className="label-text">Ingat saya (30 hari)</span>
                                </div>
                            </div>

                            {/* Submit */}
                            <button type="submit" className="btn-login" disabled={loading}>
                                {loading ? (
                                    <><i className="fas fa-spinner fa-spin"></i> Memproses...</>
                                ) : (
                                    <><i className="fas fa-sign-in-alt"></i> Masuk</>
                                )}
                            </button>
                        </form>

                        {/* Quick Login (Dev Only) */}
                        {(process.env.NODE_ENV === 'development' || true) && (
                            <div className="quick-login">
                                <div className="quick-login-header">
                                    <i className="fas fa-flask"></i>
                                    <span>Quick Login (Testing)</span>
                                </div>
                                <div className="quick-login-grid">
                                    <button type="button" className="ql-btn ql-red" onClick={() => { setUsername('admin'); setPassword('password'); }}>
                                        <i className="fas fa-crown"></i> Super Admin
                                    </button>
                                    <button type="button" className="ql-btn ql-red-light" onClick={() => { setUsername('ariefarfan'); setPassword('password'); }}>
                                        <i className="fas fa-crown"></i> SA (Arief)
                                    </button>
                                    <button type="button" className="ql-btn ql-purple ql-span-2" onClick={() => { setUsername('akromadabi'); setPassword('password'); }}>
                                        <i className="fas fa-user-tie"></i> Kepala Madrasah (Akrom)
                                    </button>
                                    <button type="button" className="ql-btn ql-blue" onClick={() => { setUsername('dewi'); setPassword('password'); }}>
                                        <i className="fas fa-book"></i> Waka Kurikulum
                                    </button>
                                    <button type="button" className="ql-btn ql-indigo" onClick={() => { setUsername('rinomukti'); setPassword('password'); }}>
                                        <i className="fas fa-users"></i> Waka Kesiswaan
                                    </button>
                                    <button type="button" className="ql-btn ql-green" onClick={() => { setUsername('adibkaromi'); setPassword('password'); }}>
                                        <i className="fas fa-chalkboard-teacher"></i> Guru (Adib)
                                    </button>
                                    <button type="button" className="ql-btn ql-green-light" onClick={() => { setUsername('zaenalabidin'); setPassword('password'); }}>
                                        <i className="fas fa-chalkboard-teacher"></i> Guru (Zaenal)
                                    </button>
                                </div>
                                <p className="quick-login-hint">Klik tombol lalu klik "Masuk"</p>
                            </div>
                        )}

                        {/* Footer */}
                        <p className="login-footer">© 2026 MA ALHIKAM. All rights reserved.</p>
                    </div>
                </div>
            </div>
        </>
    );
}

export default Login;

const cssStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap');

    :root {
        --login-primary: #16a34a;
        --login-primary-hover: #15803d;
        --login-primary-light: rgba(22, 163, 74, 0.1);
        --login-gradient-start: #16a34a;
        --login-gradient-end: #059669;
    }

    /* ── Container ─────────────────────────────────────────────── */
    .login-container {
        display: flex;
        width: 100%;
        min-height: 100vh;
        font-family: 'Montserrat', sans-serif;
    }

    /* ── Left Panel (Desktop Branding) ─────────────────────────── */
    .login-left {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        color: white;
        padding: 40px;
        position: relative;
        overflow: hidden;
        background: linear-gradient(135deg, var(--login-gradient-start) 0%, var(--login-gradient-end) 100%);
    }

    .login-left::before {
        content: '';
        position: absolute;
        width: 350px;
        height: 350px;
        background: rgba(255, 255, 255, 0.08);
        border-radius: 50%;
        top: -120px;
        left: -120px;
        animation: float 8s ease-in-out infinite;
    }

    .login-left::after {
        content: '';
        position: absolute;
        width: 250px;
        height: 250px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 50%;
        bottom: -80px;
        right: -80px;
        animation: float 10s ease-in-out infinite reverse;
    }

    .login-left-logo {
        width: 100px;
        height: 100px;
        object-fit: contain;
        margin-bottom: 1.5rem;
        z-index: 1;
        filter: drop-shadow(0 4px 12px rgba(0,0,0,0.2));
        animation: pulse 3s ease-in-out infinite;
    }

    .login-left h1 {
        font-size: 2.5rem;
        font-weight: 700;
        margin: 0 0 0.75rem;
        text-align: center;
        z-index: 1;
        letter-spacing: -0.02em;
    }

    .login-left p {
        font-size: 1.1rem;
        opacity: 0.85;
        text-align: center;
        z-index: 1;
        margin: 0;
        font-weight: 400;
    }

    /* ── Right Panel (Form) ────────────────────────────────────── */
    .login-right {
        flex: 1;
        display: flex;
        justify-content: center;
        align-items: center;
        background: #f8fafc;
        padding: 40px;
        overflow-y: auto;
    }

    .login-form {
        width: 100%;
        max-width: 420px;
    }

    .login-form h2 {
        color: #1e293b;
        font-size: 1.75rem;
        font-weight: 700;
        margin: 0 0 0.5rem;
        letter-spacing: -0.02em;
    }

    .login-form > p {
        color: #94a3b8;
        margin: 0 0 2rem;
        font-size: 0.95rem;
    }

    /* ── Form Fields ───────────────────────────────────────────── */
    .form-group {
        margin-bottom: 1.25rem;
    }

    .form-group label {
        display: block;
        font-size: 0.8rem;
        font-weight: 600;
        color: #475569;
        margin-bottom: 0.5rem;
    }

    .form-group label i {
        font-size: 0.75rem;
    }

    .form-group input,
    .form-group select {
        width: 100%;
        height: 48px;
        padding: 0 16px;
        border: 1.5px solid #e2e8f0;
        border-radius: 10px;
        font-size: 0.95rem;
        font-family: 'Montserrat', sans-serif;
        transition: all 0.2s ease;
        background: white;
        color: #1e293b;
        box-sizing: border-box;
    }

    .form-group input:focus,
    .form-group select:focus {
        outline: none;
        border-color: var(--login-primary);
        box-shadow: 0 0 0 3px var(--login-primary-light);
    }

    .form-group input::placeholder {
        color: #cbd5e1;
    }

    .form-group select {
        appearance: none;
        cursor: pointer;
        padding-right: 40px;
    }

    .select-loading {
        width: 100%;
        height: 48px;
        padding: 0 16px;
        border: 1.5px solid #e2e8f0;
        border-radius: 10px;
        font-size: 0.9rem;
        color: #94a3b8;
        background: #f8fafc;
        display: flex;
        align-items: center;
        box-sizing: border-box;
    }

    /* ── Remember Me ───────────────────────────────────────────── */
    .remember-me {
        display: flex;
        align-items: center;
        cursor: pointer;
        font-size: 0.9rem;
        color: #64748b;
        gap: 10px;
        user-select: none;
        margin-top: -0.25rem;
    }

    .remember-me .checkmark {
        width: 20px;
        height: 20px;
        border: 2px solid #cbd5e1;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        background: white;
        flex-shrink: 0;
    }

    .remember-me .checkmark i {
        font-size: 11px;
        color: white;
        opacity: 0;
        transform: scale(0);
        transition: all 0.2s ease;
    }

    .remember-me .checkmark.checked {
        background: var(--login-primary);
        border-color: var(--login-primary);
    }

    .remember-me .checkmark.checked i {
        opacity: 1;
        transform: scale(1);
    }

    .remember-me:hover .checkmark {
        border-color: var(--login-primary);
    }

    .remember-me .label-text {
        font-weight: 500;
        transition: color 0.2s;
    }

    .remember-me:hover .label-text {
        color: var(--login-primary);
    }

    /* ── Login Button ──────────────────────────────────────────── */
    .btn-login {
        width: 100%;
        padding: 14px;
        background: var(--login-primary);
        color: white;
        border: none;
        border-radius: 10px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        font-family: 'Inter', sans-serif;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        margin-top: 0.25rem;
    }

    .btn-login:hover {
        background: var(--login-primary-hover);
        transform: translateY(-1px);
        box-shadow: 0 4px 14px rgba(22, 163, 74, 0.4);
    }

    .btn-login:active {
        transform: translateY(0);
    }

    .btn-login:disabled {
        opacity: 0.7;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
    }

    /* ── Alert ──────────────────────────────────────────────────── */
    .alert {
        padding: 12px 16px;
        border-radius: 10px;
        margin-bottom: 1.5rem;
        font-size: 0.9rem;
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .alert-danger {
        background: #fef2f2;
        color: #dc2626;
        border: 1px solid #fecaca;
    }

    /* ── Quick Login ────────────────────────────────────────────── */
    .quick-login {
        margin-top: 1.5rem;
        padding: 16px;
        background: #fffbeb;
        border: 1px solid #fde68a;
        border-radius: 12px;
    }

    .quick-login-header {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #a16207;
        margin-bottom: 12px;
        font-size: 0.8rem;
        font-weight: 600;
    }

    .quick-login-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px;
    }

    .ql-btn {
        padding: 8px 10px;
        color: white;
        font-size: 0.7rem;
        font-weight: 600;
        font-family: 'Inter', sans-serif;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.15s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
    }

    .ql-btn:hover { opacity: 0.9; transform: translateY(-1px); }
    .ql-span-2 { grid-column: span 2; }
    .ql-red { background: #dc2626; }
    .ql-red-light { background: #ef4444; }
    .ql-purple { background: #7c3aed; }
    .ql-blue { background: #2563eb; }
    .ql-indigo { background: #4f46e5; }
    .ql-green { background: #16a34a; }
    .ql-green-light { background: #22c55e; }

    .quick-login-hint {
        margin-top: 8px;
        font-size: 0.7rem;
        color: #a16207;
        text-align: center;
    }

    /* ── Footer ─────────────────────────────────────────────────── */
    .login-footer {
        text-align: center;
        color: #94a3b8;
        font-size: 0.75rem;
        margin-top: 1.5rem;
    }

    /* ── Mobile Header ─────────────────────────────────────────── */
    .mobile-header {
        display: none;
        background: linear-gradient(135deg, var(--login-gradient-start) 0%, var(--login-gradient-end) 100%);
        padding: 48px 20px 40px;
        text-align: center;
        color: white;
        position: relative;
        overflow: hidden;
    }

    .mobile-header-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        position: relative;
        z-index: 1;
    }

    .mobile-header::before {
        content: '';
        position: absolute;
        width: 200px;
        height: 200px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 50%;
        top: -80px;
        right: -80px;
        animation: float 6s ease-in-out infinite;
    }

    .mobile-header::after {
        content: '';
        position: absolute;
        width: 150px;
        height: 150px;
        background: rgba(255, 255, 255, 0.06);
        border-radius: 50%;
        bottom: -60px;
        left: -60px;
        animation: float 8s ease-in-out infinite reverse;
    }

    .mobile-header img {
        width: 72px;
        height: 72px;
        object-fit: contain;
        margin-bottom: 1rem;
        filter: drop-shadow(0 4px 12px rgba(0,0,0,0.2));
        animation: pulse 3s ease-in-out infinite;
    }

    .mobile-header h1 {
        font-size: 1.5rem;
        font-weight: 700;
        margin: 0 0 0.4rem;
    }

    .mobile-header p {
        font-size: 0.9rem;
        opacity: 0.85;
        margin: 0;
    }

    /* ── Animations ─────────────────────────────────────────────── */
    @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-20px); }
    }

    @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
    }

    /* ── Responsive: Mobile ─────────────────────────────────────── */
    @media (max-width: 768px) {
        .login-container {
            flex-direction: column;
            min-height: 100vh;
            background: linear-gradient(135deg, var(--login-gradient-start) 0%, var(--login-gradient-end) 100%);
        }

        .login-left {
            display: none;
        }

        .mobile-header {
            display: block;
        }

        .login-right {
            flex: 1;
            padding: 0;
            background: transparent;
            align-items: flex-start;
        }

        .login-form {
            background: rgba(255, 255, 255, 0.97);
            backdrop-filter: blur(10px);
            border-radius: 24px 24px 0 0;
            padding: 28px 24px 36px;
            margin-top: -20px;
            box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.1);
            max-width: 100%;
            width: 100%;
            min-height: calc(100vh - 200px);
        }

        .login-form h2 {
            font-size: 1.4rem;
            text-align: center;
        }

        .login-form > p {
            text-align: center;
            margin-bottom: 1.5rem;
            font-size: 0.9rem;
        }

        .input-wrapper input,
        .input-wrapper select {
            padding: 14px 16px 14px 42px;
            border-radius: 12px;
        }

        .btn-login {
            padding: 15px;
            border-radius: 12px;
        }

        .alert {
            border-radius: 12px;
        }
    }

    /* ── Responsive: Small phones ────────────────────────────────── */
    @media (max-width: 380px) {
        .mobile-header {
            padding: 36px 15px 32px;
        }

        .mobile-header img {
            width: 56px;
            height: 56px;
        }

        .mobile-header h1 {
            font-size: 1.25rem;
        }

        .login-form {
            padding: 24px 18px 32px;
        }

        .ql-btn {
            font-size: 0.65rem;
            padding: 6px 8px;
        }
    }
`;
