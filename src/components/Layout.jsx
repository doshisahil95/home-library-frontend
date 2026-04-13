import { Link, Outlet, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { LayoutDashboard, BookOpen, Compass, ShieldCheck, ChevronLeft, ChevronRight, Menu, X } from "lucide-react";
import toast from "react-hot-toast";
import { updateTheme as apiUpdateTheme, updateProfile, makeAllPrivate, getPublicCount } from "../api";
import { useSession } from "./SessionContext";

const NAV_ITEMS = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/books", label: "Books", icon: BookOpen },
  { path: "/discover", label: "Discover", icon: Compass },
];

function SidebarContent({ isCollapsed, currentPath, isAdmin }) {
  const linkClasses = (path) =>
    `flex items-center gap-3 py-2 rounded-lg transition-colors ${currentPath === path
      ? "bg-blue-600 text-white"
      : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
    }`;

  return (
    <div className="flex flex-col h-full py-6">
      {/* Logo */}
      <div className={`flex items-center gap-2 mb-6 h-8 ${isCollapsed ? "justify-center px-2" : "px-4"}`}>
        <span className="text-2xl leading-none">📚</span>
        <span className={`text-lg font-bold text-gray-800 dark:text-gray-100 whitespace-nowrap transition-all duration-150 ${isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100 delay-150"
          }`}>
          Home Library
        </span>
      </div>

      {/* Nav */}
      <nav className="space-y-1 flex-1 px-2">
        {NAV_ITEMS.map(({ path, label, icon: Icon }, idx) => (
          <div key={path}>
            <Link
              to={path}
              title={isCollapsed ? label : undefined}
              className={`${linkClasses(path)} ${isCollapsed ? "justify-center px-2" : "px-4"}`}
            >
              <Icon size={18} className="shrink-0" />
              <span className={`text-sm font-medium whitespace-nowrap transition-all duration-150 ${isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100 delay-150"
                }`}>{label}</span>
            </Link>
            {idx < NAV_ITEMS.length - 1 && (
              <hr className="my-2 border-gray-200 dark:border-gray-700" />
            )}
          </div>
        ))}

        {/* Admin nav item — only visible to admins */}
        {isAdmin && (
          <div>
            <hr className="my-2 border-gray-200 dark:border-gray-700" />
            <Link
              to="/admin"
              title={isCollapsed ? "Admin" : undefined}
              className={`${linkClasses("/admin")} ${isCollapsed ? "justify-center px-2" : "px-4"}`}
            >
              <ShieldCheck size={18} className="shrink-0" />
              <span className={`text-sm font-medium whitespace-nowrap transition-all duration-150 ${isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100 delay-150"
                }`}>Admin</span>
            </Link>
          </div>
        )}
      </nav>
    </div>
  );
}

