import { Link, Outlet, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { LayoutDashboard, BookOpen, Compass, ShieldCheck, ChevronLeft, ChevronRight, Menu, X, Settings, BookMarked } from "lucide-react";
import toast from "react-hot-toast";
import { useSession } from "./SessionContext";

const NAV_ITEMS = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/books", label: "Books", icon: BookOpen },
  { path: "/discover", label: "Discover", icon: Compass },
  { path: "/wishlist", label: "Wishlist", icon: BookMarked },
  { path: "/settings", label: "Settings", icon: Settings },
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
        <span className={`text-lg font-bold text-gray-800 dark:text-gray-100 whitespace-nowrap transition-all duration-150 ${isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100 delay-150"}`}>
          Home Library
        </span>
      </div>

      {/* Nav */}
      <nav className="space-y-1 flex-1 px-2">
        {NAV_ITEMS.map(({ path, label, icon: Icon }, idx) => (
          <div key={path}>
            <Link to={path} title={isCollapsed ? label : undefined}
              className={`${linkClasses(path)} ${isCollapsed ? "justify-center px-2" : "px-4"}`}>
              <Icon size={18} className="shrink-0" />
              <span className={`text-sm font-medium whitespace-nowrap transition-all duration-150 ${isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100 delay-150"}`}>
                {label}
              </span>
            </Link>
            {idx < NAV_ITEMS.length - 1 && (
              <hr className="my-2 border-gray-200 dark:border-gray-700" />
            )}
          </div>
        ))}

        {/* Admin nav item */}
        {isAdmin && (
          <div>
            <hr className="my-2 border-gray-200 dark:border-gray-700" />
            <Link to="/admin" title={isCollapsed ? "Admin" : undefined}
              className={`${linkClasses("/admin")} ${isCollapsed ? "justify-center px-2" : "px-4"}`}>
              <ShieldCheck size={18} className="shrink-0" />
              <span className={`text-sm font-medium whitespace-nowrap transition-all duration-150 ${isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100 delay-150"}`}>
                Admin
              </span>
            </Link>
          </div>
        )}
      </nav>
    </div>
  );
}

export default function Layout() {
  const location = useLocation();
  const [userInitial, setUserInitial] = useState("?");
  const [userName, setUserName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { sessionWarning, msRemaining, extendSession, handleLogout: sessionLogout } = useSession();

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (user?.email) setUserInitial(user.email.charAt(0).toUpperCase());
      if (user?.name) setUserName(user.name);
      if (user?.role === "admin" || user?.role === "superadmin") setIsAdmin(true);
      const savedTheme = user?.theme || "light";
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    } catch { }
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    };
    if (dropdownOpen) document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [dropdownOpen]);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">

      {/* Desktop Sidebar */}
      <aside className={`relative hidden md:flex flex-col flex-shrink-0 bg-white dark:bg-gray-800 shadow-lg transition-all duration-300 ease-in-out ${collapsed ? "w-16" : "w-64"}`}>
        <SidebarContent isCollapsed={collapsed} currentPath={location.pathname} isAdmin={isAdmin} />
        <button
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-400 dark:hover:border-blue-500 transition-colors z-20"
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black bg-opacity-40 md:hidden" onClick={() => setMobileOpen(false)} />
      )}
      <aside className={`fixed top-0 left-0 h-full z-50 w-64 p-6 bg-white dark:bg-gray-800 shadow-xl transform transition-transform duration-300 ease-in-out md:hidden ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 p-1 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100">
          <X size={20} />
        </button>
        <SidebarContent isCollapsed={false} currentPath={location.pathname} isAdmin={isAdmin} />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white dark:bg-gray-800 shadow px-4 md:px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="md:hidden p-1 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
              <Menu size={22} />
            </button>
            <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Home Library</h1>
          </div>

          {/* Avatar — just log out now, settings is in nav */}
          <div className="relative" ref={dropdownRef}>
            <div onClick={() => setDropdownOpen((p) => !p)}
              className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center cursor-pointer font-bold select-none">
              {userInitial}
            </div>
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-2 z-50">
                <p className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 truncate">{userName}</p>
                <hr className="border-gray-200 dark:border-gray-700 my-1" />
                <button onClick={sessionLogout}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm">
                  🚪 Log Out
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Session warning */}
        {sessionWarning && (
          <div className="bg-amber-50 dark:bg-amber-900/40 border-b border-amber-200 dark:border-amber-700 px-4 py-2.5 flex items-center justify-between gap-4">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Your session expires in{" "}
              <span className="font-semibold">
                {Math.ceil((msRemaining || 0) / 60000)} minute{Math.ceil((msRemaining || 0) / 60000) !== 1 ? "s" : ""}
              </span>. Would you like to stay logged in?
            </p>
            <button onClick={extendSession}
              className="shrink-0 px-3 py-1 text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition">
              Stay logged in
            </button>
          </div>
        )}

        <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}