# FieldWeft v1 JSON 명세 해설

> **비정본 안내:** 이 문서는
> [영문 FieldWeft v1 JSON specification](../code-spec.md)의 한국어 해설이다.
> 같은 계약에 대한 설명이 다르면 영문 정본이 우선한다.

FieldWeft는 데이터 계보를 시각화한 캔버스 문서를 저장하고 교환하는 공개 JSON 포맷이다. 앱이 저장하는
문서와 외부 입력은 같은 계약을 사용한다. v1의 machine identifier는 `fieldweft`, 버전은
정수 `1`이다.

모델 출력은 설명이나 Markdown 없이 이 명세에 맞는 JSON 객체 하나여야 한다. 입력은 적용 전에
구조, ID 고유성, 참조, 방향, 좌표와 자원 제한을 모두 검증한다. 실패하면 JSON Pointer를 포함한
진단을 반환하며 기존 그래프와 입력 객체를 변경하지 않는다.

## 최상위 계약

`format`, `version`과 다섯 배열은 비어 있어도 모두 필수다. 알 수 없는 property와 `$schema`는
허용하지 않는다. canonical JSON key 순서는 아래와 같다.

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

구조 계약의 source of truth는
[`fieldweft-v1.schema.json`](../../schema/fieldweft-v1.schema.json)이다.
입력용 TypeScript 구조 타입은 이 schema에서 build-time 생성한다. schema는 required property,
원시 타입, 배열, enum, 기본 숫자·문자열 범위와 unknown property 거부를 담당한다. TypeScript
validator는 ID 고유성·예약어, 소유자와 endpoint, field leaf·방향, discriminator·when,
boundary membership, 교차 참조와 전체 자원 제한을 담당한다.

schema property는 JSON에 직렬화되는 own enumerable property일 때만 존재한다. 상속되었거나
non-enumerable인 required property는 누락으로, optional property는 부재로 취급한다. metadata가
아닌 schema 객체는 이 property 규칙을 지키면 custom prototype을 가질 수 있다. metadata map은
기존의 더 엄격한 plain object 또는 null prototype 조건을 유지한다.

구조화 입력 검증은 schema와 관련되어 실제로 소비하는 값을 own data property를 통해서만 받는다.
schema 객체의 own enumerable accessor, 소비되는 accessor 기반 배열 요소, 소비되는 범위가 sparse인
배열은 accessor를 실행하지 않고 거부한다. 이 정책은 top-level marker, schema 객체, 소비되는 배열
요소, metadata entry, `when` entry에 적용한다. 이 실패에는 `params`가 없는 `input.unstable`
diagnostic code를 사용한다. `JSON.parse`가 만든 값은 이미 이 규칙을 만족한다.

안정성 검사는 v1 검증이 소비하는 schema 경로와 collection 범위만 따라간다. schema 객체의 property
descriptor는 검사하지만 unknown property, 잘못된 container type, 자원 한도에 도달해 건너뛴 collection
요소의 값 아래는 재귀적으로 검사하지 않는다. 이런 입력은 버려지는 하위 트리를 순회하지 않고 해당
property, type, limit diagnostic을 받는다.

diagnostic 예산이 소진된 뒤에도 schema 경로나 collection entry를 더 소비하지 않는다. 따라서 건너뛴
나머지 경로의 accessor, sparse element, Proxy failure는 검사하지 않는다.

종료 전에 소비한 경로에서 불안정한 값을 만나면 누적 error를 `input.unstable` diagnostic 하나로
교체하고 다른 diagnostic은 보고하지 않는다. 불안정한 위치가 둘 이상이면 어느 위치가 diagnostic
path를 결정하는지는 규정하지 않는다.

배열은 검증이 읽는 범위 안에서 `length`와 own indexed data property로 읽는다. override된 배열
method와 iteration hook을 포함한 own non-index string property와 symbol property는 JSON 배열 표현
밖이므로 무시한다. 함수 값은 안정성 검사를 위해 재귀적으로 탐색하지 않으며, 일반 schema 검증이 그
함수를 포함한 경로에서 거부한다.

`readFieldWeftDoc`은 v1 object graph 규칙을 적용하기 전에 top-level `format`과 `version` data
property를 안전하게 검사한다. 안정적인 marker가 지원하지 않는 정수 FieldWeft version을 식별하면
나머지 문서를 v1 입력으로 검사하지 않고 지원하지 않는 version으로 보고한다. accessor 기반 marker는
실행하지 않고 계속 `input.unstable`로 거부한다.

