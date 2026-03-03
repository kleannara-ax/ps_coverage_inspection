package com.company.module.jri.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * 점보롤 지분 검사 모듈 Web MVC 설정
 *
 * <p>/jri-api/** 경로에 대한 CORS 설정
 * <p>정적 리소스 핸들링
 * <p>Jackson ObjectMapper 빈 (jriObjectMapper 이름으로 등록, 충돌 방지)
 *
 * <p>Core 모듈의 WebMvcConfigurer와 충돌하지 않도록 독립적으로 구성합니다.
 * <p>Spring은 여러 WebMvcConfigurer를 자동 merge하므로 안전합니다.
 */
@Configuration
public class JriWebConfig implements WebMvcConfigurer {

    /**
     * /jri-api/** 경로에 대한 CORS 허용
     */
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/jri-api/**")
                .allowedOriginPatterns("*")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600);
    }

    /**
     * 정적 리소스 핸들링
     * /jri-static/** → classpath:/static/jri/
     */
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/jri-static/**")
                .addResourceLocations("classpath:/static/jri/")
                .setCachePeriod(3600);
    }

    /**
     * JRI 모듈 전용 ObjectMapper.
     *
     * <p>Core의 기본 ObjectMapper("objectMapper" 빈)와 충돌하지 않도록
     * Primary 지정 없이 별도 빈 이름으로 등록합니다.
     * <p>필요 시 @Qualifier("jriObjectMapper")로 주입하세요.
     */
    @Bean("jriObjectMapper")
    public ObjectMapper jriObjectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        return mapper;
    }
}
