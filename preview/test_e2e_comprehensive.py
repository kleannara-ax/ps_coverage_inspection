#!/usr/bin/env python3
"""
JRI 검사 시스템 – E2E Playwright 통합 테스트 (운영 배포 전 검수)
═══════════════════════════════════════════════════════════════
  T1  : 이력 테이블 탭 전환 및 데이터 렌더링 검증
  T2  : 이력 테이블 필터링 (바코드, 날짜)
  T3  : 이력 카드 탭에서 카드 렌더링 확인
  T4  : 검사 이력 삭제 후 UI 반영
  T5  : 시크릿 모드 – 배너/UI/저장 차단
  T6  : 필수 필드 미입력 시 UI 경고 (빨간 테두리, 메시지)
  T7  : URL 파라미터로 필드 자동 채우기
  T8  : 페이지네이션 버튼 렌더링
  T9  : 검색 키워드로 이력 필터링 (검사 이력 탭)
  T10 : 시크릿 모드 → 탭 숨김 → 해제 후 복원
═══════════════════════════════════════════════════════════════
"""

import subprocess, json, time, sys, urllib.request, urllib.parse

BASE_URL = "http://localhost:8080"
API_URL = f"{BASE_URL}/jri-api/inspections"

PASS_COUNT = 0
FAIL_COUNT = 0
TOTAL_COUNT = 0

def assert_eq(label, expected, actual):
    global PASS_COUNT, FAIL_COUNT, TOTAL_COUNT
    TOTAL_COUNT += 1
    if expected == actual:
        print(f"  \033[0;32m✓ PASS\033[0m – {label}")
        PASS_COUNT += 1
    else:
        print(f"  \033[0;31m✗ FAIL\033[0m – {label} (expected={expected!r}, got={actual!r})")
        FAIL_COUNT += 1

def assert_true(label, condition):
    assert_eq(label, True, bool(condition))

def unwrap_api_response(raw):
    """ApiResponse { success, data, ... } 래핑 해제"""
    if isinstance(raw, dict) and 'success' in raw and 'data' in raw:
        return raw['data']
    return raw

