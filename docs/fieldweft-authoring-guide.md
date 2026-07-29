# FieldWeft v1 Authoring and Editing Guide

> **Normative status:** This English document defines authoring and editing
> requirements for FieldWeft v1. The
> [Korean edition](ko/fieldweft-authoring-guide.md) is non-normative
> commentary. If the two describe the same contract differently, this English
> document takes precedence.

FieldWeft is a validated lineage visualization document intended for people,
AI systems, adapters, and applications to use together. External input and
application documents must conform to both the
[FieldWeft v1 JSON specification](code-spec.md) and the
[JSON Schema](../schema/fieldweft-v1.schema.json). Passing the structural
schema is not sufficient: the common validator must also check IDs,
references, directions, membership, and resource limits.

## Minimal document

All five arrays are required even when empty. Do not add unknown properties or
`$schema` to the document.

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

Do not automatically repair missing markers, different formats, versions, or
enums, or broken references. An input boundary parses unknown JSON, validates
v1, and applies only a successfully canonicalized document. On failure, keep
the current document unchanged and report diagnostics containing JSON
Pointers.

## Authoring a new document

1. Project a table, event, API DTO, or dataset as an `entity`, and an ETL job,
   SQL transform, or service operation as a `process`.
2. Assign every node, field, node relation, and mapping a valid, unique ID. An
   ID is identity, separate from a display name or field path.
3. Put dataset-, job-, or service-level facts in `nodeRelations`, and leaf
   field- or column-level facts in `mappings`. Do not infer either from the
   other.
4. Include `position` and boundary `size` when layout is known. Otherwise omit
   them. A viewer fills only missing layout with deterministic defaults.
5. When source meaning must be preserved, add common annotations directly to
   the target object as described below.
6. Transfer only output that passes both the public schema and the common
   validator.

See
[`table-job-node-relations.json`](examples/table-job-node-relations.json) for a
table and job example without layout, and
[`table-job-field-lineage.json`](examples/table-job-field-lineage.json) for an
example combining layout, a boundary, node relations, and field mappings.

## Authoring common annotations

Entities, processes, boundaries, every entity and process field, node
relations, and mappings may directly contain `description`, `tags`, and
`meta`. Do not create an `annotations` wrapper. Keep display names in `name`
for nodes and fields and in `label` for relations and mappings.

```jsonc
{
  "description": "Customer identifier on the payment event",
  "tags": ["critical", "pii"],
  "meta": {
    "com.example.owner": "payments",
    "retentionDays": 365,
    "reviewed": true,
    "sourceVersion": null
  }
}
```

- `description` is plain text. An empty string is omitted from a canonical
  document.
- A tag is an exact string, including case and Unicode representation. Do not
  add duplicates. Record only stable vocabulary used for search and
  classification. The canonicalizer sorts tags by UTF-16 ordinal order.
- `meta` is a shallow map whose values are only
  `string | number | boolean | null`, never nested objects or arrays. An absent
  value differs from explicit `null`. Encode values as strings when numeric
  precision or leading zeros matter.
- Do not use `__proto__`, `prototype`, `constructor`, or the reserved
  `fieldweft.` prefix as metadata keys. External producers should use a
  stable namespace such as `com.example.*` to avoid collisions.
- Annotations participate in semantic diff. Include values that change with
  document meaning, such as source ownership, classification, or stable IDs.
  Keep timestamps, request, trace, or job IDs, elapsed time, and retry counts
  in an adapter sidecar or execution log.

Use the FieldWeft serializer when exporting canonical JSON. It writes schema
properties in a fixed order and `meta` and `when` keys in UTF-16 ordinal order.
Do not treat the insertion order produced by ordinary
`JSON.stringify(canonicalDoc)` as the canonical byte contract.

## Editing an existing document

- Preserve existing node, field, boundary, and relation IDs across renames,
  reorders, moves, and property changes.
- Allocate new IDs only for new fields and cloned field subtrees. When cloning,
  update `when`, `collapsed`, and mapping endpoints with the same ID remapping.
- Preserve entity, process, boundary, node relation, mapping, and sibling field
  array order when the actual source order has not changed.
- Preserve unchanged positions, boundary sizes, collapsed state, color,
  common annotations, and membership.
- A mapping `kind` or `label` change and a node relation `label` change are
  property updates under the same ID.
- In the same edit, remove or update every `when`, `collapsed`, `members`,
  relation endpoint, and mapping endpoint that refers to a deleted or
  reidentified object. The validator does not silently delete broken
  references.

The canonicalizer does not clamp valid explicit coordinates. A node outside a
boundary and a boundary itself use absolute canvas coordinates. A member node
uses coordinates relative to the top-left corner of its boundary. When
membership changes, convert the coordinate frame so that the absolute
on-screen position remains unchanged.

## Public resource limits

Do not truncate values or retain only part of an array to make an oversized
document appear valid. A document may contain at most 5,000 nodes and
boundaries, 100,000 fields, field depth 64, and 20,000 node relations and
mappings combined. Measured in Unicode code points, IDs, names, and
discriminator and `when` values are at most 256 characters; labels are at most
512; and descriptions and metadata string values are at most 4,096.

Each object may have at most 32 tags and 32 metadata entries. A tag is 1..64
characters and a metadata key is 1..128. Across a document, tags and metadata
entries are each limited to 100,000 and annotation strings to 4,000,000 code
points. Raw JSON source is limited to 16 MiB UTF-8, the compact canonical
document to 8 MiB. See
[Resource limits](code-spec.md#resource-limits) for the complete contract,
including coordinate, size, and variant-array limits.

## Relation precision and recovery scope

A node relation states only a lineage fact between two nodes; it does not imply
a field mapping. Field trace traverses only `mappings` and does not connect
same-named fields because a node relation exists. Preserve both an explicit
node relation and a field mapping when they describe the same node pair.

FieldWeft round-trips the canonical visualization document it represents
through document → graph → document. It is not a format for recovering
original SQL, source code, vendor payloads, actual data values, or an entire
source lineage repository. Do not put sensitive names, descriptions, tags,
metadata, labels, or field structures in a document or shared URL. Prefer
exporting the partial graph needed for review over exporting an entire
organization.

For conversion from an external model, also follow the
[adapter guide](fieldweft-adapter-guide.md). For URL transport and its safety
limits, follow the [sharing guide](fieldweft-sharing-guide.md).
