# Contributing to FieldWeft

Thank you for helping improve the portable FieldWeft document core.

> **Documentation status:** This English contribution guide is normative. The
> [Korean edition](CONTRIBUTING.ko.md) is non-normative commentary. If the two
> differ, this English document takes precedence.

## Scope

Keep this repository limited to portable document logic that works in modern
browsers and supported Node.js versions. UI components, React, React Flow,
graph conversion, analysis, hosting, and application deployment belong in
their owning repositories.

Before starting a substantial change, open or reference an issue that explains
the problem, intended contract effect, and compatibility risk. Small,
self-contained corrections may go directly to a focused pull request.

## Development setup

FieldWeft requires Node.js 20 or newer. Use npm and treat `package-lock.json`
as the only package-manager lockfile.

```sh
git clone https://github.com/visyntax/fieldweft.git
cd fieldweft
npm ci
npm run verify
```

Do not add a runtime dependency without explaining why supported browser and
Node.js platform APIs are insufficient.

## Contract changes

Treat the FieldWeft v1 schema, generated types, validator, canonical
serialization, diagnostics, share codec, normative specification, tests, and
golden fixtures as one coordinated contract.

- A backward-compatible release must not make a valid FieldWeft v1 document
  invalid.
- Do not change canonical bytes, diagnostic codes or parameter meanings, `d1`
  tuple or token output, or golden fixtures as an incidental refactor.
- When the format changes intentionally, update the schema, generator,
  generated types, validator, specification, examples, and tests together.
- Run `npm run generate:fieldweft-types` after editing the schema. Do not edit
  `src/fieldweft-v1.generated.ts` by hand.

## Versioning and release channels

Treat the FieldWeft format version and the npm package version as separate
version axes. A package major release does not, by itself, permit a reader
claiming v1 support to reject a v1 document that satisfies the format contract.
This rule applies even when a package major adds a new format or changes its
JavaScript API.

For stable package releases:

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

Breaking changes are allowed between `1.0.0-rc.N` releases. This allowance does
not relax the frozen v1 document acceptance guarantee. The stable semver policy
starts with `1.0.0`. Publish RC releases with the npm `next` dist-tag and stable
releases with `latest`. After publishing `1.0.0`, also move `next` to `1.0.0`.

## Public API changes

The root entry point is `src/index.ts`. Its complete approved surface is
defined by `scripts/public-api-manifest.mjs` and rendered into
`docs/public-api-manifest.md`.

- Add or remove a root export only through an explicit manifest review.
- Keep runtime and declaration exports in exact parity with the approved
  manifest.
- Do not expose legacy `CodeDoc` names, the reference adapter, or layout-default
  constructors from the core package.
- Edit the manifest source and run `npm run generate:public-api-manifest`; do
  not hand-edit the rendered manifest.
- Compatibility aliases for `fieldweft-web` remain classification data in the
  manifest and are implemented only by that repository.

## Documentation

English documentation is normative. Korean documentation is non-normative
commentary, and English takes precedence when both describe the same contract.

- Keep public API documentation, emitted declaration JSDoc, and diagnostics in
  English.
- Update the corresponding Korean commentary when an English guide changes.
- Preserve relative links for both the repository and the packed npm artifact.
- Label application-specific integration behavior as non-normative and keep
  web-owned policy out of the core contract.

## Validation

Run the complete local gate before submitting a pull request:

```sh
npm run verify
```

This checks schema generation, the approved manifest, TypeScript, ESLint, the
documentation and npm publish-policy contracts, runtime and declaration
exports, core tests, documentation links and examples, golden contracts, and
benchmark executability.

If package metadata, exported files, or documentation inventory changes, also
inspect the packed artifact:

```sh
npm pack --dry-run
```

Release preparation must additionally run:

```sh
npm run verify:release
```

This creates the actual tarball, installs it into clean JavaScript and strict
NodeNext TypeScript consumer projects, checks the installed runtime and
declaration surfaces, and validates the packed documentation and license
assets. Follow the normative [npm release guide](docs/release-guide.md) for
repository setup, tag and dist-tag validation, trusted publishing, provenance,
and post-publication verification. Never push a release tag or publish without
explicit approval for that release.

## Pull requests and commits

- Keep changes focused and avoid unrelated formatting or generated-file churn.
- Add or update tests that fail before the change and pass after it.
- Explain compatibility effects and any intentional contract changes.
- Include validation results in the pull request description.
- Write commit subjects in English as concise imperative phrases. For
  substantial changes, add a blank line followed by short English `-` bullets
  covering behavior, validation, and documentation.

## Contribution license

This project is licensed under the
[Apache License, Version 2.0](LICENSE). Unless you explicitly state otherwise,
any contribution intentionally submitted for inclusion in this project is
submitted under that license, without additional terms or conditions.

By submitting a contribution, you represent that you are its copyright owner
or are authorized by its copyright owner to submit it under this license. You
also represent that you have obtained any approval required from an employer
or other third-party rights holder. Disclose any known third-party license or
other restriction associated with the contribution.
