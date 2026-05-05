import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
    updateTheme as apiUpdateTheme,
    updateProfile,
    makeAllPrivate,
    getPublicCount,
    getReadingGoal,
    setReadingGoal,
} from "../api";

function SectionCard({ title, description, children }) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 space-y-4">
            <div>
                <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">{title}</h2>
                {description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
            </div>
            {children}
        </div>
    );
}

export default function Settings() {
    const [theme, setTheme] = useState("light");
    const [userName, setUserName] = useState("");
    const [userId, setUserId] = useState("");
    const [publicCount, setPublicCount] = useState(null);
    const [makingPrivate, setMakingPrivate] = useState(false);

    // Name editing
    const [editingName, setEditingName] = useState(false);
    const [nameValue, setNameValue] = useState("");
    const [nameSaving, setNameSaving] = useState(false);
    const [nameError, setNameError] = useState("");

    // Reading goal
    const [goalData, setGoalData] = useState(null);
    const [goalValue, setGoalValue] = useState("");
    const [goalSaving, setGoalSaving] = useState(false);
    const [goalLoading, setGoalLoading] = useState(true);

    // Public link copy
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        try {
            const user = JSON.parse(localStorage.getItem("user"));
            if (user?.name) { setUserName(user.name); setNameValue(user.name); }
            if (user?.id) setUserId(user.id);
            const savedTheme = user?.theme || "light";
            setTheme(savedTheme);
            document.documentElement.classList.toggle("dark", savedTheme === "dark");
        } catch { }

        getPublicCount().then((res) => setPublicCount(res.count)).catch(() => { });
        getReadingGoal()
            .then((res) => {
                setGoalData(res.data);
                if (res.data?.goal) setGoalValue(String(res.data.goal.target));
            })
            .catch(() => { })
            .finally(() => setGoalLoading(false));
    }, []);

    const handleToggleTheme = async () => {
        const newTheme = theme === "dark" ? "light" : "dark";
        try {
            await apiUpdateTheme(newTheme);
            document.documentElement.classList.toggle("dark", newTheme === "dark");
            const user = JSON.parse(localStorage.getItem("user") || "{}");
            user.theme = newTheme;
            localStorage.setItem("user", JSON.stringify(user));
            setTheme(newTheme);
        } catch {
            toast.error("Failed to save theme preference");
        }
    };

    const handleSaveName = async () => {
        if (!nameValue.trim()) { setNameError("Name cannot be empty"); return; }
        setNameError("");
        if (nameValue.trim() === userName) { setEditingName(false); return; }
        try {
            setNameSaving(true);
            const res = await updateProfile({ name: nameValue.trim() });
            setUserName(res.name);
            const user = JSON.parse(localStorage.getItem("user") || "{}");
            user.name = res.name;
            localStorage.setItem("user", JSON.stringify(user));
            setEditingName(false);
            toast.success("Name updated");
        } catch (err) {
            toast.error(err.message || "Failed to update name");
        } finally {
            setNameSaving(false);
        }
    };

    const handleSaveGoal = async () => {
        const n = Number(goalValue);
        if (!Number.isInteger(n) || n < 1 || n > 9999) {
            toast.error("Goal must be a number between 1 and 9999");
            return;
        }
        try {
            setGoalSaving(true);
            const res = await setReadingGoal(n);
            setGoalData((prev) => ({ ...prev, goal: res.data }));
            toast.success("Reading goal saved");
        } catch (err) {
            toast.error(err.message || "Failed to save goal");
        } finally {
            setGoalSaving(false);
        }
    };

    const handleMakeAllPrivate = async () => {
        try {
            setMakingPrivate(true);
            const res = await makeAllPrivate();
            setPublicCount(0);
            toast.success(`${res.updated} ${res.updated === 1 ? "book" : "books"} made private`);
        } catch (err) {
            toast.error(err.message || "Failed to make books private");
        } finally {
            setMakingPrivate(false);
        }
    };

    const handleCopyLink = () => {
        const url = `${window.location.origin}/public/${userId}`;
        navigator.clipboard.writeText(url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const currentYear = new Date().getFullYear();
    const booksRead = goalData?.booksReadThisYear ?? 0;
    const goalTarget = goalData?.goal?.target;
    const goalPct = goalTarget ? Math.min(100, Math.round((booksRead / goalTarget) * 100)) : 0;

    return (
        <div className="space-y-6 max-w-2xl">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mt-4">Settings</h1>

            {/* Appearance */}
            <SectionCard title="Appearance" description="Choose how the app looks.">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Dark mode</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Toggle between light and dark theme</p>
                    </div>
                    <button
                        onClick={handleToggleTheme}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${theme === "dark" ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"}`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${theme === "dark" ? "translate-x-6" : "translate-x-1"}`} />
                    </button>
                </div>
            </SectionCard>

            {/* Profile */}
            <SectionCard title="Profile" description="Update your display name.">
                <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Display name</label>
                    {editingName ? (
                        <div className="space-y-2">
                            <div className="flex gap-2">
                                <input
                                    autoFocus
                                    value={nameValue}
                                    onChange={(e) => { setNameValue(e.target.value); setNameError(""); }}
                                    onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") setEditingName(false); }}
                                    maxLength={100}
                                    className={`flex-1 px-3 py-2 text-sm rounded-lg border dark:bg-gray-700 dark:text-white ${nameError ? "border-red-500" : ""}`}
                                />
                                <button onClick={handleSaveName} disabled={nameSaving}
                                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                                    {nameSaving ? "Saving..." : "Save"}
                                </button>
                                <button onClick={() => { setEditingName(false); setNameError(""); setNameValue(userName); }}
                                    className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-600 dark:text-white rounded-lg">
                                    Cancel
                                </button>
                            </div>
                            {nameError && <p className="text-xs text-red-500">{nameError}</p>}
                        </div>
                    ) : (
                        <div className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                            <span className="text-sm text-gray-800 dark:text-gray-100">{userName || "—"}</span>
                            <button onClick={() => { setNameValue(userName); setEditingName(true); }}
                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                                Edit
                            </button>
                        </div>
                    )}
                </div>
            </SectionCard>

            {/* Reading Goal */}
            <SectionCard title={`${currentYear} Reading Goal`} description="Set a target for how many books you want to read this year.">
                {goalLoading ? (
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                ) : (
                    <div className="space-y-4">
                        <div className="flex gap-2 items-center">
                            <input
                                type="number"
                                min={1}
                                max={9999}
                                value={goalValue}
                                onChange={(e) => setGoalValue(e.target.value)}
                                placeholder="e.g. 24"
                                className="w-28 px-3 py-2 text-sm rounded-lg border dark:bg-gray-700 dark:text-white"
                            />
                            <span className="text-sm text-gray-500 dark:text-gray-400">books in {currentYear}</span>
                            <button
                                onClick={handleSaveGoal}
                                disabled={goalSaving || !goalValue}
                                className="ml-auto px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                {goalSaving ? "Saving..." : goalTarget ? "Update goal" : "Set goal"}
                            </button>
                        </div>

                        {goalTarget && (
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                                    <span>{booksRead} of {goalTarget} books read</span>
                                    <span>{goalPct}%</span>
                                </div>
                                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                                    <div
                                        className={`h-2.5 rounded-full transition-all duration-500 ${booksRead >= goalTarget ? "bg-green-500" : "bg-blue-500"}`}
                                        style={{ width: `${goalPct}%` }}
                                    />
                                </div>
                                {booksRead >= goalTarget && (
                                    <p className="text-xs text-green-600 dark:text-green-400 font-medium">🎉 Goal reached!</p>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </SectionCard>

            {/* Public sharing */}
            <SectionCard title="Public Library" description="Share a link so others can view the books you've made public.">
                <div className="space-y-3">
                    {publicCount !== null && publicCount > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium">
                                {publicCount} {publicCount === 1 ? "book" : "books"} shared
                            </span>
                        </div>
                    )}
                    {userId && (
                        <div className="flex gap-2">
                            <input
                                readOnly
                                value={`${window.location.origin}/public/${userId}`}
                                className="flex-1 px-3 py-2 text-xs rounded-lg border bg-gray-50 dark:bg-gray-700 dark:text-gray-300 text-gray-600 truncate"
                            />
                            <button
                                onClick={handleCopyLink}
                                className="shrink-0 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                            >
                                {copied ? "Copied!" : "Copy"}
                            </button>
                        </div>
                    )}
                    {publicCount !== null && publicCount > 0 && (
                        <button
                            onClick={handleMakeAllPrivate}
                            disabled={makingPrivate}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition"
                        >
                            {makingPrivate ? "Making private..." : `Make all ${publicCount} ${publicCount === 1 ? "book" : "books"} private`}
                        </button>
                    )}
                    {publicCount === 0 && (
                        <p className="text-sm text-gray-400 dark:text-gray-500 italic">No books are currently shared publicly.</p>
                    )}
                </div>
            </SectionCard>
        </div>
    );
}