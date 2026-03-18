/**
 * Jumbo Roll Share Inspector - module-jri (company-platform 통합)
 *
 * 변경사항 (v5.0.0 → company-platform 모듈 통합):
 *   - API Prefix: /jri-api/inspections (context-path 불필요)
 *   - DB Table Prefix: MOD_JRI_ (company-platform 규칙 적용)
 *   - 패키지: com.company.module.jri
 *   - 검사 이력을 REST API(MariaDB)로 저장/조회/삭제
 *   - PK: UUID (id), seq 자동증가
 */
document.addEventListener('DOMContentLoaded', () => {
  /* ──────────── Context Path / API ──────────── */
  const ctxMeta = document.querySelector('meta[name="context-path"]')
  const CONTEXT_PATH = ctxMeta ? ctxMeta.content.replace(/\/+$/, '') : ''
  const API_BASE = CONTEXT_PATH + '/jri-api/inspections'
  const MES_API_BASE = CONTEXT_PATH + '/jri-api/mes/send-result'

  /* ──────────── Constants ──────────── */
  const DEFAULT_THRESHOLD = 115
  const MAX_DISPLAY_DIMENSION = 3200
  const MAX_FILE_SIZE_BYTES = 900 * 1024 * 1024
  const PROCESS_CHUNK_SIZE = 200000
  const MAX_HISTORY_PAGE_SIZE = 20
  const MANUAL_COMPONENT_RADIUS = 8
  const DENSITY_DIAMETER_RANGE = { min: 3, max: 7 }
  const SIZE_BUCKET_THRESHOLDS = { upTo3: 9, upTo5: 25, upTo7: 49 }
  const AUTO_RESIZE_TRIGGER_DIMENSION = 2200
  const AUTO_RESIZE_TRIGGER_FILE_BYTES = 80 * 1024 * 1024
  const AUTO_RESIZE_TARGET_DIMENSION = 1600
  const MIN_RESIZE_TARGET_DIMENSION = 950
  const THRESHOLD_LOCK_BUTTON_BASE_CLASSES =
    'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:ring-offset-1'
  const THRESHOLD_LOCK_BUTTON_UNLOCK_CLASSES =
    'border-indigo-500 bg-indigo-500 text-white hover:bg-indigo-600'
  const THRESHOLD_LOCK_BUTTON_LOCK_CLASSES =
    'border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-800'
  const THRESHOLD_LOCK_STATUS_BASE_CLASSES =
    'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold'
  const THRESHOLD_LOCK_STATUS_LOCKED_CLASSES = 'border-rose-200 bg-rose-50 text-rose-600'
  const THRESHOLD_LOCK_STATUS_UNLOCKED_CLASSES = 'border-emerald-200 bg-emerald-50 text-emerald-600'

  /* ──────────── DOM Elements ──────────── */
  const elements = {
    cameraInput: document.getElementById('cameraInput'),
    galleryInput: document.getElementById('galleryInput'),
    openCameraButton: document.getElementById('openCameraButton'),
    openGalleryButton: document.getElementById('openGalleryButton'),
    thresholdSlider: document.getElementById('thresholdSlider'),
    thresholdValue: document.getElementById('thresholdValue'),
    thresholdDecreaseButton: document.getElementById('thresholdDecreaseButton'),
    thresholdIncreaseButton: document.getElementById('thresholdIncreaseButton'),
    thresholdLockButton: document.getElementById('thresholdLockButton'),
    thresholdLockButtonIcon: document.getElementById('thresholdLockButtonIcon'),
    thresholdLockButtonLabel: document.getElementById('thresholdLockButtonLabel'),
    thresholdLockStatus: document.getElementById('thresholdLockStatus'),
    thresholdLockStatusIcon: document.getElementById('thresholdLockStatusIcon'),
    thresholdLockStatusLabel: document.getElementById('thresholdLockStatusLabel'),
    objectCount: document.getElementById('objectCount'),
    imageInfo: document.getElementById('imageInfo'),
    positionsList: document.getElementById('positionsList'),
    // 검사 정보 입력 필드 (화면 직접 입력 / URL 파라미터 수신)
    indBcdInput: document.getElementById('indBcdInput'),
    lotnrInput: document.getElementById('lotnrInput'),
    matnrInput: document.getElementById('matnrInput'),
    matnrNmInput: document.getElementById('matnrNmInput'),
    operatorIdInput: document.getElementById('operatorIdInput'),
    operatorNmInput: document.getElementById('operatorNmInput'),
    prcSeqnoInput: document.getElementById('prcSeqnoInput'),
    historyList: document.getElementById('historyList'),
    historyTableBody: document.getElementById('historyTableBody'),
    historyTableEmpty: document.getElementById('historyTableEmpty'),
    historyPagination: document.getElementById('historyPagination'),
    historyTablePagination: document.getElementById('historyTablePagination'),
    historySearchInput: document.getElementById('historySearchInput'),
    historySearchButton: document.getElementById('historySearchButton'),
    // 이력 테이블 탭 필터
    tableFilterDateFrom: document.getElementById('tableFilterDateFrom'),
    tableFilterDateTo: document.getElementById('tableFilterDateTo'),
    tableFilterIndBcd: document.getElementById('tableFilterIndBcd'),
    tableFilterSearchButton: document.getElementById('tableFilterSearchButton'),
    tableFilterResetButton: document.getElementById('tableFilterResetButton'),
    originalWrapper: document.getElementById('originalWrapper'),
    originalCanvas: document.getElementById('originalCanvas'),
    originalPlaceholder: document.getElementById('originalPlaceholder'),
    canvasWrapper: document.getElementById('canvasWrapper'),
    placeholder: document.getElementById('canvasPlaceholder'),
    binaryCanvas: document.getElementById('binaryCanvas'),
    markerCanvas: document.getElementById('markerCanvas'),
    processingOverlay: document.getElementById('processingOverlay'),
    processingOverlayTitle: document.getElementById('processingOverlayTitle'),
    processingOverlayMessage: document.getElementById('processingOverlayMessage'),
    saveButton: document.getElementById('saveResultButton'),
    saveMessage: document.getElementById('saveMessage'),
    clearHistoryButton: document.getElementById('clearHistoryButton'),
    exportHistoryButton: document.getElementById('exportHistoryButton'),
    manualAddButton: document.getElementById('toggleManualAddButton'),
    manualResetButton: document.getElementById('resetManualButton'),
    manualStatus: document.getElementById('manualModeStatus'),
    metricCards: {
      totalValue: document.getElementById('metricTotalCountValue'),
      totalSub: document.getElementById('metricTotalCountSub'),
      densityValue: document.getElementById('metricDensityValue'),
      densitySub: document.getElementById('metricDensitySub'),
      coverageValue: document.getElementById('metricCoverageValue'),
      coverageSub: document.getElementById('metricCoverageSub'),
      sizeUniformityValue: document.getElementById('metricSizeUniformityValue'),
      sizeUniformitySub: document.getElementById('metricSizeUniformitySub'),
      distributionValue: document.getElementById('metricDistributionUniformityValue'),
      distributionSub: document.getElementById('metricDistributionUniformitySub'),
    },
    sizeBucketValues: {
      upTo3: document.getElementById('bucketUpTo3Value'),
      upTo5: document.getElementById('bucketUpTo5Value'),
      upTo7: document.getElementById('bucketUpTo7Value'),
      over7: document.getElementById('bucketOver7Value'),
    },
    quadrantValues: {
      topLeft: document.getElementById('quadrantTopLeftValue'),
      topRight: document.getElementById('quadrantTopRightValue'),
      bottomLeft: document.getElementById('quadrantBottomLeftValue'),
      bottomRight: document.getElementById('quadrantBottomRightValue'),
    },
  }

  if ((!elements.cameraInput && !elements.galleryInput) || !elements.thresholdSlider || !elements.binaryCanvas) {
    console.warn('필수 DOM 요소를 찾을 수 없습니다.')
    return
  }

  const originalCtx = elements.originalCanvas?.getContext('2d') || null
  const binaryCtx = elements.binaryCanvas.getContext('2d', { willReadFrequently: true })
  const markerCtx = elements.markerCanvas.getContext('2d')

  let manualAddMode = false
  let thresholdJobId = 0
  let currentHistoryPage = 0

  /* ──────────── Processing overlay ──────────── */
  function setProcessingOverlay(active, title, message) {
    const overlay = elements.processingOverlay
    if (!overlay) return
    if (active) {
      overlay.classList.remove('hidden'); overlay.classList.add('flex')
      if (elements.processingOverlayTitle && typeof title === 'string') elements.processingOverlayTitle.textContent = title
      if (elements.processingOverlayMessage && typeof message === 'string') elements.processingOverlayMessage.textContent = message
    } else {
      overlay.classList.add('hidden'); overlay.classList.remove('flex')
    }
  }
  function updateProcessingMessage(message) {
    if (!elements.processingOverlayMessage || typeof message !== 'string') return
    elements.processingOverlayMessage.textContent = message
  }
  function waitForNextFrame() {
    return new Promise((resolve) => window.requestAnimationFrame(() => resolve()))
  }

  /* ──────────── State ──────────── */
  const state = {
    grayscale: null, width: 0, height: 0, original: { width: 0, height: 0 },
    detectedComponents: [], manualComponents: [], removedAutoIds: new Set(), components: [],
    lastMask: null, lastThreshold: DEFAULT_THRESHOLD, thresholdLocked: true,
    originalImageData: null, baseObjectPixelCount: 0, objectPixelCount: 0,
    inspectionStartedAt: null, msrmDate: null,
    currentMetrics: getEmptyMetrics(),
    processingMaxDimension: MAX_DISPLAY_DIMENSION, resizedForPerformance: false,
  }

  elements.thresholdSlider.value = String(DEFAULT_THRESHOLD)
  elements.thresholdValue.textContent = `0 ~ ${DEFAULT_THRESHOLD}`

  // URL 파라미터로 바코드 자동 입력 + 탭/검색 설정
  applyUrlParams()

  setupTabNavigation()
  attachEventListeners()
  updateManualModeDisplay()
  updateManualControlsState()
  loadHistoryFromServer(0)
  resetResults()

  // URL ?tab= 파라미터로 탭 자동 전환 (applyUrlParams 이후 실행)
  applyTabParam()

  function applyUrlParams() {
    const params = new URLSearchParams(window.location.search)

    // IND_BCD - 개별바코드
    const indBcd = params.get('IND_BCD') || params.get('ind_bcd') || params.get('indBcd')
    if (indBcd && elements.indBcdInput) elements.indBcdInput.value = indBcd

    // LOT_NO - LOT 번호
    const lotNo = params.get('LOT_NO') || params.get('lot_no') || params.get('lotnr')
    if (lotNo && elements.lotnrInput) elements.lotnrInput.value = lotNo

    // MATNR - 자재코드
    const matnr = params.get('MATNR') || params.get('matnr')
    if (matnr && elements.matnrInput) elements.matnrInput.value = matnr

    // MATNR_NM - 자재명
    const matnrNm = params.get('MATNR_NM') || params.get('matnr_nm')
    if (matnrNm && elements.matnrNmInput) elements.matnrNmInput.value = matnrNm

    // USERID - 검사자 ID
    const userId = params.get('USERID') || params.get('userid') || params.get('operator_id')
    if (userId && elements.operatorIdInput) elements.operatorIdInput.value = userId

    // USERNM - 검사자명
    const userNm = params.get('USERNM') || params.get('usernm')
    if (userNm && elements.operatorNmInput) elements.operatorNmInput.value = userNm

    // PRC_SEQNO - 처리순번
    const prcSeqno = params.get('PRC_SEQNO') || params.get('prc_seqno')
    if (prcSeqno && elements.prcSeqnoInput) elements.prcSeqnoInput.value = prcSeqno
  }

  /**
   * URL ?tab=history&search=바코드 파라미터로 탭 자동 전환 + 검색 실행
   *
   * MES 검사 결과 조회 흐름:
   *   MES → /?tab=history&search=26228J0039
   *   → 검사 이력 탭 자동 전환
   *   → 해당 바코드로 검색 자동 실행
   */
  function applyTabParam() {
    const params = new URLSearchParams(window.location.search)
    const tab = params.get('tab')
    const search = params.get('search') || params.get('SEARCH')

    if (!tab) return

    // 유효한 탭: processing, history, history-table
    const validTabs = ['processing', 'history', 'history-table']
    const targetTab = tab.toLowerCase().replace('_', '-')
    if (!validTabs.includes(targetTab)) return

    // 검색어가 있으면 검색 입력란에 설정
    if (search && elements.historySearchInput) {
      elements.historySearchInput.value = search
    }

    // 탭 전환 (버튼 클릭 시뮬레이션)
    const tabButton = document.querySelector(`.tab-trigger[data-tab-target="${targetTab}"]`)
    if (tabButton) {
      tabButton.click()
    }
  }

  /* ──────────── Event Listeners ──────────── */
  function attachEventListeners() {
    const fileInputs = [elements.cameraInput, elements.galleryInput].filter(Boolean)
    fileInputs.forEach((input) => input.addEventListener('change', handleImageUpload))

    if (elements.openCameraButton && elements.cameraInput) {
      elements.openCameraButton.addEventListener('click', () => { elements.cameraInput.value = ''; elements.cameraInput.click() })
    }
    if (elements.openGalleryButton && elements.galleryInput) {
      elements.openGalleryButton.addEventListener('click', () => { elements.galleryInput.value = ''; elements.galleryInput.click() })
    }

    elements.thresholdSlider.addEventListener('input', (event) => {
      if (state.thresholdLocked) {
        if (event) { event.preventDefault(); event.stopPropagation() }
        elements.thresholdSlider.value = String(state.lastThreshold ?? DEFAULT_THRESHOLD)
        updateThresholdLockUI(); setSaveMessage('임계값이 잠금 상태입니다. 잠금 해제 후 조정하세요.', 'muted'); return
      }
      updateThresholdButtonsState(); applyThreshold()
    })
    elements.thresholdSlider.addEventListener('change', (event) => {
      if (state.thresholdLocked) {
        if (event) { event.preventDefault(); event.stopPropagation() }
        elements.thresholdSlider.value = String(state.lastThreshold ?? DEFAULT_THRESHOLD)
        updateThresholdLockUI(); setSaveMessage('임계값이 잠금 상태입니다. 잠금 해제 후 조정하세요.', 'muted'); return
      }
      updateThresholdButtonsState(); applyThreshold()
    })

    if (elements.thresholdDecreaseButton) elements.thresholdDecreaseButton.addEventListener('click', () => adjustThreshold(-1))
    if (elements.thresholdIncreaseButton) elements.thresholdIncreaseButton.addEventListener('click', () => adjustThreshold(1))
    if (elements.thresholdLockButton) elements.thresholdLockButton.addEventListener('click', toggleThresholdLock)

    window.addEventListener('resize', () => window.requestAnimationFrame(syncCanvasDisplaySizes))

    if (elements.saveButton) elements.saveButton.addEventListener('click', handleSaveResult)
    if (elements.clearHistoryButton) elements.clearHistoryButton.addEventListener('click', handleClearHistory)
    if (elements.historyList) elements.historyList.addEventListener('click', handleHistoryActionClick)
    if (elements.historyTableBody) elements.historyTableBody.addEventListener('click', handleHistoryActionClick)
    if (elements.positionsList) elements.positionsList.addEventListener('click', handlePositionsListAction)
    if (elements.manualAddButton) elements.manualAddButton.addEventListener('click', toggleManualAddMode)
    if (elements.manualResetButton) elements.manualResetButton.addEventListener('click', handleResetManualComponents)
    elements.binaryCanvas.addEventListener('click', handleCanvasClickForManualAdd)

    // Search
    if (elements.historySearchButton) {
      elements.historySearchButton.addEventListener('click', () => loadHistoryFromServer(0))
    }
    if (elements.historySearchInput) {
      elements.historySearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') loadHistoryFromServer(0)
      })
    }
    if (elements.exportHistoryButton) {
      elements.exportHistoryButton.addEventListener('click', handleExportExcel)
    }

    // 이력 테이블 탭 필터
    if (elements.tableFilterSearchButton) {
      elements.tableFilterSearchButton.addEventListener('click', () => loadHistoryFromServer(0))
    }
    if (elements.tableFilterResetButton) {
      elements.tableFilterResetButton.addEventListener('click', () => {
        if (elements.tableFilterDateFrom) elements.tableFilterDateFrom.value = ''
        if (elements.tableFilterDateTo) elements.tableFilterDateTo.value = ''
        if (elements.tableFilterIndBcd) elements.tableFilterIndBcd.value = ''
        loadHistoryFromServer(0)
      })
    }
    if (elements.tableFilterIndBcd) {
      elements.tableFilterIndBcd.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') loadHistoryFromServer(0)
      })
    }
  }

  /* ──────────── Tab Navigation ──────────── */
  function setupTabNavigation() {
    const tabButtons = document.querySelectorAll('.tab-trigger')
    const tabPanels = document.querySelectorAll('.tab-section')
    tabButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const target = button.getAttribute('data-tab-target')
        if (!target) return
        tabButtons.forEach((btn) => {
          const isActive = btn === button
          btn.setAttribute('data-active', String(isActive))
          btn.classList.toggle('bg-indigo-500', isActive)
          btn.classList.toggle('border-indigo-500', isActive)
          btn.classList.toggle('text-white', isActive)
          btn.classList.toggle('shadow-sm', isActive)
          btn.classList.toggle('bg-white', !isActive)
          btn.classList.toggle('border-slate-200', !isActive)
          btn.classList.toggle('text-slate-600', !isActive)
        })
        tabPanels.forEach((panel) => panel.classList.toggle('hidden', panel.getAttribute('data-tab-panel') !== target))
        if (target === 'history' || target === 'history-table') loadHistoryFromServer(currentHistoryPage)
      })
    })
  }

  /* ──────────── Threshold Controls ──────────── */
  function adjustThreshold(delta) {
    if (state.thresholdLocked) { updateThresholdLockUI(); setSaveMessage('임계값이 잠겨 있어 조정할 수 없습니다.', 'muted'); return }
    const slider = elements.thresholdSlider
    if (!slider || slider.disabled) return
    const min = Number(slider.min ?? 0), max = Number(slider.max ?? 255), current = Number(slider.value ?? 0)
    const next = clamp(current + delta, min, max)
    if (next === current) { updateThresholdButtonsState(); return }
    slider.value = String(next); updateThresholdButtonsState(); applyThreshold()
  }

  function updateThresholdButtonsState() {
    const slider = elements.thresholdSlider; if (!slider) return
    const hasImage = Boolean(state.grayscale), isLocked = state.thresholdLocked
    const disabled = slider.disabled || isLocked || !hasImage
    const min = Number(slider.min ?? 0), max = Number(slider.max ?? 255), value = Number(slider.value ?? 0)
    if (elements.thresholdDecreaseButton) { const d = disabled || value <= min; elements.thresholdDecreaseButton.disabled = d; elements.thresholdDecreaseButton.classList.toggle('pointer-events-none', d) }
    if (elements.thresholdIncreaseButton) { const d = disabled || value >= max; elements.thresholdIncreaseButton.disabled = d; elements.thresholdIncreaseButton.classList.toggle('pointer-events-none', d) }
  }

  function updateThresholdControlsEnabled() {
    const slider = elements.thresholdSlider; if (!slider) return
    const hasImage = Boolean(state.grayscale), canAdjust = !state.thresholdLocked && hasImage
    slider.disabled = !canAdjust
    if (canAdjust) { slider.removeAttribute('disabled'); slider.style.pointerEvents = 'auto'; slider.classList.add('cursor-pointer'); slider.classList.remove('cursor-not-allowed','opacity-60'); slider.removeAttribute('tabindex') }
    else { slider.setAttribute('disabled',''); slider.style.pointerEvents = 'none'; slider.classList.remove('cursor-pointer'); slider.classList.add('cursor-not-allowed','opacity-60'); slider.setAttribute('tabindex','-1'); slider.value = String(state.lastThreshold ?? DEFAULT_THRESHOLD); slider.blur() }
    updateThresholdButtonsState()
  }

  function updateThresholdLockUI(options = {}) {
    const { skipControlsUpdate = false } = options || {}; const locked = state.thresholdLocked
    if (elements.thresholdLockStatus) elements.thresholdLockStatus.className = `${THRESHOLD_LOCK_STATUS_BASE_CLASSES} ${locked ? THRESHOLD_LOCK_STATUS_LOCKED_CLASSES : THRESHOLD_LOCK_STATUS_UNLOCKED_CLASSES}`
    if (elements.thresholdLockStatusIcon) elements.thresholdLockStatusIcon.className = locked ? 'fas fa-lock text-[11px]' : 'fas fa-unlock-alt text-[11px]'
    if (elements.thresholdLockStatusLabel) elements.thresholdLockStatusLabel.textContent = locked ? '잠금' : '변경 가능'
    if (elements.thresholdLockButton) elements.thresholdLockButton.className = `${THRESHOLD_LOCK_BUTTON_BASE_CLASSES} ${locked ? THRESHOLD_LOCK_BUTTON_UNLOCK_CLASSES : THRESHOLD_LOCK_BUTTON_LOCK_CLASSES}`
    if (elements.thresholdLockButtonIcon) elements.thresholdLockButtonIcon.className = locked ? 'fas fa-lock-open' : 'fas fa-lock'
    if (elements.thresholdLockButtonLabel) elements.thresholdLockButtonLabel.textContent = locked ? '잠금 해제' : '잠금'
    if (!skipControlsUpdate) updateThresholdControlsEnabled()
  }

  function setThresholdLocked(locked) { state.thresholdLocked = Boolean(locked); updateThresholdLockUI() }

  function toggleThresholdLock() {
    const nextLocked = !state.thresholdLocked; state.thresholdLocked = nextLocked; updateThresholdLockUI()
    if (!state.grayscale) return
    setSaveMessage(nextLocked ? '임계값 조절이 잠금되었습니다.' : '임계값 조절이 잠금 해제되었습니다.', 'muted')
  }

  /* ──────────── Image Upload ──────────── */
  async function handleImageUpload(event) {
    const file = event.target?.files?.[0]; if (!file) { resetResults(); return }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      resetResults(); elements.imageInfo.textContent = `파일이 너무 큽니다. 최대 ${(MAX_FILE_SIZE_BYTES/(1024*1024)).toFixed(0)}MB 이하의 파일을 선택해주세요.`
      setSaveMessage('파일이 너무 커서 불러올 수 없습니다.', 'error'); event.target.value = ''; return
    }
    const sourceLabel = event.target === elements.cameraInput ? '촬영한 이미지를' : '선택한 이미지를'
    setProcessingOverlay(true, '이미지를 불러오는 중', `${sourceLabel} 해석하고 있습니다…`); await waitForNextFrame()
    try {
      setThresholdLocked(true)
      const image = await loadImageFromFile(file)
      state.inspectionStartedAt = new Date()
      state.msrmDate = new Date() // 측정일시 자동 기록

      const longestSide = Math.max(image.width, image.height)
      let processingMaxDimension = Math.min(MAX_DISPLAY_DIMENSION, longestSide)
      let resizedForPerformance = false
      if (longestSide > AUTO_RESIZE_TRIGGER_DIMENSION || file.size > AUTO_RESIZE_TRIGGER_FILE_BYTES) {
        const cappedTarget = Math.min(longestSide, AUTO_RESIZE_TARGET_DIMENSION)
        const safeTarget = Math.min(longestSide, Math.max(MIN_RESIZE_TARGET_DIMENSION, cappedTarget))
        if (safeTarget < longestSide) { processingMaxDimension = safeTarget; resizedForPerformance = true }
      }
      state.processingMaxDimension = Math.max(1, processingMaxDimension)
      state.resizedForPerformance = resizedForPerformance
      if (state.resizedForPerformance) updateProcessingMessage(`고해상도 이미지를 자동으로 최대 ${state.processingMaxDimension}px 범위로 최적화합니다…`)

      setProcessingOverlay(true, '8비트 변환 중', '이미지를 흑백(8bit)으로 변환하고 있습니다…')
      await prepareCanvasWithImage(image)
      setProcessingOverlay(true, '객체 감지 중', '임계값을 적용하여 지분을 감지하고 있습니다…')
      updateThresholdControlsEnabled(); await waitForNextFrame()
      await applyThreshold({ reportProgress: true, force: true })
      updateThresholdControlsEnabled()
      setManualStatusMessage('수동 추가 모드를 사용하려면 버튼을 눌러 활성화하세요.', 'muted')
    } catch (error) {
      console.error(error); elements.imageInfo.textContent = '이미지를 불러오는 중 문제가 발생했습니다.'; resetResults()
    } finally {
      setProcessingOverlay(false); if (event?.target) event.target.value = ''
    }
  }

  function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file); const image = new Image()
      image.onload = () => { URL.revokeObjectURL(url); resolve(image) }
      image.onerror = (err) => { URL.revokeObjectURL(url); reject(err) }
      image.src = url
    })
  }

  async function prepareCanvasWithImage(image) {
    const targetMaxDimension = Math.max(1, state.processingMaxDimension || MAX_DISPLAY_DIMENSION)
    const longestSide = Math.max(image.width, image.height)
    const scale = Math.min(1, targetMaxDimension / longestSide)
    const width = Math.max(1, Math.round(image.width * scale))
    const height = Math.max(1, Math.round(image.height * scale))
    const workCanvas = document.createElement('canvas'); workCanvas.width = width; workCanvas.height = height
    const workCtx = workCanvas.getContext('2d', { willReadFrequently: true })
    if (!workCtx) throw new Error('캔버스 컨텍스트를 초기화할 수 없습니다.')
    workCtx.drawImage(image, 0, 0, width, height); await waitForNextFrame()
    const imageData = workCtx.getImageData(0, 0, width, height)
    updateProcessingMessage('이미지를 8bit로 변환하고 있습니다…')
    const grayscale = await convertToGrayscale(imageData, (p) => updateProcessingMessage(`이미지를 8bit로 변환하고 있습니다… ${p}%`))
    state.grayscale = grayscale; state.width = width; state.height = height; state.originalImageData = imageData
    state.original = { width: image.width, height: image.height }
    elements.originalCanvas.width = width; elements.originalCanvas.height = height
    elements.binaryCanvas.width = width; elements.binaryCanvas.height = height
    elements.markerCanvas.width = width; elements.markerCanvas.height = height
    if (originalCtx) { originalCtx.clearRect(0, 0, width, height); originalCtx.putImageData(imageData, 0, 0) }
    elements.originalCanvas.classList.remove('hidden'); elements.originalPlaceholder?.classList.add('hidden')
    elements.binaryCanvas.classList.remove('hidden'); elements.markerCanvas.classList.remove('hidden'); elements.placeholder?.classList.add('hidden')
    updateImageInfo(scale); syncCanvasDisplaySizes(); updateThresholdControlsEnabled()
  }

  async function convertToGrayscale(imageData, onProgress) {
    const { data, width, height } = imageData; const totalPixels = width * height
    const grayscale = new Uint8ClampedArray(totalPixels)
    const chunkSize = Math.max(50000, Math.min(PROCESS_CHUNK_SIZE, Math.ceil(totalPixels / 40)))
    for (let i = 0; i < totalPixels; i++) {
      const base = i * 4; grayscale[i] = Math.round(0.299 * data[base] + 0.587 * data[base + 1] + 0.114 * data[base + 2])
      if ((i + 1) % chunkSize === 0) { if (typeof onProgress === 'function') onProgress(Math.min(100, Math.round(((i+1)/totalPixels)*100))); await waitForNextFrame() }
    }
    if (typeof onProgress === 'function') onProgress(100); return grayscale
  }

  function updateImageInfo(scale) {
    const { width, height } = state; const original = state.original
    const totalPixels = (width * height).toLocaleString('ko-KR')
    const scaleText = scale < 1 ? ` (원본: ${original.width} x ${original.height} px, ${(scale*100).toFixed(1)}% 축소)` : ''
    let resizeNote = ''
    if (scale < 1) {
      const appliedMax = Math.round(Math.max(width, height))
      resizeNote = state.resizedForPerformance
        ? `<br /><span class="text-xs text-emerald-600">고해상도 이미지를 자동으로 최대 ${appliedMax}px 범위로 최적화하여 분석했습니다.</span>`
        : `<br /><span class="text-xs text-slate-400">브라우저 안정성을 위해 최대 ${appliedMax}px 범위로 축소 분석합니다.</span>`
    }
    elements.imageInfo.innerHTML = `해상도: ${width} x ${height} px${scaleText}<br />총 픽셀 수: ${totalPixels}${resizeNote}`
    setSaveMessage('결과를 검토한 뒤 저장 버튼을 눌러 DB에 추가하세요.')
  }

  /* ──────────── Threshold / Detection ──────────── */
  async function applyThreshold(options = {}) {
    if (!state.grayscale || !binaryCtx || !markerCtx || !state.originalImageData) return
    const { reportProgress = false, force = false } = options
    if (state.thresholdLocked && !force) {
      elements.thresholdSlider.value = String(state.lastThreshold ?? DEFAULT_THRESHOLD)
      elements.thresholdValue.textContent = `0 ~ ${state.lastThreshold ?? DEFAULT_THRESHOLD}`
      updateThresholdButtonsState(); return
    }
    const currentJobId = ++thresholdJobId
    const threshold = Number(elements.thresholdSlider.value); state.lastThreshold = threshold
    elements.thresholdValue.textContent = `0 ~ ${threshold}`; updateThresholdButtonsState()
    const sourceData = state.originalImageData.data
    const displayData = new Uint8ClampedArray(sourceData.length); displayData.set(sourceData)
    const mask = new Uint8Array(state.grayscale.length)
    const totalPixels = state.grayscale.length; const chunkSize = Math.max(50000, Math.ceil(totalPixels / 60))
    for (let i = 0; i < totalPixels; i++) {
      if (currentJobId !== thresholdJobId) return
      const isObject = state.grayscale[i] <= threshold; mask[i] = isObject ? 1 : 0
      if (isObject) { const idx = i * 4; displayData[idx] = 255; displayData[idx+1] = 255; displayData[idx+2] = 255; displayData[idx+3] = 255 }
      if ((i+1) % chunkSize === 0) { if (reportProgress) updateProcessingMessage(`임계값 적용 중… ${Math.min(99,Math.round(((i+1)/totalPixels)*100))}%`); await waitForNextFrame() }
    }
    if (currentJobId !== thresholdJobId) return
    if (reportProgress) updateProcessingMessage('임계값 적용 완료… 100%')
    binaryCtx.putImageData(new ImageData(displayData, state.width, state.height), 0, 0)
    const detectionStamp = Date.now()
    const rawComponents = extractComponents(mask, state.width, state.height)
    const components = rawComponents.map((c, i) => ({ ...c, id: `auto-${detectionStamp}-${i}`, source: 'auto' }))
    if (currentJobId !== thresholdJobId) return
    state.detectedComponents = components; state.baseObjectPixelCount = calculateComponentPixelSum(components)
    state.lastMask = mask; state.removedAutoIds = new Set()
    updateCombinedComponents()
    setSaveMessage(state.components.length ? '결과를 저장하려면 버튼을 눌러주세요.' : '임계값을 조정하거나 수동으로 객체를 추가한 후 저장하세요.')
  }

  function calculateComponentPixelSum(components) { return (components || []).reduce((s, c) => s + (c.size || 0), 0) }

  function getEmptyMetrics() {
    return {
      totalCount: 0, coverageRatio: 0, densityCount: 0, densityRatio: 0,
      sizeUniformityScore: 0, distributionUniformityScore: 0, meanSize: 0, stdSize: 0,
      autoCount: 0, manualCount: 0, removedAutoCount: 0, objectPixelCount: 0, totalPixels: 0,
      sizeBuckets: { upTo3: 0, upTo5: 0, upTo7: 0, over7: 0 },
      quadrantCounts: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
    }
  }

  function computeQualityMetrics({ components, width, height, objectPixelCount, autoCount, manualCount, removedAutoCount }) {
    const metrics = getEmptyMetrics(); const safeComponents = Array.isArray(components) ? components : []
    const totalCount = safeComponents.length; metrics.totalCount = totalCount
    metrics.autoCount = Math.max(0, autoCount || 0); metrics.manualCount = Math.max(0, manualCount || 0); metrics.removedAutoCount = Math.max(0, removedAutoCount || 0)
    const totalPixels = Math.max(1, (width || 0) * (height || 0)); metrics.totalPixels = (width||0)*(height||0)
    metrics.objectPixelCount = Math.max(0, objectPixelCount || 0); metrics.coverageRatio = (metrics.objectPixelCount / totalPixels) * 100
    if (!totalCount) return metrics
    const sizes = []; const halfWidth = (width || 0) / 2; const halfHeight = (height || 0) / 2
    safeComponents.forEach((c) => {
      const size = Math.max(0, c?.size || 0); sizes.push(size)
      if (size <= SIZE_BUCKET_THRESHOLDS.upTo3) metrics.sizeBuckets.upTo3++
      else if (size <= SIZE_BUCKET_THRESHOLDS.upTo5) metrics.sizeBuckets.upTo5++
      else if (size <= SIZE_BUCKET_THRESHOLDS.upTo7) metrics.sizeBuckets.upTo7++
      else metrics.sizeBuckets.over7++
      const diameter = Math.sqrt(size)
      if (Number.isFinite(diameter) && diameter >= DENSITY_DIAMETER_RANGE.min && diameter <= DENSITY_DIAMETER_RANGE.max) metrics.densityCount++
      const cx = Number(c?.centroid?.x) || 0, cy = Number(c?.centroid?.y) || 0
      if (cy < halfHeight && cx < halfWidth) metrics.quadrantCounts.topLeft++
      else if (cy < halfHeight) metrics.quadrantCounts.topRight++
      else if (cx < halfWidth) metrics.quadrantCounts.bottomLeft++
      else metrics.quadrantCounts.bottomRight++
    })
    const sumSizes = sizes.reduce((s, v) => s + v, 0); const meanSize = totalCount ? sumSizes / totalCount : 0
    const variance = totalCount > 0 ? sizes.reduce((s, v) => s + Math.pow(v - meanSize, 2), 0) / Math.max(1, sizes.length) : 0
    const stdSize = Math.sqrt(variance); metrics.meanSize = meanSize; metrics.stdSize = stdSize
    metrics.densityRatio = totalCount ? (metrics.densityCount / totalCount) * 100 : 0
    metrics.sizeUniformityScore = sizes.length === 0 ? 0 : (sizes.length === 1 || meanSize === 0) ? 100 : clamp(100 - (stdSize / meanSize) * 100, 0, 100)
    const counts = Object.values(metrics.quadrantCounts)
    if (totalCount > 0 && counts.length) {
      const expected = totalCount / counts.length
      if (expected > 0) { const vq = counts.reduce((s, c) => s + Math.pow(c - expected, 2), 0) / counts.length; metrics.distributionUniformityScore = clamp(100 - (Math.sqrt(vq) / expected) * 100, 0, 100) }
    }
    return metrics
  }

  function extractComponents(mask, width, height) {
    const visited = new Uint8Array(mask.length); const components = []
    for (let index = 0; index < mask.length; index++) {
      if (!mask[index] || visited[index]) continue
      const queue = [index]; let cursor = 0, size = 0, sumX = 0, sumY = 0, minX = width, minY = height, maxX = 0, maxY = 0
      visited[index] = 1
      while (cursor < queue.length) {
        const current = queue[cursor++]; const x = current % width; const y = Math.floor(current / width)
        size++; sumX += x; sumY += y
        if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y
        if (x > 0) { const li = current - 1; if (mask[li] && !visited[li]) { visited[li] = 1; queue.push(li) } }
        if (x < width - 1) { const ri = current + 1; if (mask[ri] && !visited[ri]) { visited[ri] = 1; queue.push(ri) } }
        if (y > 0) { const ui = current - width; if (mask[ui] && !visited[ui]) { visited[ui] = 1; queue.push(ui) } }
        if (y < height - 1) { const di = current + width; if (mask[di] && !visited[di]) { visited[di] = 1; queue.push(di) } }
      }
      if (size > 0) components.push({ size, centroid: { x: sumX / size, y: sumY / size }, bbox: { minX, minY, maxX, maxY } })
    }
    return components
  }

  function updateCombinedComponents() {
    const activeAuto = state.detectedComponents.filter(c => !state.removedAutoIds.has(c.id))
    const manual = [...state.manualComponents]; const combined = [...activeAuto, ...manual]
    state.components = combined; state.objectPixelCount = calculateComponentPixelSum(activeAuto) + calculateComponentPixelSum(manual)
    drawMarkers(combined)
    updateSummary({ components: combined, threshold: state.lastThreshold, objectPixelCount: state.objectPixelCount, autoCount: activeAuto.length, manualCount: manual.length, removedAutoCount: state.removedAutoIds.size })
    updateSaveButtonState(); updateManualControlsState()
  }

  function drawMarkers(components) {
    if (!markerCtx) return; markerCtx.clearRect(0, 0, elements.markerCanvas.width, elements.markerCanvas.height)
    if (!components.length) return
    components.forEach((c, i) => {
      const radius = c.source === 'manual' ? MANUAL_COMPONENT_RADIUS : Math.max(4, Math.min(12, Math.sqrt(c.size)))
      markerCtx.lineWidth = 1.5
      if (c.source === 'manual') { markerCtx.fillStyle = 'rgba(16,185,129,0.65)'; markerCtx.strokeStyle = 'rgba(5,150,105,0.9)' }
      else { markerCtx.fillStyle = 'rgba(220,38,38,0.55)'; markerCtx.strokeStyle = 'rgba(185,28,28,0.9)' }
      markerCtx.beginPath(); markerCtx.arc(c.centroid.x, c.centroid.y, radius, 0, Math.PI * 2); markerCtx.fill()
      markerCtx.beginPath(); markerCtx.rect(c.bbox.minX - 0.5, c.bbox.minY - 0.5, c.bbox.maxX - c.bbox.minX + 1, c.bbox.maxY - c.bbox.minY + 1); markerCtx.stroke()
      markerCtx.fillStyle = 'rgba(15,23,42,0.9)'; markerCtx.font = '12px Pretendard, system-ui, sans-serif'
      markerCtx.fillText(String(i + 1), c.centroid.x + radius + 4, c.centroid.y - radius)
    })
  }

  function updateSummary({ components, threshold, objectPixelCount, autoCount, manualCount, removedAutoCount }) {
    const metrics = computeQualityMetrics({ components, width: state.width, height: state.height, objectPixelCount, autoCount, manualCount, removedAutoCount })
    state.currentMetrics = metrics; renderQualitySummary(metrics)
    const coverageText = formatCoveragePpm(metrics.coverageRatio, 2)
    const parts = []
    if (autoCount) parts.push(`자동 ${autoCount}개`); if (removedAutoCount) parts.push(`제외 ${removedAutoCount}개`); if (manualCount) parts.push(`수동 ${manualCount}개`)
    elements.objectCount.textContent = `인식된 객체: ${metrics.totalCount.toLocaleString('ko-KR')}개${parts.length ? ` (${parts.join(' · ')})` : ''} · 면적 비율: ${coverageText} ppm (임계값: 0 ~ ${threshold})`
    if (!metrics.totalCount) { elements.positionsList.innerHTML = '<p class="text-slate-400">지분이 아직 없습니다.</p>'; return }
    const ratioText = `${coverageText} ppm`
    elements.positionsList.innerHTML = components.map((c, i) => {
      const isManual = c.source === 'manual'; const tagLabel = isManual ? '수동 추가' : '자동 검출'
      const tagClass = isManual ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-indigo-100 text-indigo-700 border-indigo-200'
      return `<div class="flex flex-col gap-2 rounded-xl bg-white px-3 py-3 shadow-sm"><div class="flex items-center justify-between gap-2"><div class="flex items-center gap-2"><span class="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900/10 text-sm font-semibold text-slate-700">${i+1}</span><span class="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${tagClass}">${tagLabel}</span></div><button type="button" class="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-500 transition hover:border-rose-300 hover:text-rose-600" data-component-action="remove" data-component-id="${c.id}">제외</button></div><div class="grid gap-1 text-xs text-slate-500 sm:grid-cols-2"><p>중심: (${c.centroid.x.toFixed(1)}, ${c.centroid.y.toFixed(1)})</p><p>경계: [${c.bbox.minX}, ${c.bbox.minY} ~ ${c.bbox.maxX}, ${c.bbox.maxY}]</p><p>픽셀: ${c.size.toLocaleString('ko-KR')}</p><p>임계값: 0 ~ ${threshold} · ${ratioText}</p></div></div>`
    }).join('')
  }

  function renderQualitySummary(metrics) {
    const m = metrics || getEmptyMetrics(); const c = elements.metricCards; const b = elements.sizeBucketValues; const q = elements.quadrantValues
    if (c.totalValue) c.totalValue.textContent = formatInteger(m.totalCount)
    if (c.totalSub) { const p = []; if (m.autoCount) p.push(`자동 ${formatInteger(m.autoCount)}개`); if (m.manualCount) p.push(`수동 ${formatInteger(m.manualCount)}개`); if (m.removedAutoCount) p.push(`제외 ${formatInteger(m.removedAutoCount)}개`); c.totalSub.textContent = p.length ? p.join(' · ') : '자동/수동/제외 현황' }
    if (c.densityValue) c.densityValue.textContent = formatInteger(m.densityCount)
    if (c.densitySub) c.densitySub.textContent = m.totalCount ? `전체 대비 ${formatDecimal(m.densityRatio, 1)}%` : '전체 대비 0%'
    if (c.coverageValue) c.coverageValue.textContent = `${formatCoveragePpm(m.coverageRatio, 2)} ppm`
    if (c.coverageSub) c.coverageSub.textContent = m.totalPixels ? `${formatInteger(m.objectPixelCount)} px² / ${formatInteger(m.totalPixels)} px²` : `${formatInteger(m.objectPixelCount)} px²`
    if (c.sizeUniformityValue) c.sizeUniformityValue.textContent = `${formatDecimal(m.sizeUniformityScore, 1)}점`
    if (c.sizeUniformitySub) c.sizeUniformitySub.textContent = m.totalCount ? `평균 ${formatDecimal(m.meanSize, 1)} px² · 표준편차 ${formatDecimal(m.stdSize, 1)}` : '객체 없음'
    if (c.distributionValue) c.distributionValue.textContent = `${formatDecimal(m.distributionUniformityScore, 1)}점`
    if (c.distributionSub) c.distributionSub.textContent = '4분할 기준 분포 균일도'
    if (b.upTo3) b.upTo3.textContent = formatInteger(m.sizeBuckets.upTo3)
    if (b.upTo5) b.upTo5.textContent = formatInteger(m.sizeBuckets.upTo5)
    if (b.upTo7) b.upTo7.textContent = formatInteger(m.sizeBuckets.upTo7)
    if (b.over7) b.over7.textContent = formatInteger(m.sizeBuckets.over7)
    if (q.topLeft) q.topLeft.textContent = formatInteger(m.quadrantCounts.topLeft)
    if (q.topRight) q.topRight.textContent = formatInteger(m.quadrantCounts.topRight)
    if (q.bottomLeft) q.bottomLeft.textContent = formatInteger(m.quadrantCounts.bottomLeft)
    if (q.bottomRight) q.bottomRight.textContent = formatInteger(m.quadrantCounts.bottomRight)
  }

  /* ──────────── REST API - Save ──────────── */

  const SAVE_IMAGE_MAX_DIM = 1024    // 저장 이미지 최대 크기 (px)
  const SAVE_IMAGE_QUALITY = 0.75    // JPEG 품질 (0.0 ~ 1.0)

  /**
   * Canvas를 리사이즈 후 JPEG Blob으로 변환 (비동기)
   */
  function canvasToJpegBlob(canvas, maxDim, quality) {
    return new Promise((resolve) => {
      if (!canvas || !canvas.width || !canvas.height) return resolve(null)
      const sw = canvas.width, sh = canvas.height
      const scale = Math.min(1, maxDim / Math.max(sw, sh))
      const dw = Math.round(sw * scale), dh = Math.round(sh * scale)

      let target = canvas
      if (scale < 1) {
        target = document.createElement('canvas')
        target.width = dw; target.height = dh
        target.getContext('2d').drawImage(canvas, 0, 0, dw, dh)
      }
      target.toBlob((blob) => resolve(blob), 'image/jpeg', quality)
    })
  }

  /**
   * 결과 이미지(이진화 + 마킹)를 합성 후 JPEG Blob으로 반환
   */
  async function captureResultImageBlob() {
    try {
      if (!elements.binaryCanvas || !elements.markerCanvas || !state.width || !state.height) return null
      const merged = document.createElement('canvas')
      merged.width = state.width; merged.height = state.height
      const ctx = merged.getContext('2d')
      ctx.drawImage(elements.binaryCanvas, 0, 0)
      ctx.drawImage(elements.markerCanvas, 0, 0)
      return await canvasToJpegBlob(merged, SAVE_IMAGE_MAX_DIM, SAVE_IMAGE_QUALITY)
    } catch (e) {
      console.warn('결과 이미지 캡처 실패:', e)
      return null
    }
  }

  /**
   * 원본 Canvas에서 JPEG Blob으로 반환
   */
  async function captureOriginalImageBlob() {
    try {
      if (!elements.originalCanvas || !state.width || !state.height) return null
      return await canvasToJpegBlob(elements.originalCanvas, SAVE_IMAGE_MAX_DIM, SAVE_IMAGE_QUALITY)
    } catch (e) {
      console.warn('원본 이미지 캡처 실패:', e)
      return null
    }
  }

  async function handleSaveResult() {
    if (!state.components.length) return
    const saveStart = performance.now()
    try {
      setProcessingOverlay(true, '검사 결과 저장', '이미지를 압축하는 중…')
      const m = state.currentMetrics || getEmptyMetrics()

      const indBcdValue = (elements.indBcdInput?.value || '').trim() || null
      const lotnrValue = (elements.lotnrInput?.value || '').trim() || null
      const matnrValue = (elements.matnrInput?.value || '').trim() || null
      const inspectedAtValue = state.inspectionStartedAt || new Date()

      // ── Upsert 사전 체크: 동일 자재+LOT+바코드 조합 존재 여부 확인 ──
      if (matnrValue && lotnrValue && indBcdValue) {
        try {
          updateProcessingMessage('기존 검사 결과 확인 중…')
          const checkUrl = `${API_BASE}/check-exists?matnr=${encodeURIComponent(matnrValue)}&lotnr=${encodeURIComponent(lotnrValue)}&indBcd=${encodeURIComponent(indBcdValue)}`
          const checkRes = await axios.get(checkUrl)
          if (checkRes.data.exists) {
            setProcessingOverlay(false)
            const confirmed = window.confirm(
              '기존에 존재하던 검사 결과를 변경하시겠습니까?\n\n' +
              '예를 누르면, 기존 검사 결과는 사라지고 새 데이터로 업데이트 됩니다.'
            )
            if (!confirmed) {
              setSaveMessage('저장이 취소되었습니다.', 'muted')
              return
            }
            setProcessingOverlay(true, '검사 결과 저장', '이미지를 압축하는 중…')
          }
        } catch (checkErr) {
          console.warn('[CHECK-EXISTS] 사전 체크 실패, 저장 계속 진행:', checkErr.message)
        }
      }

      // Canvas에서 JPEG Blob으로 캡처 (PNG 대비 5-10배 빠름)
      const [originalBlob, resultBlob] = await Promise.all([
        captureOriginalImageBlob(),
        captureResultImageBlob()
      ])

      updateProcessingMessage('서버에 전송 중…')

      // FormData로 multipart 전송 (Base64-in-JSON 대비 ~30% 작음)
      const fd = new FormData()
      const meta = {
        msrmDate: state.msrmDate ? state.msrmDate.toISOString() : new Date().toISOString(),
        prcSeqno: elements.prcSeqnoInput?.value ? Number(elements.prcSeqnoInput.value) : null,
        indBcd: indBcdValue,
        lotnr: lotnrValue,
        matnr: matnrValue,
        matnrNm: (elements.matnrNmInput?.value || '').trim() || null,
        inspectedAt: inspectedAtValue.toISOString(),
        thresholdMax: state.lastThreshold,
        totalCount: m.totalCount,
        coverageRatio: m.coverageRatio,
        densityCount: m.densityCount,
        densityRatio: m.densityRatio,
        sizeUniformityScore: m.sizeUniformityScore,
        distributionUniformityScore: m.distributionUniformityScore,
        meanSize: m.meanSize,
        stdSize: m.stdSize,
        autoCount: m.autoCount,
        manualCount: m.manualCount,
        removedAutoCount: m.removedAutoCount,
        bucketUpTo3: m.sizeBuckets.upTo3,
        bucketUpTo5: m.sizeBuckets.upTo5,
        bucketUpTo7: m.sizeBuckets.upTo7,
        bucketOver7: m.sizeBuckets.over7,
        quadrantTopLeft: m.quadrantCounts.topLeft,
        quadrantTopRight: m.quadrantCounts.topRight,
        quadrantBottomLeft: m.quadrantCounts.bottomLeft,
        quadrantBottomRight: m.quadrantCounts.bottomRight,
        objectPixelCount: m.objectPixelCount,
        totalPixels: m.totalPixels,
        manualAddedCount: m.manualCount,
        manualRemovedCount: m.removedAutoCount,
        operatorId: (elements.operatorIdInput?.value || '').trim() || null,
        operatorNm: (elements.operatorNmInput?.value || '').trim() || null,
      }
      fd.append('metadata', JSON.stringify(meta))
      if (originalBlob) fd.append('originalImage', originalBlob, 'original.jpg')
      if (resultBlob) fd.append('resultImage', resultBlob, 'result.jpg')

      const res = await axios.post(API_BASE, fd)
      const saved = res.data
      const elapsed = ((performance.now() - saveStart) / 1000).toFixed(1)
      const autoTitle = indBcdValue
        ? `${indBcdValue} - ${formatDateTime(inspectedAtValue.toISOString())}`
        : `검사 ${formatDateTime(inspectedAtValue.toISOString())}`
      const isUpdate = saved._action === 'UPDATE' || saved.isUpdate === true
      const actionLabel = isUpdate ? '갱신(UPDATE)' : '신규저장(INSERT)'
      setSaveMessage(`${autoTitle} ${actionLabel} 완료 (seq: ${saved.seq}, 차수: ${saved.indBcdSeq || '-'}) [${elapsed}초]`, 'success')
      loadHistoryFromServer(0)

      // ── MES 결과 전송 (DB 저장 성공 후 자동 실행) ──
      await sendResultToMes(saved, m, isUpdate)
    } catch (error) {
      console.error(error)
      setSaveMessage('저장 중 오류가 발생했습니다: ' + (error.response?.data?.error || error.message), 'error')
    } finally {
      setProcessingOverlay(false)
    }
  }

  /* ──────────── REST API - MES 결과 전송 ──────────── */
  /**
   * DB 저장 완료 후 MES에 검사 결과를 자동 전송
   * @param {object} saved - 서버에서 저장된 inspection 레코드
   * @param {object} metrics - 현재 검사 지표
   */
  async function sendResultToMes(saved, metrics, isUpdate = false) {
    const indBcd = saved.indBcd
    if (!indBcd) {
      console.warn('[MES] 개별바코드(IND_BCD)가 없어 MES 전송을 건너뜁니다.')
      return
    }

    try {
      updateProcessingMessage('MES에 결과 전송 중…')
      setProcessingOverlay(true, 'MES 전송', '검사 결과를 MES에 전송하고 있습니다…')

      // MES 전송 규격: IND_BCD(개별바코드) + ResultData(커버리지 결과 값)
      const coveragePpm = saved.coverageRatio != null
        ? Number((saved.coverageRatio * 10000).toFixed(4))
        : 0

      const mesPayload = {
        IND_BCD: indBcd,
        ResultData: coveragePpm,
      }

      console.log('[MES] 전송 payload:', mesPayload)
      const mesRes = await axios.post(MES_API_BASE, mesPayload)
      const mesResult = mesRes.data

      if (mesResult.success) {
        const actionLabel = isUpdate ? '갱신' : '저장'
        setSaveMessage(
          `${saved.indBcd} ${actionLabel} 완료 (seq: ${saved.seq}) + MES 전송 성공 (커버리지: ${coveragePpm} ppm)`,
          'success'
        )
        console.log('[MES] 전송 성공:', mesResult)
      } else {
        setSaveMessage(
          `저장 완료 · MES 전송 실패: ${mesResult.message || '알 수 없는 오류'}`,
          'error'
        )
        console.warn('[MES] 전송 실패:', mesResult)
      }
    } catch (mesError) {
      console.error('[MES] 전송 오류:', mesError)
      setSaveMessage(
        `DB 저장 완료 · MES 전송 오류: ${mesError.response?.data?.message || mesError.message}`,
        'error'
      )
    } finally {
      setProcessingOverlay(false)
    }
  }

  /* ──────────── REST API - Load History ──────────── */
  async function loadHistoryFromServer(page) {
    try {
      currentHistoryPage = page
      // 검사 이력 탭 검색 (기존 호환)
      const keyword = elements.historySearchInput ? elements.historySearchInput.value.trim() : ''
      // 이력 테이블 탭 필터
      const dateFrom = elements.tableFilterDateFrom ? elements.tableFilterDateFrom.value : ''
      const dateTo = elements.tableFilterDateTo ? elements.tableFilterDateTo.value : ''
      const indBcd = elements.tableFilterIndBcd ? elements.tableFilterIndBcd.value.trim() : ''

      let url
      if (keyword) {
        // 검사 이력(카드) 탭 기존 검색
        url = `${API_BASE}/search?type=indBcd&keyword=${encodeURIComponent(keyword)}&page=${page}&size=${MAX_HISTORY_PAGE_SIZE}`
        if (dateFrom) url += `&dateFrom=${dateFrom}`
        if (dateTo) url += `&dateTo=${dateTo}`
      } else {
        // 기본 목록 + 이력 테이블 탭 필터
        const params = new URLSearchParams({ page: String(page), size: String(MAX_HISTORY_PAGE_SIZE) })
        if (dateFrom) params.set('dateFrom', dateFrom)
        if (dateTo) params.set('dateTo', dateTo)
        if (indBcd) params.set('indBcd', indBcd)
        url = `${API_BASE}?${params.toString()}`
      }

      const res = await axios.get(url)
      const data = res.data
      const entries = data.content || []
      const totalPages = data.totalPages || 0
      renderHistoryCards(entries)
      renderHistoryTable(entries)
      renderPagination(elements.historyPagination, totalPages, page)
      renderPagination(elements.historyTablePagination, totalPages, page)
    } catch (error) {
      console.error('이력 조회 실패', error)
      if (elements.historyList) elements.historyList.innerHTML = '<p class="text-rose-400">서버에서 이력을 불러오지 못했습니다.</p>'
    }
  }

  function renderPagination(container, totalPages, currentPage) {
    if (!container) return
    if (totalPages <= 1) { container.innerHTML = ''; return }
    let html = ''
    if (currentPage > 0) html += `<button class="px-3 py-1 rounded border text-sm" data-page="${currentPage - 1}">&laquo; 이전</button>`
    for (let p = 0; p < totalPages; p++) {
      const active = p === currentPage ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white text-slate-600 border-slate-300 hover:border-indigo-300'
      html += `<button class="px-3 py-1 rounded border text-sm ${active}" data-page="${p}">${p + 1}</button>`
    }
    if (currentPage < totalPages - 1) html += `<button class="px-3 py-1 rounded border text-sm" data-page="${currentPage + 1}">다음 &raquo;</button>`
    container.innerHTML = html
    container.querySelectorAll('button[data-page]').forEach(btn => {
      btn.addEventListener('click', () => loadHistoryFromServer(Number(btn.dataset.page)))
    })
  }

  /* ──────────── REST API - Delete ──────────── */
  async function handleClearHistory() {
    const confirmed = window.confirm('서버에 저장된 검사 이력을 모두 삭제할까요? 복구할 수 없습니다.')
    if (!confirmed) return
    try {
      await axios.delete(API_BASE)
      loadHistoryFromServer(0)
      setSaveMessage('전체 검사 이력이 삭제되었습니다.', 'muted')
    } catch (error) {
      console.error(error); setSaveMessage('삭제 중 오류가 발생했습니다.', 'error')
    }
  }

  async function handleHistoryActionClick(event) {
    const btn = event.target.closest?.('[data-history-action]'); if (!btn) return
    const action = btn.getAttribute('data-history-action'); const id = btn.getAttribute('data-history-id')
    if (action === 'delete' && id) {
      try {
        await axios.delete(`${API_BASE}/${id}`)
        loadHistoryFromServer(currentHistoryPage)
        setSaveMessage('선택한 검사 이력이 삭제되었습니다.', 'muted')
      } catch (error) {
        console.error(error); setSaveMessage('삭제 중 오류가 발생했습니다.', 'error')
      }
    }
  }

  /* ──────────── Render History Cards ──────────── */
  function renderHistoryCards(entries) {
    if (!elements.historyList) return
    if (!entries.length) {
      elements.historyList.innerHTML = '<p class="text-slate-400">저장된 검사 이력이 없습니다.</p>'
      return
    }
    elements.historyList.innerHTML = entries.map(entry => {
      const indBcd = entry.indBcd ? escapeHtml(entry.indBcd) : '-'
      const lotnr = entry.lotnr ? escapeHtml(entry.lotnr) : '-'
      const matnr = entry.matnr ? escapeHtml(entry.matnr) : '-'
      const matnrNm = entry.matnrNm ? escapeHtml(entry.matnrNm) : ''
      const inspectedAt = entry.inspectedAt ? formatDateTime(entry.inspectedAt) : '-'
      const operatorId = entry.operatorId ? escapeHtml(entry.operatorId) : ''
      const operatorNm = entry.operatorNm ? escapeHtml(entry.operatorNm) : ''
      const operatorDisplay = operatorId ? (operatorNm ? `${operatorId} (${operatorNm})` : operatorId) : '-'
      const coverageDisplay = entry.coverageRatio != null ? formatCoveragePpm(entry.coverageRatio, 2) : '-'

      // ── 이미지 섹션 ──
      const hasImages = entry.originalImagePath || entry.resultImagePath
      const imageSection = hasImages ? `
        <div class="grid gap-3 sm:grid-cols-2">
          <div class="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            ${entry.originalImagePath
              ? `<p class="bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-500">검사 전 (원본)</p>
                 <img src="${escapeHtml(entry.originalImagePath)}" alt="원본" class="w-full" loading="lazy" />`
              : `<div class="flex h-24 items-center justify-center text-xs text-slate-400">원본 없음</div>`}
          </div>
          <div class="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            ${entry.resultImagePath
              ? `<p class="bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-500">검사 후 (마킹)</p>
                 <img src="${escapeHtml(entry.resultImagePath)}" alt="결과" class="w-full" loading="lazy" />`
              : `<div class="flex h-24 items-center justify-center text-xs text-slate-400">결과 없음</div>`}
          </div>
        </div>` : ''

      // ── 카드 ──
      return `
        <article class="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <!-- 헤더: 핵심 정보 강조 -->
          <div class="border-b border-slate-100 bg-slate-50/50 px-5 py-3">
            <div class="flex items-start justify-between">
              <div class="flex items-center gap-3">
                <span class="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600">#${entry.seq}</span>
                <div>
                  <h3 class="text-sm font-bold text-slate-900">${indBcd}${entry.indBcdSeq ? ` <span class="text-slate-400 font-normal text-xs">(${escapeHtml(entry.indBcdSeq)}차)</span>` : ''}</h3>
                  <p class="text-[11px] text-slate-400">${inspectedAt}</p>
                </div>
              </div>
              <button type="button"
                class="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-500 transition hover:bg-rose-50"
                data-history-action="delete" data-history-id="${entry.id}">
                <i class="fas fa-trash-alt text-[10px]"></i> 삭제
              </button>
            </div>

            <!-- 핵심 4항목: 바코드, LOT, 자재코드, 커버리지 -->
            <div class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div class="rounded-lg bg-white border border-indigo-200 px-3 py-2">
                <p class="text-[10px] font-semibold text-indigo-500">개별바코드</p>
                <p class="text-sm font-bold text-indigo-700 truncate" title="${indBcd}">${indBcd}</p>
              </div>
              <div class="rounded-lg bg-white border border-emerald-200 px-3 py-2">
                <p class="text-[10px] font-semibold text-emerald-500">LOT 번호</p>
                <p class="text-sm font-bold text-emerald-700 truncate" title="${lotnr}">${lotnr}</p>
              </div>
              <div class="rounded-lg bg-white border border-violet-200 px-3 py-2">
                <p class="text-[10px] font-semibold text-violet-500">자재코드</p>
                <p class="text-sm font-bold text-violet-700 truncate" title="${matnr}${matnrNm ? ' ('+matnrNm+')' : ''}">${matnr}${matnrNm ? ` <span class="font-normal text-[10px] text-violet-400">${matnrNm}</span>` : ''}</p>
              </div>
              <div class="rounded-lg bg-white border border-amber-200 px-3 py-2">
                <p class="text-[10px] font-semibold text-amber-500">커버리지</p>
                <p class="text-sm font-bold text-amber-700">${coverageDisplay} <span class="font-normal text-[10px] text-amber-400">ppm</span></p>
              </div>
            </div>
          </div>

          <div class="space-y-3 p-5">
            ${imageSection}

            <!-- 상세 지표 요약 -->
            <div class="grid grid-cols-3 gap-2 sm:grid-cols-6 text-center">
              <div class="rounded-lg bg-slate-50 px-2 py-1.5">
                <p class="text-[10px] text-slate-400">총 지분</p>
                <p class="text-sm font-bold text-slate-700">${formatInteger(entry.totalCount)}</p>
              </div>
              <div class="rounded-lg bg-slate-50 px-2 py-1.5">
                <p class="text-[10px] text-slate-400">밀도</p>
                <p class="text-sm font-bold text-slate-700">${formatInteger(entry.densityCount)}</p>
              </div>
              <div class="rounded-lg bg-slate-50 px-2 py-1.5">
                <p class="text-[10px] text-slate-400">임계값</p>
                <p class="text-sm font-bold text-slate-700">0~${entry.thresholdMax}</p>
              </div>
              <div class="rounded-lg bg-slate-50 px-2 py-1.5">
                <p class="text-[10px] text-slate-400">균일도</p>
                <p class="text-sm font-bold text-slate-700">${formatDecimal(entry.sizeUniformityScore, 1)}</p>
              </div>
              <div class="rounded-lg bg-slate-50 px-2 py-1.5">
                <p class="text-[10px] text-slate-400">균등도</p>
                <p class="text-sm font-bold text-slate-700">${formatDecimal(entry.distributionUniformityScore, 1)}</p>
              </div>
              <div class="rounded-lg bg-slate-50 px-2 py-1.5">
                <p class="text-[10px] text-slate-400">검사자</p>
                <p class="text-xs font-bold text-slate-700 truncate">${operatorDisplay}</p>
              </div>
            </div>
          </div>
        </article>`
    }).join('')
  }

  /* ──────────── Render History Table (모든 데이터 표시) ──────────── */
  function renderHistoryTable(entries) {
    if (!elements.historyTableBody || !elements.historyTableEmpty) return
    if (!entries.length) { elements.historyTableBody.innerHTML = ''; elements.historyTableEmpty.classList.remove('hidden'); return }
    elements.historyTableEmpty.classList.add('hidden')
    state.lastTableEntries = entries
    if (elements.exportHistoryButton) elements.exportHistoryButton.disabled = false

    elements.historyTableBody.innerHTML = entries.map((e) => {
      const v = (val, fallback = '-') => val != null && val !== '' ? escapeHtml(String(val)) : fallback
      const n = (val) => val != null ? formatInteger(val) : '0'
      const d = (val, dp = 2) => val != null ? formatDecimal(val, dp) : '0.' + '0'.repeat(dp)
      const dt = (val) => val ? formatDateTime(val) : '-'
      const ppm = (val) => val != null ? formatCoveragePpm(val, 2) : '-'

      return `<tr class="align-middle hover:bg-slate-50/60 transition border-b border-slate-100">
        <!-- 식별 -->
        <td class="px-2 py-2 text-[11px] text-slate-400 text-center font-mono">${e.seq}</td>
        <td class="px-2 py-2 text-[11px] font-bold text-indigo-700 whitespace-nowrap">${v(e.indBcd)}</td>
        <td class="px-2 py-2 text-[11px] text-slate-500 text-center">${v(e.indBcdSeq)}</td>
        <td class="px-2 py-2 text-[11px] font-semibold text-emerald-700 whitespace-nowrap">${v(e.lotnr)}</td>
        <td class="px-2 py-2 text-[11px] font-semibold text-violet-700 whitespace-nowrap">${v(e.matnr)}</td>
        <td class="px-2 py-2 text-[11px] text-violet-500">${v(e.matnrNm)}</td>
        <!-- 핵심 지표 -->
        <td class="px-2 py-2 text-[11px] font-bold text-amber-700 text-right whitespace-nowrap">${ppm(e.coverageRatio)}</td>
        <td class="px-2 py-2 text-[11px] font-semibold text-slate-700 text-center">${n(e.totalCount)}</td>
        <td class="px-2 py-2 text-[11px] text-slate-600 text-center">${n(e.densityCount)}</td>
        <td class="px-2 py-2 text-[11px] text-slate-500 text-right">${d(e.densityRatio, 1)}%</td>
        <!-- 카운트 상세 -->
        <td class="px-2 py-2 text-[11px] text-slate-600 text-center">${n(e.autoCount)}</td>
        <td class="px-2 py-2 text-[11px] text-slate-600 text-center">${n(e.manualCount)}</td>
        <td class="px-2 py-2 text-[11px] text-slate-600 text-center">${n(e.removedAutoCount)}</td>
        <td class="px-2 py-2 text-[11px] text-slate-600 text-center">${n(e.manualAddedCount)}</td>
        <td class="px-2 py-2 text-[11px] text-slate-600 text-center">${n(e.manualRemovedCount)}</td>
        <!-- 균일도 -->
        <td class="px-2 py-2 text-[11px] text-slate-600 text-right">${d(e.sizeUniformityScore, 1)}</td>
        <td class="px-2 py-2 text-[11px] text-slate-600 text-right">${d(e.distributionUniformityScore, 1)}</td>
        <td class="px-2 py-2 text-[11px] text-slate-500 text-right">${d(e.meanSize, 1)}</td>
        <td class="px-2 py-2 text-[11px] text-slate-500 text-right">${d(e.stdSize, 1)}</td>
        <!-- 크기 버킷 -->
        <td class="px-2 py-2 text-[11px] text-slate-600 text-center">${n(e.bucketUpTo3)}</td>
        <td class="px-2 py-2 text-[11px] text-slate-600 text-center">${n(e.bucketUpTo5)}</td>
        <td class="px-2 py-2 text-[11px] text-slate-600 text-center">${n(e.bucketUpTo7)}</td>
        <td class="px-2 py-2 text-[11px] text-slate-600 text-center">${n(e.bucketOver7)}</td>
        <!-- 공간 분포 -->
        <td class="px-2 py-2 text-[11px] text-slate-600 text-center">${n(e.quadrantTopLeft)}</td>
        <td class="px-2 py-2 text-[11px] text-slate-600 text-center">${n(e.quadrantTopRight)}</td>
        <td class="px-2 py-2 text-[11px] text-slate-600 text-center">${n(e.quadrantBottomLeft)}</td>
        <td class="px-2 py-2 text-[11px] text-slate-600 text-center">${n(e.quadrantBottomRight)}</td>
        <!-- 픽셀 -->
        <td class="px-2 py-2 text-[11px] text-slate-500 text-right font-mono">${n(e.objectPixelCount)}</td>
        <td class="px-2 py-2 text-[11px] text-slate-500 text-right font-mono">${n(e.totalPixels)}</td>
        <!-- 설정/시간 -->
        <td class="px-2 py-2 text-[11px] text-slate-500 text-center">${e.thresholdMax}</td>
        <td class="px-2 py-2 text-[11px] text-slate-500 whitespace-nowrap">${dt(e.inspectedAt)}</td>
        <td class="px-2 py-2 text-[11px] text-slate-500 whitespace-nowrap">${dt(e.msrmDate)}</td>
        <!-- 메타 -->
        <td class="px-2 py-2 text-[11px] text-slate-500">${v(e.operatorId)}</td>
        <td class="px-2 py-2 text-[11px] text-slate-500">${v(e.operatorNm)}</td>
        <td class="px-2 py-2 text-[11px] text-slate-500">${v(e.werks)}</td>
        <td class="px-2 py-2 text-[11px] text-slate-500">${v(e.prcSeqno)}</td>
        <td class="px-2 py-2 text-[11px] text-slate-500">${v(e.inspItemGrpCd)}</td>
        <td class="px-2 py-2 text-[11px] text-slate-500">${v(e.deviceId)}</td>
        <td class="px-2 py-2 text-[11px] text-slate-500">${v(e.status)}</td>
        <!-- 이미지 -->
        <td class="px-2 py-2 text-center">${e.originalImagePath ? `<a href="${escapeHtml(e.originalImagePath)}" target="_blank" class="text-[10px] text-indigo-500 underline">보기</a>` : '<span class="text-[10px] text-slate-300">-</span>'}</td>
        <td class="px-2 py-2 text-[11px] text-slate-500 font-mono break-all">${v(e.originalImageName)}</td>
        <td class="px-2 py-2 text-[11px] text-slate-500 font-mono break-all">${v(e.originalImageDir)}</td>
        <td class="px-2 py-2 text-center">${e.resultImagePath ? `<a href="${escapeHtml(e.resultImagePath)}" target="_blank" class="text-[10px] text-indigo-500 underline">보기</a>` : '<span class="text-[10px] text-slate-300">-</span>'}</td>
        <td class="px-2 py-2 text-[11px] text-slate-500 font-mono break-all">${v(e.resultImageName)}</td>
        <td class="px-2 py-2 text-[11px] text-slate-500 font-mono break-all">${v(e.resultImageDir)}</td>
        <!-- 관리 -->
        <td class="px-2 py-2 text-center sticky right-0 bg-white"><button type="button" class="inline-flex items-center rounded border border-rose-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-rose-500 hover:bg-rose-50" data-history-action="delete" data-history-id="${e.id}"><i class="fas fa-trash-alt"></i></button></td>
      </tr>`
    }).join('')
  }

  /* ──────────── Excel Export (SheetJS/xlsx) ──────────── */
  let xlsxLoaded = false
  function loadXlsxLibrary() {
    return new Promise((resolve, reject) => {
      if (xlsxLoaded && window.XLSX) return resolve(window.XLSX)
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
      script.onload = () => { xlsxLoaded = true; resolve(window.XLSX) }
      script.onerror = () => reject(new Error('SheetJS 라이브러리 로드 실패'))
      document.head.appendChild(script)
    })
  }

  async function handleExportExcel() {
    try {
      setSaveMessage('Excel 내보내기 준비 중…', 'muted')

      // 전체 데이터 로드 (서버에서 최대 1000건, 현재 필터 적용)
      const keyword = elements.historySearchInput ? elements.historySearchInput.value.trim() : ''
      const dateFrom = elements.tableFilterDateFrom ? elements.tableFilterDateFrom.value : ''
      const dateTo = elements.tableFilterDateTo ? elements.tableFilterDateTo.value : ''
      const indBcd = elements.tableFilterIndBcd ? elements.tableFilterIndBcd.value.trim() : ''

      let url
      if (keyword) {
        url = `${API_BASE}/search?type=indBcd&keyword=${encodeURIComponent(keyword)}&page=0&size=1000`
        if (dateFrom) url += `&dateFrom=${dateFrom}`
        if (dateTo) url += `&dateTo=${dateTo}`
      } else {
        const params = new URLSearchParams({ page: '0', size: '1000' })
        if (dateFrom) params.set('dateFrom', dateFrom)
        if (dateTo) params.set('dateTo', dateTo)
        if (indBcd) params.set('indBcd', indBcd)
        url = `${API_BASE}?${params.toString()}`
      }
      const res = await axios.get(url)
      const allEntries = res.data.content || []

      if (!allEntries.length) {
        setSaveMessage('내보낼 데이터가 없습니다.', 'error')
        return
      }

      const XLSX = await loadXlsxLibrary()

      // 엑셀 행 데이터 생성
      const rows = allEntries.map((e, idx) => ({
        'No': idx + 1,
        'SEQ': e.seq,
        '개별바코드(IND_BCD)': e.indBcd || '',
        '바코드 차수': e.indBcdSeq || '',
        'LOT번호(LOT_NO)': e.lotnr || '',
        '자재코드(MATNR)': e.matnr || '',
        '자재명(MATNR_NM)': e.matnrNm || '',
        '커버리지(ppm)': e.coverageRatio != null ? Number((e.coverageRatio * 10000).toFixed(4)) : 0,
        '총 지분수': e.totalCount || 0,
        '자동검출': e.autoCount || 0,
        '수동추가': e.manualCount || 0,
        '제외수': e.removedAutoCount || 0,
        '밀도(개수)': e.densityCount || 0,
        '밀도(%)': e.densityRatio != null ? Number(Number(e.densityRatio).toFixed(2)) : 0,
        '크기균일도': e.sizeUniformityScore != null ? Number(Number(e.sizeUniformityScore).toFixed(2)) : 0,
        '분포균등도': e.distributionUniformityScore != null ? Number(Number(e.distributionUniformityScore).toFixed(2)) : 0,
        '평균크기(px)': e.meanSize != null ? Number(Number(e.meanSize).toFixed(2)) : 0,
        '표준편차(px)': e.stdSize != null ? Number(Number(e.stdSize).toFixed(2)) : 0,
        '≤3px': e.bucketUpTo3 || 0,
        '≤5px': e.bucketUpTo5 || 0,
        '≤7px': e.bucketUpTo7 || 0,
        '>7px': e.bucketOver7 || 0,
        '좌상(TL)': e.quadrantTopLeft || 0,
        '우상(TR)': e.quadrantTopRight || 0,
        '좌하(BL)': e.quadrantBottomLeft || 0,
        '우하(BR)': e.quadrantBottomRight || 0,
        '객체픽셀': e.objectPixelCount || 0,
        '전체픽셀': e.totalPixels || 0,
        '수동추가수': e.manualAddedCount || 0,
        '수동제거수': e.manualRemovedCount || 0,
        '임계값(max)': e.thresholdMax,
        '검사일시': e.inspectedAt ? new Date(e.inspectedAt).toLocaleString('ko-KR') : '',
        '측정일시': e.msrmDate ? new Date(e.msrmDate).toLocaleString('ko-KR') : '',
        '검사자ID': e.operatorId || '',
        '검사자명': e.operatorNm || '',
        '상태': e.status || '',
        '원본이미지 경로': e.originalImagePath || '',
        '원본이미지 파일명': e.originalImageName || '',
        '원본이미지 저장경로': e.originalImageDir || '',
        '결과이미지 경로': e.resultImagePath || '',
        '결과이미지 파일명': e.resultImageName || '',
        '결과이미지 저장경로': e.resultImageDir || '',
        'ID': e.id || '',
      }))

      const ws = XLSX.utils.json_to_sheet(rows)

      // 컬럼 너비 자동 조절
      const colWidths = Object.keys(rows[0]).map(key => {
        const maxLen = Math.max(key.length, ...rows.map(r => String(r[key] ?? '').length))
        return { wch: Math.min(maxLen + 2, 30) }
      })
      ws['!cols'] = colWidths

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, '검사이력')

      const now = new Date()
      const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`
      const filename = `지분검사이력_${dateStr}.xlsx`

      XLSX.writeFile(wb, filename)
      setSaveMessage(`Excel 내보내기 완료: ${filename} (${allEntries.length}건)`, 'success')
    } catch (error) {
      console.error('Excel 내보내기 실패:', error)
      setSaveMessage('Excel 내보내기 실패: ' + error.message, 'error')
    }
  }

  /* ──────────── Manual Component ──────────── */
  function handlePositionsListAction(event) {
    const btn = event.target.closest?.('[data-component-action]'); if (!btn) return
    const action = btn.getAttribute('data-component-action'); const id = btn.getAttribute('data-component-id')
    if (action === 'remove' && id) removeComponentById(id)
  }

  function removeComponentById(id) {
    if (id.startsWith('manual-')) {
      const before = state.manualComponents.length
      state.manualComponents = state.manualComponents.filter(c => c.id !== id)
      if (state.manualComponents.length !== before) { updateCombinedComponents(); setManualStatusMessage('수동 객체가 제거되었습니다.', 'muted') }
      return
    }
    const before = state.removedAutoIds.size; state.removedAutoIds.add(id)
    if (state.removedAutoIds.size !== before) { updateCombinedComponents(); setManualStatusMessage('자동 검출된 객체를 제외했습니다.', 'muted') }
  }

  function toggleManualAddMode() {
    if (!state.grayscale) { setManualStatusMessage('이미지를 불러온 뒤 사용하세요.', 'error'); return }
    manualAddMode = !manualAddMode; updateManualModeDisplay()
    setManualStatusMessage(manualAddMode ? '캔버스에서 클릭하세요. 완료 후 버튼을 다시 눌러 종료합니다.' : '수동 추가 모드가 비활성화되었습니다.', manualAddMode ? 'active' : 'muted')
  }

  function handleResetManualComponents() {
    if (!state.manualComponents.length) { setManualStatusMessage('수동 객체가 없습니다.', 'muted'); return }
    if (!window.confirm('수동으로 추가한 모든 객체를 삭제할까요?')) return
    state.manualComponents = []; updateCombinedComponents(); setManualStatusMessage('수동 객체를 모두 삭제했습니다.', 'muted')
  }

  function handleCanvasClickForManualAdd(event) {
    if (!manualAddMode || !state.grayscale) return
    const rect = elements.binaryCanvas.getBoundingClientRect()
    const x = clamp((event.clientX - rect.left) * (state.width / rect.width), 0, state.width - 1)
    const y = clamp((event.clientY - rect.top) * (state.height / rect.height), 0, state.height - 1)
    addManualComponent(x, y)
  }

  function addManualComponent(x, y) {
    const radius = MANUAL_COMPONENT_RADIUS
    const id = `manual-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
    const component = {
      id, source: 'manual', size: Math.round(Math.PI * radius * radius),
      centroid: { x, y },
      bbox: { minX: clamp(Math.floor(x-radius),0,state.width-1), minY: clamp(Math.floor(y-radius),0,state.height-1), maxX: clamp(Math.ceil(x+radius),0,state.width-1), maxY: clamp(Math.ceil(y+radius),0,state.height-1) },
    }
    state.manualComponents.push(component); updateCombinedComponents(); updateManualControlsState()
    setManualStatusMessage('수동 객체 추가됨. 계속 클릭하거나 버튼으로 종료하세요.', 'active')
  }

  function updateManualModeDisplay() {
    if (!elements.manualAddButton) return
    elements.manualAddButton.textContent = manualAddMode ? '수동 추가 종료' : '수동 지분 추가'
    elements.manualAddButton.classList.toggle('bg-emerald-500', manualAddMode)
    elements.manualAddButton.classList.toggle('border-emerald-500', manualAddMode)
    elements.manualAddButton.classList.toggle('text-white', manualAddMode)
    elements.manualAddButton.classList.toggle('bg-white', !manualAddMode)
    elements.manualAddButton.classList.toggle('border-slate-300', !manualAddMode)
    elements.manualAddButton.classList.toggle('text-slate-600', !manualAddMode)
    elements.binaryCanvas.classList.toggle('cursor-crosshair', manualAddMode)
  }

  function updateManualControlsState() {
    if (elements.manualResetButton) {
      const has = state.manualComponents.length > 0
      elements.manualResetButton.disabled = !has
      elements.manualResetButton.classList.toggle('cursor-not-allowed', !has)
      elements.manualResetButton.classList.toggle('opacity-60', !has)
    }
  }

  /* ──────────── Canvas Display ──────────── */
  function syncCanvasDisplaySizes() {
    if (!state.width || !state.height) return
    adjustCanvasDisplay(elements.originalWrapper, elements.originalCanvas, null)
    adjustCanvasDisplay(elements.canvasWrapper, elements.binaryCanvas, elements.markerCanvas)
  }
  function adjustCanvasDisplay(wrapper, canvas, marker) {
    if (!wrapper || !canvas || !state.width || !state.height) return
    const rect = wrapper.getBoundingClientRect()
    const ww = rect?.width || wrapper.clientWidth || state.width
    const wh = rect?.height || wrapper.clientHeight || state.height
    const scale = Math.min(1, Math.min(ww / state.width, wh / state.height))
    const dw = state.width * scale, dh = state.height * scale
    canvas.style.width = `${dw}px`; canvas.style.height = `${dh}px`
    if (marker) {
      const ox = Math.max(0, (ww - dw) / 2), oy = Math.max(0, (wh - dh) / 2)
      marker.style.width = `${dw}px`; marker.style.height = `${dh}px`
      marker.style.left = '0px'; marker.style.top = '0px'; marker.style.right = 'auto'; marker.style.bottom = 'auto'
      marker.style.transform = `translate(${ox}px, ${oy}px)`; marker.style.transformOrigin = 'top left'
    }
  }

  /* ──────────── Reset ──────────── */
  function resetResults() {
    setProcessingOverlay(false)
    Object.assign(state, { grayscale: null, width: 0, height: 0, detectedComponents: [], manualComponents: [], removedAutoIds: new Set(), components: [], lastMask: null, originalImageData: null, baseObjectPixelCount: 0, objectPixelCount: 0, inspectionStartedAt: null, msrmDate: null, currentMetrics: getEmptyMetrics(), processingMaxDimension: MAX_DISPLAY_DIMENSION, resizedForPerformance: false })
    if (elements.cameraInput) elements.cameraInput.value = ''
    if (elements.galleryInput) elements.galleryInput.value = ''
    manualAddMode = false; updateManualModeDisplay(); updateManualControlsState()
    setManualStatusMessage('이미지를 업로드하면 수동 추가 기능을 사용할 수 있습니다.', 'muted')
    elements.thresholdSlider.value = String(DEFAULT_THRESHOLD)
    elements.thresholdValue.textContent = `0 ~ ${DEFAULT_THRESHOLD}`
    state.lastThreshold = DEFAULT_THRESHOLD; setThresholdLocked(true)
    elements.objectCount.textContent = '인식된 객체: 0개 · 면적 비율: 0.00 ppm'
    elements.imageInfo.textContent = '이미지를 불러오면 해상도, 픽셀 수 등 정보가 표시됩니다.'
    elements.positionsList.innerHTML = '<p class="text-slate-400">아직 인식된 객체가 없습니다.</p>'
    renderQualitySummary(state.currentMetrics)
    elements.originalCanvas.classList.add('hidden'); elements.originalPlaceholder?.classList.remove('hidden')
    elements.binaryCanvas.classList.add('hidden'); elements.markerCanvas.classList.add('hidden'); elements.placeholder?.classList.remove('hidden')
    if (originalCtx) originalCtx.clearRect(0, 0, elements.originalCanvas.width, elements.originalCanvas.height)
    if (binaryCtx) binaryCtx.clearRect(0, 0, elements.binaryCanvas.width, elements.binaryCanvas.height)
    if (markerCtx) markerCtx.clearRect(0, 0, elements.markerCanvas.width, elements.markerCanvas.height)
    setSaveMessage('분석 후 저장 버튼을 눌러 DB에 이력을 남길 수 있습니다.')
    updateSaveButtonState()
  }

  function updateSaveButtonState() {
    if (!elements.saveButton) return
    elements.saveButton.disabled = !(Array.isArray(state.components) && state.components.length > 0)
  }

  /* ──────────── Utility ──────────── */
  function setManualStatusMessage(message, tone = 'muted') {
    if (!elements.manualStatus) return; elements.manualStatus.textContent = message
    elements.manualStatus.classList.remove('text-emerald-600','text-rose-600','text-slate-400','text-slate-500')
    elements.manualStatus.classList.add(tone === 'active' ? 'text-emerald-600' : tone === 'error' ? 'text-rose-600' : 'text-slate-400')
  }
  function setSaveMessage(message, tone = 'muted') {
    if (!elements.saveMessage) return; elements.saveMessage.textContent = message
    elements.saveMessage.classList.remove('text-emerald-600','text-rose-600','text-slate-400','text-slate-500')
    elements.saveMessage.classList.add(tone === 'success' ? 'text-emerald-600' : tone === 'error' ? 'text-rose-600' : 'text-slate-400')
  }
  function formatDateTime(isoString) { try { return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(isoString)) } catch { return isoString } }
  function formatInteger(v) { const n = Number(v || 0); return Number.isFinite(n) ? n.toLocaleString('ko-KR') : '0' }
  function formatDecimal(v, d = 2) { const n = Number(v); return Number.isFinite(n) ? n.toFixed(d) : (0).toFixed(d) }
  function formatCoveragePpm(pct, d = 2) { const n = Number(pct); return Number.isFinite(n) ? formatDecimal(n * 10000, d) : (0).toFixed(d) }
  function escapeHtml(v) { return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;') }
  function clamp(v, min, max) { return Math.min(Math.max(v, min), max) }
})
