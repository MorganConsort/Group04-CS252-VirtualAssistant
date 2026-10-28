import type { CheckResult, LearningCheck } from "../api/types";
// Synthetic API contract fixture, not generated learning content.
export const checkFixture: LearningCheck = {
  id: "check-1",
  sessionId: "past",
  title: "Past tenses",
  kind: "subject",
  questions: [
    {
      id: "q1",
      prompt: "Yesterday, she ___ to school.",
      options: [
        { id: "go", text: "go" },
        { id: "went", text: "went" },
      ],
      citations: [
        { sourceId: "source-1", fileName: "test-lesson.pdf", page: 2 },
      ],
    },
  ],
};
export const resultFixture: CheckResult = {
  checkId: "check-1",
  sessionId: "past",
  score: 100,
  passed: true,
  feedback: "Correct. Well done.",
  explanations: [{ questionId: "q1", text: "Went is the past tense." }],
};
