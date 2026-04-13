# PS Coverage Inspection System - Source Map

> **문서 버전**: 1.0.0 | **갱신일**: 2026-04-13 | **대상 모듈**: `module-jri`, `module-ps-insp`

---

## 1. 시스템 아키텍처 개요

```
company-platform (루트 프로젝트)
├── core/                        # 공통 모듈 (ApiResponse, 예외, Security)
├── app/                         # Spring Boot 메인 애플리케이션
├── module-jri/                  # 점보롤 지분 검사 모듈 (v1)
├── module-ps-insp/              # PS 커버리지 검사 모듈 (v2)
└── sql/                         # DB 스크립트 (루트 통합)
    ├── module-jri/
    └── module-ps-insp/
```

### 모듈 비교표

| 항목 | module-jri | module-ps-insp |
|------|-----------|---------------|
| 패키지 | `com.company.module.jri` | `com.company.module.psinsp` |
| API Prefix | `/jri-api/**` | `/ps-insp-api/**` |
| DB 테이블 | `jri_inspection` | `ps_insp_inspection` |
| Bean 접두사 | `jri*` / `Jri*` | `psInsp*` / `PsInsp*` |
| 정적 리소스 | `/jri-static/**` | (미정) |
| 페이지 | `/jri-api/page` | `/ps-insp-api/page` |
| 설정 키 | `jri.upload.dir`, `jri.mes.endpoint-url` | `ps-insp.upload.dir`, `ps-insp.mes.endpoint-url` |

---

## 2. 프로젝트 디렉토리 트리

```
ps_coverage_inspection/
│
├── .gitignore
├── api-spec.html                         # API 사양서 (HTML)
├── flow-diagram.html                     # 흐름도 (HTML)
│
├── module-jri/                           # ────── JRI 모듈 ──────
│   ├── README.md                         # 모듈 문서 (핵심 기능 10개, 통합 가이드)
│   ├── build.gradle                      # Gradle 빌드 (plain JAR, compileOnly core)
│   └── src/main/
│       ├── java/com/company/module/jri/
│       │   ├── config/
│       │   │   └── JriWebConfig.java                    # [C01] Web MVC 설정
│       │   ├── controller/
│       │   │   ├── JriHealthController.java             # [C02] Health Check
│       │   │   ├── JriInspectionApiController.java      # [C03] 검사 REST API
│       │   │   ├── JriMesController.java                # [C04] MES 전송 API
│       │   │   └── JriPageController.java               # [C05] 페이지 라우팅
│       │   ├── dto/
│       │   │   ├── JriInspectionSaveRequest.java        # [D01] 저장 요청 DTO
│       │   │   ├── JriInspectionResponse.java           # [D02] 응답 DTO
│       │   │   ├── JriMesSendRequest.java               # [D03] MES 요청 DTO
│       │   │   └── JriMesSendResponse.java              # [D04] MES 응답 DTO
│       │   ├── entity/
│       │   │   └── JriInspection.java                   # [E01] JPA 엔티티
│       │   ├── repository/
│       │   │   └── JriInspectionRepository.java         # [R01] JPA Repository
│       │   └── service/
│       │       ├── JriInspectionService.java            # [S01] 검사 비즈니스 로직
│       │       └── JriMesService.java                   # [S02] MES 전송 서비스
│       └── resources/
│           ├── application-jri.yml                      # [Y01] 모듈 설정 참조
│           ├── static/jri/
│           │   ├── css/style.css                        # [F01] 스타일시트
│           │   └── js/app.js                            # [F02] 프론트엔드 로직
│           └── templates/jri/
│               └── index.html                           # [F03] Thymeleaf 메인 페이지
│
├── module-ps-insp/                       # ────── PS-INSP 모듈 ──────
│   ├── build.gradle                      # Gradle 빌드 (plain JAR, compileOnly core)
│   └── src/main/
│       ├── java/com/company/module/psinsp/
│       │   ├── config/
│       │   │   └── PsInspWebConfig.java                 # [P-C01] Web MVC 설정
│       │   ├── controller/
│       │   │   ├── PsInspHealthController.java          # [P-C02] Health Check
│       │   │   ├── PsInspInspectionApiController.java   # [P-C03] 검사 REST API
│       │   │   ├── PsInspMesController.java             # [P-C04] MES 전송 API
│       │   │   └── PsInspPageController.java            # [P-C05] 페이지 라우팅
│       │   ├── dto/
│       │   │   ├── PsInspInspectionSaveRequest.java     # [P-D01] 저장 요청 DTO
│       │   │   ├── PsInspInspectionResponse.java        # [P-D02] 응답 DTO
│       │   │   ├── PsInspMesSendRequest.java            # [P-D03] MES 요청 DTO
│       │   │   └── PsInspMesSendResponse.java           # [P-D04] MES 응답 DTO
│       │   ├── entity/
│       │   │   └── PsInspInspection.java                # [P-E01] JPA 엔티티
│       │   ├── repository/
│       │   │   └── PsInspInspectionRepository.java      # [P-R01] JPA Repository
│       │   └── service/
│       │       ├── PsInspInspectionService.java         # [P-S01] 검사 비즈니스 로직
│       │       └── PsInspMesService.java                # [P-S02] MES 전송 서비스
│       └── resources/
│           └── application-ps-insp.yml                  # [P-Y01] 모듈 설정 참조
│
├── sql/                                  # ────── DB 스크립트 ──────
│   ├── module-jri/
│   │   ├── 01_schema.sql                               # [SQL-J01] DDL + 인덱스
│   │   ├── 02_seed_data.sql                            # [SQL-J02] 샘플 데이터
│   │   └── README.md                                   # [SQL-J03] 실행 가이드
│   └── module-ps-insp/
│       ├── 01_schema.sql                               # [SQL-P01] DDL + 인덱스
│       ├── 02_seed_data.sql                            # [SQL-P02] 샘플 데이터
│       └── README.md                                   # [SQL-P03] 실행 가이드
│
├── preview/                              # ────── 프리뷰 서버 ──────
│   ├── server.js                                       # Node.js 개발 서버
│   ├── index.html                                      # 프리뷰 메인 페이지
│   ├── jri-static/                                     # 정적 리소스 복사본
│   │   ├── css/style.css
│   │   └── js/app.js
│   ├── test_comprehensive.sh                           # API 단위 테스트 (128건)
│   ├── test_e2e.py                                     # E2E 기본 테스트
│   ├── test_e2e_comprehensive.py                       # E2E 통합 테스트 (51건)
│   ├── test_secret_mode.py                             # 시크릿 모드 테스트 (12건)
│   └── uploads/                                        # 테스트 이미지 저장소
│
└── docs/
    └── SOURCE-MAP.md                                   # 이 문서
```

