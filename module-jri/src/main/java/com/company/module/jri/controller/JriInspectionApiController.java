package com.company.module.jri.controller;

import com.company.module.jri.dto.JriInspectionResponse;
import com.company.module.jri.dto.JriInspectionSaveRequest;
import com.company.module.jri.service.JriInspectionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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

    /**
     * 검사 결과 저장
     * POST /jri-api/inspections
     */
    @PostMapping
    public ResponseEntity<JriInspectionResponse> saveInspection(
            @Valid @RequestBody JriInspectionSaveRequest request) {
        JriInspectionResponse response = inspectionService.saveInspection(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
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
     * 검사 결과 목록 조회 (페이징)
     * GET /jri-api/inspections?page=0&size=20
     */
    @GetMapping
    public ResponseEntity<Page<JriInspectionResponse>> listInspections(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 100));
        Page<JriInspectionResponse> result = inspectionService.listInspections(pageable);
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
