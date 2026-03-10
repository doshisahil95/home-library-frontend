import { useState, useEffect } from "react";
import { getDashboardStats } from "../api";

// Small reusable stat card
function StatCard({ title, value, color }) {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
      <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">{title}</h2>
      <p className={`text-4xl font-bold mt-2 ${color}`}>{value ?? "—"}</p>
    </div>
  );
}

// Horizontal bar for house/genre breakdowns
function BarRow({ label, count, max }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 text-sm text-gray-600 dark:text-gray-300 truncate shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
        <div
          className="h-3 rounded-full bg-blue-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-sm text-right text-gray-500 dark:text-gray-400 shrink-0">{count}</span>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getDashboardStats()
      .then((res) => setStats(res.data))
      .catch((err) => setError(err.message || "Failed to load stats"))
      .finally(() => setLoading(false));
  }, []);

  // Skeleton card for loading state
  const SkeletonCard = () => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg space-y-3 animate-pulse">
      <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
      <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
    </div>
  );

  const SkeletonBlock = () => (
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

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mt-4">Dashboard</h1>

      {error && <div className="text-red-500">{error}</div>}

      {/* Top stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <StatCard title="Total Books" value={stats?.totalBooks} color="text-blue-600" />
            <StatCard title="Houses" value={stats?.byHouse?.length} color="text-green-600" />
            <StatCard title="Genres" value={stats?.byGenre?.length} color="text-purple-600" />
          </>
        )}
      </div>

      {/* Breakdowns + Recently Added */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Books by House */}
        {loading ? <SkeletonBlock /> : (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Books by House</h2>
            {stats?.byHouse?.length > 0 ? (
              <div className="space-y-3">
                {stats.byHouse.map(({ house, count }) => (
                  <BarRow
                    key={house}
                    label={house}
                    count={count}
                    max={stats.byHouse[0].count}
                  />
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">No data yet</p>
            )}
          </div>
        )}

        {/* Books by Genre */}
        {loading ? <SkeletonBlock /> : (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Books by Genre</h2>
            {stats?.byGenre?.length > 0 ? (
              <div className="space-y-3">
                {stats.byGenre.map(({ genre, count }) => (
                  <BarRow
                    key={genre}
                    label={genre}
                    count={count}
                    max={stats.byGenre[0].count}
                  />
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">No data yet</p>
            )}
          </div>
        )}

        {/* Recently Added */}
        {loading ? <SkeletonBlock /> : (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg md:col-span-2">
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Recently Added</h2>
            {stats?.recentBooks?.length > 0 ? (
              <table className="min-w-full text-left">
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
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-400 text-sm">No books added yet</p>
            )}
          </div>
        )}

      </div>
    </div>
  );
}