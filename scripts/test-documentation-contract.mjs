import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))

function readDocument(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8')
}

function requireStatements(relativePath, statements) {
  const contents = readDocument(relativePath).replaceAll(/\s+/g, ' ')
  for (const statement of statements) {
    const normalizedStatement = statement.replaceAll(/\s+/g, ' ')
    assert.equal(
      contents.includes(normalizedStatement),
      true,
      `${relativePath} is missing documentation contract text: ${statement}`,
    )
  }
}

function forbidStatements(relativePath, statements) {
  const contents = readDocument(relativePath).replaceAll(/\s+/g, ' ')
  for (const statement of statements) {
    const normalizedStatement = statement.replaceAll(/\s+/g, ' ')
    assert.equal(
      contents.includes(normalizedStatement),
      false,
      `${relativePath} contains obsolete documentation contract text: ${statement}`,
    )
  }
}

requireStatements('README.md', [
  'The FieldWeft format version and the npm package version are separate version',
  'Compatibility guarantees begin with the stable package version `1.0.0`.',
  'Before that release, the FieldWeft v1 specification and all coordinated contract artifacts may change without backward compatibility.',
  'From `1.0.0` onward, a backward-compatible release must not invalidate a document that is valid under the stable FieldWeft v1 contract.',
  'After the baseline is established, a package major release does not, by itself, permit a reader claiming stable v1 support to reject a document that satisfies the stable v1 format contract.',
  '| Add a diagnostic `code` | Minor |',
  '| Add a diagnostic `params` key | Minor |',
  '| Change only human-readable diagnostic message wording | Patch |',
  '| Remove or rename a diagnostic `code`, or change its meaning | Major |',
  '| Remove or rename a diagnostic `params` key, or change its meaning | Major |',
  'Consumers must tolerate unrecognized diagnostic `code` values and handle them generically using `severity`, `path`, and `message`.',
  'Consumers must ignore unrecognized diagnostic `params` keys.',
  'RC releases are published with the npm `next` dist-tag, while stable releases',
  'the `next` tag is also moved to `1.0.0`',
  '[npm release guide](docs/release-guide.md)',
  'do not push a release tag or publish without explicit approval.',
])

requireStatements('README.ko.md', [
  'FieldWeft 포맷 버전과 npm 패키지 버전은 서로 독립된 버전 축이다.',
  '호환성 보장은 안정판 패키지 버전 `1.0.0`부터 시작한다.',
  '그 전에는 FieldWeft v1 명세와 함께 관리되는 모든 계약 산출물이 하위 호환 없이 변경될 수 있다.',
  '`1.0.0`부터 하위 호환 release는 안정된 FieldWeft v1 계약에서 유효한 문서를 무효로 만들면 안 된다.',
  '기준선 확정 뒤에는 패키지 major release 자체만으로 안정된 v1 지원을 표방하는 reader가 안정된 v1 포맷 계약을 만족하는 문서를 거부할 근거가 되지 않는다.',
  '| diagnostic `code` 추가 | Minor |',
  '| diagnostic `params` key 추가 | Minor |',
  '| 사람이 읽는 diagnostic 메시지 문구만 변경 | Patch |',
  '| diagnostic `code` 제거·rename 또는 의미 변경 | Major |',
  '| diagnostic `params` key 제거·rename 또는 의미 변경 | Major |',
  '소비자는 알 수 없는 diagnostic `code`를 허용하고 `severity`, `path`, `message`를 사용해 일반 진단으로 처리해야 한다.',
  '소비자는 알 수 없는 diagnostic `params` key를 무시해야 한다.',
  'RC는 npm `next` dist-tag, 정식판은 `latest`로 배포한다.',
  '`next`도 `1.0.0`으로 이동한다.',
  '[npm release guide](docs/release-guide.md)',
  '명시적 승인 없이 release tag를 push하거나 공개하지 않는다.',
])

