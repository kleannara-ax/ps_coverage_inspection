package com.company.module.jri.dto;

import lombok.*;

/**
 * MES 결과 전송 응답 DTO
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JriMesSendResponse {

    /** 전송 성공 여부 */
    private boolean success;

    /** 결과 메시지 */
    private String message;

    /** 전송 ID (추적용) */
    private String transmissionId;

    /** 전송 시각 (ISO 8601) */
    private String timestamp;
}
