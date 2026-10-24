import { describe, it, expect } from "vitest";
import {
  initialState,
  enroll,
  saveFuture,
  verify,
  progress,
  balance,
  pendingCount,
  verifiedCount,
} from "./model";
describe("learning state invariants", () => {
  it("saving a course does not enroll it or schedule sessions", () => {
    const before = initialState();
    const after = saveFuture(before, "biology");
    expect(after.active).toEqual(before.active);
    expect(after.sessions).toEqual(before.sessions);
    expect(after.future).toEqual(["biology"]);
    expect(saveFuture(after, "biology").future).toHaveLength(1);
  });
  it("enrollment creates sessions once and removes the saved request", () => {
    const saved = saveFuture(initialState(), "math");
    const active = enroll(saved, "math");
    expect(active.future).toEqual([]);
    expect(active.sessions.length).toBe(saved.sessions.length + 3);
    expect(enroll(active, "math")).toBe(active);
  });
  it("failed checks never award progress and retakes cannot duplicate credit", () => {
    const s = initialState();
    expect(verify(s, "past", 50)).toBe(s);
    const passed = verify(s, "past", 75);
    expect(progress(passed, "english")).toBeGreaterThan(progress(s, "english"));
    expect(verify(passed, "past", 100)).toBe(passed);
  });
  it("workload changes preserve verified sessions and future plans", () => {
    const s = verify(saveFuture(initialState(), "biology"), "past", 100);
    const after = balance(s, 2);
    expect(after.sessions.find((x) => x.id === "past")).toEqual(
      s.sessions.find((x) => x.id === "past"),
    );
    expect(after.future).toEqual(["biology"]);
    expect(after.verified).toEqual(["past"]);
  });
  it("keeps assessment totals scoped to the selected course", () => {
    const englishPassed = verify(initialState(), "past", 100);
    const withMath = enroll(englishPassed, "math");
    expect(verifiedCount(withMath, "english")).toBe(1);
    expect(verifiedCount(withMath, "math")).toBe(0);
    expect(pendingCount(withMath, "math")).toBe(0);
  });
});
