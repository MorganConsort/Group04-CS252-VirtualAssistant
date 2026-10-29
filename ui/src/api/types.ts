/** Proposed learning-check contract. Backend owners must review before deployment. */
export type Citation = { sourceId: string; fileName: string; page: number };
export type Question = {
  id: string;
  prompt: string;
  options: { id: string; text: string }[];
  citations: Citation[];
};
export type LearningCheck = {
  id: string;
  sessionId: string;
  title: string;
  kind: "subject" | "workflow-demo";
  questions: Question[];
};
export type Answer = { questionId: string; optionId: string };
export type CheckResult = {
  checkId: string;
  sessionId: string;
  score: number;
  passed: boolean;
  feedback: string;
  explanations: { questionId: string; text: string }[];
};
export type Submission = { attemptId: string; answers: Answer[] };
export type CheckSession = { id: string; courseId: string };
export interface LearningCheckService {
  load(session: CheckSession, signal?: AbortSignal): Promise<LearningCheck>;
  submit(
    check: LearningCheck,
    submission: Submission,
    signal?: AbortSignal,
  ): Promise<CheckResult>;
}
