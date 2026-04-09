import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getPublicBooks } from "../api";

// Respects system dark/light preference since the user may not be logged in
// and we have no stored theme preference for unauthenticated visitors.

function GenreTag({ name }) {
    return (
        <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
            {name}
        </span>
    );
}

function BookCard({ book }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div
                className="p-5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                onClick={() => setExpanded((e) => !e)}
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 leading-snug">
                            {book.title}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            {book.author}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                            {book.house && (
                                <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                                    {book.house}
                                </span>
                            )}
                            {book.language && (
                                <span className="text-xs text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded-full">
                                    {book.language}
                                </span>
                            )}
                            {book.genre?.slice(0, 2).map((g) => (
                                <GenreTag key={g} name={g} />
                            ))}
                            {book.genre?.length > 2 && (
                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                    +{book.genre.length - 2} more
                                </span>
                            )}
                        </div>
                    </div>
                    <span className={`text-gray-400 dark:text-gray-500 shrink-0 mt-0.5 transition-transform duration-200 text-sm ${expanded ? "rotate-180" : ""}`}>
                        ▾
                    </span>
                </div>
            </div>

            {expanded && (
                <div className="border-t border-gray-100 dark:border-gray-700 px-5 py-4 bg-gray-50 dark:bg-gray-700/40 space-y-3">
                    {/* All genres when expanded */}
                    {book.genre?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 mr-1 self-center">Genres:</span>
                            {book.genre.map((g) => (
                                <GenreTag key={g} name={g} />
                            ))}
                        </div>
                    )}

                    {/* Description */}
                    {book.description ? (
                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                            {book.description}
                        </p>
                    ) : (
                        <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                            No description added.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

function SkeletonCard() {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 space-y-3 animate-pulse">
            <div className="h-4 w-2/3 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-3 w-1/3 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="flex gap-2">
                <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
                <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded-full" />
            </div>
        </div>
    );
}

export default function PublicBooks() {
    const { userId } = useParams();
    const [books, setBooks] = useState([]);
    const [owner, setOwner] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");

    useEffect(() => {
        getPublicBooks(userId)
            .then((res) => {
                setBooks(res.data);
                setOwner(res.owner);
            })
            .catch((err) => setError(err.message || "Failed to load books"))
            .finally(() => setLoading(false));
    }, [userId]);

    // Apply system dark mode class on mount — visitor has no stored preference
    useEffect(() => {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        document.documentElement.classList.toggle("dark", prefersDark);
        return () => document.documentElement.classList.remove("dark");
    }, []);

    const filtered = search.trim()
        ? books.filter(
            (b) =>
                b.title.toLowerCase().includes(search.toLowerCase()) ||
                b.author.toLowerCase().includes(search.toLowerCase())
        )
        : books;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="max-w-3xl mx-auto px-4 py-5">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">📚</span>
                        <div>
                            {loading ? (
                                <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                            ) : error ? (
                                <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Library</h1>
                            ) : (
                                <>
                                    <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                                        {owner?.name}'s Library
                                    </h1>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                        {books.length} {books.length === 1 ? "book" : "books"}
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main */}
            <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">

                {/* Search — only shown when there are books */}
                {!loading && !error && books.length > 0 && (
                    <input
                        type="text"
                        placeholder="Search by title or author..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full h-10 px-4 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                )}

                {/* Error */}
                {error && (
                    <div className="text-center py-20">
                        <p className="text-4xl mb-4">📭</p>
                        <p className="text-gray-500 dark:text-gray-400">This library doesn't exist or has no public books.</p>
                    </div>
                )}

                {/* Skeleton */}
                {loading && (
                    <div className="space-y-3">
                        {[...Array(5)].map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                )}

                {/* Empty state */}
                {!loading && !error && books.length === 0 && (
                    <div className="text-center py-20">
                        <p className="text-4xl mb-4">📖</p>
                        <p className="text-gray-500 dark:text-gray-400">No public books yet.</p>
                    </div>
                )}

                {/* No search results */}
                {!loading && !error && books.length > 0 && filtered.length === 0 && (
                    <div className="text-center py-10">
                        <p className="text-gray-400 dark:text-gray-500 text-sm">No books match your search.</p>
                    </div>
                )}

                {/* Book list */}
                {!loading && !error && filtered.length > 0 && (
                    <div className="space-y-3">
                        {filtered.map((book) => (
                            <BookCard key={book._id} book={book} />
                        ))}
                    </div>
                )}
            </main>

            {/* Footer */}
            {!loading && !error && (
                <footer className="text-center py-8 text-xs text-gray-400 dark:text-gray-600">
                    Powered by Home Library
                </footer>
            )}
        </div>
    );
}