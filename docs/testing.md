# Testing

Encore's unit tests run with [Jest](https://jestjs.io/) and TypeScript (through `ts-jest`). GitHub Actions runs every suite on each pull request and on every push to `main`.

## Run the tests

Install Node.js 24 or newer (the version CI uses is in `.nvmrc`). From the repository root:

```sh
npm install
npm test
```

Useful variations:

```sh
npm test -- prototype/ranking.test.ts    # one file
npm test -- -t "rejects a duplicate"     # tests whose name matches
npm run test:watch                       # rerun on save
npm run test:coverage                    # coverage report in coverage/
```

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

## Continuous integration

The workflow is [`.github/workflows/ci.yml`](../.github/workflows/ci.yml). It has one job:

| Job | What it runs |
| --- | --- |
| Jest (TypeScript) | `npm ci`, then `npm test -- --ci` |

Results appear in the **Checks** section of each pull request and on the repository's **Actions** tab. To see why a job failed, open it and expand the failed step; the output matches what `npm test` prints locally.

To make a failing test block the merge, a repository admin adds the job as a required status check: **Settings → Branches → Branch protection rules** (or **Rulesets**) for `main`, then **Require status checks to pass** and select `Jest (TypeScript)`.

Add a new dependency with `npm install --save-dev <package>` and commit both `package.json` and `package-lock.json`; CI installs exactly what the lockfile lists.

## When `app/` and `server/` are scaffolded

The root Jest config picks up `*.test.ts` files anywhere in the repository, which is enough while all code is plain TypeScript. The Expo app needs the `jest-expo` preset and React Native Testing Library, so when `app/` exists, give it its own `jest.config.js` and list each folder in the root config's [`projects`](https://jestjs.io/docs/configuration#projects-arraystring--projectconfig) option. `npm test` at the root then still runs everything, and CI needs no change. Maestro system tests run before each tester release and will get their own workflow.
