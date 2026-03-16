// In dev the Vite proxy rewrites /api/* → http://localhost:3000/*
// so all requests are same-origin and cookies flow without any CORS issues.
// In production VITE_API_BASE is set to the Railway URL in the Vercel dashboard.
const BASE_URL = import.meta.env.VITE_API_BASE
    ? `${import.meta.env.VITE_API_BASE}`
    : "/api";

// Central fetch wrapper for authenticated requests.
// credentials: "include" sends the HttpOnly cookie on every request.
// On 401, clears localStorage user data and redirects to login.
async function request(url, options = {}) {
    const res = await fetch(`${BASE_URL}${url}`, {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        ...options,
    });

    if (res.status === 401) {
        localStorage.removeItem("user");
        window.location.href = "/";
        throw new DOMException("Unauthorized — redirecting to login", "AbortError");
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    return data;
}

// Auth-free wrapper — still needs credentials:include so the Set-Cookie
// response from /login is accepted by the browser
async function publicRequest(url, body) {
    const res = await fetch(`${BASE_URL}${url}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    return data;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export function loginUser(credentials) { return publicRequest("/login", credentials); }
export function sendResetOTP(body) { return publicRequest("/send-reset-otp", body); }
export function resetPassword(body) { return publicRequest("/reset-password", body); }

export function getMe() {
    return request("/me");
}

export function refreshToken() {
    return request("/refresh-token", { method: "POST" });
}

export function logout() {
    return request("/logout", { method: "POST" });
}

// ─── Books ────────────────────────────────────────────────────────────────────

function appendFilters(params, filters) {
    if (filters.house) params.append("filterHouse", filters.house);
    if (filters.genres?.length) {
        filters.genres.forEach((g) => params.append("filterGenre", g));
    }
    if (filters.status) params.append("filterStatus", filters.status);
}

export function fetchBooks(limit, page = 1, sortBy = null, sortOrder = "asc", filters = {}, signal) {
    const params = new URLSearchParams({ limit, page });
    if (sortBy) {
        params.append("sortBy", sortBy);
        params.append("sortOrder", sortOrder);
    }
    appendFilters(params, filters);
    return request(`/fetchAllBooks?${params}`, { signal });
}

export function searchBooks(query, filters = {}, limit, cursor, signal) {
    const params = new URLSearchParams({ limit });
    if (query) params.append("q", query);
    appendFilters(params, filters);
    if (cursor) params.append("searchAfter", JSON.stringify(cursor));
    return request(`/searchBooks?${params}`, { signal });
}

export function addBook(book) {
    return request("/addBook", { method: "POST", body: JSON.stringify(book) });
}

export function updateBook(id, book) {
    return request(`/updateBook/${id}`, { method: "PUT", body: JSON.stringify(book) });
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

export function getDiscoverData() {
    return request("/discover");
}