package com.company.module.jri.controller;

import com.company.core.common.response.ApiResponse;
import com.company.module.jri.dto.JriMesSendRequest;
import com.company.module.jri.dto.JriMesSendResponse;
import com.company.module.jri.service.JriMesService;
import jakarta.validation.Valid;
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
     * @param request IND_BCD(개별바코드) + ResultData(커버리지 ppm 값)
     * @return ApiResponse 래핑된 전송 결과
     */
    @PostMapping("/send-result")
    public ResponseEntity<ApiResponse<JriMesSendResponse>> sendResult(
            @Valid @RequestBody JriMesSendRequest request) {
        JriMesSendResponse response = mesService.sendResult(request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