for (const relativePath of ['CONTRIBUTING.md', 'AGENTS.md']) {
  requireStatements(relativePath, [
    'Treat the FieldWeft format version and the npm package version as separate',
    'Compatibility guarantees begin with the stable package version `1.0.0`.',
    'Before that release, the FieldWeft v1 specification and all coordinated contract artifacts may change without backward compatibility.',
    'From `1.0.0` onward, a backward-compatible release must not invalidate a document that is valid under the stable FieldWeft v1 contract.',
    'After `1.0.0` establishes the stable v1 baseline, a package major release does not, by itself, permit a reader claiming stable v1 support to reject a document that satisfies the stable v1 contract.',
    'Adding a diagnostic `code` requires a minor release.',
    'Adding a diagnostic `params` key requires a minor release.',
    'Changing only human-readable diagnostic message wording requires a patch',
    'Removing or renaming a diagnostic `code`, or changing its meaning, requires a major release.',
    'Removing or renaming a diagnostic `params` key, or changing its meaning, requires a major release.',
    'Consumers must tolerate unrecognized diagnostic `code` values and handle them generically using `severity`, `path`, and `message`.',
    'Consumers must ignore unrecognized diagnostic `params` keys.',
    'Publish RC releases with the npm `next` dist-tag and stable releases with',
    'After publishing `1.0.0`, also move `next` to `1.0.0`.',
  ])
}

requireStatements('AGENTS.md', [
  'Never create or push a release tag, approve the `npm` environment, or run `npm publish` without explicit maintainer approval for that release.',
  'Publish only from `.github/workflows/publish.yml` in the official `visyntax/fieldweft` repository.',
  'Require the Git tag to equal `v` plus the package version and derive the npm dist-tag from that version; do not accept a caller-selected dist-tag.',
  'Serialize every FieldWeft publish in one fixed package concurrency group, retain pending releases with `queue: max`, and never cancel an in-progress publish.',
  'Run `npm run verify:release` before `npm publish`.',
  'Treat `NPM_TOKEN` as a one-time first-publication bootstrap credential and revoke it after trusted publishing succeeds.',
  'Run `npm run verify` for schema generation, export-manifest parity, TypeScript, lint, documentation and npm publish-policy contracts, core tests, and benchmark smoke checks.',
])

requireStatements('CONTRIBUTING.ko.md', [
  'FieldWeft 포맷 버전과 npm 패키지 버전을 서로 독립된 버전 축으로 다룬다.',
  '호환성 보장은 안정판 패키지 버전 `1.0.0`부터 시작한다.',
  '그 전에는 FieldWeft v1 명세와 함께 관리되는 모든 계약 산출물이 하위 호환 없이 변경될 수 있다.',
  '`1.0.0`부터 하위 호환 release는 안정된 FieldWeft v1 계약에서 유효한 문서를 무효로 만들면 안 된다.',
  '`1.0.0`이 안정된 v1 기준선을 확정한 뒤에는 패키지 major release 자체만으로 안정된 v1 지원을 표방하는 reader가 안정된 v1 계약을 만족하는 문서를 거부할 근거가 되지 않는다.',
  'diagnostic `code` 추가에는 minor release가 필요하다.',
  'diagnostic `params` key 추가에는 minor release가 필요하다.',
  '사람이 읽는 diagnostic 메시지 문구만 바꾸는 경우에는 patch release가',
  'diagnostic `code`를 제거·rename하거나 의미를 바꾸는 경우에는 major release가 필요하다.',
  'diagnostic `params` key를 제거·rename하거나 의미를 바꾸는 경우에는 major release가 필요하다.',
  '소비자는 알 수 없는 diagnostic `code`를 허용하고 `severity`, `path`, `message`를 사용해 일반 진단으로 처리해야 한다.',
  '소비자는 알 수 없는 diagnostic `params` key를 무시해야 한다.',
  'RC는 npm `next` dist-tag, 정식판은 `latest`로 배포한다.',
  '`1.0.0` 공개 뒤에는 `next`도 `1.0.0`으로 이동한다.',
  '[npm release guide](docs/release-guide.md)',
  '명시적 승인 없이 release tag를 push하거나 공개하지 않는다.',
])

requireStatements('docs/code-spec.md', [
  'The npm package version is independent of this format version.',
  'Compatibility guarantees for this specification begin with the stable package version `1.0.0`.',
  'Before that release, this specification and its coordinated schema, generated types, validator semantics, canonical bytes, diagnostics, `d1` transport, tests, and fixtures may change without backward compatibility.',
  'From `1.0.0` onward, a reader claiming stable v1 support must read every document satisfying the stable v1 property meanings',
  'After `1.0.0` establishes the stable v1 baseline, a package major release does not, by itself, permit a reader claiming stable v1 support',
  'adding a diagnostic `code` or `params` key requires a minor release',
  'Removing or renaming either a diagnostic `code` or a diagnostic `params` key, or changing the meaning of either, requires a major release.',
  'Consumers must tolerate unrecognized diagnostic `code` values and handle them generically using `severity`, `path`, and `message`.',
  'Consumers must ignore unrecognized diagnostic `params` keys.',
])

