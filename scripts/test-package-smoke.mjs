import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import {
  basename,
  delimiter,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import {
  excludedApiSymbols,
  legacyCoreWebAliases,
  publicApiManifest,
  publicFixtureFiles,
  webOwnedExports,
} from './public-api-manifest.mjs'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const sourcePackageJson = JSON.parse(
  readFileSync(join(root, 'package.json'), 'utf8'),
)
const smokeRoot = mkdtempSync(join(tmpdir(), 'fieldweft-package-smoke-'))
const keepSmokeRoot = process.env.FIELD_WEFT_KEEP_PACKAGE_SMOKE === '1'

function normalizedPath(path) {
  return path.split(sep).join('/')
}

function shellQuote(value) {
  return `'${value.replaceAll("'", "'\"'\"'")}'`
}

function createNpmRunner() {
  const npmExecPath = process.env.npm_execpath
  const shimDirectory = join(smokeRoot, 'npm-bin')
  mkdirSync(shimDirectory)

  if (npmExecPath) {
    assert.match(
      normalizedPath(npmExecPath),
      /\/npm-cli\.(?:c?js|mjs)$/,
      'Package smoke must be run with npm, not another package manager.',
    )
    if (process.platform === 'win32') {
      writeFileSync(
        join(shimDirectory, 'npm.cmd'),
        `@echo off\r\n"${process.execPath}" "${npmExecPath}" %*\r\nexit /b %ERRORLEVEL%\r\n`,
      )
    } else {
      const shimPath = join(shimDirectory, 'npm')
      writeFileSync(
        shimPath,
        `#!/bin/sh\nexec ${shellQuote(process.execPath)} ${shellQuote(npmExecPath)} "$@"\n`,
      )
      chmodSync(shimPath, 0o755)
    }
  }

  const inheritedPath = process.env.PATH ?? process.env.Path ?? ''
  const commandPath = [
    shimDirectory,
    dirname(process.execPath),
    inheritedPath,
  ].join(delimiter)
  const environment = {
    ...process.env,
    PATH: commandPath,
  }
  if (process.platform === 'win32') environment.Path = commandPath

  if (npmExecPath) {
    return {
      command: process.execPath,
      prefixArgs: [npmExecPath],
      environment,
    }
  }
  return {
    command: process.platform === 'win32' ? 'npm.cmd' : 'npm',
    prefixArgs: [],
    environment,
  }
}

const npmRunner = createNpmRunner()

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    encoding: 'utf8',
    env: options.env ?? process.env,
    windowsHide: true,
  })
  if (result.error) throw result.error
  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join('\n')
    throw new Error(
      `Command failed (${result.status ?? 'unknown'}): ${command} ${args.join(' ')}${output ? `\n${output}` : ''}`,
    )
  }
  return result.stdout
}

function runNpm(args, cwd) {
  return run(
    npmRunner.command,
    [...npmRunner.prefixArgs, ...args],
    { cwd, env: npmRunner.environment },
  )
}

function parsePackResult(output) {
  const trimmed = output.trim()
  const start = trimmed.indexOf('[')
  const end = trimmed.lastIndexOf(']')
  assert.notEqual(start, -1, 'npm pack --json did not return a JSON array.')
  assert.notEqual(end, -1, 'npm pack --json returned incomplete JSON.')
  const results = JSON.parse(trimmed.slice(start, end + 1))
  assert.equal(results.length, 1, 'npm pack must produce exactly one tarball.')
  return results[0]
}

function listFiles(directory) {
  const files = []

  function visit(current) {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const entryPath = join(current, entry.name)
      if (entry.isDirectory()) visit(entryPath)
      else if (entry.isFile()) {
        files.push(normalizedPath(relative(directory, entryPath)))
      }
    }
  }

  visit(directory)
  return files.sort()
}

function validatePackedFileList(packResult) {
  const packedFiles = packResult.files
    .map((entry) => normalizedPath(entry.path))
    .sort()
  const expectedFiles = [
    'CONTRIBUTING.md',
    'CONTRIBUTING.ko.md',
    'LICENSE',
    'README.md',
    'README.ko.md',
    'dist/index.d.ts',
    'dist/index.js',
    'docs/code-spec.md',
    'docs/public-api-manifest.md',
    'package.json',
    'schema/fieldweft-v1.schema.json',
    'src/adapter-reference.ts',
    ...publicFixtureFiles.map((name) => `fixtures/${name}`),
  ]
  for (const expectedFile of expectedFiles) {
    assert.equal(
      packedFiles.includes(expectedFile),
      true,
      `Packed tarball is missing ${expectedFile}.`,
    )
  }

  const packedSourceFiles = packedFiles.filter((path) => path.startsWith('src/'))
  assert.deepEqual(packedSourceFiles, ['src/adapter-reference.ts'])
  for (const forbiddenPrefix of [
    '.github/',
    '.temp/',
    'node_modules/',
    'scripts/',
  ]) {
    assert.equal(
      packedFiles.some((path) => path.startsWith(forbiddenPrefix)),
      false,
      `Packed tarball includes private path ${forbiddenPrefix}.`,
    )
  }
  for (const forbiddenFile of [
    'AGENTS.md',
    'package-lock.json',
    'tsconfig.json',
  ]) {
    assert.equal(
      packedFiles.includes(forbiddenFile),
      false,
      `Packed tarball includes private file ${forbiddenFile}.`,
    )
  }
}