JavaScript는 Proxy를 신뢰성 있게 감지하는 방법을 제공하지 않으므로 Proxy 기반 객체와 배열은 지원
대상인 구조화 입력 계약 밖이다. descriptor inspection이나 property read trap이 실패하면 공개 검증·
읽기 경계 밖으로 예외를 던지는 대신 `input.unstable`로 변환하지만, 예외를 던지지 않는 hostile
Proxy의 trap 실행 횟수나 diagnostic 순서는 보장하지 않는다. 호출자는 Proxy 기반 데이터를 먼저
일반 data property와 dense array로 구체화해야 한다.

사람·AI가 문서를 보존하며 고치는 방법은 [`작성·수정 가이드`](fieldweft-authoring-guide.md), 외부
모델 투영은 [`adapter 가이드`](fieldweft-adapter-guide.md), `#g=d1.…` transport는
[`공유 가이드`](fieldweft-sharing-guide.md)를 따른다.

## ID와 identity

- 모든 ID는 `^[A-Za-z0-9_-]+$`를 만족한다.
- 모든 ID는 최대 256자다.
- entity, process, boundary ID는 하나의 문서 전역 node ID 공간에서 고유하다.
- 모든 entity field와 process input/output field ID는 문서 전역에서 고유하다.
- node relation과 mapping ID는 두 배열을 합친 relation ID 공간에서 고유하다.
- `__proto__`, `prototype`, `constructor`는 node, field, relation ID로 사용할 수 없다.
- validator는 invalid ID를 자동으로 고치지 않는다.
- one-shot 시각화는 위 조건을 만족하는 임의 ID를 사용할 수 있다. revision이나 diff를 주장하는
  producer만 같은 source identity에 안정된 ID를 유지해야 한다.

결정적 ID가 필요한 adapter의 참고 알고리즘은 object kind와 source identity로 구성한
길이-prefix UTF-8 tuple을 SHA-256으로 해시하고, 앞 96비트를 16자 base64url suffix로 사용한다.
이는 JSON 유효성 조건이 아니다. object kind는 `entity`, `process`, `boundary`, `field`,
`nodeRelation`, `mapping` 같은 객체 분류이며 표시용 `kind`와 구분한다. 저장소 참고 helper는 ASCII
object kind를 239자로 제한해 구분자와 16자 suffix를 더한 전체 ID가 256자 제한 안에 들게 한다.

기존 문서를 수정할 때 rename·reorder·move된 field와 변경되지 않은 node, field, boundary,
relation의 ID를 보존한다. 변경하지 않은 layout과 실제 source 순서가 바뀌지 않은 배열 순서도
보존한다. 새 field와 clone된 field subtree에는 새 ID를 발급하고 `when`, `collapsed`, mapping
endpoint를 같은 remap으로 갱신한다.

mapping identity는 안정된 native ID를 우선하며 없으면 안정된 source/target identity로 만든다.
표시·속성 값인 `kind`와 `label`은 identity 입력에서 제외한다. 따라서 같은 mapping ID에서
`keep`이 `transform`으로 바뀌거나 label이 바뀌는 것은 remove/add가 아니라 property update다.
node relation의 `label`도 identity 입력에서 제외한다.

## 공통 annotation과 metadata

entity, process, boundary, 모든 entity/process field, node relation, mapping은 다음 선택 property를
직접 가질 수 있다.

```jsonc
{
  "description": "결제 도메인의 주문 dataset",
  "tags": ["critical", "pii"],
  "meta": {
    "owner": "payments",
    "retentionDays": 365,
    "reviewed": true,
    "sourceVersion": null
  }
}
```

이는 개념적인 flat mixin이다. `annotations: { ... }` wrapper는 없으며 unknown property로 거부한다.
entity·process·boundary·field의 표시 이름은 필수 `name`, node relation·mapping의 짧은 표시는 선택
`label`을 계속 사용한다.

- `description`은 최대 4,096 Unicode code point의 plain text다. 빈 문자열은 canonical 문서에서
  생략하며 공백이나 문장 내용은 정규화하지 않는다.
