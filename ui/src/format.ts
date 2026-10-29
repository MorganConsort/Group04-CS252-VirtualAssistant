export const formatted = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
