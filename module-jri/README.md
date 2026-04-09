# module-jri : PS 커버리지 검사 시스템 (점보롤 지분 검사)

## 시스템 개요

**설명**: 이미지 기반 자동 지분(결점) 검출 → DB 저장 → MES 전송 모듈

### 핵심 기능 (10개)

| # | 기능 | 설명 |
|---|------|------|
| 1 | 이미지 업로드 & 자동 검출 | 카메라/갤러리 → 그레이스케일 → 임계값 이진화(슬라이더) → Connected Component. max 3200px, 900MB 제한 |
| 2 | 수동 보정 | 캔버스 클릭 지분 추가/삭제, 전체 수동 객체 일괄 삭제 |
| 3 | 결과 분석 | 총 지분 수, 커버리지 %·ppm, 밀도·크기·사분면·평균 면적·STD 등 품질 메트릭 |
| 4 | 결과 저장 (Upsert) | JSON/Multipart(JPEG). 동일 `MATNR+LOT+IND_BCD` → UPDATE(차수+1), 신규 → INSERT(차수 1). 재검사 확인 팝업 |
| 5 | 이력 조회 | 카드형·테이블형, 20건 페이지네이션, 바코드/LOT/자재코드 검색, 기간 필터 |
| 6 | Excel 내보내기 | 전체 이력 `.xlsx` 다운로드 (SheetJS) |
| 7 | MES 연동 | DB 저장 후 자동 전송. payload: `IND_BCD` + `ResultData`(coverage ppm). 성공/실패 로그 |
| 8 | 시크릿 모드 | 로고 5회 클릭(1.5s 이내) → 전체 삭제·디버그 노출, 저장·MES 차단. 재클릭 비활성화 |
| 9 | 이미지 파일 관리 | 저장 `/data/upload/ps_cov_ins/{original\|result}/{YYYY.MM}/`, URL `/uploads/...`, 월별 폴더 자동 생성 |
| 10 | URL 파라미터 | `?indBcd=`, `?lotnr=`, `?matnr=` → 필드 자동 입력, `?tab=history\|table` → 탭 자동 선택 |

---

## 모듈 정보

| 항목 | 값 |
|------|-----|
| 모듈명 | `module-jri` |
| 패키지 | `com.company.module.jri` |
| API Prefix | `/jri-api/**` |
| DB 테이블명 | `jri_inspection` (lower_snake_case) |
| DB 컬럼명 | `UPPER_SNAKE_CASE` |
| PK | `INSPECTION_ID` (BIGINT, AUTO_INCREMENT) |
| Unique Key | `(MATNR, LOTNR, IND_BCD)` |
| 프론트엔드 정적 리소스 | `/jri-static/**` |
| 프론트엔드 페이지 | `/jri-api/page` |
| Bean 접두사 | `Jri*`, `jri*` |

---

## 1. company-platform 통합 방법 (3줄 변경)

### 1-1. settings.gradle 수정

```groovy
include 'module-jri'
```

### 1-2. app/build.gradle 수정

```groovy
implementation project(':module-jri')
```

### 1-3. SQL 스크립트 실행

```bash
mysql -u {user} -p {database} < module-jri/sql/module-jri/01_schema.sql
# (선택) 초기 샘플 데이터
mysql -u {user} -p {database} < module-jri/sql/module-jri/02_seed_data.sql
```

> **Core 모듈 소스 수정 불필요** — `@SpringBootApplication(scanBasePackages = "com.company")` 설정으로 자동 스캔

### JPA Entity Scan 범위 확인

core에 `@EntityScan` 또는 `@EnableJpaRepositories`가 명시적으로 있다면:

```java
@EntityScan("com.company")
@EnableJpaRepositories("com.company")
```

---

## 2. 프로젝트 구조 규칙

### 2-1. 멀티 모듈 Gradle 구조

```
company-platform/               (루트)
├── settings.gradle              # include 'core', 'module-jri', ...
├── core/                        # 공통 모듈 (ApiResponse, 예외, Security 등)
├── app/                         # 메인 Spring Boot 애플리케이션
│   └── build.gradle             # implementation project(':core'), project(':module-jri')
└── module-jri/                  # ← 이 모듈
    ├── build.gradle
    ├── src/main/java/...
    └── sql/module-jri/          # DB 스크립트 (모듈 내부에 위치)
```

### 2-2. 모듈 간 참조 규칙 (직접 참조 금지)

