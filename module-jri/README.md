# module-jri : 점보롤 지분 검사 시스템 (Jumbo Roll Share Inspector)

## 모듈 개요

| 항목 | 값 |
|------|-----|
| 모듈명 | `module-jri` |
| 패키지 | `com.company.module.jri` |
| URL API Prefix | `/jri-api/**` |
| DB Table Prefix | `MOD_JRI_` |
| 프론트엔드 정적 리소스 | `/jri-static/**` |
| 프론트엔드 페이지 | `/jri-api/page` |
| Bean 접두사 | `Jri*`, `jri*` |

---

## 1. company-platform 통합 방법

### 1-1. settings.gradle 수정 (root)

```groovy
// 기존
rootProject.name = 'company-platform'

include 'core'
include 'module-user'

// ← 추가
include 'module-jri'
```

### 1-2. root build.gradle 확인

root `build.gradle` 에 `subprojects` 블록이 있다면, `module-jri` 가 자동으로 포함됩니다.  
별도 설정이 필요 없습니다.

```groovy
subprojects {
    apply plugin: 'java'
    apply plugin: 'org.springframework.boot'
    apply plugin: 'io.spring.dependency-management'

    // ... 공통 설정
}
```

만약 `subprojects` 블록이 **없고** 각 모듈별로 독립 설정이라면, `module-jri/build.gradle` 에 이미 필요한 설정이 모두 포함되어 있습니다.

### 1-3. core 모듈 Component Scan 확인

core 모듈의 `@SpringBootApplication` 이 `com.company` 패키지 하위를 스캔하는지 확인합니다:

```java
// core: Application 클래스
@SpringBootApplication(scanBasePackages = "com.company")
public class CompanyPlatformApplication {
    public static void main(String[] args) {
        SpringApplication.run(CompanyPlatformApplication.class, args);
    }
}
```

> **IMPORTANT**: `scanBasePackages = "com.company"` 설정이 있으면  
> `com.company.module.jri` 패키지가 자동으로 스캔됩니다.  
> **Core 소스 수정이 필요 없습니다.**

### 1-4. JPA Entity Scan 범위 확인

core에 `@EntityScan` 또는 `@EnableJpaRepositories`가 명시적으로 있다면 범위 추가:

```java
// 이미 com.company 하위를 스캔하면 수정 불필요
@EntityScan("com.company")
@EnableJpaRepositories("com.company")
```

---

## 2. DB 마이그레이션

### 2-1. 테이블 수동 생성 (JPA DDL 자동 비활성화인 경우)

```bash
mysql -u {user} -p {database} < module-jri/src/main/resources/db/migration/V1__mod_jri_init_schema.sql
```

### 2-2. Flyway 사용 시

`V1__mod_jri_init_schema.sql` 파일이 `db/migration/` 경로에 있으므로 Flyway가 자동 감지합니다.

---

## 3. API 엔드포인트

| Method | URL | 설명 |
|--------|-----|------|
| GET | `/jri-api/health` | 모듈 헬스 체크 |
| GET | `/jri-api/page` | 프론트엔드 메인 페이지 |
| POST | `/jri-api/inspections` | 검사 결과 저장 |
| GET | `/jri-api/inspections?page=0&size=20` | 검사 목록 조회 |
| GET | `/jri-api/inspections/{id}` | 검사 단건 조회 |
| GET | `/jri-api/inspections/search?type=indBcd&keyword=xxx` | 바코드/LOT/자재코드 검색 |
| DELETE | `/jri-api/inspections/{id}` | 검사 삭제 |
| DELETE | `/jri-api/inspections` | 전체 삭제 |

---

## 4. 디렉토리 구조

