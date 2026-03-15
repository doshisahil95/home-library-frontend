import { Lock } from "lucide-react";
import { STATUSES, STATUS_STYLES, STATUS_LABELS } from "../data/bookConstants";
import housesData from "../data/houses.json";
import genresData from "../data/genres.json";

// Mirrors backend transition rules — keeps UI consistent with server enforcement
const VALID_TRANSITIONS = {
    null: ["want to read", "reading", "read"],
    "want to read": ["reading", "read"],
    "reading": ["read"],
    "read": [],
};

function canTransitionTo(currentStatus, newStatus) {
    if (!newStatus || currentStatus === newStatus) return true;
    return (VALID_TRANSITIONS[currentStatus ?? null] ?? []).includes(newStatus);
}

export default function BookModal({
    isEditing,
    formData,
    setFormData,
    modalError,
    onSubmit,
    onClose,
    currentStatus, // status as it exists in DB, used for transition validation
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
                            {STATUSES.map((s) => {
                                const allowed = canTransitionTo(currentStatus ?? null, s);
                                return (
                                    <button
                                        type="button"
                                        key={s}
                                        disabled={!allowed}
                                        onClick={() =>
                                            setFormData({
                                                ...formData,
                                                userStatus: formData.userStatus === s ? null : s,
                                            })
                                        }
                                        title={!allowed ? `Cannot change from "${currentStatus}" to "${s}"` : undefined}
                                        className={`px-3 py-1 rounded-full text-sm transition ${!allowed
                                                ? "opacity-30 cursor-not-allowed bg-gray-200 dark:bg-gray-700 text-gray-500"
                                                : formData.userStatus === s
                                                    ? STATUS_STYLES[s] + " ring-2 ring-offset-1 ring-current"
                                                    : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                                            }`}
                                    >
                                        {STATUS_LABELS[s]}
                                    </button>
                                );
                            })}
                        </div>
                        {formData.userStatus && (currentStatus === null || currentStatus === "want to read") && (
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, userStatus: null })}
                                className="mt-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline"
                            >
                                Clear status
                            </button>
                        )}
                        {currentStatus === "read" && (
                            <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                                Status is locked at "Read" and cannot be changed.
                            </p>
                        )}
                    </div>

                    {/* Reading dates — side by side when both visible (read), single column when only started (reading) */}
                    {(formData.userStatus === "reading" || formData.userStatus === "read") && (
                        <div className={formData.userStatus === "read" ? "grid grid-cols-2 gap-3" : ""}>

                            {/* Started date */}
                            <div>
                                <label className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Started Reading
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="date"
                                        value={formData.startedAt ? new Date(formData.startedAt).toISOString().split("T")[0] : ""}
                                        onChange={(e) => setFormData({ ...formData, startedAt: e.target.value || null })}
                                        disabled={formData.startedAtLocked}
                                        max={new Date().toISOString().split("T")[0]}
                                        className="flex-1 px-3 py-2 rounded-lg border dark:bg-gray-700 dark:text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                    {formData.startedAtLocked && (
                                        <span title="Locked" className="text-gray-400 dark:text-gray-500 shrink-0">
                                            <Lock size={14} />
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                    {formData.startedAtLocked
                                        ? "This date was manually set and cannot be changed again."
                                        : "Can only be changed once after being set."}
                                </p>
                            </div>

                            {/* Finished date — only when read */}
                            {formData.userStatus === "read" && (
                                <div>
                                    <label className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Finished Reading
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="date"
                                            value={formData.finishedAt ? new Date(formData.finishedAt).toISOString().split("T")[0] : ""}
                                            onChange={(e) => setFormData({ ...formData, finishedAt: e.target.value || null })}
                                            disabled={formData.finishedAtLocked}
                                            max={new Date().toISOString().split("T")[0]}
                                            className="flex-1 px-3 py-2 rounded-lg border dark:bg-gray-700 dark:text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                        />
                                        {formData.finishedAtLocked && (
                                            <span title="Locked" className="text-gray-400 dark:text-gray-500 shrink-0">
                                                <Lock size={14} />
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                        {formData.finishedAtLocked
                                            ? "This date was manually set and cannot be changed again."
                                            : "Can only be changed once after being set."}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Rating — visible only when read, locked once set */}
                    {formData.userStatus === "read" && (
                        <div>
                            <label className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                                My Rating
                            </label>
                            {(() => {
                                const isRatingLocked = currentStatus === "read" && formData.rating !== null && formData.rating !== undefined;
                                return (
                                    <>
                                        <div className="flex items-center gap-1">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button
                                                    key={star}
                                                    type="button"
                                                    disabled={isRatingLocked}
                                                    onClick={() => !isRatingLocked && setFormData({
                                                        ...formData,
                                                        rating: formData.rating === star ? null : star,
                                                    })}
                                                    className={`text-2xl transition-transform ${isRatingLocked
                                                            ? "cursor-not-allowed"
                                                            : "hover:scale-110"
                                                        } ${formData.rating >= star
                                                            ? "text-yellow-400"
                                                            : "text-gray-300 dark:text-gray-600"
                                                        }`}
                                                >
                                                    ★
                                                </button>
                                            ))}
                                            {formData.rating && !isRatingLocked && (
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, rating: null })}
                                                    className="ml-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline"
                                                >
                                                    Clear
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                            {isRatingLocked
                                                ? "Rating has been set and cannot be changed."
                                                : "Once saved, your rating cannot be changed."}
                                        </p>
                                    </>
                                );
                            })()}
                        </div>
                    )}

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