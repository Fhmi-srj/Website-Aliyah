/**
 * WebAuthn browser utilities for fingerprint/biometric authentication.
 * Handles credential creation (registration) and credential assertion (login).
 */

import { API_BASE } from '../config/api';

/**
 * Check if WebAuthn is supported by the browser.
 */
export function isWebAuthnSupported() {
    return !!(
        window.PublicKeyCredential &&
        navigator.credentials &&
        navigator.credentials.create &&
        navigator.credentials.get
    );
}

/**
 * Check if platform authenticator (fingerprint/Face ID) is available.
 */
export async function isPlatformAuthenticatorAvailable() {
    if (!isWebAuthnSupported()) return false;
    try {
        return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
        return false;
    }
}

/**
 * Convert an ArrayBuffer to a Base64URL string.
 */
function bufferToBase64url(buffer) {
    const bytes = new Uint8Array(buffer);
    let str = '';
    for (const b of bytes) str += String.fromCharCode(b);
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Convert a Base64URL string to an ArrayBuffer.
 */
function base64urlToBuffer(base64url) {
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    const padded = pad ? base64 + '='.repeat(4 - pad) : base64;
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
}

/**
 * Fetch CSRF cookie for session-based routes.
 */
async function ensureCsrf() {
    // Get the XSRF token from cookies (Laravel sets it via web middleware)
    const xsrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('XSRF-TOKEN='))
        ?.split('=')[1];
    return xsrfToken ? decodeURIComponent(xsrfToken) : null;
}

/**
 * Make a fetch request with proper headers for WebAuthn endpoints.
 */
async function webauthnFetch(url, body = null, token = null) {
    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // Try to get XSRF token for session-based routes
    const xsrf = await ensureCsrf();
    if (xsrf) {
        headers['X-XSRF-TOKEN'] = xsrf;
    }

    const response = await fetch(url, {
        method: body ? 'POST' : 'GET',
        headers,
        credentials: 'same-origin', // Include cookies for session
        body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || `Request failed with status ${response.status}`);
    }

    return response.json();
}

/**
 * First ensure we have a CSRF cookie by hitting sanctum/csrf-cookie.
 */
async function initSession() {
    try {
        await fetch('/sanctum/csrf-cookie', { credentials: 'same-origin' });
    } catch {
        // Ignore - CSRF cookie might already exist or not be needed
    }
}

/**
 * Register a new WebAuthn credential (fingerprint).
 * Must be called when user is authenticated.
 *
 * @param {string} authToken - Sanctum bearer token
 * @returns {Promise<{success: boolean, message?: string}>}
 */
export async function registerCredential(authToken) {
    await initSession();

    // Step 1: Get registration options (challenge) from server
    const options = await webauthnFetch(`${API_BASE}/webauthn/register/options`, {}, authToken);

    // Step 2: Prepare options for navigator.credentials.create()
    const publicKeyOptions = {
        ...options,
        challenge: base64urlToBuffer(options.challenge),
        user: {
            ...options.user,
            id: base64urlToBuffer(options.user.id),
        },
    };

    if (options.excludeCredentials) {
        publicKeyOptions.excludeCredentials = options.excludeCredentials.map(cred => ({
            ...cred,
            id: base64urlToBuffer(cred.id),
        }));
    }

    // Step 3: Create credential via browser API (triggers fingerprint scan)
    const credential = await navigator.credentials.create({
        publicKey: publicKeyOptions,
    });

    // Step 4: Send credential to server for verification and storage
    const attestationResponse = {
        id: credential.id,
        rawId: bufferToBase64url(credential.rawId),
        type: credential.type,
        response: {
            clientDataJSON: bufferToBase64url(credential.response.clientDataJSON),
            attestationObject: bufferToBase64url(credential.response.attestationObject),
        },
    };

    return await webauthnFetch(`${API_BASE}/webauthn/register`, attestationResponse, authToken);
}

/**
 * Authenticate using a WebAuthn credential (fingerprint login).
 *
 * @param {string} username - User's username
 * @param {number} tahunAjaranId - Selected tahun ajaran ID
 * @param {boolean} remember - Remember me flag
 * @returns {Promise<{success: boolean, data?: object, message?: string}>}
 */
export async function authenticateCredential(username, tahunAjaranId, remember = false) {
    await initSession();

    // Step 1: Get assertion options (challenge + allowed credentials) from server
    const options = await webauthnFetch(`${API_BASE}/webauthn/login/options`, { username });

    // Step 2: Prepare options for navigator.credentials.get()
    const publicKeyOptions = {
        ...options,
        challenge: base64urlToBuffer(options.challenge),
    };

    if (options.allowCredentials) {
        publicKeyOptions.allowCredentials = options.allowCredentials.map(cred => ({
            ...cred,
            id: base64urlToBuffer(cred.id),
        }));
    }

    // Step 3: Get credential via browser API (triggers fingerprint scan)
    const credential = await navigator.credentials.get({
        publicKey: publicKeyOptions,
    });

    // Step 4: Send assertion to server for verification
    const assertionResponse = {
        id: credential.id,
        rawId: bufferToBase64url(credential.rawId),
        type: credential.type,
        response: {
            clientDataJSON: bufferToBase64url(credential.response.clientDataJSON),
            authenticatorData: bufferToBase64url(credential.response.authenticatorData),
            signature: bufferToBase64url(credential.response.signature),
            userHandle: credential.response.userHandle
                ? bufferToBase64url(credential.response.userHandle)
                : null,
        },
        tahun_ajaran_id: tahunAjaranId,
        remember: remember,
    };

    return await webauthnFetch(`${API_BASE}/webauthn/login`, assertionResponse);
}

/**
 * Check if a user has registered WebAuthn credentials.
 *
 * @param {string} username
 * @returns {Promise<boolean>}
 */
export async function checkHasCredentials(username) {
    try {
        const data = await webauthnFetch(`${API_BASE}/webauthn/has-credentials`, { username });
        return data?.data?.has_credentials || false;
    } catch {
        return false;
    }
}

/**
 * Get list of registered credentials for the current user.
 *
 * @param {string} authToken
 * @returns {Promise<Array>}
 */
export async function getCredentials(authToken) {
    const headers = {
        'Accept': 'application/json',
        'Authorization': `Bearer ${authToken}`,
    };

    const response = await fetch(`${API_BASE}/webauthn/credentials`, {
        headers,
        credentials: 'same-origin',
    });

    const data = await response.json();
    return data?.data || [];
}

/**
 * Delete a registered credential.
 *
 * @param {string} credentialId - Base64 encoded credential ID
 * @param {string} authToken
 * @returns {Promise<{success: boolean, message?: string}>}
 */
export async function deleteCredentialById(credentialId, authToken) {
    const headers = {
        'Accept': 'application/json',
        'Authorization': `Bearer ${authToken}`,
    };

    const response = await fetch(`${API_PREFIX}/webauthn/credentials/${encodeURIComponent(credentialId)}`, {
        method: 'DELETE',
        headers,
        credentials: 'same-origin',
    });

    return response.json();
}
