package com.company.module.jri.controller;

import com.company.core.common.response.ApiResponse;
import com.company.module.jri.dto.JriInspectionResponse;
import com.company.module.jri.dto.JriInspectionSaveRequest;
import com.company.module.jri.service.JriInspectionService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

/**
 * 점보롤 지분 검사 REST API 컨트롤러
 *
 * <p>URL API Prefix: /jri-api/inspections
 * <p>응답은 ApiResponse&lt;T&gt;로 감싸서 반환
 * <p>쓰기 API: @PreAuthorize("hasRole('ADMIN')") 적용
 */
@Slf4j
@RestController
@RequestMapping("/jri-api/inspections")
@RequiredArgsConstructor
public class JriInspectionApiController {

    private final JriInspectionService inspectionService;
    @Qualifier("jriObjectMapper")
    private final ObjectMapper objectMapper;

    /**
     * 검사 결과 저장 (JSON)
     */
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ApiResponse<JriInspectionResponse>> saveInspection(
            @Valid @RequestBody JriInspectionSaveRequest request) {
        return ResponseEntity.ok(ApiResponse.created(
                inspectionService.saveInspection(request, null, null)));
    }

    /**
     * 검사 결과 저장 (Multipart: 이미지 바이너리 직접 업로드)
     */
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<JriInspectionResponse>> saveInspectionMultipart(
            @RequestPart("metadata") String metadata,
            @RequestPart(value = "originalImage", required = false) MultipartFile originalImage,
            @RequestPart(value = "resultImage", required = false) MultipartFile resultImage) {
        try {
            JriInspectionSaveRequest request = objectMapper.readValue(metadata, JriInspectionSaveRequest.class);
            return ResponseEntity.ok(ApiResponse.created(
                    inspectionService.saveInspection(request, originalImage, resultImage)));
        } catch (Exception e) {
            log.error("Multipart 검사 결과 저장 실패", e);
            throw new RuntimeException("검사 결과 저장 중 오류: " + e.getMessage());
        }
    }

    /**
     * 검사 결과 단건 조회
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<JriInspectionResponse>> getInspection(@PathVariable("id") Long id) {
        return ResponseEntity.ok(ApiResponse.success(inspectionService.getInspection(id)));
    }

    /**
     * 검사 결과 목록 조회 (페이징 + 필터)
     */
    @GetMapping
    public ResponseEntity<ApiResponse<Page<JriInspectionResponse>>> listInspections(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo,
            @RequestParam(required = false) String indBcd) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 100));
        return ResponseEntity.ok(ApiResponse.success(
                inspectionService.searchInspections(indBcd, dateFrom, dateTo, pageable)));
    }

    /**
     * 검색
     */
    @GetMapping("/search")
    public ResponseEntity<ApiResponse<Page<JriInspectionResponse>>> searchInspections(
            @RequestParam(defaultValue = "indBcd") String type,
            @RequestParam String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 100));
        Page<JriInspectionResponse> result = switch (type.toLowerCase()) {
            case "lotnr" -> inspectionService.searchByLotnr(keyword, pageable);
            case "matnr" -> inspectionService.searchByMatnr(keyword, pageable);
            default -> inspectionService.searchByIndBcd(keyword, pageable);
        };
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    /**
     * 기존 레코드 존재 여부 확인 (Upsert 사전 체크)
     */
    @GetMapping("/check-exists")
    public ResponseEntity<ApiResponse<Map<String, Object>>> checkExists(
            @RequestParam(required = false) String matnr,
            @RequestParam(required = false) String lotnr,
            @RequestParam(required = false) String indBcd) {
        if (matnr == null || lotnr == null || indBcd == null
                || matnr.isBlank() || lotnr.isBlank() || indBcd.isBlank()) {
            return ResponseEntity.ok(ApiResponse.success(Map.of("exists", false)));
        }
        return ResponseEntity.ok(ApiResponse.success(
                inspectionService.checkExists(matnr, lotnr, indBcd)));
    }

    /**
     * 검사 결과 삭제
     */
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, String>>> deleteInspection(@PathVariable("id") Long id) {
        inspectionService.deleteInspection(id);
        return ResponseEntity.ok(ApiResponse.success(Map.of("message", "삭제되었습니다.", "id", String.valueOf(id))));
    }

    /**
     * 전체 삭제
     */
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping
    public ResponseEntity<ApiResponse<Map<String, String>>> deleteAllInspections() {
        inspectionService.deleteAllInspections();
        return ResponseEntity.ok(ApiResponse.success(Map.of("message", "전체 검사 이력이 삭제되었습니다.")));
    }
}
