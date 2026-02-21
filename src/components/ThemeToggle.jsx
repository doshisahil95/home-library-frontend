export default function ThemeToggle({ darkMode, toggleDarkMode }) {
  return (
    <button
      onClick={toggleDarkMode}
      className="absolute top-5 right-5 px-4 py-2 rounded-lg 
      bg-gray-200 dark:bg-gray-700 
      text-gray-800 dark:text-gray-200 
      shadow transition"
    >
      {darkMode ? "☀ Light" : "🌙 Dark"}
    </button>
  );
}