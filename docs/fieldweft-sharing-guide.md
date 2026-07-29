# FieldWeft v1 Sharing Guide

> **Normative status:** This English document defines the FieldWeft v1 share
> transport contract. The [Korean edition](ko/fieldweft-sharing-guide.md) is
> non-normative commentary. If the two describe the same contract differently,
> this English document takes precedence.

The URL share form is `#g=d1.…`, with one canonical FieldWeft v1 document as
its logical payload. Do not create a `ShareSnapshot` envelope or a separate
shared-graph JSON format.

## Included state

- entities, processes, fields, and boundaries, including stable IDs and every
  common annotation;
- explicit node relations and field mappings, including IDs, endpoints,
  labels, common annotations, and array order;
- node and boundary positions and boundary size, color, kind, and membership;
- entity `collapsed` state, discriminators, and `when`.

Viewport, selection, hover, trace highlight, open panels, page names, and
multi-page state are not encoded. Persistence, page creation, backup envelopes,
and viewport behavior belong to the integrating application.

## `d1` wire contract

The `d1` prefix identifies the transport, so the tuple does not duplicate the
`format` string. After unpacking, the decoder restores
`format: "fieldweft"`, `version: 1`, and an omitted empty `nodeRelations`
array, then runs the common validator and canonicalizer.

```text
[
  packVersion,
  originX,
  originY,
  entities,
  processes,
  boundaries,
  mappings,
  nodeRelations?
]

nodeRelation = [id, sourceNodeIndex, targetNodeIndex, labelOr0?, annotation?]
nodeIndex     = 0-based index over entities followed by processes

annotation = [
  descriptionOr0,
  tagsOr0,
  sortedMetaEntriesOr0
]
metaEntry = [key, string | finite-number | boolean | null]
```

Boundaries are not part of the endpoint index space. Mapping and enum slot
positions are fixed by this tuple. An empty node relation array omits the final
slot. Both encoder and decoder enforce
`nodeRelations.length + mappings.length <= 20,000`. The wire contract is fixed
by the named
[`fieldweft-d1-v1-golden.json`](../fixtures/fieldweft-d1-v1-golden.json) and
[`fieldweft-d1-v1-rich-golden.json`](../fixtures/fieldweft-d1-v1-rich-golden.json)
fixtures.

The annotation tuple is the final optional slot of every field, entity,
process, boundary, mapping, and node relation tuple. A wholly empty annotation
or trailing empty slots are compressed as `0` or tail omission. Tags retain
canonical order. Metadata is encoded as `[key, value]` entries sorted by UTF-16
ordinal key order. This avoids integer-like key reordering in JSON objects and
distinguishes explicit `null` from absence. The decoder rejects duplicate
metadata keys, non-finite numbers, nested values, and malformed tuples, then
runs the common validator again.

## Length and resource limits

| Item | Limit |
|---|---:|
| Codec token | 256 × 1024 characters |
| Packed JSON and streaming-inflate decompressed size | 8 × 1024 × 1024 bytes |
| Canonical FieldWeft compact JSON | 8 × 1024 × 1024 UTF-8 bytes |

Encoder and decoder apply symmetric token and decompressed-payload limits. They
also reject the complete input, without truncation, when any FieldWeft limit
for relations, nodes, fields, field depth, IDs, names, labels, annotations,
variant values, arrays, or aggregates is exceeded. The 8 MiB canonical limit
is a document contract; the 8 MiB packed limit and 256 KiB token limit are share
transport contracts. See the specification's
[Resource limits](code-spec.md#resource-limits) for exact document limits.

## Receiving and failure behavior

A receiver base64url-decodes and streaming-inflates the token within the
limits, strictly unpacks a known pack version, and runs the canonical
FieldWeft validator. Successful decoding returns the canonical document. A
malformed tuple, unknown pack version, boundary endpoint, self-relation,
dangling reference, or resource-limit violation rejects the entire input
rather than discarding only invalid parts.

The decoder reads only the fixed tuple for pack version 1. It does not provide
a dual decoder, migration, or heuristic repair for other versions or shapes.
Permanent availability of a URL host or domain, diagnostic wording, automatic
layout output, and pixel-level rendering are not part of the FieldWeft
document contract.

## Non-normative integration boundary

The core codec does not define complete-URL limits, long-link warning
thresholds, backup-file limits or envelopes, page persistence or overwrite
behavior, or viewport fitting. An integrating application may impose a smaller
limit than the core token limit and choose how a decoded document is displayed
or stored. Those decisions are application policy; FieldWeft web integration
owns them and they do not change the core transport contract.

## Security and privacy

A fragment is normally excluded from HTTP requests and the Referer header, but
the complete URL remains visible in the address bar, browser history, and
clipboard, and in any messenger or document where it is pasted. Do not include
sensitive content in names, descriptions, tags, metadata, labels, or field
structure. Public support covers safe input within resource limits. Security
vulnerabilities, clear specification defects, and resource-exhaustion input
may be rejected with a documented change.

For document support and recovery scope, see the
[FieldWeft v1 specification](code-spec.md). For safe content authoring, see
the [authoring and editing guide](fieldweft-authoring-guide.md).
