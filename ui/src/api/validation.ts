import type { CheckResult, LearningCheck } from "./types";

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function text(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
function unique(ids: string[]) {
  return new Set(ids).size === ids.length;
}
const invalid = () =>
  new Error(
    "The learning service returned an invalid response. Please try again.",
  );

export function parseCheck(value: unknown, sessionId: string): LearningCheck {
  if (
    !record(value) ||
    !text(value.id) ||
    value.sessionId !== sessionId ||
    !text(value.title) ||
    value.kind !== "subject" ||
    !Array.isArray(value.questions)
  )
    throw invalid();
  const questions = value.questions.map((q: unknown) => {
    if (
      !record(q) ||
      !text(q.id) ||
      !text(q.prompt) ||
      !Array.isArray(q.options) ||
      q.options.length < 2 ||
      !Array.isArray(q.citations) ||
      q.citations.length === 0
    )
      throw invalid();
    const options = q.options.map((o: unknown) => {
      if (!record(o) || !text(o.id) || !text(o.text)) throw invalid();
      return { id: o.id, text: o.text };
    });
    if (!unique(options.map((o) => o.id))) throw invalid();
    const citations = q.citations.map((c: unknown) => {
      if (
        !record(c) ||
        !text(c.sourceId) ||
        !text(c.fileName) ||
        typeof c.page !== "number" ||
        !Number.isInteger(c.page) ||
        c.page < 1
      )
        throw invalid();
      return { sourceId: c.sourceId, fileName: c.fileName, page: c.page };
    });
    // Copy public fields only; grading data is never used by the API UI.
    return { id: q.id, prompt: q.prompt, options, citations };
  });
  if (!unique(questions.map((q) => q.id))) throw invalid();
  return {
    id: value.id,
    sessionId,
    title: value.title,
    kind: "subject",
    questions,
  };
}

export function parseResult(value: unknown, check: LearningCheck): CheckResult {
  if (
    !record(value) ||
    value.checkId !== check.id ||
    value.sessionId !== check.sessionId ||
    typeof value.score !== "number" ||
    !Number.isFinite(value.score) ||
    value.score < 0 ||
    value.score > 100 ||
    typeof value.passed !== "boolean" ||
    !text(value.feedback) ||
    !Array.isArray(value.explanations)
  )
    throw invalid();
  const explanations = value.explanations.map((e: unknown) => {
    if (
      !record(e) ||
      !text(e.questionId) ||
      !text(e.text) ||
      !check.questions.some((q) => q.id === e.questionId)
    )
      throw invalid();
    return { questionId: e.questionId, text: e.text };
  });
  if (!unique(explanations.map((e) => e.questionId))) throw invalid();
  return {
    checkId: check.id,
    sessionId: check.sessionId,
    score: value.score,
    passed: value.passed,
    feedback: value.feedback,
    explanations,
  };
}
