import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  FIELD_WEFT_GITHUB_REPOSITORY,
  FIELD_WEFT_PACKAGE_NAME,
  FIELD_WEFT_REPOSITORY_URL,
  classifyPackageVersion,
  requireTrustedPublishingNpmVersion,
  validatePublishContext,
} from './publish-policy.mjs'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const sourcePackageJson = JSON.parse(
  readFileSync(join(root, 'package.json'), 'utf8'),
)
const sourcePackageLock = JSON.parse(
  readFileSync(join(root, 'package-lock.json'), 'utf8'),
)

function packageJson(version = sourcePackageJson.version) {
  return {
    ...sourcePackageJson,
    version,
  }
}

function packageLock(version = sourcePackageJson.version) {
  return {
    ...sourcePackageLock,
    version,
    packages: {
      ...sourcePackageLock.packages,
      '': {
        ...sourcePackageLock.packages[''],
        version,
      },
    },
  }
}

assert.deepEqual(classifyPackageVersion('1.0.0-rc.1'), {
  version: '1.0.0-rc.1',
  gitTag: 'v1.0.0-rc.1',
  distTag: 'next',
  prerelease: true,
})
assert.deepEqual(classifyPackageVersion('1.0.0'), {
  version: '1.0.0',
  gitTag: 'v1.0.0',
  distTag: 'latest',
  prerelease: false,
})

for (const version of [
  '1.0.0-beta.1',
  '1.0.0-rc',
  '1.0.0-rc.01',
  '1.0.0-rc.1.2',
  '01.0.0',
  'v1.0.0',
]) {
  assert.throws(
    () => classifyPackageVersion(version),
    /Unsupported package version/,
  )
}

requireTrustedPublishingNpmVersion('11.5.1')
requireTrustedPublishingNpmVersion('11.6.0')
requireTrustedPublishingNpmVersion('12.0.0')
assert.throws(
  () => requireTrustedPublishingNpmVersion('11.5.0'),
  /too old for trusted publishing/,
)
assert.throws(
  () => requireTrustedPublishingNpmVersion('not-a-version'),
  /must have the form X\.Y\.Z/,
)

const validContext = {
  packageJson: packageJson(),
  packageLock: packageLock(),
  gitTag: `v${sourcePackageJson.version}`,
  githubRepository: FIELD_WEFT_GITHUB_REPOSITORY,
  npmVersion: '11.5.1',
}
assert.equal(validatePublishContext(validContext).distTag, 'next')
assert.equal(
  validatePublishContext({
    ...validContext,
    packageJson: packageJson('1.0.0'),
    packageLock: packageLock('1.0.0'),
    gitTag: 'v1.0.0',
  }).distTag,
  'latest',
)

assert.throws(
  () =>
    validatePublishContext({
      ...validContext,
      gitTag: 'v1.0.0',
    }),
  /does not match package version/,
)
assert.throws(
  () =>
    validatePublishContext({
      ...validContext,
      packageLock: {
        ...sourcePackageLock,
        version: '1.0.0',
      },
    }),
  /package-lock\.json name and version must match package\.json/,
)
assert.throws(
  () =>
    validatePublishContext({
      ...validContext,
      githubRepository: 'someone/fieldweft',
    }),
  /Publishing is restricted/,
)
assert.throws(
  () =>
    validatePublishContext({
      ...validContext,
      packageJson: {
        ...packageJson(),
        name: 'not-fieldweft',
      },
    }),
  new RegExp(`Package name must be ${FIELD_WEFT_PACKAGE_NAME}`),
)
assert.throws(
  () =>
    validatePublishContext({
      ...validContext,
      packageJson: {
        ...packageJson(),
        repository: {
          type: 'git',
          url: 'git+https://github.com/someone/fieldweft.git',
        },
      },
    }),
  (error) =>
    error instanceof Error &&
    error.message.includes(
      `repository.url must be ${FIELD_WEFT_REPOSITORY_URL}`,
    ),
)
assert.throws(
  () =>
    validatePublishContext({
      ...validContext,
      packageJson: {
        ...packageJson(),
        publishConfig: {
          access: 'restricted',
          provenance: true,
        },
      },
    }),
  /publishConfig\.access must be public/,
)
assert.throws(
  () =>
    validatePublishContext({
      ...validContext,
      packageJson: {
        ...packageJson(),
        publishConfig: {
          access: 'public',
          provenance: false,
        },
      },
    }),
  /publishConfig\.provenance must be true/,
)

const workflow = readFileSync(
  join(root, '.github', 'workflows', 'publish.yml'),
  'utf8',
)
for (const requiredText of [
  "      - 'v*'",
  'id-token: write',
  'contents: read',
  'group: npm-publish-fieldweft',
  'queue: max',
  'cancel-in-progress: false',
  "github.repository == 'visyntax/fieldweft'",
  'environment: npm',
  'runs-on: ubuntu-latest',
  'uses: actions/checkout@v6',
  'uses: actions/setup-node@v6',
  "node-version: '24'",
  "registry-url: 'https://registry.npmjs.org'",
  'package-manager-cache: false',
  'run: npm ci',
  'node scripts/check-publish-context.mjs',
  '--tag "$GITHUB_REF_NAME"',
  '--repository "$GITHUB_REPOSITORY"',
  '--npm-version "$(npm --version)"',
  'run: npm run verify:release',
  'npm publish --access public --provenance --tag',
  'NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}',
]) {
  assert.equal(
    workflow.includes(requiredText),
    true,
    `publish.yml is missing required policy: ${requiredText}`,
  )
}

const contextIndex = workflow.indexOf('node scripts/check-publish-context.mjs')
const verificationIndex = workflow.indexOf('run: npm run verify:release')
const publishIndex = workflow.indexOf(
  'npm publish --access public --provenance --tag',
)
assert.equal(contextIndex < verificationIndex, true)
assert.equal(verificationIndex < publishIndex, true)
assert.equal(workflow.includes('cancel-in-progress: true'), false)

const concurrencyIndex = workflow.indexOf('concurrency:')
const jobsIndex = workflow.indexOf('\njobs:')
assert.notEqual(concurrencyIndex, -1)
assert.equal(concurrencyIndex < jobsIndex, true)
const concurrencyPolicy = workflow.slice(concurrencyIndex, jobsIndex)
assert.equal(
  concurrencyPolicy.includes('group: npm-publish-fieldweft'),
  true,
)
assert.equal(concurrencyPolicy.includes('queue: max'), true)
assert.equal(concurrencyPolicy.includes('cancel-in-progress: false'), true)
assert.equal(concurrencyPolicy.includes('github.ref'), false)

console.log('npm publish policy tests passed')
