export type Page =
  "Home" | "Schedule" | "Progress" | "AI Reporter" | "Library" | "Companion" | "Workspace";
export type Proposal = {
  kind: "enroll" | "balance";
  courseId?: string;
  stage: "check" | "review";
  hours: number;
};
export const pages: Page[] = [
  "Home",
  "Schedule",
  "Progress",
  "AI Reporter",
  "Library",
  "Companion",
  "Workspace",
];
// Visible names are shared across navigation and cross-page guidance.
// Keep the original route IDs so existing bookmarks continue to work.
export const pageLabels: Record<Page, string> = {
  Home: "Home",
  Library: "Courses",
  Schedule: "Review",
  "AI Reporter": "Ask",
  Progress: "Mastery",
  Companion: "Companion",
  Workspace: "Workspace",
};
// Shared by the desktop sidebar and mobile bottom navigation. Home is on the logo.
export const nav: { page: Page; label: string; icon: string }[] = [
  { page: "Library", label: pageLabels.Library, icon: "▣" },
  { page: "Schedule", label: pageLabels.Schedule, icon: "▤" },
  { page: "AI Reporter", label: pageLabels["AI Reporter"], icon: "✦" },
  { page: "Progress", label: pageLabels.Progress, icon: "◉" },
  { page: "Companion", label: pageLabels.Companion, icon: "♥" },
  { page: "Workspace", label: pageLabels.Workspace, icon: "◷" },
];
