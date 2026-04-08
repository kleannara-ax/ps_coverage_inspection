package com.company.module.jri.service;

import com.company.module.jri.domain.JriInspection;
import com.company.module.jri.dto.JriInspectionResponse;
import com.company.module.jri.dto.JriInspectionSaveRequest;
import com.company.module.jri.repository.JriInspectionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
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

    @Value("${jri.upload.dir:/data/upload/ps_cov_ins}")
    private String uploadDir;

    /**
     * 검사 결과 저장 (Upsert: 동일 자재+LOT+바코드 존재 시 UPDATE, 없으면 INSERT)
     *
     * @param request       검사 메타 정보
     * @param originalImage 원본 이미지 (nullable)
     * @param resultImage   결과 이미지 (nullable)
     */
    @Transactional
    public JriInspectionResponse saveInspection(JriInspectionSaveRequest request,
                                                 MultipartFile originalImage,
                                                 MultipartFile resultImage) {
        log.info("[JRI] 검사 결과 저장 요청 - indBcd: {}, lotnr: {}, matnr: {}, totalCount: {}",
                request.getIndBcd(), request.getLotnr(), request.getMatnr(), request.getTotalCount());

        // 이미지 저장 준비
        String matnrSafe = request.getMatnr() != null
                ? request.getMatnr().replaceAll("[^a-zA-Z0-9_-]", "_") : "unknown";
        String indBcdSafe = request.getIndBcd() != null
                ? request.getIndBcd().replaceAll("[^a-zA-Z0-9_-]", "_") : "unknown";

        // ── 동일 자재 + LOT + 개별바코드 조합으로 기존 레코드 조회 ──
        boolean isUpdate = false;
        JriInspection inspection = null;

        if (request.getMatnr() != null && !request.getMatnr().isBlank()
                && request.getLotnr() != null && !request.getLotnr().isBlank()
                && request.getIndBcd() != null && !request.getIndBcd().isBlank()) {
            inspection = inspectionRepository.findByMatnrAndLotnrAndIndBcd(
                    request.getMatnr(), request.getLotnr(), request.getIndBcd()
            ).orElse(null);
        }

        if (inspection != null) {
            // ── UPDATE: 기존 레코드 갱신 ──
            isUpdate = true;
            log.info("[JRI] 동일 조합 기존 레코드 발견 → UPDATE (id: {}, seq: {})", inspection.getId(), inspection.getSeq());

            // 이미지 저장 (기존 ID 사용) — 년월 서브폴더 자동 생성
            String originalImagePath = saveUploadedImage(originalImage, "original", inspection.getId(), matnrSafe, indBcdSafe);
            String resultImagePath = saveUploadedImage(resultImage, "result", inspection.getId(), matnrSafe, indBcdSafe);
            String originalImageName = originalImagePath != null ? originalImagePath.substring(originalImagePath.lastIndexOf('/') + 1) : null;
            String resultImageName = resultImagePath != null ? resultImagePath.substring(resultImagePath.lastIndexOf('/') + 1) : null;
            String yearMonth = YearMonth.now().format(DateTimeFormatter.ofPattern("yyyy.MM"));
            String originalImageDir = originalImagePath != null ? uploadDir + "/original/" + yearMonth : null;
            String resultImageDir = resultImagePath != null ? uploadDir + "/result/" + yearMonth : null;
            if (originalImagePath == null) originalImagePath = request.getOriginalImagePath();
            if (resultImagePath == null) resultImagePath = request.getResultImagePath();

            // 검사 데이터 갱신
            inspection.setInspectedAt(request.getInspectedAt() != null ? request.getInspectedAt() : LocalDateTime.now());
            inspection.setMsrmDate(request.getMsrmDate() != null ? request.getMsrmDate() : LocalDateTime.now());
            inspection.setThresholdMax(request.getThresholdMax());
            inspection.setTotalCount(request.getTotalCount() != null ? request.getTotalCount() : 0);
            inspection.setCoverageRatio(request.getCoverageRatio());
            inspection.setDensityCount(request.getDensityCount());
            inspection.setDensityRatio(request.getDensityRatio());
            inspection.setSizeUniformityScore(request.getSizeUniformityScore());
            inspection.setDistributionUniformityScore(request.getDistributionUniformityScore());
            inspection.setMeanSize(request.getMeanSize());
            inspection.setStdSize(request.getStdSize());
            inspection.setAutoCount(request.getAutoCount() != null ? request.getAutoCount() : 0);
            inspection.setManualCount(request.getManualCount() != null ? request.getManualCount() : 0);
            inspection.setRemovedAutoCount(request.getRemovedAutoCount() != null ? request.getRemovedAutoCount() : 0);
            inspection.setBucketUpTo3(request.getBucketUpTo3());
            inspection.setBucketUpTo5(request.getBucketUpTo5());
            inspection.setBucketUpTo7(request.getBucketUpTo7());
            inspection.setBucketOver7(request.getBucketOver7());
            inspection.setQuadrantTopLeft(request.getQuadrantTopLeft());
            inspection.setQuadrantTopRight(request.getQuadrantTopRight());
            inspection.setQuadrantBottomLeft(request.getQuadrantBottomLeft());
            inspection.setQuadrantBottomRight(request.getQuadrantBottomRight());
            inspection.setObjectPixelCount(request.getObjectPixelCount());
            inspection.setTotalPixels(request.getTotalPixels());
            inspection.setManualAddedCount(request.getManualAddedCount() != null ? request.getManualAddedCount() : 0);
            inspection.setManualRemovedCount(request.getManualRemovedCount() != null ? request.getManualRemovedCount() : 0);
            inspection.setOriginalImagePath(originalImagePath);
            inspection.setOriginalImageName(originalImageName != null ? originalImageName : inspection.getOriginalImageName());
            inspection.setOriginalImageDir(originalImageDir != null ? originalImageDir : inspection.getOriginalImageDir());
            inspection.setResultImagePath(resultImagePath);
            inspection.setResultImageName(resultImageName != null ? resultImageName : inspection.getResultImageName());
            inspection.setResultImageDir(resultImageDir != null ? resultImageDir : inspection.getResultImageDir());
            inspection.setOperatorId(request.getOperatorId());
            inspection.setDeviceId(request.getDeviceId());
            inspection.setStatus(request.getStatus());
            if (request.getMatnrNm() != null) inspection.setMatnrNm(request.getMatnrNm());
            if (request.getOperatorNm() != null) inspection.setOperatorNm(request.getOperatorNm());

            // 차수(indBcdSeq) 증가: 동일 자재+LOT+바코드 재검사 시 +1
            int currentSeq = 1;
            try { currentSeq = Integer.parseInt(inspection.getIndBcdSeq()); } catch (Exception ignored) {}
            inspection.setIndBcdSeq(String.valueOf(currentSeq + 1));

        } else {
            // ── INSERT: 신규 레코드 생성 ──
            String id = UUID.randomUUID().toString();

            int seq = 1;
            if (request.getIndBcd() != null && !request.getIndBcd().isBlank()) {
                seq = inspectionRepository.findMaxSeqByIndBcd(request.getIndBcd()).orElse(0) + 1;
            }

            String indBcdSeq = request.getIndBcdSeq();
            if ((indBcdSeq == null || indBcdSeq.isBlank()) && request.getIndBcd() != null && !request.getIndBcd().isBlank()) {
                long count = inspectionRepository.countByIndBcd(request.getIndBcd());
                indBcdSeq = String.valueOf(count + 1);
            }

            LocalDateTime msrmDate = request.getMsrmDate() != null ? request.getMsrmDate() : LocalDateTime.now();

            String originalImagePath = saveUploadedImage(originalImage, "original", id, matnrSafe, indBcdSafe);
            String resultImagePath = saveUploadedImage(resultImage, "result", id, matnrSafe, indBcdSafe);
            String originalImageName = originalImagePath != null ? originalImagePath.substring(originalImagePath.lastIndexOf('/') + 1) : null;
            String resultImageName = resultImagePath != null ? resultImagePath.substring(resultImagePath.lastIndexOf('/') + 1) : null;
            String yearMonthNow = YearMonth.now().format(DateTimeFormatter.ofPattern("yyyy.MM"));
            String origImageDir = originalImagePath != null ? uploadDir + "/original/" + yearMonthNow : null;
            String resImageDir = resultImagePath != null ? uploadDir + "/result/" + yearMonthNow : null;
            if (originalImagePath == null) originalImagePath = request.getOriginalImagePath();
            if (resultImagePath == null) resultImagePath = request.getResultImagePath();

            inspection = JriInspection.builder()
                    .id(id)
                    .seq(seq)
                    .inspItemGrpCd(request.getInspItemGrpCd())
                    .matnr(request.getMatnr())
                    .matnrNm(request.getMatnrNm())
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
                    .originalImagePath(originalImagePath)
                    .originalImageName(originalImageName)
                    .originalImageDir(origImageDir)
                    .resultImagePath(resultImagePath)
                    .resultImageName(resultImageName)
                    .resultImageDir(resImageDir)
                    .operatorId(request.getOperatorId())
                    .operatorNm(request.getOperatorNm())
                    .deviceId(request.getDeviceId())
                    .status(request.getStatus())
                    .build();
        }

        inspection = inspectionRepository.save(inspection);

        log.info("[JRI] 검사 결과 {} 완료 - id: {}, seq: {}, indBcd: {}, matnr: {}, lotnr: {}",
                isUpdate ? "갱신(UPDATE)" : "신규(INSERT)",
                inspection.getId(), inspection.getSeq(),
                inspection.getIndBcd(), inspection.getMatnr(), inspection.getLotnr());

        JriInspectionResponse response = toResponse(inspection);
        response.setIsUpdate(isUpdate);
        return response;
    }

    /**
     * 년월(YYYY.MM) 서브디렉토리를 포함한 이미지 저장 경로 생성
     * 예: /data/upload/ps_cov_ins/original/2026.04/
     * 예: /data/upload/ps_cov_ins/result/2026.04/
     *
     * @param category "original" 또는 "result"
     * @return { dirPath: 실제 파일시스템 경로, subDir: URL용 서브 경로 }
     */
    private Path getImageSubDir(String category) {
        String yearMonth = YearMonth.now().format(DateTimeFormatter.ofPattern("yyyy.MM"));
        Path dir = Paths.get(uploadDir, category, yearMonth);
        try {
            if (!Files.exists(dir)) Files.createDirectories(dir);
        } catch (IOException e) {
            log.error("[JRI] 이미지 디렉토리 생성 실패 - dir: {}", dir, e);
        }
        return dir;
    }

    /**
     * MultipartFile → 디스크 저장 (년월 서브폴더 자동 생성)
     *
     * <p>저장 경로 예시:
     * <ul>
     *   <li>원본: /data/upload/ps_cov_ins/original/2026.04/original_{matnr}_{barcode}_{timestamp}_{uuid}.jpg</li>
     *   <li>결과: /data/upload/ps_cov_ins/result/2026.04/result_{matnr}_{barcode}_{timestamp}_{uuid}.jpg</li>
     * </ul>
     *
     * @param file          업로드된 MultipartFile
     * @param prefix        "original" 또는 "result"
     * @param inspectionId  검사 ID (파일명 고유성 확보)
     * @param matnrSafe     안전한 자재코드 문자열
     * @param indBcdSafe    안전한 바코드 문자열
     * @return 저장된 파일의 URL 경로 (예: /uploads/original/2026.04/original_xxx.jpg), null if no file
     */
    private String saveUploadedImage(MultipartFile file, String prefix, String inspectionId, String matnrSafe, String indBcdSafe) {
        if (file == null || file.isEmpty()) return null;
        try {
            String category = "result".equals(prefix) ? "result" : "original";
            Path dir = getImageSubDir(category);

            String originalName = file.getOriginalFilename();
            String ext = "jpg";
            if (originalName != null && originalName.contains(".")) {
                ext = originalName.substring(originalName.lastIndexOf('.') + 1);
            }
            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyMMdd_HHmmss"));
            String filename = String.format("%s_%s_%s_%s_%s.%s", prefix, matnrSafe, indBcdSafe,
                    timestamp, inspectionId.substring(0, 8), ext);
            Path filePath = dir.resolve(filename);
            file.transferTo(filePath.toFile());

            // URL 경로: /uploads/{category}/{YYYY.MM}/{filename}
            String yearMonth = YearMonth.now().format(DateTimeFormatter.ofPattern("yyyy.MM"));
            return String.format("/uploads/%s/%s/%s", category, yearMonth, filename);
        } catch (IOException e) {
            log.error("[JRI] 이미지 저장 실패 - prefix: {}", prefix, e);
            return null;
        }
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
     * 통합 검색: 바코드 + 기간 필터 조합
     *
     * @param indBcd   개별바코드 (LIKE 검색, null 허용)
     * @param dateFrom 시작일 (yyyy-MM-dd, null이면 전체)
     * @param dateTo   종료일 (yyyy-MM-dd, null이면 전체)
     */
    public Page<JriInspectionResponse> searchInspections(String indBcd, String dateFrom, String dateTo, Pageable pageable) {
        boolean hasIndBcd = indBcd != null && !indBcd.isBlank();
        boolean hasDateFrom = dateFrom != null && !dateFrom.isBlank();
        boolean hasDateTo = dateTo != null && !dateTo.isBlank();

        // 필터 조건 없으면 전체 조회
        if (!hasIndBcd && !hasDateFrom && !hasDateTo) {
            return listInspections(pageable);
        }

        LocalDateTime from = hasDateFrom ? LocalDate.parse(dateFrom).atStartOfDay() : LocalDateTime.of(2000, 1, 1, 0, 0);
        LocalDateTime to = hasDateTo ? LocalDate.parse(dateTo).atTime(LocalTime.MAX) : LocalDateTime.of(2099, 12, 31, 23, 59, 59);

        if (hasIndBcd) {
            return inspectionRepository.searchByIndBcdAndDateRange(indBcd, from, to, pageable)
                    .map(this::toResponse);
        } else {
            return inspectionRepository.findByDateRange(from, to, pageable)
                    .map(this::toResponse);
        }
    }

    /**
     * 바코드 검색 (페이징)
     */
    public Page<JriInspectionResponse> searchByIndBcd(String keyword, Pageable pageable) {
        return inspectionRepository.searchByIndBcd(keyword, pageable)
                .map(this::toResponse);
    }

    /**
     * 동일 자재+LOT+바코드 조합 존재 여부 확인 (Upsert 사전 체크)
     */
    public boolean existsByMatnrAndLotnrAndIndBcd(String matnr, String lotnr, String indBcd) {
        return inspectionRepository.findByMatnrAndLotnrAndIndBcd(matnr, lotnr, indBcd).isPresent();
    }

    /**
     * 동일 자재+LOT+바코드 조합 존재 여부 + 기존 레코드 요약 정보 반환
     * (프론트엔드 재검사 확인 팝업에서 현재 차수 표시용)
     */
    public java.util.Map<String, Object> checkExistsByMatnrAndLotnrAndIndBcd(String matnr, String lotnr, String indBcd) {
        return inspectionRepository.findByMatnrAndLotnrAndIndBcd(matnr, lotnr, indBcd)
                .map(entity -> java.util.Map.<String, Object>of(
                        "exists", true,
                        "record", java.util.Map.of(
                                "id", entity.getId(),
                                "seq", entity.getSeq(),
                                "indBcdSeq", entity.getIndBcdSeq() != null ? entity.getIndBcdSeq() : "1",
                                "inspectedAt", entity.getInspectedAt() != null ? entity.getInspectedAt().toString() : "",
                                "coverageRatio", entity.getCoverageRatio() != null ? entity.getCoverageRatio() : java.math.BigDecimal.ZERO,
                                "totalCount", entity.getTotalCount() != null ? entity.getTotalCount() : 0
                        )
                ))
                .orElse(java.util.Map.of("exists", false));
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
                .matnrNm(entity.getMatnrNm())
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
                .originalImageName(entity.getOriginalImageName())
                .originalImageDir(entity.getOriginalImageDir())
                .resultImagePath(entity.getResultImagePath())
                .resultImageName(entity.getResultImageName())
                .resultImageDir(entity.getResultImageDir())
                .operatorId(entity.getOperatorId())
                .operatorNm(entity.getOperatorNm())
                .deviceId(entity.getDeviceId())
                .status(entity.getStatus())
                .build();
    }
}
