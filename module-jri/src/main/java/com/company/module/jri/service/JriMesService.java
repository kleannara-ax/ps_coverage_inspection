package com.company.module.jri.service;

import com.company.module.jri.dto.JriMesSendRequest;
import com.company.module.jri.dto.JriMesSendResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.UUID;

/**
 * MES 결과 전송 서비스
 *
 * <p>DB 저장 완료 후 프론트엔드에서 자동 호출하여
 * 검사 결과를 MES(Manufacturing Execution System)에 전달합니다.
 *
 * <p>전송 규격:
 * <pre>
 *   POST {mesEndpointUrl}
 *   Content-Type: application/json
 *   Body: { "IND_BCD": "26228J0039", "ResultData": 265.30 }
 * </pre>
 *
 * <p>mesEndpointUrl이 설정되지 않으면 mock 모드로 동작합니다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class JriMesService {

    /**
     * MES 서버 엔드포인트 URL
     * <p>application.yml 예시:
     * <pre>
     *   jri:
     *     mes:
     *       endpoint-url: http://mes-server.company.com/api/inspection/result
     * </pre>
     * <p>미설정 시 빈 문자열 → mock 모드로 동작
     */
    @Value("${jri.mes.endpoint-url:}")
    private String mesEndpointUrl;

    private final RestTemplate restTemplate;

    /**
     * MES에 검사 결과를 전송합니다.
     *
     * @param request IND_BCD(개별바코드) + ResultData(커버리지 ppm 값)
     * @return 전송 결과
     */
    public JriMesSendResponse sendResult(JriMesSendRequest request) {
        String indBcd = request.getIndBcd();
        Double resultData = request.getResultData();

        log.info("[MES] 결과 전송 요청 - IND_BCD: {}, ResultData: {} ppm",
                indBcd, resultData);

        String transmissionId = UUID.randomUUID().toString();
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);

        // MES 엔드포인트가 설정되어 있으면 실제 전송
        if (mesEndpointUrl != null && !mesEndpointUrl.isBlank()) {
            return sendToMesServer(request, transmissionId, timestamp);
        }

        // Mock 모드: 로그만 기록하고 성공 반환
        log.info("[MES][MOCK] 전송 성공 (mock) - IND_BCD: {}, ResultData: {} ppm, transmissionId: {}",
                indBcd, resultData, transmissionId);
        return JriMesSendResponse.builder()
                .success(true)
                .message("MES 전송 완료 (IND_BCD: " + indBcd + ", ResultData: " + resultData + ") [mock 모드]")
                .transmissionId(transmissionId)
                .timestamp(timestamp)
                .build();
    }

    /**
     * 실제 MES 서버로 HTTP POST 전송
     */
    private JriMesSendResponse sendToMesServer(JriMesSendRequest request,
                                                String transmissionId,
                                                String timestamp) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            // MES 전송 페이로드: IND_BCD + ResultData (커버리지 ppm 값)
            Map<String, Object> payload = Map.of(
                    "IND_BCD", request.getIndBcd(),
                    "ResultData", request.getResultData()
            );

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);

            log.info("[MES] 실제 전송 시작 - URL: {}, IND_BCD: {}, ResultData: {}",
                    mesEndpointUrl, request.getIndBcd(), request.getResultData());
            ResponseEntity<String> response = restTemplate.exchange(
                    mesEndpointUrl, HttpMethod.POST, entity, String.class);

            boolean success = response.getStatusCode().is2xxSuccessful();

            log.info("[MES] 전송 {} - IND_BCD: {}, ResultData: {}, status: {}, transmissionId: {}",
                    success ? "성공" : "실패", request.getIndBcd(), request.getResultData(),
                    response.getStatusCode(), transmissionId);

            return JriMesSendResponse.builder()
                    .success(success)
                    .message(success
                            ? "MES 전송 완료 (IND_BCD: " + request.getIndBcd() + ", ResultData: " + request.getResultData() + ")"
                            : "MES 전송 실패 - HTTP " + response.getStatusCode())
                    .transmissionId(transmissionId)
                    .timestamp(timestamp)
                    .build();

        } catch (Exception e) {
            log.error("[MES] 전송 오류 - IND_BCD: {}, error: {}", request.getIndBcd(), e.getMessage(), e);
            return JriMesSendResponse.builder()
                    .success(false)
                    .message("MES 전송 오류: " + e.getMessage())
                    .transmissionId(transmissionId)
                    .timestamp(timestamp)
                    .build();
        }
    }
}
