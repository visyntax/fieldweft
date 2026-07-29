# FieldWeft v1 adapter 가이드 해설

> **비정본 안내:** 이 문서는
> [영문 FieldWeft v1 adapter guide](../fieldweft-adapter-guide.md)의 한국어 해설이다.
> 같은 계약에 대한 설명이 다르면 영문 정본이 우선한다.

adapter의 책임은 외부 모델을 별도 Viewer JSON으로 만들지 않고 하나의 FieldWeft v1 문서로
투영하는 것이다. 출력은 [`공개 schema`](../../schema/fieldweft-v1.schema.json)와 공통 validator를 모두 통과해야
하며, validator가 입력을 수리할 것이라고 가정하지 않는다. 문자열·배열·전체 객체 수가
[`공개 자원 한도`](code-spec.md#자원-제한)를 넘으면 값을 자르거나 일부 관계를 버리지 말고 변환을
실패시킨다.

## 기본 투영

| 외부 개념 | FieldWeft |
| --- | --- |
| table·event·API DTO·dataset | entity |
| column·attribute·schema field | field |
| ETL·SQL transform·service operation | process |
| dataset·job·service lineage | node relation |
| field·column lineage | mapping |
| domain·system·security area | boundary |
| 안정된 설명·분류 tag·scalar source metadata | 대상 object의 `description`·`tags`·`meta` |
| 실행별 provenance·evidence | FieldWeft 밖 adapter sidecar·실행 envelope |

field lineage가 없으면 빈 field나 synthetic field를 만들어 연결하지 않는다. `nodeRelations`만 출력한
[`layout 없는 table/job 예제`](../examples/table-job-node-relations.json)가 이 경우다. field lineage도
있다면 [`layout·boundary 포함 예제`](../examples/table-job-field-lineage.json)처럼 node relation과
mapping을 서로 다른 배열에 함께 둔다.

## Annotation과 source metadata

entity, process, boundary, 모든 entity/process field, node relation, mapping에는
`description?: string`, `tags?: string[]`, `meta?: Record<string, string | number | boolean | null>`을
flat property로 투영할 수 있다. `annotations` wrapper, 중첩 metadata object, array metadata value는
유효하지 않다.

annotation은 source의 semantic 상태를 표현해야 한다. 예를 들어 owner, 보안 분류, source의 안정된
catalog ID·version은 적합하지만 `syncedAt`, adapter 실행 ID, request/trace/job ID, 처리 시간과 retry
수는 적합하지 않다. 같은 source revision을 서로 다른 시각이나 실행 환경에서 변환해도 annotation
결과가 같아야 한다. 실행별 값은 adapter 결과의 sidecar diagnostic이나 별도 envelope/log에 둔다.

tag는 대소문자와 Unicode 표기를 임의로 정규화하지 않고 source가 정의한 exact string으로 매핑한다.
meta는 null을 값 부재로 바꾸지 않으며, number는 유한한 IEEE-754 double로 정확히 나타낼 수 있을 때만
쓴다. 정밀 decimal, 큰 정수 ID, 앞자리 0이 의미 있는 값은 string으로 쓴다. producer 전용 key는
`com.example.*`처럼 안정된 namespace를 권장하며 `__proto__`, `prototype`, `constructor`와 예약
`fieldweft.` prefix는 사용하지 않는다.

target object가 지원하지 않는 vendor evidence를 name·description·label 또는 임의 meta string에
직렬화해 숨기지 않는다. 제품의 renderer·trace·impact·layout 동작을 바꿔야 하는 정보는 meta key가
아니라 이후 정식 schema property가 되어야 한다.

## ID와 배열 순서

모든 adapter는 문서 안에서 유효하고 고유한 ID를 제공해야 한다. one-shot 시각화는 임의의 유효 ID로
충분하다. revision이나 diff를 주장하는 producer만 같은 source identity에 안정된 ID를 유지해야 한다.

재생성형 adapter는 외부 source의 안정된 key로 정렬하거나 명시된 source 순서를 사용해 같은 입력에
결정적인 배열 순서를 만든다. 증분 수정형 adapter는 기존 FieldWeft 문서를 읽고, 바뀌지 않은 배열
순서·ID·layout을 보존한 채 변경 대상만 갱신한다. 표시 이름이나 layout을 다시 계산했다는 이유로
identity를 교체하지 않는다. 바뀌지 않은 annotation도 그대로 보존한다.

안정된 native relation ID가 있으면 우선 사용한다. 없으면 안정된 source/target identity로 relation
ID를 만들 수 있다. mapping의 `kind`·`label`, node relation의 `label`, 모든 공통 annotation은 변경
가능한 표시·속성 값이라 identity 입력에서 제외한다. 따라서 같은 mapping의 `keep` → `transform`,
label 또는 annotation 변경은 remove/add가 아니라 같은 ID의 property update다.

결정적 ID가 필요할 때는 [`96비트 source tuple 참고 구현`](../../src/adapter-reference.ts)을 사용할 수
있다. 이 구현은 object kind와 길이-prefix UTF-8 source identity tuple을 SHA-256으로 해시하고 앞
96비트를 16자 base64url suffix로 쓴다. 예를 들어 mapping은 안정된 source field identity와 target
  field identity만 넘기며 `kind`, `label`, annotation은 넘기지 않는다. 이는 별도 identity
  protocol이나 JSON 유효성 조건이 아니다.

이 참고 구현은 의도적으로 최소 규칙만 고정한다.

- 해시 입력은 `[objectKind, ...sourceIdentity]`다. 각 문자열의 UTF-8 byte 앞에 4-byte big-endian
  길이를 기록하므로 tuple 조각 경계는 모호하지 않으며 별도 part count는 추가하지 않는다.
- `"adapter"`·`"namespace"`·`"kind"` 같은 label 조각이나 adapter contract·source namespace·owner를
  자동으로 넣지 않는다. 서로 다른 scope를 분리해야 하는 adapter가 필요한 안정 identity 조각을
  `sourceIdentity`에 직접 포함한다.
- ID 앞부분은 source label에서 만든 slug가 아니라 `objectKind`다. 이 helper는 stateless라 서로 다른
  source tuple 사이의 96비트 hash 충돌을 직접 기억하거나 판정하지 않는다. 호출자는 같은 ID 공간에서
  source tuple과 결과 ID를 등록하고, 서로 다른 tuple이 같은 ID가 되면 임의 suffix를 붙이지 말고
  명시적으로 실패해야 한다.

source system이 identifier 동등성 규칙을 제공하지 않으면 source identity에
Unicode 정규화를 적용하지 않는다. 참고 구현도 전달받은 문자열을 그대로 UTF-8로 인코딩하므로
composed와 decomposed 표기가 서로 다른 identity로 남는다. source system이 둘을 같은 identifier로
정의할 때만 adapter가 `deterministicAdapterId`를 호출하기 전에 그 시스템 규칙으로 canonicalize한다.

## Layout과 boundary 좌표

외부 모델이 layout을 제공하지 않으면 position과 size를 생략한다. boundary 밖 node와 boundary의
position은 canvas 절대좌표이고, member position은 소속 boundary 좌상단 기준 상대좌표다.
membership을 바꾸면서 화면상 절대 위치를 보존하려면 다음 세 변환 중 해당 공식을 적용한다.

```text
편입(outside → boundary):
  newRelative = oldAbsolute - newBoundaryAbsolute

배출(boundary → outside):
  newAbsolute = oldRelative + oldBoundaryAbsolute

boundary 간 이동(oldBoundary → newBoundary):
  preservedAbsolute = oldRelative + oldBoundaryAbsolute
  newRelative = preservedAbsolute - newBoundaryAbsolute
              = oldRelative + oldBoundaryAbsolute - newBoundaryAbsolute
```

각 덧셈과 뺄셈은 x와 y에 독립적으로 적용한다. 예제의 새 boundary가 `(800, 120)`이고 source node의
절대 위치가 `(840, 200)`이면 편입 뒤 문서에 저장하는 member position은 `(40, 80)`이다. 기존
boundary `(800, 120)`의 상대 위치 `(40, 80)`을 배출하면 절대 위치는 다시 `(840, 200)`이 된다.
이를 새 boundary `(600, 50)`으로 옮기면 새 상대 위치는 `(240, 150)`이고 화면상 절대 위치는
`(840, 200)`으로 유지된다.

계산 결과는 FieldWeft의 safe integer·좌표 범위를 만족해야 한다. 범위를 벗어나면 clamp하지 않고
adapter 변환을 실패시킨다. boundary 자체를 멤버와 함께 이동하는 경우에는 member의 상대좌표를
바꾸지 않는다.

## Diagnostic과 지원하지 않는 개념

adapter가 의미를 확정할 수 없는 입력을 조용히 버리거나 합성하지 않는다. 최소한 source 위치와
machine-readable code를 가진 diagnostic을 반환한다.

```text
relation.self_ambiguous /jobs/17/lineage/0
source와 target이 같은 dataset입니다. process 또는 version node로 투영할 근거가 필요합니다.
```

self-relation은 synthetic node로 자동 수정하지 않는다. in-place 처리를 확실히 아는 adapter만
`entity → process → entity`로 투영하고, source version identity가 있을 때만 `entity@v1 → process →
entity@v2`처럼 분리한다. boundary endpoint, 다중 membership, vendor 전용 evidence처럼 v1이 표현하지
않는 개념도 name·description·label에 합쳐 보존하지 말고 diagnostic이나 adapter sidecar로 남긴다.

출력 문서의 세부 규칙은 [`FieldWeft v1 명세`](code-spec.md), 안전한 수정 규칙은
[`작성·수정 가이드`](fieldweft-authoring-guide.md)를 따른다.
