package com.company.module.jri.dto;

import lombok.*;

/**
 * MES 결과 전송 응답 DTO
 */
@Getter
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class JriMesSendResponse {

    private boolean success;
    private String message;
    private String transmissionId;
    private String timestamp;

    public static JriMesSendResponse success(String message, String transmissionId, String timestamp) {
        return JriMesSendResponse.builder()
                .success(true)
                .message(message)
                .transmissionId(transmissionId)
                .timestamp(timestamp)
                .build();
    }

    public static JriMesSendResponse fail(String message, String transmissionId, String timestamp) {
        return JriMesSendResponse.builder()
                .success(false)
                .message(message)
                .transmissionId(transmissionId)
                .timestamp(timestamp)
                .build();
    }
}
