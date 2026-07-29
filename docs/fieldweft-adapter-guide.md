# FieldWeft v1 Adapter Guide

> **Normative status:** This English document defines adapter requirements for
> FieldWeft v1. The [Korean edition](ko/fieldweft-adapter-guide.md) is
> non-normative commentary. If the two describe the same contract differently,
> this English document takes precedence.

An adapter projects an external model into one FieldWeft v1 document instead
of creating a separate viewer-specific JSON format. Output must pass both the
[public schema](../schema/fieldweft-v1.schema.json) and the common validator.
An adapter must not assume that the validator will repair its input. If
strings, arrays, or aggregate object counts exceed the
[public resource limits](code-spec.md#resource-limits), fail conversion instead
of truncating values or dropping some relations.

## Base projection

| External concept | FieldWeft |
|---|---|
| table, event, API DTO, dataset | entity |
| column, attribute, schema field | field |
| ETL, SQL transform, service operation | process |
| dataset, job, service lineage | node relation |
| field or column lineage | mapping |
| domain, system, security area | boundary |
| stable description, classification tags, scalar source metadata | target object's `description`, `tags`, and `meta` |
| per-run provenance or evidence | adapter sidecar or execution envelope outside FieldWeft |

When field lineage is unavailable, do not create empty or synthetic fields to
connect nodes. The
[table and job example without layout](examples/table-job-node-relations.json)
demonstrates this case. When field lineage is available, keep node relations
and mappings in separate arrays as shown in the
[layout and boundary example](examples/table-job-field-lineage.json).

## Annotations and source metadata

Entities, processes, boundaries, every entity and process field, node
relations, and mappings may receive flat
`description?: string`, `tags?: string[]`, and
`meta?: Record<string, string | number | boolean | null>` properties. An
`annotations` wrapper, nested metadata objects, and array metadata values are
invalid.

Annotations must express semantic source state. An owner, security
classification, and stable catalog ID or version are suitable. `syncedAt`,
adapter run IDs, request, trace, or job IDs, elapsed time, and retry counts are
not. Converting the same source revision at different times or in different
execution environments must produce the same annotations. Put per-run values
in sidecar diagnostics or a separate envelope or log.

Map tags as exact strings under the source system's case and Unicode rules;
do not normalize them arbitrarily. Preserve explicit metadata `null` rather
than converting it to absence. Use a metadata number only when the source value
can be represented exactly enough as a finite IEEE-754 double. Encode precise
decimals, large integer IDs, and values with meaningful leading zeros as
strings. Producer-owned keys should use a stable namespace such as
`com.example.*`. Do not use `__proto__`, `prototype`, `constructor`, or the
reserved `fieldweft.` prefix.

Do not hide unsupported vendor evidence by serializing it into `name`,
`description`, `label`, or an arbitrary metadata string. Information that must
change renderer, trace, impact, or layout behavior belongs in a future formal
schema property rather than an ad hoc metadata key.

## IDs and array order

Every adapter must provide IDs that are valid and unique within the document.
A one-shot visualization may use arbitrary valid IDs. Only a producer claiming
revision or diff continuity must preserve stable IDs for the same source
identity.

A regenerating adapter should sort by stable external keys or use an explicit
source order so identical input produces deterministic array order. An
incremental adapter should read the existing FieldWeft document and update
only changed objects while preserving unchanged array order, IDs, layout, and
annotations. Do not replace identity merely because a display name or layout
was recalculated.

Prefer a stable native relation ID. When none exists, a relation ID may be
derived from stable source and target identities. Exclude mutable display and
property values—mapping `kind` and `label`, node relation `label`, and all
common annotations—from identity input. A `keep` to `transform`, label, or
annotation change is therefore a property update under the same ID rather than
a remove/add pair.

Adapters that need deterministic IDs may copy the repository's
[96-bit source-tuple reference implementation](../src/adapter-reference.ts).
It hashes an object kind and a length-prefixed UTF-8 source identity tuple with
SHA-256 and uses the first 96 bits as a 16-character base64url suffix. For
example, a mapping supplies only stable source-field and target-field
identities; it does not supply `kind`, `label`, or annotations. This is neither
a separate identity protocol nor a JSON validity condition. The implementation
is repository-reference code and is not a public root or package subpath
export.

The reference implementation intentionally fixes only these minimal rules:

- Hash input is `[objectKind, ...sourceIdentity]`. Each string's UTF-8 bytes are
  preceded by a four-byte big-endian length, so tuple-part boundaries are
  unambiguous. Do not add a separate part count.
- It does not automatically inject label-like parts such as `"adapter"`,
  `"namespace"`, or `"kind"`, nor an adapter contract, source namespace, or
  owner. An adapter that must separate scopes includes the necessary stable
  identity parts directly in `sourceIdentity`.
- The ID prefix is `objectKind`, not a slug derived from a source label. The
  helper is stateless and cannot remember or detect a 96-bit hash collision
  between distinct source tuples. The caller must register source tuples and
  resulting IDs within each ID space. If distinct tuples produce the same ID,
  fail explicitly instead of appending an arbitrary suffix.

If the source system does not define identifier equivalence, do not apply
Unicode normalization to source identity. The reference implementation encodes
the supplied strings directly as UTF-8, so composed and decomposed forms remain
different identities. Only when the source system defines those forms as the
same identifier should an adapter canonicalize them according to that system's
rules before calling the reference helper.

## Layout and boundary coordinates

When the external model has no layout, omit position and size. A node outside a
boundary and a boundary itself use absolute canvas coordinates. A member node
uses coordinates relative to the top-left corner of its direct boundary. To
preserve on-screen absolute position when membership changes, apply the
corresponding conversion:

```text
Move inside (outside → boundary):
  newRelative = oldAbsolute - newBoundaryAbsolute

Move outside (boundary → outside):
  newAbsolute = oldRelative + oldBoundaryAbsolute

Move between boundaries (oldBoundary → newBoundary):
  preservedAbsolute = oldRelative + oldBoundaryAbsolute
  newRelative = preservedAbsolute - newBoundaryAbsolute
              = oldRelative + oldBoundaryAbsolute - newBoundaryAbsolute
```

Apply each addition and subtraction independently to x and y. If a new
boundary is at `(800, 120)` and the source node's absolute position is
`(840, 200)`, its stored member position after moving inside is `(40, 80)`.
Moving `(40, 80)` out of a boundary at `(800, 120)` restores `(840, 200)`.
Moving it instead to a boundary at `(600, 50)` produces a new relative position
of `(240, 150)` while preserving the on-screen absolute position `(840, 200)`.

The result must satisfy FieldWeft safe-integer and coordinate limits. If it
does not, fail adapter conversion instead of clamping. When moving a boundary
and all its members together, do not change the members' relative coordinates.

## Diagnostics and unsupported concepts

Do not silently drop or synthesize input whose meaning the adapter cannot
determine. Return a diagnostic with at least a source location and a
machine-readable code.

```text
relation.self_ambiguous /jobs/17/lineage/0
The source and target are the same dataset; projection requires evidence for a process or version node.
```

Do not automatically repair a self-relation with a synthetic node. Only an
adapter that can establish in-place processing should project
`entity → process → entity`; only one with source version identity should split
it as `entity@v1 → process → entity@v2`. Do not hide v1-unsupported concepts
such as boundary endpoints, multiple membership, or vendor-specific evidence
inside names, descriptions, or labels. Preserve them in diagnostics or an
adapter sidecar.

For output details, follow the
[FieldWeft v1 specification](code-spec.md). For safe mutation rules, follow
the [authoring and editing guide](fieldweft-authoring-guide.md).
