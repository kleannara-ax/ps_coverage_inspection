package com.company.module.jri.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

/**
 * 점보롤 지분 검사 프론트엔드 페이지 라우팅
 *
 * <p>/jri-api/page/** → index.html (Thymeleaf 렌더링)
 * <p>context-path 없이 사용하므로 Prefix로 분리
 */
@Controller
@RequestMapping("/jri-api/page")
public class JriPageController {

    /**
     * 메인 페이지 (검사 도구)
     * GET /jri-api/page
     */
    @GetMapping({"", "/"})
    public String index() {
        return "jri/index";
    }

    /**
     * SPA catch-all: 프론트엔드 경로를 index.html로 포워딩
     */
    @GetMapping({
            "/inspection",
            "/inspection/**",
            "/history",
            "/history/**"
    })
    public String spaForward() {
        return "jri/index";
    }
}
