import { useState, useEffect } from "react";
import { getDiscoverData } from "../api";

// ─── Shared sub-components ────────────────────────────────────────────────────

function SkeletonBlock({ rows = 4 }) {
    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg space-y-4 animate-pulse">
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
            {[...Array(rows)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                    <div className="h-3 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="flex-1 h-3 bg-gray-200 dark:bg-gray-700 rounded-full" />
                    <div className="h-3 w-6 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
            ))}
        </div>
    );
}

function SectionCard({ title, children, empty, emptyText = "Nothing here yet." }) {
    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">{title}</h2>
            {empty ? <p className="text-sm text-gray-400 dark:text-gray-500">{emptyText}</p> : children}
        </div>
    );
}

function StarDisplay({ rating }) {
    if (!rating) return null;
    return (
        <span className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
                <span key={s} className={`text-xs ${s <= rating ? "text-yellow-400" : "text-gray-300 dark:text-gray-600"}`}>★</span>
            ))}
        </span>
    );
}

const STATUS_STYLES = {
    "read": { bar: "bg-green-500", label: "text-green-600 dark:text-green-400" },
    "reading": { bar: "bg-yellow-500", label: "text-yellow-600 dark:text-yellow-400" },
    "want to read": { bar: "bg-blue-500", label: "text-blue-600 dark:text-blue-400" },
};

const STATUS_LABELS = {
    "read": "Read",
    "reading": "Reading",
    "want to read": "Want to Read",
};

