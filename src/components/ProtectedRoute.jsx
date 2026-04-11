import { useState, useEffect, useRef } from "react";
import { Navigate } from "react-router-dom";
import toast from "react-hot-toast";
import { getMe, refreshToken as apiRefreshToken, logout as apiLogout } from "../api";
import { SessionContext } from "./SessionContext";

const CHECK_INTERVAL_MS = 5 * 60 * 1000;   // check every 5 minutes
const WARNING_THRESHOLD_MS = 10 * 60 * 1000; // warn when < 10 minutes left

export default function ProtectedRoute({ children }) {
  const [status, setStatus] = useState("loading"); // loading | valid | invalid
  const [sessionWarning, setSessionWarning] = useState(false);
  const [msRemaining, setMsRemaining] = useState(null);
  const intervalRef = useRef(null);

  // Tracks whether the expiry toast has already been shown this session —
  // prevents duplicate toasts if the component re-renders before redirect fires.
  const expiryToastShown = useRef(false);

  const checkSession = async () => {
    try {
      const { msRemaining } = await getMe();
      setMsRemaining(msRemaining);
      if (msRemaining <= 0) {
        if (!expiryToastShown.current) {
          expiryToastShown.current = true;
          toast.error("Your session has expired. Please log in again.", { duration: 4000 });
        }
        setStatus("invalid");
      } else {
        setStatus("valid");
        setSessionWarning(msRemaining < WARNING_THRESHOLD_MS);
      }
    } catch {
      // Network error or 401 — treat as expired
      if (!expiryToastShown.current) {
        expiryToastShown.current = true;
        toast.error("Your session has expired. Please log in again.", { duration: 4000 });
      }
      setStatus("invalid");
    }
  };

  useEffect(() => {
    checkSession();
    intervalRef.current = setInterval(checkSession, CHECK_INTERVAL_MS);
    return () => clearInterval(intervalRef.current);
  }, []);

  const extendSession = async () => {
    try {
      await apiRefreshToken();
      // Re-read actual expiry from server — works correctly regardless of JWT_EXPIRY value
      const { msRemaining } = await getMe();
      setMsRemaining(msRemaining);
      setSessionWarning(msRemaining < WARNING_THRESHOLD_MS);
    } catch {
      setStatus("invalid");
    }
  };

  const handleLogout = async () => {
    try { await apiLogout(); } catch { /* ignore */ }
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  if (status === "loading") {
    // Blank screen during the initial /me check — avoids flash of protected content
    return null;
  }

  if (status === "invalid") {
    localStorage.removeItem("user");
    return <Navigate to="/" replace />;
  }

  return (
    <SessionContext.Provider value={{ sessionWarning, msRemaining, extendSession, handleLogout }}>
      {children}
    </SessionContext.Provider>
  );
}