# Repository Guidelines

## Project Structure & Module Organization
This repository is a browser-based narrative game with a static frontend.

- `index.html`: app shell and DOM mount points.
- `js/`: core game logic (state, dialogue, missions, events, email, UI bindings).
- `css/`: terminal/game styling.
- `worldview/` and `WORLDVIEW.md`: narrative lore and route context.
- `docs/`: release notes and iteration planning docs.
- `progress.md`: current execution backlog/tasks for the next version.

Keep feature logic in `js/` modules by domain (for example `mission-system.js`, `events-system.js`) rather than adding monolithic code to `main.js`.

## Build, Test, and Development Commands
No build step is required; this project runs as static files.

- `python -m http.server 8000`: start local server.
- Open `http://localhost:8000` in a browser to run the game.
- `git log --oneline -n 10`: review recent commit style before committing.

## Coding Style & Naming Conventions
- JavaScript uses ES modules (`import`/`export`) and semicolons.
- Use 4-space indentation to match existing files.
- Naming:
  - `camelCase` for functions/variables.
  - `UPPER_SNAKE_CASE` for constants.
  - `kebab-case.js` for module filenames.
- Prefer small, focused modules; avoid circular imports.
- For v2.2 work, follow current backlog rules: add JSDoc to new functions and mark modified logic with `// v2.2 update:`.

## Testing Guidelines
There is currently no automated test framework in-repo. Use manual verification for every change:

1. Start local server and complete a full conversation loop.
2. Validate command flows (for example `/emails`) and modal behavior.
3. Check browser console for runtime errors.
4. Confirm route/event behavior affected by your change.

Document manual test steps and outcomes in the PR.

## Commit & Pull Request Guidelines
Recent history follows concise, conventional subjects such as `fix: ...` and `docs: ...`.

- Commit format: `type: short imperative summary` (`fix:`, `docs:`, `refactor:`, `feat:`).
- Keep commits scoped to one concern.
- PRs should include:
  - what changed and why,
  - impacted files/modules,
  - manual test evidence,
  - screenshots/GIFs for UI changes,
  - linked task/issue (for example `T1`, `T2` from `progress.md`).
