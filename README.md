# FieldWeft

FieldWeft is a portable JSON document core for describing data-lineage
entities, processes, boundaries, node-level relations, and field-level
mappings. This package provides the versioned schema and types, validation,
canonical serialization, semantic and layout projections, structural diffing,
field-ID allocation, and the `d1` share codec.

> **Documentation status:** English documentation is normative. Korean
> documentation is non-normative commentary. If the two describe the same
> contract differently, the English documentation takes precedence.
>
> [한국어 안내](README.ko.md)

## Package scope

The package contains browser- and Node.js-compatible document logic. It does
not contain UI components, React or React Flow integration, graph conversion,
analysis, hosting, or application deployment code.

The public package surface is limited to:

- the root `fieldweft` entry point;
- `fieldweft/schema/v1`;
- the named files under `fieldweft/fixtures/*`.

Legacy `CodeDoc` names are not exported by the core package. Compatibility
aliases belong in `fieldweft-web`. The reference adapter and layout-default
constructors are implementation or repository-reference code and are not
public package APIs.

## Minimal document

Every FieldWeft v1 document has the `fieldweft` format marker, version `1`,
and all five top-level arrays:

```json
{
  "format": "fieldweft",
  "version": 1,
  "entities": [],
  "processes": [],
  "boundaries": [],
  "nodeRelations": [],
  "mappings": []
}
```

Unknown properties are rejected. The JSON Schema defines the structural
contract, while the validator additionally enforces identity, reference,
direction, membership, coordinate, and aggregate resource constraints.

## Read and canonicalize input

Treat external input as `unknown` and pass it through the shared read pipeline:

```ts
import {
  formatFieldWeftDiagnostic,
  readCanonicalFieldWeftDoc,
  serializeCanonicalFieldWeftDoc,
} from 'fieldweft'

const result = readCanonicalFieldWeftDoc(input)

if (!result.ok) {
  throw new Error(result.errors.map(formatFieldWeftDiagnostic).join('\n'))
}

const compactJson = serializeCanonicalFieldWeftDoc(result.doc)
```

Successful validation does not mutate the input. Canonicalization creates a
new document, materializes missing layout defaults, omits canonical empty
values, and deterministically orders set- and map-like data. Use the
FieldWeft serializer whenever canonical bytes matter; ordinary
`JSON.stringify` is not the canonical byte contract.

## Documentation

| English normative document | Korean commentary |
|---|---|
| [FieldWeft v1 JSON specification](docs/code-spec.md) | [한국어 해설](docs/ko/code-spec.md) |
| [Authoring and editing guide](docs/fieldweft-authoring-guide.md) | [한국어 해설](docs/ko/fieldweft-authoring-guide.md) |
| [Adapter guide](docs/fieldweft-adapter-guide.md) | [한국어 해설](docs/ko/fieldweft-adapter-guide.md) |
| [Sharing guide](docs/fieldweft-sharing-guide.md) | [한국어 해설](docs/ko/fieldweft-sharing-guide.md) |
| [npm release guide](docs/release-guide.md) | [한국어 해설](docs/ko/release-guide.md) |
| [Approved public API manifest](docs/public-api-manifest.md) | — |

The machine-readable structural contract is
[`schema/fieldweft-v1.schema.json`](schema/fieldweft-v1.schema.json).
Named canonical and `d1` fixtures are published from [`fixtures/`](fixtures/).

## Compatibility contracts

Compatibility guarantees begin with the stable package version `1.0.0`.
Before that release, the FieldWeft v1 specification and all coordinated
contract artifacts may change without backward compatibility. From `1.0.0`
onward, a backward-compatible release must not invalidate a document that is
valid under the stable FieldWeft v1 contract. Schema behavior, generated types,
validator semantics, canonical bytes, diagnostic codes and parameter meanings,
`d1` tuples and tokens, and golden fixtures are maintained as one coordinated
contract.

## Format and package versioning

The FieldWeft format version and the npm package version are separate version
axes. The document marker `version: 1` identifies the current v1 wire contract,
and stable package version `1.0.0` establishes that contract as the compatibility
baseline. The package version identifies a release of the reader, writer, and
supporting APIs. A future package major may add another format or change
JavaScript APIs without renaming or withdrawing stable v1. After the baseline
is established, a package major release does not, by itself, permit a reader
claiming stable v1 support to reject a document that satisfies the stable v1
format contract.

Stable package releases classify diagnostic changes as follows. These
classifications do not relax the v1 acceptance guarantee above.

| Diagnostic change | Required release |
|---|---|
| Add a diagnostic `code` | Minor |
| Add a diagnostic `params` key | Minor |
| Change only human-readable diagnostic message wording | Patch |
| Remove or rename a diagnostic `code`, or change its meaning | Major |
| Remove or rename a diagnostic `params` key, or change its meaning | Major |

Consumers must tolerate unrecognized diagnostic `code` values and handle them
generically using `severity`, `path`, and `message`. Consumers must ignore
unrecognized diagnostic `params` keys. These rules let a minor release add
diagnostics or context without breaking existing integrations.

RC releases are published with the npm `next` dist-tag, while stable releases
are published with `latest`. After the stable `1.0.0` release is published,
the `next` tag is also moved to `1.0.0` so prerelease consumers converge on the
same stable release.

## Development

FieldWeft requires Node.js 20 or newer and uses npm.

```sh
npm ci
npm run verify
```

`npm run verify` checks generated schema types, the approved public API
manifest, TypeScript, ESLint, the documentation and npm publish-policy
contracts, the emitted runtime and declaration surfaces, the complete core
test suite, and benchmark executability.

Before a release, run `npm run verify:release`. It additionally packs the
actual tarball and installs it into clean JavaScript and strict NodeNext
TypeScript consumer projects. Follow the normative
[npm release guide](docs/release-guide.md); do not push a release tag or
publish without explicit approval.

## Contributing and license

See [CONTRIBUTING.md](CONTRIBUTING.md) for development, contract-change, and
validation requirements. A
[non-normative Korean commentary](CONTRIBUTING.ko.md) is also available.

FieldWeft is licensed under the
[Apache License, Version 2.0](LICENSE).
