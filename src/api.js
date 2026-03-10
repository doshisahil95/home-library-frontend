const BASE_URL = "http://localhost:3000";

function getAuthHeaders() {
    const token = localStorage.getItem("token");

    const headers = {
        "Content-Type": "application/json",
    };

    if (token) headers.Authorization = `Bearer ${token}`;

    return headers;
}

async function request(url, options = {}) {

    const res = await fetch(`${BASE_URL}${url}`, {
        headers: getAuthHeaders(),
        ...options
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.message);

    return data;
}

// Switched from cursor to page-based pagination
export function fetchBooks(limit, page = 1, sortBy = null, sortOrder = "asc") {

    const params = new URLSearchParams({ limit, page });

    if (sortBy) {
        params.append("sortBy", sortBy);
        params.append("sortOrder", sortOrder);
    }

    return request(`/fetchAllBooks?${params}`);
}

export function searchBooks(query, field, limit, cursor) {

    const params = new URLSearchParams({
        q: query,
        field,
        limit
    });

    if (cursor) params.append("searchAfter", JSON.stringify(cursor));

    return request(`/searchBooks?${params}`);
}

export function addBook(book) {

    return request(`/addBook`, {
        method: "POST",
        body: JSON.stringify(book)
    });

}

export function updateBook(id, book) {

    return request(`/updateBook/${id}`, {
        method: "PUT",
        body: JSON.stringify(book)
    });

}

export function deleteBook(id) {

    return request(`/deleteBook/${id}`, {
        method: "DELETE"
    });

}

export function getDashboardStats() {
    return request(`/dashboard`);
}