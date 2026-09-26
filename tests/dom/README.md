# jsdom component suite (madash#33)

**Not wired into `npm run test:unit` yet, and deliberately not on the #37 PR
branch.** These files run green locally but cannot land until four
devDependencies are installed and lockfiled:

```bash
npm i -D jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom
```

That could not be done in the session that wrote them: `npm install` 401s on
every `@system-b90/*` package (System-B90/.github#28), so no valid
`package-lock.json` could be produced. Adding the deps to `package.json`
without matching lock entries breaks `npm ci`, so the whole suite was held
back rather than turning CI red.

## Finishing it

1. Install the four devDependencies above.
2. Point the script at both configs:
   ```json
   "test:unit": "vitest run --config tests/vitest.config.ts && vitest run --config tests/vitest.config.dom.ts"
   ```
3. `npx vitest run --config tests/vitest.config.dom.ts` — 9 tests should pass.

The node-env suite in `tests/backend/` is untouched and keeps its own config;
the two environments cannot share one project, which is why this is a second
config rather than a merged one.

## What is covered

`shared-sync-object-provider.test.tsx` (9 tests), the top-priority item in #33:

- `registerSyncProvider` emits the register message, and its cleanup emits the
  matching deregister **for the same id** — a mismatch leaks a server-side
  listener for the life of the socket.
- Mount registers with the server; unmount deregisters.
- Target filtering: a message for this sync object reaches child handlers; one
  for a different object is dropped; one with no target is dropped. That id
  check is the only thing keeping one board's updates out of another's.

## Still to write

- `students-provider` load-and-dispatch (mock `apiGetClasses` / `apiGetStudents`,
  assert `SHUFFLE_MOVE` triggers `START_REFRESH` plus both refetches).
- The expiry-label boundary in `AlarmClockTimePickerForm` (`פג תוקף` vs
  `בעוד …` either side of now).
