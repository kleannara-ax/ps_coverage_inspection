const http = require('http');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { randomUUID } = require('crypto');

const PORT = 8080;
const STATIC_DIR = __dirname;
const UPLOAD_DIR = '/data/upload/ps_cov_ins';

// 업로드 루트 디렉토리 생성
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/**
 * 년월(YYYY.MM) 서브디렉토리 경로를 생성하고 반환
 * @param {'original'|'result'} category - original(원본) 또는 result(결과)
 * @returns {{ dirPath: string, subDir: string }} 실제 파일시스템 경로와 URL용 서브 경로
 */
function getImageSubDir(category) {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}`;
  const subDir = path.join(category, yearMonth);       // e.g. original/2026.04
  const dirPath = path.join(UPLOAD_DIR, subDir);
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
  return { dirPath, subDir };
}

/**
 * 현재 시각을 YYMMDD_HHMMSS 형식 문자열로 반환
 * 예: 260408_143025 (2026년 04월 08일 14시 30분 25초)
 */
function getTimestamp() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const MM = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const HH = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${yy}${MM}${dd}_${HH}${mm}${ss}`;
}

// ──────── In-Memory DB ────────
let inspections = [];
let seqCounter = 0;
// 보관 건수 제한 없음 — 페이지네이션으로 전체 데이터 조회

// ──────── MIME Types ────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// ──────── Helpers ────────

/**
 * ApiResponse 래핑 헬퍼 (Spring Boot core ApiResponse 형식 동일)
 * { success: boolean, data: T, message: string|null, timestamp: string }
 */
function wrapApiResponse(data, success = true, message = null) {
  return {
    success,
    data,
    message,
    timestamp: new Date().toISOString(),
  };
}

/**
 * JSON 응답 전송 (API 라우트에서는 ApiResponse 래핑 적용)
 * @param {object} res - HTTP Response
 * @param {number} status - HTTP status code
 * @param {object} data - 응답 데이터
 * @param {boolean} wrap - ApiResponse 래핑 여부 (default: true)
 */
function sendJSON(res, status, data, wrap = true) {
  const payload = wrap ? wrapApiResponse(data, status < 400, status >= 400 ? (data.error || data.message || null) : null) : data;
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
    'Access-Control-Allow-Headers': '*',
  });
  res.end(body);
}

function readRawBody(req, maxSize = 50 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > maxSize) { req.destroy(); reject(new Error('Payload too large')); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
      catch { resolve({}); }
    });
    req.on('error', reject);
  });
}

function paginate(arr, page, size) {
  const totalElements = arr.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / size));
  const start = page * size;
  const content = arr.slice(start, start + size);
  return { content, totalPages, totalElements, number: page, size, first: page === 0, last: page >= totalPages - 1 };
}

/**
 * Base64 Data URL → 파일 저장 (레거시 JSON 방식 호환)
 * 저장 경로: /data/upload/ps_cov_ins/original/{YYYY.MM}/ 또는 /data/upload/ps_cov_ins/result/{YYYY.MM}/
 * @param {string} dataUrl - Base64 Data URL
 * @param {string} prefix - 'original' 또는 'result'
 * @param {string|null} matnr - 자재코드
 * @param {string|null} indBcd - 개별바코드
 * @returns {object|null} { filename, path, fullPath, imageDir }
 */
