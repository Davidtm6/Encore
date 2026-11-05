# Contributing to Encore

This guide covers how we use Git and GitHub: branches, commits, pull requests, and bugs. To get the project running, start with the [README](README.md) and the [setup guide](docs/setup.md). [Testing](docs/testing.md) explains how to run and add tests.

## Workflow

1. Pick or file a GitHub issue for the change.
2. Branch from an up-to-date `main`:

   ```sh
   git switch main
   git pull
   git switch -c feature/movie-details
   ```

3. Commit in small, coherent steps (see [Commits](#commits)).
4. Before opening a pull request, run the checks from the repository root:

   ```sh
   npm run build   # type-check and lint the app; type-check the Edge Function
   npm test        # Jest tests
   ```

   If you changed SQL, also run `npm run test:db` (it needs a local Postgres; see [testing](docs/testing.md#database-tests-on-your-machine)), or let CI run it.
5. Push the branch and open a pull request into `main` (see [Pull requests](#pull-requests)).

### Branch names

Use a prefix and a short description in kebab case:

| Prefix | For | Example |
| --- | --- | --- |
| `feature/` | New behavior | `feature/api-integration` |
| `fix/` | Bug fixes | `fix/rank-cancel-resets-list` |
| `docs/` | Documentation only | `docs/contributing-and-build` |
| `test/` | Tests only | `test/review-limits` |
| `ci/` | CI and tooling | `ci/jest-github-actions` |
| `chore/` | Cleanup and dependencies | `chore/remove-python-prototype` |

Keep one change per branch, and delete the branch after it merges.

## Commits

- Write the subject in the imperative, describing what the commit does, in about 70 characters or fewer: "Search movies live from TMDB", not "updates" or "fixed stuff".
- When the reason isn't obvious from the diff, add a body after a blank line that explains why.
- Keep each commit to one coherent change that builds and passes tests. Don't mix unrelated fixes.
- Never commit secrets: no database password, Supabase secret key, or TMDB token. The publishable key in `app/.env.development` is meant to be public.

## Pull requests

- **Description:** what changed, why, and how you tested it. Link the issue with `Closes #<number>` so it closes when the PR merges.
- **Docs:** any PR that changes setup or behavior updates the relevant doc in `README.md` or `docs/`.
- **Review:** every PR gets one review from a teammate before merging. This is a team rule; GitHub doesn't enforce it.
- **Merging:** use the merge button once checks pass. Keep the branch up to date with `main` if it falls behind.

### What GitHub enforces on `main`

The "Protect main" ruleset applies to everyone, including admins:
- Changes reach `main` only through a pull request. No direct pushes.
- These CI checks must pass before merging: `Jest (TypeScript)`, `App (typecheck and lint)`, `Database (migrations and access rules)`, and `Edge Function (type check)`. The `Build (npm run build)`, `Python prototype`, and `TMDB format` jobs also run, but aren't required.
- Force-pushes to `main` and deleting `main` are blocked.

CI runs on every pull request and every push to `main`; see [testing](docs/testing.md).

### Database changes

Follow the rules in [Changing the schema](docs/setup.md#changing-the-schema):
- Add a new migration; never edit an existing one.
- Push a migration to the shared database only after its PR merges.
- Commit migrations together with the regenerated `app/src/types/database.ts`.

## Bugs

We track bugs in [GitHub Issues](https://github.com/Davidtm6/Encore/issues).

1. **Search first.** If the bug is already filed, add what you know to that issue.
2. **File it** with **New issue → Bug report**. The template asks for:
   - steps to reproduce;
   - expected and actual behavior;
   - the use case it affects (UC1–UC5);
   - device, OS, and how you ran the app;
   - how severe it is.

   It labels the issue `bug` automatically.
3. **Triage:** bugs are reviewed at the weekly planning meeting, where the team sets priority and picks an owner.
4. **Fix:** fix it on a `fix/` branch. Add a regression test that fails before the fix and passes after, and link the issue with `Closes #<number>` in the PR.

### Planning labels

| Label | Meaning |
| --- | --- |
| `beta` | Needed for the course beta release |
| `tester-release` | Needed for the tester release (M4–M5): finishing the MVP and distributing it to testers |
| `bug`, `enhancement`, `documentation`, `accessibility`, `question` | The kind of work |

## Code style

- Run `npm run build` before pushing; it includes ESLint with `eslint-config-expo` and the TypeScript compiler.
- Code should follow the [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html) and the [Airbnb React/JSX Style Guide](https://airbnb.io/javascript/react/). Google's guide wins where they conflict. The team's plan is to enforce these with `gts`, `eslint-plugin-react`, and `eslint-plugin-react-hooks` (see [coding guidelines](docs/living-document.md#9-coding-guidelines)). Today only `eslint-config-expo` is wired up, so reviewers check the rest.
- In the app, screens call hooks and hooks call services. Screens never call Supabase directly.
