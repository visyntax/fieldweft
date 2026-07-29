import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import {
  excludedApiSymbols,
  legacyCoreWebAliases,
  privatePackageModules,
  publicApiReview,
  publicApiManifest,
  publicApiVersionBuckets,
  publicFixtureFiles,
  publicPackageExports,
  webOwnedExports,
} from './public-api-manifest.mjs'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const sourceRoot = join(root, 'src')
const fixtureRoot = join(root, 'fixtures')
const allowedKinds = new Set(['value', 'type', 'function', 'class'])
const allowedBuckets = new Set(Object.keys(publicApiVersionBuckets))
const requireApproved = process.argv.includes('--require-approved')

function exportedDeclarations(file) {
  const sourceText = readFileSync(file, 'utf8')
  const sourceFile = ts.createSourceFile(
    file,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )
  const exports = []
  for (const statement of sourceFile.statements) {
    const exported = statement.modifiers?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
    )
    if (!exported) continue
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) {
          exports.push({ name: declaration.name.text, kind: 'value' })
        }
      }
      continue
    }
    if (ts.isFunctionDeclaration(statement) && statement.name) {
      exports.push({ name: statement.name.text, kind: 'function' })
      continue
    }
    if (ts.isClassDeclaration(statement) && statement.name) {
      exports.push({ name: statement.name.text, kind: 'class' })
      continue
    }
    if (ts.isEnumDeclaration(statement) && statement.name) {
      exports.push({ name: statement.name.text, kind: 'value' })
      continue
    }
    if (
      (ts.isInterfaceDeclaration(statement) ||
        ts.isTypeAliasDeclaration(statement)) &&
      statement.name
    ) {
      exports.push({ name: statement.name.text, kind: 'type' })
    }
  }
  return exports
}

function rootExports(file) {
  const sourceText = readFileSync(file, 'utf8')
  const sourceFile = ts.createSourceFile(
    file,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )
  const exports = []
  for (const statement of sourceFile.statements) {
    if (!ts.isExportDeclaration(statement)) continue
    if (
      !statement.moduleSpecifier ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      !statement.exportClause ||
      !ts.isNamedExports(statement.exportClause)
    ) {
      exports.push({ error: 'Root exports must use named module re-exports.' })
      continue
    }
    const specifier = statement.moduleSpecifier.text
    if (!specifier.startsWith('./') || !specifier.endsWith('.js')) {
      exports.push({
        error: `Root export module must be a relative .js specifier: ${specifier}`,
      })
      continue
    }
    const source = `src/${specifier.slice(2, -3)}.ts`
    for (const element of statement.exportClause.elements) {
      const publicName = element.name.text
      const sourceName = element.propertyName?.text ?? publicName
      exports.push({
        publicName,
        sourceName,
        source,
        typeOnly: statement.isTypeOnly || element.isTypeOnly,
      })
    }
  }
  return exports
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

function relativeFiles(directory, prefix = '') {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      return relativeFiles(join(directory, entry.name), relativePath)
    }
    return entry.isFile() ? [relativePath] : []
  })
}

const errors = []
const publicNames = new Set()
const extractionSourceNames = new Map()
const coveredHistoricalV1WebAliases = new Map()

if (new Set(legacyCoreWebAliases).size !== legacyCoreWebAliases.length) {
  errors.push('legacyCoreWebAliases contains duplicate names.')
}

if (!['draft', 'approved'].includes(publicApiReview.status)) {
  errors.push(`Unknown public API review status: ${publicApiReview.status}`)
}
if (!Array.isArray(publicApiReview.reviewItems)) {
  errors.push('Public API reviewItems must be an array.')
} else {
  const reviewIds = new Set()
  for (const item of publicApiReview.reviewItems) {
    if (!item.id || !item.question) {
      errors.push('Each public API review item must have an id and question.')
    }
    if (reviewIds.has(item.id)) {
      errors.push(`Duplicate public API review item: ${item.id}`)
    }
    reviewIds.add(item.id)
  }
}
if (publicApiReview.status === 'approved') {
  if (publicApiReview.reviewItems.length > 0) {
    errors.push('An approved public API manifest cannot have unresolved review items.')
  }
  if (
    typeof publicApiReview.approvedAt !== 'string' ||
    Number.isNaN(Date.parse(publicApiReview.approvedAt))
  ) {
    errors.push('An approved public API manifest must have a valid approvedAt date.')
  }
} else if (publicApiReview.approvedAt !== null) {
  errors.push('A draft public API manifest must have approvedAt set to null.')
}
if (requireApproved && publicApiReview.status !== 'approved') {
  errors.push(
    `Public API manifest approval required; current status is ${publicApiReview.status}.`,
  )
}

