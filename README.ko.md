# FieldWeft 한국어 안내

FieldWeft는 데이터 계보의 entity, process, boundary, node relation과 field
mapping을 표현하는 이식 가능한 JSON 문서 코어다. 이 패키지는 버전이 지정된 schema와 타입,
검증, canonical 직렬화, semantic/layout projection, structural diff, field ID 발급과 `d1`
공유 codec을 제공한다.

> **비정본 안내:** 이 문서는 한국어 해설이다. [영문 README](README.md)와 영문 계약 문서가
> 정본이며, 같은 계약에 대한 설명이 다르면 영문이 우선한다.

## 패키지 범위

코어에는 modern browser와 Node.js에서 함께 사용할 수 있는 문서 로직만 들어간다. UI, React,
React Flow, graph 변환, 분석, hosting과 앱 배포 코드는 포함하지 않는다.

공개 package surface는 root `fieldweft`, `fieldweft/schema/v1`,
`fieldweft/fixtures/*`로 제한된다. legacy `CodeDoc` 이름은 코어에서 export하지 않으며
호환 별칭은 `fieldweft-web`이 소유한다. adapter 참고 구현과 layout 기본 생성자도 공개 API가
아니다.

## 가장 작은 문서

```json
{
  "format": "fieldweft",
  "version": 1,
  "entities": [],
  "processes": [],
  "boundaries": [],
  "nodeRelations": [],
  "mappings": []
}
```

다섯 배열은 비어 있어도 모두 필요하다. JSON Schema가 구조 계약을 정의하고 공통 validator가
identity, 참조, 방향, membership, 좌표와 전체 자원 한도를 추가로 검사한다. 외부 입력은
`readCanonicalFieldWeftDoc` 같은 `unknown → validate → canonicalize` 경계를 거쳐야 한다.
canonical byte가 필요하면 일반 `JSON.stringify`가 아니라
`serializeCanonicalFieldWeftDoc`을 사용한다.

## 문서

| 영문 정본 | 한국어 비정본 해설 |
|---|---|
| [FieldWeft v1 JSON specification](docs/code-spec.md) | [FieldWeft v1 JSON 명세 해설](docs/ko/code-spec.md) |
| [Authoring and editing guide](docs/fieldweft-authoring-guide.md) | [작성·수정 가이드 해설](docs/ko/fieldweft-authoring-guide.md) |
| [Adapter guide](docs/fieldweft-adapter-guide.md) | [Adapter 가이드 해설](docs/ko/fieldweft-adapter-guide.md) |
| [Sharing guide](docs/fieldweft-sharing-guide.md) | [공유 가이드 해설](docs/ko/fieldweft-sharing-guide.md) |
| [npm release guide](docs/release-guide.md) | [npm 릴리스 가이드 해설](docs/ko/release-guide.md) |
| [Approved public API manifest](docs/public-api-manifest.md) | — |

machine-readable 구조 계약은
[`schema/fieldweft-v1.schema.json`](schema/fieldweft-v1.schema.json), 공개 golden fixture는
[`fixtures/`](fixtures/)에 있다.

## 호환성 계약

호환성 보장은 안정판 패키지 버전 `1.0.0`부터 시작한다. 그 전에는 FieldWeft v1 명세와 함께
관리되는 모든 계약 산출물이 하위 호환 없이 변경될 수 있다. `1.0.0`부터 하위 호환 release는
안정된 FieldWeft v1 계약에서 유효한 문서를 무효로 만들면 안 된다. schema 동작, 생성 타입,
validator 의미, canonical byte, diagnostic code와 params 의미, `d1` tuple·token과 golden fixture를
하나의 계약으로 관리한다.

## 포맷과 패키지 버전

FieldWeft 포맷 버전과 npm 패키지 버전은 서로 독립된 버전 축이다. 문서의 `version: 1`은 현재
v1 wire 계약을 식별하고, 안정판 패키지 버전 `1.0.0`이 그 계약을 호환성 기준선으로 확정한다.
패키지 버전은 reader, writer와 지원 API의 release를 식별한다. 향후 package major가 다른 포맷을
추가하거나 JavaScript API를 바꾸더라도 안정된 v1을 새 이름으로 바꾸거나 철회하는 것은 아니다.
기준선 확정 뒤에는 패키지 major release 자체만으로 안정된 v1 지원을 표방하는 reader가 안정된
v1 포맷 계약을 만족하는 문서를 거부할 근거가 되지 않는다.

정식 package release에서 diagnostic 변경은 다음처럼 분류한다. 이 분류가 위 v1 수용 보장을
완화하지는 않는다.

| Diagnostic 변경 | 필요한 release |
|---|---|
| diagnostic `code` 추가 | Minor |
| diagnostic `params` key 추가 | Minor |
| 사람이 읽는 diagnostic 메시지 문구만 변경 | Patch |
| diagnostic `code` 제거·rename 또는 의미 변경 | Major |
| diagnostic `params` key 제거·rename 또는 의미 변경 | Major |

소비자는 알 수 없는 diagnostic `code`를 허용하고 `severity`, `path`, `message`를 사용해 일반
진단으로 처리해야 한다. 소비자는 알 수 없는 diagnostic `params` key를 무시해야 한다. 그래야
minor release가 기존 integration을 깨지 않고 진단이나 context를 추가할 수 있다.

RC는 npm `next` dist-tag, 정식판은 `latest`로 배포한다. 안정판 `1.0.0`을 공개한 뒤에는
prerelease 소비자도 같은 안정판으로 모이도록 `next`도 `1.0.0`으로 이동한다.

## 개발 검증

Node.js 20 이상과 npm을 사용한다.

```sh
npm ci
npm run verify
```

`npm run verify`는 schema 생성, 승인 API manifest, TypeScript, lint, 문서·npm publish 정책
계약, build 산출물, 전체 코어 테스트와 benchmark 실행 가능성을 검사한다.

릴리스 전에는 `npm run verify:release`를 실행한다. 이 명령은 실제 tarball을 패킹해 깨끗한
JavaScript 소비자 프로젝트와 strict NodeNext TypeScript 소비자 프로젝트에 설치하는 검증을
추가로 실행한다. 영문 정본 [npm release guide](docs/release-guide.md)를 따르며 명시적 승인 없이
release tag를 push하거나 공개하지 않는다.

## 기여와 라이선스

개발·계약 변경·검증 규칙은 영문 정본 [CONTRIBUTING.md](CONTRIBUTING.md)를 따른다.
[한국어 기여 가이드](CONTRIBUTING.ko.md)는 비정본 해설이다.

FieldWeft는 [Apache License, Version 2.0](LICENSE)으로 배포한다.
