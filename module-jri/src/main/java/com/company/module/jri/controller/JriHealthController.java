package com.company.module.jri.controller;

import com.company.core.common.response.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * 점보롤 지분 검사 모듈 Health Check API
 *
 * <p>GET /jri-api/health
 */
@Slf4j
@RestController
@RequestMapping("/jri-api/health")
public class JriHealthController {

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> healthCheck() {
        return ResponseEntity.ok(ApiResponse.success(Map.of(
                "status", "ok",
                "module", "module-jri",
                "application", "JumboRollShareInspector",
                "version", "5.0.0",
                "timestamp", LocalDateTime.now().toString()
        )));
    }
}
