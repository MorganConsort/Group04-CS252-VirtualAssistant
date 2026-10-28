import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  courses,
  dateKey,
  addDays,
  today,
  readState,
  enroll,
  saveFuture,
  verify,
  progress,
  balance,
  pendingCount,
  verifiedCount,
  type Session,
} from "./model";
import { currentCourse } from "./api/mock";
import { AuthScreen } from "./components/AuthScreen";
import { CoursesPage } from "./pages/CoursesPage";

type Page =
  | "Home"
  | "Schedule"
  | "Progress"
  | "AI Reporter"
  | "Library"
  | "Companion";
type Proposal = {
  kind: "enroll" | "balance";
  courseId?: string;
  stage: "check" | "review";
  hours: number;
};
const pages: Page[] = [
  "Home",
  "Schedule",
  "Progress",
  "AI Reporter",
  "Library",
  "Companion",
];
// The spec's 5 nav items (docs/week1/UIUX.md), mapped onto Pathly's pages; Home stays on the logo.
const nav: { page: Page; label: string; icon: string }[] = [
  { page: "Library", label: "Courses", icon: "▣" },
  { page: "Schedule", label: "Review", icon: "▤" },
  { page: "AI Reporter", label: "Ask", icon: "✦" },
  { page: "Progress", label: "Mastery", icon: "◉" },
  { page: "Companion", label: "Companion", icon: "♥" },
];
const courseFor = (id: string) => courses.find((c) => c.id === id)!;
const formatted = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
function Button({
  children,
  onClick,
  primary = false,
  disabled = false,
}: {
  children: ReactNode;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      className={primary ? "button primary" : "button"}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
function Meter({ value }: { value: number }) {
  return (
    <div
      className="meter"
      role="progressbar"
      aria-label="Verified progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
    >
      <span style={{ width: `${value}%` }} />
    </div>
  );
}
function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button
          aria-label="Close dialog"
          className="icon-button"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}
export default function App() {
  // Kept in memory only: a reload logs out until real tokens exist (#6).
  const [token, setToken] = useState<string | null>(null);
  const [state, setState] = useState(readState);
  const [page, setPage] = useState<Page>(
    () =>
      pages.find(
        (p) => p.toLowerCase().replaceAll(" ", "-") === location.hash.slice(1),
      ) || "Home",
  );
  const [notice, setNotice] = useState("");
  const [storageError, setStorageError] = useState(false);
  const [modal, setModal] = useState<
    "settings" | "notifications" | "report" | null
  >(null);
  const [selected, setSelected] = useState<Session | null>(null);
  const [quiz, setQuiz] = useState(false);
  const [answers, setAnswers] = useState<number[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const [courseId, setCourseId] = useState("english");
  const [filter, setFilter] = useState("All modules");
  const [query, setQuery] = useState("");
  const [futureTab, setFutureTab] = useState(false);
  const [anchor, setAnchor] = useState(today);
  const [view, setView] = useState("Week");
  const [chat, setChat] = useState("");
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [gradeChoice, setGradeChoice] = useState(false);
  const [menu, setMenu] = useState(false);
  const [settingsName, setSettingsName] = useState(state.name);
  const [settingsHours, setSettingsHours] = useState(state.hours);
  const chatEnd = useRef<HTMLDivElement>(null);
  useEffect(() => {
    try {
      localStorage.setItem("pathly.demo.v1", JSON.stringify(state));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [state]);
  useEffect(() => {
    const handler = () =>
      setPage(
        pages.find(
          (p) =>
            p.toLowerCase().replaceAll(" ", "-") === location.hash.slice(1),
        ) || "Home",
      );
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [page]);
  useEffect(() => {
    chatEnd.current?.scrollIntoView({ block: "nearest" });
  }, [state.messages, proposal, gradeChoice]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(t);
  }, [notice]);
  const go = (p: Page) => {
    setPage(p);
    location.hash = p.toLowerCase().replaceAll(" ", "-");
    setMenu(false);
  };
  const say = (text: string) =>
    setState((s) => ({
      ...s,
      messages: [...s.messages, { role: "assistant", text }],
    }));
  const requestCourse = (id: string) => {
    go("AI Reporter");
    setGradeChoice(false);
    if (state.active.includes(id)) {
      setProposal(null);
      say(
        `${courseFor(id).name} is already active. Open Progress to see your next lesson.`,
      );
      return;
    }
    setProposal({ kind: "enroll", courseId: id, stage: "check", hours: 3 });
    say(
      `Let's review ${courseFor(id).name}. Before adding sessions, confirm your starting level and weekly availability.`,
    );
  };
  const adjust = () => {
    go("AI Reporter");
    setGradeChoice(false);
    setProposal({ kind: "balance", stage: "review", hours: state.hours });
    say(
      "Here is a workload adjustment for your review. Set the weekly hours you can manage, then approve to update the duration of your planned sessions.",
    );
  };
  const send = (value = chat) => {
    const text = value.trim();
    if (!text) return;
    setChat("");
    setProposal(null);
    setGradeChoice(false);
    setState((s) => ({
      ...s,
      messages: [...s.messages, { role: "user", text }],
    }));
    const t = text.toLowerCase();
    if (/hard|balance|workload|adjust|too much/.test(t)) {
      adjust();
      return;
    }
    if (/report/.test(t)) {
      setModal("report");
      say("Your local demo report is ready.");
      return;
    }
    if (/physics/.test(t) && !/7|12/.test(t)) {
      setGradeChoice(true);
      say(
        "Which Physics grade would you like to study? Grade recommendations do not verify prerequisites.",
      );
      return;
    }
    const id = /math/.test(t)
      ? "math"
      : /physics.*12/.test(t)
        ? "physics12"
        : /physics/.test(t)
          ? "physics"
          : /history/.test(t)
            ? "history"
            : /biology/.test(t)
              ? "biology"
              : /python/.test(t)
                ? "python"
                : /english/.test(t)
                  ? "english"
                  : null;
    if (id) {
      requestCourse(id);
      return;
    }
    if (/skip|already learn|fractions/.test(t)) {
      say(
        "A short assessment is needed before skipping a topic. Open a lesson and take its knowledge check; only a passing result changes verified progress.",
      );
      return;
    }
    say(
      "This prototype uses scripted responses. Try “learn Math 7”, “learn Physics”, “learn History 9”, “learn Biology 9”, or “adjust workload”. You can also browse the Library.",
    );
  };
  const approve = () => {
    if (!proposal) return;
    if (proposal.kind === "balance") {
      setState((s) => balance(s, proposal.hours));
      say(
        "Your workload adjustment is approved. Planned session durations have been updated.",
      );
    } else {
      const id = proposal.courseId!;
      setState((s) => enroll(s, id, proposal.hours));
      say(
        id === "history"
          ? "Your History pathway is approved. History 7 starts now; History 8 and 9 remain conditional future phases."
          : `${courseFor(id).name} is now enrolled. Three sample sessions have been added to your schedule.`,
      );
    }
    setProposal(null);
    setNotice("Plan updated. View Schedule to see your sessions.");
  };
  const defer = () => {
    const id = proposal?.courseId;
    if (!id) return;
    setState((s) => saveFuture(s, id));
    say(
      `${courseFor(id).name} saved for later. Your active schedule and current progress are unchanged. Prerequisites and availability will be reviewed before enrollment.`,
    );
    setProposal(null);
  };
  const openLesson = (session: Session) => {
    setSelected(session);
    setQuiz(session.kind === "quiz");
    setAnswers([]);
    setScore(null);
  };
  const activeCourse = courseFor(courseId);
  const pct = progress(state, courseId);
  const todays = state.sessions.filter((s) => s.date === dateKey(today()));
  const plannedToday = todays.filter((s) => s.status === "planned").length;
  const hour = today().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const title = {
    Home: `${greeting}, ${state.name} 👋`,
    Schedule: "Your learning schedule",
    Progress: `${activeCourse.name} · Course progress`,
    "AI Reporter": "AI learning assistant",
    Library: `Courses · ${currentCourse.name}`,
    Companion: "Companion",
  }[page];
  const subtitle = {
    Home: "One step at a time. Here's your learning plan for today.",
    Schedule:
      "Plan your week, review upcoming lessons, and keep your workload balanced.",
    Progress: "Lesson-based mastery, assessments, and recommended next steps.",
    "AI Reporter":
      "Ask questions, report difficulties, and reshape your plan together.",
    Library:
      "Upload your slides, confirm the concepts, then add modules from the sample library.",
    Companion: "Your study buddy while you review. Coming in week 3.",
  }[page];
  const start = addDays(anchor, -((anchor.getDay() + 6) % 7));
  const calendarDays =
    view === "Week"
      ? Array.from({ length: 7 }, (_, i) => addDays(start, i))
      : Array.from({ length: 42 }, (_, i) => {
          const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
          return addDays(first, i - ((first.getDay() + 6) % 7));
        });
  const pendingCourse = proposal?.courseId
    ? courseFor(proposal.courseId)
    : null;
  const overloaded =
    proposal?.kind === "enroll" &&
    state.active.length * 3 + (proposal?.hours || 0) > state.hours;
  const displayCourses = courses.filter(
    (c) =>
      (!futureTab || state.future.includes(c.id)) &&
      (filter === "All modules" || filter === c.category) &&
      `${c.name} ${c.description}`.toLowerCase().includes(query.toLowerCase()),
  );
  const quizQuestions =
    selected?.courseId === "english"
      ? [
          {
            q: "Yesterday, she ___ to school.",
            options: ["go", "went", "going"],
            correct: 1,
            explanation: "“Went” is the past simple form of “go”.",
          },
          {
            q: "I ___ studying when the phone rang.",
            options: ["was", "am", "were"],
            correct: 0,
            explanation:
              "“I was studying” describes an action in progress in the past.",
          },
          {
            q: "Which sentence uses past continuous?",
            options: ["They played.", "They play.", "They were playing."],
            correct: 2,
            explanation: "Past continuous uses was/were + verb-ing.",
          },
          {
            q: "While I was walking, I ___ a friend.",
            options: ["see", "saw", "seeing"],
            correct: 1,
            explanation: "The short event uses past simple: “saw”.",
          },
        ]
      : [
          {
            q: "What should you do before moving to the next topic?",
            options: [
              "Check your understanding",
              "Skip the assessment",
              "Only log study time",
            ],
            correct: 0,
            explanation: "Understanding is checked through an assessment.",
          },
          {
            q: "How does verified progress increase in this demo?",
            options: [
              "By opening a lesson",
              "By passing a check",
              "By adding a course",
            ],
            correct: 1,
            explanation: "A passing check is required.",
          },
        ];
  if (!token) return <AuthScreen onAuth={setToken} />;
  return (
    <div className="app">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <aside id="workspace-navigation" className={`sidebar ${menu ? "open" : ""}`}>
        <a href="#home" className="brand" onClick={() => go("Home")}>
          <span>✦</span> pathly
        </a>
        <div className="workspace-label">YOUR WORKSPACE</div>
        <nav aria-label="Main navigation">
          {nav.map(({ page: p, label, icon }) => (
            <button
              key={p}
              aria-current={page === p ? "page" : undefined}
              className={page === p ? "active" : ""}
              onClick={() => go(p)}
            >
              <span>{icon}</span>
              {label}
            </button>
          ))}
        </nav>
        <section className="goals">
          <div>CURRENT GOALS · {state.active.length}</div>
          {state.active.map((id) => (
            <button
              key={id}
              onClick={() => {
                setCourseId(id);
                go("Progress");
              }}
            >
              <span>{courseFor(id).name}</span>
              <b>{progress(state, id)}%</b>
            </button>
          ))}
        </section>
        <div className="sidebar-bottom">
          <button
            onClick={() => {
              setSettingsName(state.name);
              setSettingsHours(state.hours);
              setModal("settings");
            }}
          >
            ⚙ Settings
          </button>
          <button
            className="account"
            onClick={() => {
              setSettingsName(state.name);
              setSettingsHours(state.hours);
              setModal("settings");
            }}
          >
            <span className="avatar" />
            Student account
          </button>
        </div>
      </aside>
      <main id="main">
        <header className="topbar">
          <button
            className="mobile-menu icon-button"
            aria-label="Toggle navigation"
            aria-controls="workspace-navigation"
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            ☰
          </button>
          <strong className="course-name">{currentCourse.name}</strong>
          <span>
            {today().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </span>
          <div>
            <span className="demo-label">Interactive demo</span>
            <button
              className="icon-button"
              aria-label="Notifications"
              onClick={() => setModal("notifications")}
            >
              🔔
            </button>
            <button
              className="icon-button"
              aria-label="Account settings"
              onClick={() => {
                setSettingsName(state.name);
                setSettingsHours(state.hours);
                setModal("settings");
              }}
            >
              <span className="avatar" aria-hidden="true" />
            </button>
          </div>
        </header>
        <div className="page-heading" key={page}>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        {storageError && (
          <p role="alert" className="warning">
            Browser storage is unavailable. Changes will last for this visit
            only.
          </p>
        )}
        {page === "Home" && (
          <>
            <section className="card hero">
              <div className="ai-symbol">✦</div>
              <div>
                <h2>What would you like to learn?</h2>
                <p>
                  Create a new learning goal or adjust your current roadmap.
                </p>
              </div>
              <Button primary onClick={() => go("AI Reporter")}>
                + Plan with AI →
              </Button>
            </section>
            <h2 className="section-title">Today's focus</h2>
            <p className="section-caption">
              {today().toLocaleDateString("en-US", { weekday: "long" })} •{" "}
              {todays.length} sessions · {plannedToday} planned
            </p>
            <div className="home-grid">
              <div className="session-list">
                {todays.map((s) => (
                  <article
                    className={`card session ${s.kind === "quiz" ? "amber" : "purple"}`}
                    key={s.id}
                  >
                    <div className="session-content">
                      <span className="pill">
                        {s.time} · {s.minutes} min
                      </span>
                      <h3>{s.title}</h3>
                      <p>
                        {s.kind === "quiz"
                          ? "4 questions · Verification required"
                          : `${courseFor(s.courseId).name} · Lesson 4`}
                      </p>
                    </div>
                    <Button onClick={() => openLesson(s)}>
                      {s.status === "verified"
                        ? "Review result"
                        : s.kind === "quiz"
                          ? "Take quiz"
                          : "Start lesson"}
                    </Button>
                  </article>
                ))}
              </div>
              <section className="card overview">
                <h3>Goal overview</h3>
                <div className="metric-line">
                  <strong>{progress(state, "english")}%</strong>
                  <span>Verified progress</span>
                </div>
                <Meter value={progress(state, "english")} />
                <hr />
                <b>
                  {6 +
                    state.verified.filter(
                      (id) =>
                        state.sessions.find((s) => s.id === id)?.courseId ===
                        "english",
                    ).length}{" "}
                  of 14 lessons verified
                </b>
                <p className="amber-text">
                  {pendingCount(state, "english")} lessons awaiting assessment
                </p>
              </section>
            </div>
            <section className="card insight">
              <span className="ai-symbol green">✧</span>
              <div>
                <h3>AI suggestion</h3>
                <p>
                  {verifiedCount(state, "english") > 0
                    ? "Your latest verified check is recorded. Review difficult topics before moving on."
                    : "Complete a knowledge check to verify progress and unlock a more specific recommendation."}
                </p>
              </div>
            </section>
          </>
        )}
        {page === "Schedule" && (
          <>
            <div className="toolbar">
              <Button
                onClick={() =>
                  setAnchor((d) =>
                    view === "Week"
                      ? addDays(d, -7)
                      : new Date(d.getFullYear(), d.getMonth() - 1, 1),
                  )
                }
              >
                ‹ Previous
              </Button>
              <strong>
                {view === "Week"
                  ? `${formatted(start)} – ${formatted(addDays(start, 6))}, ${start.getFullYear()}`
                  : anchor.toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
              </strong>
              <Button
                onClick={() =>
                  setAnchor((d) =>
                    view === "Week"
                      ? addDays(d, 7)
                      : new Date(d.getFullYear(), d.getMonth() + 1, 1),
                  )
                }
              >
                Next ›
              </Button>
              <Button onClick={() => setAnchor(today())}>Today</Button>
              <select
                aria-label="Calendar view"
                value={view}
                onChange={(e) => setView(e.target.value)}
              >
                <option value="Week">Week view</option>
                <option value="Month">Month view</option>
              </select>
            </div>
            {state.active.includes("history") && (
              <div className="card pathway">
                <h3>History learning pathway · Six months</h3>
                <div className="actions">
                  <span className="pill green">
                    Months 1–2 · History 7 ACTIVE
                  </span>
                  <span className="pill">Months 3–4 · History 8 PLANNED</span>
                  <span className="pill amber">
                    Months 5–6 · History 9 CONDITIONAL
                  </span>
                </div>
              </div>
            )}
            <div className="calendar-scroll">
              <div className={`calendar ${view.toLowerCase()}`}>
                {calendarDays.map((d) => (
                  <section
                    key={dateKey(d)}
                    className={`day ${dateKey(d) === dateKey(today()) ? "today" : ""} ${view === "Month" && d.getMonth() !== anchor.getMonth() ? "outside" : ""}`}
                  >
                    <h3>
                      {d
                        .toLocaleDateString("en-US", { weekday: "short" })
                        .toUpperCase()}{" "}
                      {d.getDate()}
                    </h3>
                    {state.sessions
                      .filter((s) => s.date === dateKey(d))
                      .sort((a, b) => a.time.localeCompare(b.time))
                      .map((s) => (
                        <button
                          className={`calendar-event ${s.kind === "quiz" ? "amber" : courseFor(s.courseId).color}`}
                          key={s.id}
                          onClick={() => openLesson(s)}
                        >
                          <small>
                            {s.time} · {s.minutes}m
                          </small>
                          <strong>{s.title}</strong>
                          <small>{courseFor(s.courseId).name}</small>
                          {s.status !== "planned" && (
                            <small>
                              {s.status === "verified"
                                ? "✓ Verified"
                                : "Awaiting check"}
                            </small>
                          )}
                        </button>
                      ))}
                  </section>
                ))}
              </div>
            </div>
            <h2 className="section-title">Upcoming checkpoints</h2>
            <div className="card checkpoint">
              <span>{formatted(addDays(start, 6))} • Weekly revision</span>
              <span className="pill">Estimated: 45 min</span>
            </div>
          </>
        )}
        {page === "Progress" && (
          <>
            <div className="toolbar">
              <label>
                Learning goal{" "}
                <select
                  aria-label="Learning goal"
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                >
                  {state.active.map((id) => (
                    <option key={id} value={id}>
                      {courseFor(id).name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="two-columns">
              <section className="card progress-summary">
                <h3>Verified course completion</h3>
                <strong className="big-number">{pct}%</strong>
                <Meter value={pct} />
                <p>{Math.round((pct * 14) / 100)} / 14 lessons verified</p>
              </section>
              <section className="card progress-summary">
                <h3>Assessment summary</h3>
                <div className="stats">
                  <div>
                    <strong>{pendingCount(state, courseId)}</strong>
                    <p>Pending checks</p>
                  </div>
                  <div>
                    <strong>{verifiedCount(state, courseId)}</strong>
                    <p>Checks passed this demo</p>
                  </div>
                </div>
                <hr />
                <p>Progress increases only after assessment verification.</p>
              </section>
            </div>
            <h2 className="section-title">Course milestones</h2>
            {(courseId === "english"
              ? [
                  "Unit 1 • Foundations",
                  "Unit 2 • Vocabulary",
                  "Unit 3 • Past tenses",
                  "Unit 4 • Conversation",
                ]
              : activeCourse.topics
            ).map((unit, i) => {
              const courseSessions = state.sessions.filter(
                (session) => session.courseId === courseId,
              );
              const session =
                courseId === "english"
                  ? i === 2
                    ? courseSessions.find((item) => item.kind === "quiz")
                    : courseSessions[i]
                  : courseSessions.find((item) => item.title === unit);
              return (
              <article className="card milestone" key={unit}>
                <span
                  className={`number ${i < 2 && courseId === "english" ? "green" : ""}`}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3>{unit}</h3>
                  <p>
                    {courseId === "english" && i < 2
                      ? "Complete"
                      : i === 2
                        ? "Needs quiz"
                        : "Upcoming"}
                  </p>
                </div>
                <span>
                  {courseId === "english" && i < 2
                    ? "100%"
                    : i === 2 && courseId === "english"
                      ? "65%"
                      : "0%"}
                </span>
                <Button
                  disabled={!session}
                  onClick={() => session && openLesson(session)}
                >
                  {session ? "Review" : "Not scheduled"}
                </Button>
              </article>
              );
            })}
            <p className="footnote">
              Sample milestones illustrate the course structure. Demo quiz
              results update the verified completion above.
            </p>
          </>
        )}
        {page === "Library" && (
          <>
            <CoursesPage courseId={currentCourse.id} />
            <h2 className="section-title">Sample library</h2>
            <input
              className="search"
              aria-label="Search modules"
              placeholder="⌕  Search subjects, courses, or skill levels..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="filters" aria-label="Library filters">
              {[
                "All modules",
                "Mathematics",
                "Languages",
                "Sciences",
                "Humanities",
                "Technology",
              ].map((f) => (
                <button
                  aria-pressed={filter === f}
                  className={filter === f ? "selected" : ""}
                  key={f}
                  onClick={() => setFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="toolbar">
              <h2>
                {futureTab ? "Future learning plan" : "Recommended for you"}
              </h2>
              <div className="spacer" />
              <button
                className={!futureTab ? "text-button selected" : "text-button"}
                onClick={() => setFutureTab(false)}
              >
                Built-in study paths
              </button>
              <button
                className={futureTab ? "text-button selected" : "text-button"}
                onClick={() => setFutureTab(true)}
              >
                Saved for later ({state.future.length})
              </button>
            </div>
            <div className="two-columns course-grid">
              {displayCourses.map((c, i) => (
                <article className="card course" key={c.id}>
                  <div className="course-heading">
                    <span className={`number ${c.color}`}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3>{c.name}</h3>
                      <p>{c.description}</p>
                    </div>
                  </div>
                  <p>Prerequisite: {c.prerequisite}</p>
                  <div className="course-footer">
                    <span className={`pill ${c.color}`}>{c.weeks} weeks</span>
                    <span className="pill neutral">{c.level}</span>
                    <Button primary onClick={() => requestCourse(c.id)}>
                      {state.active.includes(c.id)
                        ? "View enrollment"
                        : "Choose module →"}
                    </Button>
                  </div>
                  {futureTab && (
                    <p className="amber-text">
                      Saved · Not enrolled or scheduled
                    </p>
                  )}
                </article>
              ))}
            </div>
            {displayCourses.length === 0 && (
              <div className="card empty">
                <h3>
                  {futureTab
                    ? "No saved modules yet"
                    : "No modules match your search"}
                </h3>
                <p>
                  {futureTab
                    ? "Choose a module and select “Add to future plan” in the AI Reporter."
                    : "Try another subject or clear the filters."}
                </p>
                <Button
                  onClick={() => {
                    setQuery("");
                    setFilter("All modules");
                    setFutureTab(false);
                  }}
                >
                  Browse all modules
                </Button>
              </div>
            )}
            <div className="card footnote">
              ✦ Selecting a module opens your AI coach for a prerequisite check.
              Enrollment is confirmed before lessons appear in Schedule.
            </div>
          </>
        )}
        {page === "AI Reporter" && (
          <div className="chat-layout">
            <section className="card chat-panel">
              <div className="chat-heading">
                <h3>✦ Pathly AI</h3>
                <span className="pill green">Simulated learning coach</span>
              </div>
              <div className="chat-history" role="log" aria-live="polite">
                {state.messages.map((m, i) => (
                  <div key={i} className={`message ${m.role}`}>
                    {m.role === "assistant" && <b>✦ Pathly AI</b>}
                    <p>{m.text}</p>
                  </div>
                ))}
                {gradeChoice && (
                  <div className="message assistant">
                    <h3>Choose your Physics level</h3>
                    <div className="actions">
                      <Button onClick={() => requestCourse("physics")}>
                        Grade 7 · Beginner
                      </Button>
                      <Button onClick={() => requestCourse("physics12")}>
                        Grade 12 · Advanced
                      </Button>
                    </div>
                  </div>
                )}
                {proposal && (
                  <div className="proposal">
                    <h3>
                      {proposal.kind === "balance"
                        ? "Review workload adjustment"
                        : `${pendingCourse!.name} · ${proposal.stage === "check" ? "Starting point" : "Proposed plan"}`}
                    </h3>
                    {proposal.kind === "enroll" &&
                    proposal.stage === "check" ? (
                      <>
                        <p>Prerequisite: {pendingCourse!.prerequisite}.</p>
                        <p>
                          {pendingCourse!.id === "history"
                            ? "Start with History 7. History 8 and 9 remain conditional until earlier assessments are passed."
                            : "This demo uses your confirmation; a real prerequisite assessment will be connected later."}
                        </p>
                        <div className="actions">
                          <Button
                            primary
                            onClick={() =>
                              setProposal({ ...proposal, stage: "review" })
                            }
                          >
                            {pendingCourse!.id === "history"
                              ? "Start with History 7"
                              : "I meet the prerequisite"}
                          </Button>
                          <Button
                            onClick={() => {
                              if (pendingCourse!.id === "physics12")
                                requestCourse("physics");
                              else
                                say(
                                  "Start with the foundation material or save this module for later. Enrollment has not changed.",
                                );
                            }}
                          >
                            I need foundations
                          </Button>
                          <Button onClick={defer}>Add to future plan</Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <label className="field">
                          {proposal.kind === "balance"
                            ? "Weekly study budget"
                            : "Hours per week for this course"}
                          <input
                            type="number"
                            min="1"
                            max="40"
                            value={proposal.hours}
                            onChange={(e) =>
                              setProposal({
                                ...proposal,
                                hours: Math.max(
                                  1,
                                  Math.min(40, Number(e.target.value) || 1),
                                ),
                              })
                            }
                          />
                        </label>
                        {proposal.kind === "balance" ? (
                          <>
                            <p>
                              Your{" "}
                              {
                                state.sessions.filter(
                                  (s) => s.status === "planned",
                                ).length
                              }{" "}
                              planned sessions will be resized to fit this
                              budget (10–60 minutes each). Completed work stays
                              verified.
                            </p>
                            <div className="balance-bars">
                              {state.active.map((id) => (
                                <div key={id}>
                                  <span>{courseFor(id).name}</span>
                                  <Meter value={100 / state.active.length} />
                                </div>
                              ))}
                            </div>
                          </>
                        ) : (
                          <>
                            <p>
                              {pendingCourse!.weeks} weeks · 3 sample sessions
                              to preview your first topics.
                            </p>
                            <ul>
                              {pendingCourse!.topics.map((t) => (
                                <li key={t}>{t}</li>
                              ))}
                            </ul>
                            {pendingCourse!.id === "history" && (
                              <p>
                                Months 1–2: History 7 · Months 3–4: History 8
                                (planned) · Months 5–6: History 9 (conditional).
                              </p>
                            )}
                            {overloaded && (
                              <div className="warning">
                                <b>This may overload your schedule.</b>
                                <p>
                                  Your {state.active.length} active goals have
                                  an estimated {state.active.length * 3}h weekly
                                  workload. This request adds {proposal.hours}h
                                  to your {state.hours}h budget. Save it for
                                  later or review your workload.
                                </p>
                              </div>
                            )}
                          </>
                        )}
                        <div className="actions">
                          <Button
                            primary
                            onClick={approve}
                            disabled={overloaded}
                          >
                            Approve{" "}
                            {proposal.kind === "balance" ? "changes" : "plan"}
                          </Button>
                          {proposal.kind === "enroll" && (
                            <Button onClick={defer}>Add to future plan</Button>
                          )}
                          {overloaded && (
                            <Button onClick={adjust}>Review workload</Button>
                          )}
                          <Button
                            onClick={() => {
                              setProposal(null);
                              say(
                                "Proposal dismissed. Your schedule is unchanged.",
                              );
                            }}
                          >
                            Not now
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}
                {!proposal && !gradeChoice && (
                  <div className="suggestions">
                    {[
                      "Learn Math 7",
                      "Learn Physics",
                      "Learn History 9",
                      "Learn Biology 9",
                    ].map((s) => (
                      <Button key={s} onClick={() => send(s)}>
                        {s}
                      </Button>
                    ))}
                  </div>
                )}
                <div ref={chatEnd} />
              </div>
              <form
                className="chat-input"
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
              >
                <input
                  aria-label="Message Pathly AI"
                  placeholder="Ask anything or tell me what to adjust..."
                  value={chat}
                  onChange={(e) => setChat(e.target.value)}
                />
                <button aria-label="Send message" disabled={!chat.trim()}>
                  ➤
                </button>
              </form>
            </section>
            <aside className="card report-panel">
              <h3>Daily report</h3>
              <span className="pill">{formatted(today())}</span>
              <hr />
              <h4>Today's status</h4>
              <p>
                {todays.filter((s) => s.status !== "planned").length} /{" "}
                {todays.length} sessions studied
              </p>
              <Meter
                value={
                  todays.length
                    ? (todays.filter((s) => s.status !== "planned").length /
                        todays.length) *
                      100
                    : 0
                }
              />
              <h4>AI observations</h4>
              <p>
                • Steady study routine
                <br />• Past tenses need practice
                <br />• Assessments verify progress
              </p>
              <hr />
              <h4>Suggested actions</h4>
              <Button onClick={adjust}>Adjust workload</Button>
              <Button onClick={() => setModal("report")}>
                Generate weekly report
              </Button>
              <Button
                onClick={() => {
                  setFutureTab(true);
                  setFilter("All modules");
                  setQuery("");
                  go("Library");
                }}
              >
                View future plan ({state.future.length})
              </Button>
              <h4>Active learning goals</h4>
              {state.active.map((id) => (
                <p key={id}>{courseFor(id).name}</p>
              ))}
              <p className="footnote">
                Plan changes require your confirmation. Responses are scripted;
                no AI service is connected.
              </p>
            </aside>
          </div>
        )}
        {page === "Companion" && (
          <section className="card companion">
            <h2>Choose a mode</h2>
            <ul>
              <li>Buddy · active</li>
              <li>Mentor</li>
              <li aria-disabled="true">
                🔒 Girlfriend · Verified 18+ users only
              </li>
            </ul>
          </section>
        )}
      </main>
      <nav className="bottom-nav" aria-label="Main navigation (mobile)">
        {nav.map(({ page: p, label, icon }) => (
          <button
            key={p}
            aria-current={page === p ? "page" : undefined}
            onClick={() => go(p)}
          >
            <span aria-hidden="true">{icon}</span>
            {label}
          </button>
        ))}
      </nav>
      {notice && (
        <div className="toast" role="status">
          ✓ {notice}
        </div>
      )}
      {modal === "settings" && (
        <Modal title="Your learning preferences" onClose={() => setModal(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setState((s) => ({
                ...s,
                name: settingsName.trim() || "Alex",
                hours: settingsHours,
              }));
              setModal(null);
              setNotice("Preferences saved");
            }}
          >
            <label className="field">
              Display name
              <input
                required
                maxLength={40}
                value={settingsName}
                onChange={(e) => setSettingsName(e.target.value)}
              />
            </label>
            <label className="field">
              Available hours per week
              <input
                required
                type="number"
                min={1}
                max={40}
                value={settingsHours}
                onChange={(e) => setSettingsHours(Number(e.target.value))}
              />
            </label>
            <p>
              Stored in this browser only. Use Adjust workload to review
              schedule changes.
            </p>
            <button className="button primary" type="submit">
              Save preferences
            </button>
          </form>
        </Modal>
      )}
      {modal === "notifications" && (
        <Modal title="Learning notifications" onClose={() => setModal(null)}>
          <p>You're ready for today's practice and knowledge check.</p>
          <p>
            {state.future.length} module(s) saved for later ·{" "}
            {state.active.length} active goal(s).
          </p>
          <Button
            primary
            onClick={() => {
              setModal(null);
              go("Schedule");
            }}
          >
            Open schedule
          </Button>
        </Modal>
      )}
      {modal === "report" && (
        <Modal
          title="Your weekly learning report"
          onClose={() => setModal(null)}
        >
          <span className="pill">Local demo data</span>
          <div className="stats">
            <div>
              <strong>{state.active.length}</strong>
              <p>Active goals</p>
            </div>
            <div>
              <strong>{state.verified.length}</strong>
              <p>Checks passed</p>
            </div>
            <div>
              <strong>{state.future.length}</strong>
              <p>Saved for later</p>
            </div>
          </div>
          <p>
            {state.sessions.filter((s) => s.status === "studied").length}{" "}
            sessions studied and waiting for assessment.
          </p>
          <p>
            Next step: complete pending checks before moving to the next
            learning phase.
          </p>
          <Button
            onClick={() => {
              setModal(null);
              go("Progress");
            }}
          >
            Review progress
          </Button>
        </Modal>
      )}
      {selected && (
        <Modal
          title={quiz ? "Knowledge check" : selected.title}
          onClose={() => setSelected(null)}
        >
          <span className="pill">
            {courseFor(selected.courseId).name} · {selected.minutes} min
          </span>
          {!quiz ? (
            <>
              <h3>{selected.title}</h3>
              <p>
                {selected.courseId === "english"
                  ? "Use past simple for completed actions: “I walked to school.” Use past continuous for an action in progress: “I was walking when it started raining.”"
                  : "This is a sample lesson workspace. Course materials and subject-specific assessments can be connected here later."}
              </p>
              <div className="lesson-note">
                <h4>Try it yourself</h4>
                <p>
                  Write one thing you learned and one question you still have.
                </p>
                <textarea
                  aria-label="Lesson notes"
                  placeholder="Your notes for this visit..."
                />
              </div>
              <div className="actions">
                <Button
                  onClick={() => {
                    setState((s) => ({
                      ...s,
                      sessions: s.sessions.map((x) =>
                        x.id === selected.id && x.status !== "verified"
                          ? { ...x, status: "studied" }
                          : x,
                      ),
                    }));
                    setNotice(
                      "Study recorded. Pass the knowledge check to earn progress.",
                    );
                  }}
                >
                  Mark as studied
                </Button>
                <Button primary onClick={() => setQuiz(true)}>
                  Take knowledge check →
                </Button>
              </div>
              <p className="footnote">
                Reading alone does not increase verified progress.
              </p>
            </>
          ) : (
            <>
              {selected.courseId !== "english" && (
                <p className="warning">
                  Demo workflow check only. Subject-specific questions are not
                  connected.
                </p>
              )}
              <p>
                Answer every question. Score at least 70% to verify this
                session.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const result = Math.round(
                    (answers.filter((a, i) => a === quizQuestions[i].correct)
                      .length /
                      quizQuestions.length) *
                      100,
                  );
                  setScore(result);
                  setState((s) => verify(s, selected.id, result));
                }}
              >
                {quizQuestions.map((q, i) => (
                  <fieldset key={q.q}>
                    <legend>
                      {i + 1}. {q.q}
                    </legend>
                    {q.options.map((o, n) => (
                      <label className="answer" key={o}>
                        <input
                          required
                          type="radio"
                          name={`q${i}`}
                          checked={answers[i] === n}
                          onChange={() => {
                            setAnswers((a) => {
                              const next = [...a];
                              next[i] = n;
                              return next;
                            });
                            setScore(null);
                          }}
                        />
                        {o}
                      </label>
                    ))}
                    {score !== null && <p>{q.explanation}</p>}
                  </fieldset>
                ))}
                <button className="button primary" type="submit">
                  Submit answers
                </button>
              </form>
              {score !== null && (
                <div
                  className={score >= 70 ? "result green" : "result amber"}
                  role="status"
                >
                  <b>
                    {score}% ·{" "}
                    {score >= 70
                      ? "Passed — progress verified"
                      : state.verified.includes(selected.id)
                        ? "Practice score — verification retained"
                        : "Keep practicing"}
                  </b>
                  <p>
                    {score >= 70
                      ? "This session earns credit once. Retaking cannot inflate progress."
                      : state.verified.includes(selected.id)
                        ? "Your earlier passing result remains verified. Review the explanations before trying again."
                        : "No progress awarded. Review the explanations and try again."}
                  </p>
                </div>
              )}
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
