# FieldWeft v1 JSON Specification

> **Normative status:** This English document defines the FieldWeft v1
> contract. The [Korean edition](ko/code-spec.md) is non-normative commentary.
> If the two describe the same contract differently, this English document
> takes precedence.

FieldWeft is a public JSON format for storing and exchanging canvas documents
that visualize data lineage. Application documents and external input use the
same contract. The v1 machine identifier is `fieldweft`, and the version is
the integer `1`.

Model output must be a single JSON object conforming to this specification,
without explanatory text or Markdown. Before applying input, a reader validates
its structure, ID uniqueness, references, directions, coordinates, and resource
limits. Failure returns diagnostics containing JSON Pointers and does not
modify the existing graph or the input object.

## Top-level contract

`format`, `version`, and all five arrays are required even when the arrays are
empty. Unknown properties and `$schema` are not allowed. Canonical JSON uses
this top-level key order:

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

The source of truth for the structural contract is
[`fieldweft-v1.schema.json`](../schema/fieldweft-v1.schema.json). Input-facing
TypeScript structure types are generated from that schema at build time. The
schema enforces required properties, primitive types, arrays, enums, basic
numeric and string ranges, and rejection of unknown properties. The TypeScript
validator enforces ID uniqueness and reserved words, ownership and endpoints,
field leaf and direction rules, discriminators and `when`, boundary
membership, cross-references, and aggregate resource limits.

A schema property is present only when it is an own enumerable property of its
containing object, matching the properties serialized by JSON. An inherited or
non-enumerable required property is missing, and an inherited or
non-enumerable optional property is absent. Non-metadata schema objects may
have custom prototypes when their schema properties follow this rule.
Metadata maps retain the stricter plain-object or null-prototype requirement.

Structured-input validation consumes schema-relevant values only through own
data properties. An own enumerable accessor on a schema object, an
accessor-backed consumed array element, or a sparse consumed array range is
rejected without invoking the accessor. This policy applies to top-level
markers, schema objects, consumed array elements, metadata entries, and
`when` entries. These failures use the `input.unstable` diagnostic code with
no `params`. Values produced by `JSON.parse` already satisfy this rule.

Stability inspection follows only schema paths and collection ranges that v1
validation consumes. It inspects schema-object property descriptors but does
not recursively inspect values below unknown properties, invalid container
types, or collection elements skipped after a resource limit is reached.
Those inputs receive the applicable property, type, or limit diagnostic
without traversing the discarded subtree.

Structured-input rejection reports one `input.unstable` diagnostic and no
other diagnostics. When multiple unstable locations exist, which location
determines the diagnostic path is unspecified.

Arrays are consumed through their `length` and own indexed data properties
within the ranges validation reads. Own non-index string properties and symbol
properties, including overridden array methods and iteration hooks, are
outside the JSON array representation and are ignored. Function values are not
recursively inspected for stability; ordinary schema validation rejects them
at the containing path.

`readFieldWeftDoc` safely inspects the top-level `format` and `version` data
properties before applying v1 object-graph rules. Once those stable markers
identify an unsupported integer FieldWeft version, the dispatcher reports the
unsupported version without inspecting the rest of the document as v1 input.
Accessor-backed markers are still rejected as `input.unstable` without being
invoked.

Proxy-backed objects and arrays are outside the supported structured-input
contract because JavaScript does not provide reliable Proxy detection.
Descriptor-inspection or property-read trap failures are converted to
`input.unstable` instead of escaping a public validation or read boundary, but
no trap-count or diagnostic-order guarantee is made for a non-throwing hostile
Proxy. Callers must first materialize Proxy-backed data as ordinary data
properties and dense arrays.

For preservation and editing by people or AI, see the
[authoring and editing guide](fieldweft-authoring-guide.md). For projection
from external models, see the [adapter guide](fieldweft-adapter-guide.md). For
the `#g=d1.…` transport, see the [sharing guide](fieldweft-sharing-guide.md).

## IDs and identity