export default function Layout() {
  const location = useLocation();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userInitial, setUserInitial] = useState("?");
  const [userName, setUserName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState("");
  const [theme, setTheme] = useState("light");
  const [publicCount, setPublicCount] = useState(null);
  const [makingPrivate, setMakingPrivate] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const dropdownRef = useRef(null);
  const { sessionWarning, msRemaining, extendSession, handleLogout: sessionLogout } = useSession();

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (user?.email) setUserInitial(user.email.charAt(0).toUpperCase());
      if (user?.name) setUserName(user.name);
      if (user?.role === "admin" || user?.role === "superadmin") setIsAdmin(true);
      if (user?.id) setUserId(user.id);
      const savedTheme = user?.theme || "light";
      setTheme(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    } catch { /* ignore corrupt localStorage */ }
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [dropdownOpen]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const toggleTheme = async () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    try {
      await apiUpdateTheme(newTheme);
      document.documentElement.classList.toggle("dark", newTheme === "dark");
      let user = {};
      try { user = JSON.parse(localStorage.getItem("user")) || {}; } catch { user = {}; }
      user.theme = newTheme;
      localStorage.setItem("user", JSON.stringify(user));
      setTheme(newTheme);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save theme preference.");
    }
  };

  const handleLogout = () => sessionLogout();

  const handleOpenSettings = async () => {
    setSettingsOpen(true);
    setDropdownOpen(false);
    try {
      const res = await getPublicCount();
      setPublicCount(res.count);
    } catch { /* ignore */ }
  };

  const handleMakeAllPrivate = async () => {
    try {
      setMakingPrivate(true);
      const res = await makeAllPrivate();
      setPublicCount(0);
      toast.success(`${res.updated} book${res.updated === 1 ? "" : "s"} made private`);
    } catch (err) {
      toast.error(err.message || "Failed to make books private");
    } finally {
      setMakingPrivate(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">

      {/* ── Desktop Sidebar ──────────────────────────────────────────────── */}
      <aside
        className={`
          relative hidden md:flex flex-col flex-shrink-0
          bg-white dark:bg-gray-800 shadow-lg
          transition-all duration-300 ease-in-out
          ${collapsed ? "w-16" : "w-64"}
        `}
      >
        <SidebarContent isCollapsed={collapsed} currentPath={location.pathname} isAdmin={isAdmin} />

        <button
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="
            absolute -right-3 top-1/2 -translate-y-1/2
            w-6 h-6 rounded-full
            bg-white dark:bg-gray-800
            border border-gray-200 dark:border-gray-700
            shadow-sm flex items-center justify-center
            text-gray-500 dark:text-gray-400
            hover:text-blue-600 dark:hover:text-blue-400
            hover:border-blue-400 dark:hover:border-blue-500
            transition-colors z-20
          "
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </aside>

      {/* ── Mobile Sidebar Overlay ───────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full z-50 w-64 p-6
          bg-white dark:bg-gray-800 shadow-xl
          transform transition-transform duration-300 ease-in-out md:hidden
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 p-1 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100"
        >
          <X size={20} />
        </button>
        <SidebarContent isCollapsed={false} currentPath={location.pathname} isAdmin={isAdmin} />
      </aside>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top Navbar */}
        <header className="bg-white dark:bg-gray-800 shadow px-4 md:px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-1 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              <Menu size={22} />
            </button>
            <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              Home Library
            </h1>
          </div>

          <div className="relative" ref={dropdownRef}>
            <div
              onClick={() => setDropdownOpen((p) => !p)}
              className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center cursor-pointer font-bold select-none"
            >
              {userInitial}
            </div>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-2 z-50">
                <button
                  onClick={handleOpenSettings}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                >
                  ⚙️ Settings
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                >
                  🚪 Log Out
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Session warning banner */}
        {sessionWarning && (
          <div className="bg-amber-50 dark:bg-amber-900/40 border-b border-amber-200 dark:border-amber-700 px-4 py-2.5 flex items-center justify-between gap-4">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Your session expires in{" "}
              <span className="font-semibold">
                {Math.ceil((msRemaining || 0) / 60000)} minute{Math.ceil((msRemaining || 0) / 60000) !== 1 ? "s" : ""}
              </span>. Would you like to stay logged in?
            </p>
            <button
              onClick={extendSession}
              className="shrink-0 px-3 py-1 text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition"
            >
              Stay logged in
            </button>
          </div>
        )}

        <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
          <Outlet />
        </main>
      </div>

      {/* ── Settings Modal ────────────────────────────────────────────────── */}
      {settingsOpen && (
        <Modal title="Settings" onClose={() => setSettingsOpen(false)} userId={userId} userName={userName} setUserName={setUserName} publicCount={publicCount} onMakeAllPrivate={handleMakeAllPrivate} makingPrivate={makingPrivate}>
          <div className="space-y-6">
            <div>
              <h3 className="text-md font-semibold text-gray-800 dark:text-gray-100">Appearance</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Choose how the application should look.
              </p>
            </div>
            <div className="flex items-center justify-between">
              <span className={`text-sm font-medium ${theme === "light" ? "text-gray-900 dark:text-white" : "text-gray-400"}`}>
                Light
              </span>
              <button
                onClick={toggleTheme}
                className={`relative inline-flex h-6 w-12 items-center rounded-full transition ${theme === "dark" ? "bg-blue-600" : "bg-gray-300"}`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${theme === "dark" ? "translate-x-6" : "translate-x-1"}`} />
              </button>
              <span className={`text-sm font-medium ${theme === "dark" ? "text-gray-900 dark:text-white" : "text-gray-400"}`}>
                Dark
              </span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Name editor ─────────────────────────────────────────────────────────────

function NameEditor({ userName, setUserName }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(userName || "");
  const [saving, setSaving] = useState(false);

  const [nameError, setNameError] = useState("");

  const handleSave = async () => {
    if (!value.trim()) { setNameError("Name cannot be empty"); return; }
    setNameError("");
    if (value.trim() === userName) { setEditing(false); return; }
    try {
      setSaving(true);
      const res = await updateProfile({ name: value.trim() });
      setUserName(res.name);
      try {
        const user = JSON.parse(localStorage.getItem("user")) || {};
        user.name = res.name;
        localStorage.setItem("user", JSON.stringify(user));
      } catch { /* ignore */ }
      setEditing(false);
      toast.success("Name updated");
    } catch (err) {
      toast.error(err.message || "Failed to update name");
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <>
        <div className="flex items-center gap-2">
          <input
            autoFocus
            value={value}
            onChange={(e) => { setValue(e.target.value); setNameError(""); }}
            maxLength={100}
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
            className={`flex-1 px-3 py-1.5 text-sm rounded-lg border dark:bg-gray-700 dark:text-white ${nameError ? "border-red-500" : ""}`}
          />
          <button onClick={handleSave} disabled={saving}
            className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {saving ? "Saving..." : "Save"}
          </button>
          <button onClick={() => { setEditing(false); setNameError(""); }}
            className="px-3 py-1.5 text-xs bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100 rounded-lg">
            Cancel
          </button>
        </div>
        {nameError && <p className="text-xs text-red-500 mt-1">{nameError}</p>}
      </>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-700 dark:text-gray-300">{userName || "—"}</span>
      <button onClick={() => { setValue(userName || ""); setEditing(true); }}
        className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
        Edit
      </button>
    </div>
  );
}

// ─── Public link copy ─────────────────────────────────────────────────────────

function PublicLinkCopy({ userId }) {
  const [copied, setCopied] = useState(false);
  const url = userId ? `${window.location.origin}/public/${userId}` : "";

  const handleCopy = () => {
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!userId) return null;

  return (
    <div className="flex items-center gap-2">
      <input
        readOnly
        value={url}
        className="flex-1 px-3 py-1.5 text-xs rounded-lg border bg-gray-50 dark:bg-gray-700 dark:text-gray-300 text-gray-600 truncate"
      />
      <button
        onClick={handleCopy}
        className="shrink-0 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

// ─── Settings modal ───────────────────────────────────────────────────────────

function Modal({ title, children, onClose, userId, userName, setUserName, publicCount, onMakeAllPrivate, makingPrivate }) {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">{title}</h2>
        {children}

        {/* Name edit */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Display Name</h3>
          <NameEditor userName={userName} setUserName={setUserName} />
        </div>

        {/* Public sharing section */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Public Library Link</h3>
            {publicCount !== null && publicCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium">
                {publicCount} book{publicCount === 1 ? "" : "s"} shared
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Share this link so others can view the books you've made public.
          </p>
          <PublicLinkCopy userId={userId} />
          {publicCount !== null && publicCount > 0 && (
            <button
              onClick={onMakeAllPrivate}
              disabled={makingPrivate}
              className="mt-2 w-full px-3 py-2 text-sm rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition"
            >
              {makingPrivate ? "Making private..." : `Make all ${publicCount} book${publicCount === 1 ? "" : "s"} private`}
            </button>
          )}
        </div>

        <button
          onClick={onClose}
          className="mt-4 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 px-4 py-2 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          Close
        </button>
      </div>
    </div>
  );
}