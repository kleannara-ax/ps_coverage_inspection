package com.company.module.jri.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 점보롤 지분 검사 결과 엔티티
 *
 * <p>Table: MOD_JRI_INSPECTION
 * <p>PK: id (UUID, VARCHAR(36))
 * <p>패키지: com.company.module.jri.domain
 */
@Entity
@Table(name = "MOD_JRI_INSPECTION")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JriInspection {

    /** 레코드 ID (UUID) */
    @Id
    @Column(name = "ID", length = 36, nullable = false)
    private String id;

    /** seq no. (자동 증가) */
    @Column(name = "SEQ", nullable = false)
    private Integer seq;

    /** 검사항목그룹코드 */
    @Column(name = "INSP_ITEM_GRP_CD", length = 100)
    private String inspItemGrpCd;

    /** 자재코드 */
    @Column(name = "MATNR", length = 100)
    private String matnr;

    /** 플랜트 */
    @Column(name = "WERKS", length = 100)
    private String werks;

    /** 측정일시 (이미지 업로드 시 자동 기록) */
    @Column(name = "MSRM_DATE")
    private LocalDateTime msrmDate;

    /** 처리순번 */
    @Column(name = "PRC_SEQNO")
    private Integer prcSeqno;

    /** 점보롤 LOT 번호 */
    @Column(name = "LOTNR", length = 200)
    private String lotnr;

    /** 개별 바코드 */
    @Column(name = "IND_BCD", length = 200)
    private String indBcd;

    /** 바코드 검사 차수 (자동 증가) */
    @Column(name = "IND_BCD_SEQ", length = 100)
    private String indBcdSeq;

    /** 실제 검사 시각 */
    @Column(name = "INSPECTED_AT")
    private LocalDateTime inspectedAt;

    /** 임계값 상한 */
    @Column(name = "THRESHOLD_MAX")
    private Integer thresholdMax;

    /** 인식된 지분 총 개수 */
    @Column(name = "TOTAL_COUNT")
    private Integer totalCount;

    /** 지분 면적 비율 (%) */
    @Column(name = "COVERAGE_RATIO", precision = 12, scale = 6)
    private BigDecimal coverageRatio;

    /** 밀도 기준 지분 개수 */
    @Column(name = "DENSITY_COUNT")
    private Integer densityCount;

    /** 밀도 기준 지분 비율 (%) */
    @Column(name = "DENSITY_RATIO", precision = 8, scale = 4)
    private BigDecimal densityRatio;

    /** 크기 균일도 점수 */
    @Column(name = "SIZE_UNIFORMITY_SCORE", precision = 8, scale = 4)
    private BigDecimal sizeUniformityScore;

    /** 분포 균등도 점수 */
    @Column(name = "DISTRIBUTION_UNIFORMITY_SCORE", precision = 8, scale = 4)
    private BigDecimal distributionUniformityScore;

    /** 평균 면적 */
    @Column(name = "MEAN_SIZE", precision = 12, scale = 4)
    private BigDecimal meanSize;

    /** 표준편차 */
    @Column(name = "STD_SIZE", precision = 12, scale = 4)
    private BigDecimal stdSize;

    /** 자동 검출 개수 */
    @Column(name = "AUTO_COUNT")
    private Integer autoCount;

    /** 수동 추가 개수 */
    @Column(name = "MANUAL_COUNT")
    private Integer manualCount;

    /** 자동 제외 개수 */
    @Column(name = "REMOVED_AUTO_COUNT")
    private Integer removedAutoCount;

    /** 크기별 버킷: 3px 이하 */
    @Column(name = "BUCKET_UP_TO_3")
    private Integer bucketUpTo3;

    /** 크기별 버킷: 5px 이하 */
    @Column(name = "BUCKET_UP_TO_5")
    private Integer bucketUpTo5;

    /** 크기별 버킷: 7px 이하 */
    @Column(name = "BUCKET_UP_TO_7")
    private Integer bucketUpTo7;

    /** 크기별 버킷: 7px 초과 */
    @Column(name = "BUCKET_OVER_7")
    private Integer bucketOver7;

    /** 좌상단 개수 */
    @Column(name = "QUADRANT_TOP_LEFT")
    private Integer quadrantTopLeft;

    /** 우상단 개수 */
    @Column(name = "QUADRANT_TOP_RIGHT")
    private Integer quadrantTopRight;

    /** 좌하단 개수 */
    @Column(name = "QUADRANT_BOTTOM_LEFT")
    private Integer quadrantBottomLeft;

    /** 우하단 개수 */
    @Column(name = "QUADRANT_BOTTOM_RIGHT")
    private Integer quadrantBottomRight;

    /** 지분 픽셀 합계 */
    @Column(name = "OBJECT_PIXEL_COUNT")
    private Long objectPixelCount;

    /** 전체 픽셀 수 */
    @Column(name = "TOTAL_PIXELS")
    private Long totalPixels;

    /** 수동 추가 개수 */
    @Column(name = "MANUAL_ADDED_COUNT")
    private Integer manualAddedCount;

    /** 수동 제거 개수 */
    @Column(name = "MANUAL_REMOVED_COUNT")
    private Integer manualRemovedCount;

    /** 원본 이미지 경로 */
    @Column(name = "ORIGINAL_IMAGE_PATH", length = 1000)
    private String originalImagePath;

    /** 결과 이미지 경로 */
    @Column(name = "RESULT_IMAGE_PATH", length = 1000)
    private String resultImagePath;

    /** 검사자 ID */
    @Column(name = "OPERATOR_ID", length = 200)
    private String operatorId;

    /** 장비 ID */
    @Column(name = "DEVICE_ID", length = 200)
    private String deviceId;

    /** 검사 상태 */
    @Column(name = "STATUS", length = 100)
    private String status;
}
