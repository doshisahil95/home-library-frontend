import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import {
    getAdminUsers,
    addAdminUser,
    changeUserRole,
    sendUserResetOTP,
    getGenres,
    getHouses,
    getLanguages,
    createReferenceItem,
    updateReferenceItem,
    deleteReferenceItem,
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

// ─── Password strength helpers ────────────────────────────────────────────────

function usePasswordChecks(password) {
    return {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        number: /\d/.test(password),
        special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };
}

function PasswordRules({ checks }) {
    const rules = [
        { key: "length", label: "At least 8 characters" },
        { key: "uppercase", label: "1 uppercase letter" },
        { key: "number", label: "1 number" },
        { key: "special", label: "1 special character" },
    ];
    return (
        <div className="space-y-1 mt-1">
            {rules.map(({ key, label }) => (
                <div key={key} className={`text-xs flex items-center gap-1.5 ${checks[key] ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                    <span>{checks[key] ? "✓" : "✗"}</span>
                    <span>{label}</span>
                </div>
            ))}
        </div>
    );
}

// ─── Add User Modal ───────────────────────────────────────────────────────────

function AddUserModal({ onClose, onAdded }) {
    const [form, setForm] = useState({ name: "", email: "", password: "", role: "user" });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const checks = usePasswordChecks(form.password);
    const isPasswordStrong = Object.values(checks).every(Boolean);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.name.trim() || !form.email.trim() || !form.password) {
            setError("All fields are required");
            return;
        }
        if (!isPasswordStrong) {
            setError("Password does not meet requirements");
            return;
        }
        setShowConfirm(true);
    };

    const handleConfirm = async () => {
        try {
            setLoading(true);
            setError("");
            await addAdminUser(form);
            toast.success(`User ${form.name} added`);
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
                    <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">Add User</h2>
                    {error && <div className="text-red-500 text-sm mb-3">{error}</div>}
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
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Password" value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                className="w-full px-4 py-2 pr-10 rounded-lg border dark:bg-gray-700 dark:text-white text-sm"
                            />
                            <button type="button" onClick={() => setShowPassword((p) => !p)}
                                className="absolute inset-y-0 right-3 flex items-center text-gray-400">
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        {form.password && <PasswordRules checks={checks} />}

                        {/* Role */}
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
                                {loading ? "Adding..." : "Add User"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {showConfirm && (
                <ConfirmModal
                    title="Add User"
                    message={`Add ${form.name} (${form.email}) as ${form.role}?`}
                    confirmLabel="Add User"
                    onConfirm={handleConfirm}
                    onClose={() => setShowConfirm(false)}
                />
            )}
        </>
    );
}

// ─── Reference data section ───────────────────────────────────────────────────

function ReferenceSection({ title, color, items, loading, onAdd, onEdit, onDelete }) {
    const [newName, setNewName] = useState("");
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState("");
    const [deleteTarget, setDeleteTarget] = useState(null);

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
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
            <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-4">{title}</h3>

            {loading ? (
                <div className="flex flex-wrap gap-2">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-7 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" style={{ width: `${56 + i * 12}px` }} />
                    ))}
                </div>
            ) : (
                <div className="flex flex-wrap gap-2 mb-4">
                    {items.map((item) => (
                        <div key={item._id} className="flex items-center gap-1">
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
                                        className="text-xs text-green-600 dark:text-green-400 hover:underline">Save</button>
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
                </div>
            )}

            {/* Add new */}
            <div className="flex gap-2">
                <input
                    type="text"
                    placeholder={`Add ${title.toLowerCase().replace("s", "")}...`}
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                    className="flex-1 px-3 py-1.5 rounded-lg border dark:bg-gray-700 dark:text-white text-sm"
                />
                <button onClick={handleAdd}
                    className={`px-4 py-1.5 rounded-lg text-white text-sm ${pillColors[color]} opacity-90 hover:opacity-100`}>
                    Add
                </button>
            </div>

            {deleteTarget && (
                <ConfirmModal
                    title={`Delete ${title.slice(0, -1)}`}
                    message={`Delete "${deleteTarget.name}"? This cannot be undone. If it is used by any books, deletion will be blocked.`}
                    confirmLabel="Delete"
                    confirmClass="bg-red-600 hover:bg-red-700"
                    onConfirm={() => onDelete(deleteTarget._id, deleteTarget.name)}
                    onClose={() => setDeleteTarget(null)}
                />
            )}
        </div>
    );
}

// ─── Main Admin page ──────────────────────────────────────────────────────────

export default function Admin() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("users");

    // ── Users ────────────────────────────────────────────────────────────
    const [users, setUsers] = useState([]);
    const [usersLoading, setUsersLoading] = useState(true);
    const [showAddUser, setShowAddUser] = useState(false);
    const [roleConfirm, setRoleConfirm] = useState(null); // { user, newRole }
    const [resetConfirm, setResetConfirm] = useState(null); // user

    // ── Reference data ───────────────────────────────────────────────────
    const [genres, setGenres] = useState([]);
    const [houses, setHouses] = useState([]);
    const [languages, setLanguages] = useState([]);
    const [refLoading, setRefLoading] = useState(true);

    // Guard — non-admin users who somehow land here get redirected
    useEffect(() => {
        try {
            const user = JSON.parse(localStorage.getItem("user"));
            if (user?.role !== "admin") navigate("/dashboard", { replace: true });
        } catch {
            navigate("/dashboard", { replace: true });
        }
    }, []);

    // Load users
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

    // Load reference data
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

    useEffect(() => {
        loadUsers();
        loadRefData();
    }, []);

    // ── User actions ─────────────────────────────────────────────────────

    const handleChangeRole = async (user) => {
        const newRole = user.role === "admin" ? "user" : "admin";
        setRoleConfirm({ user, newRole });
    };

    const confirmChangeRole = async () => {
        try {
            await changeUserRole(roleConfirm.user._id, roleConfirm.newRole);
            toast.success(`${roleConfirm.user.name} is now ${roleConfirm.newRole}`);
            loadUsers();
        } catch (err) {
            toast.error(err.message || "Failed to change role");
        }
    };

    const confirmSendResetOTP = async () => {
        try {
            await sendUserResetOTP(resetConfirm._id);
            toast.success(`Reset OTP sent to ${resetConfirm.email}`);
        } catch (err) {
            toast.error(err.message || "Failed to send OTP");
        }
    };

    // ── Reference data actions ────────────────────────────────────────────

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

    const currentUser = (() => {
        try { return JSON.parse(localStorage.getItem("user")); } catch { return null; }
    })();

    // ─── Tabs ─────────────────────────────────────────────────────────────────

    const tabs = [
        { id: "users", label: "Users" },
        { id: "refdata", label: "Reference Data" },
        { id: "reset", label: "Password Reset" },
    ];

    return (
        <div className="space-y-6">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 mt-4">Admin</h1>

            {/* Tab bar */}
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

            {/* ── Users tab ─────────────────────────────────────────────────────── */}
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
                                            return (
                                                <tr key={user._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                    <td className="px-6 py-4 text-gray-800 dark:text-gray-100 font-medium">
                                                        {user.name}
                                                        {isSelf && <span className="ml-2 text-xs text-blue-500">(you)</span>}
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{user.email}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${user.role === "admin"
                                                            ? "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300"
                                                            : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                                                            }`}>
                                                            {user.role}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{formatDate(user.createdAt)}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            disabled={isSelf}
                                                            onClick={() => handleChangeRole(user)}
                                                            title={isSelf ? "You cannot change your own role" : `Make ${user.role === "admin" ? "user" : "admin"}`}
                                                            className="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
                                                        >
                                                            Make {user.role === "admin" ? "User" : "Admin"}
                                                        </button>
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
                                        return (
                                            <div key={user._id} className="p-4 space-y-2">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <p className="font-medium text-gray-800 dark:text-gray-100">
                                                            {user.name}
                                                            {isSelf && <span className="ml-2 text-xs text-blue-500">(you)</span>}
                                                        </p>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                                                    </div>
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${user.role === "admin"
                                                        ? "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300"
                                                        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                                                        }`}>
                                                        {user.role}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-gray-400">{formatDate(user.createdAt)}</span>
                                                    <button
                                                        disabled={isSelf}
                                                        onClick={() => handleChangeRole(user)}
                                                        className="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
                                                    >
                                                        Make {user.role === "admin" ? "User" : "Admin"}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ── Reference Data tab ────────────────────────────────────────────── */}
            {activeTab === "refdata" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <ReferenceSection
                        title="Genres"
                        color="blue"
                        items={genres}
                        loading={refLoading}
                        onAdd={(name) => handleRefAdd("genres", name)}
                        onEdit={(id, name) => handleRefEdit("genres", id, name)}
                        onDelete={(id, name) => handleRefDelete("genres", id, name)}
                    />
                    <ReferenceSection
                        title="Houses"
                        color="green"
                        items={houses}
                        loading={refLoading}
                        onAdd={(name) => handleRefAdd("houses", name)}
                        onEdit={(id, name) => handleRefEdit("houses", id, name)}
                        onDelete={(id, name) => handleRefDelete("houses", id, name)}
                    />
                    <ReferenceSection
                        title="Languages"
                        color="purple"
                        items={languages}
                        loading={refLoading}
                        onAdd={(name) => handleRefAdd("languages", name)}
                        onEdit={(id, name) => handleRefEdit("languages", id, name)}
                        onDelete={(id, name) => handleRefDelete("languages", id, name)}
                    />
                </div>
            )}

            {/* ── Password Reset tab ────────────────────────────────────────────── */}
            {activeTab === "reset" && (
                <div className="space-y-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Send a password reset OTP to any user's registered email. The OTP is valid for 24 hours.
                    </p>

                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
                        {usersLoading ? (
                            <div className="p-6 space-y-3">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="h-10 rounded-lg bg-gray-100 dark:bg-gray-700 animate-pulse" />
                                ))}
                            </div>
                        ) : (
                            <>
                                {/* Desktop */}
                                <table className="hidden md:table w-full text-left text-sm">
                                    <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                                        <tr>
                                            <th className="px-6 py-3 font-medium">Name</th>
                                            <th className="px-6 py-3 font-medium">Email</th>
                                            <th className="px-6 py-3 font-medium text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {users.map((user) => {
                                            const isSelf = currentUser?.id === user._id?.toString();
                                            return (
                                                <tr key={user._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                    <td className="px-6 py-4 text-gray-800 dark:text-gray-100 font-medium">{user.name}</td>
                                                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{user.email}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            disabled={isSelf}
                                                            onClick={() => setResetConfirm(user)}
                                                            title={isSelf ? "Use the forgot password flow to reset your own password" : undefined}
                                                            className="px-3 py-1 text-xs bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                                        >
                                                            Send Reset OTP
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>

                                {/* Mobile */}
                                <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
                                    {users.map((user) => {
                                        const isSelf = currentUser?.id === user._id?.toString();
                                        return (
                                            <div key={user._id} className="p-4 flex items-center justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="font-medium text-gray-800 dark:text-gray-100 truncate">{user.name}</p>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                                                </div>
                                                <button
                                                    disabled={isSelf}
                                                    onClick={() => setResetConfirm(user)}
                                                    className="shrink-0 px-3 py-1 text-xs bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                                >
                                                    Send OTP
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ── Modals ─────────────────────────────────────────────────────────── */}

            {showAddUser && (
                <AddUserModal
                    onClose={() => setShowAddUser(false)}
                    onAdded={loadUsers}
                />
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

            {resetConfirm && (
                <ConfirmModal
                    title="Send Reset OTP"
                    message={`Send a 24-hour password reset OTP to ${resetConfirm.name} at ${resetConfirm.email}?`}
                    confirmLabel="Send OTP"
                    confirmClass="bg-amber-500 hover:bg-amber-600"
                    onConfirm={confirmSendResetOTP}
                    onClose={() => setResetConfirm(null)}
                />
            )}
        </div>
    );
}