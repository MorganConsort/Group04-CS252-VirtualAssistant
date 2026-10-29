import { describe, expect, it, vi } from "vitest";
import { checkFixture, resultFixture } from "../test/checkFixture";
import { createApiCheckService } from "./client";
import { readCheckConfig } from "./config";
import { parseCheck, parseResult } from "./validation";

const session = { id: "past", courseId: "english" };
describe("learning service boundary", () => {
  it("encodes session IDs, sends answer IDs and preserves the retry attempt ID", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({ ...checkFixture, sessionId: "a/b" }),
      )
      .mockResolvedValueOnce(Response.json(resultFixture));
    const service = createApiCheckService(
      "http://localhost:8000/api/v1/",
      fetcher,
    );
    await service.load({ ...session, id: "a/b" });
    expect(fetcher.mock.calls[0][0]).toBe(
      "http://localhost:8000/api/v1/sessions/a%2Fb/learning-check",
    );
    const submission = {
      attemptId: "attempt-1",
      answers: [{ questionId: "q1", optionId: "went" }],
    };
    expect(await service.submit(checkFixture, submission)).toEqual(
      resultFixture,
    );
    expect(JSON.parse(fetcher.mock.calls[1][1]!.body as string)).toEqual(
      submission,
    );
    expect(fetcher.mock.calls[1][1]!.credentials).toBe("omit");
  });
  it.each([401, 403, 404, 429, 500])(
    "reports HTTP %i without falling back to demo questions",
    async (status) => {
      const service = createApiCheckService(
        "http://localhost:8000",
        vi
          .fn<typeof fetch>()
          .mockResolvedValue(
            new Response("private server details", { status }),
          ),
      );
      await expect(service.load(session)).rejects.toThrow(
        /denied|available|requests/,
      );
    },
  );
  it("rejects malformed JSON and mismatched session data", async () => {
    const service = createApiCheckService(
      "http://localhost:8000",
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response("<html>oops</html>")),
    );
    await expect(service.load(session)).rejects.toThrow("unreadable");
    expect(() =>
      parseCheck({ ...checkFixture, sessionId: "someone-else" }, "past"),
    ).toThrow();
  });
  it("requires citations and unique question IDs, but supports an empty published check", () => {
    expect(() =>
      parseCheck(
        {
          ...checkFixture,
          questions: [{ ...checkFixture.questions[0], citations: [] }],
        },
        "past",
      ),
    ).toThrow();
    expect(() =>
      parseCheck(
        {
          ...checkFixture,
          questions: [checkFixture.questions[0], checkFixture.questions[0]],
        },
        "past",
      ),
    ).toThrow();
    expect(
      parseCheck({ ...checkFixture, questions: [] }, "past").questions,
    ).toEqual([]);
    const parsed = parseCheck(
      {
        ...checkFixture,
        questions: [{ ...checkFixture.questions[0], correct: "went" }],
      },
      "past",
    );
    expect(parsed.questions[0]).not.toHaveProperty("correct");
  });
  it("rejects invalid or unrelated grading results", () => {
    for (const score of [NaN, Infinity, -1, 101])
      expect(() =>
        parseResult({ ...resultFixture, score }, checkFixture),
      ).toThrow();
    expect(() =>
      parseResult({ ...resultFixture, checkId: "another-check" }, checkFixture),
    ).toThrow();
    expect(() =>
      parseResult(
        {
          ...resultFixture,
          explanations: [{ questionId: "unknown", text: "x" }],
        },
        checkFixture,
      ),
    ).toThrow();
  });
  it("cancels a pending fetch when the caller closes the check", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init!.signal!.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        }),
    );
    const controller = new AbortController();
    const promise = createApiCheckService(
      "http://localhost:8000",
      fetcher,
    ).load(session, controller.signal);
    controller.abort();
    await expect(promise).rejects.toMatchObject({ name: "AbortError" });
  });
  it("times out a hanging service", async () => {
    vi.useFakeTimers();
    try {
      const fetcher = vi.fn<typeof fetch>().mockImplementation(
        (_url, init) =>
          new Promise((_resolve, reject) => {
            init!.signal!.addEventListener("abort", () =>
              reject(new DOMException("Aborted", "AbortError")),
            );
          }),
      );
      const failure = expect(
        createApiCheckService("http://localhost:8000", fetcher).load(session),
      ).rejects.toThrow("too long");
      await vi.advanceTimersByTimeAsync(15_000);
      await failure;
    } finally {
      vi.useRealTimers();
    }
  });
  it("requires explicit valid API configuration", () => {
    expect(readCheckConfig({}).mode).toBe("demo");
    expect(() => readCheckConfig({ VITE_CHECK_MODE: "production" })).toThrow();
    expect(() => readCheckConfig({ VITE_CHECK_MODE: "api" })).toThrow();
    expect(() =>
      readCheckConfig({
        VITE_CHECK_MODE: "api",
        VITE_API_BASE_URL: "http://example.com",
      }),
    ).toThrow();
    expect(
      readCheckConfig({
        VITE_CHECK_MODE: "api",
        VITE_API_BASE_URL: "http://127.0.0.1:8000/api/v1",
      }).mode,
    ).toBe("api");
  });
});
