// Single source of truth for the API base URL.
// Set VITE_API_BASE in .env.local for local dev and in Vercel dashboard for production.
const BASE_URL = import.meta.env.VITE_API_BASE || "http://localhost:3000";

function getAuthHeaders() {
    const token = localStorage.getItem("token");
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
}

// Central fetch wrapper for authenticated requests.
// Detects 401 (expired / invalid token) and redirects to login cleanly.
async function request(url, options = {}) {
    const res = await fetch(`${BASE_URL}${url}`, {
        headers: getAuthHeaders(),
        ...options,
    });

    if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/";
        return new Promise(() => { });
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    return data;
}

// Auth-free wrapper for public endpoints (login, OTP, reset).
async function publicRequest(url, body) {
    const res = await fetch(`${BASE_URL}${url}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    return data;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export function loginUser(credentials) {
    return publicRequest("/login", credentials);
}

export function sendResetOTP(body) {
    return publicRequest("/send-reset-otp", body);
}

export function resetPassword(body) {
    return publicRequest("/reset-password", body);
}

// ─── Books ────────────────────────────────────────────────────────────────────

// Page-based pagination for regular browsing.
// Accepts optional house/genre/status filters — only appended when non-empty.
export function fetchBooks(limit, page = 1, sortBy = null, sortOrder = "asc", filters = {}, signal) {
    const params = new URLSearchParams({ limit, page });

    if (sortBy) {
        params.append("sortBy", sortBy);
        params.append("sortOrder", sortOrder);
    }

    if (filters.house) params.append("filterHouse", filters.house);
    if (filters.genre) params.append("filterGenre", filters.genre);
    if (filters.status) params.append("filterStatus", filters.status);

    return request(`/fetchAllBooks?${params}`, { signal });
}

// Cursor-based pagination for Atlas Search.
// Text query is optional — filters alone are valid.
export function searchBooks(query, filters = {}, limit, cursor, signal) {
    const params = new URLSearchParams({ limit });

    if (query) params.append("q", query);
    if (filters.house) params.append("filterHouse", filters.house);
    if (filters.genre) params.append("filterGenre", filters.genre);
    if (filters.status) params.append("filterStatus", filters.status);
    if (cursor) params.append("searchAfter", JSON.stringify(cursor));

    return request(`/searchBooks?${params}`, { signal });
}

export function addBook(book) {
    return request("/addBook", {
        method: "POST",
        body: JSON.stringify(book),
    });
}

export function updateBook(id, book) {
    return request(`/updateBook/${id}`, {
        method: "PUT",
        body: JSON.stringify(book),
    });
}

export function deleteBook(id) {
    return request(`/deleteBook/${id}`, { method: "DELETE" });
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function getDashboardStats() {
    return request("/dashboard");
}

// ─── User ─────────────────────────────────────────────────────────────────────

export function updateTheme(theme) {
    return request("/users/theme", {
        method: "PATCH",
        body: JSON.stringify({ theme }),
    });
}