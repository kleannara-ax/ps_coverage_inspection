# module-jri SQL Scripts

## 점보롤 지분 검사 (Jumbo Roll Share Inspector) 모듈 DB 스크립트

### 파일 위치

```
sql/module-jri/
├── 01_schema.sql            # DDL (테이블 + 인덱스) - 필수
├── 02_seed_data.sql         # 초기 샘플 데이터 (3건) - 선택
└── README.md                # 이 문서
```

> **참고**: `ddl-auto=none` 환경에서 DBA가 직접 실행하는 방식입니다.
> 프로젝트 루트 `sql/module-{모듈명}/`에 배치합니다.

### 실행 방법

```bash
# 1. 스키마 생성 (필수)
mysql -u {user} -p {database} < sql/module-jri/01_schema.sql

# 2. 초기 데이터 삽입 (선택 - 테스트/개발 환경용)
mysql -u {user} -p {database} < sql/module-jri/02_seed_data.sql
```

### 테이블 정보

| 항목 | 값 |
|------|-----|
| 테이블명 | `jri_inspection` |
| Engine | InnoDB |
| Charset | utf8mb4 (utf8mb4_general_ci) |
| PK | `INSPECTION_ID` (BIGINT, AUTO_INCREMENT) |
| Unique Key | `UK_JRI_MATNR_LOTNR_INDBCD` → `(MATNR, LOTNR, IND_BCD)` |

### DDL 명명 규칙

| 항목 | 규칙 | 예시 |
|------|------|------|
| 테이블명 | `lower_snake_case` | `jri_inspection` |
| 컬럼명 | `UPPER_SNAKE_CASE` | `INSPECTION_ID`, `IND_BCD` |
| PK / UK 제약조건 | `UPPER_SNAKE_CASE` | `UK_JRI_MATNR_LOTNR_INDBCD` |
| 인덱스 | `IDX_` 접두사 | `IDX_JRI_IND_BCD` |
| 엔진 | InnoDB | `ENGINE=InnoDB` |
| 문자셋 | utf8mb4 | `DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci` |
| 컬럼 코멘트 | **필수** | `COMMENT '검사 결과 PK (자동 증가)'` |

### 인덱스

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

### 플랫폼 통합 (3줄 변경)

1. `settings.gradle` → `include 'module-jri'`
2. `app/build.gradle` → `implementation project(':module-jri')`
3. SQL 스크립트 실행: `sql/module-jri/01_schema.sql`