---

## 3. 소스 파일 상세 맵

### 3.1 Config 레이어

#### [C01] JriWebConfig.java (72줄)

| 항목 | 값 |
|------|-----|
| 파일 경로 | `module-jri/src/main/java/com/company/module/jri/config/JriWebConfig.java` |
| 패키지 | `com.company.module.jri.config` |
| 타입 | `@Configuration implements WebMvcConfigurer` |
| 역할 | CORS, 이미지 리소스 핸들링, ObjectMapper, RestTemplate 빈 등록 |

**등록 빈:**

| Bean 이름 | 타입 | 용도 |
|-----------|------|------|
| `jriObjectMapper` | `ObjectMapper` | JavaTimeModule 등록, 날짜 ISO 포맷 |
| `jriRestTemplate` | `RestTemplate` | MES 연동용 HTTP 클라이언트 |

**설정:**

| 설정 | 내용 |
|------|------|
| CORS | `/jri-api/**` 전체 허용 (`*`) |
| 리소스 핸들러 | `/uploads/**` -> `file:${jri.upload.dir}/` |
| 설정값 | `@Value("${jri.upload.dir:/data/upload/ps_cov_ins}")` |

#### [P-C01] PsInspWebConfig.java (72줄)

| 항목 | 값 |
|------|-----|
| 파일 경로 | `module-ps-insp/src/main/java/com/company/module/psinsp/config/PsInspWebConfig.java` |
| 패키지 | `com.company.module.psinsp.config` |
| 차이점 | Bean 이름 `psInspObjectMapper`, `psInspRestTemplate`; CORS 경로 `/ps-insp-api/**`; 설정키 `ps-insp.upload.dir` |

**등록 빈:**

| Bean 이름 | 타입 | 용도 |
|-----------|------|------|
| `psInspObjectMapper` | `ObjectMapper` | JavaTimeModule 등록, 날짜 ISO 포맷 |
| `psInspRestTemplate` | `RestTemplate` | MES 연동용 HTTP 클라이언트 |

---

### 3.2 Controller 레이어

#### [C02] JriHealthController.java (33줄)

| 항목 | 값 |
|------|-----|
| URL | `GET /jri-api/health` |
| 권한 | 공개 (인증 불필요) |
| 응답 | `ApiResponse<Map>` (status, module, application, version, timestamp) |

#### [C03] JriInspectionApiController.java (146줄)

| 항목 | 값 |
|------|-----|
| URL Prefix | `/jri-api/inspections` |
| 의존성 | `JriInspectionService`, `ObjectMapper(@Qualifier("jriObjectMapper"))` |
| DI 방식 | `@RequiredArgsConstructor` + 필드에 `@Qualifier` |

**엔드포인트:**

| Method | URL | 권한 | 설명 | 반환 타입 |
|--------|-----|------|------|-----------|
| `POST` | `/jri-api/inspections` (JSON) | ADMIN | 검사 결과 저장 | `ApiResponse<JriInspectionResponse>` |
| `POST` | `/jri-api/inspections` (Multipart) | ADMIN | 이미지 포함 저장 | `ApiResponse<JriInspectionResponse>` |
| `GET` | `/jri-api/inspections/{id}` | 인증 | 단건 조회 | `ApiResponse<JriInspectionResponse>` |
| `GET` | `/jri-api/inspections?page&size&dateFrom&dateTo&indBcd` | 인증 | 목록 (페이징+필터) | `ApiResponse<Page<JriInspectionResponse>>` |
| `GET` | `/jri-api/inspections/search?type&keyword&page&size` | 인증 | 검색 (indBcd/lotnr/matnr) | `ApiResponse<Page<JriInspectionResponse>>` |
| `GET` | `/jri-api/inspections/check-exists?matnr&lotnr&indBcd` | 인증 | Upsert 사전 체크 | `ApiResponse<Map>` |
| `DELETE` | `/jri-api/inspections/{id}` | ADMIN | 단건 삭제 | `ApiResponse<Map>` |
| `DELETE` | `/jri-api/inspections` | ADMIN | 전체 삭제 | `ApiResponse<Map>` |

#### [C04] JriMesController.java (49줄)

| Method | URL | 설명 | 요청 | 응답 |
|--------|-----|------|------|------|
| `POST` | `/jri-api/mes/send-result` | MES 결과 전송 | `JriMesSendRequest` | `ApiResponse<JriMesSendResponse>` |

#### [C05] JriPageController.java (38줄)

| URL | 뷰 | 설명 |
|-----|-----|------|
| `GET /jri-api/page` | `jri/index` | 메인 페이지 |
| `GET /jri-api/page/inspection/**` | `jri/index` | SPA catch-all |
| `GET /jri-api/page/history/**` | `jri/index` | SPA catch-all |

#### [P-C03] PsInspInspectionApiController.java (150줄)

| 항목 | 값 |
|------|-----|
| URL Prefix | `/ps-insp-api/inspections` |
| **DI 방식** | **수동 생성자** + `@Qualifier("psInspObjectMapper")` (JRI와 다름) |

**엔드포인트:** JRI와 동일 구조, URL 접두사만 `/ps-insp-api/inspections`

| Method | URL | 권한 |
|--------|-----|------|
| `POST` | `/ps-insp-api/inspections` (JSON / Multipart) | ADMIN |
| `GET` | `/ps-insp-api/inspections/{id}` | 인증 |
| `GET` | `/ps-insp-api/inspections?page&size&dateFrom&dateTo&indBcd` | 인증 |
| `GET` | `/ps-insp-api/inspections/search?type&keyword&page&size` | 인증 |
| `GET` | `/ps-insp-api/inspections/check-exists?matnr&lotnr&indBcd` | 인증 |
| `DELETE` | `/ps-insp-api/inspections/{id}` | ADMIN |
| `DELETE` | `/ps-insp-api/inspections` | ADMIN |

#### [P-C04] PsInspMesController.java (49줄)

| Method | URL |
|--------|-----|
| `POST` | `/ps-insp-api/mes/send-result` |

#### [P-C05] PsInspPageController.java (38줄)

| URL | 뷰 |
|-----|-----|
| `GET /ps-insp-api/page` | `ps-insp/index` |

---

### 3.3 DTO 레이어

#### [D01] JriInspectionSaveRequest.java (84줄)

| 항목 | 값 |
|------|-----|
| Lombok | `@Getter @Setter` |
| Validation | `@Size`, `@Min`, `@Max`, `@NotBlank` |

**필드 목록 (34개):**

