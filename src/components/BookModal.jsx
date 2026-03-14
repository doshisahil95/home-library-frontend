import { STATUSES, STATUS_STYLES, STATUS_LABELS } from "../data/bookConstants";
import housesData from "../data/houses.json";
import genresData from "../data/genres.json";

export default function BookModal({
    isEditing,
    formData,
    setFormData,
    modalError,
    onSubmit,
    onClose,
}) {
    return (
        <div
            className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 px-4"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">
                    {isEditing ? "Edit Book" : "Add Book"}
                </h2>

                {modalError && <div className="text-red-500 text-sm mb-3">{modalError}</div>}

                <form onSubmit={onSubmit} className="space-y-4">
                    <input
                        type="text"
                        placeholder="Title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:text-white text-sm"
                    />

                    <input
                        type="text"
                        placeholder="Author"
                        value={formData.author}
                        onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:text-white text-sm"
                    />

                    {/* House */}
                    <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Select House</label>
                        <div className="flex flex-wrap gap-2">
                            {housesData.map((house) => (
                                <button
                                    type="button"
                                    key={house}
                                    onClick={() => setFormData({ ...formData, house })}
                                    className={`px-3 py-1 rounded-full text-sm ${formData.house === house
                                            ? "bg-green-600 text-white"
                                            : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                                        }`}
                                >
                                    {house}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Genre */}
                    <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Select Genre</label>
                        <div className="flex flex-wrap gap-2">
                            {genresData.map((genre) => {
                                const isSelected = formData.genre.includes(genre);
                                return (
                                    <button
                                        type="button"
                                        key={genre}
                                        onClick={() =>
                                            setFormData({
                                                ...formData,
                                                genre: isSelected
                                                    ? formData.genre.filter((g) => g !== genre)
                                                    : [...formData.genre, genre],
                                            })
                                        }
                                        className={`px-3 py-1 rounded-full text-sm ${isSelected
                                                ? "bg-blue-600 text-white"
                                                : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                                            }`}
                                    >
                                        {genre}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                        <textarea
                            placeholder="Add a note or description..."
                            value={formData.description}
                            onChange={(e) => {
                                if (e.target.value.length <= 1000)
                                    setFormData({ ...formData, description: e.target.value });
                            }}
                            rows={3}
                            className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:text-white resize-none text-sm"
                        />
                        <div className="text-right text-xs text-gray-400 mt-1">
                            {formData.description?.length || 0} / 1000
                        </div>
                    </div>

                    {/* Status */}
                    <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">My Status</label>
                        <div className="flex flex-wrap gap-2">
                            {STATUSES.map((s) => (
                                <button
                                    type="button"
                                    key={s}
                                    onClick={() =>
                                        setFormData({
                                            ...formData,
                                            userStatus: formData.userStatus === s ? null : s,
                                        })
                                    }
                                    className={`px-3 py-1 rounded-full text-sm ${formData.userStatus === s
                                            ? STATUS_STYLES[s] + " ring-2 ring-offset-1 ring-current"
                                            : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                                        }`}
                                >
                                    {STATUS_LABELS[s]}
                                </button>
                            ))}
                        </div>
                        {formData.userStatus && (
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, userStatus: null })}
                                className="mt-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline"
                            >
                                Clear status
                            </button>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg bg-gray-300 dark:bg-gray-600 dark:text-white text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm"
                        >
                            {isEditing ? "Update Book" : "Add Book"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}