requireStatements('docs/ko/code-spec.md', [
  'npm 패키지 버전은 이 포맷 버전과 독립적이다.',
  '이 명세의 호환성 보장은 안정판 패키지 버전 `1.0.0`부터 시작한다.',
  '그 전에는 이 명세와 함께 관리되는 schema, 생성 타입, validator 의미, canonical byte, diagnostics, `d1` transport, 테스트와 fixture가 하위 호환 없이 변경될 수 있다.',
  '`1.0.0`부터 안정된 v1 지원을 표방하는 reader는 안정된 v1 property 의미',
  '`1.0.0`이 안정된 v1 기준선을 확정한 뒤에는 패키지 major release 자체만으로 안정된 v1 지원을 표방하는 reader가',
  'diagnostic `code` 또는 `params` key 추가에는 minor release',
  'diagnostic `code` 또는 `params` key를 제거·rename하거나 의미를 바꾸는 경우에는 major release가 필요하다.',
  '소비자는 알 수 없는 diagnostic `code`를 허용하고 `severity`, `path`, `message`를 사용해 일반 진단으로 처리해야 한다.',
  '소비자는 알 수 없는 diagnostic `params` key를 무시해야 한다.',
])

for (const relativePath of [
  'AGENTS.md',
  'CONTRIBUTING.md',
  'README.md',
]) {
  forbidStatements(relativePath, [
    'Breaking changes are allowed between `1.0.0-rc.N` releases.',
    '`1.0.0-rc.N` releases may contain breaking changes.',
    'frozen v1 document acceptance guarantee',
  ])
}

for (const relativePath of ['CONTRIBUTING.ko.md', 'README.ko.md']) {
  forbidStatements(relativePath, [
    '`1.0.0-rc.N` 사이에는 breaking change를 허용한다.',
    '동결된 v1 문서 수용 보장',
  ])
}

requireStatements('docs/release-guide.md', [
  'Do not create or push a release tag, approve the `npm` GitHub environment, or run `npm publish` without explicit maintainer approval for that release.',
  '| `X.Y.Z-rc.N` | `vX.Y.Z-rc.N` | `next` |',
  '| `X.Y.Z` | `vX.Y.Z` | `latest` |',
  'An npm package must already exist before a trusted publisher can be attached to it.',
  'create the shortest-lived granular token that can create and publish the package, with read/write access and bypass 2FA enabled',
  'workflow filename: `publish.yml`',
  'Trusted publishing requires npm 11.5.1 or newer and Node.js 22.14.0 or newer.',
  'Every FieldWeft release shares the fixed `npm-publish-fieldweft` concurrency group.',
  '`queue: max` retains pending releases instead of replacing them, and no two publish workflows run at the same time.',
  'run `npm run verify:release`, including the packed consumer smoke test',
  'run `npm publish --access public --provenance` with the derived dist-tag',
  '`npm audit signatures`',
  'confirm that the provenance source links to `visyntax/fieldweft`, `publish.yml`, the release tag, and the expected commit.',
])

requireStatements('docs/ko/release-guide.md', [
  '명시적 승인 없이 release tag를 만들거나 push하지 않고, GitHub `npm` environment를 승인하거나 `npm publish`를 실행하지 않는다.',
  '| `X.Y.Z-rc.N` | `vX.Y.Z-rc.N` | `next` |',
  '| `X.Y.Z` | `vX.Y.Z` | `latest` |',
  'trusted publisher는 기존 npm package에만 연결할 수 있다.',
  '최단 만료 granular token을 read/write와 bypass 2FA를 활성화해 만들고',
  'workflow filename: `publish.yml`',
  'trusted publishing에는 npm 11.5.1 이상과 Node.js 22.14.0 이상이 필요하다.',
  '모든 FieldWeft release는 고정 `npm-publish-fieldweft` concurrency group을 공유한다.',
  '`queue: max`로 pending release를 교체하지 않고 보존하며 둘 이상의 publish workflow를 동시에 실행하지 않는다.',
  'packed consumer smoke를 포함한 `npm run verify:release`를 실행한다.',
  '결정한 dist-tag로 `npm publish --access public --provenance`를 실행한다.',
  '`npm audit signatures`',
  'provenance source가 `visyntax/fieldweft`, `publish.yml`, release tag와 예상 commit을 가리키는지 확인한다.',
])

requireStatements('docs/ko/README.md', [
  '| [npm release guide](../release-guide.md) | [npm 릴리스 가이드 해설](release-guide.md) |',
])

console.log('Documentation contract tests passed')
