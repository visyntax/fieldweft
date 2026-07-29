# FieldWeft v1 작성·수정 가이드 해설

> **비정본 안내:** 이 문서는
> [영문 FieldWeft v1 authoring and editing guide](../fieldweft-authoring-guide.md)의
> 한국어 해설이다. 같은 계약에 대한 설명이 다르면 영문 정본이 우선한다.

FieldWeft는 사람이 읽고 AI·adapter·앱이 함께 쓰는 검증 가능한 lineage 시각화 문서다. 외부
입력과 앱 저장본은 모두 [`FieldWeft v1 JSON 명세`](code-spec.md)와
[`JSON Schema`](../../schema/fieldweft-v1.schema.json)를 따른다. 구조 schema를 통과한 뒤에도 Viewer의 공통
validator로 ID, 참조, 방향, membership과 자원 한도를 검사해야 한다.

## 가장 작은 문서

다섯 배열은 비어 있어도 생략할 수 없다. 알 수 없는 property와 `$schema`는 문서 안에 넣지 않는다.

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

marker 누락, 다른 format·version·enum, 손상된 참조를 자동 수정하지 않는다. 입력 경계는 unknown
JSON을 parse한 뒤 v1을 검증하고, 성공한 문서만 canonicalize해 적용한다. 실패하면 현재 문서를
그대로 유지하고 JSON Pointer가 있는 diagnostic을 표시한다.

## 새 문서 작성

1. table·event·API DTO·dataset은 `entity`, ETL·SQL transform·service operation은 `process`로
   투영한다.
2. 모든 node, field, node relation과 mapping에 유효하고 고유한 ID를 준다. ID는 표시 이름이나
   field path와 별개의 identity다.
3. dataset/job/service 수준 사실은 `nodeRelations`, leaf field/column 수준 사실은 `mappings`에
   넣는다. 한쪽에서 다른 쪽을 추측해 생성하지 않는다.
4. layout을 알고 있으면 `position`과 boundary `size`를 쓴다. 모르면 생략한다. Viewer가 빠진
   layout만 결정적 기본값으로 채운다.
5. source 의미를 보존해야 하면 아래 공통 annotation을 대상 object에 직접 쓴다.
6. 공개 schema와 공통 validator를 모두 통과한 결과만 전달한다.

layout이 없는 node relation 예시는
[`table-job-node-relations.json`](../examples/table-job-node-relations.json), layout과 node relation·field
mapping이 함께 있는 예시는
[`table-job-field-lineage.json`](../examples/table-job-field-lineage.json)을 참고한다.

## 공통 annotation 작성

entity, process, boundary, 모든 entity/process field, node relation, mapping은 선택적으로
`description`, `tags`, `meta`를 직접 가진다. `annotations` wrapper를 만들지 않는다. 표시 이름은
node·field의 `name`, relation·mapping의 `label`에 두고 annotation으로 대체하지 않는다.

```jsonc
{
  "description": "결제 이벤트의 고객 식별자",
  "tags": ["critical", "pii"],
  "meta": {
    "com.example.owner": "payments",
    "retentionDays": 365,
    "reviewed": true,
    "sourceVersion": null
  }
}
```

- `description`은 plain text다. 빈 문자열은 canonical 문서에서 생략된다.
- tag는 대소문자와 Unicode 표기를 포함한 exact string이다. 중복을 넣지 말고 검색·분류에 쓰는
  안정된 어휘만 기록한다. canonicalizer가 UTF-16 ordinal 순서로 정렬한다.
- `meta`는 중첩 object나 array가 아닌 `string | number | boolean | null` 값만 쓰는 얕은 map이다.
  값 부재와 명시적 `null`은 다르며, 수치 정밀도나 앞자리 0이 중요한 값은 string으로 쓴다.
- `__proto__`, `prototype`, `constructor` key와 `fieldweft.` prefix를 사용하지 않는다.
  외부 producer의 key는 충돌을 피하도록 `com.example.*` 같은 안정된 namespace를 권장한다.
