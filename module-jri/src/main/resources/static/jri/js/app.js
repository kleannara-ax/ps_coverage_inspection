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
    // 검사 정보 입력 필드 (화면 직접 입력)
    indBcdInput: document.getElementById('indBcdInput'),
    prcSeqnoInput: document.getElementById('prcSeqnoInput'),
    operatorIdInput: document.getElementById('operatorIdInput'),
    historyList: document.getElementById('historyList'),
    historyTableBody: document.getElementById('historyTableBody'),
    historyTableEmpty: document.getElementById('historyTableEmpty'),
    historyPagination: document.getElementById('historyPagination'),
    historyTablePagination: document.getElementById('historyTablePagination'),
    historySearchInput: document.getElementById('historySearchInput'),
    historySearchButton: document.getElementById('historySearchButton'),
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

  // URL ?ind_bcd= 파라미터로 바코드 자동 입력
  applyUrlParams()

  setupTabNavigation()
  attachEventListeners()
  updateManualModeDisplay()
  updateManualControlsState()
  loadHistoryFromServer(0)
  resetResults()

  function applyUrlParams() {
    const params = new URLSearchParams(window.location.search)
    const indBcd = params.get('ind_bcd') || params.get('indBcd')
    if (indBcd && elements.indBcdInput) {
      elements.indBcdInput.value = indBcd
    }
    const prcSeqno = params.get('prc_seqno') || params.get('PRC_SEQNO')
    if (prcSeqno && elements.prcSeqnoInput) {
      elements.prcSeqnoInput.value = prcSeqno
    }
    const operatorId = params.get('operator_id')
    if (operatorId && elements.operatorIdInput) {
      elements.operatorIdInput.value = operatorId
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
  async function handleSaveResult() {
    if (!state.components.length) return
    try {
      setSaveMessage('서버에 저장 중…', 'muted')
      const m = state.currentMetrics || getEmptyMetrics()

      const indBcdValue = (elements.indBcdInput?.value || '').trim() || null
      const inspectedAtValue = state.inspectionStartedAt || new Date()

      const payload = {
        msrmDate: state.msrmDate ? state.msrmDate.toISOString() : new Date().toISOString(),
        prcSeqno: elements.prcSeqnoInput?.value ? Number(elements.prcSeqnoInput.value) : null,
        indBcd: indBcdValue,
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
      }

      const res = await axios.post(API_BASE, payload)
      const saved = res.data
      // 검사 제목: 바코드 + 검사 시각으로 자동 생성
      const autoTitle = indBcdValue
        ? `${indBcdValue} - ${formatDateTime(inspectedAtValue.toISOString())}`
        : `검사 ${formatDateTime(inspectedAtValue.toISOString())}`
      setSaveMessage(`${autoTitle} 저장 완료 (seq: ${saved.seq}, 차수: ${saved.indBcdSeq || '-'})`, 'success')
      loadHistoryFromServer(0)
    } catch (error) {
      console.error(error)
      setSaveMessage('저장 중 오류가 발생했습니다: ' + (error.response?.data?.error || error.message), 'error')
    }
  }

  /* ──────────── REST API - Load History ──────────── */
  async function loadHistoryFromServer(page) {
    try {
      currentHistoryPage = page
      const keyword = elements.historySearchInput ? elements.historySearchInput.value.trim() : ''
      let url = keyword
        ? `${API_BASE}/search?type=indBcd&keyword=${encodeURIComponent(keyword)}&page=${page}&size=${MAX_HISTORY_PAGE_SIZE}`
        : `${API_BASE}?page=${page}&size=${MAX_HISTORY_PAGE_SIZE}`
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
    if (!entries.length) { elements.historyList.innerHTML = '<p class="text-slate-400">저장된 검사 이력이 없습니다.</p>'; return }
    elements.historyList.innerHTML = entries.map(entry => {
      const indBcd = entry.indBcd ? escapeHtml(entry.indBcd) : '-'
      const lotnr = entry.lotnr ? escapeHtml(entry.lotnr) : ''
      const inspectedAt = entry.inspectedAt ? formatDateTime(entry.inspectedAt) : '-'
      const msrmDate = entry.msrmDate ? formatDateTime(entry.msrmDate) : '-'
      // 검사 제목: 바코드 + 검사 시각으로 자동 생성
      const autoTitle = entry.indBcd
        ? `${escapeHtml(entry.indBcd)} - ${inspectedAt}`
        : `검사 ${inspectedAt}`
      const componentCount = entry.totalCount || 0
      const coverageDisplay = entry.coverageRatio != null ? formatCoveragePpm(entry.coverageRatio, 2) : '-'
      const lotnrPill = lotnr ? `<span class="inline-flex items-center gap-1 rounded-full bg-slate-900/5 px-3 py-1 font-medium text-slate-600"><i class="fas fa-tag text-slate-400"></i>LOT: ${lotnr}</span>` : ''
      const bcdPill = indBcd !== '-' ? `<span class="inline-flex items-center gap-1 rounded-full bg-slate-900/5 px-3 py-1 font-medium text-slate-600"><i class="fas fa-barcode text-slate-400"></i>${indBcd}</span>` : ''
      const operatorPill = entry.operatorId ? `<span class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600"><i class="fas fa-user text-slate-400"></i>${escapeHtml(entry.operatorId)}</span>` : ''
      return `<article class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><h3 class="text-base font-semibold text-slate-900">${autoTitle}</h3><p class="text-xs text-slate-500">SEQ #${entry.seq}${entry.indBcdSeq ? ` · 차수: ${escapeHtml(entry.indBcdSeq)}` : ''} · 측정: ${msrmDate}</p></div><div class="flex flex-wrap items-center gap-2 text-xs"><span class="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 font-medium text-indigo-700">임계값 0 ~ ${entry.thresholdMax}</span><span class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">객체 ${componentCount.toLocaleString('ko-KR')}개</span>${bcdPill}${lotnrPill}${operatorPill}<span class="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-600">면적 ${coverageDisplay} ppm</span><button type="button" class="inline-flex items-center gap-1 rounded-full border border-rose-200 px-3 py-1 text-rose-500 hover:text-rose-600" data-history-action="delete" data-history-id="${entry.id}">삭제</button></div></div><div class="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-3"><p>자동: ${formatInteger(entry.autoCount)} · 수동: ${formatInteger(entry.manualCount)} · 제외: ${formatInteger(entry.removedAutoCount)}</p><p>균일도: ${formatDecimal(entry.sizeUniformityScore,1)}점 · 분포: ${formatDecimal(entry.distributionUniformityScore,1)}점</p><p>밀도: ${formatInteger(entry.densityCount)}개 (${formatDecimal(entry.densityRatio,1)}%)</p></div></article>`
    }).join('')
  }

  /* ──────────── Render History Table ──────────── */
  function renderHistoryTable(entries) {
    if (!elements.historyTableBody || !elements.historyTableEmpty) return
    if (!entries.length) { elements.historyTableBody.innerHTML = ''; elements.historyTableEmpty.classList.remove('hidden'); return }
    elements.historyTableEmpty.classList.add('hidden')
    elements.historyTableBody.innerHTML = entries.map((e) => {
      const indBcd = e.indBcd ? escapeHtml(e.indBcd) : '-'
      const lotnr = e.lotnr ? escapeHtml(e.lotnr) : '-'
      const inspectedAt = e.inspectedAt ? formatDateTime(e.inspectedAt) : '-'
      const threshold = `0 ~ ${e.thresholdMax}`
      const coverageDisplay = e.coverageRatio != null ? `${formatCoveragePpm(e.coverageRatio, 2)} ppm` : '-'
      const operator = e.operatorId ? escapeHtml(e.operatorId) : '-'
      return `<tr class="align-top"><td class="px-4 py-3 text-xs text-slate-600 font-semibold">${e.seq}</td><td class="px-4 py-3 text-xs text-slate-600">${indBcd}${e.indBcdSeq ? `<br/><span class="text-[10px] text-slate-400">차수: ${escapeHtml(e.indBcdSeq)}</span>` : ''}</td><td class="px-4 py-3 text-xs text-slate-600">${lotnr}</td><td class="px-4 py-3 text-xs text-slate-500">${inspectedAt}</td><td class="px-4 py-3 text-xs text-slate-600">${threshold}</td><td class="px-4 py-3"><ul class="space-y-1 text-xs text-slate-600"><li>총: ${formatInteger(e.totalCount)}</li><li>자동: ${formatInteger(e.autoCount)}</li><li>수동: +${formatInteger(e.manualCount)}</li><li>제외: ${formatInteger(e.removedAutoCount)}</li></ul></td><td class="px-4 py-3 text-xs text-slate-600"><p class="font-semibold">${formatInteger(e.densityCount)}개</p><p class="text-[11px] text-slate-400">${formatDecimal(e.densityRatio, 1)}%</p></td><td class="px-4 py-3 text-xs text-slate-600"><p class="font-semibold">${coverageDisplay}</p></td><td class="px-4 py-3 text-xs text-slate-600"><p class="font-semibold">${formatDecimal(e.sizeUniformityScore, 1)}점</p></td><td class="px-4 py-3 text-xs text-slate-600"><p class="font-semibold">${formatDecimal(e.distributionUniformityScore, 1)}점</p></td><td class="px-4 py-3 text-center text-xs">${formatInteger(e.bucketUpTo3)}개</td><td class="px-4 py-3 text-center text-xs">${formatInteger(e.bucketUpTo5)}개</td><td class="px-4 py-3 text-center text-xs">${formatInteger(e.bucketUpTo7)}개</td><td class="px-4 py-3 text-center text-xs">${formatInteger(e.bucketOver7)}개</td><td class="px-4 py-3"><ul class="space-y-1 text-xs text-slate-600"><li>좌상: ${formatInteger(e.quadrantTopLeft)}</li><li>우상: ${formatInteger(e.quadrantTopRight)}</li><li>좌하: ${formatInteger(e.quadrantBottomLeft)}</li><li>우하: ${formatInteger(e.quadrantBottomRight)}</li></ul></td><td class="px-4 py-3 text-xs text-slate-600">${operator}</td><td class="px-4 py-3"><button type="button" class="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-500 hover:text-rose-600" data-history-action="delete" data-history-id="${e.id}">삭제</button></td></tr>`
    }).join('')
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