function saveBase64Image(dataUrl, prefix, matnr, indBcd) {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) return null;
  try {
    const match = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
    if (!match) return null;
    const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
    const buffer = Buffer.from(match[2], 'base64');
    const mat = (matnr || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_');
    const bcd = (indBcd || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_');
    const category = prefix === 'result' ? 'result' : 'original';
    const { dirPath, subDir } = getImageSubDir(category);
    const filename = `${prefix}_${mat}_${bcd}_${getTimestamp()}_${randomUUID().slice(0, 8)}.${ext}`;
    const filePath = path.join(dirPath, filename);
    fs.writeFileSync(filePath, buffer);
    return { filename, path: `/uploads/${subDir}/${filename}`, fullPath: filePath, imageDir: dirPath };
  } catch (err) {
    console.error('이미지 저장 실패:', err.message);
    return null;
  }
}

/**
 * Binary buffer → 파일 비동기 저장 (multipart 방식)
 * 저장 경로: /data/upload/ps_cov_ins/original/{YYYY.MM}/ 또는 /data/upload/ps_cov_ins/result/{YYYY.MM}/
 * @param {Buffer} buffer - 이미지 바이너리
 * @param {string} prefix - 'original' 또는 'result'
 * @param {string} ext - 확장자 (jpg, png 등)
 * @param {string|null} matnr - 자재코드
 * @param {string|null} indBcd - 개별바코드
 * @returns {Promise<object|null>} { filename, path, fullPath, imageDir }
 */
async function saveImageBuffer(buffer, prefix, ext, matnr, indBcd) {
  if (!buffer || !buffer.length) return null;
  try {
    const mat = (matnr || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_');
    const bcd = (indBcd || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_');
    const category = prefix === 'result' ? 'result' : 'original';
    const { dirPath, subDir } = getImageSubDir(category);
    const filename = `${prefix}_${mat}_${bcd}_${getTimestamp()}_${randomUUID().slice(0, 8)}.${ext}`;
    const filePath = path.join(dirPath, filename);
    await fsp.writeFile(filePath, buffer);
    return { filename, path: `/uploads/${subDir}/${filename}`, fullPath: filePath, imageDir: dirPath };
  } catch (err) {
    console.error('이미지 저장 실패:', err.message);
    return null;
  }
}

/**
 * 간단한 multipart/form-data 파서
 * metadata(JSON), originalImage(file), resultImage(file)를 추출
 */
function parseMultipart(rawBody, boundary) {
  const result = { metadata: {}, originalImage: null, resultImage: null };
  const boundaryBuf = Buffer.from('--' + boundary);
  const parts = [];
  let start = 0;

  while (true) {
    const idx = rawBody.indexOf(boundaryBuf, start);
    if (idx === -1) break;
    if (start > 0) parts.push(rawBody.slice(start, idx));
    start = idx + boundaryBuf.length;
    // Skip \r\n after boundary
    if (rawBody[start] === 0x0d && rawBody[start + 1] === 0x0a) start += 2;
    // Check for trailing --
    if (rawBody[start] === 0x2d && rawBody[start + 1] === 0x2d) break;
  }

  for (const part of parts) {
    // Find \r\n\r\n to separate headers from body
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd === -1) continue;
    const headers = part.slice(0, headerEnd).toString('utf-8');
    // Remove trailing \r\n from body
    let body = part.slice(headerEnd + 4);
    if (body.length >= 2 && body[body.length - 2] === 0x0d && body[body.length - 1] === 0x0a) {
      body = body.slice(0, body.length - 2);
    }

    const nameMatch = headers.match(/name="([^"]+)"/);
    if (!nameMatch) continue;
    const fieldName = nameMatch[1];

    if (fieldName === 'metadata') {
      try { result.metadata = JSON.parse(body.toString('utf-8')); } catch {}
    } else if (fieldName === 'originalImage') {
      result.originalImage = body;
    } else if (fieldName === 'resultImage') {
      result.resultImage = body;
    }
  }
  return result;
}

// ──────── API Handlers ────────

// POST /jri-api/inspections (supports both multipart and JSON)
async function handleSave(req, res) {
  const startTime = Date.now();
  const contentType = req.headers['content-type'] || '';

  let body, originalImagePath = null, resultImagePath = null, originalImageName = null, resultImageName = null, originalImageDir = null, resultImageDir = null;

  if (contentType.includes('multipart/form-data')) {
    // ── Multipart 방식 (최적화: JPEG binary 직접 저장) ──
    const boundaryMatch = contentType.match(/boundary=(.+)/);
    const boundary = boundaryMatch ? boundaryMatch[1].replace(/;.*$/, '').trim() : '';
    const rawBody = await readRawBody(req);
    const parsed = parseMultipart(rawBody, boundary);
    body = parsed.metadata;

    // 바이너리 이미지를 비동기로 저장 (fs.writeFileSync 대비 non-blocking)
    // 저장 경로: /data/upload/ps_cov_ins/original/{YYYY.MM}/, /data/upload/ps_cov_ins/result/{YYYY.MM}/
    const matnrForFile = body.matnr || null;
    const indBcdForFile = body.indBcd || null;
    const [origResult, resResult] = await Promise.all([
      saveImageBuffer(parsed.originalImage, 'original', 'jpg', matnrForFile, indBcdForFile),
      saveImageBuffer(parsed.resultImage, 'result', 'jpg', matnrForFile, indBcdForFile),
    ]);
    originalImagePath = origResult ? origResult.path : null;
    resultImagePath = resResult ? resResult.path : null;
    originalImageName = origResult ? origResult.filename : null;
    resultImageName = resResult ? resResult.filename : null;
    originalImageDir = origResult ? origResult.imageDir : null;
    resultImageDir = resResult ? resResult.imageDir : null;
  } else {
    // ── JSON 방식 (레거시 호환) ──
    body = await readBody(req);
    const matnrForFile = body.matnr || null;
    const indBcdForFile = body.indBcd || null;
    const origResult = saveBase64Image(body.originalImageBase64, 'original', matnrForFile, indBcdForFile);
    const resResult = saveBase64Image(body.resultImageBase64, 'result', matnrForFile, indBcdForFile);
    originalImagePath = origResult ? origResult.path : null;
    resultImagePath = resResult ? resResult.path : null;
    originalImageName = origResult ? origResult.filename : null;
    resultImageName = resResult ? resResult.filename : null;
    originalImageDir = origResult ? origResult.imageDir : null;
    resultImageDir = resResult ? resResult.imageDir : null;
  }

  // ── 필수 필드 서버측 검증 (indBcd, lotnr, matnr, operatorId) ──
  const requiredChecks = [
    { key: 'indBcd',     label: '개별바코드(IND_BCD)' },
    { key: 'lotnr',      label: 'LOT번호(LOT_NO)' },
    { key: 'matnr',      label: '자재코드(MATNR)' },
    { key: 'operatorId', label: '검사자ID(USERID)' },
  ];
  const missingFields = requiredChecks.filter(f => !body[f.key] || !String(body[f.key]).trim());
  if (missingFields.length > 0) {
    return sendJSON(res, 400, {
      error: '필수 항목 누락',
      message: `다음 필수 항목을 입력해주세요: ${missingFields.map(f => f.label).join(', ')}`,
      missingFields: missingFields.map(f => f.key),
    });
  }

  seqCounter++;

  const indBcd = body.indBcd || null;
  const matnr = body.matnr || null;
  const lotnr = body.lotnr || null;

  // ── Upsert: 동일 자재 + LOT + 개별바코드 조합이 있으면 UPDATE ──
  let existing = null;
  let isUpdate = false;
  if (matnr && lotnr && indBcd) {
    existing = inspections.find(i => i.matnr === matnr && i.lotnr === lotnr && i.indBcd === indBcd);
  }

  if (existing) {
    // ── UPDATE: 기존 레코드 갱신 ──
    isUpdate = true;
    seqCounter--; // seq 롤백 (갱신이므로 새 seq 불필요)

    existing.inspectedAt = body.inspectedAt || new Date().toISOString();
    existing.msrmDate = body.msrmDate || new Date().toISOString();
    existing.thresholdMax = body.thresholdMax ?? existing.thresholdMax;
    existing.totalCount = body.totalCount ?? existing.totalCount;
    existing.coverageRatio = body.coverageRatio ?? existing.coverageRatio;
    existing.densityCount = body.densityCount ?? existing.densityCount;
    existing.densityRatio = body.densityRatio ?? existing.densityRatio;
    existing.sizeUniformityScore = body.sizeUniformityScore ?? existing.sizeUniformityScore;
    existing.distributionUniformityScore = body.distributionUniformityScore ?? existing.distributionUniformityScore;
    existing.meanSize = body.meanSize ?? existing.meanSize;
    existing.stdSize = body.stdSize ?? existing.stdSize;
    existing.autoCount = body.autoCount ?? existing.autoCount;
    existing.manualCount = body.manualCount ?? existing.manualCount;
    existing.removedAutoCount = body.removedAutoCount ?? existing.removedAutoCount;
    existing.bucketUpTo3 = body.bucketUpTo3 ?? existing.bucketUpTo3;
    existing.bucketUpTo5 = body.bucketUpTo5 ?? existing.bucketUpTo5;
    existing.bucketUpTo7 = body.bucketUpTo7 ?? existing.bucketUpTo7;
    existing.bucketOver7 = body.bucketOver7 ?? existing.bucketOver7;
    existing.quadrantTopLeft = body.quadrantTopLeft ?? existing.quadrantTopLeft;
    existing.quadrantTopRight = body.quadrantTopRight ?? existing.quadrantTopRight;
    existing.quadrantBottomLeft = body.quadrantBottomLeft ?? existing.quadrantBottomLeft;
    existing.quadrantBottomRight = body.quadrantBottomRight ?? existing.quadrantBottomRight;
    existing.objectPixelCount = body.objectPixelCount ?? existing.objectPixelCount;
    existing.totalPixels = body.totalPixels ?? existing.totalPixels;
    existing.manualAddedCount = body.manualAddedCount ?? existing.manualAddedCount;
    existing.manualRemovedCount = body.manualRemovedCount ?? existing.manualRemovedCount;
    if (originalImagePath) { existing.originalImagePath = originalImagePath; existing.originalImageName = originalImageName; existing.originalImageDir = originalImageDir; }
    if (resultImagePath) { existing.resultImagePath = resultImagePath; existing.resultImageName = resultImageName; existing.resultImageDir = resultImageDir; }
    if (body.matnrNm) existing.matnrNm = body.matnrNm;
    if (body.operatorId) existing.operatorId = body.operatorId;
    if (body.operatorNm) existing.operatorNm = body.operatorNm;
    if (body.deviceId) existing.deviceId = body.deviceId;
    if (body.status) existing.status = body.status;

    // 차수(indBcdSeq) 증가: 동일 자재+LOT+바코드 재검사 시 +1
    existing.indBcdSeq = String(Number(existing.indBcdSeq || '1') + 1);
    existing.updatedAt = new Date().toISOString();

    // UPDATE 후 배열에서 최신 위치(앞)로 이동 (FIFO 정리 시 삭제 방지)
    const existingIdx = inspections.indexOf(existing);
    if (existingIdx > 0) {
      inspections.splice(existingIdx, 1);
      inspections.unshift(existing);
    }

    const elapsed = Date.now() - startTime;
    console.log(`[UPDATE] seq=${existing.seq}, indBcd=${indBcd}, matnr=${matnr}, lotnr=${lotnr}, ${elapsed}ms`);
    sendJSON(res, 200, { ...existing, _action: 'UPDATE', isUpdate: true });
  } else {
    // ── INSERT: 신규 레코드 생성 ──
    let indBcdSeq = body.indBcdSeq || null;
    if (!indBcdSeq && indBcd) {
      const count = inspections.filter(i => i.indBcd === indBcd).length;
      indBcdSeq = String(count + 1);
    }

    const record = {
      id: randomUUID(),
      seq: seqCounter,
      inspItemGrpCd: body.inspItemGrpCd || null,
      matnr,
      matnrNm: body.matnrNm || null,
      werks: body.werks || null,
      msrmDate: body.msrmDate || new Date().toISOString(),
      prcSeqno: body.prcSeqno || null,
      lotnr,
      indBcd,
      indBcdSeq,
      inspectedAt: body.inspectedAt || new Date().toISOString(),
      thresholdMax: body.thresholdMax ?? 115,
      totalCount: body.totalCount ?? 0,
      coverageRatio: body.coverageRatio ?? 0,
      densityCount: body.densityCount ?? 0,
      densityRatio: body.densityRatio ?? 0,
      sizeUniformityScore: body.sizeUniformityScore ?? 0,
      distributionUniformityScore: body.distributionUniformityScore ?? 0,
      meanSize: body.meanSize ?? 0,
      stdSize: body.stdSize ?? 0,
      autoCount: body.autoCount ?? 0,
      manualCount: body.manualCount ?? 0,
      removedAutoCount: body.removedAutoCount ?? 0,
      bucketUpTo3: body.bucketUpTo3 ?? 0,
      bucketUpTo5: body.bucketUpTo5 ?? 0,
      bucketUpTo7: body.bucketUpTo7 ?? 0,
      bucketOver7: body.bucketOver7 ?? 0,
      quadrantTopLeft: body.quadrantTopLeft ?? 0,
      quadrantTopRight: body.quadrantTopRight ?? 0,
      quadrantBottomLeft: body.quadrantBottomLeft ?? 0,
      quadrantBottomRight: body.quadrantBottomRight ?? 0,
      objectPixelCount: body.objectPixelCount ?? 0,
      totalPixels: body.totalPixels ?? 0,
      manualAddedCount: body.manualAddedCount ?? 0,
      manualRemovedCount: body.manualRemovedCount ?? 0,
      originalImagePath,
      originalImageName,
      originalImageDir: originalImageDir || null,
      resultImagePath,
      resultImageName,
      resultImageDir: resultImageDir || null,
      operatorId: body.operatorId || null,
      operatorNm: body.operatorNm || null,
      deviceId: body.deviceId || null,
      status: body.status || null,
      createdAt: new Date().toISOString(),
      updatedAt: null,
    };

    inspections.unshift(record); // newest first
    const elapsed = Date.now() - startTime;
    console.log(`[INSERT] seq=${record.seq}, indBcd=${indBcd}, matnr=${matnr}, lotnr=${lotnr}, ${elapsed}ms`);
    sendJSON(res, 201, { ...record, _action: 'INSERT', isUpdate: false });
  }
}

// GET /jri-api/inspections?page=0&size=20&dateFrom=2026-03-01&dateTo=2026-03-18&indBcd=xxx
function handleList(req, res, url) {
  const page = parseInt(url.searchParams.get('page') || '0', 10);
  const size = Math.min(parseInt(url.searchParams.get('size') || '20', 10), 100);
  const dateFrom = url.searchParams.get('dateFrom') || '';
  const dateTo = url.searchParams.get('dateTo') || '';
  const indBcd = (url.searchParams.get('indBcd') || '').toLowerCase();

  let filtered = inspections;

  // 개별바코드 필터
  if (indBcd) {
    filtered = filtered.filter(i => (i.indBcd || '').toLowerCase().includes(indBcd));
  }

  // 날짜 범위 필터 (inspectedAt 기준)
  if (dateFrom) {
    const from = new Date(dateFrom + 'T00:00:00');
    filtered = filtered.filter(i => {
      if (!i.inspectedAt) return false;
      return new Date(i.inspectedAt) >= from;
    });
  }
  if (dateTo) {
    const to = new Date(dateTo + 'T23:59:59.999');
    filtered = filtered.filter(i => {
      if (!i.inspectedAt) return false;
      return new Date(i.inspectedAt) <= to;
    });
  }

  sendJSON(res, 200, paginate(filtered, page, size));
}

// GET /jri-api/inspections/search?type=indBcd&keyword=xxx&page=0&size=20&dateFrom=2026-03-01&dateTo=2026-03-18
function handleSearch(req, res, url) {
  const type = (url.searchParams.get('type') || 'indBcd').toLowerCase();
  const keyword = (url.searchParams.get('keyword') || '').toLowerCase();
  const dateFrom = url.searchParams.get('dateFrom') || '';
  const dateTo = url.searchParams.get('dateTo') || '';
  const page = parseInt(url.searchParams.get('page') || '0', 10);
  const size = Math.min(parseInt(url.searchParams.get('size') || '20', 10), 100);

  let filtered = inspections;

  // 키워드 필터
  if (keyword) {
    if (type === 'lotnr') filtered = filtered.filter(i => (i.lotnr || '').toLowerCase().includes(keyword));
    else if (type === 'matnr') filtered = filtered.filter(i => (i.matnr || '').toLowerCase().includes(keyword));
    else filtered = filtered.filter(i => (i.indBcd || '').toLowerCase().includes(keyword));
  }

  // 날짜 범위 필터 (inspectedAt 기준)
  if (dateFrom) {
    const from = new Date(dateFrom + 'T00:00:00');
    filtered = filtered.filter(i => {
      if (!i.inspectedAt) return false;
      return new Date(i.inspectedAt) >= from;
    });
  }
  if (dateTo) {
    const to = new Date(dateTo + 'T23:59:59.999');
    filtered = filtered.filter(i => {
      if (!i.inspectedAt) return false;
      return new Date(i.inspectedAt) <= to;
    });
  }

  sendJSON(res, 200, paginate(filtered, page, size));
}

// GET /jri-api/inspections/check-exists?matnr=xxx&lotnr=xxx&indBcd=xxx
function handleCheckExists(req, res, url) {
  const matnr = url.searchParams.get('matnr') || '';
  const lotnr = url.searchParams.get('lotnr') || '';
  const indBcd = url.searchParams.get('indBcd') || '';

  if (!matnr || !lotnr || !indBcd) {
    return sendJSON(res, 200, { exists: false });
  }

  const existing = inspections.find(i =>
    i.matnr === matnr && i.lotnr === lotnr && i.indBcd === indBcd
  );

  sendJSON(res, 200, {
    exists: !!existing,
    record: existing ? {
      id: existing.id,
      seq: existing.seq,
      indBcdSeq: existing.indBcdSeq,
      inspectedAt: existing.inspectedAt,
      coverageRatio: existing.coverageRatio,
      totalCount: existing.totalCount,
    } : null,
  });
}

// GET /jri-api/inspections/:id
function handleGetOne(res, id) {
  const record = inspections.find(i => i.id === id);
  if (!record) return sendJSON(res, 404, { error: '검사 결과를 찾을 수 없습니다.' });
  sendJSON(res, 200, record);
}

// DELETE /jri-api/inspections/:id
function handleDeleteOne(res, id) {
  const idx = inspections.findIndex(i => i.id === id);
  if (idx === -1) return sendJSON(res, 404, { error: '검사 결과를 찾을 수 없습니다.' });
  inspections.splice(idx, 1);
  sendJSON(res, 200, { message: '삭제되었습니다.', id });
}

// DELETE /jri-api/inspections
function handleDeleteAll(res) {
  inspections = [];
  sendJSON(res, 200, { message: '전체 검사 이력이 삭제되었습니다.' });
}

// ──────── Static File Server ────────
function serveStatic(req, res, pathname) {
  let filePath;

  // /uploads/* 요청은 UPLOAD_DIR(/data/upload/ps_cov_ins/)에서 서빙
  if (pathname.startsWith('/uploads/')) {
    const relative = pathname.replace(/^\/uploads\//, '');
    filePath = path.join(UPLOAD_DIR, relative);
  } else {
    filePath = path.join(STATIC_DIR, pathname === '/' ? 'index.html' : pathname);
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

// ──────── MES 결과 전송 Handler ────────

// MES 전송 이력 (in-memory)
let mesTransmissions = [];

/**
 * POST /jri-api/mes/send-result
 * MES에 검사 결과 전송 (mock - 실제로는 MES 서버로 중계)
 *
 * Request Body:
 *   { IND_BCD: string, ResultData: number }
 *   - IND_BCD  : 개별바코드
 *   - ResultData: 커버리지 결과 값 (ppm 단위, 숫자)
 *
 * Response:
 *   { success: true/false, message: string, transmissionId: string, timestamp: string }
 */
async function handleMesSendResult(req, res) {
  const startTime = Date.now();
  try {
    const body = await readBody(req);
    const indBcd = body.IND_BCD;
    const resultData = body.ResultData;

    if (!indBcd) {
      return sendJSON(res, 400, { success: false, message: '개별바코드(IND_BCD)가 누락되었습니다.' });
    }
    if (resultData == null) {
      return sendJSON(res, 400, { success: false, message: '결과 데이터(ResultData)가 누락되었습니다.' });
    }

    // ──── 실제 환경에서는 여기서 MES 서버로 HTTP 요청을 보냅니다 ────
    // 예: const mesResponse = await fetch(MES_ENDPOINT_URL, {
    //       method: 'POST',
    //       headers: { 'Content-Type': 'application/json' },
    //       body: JSON.stringify({ IND_BCD: indBcd, ResultData: resultData })
    //     });
    // ──────────────────────────────────────────────────────────────

    const transmissionId = randomUUID();
    const timestamp = new Date().toISOString();
    const elapsed = Date.now() - startTime;

    const record = {
      transmissionId,
      indBcd,
      resultData,
      timestamp,
      elapsed,
      status: 'SUCCESS',
    };
    mesTransmissions.unshift(record);

    console.log(`[MES] 전송 성공 - IND_BCD=${indBcd}, ResultData=${resultData} (ppm), ${elapsed}ms`);

    sendJSON(res, 200, {
      success: true,
      message: `MES 전송 완료 (IND_BCD: ${indBcd}, ResultData: ${resultData})`,
      transmissionId,
      timestamp,
    });
  } catch (error) {
    console.error('[MES] 전송 실패:', error.message);
    sendJSON(res, 500, {
      success: false,
      message: 'MES 전송 중 오류가 발생했습니다: ' + error.message,
    });
  }
}

// ──────── Router ────────
const server = http.createServer(async (req, res) => {
  // Normalize double slashes in URL to prevent Invalid URL errors
  const safeUrl = req.url.replace(/^\/\/+/, '/');
  const url = new URL(safeUrl, `http://${req.headers.host}`);
  const pathname = url.pathname;
  const method = req.method.toUpperCase();

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Max-Age': '3600',
    });
    return res.end();
  }

  // API Routes: /jri-api/inspections
  if (pathname.startsWith('/jri-api/')) {
    // Health
    if (pathname === '/jri-api/health' && method === 'GET') {
      return sendJSON(res, 200, { status: 'ok', module: 'module-jri (mock)', version: '5.0.0', timestamp: new Date().toISOString() });
    }

    // MES 결과 전송 API
    if (pathname === '/jri-api/mes/send-result' && method === 'POST') {
      return handleMesSendResult(req, res);
    }

    // Search
    if (pathname === '/jri-api/inspections/search' && method === 'GET') {
      return handleSearch(req, res, url);
    }

    // 기존 레코드 존재 여부 확인 (Upsert 사전 체크용)
    if (pathname === '/jri-api/inspections/check-exists' && method === 'GET') {
      return handleCheckExists(req, res, url);
    }

    // Collection
    if (pathname === '/jri-api/inspections') {
      if (method === 'GET') return handleList(req, res, url);
      if (method === 'POST') return handleSave(req, res);
      if (method === 'DELETE') return handleDeleteAll(res);
    }

    // Single item: /jri-api/inspections/:id
    const match = pathname.match(/^\/jri-api\/inspections\/([^/]+)$/);
    if (match) {
      const id = match[1];
      if (method === 'GET') return handleGetOne(res, id);
      if (method === 'DELETE') return handleDeleteOne(res, id);
    }

    return sendJSON(res, 404, { error: 'API endpoint not found' });
  }

  // Static files (includes /uploads/*)
  serveStatic(req, res, pathname);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Mock API + Static server running on http://0.0.0.0:${PORT}`);
  console.log(`API: /jri-api/inspections`);
  console.log(`Uploads: /uploads/ → ${UPLOAD_DIR}`);
  console.log(`Frontend: /`);
});
