package com.company.module.jri.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 점보롤 지분 검사 결과 응답 DTO
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JriInspectionResponse {

    private String id;
    private Integer seq;
    private String inspItemGrpCd;
    private String matnr;
    private String matnrNm;
    private String werks;
    private LocalDateTime msrmDate;
    private Integer prcSeqno;
    private String lotnr;
    private String indBcd;
    private String indBcdSeq;
    private LocalDateTime inspectedAt;
    private Integer thresholdMax;
    private Integer totalCount;
    private BigDecimal coverageRatio;
    private Integer densityCount;
    private BigDecimal densityRatio;
    private BigDecimal sizeUniformityScore;
    private BigDecimal distributionUniformityScore;
    private BigDecimal meanSize;
    private BigDecimal stdSize;
    private Integer autoCount;
    private Integer manualCount;
    private Integer removedAutoCount;

    // 크기별 버킷
    private Integer bucketUpTo3;
    private Integer bucketUpTo5;
    private Integer bucketUpTo7;
    private Integer bucketOver7;

    // 공간 분포
    private Integer quadrantTopLeft;
    private Integer quadrantTopRight;
    private Integer quadrantBottomLeft;
    private Integer quadrantBottomRight;

    private Long objectPixelCount;
    private Long totalPixels;
    private Integer manualAddedCount;
    private Integer manualRemovedCount;
    private String originalImagePath;
    private String originalImageName;
    private String originalImageDir;
    private String resultImagePath;
    private String resultImageName;
    private String resultImageDir;
    private String operatorId;
    private String operatorNm;
    private String deviceId;
    private String status;

    /** INSERT / UPDATE 구분 (true = 기존 레코드 갱신) */
    private Boolean isUpdate;
}