| 규칙 | 설명 |
|------|------|
| **`compileOnly project(':core')`** | core의 공통 클래스(`ApiResponse`, `EntityNotFoundException`)만 컴파일 시 참조. 런타임에는 app이 core를 `implementation`으로 제공 |
| **모듈 → 모듈 직접 참조 금지** | `module-jri`가 `module-xxx`를 직접 의존하면 안 됨. 모듈 간 통신이 필요하면 **이벤트** 또는 **REST API**로 통신 |
| **core → 모듈 참조 금지** | core는 어떤 비즈니스 모듈도 참조하지 않음 (역방향 의존 금지) |
| **순환 의존 방지** | `compileOnly`를 사용하여 Gradle 의존 그래프에 순환이 생기지 않도록 보장 |

```groovy
// module-jri/build.gradle — 올바른 의존성 선언
dependencies {
    compileOnly project(':core')          // ✅ 컴파일 전용
    // implementation project(':core')    // ❌ 금지: 순환 의존 위험
    // implementation project(':module-xxx')  // ❌ 금지: 모듈 간 직접 참조
}
```

### 2-3. module-jri 빌드 설정

- Spring Boot 플러그인 **미적용** — plain JAR만 생성 (`jar { enabled = true }`)
- app 모듈이 `spring-boot-gradle-plugin`을 적용하여 실행 가능한 fat JAR 생성
- 의존성: `spring-boot-starter-web`, `data-jpa`, `security`, `validation`, `thymeleaf`, Jackson, Lombok

---

## 3. SQL 스크립트 규칙

### 3-1. 파일 위치 및 명명

```
module-jri/
└── sql/module-jri/              # 모듈 내부의 sql/ 디렉토리
    ├── 01_schema.sql            # DDL (테이블 + 인덱스)
    ├── 02_seed_data.sql         # 초기 데이터 (선택)
    └── README.md                # 실행 가이드
```

> **주의**: SQL 스크립트는 `module-jri/src/main/resources/db/migration/`에 두지 않습니다.
> `ddl-auto=none` 환경에서 DBA가 직접 실행하는 방식이므로 모듈 내부 `sql/module-{모듈명}/`에 배치합니다.

### 3-2. DDL 명명 규칙

| 항목 | 규칙 | 예시 |
|------|------|------|
| 테이블명 | `lower_snake_case` | `jri_inspection` |
| 컬럼명 | `UPPER_SNAKE_CASE` | `INSPECTION_ID`, `IND_BCD`, `COVERAGE_RATIO` |
| PK 제약조건 | `UPPER_SNAKE_CASE` | `PRIMARY KEY (INSPECTION_ID)` |
| Unique Key | `UK_` 접두사 | `UK_JRI_MATNR_LOTNR_INDBCD` |
| 인덱스 | `IDX_` 접두사 | `IDX_JRI_IND_BCD`, `IDX_JRI_MSRM_DATE` |
| 엔진 | `InnoDB` | `ENGINE=InnoDB` |
| 문자셋 | `utf8mb4` | `DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci` |
| 컬럼 코멘트 | **필수** | `COMMENT '검사 결과 PK (자동 증가)'` |

### 3-3. 인덱스 목록

| 인덱스 | 컬럼 | 용도 |
|--------|------|------|
| `IDX_JRI_IND_BCD` | `IND_BCD` | 바코드 검색 |
| `IDX_JRI_LOTNR` | `LOTNR` | LOT 번호 검색 |
| `IDX_JRI_MATNR` | `MATNR` | 자재코드 검색 |
| `IDX_JRI_WERKS` | `WERKS` | 플랜트 검색 |
| `IDX_JRI_MSRM_DATE` | `MSRM_DATE DESC` | 측정일 정렬 |
| `IDX_JRI_INSPECTED_AT` | `INSPECTED_AT DESC` | 검사일 정렬 |
| `IDX_JRI_OPERATOR_ID` | `OPERATOR_ID` | 검사자 검색 |
| `IDX_JRI_STATUS` | `STATUS` | 상태 필터 |

---

## 4. API 통신 규칙

### 4-1. 응답 래핑 — ApiResponse\<T\>

모든 API 응답은 core의 `ApiResponse<T>`로 감싸서 반환합니다.

