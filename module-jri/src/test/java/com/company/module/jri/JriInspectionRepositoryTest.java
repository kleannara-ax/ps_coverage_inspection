package com.company.module.jri;

import com.company.module.jri.domain.JriInspection;
import com.company.module.jri.repository.JriInspectionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * module-jri Repository 테스트 (H2 인메모리 DB)
 */
@DataJpaTest
class JriInspectionRepositoryTest {

    @Autowired
    private JriInspectionRepository repository;

    @BeforeEach
    void setUp() {
        repository.deleteAll();
    }

    @Test
    void saveAndFindById() {
        JriInspection inspection = JriInspection.builder()
                .id(UUID.randomUUID().toString())
                .seq(1)
                .indBcd("TEST-BCD-001")
                .totalCount(5)
                .inspectedAt(LocalDateTime.now())
                .thresholdMax(115)
                .build();

        repository.save(inspection);

        assertThat(repository.findById(inspection.getId())).isPresent();
    }

    @Test
    void searchByIndBcd() {
        JriInspection inspection = JriInspection.builder()
                .id(UUID.randomUUID().toString())
                .seq(1)
                .indBcd("JUMBO-ROLL-123")
                .totalCount(10)
                .inspectedAt(LocalDateTime.now())
                .build();
        repository.save(inspection);

        Page<JriInspection> result = repository.searchByIndBcd("JUMBO", PageRequest.of(0, 10));
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getIndBcd()).isEqualTo("JUMBO-ROLL-123");
    }

    @Test
    void findMaxSeqByIndBcd() {
        String bcd = "TEST-BCD-002";
        for (int i = 1; i <= 3; i++) {
            repository.save(JriInspection.builder()
                    .id(UUID.randomUUID().toString())
                    .seq(i)
                    .indBcd(bcd)
                    .inspectedAt(LocalDateTime.now())
                    .build());
        }

        Integer maxSeq = repository.findMaxSeqByIndBcd(bcd).orElse(0);
        assertThat(maxSeq).isEqualTo(3);
    }
}
