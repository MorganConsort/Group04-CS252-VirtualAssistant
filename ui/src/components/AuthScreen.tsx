import { useState, type FormEvent } from "react";
import { authenticate } from "../api/mock";
import { validateAuth, type AuthErrors, type AuthForm } from "../auth";

/** S1 Đăng nhập / Đăng ký. The token goes to the caller, which keeps it in memory only. */
export function AuthScreen({ onAuth }: { onAuth: (token: string) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState<AuthForm>({
    email: "",
    password: "",
    birthYear: "",
    level: "university",
  });
  const [errors, setErrors] = useState<AuthErrors>({});
  const [failure, setFailure] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (key: keyof AuthForm, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const found = validateAuth(form, mode);
    setErrors(found);
    setFailure("");
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      onAuth((await authenticate(form, mode)).token);
    } catch (err) {
      setFailure(err instanceof Error ? err.message : "Đăng nhập thất bại.");
    } finally {
      setBusy(false);
    }
  };

  const field = (
    key: "email" | "password" | "birthYear",
    label: string,
    type: string,
  ) => (
    <label className="auth-field">
      {label}
      <input
        type={type}
        value={form[key]}
        onChange={(e) => set(key, e.target.value)}
        aria-invalid={!!errors[key]}
        aria-describedby={errors[key] ? `${key}-error` : undefined}
        autoComplete={
          key === "email"
            ? "email"
            : key === "password"
              ? mode === "login"
                ? "current-password"
                : "new-password"
              : "off"
        }
      />
      {errors[key] && (
        <span id={`${key}-error`} className="auth-error">
          {errors[key]}
        </span>
      )}
    </label>
  );

  return (
    <main className="auth">
      <form className="auth-card" onSubmit={submit} noValidate>
        <div className="brand auth-brand">
          <span>✦</span> pathly
        </div>
        <h1>{mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}</h1>
        {field("email", "Email", "email")}
        {field("password", "Mật khẩu", "password")}
        {mode === "register" && (
          <>
            {field("birthYear", "Năm sinh", "number")}
            <label className="auth-field">
              Cấp học
              <select
                value={form.level}
                onChange={(e) => set("level", e.target.value)}
              >
                <option value="university">Đại học</option>
                <option value="k12">Phổ thông (K-12)</option>
              </select>
            </label>
          </>
        )}
        {failure && (
          <p role="alert" className="auth-error">
            {failure}
          </p>
        )}
        <button className="auth-submit" type="submit" disabled={busy}>
          {busy ? "Đang xử lý…" : mode === "login" ? "Đăng nhập" : "Đăng ký"}
        </button>
        <button
          type="button"
          className="auth-switch"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setErrors({});
            setFailure("");
          }}
        >
          {mode === "login"
            ? "Chưa có tài khoản? Đăng ký"
            : "Đã có tài khoản? Đăng nhập"}
        </button>
      </form>
    </main>
  );
}