- `tags`는 object마다 최대 32개인 exact-string 집합이다. 각 tag는 1..64 Unicode code point이고
  중복을 금지한다. 대소문자와 Unicode normalization을 자동 통합하지 않는다. canonicalizer는
  JavaScript 기본 문자열 비교와 같은 UTF-16 code-unit ordinal 순서로 정렬하고 빈 배열을 생략한다.
- `meta`는 object마다 최대 32개 key를 갖는 얕은 scalar map이다. value는
  `string | number | boolean | null`만 허용하며 object·array는 거부한다. key는 1..128 code point,
  string value는 최대 4,096 code point다. 빈 object는 생략하지만 null-valued key는 보존한다.
- meta number는 유한한 IEEE-754 double이어야 한다. `NaN`과 ±`Infinity`는 거부하고 `-0`은
  canonicalization에서 `0`으로 만든다. 정밀 decimal, 큰 정수 ID와 앞자리 0이 의미 있는 값은
  문자열로 작성한다.
- `__proto__`, `prototype`, `constructor` meta key는 금지하고 `fieldweft.` prefix는 향후 공식
  metadata를 위해 예약한다. 외부 producer는 `com.example.*` 같은 안정된 namespace를 권장한다.
- meta key 순서는 의미가 없다. canonical JSON은 key를 UTF-16 ordinal로 출력하며 key 부재와
  명시적 `null`은 서로 다른 의미다.

annotation은 semantic 정보다. 소유 팀, 안정된 source ID, 보안 분류처럼 source 의미가 바뀔 때만
달라지는 값을 넣는다. `syncedAt`, request/trace/job ID, 실행 시간, retry 수 같은 실행별 provenance는
문서 밖 adapter sidecar·실행 envelope·log에 둔다. 임의의 meta key가 renderer·trace·impact·layout
동작을 바꾸지 않으며, 제품 동작에 필요한 값은 이후 정식 schema property로 승격한다.

## Entity, process와 field

entity와 process의 `kind`는 `event | api | db | other`다. 이 enum에 없는 `etc` 같은 값은
자동 변환하지 않고 거부한다.

entity에는 `id`, 비어 있지 않은 `name`, `kind`, `fields`가 필수다. 공통 annotation,
`position`과 object field ID의 집합인 `collapsed`는 선택이다. 같은 부모 아래 sibling field name은
고유해야 한다.

process에는 `id`, `name`, `kind`, `inputs`, `outputs`가 필수다. process field는 flat leaf만
허용하며 `children`, `discriminator`, `when`을 사용할 수 없다.

field에는 `id`, `name`, `type`이 필수고 공통 annotation을 선택적으로 가진다. type은
`uuid | string | number | boolean | timestamp | object | json`이다. `array`, `nullable`, `pk`의
기본값은 false이며 canonical 문서에서는 false를 생략한다. `children`은 object field에만
허용한다. entity의 string field는 `{ "values": string[] }` 형태의 `discriminator`를 가질 수
있고, 다른 field의 `when`은 같은 entity에 속한 discriminator field ID를 key로 참조한다.
여러 key 사이는 AND, 한 value 배열 안은 OR다.

## Boundary와 layout

boundary에는 `id`와 `name`이 필수다. `color`는
`blue | green | purple | rose | slate`, `kind`는
`domain | system | external | security | other`다. 공통 annotation, `members`, `position`, `size`는
선택 입력이다.

v1의 `members`에는 entity/process ID만 허용한다. boundary ID, 같은 boundary 안의 중복 member,
둘 이상의 boundary에 속하는 다중 membership을 거부한다.

- boundary 밖 entity/process position은 canvas 절대좌표다.
- boundary position은 canvas 절대좌표다.
- member position은 직접 소속 boundary 좌상단 기준 상대좌표다.
- boundary size는 양의 width/height다.
- membership을 바꾸는 편집은 화면상 절대 위치를 유지하도록 좌표 프레임도 함께 변환한다.

명시한 유효 좌표와 크기는 canonicalizer가 clamp하지 않는다. layout이 없는 대상만 다음의
결정적 기본값을 채운다: entity `i`는 `(0, i * 120)`, process `i`는
`(340, 120 + i * 160)`, boundary `i`는 `(60 + i * 40, 60 + i * 40)`, boundary size는
`380 × 240`이다.

## Node relation과 mapping

node relation 구조는 다음과 같다.