- Every ID must match `^[A-Za-z0-9_-]+$`.
- Every ID is limited to 256 characters.
- Entity, process, and boundary IDs share one document-wide node ID space and
  must be unique within it.
- All entity fields and process input and output fields share one
  document-wide field ID space and must be unique within it.
- Node relation and mapping IDs share one relation ID space and must be unique
  across both arrays.
- `__proto__`, `prototype`, and `constructor` are forbidden as node, field, or
  relation IDs.
- The validator does not repair invalid IDs.
- A one-shot visualization may use any IDs satisfying these rules. Only a
  producer claiming revision or diff continuity must preserve stable IDs for
  the same source identity.

The reference algorithm for adapters that need deterministic IDs hashes a
length-prefixed UTF-8 tuple containing the object kind and source identity with
SHA-256, then uses the first 96 bits as a 16-character base64url suffix. This
algorithm is not a JSON validity condition. Object kind means a classification
such as `entity`, `process`, `boundary`, `field`, `nodeRelation`, or `mapping`,
and is distinct from a display-facing `kind` property. The repository reference
helper limits its ASCII object kind to 239 characters so the separator and
16-character suffix keep the complete ID within the 256-character ID limit.

When editing an existing document, preserve IDs for renamed, reordered, or
moved fields and for unchanged nodes, fields, boundaries, and relations.
Preserve unchanged layout and array order when the actual source order has not
changed. Allocate new IDs for new fields and cloned field subtrees, and update
`when`, `collapsed`, and mapping endpoints with the same remapping.

For mapping identity, prefer a stable native ID. When none exists, derive one
from stable source and target identities. Exclude the mutable display and
property values `kind` and `label` from identity input. A `keep` to `transform`
change or a label change under the same mapping ID is therefore a property
update, not a remove/add pair. Exclude a node relation's `label` from identity
input as well.

## Common annotations and metadata

Entities, processes, boundaries, every entity and process field, node
relations, and mappings may directly contain these optional properties:

```jsonc
{
  "description": "Order dataset for the payments domain",
  "tags": ["critical", "pii"],
  "meta": {
    "owner": "payments",
    "retentionDays": 365,
    "reviewed": true,
    "sourceVersion": null
  }
}
```

These properties form a conceptual flat mixin. There is no
`annotations: { ... }` wrapper; such a wrapper is an unknown property and is
rejected. Entities, processes, boundaries, and fields continue to use required
`name` properties for display names. Node relations and mappings continue to
use optional `label` properties for short display text.

- `description` is plain text limited to 4,096 Unicode code points. An empty
  string is omitted from a canonical document. Whitespace and sentence content
  are not normalized.
- `tags` is an exact-string set limited to 32 entries per object. Each tag is
  1..64 Unicode code points, and duplicates are forbidden. Case and Unicode
  normalization forms are not merged automatically. The canonicalizer sorts
  tags by UTF-16 code-unit ordinal order, matching JavaScript's default string
  comparison, and omits empty arrays.
- `meta` is a shallow scalar map limited to 32 keys per object. Values may only
  be `string | number | boolean | null`; objects and arrays are rejected. Keys
  are 1..128 code points and string values are limited to 4,096 code points.
  Empty objects are omitted, but keys whose value is `null` are preserved.
- Metadata numbers must be finite IEEE-754 doubles. `NaN` and positive or
  negative `Infinity` are rejected, and canonicalization converts `-0` to `0`.
  Precise decimals, large integer IDs, and values with meaningful leading
  zeros should be encoded as strings.
- Metadata keys `__proto__`, `prototype`, and `constructor` are forbidden. The
  `fieldweft.` prefix is reserved for future official metadata. External
  producers should use a stable namespace such as `com.example.*`.
- Metadata key order has no meaning. Canonical JSON emits keys in UTF-16
  ordinal order. An absent key and a key explicitly set to `null` have
  different meanings.

Annotations are semantic information. Include values that change with source
meaning, such as the owning team, a stable source ID, or a security
classification. Keep per-run provenance such as `syncedAt`, request, trace, or
job IDs, elapsed time, and retry counts in an adapter sidecar, execution
envelope, or log outside the document. Arbitrary metadata keys do not alter
renderer, trace, impact, or layout behavior. Information that must alter
product behavior must be promoted to a future formal schema property.

