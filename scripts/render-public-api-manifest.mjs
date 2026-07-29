import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  excludedApiSymbols,
  privatePackageModules,
  publicApiReview,
  publicApiManifest,
  publicApiVersionBuckets,
  publicFixtureFiles,
  publicPackageExports,
  webOwnedExports,
} from './public-api-manifest.mjs'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const outputPath = join(root, 'docs', 'public-api-manifest.md')

function code(value) {
  return `\`${value}\``
}

function renderTarget(target) {
  if (typeof target === 'string') return code(target)
  return Object.entries(target)
    .map(([condition, value]) => `${code(condition)}: ${code(value)}`)
    .join('<br>')
}

function render() {
  const status =
    publicApiReview.status === 'approved'
      ? `Approved on ${publicApiReview.approvedAt}`
      : 'Review draft'
  const lines = [
    publicApiReview.status === 'approved'
      ? '# Public API Manifest'
      : '# Proposed Public API Manifest',
    '',
    `> **Status:** ${status}.`,
    '> **Language:** This English manifest is normative. Korean documentation is',
    '> non-normative commentary; English takes precedence if the two differ.',
    '> Names in the “Current source names” column classify the extraction source.',
    '> Only names in “fieldweft-web facade names” remain compatibility exports.',
    '',
    '## Decisions represented by this manifest',
    '',
    '- The root entry point exports only the symbols listed in this document.',
    '- Schema-derived vocabulary types, enum arrays, and limits use generated',
    '  `FieldWeft*V1` and `FIELD_WEFT_*_V1` names.',
    '- Limits paired with document-wide totals state `PER_OBJECT` explicitly in',
    '  their object-local names.',
    '- `FieldWeftId`, reserved identifiers, diagnostics, and field-ID helpers are',
    '  global unversioned contracts.',
    '- Reader functions are unversioned dispatchers. Validator functions name their',
    '  schema version explicitly.',
    '- Canonicalization, serialization, projection, and diff operations remain',
    '  unversioned because their parameter and result types pin them to v1.',
    '- The d1 share codec uses its own share and pack-version axis.',
    '- Legacy `CodeDoc`, `CODE_DOC`, and unbranded names are migration inputs only.',
    '  Compatibility aliases belong in `fieldweft-web`, not this package.',
    '- The schema and named golden fixtures are package subpath contracts.',
    '- Reference adapter source is a packaged copy-only documentation asset, not',
    '  a root export or package subpath.',
    '- Layout default constructors are not root exports.',
    '',
    '## Version buckets',
    '',
    '| Bucket | Meaning |',
    '|---|---|',
  ]

  for (const [bucket, meaning] of Object.entries(publicApiVersionBuckets)) {
    lines.push(`| ${code(bucket)} | ${meaning} |`)
  }

  lines.push('', '## Review state', '')
  if (publicApiReview.reviewItems.length) {
    for (const item of publicApiReview.reviewItems) {
      lines.push(`- ${code(item.id)}: ${item.question}`)
    }
  } else {
    lines.push('- No unresolved review items.')
  }

  lines.push('', '## Public package subpaths', '')
  lines.push('| Subpath | Kind | Target |')
  lines.push('|---|---|---|')
  for (const entry of publicPackageExports) {
    lines.push(
      `| ${code(entry.subpath)} | ${code(entry.kind)} | ${renderTarget(entry.target)} |`,
    )
  }

  lines.push('', '### Public fixture files', '')
  for (const file of publicFixtureFiles) {
    lines.push(`- ${code(file)}`)
  }

  lines.push('', '## Root exports', '')

  const sources = [...new Set(publicApiManifest.map((entry) => entry.source))]
  for (const source of sources) {
    lines.push(`### ${code(source)}`, '')
    lines.push(
      '| Public name | Kind | Bucket | Current source names | fieldweft-web facade names | Note |',
    )
    lines.push('|---|---|---|---|---|---|')
    for (const entry of publicApiManifest.filter((item) => item.source === source)) {
      const sourceNames = entry.sourceNames.length
        ? entry.sourceNames.map(code).join(', ')
        : '—'
      const webAliases = entry.webAliases.length
        ? entry.webAliases.map(code).join(', ')
        : '—'
      lines.push(
        `| ${code(entry.publicName)} | ${entry.kind} | ${code(entry.versionBucket)} | ${sourceNames} | ${webAliases} | ${entry.note || '—'} |`,
      )
    }
    lines.push('')
  }

  lines.push('## fieldweft-web-owned facade exports', '')
  lines.push('| Name | Kind | Source in fieldweft-web |')
  lines.push('|---|---|---|')
  for (const entry of webOwnedExports) {
    lines.push(
      `| ${code(entry.name)} | ${entry.kind} | ${code(entry.source)} |`,
    )
  }
  lines.push('')

  lines.push('## Private package modules', '')
  lines.push('| Source | Root export | Subpath export | Disposition | Reason |')
  lines.push('|---|---|---|---|---|')
  for (const entry of privatePackageModules) {
    lines.push(
      `| ${code(entry.source)} | ${entry.rootExport ? 'yes' : 'no'} | ${entry.subpathExport ? 'yes' : 'no'} | ${code(entry.disposition)} | ${entry.reason} |`,
    )
  }
  lines.push('')

  lines.push('## Explicitly excluded module exports', '')
  lines.push('| Current name | Source | Disposition | Reason |')
  lines.push('|---|---|---|---|')
  for (const entry of excludedApiSymbols) {
    lines.push(
      `| ${code(entry.name)} | ${code(entry.source)} | ${code(entry.disposition)} | ${entry.reason} |`,
    )
  }
  lines.push('')

  return `${lines.join('\n')}\n`
}

const rendered = render()
if (process.argv.includes('--check')) {
  const current = readFileSync(outputPath, 'utf8')
  if (current !== rendered) {
    console.error('docs/public-api-manifest.md is out of date.')
    process.exit(1)
  }
} else {
  writeFileSync(outputPath, rendered)
}
