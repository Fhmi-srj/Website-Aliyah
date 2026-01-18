// API Configuration
// Automatically detect base path from current URL
const getBasePath = () => {
    const hostname = window.location.hostname;
    const path = window.location.pathname;

    // If running on ngrok or production domain (no subdirectory needed)
    if (hostname.includes('ngrok') || hostname.includes('.') && !hostname.includes('localhost')) {
        return '';
    }

    // Extract the base path (e.g., /Website-Aliyah/public from /Website-Aliyah/public/...)
    const match = path.match(/^(\/[^\/]+\/public)/);
    if (match) {
        return match[1];
    }
    // Fallback for different URL structures
    const altMatch = path.match(/^(\/[^\/]+)/);
    if (altMatch && altMatch[1] !== '/data-induk' && altMatch[1] !== '/login' && altMatch[1] !== '/api') {
        return altMatch[1];
    }
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

