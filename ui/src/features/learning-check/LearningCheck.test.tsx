// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LearningCheckService } from "../../api/types";
import { checkFixture, resultFixture } from "../../test/checkFixture";
import { LearningCheck } from "./LearningCheck";

afterEach(cleanup);
const session = { id: "past", courseId: "english" };
function setup(service: LearningCheckService, onComplete = vi.fn()) {
  return {
    ...render(
      <LearningCheck
        session={session}
        mode="api"
        serviceFactory={async () => service}
        onComplete={onComplete}
      />,
    ),
    onComplete,
  };
}
describe("learning check user flow", () => {
  it("shows loading, keeps submission disabled until complete, then displays server feedback", async () => {
    const user = userEvent.setup();
    const submit = vi.fn().mockResolvedValue(resultFixture);
    const { onComplete } = setup({ load: async () => checkFixture, submit });
    expect(screen.getByRole("status").textContent).toContain("Loading");
    const button = await screen.findByRole("button", {
      name: "Submit answers",
    });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    await user.click(screen.getByRole("radio", { name: "went" }));
    await user.click(button);
    expect(await screen.findByText("Correct. Well done.")).toBeTruthy();
    expect(onComplete).toHaveBeenCalledExactlyOnceWith(resultFixture);
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/test-lesson.pdf, page 2/)).toBeTruthy();
  });
  it("retries a failed load and displays the empty state without a fake quiz", async () => {
    const user = userEvent.setup();
    const load = vi
      .fn()
      .mockRejectedValueOnce(new Error("Service offline"))
      .mockResolvedValue({ ...checkFixture, questions: [] });
    setup({ load, submit: vi.fn() });
    expect((await screen.findByRole("alert")).textContent).toContain("offline");
    await user.click(screen.getByRole("button", { name: "Retry loading" }));
    expect(await screen.findByText("No questions available yet")).toBeTruthy();
    expect(screen.queryByRole("radio")).toBeNull();
  });
  it("keeps answers and attempt ID for a failed submission, and awards nothing on failure", async () => {
    const user = userEvent.setup();
    const submit = vi
      .fn()
      .mockRejectedValueOnce(new Error("Network lost"))
      .mockResolvedValue(resultFixture);
    const { onComplete } = setup({ load: async () => checkFixture, submit });
    await user.click(await screen.findByRole("radio", { name: "went" }));
    await user.click(screen.getByRole("button", { name: "Submit answers" }));
    await screen.findByRole("alert");
    expect(onComplete).not.toHaveBeenCalled();
    expect(
      (screen.getByRole("radio", { name: "went" }) as HTMLInputElement).checked,
    ).toBe(true);
    await user.click(screen.getByRole("button", { name: "Retry submission" }));
    await screen.findByText("Correct. Well done.");
    expect(submit.mock.calls[0][1]).toEqual(submit.mock.calls[1][1]);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
  it("ignores a late submission after the dialog unmounts", async () => {
    const user = userEvent.setup();
    let finish!: (value: typeof resultFixture) => void;
    const submit = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const { unmount, onComplete } = setup({
      load: async () => checkFixture,
      submit,
    });
    await user.click(await screen.findByRole("radio", { name: "went" }));
    await user.click(screen.getByRole("button", { name: "Submit answers" }));
    unmount();
    expect(submit.mock.calls[0][2].aborted).toBe(true);
    finish(resultFixture);
    await waitFor(() => expect(onComplete).not.toHaveBeenCalled());
  });
});