## Entities, processes, and fields

The entity and process `kind` values are `event | api | db | other`. Values
outside this enum, such as `etc`, are rejected rather than converted.

An entity requires `id`, a non-empty `name`, `kind`, and `fields`. Common
annotations, `position`, and `collapsed` are optional. `collapsed` is a set of
object-field IDs. Sibling field names under the same parent must be unique.

A process requires `id`, `name`, `kind`, `inputs`, and `outputs`. Process
fields must be flat leaves and cannot use `children`, `discriminator`, or
`when`.

A field requires `id`, `name`, and `type`, and may contain common annotations.
The allowed types are
`uuid | string | number | boolean | timestamp | object | json`. The defaults
for `array`, `nullable`, and `pk` are false, and false values are omitted from
canonical documents. Only object fields may have `children`. A string field in
an entity may have a discriminator of the form `{ "values": string[] }`.
Another field's `when` keys refer to discriminator field IDs in the same
entity. Multiple keys are combined with AND; values within one array are
combined with OR.

## Boundaries and layout

A boundary requires `id` and `name`. Its `color` is one of
`blue | green | purple | rose | slate`, and its `kind` is one of
`domain | system | external | security | other`. Common annotations,
`members`, `position`, and `size` are optional input.

In v1, `members` may contain only entity and process IDs. Boundary IDs,
duplicate members within one boundary, and membership in more than one
boundary are rejected.

- The position of an entity or process outside a boundary is an absolute
  canvas coordinate.
- A boundary position is an absolute canvas coordinate.
- A member position is relative to the top-left corner of its direct boundary.
- Boundary size is a positive width and height.
- An edit that changes membership must also convert the coordinate frame so
  the on-screen absolute position is preserved.

The canonicalizer does not clamp valid explicit coordinates or sizes. It fills
only missing layout with these deterministic defaults: entity `i` is
`(0, i * 120)`, process `i` is `(340, 120 + i * 160)`, boundary `i` is
`(60 + i * 40, 60 + i * 40)`, and boundary size is `380 × 240`.

## Node relations and mappings

A node relation has this structure:

```ts
type FieldWeftNodeRelationV1 = {
  id: string
  sourceNodeId: string
  targetNodeId: string
  label?: string
  description?: string
  tags?: string[]
  meta?: Record<string, string | number | boolean | null>
}
```

Endpoints may refer only to entities and processes. Boundaries, missing nodes,
and self-relations whose source equals their target are rejected. Array order,
the optional label, and common annotations are preserved through a canonical
round trip.

A mapping points from a source leaf field to a target leaf field. `id`,
`sourceFieldId`, and `targetFieldId` are required. `kind` is
`keep | transform`; `label` and common annotations are optional. A source must
be an entity field or process output. A target must be an entity field or
process input. Object fields, process inputs used as sources, process outputs
used as targets, and dangling field references are rejected.

A viewer runtime must preserve an explicit discriminator between mappings and
node relations. A mapping-derived roll-up from field endpoints to a node pair
is display and navigation data; it is not written to `nodeRelations`. An
explicit node relation and a mapping-derived roll-up for the same node pair may
coexist, and a viewer should distinguish their source using line style and
text.

A field trace traverses only `mappings`; it must not connect same-named fields
or every field of a node merely because a node relation exists. Node
upstream/downstream trace and impact combine explicit `nodeRelations` with
roll-ups derived from mapping endpoint owners, while preserving `explicit` and
`derived-from-mapping` provenance in the result. Cycles and duplicate
relations terminate through visited node and pair sets.

