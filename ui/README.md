# Pathly interactive UI

React + TypeScript frontend for the CS252 study assistant. The Python CLI stays independent. This implements the supplied Pathly Figma concept as five pages and reusable interaction states.

## Platform

Pathly is a responsive browser application built with React, TypeScript, and Vite. Development is supported on Windows, macOS, and Linux. The finished static build runs in current versions of Chrome, Edge, Firefox, and Safari, including mobile browsers. It is not currently a native Windows, Android, or iOS application.

This prototype has no backend, user accounts, cloud synchronization, database, or real AI service. Its data stays in the current browser's local storage.

## Requirements

- Node.js 24.22.1 LTS or a newer Node 24 LTS security patch
- npm, which is included with the standard Node.js installer
- A modern web browser
- Internet access for the initial download and dependency installation
- Git only when cloning; it is not required when using a ZIP download

Python, Docker, API keys, and a database are not required for the UI.

## Download

### Option 1: Git

```bash
git clone https://github.com/MorganConsort/Group04-CS252-VirtualAssistant.git
cd Group04-CS252-VirtualAssistant/ui
```

### Option 2: ZIP

Open the GitHub repository, choose **Code → Download ZIP**, extract it, and open a terminal in the extracted `ui` folder.

## Install and run

From the `ui` folder:

```bash
npm install
npm run dev
```

Open the URL printed by Vite, normally `http://127.0.0.1:5173`.

Windows users who already installed the dependencies can alternatively run the Command Prompt launcher. It also works when PowerShell script execution is disabled:

```bat
start.cmd
```

The repository also includes `start.ps1`, but Windows may block unsigned PowerShell scripts depending on the computer's execution policy. The `.cmd` launcher avoids requiring an execution-policy change. macOS and Linux users should use `npm run dev`.

## Build for deployment

```bash
npm run build
npm run preview
```

`npm run build` type-checks the project and writes deployable static files to `dist/`. The `dist/` folder can be served by a static web host. Run `npm test` to check state transitions. Maintainers can use pnpm 11.25.0 with the included lockfile instead of npm.

## Troubleshooting

- `node` or `npm` is not recognized: install Node.js 24 LTS, close the terminal, and open a new one.
- PowerShell reports that scripts are disabled: run `.\start.cmd` instead of `.\start.ps1`.
- Dependencies are missing: run `npm install` again in the `ui` folder.
- Port 5173 is busy: run `npm run dev -- --port 5174` and open the printed URL.
- To reset the demo: remove the `pathly.demo.v1` entry from the site's browser local storage.

## Try the workflows

- Home: start a lesson, mark it studied, and pass its knowledge check. Reading does not award progress; passing the same session twice awards credit only once.
- Schedule: navigate weeks/months, return to Today, and select any session.
- Library: search and filter modules; choose one to review prerequisites in AI Reporter.
- AI Reporter: try `learn Math 7`, `learn Physics`, `learn History 9`, `learn Biology 9`, `adjust workload`, or `weekly report`.
- Confirm the prerequisite, review the proposed plan, and approve enrollment. New sessions appear in the calendar. History starts at level 7; later levels remain conditional.
- Save a module to the future plan without adding sessions. Find it under Library → Saved for later.
- Settings: change the display name and available weekly hours. Use Adjust workload to explicitly approve schedule changes.

## Prototype boundaries

No API keys, backend, database, or real LLM are needed. AI replies are deterministic examples, prerequisite confirmation is self-reported, schedule topics are sample data, and workload uses an illustrative 3 hours per active course estimate. Weekly budget adjustment resizes existing planned sessions (10–60 minutes), not a scheduling optimizer. English has four sample grammar questions; other modules use a clearly labeled workflow check. Progress milestones are illustrative, while the completion counter tracks local demo checks. The initial English goal begins at 6/14 verified lessons.

State is stored under `pathly.demo.v1` in browser localStorage, not an account. Lesson scratch notes last only while the dialog is open. Removing that storage key resets the demo. Saved demo schedules are rebased when the date changes so the relative calendar remains usable.

## Code map

- `src/model.ts`: typed sample courses, sessions, persistence, and state transitions. Replace these with API-backed data when ready.
- `src/App.tsx`: navigation, page views, controlled forms, lesson dialogs, and scripted coaching flows.
- `src/styles.css`: shared Figma colors, typography, cards, sidebar, responsive layouts.
- `src/model.test.ts`: progress, future-plan, enrollment, and workload invariants.

## Design source

https://www.figma.com/design/VG4biz9VR4o9dDg24Gl0BI

High-fidelity context was retrieved for Home, weekly Schedule, selected lesson, Library, course Progress, Reporter, Physics request, balanced proposal, History approval, overload warning, and deferred confirmation. Figma's Starter API limit prevented retrieval of some alternate states, including the monthly calendar; those interactions reuse the retrieved components. No screenshot is used as an implementation asset. The Code Connect `Book` component was not present in this Python starter, so the shared navigation uses the Library glyph supplied by the Home design. Inter is bundled locally through `@fontsource/inter`.