function validateDeclarationExports(packageRoot) {
  const declarationPath = join(packageRoot, 'dist', 'index.d.ts')
  const sourceText = readFileSync(declarationPath, 'utf8')
  const sourceFile = ts.createSourceFile(
    declarationPath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )
  const names = []

  for (const statement of sourceFile.statements) {
    if (!ts.isExportDeclaration(statement)) continue
    assert.ok(
      statement.exportClause &&
        ts.isNamedExports(statement.exportClause),
      'Installed declaration entry point must use named exports.',
    )
    for (const element of statement.exportClause.elements) {
      names.push(element.name.text)
    }
  }

  const expectedNames = publicApiManifest
    .map((entry) => entry.publicName)
    .sort()
  assert.deepEqual(names.sort(), expectedNames)
}

function validateInstalledDocuments(packageRoot) {
  const markdownFiles = listFiles(packageRoot).filter((path) =>
    path.endsWith('.md'),
  )
  for (const markdownFile of markdownFiles) {
    const markdownPath = join(packageRoot, ...markdownFile.split('/'))
    const contents = readFileSync(markdownPath, 'utf8')
    for (const match of contents.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      const target = match[1].split('#')[0]
      if (!target || /^[a-z]+:/i.test(target) || target.startsWith('/')) {
        continue
      }
      const targetPath = resolve(dirname(markdownPath), target)
      const targetRelativePath = relative(packageRoot, targetPath)
      assert.equal(
        targetRelativePath !== '..' &&
          !targetRelativePath.startsWith(`..${sep}`) &&
          !isAbsolute(targetRelativePath),
        true,
        `${markdownFile} link escapes the package: ${target}`,
      )
      assert.equal(
        existsSync(targetPath),
        true,
        `${markdownFile} has a missing packed link target: ${target}`,
      )
    }
  }
}

function installTarball(consumerRoot, tarballPath) {
  runNpm(
    [
      'install',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      '--package-lock=false',
      '--no-save',
      tarballPath,
    ],
    consumerRoot,
  )
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
}

