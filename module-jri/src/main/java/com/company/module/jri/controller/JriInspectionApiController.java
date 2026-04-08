package com.company.module.jri.controller;

import com.company.module.jri.dto.JriInspectionResponse;
import com.company.module.jri.dto.JriInspectionSaveRequest;
import com.company.module.jri.service.JriInspectionService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Map;

/**
 * 점보롤 지분 검사 REST API 컨트롤러
 *
 * <p>URL API Prefix: /jri-api/**
 * <p>Core 보안 구조와 충돌하지 않도록 독립 Prefix 사용
 *
 * <p>예: POST /jri-api/inspections
 */
@Slf4j
@RestController
@RequestMapping("/jri-api/inspections")
@RequiredArgsConstructor
public class JriInspectionApiController {

    private final JriInspectionService inspectionService;
    private final ObjectMapper objectMapper;

    /**
     * 검사 결과 저장 (JSON)
     * POST /jri-api/inspections (Content-Type: application/json)
     */
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<JriInspectionResponse> saveInspection(
            @Valid @RequestBody JriInspectionSaveRequest request) {
        JriInspectionResponse response = inspectionService.saveInspection(request, null, null);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * 검사 결과 저장 (Multipart: 이미지 바이너리 직접 업로드)
     * POST /jri-api/inspections (Content-Type: multipart/form-data)
     *
     * <p>클라이언트에서 Canvas를 JPEG Blob으로 변환 후 FormData로 전송.
     * Base64-in-JSON 대비 ~30% 작은 페이로드, ~5-10배 빠른 인코딩.</p>
     *
     * @param metadata       검사 메타 정보 JSON 문자열
     * @param originalImage  검사 전 원본 이미지 (JPEG)
     * @param resultImage    검사 후 마킹 이미지 (JPEG)
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<JriInspectionResponse> saveInspectionMultipart(
            @RequestPart("metadata") String metadata,
            @RequestPart(value = "originalImage", required = false) MultipartFile originalImage,
            @RequestPart(value = "resultImage", required = false) MultipartFile resultImage) {
        try {
            JriInspectionSaveRequest request = objectMapper.readValue(metadata, JriInspectionSaveRequest.class);
            JriInspectionResponse response = inspectionService.saveInspection(request, originalImage, resultImage);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            log.error("Multipart 검사 결과 저장 실패", e);
            throw new RuntimeException("검사 결과 저장 중 오류가 발생했습니다: " + e.getMessage());
        }
    }

    /**
     * 검사 결과 단건 조회
     * GET /jri-api/inspections/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<JriInspectionResponse> getInspection(@PathVariable("id") String id) {
        JriInspectionResponse response = inspectionService.getInspection(id);
        return ResponseEntity.ok(response);
    }

    /**
     * 검사 결과 목록 조회 (페이징 + 필터)
     * GET /jri-api/inspections?page=0&size=20&dateFrom=2026-03-01&dateTo=2026-03-18&indBcd=xxx
     */
    @GetMapping
    public ResponseEntity<Page<JriInspectionResponse>> listInspections(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo,
            @RequestParam(required = false) String indBcd) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 100));
        Page<JriInspectionResponse> result = inspectionService.searchInspections(
                indBcd, dateFrom, dateTo, pageable);
        return ResponseEntity.ok(result);
    }

    /**
     * 검색
     * GET /jri-api/inspections/search?type=indBcd|lotnr|matnr&keyword=xxx&page=0&size=20
     */
    @GetMapping("/search")
    public ResponseEntity<Page<JriInspectionResponse>> searchInspections(
            @RequestParam(defaultValue = "indBcd") String type,
            @RequestParam String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 100));
        Page<JriInspectionResponse> result;

        switch (type.toLowerCase()) {
            case "lotnr":
                result = inspectionService.searchByLotnr(keyword, pageable);
                break;
            case "matnr":
                result = inspectionService.searchByMatnr(keyword, pageable);
                break;
            default:
                result = inspectionService.searchByIndBcd(keyword, pageable);
                break;
        }

        return ResponseEntity.ok(result);
    }

    /**
     * 기존 레코드 존재 여부 확인 (Upsert 사전 체크)
     * GET /jri-api/inspections/check-exists?matnr=xxx&lotnr=xxx&indBcd=xxx
     *
     * <p>존재 시 record 객체(id, seq, indBcdSeq, inspectedAt, coverageRatio, totalCount)를 함께 반환하여
     * 프론트엔드의 재검사 확인 팝업에서 현재 차수를 표시할 수 있도록 합니다.</p>
     */
    @GetMapping("/check-exists")
    public ResponseEntity<Map<String, Object>> checkExists(
            @RequestParam(required = false) String matnr,
            @RequestParam(required = false) String lotnr,
            @RequestParam(required = false) String indBcd) {
        if (matnr == null || lotnr == null || indBcd == null
                || matnr.isBlank() || lotnr.isBlank() || indBcd.isBlank()) {
            return ResponseEntity.ok(Map.of("exists", false));
        }
        return ResponseEntity.ok(
                inspectionService.checkExistsByMatnrAndLotnrAndIndBcd(matnr, lotnr, indBcd));
    }

    /**
     * 검사 결과 삭제
     * DELETE /jri-api/inspections/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteInspection(@PathVariable("id") String id) {
        inspectionService.deleteInspection(id);
        return ResponseEntity.ok(Map.of("message", "삭제되었습니다.", "id", id));
    }

    /**
     * 전체 삭제
     * DELETE /jri-api/inspections
     */
    @DeleteMapping
    public ResponseEntity<Map<String, String>> deleteAllInspections() {
        inspectionService.deleteAllInspections();
        return ResponseEntity.ok(Map.of("message", "전체 검사 이력이 삭제되었습니다."));
    }
}
