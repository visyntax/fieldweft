# FieldWeft v1 공유 가이드 해설

> **비정본 안내:** 이 문서는
> [영문 FieldWeft v1 sharing guide](../fieldweft-sharing-guide.md)의 한국어 해설이다.
> 같은 계약에 대한 설명이 다르면 영문 정본이 우선한다.

URL 공유 형식은 canonical FieldWeft v1 document 하나를 논리 payload로 쓰는 `#g=d1.…`이다.
ShareSnapshot envelope나 별도 공유 graph JSON을 만들지 않는다.

## 포함되는 상태

- entity, process, field, boundary와 stable ID 및 모든 공통 annotation
- 명시적 node relation과 field mapping의 ID·endpoint·label·공통 annotation·배열 순서
- node와 boundary position, boundary size·color·kind·membership
- entity `collapsed`, discriminator와 `when`

viewport, 선택·hover·trace highlight, 열린 패널, 페이지 이름과 여러 페이지 상태는 encode하지
않는다. 영속화, 페이지 생성, backup envelope와 viewport 동작은 통합 애플리케이션이 소유한다.

## `d1` wire 계약

`d1` prefix가 transport를 식별하므로 tuple에 `format` 문자열을 중복 저장하지 않는다. decoder는
unpack 결과에 `format: "fieldweft"`, `version: 1`과 생략된 빈 `nodeRelations`를 복원한 뒤 공통
validator와 canonicalizer를 통과시킨다.

```text
[
  packVersion,
  originX,
  originY,
  entities,
  processes,
  boundaries,
  mappings,
  nodeRelations?
]

nodeRelation = [id, sourceNodeIndex, targetNodeIndex, labelOr0?, annotation?]
nodeIndex     = entities 다음 processes를 이어 붙인 0-based index

annotation = [
  descriptionOr0,
  tagsOr0,
  sortedMetaEntriesOr0
]
metaEntry = [key, string | finite-number | boolean | null]
```

boundary는 endpoint index 공간에 포함하지 않는다. mapping과 enum slot 위치는 위 tuple로 고정하며,
빈 node relation 배열은 마지막 slot을 생략한다. encode/decode 양쪽에서
`nodeRelations.length + mappings.length <= 20,000`을 적용한다. wire 기준은 명명된
[`fieldweft-d1-v1-golden.json`](../../fixtures/fieldweft-d1-v1-golden.json)과
[`fieldweft-d1-v1-rich-golden.json`](../../fixtures/fieldweft-d1-v1-rich-golden.json)
fixture로 고정한다.

annotation tuple은 각 field, entity, process, boundary, mapping, node relation tuple의 마지막 선택
slot이다. annotation 전체 또는 trailing 빈 slot은 `0`/tail 생략으로 압축한다. tag는 canonical
순서를 유지하고 meta는 UTF-16 ordinal key 순서의 `[key, value]` 배열로 encode한다. 이는 JSON
object의 integer-like key 재배열을 피하고 명시적 `null`을 값 부재와 구분한다. decoder는 duplicate
meta key, 비유한 number, 중첩 value와 잘못된 tuple을 거부한 뒤 공통 validator를 다시 통과시킨다.

## 길이와 자원 한도

| 항목 | 한도 |
| --- | ---: |
| codec token | 256 × 1024 chars |
| packed JSON·streaming inflate 비압축 크기 | 8 × 1024 × 1024 bytes |
| canonical FieldWeft compact JSON | UTF-8 8 × 1024 × 1024 bytes |

encoder와 decoder는 token과 비압축 payload 한도를 대칭 적용한다. 관계·node·field·field depth 같은
FieldWeft 자원 한도뿐 아니라 ID·name·label·annotation·variant 값과 배열·aggregate 한도도 잘라내지
않고 전체 입력을 거부한다. canonical 8 MiB는 document 계약이고 packed 8 MiB와 token 256 KiB는
공유 transport 계약이다. 정확한 문서 한도는
[명세의 자원 제한](code-spec.md#자원-제한)을 따른다.

validator는 반환하는 원인 목록을 마지막 `diagnostics.truncated` marker로 제한할 수 있지만 입력 자체를
자르거나 일부 문서를 받아들이지 않는다. 이런 share 결과는 제한된 diagnostics를 유지한 `invalid`다.
validation이 멈추기 전에 실질적인 `limit.*` diagnostic을 냈다면 기존 `too-large` 결과를 그대로
적용한다.

## 수신과 실패 동작

수신자는 token을 제한 안에서 base64url decode·streaming inflate하고, 알려진 pack version을 엄격하게
unpack한 뒤 canonical FieldWeft validator를 실행한다. 성공하면 canonical document를 반환한다.
손상 tuple, unknown pack version, boundary endpoint, self-relation, dangling reference와 자원 초과
입력은 일부를 버리지 않고 전체를 거부한다.

decoder는 pack version 1의 확정된 tuple만 읽으며 다른 버전이나 형태를 위한 dual decoder·migration·
휴리스틱 repair를 제공하지 않는다. URL host·domain의 영구 존속, diagnostic 문구, 자동 layout 결과와
픽셀 단위 렌더링은 FieldWeft 문서 계약에 포함되지 않는다.

## 비규범 통합 경계

코어 codec은 전체 URL 한도, 긴 링크 경고 기준, backup 파일 한도나 envelope, 페이지 저장·덮어쓰기
동작과 viewport fit을 정의하지 않는다. 통합 애플리케이션은 코어 token보다 작은 한도를 적용하고
decode한 문서의 표시·저장 방식을 선택할 수 있다. 이는 애플리케이션 정책이며 FieldWeft 웹 통합이
소유하고 코어 transport 계약을 바꾸지 않는다.

## 보안과 개인정보

fragment는 일반적인 HTTP 요청과 Referer에 포함되지 않지만 전체 URL은 주소창·브라우저 history·
클립보드와 붙여 넣은 메신저·문서에 남는다. 문서의 name·description·tags·meta·label과 field 구조를
포함해 민감한 내용을 넣지 않는다. 공개 지원은 자원 한도 안의 안전한 입력을 대상으로 하며, 보안
취약점·명백한 spec 결함·자원 고갈 입력은 거부할 수 있고 변경 내역을 남긴다.

문서 자체의 지원·복원 범위는 [`FieldWeft v1 명세`](code-spec.md), 안전한 내용 작성은
[`작성·수정 가이드`](fieldweft-authoring-guide.md)를 따른다.
