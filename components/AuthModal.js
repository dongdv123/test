import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function AuthModal({ open, mode, onClose, onSwitch }) {
  const { login, register } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const isLogin = mode === "login";
  const title = isLogin ? "Sign in to your account" : "Create your account";
  const cta = isLogin ? "Sign in" : "Create account";

  const handleSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (isLogin) {
        await login({ email: form.email, password: form.password });
      } else {
        await register({ name: form.name, email: form.email, password: form.password });
      }
      setForm({ name: "", email: "", password: "" });
      onClose();
    } catch (err) {
      setError(err.message || "Something went wrong.");
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
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
            </label>
          )}
          <label>
            Email address
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              required
            />
          </label>
          {isLogin && (
            <label className="auth-remember" style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
              <input type="checkbox" style={{ margin: 0, flexShrink: 0 }} />
              <span>Keep me signed in</span>
            </label>
          )}
          {error && <p className="auth-error">{error}</p>}
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

