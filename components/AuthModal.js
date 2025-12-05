import { useState } from "react";
import { useAuth } from "../context/AuthContext";

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

const validatePassword = (password, isLogin = false) => {
  if (!password || password.trim().length === 0) {
    return "Password is required.";
  }
  if (!isLogin && password.trim().length < 8) {
    return "Password must be at least 8 characters long.";
  }
  return null;
};

const validateName = (name) => {
  if (!name || name.trim().length === 0) {
    return "Full name is required.";
  }
  if (name.trim().length < 2) {
    return "Name must be at least 2 characters long.";
  }
  return null;
};

export default function AuthModal({ open, mode, onClose, onSwitch }) {
  const { login, register } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const isLogin = mode === "login";
  const title = isLogin ? "Sign in to your account" : "Create your account";
  const cta = isLogin ? "Sign in" : "Create account";

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrors({});
    setBusy(true);

    // Client-side validation
    const newErrors = {};
    
    if (!isLogin) {
      const nameError = validateName(form.name);
      if (nameError) newErrors.name = nameError;
    }

    if (!form.email || !form.email.trim()) {
      newErrors.email = "Email address is required.";
    } else if (!validateEmail(form.email)) {
      newErrors.email = "Please enter a valid email address.";
    }

    const passwordError = validatePassword(form.password, isLogin);
    if (passwordError) newErrors.password = passwordError;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setBusy(false);
      return;
    }

    try {
      if (isLogin) {
        await login({ email: form.email.trim(), password: form.password });
      } else {
        await register({ name: form.name.trim(), email: form.email.trim(), password: form.password });
      }
      setForm({ name: "", email: "", password: "" });
      setErrors({});
      onClose();
    } catch (err) {
      setErrors({ general: err.message || "Something went wrong. Please try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="auth-modal-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="auth-modal">
        <div className="auth-modal-header">
          <h2>{title}</h2>
          <button type="button" className="auth-close-btn" onClick={onClose} aria-label="Close dialog">
            ✕
          </button>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          {!isLogin && (
            <label>
              Full name
              <input
                type="text"
                value={form.name}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, name: event.target.value }));
                  if (errors.name) setErrors((prev) => ({ ...prev, name: null }));
                }}
                required
                minLength={2}
              />
              {errors.name && <span className="auth-field-error">{errors.name}</span>}
            </label>
          )}
          <label>
            Email address
            <input
              type="email"
              value={form.email}
              onChange={(event) => {
                setForm((prev) => ({ ...prev, email: event.target.value }));
                if (errors.email) setErrors((prev) => ({ ...prev, email: null }));
              }}
              required
            />
            {errors.email && <span className="auth-field-error">{errors.email}</span>}
          </label>
          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(event) => {
                setForm((prev) => ({ ...prev, password: event.target.value }));
                if (errors.password) setErrors((prev) => ({ ...prev, password: null }));
              }}
              required
              minLength={isLogin ? undefined : 8}
            />
            {errors.password && <span className="auth-field-error">{errors.password}</span>}
            {!isLogin && (
              <small className="auth-hint" style={{ display: "block", marginTop: "4px", fontSize: "12px", color: "#666" }}>
                Must be at least 8 characters long
              </small>
            )}
          </label>
          {isLogin && (
            <label className="auth-remember" style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
              <input type="checkbox" style={{ margin: 0, flexShrink: 0 }} />
              <span>Keep me signed in</span>
            </label>
          )}
          {errors.general && <p className="auth-error">{errors.general}</p>}
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "Please wait…" : cta}
          </button>
        </form>
        <p className="auth-switch">
          {isLogin ? "New to Gikzo?" : "Already have an account?"}{" "}
          <button type="button" onClick={() => onSwitch(isLogin ? "register" : "login")}>
            {isLogin ? "Create an account" : "Sign in instead"}
          </button>
        </p>
      </div>
    </div>
  );
}