| 필드 | 타입 | 유효성 | DB 컬럼 |
|------|------|--------|---------|
| `inspItemGrpCd` | `String` | `@Size(max=100)` | `INSP_ITEM_GRP_CD` |
| `matnr` | `String` | `@Size(max=100)` | `MATNR` |
| `matnrNm` | `String` | `@Size(max=500)` | `MATNR_NM` |
| `werks` | `String` | `@Size(max=100)` | `WERKS` |
| `msrmDate` | `LocalDateTime` | - | `MSRM_DATE` |
| `prcSeqno` | `Integer` | - | `PRC_SEQNO` |
| `lotnr` | `String` | `@Size(max=200)` | `LOTNR` |
| `indBcd` | `String` | `@Size(max=200)` | `IND_BCD` |
| `indBcdSeq` | `String` | `@Size(max=100)` | `IND_BCD_SEQ` |
| `inspectedAt` | `LocalDateTime` | - | `INSPECTED_AT` |
| `thresholdMax` | `Integer` | `@Min(0) @Max(255)` | `THRESHOLD_MAX` |
| `totalCount` | `Integer` | `@Min(0)` | `TOTAL_COUNT` |
| `coverageRatio` | `BigDecimal` | - | `COVERAGE_RATIO` |
| `densityCount` | `Integer` | - | `DENSITY_COUNT` |
| `densityRatio` | `BigDecimal` | - | `DENSITY_RATIO` |
| `sizeUniformityScore` | `BigDecimal` | - | `SIZE_UNIFORMITY_SCORE` |
| `distributionUniformityScore` | `BigDecimal` | - | `DISTRIBUTION_UNIFORMITY_SCORE` |
| `meanSize` | `BigDecimal` | - | `MEAN_SIZE` |
| `stdSize` | `BigDecimal` | - | `STD_SIZE` |
| `autoCount` | `Integer` | `@Min(0)` | `AUTO_COUNT` |
| `manualCount` | `Integer` | `@Min(0)` | `MANUAL_COUNT` |
| `removedAutoCount` | `Integer` | `@Min(0)` | `REMOVED_AUTO_COUNT` |
| `bucketUpTo3` | `Integer` | - | `BUCKET_UP_TO_3` |
| `bucketUpTo5` | `Integer` | - | `BUCKET_UP_TO_5` |
| `bucketUpTo7` | `Integer` | - | `BUCKET_UP_TO_7` |
| `bucketOver7` | `Integer` | - | `BUCKET_OVER_7` |
| `quadrantTopLeft` | `Integer` | - | `QUADRANT_TOP_LEFT` |
| `quadrantTopRight` | `Integer` | - | `QUADRANT_TOP_RIGHT` |
| `quadrantBottomLeft` | `Integer` | - | `QUADRANT_BOTTOM_LEFT` |
| `quadrantBottomRight` | `Integer` | - | `QUADRANT_BOTTOM_RIGHT` |
| `objectPixelCount` | `Long` | - | `OBJECT_PIXEL_COUNT` |
| `totalPixels` | `Long` | - | `TOTAL_PIXELS` |
| `manualAddedCount` | `Integer` | `@Min(0)` | `MANUAL_ADDED_COUNT` |
| `manualRemovedCount` | `Integer` | `@Min(0)` | `MANUAL_REMOVED_COUNT` |
| `originalImagePath` | `String` | `@Size(max=1000)` | `ORIGINAL_IMAGE_PATH` |
| `resultImagePath` | `String` | `@Size(max=1000)` | `RESULT_IMAGE_PATH` |
| `operatorId` | `String` | `@Size(max=200)` | `OPERATOR_ID` |
| `operatorNm` | `String` | `@Size(max=200)` | `OPERATOR_NM` |
| `deviceId` | `String` | `@Size(max=200)` | `DEVICE_ID` |
| `status` | `String` | `@Size(max=100)` | `STATUS` |

> **[P-D01]** `PsInspInspectionSaveRequest.java` (84줄) - 동일 구조

#### [D02] JriInspectionResponse.java (124줄)

| 항목 | 값 |
|------|-----|
| Lombok | `@Getter @Builder @AllArgsConstructor(PRIVATE)` |
| 팩토리 메서드 | `static from(JriInspection)` |
| 추가 필드 | `isUpdate` (INSERT/UPDATE 구분) |
| 특이사항 | `from(entity, isUpdate)` 오버로드 **미지원** (JRI만 해당) |

> **[P-D02]** `PsInspInspectionResponse.java` (132줄) - `from(entity, isUpdate)` 오버로드 **지원** (개선됨)

#### [D03] JriMesSendRequest.java (28줄)

| 필드 | 타입 | JSON 매핑 | Validation |
|------|------|-----------|------------|
| `indBcd` | `String` | `@JsonProperty("IND_BCD")` | `@NotBlank` |
| `resultData` | `Double` | `@JsonProperty("ResultData")` | `@NotNull` |

> **[P-D03]** `PsInspMesSendRequest.java` (28줄) - 동일

#### [D04] JriMesSendResponse.java (35줄)

| 필드 | 타입 |
|------|------|
| `success` | `boolean` |
| `message` | `String` |
| `transmissionId` | `String` |
| `timestamp` | `String` |

**팩토리 메서드:** `success(msg, txId, ts)`, `fail(msg, txId, ts)`

> **[P-D04]** `PsInspMesSendResponse.java` (35줄) - 동일

---

### 3.4 Entity 레이어

#### [E01] JriInspection.java (269줄)

| 항목 | 값 |
|------|-----|
| 테이블 | `@Table(name = "jri_inspection")` |
| PK | `inspectionId` (`INSPECTION_ID`, `BIGINT`, `IDENTITY`) |
| Unique Key | `(MATNR, LOTNR, IND_BCD)` |
| Lombok | `@Getter @Builder @NoArgsConstructor(PROTECTED) @AllArgsConstructor(PRIVATE)` |
| Setter | **없음** (비즈니스 메서드로 갱신) |

**컬럼 매핑 (48개):**

