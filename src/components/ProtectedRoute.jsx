import { Navigate } from "react-router-dom";

// Decodes the JWT payload and checks expiry client-side.
// This is a UX optimisation — it catches expired tokens before they make a
// network call and redirects immediately. It is NOT a security control;
// the server's jwt.verify() in auth.middleware.js is the real gate.
function isTokenValid(token) {
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    // exp is in seconds; Date.now() is in milliseconds
    // Add a 30s buffer so tokens expiring imminently are treated as expired
    return payload.exp * 1000 > Date.now() + 30_000;
  } catch {
    return false; // malformed token
  }
}

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");

  if (!isTokenValid(token)) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return <Navigate to="/" replace />;
  }

  return children;
}