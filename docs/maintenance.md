# Maintenance and Regression Workflow

## Purpose

Use this workflow when LinkedIn changes a Jobs layout, a promoted card remains
visible, or an organic card is hidden. Detection must remain local,
card-specific, and fail open.

## Capture Safe Evidence

1. Record the browser and extension versions, LinkedIn language, supported page
   path, direct or client-side navigation, and whether the toolbar badge is ON.
2. Confirm the behavior in both Chrome and Brave when possible.
3. Inspect the smallest owning job-card boundary and exact promoted marker.
4. Remove names, companies, locations, job IDs, tracking parameters, account
   data, images, and generated identifiers before saving evidence.
5. Never commit raw LinkedIn page exports or full account HTML.

## Add Fixtures

1. Add the smallest sanitized promoted or organic card to
   `test/fixtures/linkedin/`.
2. Prefer a promoted/organic pair for the same observed layout.
3. Add the fixture to `test/fixtures/linkedin/fixture-index.json`.
4. Preserve stable semantic relationships only. Do not rely on generated
   classes, Ember IDs, tracking URLs, or fixture-only metadata.
5. Run `npm test` before changing detection. The new fixture should reproduce
   the regression first.

## Change Detection

1. Keep classification in `ext/js/detection.js` pure and fail open.
2. Require exact localized leaf markers from `ext/js/langs.json`.
3. Return only the smallest verified owning card boundary.
4. Keep DOM mutation, navigation, hide, and restoration behavior in
   `ext/js/hide.js`.
5. Add focused tests for every repaired false positive, false negative, or
   lifecycle defect.

## Verify

Run:

```bash
npm ci
npm run check
npm run release
```

Then reload the unpacked extension and repeat this live matrix in Chrome and
Brave:

- direct Jobs search
- filter change
- client navigation from Feed to Jobs and into a recent search
- page replacement or newly appended cards
- toggle OFF and ON
- browser restart with hiding enabled
- at least one confirmed organic result
- unsupported Feed and individual job-detail pages
- extension and page console review

No release passes if a confirmed organic card is hidden, an extension error is
present, or a required browser workflow is unverified.

## Release

1. Keep `package.json` and `ext/manifest.json` versions identical.
2. Update the release notes and browser support documentation.
3. Run `npm run release`; it builds twice and fails if the ZIP hashes differ.
4. Record the ZIP SHA-256 in the release notes.
5. Push a release branch and merge it through a reviewed pull request.
6. Tag the tested merge commit and attach the ZIP plus `.sha256` file to the
   GitHub release.
7. Confirm the release archive contains no fixtures, account evidence, secrets,
   duplicate files, or development-only documentation.

## Roll Back

1. Identify the last verified commit or release tag.
2. Check it out in a separate directory or detached worktree.
3. If that revision includes a lockfile, run its documented dependency install
   and checks. Historical revisions may require their original toolchain.
4. Load that revision's `ext/` directory and verify the badge and direct search.
5. Keep the failed release available for diagnosis; do not rewrite published
   tags.
