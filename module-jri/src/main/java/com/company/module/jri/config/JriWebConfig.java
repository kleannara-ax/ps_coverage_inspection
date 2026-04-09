package com.company.module.jri.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * 점보롤 지분 검사 모듈 Web MVC 설정
 *
 * <p>/jri-api/** 경로에 대한 CORS 설정
 * <p>이미지 업로드 경로 리소스 핸들링 (/uploads/**)
 * <p>Jackson ObjectMapper 빈 (jriObjectMapper)
 *
 * <p>Core 모듈의 WebMvcConfigurer와 충돌하지 않도록 독립적으로 구성합니다.
 * <p>Spring은 여러 WebMvcConfigurer를 자동 merge하므로 안전합니다.
 */
@Configuration
public class JriWebConfig implements WebMvcConfigurer {

    @Value("${jri.upload.dir:/data/upload/ps_cov_ins}")
    private String uploadDir;

    /**
     * /jri-api/** 경로에 대한 CORS 허용
     */
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/jri-api/**")
                .allowedOrigins("*")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS")
                .allowedHeaders("*")
                .maxAge(3600);
    }

    /**
     * 이미지 업로드 경로 리소스 핸들링
     * URL: /uploads/** → file:{uploadDir}/
     */
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String location = uploadDir.endsWith("/") ? uploadDir : uploadDir + "/";
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:" + location);
    }

    /**
     * JRI 모듈 전용 ObjectMapper (jriObjectMapper 이름으로 등록하여 core와 충돌 방지)
     */
    @Bean("jriObjectMapper")
    public ObjectMapper jriObjectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        return mapper;
    }

    /**
     * RestTemplate 빈 (MES 연동용)
     * core에 이미 등록된 경우 @ConditionalOnMissingBean으로 대체 가능
     */
    @Bean
    public RestTemplate jriRestTemplate() {
        return new RestTemplate();
    }
}
