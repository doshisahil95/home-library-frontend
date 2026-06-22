import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";

import toast from "react-hot-toast";
import {
    getAdminUsers,
    addAdminUser,
    changeUserRole,
    deleteAdminUser,
    approvePasswordReset,
    revokePasswordReset,
    getGenres,
    getHouses,
    getLanguages,
    createReferenceItem,
    updateReferenceItem,
    deleteReferenceItem,
    validateCSV,
    importCSV,
    downloadSampleCSV,
    validateRefCSV,
    importRefCSV,
    downloadSampleRefCSV,
    exportRefCSV,
    getSeries,
    createSeries,
    updateSeries,
    deleteSeries,
    exportBooksCSV,
} from "../api";

// ─── Shared helpers ───────────────────────────────────────────────────────────

function formatDate(dateStr) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString(undefined, {
        day: "numeric", month: "short", year: "numeric",
    });
}

// ─── Confirmation dialog ──────────────────────────────────────────────────────

function ConfirmModal({ title, message, confirmLabel = "Confirm", confirmClass = "bg-blue-600 hover:bg-blue-700", onConfirm, onClose }) {
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 px-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-bold mb-3 text-gray-800 dark:text-gray-100">{title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">{message}</p>
                <div className="flex justify-end gap-3">
                    <button onClick={onClose}
                        className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 dark:text-white text-sm">
                        Cancel
                    </button>
                    <button onClick={() => { onConfirm(); onClose(); }}
                        className={`px-4 py-2 rounded-lg text-white text-sm ${confirmClass}`}>
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Add User Modal ───────────────────────────────────────────────────────────

function AddUserModal({ onClose, onAdded }) {
    const [form, setForm] = useState({ name: "", email: "", role: "user" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const roleLabel = form.role === "admin" ? "Admin" : "User";

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.name.trim() || !form.email.trim()) {
            setError("Name and email are required");
            return;
        }
        setShowConfirm(true);
    };

    const handleConfirm = async () => {
        try {
            setLoading(true);
            setError("");
            await addAdminUser(form);
            toast.success(`${roleLabel} ${form.name} added. They can set their password on first login.`);
            onAdded();
            onClose();
        } catch (err) {
            setError(err.message || "Failed to add user");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 px-4" onClick={onClose}>
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
                    <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">Add {roleLabel}</h2>
                    {error && <div className="text-red-500 text-sm mb-3">{error}</div>}
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        The new {roleLabel.toLowerCase()} will set their own password when they first log in.
                    </p>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <input
                            type="text" placeholder="Full name" value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:text-white text-sm"
                        />
                        <input
                            type="email" placeholder="Email address" value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:text-white text-sm"
                        />
                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
                            <div className="flex gap-2">
                                {["user", "admin"].map((r) => (
                                    <button key={r} type="button"
                                        onClick={() => setForm({ ...form, role: r })}
                                        className={`px-4 py-1.5 rounded-full text-sm capitalize ${form.role === r
                                            ? "bg-blue-600 text-white"
                                            : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                                            }`}>
                                        {r}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button type="button" onClick={onClose}
                                className="px-4 py-2 rounded-lg bg-gray-300 dark:bg-gray-600 dark:text-white text-sm">
                                Cancel
                            </button>
                            <button type="submit" disabled={loading}
                                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm disabled:opacity-50">
                                {loading ? "Adding..." : `Add ${roleLabel}`}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {showConfirm && (
                <ConfirmModal
                    title={`Add ${roleLabel}`}
                    message={`Add ${form.name} (${form.email}) as ${form.role === "admin" ? "an admin" : "a user"}?`}
                    confirmLabel={`Add ${roleLabel}`}
                    onConfirm={handleConfirm}
                    onClose={() => setShowConfirm(false)}
                />
            )}
        </>
    );
}

// ─── Reference data CSV import modal ─────────────────────────────────────────
// Handles validate-then-import flow for a single-column name CSV.
// type is "genres" | "languages".

function RefCSVImportModal({ type, onClose, onImported }) {
    const label = type === "genres" ? "Genres" : type === "houses" ? "Houses" : "Languages";
    const [csvText, setCsvText] = useState("");
    const [fileName, setFileName] = useState("");
    const fileInputRef = useRef(null);

    const [phase, setPhase] = useState("idle"); // idle | validated | imported
    const [validResult, setValidResult] = useState(null);
    const [importResult, setImportResult] = useState(null);
    const [validating, setValidating] = useState(false);
    const [importing, setImporting] = useState(false);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.name.endsWith(".csv")) { toast.error("Please upload a .csv file"); return; }
        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (ev) => {
            setCsvText(ev.target.result);
            setPhase("idle");
            setValidResult(null);
            setImportResult(null);
        };
        reader.readAsText(file);
    };

    const handleValidate = async () => {
        if (!csvText) { toast.error("Please upload a CSV file first"); return; }
        try {
            setValidating(true);
            const result = await validateRefCSV(type, csvText);
            setValidResult(result);
            setPhase("validated");
        } catch (err) {
            toast.error(err.message || "Validation failed");
        } finally {
            setValidating(false);
        }
    };

    const handleImport = async () => {
        if (!csvText) return;
        try {
            setImporting(true);
            const result = await importRefCSV(type, csvText);
            setImportResult(result);
            setPhase("imported");
            if (result.added > 0) {
                toast.success(`${result.added} ${type} imported`);
                onImported();
            }
        } catch (err) {
            toast.error(err.message || "Import failed");
        } finally {
            setImporting(false);
        }
    };

    const handleReset = () => {
        setCsvText("");
        setFileName("");
        setPhase("idle");
        setValidResult(null);
        setImportResult(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 px-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Import {label} from CSV</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none">×</button>
                </div>

                {/* Format hint */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 text-xs text-gray-500 dark:text-gray-400 mb-4 border border-gray-200 dark:border-gray-600">
                    <p className="font-semibold text-gray-600 dark:text-gray-300 mb-1">CSV Format</p>
                    <p>Single column with header <code className="bg-gray-200 dark:bg-gray-600 px-1 rounded">name</code>, one entry per row. Max 200 rows.</p>
                    <p className="mt-1">Entries already in the database are skipped automatically — not errors.</p>
                </div>

                <div className="space-y-3">
                    {/* File upload + sample download */}
                    <div className="flex gap-2">
                        <label className="flex-1 flex flex-col items-center justify-center h-24 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition bg-white dark:bg-gray-800">
                            <span className="text-xl">📄</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {fileName ? fileName : "Click to upload CSV"}
                            </span>
                            {fileName && <span className="text-xs text-green-600 dark:text-green-400">File loaded</span>}
                            <input type="file" accept=".csv" className="hidden" onChange={handleFileChange} ref={fileInputRef} />
                        </label>
                        <button
                            onClick={() => downloadSampleRefCSV(type)}
                            className="shrink-0 px-3 py-2 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition self-stretch flex items-center"
                        >
                            ↓ Sample
                        </button>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 flex-wrap">
                        <button
                            onClick={handleValidate}
                            disabled={!csvText || validating || importing}
                            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            {validating ? "Validating..." : "Validate"}
                        </button>
                        {phase === "validated" && validResult?.validCount > 0 && (
                            <button
                                onClick={handleImport}
                                disabled={importing}
                                className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700 disabled:opacity-50 transition"
                            >
                                {importing ? "Importing..." : `Import ${validResult.validCount} ${type}`}
                            </button>
                        )}
                        {phase !== "idle" && (
                            <button
                                onClick={handleReset}
                                className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100 text-sm hover:bg-gray-300 dark:hover:bg-gray-500 transition"
                            >
                                Reset
                            </button>
                        )}
                    </div>

                    {/* Validation result */}
                    {phase === "validated" && validResult && (
                        <div className="space-y-2">
                            <div className="flex flex-wrap gap-2">
                                {validResult.validCount > 0 && (
                                    <div className="flex-1 min-w-0 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-3 py-2">
                                        <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                                            ✓ {validResult.validCount} new {type} ready to import
                                        </p>
                                    </div>
                                )}
                                {validResult.skippedCount > 0 && (
                                    <div className="flex-1 min-w-0 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2">
                                        <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                                            ↷ {validResult.skippedCount} already exist — will be skipped
                                        </p>
                                    </div>
                                )}
                                {validResult.errorCount > 0 && (
                                    <div className="flex-1 min-w-0 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2">
                                        <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                                            ✗ {validResult.errorCount} rows with errors
                                        </p>
                                    </div>
                                )}
                                {validResult.validCount === 0 && validResult.skippedCount === 0 && validResult.errorCount === 0 && (
                                    <div className="flex-1 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">No rows found in file</p>
                                    </div>
                                )}
                            </div>
                            <RefErrorList errors={validResult.errors} />
                        </div>
                    )}

                    {/* Import result */}
                    {phase === "imported" && importResult && (
                        <div className="space-y-2">
                            <div className="flex flex-wrap gap-2">
                                {importResult.added > 0 && (
                                    <div className="flex-1 min-w-0 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-3 py-2">
                                        <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                                            ✓ {importResult.added} {type} imported successfully
                                        </p>
                                    </div>
                                )}
                                {importResult.skipped > 0 && (
                                    <div className="flex-1 min-w-0 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2">
                                        <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                                            ↷ {importResult.skipped} skipped (already existed)
                                        </p>
                                    </div>
                                )}
                                {importResult.errorCount > 0 && (
                                    <div className="flex-1 min-w-0 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2">
                                        <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                                            ✗ {importResult.errorCount} rows not imported
                                        </p>
                                    </div>
                                )}
                            </div>
                            <RefErrorList errors={importResult.errors} />
                        </div>
                    )}
                </div>

                <div className="mt-5 flex justify-end">
                    <button onClick={onClose}
                        className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100 text-sm hover:bg-gray-300 dark:hover:bg-gray-500">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

function RefErrorList({ errors }) {
    if (!errors || errors.length === 0) return null;
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Errors</p>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-48 overflow-y-auto">
                {errors.map((err, i) => (
                    <div key={i} className="px-3 py-2 flex items-center gap-3">
                        <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">Row {err.row}</span>
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate">{err.name}</span>
                        <span className="text-xs text-red-600 dark:text-red-400 ml-auto shrink-0">{err.reason}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Reference data section ───────────────────────────────────────────────────
// All three types (genres, houses, languages) support CSV import and export.

function ReferenceSection({ title, type, color, items, loading, onAdd, onEdit, onDelete, onImported }) {
    const [newName, setNewName] = useState("");
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState("");
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [showImport, setShowImport] = useState(false);
    const [exporting, setExporting] = useState(false);

    const handleAdd = () => {
        if (!newName.trim()) return;
        onAdd(newName.trim());
        setNewName("");
    };

    const handleEditSave = (id) => {
        if (!editName.trim()) return;
        onEdit(id, editName.trim());
        setEditingId(null);
        setEditName("");
    };

    const pillColors = {
        green: "bg-green-600",
        blue: "bg-blue-600",
        purple: "bg-purple-600",
    };

    return (
        <>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                {/* Section header */}
                <div className="flex items-center justify-between mb-4 gap-2">
                    <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200 min-w-0 truncate">{title}</h3>
                    <div className="flex gap-1.5 shrink-0">
                        <button
                            onClick={() => setShowImport(true)}
                            className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition whitespace-nowrap"
                        >
                            ↑ Import
                        </button>
                        <button
                            onClick={async () => {
                                try {
                                    setExporting(true);
                                    await exportRefCSV(type);
                                } catch (err) {
                                    toast.error(err.message || "Export failed");
                                } finally {
                                    setExporting(false);
                                }
                            }}
                            disabled={exporting || items.length === 0}
                            className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition whitespace-nowrap"
                        >
                            {exporting ? "Exporting…" : "↓ Export"}
                        </button>
                    </div>
                </div>

                {/* Pills */}
                {loading ? (
                    <div className="flex flex-wrap gap-2 mb-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-7 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" style={{ width: `${56 + i * 12}px` }} />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-2 mb-4">
                        {items.map((item) => (
                            <div key={item._id}>
                                {editingId === item._id ? (
                                    <div className="flex items-center gap-1">
                                        <input
                                            autoFocus
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") handleEditSave(item._id);
                                                if (e.key === "Escape") { setEditingId(null); setEditName(""); }
                                            }}
                                            className="px-2 py-0.5 rounded-lg border text-sm w-28 dark:bg-gray-700 dark:text-white"
                                        />
                                        <button onClick={() => handleEditSave(item._id)}
                                            className="text-xs text-green-600 dark:text-green-400 hover:underline whitespace-nowrap">Save</button>
                                        <button onClick={() => { setEditingId(null); setEditName(""); }}
                                            className="text-xs text-gray-400 hover:underline">Cancel</button>
                                    </div>
                                ) : (
                                    <span className={`inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full text-sm text-white ${pillColors[color]}`}>
                                        {item.name}
                                        <button onClick={() => { setEditingId(item._id); setEditName(item.name); }}
                                            className="opacity-70 hover:opacity-100 text-xs leading-none" title="Edit">✎</button>
                                        <button onClick={() => setDeleteTarget(item)}
                                            className="opacity-70 hover:opacity-100 text-xs leading-none" title="Delete">×</button>
                                    </span>
                                )}
                            </div>
                        ))}
                        {items.length === 0 && !loading && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 italic">No {title.toLowerCase()} yet</p>
                        )}
                    </div>
                )}

                {/* Add new — constrained width so input doesn't stretch on mobile */}
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder={`Add ${title.toLowerCase().replace(/s$/, "")}...`}
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                        className="min-w-0 flex-1 px-3 py-1.5 rounded-lg border dark:bg-gray-700 dark:text-white text-sm"
                    />
                    <button
                        onClick={handleAdd}
                        className={`shrink-0 px-4 py-1.5 rounded-lg text-white text-sm ${pillColors[color]} opacity-90 hover:opacity-100`}
                    >
                        Add
                    </button>
                </div>

                {deleteTarget && (
                    <ConfirmModal
                        title={`Delete ${title.replace(/s$/, "")}`}
                        message={`Delete "${deleteTarget.name}"? This cannot be undone. If it is used by any books, deletion will be blocked.`}
                        confirmLabel="Delete"
                        confirmClass="bg-red-600 hover:bg-red-700"
                        onConfirm={() => onDelete(deleteTarget._id, deleteTarget.name)}
                        onClose={() => setDeleteTarget(null)}
                    />
                )}
            </div>

            {showImport && (
                <RefCSVImportModal
                    type={type}
                    onClose={() => setShowImport(false)}
                    onImported={() => { onImported(); }}
                />
            )}
        </>
    );
}

// ─── Series Tab ───────────────────────────────────────────────────────────────
// Admin+ only. Create, edit, delete series. Books are linked from the Books page.

function SeriesTab({ series, loading, onRefresh }) {
    const [showAdd, setShowAdd] = useState(false);
    const [editTarget, setEditTarget] = useState(null);    // series object being edited
    const [deleteTarget, setDeleteTarget] = useState(null); // series object to confirm delete
    const [form, setForm] = useState({ name: "", description: "" });
    const [formError, setFormError] = useState("");
    const [saving, setSaving] = useState(false);

    const openAdd = () => {
        setForm({ name: "", description: "" });
        setFormError("");
        setShowAdd(true);
        setEditTarget(null);
    };

    const openEdit = (s) => {
        setForm({ name: s.name, description: s.description || "" });
        setFormError("");
        setEditTarget(s);
        setShowAdd(true);
    };

    const handleSave = async () => {
        if (!form.name.trim()) { setFormError("Series name is required"); return; }
        try {
            setSaving(true);
            setFormError("");
            if (editTarget) {
                await updateSeries(editTarget._id, form);
                toast.success("Series updated");
            } else {
                await createSeries(form);
                toast.success(`Series "${form.name}" created`);
            }
            setShowAdd(false);
            onRefresh();
        } catch (err) {
            setFormError(err.message || "Failed to save");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (s) => {
        try {
            await deleteSeries(s._id);
            toast.success(`"${s.name}" deleted — all linked books have been unlinked`);
            onRefresh();
        } catch (err) {
            toast.error(err.message || "Failed to delete");
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <button
                    onClick={openAdd}
                    className="shrink-0 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                    + New Series
                </button>
            </div>

            {/* Add / Edit form */}
            {showAdd && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg border border-gray-200 dark:border-gray-700 space-y-3">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                        {editTarget ? `Edit "${editTarget.name}"` : "New Series"}
                    </h3>
                    {formError && <p className="text-sm text-red-500">{formError}</p>}
                    <input
                        autoFocus
                        type="text"
                        placeholder="Series name"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        maxLength={200}
                        className="w-full px-3 py-2 rounded-lg border dark:bg-gray-700 dark:text-white text-sm"
                    />
                    <textarea
                        placeholder="Description (optional)"
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        rows={2}
                        maxLength={1000}
                        className="w-full px-3 py-2 rounded-lg border dark:bg-gray-700 dark:text-white text-sm resize-none"
                    />
                    <div className="flex gap-2 justify-end">
                        <button
                            onClick={() => setShowAdd(false)}
                            className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100 text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50"
                        >
                            {saving ? "Saving..." : editTarget ? "Update" : "Create"}
                        </button>
                    </div>
                </div>
            )}

            {/* Series list */}
            {loading ? (
                <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-16 rounded-2xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
                    ))}
                </div>
            ) : series.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center shadow-lg">
                    <p className="text-gray-400 dark:text-gray-500 text-sm">No series yet. Create one to get started.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {series.map((s) => (
                        <div key={s._id} className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-lg">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="font-semibold text-gray-800 dark:text-gray-100">{s.name}</h3>
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                                            {s.totalCount} {s.totalCount === 1 ? "book" : "books"}
                                        </span>
                                    </div>
                                    {s.description && (
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">{s.description}</p>
                                    )}
                                    {s.books.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {s.books.slice(0, 5).map((b) => (
                                                <span key={b._id} className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">
                                                    {b.order ? `${b.order}. ` : ""}{b.title}
                                                </span>
                                            ))}
                                            {s.books.length > 5 && (
                                                <span className="text-xs text-gray-400 dark:text-gray-500 self-center">
                                                    +{s.books.length - 5} more
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <button
                                        onClick={() => openEdit(s)}
                                        className="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => setDeleteTarget(s)}
                                        className="px-3 py-1 text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-800"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {deleteTarget && (
                <ConfirmModal
                    title="Delete Series"
                    message={`Delete "${deleteTarget.name}"? This cannot be undone. ${deleteTarget.totalCount > 0 ? `${deleteTarget.totalCount} book${deleteTarget.totalCount === 1 ? "" : "s"} will be unlinked from this series.` : ""}`}
                    confirmLabel="Delete"
                    confirmClass="bg-red-600 hover:bg-red-700"
                    onConfirm={() => handleDelete(deleteTarget)}
                    onClose={() => setDeleteTarget(null)}
                />
            )}
        </div>
    );
}

// ─── CSV Import Tab (book import) ─────────────────────────────────────────────

function CSVImportTab() {
    const [csvText, setCsvText] = useState("");
    const [fileName, setFileName] = useState("");
    const fileInputRef = useRef(null);
    const [stopOnError, setStopOnError] = useState(false);
    const [validating, setValidating] = useState(false);
    const [importing, setImporting] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [phase, setPhase] = useState("idle");
    const [validResult, setValidResult] = useState(null);
    const [importResult, setImportResult] = useState(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.name.endsWith(".csv")) { toast.error("Please upload a .csv file"); return; }
        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (ev) => {
            setCsvText(ev.target.result);
            setPhase("idle");
            setValidResult(null);
            setImportResult(null);
        };
        reader.readAsText(file);
    };

    const handleValidate = async () => {
        if (!csvText) { toast.error("Please upload a CSV file first"); return; }
        try {
            setValidating(true);
            const result = await validateCSV(csvText);
            setValidResult(result);
            setPhase("validated");
        } catch (err) {
            toast.error(err.message || "Validation failed");
        } finally {
            setValidating(false);
        }
    };

    const handleImport = async () => {
        if (!csvText) return;
        try {
            setImporting(true);
            const result = await importCSV(csvText, stopOnError);
            setImportResult(result);
            setPhase("imported");
            if (result.added > 0) toast.success(`${result.added} book${result.added === 1 ? "" : "s"} imported`);
        } catch (err) {
            toast.error(err.message || "Import failed");
        } finally {
            setImporting(false);
        }
    };

    const handleExport = async () => {
        try {
            setExporting(true);
            await exportBooksCSV();
            toast.success("Export downloaded");
        } catch (err) {
            toast.error(err.message || "Export failed");
        } finally {
            setExporting(false);
        }
    };

    const handleReset = () => {
        setCsvText("");
        setFileName("");
        setPhase("idle");
        setValidResult(null);
        setImportResult(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    return (
        <div className="space-y-5 max-w-3xl">
            <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                    <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Bulk Import Books</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        Upload a CSV file to add multiple books at once. Validate first, then import.
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        Importing does not remove existing books — new rows are appended. Duplicates (same title and author) are skipped.
                    </p>
                </div>
                <div className="flex gap-2 shrink-0">
                    <button
                        onClick={handleExport}
                        disabled={exporting}
                        className="shrink-0 px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                        {exporting ? "Exporting…" : "↓ Export Current Books"}
                    </button>
                    <button
                        onClick={downloadSampleCSV}
                        className="shrink-0 px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                    >
                        ↓ Sample CSV
                    </button>
                </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-xs text-gray-500 dark:text-gray-400 space-y-1 border border-gray-200 dark:border-gray-600">
                <p className="font-semibold text-gray-600 dark:text-gray-300 mb-2">CSV Format</p>
                <p><span className="font-medium">Required:</span> title, author, house, genre</p>
                <p><span className="font-medium">Optional:</span> language, locationInHouse, description, makePublic</p>
                <p><span className="font-medium">Multiple genres:</span> separate with semicolon — e.g. <code className="bg-gray-200 dark:bg-gray-600 px-1 rounded">Fiction;Fantasy</code></p>
                <p><span className="font-medium">makePublic:</span> set to <code className="bg-gray-200 dark:bg-gray-600 px-1 rounded">true</code> to show the book on your public page</p>
                <p><span className="font-medium">Max rows:</span> 500 per upload</p>
            </div>

            <div className="space-y-3">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition bg-white dark:bg-gray-800">
                    <div className="flex flex-col items-center gap-1">
                        <span className="text-2xl">📄</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            {fileName ? fileName : "Click to upload CSV"}
                        </span>
                        {fileName && <span className="text-xs text-green-600 dark:text-green-400">File loaded</span>}
                    </div>
                    <input type="file" accept=".csv" className="hidden" onChange={handleFileChange} ref={fileInputRef} />
                </label>

                <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Stop on first error</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            When on, import stops at the first invalid row. When off, errors are skipped.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setStopOnError((v) => !v)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${stopOnError ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"}`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${stopOnError ? "translate-x-6" : "translate-x-1"}`} />
                    </button>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={handleValidate}
                        disabled={!csvText || validating || importing}
                        className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                        {validating ? "Validating..." : "Validate"}
                    </button>
                    {phase === "validated" && validResult?.validCount > 0 && (
                        <button
                            onClick={handleImport}
                            disabled={importing}
                            className="px-5 py-2 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700 disabled:opacity-50 transition"
                        >
                            {importing ? "Importing..." : `Confirm & Import ${validResult.validCount} book${validResult.validCount === 1 ? "" : "s"}`}
                        </button>
                    )}
                    {phase !== "idle" && (
                        <button
                            onClick={handleReset}
                            className="px-5 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100 text-sm hover:bg-gray-300 dark:hover:bg-gray-500 transition"
                        >
                            Reset
                        </button>
                    )}
                </div>
            </div>

            {phase === "validated" && validResult && (
                <div className="space-y-3">
                    <div className="flex gap-3">
                        {validResult.validCount > 0 && (
                            <div className="flex-1 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3">
                                <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                                    ✓ {validResult.validCount} row{validResult.validCount === 1 ? "" : "s"} ready to import
                                </p>
                            </div>
                        )}
                        {validResult.errorCount > 0 && (
                            <div className="flex-1 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
                                <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                                    ✗ {validResult.errorCount} row{validResult.errorCount === 1 ? "" : "s"} with errors
                                </p>
                            </div>
                        )}
                        {validResult.validCount === 0 && validResult.errorCount === 0 && (
                            <div className="flex-1 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3">
                                <p className="text-sm text-gray-500 dark:text-gray-400">No rows found in file</p>
                            </div>
                        )}
                    </div>
                    <BookErrorList errors={validResult.errors} />
                </div>
            )}

            {phase === "imported" && importResult && (
                <div className="space-y-3">
                    <div className="flex gap-3">
                        {importResult.added > 0 && (
                            <div className="flex-1 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3">
                                <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                                    ✓ {importResult.added} book{importResult.added === 1 ? "" : "s"} imported successfully
                                </p>
                            </div>
                        )}
                        {importResult.errorCount > 0 && (
                            <div className="flex-1 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
                                <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                                    ✗ {importResult.errorCount} row{importResult.errorCount === 1 ? "" : "s"} not imported
                                    {importResult.stoppedEarly && " — stopped early"}
                                </p>
                            </div>
                        )}
                    </div>
                    <BookErrorList errors={importResult.errors} />
                </div>
            )}
        </div>
    );
}

function BookErrorList({ errors }) {
    if (!errors || errors.length === 0) return null;
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Error Details</p>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-72 overflow-y-auto">
                {errors.map((err, i) => (
                    <div key={i} className="px-4 py-3 space-y-1">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                            Row {err.row}
                            {err.title && err.title !== "(no title)" && (
                                <span className="font-normal text-gray-500 dark:text-gray-400"> — {err.title}</span>
                            )}
                        </p>
                        {err.reasons.map((r, j) => (
                            <p key={j} className="text-xs text-red-600 dark:text-red-400 ml-2">• {r}</p>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function Admin() {
    const navigate = useNavigate();
    const currentUser = (() => {
        try { return JSON.parse(localStorage.getItem("user")); } catch { return null; }
    })();
    const isSuperAdmin = currentUser?.role === "superadmin";
    const [activeTab, setActiveTab] = useState(isSuperAdmin ? "users" : "refdata");

    const [users, setUsers] = useState([]);
    const [usersLoading, setUsersLoading] = useState(true);
    const [showAddUser, setShowAddUser] = useState(false);
    const [roleConfirm, setRoleConfirm] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [approveConfirm, setApproveConfirm] = useState(null);
    const [revokeConfirm, setRevokeConfirm] = useState(null);

    const [genres, setGenres] = useState([]);
    const [houses, setHouses] = useState([]);
    const [languages, setLanguages] = useState([]);
    const [refLoading, setRefLoading] = useState(true);

    const [seriesList, setSeriesList] = useState([]);
    const [seriesLoading, setSeriesLoading] = useState(false);

    useEffect(() => {
        try {
            const user = JSON.parse(localStorage.getItem("user"));
            if (user?.role !== "admin" && user?.role !== "superadmin") navigate("/dashboard", { replace: true });
        } catch {
            navigate("/dashboard", { replace: true });
        }
    }, []);

    const loadUsers = useCallback(async () => {
        try {
            setUsersLoading(true);
            const res = await getAdminUsers();
            setUsers(res.data);
        } catch (err) {
            toast.error(err.message || "Failed to load users");
        } finally {
            setUsersLoading(false);
        }
    }, []);

    const loadRefData = useCallback(async () => {
        try {
            setRefLoading(true);
            const [g, h, l] = await Promise.all([getGenres(), getHouses(), getLanguages()]);
            setGenres(g.data);
            setHouses(h.data);
            setLanguages(l.data);
        } catch (err) {
            toast.error(err.message || "Failed to load reference data");
        } finally {
            setRefLoading(false);
        }
    }, []);

    const loadSeriesData = useCallback(async () => {
        try {
            setSeriesLoading(true);
            const res = await getSeries();
            setSeriesList(res.data);
        } catch (err) {
            toast.error(err.message || "Failed to load series");
        } finally {
            setSeriesLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isSuperAdmin) loadUsers();
        loadRefData();
        loadSeriesData();
    }, []);

    const handleChangeRole = (user) => {
        const newRole = user.role === "admin" ? "user" : "admin";
        setRoleConfirm({ user, newRole });
    };

    const confirmChangeRole = async () => {
        try {
            await changeUserRole(roleConfirm.user._id, roleConfirm.newRole);
            const article = roleConfirm.newRole === "admin" ? "an" : "a";
            toast.success(`${roleConfirm.user.name} is now ${article} ${roleConfirm.newRole}.`);
            loadUsers();
        } catch (err) {
            toast.error(err.message || "Failed to change role");
        }
    };

    const confirmDeleteUser = async () => {
        try {
            await deleteAdminUser(deleteConfirm._id);
            toast.success(`${deleteConfirm.name} has been removed`);
            loadUsers();
        } catch (err) {
            toast.error(err.message || "Failed to delete user");
        }
    };

    const confirmApproveReset = async () => {
        try {
            await approvePasswordReset(approveConfirm._id);
            toast.success(`Password reset approved for ${approveConfirm.name}`);
            loadUsers();
        } catch (err) {
            toast.error(err.message || "Failed to approve reset");
        }
    };

    const confirmRevokeReset = async () => {
        try {
            await revokePasswordReset(revokeConfirm._id);
            toast.success(`Reset approval revoked for ${revokeConfirm.name}`);
            loadUsers();
        } catch (err) {
            toast.error(err.message || "Failed to revoke reset");
        }
    };

    const handleRefAdd = async (type, name) => {
        try {
            await createReferenceItem(type, name);
            toast.success(`Added "${name}"`);
            loadRefData();
        } catch (err) {
            toast.error(err.message || "Failed to add");
        }
    };

    const handleRefEdit = async (type, id, name) => {
        try {
            await updateReferenceItem(type, id, name);
            toast.success("Updated");
            loadRefData();
        } catch (err) {
            toast.error(err.message || "Failed to update");
        }
    };

    const handleRefDelete = async (type, id, name) => {
        try {
            await deleteReferenceItem(type, id);
            toast.success(`Deleted "${name}"`);
            loadRefData();
        } catch (err) {
            toast.error(err.message || "Failed to delete");
        }
    };

    const tabs = [
        ...(isSuperAdmin ? [{ id: "users", label: "Users" }] : []),
        { id: "refdata", label: "Reference Data" },
        { id: "csv", label: "Bulk Import" },
    ];

    return (
        <div className="space-y-6">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 mt-4">Admin</h1>

            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === tab.id
                            ? "bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm"
                            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ── Users tab ──────────────────────────────────────────────────────── */}
            {activeTab === "users" && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
                            All Users <span className="text-sm font-normal text-gray-400">({users.length})</span>
                        </h2>
                        <button onClick={() => setShowAddUser(true)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">
                            + Add User
                        </button>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
                        {usersLoading ? (
                            <div className="p-6 space-y-3">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="h-10 rounded-lg bg-gray-100 dark:bg-gray-700 animate-pulse" />
                                ))}
                            </div>
                        ) : (
                            <>
                                {/* Desktop table */}
                                <table className="hidden md:table w-full text-left text-sm">
                                    <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                                        <tr>
                                            <th className="px-6 py-3 font-medium">Name</th>
                                            <th className="px-6 py-3 font-medium">Email</th>
                                            <th className="px-6 py-3 font-medium">Role</th>
                                            <th className="px-6 py-3 font-medium">Joined</th>
                                            <th className="px-6 py-3 font-medium text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {users.map((user) => {
                                            const isSelf = currentUser?.id === user._id?.toString();
                                            const isSuperAdminUser = user.role === "superadmin";
                                            const hasPendingReset = user.passwordResetApproved === true;
                                            return (
                                                <tr key={user._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                    <td className="px-6 py-4 text-gray-800 dark:text-gray-100 font-medium">
                                                        {user.name}
                                                        {isSelf && <span className="ml-2 text-xs text-blue-500">(you)</span>}
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{user.email}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${isSuperAdminUser
                                                            ? "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"
                                                            : user.role === "admin"
                                                                ? "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300"
                                                                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                                                            }`}>
                                                            {user.role}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{formatDate(user.createdAt)}</td>
                                                    <td className="px-6 py-4">
                                                        {isSuperAdminUser ? (
                                                            <span className="text-xs text-gray-400 dark:text-gray-500 italic w-full text-center block">Protected</span>
                                                        ) : (
                                                            <div className="flex items-center justify-end gap-2 flex-wrap">
                                                                <button
                                                                    disabled={isSelf}
                                                                    onClick={() => handleChangeRole(user)}
                                                                    title={isSelf ? "You cannot change your own role" : `Make ${user.role === "admin" ? "User" : "Admin"}`}
                                                                    className="w-24 px-3 py-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-30 disabled:cursor-not-allowed text-center"
                                                                >
                                                                    {`Make ${user.role === "admin" ? "User" : "Admin"}`}
                                                                </button>
                                                                {hasPendingReset ? (
                                                                    <button
                                                                        onClick={() => setRevokeConfirm(user)}
                                                                        className="px-3 py-1 text-xs bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-800"
                                                                    >
                                                                        Revoke Reset
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        disabled={isSelf}
                                                                        onClick={() => setApproveConfirm(user)}
                                                                        title={isSelf ? "Use forgot password to reset your own" : "Approve password reset"}
                                                                        className="px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 disabled:opacity-30 disabled:cursor-not-allowed"
                                                                    >
                                                                        Approve Reset
                                                                    </button>
                                                                )}
                                                                <button
                                                                    disabled={isSelf}
                                                                    onClick={() => setDeleteConfirm(user)}
                                                                    title={isSelf ? "You cannot delete your own account" : "Remove user"}
                                                                    className="px-3 py-1 text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-800 disabled:opacity-30 disabled:cursor-not-allowed"
                                                                >
                                                                    Remove
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>

                                {/* Mobile cards */}
                                <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
                                    {users.map((user) => {
                                        const isSelf = currentUser?.id === user._id?.toString();
                                        const isSuperAdminUser = user.role === "superadmin";
                                        const hasPendingReset = user.passwordResetApproved === true;
                                        return (
                                            <div key={user._id} className="p-4 space-y-3">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <p className="font-medium text-gray-800 dark:text-gray-100">
                                                            {user.name}
                                                            {isSelf && <span className="ml-2 text-xs text-blue-500">(you)</span>}
                                                        </p>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                                                        <p className="text-xs text-gray-400 mt-0.5">{formatDate(user.createdAt)}</p>
                                                    </div>
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${isSuperAdminUser
                                                        ? "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"
                                                        : user.role === "admin"
                                                            ? "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300"
                                                            : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                                                        }`}>
                                                        {user.role}
                                                    </span>
                                                </div>
                                                {!isSuperAdminUser && (
                                                    <div className="flex flex-wrap gap-2">
                                                        <button
                                                            disabled={isSelf}
                                                            onClick={() => handleChangeRole(user)}
                                                            className="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
                                                        >
                                                            {`Make ${user.role === "admin" ? "User" : "Admin"}`}
                                                        </button>
                                                        {hasPendingReset ? (
                                                            <button onClick={() => setRevokeConfirm(user)}
                                                                className="px-3 py-1 text-xs bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 rounded-lg">
                                                                Revoke Reset
                                                            </button>
                                                        ) : (
                                                            <button disabled={isSelf} onClick={() => setApproveConfirm(user)}
                                                                className="px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed">
                                                                Approve Reset
                                                            </button>
                                                        )}
                                                        <button disabled={isSelf} onClick={() => setDeleteConfirm(user)}
                                                            className="px-3 py-1 text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed">
                                                            Remove
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ── Reference Data tab ─────────────────────────────────────────────── */}
            {activeTab === "refdata" && (
                <div className="space-y-8">
                    {/* Genres / Houses / Languages */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <ReferenceSection
                            title="Genres" type="genres" color="blue"
                            items={genres} loading={refLoading}
                            onAdd={(name) => handleRefAdd("genres", name)}
                            onEdit={(id, name) => handleRefEdit("genres", id, name)}
                            onDelete={(id, name) => handleRefDelete("genres", id, name)}
                            onImported={loadRefData}
                        />
                        <ReferenceSection
                            title="Houses" type="houses" color="green"
                            items={houses} loading={refLoading}
                            onAdd={(name) => handleRefAdd("houses", name)}
                            onEdit={(id, name) => handleRefEdit("houses", id, name)}
                            onDelete={(id, name) => handleRefDelete("houses", id, name)}
                            onImported={loadRefData}
                        />
                        <ReferenceSection
                            title="Languages" type="languages" color="purple"
                            items={languages} loading={refLoading}
                            onAdd={(name) => handleRefAdd("languages", name)}
                            onEdit={(id, name) => handleRefEdit("languages", id, name)}
                            onDelete={(id, name) => handleRefDelete("languages", id, name)}
                            onImported={loadRefData}
                        />
                    </div>

                    {/* Series — full-width section below */}
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex-1 border-t border-gray-200 dark:border-gray-700" />
                            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Series</span>
                            <div className="flex-1 border-t border-gray-200 dark:border-gray-700" />
                        </div>
                        <SeriesTab
                            series={seriesList}
                            loading={seriesLoading}
                            onRefresh={loadSeriesData}
                        />
                    </div>
                </div>
            )}

            {/* ── Bulk Import tab ────────────────────────────────────────────────── */}
            {activeTab === "csv" && <CSVImportTab />}

            {/* ── Modals ─────────────────────────────────────────────────────────── */}

            {showAddUser && (
                <AddUserModal onClose={() => setShowAddUser(false)} onAdded={loadUsers} />
            )}

            {roleConfirm && (
                <ConfirmModal
                    title="Change Role"
                    message={`Change ${roleConfirm.user.name}'s role from "${roleConfirm.user.role}" to "${roleConfirm.newRole}"?`}
                    confirmLabel="Change Role"
                    onConfirm={confirmChangeRole}
                    onClose={() => setRoleConfirm(null)}
                />
            )}

            {deleteConfirm && (
                <ConfirmModal
                    title="Remove User"
                    message={`Remove ${deleteConfirm.name} (${deleteConfirm.email})? Their books will be kept but all their reading data, statuses and public sharing will be removed. This cannot be undone.`}
                    confirmLabel="Remove User"
                    confirmClass="bg-red-600 hover:bg-red-700"
                    onConfirm={confirmDeleteUser}
                    onClose={() => setDeleteConfirm(null)}
                />
            )}

            {approveConfirm && (
                <ConfirmModal
                    title="Approve Password Reset"
                    message={`Allow ${approveConfirm.name} to reset their password? They can set a new password from the login page. You can revoke this at any time.`}
                    confirmLabel="Approve Reset"
                    confirmClass="bg-blue-600 hover:bg-blue-700"
                    onConfirm={confirmApproveReset}
                    onClose={() => setApproveConfirm(null)}
                />
            )}

            {revokeConfirm && (
                <ConfirmModal
                    title="Revoke Reset Approval"
                    message={`Revoke the password reset approval for ${revokeConfirm.name}? They will no longer be able to reset their password until you approve again.`}
                    confirmLabel="Revoke"
                    confirmClass="bg-amber-500 hover:bg-amber-600"
                    onConfirm={confirmRevokeReset}
                    onClose={() => setRevokeConfirm(null)}
                />
            )}
        </div>
    );
}