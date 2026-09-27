# Release notes

`UNRELEASED.md` is the hand-written top of the next GitHub release: the release
workflow replaces `{{TAG}}` with the tag, prepends it to the auto-generated PR
list, and publishes both.

- Add a section to `UNRELEASED.md` for any user-visible change worth showing off.
- Screenshots live in `assets/`. Reference them with
  `https://raw.githubusercontent.com/System-B90/madash/{{TAG}}/docs/release-notes/assets/<file>.png`
  so each release pins the images of its own tag.
- `tests/release-screenshots.spec.ts` regenerates the screenshots with mock data (opt-in via
  `RELEASE_SCREENSHOTS=1`).
- After tagging a release, reset `UNRELEASED.md` to empty for the next cycle.
