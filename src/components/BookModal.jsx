import { useState, useEffect } from "react";
import { Lock } from "lucide-react";
import { STATUSES, STATUS_STYLES, STATUS_LABELS } from "../data/bookConstants";
import { getGenres, getHouses, getLanguages } from "../api";

// Mirrors backend transition rules
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

// ─── Skeleton pills ───────────────────────────────────────────────────────────
// Shown while reference data is loading — preserves layout, no shift on load.

function PillSkeleton({ count = 4 }) {
    return (
        <div className="flex flex-wrap gap-2">
            {[...Array(count)].map((_, i) => (
                <div
                    key={i}
                    className="h-7 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse"
                    style={{ width: `${48 + (i % 3) * 16}px` }}
                />
            ))}
        </div>
    );
}

export default function BookModal({
    isEditing,
    formData,
    setFormData,
    modalError,
    onSubmit,
    onClose,
    currentStatus,
}) {
    const [houses, setHouses] = useState([]);
    const [genres, setGenres] = useState([]);
    const [languages, setLanguages] = useState([]);
    const [refLoading, setRefLoading] = useState(true);
    const [refError, setRefError] = useState("");

    // Fetch all reference data on mount — always fresh
    useEffect(() => {
        let cancelled = false;
        setRefLoading(true);
        setRefError("");

        Promise.all([getHouses(), getGenres(), getLanguages()])
            .then(([h, g, l]) => {
                if (cancelled) return;
                setHouses(h.data.map((x) => x.name));
                setGenres(g.data.map((x) => x.name));
                setLanguages(l.data.map((x) => x.name));
            })
            .catch(() => {
                if (!cancelled) setRefError("Failed to load options. Please close and try again.");
            })
            .finally(() => {
                if (!cancelled) setRefLoading(false);
            });

        return () => { cancelled = true; };
    }, []);

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
                {refError && <div className="text-red-500 text-sm mb-3">{refError}</div>}

                <form onSubmit={onSubmit} className="space-y-4">

                    {/* Title */}
                    <input
                        type="text"
                        placeholder="Title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:text-white text-sm"
                    />

                    {/* Author */}
                    <input
                        type="text"
                        placeholder="Author"
                        value={formData.author}
                        onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:text-white text-sm"
                    />

                    {/* House */}
                    <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            Select House
                        </label>
                        {refLoading ? <PillSkeleton count={2} /> : (
                            <div className="flex flex-wrap gap-2">
                                {houses.map((house) => (
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
                        )}
                    </div>

                    {/* Genre */}
                    <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            Select Genre
                        </label>
                        {refLoading ? <PillSkeleton count={5} /> : (
                            <div className="flex flex-wrap gap-2">
                                {genres.map((genre) => {
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
                        )}
                    </div>

                    {/* Language */}
                    <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            Language <span className="text-gray-400 font-normal">(optional)</span>
                        </label>
                        {refLoading ? <PillSkeleton count={4} /> : (
                            <div className="flex flex-wrap gap-2">
                                {languages.map((lang) => (
                                    <button
                                        type="button"
                                        key={lang}
                                        onClick={() =>
                                            setFormData({
                                                ...formData,
                                                language: formData.language === lang ? "" : lang,
                                            })
                                        }
                                        className={`px-3 py-1 rounded-full text-sm ${formData.language === lang
                                            ? "bg-purple-600 text-white"
                                            : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                                            }`}
                                    >
                                        {lang}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Location in House */}
                    <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            Location in House <span className="text-gray-400 font-normal">(optional)</span>
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. Shelf 3, Row 2"
                            value={formData.locationInHouse || ""}
                            onChange={(e) => setFormData({ ...formData, locationInHouse: e.target.value })}
                            maxLength={200}
                            className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:text-white text-sm"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            Description <span className="text-gray-400 font-normal">(optional)</span>
                        </label>
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
                        <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            My Status
                        </label>
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

                    {/* Reading dates */}
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

                            {/* Finished date */}
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

                    {/* Rating */}
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
                                                    className={`text-2xl transition-transform ${isRatingLocked ? "cursor-not-allowed" : "hover:scale-110"} ${formData.rating >= star ? "text-yellow-400" : "text-gray-300 dark:text-gray-600"}`}
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
                            disabled={refLoading}
                            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isEditing ? "Update Book" : "Add Book"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}