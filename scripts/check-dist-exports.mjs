import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'
import { publicApiManifest } from './public-api-manifest.mjs'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const sourceRoot = join(root, 'src')
const distRoot = join(root, 'dist')
const declarationPath = join(distRoot, 'index.d.ts')
const runtimePath = join(distRoot, 'index.js')
const errors = []

function sameNames(actual, expected) {
  return (
    actual.length === expected.length &&
    actual.every((name, index) => name === expected[index])
  )
}

function describeDifference(actual, expected) {
  const actualSet = new Set(actual)
  const expectedSet = new Set(expected)
  const missing = expected.filter((name) => !actualSet.has(name))
  const extra = actual.filter((name) => !expectedSet.has(name))
  return [
    missing.length ? `missing: ${missing.join(', ')}` : '',
    extra.length ? `extra: ${extra.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('; ')
}

function listFiles(rootDirectory) {
  const files = []

  function visit(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const entryPath = join(directory, entry.name)
      if (entry.isDirectory()) {
        visit(entryPath)
      } else if (entry.isFile()) {
        files.push(relative(rootDirectory, entryPath).split(sep).join('/'))
      }
    }
  }

  if (existsSync(rootDirectory)) visit(rootDirectory)
  return files.sort()
}

function declarationExports(file) {
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
    if (ts.isExportDeclaration(statement)) {
      if (
        !statement.moduleSpecifier ||
        !ts.isStringLiteral(statement.moduleSpecifier) ||
        !statement.exportClause ||
        !ts.isNamedExports(statement.exportClause)
      ) {
        errors.push('dist/index.d.ts must use named module re-exports.')
        continue
      }
      const specifier = statement.moduleSpecifier.text
      if (!specifier.startsWith('./') || !specifier.endsWith('.js')) {
        errors.push(
          `dist/index.d.ts export module must be a relative .js specifier: ${specifier}`,
        )
        continue
      }
      const source = `src/${specifier.slice(2, -3)}.ts`
      for (const element of statement.exportClause.elements) {
        exports.push({
          publicName: element.name.text,
          sourceName: element.propertyName?.text ?? element.name.text,
          source,
          typeOnly: statement.isTypeOnly || element.isTypeOnly,
        })
      }
      continue
    }

    const exported = statement.modifiers?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
    )
    if (exported || ts.isExportAssignment(statement)) {
      errors.push('dist/index.d.ts must not contain direct or default exports.')
    }
  }

  return exports
}

if (!existsSync(declarationPath)) {
  errors.push('Missing build declaration entry point: dist/index.d.ts')
}
if (!existsSync(runtimePath)) {
  errors.push('Missing build runtime entry point: dist/index.js')
}

const expectedNames = publicApiManifest
  .map((entry) => entry.publicName)
  .sort()
const expectedRuntimeNames = publicApiManifest
  .filter((entry) => entry.kind !== 'type')
  .map((entry) => entry.publicName)
  .sort()

const declarationNames = new Set()
if (existsSync(declarationPath)) {
  for (const entry of declarationExports(declarationPath)) {
    if (declarationNames.has(entry.publicName)) {
      errors.push(`Duplicate declaration export: ${entry.publicName}`)
      continue
    }
    declarationNames.add(entry.publicName)
    const manifestEntry = publicApiManifest.find(
      (item) => item.publicName === entry.publicName,
    )
    if (!manifestEntry) {
      errors.push(`Declaration export is absent from the manifest: ${entry.publicName}`)
      continue
    }
    if (entry.sourceName !== entry.publicName) {
      errors.push(
        `Declaration export must use its approved name: ${entry.sourceName} as ${entry.publicName}`,
      )
    }
    if (entry.source !== manifestEntry.source) {
      errors.push(
        `Declaration export source differs for ${entry.publicName}: expected ${manifestEntry.source}, found ${entry.source}`,
      )
    }
    const shouldBeTypeOnly = manifestEntry.kind === 'type'
    if (entry.typeOnly !== shouldBeTypeOnly) {
      errors.push(
        `Declaration export type modifier differs for ${entry.publicName}: expected typeOnly=${shouldBeTypeOnly}`,
      )
    }
  }
}

const actualDeclarationNames = [...declarationNames].sort()
if (!sameNames(actualDeclarationNames, expectedNames)) {
  errors.push(
    `Declaration exports differ from the manifest (${describeDifference(actualDeclarationNames, expectedNames)}).`,
  )
}

let actualRuntimeNames = []
if (existsSync(runtimePath)) {
  const runtime = await import(pathToFileURL(runtimePath).href)
  actualRuntimeNames = Object.keys(runtime).sort()
  if (!sameNames(actualRuntimeNames, expectedRuntimeNames)) {
    errors.push(
      `Runtime exports differ from the manifest (${describeDifference(actualRuntimeNames, expectedRuntimeNames)}).`,
    )
  }
}

const sourceStems = listFiles(sourceRoot)
  .filter((name) => name.endsWith('.ts'))
  .map((name) => name.slice(0, -3))
const expectedDistFiles = sourceStems
  .flatMap((stem) => [
    `${stem}.d.ts`,
    `${stem}.d.ts.map`,
    `${stem}.js`,
    `${stem}.js.map`,
  ])
  .sort()
const actualDistFiles = listFiles(distRoot)
if (!sameNames(actualDistFiles, expectedDistFiles)) {
  errors.push(
    `Dist files differ from TypeScript source modules (${describeDifference(actualDistFiles, expectedDistFiles)}).`,
  )
}

if (errors.length) {
  for (const error of errors) console.error(error)
  process.exit(1)
}

console.log(
  `Dist matches ${actualRuntimeNames.length} runtime exports, ${actualDeclarationNames.length} declaration exports, and ${actualDistFiles.length} emitted files.`,
)
