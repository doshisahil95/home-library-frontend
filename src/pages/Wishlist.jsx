import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { getWishlist, addWishlistItem, updateWishlistItem, deleteWishlistItem } from "../api";
import BookModal from "../components/BookModal";

// ─── Item Form ────────────────────────────────────────────────────────────────

function WishlistForm({ initial, onSave, onCancel, saving }) {
    const [form, setForm] = useState(initial || { title: "", author: "", note: "" });
    const [error, setError] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.title.trim()) { setError("Title is required"); return; }
        if (!form.author.trim()) { setError("Author is required"); return; }
        setError("");
        onSave(form);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                    autoFocus
                    type="text"
                    placeholder="Title"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    maxLength={200}
                    className="px-3 py-2 rounded-lg border dark:bg-gray-700 dark:text-white text-sm"
                />
                <input
                    type="text"
                    placeholder="Author"
                    value={form.author}
                    onChange={(e) => setForm({ ...form, author: e.target.value })}
                    maxLength={200}
                    className="px-3 py-2 rounded-lg border dark:bg-gray-700 dark:text-white text-sm"
                />
            </div>
            <textarea
                placeholder="Note (optional) — why you want to read this, where you heard about it..."
                value={form.note}
                onChange={(e) => { if (e.target.value.length <= 1000) setForm({ ...form, note: e.target.value }); }}
                rows={2}
                className="w-full px-3 py-2 rounded-lg border dark:bg-gray-700 dark:text-white text-sm resize-none"
            />
            <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">{form.note.length} / 1000</span>
                <div className="flex gap-2">
                    <button type="button" onClick={onCancel}
                        className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-600 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500">
                        Cancel
                    </button>
                    <button type="submit" disabled={saving}
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                        {saving ? "Saving..." : initial ? "Update" : "Add to Wishlist"}
                    </button>
                </div>
            </div>
        </form>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Wishlist() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    // BookModal state for "Convert to book"
    const [convertItem, setConvertItem] = useState(null);

    const currentUserId = (() => {
        try { return JSON.parse(localStorage.getItem("user"))?.id || ""; } catch { return ""; }
    })();
    const isAdmin = (() => {
        try { const u = JSON.parse(localStorage.getItem("user")); return u?.role === "admin" || u?.role === "superadmin"; } catch { return false; }
    })();

    useEffect(() => {
        getWishlist()
            .then((res) => setItems(res.data || []))
            .catch((err) => toast.error(err.message || "Failed to load wishlist"))
            .finally(() => setLoading(false));
    }, []);

    const handleAdd = async (form) => {
        try {
            setSaving(true);
            const res = await addWishlistItem(form);
            setItems((prev) => [res.data, ...prev]);
            setShowAdd(false);
            toast.success("Added to wishlist");
        } catch (err) {
            toast.error(err.message || "Failed to add item");
        } finally {
            setSaving(false);
        }
    };

    const handleUpdate = async (form) => {
        try {
            setSaving(true);
            await updateWishlistItem(editTarget._id, form);
            setItems((prev) => prev.map((i) => i._id === editTarget._id ? { ...i, ...form } : i));
            setEditTarget(null);
            toast.success("Updated");
        } catch (err) {
            toast.error(err.message || "Failed to update");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (itemId) => {
        try {
            setDeletingId(itemId);
            await deleteWishlistItem(itemId);
            setItems((prev) => prev.filter((i) => i._id !== itemId));
            toast.success("Removed from wishlist");
        } catch (err) {
            toast.error(err.message || "Failed to delete");
        } finally {
            setDeletingId(null);
        }
    };

    // Pre-fill BookModal with wishlist item title + author
    const handleConvert = (item) => {
        setConvertItem(item);
    };

    const [convertFormState, setConvertFormState] = useState(null);
    const EMPTY_FORM = { title: "", author: "", house: "", genre: [], language: "", locationInHouse: "", description: "", userStatus: null, isPublic: false, startedAt: null, startedAtLocked: false, finishedAt: null, finishedAtLocked: false, rating: null, seriesId: null, seriesOrder: null, note: "" };
    useEffect(() => {
        if (convertItem) setConvertFormState({ ...EMPTY_FORM, title: convertItem.title, author: convertItem.author });
    }, [convertItem]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mt-4">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Wishlist</h1>
                <button
                    onClick={() => { setShowAdd(true); setEditTarget(null); }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm"
                >
                    + Add Book
                </button>
            </div>

            {/* Add form */}
            {showAdd && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                    <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-4">Add to Wishlist</h2>
                    <WishlistForm
                        onSave={handleAdd}
                        onCancel={() => setShowAdd(false)}
                        saving={saving}
                    />
                </div>
            )}

            {/* List */}
            {loading ? (
                <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5 animate-pulse space-y-2">
                            <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
                            <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                        </div>
                    ))}
                </div>
            ) : items.length === 0 && !showAdd ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-10 text-center">
                    <p className="text-gray-400 dark:text-gray-500">Your wishlist is empty.</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Add books you want to read and convert them to your library when you get them.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {items.map((item) => (
                        <div key={item._id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5">
                            {editTarget?._id === item._id ? (
                                <WishlistForm
                                    initial={editTarget}
                                    onSave={handleUpdate}
                                    onCancel={() => setEditTarget(null)}
                                    saving={saving}
                                />
                            ) : (
                                <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold text-gray-800 dark:text-gray-100">{item.title}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{item.author}</p>
                                        {item.note && (
                                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">{item.note}</p>
                                        )}
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                                            Added {new Date(item.addedAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                                        </p>
                                    </div>
                                    <div className="flex flex-col gap-2 shrink-0">
                                        <button
                                            onClick={() => handleConvert(item)}
                                            className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition whitespace-nowrap"
                                        >
                                            Add to Library
                                        </button>
                                        <button
                                            onClick={() => setEditTarget(item)}
                                            className="px-3 py-1.5 text-xs bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item._id)}
                                            disabled={deletingId === item._id}
                                            className="px-3 py-1.5 text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-800 disabled:opacity-50 transition"
                                        >
                                            {deletingId === item._id ? "..." : "Remove"}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* BookModal pre-filled for convert */}
            {convertItem && convertFormState && (
                <BookModal
                    isEditing={false}
                    formData={convertFormState}
                    setFormData={setConvertFormState}
                    modalError=""
                    onSubmit={async (e) => {
                        e.preventDefault();
                        // Import addBook here to avoid circular dep
                        const { addBook } = await import("../api");
                        try {
                            const payload = {
                                ...convertFormState,
                                title: convertFormState.title.trim(),
                                author: convertFormState.author.trim(),
                                description: convertFormState.description?.trim() || "",
                                userStatus: convertFormState.userStatus || null,
                            };
                            await addBook(payload);
                            toast.success(`"${convertFormState.title}" added to your library`);
                            // Optionally remove from wishlist after converting
                            await deleteWishlistItem(convertItem._id);
                            setItems((prev) => prev.filter((i) => i._id !== convertItem._id));
                            setConvertItem(null);
                            setConvertFormState(null);
                        } catch (err) {
                            toast.error(err.message || "Failed to add book");
                        }
                    }}
                    onClose={() => { setConvertItem(null); setConvertFormState(null); }}
                    currentStatus={null}
                    userId={currentUserId}
                    bookId={null}
                    isAdmin={isAdmin}
                />
            )}
        </div>
    );
}