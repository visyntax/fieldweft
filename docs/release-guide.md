# FieldWeft npm Release Guide

> **Normative status:** This English document defines the FieldWeft npm
> release procedure. The [Korean edition](ko/release-guide.md) is
> non-normative commentary. If the two describe the same procedure
> differently, this English document takes precedence.

Publishing changes public external state. Do not create or push a release tag,
approve the `npm` GitHub environment, or run `npm publish` without explicit
maintainer approval for that release.

## Release tags and npm channels

Only these package-version and Git-tag forms are publishable:

| `package.json` version | Required Git tag | npm dist-tag |
|---|---|---|
| `X.Y.Z-rc.N` | `vX.Y.Z-rc.N` | `next` |
| `X.Y.Z` | `vX.Y.Z` | `latest` |

All numeric identifiers use canonical decimal form without leading zeroes.
Other prerelease identifiers are rejected. The publish workflow derives the
dist-tag from the package version; it does not accept a caller-selected
channel.

## One-time repository and npm setup

Complete these external steps before pushing any release tag:

1. Create the public GitHub repository `visyntax/fieldweft`, add it as the
   local `origin`, and confirm that `package.json` `repository.url` exactly
   matches `git+https://github.com/visyntax/fieldweft.git`.
2. Create a GitHub environment named `npm`. Configure required reviewers and
   restrict deployment branches and tags so publication always requires an
   explicit approval.
3. Protect release tags and restrict who may create `v*` tags.
4. Confirm that an npm account with 2FA can publish the unscoped `fieldweft`
   package.

An npm package must already exist before a trusted publisher can be attached
to it. For the first publication only, create the shortest-lived granular
token that can create and publish the package, with read/write access and
bypass 2FA enabled, and store it as the `NPM_TOKEN` secret on the protected
`npm` environment. A package-specific restriction may not be available before
the package exists, so minimize the token lifetime and revoke it immediately
after bootstrap. Use it only after the first release has been explicitly
approved.

Immediately after the package exists, configure its npm trusted publisher with
these exact values:

- provider: GitHub Actions;
- organization or user: `visyntax`;
- repository: `fieldweft`;
- workflow filename: `publish.yml`;
- environment: `npm`;
- allowed actions: `npm publish`.

Trusted publishing requires npm 11.5.1 or newer and Node.js 22.14.0 or newer.
The workflow uses Node.js 24 on a GitHub-hosted runner, grants only
`contents: read` and `id-token: write`, and publishes through the npm registry.
After one trusted publication succeeds, remove and revoke `NPM_TOKEN`, then set
npm publishing access to require 2FA and disallow tokens.

See the official npm documentation for
[trusted publishing](https://docs.npmjs.com/trusted-publishers/) and
[provenance](https://docs.npmjs.com/generating-provenance-statements/), and
the requirements for
[publishing an unscoped package](https://docs.npmjs.com/creating-and-publishing-unscoped-public-packages/).

## Automated publish safeguards

`.github/workflows/publish.yml` runs only for pushed `v*` tags in the official
repository and uses the protected `npm` environment. Every FieldWeft release
shares the fixed `npm-publish-fieldweft` concurrency group. `queue: max`
retains pending releases instead of replacing them, and no two publish
workflows run at the same time. The workflow performs these steps in order:

1. install exactly the dependencies in `package-lock.json` with `npm ci`;
2. require npm 11.5.1 or newer;
3. require the package name and version in `package-lock.json` to match
   `package.json`;
4. require public access, provenance, and the official repository URL;
5. require the Git tag to equal `v` plus the package version;
6. accept only stable or `rc.N` versions and derive `latest` or `next`;
7. run `npm run verify:release`, including the packed consumer smoke test;
8. run `npm publish --access public --provenance` with the derived dist-tag.

`scripts/check-publish-context.mjs` owns the tag, version, repository, npm
version, and dist-tag checks. `npm run test:publish-policy` verifies its failure
cases and the required workflow structure.

## Preparing an approved release

Before requesting approval:

1. update `package.json` and `package-lock.json` to the same intended version;
2. run `npm ci` and `npm run verify:release`;
3. commit the version change and push the commit to the official repository;
4. record the intended Git tag and npm dist-tag in the approval request.

After approval, create the exact tag matching the committed package version and
push only that tag. Pushing the tag starts publication; it is not a dry run.
Do not retry with another tag or version after a partial failure until the npm
registry state has been inspected.

## Post-publication verification

After the workflow reports success, independently verify the registry:

1. `npm view fieldweft@X.Y.Z[-rc.N] version --json` must return the intended
   version.
2. `npm view fieldweft dist-tags --json` must map `next` or `latest` to that
   version according to the table above.
3. `npm pack fieldweft@X.Y.Z[-rc.N] --json` must report the intended version,
   tarball filename, integrity, and shasum.
4. In a clean temporary project, install the registry package with scripts
   disabled and run `npm audit signatures`. Confirm that the FieldWeft package
   has a verified registry signature and provenance attestation.
5. On npmjs.com, confirm that the provenance source links to
   `visyntax/fieldweft`, `publish.yml`, the release tag, and the expected
   commit.
6. Record the version, dist-tag, tarball integrity, and provenance result in
   the release notes.

When stable `1.0.0` is published, move `next` to the same version only after
separate explicit approval:

```sh
npm dist-tag add fieldweft@1.0.0 next
```

Trusted-publishing OIDC credentials authorize `npm publish`, not arbitrary npm
account commands. Perform this dist-tag update with an interactive maintainer
session and 2FA, then verify both `latest` and `next`.