```json
{
  "format": "fieldweft",
  "version": 1,
  "entities": [
    {
      "id": "order",
      "name": "Order",
      "kind": "event",
      "position": { "x": 40, "y": 80 },
      "fields": [
        { "id": "order_id", "name": "orderId", "type": "string", "pk": true }
      ]
    },
    {
      "id": "result",
      "name": "Result",
      "kind": "other",
      "position": { "x": 680, "y": 80 },
      "fields": [
        { "id": "result_id", "name": "orderId", "type": "string" }
      ]
    }
  ],
  "processes": [
    {
      "id": "normalize",
      "name": "Normalize",
      "kind": "api",
      "position": { "x": 360, "y": 80 },
      "inputs": [
        { "id": "normalize_in", "name": "input", "type": "string" }
      ],
      "outputs": [
        { "id": "normalize_out", "name": "output", "type": "string" }
      ]
    }
  ],
  "boundaries": [
    {
      "id": "core",
      "name": "Core",
      "color": "blue",
      "kind": "domain",
      "position": { "x": 300, "y": 40 },
      "size": { "width": 300, "height": 240 },
      "members": ["normalize"]
    }
  ],
  "nodeRelations": [
    {
      "id": "order_calls_normalize",
      "sourceNodeId": "order",
      "targetNodeId": "normalize",
      "label": "calls"
    }
  ],
  "mappings": [
    {
      "id": "map_input",
      "sourceFieldId": "order_id",
      "targetFieldId": "normalize_in"
    },
    {
      "id": "map_output",
      "sourceFieldId": "normalize_out",
      "targetFieldId": "result_id",
      "kind": "transform",
      "label": "normalized"
    }
  ]
}
```

## Canonicalization and projections

Successful validation returns the original input reference; canonicalization
creates a new document. A canonical document contains positions for every
entity, process, and boundary and sizes for every boundary. Empty optional
values and false flags are omitted. Only collections with set or map semantics
are deterministically ordered: `tags`, metadata keys, `when` keys and values,
`collapsed`, and boundary `members`. That order is UTF-16 code-unit ordinal
order, not locale order. Discriminator values preserve author order because
that order is display-significant. User order is also preserved for entities,
processes, boundaries, node relations, mappings, and sibling field arrays.

`readCanonicalFieldWeftDoc` validates the materialized canonical document
again before returning `ok`. Therefore every successful result satisfies
`validateFieldWeftDocV1(result.doc).ok === true`, including all structural,
reference, aggregate, and canonical-byte limits. This post-canonical check is
defense in depth; the accessor rejection above is what prevents ordinary
structured input from being observed inconsistently during validation and
canonicalization.

Exports, code editors, and documents embedded in backups must use the
FieldWeft serializer whenever canonical JSON bytes matter. The serializer
writes schema properties in the fixed contract order and sorts only the
user-keyed `meta` and `when` maps by UTF-16 ordinal order. Plain
`JSON.stringify(canonicalDoc)` is not the canonical byte contract because
JavaScript object insertion order and integer-like key reordering can affect
its output. Pretty output differs only in whitespace; its property and array
order is the same as compact output.

`FieldWeftSemanticProjectionV1` includes semantic information for entities,
processes, fields, and boundaries, membership, node relations, mappings, and
common annotations on every supported object.
`FieldWeftLayoutProjectionV1` includes positions, sizes, collapsed state, and
boundary color. Changes only to position, size, collapsed state, or boundary
color do not create a semantic revision. Annotation changes are not classified
as layout revisions.

Semantic structural diff uses relation IDs as identity. For node relations it
reports additions, removals, property updates to `sourceNodeId`,
`targetNodeId`, and `label`, and array reorders. For mappings it reports
changes to `sourceFieldId`, `targetFieldId`, `kind`, and `label` under the same
ID as property updates rather than converting `kind` or `label` changes into
remove/add pairs. For every supported object, `description` is a property
update, `tags` are exact-string additions and removals, and `meta` is compared
as key-level additions, removals, and updates. Map comparison does not use
`JSON.stringify` property insertion order. Mapping-derived node roll-ups are
not included in projections or diffs.

FieldWeft round-trips the canonical visualization document that it represents
through document → graph → document. It does not guarantee complete recovery
of vendor payloads, original SQL or source code, actual data values, or the
original lineage repository. Producers should export a partial graph suitable
for review or transfer instead of placing an entire organization in one
document.