```json
// 성공
{
  "success": true,
  "data": { ... },
  "message": null,
  "timestamp": "2026-04-08T14:30:25"
}

// 실패 (400/404/500)
{
  "success": false,
  "data": null,
  "message": "검사 결과를 찾을 수 없습니다. ID: 999",
  "timestamp": "2026-04-08T14:30:25"
}
```

**프론트엔드 데이터 접근**: `res.data.data` (axios 응답의 `data` → ApiResponse의 `data`)

```javascript
// 프론트엔드 (app.js)
const res = await axios.get(`${API_BASE}`);
const inspections = res.data.data;           // ApiResponse.data 필드
const totalElements = res.data.data.totalElements;  // Page 객체의 totalElements
```

### 4-2. API 엔드포인트

| Method | URL | 권한 | 설명 |
|--------|-----|------|------|
| GET | `/jri-api/health` | 공개 | 모듈 헬스 체크 |
| GET | `/jri-api/page` | 인증 | 프론트엔드 메인 페이지 (Thymeleaf) |
| POST | `/jri-api/inspections` (JSON) | **ADMIN** | 검사 결과 저장 |
| POST | `/jri-api/inspections` (Multipart) | **ADMIN** | 검사 결과 저장 (이미지 바이너리 포함) |
| GET | `/jri-api/inspections?page=0&size=20` | 인증 | 검사 목록 (페이징, 날짜·바코드 필터) |
| GET | `/jri-api/inspections/{id}` | 인증 | 검사 단건 조회 |
| GET | `/jri-api/inspections/search?type=indBcd&keyword=xxx` | 인증 | 바코드/LOT/자재코드 검색 |
| GET | `/jri-api/inspections/check-exists?matnr=&lotnr=&indBcd=` | 인증 | Upsert 사전 체크 |
| DELETE | `/jri-api/inspections/{id}` | **ADMIN** | 단건 삭제 |
| DELETE | `/jri-api/inspections` | **ADMIN** | 전체 삭제 |
| POST | `/jri-api/mes/send-result` | 인증 | MES 결과 전송 |

### 4-3. 권한 제어

- **쓰기 API** (POST, DELETE): `@PreAuthorize("hasRole('ADMIN')")` — ADMIN 역할 필수
- **읽기 API** (GET): 인증된 사용자만 접근 가능
- **Health Check**: 인증 없이 접근 허용

### 4-4. MES 연동 흐름

```
[프론트엔드] → POST /jri-api/inspections (저장)
           → (성공 시) POST /jri-api/mes/send-result
                         { "IND_BCD": "26228J0039", "ResultData": 265.30 }
           → (응답)     { "success": true, "data": {
                           "success": true,
                           "message": "MES 전송 완료 ...",
                           "transmissionId": "uuid",
                           "timestamp": "2026-04-08T..."
                         }}
```

- `jri.mes.endpoint-url` 미설정 시 **Mock 모드** (항상 성공 반환)
- 설정 시 `RestTemplate`으로 외부 MES 서버에 POST

---

## 5. Java 코드 규칙

### 5-1. Entity

- 테이블명: `lower_snake_case` → `@Table(name = "jri_inspection")`
- 컬럼명: `UPPER_SNAKE_CASE` → `@Column(name = "INSPECTION_ID")`
- Lombok: `@Getter`, `@NoArgsConstructor(access = AccessLevel.PROTECTED)`, `@Builder`
- `@PrePersist` → `createdAt` 자동 설정, `inspectedAt`·`msrmDate` null이면 현재 시각
- **Setter 없음** — 비즈니스 메서드로 갱신
  - `updateInspectionData(...)` — 검사 수치 전체 업데이트
  - `updateOriginalImage(path, name, dir)` — 원본 이미지 경로 갱신
  - `updateResultImage(path, name, dir)` — 결과 이미지 경로 갱신
  - `updateMatnrNm(matnrNm)` — 자재명 갱신
  - `incrementIndBcdSeq()` — 차수(재검사 횟수) 증가

### 5-2. Controller

- URL: `/jri-api/inspections` (REST), `/jri-api/page` (페이지), `/jri-api/health` (헬스), `/jri-api/mes` (MES)
- 응답: 모든 API → `ResponseEntity<ApiResponse<T>>` 래핑
- 쓰기 API: `@PreAuthorize("hasRole('ADMIN')")`
- 읽기 API: 인증만 필요 (별도 역할 검사 없음)
- 페이징: `Page<JriInspectionResponse>` (기본 20건, 최대 100건)