| Java 필드 | DB 컬럼 | 타입 | 정밀도 |
|-----------|---------|------|--------|
| `inspectionId` | `INSPECTION_ID` | `Long` | BIGINT |
| `seq` | `SEQ` | `Integer` | INT, NOT NULL |
| `inspItemGrpCd` | `INSP_ITEM_GRP_CD` | `String(100)` | VARCHAR(100) |
| `matnr` | `MATNR` | `String(100)` | VARCHAR(100) |
| `matnrNm` | `MATNR_NM` | `String(500)` | VARCHAR(500) |
| `werks` | `WERKS` | `String(100)` | VARCHAR(100) |
| `msrmDate` | `MSRM_DATE` | `LocalDateTime` | DATETIME |
| `prcSeqno` | `PRC_SEQNO` | `Integer` | INT |
| `lotnr` | `LOTNR` | `String(200)` | VARCHAR(200) |
| `indBcd` | `IND_BCD` | `String(200)` | VARCHAR(200) |
| `indBcdSeq` | `IND_BCD_SEQ` | `String(100)` | VARCHAR(100) |
| `inspectedAt` | `INSPECTED_AT` | `LocalDateTime` | DATETIME |
| `thresholdMax` | `THRESHOLD_MAX` | `Integer` | INT |
| `totalCount` | `TOTAL_COUNT` | `Integer` | INT, NOT NULL |
| `coverageRatio` | `COVERAGE_RATIO` | `BigDecimal(12,6)` | DECIMAL(12,6) |
| `densityCount` | `DENSITY_COUNT` | `Integer` | INT |
| `densityRatio` | `DENSITY_RATIO` | `BigDecimal(8,4)` | DECIMAL(8,4) |
| `sizeUniformityScore` | `SIZE_UNIFORMITY_SCORE` | `BigDecimal(8,4)` | DECIMAL(8,4) |
| `distributionUniformityScore` | `DISTRIBUTION_UNIFORMITY_SCORE` | `BigDecimal(8,4)` | DECIMAL(8,4) |
| `meanSize` | `MEAN_SIZE` | `BigDecimal(12,4)` | DECIMAL(12,4) |
| `stdSize` | `STD_SIZE` | `BigDecimal(12,4)` | DECIMAL(12,4) |
| `autoCount` | `AUTO_COUNT` | `Integer` | INT, NOT NULL |
| `manualCount` | `MANUAL_COUNT` | `Integer` | INT, NOT NULL |
| `removedAutoCount` | `REMOVED_AUTO_COUNT` | `Integer` | INT, NOT NULL |
| `bucketUpTo3` | `BUCKET_UP_TO_3` | `Integer` | INT |
| `bucketUpTo5` | `BUCKET_UP_TO_5` | `Integer` | INT |
| `bucketUpTo7` | `BUCKET_UP_TO_7` | `Integer` | INT |
| `bucketOver7` | `BUCKET_OVER_7` | `Integer` | INT |
| `quadrantTopLeft` | `QUADRANT_TOP_LEFT` | `Integer` | INT |
| `quadrantTopRight` | `QUADRANT_TOP_RIGHT` | `Integer` | INT |
| `quadrantBottomLeft` | `QUADRANT_BOTTOM_LEFT` | `Integer` | INT |
| `quadrantBottomRight` | `QUADRANT_BOTTOM_RIGHT` | `Integer` | INT |
| `objectPixelCount` | `OBJECT_PIXEL_COUNT` | `Long` | BIGINT |
| `totalPixels` | `TOTAL_PIXELS` | `Long` | BIGINT |
| `manualAddedCount` | `MANUAL_ADDED_COUNT` | `Integer` | INT, NOT NULL |
| `manualRemovedCount` | `MANUAL_REMOVED_COUNT` | `Integer` | INT, NOT NULL |
| `originalImagePath` | `ORIGINAL_IMAGE_PATH` | `String(1000)` | VARCHAR(1000) |
| `originalImageName` | `ORIGINAL_IMAGE_NAME` | `String(500)` | VARCHAR(500) |
| `originalImageDir` | `ORIGINAL_IMAGE_DIR` | `String(1000)` | VARCHAR(1000) |
| `resultImagePath` | `RESULT_IMAGE_PATH` | `String(1000)` | VARCHAR(1000) |
| `resultImageName` | `RESULT_IMAGE_NAME` | `String(500)` | VARCHAR(500) |
| `resultImageDir` | `RESULT_IMAGE_DIR` | `String(1000)` | VARCHAR(1000) |
| `operatorId` | `OPERATOR_ID` | `String(200)` | VARCHAR(200) |
| `operatorNm` | `OPERATOR_NM` | `String(200)` | VARCHAR(200) |
| `deviceId` | `DEVICE_ID` | `String(200)` | VARCHAR(200) |
| `status` | `STATUS` | `String(100)` | VARCHAR(100) |
| `createdAt` | `CREATED_AT` | `LocalDateTime` | DATETIME, NOT NULL |
| `updatedAt` | `UPDATED_AT` | `LocalDateTime` | DATETIME |

**라이프사이클 콜백:**

| 어노테이션 | 동작 |
|-----------|------|
| `@PrePersist` | `createdAt` = now(), `inspectedAt` null이면 now(), `msrmDate` null이면 now() |
| `@PreUpdate` | `updatedAt` = now() |

**비즈니스 메서드:**

| 메서드 | 파라미터 수 | 설명 |
|--------|-----------|------|
| `updateInspectionData(...)` | 30개 | 검사 수치 전체 업데이트 |
| `updateOriginalImage(path, name, dir)` | 3개 | 원본 이미지 경로 갱신 |
| `updateResultImage(path, name, dir)` | 3개 | 결과 이미지 경로 갱신 |
| `updateMatnrNm(matnrNm)` | 1개 | 자재명 갱신 |
| `incrementIndBcdSeq()` | 0개 | 차수(재검사 횟수) +1 |

> **[P-E01]** `PsInspInspection.java` (272줄) - 동일 구조, 테이블명만 `ps_insp_inspection`

---

### 3.5 Repository 레이어

#### [R01] JriInspectionRepository.java (60줄)

| 항목 | 값 |
|------|-----|
| 부모 | `JpaRepository<JriInspection, Long>` |
| 쿼리 | 모두 JPQL (Native Query 없음) |

**쿼리 메서드:**

| 메서드 | 타입 | 설명 | 사용 위치 |
|--------|------|------|-----------|
| `findAllByOrderByInspectedAtDesc(Pageable)` | Derived | 최신순 페이징 | `listInspections()` |
| `searchByIndBcd(keyword, Pageable)` | `@Query` JPQL | 바코드 LIKE 검색 | `searchByIndBcd()` |
| `searchByLotnr(keyword, Pageable)` | `@Query` JPQL | LOT LIKE 검색 | `searchByLotnr()` |
| `searchByMatnr(keyword, Pageable)` | `@Query` JPQL | 자재코드 LIKE 검색 | `searchByMatnr()` |
| `findByDateRange(from, to, Pageable)` | `@Query` JPQL | 기간 조회 | `searchInspections()` |
| `searchByIndBcdAndDateRange(keyword, from, to, Pageable)` | `@Query` JPQL | 바코드+기간 복합 | `searchInspections()` |
| `findMaxSeqByIndBcd(indBcd)` | `@Query` JPQL | MAX(seq) 조회 | `saveInspection()` INSERT |
| `countByIndBcd(indBcd)` | `@Query` JPQL | 차수 카운트 | `saveInspection()` INSERT |
| `findByMatnrAndLotnrAndIndBcd(matnr, lotnr, indBcd)` | Derived | Upsert 체크 | `saveInspection()`, `checkExists()` |

