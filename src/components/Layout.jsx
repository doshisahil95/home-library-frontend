import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { LayoutDashboard, BookOpen, Compass, ChevronLeft, ChevronRight, Menu, X } from "lucide-react";
import toast from "react-hot-toast";
import { updateTheme as apiUpdateTheme } from "../api";
import { useSession } from "./SessionContext";

const NAV_ITEMS = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/books", label: "Books", icon: BookOpen },
  { path: "/discover", label: "Discover", icon: Compass },
];

// Defined outside Layout so it isn't re-created on every render.
// Receives only what it needs — no closure over Layout's full state.
function SidebarContent({ isCollapsed, currentPath }) {
  const linkClasses = (path) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${currentPath === path
      ? "bg-blue-600 text-white"
      : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
    }`;

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center gap-2 mb-6 px-1 ${isCollapsed ? "justify-center" : ""}`}>
        <span className="text-2xl leading-none">📚</span>
        {!isCollapsed && (
          <span className="text-lg font-bold text-gray-800 dark:text-gray-100 whitespace-nowrap">
            Home Library
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="space-y-1 flex-1">
        {NAV_ITEMS.map(({ path, label, icon: Icon }, idx) => (
          <div key={path}>
            <Link
              to={path}
              title={isCollapsed ? label : undefined}
              className={`${linkClasses(path)} ${isCollapsed ? "justify-center px-2" : ""}`}
            >
              <Icon size={18} className="shrink-0" />
              {!isCollapsed && <span className="text-sm font-medium">{label}</span>}
            </Link>
            {/* Separator between nav items */}
            {idx < NAV_ITEMS.length - 1 && (
              <hr className="my-2 border-gray-200 dark:border-gray-700" />
            )}
          </div>
        ))}
      </nav>
    </div>
  );
}

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userInitial, setUserInitial] = useState("?");
  const [theme, setTheme] = useState("light");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const dropdownRef = useRef(null);
  const { sessionWarning, msRemaining, extendSession, handleLogout: sessionLogout } = useSession();

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (user?.email) setUserInitial(user.email.charAt(0).toUpperCase());
      const savedTheme = user?.theme || "light";
      setTheme(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    } catch { /* ignore corrupt localStorage */ }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [dropdownOpen]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile sidebar is open
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

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">

      {/* ── Desktop Sidebar ──────────────────────────────────────────────── */}
      <aside
        className={`
          relative hidden md:flex flex-col flex-shrink-0
          bg-white dark:bg-gray-800 shadow-lg
          transition-all duration-300 ease-in-out
          ${collapsed ? "w-16 p-3" : "w-64 p-6"}
        `}
      >
        <SidebarContent isCollapsed={collapsed} currentPath={location.pathname} />

        {/* Collapse toggle — right edge, vertically centred, desktop only */}
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
        <SidebarContent isCollapsed={false} currentPath={location.pathname} />
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

          {/* Avatar + dropdown */}
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
                  onClick={() => { setSettingsOpen(true); setDropdownOpen(false); }}
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
        <Modal title="Settings" onClose={() => setSettingsOpen(false)}>
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

function Modal({ title, children, onClose }) {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">{title}</h2>
        {children}
        <button
          onClick={onClose}
          className="mt-6 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 px-4 py-2 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          Close
        </button>
      </div>
    </div>
  );
}