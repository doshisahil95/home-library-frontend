import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster, toast, ToastBar } from "react-hot-toast";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Discover from "./pages/Discover";
import Books from "./pages/Books";
import Admin from "./pages/Admin";
import Settings from "./pages/Settings";
import Wishlist from "./pages/Wishlist";
import PublicBooks from "./pages/PublicBooks";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }}>
        {(t) => {
          const bg =
            t.type === "success" ? "#166534" :
              t.type === "error" ? "#991b1b" :
                "#1f2937";
          return (
            <ToastBar toast={t} style={{ background: bg, color: "#fff", padding: 0 }}>
              {({ icon, message }) => (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px", background: bg, color: "#fff", borderRadius: "8px", width: "100%" }}>
                  {icon}
                  {message}
                  <button
                    onClick={() => toast.dismiss(t.id)}
                    style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: "18px", lineHeight: 1, opacity: 0.6, padding: "0", marginLeft: "auto", flexShrink: 0 }}
                  >
                    ×
                  </button>
                </div>
              )}
            </ToastBar>
          );
        }}
      </Toaster>

      <Routes>
        <Route path="/" element={<Login />} />

        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/books" element={<Books />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>

        <Route path="/public/:userId" element={<PublicBooks />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;