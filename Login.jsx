import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function Login() {
    const { login, isAuthenticated, loading } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Redirect if already logged in
    if (isAuthenticated) {
        return <Navigate to="/beranda" replace />;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const result = await login(email, password);

        if (result.success) {
            navigate('/beranda');
        } else {
            setError(result.message);
        }

        setIsLoading(false);
    };

    if (loading) {
        return (
            <div style={styles.loadingContainer}>
                <i className="fas fa-spinner fa-spin" style={{ fontSize: '2.5rem', color: '#3b82f6' }}></i>
            </div>
        );
    }

    return (
        <>
            <style>{cssStyles}</style>
            <div className="login-container">
                {/* Desktop Left Panel */}
                <div className="login-left">
                    <img src="/logo-pondok.png" alt="Logo" style={{ width: '100px', height: 'auto', marginBottom: '1.5rem' }} />
                    <h1>Aktivitas Santri</h1>
                    <p>Sistem Monitoring Aktivitas Santri</p>
                </div>

                {/* Mobile Header */}
                <div className="mobile-header">
                    <div className="mobile-header-content">
                        <img src="/logo-pondok.png" alt="Logo" />
                        <h1>Aktivitas Santri</h1>
                        <p>Sistem Monitoring Aktivitas Santri</p>
                    </div>
                </div>

                {/* Right Panel - Form */}
                <div className="login-right">
                    <div className="login-form">
                        <h2>Selamat Datang!</h2>
                        <p>Silakan login untuk melanjutkan</p>

                        {error && (
                            <div className="alert alert-danger">
                                <i className="fas fa-exclamation-circle" style={{ marginRight: '8px' }}></i>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label htmlFor="email">Email</label>
                                <input
                                    type="email"
                                    id="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Masukkan email"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="password">Password</label>
                                <div className="password-wrapper">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        id="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Masukkan password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="toggle-password"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                    </button>
                                </div>
                            </div>

                            <div className="form-group">
                                <div className="remember-me" onClick={() => setRememberMe(!rememberMe)}>
                                    <span className={`checkmark ${rememberMe ? 'checked' : ''}`}>
                                        <i className="fas fa-check"></i>
                                    </span>
                                    <span className="label-text">Ingat Saya</span>
                                </div>
                            </div>

                            <button type="submit" className="btn-login" disabled={isLoading}>
                                {isLoading ? (
                                    <><i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>Loading...</>
                                ) : (
                                    <><i className="fas fa-sign-in-alt" style={{ marginRight: '8px' }}></i>Login</>
                                )}
                            </button>
                        </form>

                        {/* Kiosk Link - Desktop Only */}
                        <div className="kiosk-link">
                            <a href="/kios">
                                <i className="fas fa-id-card"></i> Buka Mode Kiosk RFID
                            </a>
                            <p>Untuk absensi dengan kartu RFID</p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

const styles = {
    loadingContainer: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
    },
};

const cssStyles = `
    :root {
        --primary-color: #3b82f6;
        --primary-hover: #2563eb;
    }

    .login-container {
        display: flex;
        width: 100%;
        min-height: 100vh;
    }

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
        background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
    }

    .login-left::before {
        content: '';
        position: absolute;
        width: 300px;
        height: 300px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 50%;
        top: -100px;
        left: -100px;
    }

    .login-left::after {
        content: '';
        position: absolute;
        width: 200px;
        height: 200px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 50%;
        bottom: -50px;
        right: -50px;
    }

    .login-left h1 {
        font-size: 2.5rem;
        font-weight: 700;
        margin-bottom: 1rem;
        text-align: center;
        z-index: 1;
    }

    .login-left p {
        font-size: 1.1rem;
        opacity: 0.9;
        text-align: center;
        z-index: 1;
    }

    .login-right {
        flex: 1;
        display: flex;
        justify-content: center;
        align-items: center;
        background: white;
        padding: 40px;
    }

    .login-form {
        width: 100%;
        max-width: 400px;
    }

    .login-form h2 {
        color: #334155;
        font-size: 1.75rem;
        font-weight: 700;
        margin-bottom: 0.5rem;
    }

    .login-form > p {
        color: #94a3b8;
        margin-bottom: 2rem;
    }

    .form-group {
        margin-bottom: 1.5rem;
    }

    .form-group label {
        display: block;
        font-size: 0.75rem;
        font-weight: 600;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 0.5rem;
    }

    .form-group input[type="email"],
    .form-group input[type="password"],
    .form-group input[type="text"] {
        width: 100%;
        padding: 14px 16px;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        font-size: 1rem;
        font-family: inherit;
        transition: all 0.2s;
        background: #f8fafc;
    }

    .form-group input:focus {
        outline: none;
        border-color: var(--primary-color);
        background: white;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .password-wrapper {
        position: relative;
    }

    .password-wrapper input {
        padding-right: 45px;
    }

    .toggle-password {
        position: absolute;
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        padding: 5px;
        font-size: 1rem;
        transition: color 0.2s;
    }

    .toggle-password:hover {
        color: var(--primary-color);
    }

    .remember-me {
        display: flex !important;
        flex-direction: row !important;
        align-items: center !important;
        cursor: pointer;
        font-size: 0.9rem;
        color: #64748b;
        gap: 10px;
        user-select: none;
        margin-top: -0.5rem;
        margin-bottom: 0;
        text-transform: none;
        letter-spacing: normal;
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
        background: #f8fafc;
        flex-shrink: 0;
    }

    .remember-me .checkmark i {
        font-size: 12px;
        color: white;
        opacity: 0;
        transform: scale(0);
        transition: all 0.2s ease;
    }

    .remember-me .checkmark.checked {
        background: var(--primary-color);
        border-color: var(--primary-color);
    }

    .remember-me .checkmark.checked i {
        opacity: 1;
        transform: scale(1);
    }

    .remember-me:hover .checkmark {
        border-color: var(--primary-color);
    }

    .remember-me .label-text {
        font-weight: 500;
        transition: color 0.2s;
    }

    .remember-me:hover .label-text {
        color: var(--primary-color);
    }

    .btn-login {
        width: 100%;
        padding: 14px;
        background: var(--primary-color);
        color: white;
        border: none;
        border-radius: 10px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        font-family: inherit;
    }

    .btn-login:hover {
        background: var(--primary-hover);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
    }

    .btn-login:disabled {
        opacity: 0.7;
        cursor: not-allowed;
        transform: none;
    }

    .alert {
        padding: 12px 16px;
        border-radius: 8px;
        margin-bottom: 1.5rem;
        font-size: 0.9rem;
    }

    .alert-danger {
        background: #fef2f2;
        color: #dc2626;
        border: 1px solid #fecaca;
    }

    .mobile-header {
        display: none;
        background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
        padding: 40px 20px;
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
        background: rgba(255, 255, 255, 0.08);
        border-radius: 50%;
        bottom: -60px;
        left: -60px;
        animation: float 8s ease-in-out infinite reverse;
    }

    @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-20px); }
    }

    .mobile-header img {
        width: 80px;
        height: auto;
        margin-bottom: 1rem;
        position: relative;
        z-index: 1;
        animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
    }

    .mobile-header h1 {
        font-size: 1.5rem;
        font-weight: 700;
        margin-bottom: 0.5rem;
        position: relative;
        z-index: 1;
    }

    .mobile-header p {
        font-size: 0.9rem;
        opacity: 0.9;
        position: relative;
        z-index: 1;
    }

    .kiosk-link {
        text-align: center;
        margin-top: 2rem;
        padding-top: 1.5rem;
        border-top: 1px solid #e2e8f0;
    }

    .kiosk-link a {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: #64748b;
        text-decoration: none;
        font-size: 0.9rem;
        padding: 10px 20px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        transition: all 0.2s;
    }

    .kiosk-link a:hover {
        border-color: var(--primary-color);
        color: var(--primary-color);
    }

    .kiosk-link p {
        margin-top: 0.5rem;
        font-size: 0.75rem;
        color: #94a3b8;
    }

    @media (max-width: 768px) {
        .login-container {
            flex-direction: column;
            min-height: 100vh;
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
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
            display: flex;
            align-items: flex-start;
            padding-top: 0;
        }

        .login-form {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 24px 24px 0 0;
            padding: 32px 24px 40px;
            margin-top: -20px;
            box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.1);
            max-width: 100%;
            width: 100%;
            min-height: calc(100vh - 180px);
        }

        .login-form h2 {
            font-size: 1.5rem;
            text-align: center;
            margin-bottom: 0.25rem;
        }

        .login-form > p {
            text-align: center;
            margin-bottom: 1.5rem;
        }

        .form-group input {
            padding: 16px;
            font-size: 1rem;
            border-radius: 12px;
        }

        .btn-login {
            padding: 16px;
            font-size: 1rem;
            border-radius: 12px;
            margin-top: 0.5rem;
        }

        .alert {
            border-radius: 12px;
        }

        .kiosk-link {
            display: none;
        }
    }

    @media (max-width: 380px) {
        .mobile-header {
            padding: 30px 15px;
        }

        .mobile-header img {
            width: 60px;
        }

        .mobile-header h1 {
            font-size: 1.25rem;
        }

        .login-form {
            padding: 24px 20px 32px;
        }
    }
`;
