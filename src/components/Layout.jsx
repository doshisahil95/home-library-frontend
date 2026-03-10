import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { updateTheme as apiUpdateTheme } from "../api";

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userInitial, setUserInitial] = useState("?");
  const [theme, setTheme] = useState("light");

  // Ref used to detect clicks outside the avatar dropdown
  const dropdownRef = useRef(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));

    if (user?.email) {
      setUserInitial(user.email.charAt(0).toUpperCase());
    }

    const savedTheme = user?.theme || "light";
    setTheme(savedTheme);
    document.documentElement.classList.toggle("dark", savedTheme === "dark");
  }, []);

  // Close the dropdown when clicking anywhere outside it
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [dropdownOpen]);

  const toggleTheme = async () => {
    const newTheme = theme === "dark" ? "light" : "dark";

    try {
      await apiUpdateTheme(newTheme);

      document.documentElement.classList.toggle("dark", newTheme === "dark");

      // Read the stored user object safely — guard against null/corrupt data
      let user = {};
      try {
        user = JSON.parse(localStorage.getItem("user")) || {};
      } catch {
        user = {};
      }
      user.theme = newTheme;
      localStorage.setItem("user", JSON.stringify(user));

      setTheme(newTheme);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save theme preference.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  const linkClasses = (path) =>
    `block px-4 py-2 rounded-lg transition ${
      location.pathname === path
        ? "bg-blue-600 text-white"
        : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
    }`;

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-800 p-6 shadow-lg hidden md:block">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-8">
          📚 Home Library
        </h2>

        <nav className="space-y-2">
          <Link to="/dashboard" className={linkClasses("/dashboard")}>
            Dashboard
          </Link>

          <Link to="/books" className={linkClasses("/books")}>
            Books
          </Link>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col">
        {/* Top Navbar */}
        <header className="bg-white dark:bg-gray-800 shadow px-6 py-4 flex justify-between items-center">
          <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            Home Library System
          </h1>

          {/* Avatar + dropdown — ref attached here for outside-click detection */}
          <div className="relative" ref={dropdownRef}>
            <div
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center cursor-pointer font-bold select-none"
            >
              {userInitial}
            </div>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-2 z-50">
                <button
                  onClick={() => {
                    setSettingsOpen(true);
                    setDropdownOpen(false);
                  }}
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

        <main className="flex-1 p-6">
          <Outlet />
        </main>

        {/* SETTINGS MODAL */}
        {settingsOpen && (
          <Modal title="Settings" onClose={() => setSettingsOpen(false)}>
            <div className="space-y-6">
              <div>
                <h3 className="text-md font-semibold text-gray-800 dark:text-gray-100">
                  Appearance
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Choose how the application should look.
                </p>
              </div>

              <div className="flex items-center justify-between">
                <span
                  className={`text-sm font-medium ${
                    theme === "light"
                      ? "text-gray-900 dark:text-white"
                      : "text-gray-400"
                  }`}
                >
                  Light
                </span>

                <button
                  onClick={toggleTheme}
                  className={`relative inline-flex h-6 w-12 items-center rounded-full transition ${
                    theme === "dark" ? "bg-blue-600" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                      theme === "dark" ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>

                <span
                  className={`text-sm font-medium ${
                    theme === "dark"
                      ? "text-gray-900 dark:text-white"
                      : "text-gray-400"
                  }`}
                >
                  Dark
                </span>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    // Backdrop click closes the modal — consistent with books/delete modals
    <div
      className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">
          {title}
        </h2>

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