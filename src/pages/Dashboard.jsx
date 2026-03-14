import { useState, useEffect } from "react";
import { getDashboardStats } from "../api";

function StatCard({ title, value, color }) {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
      <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">{title}</h2>
      <p className={`text-3xl md:text-4xl font-bold mt-2 ${color}`}>{value ?? "—"}</p>
    </div>
  );
}

function BarRow({ label, count, max }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 md:w-32 text-sm text-gray-600 dark:text-gray-300 truncate shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
        <div className="h-3 rounded-full bg-blue-500 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-sm text-right text-gray-500 dark:text-gray-400 shrink-0">{count}</span>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg space-y-3 animate-pulse">
      <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
      <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
    </div>
  );
}

function SkeletonBlock() {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg space-y-4 animate-pulse">
      <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-3 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="flex-1 h-3 bg-gray-200 dark:bg-gray-700 rounded-full" />
          <div className="h-3 w-6 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      ))}
    </div>
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

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userName, setUserName] = useState("");

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (user?.name) setUserName(user.name.split(" ")[0]);
    } catch { /* ignore */ }

    getDashboardStats()
      .then((res) => setStats(res.data))
      .catch((err) => setError(err.message || "Failed to load stats"))
      .finally(() => setLoading(false));
  }, []);

  const statusRows = ["read", "reading", "want to read"].map((s) => {
    const found = stats?.byStatus?.find((b) => b.status === s);
    return { status: s, count: found?.count || 0 };
  });
  const maxStatusCount = Math.max(...statusRows.map((r) => r.count), 1);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mt-4">Dashboard</h1>

      {error && <div className="text-red-500">{error}</div>}

      {/* Row 1: Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loading ? (
          <><SkeletonCard /><SkeletonCard /><SkeletonCard /></>
        ) : (
          <>
            <StatCard title="Total Books" value={stats?.totalBooks} color="text-blue-600" />
            <StatCard title="Houses" value={stats?.byHouse?.length} color="text-green-600" />
            <StatCard title="Genres" value={stats?.byGenre?.length} color="text-purple-600" />
          </>
        )}
      </div>

      {/* Row 2: House + Genre */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {loading ? <SkeletonBlock /> : (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Books by House</h2>
            {stats?.byHouse?.length > 0 ? (
              <div className="space-y-3">
                {stats.byHouse.map(({ house, count }) => (
                  <BarRow key={house} label={house} count={count} max={stats.byHouse[0].count} />
                ))}
              </div>
            ) : <p className="text-gray-400 text-sm">No data yet</p>}
          </div>
        )}

        {loading ? <SkeletonBlock /> : (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Books by Genre</h2>
            {stats?.byGenre?.length > 0 ? (
              <div className="space-y-3">
                {stats.byGenre.map(({ genre, count }) => (
                  <BarRow key={genre} label={genre} count={count} max={stats.byGenre[0].count} />
                ))}
              </div>
            ) : <p className="text-gray-400 text-sm">No data yet</p>}
          </div>
        )}
      </div>

      {/* Row 3: My Reading (1/3) + Recently Added (2/3) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* My Reading — compact, sits naturally at 1/3 width */}
        {loading ? <SkeletonBlock /> : (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">
              {userName ? `${userName}'s Reading` : "My Reading"}
            </h2>
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
          </div>
        )}

        {/* Recently Added — takes up 2/3 */}
        {loading ? <SkeletonBlock /> : (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg md:col-span-2">
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Recently Added</h2>
            {stats?.recentBooks?.length > 0 ? (
              <>
                {/* Desktop — table */}
                <table className="hidden md:table min-w-full text-left">
                  <thead>
                    <tr className="text-sm text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                      <th className="pb-2 font-medium w-2/5">Title</th>
                      <th className="pb-2 font-medium w-1/5">Author</th>
                      <th className="pb-2 font-medium w-1/5">House</th>
                      <th className="pb-2 font-medium w-1/5 text-right">Added</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {stats.recentBooks.map((book) => (
                      <tr key={book._id} className="text-sm">
                        <td className="py-3 text-gray-800 dark:text-gray-100 truncate max-w-0 w-2/5 pr-4">{book.title}</td>
                        <td className="py-3 text-gray-600 dark:text-gray-300 truncate">{book.author}</td>
                        <td className="py-3 text-gray-600 dark:text-gray-300 truncate">{book.house}</td>
                        <td className="py-3 text-gray-400 dark:text-gray-500 text-right whitespace-nowrap">
                          {new Date(book.createdAt).toLocaleDateString(undefined, {
                            day: "numeric", month: "short", year: "numeric"
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Mobile — stacked rows */}
                <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
                  {stats.recentBooks.map((book) => (
                    <div key={book._id} className="py-3 space-y-0.5">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{book.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{book.author} · {book.house}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {new Date(book.createdAt).toLocaleDateString(undefined, {
                          day: "numeric", month: "short", year: "numeric"
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            ) : <p className="text-gray-400 text-sm">No books added yet</p>}
          </div>
        )}
      </div>
    </div>
  );
}