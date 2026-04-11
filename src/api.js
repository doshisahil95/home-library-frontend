// In dev the Vite proxy rewrites /api/* → http://localhost:3000/*
// so all requests are same-origin and cookies flow without any CORS issues.
// In production VITE_API_BASE is set to the Railway URL in the Vercel dashboard.
const BASE_URL = import.meta.env.VITE_API_BASE
    ? `${import.meta.env.VITE_API_BASE}`
    : "/api";

// Central fetch wrapper for authenticated requests.
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

// Auth-free wrapper
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
    if (filters.language) params.append("filterLanguage", filters.language);
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
    if (cursor) params.append("searchAfter", cursor);
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

export function updateProfile(fields) {
    return request("/users/profile", {
        method: "PATCH",
        body: JSON.stringify(fields),
    });
}

export function makeAllPrivate() {
    return request("/users/make-all-private", { method: "POST" });
}

export function getPublicCount() {
    return request("/users/public-count");
}

export function getDiscoverData() {
    return request("/discover");
}

// ─── Reference data ───────────────────────────────────────────────────────────
// Fetched on demand — when the modal opens or the filter panel opens.
// Returns { data: [{ _id, name }] }

export function getGenres() { return request("/reference-data/genres"); }
export function getHouses() { return request("/reference-data/houses"); }
export function getLanguages() { return request("/reference-data/languages"); }

// ─── Admin ────────────────────────────────────────────────────────────────────

export function getAdminUsers() {
    return request("/admin/users");
}

export function addAdminUser(user) {
    return request("/admin/users", { method: "POST", body: JSON.stringify(user) });
}

export function changeUserRole(id, role) {
    return request(`/admin/users/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) });
}

export function deleteAdminUser(id) {
    return request(`/admin/users/${id}`, { method: "DELETE" });
}

export function approvePasswordReset(id) {
    return request(`/admin/users/${id}/approve-reset`, { method: "POST" });
}

export function revokePasswordReset(id) {
    return request(`/admin/users/${id}/revoke-reset`, { method: "POST" });
}

export function createReferenceItem(type, name) {
    return request(`/reference-data/${type}`, { method: "POST", body: JSON.stringify({ name }) });
}

export function updateReferenceItem(type, id, name) {
    return request(`/reference-data/${type}/${id}`, { method: "PUT", body: JSON.stringify({ name }) });
}

export function deleteReferenceItem(type, id) {
    return request(`/reference-data/${type}/${id}`, { method: "DELETE" });
}

// ─── Public (no auth) ────────────────────────────────────────────────────────
// Plain fetch — no cookie, no auth header. Works for anyone with the link.

export async function getPublicBooks(userId) {
    const BASE_URL = import.meta.env.VITE_API_BASE
        ? `${import.meta.env.VITE_API_BASE}`
        : "/api";
    const res = await fetch(`${BASE_URL}/public/${userId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    return data;
}

// ─── CSV bulk upload ──────────────────────────────────────────────────────────

export function validateCSV(csvText) {
    return request("/admin/csv/validate", {
        method: "POST",
        body: JSON.stringify({ csv: csvText }),
    });
}

export function importCSV(csvText, stopOnError) {
    return request("/admin/csv/import", {
        method: "POST",
        body: JSON.stringify({ csvText, stopOnError }),
    });
}

// Generates and triggers download of a sample CSV file.
// Called entirely in the browser — no server request needed.
export function downloadSampleCSV() {
    const header = "title,author,house,genre,language,locationInHouse,description";
    const rows = [
        '"The Alchemist","Paulo Coelho","Brahma Courts","Fiction;Fantasy","English","Shelf 1 Row 2","A journey of self-discovery."',
        '"Sapiens","Yuval Noah Harari","Marvel","Biography;Science","English","Shelf 3","A brief history of humankind."',
        '"Cosmos","Carl Sagan","Brahma Courts","Science","English","","An exploration of the universe."',
    ];
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample_books.csv";
    a.click();
    URL.revokeObjectURL(url);
}