```ts
type FieldWeftNodeRelationV1 = {
  id: string
  sourceNodeId: string
  targetNodeId: string
  label?: string
  description?: string
  tags?: string[]
  meta?: Record<string, string | number | boolean | null>
}
```

endpoint는 entity/process ID만 허용한다. boundary, 없는 node와 같은 source/target의 self
relation은 거부한다. 배열 순서와 선택적 label·공통 annotation은 canonical round-trip에서 보존한다.

mapping은 source leaf field에서 target leaf field로 향한다. `id`, `sourceFieldId`,
`targetFieldId`가 필수이고 `kind`는 `keep | transform`, `label`과 공통 annotation은 선택이다.
source는 entity field 또는 process output, target은 entity field 또는 process input이어야 한다.
object field, process input source, process output target과 dangling field 참조를 거부한다.

Viewer runtime에서도 mapping과 node relation은 명시적 discriminator로 구분한다. field mapping을
node pair로 접은 roll-up은 탐색·표시를 위한 파생 값일 뿐 `nodeRelations`로 쓰지 않는다. 명시적
node relation과 같은 node pair의 mapping-derived roll-up은 함께 존재할 수 있고, 선 패턴과 텍스트로
출처를 구분한다.

field trace는 `mappings`만 통과하며 node relation을 이유로 같은 이름의 field나 node의 모든 field를
연결하지 않는다. node upstream/downstream trace와 impact는 명시적 `nodeRelations`와 mapping endpoint
owner에서 계산한 roll-up을 함께 사용하며 결과에 `explicit`과 `derived-from-mapping` 출처를 보존한다.
cycle과 duplicate relation은 visited node/pair 집합으로 종료한다.

```json
{
  "format": "fieldweft",
  "version": 1,
  "entities": [
    {
      "id": "order",
      "name": "Order",
      "kind": "event",
      "position": { "x": 40, "y": 80 },
      "fields": [
        { "id": "order_id", "name": "orderId", "type": "string", "pk": true }
      ]
    },
    {
      "id": "result",
      "name": "Result",
      "kind": "other",
      "position": { "x": 680, "y": 80 },
      "fields": [
        { "id": "result_id", "name": "orderId", "type": "string" }
      ]
    }
  ],
  "processes": [
    {
      "id": "normalize",
      "name": "Normalize",
      "kind": "api",
      "position": { "x": 360, "y": 80 },
      "inputs": [
        { "id": "normalize_in", "name": "input", "type": "string" }
      ],
      "outputs": [
        { "id": "normalize_out", "name": "output", "type": "string" }
      ]
    }
  ],
  "boundaries": [
    {
      "id": "core",
      "name": "Core",
      "color": "blue",
      "kind": "domain",
      "position": { "x": 300, "y": 40 },
      "size": { "width": 300, "height": 240 },
      "members": ["normalize"]
    }
  ],
  "nodeRelations": [
    {
      "id": "order_calls_normalize",
      "sourceNodeId": "order",
      "targetNodeId": "normalize",
      "label": "calls"
    }
  ],
  "mappings": [
    {
      "id": "map_input",
      "sourceFieldId": "order_id",
      "targetFieldId": "normalize_in"
    },
    {
      "id": "map_output",
      "sourceFieldId": "normalize_out",
      "targetFieldId": "result_id",
      "kind": "transform",
      "label": "normalized"
    }
  ]
}
```

## Canonicalization과 projection

검증 성공은 입력 reference를 그대로 반환하고 canonicalization은 새 문서를 만든다. canonical
문서에는 모든 entity/process/boundary position과 모든 boundary size가 있다. 빈 optional 값과
false는 생략한다. `tags`, `meta` key, `when` key/value, `collapsed`, boundary `members`처럼 set
또는 map 의미인 collection만 결정적 순서로 정리한다. 그 순서는 locale이 아니라 UTF-16 code-unit
ordinal 순서다. discriminator values는 표시 순서이므로 작성 순서를 보존한다. entity, process,
boundary, node relation, mapping과 sibling field 배열의 사용자 순서도 정렬하지 않는다.

`readCanonicalFieldWeftDoc`은 `ok`를 반환하기 전에 구체화한 canonical 문서를 다시 검증한다. 따라서
모든 성공 결과는 구조·참조·전체 자원·canonical byte 제한을 포함해
`validateFieldWeftDocV1(result.doc).ok === true`를 만족한다. 이 canonical 이후 검사는 defense in
depth이며, 일반 구조화 입력을 검증과 canonicalization에서 서로 다르게 관찰하지 않게 하는 주된
정책은 위 accessor 거부다.

