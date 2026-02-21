export default function Dashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
        Dashboard
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
            Total Books
          </h2>
          <p className="text-3xl font-bold mt-2 text-blue-600">
            0
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
            Borrowed
          </h2>
          <p className="text-3xl font-bold mt-2 text-yellow-500">
            0
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
            Available
          </h2>
          <p className="text-3xl font-bold mt-2 text-green-600">
            0
          </p>
        </div>

      </div>
    </div>
  );
}