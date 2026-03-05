import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
} from "lucide-react";

export default function Login() {
  const navigate = useNavigate();

  const API_BASE =
    import.meta.env.VITE_API_BASE ||
    "http://localhost:3000";

  const [mode, setMode] = useState("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] =
    useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [error, setError] = useState("");
  const [message, setMessage] =
    useState("");

  const [loginLoading, setLoginLoading] =
    useState(false);
  const [resetLoading, setResetLoading] =
    useState(false);
  const [resendLoading, setResendLoading] =
    useState(false);

  const [showPassword, setShowPassword] =
    useState(false);
  const [showNewPassword, setShowNewPassword] =
    useState(false);
  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [resendTimer, setResendTimer] =
    useState(30);
  const [resendAttempts, setResendAttempts] =
    useState(0);
  const [canResend, setCanResend] =
    useState(false);

  const clearMessages = () => {
    setError("");
    setMessage("");
  };

  const validateEmail = (value) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  // ==========================
  // PASSWORD RULES
  // ==========================
  const passwordChecks = {
    length: newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    number: /\d/.test(newPassword),
    special:
      /[!@#$%^&*(),.?":{}|<>]/.test(
        newPassword
      ),
  };

  const strengthScore =
    Object.values(passwordChecks).filter(
      Boolean
    ).length;

  const passwordsMatch =
    confirmPassword.length > 0 &&
    confirmPassword === newPassword;

  const isStrongPassword =
    strengthScore === 4 && passwordsMatch;

  const canResetPassword =
    otp.trim().length > 0 &&
    isStrongPassword &&
    !resetLoading;

  const getStrengthColor = () => {
    if (!newPassword)
      return "bg-gray-300 dark:bg-gray-500";
    if (strengthScore <= 1)
      return "bg-red-500";
    if (strengthScore <= 3)
      return "bg-yellow-500";
    return "bg-green-500";
  };

  const getStrengthWidth = () =>
    `${(strengthScore / 4) * 100}%`;

  // ==========================
  // OTP TIMER
  // ==========================
  useEffect(() => {
    if (!canResend && resendAttempts > 0) {
      if (resendTimer === 0) {
        setCanResend(true);
        return;
      }

      const timer = setTimeout(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);

      return () =>
        clearTimeout(timer);
    }
  }, [
    resendTimer,
    resendAttempts,
    canResend,
  ]);

  // ==========================
  // RESEND OTP
  // ==========================
  const handleResendOTP = async () => {
    if (resendAttempts >= 3) return;

    try {
      setResendLoading(true);

      const res = await fetch(
        `${API_BASE}/send-reset-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            email,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message);

      setMessage("OTP resent.");
      setResendAttempts(
        (prev) => prev + 1
      );
      setResendTimer(30);
      setCanResend(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setResendLoading(false);
    }
  };

  // ==========================
  // LOGIN
  // ==========================
  const handleLogin = async (e) => {
    e.preventDefault();
    clearMessages();

    if (!validateEmail(email)) {
      setError(
        "Please enter a valid email address."
      );
      return;
    }

    if (!password) {
      setError("Password required");
      return;
    }

    try {
      setLoginLoading(true);

      const res = await fetch(
        `${API_BASE}/login`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok)
        throw new Error(data.message);

      localStorage.setItem(
        "token",
        data.token
      );
      localStorage.setItem(
        "user",
        JSON.stringify(data.user)
      );

      navigate("/dashboard");
    } catch (err) {
      setError(
        err.message ||
        "Login failed"
      );
    } finally {
      setLoginLoading(false);
    }
  };

  // ==========================
  // REQUEST OTP
  // ==========================
  const handleSendOTP = async () => {
    clearMessages();

    if (!validateEmail(email)) {
      setError(
        "Please enter a valid registered email."
      );
      return;
    }

    try {
      setLoginLoading(true);

      const res = await fetch(
        `${API_BASE}/send-reset-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            email,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok)
        throw new Error(data.message);

      setMessage(
        "OTP sent to your email."
      );

      setMode("reset");
      setResendAttempts(1);
      setResendTimer(30);
      setCanResend(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  // ==========================
  // RESET PASSWORD
  // ==========================
  const handleResetPassword =
    async () => {
      clearMessages();

      if (
        !otp ||
        !newPassword ||
        !confirmPassword
      ) {
        setError(
          "All fields required."
        );
        return;
      }

      if (!isStrongPassword) {
        setError(
          "Password must meet all requirements and match."
        );
        return;
      }

      try {
        setResetLoading(true);

        const res = await fetch(
          `${API_BASE}/reset-password`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              email,
              otp,
              newPassword,
            }),
          }
        );

        const data = await res.json();

        if (!res.ok)
          throw new Error(data.message);

        setMessage(
          "Password reset successful."
        );

        setMode("login");
        setOtp("");
        setNewPassword("");
        setConfirmPassword("");
      } catch (err) {
        setError(err.message);
      } finally {
        setResetLoading(false);
      }
    };

  const RuleItem = ({ valid, text }) => (
    <div className="flex items-center gap-2 text-xs">
      {valid ? (
        <CheckCircle
          size={16}
          className="text-green-500"
        />
      ) : (
        <XCircle
          size={16}
          className="text-red-500"
        />
      )}
      <span
        className={
          valid
            ? "text-green-500"
            : "text-red-500"
        }
      >
        {text}
      </span>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl space-y-6">

        <h1 className="text-2xl font-bold text-center text-gray-800 dark:text-gray-100">
          Home Library
        </h1>

        {error && (
          <div className="text-red-500 text-sm text-center">
            {error}
          </div>
        )}

        {message && (
          <div className="text-green-500 text-sm text-center">
            {message}
          </div>
        )}

        {mode === "login" && (
          <form
            onSubmit={handleLogin}
            className="space-y-4"
          >
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) =>
                setEmail(
                  e.target.value.trim()
                )
              }
              className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:text-white"
            />

            <div className="relative">
              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                placeholder="Password"
                value={password}
                onChange={(e) =>
                  setPassword(
                    e.target.value
                  )
                }
                className="w-full px-4 py-2 pr-10 rounded-lg border dark:bg-gray-700 dark:text-white"
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    (p) => !p
                  )
                }
                className="absolute inset-y-0 right-3 flex items-center"
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg"
            >
              {loginLoading
                ? "Logging in..."
                : "Login"}
            </button>

            <div
              className="text-center text-sm text-blue-600 dark:text-blue-400 cursor-pointer hover:underline"
              onClick={() =>
                setMode("requestOTP")
              }
            >
              Forgot Password?
            </div>
          </form>
        )}

        {mode === "requestOTP" && (
          <div className="space-y-4">
            <input
              type="email"
              placeholder="Enter your registered email"
              value={email}
              onChange={(e) =>
                setEmail(
                  e.target.value.trim()
                )
              }
              className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:text-white"
            />

            <button
              onClick={handleSendOTP}
              disabled={loginLoading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg"
            >
              {loginLoading
                ? "Sending..."
                : "Send OTP"}
            </button>

            <div
              className="text-center text-sm cursor-pointer text-blue-600 dark:text-blue-400 hover:underline"
              onClick={() =>
                setMode("login")
              }
            >
              Back to Login
            </div>
          </div>
        )}

        {mode === "reset" && (
          <div className="space-y-4">

            <input
              type="text"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) =>
                setOtp(e.target.value)
              }
              className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:text-white"
            />

            {/* New Password */}
            <div className="relative">
              <input
                type={
                  showNewPassword
                    ? "text"
                    : "password"
                }
                placeholder="New password"
                value={newPassword}
                onChange={(e) =>
                  setNewPassword(
                    e.target.value
                  )
                }
                className="w-full px-4 py-2 pr-10 rounded-lg border dark:bg-gray-700 dark:text-white"
              />

              <button
                type="button"
                onClick={() =>
                  setShowNewPassword(
                    (p) => !p
                  )
                }
                className="absolute inset-y-0 right-3 flex items-center"
              >
                {showNewPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>

            {/* Confirm Password */}
            <div className="relative">
              <input
                type={
                  showConfirmPassword
                    ? "text"
                    : "password"
                }
                placeholder="Confirm password"
                value={
                  confirmPassword
                }
                onChange={(e) =>
                  setConfirmPassword(
                    e.target.value
                  )
                }
                className="w-full px-4 py-2 pr-10 rounded-lg border dark:bg-gray-700 dark:text-white"
              />

              <button
                type="button"
                onClick={() =>
                  setShowConfirmPassword(
                    (p) => !p
                  )
                }
                className="absolute inset-y-0 right-3 flex items-center"
              >
                {showConfirmPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>

            {/* Strength Bar */}
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
              <div
                className={`h-full ${getStrengthColor()} transition-all duration-300`}
                style={{
                  width:
                    getStrengthWidth(),
                }}
              />
            </div>

            {/* Rules */}
            <div className="space-y-1">
              <RuleItem
                valid={
                  passwordChecks.length
                }
                text="At least 8 characters"
              />
              <RuleItem
                valid={
                  passwordChecks.uppercase
                }
                text="1 uppercase letter"
              />
              <RuleItem
                valid={
                  passwordChecks.number
                }
                text="1 number"
              />
              <RuleItem
                valid={
                  passwordChecks.special
                }
                text="1 special character"
              />
              <RuleItem
                valid={
                  passwordsMatch
                }
                text="Passwords match"
              />
            </div>

            {/* Resend OTP */}
            <div className="text-center text-xs text-gray-500 dark:text-gray-400">
              {resendAttempts < 3 ? (
                canResend ? (
                  <span
                    onClick={
                      handleResendOTP
                    }
                    className="cursor-pointer text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {resendLoading
                      ? "Resending OTP..."
                      : "Resend OTP"}
                  </span>
                ) : (
                  `Resend available in ${resendTimer}s`
                )
              ) : (
                "Maximum resend attempts reached."
              )}
            </div>

            <button
              onClick={
                handleResetPassword
              }
              disabled={
                !canResetPassword
              }
              className={`w-full py-2 rounded-lg text-white ${canResetPassword
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-gray-400 cursor-not-allowed"
                }`}
            >
              {resetLoading
                ? "Resetting..."
                : "Reset Password"}
            </button>

          </div>
        )}
      </div>
    </div>
  );
}