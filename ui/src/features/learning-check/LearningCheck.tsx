import { useEffect, useRef, useState } from "react";
import { getCheckService } from "../../api/service";
import type {
  LearningCheck as Check,
  CheckResult,
  CheckSession,
  LearningCheckService,
  Submission,
} from "../../api/types";
import { Button } from "../../components/Button";

type Props = {
  session: CheckSession;
  mode: "demo" | "api";
  previouslyVerified?: boolean;
  onComplete: (result: CheckResult) => void;
  serviceFactory?: () => Promise<LearningCheckService>;
};

export function LearningCheck({
  session,
  mode,
  previouslyVerified,
  onComplete,
  serviceFactory = getCheckService,
}: Props) {
  const [check, setCheck] = useState<Check | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<CheckResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reload, setReload] = useState(0);
  const service = useRef<LearningCheckService | null>(null);
  const lifetime = useRef<AbortController | null>(null);
  const busy = useRef(false);
  const attempt = useRef<Submission | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    service.current = null;
    busy.current = false;
    attempt.current = null;
    setCheck(null);
    setAnswers({});
    setResult(null);
    setError("");
    setLoading(true);
    setSubmitting(false);
    void (async () => {
      try {
        const client = await serviceFactory();
        if (controller.signal.aborted) return;
        const data = await client.load(session, controller.signal);
        if (!controller.signal.aborted) {
          service.current = client;
          setCheck(data);
        }
      } catch (reason) {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : "Could not load this check.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [session.id, session.courseId, reload, serviceFactory]);

  async function submit() {
    const signal = lifetime.current?.signal;
    if (
      busy.current ||
      !service.current ||
      !check ||
      !signal ||
      signal.aborted ||
      result
    )
      return;
    if (!check.questions.every((q) => answers[q.id])) return;
    busy.current = true;
    setSubmitting(true);
    setError("");
    // Keep the same ID and payload on a failed request: the backend must replay retries.
    attempt.current ??= {
      attemptId: crypto.randomUUID(),
      answers: check.questions.map((q) => ({
        questionId: q.id,
        optionId: answers[q.id],
      })),
    };
    try {
      const response = await service.current.submit(
        check,
        attempt.current,
        signal,
      );
      if (!signal.aborted) {
        setResult(response);
        onComplete(response);
      }
    } catch (reason) {
      if (!signal.aborted)
        setError(
          reason instanceof Error
            ? reason.message
            : "Could not submit your answers.",
        );
    } finally {
      if (!signal.aborted) {
        busy.current = false;
        setSubmitting(false);
      }
    }
  }

  if (loading)
    return (
      <p role="status" className="check-state">
        Loading learning check…
      </p>
    );
  if (!check)
    return (
      <div className="check-state">
        <p role="alert" className="warning">
          {error}
        </p>
        <Button onClick={() => setReload((n) => n + 1)}>Retry loading</Button>
      </div>
    );
  if (!check.questions.length)
    return (
      <div className="empty check-state">
        <h3>No questions available yet</h3>
        <p>Your course owner has not published a check for this session.</p>
        <Button onClick={() => setReload((n) => n + 1)}>Check again</Button>
      </div>
    );
  return (
    <section aria-label="Learning check" className="learning-check">
      {check.kind === "workflow-demo" && (
        <p className="warning">
          Demo workflow check only. Subject-specific questions are not
          connected.
        </p>
      )}
      <p>
        {mode === "demo"
          ? "Answer every question. Score at least 70% to verify this demo session."
          : "Answer every question. Your learning service will grade this attempt."}
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        aria-busy={submitting}
      >
        {check.questions.map((q, i) => (
          <fieldset
            key={q.id}
            disabled={
              submitting ||
              result !== null ||
              (error !== "" && attempt.current !== null)
            }
          >
            <legend>
              {i + 1}. {q.prompt}
            </legend>
            {q.citations.length > 0 && (
              <p className="citation check-citation">
                Source:{" "}
                {q.citations
                  .map((c) => `${c.fileName}, page ${c.page}`)
                  .join("; ")}
              </p>
            )}
            {q.options.map((option) => (
              <label className="answer" key={option.id}>
                <input
                  required
                  type="radio"
                  name={q.id}
                  checked={answers[q.id] === option.id}
                  onChange={() => {
                    setAnswers((a) => ({ ...a, [q.id]: option.id }));
                    attempt.current = null;
                  }}
                />
                {option.text}
              </label>
            ))}
            {result?.explanations
              .filter((e) => e.questionId === q.id)
              .map((e) => (
                <p key={e.questionId}>{e.text}</p>
              ))}
          </fieldset>
        ))}
        {error && (
          <p role="alert" className="warning">
            {error} Your answers are kept; retry sends the same attempt.
          </p>
        )}
        <button
          className="button primary"
          type="submit"
          disabled={
            submitting ||
            result !== null ||
            !check.questions.every((q) => answers[q.id])
          }
        >
          {submitting
            ? "Submitting…"
            : error
              ? "Retry submission"
              : "Submit answers"}
        </button>
      </form>
      {result && (
        <div
          className={result.passed ? "result green" : "result amber"}
          role="status"
        >
          <b>
            {result.score}% ·{" "}
            {result.passed
              ? "Passed"
              : previouslyVerified && mode === "demo"
                ? "Practice score — verification retained"
                : "Keep practicing"}
          </b>
          <p>{result.feedback}</p>
          {mode === "api" && (
            <p>
              This result comes from the learning service. Demo progress is
              unchanged.
            </p>
          )}
          {previouslyVerified && !result.passed && mode === "demo" && (
            <p>Your earlier passing result remains verified.</p>
          )}
          <Button
            onClick={() => {
              attempt.current = null;
              setResult(null);
              setAnswers({});
              setError("");
            }}
          >
            Practice again
          </Button>
        </div>
      )}
    </section>
  );
}
