import { useEffect, useRef, useState } from "react";
import { checkSetup } from "./api/service";
import { currentCourse } from "./api/mock";
import { AuthScreen } from "./components/AuthScreen";
import { CoursesPage } from "./pages/CoursesPage";
import { Button } from "./components/Button";
import { Modal } from "./components/Modal";
import { Navigation } from "./components/Navigation";
import { courseFor } from "./demo/selectors";
import { AppearancePicker } from "./features/appearance/AppearancePicker";
import { LessonDialog } from "./features/learning-check/LessonDialog";
import {
  balance,
  enroll,
  readState,
  saveFuture,
  today,
  verify,
  type Session,
} from "./model";
import { nav, pageLabels, pages, type Page, type Proposal } from "./navigation";
import { HomePage } from "./pages/HomePage";
import { LibraryPage } from "./pages/LibraryPage";
import { ProgressPage } from "./pages/ProgressPage";
import { ReporterPage } from "./pages/ReporterPage";
import { SchedulePage } from "./pages/SchedulePage";

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
  const [courseId, setCourseId] = useState("english");
  const [filter, setFilter] = useState("All modules");
  const [query, setQuery] = useState("");
  const [futureTab, setFutureTab] = useState(false);
  const [calendarAnchor, setCalendarAnchor] = useState(today);
  const [calendarView, setCalendarView] = useState("Week");
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
        `${courseFor(id).name} is already active. Open ${pageLabels.Progress} to see your next lesson.`,
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
      `This prototype uses scripted responses. Try “learn Math 7”, “learn Physics”, “learn History 9”, “learn Biology 9”, or “adjust workload”. You can also browse ${pageLabels.Library}.`,
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
    setNotice(
      `Plan updated. Open ${pageLabels.Schedule} to see your sessions.`,
    );
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
  };
  const activeCourse = courseFor(courseId);
  const hour = today().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const title = {
    Home: `${greeting}, ${state.name} 👋`,
    Schedule: `${pageLabels.Schedule} · Your learning schedule`,
    Progress: `${pageLabels.Progress} · ${activeCourse.name}`,
    "AI Reporter": `${pageLabels["AI Reporter"]} · Your learning assistant`,
    Library: `${pageLabels.Library} · ${currentCourse.name}`,
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

  if (!token) return <AuthScreen onAuth={setToken} />;

  return (
    <div className="app">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <Navigation
        state={state}
        page={page}
        menu={menu}
        go={go}
        onGoal={(id) => {
          setCourseId(id);
          go("Progress");
        }}
        onSettings={() => {
          setSettingsName(state.name);
          setSettingsHours(state.hours);
          setModal("settings");
        }}
      />
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
            <span className="demo-label">
              {checkSetup.error
                ? "Check configuration error"
                : checkSetup.config?.mode === "api"
                  ? "API checks · demo workspace"
                  : "Demo mode"}
            </span>
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
          <HomePage state={state} go={go} openLesson={openLesson} />
        )}
        {page === "Schedule" && (
          <SchedulePage
            state={state}
            openLesson={openLesson}
            anchor={calendarAnchor}
            setAnchor={setCalendarAnchor}
            view={calendarView}
            setView={setCalendarView}
          />
        )}
        {page === "Progress" && (
          <ProgressPage
            state={state}
            courseId={courseId}
            setCourseId={setCourseId}
            openLesson={openLesson}
          />
        )}
        <div hidden={page !== "Library"}>
          <CoursesPage courseId={currentCourse.id} />
        </div>
        {page === "Library" && (
          <LibraryPage
            state={state}
            query={query}
            setQuery={setQuery}
            filter={filter}
            setFilter={setFilter}
            futureTab={futureTab}
            setFutureTab={setFutureTab}
            requestCourse={requestCourse}
          />
        )}
        {page === "AI Reporter" && (
          <ReporterPage
            state={state}
            gradeChoice={gradeChoice}
            proposal={proposal}
            setProposal={setProposal}
            requestCourse={requestCourse}
            say={say}
            defer={defer}
            approve={approve}
            adjust={adjust}
            send={send}
            chat={chat}
            setChat={setChat}
            chatEnd={chatEnd}
            onReport={() => setModal("report")}
            onFuturePlan={() => {
              setFutureTab(true);
              setFilter("All modules");
              setQuery("");
              go("Library");
            }}
          />
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
          <hr />
          <AppearancePicker />
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
            Open {pageLabels.Schedule}
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
            Open {pageLabels.Progress}
          </Button>
        </Modal>
      )}
      {selected && (
        <LessonDialog
          key={selected.id}
          session={selected}
          previouslyVerified={state.verified.includes(selected.id)}
          onClose={() => setSelected(null)}
          onStudied={() => {
            setState((s) => ({
              ...s,
              sessions: s.sessions.map((x) =>
                x.id === selected.id && x.status !== "verified"
                  ? { ...x, status: "studied" }
                  : x,
              ),
            }));
            setNotice(
              "Study recorded. Pass the knowledge check to earn demo progress.",
            );
          }}
          onComplete={(result) => {
            if (checkSetup.config?.mode === "demo" && result.passed)
              setState((s) => verify(s, result.sessionId, result.score));
          }}
        />
      )}
    </div>
  );
}
