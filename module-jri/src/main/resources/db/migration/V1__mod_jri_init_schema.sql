-- ============================================================
-- module-jri : 점보롤 지분 검사 모듈 - 초기 스키마
-- DB Table Prefix: MOD_JRI_
-- MariaDB 10.11+
--
-- 실행 방법:
--   mysql -u {user} -p {database} < V1__mod_jri_init_schema.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS MOD_JRI_INSPECTION (
    ID                            VARCHAR(36)        NOT NULL PRIMARY KEY COMMENT '레코드 ID (UUID)',
    SEQ                           INT                NOT NULL             COMMENT 'seq no.',
    INSP_ITEM_GRP_CD              VARCHAR(100)       NULL                 COMMENT '검사항목그룹코드',
    MATNR                         VARCHAR(100)       NULL                 COMMENT '자재코드',
    MATNR_NM                      VARCHAR(500)       NULL                 COMMENT '자재명(품명)',
    WERKS                         VARCHAR(100)       NULL                 COMMENT '플랜트',
    MSRM_DATE                     DATETIME           NULL                 COMMENT '측정일시 (이미지 업로드 시 자동 기록)',
    PRC_SEQNO                     INT                NULL                 COMMENT '처리순번',
    LOTNR                         VARCHAR(200)       NULL                 COMMENT '점보롤 LOT 번호',
    IND_BCD                       VARCHAR(200)       NULL                 COMMENT '개별 바코드',
    IND_BCD_SEQ                   VARCHAR(100)       NULL                 COMMENT '바코드 검사 차수 (자동 증가)',
    INSPECTED_AT                  DATETIME           NULL                 COMMENT '실제 검사 시각',
    THRESHOLD_MAX                 INT                NULL                 COMMENT '임계값 상한',
    TOTAL_COUNT                   INT                NULL DEFAULT 0       COMMENT '인식된 지분 총 개수',
    COVERAGE_RATIO                DECIMAL(12,6)      NULL                 COMMENT '지분 면적 비율 (%)',
    DENSITY_COUNT                 INT                NULL                 COMMENT '밀도 기준 지분 개수',
    DENSITY_RATIO                 DECIMAL(8,4)       NULL                 COMMENT '밀도 기준 지분 비율 (%)',
    SIZE_UNIFORMITY_SCORE         DECIMAL(8,4)       NULL                 COMMENT '크기 균일도 점수',
    DISTRIBUTION_UNIFORMITY_SCORE DECIMAL(8,4)       NULL                 COMMENT '분포 균등도 점수',
    MEAN_SIZE                     DECIMAL(12,4)      NULL                 COMMENT '평균 면적',
    STD_SIZE                      DECIMAL(12,4)      NULL                 COMMENT '표준편차',
    AUTO_COUNT                    INT                NULL DEFAULT 0       COMMENT '자동 검출 개수',
    MANUAL_COUNT                  INT                NULL DEFAULT 0       COMMENT '수동 추가 개수',
    REMOVED_AUTO_COUNT            INT                NULL DEFAULT 0       COMMENT '자동 제외 개수',
    BUCKET_UP_TO_3                INT                NULL DEFAULT 0       COMMENT '≤3px',
    BUCKET_UP_TO_5                INT                NULL DEFAULT 0       COMMENT '≤5px',
    BUCKET_UP_TO_7                INT                NULL DEFAULT 0       COMMENT '≤7px',
    BUCKET_OVER_7                 INT                NULL DEFAULT 0       COMMENT '>7px',
    QUADRANT_TOP_LEFT             INT                NULL DEFAULT 0       COMMENT '좌상단 개수',
    QUADRANT_TOP_RIGHT            INT                NULL DEFAULT 0       COMMENT '우상단 개수',
    QUADRANT_BOTTOM_LEFT          INT                NULL DEFAULT 0       COMMENT '좌하단 개수',
    QUADRANT_BOTTOM_RIGHT         INT                NULL DEFAULT 0       COMMENT '우하단 개수',
    OBJECT_PIXEL_COUNT            BIGINT             NULL                 COMMENT '지분 픽셀 합계',
    TOTAL_PIXELS                  BIGINT             NULL                 COMMENT '전체 픽셀 수',
    MANUAL_ADDED_COUNT            INT                NULL DEFAULT 0       COMMENT '수동 추가 개수',
    MANUAL_REMOVED_COUNT          INT                NULL DEFAULT 0       COMMENT '수동 제거 개수',
    ORIGINAL_IMAGE_PATH           VARCHAR(1000)      NULL                 COMMENT '원본 이미지 경로',
    ORIGINAL_IMAGE_NAME           VARCHAR(500)       NULL                 COMMENT '원본 이미지 파일명',
    ORIGINAL_IMAGE_DIR            VARCHAR(1000)      NULL                 COMMENT '원본 이미지 저장 디렉토리',
    RESULT_IMAGE_PATH             VARCHAR(1000)      NULL                 COMMENT '결과 이미지 경로',
    RESULT_IMAGE_NAME             VARCHAR(500)       NULL                 COMMENT '결과 이미지 파일명',
    RESULT_IMAGE_DIR              VARCHAR(1000)      NULL                 COMMENT '결과 이미지 저장 디렉토리',
    OPERATOR_ID                   VARCHAR(200)       NULL                 COMMENT '검사자 ID',
    OPERATOR_NM                   VARCHAR(200)       NULL                 COMMENT '검사자명',
    DEVICE_ID                     VARCHAR(200)       NULL                 COMMENT '장비 ID',
    STATUS                        VARCHAR(100)       NULL                 COMMENT '검사 상태',

    INDEX IDX_MOD_JRI_INSP_IND_BCD    (IND_BCD),
    INDEX IDX_MOD_JRI_INSP_LOTNR      (LOTNR),
    INDEX IDX_MOD_JRI_INSP_MATNR      (MATNR),
    INDEX IDX_MOD_JRI_INSP_WERKS      (WERKS),
    INDEX IDX_MOD_JRI_INSP_MSRM_DATE  (MSRM_DATE DESC),
    INDEX IDX_MOD_JRI_INSP_INSPECTED  (INSPECTED_AT DESC),
    INDEX IDX_MOD_JRI_INSP_OPERATOR   (OPERATOR_ID),
    INDEX IDX_MOD_JRI_INSP_STATUS     (STATUS)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='[module-jri] 점보롤 지분 검사 결과';