> **[P-R01]** `PsInspInspectionRepository.java` (60줄) - 동일 구조, 엔티티만 `PsInspInspection`

---

### 3.6 Service 레이어

#### [S01] JriInspectionService.java (358줄)

| 항목 | 값 |
|------|-----|
| 클래스 레벨 | `@Transactional(readOnly = true)` |
| 의존성 | `JriInspectionRepository` |
| 설정값 | `@Value("${jri.upload.dir:/data/upload/ps_cov_ins}")` |

**공개 메서드:**

| 메서드 | TX | 반환 | 설명 |
|--------|-----|------|------|
| `saveInspection(request, origFile, resFile)` | `@Transactional` | `JriInspectionResponse` | Upsert 저장 (이미지 포함) |
| `getInspection(id)` | readOnly | `JriInspectionResponse` | 단건 조회 |
| `listInspections(pageable)` | readOnly | `Page<JriInspectionResponse>` | 전체 목록 |
| `searchInspections(indBcd, dateFrom, dateTo, pageable)` | readOnly | `Page<JriInspectionResponse>` | 필터 검색 |
| `searchByIndBcd(keyword, pageable)` | readOnly | `Page<JriInspectionResponse>` | 바코드 검색 |
| `searchByLotnr(keyword, pageable)` | readOnly | `Page<JriInspectionResponse>` | LOT 검색 |
| `searchByMatnr(keyword, pageable)` | readOnly | `Page<JriInspectionResponse>` | 자재코드 검색 |
| `checkExists(matnr, lotnr, indBcd)` | readOnly | `Map<String, Object>` | 존재 여부 체크 |
| `deleteInspection(id)` | `@Transactional` | `void` | 단건 삭제 |
| `deleteAllInspections()` | `@Transactional` | `void` | 전체 삭제 |

**Upsert 로직 (`saveInspection`):**

```
1. MATNR + LOTNR + IND_BCD 로 기존 레코드 조회
2-A. 존재 (UPDATE):
   - updateInspectionData() 호출
   - updateOriginalImage() / updateResultImage() 갱신
   - updateMatnrNm() 갱신
   - incrementIndBcdSeq() 차수 증가
2-B. 미존재 (INSERT):
   - MAX(seq) + 1 계산
   - indBcdSeq 자동 할당 (count + 1)
   - Builder로 새 엔티티 생성
   - save() 후 ID 확보 -> 이미지 저장
3. 최종 save() + Response 반환
```

**이미지 저장 로직:**

```
파일명: {prefix}_{matnrSafe}_{indBcdSafe}_{yyMMdd_HHmmss}_{idSuffix(8자리)}.{ext}
경로:   {uploadDir}/{category}/{yyyy.MM}/{filename}
URL:    /uploads/{category}/{yyyy.MM}/{filename}
```

**Private 헬퍼:**

| 메서드 | 설명 |
|--------|------|
| `getImageSubDir(category)` | `{uploadDir}/{original|result}/{yyyy.MM}/` 디렉토리 생성 |
| `saveUploadedImage(file, prefix, id, matnrSafe, indBcdSafe)` | 이미지 저장 + URL 반환 |
| `hasText(s)` | null/blank 체크 |
| `safeName(s)` | 특수문자 -> `_` 치환 |
| `fileName(path)` | URL에서 파일명 추출 |

> **[P-S01]** `PsInspInspectionService.java` (306줄) - 동일 로직, `PsInspInspectionResponse.from(entity, isUpdate)` 사용으로 간결화됨

**JRI vs PS-INSP Service 차이점:**

| 항목 | JRI (S01) | PS-INSP (P-S01) |
|------|-----------|-----------------|
| 줄 수 | 358줄 | 306줄 |
| `saveInspection` 반환 | `from(entity)` 후 전체 빌더 재조립 (중복) | `from(entity, isUpdate)` 직접 반환 (개선됨) |
| 로그 접두사 | `[JRI]` | `[PS-INSP]` |

#### [S02] JriMesService.java (81줄)

| 항목 | 값 |
|------|-----|
| 설정값 | `@Value("${jri.mes.endpoint-url:}")` |
| 의존성 | `RestTemplate` (DI: `@RequiredArgsConstructor`) |
| 모드 | URL 설정 시 실제 전송, 미설정 시 Mock 모드 |

**전송 규격:**

```json
POST {mesEndpointUrl}
Content-Type: application/json
{
  "IND_BCD": "26228J0039",
  "ResultData": 265.30
}
```

> **[P-S02]** `PsInspMesService.java` (84줄) - DI 방식 차이: 수동 생성자 + `@Qualifier("psInspRestTemplate")`

**JRI vs PS-INSP MesService 차이점:**

| 항목 | JRI (S02) | PS-INSP (P-S02) |
|------|-----------|-----------------|
| DI 방식 | `@RequiredArgsConstructor` | 수동 생성자 + `@Qualifier("psInspRestTemplate")` |
| 설정 키 | `jri.mes.endpoint-url` | `ps-insp.mes.endpoint-url` |
| 로그 접두사 | `[MES]` | `[PS-INSP][MES]` |

---

### 3.7 SQL 스크립트

#### [SQL-J01] sql/module-jri/01_schema.sql (75줄)

| 항목 | 값 |
|------|-----|
| 테이블 | `jri_inspection` |
| Engine | `InnoDB` |
| Charset | `utf8mb4`, COLLATE `utf8mb4_general_ci` |
| PK | `INSPECTION_ID` (BIGINT, AUTO_INCREMENT) |
| UK | `UK_JRI_MATNR_LOTNR_INDBCD (MATNR, LOTNR, IND_BCD)` |
| 컬럼 수 | 48개 |

**인덱스 (8개):**

| 인덱스명 | 컬럼 | 용도 |
|----------|------|------|
| `IDX_JRI_IND_BCD` | `IND_BCD` | 바코드 검색 |
| `IDX_JRI_LOTNR` | `LOTNR` | LOT 검색 |
| `IDX_JRI_MATNR` | `MATNR` | 자재코드 검색 |
| `IDX_JRI_WERKS` | `WERKS` | 플랜트 검색 |
| `IDX_JRI_MSRM_DATE` | `MSRM_DATE DESC` | 측정일 정렬 |
| `IDX_JRI_INSPECTED_AT` | `INSPECTED_AT DESC` | 검사일 정렬 |
| `IDX_JRI_OPERATOR_ID` | `OPERATOR_ID` | 검사자 검색 |
| `IDX_JRI_STATUS` | `STATUS` | 상태 필터 |