- annotation은 semantic diff에 포함된다. source owner·분류·안정 ID처럼 문서 의미와 함께 변하는
  값만 넣고 timestamp, request/trace/job ID, 처리 시간·retry 수는 adapter sidecar나 실행 log에 둔다.

canonical JSON을 내보낼 때는 FieldWeft 전용 serializer를 사용한다. 이 serializer는 schema
property를 고정 순서로, `meta`와 `when` key를 UTF-16 ordinal 순서로 쓴다. 일반
`JSON.stringify(canonicalDoc)`의 object 삽입 순서를 canonical byte 계약으로 사용하지 않는다.

## 기존 문서 수정

- rename·reorder·move·속성 변경에는 기존 node, field, boundary, relation ID를 유지한다.
- 새 field와 clone된 field subtree에만 새 ID를 발급한다. clone할 때 `when`, `collapsed`, mapping
  endpoint를 같은 remap으로 갱신한다.
- 실제 source 순서가 바뀌지 않았다면 entity, process, boundary, node relation, mapping과 sibling
  field 배열 순서를 유지한다.
- 바꾸지 않은 `position`, boundary `size`, `collapsed`, color, 모든 공통 annotation과 membership을
  보존한다.
- mapping의 `kind`·`label`이나 node relation의 `label` 변경은 같은 ID의 property update다.
- 삭제하거나 ID를 바꾼 대상의 `when`, `collapsed`, `members`, relation endpoint와 mapping endpoint를
  같은 변경에서 정리한다. validator가 깨진 참조를 조용히 삭제해 주지 않는다.

canonicalizer는 유효한 명시 좌표를 clamp하지 않는다. boundary 밖 node와 boundary position은 canvas
절대좌표이고, member node position은 소속 boundary 좌상단 기준 상대좌표다. membership을 바꿀 때는
화면의 절대 위치가 유지되도록 좌표 프레임도 함께 바꾼다.

## 공개 자원 한도

한도를 넘는 값을 잘라내거나 일부 배열만 남겨 유효한 문서처럼 만들지 않는다. node·boundary는
5,000개, field는 100,000개, field tree 깊이는 64, node relation·mapping 합계는 20,000개까지다.
Unicode code point 기준으로 ID·name·discriminator/when 값은 256자, label은 512자, 모든
description과 meta string value는 4,096자까지 허용한다. object 하나의 tags/meta는 각각 32개,
tag는 1..64자, meta key는 1..128자다. 문서 전체 tag·meta entry는 각각 100,000개, annotation
문자열 합계는 4,000,000자까지다. raw JSON source는 UTF-8 16 MiB, canonical compact document는
8 MiB까지다. 좌표·크기·variant 배열을 포함한 전체 제한은
[명세의 자원 제한](code-spec.md#자원-제한)을 따른다.

## 관계 정밀도와 복원 범위

node relation은 두 node 사이 lineage 사실만 뜻하며 field mapping을 암시하지 않는다. field trace는
`mappings`만 통과하고 node relation을 이유로 같은 이름의 field를 연결하지 않는다. 같은 node 쌍에
명시적 node relation과 field mapping이 함께 있어도 둘 다 보존한다.

FieldWeft는 자신이 표현한 canonical 시각화 문서를 document → graph → document로 복원한다. 원본
SQL·소스 코드·vendor payload·실제 데이터 값이나 원본 lineage 저장소를 역복원하는 포맷은 아니다.
문서와 공유 URL에 민감한 이름·설명·tag·metadata·label을 넣지 말고, 큰 조직 전체보다 검토에 필요한
부분 그래프를 export하는 방식을 권장한다.

외부 모델을 변환한다면 [`adapter 가이드`](fieldweft-adapter-guide.md), URL 전달과 안전 한도는
[`공유 가이드`](fieldweft-sharing-guide.md)를 함께 따른다.
