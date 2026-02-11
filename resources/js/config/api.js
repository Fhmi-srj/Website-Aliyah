// API Configuration
// Automatically detect base path from current URL
const getBasePath = () => {
    const hostname = window.location.hostname;
    const path = window.location.pathname;
    const port = window.location.port;

    // If running via php artisan serve (port 8000) - no base path needed
    if (port === '8000') {
        return '';
    }

    // If running on ngrok or production domain (no subdirectory needed)
    if (hostname.includes('ngrok') || (hostname.includes('.') && !hostname.includes('localhost'))) {
        return '';
    }

    // For Laragon/Apache: Extract the base path (e.g., /website-Aliyah/public)
    const match = path.match(/^(\/[^\/]+\/public)/i);
    if (match) {
        return match[1];
    }

    // Fallback for virtual host (e.g., website-aliyah.test)
    return '';
};

export const API_BASE = `${getBasePath()}/api`;
export const APP_BASE = getBasePath();

/**
 * Fetch with auth token
 * @param {string} url - API endpoint
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<Response>}
 */
export const authFetch = async (url, options = {}) => {
    const token = localStorage.getItem('auth_token');

    const headers = {
        'Accept': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
        ...options,
        headers,
    });

    // Handle 401 - redirect to login
    if (response.status === 401) {
        localStorage.removeItem('auth_token');
        window.location.href = `${APP_BASE}/login`;
    }

    return response;
};