#### [SQL-P01] sql/module-ps-insp/01_schema.sql (75줄)

동일 구조, 테이블명/인덱스명/UK 접두사만 `ps_insp`로 변경.

---

### 3.8 설정 파일

#### [Y01] application-jri.yml

```yaml
jri:
  upload:
    dir: /data/upload/ps_cov_ins     # 이미지 저장 경로
  mes:
    endpoint-url:                     # 비어있으면 mock 모드
```

#### [P-Y01] application-ps-insp.yml

```yaml
ps-insp:
  upload:
    dir: /data/upload/ps_cov_ins     # 이미지 저장 경로
  mes:
    endpoint-url:                     # 비어있으면 mock 모드
```

---

### 3.9 빌드 설정

#### build.gradle (공통 구조)

```groovy
dependencies {
    compileOnly project(':core')                           // 순환 의존 방지
    implementation 'spring-boot-starter-web'
    implementation 'spring-boot-starter-data-jpa'
    implementation 'spring-boot-starter-security'
    implementation 'spring-boot-starter-validation'
    implementation 'spring-boot-starter-thymeleaf'
    implementation 'jackson-databind'
    implementation 'jackson-datatype-jsr310'
    compileOnly 'lombok'
    annotationProcessor 'lombok'
    testImplementation 'spring-boot-starter-test'
    testRuntimeOnly 'h2'
}

jar { enabled = true }  // plain JAR (spring-boot 플러그인 미적용)
```

---

## 4. 데이터 흐름 다이어그램

### 4.1 검사 결과 저장 흐름

```
[프론트엔드 (app.js)]
    │
    ├─ JSON POST ──────────────────────────────────────┐
    │  Content-Type: application/json                  │
    │  Body: JriInspectionSaveRequest                  │
    │                                                  ▼
    ├─ Multipart POST ─────────────────> [Controller]
    │  Parts: metadata(JSON) +           JriInspectionApiController
    │         originalImage(file) +         │
    │         resultImage(file)             │ ObjectMapper.readValue()
    │                                      │ (Multipart only)
    │                                      ▼
    │                              [Service]
    │                              JriInspectionService.saveInspection()
    │                                      │
    │                    ┌─────────────────┼─────────────────┐
    │                    │                 │                 │
    │                    ▼                 ▼                 ▼
    │           [Repository]        [File System]     [Entity]
    │           findByMatnrAnd...   saveUploadedImage  JriInspection
    │                    │                 │            .builder()
    │                    │                 │            .updateInspectionData()
    │                    │                 │                 │
    │                    ▼                 ▼                 ▼
    │           ┌──── EXISTS? ────┐    /uploads/...    save(entity)
    │           │  YES (UPDATE)   │                         │
    │           │  NO  (INSERT)   │                         │
    │           └─────────────────┘                         │
    │                                                      ▼
    │                                              [DB: jri_inspection]
    │                                                      │
    │                                                      ▼
    └──────────────────── Response ◄──── JriInspectionResponse.from(entity)
                          (ApiResponse<JriInspectionResponse>)
```

### 4.2 MES 전송 흐름

```
[프론트엔드] ── POST /jri-api/mes/send-result ──> [JriMesController]
    │                                                     │
    │   { "IND_BCD": "26228J0039",                       ▼
    │     "ResultData": 265.30 }              [JriMesService.sendResult()]
    │                                                     │
    │                                    ┌───── URL 설정? ─────┐
    │                                    │ YES                 │ NO
    │                                    ▼                     ▼
    │                          RestTemplate.POST         Mock 응답
    │                          → mesEndpointUrl          (항상 성공)
    │                                    │                     │
    │                                    ▼                     ▼
    └──── ApiResponse<JriMesSendResponse> ◄── success/fail ◄──┘
```

### 4.3 Upsert 판단 로직

```
saveInspection(request)
    │
    ▼
MATNR + LOTNR + IND_BCD 모두 존재?
    │
    ├─ NO ──> INSERT (seq=1, indBcdSeq=count+1)
    │
    └─ YES ─> findByMatnrAndLotnrAndIndBcd()
                  │
                  ├─ NOT FOUND ──> INSERT (seq=MAX+1, indBcdSeq=count+1)
                  │
                  └─ FOUND ──> UPDATE
                       ├─ updateInspectionData(30개 파라미터)
                       ├─ updateOriginalImage() / updateResultImage()
                       ├─ updateMatnrNm()
                       └─ incrementIndBcdSeq() (차수 +1)
```

---

## 5. 의존성 그래프

```
                    ┌──────────┐
                    │   core   │  ApiResponse, EntityNotFoundException,
                    │ (공통)   │  Spring Security
                    └──┬───┬──┘
                       │   │
          compileOnly  │   │  compileOnly
          ┌────────────┘   └────────────┐
          ▼                             ▼
   ┌──────────────┐            ┌────────────────┐
   │  module-jri   │            │ module-ps-insp  │
   │ (점보롤 v1)   │            │ (PS 커버리지 v2) │
   └──────┬───────┘            └───────┬────────┘
          │                            │
          │   implementation           │  implementation
          ▼                            ▼
   ┌──────────────┐            ┌────────────────┐
   │     app       │            │     app         │
   │ (메인 Boot)   │ ◄──────── │ (메인 Boot)     │
   └──────────────┘            └────────────────┘

   ※ module-jri ←✕→ module-ps-insp (직접 참조 금지)
   ※ core ←✕→ module-* (역방향 참조 금지)
```

---

## 6. API 엔드포인트 전체 맵

### module-jri

| # | Method | URL | 권한 | 컨트롤러 | 서비스 메서드 |
|---|--------|-----|------|----------|--------------|
| 1 | GET | `/jri-api/health` | 공개 | JriHealthController | - |
| 2 | GET | `/jri-api/page` | 인증 | JriPageController | - |
| 3 | POST | `/jri-api/inspections` (JSON) | ADMIN | JriInspectionApiController | `saveInspection()` |
| 4 | POST | `/jri-api/inspections` (Multipart) | ADMIN | JriInspectionApiController | `saveInspection()` |
| 5 | GET | `/jri-api/inspections/{id}` | 인증 | JriInspectionApiController | `getInspection()` |
| 6 | GET | `/jri-api/inspections` | 인증 | JriInspectionApiController | `searchInspections()` |
| 7 | GET | `/jri-api/inspections/search` | 인증 | JriInspectionApiController | `searchByIndBcd/Lotnr/Matnr()` |
| 8 | GET | `/jri-api/inspections/check-exists` | 인증 | JriInspectionApiController | `checkExists()` |
| 9 | DELETE | `/jri-api/inspections/{id}` | ADMIN | JriInspectionApiController | `deleteInspection()` |
| 10 | DELETE | `/jri-api/inspections` | ADMIN | JriInspectionApiController | `deleteAllInspections()` |
| 11 | POST | `/jri-api/mes/send-result` | 인증 | JriMesController | `sendResult()` |

