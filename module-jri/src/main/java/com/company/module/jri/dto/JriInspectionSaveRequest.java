package com.company.module.jri.dto;

import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 점보롤 지분 검사 결과 저장 요청 DTO
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JriInspectionSaveRequest {

    /** 검사항목그룹코드 */
    @Size(max = 100)
    private String inspItemGrpCd;

    /** 자재코드 */
    @Size(max = 100)
    private String matnr;

    /** 자재명(품명) */
    @Size(max = 500)
    private String matnrNm;

    /** 플랜트 */
    @Size(max = 100)
    private String werks;

    /** 측정일시 */
    private LocalDateTime msrmDate;

    /** 처리순번 */
    private Integer prcSeqno;

    /** 점보롤 LOT 번호 */
    @Size(max = 200)
    private String lotnr;

    /** 개별 바코드 */
    @Size(max = 200)
    private String indBcd;

    /** 바코드 검사 차수 */
    @Size(max = 100)
    private String indBcdSeq;

    /** 실제 검사 시각 */
    private LocalDateTime inspectedAt;

    /** 임계값 상한 (0~255) */
    @Min(0)
    @Max(255)
    private Integer thresholdMax;

    /** 인식된 지분 총 개수 */
    @Min(0)
    private Integer totalCount;

    /** 지분 면적 비율 (%) */
    private BigDecimal coverageRatio;

    /** 밀도 기준 지분 개수 */
    private Integer densityCount;

    /** 밀도 기준 지분 비율 (%) */
    private BigDecimal densityRatio;

    /** 크기 균일도 점수 */
    private BigDecimal sizeUniformityScore;

    /** 분포 균등도 점수 */
    private BigDecimal distributionUniformityScore;

    /** 평균 면적 */
    private BigDecimal meanSize;

    /** 표준편차 */
    private BigDecimal stdSize;

    /** 자동 검출 개수 */
    @Min(0)
    private Integer autoCount;

    /** 수동 추가 개수 */
    @Min(0)
    private Integer manualCount;

    /** 자동 제외 개수 */
    @Min(0)
    private Integer removedAutoCount;

    /** 크기별 버킷 */
    private Integer bucketUpTo3;
    private Integer bucketUpTo5;
    private Integer bucketUpTo7;
    private Integer bucketOver7;

    /** 공간 분포 */
    private Integer quadrantTopLeft;
    private Integer quadrantTopRight;
    private Integer quadrantBottomLeft;
    private Integer quadrantBottomRight;

    /** 지분 픽셀 합계 */
    private Long objectPixelCount;

    /** 전체 픽셀 수 */
    private Long totalPixels;

    /** 수동 추가 개수 */
    @Min(0)
    private Integer manualAddedCount;

    /** 수동 제거 개수 */
    @Min(0)
    private Integer manualRemovedCount;

    /** 원본 이미지 경로 */
    @Size(max = 1000)
    private String originalImagePath;

    /** 결과 이미지 경로 */
    @Size(max = 1000)
    private String resultImagePath;

    /** 검사자 ID */
    @Size(max = 200)
    private String operatorId;

    /** 검사자명 */
    @Size(max = 200)
    private String operatorNm;

    /** 장비 ID */
    @Size(max = 200)
    private String deviceId;

    /** 검사 상태 */
    @Size(max = 100)
    private String status;
}
