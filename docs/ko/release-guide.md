# FieldWeft npm 릴리스 가이드 해설

> **비정본 안내:** 이 문서는
> [영문 FieldWeft npm release guide](../release-guide.md)의 한국어 해설이다.
> 같은 절차를 다르게 설명하면 영문 정본이 우선한다.

공개는 외부 상태를 바꾸는 작업이다. 해당 release에 대한 maintainer의 명시적 승인 없이 release
tag를 만들거나 push하지 않고, GitHub `npm` environment를 승인하거나 `npm publish`를 실행하지
않는다.

## Release tag와 npm channel

다음 package version과 Git tag 조합만 공개할 수 있다.

| `package.json` version | 필수 Git tag | npm dist-tag |
|---|---|---|
| `X.Y.Z-rc.N` | `vX.Y.Z-rc.N` | `next` |
| `X.Y.Z` | `vX.Y.Z` | `latest` |

모든 숫자 identifier는 앞자리 0이 없는 canonical decimal을 사용한다. 다른 prerelease identifier는
거부한다. publish workflow가 package version에서 dist-tag를 결정하며 호출자가 channel을 선택할 수
없다.

## 최초 repository와 npm 설정

release tag를 push하기 전에 다음 외부 설정을 마친다.

1. 공개 GitHub repository `visyntax/fieldweft`을 만들고 local `origin`으로 추가한다.
   `package.json`의 `repository.url`이
   `git+https://github.com/visyntax/fieldweft.git`과 정확히 일치하는지 확인한다.
2. `npm`이라는 GitHub environment를 만들고 required reviewer와 deployment branch/tag 제한을
   설정해 공개마다 명시적 승인이 필요하도록 한다.
3. release tag를 보호하고 `v*` tag 생성 권한을 제한한다.
4. 2FA가 활성화된 npm 계정에 unscoped `fieldweft` package 공개 권한이 있는지 확인한다.

trusted publisher는 기존 npm package에만 연결할 수 있다. 최초 공개에만 package를 생성·공개할 수
있는 최단 만료 granular token을 read/write와 bypass 2FA를 활성화해 만들고, protected `npm`
environment의 `NPM_TOKEN` secret으로 저장한다. package가 생기기 전에는 package 단위 제한을
선택하지 못할 수 있으므로 만료 기간을 최소화하고 bootstrap 직후 즉시 폐기한다. 첫 release가
명시적으로 승인된 뒤에만 사용한다.

package가 생기면 즉시 다음 값으로 npm trusted publisher를 구성한다.

- provider: GitHub Actions
- organization 또는 user: `visyntax`
- repository: `fieldweft`
- workflow filename: `publish.yml`
- environment: `npm`
- allowed actions: `npm publish`

trusted publishing에는 npm 11.5.1 이상과 Node.js 22.14.0 이상이 필요하다. workflow는
GitHub-hosted runner의 Node.js 24를 사용하고 `contents: read`, `id-token: write`만 부여해 npm
registry로 공개한다. trusted publication이 한 번 성공하면 `NPM_TOKEN`을 제거·폐기하고 npm
publishing access를 2FA 필수 및 token 금지로 바꾼다.

공식 npm [trusted publishing 문서](https://docs.npmjs.com/trusted-publishers/)와
[provenance 문서](https://docs.npmjs.com/generating-provenance-statements/),
[unscoped package 공개 요구사항](https://docs.npmjs.com/creating-and-publishing-unscoped-public-packages/)도
함께 확인한다.

## 자동 publish 안전장치

`.github/workflows/publish.yml`은 공식 repository에서 push된 `v*` tag에만 실행하고 protected
`npm` environment를 사용한다. 모든 FieldWeft release는 고정
`npm-publish-fieldweft` concurrency group을 공유한다. `queue: max`로 pending release를
교체하지 않고 보존하며 둘 이상의 publish workflow를 동시에 실행하지 않는다. 실행 순서는 다음과
같다.

1. `npm ci`로 `package-lock.json`에 고정된 dependency만 설치한다.
2. npm 11.5.1 이상인지 검사한다.
3. `package-lock.json`의 package name과 version이 `package.json`과 같은지 검사한다.
4. public access, provenance와 공식 repository URL을 검사한다.
5. Git tag가 package version 앞에 `v`를 붙인 값과 같은지 검사한다.
6. stable 또는 `rc.N` version만 허용하고 `latest` 또는 `next`를 결정한다.
7. packed consumer smoke를 포함한 `npm run verify:release`를 실행한다.
8. 결정한 dist-tag로 `npm publish --access public --provenance`를 실행한다.

tag, version, repository, npm version과 dist-tag 검사는
`scripts/check-publish-context.mjs`가 소유한다. `npm run test:publish-policy`는 실패 case와
필수 workflow 구조를 검증한다.

## 승인받을 release 준비

승인을 요청하기 전에 다음을 수행한다.

1. `package.json`과 `package-lock.json`을 같은 의도한 version으로 갱신한다.
2. `npm ci`와 `npm run verify:release`를 실행한다.
3. version 변경을 commit하고 공식 repository로 push한다.
4. 의도한 Git tag와 npm dist-tag를 승인 요청에 기록한다.

승인을 받은 뒤 commit의 package version과 정확히 같은 tag를 만들어 그 tag만 push한다. tag
push는 실제 공개를 시작하며 dry run이 아니다. 일부 단계가 실패하면 npm registry 상태를 확인하기
전까지 다른 tag나 version으로 재시도하지 않는다.

## 공개 뒤 검증

workflow 성공 뒤 registry를 독립적으로 확인한다.

1. `npm view fieldweft@X.Y.Z[-rc.N] version --json`이 의도한 version을 반환해야 한다.
2. `npm view fieldweft dist-tags --json`에서 위 표에 따라 `next` 또는 `latest`가 해당 version을
   가리켜야 한다.
3. `npm pack fieldweft@X.Y.Z[-rc.N] --json`에서 version, tarball filename, integrity와 shasum을
   확인한다.
4. 깨끗한 임시 project에 registry package를 script 실행 없이 설치하고
   `npm audit signatures`를 실행한다. FieldWeft package의 registry signature와 provenance
   attestation이 검증되었는지 확인한다.
5. npmjs.com에서 provenance source가 `visyntax/fieldweft`, `publish.yml`, release tag와 예상
   commit을 가리키는지 확인한다.
6. release note에 version, dist-tag, tarball integrity와 provenance 결과를 기록한다.

안정판 `1.0.0`을 공개하면 별도 명시적 승인을 받은 뒤에만 `next`를 같은 version으로 옮긴다.

```sh
npm dist-tag add fieldweft@1.0.0 next
```

trusted-publishing OIDC credential은 `npm publish`를 허용하지만 임의의 npm account command를
허용하지 않는다. 이 dist-tag 변경은 maintainer의 interactive session과 2FA로 수행하고
`latest`와 `next`를 다시 확인한다.