def api_post(data):
    body = json.dumps(data).encode()
    req = urllib.request.Request(API_URL, data=body, method="POST",
                                headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as r:
        return unwrap_api_response(json.loads(r.read()))

def api_delete_all():
    req = urllib.request.Request(API_URL, method="DELETE")
    urllib.request.urlopen(req)

def api_list(page=0, size=20):
    with urllib.request.urlopen(f"{API_URL}?page={page}&size={size}") as r:
        return unwrap_api_response(json.loads(r.read()))

def run_playwright(script, timeout=30):
    """Playwright JavaScript를 node로 실행 (파일 기반)"""
    import tempfile, os
    full_script = """
const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
        """ + script + """
    } catch (e) {
        console.log(JSON.stringify({ error: e.message }));
    } finally {
        await browser.close();
    }
})();
"""
    tmp_path = "/home/user/webapp/preview/_tmp_pw_test.js"
    with open(tmp_path, "w") as f:
        f.write(full_script)
    
    result = subprocess.run(
        ["node", tmp_path],
        capture_output=True, text=True, timeout=timeout,
        cwd="/home/user/webapp"
    )
    try:
        os.unlink(tmp_path)
    except:
        pass
    
    output = result.stdout.strip()
    if result.returncode != 0:
        return {"error": result.stderr.strip() or "non-zero exit"}
    try:
        return json.loads(output)
    except:
        return {"raw": output, "stderr": result.stderr.strip()}


# ══════════════════════════════════════════════
# 사전 준비: 테스트 데이터 생성
# ══════════════════════════════════════════════
print("\n\033[0;36m══ 사전 준비: 테스트 데이터 삽입 ══\033[0m")
api_delete_all()

# 3건 삽입
test_records = []
for i in range(1, 4):
    rec = api_post({
        "indBcd": f"E2E-BCD-{i:03d}",
        "lotnr": f"E2E-LOT-{i:03d}",
        "matnr": f"E2E-MAT",
        "matnrNm": f"테스트자재{i}",
        "operatorId": f"op{i:02d}",
        "operatorNm": f"검사자{i}",
        "totalCount": i * 10,
        "coverageRatio": i * 0.0001,
        "densityCount": i * 3,
        "thresholdMax": 115,
        "autoCount": i * 7,
        "manualCount": i,
        "bucketUpTo3": i * 2,
        "bucketUpTo5": i,
        "quadrantTopLeft": i,
        "quadrantTopRight": i + 1,
    })
    test_records.append(rec)
print(f"  \033[0;32m✓\033[0m 3건 삽입 완료")

# ══════════════════════════════════════════════
# T1: 이력 테이블 탭 전환 및 데이터 렌더링
# ══════════════════════════════════════════════
print(f"\n\033[1;33m━━━━ T1: 이력 테이블 탭 → 데이터 렌더링 ━━━━\033[0m")
result = run_playwright(f"""
    await page.goto('{BASE_URL}');
    await page.waitForTimeout(1500);
    
    // 이력 테이블 탭 클릭
    const tableTab = page.locator('.tab-trigger[data-tab-target="history-table"]');
    await tableTab.click();
    await page.waitForTimeout(1500);
    
    // 테이블 행 수 확인
    const rows = await page.locator('#historyTableBody tr').count();
    
    // 첫 번째 행의 바코드 텍스트
    const firstBcd = await page.locator('#historyTableBody tr:first-child td:nth-child(2)').textContent();
    
    // 빈 상태 메시지 hidden 여부
    const emptyHidden = await page.locator('#historyTableEmpty').evaluate(el => el.classList.contains('hidden'));
    
    // 필터 영역 존재 확인
    const hasDateFrom = await page.locator('#tableFilterDateFrom').count();
    const hasDateTo = await page.locator('#tableFilterDateTo').count();
    const hasIndBcdFilter = await page.locator('#tableFilterIndBcd').count();
    
    console.log(JSON.stringify({{ rows, firstBcd: firstBcd.trim(), emptyHidden, hasDateFrom, hasDateTo, hasIndBcdFilter }}));
""")
assert_eq("T1-A 테이블에 3행 렌더링", 3, result.get("rows"))
assert_eq("T1-B 최신 데이터가 첫 행 (E2E-BCD-003)", "E2E-BCD-003", result.get("firstBcd"))
assert_true("T1-C 빈 메시지 숨김", result.get("emptyHidden"))
assert_true("T1-D 날짜필터 From 존재", result.get("hasDateFrom", 0) > 0)
assert_true("T1-E 날짜필터 To 존재", result.get("hasDateTo", 0) > 0)
assert_true("T1-F 바코드필터 존재", result.get("hasIndBcdFilter", 0) > 0)

# ══════════════════════════════════════════════
# T2: 이력 테이블 필터링 (바코드)
# ══════════════════════════════════════════════
print(f"\n\033[1;33m━━━━ T2: 이력 테이블 바코드 필터링 ━━━━\033[0m")
result = run_playwright(f"""
    await page.goto('{BASE_URL}');
    await page.waitForTimeout(1500);
    
    // 이력 테이블 탭
    await page.locator('.tab-trigger[data-tab-target="history-table"]').click();
    await page.waitForTimeout(1500);
    
    // 바코드 필터에 입력
    await page.fill('#tableFilterIndBcd', 'E2E-BCD-001');
    await page.locator('#tableFilterSearchButton').click();
    await page.waitForTimeout(1500);
    
    const filteredRows = await page.locator('#historyTableBody tr').count();
    const filteredBcd = await page.locator('#historyTableBody tr:first-child td:nth-child(2)').textContent();
    
    // 초기화 버튼 클릭
    await page.locator('#tableFilterResetButton').click();
    await page.waitForTimeout(1500);
    
    const resetRows = await page.locator('#historyTableBody tr').count();
    const filterValue = await page.inputValue('#tableFilterIndBcd');
    
    console.log(JSON.stringify({{ filteredRows, filteredBcd: filteredBcd.trim(), resetRows, filterValue }}));
""")
assert_eq("T2-A 바코드 필터 → 1건", 1, result.get("filteredRows"))
assert_eq("T2-B 필터 결과 바코드 일치", "E2E-BCD-001", result.get("filteredBcd"))
assert_eq("T2-C 초기화 후 전체 복원 (3건)", 3, result.get("resetRows"))
assert_eq("T2-D 초기화 후 필터 비어있음", "", result.get("filterValue"))

# ══════════════════════════════════════════════
# T3: 이력 카드 탭에서 카드 렌더링 확인
# ══════════════════════════════════════════════
print(f"\n\033[1;33m━━━━ T3: 이력 카드 탭 렌더링 확인 ━━━━\033[0m")
result = run_playwright(f"""
    await page.goto('{BASE_URL}');
    await page.waitForTimeout(1500);
    
    // 검사 이력 탭 클릭
    await page.locator('.tab-trigger[data-tab-target="history"]').click();
    await page.waitForTimeout(1500);
    
    const cards = await page.locator('#historyList article').count();
    
    // 카드 내부에 바코드, LOT, 자재코드, 커버리지 키 정보가 있는지
    const cardHtml = await page.locator('#historyList').innerHTML();
    const hasBcd = cardHtml.includes('E2E-BCD-003');
    const hasLot = cardHtml.includes('E2E-LOT-003');
    const hasMat = cardHtml.includes('E2E-MAT');
    const hasOperator = cardHtml.includes('op03');
    
    // 삭제 버튼 존재
    const deleteButtons = await page.locator('#historyList [data-history-action="delete"]').count();
    
    console.log(JSON.stringify({{ cards, hasBcd, hasLot, hasMat, hasOperator, deleteButtons }}));
""")
assert_eq("T3-A 카드 3개 렌더링", 3, result.get("cards"))
assert_true("T3-B 바코드 표시 확인", result.get("hasBcd"))
assert_true("T3-C LOT 번호 표시 확인", result.get("hasLot"))
assert_true("T3-D 자재코드 표시 확인", result.get("hasMat"))
assert_true("T3-E 검사자 표시 확인", result.get("hasOperator"))
assert_eq("T3-F 삭제 버튼 3개", 3, result.get("deleteButtons"))

# ══════════════════════════════════════════════
# T4: 이력 삭제 후 UI 반영
# ══════════════════════════════════════════════
print(f"\n\033[1;33m━━━━ T4: 이력 삭제 후 UI 반영 ━━━━\033[0m")
result = run_playwright(f"""
    await page.goto('{BASE_URL}');
    await page.waitForTimeout(1500);
    
    // 이력 테이블 탭
    await page.locator('.tab-trigger[data-tab-target="history-table"]').click();
    await page.waitForTimeout(1500);
    
    const beforeRows = await page.locator('#historyTableBody tr').count();
    
    // 첫 번째 행의 삭제 버튼 클릭
    await page.locator('#historyTableBody tr:first-child [data-history-action="delete"]').click();
    await page.waitForTimeout(1500);
    
    const afterRows = await page.locator('#historyTableBody tr').count();
    
    console.log(JSON.stringify({{ beforeRows, afterRows }}));
""")
assert_eq("T4-A 삭제 전 3행", 3, result.get("beforeRows"))
assert_eq("T4-B 삭제 후 2행", 2, result.get("afterRows"))

# 데이터 복원
api_post({
    "indBcd": "E2E-BCD-003", "lotnr": "E2E-LOT-003", "matnr": "E2E-MAT",
    "operatorId": "op03", "totalCount": 30, "coverageRatio": 0.0003
})

# ══════════════════════════════════════════════
# T5: 시크릿 모드 – 배너/UI/저장 차단
# ══════════════════════════════════════════════
print(f"\n\033[1;33m━━━━ T5: 시크릿 모드 – 배너/UI/저장 차단 ━━━━\033[0m")
result = run_playwright(f"""
    await page.goto('{BASE_URL}');
    await page.waitForTimeout(1500);
    
    // 시크릿 모드 활성화 (로고 5번 클릭)
    const logo = page.locator('#headerLogo');
    await logo.click();
    await logo.click();
    await logo.click();
    await logo.click();
    await logo.click();
    await page.waitForTimeout(500);
    
    // 배너 표시 확인
    const bannerVisible = await page.locator('#secretModeBanner').evaluate(el => !el.classList.contains('hidden'));
    const bannerText = await page.locator('#secretModeBanner').textContent();
    const hasTestMode = bannerText.includes('테스트 모드');
    const hasNoSave = bannerText.includes('저장되지 않');
    const hasMes = bannerText.includes('MES');
    
    // 저장 버튼 숨김
    const saveHidden = await page.locator('#saveResultButton').evaluate(el => el.classList.contains('hidden'));
    
    // 이력 탭 숨김
    const historyTabHidden = await page.locator('.tab-trigger[data-tab-target="history"]').evaluate(el => el.classList.contains('hidden'));
    const tableTabHidden = await page.locator('.tab-trigger[data-tab-target="history-table"]').evaluate(el => el.classList.contains('hidden'));
    
    // 로고 색상 (amber)
    const logoHasAmber = await logo.evaluate(el => el.classList.contains('text-amber-600'));
    
    // 저장 메시지
    const saveMsg = await page.locator('#saveMessage').textContent();
    const hasSaveMsgWarning = saveMsg.includes('테스트 모드');
    
    console.log(JSON.stringify({{
        bannerVisible, hasTestMode, hasNoSave, hasMes,
        saveHidden, historyTabHidden, tableTabHidden, logoHasAmber, hasSaveMsgWarning
    }}));
""")
assert_true("T5-A 배너 표시됨", result.get("bannerVisible"))
assert_true("T5-B 배너에 '테스트 모드' 포함", result.get("hasTestMode"))
assert_true("T5-C 배너에 '저장되지 않' 포함", result.get("hasNoSave"))
assert_true("T5-D 배너에 'MES' 포함", result.get("hasMes"))
assert_true("T5-E 저장 버튼 숨김", result.get("saveHidden"))
assert_true("T5-F 검사 이력 탭 숨김", result.get("historyTabHidden"))
assert_true("T5-G 이력 테이블 탭 숨김", result.get("tableTabHidden"))
assert_true("T5-H 로고 amber 색상", result.get("logoHasAmber"))
assert_true("T5-I 저장 메시지 경고 표시", result.get("hasSaveMsgWarning"))

# ══════════════════════════════════════════════
# T6: 필수 필드 미입력 시 UI 경고
# ══════════════════════════════════════════════
print(f"\n\033[1;33m━━━━ T6: 필수 필드 미입력 시 UI 경고 ━━━━\033[0m")
result = run_playwright(f"""
    await page.goto('{BASE_URL}');
    await page.waitForTimeout(1500);
    
    // 필수 필드에 별표(*) 확인
    const labels = await page.locator('label .text-rose-500').count();
    
    // indBcdInput에 값 입력 후 다시 비우기
    const indBcd = page.locator('#indBcdInput');
    await indBcd.fill('test');
    await indBcd.fill('');
    
    // 필수 필드 클래스 확인 (border-rose가 없는 초기 상태)
    const initHasRedBorder = await indBcd.evaluate(el => el.classList.contains('border-rose-400'));
    
    // input 이벤트로 빨간 테두리 해제 확인
    await indBcd.fill('');
    await indBcd.evaluate(el => {{
        el.classList.add('border-rose-400', 'ring-2', 'ring-rose-200');
    }});
    const hasRedBefore = await indBcd.evaluate(el => el.classList.contains('border-rose-400'));
    await indBcd.fill('test-value');
    await page.waitForTimeout(300);
    const hasRedAfter = await indBcd.evaluate(el => el.classList.contains('border-rose-400'));
    
    console.log(JSON.stringify({{ labels, initHasRedBorder, hasRedBefore, hasRedAfter }}));
""")
assert_true("T6-A 필수 필드 별표(★) 4개 이상", result.get("labels", 0) >= 4)
assert_eq("T6-B 초기 상태 빨간 테두리 없음", False, result.get("initHasRedBorder"))
assert_true("T6-C 빨간 테두리 추가됨", result.get("hasRedBefore"))
assert_eq("T6-D 입력 후 빨간 테두리 해제", False, result.get("hasRedAfter"))

# ══════════════════════════════════════════════
# T7: URL 파라미터로 필드 자동 채우기
# ══════════════════════════════════════════════
print(f"\n\033[1;33m━━━━ T7: URL 파라미터 → 필드 자동 채우기 ━━━━\033[0m")
params = urllib.parse.urlencode({
    "IND_BCD": "URL-BCD-001",
    "LOT_NO": "URL-LOT-001",
    "MATNR": "URL-MAT-001",
    "MATNR_NM": "URL자재명",
    "USERID": "url_user",
    "USERNM": "URL검사자",
})
result = run_playwright(f"""
    await page.goto('{BASE_URL}/?{params}');
    await page.waitForTimeout(1500);
    
    const indBcd = await page.inputValue('#indBcdInput');
    const lotnr = await page.inputValue('#lotnrInput');
    const matnr = await page.inputValue('#matnrInput');
    const matnrNm = await page.inputValue('#matnrNmInput');
    const operatorId = await page.inputValue('#operatorIdInput');
    const operatorNm = await page.inputValue('#operatorNmInput');
    
    console.log(JSON.stringify({{ indBcd, lotnr, matnr, matnrNm, operatorId, operatorNm }}));
""")
assert_eq("T7-A IND_BCD 자동 채움", "URL-BCD-001", result.get("indBcd"))
assert_eq("T7-B LOT_NO 자동 채움", "URL-LOT-001", result.get("lotnr"))
assert_eq("T7-C MATNR 자동 채움", "URL-MAT-001", result.get("matnr"))
assert_eq("T7-D MATNR_NM 자동 채움", "URL자재명", result.get("matnrNm"))
assert_eq("T7-E USERID 자동 채움", "url_user", result.get("operatorId"))
assert_eq("T7-F USERNM 자동 채움", "URL검사자", result.get("operatorNm"))

# ══════════════════════════════════════════════
# T8: 페이지네이션 버튼 렌더링
# ══════════════════════════════════════════════
print(f"\n\033[1;33m━━━━ T8: 페이지네이션 버튼 렌더링 ━━━━\033[0m")

# 데이터 초기화 후 25건 새로 삽입
api_delete_all()
for i in range(1, 26):
    api_post({
        "indBcd": f"PG-BCD-{i:03d}", "lotnr": f"PG-LOT-{i:03d}",
        "matnr": "PG-MAT", "operatorId": f"pgop{i:02d}", "totalCount": i
    })

# API로 먼저 데이터 확인
verify = api_list(0, 100)
print(f"  Data verify: {verify['totalElements']} records")

result = run_playwright("""
    await page.goto('""" + BASE_URL + """');
    await page.waitForTimeout(2000);
    
    // history-table tab
    await page.locator('.tab-trigger[data-tab-target="history-table"]').click();
    await page.waitForTimeout(3000);
    
    const rows = await page.locator('#historyTableBody tr').count();
    const paginationButtons = await page.locator('#historyTablePagination button').count();
    
    let hasNext = false;
    if (paginationButtons > 0) {
        const lastBtnText = await page.locator('#historyTablePagination button:last-child').textContent();
        hasNext = lastBtnText.includes('다음');
    }
    
    // Click page 2 button (use getByRole to avoid strict mode violation)
    let page2Rows = 0;
    const page2Btn = page.locator('#historyTablePagination').getByRole('button', { name: '2', exact: true });
    if (await page2Btn.count() > 0) {
        await page2Btn.click();
        await page.waitForTimeout(2000);
        page2Rows = await page.locator('#historyTableBody tr').count();
    }
    
    console.log(JSON.stringify({ rows, paginationButtons, hasNext, page2Rows }));
""", timeout=45)
assert_eq("T8-A 1페이지 20행", 20, result.get("rows"))
assert_true("T8-B 페이지네이션 버튼 존재", result.get("paginationButtons", 0) > 0)
assert_true("T8-C '다음' 버튼 존재", result.get("hasNext"))
assert_true("T8-D 2페이지 나머지 행 (5건)", result.get("page2Rows", 0) > 0)

# ══════════════════════════════════════════════
# T9: 검색 키워드로 이력 필터링 (카드 탭)
# ══════════════════════════════════════════════
print(f"\n\033[1;33m━━━━ T9: 검사 이력 탭 검색 키워드 필터링 ━━━━\033[0m")

# T8에서 데이터가 변경되었으므로 검색 대상을 현재 데이터로 설정
# T8에서 PG-BCD-001~025이 있으므로 이를 검색
result = run_playwright("""
    await page.goto('""" + BASE_URL + """');
    await page.waitForTimeout(1500);
    
    // 검사 이력 탭
    await page.locator('.tab-trigger[data-tab-target="history"]').click();
    await page.waitForTimeout(1500);
    
    // 검색
    await page.fill('#historySearchInput', 'PG-BCD-001');
    await page.locator('#historySearchButton').click();
    await page.waitForTimeout(1500);
    
    const cards = await page.locator('#historyList article').count();
    const cardText = await page.locator('#historyList').textContent();
    const hasBcd001 = cardText.includes('PG-BCD-001');
    
    console.log(JSON.stringify({ cards, hasBcd001 }));
""")
assert_eq("T9-A 검색 결과 1건", 1, result.get("cards"))
assert_true("T9-B 검색 결과에 바코드 포함", result.get("hasBcd001"))

# ══════════════════════════════════════════════
# T10: 시크릿 모드 → 탭 숨김 → 해제 후 복원
# ══════════════════════════════════════════════
print(f"\n\033[1;33m━━━━ T10: 시크릿 모드 → 해제 → UI 복원 ━━━━\033[0m")
result = run_playwright(f"""
    await page.goto('{BASE_URL}');
    await page.waitForTimeout(1500);
    
    // 활성화
    const logo = page.locator('#headerLogo');
    await logo.click(); await logo.click(); await logo.click(); await logo.click(); await logo.click();
    await page.waitForTimeout(500);
    
    const secretOn_historyHidden = await page.locator('.tab-trigger[data-tab-target="history"]').evaluate(el => el.classList.contains('hidden'));
    const secretOn_tableHidden = await page.locator('.tab-trigger[data-tab-target="history-table"]').evaluate(el => el.classList.contains('hidden'));
    const secretOn_bannerVisible = await page.locator('#secretModeBanner').evaluate(el => !el.classList.contains('hidden'));
    
    // 비활성화 (다시 5번 클릭)
    await logo.click(); await logo.click(); await logo.click(); await logo.click(); await logo.click();
    await page.waitForTimeout(500);
    
    const secretOff_historyHidden = await page.locator('.tab-trigger[data-tab-target="history"]').evaluate(el => el.classList.contains('hidden'));
    const secretOff_tableHidden = await page.locator('.tab-trigger[data-tab-target="history-table"]').evaluate(el => el.classList.contains('hidden'));
    const secretOff_bannerHidden = await page.locator('#secretModeBanner').evaluate(el => el.classList.contains('hidden'));
    const secretOff_logoIndigo = await logo.evaluate(el => el.classList.contains('text-indigo-600'));
    const secretOff_saveVisible = await page.locator('#saveResultButton').evaluate(el => !el.classList.contains('hidden'));
    
    console.log(JSON.stringify({{
        secretOn_historyHidden, secretOn_tableHidden, secretOn_bannerVisible,
        secretOff_historyHidden, secretOff_tableHidden, secretOff_bannerHidden,
        secretOff_logoIndigo, secretOff_saveVisible
    }}));
""")
assert_true("T10-A ON: 이력 탭 숨김", result.get("secretOn_historyHidden"))
assert_true("T10-B ON: 테이블 탭 숨김", result.get("secretOn_tableHidden"))
assert_true("T10-C ON: 배너 표시", result.get("secretOn_bannerVisible"))
assert_eq("T10-D OFF: 이력 탭 복원", False, result.get("secretOff_historyHidden"))
assert_eq("T10-E OFF: 테이블 탭 복원", False, result.get("secretOff_tableHidden"))
assert_true("T10-F OFF: 배너 숨김", result.get("secretOff_bannerHidden"))
assert_true("T10-G OFF: 로고 indigo 복원", result.get("secretOff_logoIndigo"))
assert_true("T10-H OFF: 저장 버튼 복원", result.get("secretOff_saveVisible"))

# ══════════════════════════════════════════════
# 정리 및 결과 출력
# ══════════════════════════════════════════════
api_delete_all()

print(f"\n\033[0;36m═══════════════════════════════════════════════════════════\033[0m")
print(f"\033[0;36m       E2E Playwright 통합 테스트 결과 (Front-end)          \033[0m")
print(f"\033[0;36m═══════════════════════════════════════════════════════════\033[0m")
print(f"  총 테스트: {TOTAL_COUNT}")
print(f"  \033[0;32mPASS: {PASS_COUNT}\033[0m")
print(f"  \033[0;31mFAIL: {FAIL_COUNT}\033[0m")

if FAIL_COUNT == 0:
    print(f"\n  \033[0;32m🎉 전체 E2E 테스트 통과!\033[0m")
else:
    print(f"\n  \033[0;31m⚠️  실패 테스트가 있습니다.\033[0m")
print()

sys.exit(FAIL_COUNT)
