# Repository instructions

## Scope

- This repository contains the portable FieldWeft document core.
- Keep UI, React, React Flow, graph conversion, analysis, hosting, and application deployment code outside this repository.
- Runtime code must remain usable in both modern browsers and supported Node.js versions.

## Node.js and package manager

- Use Node.js 20 or newer.
- Use npm and treat `package-lock.json` as the package-manager source of truth.
- Do not create lockfiles for other package managers.
- Do not add runtime dependencies without documenting why the platform APIs already available in supported runtimes are insufficient.

## TypeScript and modules

- Build with TypeScript using `module` and `moduleResolution` set to `NodeNext`.
- Include `.js` extensions in relative imports written in TypeScript so emitted ESM runs directly in Node.js.
- Emit JavaScript and declaration files into `dist`.
- Export public API only through `src/index.ts` and keep it synchronized with the public API manifest.

## Contract changes

- Treat the v1 schema, validator, canonical serialization, diagnostics, share codec, and golden fixtures as one contract.
- Change the schema, generated types, validator, specification, and tests together when the format contract changes.
- Do not change canonical bytes, diagnostic codes or parameter meanings, d1 tokens, or golden fixtures as an incidental refactor.
- A valid FieldWeft v1 document must not become invalid under a backward-compatible package release.

## Versioning and release channels

- Treat the FieldWeft format version and the npm package version as separate
  version axes.
- A package major release does not, by itself, permit a reader claiming v1
  support to reject a v1 document that satisfies the format contract.
- Adding a diagnostic `code` requires a minor release.
- Adding a diagnostic `params` key requires a minor release.
- Changing only human-readable diagnostic message wording requires a patch
  release.
- Removing or renaming a diagnostic `code`, or changing its meaning, requires a
  major release.
- Removing or renaming a diagnostic `params` key, or changing its meaning,
  requires a major release.
- Consumers must tolerate unrecognized diagnostic `code` values and handle them
  generically using `severity`, `path`, and `message`.
- Consumers must ignore unrecognized diagnostic `params` keys.
- Breaking changes are allowed between `1.0.0-rc.N` releases. This allowance
  does not relax the frozen v1 document acceptance guarantee. The stable
  semver policy starts with `1.0.0`.
- Publish RC releases with the npm `next` dist-tag and stable releases with
  `latest`.
- After publishing `1.0.0`, also move `next` to `1.0.0`.

## Publishing

- Never create or push a release tag, approve the `npm` environment, or run
  `npm publish` without explicit maintainer approval for that release.
- Publish only from `.github/workflows/publish.yml` in the official
  `visyntax/fieldweft` repository.
- Require the Git tag to equal `v` plus the package version and derive the npm
  dist-tag from that version; do not accept a caller-selected dist-tag.
- Serialize every FieldWeft publish in one fixed package concurrency group,
  retain pending releases with `queue: max`, and never cancel an in-progress
  publish.
- Run `npm run verify:release` before `npm publish`.
- Use the protected `npm` environment, trusted publishing when available, and
  npm provenance. Treat `NPM_TOKEN` as a one-time first-publication bootstrap
  credential and revoke it after trusted publishing succeeds.
- Follow `docs/release-guide.md` for external setup and post-publication
  verification.

## Documentation

- English documentation is normative. Korean documentation is non-normative commentary.
- State that English takes precedence when both versions cover the same contract.
- Keep public API documentation, declaration JSDoc, and diagnostic messages in English.

## Validation

- Run `npm run verify` for schema generation, export-manifest parity,
  TypeScript, lint, documentation and npm publish-policy contracts, core tests,
  and benchmark smoke checks.
- Run `npm run verify:release` before release to include the actual packed
  tarball smoke test.
- Validate the packed tarball rather than relying only on the source tree.

## Commit messages

- Write the subject in English as a concise imperative phrase describing the resulting change.
- Do not use Conventional Commit prefixes unless explicitly requested.
- For substantial changes, add a blank line followed by short English `-` bullets covering behavior, validation, and documentation.