function formatDate(dateStr) {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString(undefined, {
        day: "numeric", month: "short", year: "numeric",
    });
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Discover() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [userName, setUserName] = useState("");

    useEffect(() => {
        try {
            const user = JSON.parse(localStorage.getItem("user"));
            if (user?.name) setUserName(user.name.split(" ")[0]);
        } catch { /* ignore */ }

        getDiscoverData()
            .then((res) => setData(res.data))
            .catch((err) => setError(err.message || "Failed to load discover data"))
            .finally(() => setLoading(false));
    }, []);

    const statusRows = ["read", "reading", "want to read"].map((s) => {
        const found = data?.myStatus?.find((b) => b.status === s);
        return { status: s, count: found?.count || 0 };
    });
    const maxStatusCount = Math.max(...statusRows.map((r) => r.count), 1);

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mt-4">Discover</h1>

            {error && <div className="text-red-500 text-sm">{error}</div>}

            {/* Row 1: My Reading + Genre Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* My Reading */}
                {loading ? <SkeletonBlock /> : (
                    <SectionCard
                        title={userName ? `${userName}'s Reading` : "My Reading"}
                        empty={statusRows.every((r) => r.count === 0)}
                        emptyText="No reading activity yet. Start by adding a book."
                    >
                        <div className="space-y-4">
                            {statusRows.map(({ status, count }) => (
                                <div key={status} className="space-y-1">
                                    <div className="flex justify-between items-center">
                                        <span className={`text-sm font-medium ${STATUS_STYLES[status].label}`}>
                                            {STATUS_LABELS[status]}
                                        </span>
                                        <span className="text-sm text-gray-500 dark:text-gray-400">{count}</span>
                                    </div>
                                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                                        <div
                                            className={`h-2 rounded-full transition-all duration-500 ${STATUS_STYLES[status].bar}`}
                                            style={{ width: `${Math.round((count / maxStatusCount) * 100)}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </SectionCard>
                )}

                {/* Genre Breakdown */}
                {loading ? <SkeletonBlock /> : (
                    <SectionCard
                        title="My Genre Breakdown"
                        empty={!data?.myGenreBreakdown?.length}
                        emptyText="Read or start some books to see your genre breakdown."
                    >
                        <div className="space-y-3">
                            {data.myGenreBreakdown.map(({ genre, count }) => (
                                <div key={genre} className="flex items-center gap-3">
                                    <span className="w-28 text-sm text-gray-600 dark:text-gray-300 truncate shrink-0">{genre}</span>
                                    <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                                        <div
                                            className="h-3 rounded-full bg-purple-500 transition-all duration-500"
                                            style={{ width: `${Math.round((count / data.myGenreBreakdown[0].count) * 100)}%` }}
                                        />
                                    </div>
                                    <span className="w-6 text-sm text-right text-gray-500 dark:text-gray-400 shrink-0">{count}</span>
                                </div>
                            ))}
                        </div>
                    </SectionCard>
                )}
            </div>

            {/* Row 2: Recommended + Recently Finished by Others */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Recommendations */}
                {loading ? <SkeletonBlock rows={5} /> : (
                    <SectionCard
                        title="Recommended for You"
                        empty={!data?.recommendations?.length}
                        emptyText="Read some books to get genre-based recommendations."
                    >
                        <div className="space-y-3">
                            {data.recommendations.map((book) => (
                                <div key={book._id} className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{book.title}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{book.author} · {book.house}</p>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {book.genre?.slice(0, 3).map((g) => (
                                                <span key={g} className="px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
                                                    {g}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </SectionCard>
                )}

                {/* Recently finished by others */}
                {loading ? <SkeletonBlock rows={5} /> : (
                    <SectionCard
                        title="Recently Finished by Others"
                        empty={!data?.recentlyFinishedByOthers?.length}
                        emptyText="No one else has finished a book yet."
                    >
                        <div className="space-y-3">
                            {data.recentlyFinishedByOthers.map((book) => (
                                <div key={`${book._id}-${book.readerName}`} className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{book.title}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{book.author}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-xs text-gray-400 dark:text-gray-500">
                                                {book.readerName} · {formatDate(book.finishedAt)}
                                            </span>
                                        </div>
                                    </div>
                                    {book.rating && (
                                        <StarDisplay rating={book.rating} />
                                    )}
                                </div>
                            ))}
                        </div>
                    </SectionCard>
                )}
            </div>

            {/* Row 3: Reading Timeline — full width */}
            {loading ? <SkeletonBlock rows={4} /> : (
                <SectionCard
                    title="My Reading Timeline"
                    empty={!data?.readingTimeline?.length}
                    emptyText="Finish some books to see your reading timeline."
                >
                    {(() => {
                        const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
                            "July", "August", "September", "October", "November", "December"];

                        // Group books by year-month using a Map — robust regardless of sort order
                        const groupMap = new Map();
                        for (const book of data.readingTimeline) {
                            const key = `${book.year}-${String(book.month).padStart(2, "0")}`;
                            if (!groupMap.has(key)) {
                                groupMap.set(key, { year: book.year, month: book.month, books: [] });
                            }
                            groupMap.get(key).books.push(book);
                        }
                        // Sort groups newest first
                        const groups = Array.from(groupMap.values()).sort((a, b) =>
                            b.year !== a.year ? b.year - a.year : b.month - a.month
                        );

                        return (
                            <div className="relative">
                                {/* Vertical line */}
                                <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gray-200 dark:bg-gray-700" />

                                <div className="space-y-6">
                                    {groups.map(({ year, month, books }) => (
                                        <div key={`${year}-${month}`} className="relative pl-10">
                                            {/* Month dot */}
                                            <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center shadow-sm">
                                                <span className="text-white text-xs font-bold">{books.length}</span>
                                            </div>

                                            {/* Month label */}
                                            <div className="mb-3">
                                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                                                    {MONTH_NAMES[month - 1]} {year}
                                                </span>
                                                <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
                                                    {books.length} {books.length === 1 ? "book" : "books"}
                                                </span>
                                            </div>

                                            {/* Books in this month */}
                                            <div className="space-y-2">
                                                {books.map((book) => (
                                                    <div
                                                        key={book._id}
                                                        className="flex items-start justify-between gap-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl px-4 py-3"
                                                    >
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                                                                {book.title}
                                                            </p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                                By {book.author}
                                                            </p>
                                                            <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-0.5">
                                                                Completed on {formatDate(book.finishedAt)}
                                                            </p>
                                                        </div>
                                                        {book.rating && (
                                                            <StarDisplay rating={book.rating} />
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })()}
                </SectionCard>
            )}
        </div>
    );
}