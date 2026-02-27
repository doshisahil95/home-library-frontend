import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();
  const API_BASE = "http://localhost:3000";

  const [mode, setMode] = useState("login"); 
  // "login" | "requestOTP" | "reset"

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const clearMessages = () => {
    setError("");
    setMessage("");
  };

  // LOGIN
  const handleLogin = async (e) => {
    e.preventDefault();
    clearMessages();

    if (!email || !password) {
      setError("Email and password required");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      localStorage.setItem("token", data.token);
      navigate("/books");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  // REQUEST OTP
  const handleSendOTP = async () => {
    clearMessages();

    if (!email) {
      setError("Enter your registered email");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`${API_BASE}/send-reset-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setMessage("OTP sent to your email.");
      setMode("reset");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // RESET PASSWORD
  const handleResetPassword = async () => {
    clearMessages();

    if (!otp || !newPassword) {
      setError("Enter OTP and new password");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`${API_BASE}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setMessage("Password reset successful. You can now login.");
      setMode("login");
      setOtp("");
      setNewPassword("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl space-y-6">
        <h1 className="text-2xl font-bold text-center text-gray-800 dark:text-gray-100">
          Home Library
        </h1>

        {error && <div className="text-red-500 text-sm text-center">{error}</div>}
        {message && <div className="text-green-500 text-sm text-center">{message}</div>}

        {/* LOGIN MODE */}
        {mode === "login" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:text-white"
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:text-white"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg"
            >
              {loading ? "Logging in..." : "Login"}
            </button>

            <div className="text-center text-sm text-blue-600 cursor-pointer"
                 onClick={() => setMode("requestOTP")}>
              Forgot Password?
            </div>
          </form>
        )}

        {/* REQUEST OTP MODE */}
        {mode === "requestOTP" && (
          <div className="space-y-4">
            <input
              type="email"
              placeholder="Enter your registered email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:text-white"
            />

            <button
              onClick={handleSendOTP}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg"
            >
              {loading ? "Sending..." : "Send OTP"}
            </button>

            <div className="text-center text-sm cursor-pointer"
                 onClick={() => setMode("login")}>
              Back to Login
            </div>
          </div>
        )}

        {/* RESET PASSWORD MODE */}
        {mode === "reset" && (
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:text-white"
            />

            <input
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:text-white"
            />

            <button
              onClick={handleResetPassword}
              disabled={loading}
              className="w-full bg-green-600 text-white py-2 rounded-lg"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}