```
module-jri/
├── build.gradle                                         # 모듈 빌드 설정
├── src/main/
│   ├── java/com/company/module/jri/
│   │   ├── config/
│   │   │   └── JriWebConfig.java                       # CORS, 정적 리소스, ObjectMapper
│   │   ├── controller/
│   │   │   ├── JriInspectionApiController.java         # REST API (/jri-api/inspections)
│   │   │   ├── JriHealthController.java                # Health Check (/jri-api/health)
│   │   │   ├── JriPageController.java                  # 페이지 라우팅 (/jri-api/page)
│   │   │   └── JriExceptionHandler.java                # 모듈 전용 예외 처리
│   │   ├── domain/
│   │   │   └── JriInspection.java                      # 검사 엔티티 (MOD_JRI_INSPECTION)
│   │   ├── dto/
│   │   │   ├── JriInspectionSaveRequest.java           # 저장 요청 DTO
│   │   │   └── JriInspectionResponse.java              # 응답 DTO
│   │   ├── repository/
│   │   │   └── JriInspectionRepository.java            # JPA Repository
│   │   └── service/
│   │       └── JriInspectionService.java               # 비즈니스 로직
│   └── resources/
│       ├── application-jri.yml                          # 모듈 설정 참조
│       ├── db/migration/
│       │   └── V1__mod_jri_init_schema.sql             # DB 스키마
│       ├── static/jri/
│       │   ├── css/style.css                            # 스타일시트
│       │   └── js/app.js                                # 프론트엔드 로직
│       └── templates/jri/
│           └── index.html                               # Thymeleaf 메인 페이지
└── src/test/java/com/company/module/jri/
    ├── JriHealthControllerTest.java                     # Health API 테스트
    └── JriInspectionRepositoryTest.java                 # Repository 테스트
```

---

## 5. 설계 원칙 (Core 충돌 방지)

| 항목 | 원본 (독립 앱) | 모듈 (company-platform) | 충돌 방지 |
|------|----------------|------------------------|-----------|
| 패키지 | `com.jumboroll.inspector` | `com.company.module.jri` | 독립 네임스페이스 |
| Context Path | `/jri` (서블릿) | 없음 (API Prefix로 분리) | URL 충돌 방지 |
| API Prefix | `/api/inspections` | `/jri-api/inspections` | 다른 모듈과 분리 |
| DB Table | `jri_inspection` | `MOD_JRI_INSPECTION` | 테이블 충돌 방지 |
| 예외 처리 | `@RestControllerAdvice(basePackages = "com.jumboroll.inspector")` | `@RestControllerAdvice(basePackages = "com.company.module.jri")` | 패키지 한정 |
| Bean 이름 | `jriObjectMapper` | `jriObjectMapper` | @Qualifier 사용 |
| 정적 리소스 | `/static/**` | `/jri-static/**` | 경로 분리 |
| Thymeleaf | `templates/index.html` | `templates/jri/index.html` | 서브 디렉토리 |
| @Transactional | Service 계층 | Service 계층 | 동일 패턴 |
| Spring Security | 독립 앱 | Core에서 제공 | Core 수정 없음 |

---

## 6. Spring Security 연동

Core의 Spring Security 설정에서 `/jri-api/**` 경로 접근 허용이 필요한 경우:

**방법 A - Core에서 permitAll 설정 (Core 수정 시)**
```java
http.authorizeHttpRequests(auth -> auth
    .requestMatchers("/jri-api/health").permitAll()
    .requestMatchers("/jri-api/**").authenticated()
    // ...
);
```

**방법 B - Core 수정 없이 사용 (인증 필요)**
- 기존 Core 보안 설정이 `/**` 패턴으로 인증 처리 시, `/jri-api/**` 도 자동 적용
- 프론트엔드에서 인증 토큰을 API 호출에 포함해야 함

---

## 7. Nginx 연동 (운영 환경)

```nginx
# /jri-api → Spring Boot (company-platform)
location /jri-api {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# /jri-static → 정적 리소스
location /jri-static {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_cache_valid 200 1h;
    expires 1h;
}
```

---

## 8. 로깅 설정 (core application.yml에 추가)

```yaml
logging:
  level:
    com.company.module.jri: DEBUG
```

---

## 변경 이력

| 버전 | 날짜 | 내용 |
|------|------|------|
| 5.0.0 | 2026-03-03 | company-platform 멀티 모듈 구조로 변환 |