### module-ps-insp

| # | Method | URL | 권한 | 컨트롤러 | 서비스 메서드 |
|---|--------|-----|------|----------|--------------|
| 1 | GET | `/ps-insp-api/health` | 공개 | PsInspHealthController | - |
| 2 | GET | `/ps-insp-api/page` | 인증 | PsInspPageController | - |
| 3 | POST | `/ps-insp-api/inspections` (JSON) | ADMIN | PsInspInspectionApiController | `saveInspection()` |
| 4 | POST | `/ps-insp-api/inspections` (Multipart) | ADMIN | PsInspInspectionApiController | `saveInspection()` |
| 5 | GET | `/ps-insp-api/inspections/{id}` | 인증 | PsInspInspectionApiController | `getInspection()` |
| 6 | GET | `/ps-insp-api/inspections` | 인증 | PsInspInspectionApiController | `searchInspections()` |
| 7 | GET | `/ps-insp-api/inspections/search` | 인증 | PsInspInspectionApiController | `searchByIndBcd/Lotnr/Matnr()` |
| 8 | GET | `/ps-insp-api/inspections/check-exists` | 인증 | PsInspInspectionApiController | `checkExists()` |
| 9 | DELETE | `/ps-insp-api/inspections/{id}` | ADMIN | PsInspInspectionApiController | `deleteInspection()` |
| 10 | DELETE | `/ps-insp-api/inspections` | ADMIN | PsInspInspectionApiController | `deleteAllInspections()` |
| 11 | POST | `/ps-insp-api/mes/send-result` | 인증 | PsInspMesController | `sendResult()` |

---

## 7. DB 스키마 컬럼 맵 (Entity <-> SQL)

> 두 모듈 모두 동일한 48개 컬럼 구조. 테이블명/UK명/인덱스명 접두사만 다름.

| # | Entity 필드 | DB 컬럼 | 타입 (Java) | 타입 (SQL) | Nullable | Default | 비고 |
|---|------------|---------|------------|-----------|---------|---------|------|
| 1 | `inspectionId` | `INSPECTION_ID` | `Long` | `BIGINT` | NO | AUTO_INCREMENT | PK |
| 2 | `seq` | `SEQ` | `Integer` | `INT` | NO | 0 | 글로벌 시퀀스 |
| 3 | `inspItemGrpCd` | `INSP_ITEM_GRP_CD` | `String` | `VARCHAR(100)` | YES | - | 검사항목그룹코드 |
| 4 | `matnr` | `MATNR` | `String` | `VARCHAR(100)` | YES | - | 자재코드 (UK) |
| 5 | `matnrNm` | `MATNR_NM` | `String` | `VARCHAR(500)` | YES | - | 자재명 |
| 6 | `werks` | `WERKS` | `String` | `VARCHAR(100)` | YES | - | 플랜트 |
| 7 | `msrmDate` | `MSRM_DATE` | `LocalDateTime` | `DATETIME` | YES | - | 측정일시 |
| 8 | `prcSeqno` | `PRC_SEQNO` | `Integer` | `INT` | YES | - | 공정순번 |
| 9 | `lotnr` | `LOTNR` | `String` | `VARCHAR(200)` | YES | - | LOT 번호 (UK) |
| 10 | `indBcd` | `IND_BCD` | `String` | `VARCHAR(200)` | YES | - | 개별바코드 (UK) |
| 11 | `indBcdSeq` | `IND_BCD_SEQ` | `String` | `VARCHAR(100)` | YES | - | 검사 차수 |
| 12 | `inspectedAt` | `INSPECTED_AT` | `LocalDateTime` | `DATETIME` | YES | - | 검사 시각 |
| 13 | `thresholdMax` | `THRESHOLD_MAX` | `Integer` | `INT` | YES | 115 | 이진화 임계값 (0-255) |
| 14 | `totalCount` | `TOTAL_COUNT` | `Integer` | `INT` | NO | 0 | 총 지분 수 |
| 15 | `coverageRatio` | `COVERAGE_RATIO` | `BigDecimal` | `DECIMAL(12,6)` | YES | - | 커버리지 비율 |
| 16 | `densityCount` | `DENSITY_COUNT` | `Integer` | `INT` | YES | 0 | 밀도 지분 수 |
| 17 | `densityRatio` | `DENSITY_RATIO` | `BigDecimal` | `DECIMAL(8,4)` | YES | - | 밀도 비율 |
| 18 | `sizeUniformityScore` | `SIZE_UNIFORMITY_SCORE` | `BigDecimal` | `DECIMAL(8,4)` | YES | - | 크기 균일도 |
| 19 | `distributionUniformityScore` | `DISTRIBUTION_UNIFORMITY_SCORE` | `BigDecimal` | `DECIMAL(8,4)` | YES | - | 분포 균일도 |
| 20 | `meanSize` | `MEAN_SIZE` | `BigDecimal` | `DECIMAL(12,4)` | YES | - | 평균 크기 (px) |
| 21 | `stdSize` | `STD_SIZE` | `BigDecimal` | `DECIMAL(12,4)` | YES | - | 표준편차 (px) |
| 22 | `autoCount` | `AUTO_COUNT` | `Integer` | `INT` | NO | 0 | 자동 검출 수 |
| 23 | `manualCount` | `MANUAL_COUNT` | `Integer` | `INT` | NO | 0 | 수동 보정 수 |
| 24 | `removedAutoCount` | `REMOVED_AUTO_COUNT` | `Integer` | `INT` | NO | 0 | 삭제 자동 검출 수 |
| 25 | `bucketUpTo3` | `BUCKET_UP_TO_3` | `Integer` | `INT` | YES | 0 | 크기 버킷 ~3px |
| 26 | `bucketUpTo5` | `BUCKET_UP_TO_5` | `Integer` | `INT` | YES | 0 | 크기 버킷 ~5px |
| 27 | `bucketUpTo7` | `BUCKET_UP_TO_7` | `Integer` | `INT` | YES | 0 | 크기 버킷 ~7px |
| 28 | `bucketOver7` | `BUCKET_OVER_7` | `Integer` | `INT` | YES | 0 | 크기 버킷 7px+ |
| 29 | `quadrantTopLeft` | `QUADRANT_TOP_LEFT` | `Integer` | `INT` | YES | 0 | 사분면 좌상 |
| 30 | `quadrantTopRight` | `QUADRANT_TOP_RIGHT` | `Integer` | `INT` | YES | 0 | 사분면 우상 |
| 31 | `quadrantBottomLeft` | `QUADRANT_BOTTOM_LEFT` | `Integer` | `INT` | YES | 0 | 사분면 좌하 |
| 32 | `quadrantBottomRight` | `QUADRANT_BOTTOM_RIGHT` | `Integer` | `INT` | YES | 0 | 사분면 우하 |
| 33 | `objectPixelCount` | `OBJECT_PIXEL_COUNT` | `Long` | `BIGINT` | YES | 0 | 지분 총 픽셀 |
| 34 | `totalPixels` | `TOTAL_PIXELS` | `Long` | `BIGINT` | YES | 0 | 이미지 전체 픽셀 |
| 35 | `manualAddedCount` | `MANUAL_ADDED_COUNT` | `Integer` | `INT` | NO | 0 | 수동 추가 수 |
| 36 | `manualRemovedCount` | `MANUAL_REMOVED_COUNT` | `Integer` | `INT` | NO | 0 | 수동 삭제 수 |
| 37 | `originalImagePath` | `ORIGINAL_IMAGE_PATH` | `String` | `VARCHAR(1000)` | YES | - | 원본 이미지 URL |
| 38 | `originalImageName` | `ORIGINAL_IMAGE_NAME` | `String` | `VARCHAR(500)` | YES | - | 원본 이미지 파일명 |
| 39 | `originalImageDir` | `ORIGINAL_IMAGE_DIR` | `String` | `VARCHAR(1000)` | YES | - | 원본 이미지 디렉토리 |
| 40 | `resultImagePath` | `RESULT_IMAGE_PATH` | `String` | `VARCHAR(1000)` | YES | - | 결과 이미지 URL |
| 41 | `resultImageName` | `RESULT_IMAGE_NAME` | `String` | `VARCHAR(500)` | YES | - | 결과 이미지 파일명 |
| 42 | `resultImageDir` | `RESULT_IMAGE_DIR` | `String` | `VARCHAR(1000)` | YES | - | 결과 이미지 디렉토리 |
| 43 | `operatorId` | `OPERATOR_ID` | `String` | `VARCHAR(200)` | YES | - | 검사자 ID |
| 44 | `operatorNm` | `OPERATOR_NM` | `String` | `VARCHAR(200)` | YES | - | 검사자 이름 |
| 45 | `deviceId` | `DEVICE_ID` | `String` | `VARCHAR(200)` | YES | - | 장비 ID |
| 46 | `status` | `STATUS` | `String` | `VARCHAR(100)` | YES | - | 검사 상태 |
| 47 | `createdAt` | `CREATED_AT` | `LocalDateTime` | `DATETIME` | NO | `CURRENT_TIMESTAMP` | 생성일시 |
| 48 | `updatedAt` | `UPDATED_AT` | `LocalDateTime` | `DATETIME` | YES | - | 수정일시 |

