# FieldWeft 기여 가이드

FieldWeft의 이식 가능한 문서 코어 개선에 참여해 주셔서 감사합니다.

> **비정본 안내:** 이 문서는
> [영문 기여 가이드](CONTRIBUTING.md)의 한국어 해설이다. 영문이 정본이며 같은 내용을 다르게
> 설명하면 영문이 우선한다.

## 범위

이 저장소에는 modern browser와 지원하는 Node.js 버전에서 함께 동작하는 이식 가능한 문서 로직만
둔다. UI component, React, React Flow, graph 변환, 분석, hosting과 애플리케이션 배포는 각각의
소유 저장소에 둔다.

큰 변경을 시작하기 전에는 문제, 의도한 계약 영향과 호환성 위험을 설명하는 issue를 열거나 기존
issue를 연결한다. 작고 독립적인 수정은 집중된 pull request로 바로 제출할 수 있다.

## 개발 환경

Node.js 20 이상과 npm을 사용한다. `package-lock.json`만 package-manager lockfile로 취급한다.

```sh
git clone https://github.com/visyntax/fieldweft.git
cd fieldweft
npm ci
npm run verify
```

지원 browser와 Node.js의 platform API가 부족한 이유를 설명하지 않고 runtime dependency를
추가하지 않는다.

## 계약 변경

FieldWeft v1 schema, 생성 타입, validator, canonical 직렬화, diagnostics, share codec, 영문 정본
명세, 테스트와 golden fixture를 하나의 계약으로 다룬다.

- 호환성 보장은 안정판 패키지 버전 `1.0.0`부터 시작한다.
- 그 전에는 FieldWeft v1 명세와 함께 관리되는 모든 계약 산출물이 하위 호환 없이 변경될 수 있다.
- `1.0.0`부터 하위 호환 release는 안정된 FieldWeft v1 계약에서 유효한 문서를 무효로 만들면 안
  된다.
- 부수적인 refactor로 canonical byte, diagnostic code나 params 의미, `d1` tuple·token 출력과
  golden fixture를 바꾸지 않는다.
- format을 의도적으로 바꾸면 schema, generator, 생성 타입, validator, 명세, 예제와 테스트를 함께
  갱신한다.
- schema 수정 뒤 `npm run generate:fieldweft-types`를 실행한다.
  `src/fieldweft-v1.generated.ts`를 직접 수정하지 않는다.

## 버전과 release channel

FieldWeft 포맷 버전과 npm 패키지 버전을 서로 독립된 버전 축으로 다룬다. `1.0.0`이 안정된 v1
기준선을 확정한 뒤에는 패키지 major release 자체만으로 안정된 v1 지원을 표방하는 reader가 안정된
v1 계약을 만족하는 문서를 거부할 근거가 되지 않는다. package major가 새 포맷을 추가하거나
JavaScript API를 바꾸는 경우에도 이 규칙을 지킨다.

정식 package release에서는 다음 규칙을 적용한다.

- diagnostic `code` 추가에는 minor release가 필요하다.
- diagnostic `params` key 추가에는 minor release가 필요하다.
- 사람이 읽는 diagnostic 메시지 문구만 바꾸는 경우에는 patch release가
  필요하다.
- diagnostic `code`를 제거·rename하거나 의미를 바꾸는 경우에는 major release가 필요하다.
- diagnostic `params` key를 제거·rename하거나 의미를 바꾸는 경우에는 major release가 필요하다.
- 소비자는 알 수 없는 diagnostic `code`를 허용하고 `severity`, `path`, `message`를 사용해 일반
  진단으로 처리해야 한다.
- 소비자는 알 수 없는 diagnostic `params` key를 무시해야 한다.

RC는 npm `next` dist-tag, 정식판은 `latest`로 배포한다. `1.0.0` 공개 뒤에는 `next`도
`1.0.0`으로 이동한다.

## 공개 API 변경

root entry point는 `src/index.ts`다. 승인된 전체 surface는
`scripts/public-api-manifest.mjs`에 정의하고 `docs/public-api-manifest.md`로 생성한다.

- 명시적인 manifest 검토 없이 root export를 추가하거나 제거하지 않는다.
- runtime과 declaration export를 승인 manifest와 정확히 맞춘다.
- legacy `CodeDoc` 이름, adapter 참고 구현과 layout 기본 생성자를 코어에서 공개하지 않는다.
- manifest source를 수정하고 `npm run generate:public-api-manifest`를 실행한다. 생성된 manifest
  문서를 직접 수정하지 않는다.
- `fieldweft-web` 호환 별칭은 manifest의 분류 정보로만 유지하며 실제 구현은 웹 저장소가 소유한다.

## 문서

영문 문서는 정본이고 한국어 문서는 비정본 해설이다. 같은 계약을 다르게 설명하면 영문이 우선한다.

- 공개 API 문서, 생성 declaration JSDoc과 diagnostic 메시지는 영문으로 유지한다.
- 영문 가이드를 변경하면 대응하는 한국어 해설도 함께 갱신한다.
- 저장소와 패킹된 npm artifact에서 상대 링크가 모두 유효하게 유지되도록 한다.
- 애플리케이션별 통합 동작은 비규범으로 표시하고 웹 소유 정책을 코어 계약에 넣지 않는다.

## 검증

pull request를 제출하기 전에 전체 로컬 게이트를 실행한다.

```sh
npm run verify
```

이 명령은 schema 생성, 승인 manifest, TypeScript, ESLint, 문서·npm publish 정책 계약,
runtime/declaration export, 코어 테스트, 문서 링크와 예제, golden 계약과 benchmark 실행 가능성을
검사한다.

package metadata, 공개 파일이나 문서 inventory를 바꾸면 패킹된 artifact도 확인한다.

```sh
npm pack --dry-run
```

릴리스 준비 단계에서는 다음 명령을 추가로 실행한다.

```sh
npm run verify:release
```

이 명령은 실제 tarball을 생성해 깨끗한 JavaScript 소비자 프로젝트와 strict NodeNext
TypeScript 소비자 프로젝트에 설치하고, 설치된 runtime·declaration surface와 패킹된 문서·
라이선스 자산을 검증한다. repository 설정, tag·dist-tag 검사, trusted publishing, provenance와
공개 후 검증은 영문 정본 [npm release guide](docs/release-guide.md)를 따른다. 해당 release의
명시적 승인 없이 release tag를 push하거나 공개하지 않는다.

## Pull request와 커밋

- 관련 없는 formatting이나 생성 파일 churn 없이 변경을 집중한다.
- 변경 전 실패하고 변경 후 통과하는 테스트를 추가하거나 갱신한다.
- 호환성 영향과 의도적인 계약 변경을 설명한다.
- pull request 설명에 검증 결과를 기록한다.
- commit subject는 간결한 영문 명령형으로 작성한다. 큰 변경에는 빈 줄 뒤에 동작, 검증과 문서를
  설명하는 짧은 영문 `-` bullet을 추가한다.

## 기여 라이선스

이 프로젝트는 [Apache License, Version 2.0](LICENSE)으로 배포한다. 별도로 명시하지 않는 한,
이 프로젝트에 포함하도록 의도적으로 제출한 contribution은 추가 조건 없이 같은 라이선스로
제출한 것으로 다룬다.

contribution을 제출함으로써 제출자는 해당 contribution의 저작권자이거나 저작권자로부터 이
라이선스에 따라 제출할 권한을 받았음을 확인한다. 또한 고용주나 기타 제3자 권리자로부터
제출에 필요한 승인을 받았음을 확인한다. contribution과 관련된 알려진 제3자 라이선스나 기타
제한이 있으면 공개해야 한다.
