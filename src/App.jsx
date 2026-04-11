import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Discover from "./pages/Discover";
import Books from "./pages/Books";
import Admin from "./pages/Admin";
import PublicBooks from "./pages/PublicBooks";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { background: "#333", color: "#fff" },
        }}
      >
        {(t) => (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span>{t.message}</span>
            <button
              onClick={() => toast.dismiss(t.id)}
              style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: "16px", lineHeight: 1, opacity: 0.7, padding: "0 2px" }}
            >
              ×
            </button>
          </div>
        )}
      </Toaster>

      <Routes>
        {/* Public */}
        <Route path="/" element={<Login />} />

        {/* Protected — Layout wraps all authenticated pages */}
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/books" element={<Books />} />
          <Route path="/admin" element={<Admin />} />

          {/* Any unknown protected path falls back to dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>

        {/* Public book sharing page — no auth required */}
        <Route path="/public/:userId" element={<PublicBooks />} />

        {/* Any unknown public path falls back to login */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;