const BASE_URL = "http://localhost:3000";

function getAuthHeaders() {
    const token = localStorage.getItem("token");

    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    };
}

export async function fetchBooks() {
    const res = await fetch(`${BASE_URL}/books`, {
        method: "GET",
        headers: getAuthHeaders(),
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.message || "Failed to fetch books");

    return data;
}

export async function addBook(book) {
    const res = await fetch(`${BASE_URL}/books`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(book),
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.message || "Failed to add book");

    return data;
}

export async function updateBook(id, book) {
    const res = await fetch(`${BASE_URL}/books/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(book),
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.message || "Failed to update book");

    return data;
}

export async function deleteBook(id) {
    const res = await fetch(`${BASE_URL}/books/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.message || "Failed to delete book");

    return data;
}