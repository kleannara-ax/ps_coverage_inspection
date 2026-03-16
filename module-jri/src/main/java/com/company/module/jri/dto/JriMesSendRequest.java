package com.company.module.jri.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

/**
 * MES 결과 전송 요청 DTO
 *
 * <p>프론트엔드에서 DB 저장 완료 후 자동으로 호출됩니다.
 * <p>MES 연동 규격:
 * <ul>
 *   <li>IND_BCD  - 개별바코드 (string)</li>
 *   <li>ResultData - 커버리지 결과 값 (ppm 단위, 숫자)</li>
 * </ul>
 *
 * <pre>
 *   {
 *     "IND_BCD": "26228J0039",
 *     "ResultData": 265.30
 *   }
 * </pre>
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JriMesSendRequest {

    /** 개별 바코드 */
    @JsonProperty("IND_BCD")
    private String indBcd;

    /** 커버리지 결과 값 (ppm 단위) */
    @JsonProperty("ResultData")
    private Double resultData;
}