canonical JSON byte가 필요한 export·코드 편집기·백업 embedded document는 FieldWeft 전용
serializer를 사용한다. serializer는 schema property를 위 계약의 고정 순서로 쓰고, 사용자 key map인
`meta`와 `when`만 UTF-16 ordinal로 정렬한다. JavaScript object의 삽입 순서와 integer-like key
재배열에 영향을 받는 일반 `JSON.stringify(canonicalDoc)`를 canonical byte 계약으로 사용하지 않는다.
pretty 출력은 whitespace만 다르고 property와 배열 순서는 compact 출력과 같다.

`FieldWeftSemanticProjectionV1`은 entity, process, field, boundary 의미 정보, membership,
node relation과 mapping 및 모든 대상의 공통 annotation을 포함한다.
`FieldWeftLayoutProjectionV1`은 position, size, collapsed와 boundary color만 포함한다.
position, size, collapsed, boundary color만 바뀌어서는 semantic revision이 생기지 않으며
annotation 변경은 layout revision으로 분류하지 않는다.

semantic structural diff는 relation ID를 identity로 사용한다. node relation은 add/remove,
`sourceNodeId`·`targetNodeId`·`label` property update와 배열 reorder를 보고한다. mapping은 같은 ID의
`sourceFieldId`·`targetFieldId`·`kind`·`label` 변경을 property update로 보고하며 `kind`나 `label`
변경을 remove/add로 바꾸지 않는다. 모든 대상의 `description`은 property update, `tags`는 exact
string의 add/remove, `meta`는 key 단위 add/remove/update로 보고한다. map 비교에
`JSON.stringify`의 property insertion order를 사용하지 않는다. mapping-derived node roll-up은
projection과 diff에 포함하지 않는다.

FieldWeft는 자신이 표현한 canonical 시각화 문서를 document → graph → document로 복원한다.
vendor payload, 원본 SQL·소스 코드, 실제 데이터 값이나 원본 lineage 저장소의 완전한 역복원은
보장하지 않는다. 조직 전체를 한 문서에 넣기보다 검토·전달 목적에 필요한 부분 그래프 export를
권장한다.

## 자원 제한

- entity + process + boundary: 최대 5,000
- 모든 field: 최대 100,000
- field tree 깊이: 최대 64
- `nodeRelations.length + mappings.length`: 최대 20,000
- node·field·relation ID와 모든 ID 참조: 최대 256자
- entity·process·boundary·field `name`: 최대 256자
- node relation·mapping `label`: 최대 512자
- 모든 annotation 대상의 `description`: 최대 4,096자
- object별 `tags`: 최대 32개, tag당 1..64자, exact duplicate 금지
- object별 `meta`: 최대 32개, key당 1..128자, string value당 최대 4,096자
- 문서 전체 tag 수: 최대 100,000
- 문서 전체 meta entry 수: 최대 100,000
- 문서 전체 `description`·tag·meta key·meta string value 합계: 최대 4,000,000자
- discriminator와 `when`의 각 문자열 값: 최대 256자
- `discriminator.values`와 각 `when` 값 배열: 배열마다 최대 256개
- position: `-10,000,000..10,000,000` 범위의 safe integer
- boundary width/height: `1..10,000,000` 범위의 safe integer
- raw JSON source: UTF-8 최대 16 × 1024 × 1024 bytes
- canonical FieldWeft document: compact UTF-8 최대 8 × 1024 × 1024 bytes
- 한 번의 validation이 반환하는 top-level diagnostic: 최대 1,000개

문자열 길이는 UTF-16 code unit이나 UTF-8 byte가 아니라 Unicode code point 수로 센다. 입력 한도를 넘는
입력은 잘라서 받아들이지 않는다. raw source byte gate는 JSON parse 전에, object·string·aggregate
검사는 parse 뒤에, canonical byte gate는 기본 layout과 정렬·생략을 적용한 뒤에 실행한다. URL
공유 codec은 별도의 더 작은 transport 한도를 추가로 적용한다.

