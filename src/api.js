const BASE_URL = "http://localhost:3000";

function getAuthHeaders() {
    const token = localStorage.getItem("token");

    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    };
}

export async function fetchBooks() {
    const res = await fetch(`${BASE_URL}/fetchAllBooks`, {
        method: "GET",
        headers: getAuthHeaders(),
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.message || "Failed to fetch books");

    return data;
}

export async function addBook(book) {
    const res = await fetch(`${BASE_URL}/addBook`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(book),
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.message || "Failed to add book");

    return data;
}

export async function updateBook(id, book) {
    const res = await fetch(`${BASE_URL}/updateBook/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(book),
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.message || "Failed to update book");

    return data;
}

export async function deleteBook(id) {
    const res = await fetch(`${BASE_URL}/deleteBook/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.message || "Failed to delete book");

    return data;
}

export async function searchBooks(query, field) {
    const params = new URLSearchParams({
        q: query,
        field: field,
    });

    const res = await fetch(`${BASE_URL}/searchBooks?${params.toString()}`, {
        method: "GET",
        headers: getAuthHeaders(),
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.message || "Failed to search books");

    return data;
}