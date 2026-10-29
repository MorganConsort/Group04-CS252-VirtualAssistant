import { Button } from "../components/Button";
import { Meter } from "../components/ProgressMeter";
import { courseFor } from "../demo/selectors";
import type { Session, State } from "../domain";
import { pendingCount, progress, verifiedCount } from "../model";

type Props = {
  state: State;
  courseId: string;
  setCourseId: (id: string) => void;
  openLesson: (session: Session) => void;
};
export function ProgressPage({
  state,
  courseId,
  setCourseId,
  openLesson,
}: Props) {
  const activeCourse = courseFor(courseId);
  const pct = progress(state, courseId);
  return (
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
        Sample milestones illustrate the course structure. Demo quiz results
        update the verified completion above.
      </p>
    </>
  );
}