for (const entry of publicApiManifest) {
  if (publicNames.has(entry.publicName)) {
    errors.push(`Duplicate public name: ${entry.publicName}`)
  }
  publicNames.add(entry.publicName)
  if (!allowedKinds.has(entry.kind)) {
    errors.push(`Unknown kind for ${entry.publicName}: ${entry.kind}`)
  }
  if (!allowedBuckets.has(entry.versionBucket)) {
    errors.push(`Unknown version bucket for ${entry.publicName}: ${entry.versionBucket}`)
  }
  if (!existsSync(join(root, entry.source))) {
    errors.push(`Missing source for ${entry.publicName}: ${entry.source}`)
  }
  if (/CodeDoc|CODE_DOC|CODEDOC|MAX_CODEDOC|RESERVED_FIELDWEFT/.test(entry.publicName)) {
    errors.push(`Legacy vocabulary leaked into public name: ${entry.publicName}`)
  }
  if (entry.versionBucket === 'v1' && !entry.publicName.includes('V1')) {
    errors.push(`V1 public name lacks a V1 suffix: ${entry.publicName}`)
  }
  for (const sourceName of entry.sourceNames) {
    const previous = extractionSourceNames.get(sourceName)
    if (previous) {
      errors.push(
        `Extraction source name ${sourceName} is mapped by both ${previous} and ${entry.publicName}`,
      )
    }
    extractionSourceNames.set(sourceName, entry.publicName)
  }
  if (!Array.isArray(entry.historicalV1WebAliases)) {
    errors.push(
      `Historical v1 web aliases must be an array for ${entry.publicName}`,
    )
    continue
  }
  for (const alias of entry.historicalV1WebAliases) {
    if (!entry.sourceNames.includes(alias)) {
      errors.push(
        `Historical v1 web alias ${alias} is not a source name for ${entry.publicName}`,
      )
    }
    const previous = coveredHistoricalV1WebAliases.get(alias)
    if (previous) {
      errors.push(
        `Historical v1 web alias ${alias} is mapped by both ${previous} and ${entry.publicName}`,
      )
    }
    coveredHistoricalV1WebAliases.set(alias, entry.publicName)
  }
}

for (const alias of legacyCoreWebAliases) {
  if (!coveredHistoricalV1WebAliases.has(alias)) {
    errors.push(`Historical v1 core web alias is not mapped: ${alias}`)
  }
}

const webOwnedNames = new Set()
for (const entry of webOwnedExports) {
  if (!allowedKinds.has(entry.kind)) {
    errors.push(`Unknown fieldweft-web export kind for ${entry.name}: ${entry.kind}`)
  }
  if (!entry.name || !entry.source) {
    errors.push('Each fieldweft-web-owned export must have a name and source.')
  }
  if (webOwnedNames.has(entry.name)) {
    errors.push(`Duplicate fieldweft-web-owned v2 name: ${entry.name}`)
  }
  webOwnedNames.add(entry.name)
}

for (const entry of excludedApiSymbols) {
  if (!existsSync(join(root, entry.source))) {
    errors.push(`Missing source for excluded symbol ${entry.name}: ${entry.source}`)
  }
}

const actualModuleExports = new Map()
for (const fileName of readdirSync(sourceRoot).filter(
  (name) => name.endsWith('.ts') && name !== 'index.ts',
)) {
  const source = `src/${fileName}`
  for (const entry of exportedDeclarations(join(sourceRoot, fileName))) {
    const key = `${source}:${entry.name}`
    if (actualModuleExports.has(key)) {
      errors.push(`Duplicate module export declaration: ${key}`)
    }
    actualModuleExports.set(key, entry)
  }
}

const classifiedModuleExports = new Set()
for (const entry of publicApiManifest) {
  const key = `${entry.source}:${entry.publicName}`
  const actual = actualModuleExports.get(key)
  if (!actual) {
    errors.push(
      `Public declaration does not exist at its manifest source: ${entry.publicName} in ${entry.source}`,
    )
    continue
  }
  classifiedModuleExports.add(key)
  if (actual.kind !== entry.kind) {
    errors.push(
      `Public declaration kind differs for ${entry.publicName}: expected ${entry.kind}, found ${actual.kind}`,
    )
  }
}

for (const entry of excludedApiSymbols) {
  const key = `${entry.source}:${entry.name}`
  if (!actualModuleExports.has(key)) {
    errors.push(`Excluded module export does not exist: ${entry.name} in ${entry.source}`)
  }
  classifiedModuleExports.add(key)
}

for (const key of actualModuleExports.keys()) {
  if (!classifiedModuleExports.has(key)) {
    errors.push(`Unclassified module export: ${key}`)
  }
}

