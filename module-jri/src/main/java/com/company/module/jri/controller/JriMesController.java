package com.company.module.jri.controller;

import com.company.module.jri.dto.JriMesSendRequest;
import com.company.module.jri.dto.JriMesSendResponse;
import com.company.module.jri.service.JriMesService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * MES 결과 전송 REST API 컨트롤러
 *
 * <p>프론트엔드에서 DB 저장 완료 후 자동으로 호출하여
 * 검사 결과를 MES에 전달합니다.
 *
 * <p>전송 규격:
 * <pre>
 *   POST /jri-api/mes/send-result
 *   Content-Type: application/json
 *   Body: {
 *     "IND_BCD": "26228J0039",
 *     "ResultData": 265.30
 *   }
 * </pre>
 *
 * <p>파라미터:
 * <ul>
 *   <li>IND_BCD (string) - 개별바코드</li>
 *   <li>ResultData (number) - 커버리지 결과 값 (ppm 단위)</li>
 * </ul>
 */
@Slf4j
@RestController
@RequestMapping("/jri-api/mes")
@RequiredArgsConstructor
public class JriMesController {

    private final JriMesService mesService;

    /**
     * MES에 검사 결과 전송
     *
     * <p>DB 저장이 성공한 뒤 프론트엔드에서 자동으로 호출됩니다.
     *
     * @param request IND_BCD(개별바코드) + ResultData(커버리지 ppm 값)
     * @return 전송 결과 (success, message, transmissionId, timestamp)
     */
    @PostMapping("/send-result")
    public ResponseEntity<JriMesSendResponse> sendResult(@RequestBody JriMesSendRequest request) {
        if (request.getIndBcd() == null || request.getIndBcd().isBlank()) {
            return ResponseEntity.badRequest().body(
                    JriMesSendResponse.builder()
                            .success(false)
                            .message("개별바코드(IND_BCD)가 누락되었습니다.")
                            .build()
            );
        }
        if (request.getResultData() == null) {
            return ResponseEntity.badRequest().body(
                    JriMesSendResponse.builder()
                            .success(false)
                            .message("결과 데이터(ResultData)가 누락되었습니다.")
                            .build()
            );
        }

        JriMesSendResponse response = mesService.sendResult(request);
        return ResponseEntity.ok(response);
    }
}
