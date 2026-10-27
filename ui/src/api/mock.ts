import { validateAuth, type AuthForm } from "../auth";

// shortcut: fake auth until the real endpoints land (DB&Security); swap the body for fetch() then.
export const currentCourse = {
  id: "csc10014",
  name: "CSC10014 · Computational Thinking",
};

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function authenticate(
  form: AuthForm,
  mode: "login" | "register",
): Promise<{ token: string }> {
  await delay(400);
  if (Object.keys(validateAuth(form, mode)).length)
    throw new Error("Thông tin chưa hợp lệ.");
  return { token: `mock-${mode}-${Date.now()}` };
}