---

## 8. 모듈 간 차이점 요약

| 항목 | module-jri | module-ps-insp | 비고 |
|------|-----------|---------------|------|
| **Controller DI** | `@RequiredArgsConstructor` + 필드 `@Qualifier` | 수동 생성자 + `@Qualifier` | ps-insp이 정석 패턴 |
| **Response DTO** | `from(entity)` 단일 메서드 | `from(entity)` + `from(entity, isUpdate)` 오버로드 | ps-insp이 개선됨 |
| **Service 반환** | `from(entity)` 후 Builder 전체 재조립 (358줄) | `from(entity, isUpdate)` 직접 반환 (306줄) | ps-insp이 간결 |
| **MesService DI** | `@RequiredArgsConstructor` (기본 RestTemplate) | 수동 생성자 + `@Qualifier("psInspRestTemplate")` | ps-insp이 명시적 |
| **로그 접두사** | `[JRI]`, `[MES]` | `[PS-INSP]`, `[PS-INSP][MES]` | - |
| **프론트엔드** | `templates/jri/index.html` + `static/jri/` 있음 | 미생성 (추후 작업) | - |
| **Health 버전** | `5.0.0` | `7.0.0` | - |

---

## 9. 핵심 규칙 체크리스트

### 모듈 격리 규칙

- [x] 패키지 독립: `com.company.module.{모듈명}`
- [x] API Prefix 분리: `/{모듈명}-api/**`
- [x] DB 테이블 접두사: `{모듈명}_inspection`
- [x] Bean 이름 접두사: `{모듈명}ObjectMapper`, `{모듈명}RestTemplate`
- [x] 정적 리소스 분리: `/{모듈명}-static/**`
- [x] Thymeleaf 서브 디렉토리: `templates/{모듈명}/`
- [x] Gradle: `compileOnly project(':core')` (순환 방지)
- [x] 모듈 -> 모듈 직접 참조 금지
- [x] core -> 모듈 역방향 참조 금지

### 코드 규칙

- [x] Entity: Setter 없음, 비즈니스 메서드로 갱신
- [x] Entity: `@PrePersist` / `@PreUpdate` 라이프사이클 콜백
- [x] Controller: `ResponseEntity<ApiResponse<T>>` 래핑
- [x] Controller: 쓰기 API -> `@PreAuthorize("hasRole('ADMIN')")`
- [x] Service: 클래스 레벨 `@Transactional(readOnly = true)`
- [x] Service: 쓰기 메서드만 `@Transactional`
- [x] Repository: JPQL 쿼리 (Native 없음)
- [x] DTO: Bean Validation 적용

### DDL 규칙

- [x] 테이블명: `lower_snake_case`
- [x] 컬럼명: `UPPER_SNAKE_CASE`
- [x] Engine: `InnoDB`
- [x] Charset: `utf8mb4`, COLLATE: `utf8mb4_general_ci`
- [x] 컬럼 코멘트: 필수
- [x] 인덱스 접두사: `IDX_`
- [x] UK 접두사: `UK_`

---

## 10. 파일 통계

| 카테고리 | 파일 수 | 총 줄 수 |
|---------|--------|---------|
| module-jri Java | 13 | 1,377 |
| module-ps-insp Java | 13 | 1,364 |
| SQL 스크립트 (DDL+Seed) | 4 | 248 |
| SQL README | 2 | ~80 |
| 설정 (yml) | 2 | 42 |
| 빌드 (gradle) | 2 | 66 |
| 문서 (README) | 1 | 465 |
| 프론트엔드 (HTML+CSS+JS) | 3 | ~2,500+ |
| 테스트 스크립트 | 4 | ~1,500+ |
| **합계** | **~44** | **~7,600+** |

---

*Generated: 2026-04-13 | PS Coverage Inspection System Source Map v1.0.0*
