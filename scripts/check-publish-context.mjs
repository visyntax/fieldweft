import { appendFileSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validatePublishContext } from './publish-policy.mjs'

const root = dirname(dirname(fileURLToPath(import.meta.url)))

function readOptions(arguments_) {
  const options = new Map()
  for (let index = 0; index < arguments_.length; index += 2) {
    const name = arguments_[index]
    const value = arguments_[index + 1]
    if (!name?.startsWith('--') || value === undefined) {
      throw new Error(`Invalid publish-context argument: ${name ?? '(missing)'}.`)
    }
    if (options.has(name)) {
      throw new Error(`Duplicate publish-context argument: ${name}.`)
    }
    options.set(name, value)
  }
  for (const name of options.keys()) {
    if (!['--tag', '--repository', '--npm-version'].includes(name)) {
      throw new Error(`Unknown publish-context argument: ${name}.`)
    }
  }
  return options
}

const options = readOptions(process.argv.slice(2))
const packageJson = JSON.parse(
  readFileSync(join(root, 'package.json'), 'utf8'),
)
const packageLock = JSON.parse(
  readFileSync(join(root, 'package-lock.json'), 'utf8'),
)
const release = validatePublishContext({
  packageJson,
  packageLock,
  gitTag: options.get('--tag') ?? process.env.GITHUB_REF_NAME,
  githubRepository:
    options.get('--repository') ?? process.env.GITHUB_REPOSITORY,
  npmVersion: options.get('--npm-version'),
})

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    `version=${release.version}\ngit-tag=${release.gitTag}\ndist-tag=${release.distTag}\n`,
  )
}

console.log(
  `Validated ${release.gitTag}: publish ${packageJson.name}@${release.version} with dist-tag ${release.distTag}.`,
)
