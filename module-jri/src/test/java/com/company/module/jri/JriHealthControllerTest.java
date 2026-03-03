package com.company.module.jri;

import com.company.module.jri.controller.JriHealthController;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * module-jri Health Check API 테스트
 */
@WebMvcTest(JriHealthController.class)
class JriHealthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void healthCheckReturnsOk() throws Exception {
        mockMvc.perform(get("/jri-api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ok"))
                .andExpect(jsonPath("$.module").value("module-jri"));
    }
}
