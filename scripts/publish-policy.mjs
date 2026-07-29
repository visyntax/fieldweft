export const FIELD_WEFT_PACKAGE_NAME = 'fieldweft'
export const FIELD_WEFT_GITHUB_REPOSITORY = 'visyntax/fieldweft'
export const FIELD_WEFT_REPOSITORY_URL =
  'git+https://github.com/visyntax/fieldweft.git'
export const MINIMUM_TRUSTED_PUBLISHING_NPM_VERSION = '11.5.1'

const numericIdentifier = '(?:0|[1-9][0-9]*)'
const stableVersionPattern = new RegExp(
  `^${numericIdentifier}\\.${numericIdentifier}\\.${numericIdentifier}$`,
)
const rcVersionPattern = new RegExp(
  `^${numericIdentifier}\\.${numericIdentifier}\\.${numericIdentifier}-rc\\.${numericIdentifier}$`,
)

function fail(message) {
  throw new Error(message)
}

function parseNumericVersion(version, label) {
  const match = /^([0-9]+)\.([0-9]+)\.([0-9]+)$/.exec(version)
  if (!match) fail(`${label} must have the form X.Y.Z; received ${version}.`)
  return match.slice(1).map(Number)
}

function compareNumericVersions(left, right) {
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index]
  }
  return 0
}

export function classifyPackageVersion(version) {
  if (typeof version !== 'string') {
    fail('package.json version must be a string.')
  }
  if (stableVersionPattern.test(version)) {
    return {
      version,
      gitTag: `v${version}`,
      distTag: 'latest',
      prerelease: false,
    }
  }
  if (rcVersionPattern.test(version)) {
    return {
      version,
      gitTag: `v${version}`,
      distTag: 'next',
      prerelease: true,
    }
  }
  fail(
    `Unsupported package version ${version}; expected X.Y.Z or X.Y.Z-rc.N without leading zeroes.`,
  )
}

export function requireTrustedPublishingNpmVersion(version) {
  const actual = parseNumericVersion(version, 'npm version')
  const minimum = parseNumericVersion(
    MINIMUM_TRUSTED_PUBLISHING_NPM_VERSION,
    'minimum npm version',
  )
  if (compareNumericVersions(actual, minimum) < 0) {
    fail(
      `npm ${version} is too old for trusted publishing; require ${MINIMUM_TRUSTED_PUBLISHING_NPM_VERSION} or newer.`,
    )
  }
}

export function validatePublishContext({
  packageJson,
  packageLock,
  gitTag,
  githubRepository,
  npmVersion,
}) {
  if (!packageJson || typeof packageJson !== 'object') {
    fail('package.json must be an object.')
  }
  if (packageJson.name !== FIELD_WEFT_PACKAGE_NAME) {
    fail(
      `Package name must be ${FIELD_WEFT_PACKAGE_NAME}; received ${String(packageJson.name)}.`,
    )
  }
  if (packageJson.repository?.url !== FIELD_WEFT_REPOSITORY_URL) {
    fail(
      `package.json repository.url must be ${FIELD_WEFT_REPOSITORY_URL}.`,
    )
  }
  if (packageJson.publishConfig?.access !== 'public') {
    fail('package.json publishConfig.access must be public.')
  }
  if (packageJson.publishConfig?.provenance !== true) {
    fail('package.json publishConfig.provenance must be true.')
  }
  if (!packageLock || typeof packageLock !== 'object') {
    fail('package-lock.json must be an object.')
  }
  if (
    packageLock.name !== packageJson.name ||
    packageLock.version !== packageJson.version ||
    packageLock.packages?.['']?.name !== packageJson.name ||
    packageLock.packages?.['']?.version !== packageJson.version
  ) {
    fail('package-lock.json name and version must match package.json.')
  }
  if (githubRepository !== FIELD_WEFT_GITHUB_REPOSITORY) {
    fail(
      `Publishing is restricted to ${FIELD_WEFT_GITHUB_REPOSITORY}; received ${githubRepository}.`,
    )
  }

  const release = classifyPackageVersion(packageJson.version)
  if (gitTag !== release.gitTag) {
    fail(
      `Git tag ${gitTag} does not match package version ${release.version}; expected ${release.gitTag}.`,
    )
  }
  requireTrustedPublishingNpmVersion(npmVersion)
  return release
}