const rootExportNames = new Set()
const rootIndexPath = join(sourceRoot, 'index.ts')
for (const entry of exportedDeclarations(rootIndexPath)) {
  errors.push(
    `Root entry point must re-export approved declarations instead of declaring ${entry.name}.`,
  )
}
for (const entry of rootExports(rootIndexPath)) {
  if (entry.error) {
    errors.push(entry.error)
    continue
  }
  if (rootExportNames.has(entry.publicName)) {
    errors.push(`Duplicate root export: ${entry.publicName}`)
    continue
  }
  rootExportNames.add(entry.publicName)
  const manifestEntry = publicApiManifest.find(
    (item) => item.publicName === entry.publicName,
  )
  if (!manifestEntry) {
    errors.push(`Root export is absent from the manifest: ${entry.publicName}`)
    continue
  }
  if (entry.sourceName !== entry.publicName) {
    errors.push(
      `Root export must use its approved source declaration name: ${entry.sourceName} as ${entry.publicName}`,
    )
  }
  if (entry.source !== manifestEntry.source) {
    errors.push(
      `Root export source differs for ${entry.publicName}: expected ${manifestEntry.source}, found ${entry.source}`,
    )
  }
  const shouldBeTypeOnly = manifestEntry.kind === 'type'
  if (entry.typeOnly !== shouldBeTypeOnly) {
    errors.push(
      `Root export type modifier differs for ${entry.publicName}: expected typeOnly=${shouldBeTypeOnly}`,
    )
  }
}

for (const entry of publicApiManifest) {
  if (!rootExportNames.has(entry.publicName)) {
    errors.push(`Manifest public name is missing from the root entry point: ${entry.publicName}`)
  }
}

const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const manifestPackageExports = Object.fromEntries(
  publicPackageExports.map((entry) => [entry.subpath, entry.target]),
)
const packageExportSubpaths = new Set()
for (const entry of publicPackageExports) {
  if (packageExportSubpaths.has(entry.subpath)) {
    errors.push(`Duplicate package export subpath: ${entry.subpath}`)
  }
  packageExportSubpaths.add(entry.subpath)
  if (!['module', 'schema', 'fixture-pattern'].includes(entry.kind)) {
    errors.push(`Unknown package export kind for ${entry.subpath}: ${entry.kind}`)
  }
  if (entry.kind === 'schema' && !existsSync(join(root, entry.target))) {
    errors.push(`Missing schema package export target: ${entry.target}`)
  }
}
if (stableJson(packageJson.exports) !== stableJson(manifestPackageExports)) {
  errors.push('package.json exports do not match publicPackageExports.')
}

const listedFixtures = [...publicFixtureFiles].sort()
const actualFixtures = relativeFiles(fixtureRoot).sort()
if (new Set(publicFixtureFiles).size !== publicFixtureFiles.length) {
  errors.push('publicFixtureFiles contains duplicate file names.')
}
if (JSON.stringify(actualFixtures) !== JSON.stringify(listedFixtures)) {
  errors.push(
    `Public fixture files differ: expected ${listedFixtures.join(', ')}, found ${actualFixtures.join(', ')}`,
  )
}

const packageExportText = JSON.stringify(packageJson.exports)
const rootIndexText = readFileSync(join(sourceRoot, 'index.ts'), 'utf8')
for (const entry of privatePackageModules) {
  if (!existsSync(join(root, entry.source))) {
    errors.push(`Missing private package module: ${entry.source}`)
  }
  if (entry.rootExport !== false || entry.subpathExport !== false) {
    errors.push(
      `Private package module must disable root and subpath exports: ${entry.source}`,
    )
  }
  if (publicApiManifest.some((item) => item.source === entry.source)) {
    errors.push(`Private package module appears in root manifest: ${entry.source}`)
  }
  const moduleStem = entry.source.replace(/^src\//, '').replace(/\.ts$/, '')
  if (packageExportText.includes(moduleStem)) {
    errors.push(`Private package module appears in package exports: ${entry.source}`)
  }
  if (rootIndexText.includes(moduleStem)) {
    errors.push(`Private package module appears in the root entry point: ${entry.source}`)
  }
}

if (errors.length) {
  for (const error of errors) console.error(error)
  process.exit(1)
}

console.log(
  `Public API manifest (${publicApiReview.status}) matches ${actualModuleExports.size} classified module exports, ${rootExportNames.size} root exports, ${publicPackageExports.length} package subpaths, ${coveredHistoricalV1WebAliases.size} historical v1 core web aliases, ${webOwnedExports.length} web-owned v2 names, and ${excludedApiSymbols.length} exclusions.`,
)
