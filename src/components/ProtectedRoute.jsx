import { useState, useEffect, useRef } from "react";
import { Navigate } from "react-router-dom";
import { getMe, refreshToken as apiRefreshToken, logout as apiLogout } from "../api";
import { SessionContext } from "./SessionContext";

const CHECK_INTERVAL_MS = 5 * 60 * 1000;  // check every 5 minutes
const WARNING_THRESHOLD_MS = 10 * 60 * 1000; // warn when < 10 minutes left

export default function ProtectedRoute({ children }) {
  const [status, setStatus] = useState("loading"); // loading | valid | invalid
  const [sessionWarning, setSessionWarning] = useState(false);
  const [msRemaining, setMsRemaining] = useState(null);
  const intervalRef = useRef(null);

  const checkSession = async () => {
    try {
      const { msRemaining } = await getMe();
      setMsRemaining(msRemaining);
      if (msRemaining <= 0) {
        setStatus("invalid");
      } else {
        setStatus("valid");
        setSessionWarning(msRemaining < WARNING_THRESHOLD_MS);
      }
    } catch {
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
      setSessionWarning(false);
      setMsRemaining(4 * 60 * 60 * 1000);
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