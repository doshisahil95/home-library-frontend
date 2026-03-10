import { Navigate } from "react-router-dom";

// Checks that a token exists AND has not expired.
// An expired token would pass a presence-only check, then cause 401 errors
// on every API call — this catches it early and redirects cleanly instead.
function isTokenValid(token) {
  if (!token) return false;

  try {
    // JWT payload is the second segment, base64url-encoded
    const payload = JSON.parse(atob(token.split(".")[1]));
    // exp is in seconds; Date.now() is in milliseconds
    return payload.exp * 1000 > Date.now();
  } catch {
    // Malformed token — treat as invalid
    return false;
  }
}

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");

  if (!isTokenValid(token)) {
    // Clear stale data so the login page starts fresh
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return <Navigate to="/" replace />;
  }

  return children;
}