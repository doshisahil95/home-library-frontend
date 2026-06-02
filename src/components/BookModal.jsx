import { useState, useEffect } from "react";
import { Lock } from "lucide-react";
import { STATUSES, STATUS_STYLES, STATUS_LABELS } from "../data/bookConstants";
import { getGenres, getHouses, getLanguages, getSeries, upsertNote } from "../api";

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

function PillSkeleton({ count = 4 }) {
    return (
        <div className="flex flex-wrap gap-2">
            {[...Array(count)].map((_, i) => (
                <div key={i} className="h-7 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse"
                    style={{ width: `${48 + (i % 3) * 16}px` }} />
            ))}
        </div>
    );
}

function SectionLabel({ children }) {
    return (
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
            {children}
        </p>
    );
}

function ModalPublicLink({ userId }) {
    const [copied, setCopied] = useState(false);
    const url = `${window.location.origin}/public/${userId}`;
    const handleCopy = () => {
        navigator.clipboard.writeText(url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };
    return (
        <div className="flex items-center gap-2 mt-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
            <input readOnly value={url}
                className="flex-1 text-xs text-gray-500 dark:text-gray-400 bg-transparent truncate outline-none" />
            <button type="button" onClick={handleCopy}
                className="shrink-0 text-xs text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap">
                {copied ? "Copied!" : "Copy link"}
            </button>
        </div>
    );
}

export default function BookModal({
    isEditing, formData, setFormData, modalError, onSubmit, onClose, currentStatus, userId, bookId, isAdmin,
}) {
    const [houses, setHouses] = useState([]);
    const [genres, setGenres] = useState([]);
    const [languages, setLanguages] = useState([]);
    const [seriesList, setSeriesList] = useState([]);
    const [noteText, setNoteText] = useState(formData.note || "");
    const [noteSaving, setNoteSaving] = useState(false);
    const [noteSaved, setNoteSaved] = useState(false);

    const [refLoading, setRefLoading] = useState(true);
    const [refError, setRefError] = useState("");

    useEffect(() => { setNoteText(formData.note || ""); }, [formData.note]);

    useEffect(() => {
        let cancelled = false;
        setRefLoading(true);
        setRefError("");
        Promise.all([getHouses(), getGenres(), getLanguages(), getSeries()])
            .then(([h, g, l, s]) => {
                if (cancelled) return;
                setHouses(h.data.map((x) => x.name));
                setGenres(g.data.map((x) => x.name));
                setLanguages(l.data.map((x) => x.name));
                setSeriesList(s.data);
            })
            .catch(() => { if (!cancelled) setRefError("Failed to load options. Please close and try again."); })
            .finally(() => { if (!cancelled) setRefLoading(false); });
        return () => { cancelled = true; };
    }, []);

    const isRatingLocked = currentStatus === "read" && formData.rating !== null && formData.rating !== undefined;

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 px-4 py-4"
            onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}>

                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                        {isEditing ? "Edit Book" : "Add Book"}
                    </h2>
                    <button type="button" onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none">
                        ×
                    </button>
                </div>

                {(modalError || refError) && (
                    <div className="px-6 pt-3 shrink-0">
                        {modalError && <p className="text-red-500 text-sm">{modalError}</p>}
                        {refError && <p className="text-red-500 text-sm">{refError}</p>}
                    </div>
                )}

                <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0">
                    <div className="flex-1 overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 md:divide-x md:divide-gray-200 md:dark:divide-gray-700">

                            <div className="px-6 py-5 space-y-4">
                                <SectionLabel>Book details</SectionLabel>

                                <div className="space-y-2">
                                    <input type="text" placeholder="Title" value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border dark:bg-gray-700 dark:text-white text-sm" />
                                    <input type="text" placeholder="Author" value={formData.author}
                                        onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border dark:bg-gray-700 dark:text-white text-sm" />
                                </div>

                                <div>
                                    <label className="block mb-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">House</label>
                                    {refLoading ? <PillSkeleton count={2} /> : (
                                        <div className="flex flex-wrap gap-1.5">
                                            {houses.map((house) => (
                                                <button type="button" key={house}
                                                    onClick={() => setFormData({ ...formData, house })}
                                                    className={`px-3 py-1 rounded-full text-sm ${formData.house === house
                                                        ? "bg-green-600 text-white"
                                                        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"}`}>
                                                    {house}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block mb-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">Genre</label>
                                    {refLoading ? <PillSkeleton count={5} /> : (
                                        <div className="flex flex-wrap gap-1.5">
                                            {genres.map((genre) => {
                                                const isSelected = formData.genre.includes(genre);
                                                return (
                                                    <button type="button" key={genre}
                                                        onClick={() => setFormData({
                                                            ...formData,
                                                            genre: isSelected
                                                                ? formData.genre.filter((g) => g !== genre)
                                                                : [...formData.genre, genre],
                                                        })}
                                                        className={`px-3 py-1 rounded-full text-sm ${isSelected
                                                            ? "bg-blue-600 text-white"
                                                            : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"}`}>
                                                        {genre}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block mb-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                                        Language <span className="text-gray-400 font-normal">(optional)</span>
                                    </label>
                                    {refLoading ? <PillSkeleton count={4} /> : (
                                        <div className="flex flex-wrap gap-1.5">
                                            {languages.map((lang) => (
                                                <button type="button" key={lang}
                                                    onClick={() => setFormData({
                                                        ...formData,
                                                        language: formData.language === lang ? "" : lang,
                                                    })}
                                                    className={`px-3 py-1 rounded-full text-sm ${formData.language === lang
                                                        ? "bg-purple-600 text-white"
                                                        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"}`}>
                                                    {lang}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block mb-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                                        Location in house <span className="text-gray-400 font-normal">(optional)</span>
                                    </label>
                                    <input type="text" placeholder="e.g. Shelf 3, Row 2"
                                        value={formData.locationInHouse || ""}
                                        onChange={(e) => setFormData({ ...formData, locationInHouse: e.target.value })}
                                        maxLength={200}
                                        className="w-full px-3 py-2 rounded-lg border dark:bg-gray-700 dark:text-white text-sm" />
                                </div>

                                <div>
                                    <label className="block mb-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                                        Description <span className="text-gray-400 font-normal">(optional)</span>
                                    </label>
                                    <textarea placeholder="Add a note or description..."
                                        value={formData.description}
                                        onChange={(e) => {
                                            if (e.target.value.length <= 1000)
                                                setFormData({ ...formData, description: e.target.value });
                                        }}
                                        rows={3}
                                        className="w-full px-3 py-2 rounded-lg border dark:bg-gray-700 dark:text-white resize-none text-sm" />
                                    <p className="text-right text-xs text-gray-400 mt-0.5">
                                        {formData.description?.length || 0} / 1000
                                    </p>
                                </div>
                            </div>

                            <div className="px-6 py-5 space-y-5 border-t border-gray-200 dark:border-gray-700 md:border-t-0">

                                <div>
                                    <SectionLabel>Reading status</SectionLabel>
                                    <div className="flex flex-wrap gap-1.5">
                                        {STATUSES.map((s) => {
                                            const allowed = canTransitionTo(currentStatus ?? null, s);
                                            return (
                                                <button type="button" key={s} disabled={!allowed}
                                                    onClick={() => setFormData({ ...formData, userStatus: formData.userStatus === s ? null : s })}
                                                    title={!allowed ? `Cannot change from "${currentStatus}" to "${s}"` : undefined}
                                                    className={`px-3 py-1 rounded-full text-sm transition ${!allowed
                                                        ? "opacity-30 cursor-not-allowed bg-gray-100 dark:bg-gray-700 text-gray-500"
                                                        : formData.userStatus === s
                                                            ? STATUS_STYLES[s] + " ring-2 ring-offset-1 ring-current"
                                                            : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"}`}>
                                                    {STATUS_LABELS[s]}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {formData.userStatus && (currentStatus === null || currentStatus === "want to read") && (
                                        <button type="button" onClick={() => setFormData({ ...formData, userStatus: null })}
                                            className="mt-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline">
                                            Clear status
                                        </button>
                                    )}
                                    {currentStatus === "read" && (
                                        <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                                            Status is locked at "Read" and cannot be changed.
                                        </p>
                                    )}
                                </div>

                                {(formData.userStatus === "reading" || formData.userStatus === "read") && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block mb-1 text-xs font-medium text-gray-600 dark:text-gray-400">Started</label>
                                            <div className="flex items-center gap-1.5">
                                                <input type="date"
                                                    value={formData.startedAt ? new Date(formData.startedAt).toISOString().split("T")[0] : ""}
                                                    onChange={(e) => setFormData({ ...formData, startedAt: e.target.value || null })}
                                                    disabled={formData.startedAtLocked}
                                                    max={new Date().toISOString().split("T")[0]}
                                                    className="flex-1 min-w-0 px-2 py-1.5 rounded-lg border dark:bg-gray-700 dark:text-white text-xs disabled:opacity-50 disabled:cursor-not-allowed" />
                                                {formData.startedAtLocked && <Lock size={12} className="text-gray-400 shrink-0" />}
                                            </div>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {formData.startedAtLocked ? "Locked." : "Can only change once."}
                                            </p>
                                        </div>
                                        {formData.userStatus === "read" && (
                                            <div>
                                                <label className="block mb-1 text-xs font-medium text-gray-600 dark:text-gray-400">Finished</label>
                                                <div className="flex items-center gap-1.5">
                                                    <input type="date"
                                                        value={formData.finishedAt ? new Date(formData.finishedAt).toISOString().split("T")[0] : ""}
                                                        onChange={(e) => setFormData({ ...formData, finishedAt: e.target.value || null })}
                                                        disabled={formData.finishedAtLocked}
                                                        max={new Date().toISOString().split("T")[0]}
                                                        className="flex-1 min-w-0 px-2 py-1.5 rounded-lg border dark:bg-gray-700 dark:text-white text-xs disabled:opacity-50 disabled:cursor-not-allowed" />
                                                    {formData.finishedAtLocked && <Lock size={12} className="text-gray-400 shrink-0" />}
                                                </div>
                                                <p className="text-xs text-gray-400 mt-0.5">
                                                    {formData.finishedAtLocked ? "Locked." : "Can only change once."}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {formData.userStatus === "read" && (
                                    <div>
                                        <label className="block mb-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">Rating</label>
                                        <div className="flex items-center gap-0.5">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button key={star} type="button" disabled={isRatingLocked}
                                                    onClick={() => !isRatingLocked && setFormData({
                                                        ...formData,
                                                        rating: formData.rating === star ? null : star,
                                                    })}
                                                    className={`text-2xl transition-transform ${isRatingLocked ? "cursor-not-allowed" : "hover:scale-110"} ${formData.rating >= star ? "text-yellow-400" : "text-gray-300 dark:text-gray-600"}`}>
                                                    ★
                                                </button>
                                            ))}
                                            {formData.rating && !isRatingLocked && (
                                                <button type="button" onClick={() => setFormData({ ...formData, rating: null })}
                                                    className="ml-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline">
                                                    Clear
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                            {isRatingLocked ? "Rating has been set and cannot be changed." : "Once saved, your rating cannot be changed."}
                                        </p>
                                    </div>
                                )}

                                {/* My Note — edit mode only. Visible to all household members. */}
                                {isEditing && bookId && (
                                    <div>
                                        <SectionLabel>My Note</SectionLabel>
                                        <textarea
                                            placeholder="Your thoughts on this book — household members will see this..."
                                            value={noteText}
                                            onChange={(e) => {
                                                if (e.target.value.length <= 1000) {
                                                    setNoteText(e.target.value);
                                                    setNoteSaved(false);
                                                }
                                            }}
                                            rows={3}
                                            className="w-full px-3 py-2 rounded-lg border dark:bg-gray-700 dark:text-white resize-none text-sm"
                                        />
                                        <div className="flex items-center justify-between mt-1">
                                            <p className="text-xs text-gray-400">{noteText.length} / 1000 · visible to household members</p>
                                            <button
                                                type="button"
                                                disabled={noteSaving}
                                                onClick={async () => {
                                                    try {
                                                        setNoteSaving(true);
                                                        await upsertNote(bookId, noteText);
                                                        setNoteSaved(true);
                                                        setTimeout(() => setNoteSaved(false), 2000);
                                                    } catch {
                                                        // silent — toast handled in api wrapper
                                                    } finally {
                                                        setNoteSaving(false);
                                                    }
                                                }}
                                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
                                            >
                                                {noteSaving ? "Saving..." : noteSaved ? "Saved ✓" : "Save note"}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {isEditing && bookId && (
                                    <div>
                                        <SectionLabel>Series</SectionLabel>
                                        {refLoading ? <PillSkeleton count={2} /> : isAdmin ? (
                                            <>
                                                <div className="flex gap-2">
                                                    <select value={formData.seriesId || ""}
                                                        onChange={(e) => setFormData({ ...formData, seriesId: e.target.value || null })}
                                                        className="flex-1 px-3 py-2 rounded-lg border dark:bg-gray-700 dark:text-white text-sm">
                                                        <option value="">No series</option>
                                                        {seriesList.map((s) => (
                                                            <option key={s._id} value={s._id}>{s.name}</option>
                                                        ))}
                                                    </select>
                                                    {formData.seriesId && (
                                                        <input type="number" placeholder="#" min={1} max={9999}
                                                            value={formData.seriesOrder || ""}
                                                            onChange={(e) => setFormData({ ...formData, seriesOrder: e.target.value ? Number(e.target.value) : null })}
                                                            className="w-16 px-3 py-2 rounded-lg border dark:bg-gray-700 dark:text-white text-sm"
                                                            title="Book number in series" />
                                                    )}
                                                </div>
                                                {formData.seriesId && (
                                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                                        # sets the book's position in the series.
                                                    </p>
                                                )}
                                            </>
                                        ) : (
                                            formData.seriesId ? (
                                                <div className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
                                                    <p className="text-sm text-gray-700 dark:text-gray-300">
                                                        {seriesList.find((s) => s._id === formData.seriesId)?.name || "Series"}
                                                        {formData.seriesOrder && (
                                                            <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">· #{formData.seriesOrder}</span>
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Series is managed by an admin.</p>
                                                </div>
                                            ) : (
                                                <p className="text-xs text-gray-400 dark:text-gray-500 italic">Not part of a series.</p>
                                            )
                                        )}
                                    </div>
                                )}

                                <div>
                                    <SectionLabel>Sharing</SectionLabel>
                                    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
                                        <div>
                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Show on public page</p>
                                            <p className="text-xs text-gray-400 dark:text-gray-500">Anyone with your link can see this</p>
                                        </div>
                                        <button type="button"
                                            onClick={() => setFormData({ ...formData, isPublic: !formData.isPublic })}
                                            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${formData.isPublic ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"}`}>
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${formData.isPublic ? "translate-x-6" : "translate-x-1"}`} />
                                        </button>
                                    </div>
                                    {formData.isPublic && userId && <ModalPublicLink userId={userId} />}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 shrink-0">
                        <button type="button" onClick={onClose}
                            className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 dark:text-white text-sm hover:bg-gray-300 dark:hover:bg-gray-500">
                            Cancel
                        </button>
                        <button type="submit" disabled={refLoading}
                            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                            {isEditing ? "Update Book" : "Add Book"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}