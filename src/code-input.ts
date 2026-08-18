import { canonicalizeFieldWeftDoc } from './code-canonical.js'
import {
  FIELD_WEFT_MAX_CANONICAL_BYTES_V1,
  FIELD_WEFT_MAX_SOURCE_BYTES_V1,
  type CanonicalFieldWeftDocV1,
} from './code-model.js'
import { canonicalFieldWeftDocUtf8Bytes } from './code-serialize.js'
import {
  readFieldWeftDoc,
  validateFieldWeftDocV1,
  type FieldWeftDiagnostic,
} from './code-validate.js'

export type ReadCanonicalFieldWeftDocResult =
  | { ok: true; doc: CanonicalFieldWeftDocV1 }
  | { ok: false; errors: FieldWeftDiagnostic[] }

function unsupportedVersionDiagnostic(version: unknown): FieldWeftDiagnostic {
  const actual = String(version)
  return {
    code: 'version.unsupported',
    path: '/version',
    severity: 'error',
    message: `Unsupported FieldWeft version: ${actual}.`,
    params: { actual },
  }
}

function unstableInputDiagnostic(): FieldWeftDiagnostic {
  return {
    code: 'input.unstable',
    path: '',
    severity: 'error',
    message:
      'Structured input must use stable own data properties and dense arrays.',
  }
}

/** Shared unknown → validate → canonicalize pipeline for external input boundaries. */
export function readCanonicalFieldWeftDoc(
  input: unknown,
): ReadCanonicalFieldWeftDocResult {
  const result = readFieldWeftDoc(input)
  if (result.kind === 'ok') {
    try {
      const doc = canonicalizeFieldWeftDoc(result.doc)
      const canonicalValidation = validateFieldWeftDocV1(doc)
      if (!canonicalValidation.ok) {
        return { ok: false, errors: canonicalValidation.errors }
      }
      const bytes = canonicalFieldWeftDocUtf8Bytes(doc)
      if (bytes > FIELD_WEFT_MAX_CANONICAL_BYTES_V1) {
        return {
          ok: false,
          errors: [
            {
              code: 'limit.canonical-bytes',
              path: '',
              severity: 'error',
              message: `Compact canonical JSON must not exceed ${FIELD_WEFT_MAX_CANONICAL_BYTES_V1} UTF-8 bytes.`,
              params: { limit: FIELD_WEFT_MAX_CANONICAL_BYTES_V1 },
            },
          ],
        }
      }
      return { ok: true, doc }
    } catch {
      return { ok: false, errors: [unstableInputDiagnostic()] }
    }
  }
  if (result.kind === 'unsupported') {
    return { ok: false, errors: [unsupportedVersionDiagnostic(result.version)] }
  }
  return { ok: false, errors: result.errors }
}

/** Parses FieldWeft JSON, allowing only an optional outer Markdown fence. */
export function parseFieldWeftDocJson(text: string): ReadCanonicalFieldWeftDocResult {
  if (new TextEncoder().encode(text).byteLength > FIELD_WEFT_MAX_SOURCE_BYTES_V1) {
    return {
      ok: false,
      errors: [
        {
          code: 'limit.source-bytes',
          path: '',
          severity: 'error',
          message: `Input JSON must not exceed ${FIELD_WEFT_MAX_SOURCE_BYTES_V1} UTF-8 bytes.`,
          params: { limit: FIELD_WEFT_MAX_SOURCE_BYTES_V1 },
        },
      ],
    }
  }
  let source = text.trim()
  if (source.startsWith('```')) {
    source = source.replace(/^```[^\n]*\n?/, '').replace(/\n?```$/, '')
  }
  let input: unknown
  try {
    input = JSON.parse(source)
  } catch (error) {
    return {
      ok: false,
      errors: [
        {
          code: 'json.parse',
          path: '',
          severity: 'error',
          message: `JSON parse error: ${(error as Error).message}`,
          params: { reason: (error as Error).message },
        },
      ],
    }
  }
  return readCanonicalFieldWeftDoc(input)
}

export function formatFieldWeftDiagnostic(diagnostic: FieldWeftDiagnostic): string {
  const path = diagnostic.path || '/'
  return `${path}: ${diagnostic.message}`
}