## Resource limits

- entity + process + boundary: at most 5,000
- all fields: at most 100,000
- field tree depth: at most 64
- `nodeRelations.length + mappings.length`: at most 20,000
- node, field, and relation IDs and every ID reference: at most 256 characters
- entity, process, boundary, and field `name`: at most 256 characters
- node relation and mapping `label`: at most 512 characters
- `description` on every annotation-capable object: at most 4,096 characters
- `tags` per object: at most 32; each tag is 1..64 characters; exact
  duplicates are forbidden
- `meta` per object: at most 32 entries; each key is 1..128 characters; each
  string value is at most 4,096 characters
- total tags in a document: at most 100,000
- total metadata entries in a document: at most 100,000
- total code points across descriptions, tags, metadata keys, and metadata
  string values: at most 4,000,000
- each discriminator and `when` string value: at most 256 characters
- `discriminator.values` and each `when` value array: at most 256 entries per
  array
- position: a safe integer in `-10,000,000..10,000,000`
- boundary width and height: a safe integer in `1..10,000,000`
- raw JSON source: at most 16 × 1024 × 1024 UTF-8 bytes
- canonical FieldWeft document: at most 8 × 1024 × 1024 compact UTF-8 bytes

String lengths are counted in Unicode code points, not UTF-16 code units or
UTF-8 bytes. Input exceeding a limit is rejected rather than truncated. The
raw source byte gate runs before JSON parsing; object, string, and aggregate
limits run after parsing; and the canonical byte gate runs after default
layout, ordering, and omission rules have been applied. The URL share codec
adds separate, smaller transport limits.

## v1 support and the v2 boundary extension path

A v1 reader accepts only documents conforming to this specification with
`format: "fieldweft"` and `version: 1`. It does not provide a dual reader,
automatic migration, or repair for input with missing markers or different
formats, versions, or enum values.

Compatibility guarantees for this specification begin with the stable package
version `1.0.0`. Before that release, this specification and its coordinated
schema, generated types, validator semantics, canonical bytes, diagnostics,
`d1` transport, tests, and fixtures may change without backward compatibility.

From `1.0.0` onward, a reader claiming stable v1 support must read every
document satisfying the stable v1 property meanings, required properties,
enums, reference rules, and public resource limits. The official FieldWeft web
viewer and validator will support reading stable v1 from `1.0.0` until at least
12 months after a stable v2 reader is released. If support retirement is
decided, it will be announced in official release notes and this specification
at least 90 days before the retirement date. No stable v1 retirement date is
set while a stable v2 reader has not been released.

The npm package version is independent of this format version. After `1.0.0`
establishes the stable v1 baseline, a package major release does not, by itself,
permit a reader claiming stable v1 support to reject a document that satisfies
the stable v1 specification.

For stable package releases, adding a diagnostic `code` or `params` key
requires a minor release, and changing only human-readable diagnostic message
wording requires a patch release. Removing or renaming either a diagnostic
`code` or a diagnostic `params` key, or changing the meaning of either, requires
a major release. Consumers must tolerate unrecognized diagnostic `code` values
and handle them generically using `severity`, `path`, and `message`. Consumers
must ignore unrecognized diagnostic `params` keys.

The public support surface includes the public `d1` decoder. The byte
representation of IndexedDB records and backup envelopes, URL host or domain,
diagnostic wording, automatic layout output, and transient UI state are not
part of the FieldWeft document contract. If a security vulnerability or clear
specification defect requires rejecting otherwise conforming input, the impact
must be minimized and documented. This exception does not justify silently
lowering general string or count limits.

If v2 introduces nested boundaries, `members` may also reference boundary IDs.
The hierarchy will be a forest in which each boundary has at most one parent.
Self-membership and cycles will be forbidden, and maximum depth will be 8. A
root boundary will use absolute canvas coordinates; child boundaries and nodes
will use coordinates relative to their direct parent. Semantic membership will
preserve the direct-parent relationship, and multiple membership will remain
forbidden. This extension record does not mean that a v1 reader accepts
boundary members or implements nested rendering.
