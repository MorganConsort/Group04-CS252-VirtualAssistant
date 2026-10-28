import { validateAuth, type AuthForm } from "../auth";
import { backendEnabled, call, session } from "./backend";

export const currentCourse = {
  id: "csc10014",
  name: "CS252 - Computational Thinking",
};

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Real sign-in when VITE_BACKEND_MODE=api; otherwise a fake token (demo, e2e). */
export async function authenticate(
  form: AuthForm,
  mode: "login" | "register",
): Promise<{ token: string }> {
  if (Object.keys(validateAuth(form, mode)).length)
    throw new Error("Please fix the highlighted fields.");
  if (!backendEnabled) {
    await delay(400);
    return { token: `mock-${mode}-${Date.now()}` };
  }
  const email = form.email.trim();
  const body =
    mode === "login"
      ? { email, password: form.password }
      : {
          email,
          password: form.password,
          // shortcut: S1 asks for no name; use the email's local part until a name field exists.
          name: email.split("@")[0],
          birth_year: Number(form.birthYear),
          account_level: form.level,
        };
  const auth = await call<{ access_token: string }>(
    mode === "login" ? "/auth/login" : "/auth/register",
    { method: "POST", body: JSON.stringify(body) },
  );
  session.set(auth.access_token);
  return { token: auth.access_token };
}