`FIELD_WEFT_MAX_DIAGNOSTICS_V1`은 1,000이다. validation이 1,000번째 일반 diagnostic을 내려고 하면
마지막 slot에는 그 diagnostic 대신 `diagnostics.truncated` marker를 낸다. 일반 diagnostic이 999개
이하면 모두 반환하고, 원인이 1,000개 이상이면 일반 diagnostic 999개 뒤에 marker를 붙여 반환한다.
marker는 `error` severity, 빈 JSON Pointer `path`, `{ "limit": 1000 }` params를 가진다. 메시지는
`Additional diagnostics were omitted after reaching the limit.`이다. marker는 생략된 수를 정확히
보고하지 않는다. diagnostic의 `related` location은 소유 diagnostic에 붙어 있으며 별도 slot을
소비하지 않는다.

이 marker는 전체 입력이 여전히 거부되고 원인 목록만 잘렸다는 뜻이며 입력을 고치거나 받아들이는
규칙이 아니다. marker를 낸 뒤에는 invalid 결과를 바꿀 수 없는 나머지 순회와 deferred check를
중단한다.

## v1 지원 범위와 v2 boundary 확장 경로

v1 reader는 이 명세를 만족하는 `format: "fieldweft"`, `version: 1` 문서만 읽는다. marker가
없거나 다른 format·version·enum을 사용한 입력을 위한 dual reader, 자동 migration 또는 repair는
제공하지 않는다.

이 명세의 호환성 보장은 안정판 패키지 버전 `1.0.0`부터 시작한다. 그 전에는 이 명세와 함께 관리되는
schema, 생성 타입, validator 의미, canonical byte, diagnostics, `d1` transport, 테스트와 fixture가
하위 호환 없이 변경될 수 있다.

`1.0.0`부터 안정된 v1 지원을 표방하는 reader는 안정된 v1 property 의미·필수 여부·enum·참조 규칙과
공개 자원 한도를 만족하는 모든 문서를 읽어야 한다. FieldWeft 공식 웹 Viewer와 validator는
`1.0.0`부터 안정판 v2 reader 공개 후 최소 12개월까지 안정된 v1 읽기를 지원한다. 지원 종료가
결정되면 종료일 최소 90일 전에 공식 release note와 이 명세에 공지한다. 안정판 v2 reader가 공개되지
않은 동안에는 안정된 v1 지원 종료일을 정하지 않는다.

npm 패키지 버전은 이 포맷 버전과 독립적이다. `1.0.0`이 안정된 v1 기준선을 확정한 뒤에는 패키지
major release 자체만으로 안정된 v1 지원을 표방하는 reader가 안정된 v1 명세를 만족하는 문서를
거부할 근거가 되지 않는다.

정식 package release에서 diagnostic `code` 또는 `params` key 추가에는 minor release, 사람이 읽는
diagnostic 메시지 문구만 바꾸는 경우에는 patch release가 필요하다. diagnostic `code` 또는
`params` key를 제거·rename하거나 의미를 바꾸는 경우에는 major release가 필요하다. 소비자는 알 수
없는 diagnostic `code`를 허용하고 `severity`, `path`, `message`를 사용해 일반 진단으로 처리해야
한다. 소비자는 알 수 없는 diagnostic `params` key를 무시해야 한다.

공개 지원 범위에는 공개 `d1` decoder도 포함한다. IndexedDB record와 backup envelope의 byte 표현,
URL host·domain, diagnostic 문구, 자동 layout 결과와 일시 UI 상태는 FieldWeft 문서 계약에 포함되지
않는다. 보안 취약점이나 명백한 spec 결함 때문에 계약을 만족하는 입력을 거부해야 한다면 영향 범위를
최소화하고 변경 내역을 남긴다. 이 예외를 일반 문자열·개수 제한을 공지 없이 낮추는 근거로 사용하지
않는다.

v2에서 중첩 boundary를 도입한다면 `members`가 boundary ID도 참조할 수 있다. 계층은 각
boundary가 최대 한 부모만 갖는 forest이며 self membership과 cycle을 금지하고 최대 깊이는 8로
제한한다. root boundary는 canvas 절대좌표, 자식 boundary와 node는 직접 부모 기준 상대좌표를
사용한다. semantic membership은 직접 부모 관계를 보존하고 다중 membership은 허용하지 않는다.
이 확장 기록은 v1 reader가 boundary member를 받아들이거나 중첩 렌더링을 구현한다는 뜻이 아니다.
