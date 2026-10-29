export type CheckConfig = { mode: "demo" | "api"; baseUrl: string };
export function readCheckConfig(env: Record<string, unknown>): CheckConfig {
  const mode = env.VITE_CHECK_MODE ?? "demo";
  if (mode !== "demo" && mode !== "api")
    throw new Error("VITE_CHECK_MODE must be demo or api.");
  const baseUrl =
    typeof env.VITE_API_BASE_URL === "string"
      ? env.VITE_API_BASE_URL.trim()
      : "";
  if (mode === "api") {
    let url: URL;
    try {
      url = new URL(baseUrl);
    } catch {
      throw new Error(
        "Set VITE_API_BASE_URL to the learning service URL, then restart the app.",
      );
    }
    if (
      !/^https?:$/.test(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      throw new Error(
        "VITE_API_BASE_URL must be an HTTP(S) URL without credentials, query, or fragment.",
      );
    if (
      url.protocol === "http:" &&
      !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    )
      throw new Error("Use HTTPS for a remote learning service.");
  }
  return { mode, baseUrl };
}
