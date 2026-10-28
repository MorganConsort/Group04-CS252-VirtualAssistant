import type { LearningCheckService } from "./types";
import { parseCheck, parseResult } from "./validation";

/** No authentication policy is chosen here: API mode is a local integration preview. */
export function createApiCheckService(
  baseUrl: string,
  fetcher: typeof fetch = fetch,
): LearningCheckService {
  const base = baseUrl.replace(/\/$/, "");
  async function request(
    path: string,
    init: RequestInit,
    signal?: AbortSignal,
  ): Promise<unknown> {
    const controller = new AbortController();
    let timedOut = false;
    const abort = () => controller.abort();
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) controller.abort();
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 15_000);
    try {
      const response = await fetcher(`${base}${path}`, {
        ...init,
        signal: controller.signal,
        credentials: "omit",
        cache: "no-store",
        headers: { Accept: "application/json", ...init.headers },
      });
      if (!response.ok) {
        const message =
          response.status === 401 || response.status === 403
            ? "Access to this learning check was denied. Contact the course owner."
            : response.status === 404
              ? "No learning check is available for this session yet."
              : response.status === 429
                ? "Too many requests. Please wait before trying again."
                : "The learning service is unavailable. Please try again.";
        throw new Error(message);
      }
      try {
        return await response.json();
      } catch {
        throw new Error(
          "The learning service returned unreadable data. Please try again.",
        );
      }
    } catch (error) {
      if (timedOut)
        throw new Error(
          "The learning service took too long to respond. Please try again.",
        );
      if (signal?.aborted)
        throw new DOMException("Request cancelled", "AbortError");
      if (error instanceof TypeError)
        throw new Error(
          "Could not reach the learning service. Check your connection and try again.",
        );
      throw error;
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abort);
    }
  }
  return {
    async load(session, signal) {
      return parseCheck(
        await request(
          `/sessions/${encodeURIComponent(session.id)}/learning-check`,
          { method: "GET" },
          signal,
        ),
        session.id,
      );
    },
    async submit(check, submission, signal) {
      const value = await request(
        `/learning-checks/${encodeURIComponent(check.id)}/attempts`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(submission),
        },
        signal,
      );
      return parseResult(value, check);
    },
  };
}