### 5-3. Service

- `@Service @RequiredArgsConstructor`
- 클래스 레벨: `@Transactional(readOnly = true)` — 기본 읽기 전용
- 쓰기 메서드만: `@Transactional` — `saveInspection()`, `deleteInspection()`, `deleteAllInspections()`
- core 예외 사용: `EntityNotFoundException` → core 모듈의 공통 예외 핸들러에서 처리

### 5-4. DTO

- **Request** (`JriInspectionSaveRequest`): Bean Validation (`@Size`, `@Min`, `@Max`, `@NotBlank`)
- **Response** (`JriInspectionResponse`): `static from(JriInspection entity)` 팩토리 메서드
- **MES Request** (`JriMesSendRequest`): `@NotBlank`, `@NotNull`, `@JsonProperty("IND_BCD")`, `@JsonProperty("ResultData")`
- **MES Response** (`JriMesSendResponse`): `static success(...)`, `static fail(...)` 팩토리 메서드

### 5-5. Repository

- `extends JpaRepository<JriInspection, Long>`
- JPQL 쿼리 사용 (`@Query`): LIKE 검색, 기간 조회, 복합 검색
- Derived Query: `findAllByOrderByInspectedAtDesc`, `findByMatnrAndLotnrAndIndBcd`
- Native Query 없음 (모두 JPQL)

---

## 6. 디렉토리 구조

```
module-jri/
├── build.gradle                                         # 모듈 빌드 설정
├── README.md                                            # 이 문서
├── src/main/
│   ├── java/com/company/module/jri/
│   │   ├── config/
│   │   │   └── JriWebConfig.java                       # CORS, 이미지 리소스, ObjectMapper, RestTemplate
│   │   ├── controller/
│   │   │   ├── JriInspectionApiController.java         # REST API (/jri-api/inspections)
│   │   │   ├── JriHealthController.java                # Health Check (/jri-api/health)
│   │   │   ├── JriMesController.java                   # MES 전송 (/jri-api/mes)
│   │   │   └── JriPageController.java                  # 페이지 라우팅 (/jri-api/page)
│   │   ├── dto/
│   │   │   ├── JriInspectionSaveRequest.java           # 저장 요청 DTO (@Size, @Min, @Max)
│   │   │   ├── JriInspectionResponse.java              # 응답 DTO (static from(Entity))
│   │   │   ├── JriMesSendRequest.java                  # MES 전송 요청 DTO (@JsonProperty)
│   │   │   └── JriMesSendResponse.java                 # MES 전송 응답 DTO (static success/fail)
│   │   ├── entity/
│   │   │   └── JriInspection.java                      # JPA 엔티티 (@PrePersist, 비즈니스 메서드, Setter 없음)
│   │   ├── repository/
│   │   │   └── JriInspectionRepository.java            # JPA Repository (JPQL 쿼리)
│   │   └── service/
│   │       ├── JriInspectionService.java               # 검사 비즈니스 로직 (@Transactional)
│   │       └── JriMesService.java                      # MES 전송 서비스 (mock/실제 전환)
│   └── resources/
│       ├── application-jri.yml                          # 모듈 설정 참조 (core에 병합)
│       ├── static/jri/
│       │   ├── css/style.css                            # 스타일시트
│       │   └── js/app.js                                # 프론트엔드 로직 (ApiResponse unwrap)
│       └── templates/jri/
│           └── index.html                               # Thymeleaf 메인 페이지
│
└── sql/module-jri/                                      # ★ 모듈 내부 SQL 스크립트
    ├── 01_schema.sql                                    # DDL + 인덱스 (필수)
    ├── 02_seed_data.sql                                 # 초기 샘플 데이터 (선택)
    └── README.md                                        # SQL 실행 가이드
```

---

## 7. 설계 원칙 (Core 충돌 방지 & 모듈 격리)

