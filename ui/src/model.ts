export type Course = {
  id: string;
  name: string;
  category: string;
  description: string;
  prerequisite: string;
  weeks: number;
  level: string;
  color: string;
  topics: string[];
};
export const courses: Course[] = [
  {
    id: "math",
    name: "Mathematics 7",
    category: "Mathematics",
    description:
      "Build strong foundations in algebra, geometry, and problem solving.",
    prerequisite: "Grade 6 Math basics",
    weeks: 12,
    level: "Beginner",
    color: "purple",
    topics: ["Integers and operations", "Fractions", "Algebra basics"],
  },
  {
    id: "english",
    name: "English foundations",
    category: "Languages",
    description: "Grammar, listening, vocabulary, and everyday conversation.",
    prerequisite: "No prerequisites",
    weeks: 8,
    level: "Beginner",
    color: "green",
    topics: ["Past simple & past continuous", "Vocabulary", "Listening"],
  },
  {
    id: "physics12",
    name: "Physics 12",
    category: "Sciences",
    description: "Mechanics, oscillations, waves, and exam-oriented practice.",
    prerequisite: "Physics 11",
    weeks: 14,
    level: "Advanced",
    color: "amber",
    topics: ["Oscillations", "Waves", "Electricity"],
  },
  {
    id: "python",
    name: "Introduction to Python",
    category: "Technology",
    description:
      "Programming basics through short guided practice and projects.",
    prerequisite: "No prerequisites",
    weeks: 10,
    level: "Beginner",
    color: "purple",
    topics: ["Variables and types", "Loops", "Functions"],
  },
  {
    id: "physics",
    name: "Physics 7",
    category: "Sciences",
    description: "Discover measurement, motion, and the world around you.",
    prerequisite: "Grade 6 Science basics",
    weeks: 12,
    level: "Beginner",
    color: "green",
    topics: ["Measurements", "Motion", "Forces"],
  },
  {
    id: "history",
    name: "History pathway",
    category: "Humanities",
    description: "A six-month path from History 7 to History 8 and History 9.",
    prerequisite: "Begin with History 7",
    weeks: 24,
    level: "Progressive",
    color: "amber",
    topics: ["Early societies", "Ancient civilizations", "Historical sources"],
  },
  {
    id: "biology",
    name: "Biology 9",
    category: "Sciences",
    description: "Explore cells, genetics, and living systems.",
    prerequisite: "Biology 8",
    weeks: 12,
    level: "Intermediate",
    color: "green",
    topics: ["Cells", "Genetics", "Ecosystems"],
  },
];
export type Session = {
  id: string;
  courseId: string;
  title: string;
  date: string;
  time: string;
  minutes: number;
  kind: "lesson" | "quiz";
  status: "planned" | "studied" | "verified";
};
export type State = {
  version: 2;
  scheduleDate: string;
  active: string[];
  future: string[];
  sessions: Session[];
  verified: string[];
  name: string;
  hours: number;
  messages: { role: "user" | "assistant"; text: string }[];
};
export const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
export const today = () => new Date();
export const initialState = (): State => {
  const d = today();
  const monday = addDays(d, -((d.getDay() + 6) % 7));
  return {
    version: 2,
    scheduleDate: dateKey(d),
    active: ["english"],
    future: [],
    verified: [],
    name: "Alex",
    hours: 12,
    messages: [
      {
        role: "assistant",
        text: "Let's build your learning roadmap. Tell me what you want to learn, or choose one of the examples below. I can propose courses, review your workload, and help you plan your next step.",
      },
    ],
    sessions: [
      ...["Vocabulary", "Listening", "Past tenses", "Speaking", "Revision"].map(
        (title, i) => ({
          id: `seed-${i}`,
          courseId: "english",
          title,
          date: dateKey(addDays(monday, [0, 1, 2, 5, 6][i])),
          time: ["09:00", "14:00", "09:00", "10:00", "15:00"][i],
          minutes: 45,
          kind: "lesson" as const,
          status: "planned" as const,
        }),
      ),
      {
        id: "past",
        courseId: "english",
        title: "Past simple & past continuous",
        date: dateKey(d),
        time: "09:00",
        minutes: 60,
        kind: "lesson",
        status: "planned",
      },
      {
        id: "quiz",
        courseId: "english",
        title: "Practice & short knowledge check",
        date: dateKey(d),
        time: "16:00",
        minutes: 20,
        kind: "quiz",
        status: "planned",
      },
    ],
  };
};
export function enroll(s: State, id: string, hours = 3): State {
  if (s.active.includes(id)) return s;
  const course = courses.find((c) => c.id === id);
  if (!course) return s;
  return {
    ...s,
    active: [...s.active, id],
    future: s.future.filter((x) => x !== id),
    sessions: [
      ...s.sessions,
      ...course.topics.map((title, i) => ({
        id: `${id}-${i}`,
        courseId: id,
        title,
        date: dateKey(addDays(today(), i + 1)),
        time: "16:00",
        minutes: Math.max(10, Math.min(60, Math.floor((hours * 60) / 3))),
        kind: "lesson" as const,
        status: "planned" as const,
      })),
    ],
  };
}
export function saveFuture(s: State, id: string): State {
  return s.active.includes(id) || s.future.includes(id)
    ? s
    : { ...s, future: [...s.future, id] };
}
export function verify(s: State, id: string, score: number): State {
  if (score < 70 || s.verified.includes(id)) return s;
  return {
    ...s,
    verified: [...s.verified, id],
    sessions: s.sessions.map((x) =>
      x.id === id ? { ...x, status: "verified" } : x,
    ),
  };
}
export function progress(s: State, id: string) {
  const extra = s.verified.filter(
    (v) => s.sessions.find((x) => x.id === v)?.courseId === id,
  ).length;
  return Math.min(
    100,
    Math.floor((((id === "english" ? 6 : 0) + extra) / 14) * 100),
  );
}
export function verifiedCount(s: State, courseId: string) {
  return s.verified.filter(
    (id) => s.sessions.find((session) => session.id === id)?.courseId === courseId,
  ).length;
}
export function pendingCount(s: State, courseId: string) {
  return s.sessions.filter(
    (session) => session.courseId === courseId && session.status === "studied",
  ).length;
}
export function balance(s: State, hours: number): State {
  const planned = s.sessions.filter((x) => x.status === "planned");
  const perSession = Math.max(
    10,
    Math.min(60, Math.floor((hours * 60) / Math.max(1, planned.length))),
  );
  return {
    ...s,
    hours,
    sessions: s.sessions.map((x) =>
      x.status === "planned" ? { ...x, minutes: perSession } : x,
    ),
  };
}
export function readState(): State {
  try {
    const x = JSON.parse(localStorage.getItem("pathly.demo.v1") || "null");
    if (
      (x?.version === 1 || x?.version === 2) &&
      Array.isArray(x.active) &&
      Array.isArray(x.sessions) &&
      Array.isArray(x.verified) &&
      Array.isArray(x.future) &&
      Array.isArray(x.messages) &&
      typeof x.name === "string" &&
      typeof x.hours === "number"
    ) {
      const currentDate = dateKey(today());
      const savedDate =
        typeof x.scheduleDate === "string"
          ? x.scheduleDate
          : x.sessions.find((session: Session) => session.id === "past")?.date;
      if (!savedDate || savedDate === currentDate)
        return { ...x, version: 2, scheduleDate: currentDate };

      const parseDate = (value: string) => {
        const [year, month, day] = value.split("-").map(Number);
        return new Date(year, month - 1, day);
      };
      const elapsedDays = Math.round(
        (parseDate(currentDate).getTime() - parseDate(savedDate).getTime()) /
          86_400_000,
      );
      return {
        ...x,
        version: 2,
        scheduleDate: currentDate,
        sessions: x.sessions.map((session: Session) => ({
          ...session,
          date: dateKey(addDays(parseDate(session.date), elapsedDays)),
        })),
      };
    }
  } catch {
    /* Invalid storage falls back to a fresh demo. */
  }
  return initialState();
}
