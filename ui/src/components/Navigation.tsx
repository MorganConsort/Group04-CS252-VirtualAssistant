import { courseFor } from "../demo/selectors";
import type { State } from "../domain";
import { progress } from "../model";
import { nav, type Page } from "../navigation";
type Props = {
  state: State;
  page: Page;
  menu: boolean;
  go: (page: Page) => void;
  onGoal: (id: string) => void;
  onSettings: () => void;
};
export function Navigation({
  state,
  page,
  menu,
  go,
  onGoal,
  onSettings,
}: Props) {
  return (
    <aside
      id="workspace-navigation"
      className={`sidebar ${menu ? "open" : ""}`}
    >
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
            <span aria-hidden="true">{icon}</span>
            {label}
          </button>
        ))}
      </nav>
      <section className="goals">
        <div>CURRENT GOALS · {state.active.length}</div>
        {state.active.map((id) => (
          <button key={id} onClick={() => onGoal(id)}>
            <span>{courseFor(id).name}</span>
            <b>{progress(state, id)}%</b>
          </button>
        ))}
      </section>
      <div className="sidebar-bottom">
        <button onClick={onSettings}>⚙ Settings</button>
        <button className="account" onClick={onSettings}>
          <span className="avatar" />
          Student account
        </button>
      </div>
    </aside>
  );
}