| 항목 | 적용 내용 | 충돌 방지 |
|------|-----------|-----------|
| 패키지 | `com.company.module.jri` | 독립 네임스페이스 |
| Gradle 의존성 | `compileOnly project(':core')` | 런타임 의존 X, 순환 방지 |
| 모듈 → 모듈 참조 | **금지** | 이벤트 또는 REST로 통신 |
| core → 모듈 참조 | **금지** | 역방향 의존 없음 |
| API Prefix | `/jri-api/**` | 다른 모듈과 URL 분리 |
| DB 테이블 | `jri_inspection` | 모듈별 접두사로 충돌 방지 |
| Bean 이름 | `jriObjectMapper`, `jriRestTemplate` | `@Qualifier` / `@Bean("name")` 사용 |
| 정적 리소스 | `/jri-static/**` | 경로 분리 |
| Thymeleaf | `templates/jri/index.html` | 서브 디렉토리 |
| 예외 처리 | Core 통합 사용 (`EntityNotFoundException`) | 모듈 전용 ExceptionHandler 없음 |
| Spring Security | Core에서 제공 | Core 수정 없음 |

---

## 8. 이미지 파일 관리

### 저장 경로

```
/data/upload/ps_cov_ins/
├── original/
│   └── 2026.04/
│       └── original_F2A11220-04600845A_26228J0039_260408_143025_12345678.jpg
└── result/
    └── 2026.04/
        └── result_F2A11220-04600845A_26228J0039_260408_143025_12345678.jpg
```

### 파일명 규칙

```
{prefix}_{MATNR}_{IND_BCD}_{YYMMDD_HHMMSS}_{idSuffix}.{ext}
```

| 토큰 | 설명 | 예시 |
|------|------|------|
| `prefix` | `original` 또는 `result` | `original` |
| `MATNR` | 자재코드 (특수문자 → `_` 치환) | `F2A11220-04600845A` |
| `IND_BCD` | 개별바코드 (특수문자 → `_` 치환) | `26228J0039` |
| `YYMMDD_HHMMSS` | 타임스탬프 | `260408_143025` |
| `idSuffix` | inspectionId (최대 8자리) | `12345678` |
| `ext` | 확장자 (기본 `jpg`) | `jpg` |

### URL 매핑

```
/uploads/{category}/{YYYY.MM}/{filename}
→ /uploads/original/2026.04/original_F2A11220-04600845A_26228J0039_260408_143025_12345678.jpg
```

- `JriWebConfig`에서 `/uploads/**` → `file:/data/upload/ps_cov_ins/` 리소스 핸들러 등록
- 운영 환경에서는 Nginx `alias` 사용 (아래 참조)

---

## 9. Spring Security 연동

Core의 Spring Security 설정에서 `/jri-api/**` 경로 접근 허용이 필요한 경우:

```java
http.authorizeHttpRequests(auth -> auth
    .requestMatchers("/jri-api/health").permitAll()
    .requestMatchers("/jri-api/**").authenticated()
);
```

---

## 10. 설정 파일 (application-jri.yml)

`module-jri/src/main/resources/application-jri.yml`은 **참조 문서**입니다.
실제 설정은 core의 `application.yml`에 병합하세요.

```yaml
# core application.yml에 추가
jri:
  upload:
    dir: /data/upload/ps_cov_ins   # 이미지 저장 경로
  mes:
    endpoint-url:                   # MES URL (비어있으면 mock 모드)

# (선택) 디버그 로깅
logging:
  level:
    com.company.module.jri: DEBUG
```

---

## 11. Nginx 연동 (운영 환경)

```nginx
location /jri-api {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location /uploads {
    alias /data/upload/ps_cov_ins;
    expires 1h;
}
```

---

## 12. 테스트

| 테스트 유형 | 건수 | 도구 |
|------------|------|------|
| API 단위 테스트 | 128 | bash + curl |
| E2E 통합 테스트 | 51 | Playwright |
| 시크릿 모드 테스트 | 12 | Playwright |
| **합계** | **191** | |

```bash
# API 테스트
bash preview/test_comprehensive.sh

# E2E 테스트
python3 preview/test_e2e_comprehensive.py

# 시크릿 모드 테스트
python3 preview/test_secret_mode.py
```

---

## 변경 이력

| 버전 | 날짜 | 내용 |
|------|------|------|
| 6.0.0 | 2026-04-08 | company-platform 규격 전면 재작성 (Entity/Controller/DTO/Service/SQL), 모듈 격리 규칙·API 통신·SQL 규칙 문서화 |
| 5.0.0 | 2026-04-06 | 이미지 파일명 MATNR 추가, timestamp YYMMDD_HHMMSS, 탭 검색 버그 수정 |
| 4.0.0 | 2026-03-13 | MES 연동, Upsert, 이력 필터, UPDATE 확인 팝업 |
| 3.0.0 | 2026-03-03 | company-platform 멀티 모듈 구조로 변환 |
