package com.company.module.jri.service;

import com.company.module.jri.domain.JriInspection;
import com.company.module.jri.dto.JriInspectionResponse;
import com.company.module.jri.dto.JriInspectionSaveRequest;
import com.company.module.jri.repository.JriInspectionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * 점보롤 지분 검사 비즈니스 로직 서비스
 *
 * <p>@Transactional은 Service 계층에서만 사용합니다.
 * <p>조회 메서드는 readOnly = true, 변경 메서드는 @Transactional을 적용합니다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class JriInspectionService {

    private final JriInspectionRepository inspectionRepository;

    /**
     * 검사 결과 저장
     */
    @Transactional
    public JriInspectionResponse saveInspection(JriInspectionSaveRequest request) {
        log.info("[JRI] 검사 결과 저장 요청 - indBcd: {}, lotnr: {}, totalCount: {}",
                request.getIndBcd(), request.getLotnr(), request.getTotalCount());

        // UUID 생성
        String id = UUID.randomUUID().toString();

        // seq 자동 할당: 같은 바코드의 최대 seq + 1
        int seq = 1;
        if (request.getIndBcd() != null && !request.getIndBcd().isBlank()) {
            seq = inspectionRepository.findMaxSeqByIndBcd(request.getIndBcd()).orElse(0) + 1;
        }

        // ind_bcd_seq 자동증가: 같은 바코드의 기존 건수 + 1
        String indBcdSeq = request.getIndBcdSeq();
        if ((indBcdSeq == null || indBcdSeq.isBlank()) && request.getIndBcd() != null && !request.getIndBcd().isBlank()) {
            long count = inspectionRepository.countByIndBcd(request.getIndBcd());
            indBcdSeq = String.valueOf(count + 1);
        }

        // msrmDate 자동 기록 (이미지 업로드 시각)
        LocalDateTime msrmDate = request.getMsrmDate() != null ? request.getMsrmDate() : LocalDateTime.now();

        JriInspection inspection = JriInspection.builder()
                .id(id)
                .seq(seq)
                .inspItemGrpCd(request.getInspItemGrpCd())
                .matnr(request.getMatnr())
                .werks(request.getWerks())
                .msrmDate(msrmDate)
                .prcSeqno(request.getPrcSeqno())
                .lotnr(request.getLotnr())
                .indBcd(request.getIndBcd())
                .indBcdSeq(indBcdSeq)
                .inspectedAt(request.getInspectedAt())
                .thresholdMax(request.getThresholdMax())
                .totalCount(request.getTotalCount() != null ? request.getTotalCount() : 0)
                .coverageRatio(request.getCoverageRatio())
                .densityCount(request.getDensityCount())
                .densityRatio(request.getDensityRatio())
                .sizeUniformityScore(request.getSizeUniformityScore())
                .distributionUniformityScore(request.getDistributionUniformityScore())
                .meanSize(request.getMeanSize())
                .stdSize(request.getStdSize())
                .autoCount(request.getAutoCount() != null ? request.getAutoCount() : 0)
                .manualCount(request.getManualCount() != null ? request.getManualCount() : 0)
                .removedAutoCount(request.getRemovedAutoCount() != null ? request.getRemovedAutoCount() : 0)
                .bucketUpTo3(request.getBucketUpTo3())
                .bucketUpTo5(request.getBucketUpTo5())
                .bucketUpTo7(request.getBucketUpTo7())
                .bucketOver7(request.getBucketOver7())
                .quadrantTopLeft(request.getQuadrantTopLeft())
                .quadrantTopRight(request.getQuadrantTopRight())
                .quadrantBottomLeft(request.getQuadrantBottomLeft())
                .quadrantBottomRight(request.getQuadrantBottomRight())
                .objectPixelCount(request.getObjectPixelCount())
                .totalPixels(request.getTotalPixels())
                .manualAddedCount(request.getManualAddedCount() != null ? request.getManualAddedCount() : 0)
                .manualRemovedCount(request.getManualRemovedCount() != null ? request.getManualRemovedCount() : 0)
                .originalImagePath(request.getOriginalImagePath())
                .resultImagePath(request.getResultImagePath())
                .operatorId(request.getOperatorId())
                .deviceId(request.getDeviceId())
                .status(request.getStatus())
                .build();

        inspection = inspectionRepository.save(inspection);

        log.info("[JRI] 검사 결과 저장 완료 - id: {}, seq: {}", inspection.getId(), inspection.getSeq());
        return toResponse(inspection);
    }

    /**
     * 검사 결과 단건 조회
     */
    public JriInspectionResponse getInspection(String id) {
        JriInspection inspection = inspectionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException(
                        "[JRI] 검사 결과를 찾을 수 없습니다. ID: " + id));
        return toResponse(inspection);
    }

    /**
     * 검사 결과 목록 조회 (페이징)
     */
    public Page<JriInspectionResponse> listInspections(Pageable pageable) {
        return inspectionRepository.findAllByOrderByInspectedAtDesc(pageable)
                .map(this::toResponse);
    }

    /**
     * 바코드 검색 (페이징)
     */
    public Page<JriInspectionResponse> searchByIndBcd(String keyword, Pageable pageable) {
        return inspectionRepository.searchByIndBcd(keyword, pageable)
                .map(this::toResponse);
    }

    /**
     * LOT 번호 검색 (페이징)
     */
    public Page<JriInspectionResponse> searchByLotnr(String keyword, Pageable pageable) {
        return inspectionRepository.searchByLotnr(keyword, pageable)
                .map(this::toResponse);
    }

    /**
     * 자재코드 검색 (페이징)
     */
    public Page<JriInspectionResponse> searchByMatnr(String keyword, Pageable pageable) {
        return inspectionRepository.searchByMatnr(keyword, pageable)
                .map(this::toResponse);
    }

    /**
     * 검사 결과 삭제
     */
    @Transactional
    public void deleteInspection(String id) {
        if (!inspectionRepository.existsById(id)) {
            throw new IllegalArgumentException("[JRI] 검사 결과를 찾을 수 없습니다. ID: " + id);
        }
        inspectionRepository.deleteById(id);
        log.info("[JRI] 검사 결과 삭제 완료 - id: {}", id);
    }

    /**
     * 전체 삭제
     */
    @Transactional
    public void deleteAllInspections() {
        inspectionRepository.deleteAll();
        log.info("[JRI] 전체 검사 결과 삭제 완료");
    }

    // ──────────── Private Helpers ────────────

    private JriInspectionResponse toResponse(JriInspection entity) {
        return JriInspectionResponse.builder()
                .id(entity.getId())
                .seq(entity.getSeq())
                .inspItemGrpCd(entity.getInspItemGrpCd())
                .matnr(entity.getMatnr())
                .werks(entity.getWerks())
                .msrmDate(entity.getMsrmDate())
                .prcSeqno(entity.getPrcSeqno())
                .lotnr(entity.getLotnr())
                .indBcd(entity.getIndBcd())
                .indBcdSeq(entity.getIndBcdSeq())
                .inspectedAt(entity.getInspectedAt())
                .thresholdMax(entity.getThresholdMax())
                .totalCount(entity.getTotalCount())
                .coverageRatio(entity.getCoverageRatio())
                .densityCount(entity.getDensityCount())
                .densityRatio(entity.getDensityRatio())
                .sizeUniformityScore(entity.getSizeUniformityScore())
                .distributionUniformityScore(entity.getDistributionUniformityScore())
                .meanSize(entity.getMeanSize())
                .stdSize(entity.getStdSize())
                .autoCount(entity.getAutoCount())
                .manualCount(entity.getManualCount())
                .removedAutoCount(entity.getRemovedAutoCount())
                .bucketUpTo3(entity.getBucketUpTo3())
                .bucketUpTo5(entity.getBucketUpTo5())
                .bucketUpTo7(entity.getBucketUpTo7())
                .bucketOver7(entity.getBucketOver7())
                .quadrantTopLeft(entity.getQuadrantTopLeft())
                .quadrantTopRight(entity.getQuadrantTopRight())
                .quadrantBottomLeft(entity.getQuadrantBottomLeft())
                .quadrantBottomRight(entity.getQuadrantBottomRight())
                .objectPixelCount(entity.getObjectPixelCount())
                .totalPixels(entity.getTotalPixels())
                .manualAddedCount(entity.getManualAddedCount())
                .manualRemovedCount(entity.getManualRemovedCount())
                .originalImagePath(entity.getOriginalImagePath())
                .resultImagePath(entity.getResultImagePath())
                .operatorId(entity.getOperatorId())
                .deviceId(entity.getDeviceId())
                .status(entity.getStatus())
                .build();
    }
}
