# Testing

Encore's unit tests run with [Jest](https://jestjs.io/) and TypeScript (through `ts-jest`). GitHub Actions runs every suite on each pull request and on every push to `main`. The Python ranking prototype keeps its own `unittest` suite, which CI also runs.

## Run the tests

Install Node.js 24, the version in `.nvmrc` and CI ([setup](setup.md#1-install-nodejs-24-and-the-dependencies) explains how). From the repository root:

```sh
npm install
npm test
```

Useful variations:

```sh
npm test -- app/src/ranking              # the app's ranking engine
npm test -- -t "rejects a duplicate"     # tests whose name matches
npm run test:watch                       # rerun on save
npm run test:coverage                    # coverage report in coverage/
```

The Python prototype tests need Python 3.10 or newer and no packages:

```sh
python3 -m unittest discover -s prototype -v
```

Type-check and lint the app from `app/` (after `npm install` there):

```sh
npm run typecheck
npm run lint
```

## What is tested

| Suite | Covers |
| --- | --- |
| `app/src/ranking/ranking-session.test.ts` | The ranking engine used by the Rank screen: first movie, every insertion position for lists of 0–128 films within `ceil(log2(n + 1))` comparisons, cancel leaving the list unchanged, and re-rank keeping other movies in order |
| `prototype/ranking.test.ts` and `prototype/test_ranking.py` | The reference binary-insertion prototypes |

Screens and the database are checked by hand for the first demo, following the demo script in [setup](setup.md#demo-script). To check `save_ranking` and the access policies in the dashboard SQL editor, sign up two test accounts and confirm three things:
- One account can't see or rank the other's movies.
- `save_ranking` rejects an order with a repeated movie, a missing ranked movie, or a movie that isn't watched.
- No user ever has two movies at the same `rank_position`.

## Add a test

1. Create a file ending in `.test.ts` (or `.test.tsx`) next to the code it tests, for example `prototype/ranking.test.ts` beside `prototype/ranking.ts`. Jest finds it automatically; there is nothing to register.
2. Write the test:

   ```ts
   import {insertionIndex} from './ranking';

   describe('insertionIndex', () => {
     it('puts a preferred movie first', () => {
       expect(insertionIndex(['Arrival'], 'Heat', () => true)).toBe(0);
     });
   });
   ```

3. Run `npm test` and check that it passes. Also check that it can fail: break the code briefly and confirm the test catches it.
4. Open a pull request. CI runs the new test with the rest.

Name each `it(...)` after the behavior it checks, so a failure in CI reads as a sentence. Every bug fix gets a regression test that fails before the fix.

For the Python prototype, add `test_*` methods to `prototype/test_ranking.py`, or create a new `prototype/test_*.py` file.

## Continuous integration

The workflow is [`.github/workflows/ci.yml`](../.github/workflows/ci.yml). It has three jobs:

| Job | What it runs |
| --- | --- |
| Jest (TypeScript) | `npm ci`, then `npm test -- --ci` |
| App (typecheck and lint) | In `app/`: `npm ci`, `npm run typecheck`, `npm run lint` |
| Python prototype | `python -m unittest discover -s prototype -v` |

Results appear in the **Checks** section of each pull request and on the repository's **Actions** tab. To see why a job failed, open it and expand the failed step; the output matches what `npm test` prints locally.

To make a failing check block the merge, a repository admin adds the jobs as required status checks: **Settings → Branches → Branch protection rules** (or **Rulesets**) for `main`, then **Require status checks to pass** and select `Jest (TypeScript)`, `App (typecheck and lint)`, and `Python prototype`.

Add a root dependency with `npm install --save-dev <package>` and commit both `package.json` and `package-lock.json`; CI installs exactly what the lockfile lists. In `app/`, add packages with `npx expo install <package>` so the version matches the Expo SDK.

## Component tests and `server/`

The root Jest config picks up `*.test.ts` files anywhere in the repository, including `app/`. That is enough while the tested code is plain TypeScript with no React Native imports, like the ranking engine. Component tests need the `jest-expo` preset and React Native Testing Library. When the first one is added, give `app/` its own `jest.config.js` and list each folder in the root config's [`projects`](https://jestjs.io/docs/configuration#projects-arraystring--projectconfig) option. `npm test` at the root then still runs everything, and CI needs no change. Maestro system tests run before each tester release and will get their own workflow.