try {
  const packOutput = runNpm(
    ['pack', '--json', '--pack-destination', smokeRoot],
    root,
  )
  const packResult = parsePackResult(packOutput)
  assert.equal(packResult.name, sourcePackageJson.name)
  assert.equal(packResult.version, sourcePackageJson.version)
  assert.equal(basename(packResult.filename), packResult.filename)
  validatePackedFileList(packResult)

  const tarballPath = join(smokeRoot, packResult.filename)
  assert.equal(existsSync(tarballPath), true, 'npm pack did not create the tarball.')

  const jsConsumerRoot = join(smokeRoot, 'js-consumer')
  mkdirSync(jsConsumerRoot)
  writeJson(join(jsConsumerRoot, 'package.json'), {
    name: 'fieldweft-js-package-smoke',
    private: true,
    type: 'module',
  })
  installTarball(jsConsumerRoot, tarballPath)

  const expectedRuntimeNames = publicApiManifest
    .filter((entry) => entry.kind !== 'type')
    .map((entry) => entry.publicName)
    .sort()
  const publicApiNames = new Set(
    publicApiManifest.map((entry) => entry.publicName),
  )
  const forbiddenRootNames = [
    ...legacyCoreWebAliases,
    ...webOwnedExports.map((entry) => entry.name),
    ...excludedApiSymbols.map((entry) => entry.name),
  ]
    .filter((name) => !publicApiNames.has(name))
    .sort()
  writeFileSync(
    join(jsConsumerRoot, 'smoke.mjs'),
    `import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import * as fieldWeft from 'fieldweft'

const expectedRuntimeNames = ${JSON.stringify(expectedRuntimeNames)}
const forbiddenRootNames = ${JSON.stringify(forbiddenRootNames)}
assert.deepEqual(Object.keys(fieldWeft).sort(), expectedRuntimeNames)
for (const name of forbiddenRootNames) {
  assert.equal(Object.hasOwn(fieldWeft, name), false, \`Unexpected root export: \${name}\`)
}

const require = createRequire(import.meta.url)
const schema = require('fieldweft/schema/v1')
const golden = require('fieldweft/fixtures/fieldweft-d1-v1-golden.json')
assert.equal(schema.$id, 'fieldweft-v1.schema.json')

const validated = fieldWeft.validateFieldWeftDocV1(golden.document)
assert.equal(validated.ok, true)
const canonical = fieldWeft.canonicalizeFieldWeftDoc(validated.doc)
const encoded = await fieldWeft.encodeFieldWeftShare(canonical)
assert.equal(encoded.kind, 'ok')
assert.equal(encoded.token.startsWith('d1.'), true)
const decoded = await fieldWeft.decodeFieldWeftShare(encoded.token)
assert.equal(decoded.kind, 'ok')
assert.deepEqual(decoded.doc, canonical)

for (const specifier of [
  'fieldweft/adapter-reference',
  'fieldweft/src/adapter-reference.ts',
]) {
  await assert.rejects(
    import(specifier),
    (error) => error?.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED',
  )
}

console.log('Installed JavaScript package smoke passed')
`,
  )
  run(process.execPath, ['smoke.mjs'], { cwd: jsConsumerRoot })

  const installedPackageRoot = join(
    jsConsumerRoot,
    'node_modules',
    sourcePackageJson.name,
  )
  const installedPackageJson = JSON.parse(
    readFileSync(join(installedPackageRoot, 'package.json'), 'utf8'),
  )
  assert.equal(installedPackageJson.name, sourcePackageJson.name)
  assert.equal(installedPackageJson.version, sourcePackageJson.version)
  assert.equal(installedPackageJson.license, 'Apache-2.0')
  assert.deepEqual(installedPackageJson.exports, sourcePackageJson.exports)
  const installedLicense = readFileSync(join(installedPackageRoot, 'LICENSE'))
  assert.equal(
    createHash('sha256').update(installedLicense).digest('hex'),
    'cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30',
  )
  validateDeclarationExports(installedPackageRoot)
  validateInstalledDocuments(installedPackageRoot)

  const tsConsumerRoot = join(smokeRoot, 'ts-consumer')
  mkdirSync(tsConsumerRoot)
  writeJson(join(tsConsumerRoot, 'package.json'), {
    name: 'fieldweft-typescript-package-smoke',
    private: true,
    type: 'module',
  })
  installTarball(tsConsumerRoot, tarballPath)
  writeJson(join(tsConsumerRoot, 'tsconfig.json'), {
    compilerOptions: {
      target: 'ES2023',
      lib: ['ES2023', 'DOM'],
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      strict: true,
      verbatimModuleSyntax: true,
      resolveJsonModule: true,
      noEmit: true,
      skipLibCheck: false,
    },
    include: ['consumer.ts'],
  })
  writeFileSync(
    join(tsConsumerRoot, 'consumer.ts'),
    `import schema from 'fieldweft/schema/v1' with { type: 'json' }
import golden from 'fieldweft/fixtures/fieldweft-d1-v1-golden.json' with { type: 'json' }
import {
  FIELD_WEFT_VERSION_V1,
  canonicalizeFieldWeftDoc,
  validateFieldWeftDocV1,
  type CanonicalFieldWeftDocV1,
  type FieldWeftDocV1,
} from 'fieldweft'
// @ts-expect-error Legacy CodeDoc aliases belong to fieldweft-web.
import type { CodeDoc } from 'fieldweft'
// @ts-expect-error Layout default constructors are not public core exports.
import { defaultEntityPosition } from 'fieldweft'
// @ts-expect-error The reference adapter has no package subpath.
import type {} from 'fieldweft/adapter-reference'

export const schemaId: string = schema.$id
export const version: 1 = FIELD_WEFT_VERSION_V1
export const goldenValidation = validateFieldWeftDocV1(golden.document)

export function canonicalize(
  document: FieldWeftDocV1,
): CanonicalFieldWeftDocV1 {
  const validated = validateFieldWeftDocV1(document)
  if (!validated.ok) {
    throw new Error(validated.errors[0]?.message ?? 'Invalid FieldWeft document')
  }
  return canonicalizeFieldWeftDoc(validated.doc)
}
`,
  )
  run(
    process.execPath,
    [
      join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
      '-p',
      join(tsConsumerRoot, 'tsconfig.json'),
    ],
    { cwd: tsConsumerRoot },
  )

  console.log(
    `Packed ${packResult.filename}; JavaScript and TypeScript consumer smoke passed.`,
  )
} finally {
  if (keepSmokeRoot) {
    console.log(`Kept package smoke workspace: ${smokeRoot}`)
  } else {
    const resolvedSmokeRoot = resolve(smokeRoot)
    const resolvedTempRoot = resolve(tmpdir())
    const smokeRelativePath = relative(resolvedTempRoot, resolvedSmokeRoot)
    assert.equal(
      smokeRelativePath.startsWith('fieldweft-package-smoke-'),
      true,
      'Refusing to remove an unexpected package smoke directory.',
    )
    rmSync(resolvedSmokeRoot, { recursive: true, force: true })
  }
}
