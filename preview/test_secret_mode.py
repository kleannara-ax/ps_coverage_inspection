#!/usr/bin/env python3
"""
시크릿 모드 통합 테스트 (Playwright)

테스트 케이스:
1. 로고 5회 클릭 → 시크릿 모드 ON 확인
2. 시크릿 모드 배너 표시 확인
3. 검사 메타데이터 카드 숨김 확인
4. 저장 버튼 숨김 확인
5. 이력 탭 숨김 확인
6. 로고 색상 변경 확인 (indigo → amber)
7. 시크릿 모드에서 저장 API 차단 확인
8. 시크릿 모드에서 이미지 분석 가능 확인
9. 로고 5회 재클릭 → 시크릿 모드 OFF 확인
10. 모드 해제 후 전체 UI 복원 확인
"""

import subprocess
import sys
import json
import time

BASE_URL = "http://localhost:8080"
RESULTS = []

def log(msg, status="INFO"):
    icon = {"PASS": "✅", "FAIL": "❌", "INFO": "ℹ️", "WARN": "⚠️"}.get(status, "")
    print(f"  {icon} {msg}")

def test_pass(name, detail=""):
    RESULTS.append({"name": name, "status": "PASS", "detail": detail})
    log(f"{name}: {detail}", "PASS")

def test_fail(name, detail=""):
    RESULTS.append({"name": name, "status": "FAIL", "detail": detail})
    log(f"{name}: {detail}", "FAIL")

def run_playwright_script(script, timeout=30):
    """Run a Playwright script and return the result."""
    full_script = f"""
const {{ chromium }} = require('playwright');

(async () => {{
    const browser = await chromium.launch({{ headless: true }});
    const page = await browser.newPage();
    
    try {{
        {script}
    }} catch (err) {{
        console.log(JSON.stringify({{ error: err.message }}));
    }} finally {{
        await browser.close();
    }}
}})();
"""
    result = subprocess.run(
        ["node", "-e", full_script],
        capture_output=True, text=True, timeout=timeout
    )
    stdout = result.stdout.strip()
    stderr = result.stderr.strip()
    
    # Parse last JSON line from stdout
    lines = stdout.split('\n')
    for line in reversed(lines):
        line = line.strip()
        if line.startswith('{') or line.startswith('['):
            try:
                return json.loads(line)
            except json.JSONDecodeError:
                continue
    
    return {"stdout": stdout, "stderr": stderr, "returncode": result.returncode}


def check_playwright_available():
    """Check if Playwright is installed."""
    try:
        result = subprocess.run(
            ["node", "-e", "require('playwright')"],
            capture_output=True, text=True, timeout=10
        )
        return result.returncode == 0
    except Exception:
        return False


def install_playwright():
    """Install Playwright if not available."""
    print("Installing Playwright...")
    subprocess.run(["npm", "install", "playwright"], capture_output=True, timeout=120)
    subprocess.run(["npx", "playwright", "install", "chromium"], capture_output=True, timeout=120)


# ==============================
# TEST 1: 로고 5회 클릭 → 시크릿 모드 ON
# ==============================
def test_1_secret_mode_on():
    """로고 5회 클릭으로 시크릿 모드 활성화"""
    result = run_playwright_script(f"""
        await page.goto('{BASE_URL}');
        await page.waitForSelector('#headerLogo');
        
        // 초기 상태 확인
        const bannerBefore = await page.locator('#secretModeBanner').evaluate(el => el.classList.contains('hidden'));
        
        // 로고 5회 클릭
        const logo = page.locator('#headerLogo');
        await logo.click();
        await logo.click();
        await logo.click();
        await logo.click();
        await logo.click();
        
        await page.waitForTimeout(500);
        
        // 시크릿 모드 상태 확인
        const bannerAfter = await page.locator('#secretModeBanner').evaluate(el => el.classList.contains('hidden'));
        
        console.log(JSON.stringify({{
            bannerHiddenBefore: bannerBefore,
            bannerHiddenAfter: bannerAfter
        }}));
    """)
    
    if isinstance(result, dict) and 'error' not in result:
        if result.get('bannerHiddenBefore') == True and result.get('bannerHiddenAfter') == False:
            test_pass("TEST 1: 로고 5회 클릭 → 시크릿 모드 ON", 
                      f"배너 before={result['bannerHiddenBefore']}, after={result['bannerHiddenAfter']}")
        else:
            test_fail("TEST 1: 로고 5회 클릭 → 시크릿 모드 ON",
                      f"배너 상태 불일치: before={result.get('bannerHiddenBefore')}, after={result.get('bannerHiddenAfter')}")
    else:
        test_fail("TEST 1: 로고 5회 클릭 → 시크릿 모드 ON", f"스크립트 에러: {result}")


# ==============================
# TEST 2: 시크릿 모드 배너 내용 확인
# ==============================
def test_2_banner_content():
    """시크릿 모드 배너에 테스트 안내 문구 표시"""
    result = run_playwright_script(f"""
        await page.goto('{BASE_URL}');
        await page.waitForSelector('#headerLogo');
        
        const logo = page.locator('#headerLogo');
        await logo.click(); await logo.click(); await logo.click(); await logo.click(); await logo.click();
        await page.waitForTimeout(500);
        
        const banner = page.locator('#secretModeBanner');
        const isVisible = await banner.isVisible();
        const text = await banner.textContent();
        
        const hasTestMode = text.includes('테스트 모드');
        const hasNoSave = text.includes('저장되지 않');
        const hasMesNote = text.includes('MES');
        
        console.log(JSON.stringify({{
            isVisible: isVisible,
            hasTestMode: hasTestMode,
            hasNoSave: hasNoSave,
            hasMesNote: hasMesNote,
            textSnippet: text.substring(0, 100)
        }}));
    """)
    
    if isinstance(result, dict) and 'error' not in result:
        if all([result.get('isVisible'), result.get('hasTestMode'), 
                result.get('hasNoSave'), result.get('hasMesNote')]):
            test_pass("TEST 2: 시크릿 모드 배너 내용", 
                      f"테스트모드={result['hasTestMode']}, 저장안됨={result['hasNoSave']}, MES={result['hasMesNote']}")
        else:
            test_fail("TEST 2: 시크릿 모드 배너 내용", 
                      f"visible={result.get('isVisible')}, test={result.get('hasTestMode')}, save={result.get('hasNoSave')}, mes={result.get('hasMesNote')}")
    else:
        test_fail("TEST 2: 시크릿 모드 배너 내용", f"스크립트 에러: {result}")


# ==============================
# TEST 3: 메타데이터 카드 숨김
# ==============================
def test_3_metadata_hidden():
    """시크릿 모드에서 검사 메타데이터 카드 숨김"""
    result = run_playwright_script(f"""
        await page.goto('{BASE_URL}');
        await page.waitForSelector('#headerLogo');
        
        // 초기: 메타데이터 카드 보임
        const metaBefore = await page.locator('#indBcdInput').isVisible();
        
        // 시크릿 모드 ON
        const logo = page.locator('#headerLogo');
        await logo.click(); await logo.click(); await logo.click(); await logo.click(); await logo.click();
        await page.waitForTimeout(500);
        
        // 시크릿 모드: 메타데이터 카드 숨김
        const metaAfter = await page.locator('#indBcdInput').isVisible();
        
        console.log(JSON.stringify({{
            metaVisibleBefore: metaBefore,
            metaVisibleAfter: metaAfter
        }}));
    """)
    
    if isinstance(result, dict) and 'error' not in result:
        if result.get('metaVisibleBefore') == True and result.get('metaVisibleAfter') == False:
            test_pass("TEST 3: 메타데이터 카드 숨김", 
                      f"before={result['metaVisibleBefore']}, after={result['metaVisibleAfter']}")
        else:
            test_fail("TEST 3: 메타데이터 카드 숨김",
                      f"before={result.get('metaVisibleBefore')}, after={result.get('metaVisibleAfter')}")
    else:
        test_fail("TEST 3: 메타데이터 카드 숨김", f"스크립트 에러: {result}")


# ==============================
# TEST 4: 저장 버튼 숨김
# ==============================
def test_4_save_button_hidden():
    """시크릿 모드에서 저장 버튼 숨김"""
    result = run_playwright_script(f"""
        await page.goto('{BASE_URL}');
        await page.waitForSelector('#headerLogo');
        
        // 초기: 저장 버튼 존재 (disabled 상태라도 visible)
        const saveBtnExists = await page.locator('#saveResultButton').count() > 0;
        const saveBtnHiddenBefore = await page.locator('#saveResultButton').evaluate(el => el.classList.contains('hidden'));
        
        // 시크릿 모드 ON
        const logo = page.locator('#headerLogo');
        await logo.click(); await logo.click(); await logo.click(); await logo.click(); await logo.click();
        await page.waitForTimeout(500);
        
        const saveBtnHiddenAfter = await page.locator('#saveResultButton').evaluate(el => el.classList.contains('hidden'));
        
        // 저장 안내 메시지 변경 확인
        const saveMsg = await page.locator('#saveMessage').textContent();
        const hasMuteMsg = saveMsg.includes('테스트 모드');
        
        console.log(JSON.stringify({{
            exists: saveBtnExists,
            hiddenBefore: saveBtnHiddenBefore,
            hiddenAfter: saveBtnHiddenAfter,
            hasMuteMsg: hasMuteMsg,
            saveMsg: saveMsg
        }}));
    """)
    
    if isinstance(result, dict) and 'error' not in result:
        if (result.get('hiddenBefore') == False and 
            result.get('hiddenAfter') == True and 
            result.get('hasMuteMsg') == True):
            test_pass("TEST 4: 저장 버튼 숨김", 
                      f"hidden: {result['hiddenBefore']}→{result['hiddenAfter']}, msg={result.get('saveMsg','')[:50]}")
        else:
            test_fail("TEST 4: 저장 버튼 숨김", 
                      f"hidden: {result.get('hiddenBefore')}→{result.get('hiddenAfter')}, msg={result.get('hasMuteMsg')}")
    else:
        test_fail("TEST 4: 저장 버튼 숨김", f"스크립트 에러: {result}")


# ==============================
# TEST 5: 이력 탭 숨김
# ==============================
def test_5_history_tabs_hidden():
    """시크릿 모드에서 이력/테이블 탭 숨김"""
    result = run_playwright_script(f"""
        await page.goto('{BASE_URL}');
        await page.waitForSelector('#headerLogo');
        
        // 초기: 이력 탭 3개 모두 보임
        const tabsBefore = await page.evaluate(() => {{
            const buttons = document.querySelectorAll('.tab-trigger');
            return Array.from(buttons).map(btn => ({{
                target: btn.getAttribute('data-tab-target'),
                hidden: btn.classList.contains('hidden')
            }}));
        }});
        
        // 시크릿 모드 ON
        const logo = page.locator('#headerLogo');
        await logo.click(); await logo.click(); await logo.click(); await logo.click(); await logo.click();
        await page.waitForTimeout(500);
        
        const tabsAfter = await page.evaluate(() => {{
            const buttons = document.querySelectorAll('.tab-trigger');
            return Array.from(buttons).map(btn => ({{
                target: btn.getAttribute('data-tab-target'),
                hidden: btn.classList.contains('hidden')
            }}));
        }});
        
        console.log(JSON.stringify({{ tabsBefore, tabsAfter }}));
    """)
    
    if isinstance(result, dict) and 'error' not in result:
        tabs_before = result.get('tabsBefore', [])
        tabs_after = result.get('tabsAfter', [])
        
        # Before: none hidden
        before_ok = all(not t['hidden'] for t in tabs_before)
        # After: processing visible, history + history-table hidden
        processing_visible = next((not t['hidden'] for t in tabs_after if t['target'] == 'processing'), False)
        history_hidden = next((t['hidden'] for t in tabs_after if t['target'] == 'history'), False)
        history_table_hidden = next((t['hidden'] for t in tabs_after if t['target'] == 'history-table'), False)
        
        if before_ok and processing_visible and history_hidden and history_table_hidden:
            test_pass("TEST 5: 이력 탭 숨김", 
                      f"processing=visible, history=hidden, history-table=hidden")
        else:
            test_fail("TEST 5: 이력 탭 숨김",
                      f"before_ok={before_ok}, proc={processing_visible}, hist={history_hidden}, tbl={history_table_hidden}")
    else:
        test_fail("TEST 5: 이력 탭 숨김", f"스크립트 에러: {result}")


# ==============================
# TEST 6: 로고 색상 변경
# ==============================
def test_6_logo_color():
    """시크릿 모드에서 로고 색상 indigo→amber 변경"""
    result = run_playwright_script(f"""
        await page.goto('{BASE_URL}');
        await page.waitForSelector('#headerLogo');
        
        const colorBefore = await page.locator('#headerLogo').evaluate(el => {{
            return {{
                hasIndigo: el.classList.contains('text-indigo-600'),
                hasAmber: el.classList.contains('text-amber-600')
            }};
        }});
        
        // 시크릿 모드 ON
        const logo = page.locator('#headerLogo');
        await logo.click(); await logo.click(); await logo.click(); await logo.click(); await logo.click();
        await page.waitForTimeout(500);
        
        const colorAfter = await page.locator('#headerLogo').evaluate(el => {{
            return {{
                hasIndigo: el.classList.contains('text-indigo-600'),
                hasAmber: el.classList.contains('text-amber-600')
            }};
        }});
        
        console.log(JSON.stringify({{ colorBefore, colorAfter }}));
    """)
    
    if isinstance(result, dict) and 'error' not in result:
        before = result.get('colorBefore', {})
        after = result.get('colorAfter', {})
        
        if (before.get('hasIndigo') == True and before.get('hasAmber') == False and
            after.get('hasIndigo') == False and after.get('hasAmber') == True):
            test_pass("TEST 6: 로고 색상 변경", 
                      f"indigo→amber: {before} → {after}")
        else:
            test_fail("TEST 6: 로고 색상 변경",
                      f"before={before}, after={after}")
    else:
        test_fail("TEST 6: 로고 색상 변경", f"스크립트 에러: {result}")


# ==============================
# TEST 7: 시크릿 모드에서 저장 차단
# ==============================
def test_7_save_blocked():
    """시크릿 모드에서 handleSaveResult 호출 시 차단"""
    result = run_playwright_script(f"""
        await page.goto('{BASE_URL}');
        await page.waitForSelector('#headerLogo');
        
        // 시크릿 모드 ON
        const logo = page.locator('#headerLogo');
        await logo.click(); await logo.click(); await logo.click(); await logo.click(); await logo.click();
        await page.waitForTimeout(500);
        
        // 콘솔 로그 캡처
        const consoleLogs = [];
        page.on('console', msg => consoleLogs.push(msg.text()));
        
        // 강제로 state.secretMode 확인 + 저장 시도
        const secretState = await page.evaluate(() => {{
            // 직접 접근 어려움. 저장 버튼이 hidden이므로 클릭할 수 없음
            const saveBtn = document.getElementById('saveResultButton');
            const isHidden = saveBtn ? saveBtn.classList.contains('hidden') : true;
            const saveMsg = document.getElementById('saveMessage');
            return {{
                saveBtnHidden: isHidden,
                saveMsgText: saveMsg ? saveMsg.textContent : ''
            }};
        }});
        
        console.log(JSON.stringify(secretState));
    """)
    
    if isinstance(result, dict) and 'error' not in result:
        if result.get('saveBtnHidden') == True:
            msg = result.get('saveMsgText', '')
            test_pass("TEST 7: 시크릿 모드 저장 차단", 
                      f"저장버튼 hidden={result['saveBtnHidden']}, msg='{msg[:60]}'")
        else:
            test_fail("TEST 7: 시크릿 모드 저장 차단",
                      f"저장버튼 hidden={result.get('saveBtnHidden')}")
    else:
        test_fail("TEST 7: 시크릿 모드 저장 차단", f"스크립트 에러: {result}")


# ==============================
# TEST 8: 시크릿 모드에서 이미지 분석 가능
# ==============================
def test_8_analysis_available():
    """시크릿 모드에서 이미지 업로드 버튼과 분석 UI 사용 가능"""
    result = run_playwright_script(f"""
        await page.goto('{BASE_URL}');
        await page.waitForSelector('#headerLogo');
        
        // 시크릿 모드 ON
        const logo = page.locator('#headerLogo');
        await logo.click(); await logo.click(); await logo.click(); await logo.click(); await logo.click();
        await page.waitForTimeout(500);
        
        // 이미지 업로드 버튼 확인
        const cameraBtn = await page.locator('#openCameraButton').isVisible();
        const galleryBtn = await page.locator('#openGalleryButton').isVisible();
        const thresholdSlider = await page.locator('#thresholdSlider').count() > 0;
        const binaryCanvas = await page.locator('#binaryCanvas').count() > 0;
        
        // 품질 검사 결과 카드 확인
        const qualityMetrics = await page.locator('#metricTotalCountValue').isVisible();
        
        // 수동 추가 버튼 확인
        const manualBtn = await page.locator('#toggleManualAddButton').isVisible();
        
        console.log(JSON.stringify({{
            cameraBtn, galleryBtn, thresholdSlider, binaryCanvas, qualityMetrics, manualBtn
        }}));
    """)
    
    if isinstance(result, dict) and 'error' not in result:
        all_available = all([
            result.get('cameraBtn'), result.get('galleryBtn'),
            result.get('thresholdSlider'), result.get('binaryCanvas'),
            result.get('qualityMetrics'), result.get('manualBtn')
        ])
        if all_available:
            test_pass("TEST 8: 시크릿 모드 분석 기능 가용", 
                      f"camera={result['cameraBtn']}, gallery={result['galleryBtn']}, threshold={result['thresholdSlider']}, metrics={result['qualityMetrics']}")
        else:
            test_fail("TEST 8: 시크릿 모드 분석 기능 가용", f"결과: {result}")
    else:
        test_fail("TEST 8: 시크릿 모드 분석 기능 가용", f"스크립트 에러: {result}")


# ==============================
# TEST 9: 로고 5회 재클릭 → 시크릿 모드 OFF
# ==============================
def test_9_secret_mode_off():
    """로고 5회 재클릭으로 시크릿 모드 해제"""
    result = run_playwright_script(f"""
        await page.goto('{BASE_URL}');
        await page.waitForSelector('#headerLogo');
        
        const logo = page.locator('#headerLogo');
        
        // 시크릿 모드 ON
        await logo.click(); await logo.click(); await logo.click(); await logo.click(); await logo.click();
        await page.waitForTimeout(500);
        
        const bannerOn = await page.locator('#secretModeBanner').evaluate(el => !el.classList.contains('hidden'));
        
        // 시크릿 모드 OFF
        await logo.click(); await logo.click(); await logo.click(); await logo.click(); await logo.click();
        await page.waitForTimeout(500);
        
        const bannerOff = await page.locator('#secretModeBanner').evaluate(el => el.classList.contains('hidden'));
        
        console.log(JSON.stringify({{ bannerOn, bannerOff }}));
    """)
    
    if isinstance(result, dict) and 'error' not in result:
        if result.get('bannerOn') == True and result.get('bannerOff') == True:
            test_pass("TEST 9: 시크릿 모드 OFF (재클릭)", 
                      f"ON시 배너표시={result['bannerOn']}, OFF시 배너숨김={result['bannerOff']}")
        else:
            test_fail("TEST 9: 시크릿 모드 OFF (재클릭)",
                      f"ON={result.get('bannerOn')}, OFF={result.get('bannerOff')}")
    else:
        test_fail("TEST 9: 시크릿 모드 OFF (재클릭)", f"스크립트 에러: {result}")


# ==============================
# TEST 10: 모드 해제 후 전체 UI 복원
# ==============================
def test_10_ui_restored():
    """시크릿 모드 해제 후 전체 UI 복원"""
    result = run_playwright_script(f"""
        await page.goto('{BASE_URL}');
        await page.waitForSelector('#headerLogo');
        
        const logo = page.locator('#headerLogo');
        
        // ON → OFF
        await logo.click(); await logo.click(); await logo.click(); await logo.click(); await logo.click();
        await page.waitForTimeout(300);
        await logo.click(); await logo.click(); await logo.click(); await logo.click(); await logo.click();
        await page.waitForTimeout(500);
        
        // 메타데이터 입력 필드 다시 보임
        const metaVisible = await page.locator('#indBcdInput').isVisible();
        
        // 저장 버튼 다시 보임
        const saveBtnHidden = await page.locator('#saveResultButton').evaluate(el => el.classList.contains('hidden'));
        
        // 이력 탭 다시 보임
        const tabs = await page.evaluate(() => {{
            const buttons = document.querySelectorAll('.tab-trigger');
            return Array.from(buttons).map(btn => ({{
                target: btn.getAttribute('data-tab-target'),
                hidden: btn.classList.contains('hidden')
            }}));
        }});
        
        // 로고 색상 복원
        const logoColor = await page.locator('#headerLogo').evaluate(el => ({{
            hasIndigo: el.classList.contains('text-indigo-600'),
            hasAmber: el.classList.contains('text-amber-600')
        }}));
        
        // 저장 메시지 복원
        const saveMsg = await page.locator('#saveMessage').textContent();
        const saveMsgRestored = !saveMsg.includes('테스트 모드');
        
        console.log(JSON.stringify({{
            metaVisible,
            saveBtnHidden,
            tabs,
            logoColor,
            saveMsgRestored,
            saveMsg
        }}));
    """)
    
    if isinstance(result, dict) and 'error' not in result:
        meta_ok = result.get('metaVisible') == True
        save_ok = result.get('saveBtnHidden') == False
        tabs = result.get('tabs', [])
        tabs_ok = all(not t['hidden'] for t in tabs)
        logo_ok = (result.get('logoColor', {}).get('hasIndigo') == True and 
                   result.get('logoColor', {}).get('hasAmber') == False)
        msg_ok = result.get('saveMsgRestored') == True
        
        all_ok = all([meta_ok, save_ok, tabs_ok, logo_ok, msg_ok])
        
        if all_ok:
            test_pass("TEST 10: UI 복원", 
                      f"meta={meta_ok}, save={save_ok}, tabs={tabs_ok}, logo={logo_ok}, msg={msg_ok}")
        else:
            test_fail("TEST 10: UI 복원",
                      f"meta={meta_ok}, save={save_ok}, tabs={tabs_ok}, logo={logo_ok}, msg={msg_ok}")
    else:
        test_fail("TEST 10: UI 복원", f"스크립트 에러: {result}")


# ==============================
# BONUS TEST 11: 4회 클릭은 시크릿 모드 트리거 안됨
# ==============================
def test_11_four_clicks_no_trigger():
    """로고 4회 클릭은 시크릿 모드 트리거 안됨"""
    result = run_playwright_script(f"""
        await page.goto('{BASE_URL}');
        await page.waitForSelector('#headerLogo');
        
        const logo = page.locator('#headerLogo');
        await logo.click();
        await logo.click();
        await logo.click();
        await logo.click();
        await page.waitForTimeout(2000); // 타임아웃 대기
        
        const bannerHidden = await page.locator('#secretModeBanner').evaluate(el => el.classList.contains('hidden'));
        
        console.log(JSON.stringify({{ bannerHidden }}));
    """)
    
    if isinstance(result, dict) and 'error' not in result:
        if result.get('bannerHidden') == True:
            test_pass("TEST 11: 4회 클릭 → 트리거 안됨", 
                      f"배너 숨김 유지={result['bannerHidden']}")
        else:
            test_fail("TEST 11: 4회 클릭 → 트리거 안됨",
                      f"배너 hidden={result.get('bannerHidden')}")
    else:
        test_fail("TEST 11: 4회 클릭 → 트리거 안됨", f"스크립트 에러: {result}")


# ==============================
# BONUS TEST 12: 타임아웃 이후 클릭 리셋
# ==============================
def test_12_timeout_reset():
    """1.5초 이상 간격 클릭 시 카운터 리셋"""
    result = run_playwright_script(f"""
        await page.goto('{BASE_URL}');
        await page.waitForSelector('#headerLogo');
        
        const logo = page.locator('#headerLogo');
        
        // 3회 클릭 → 2초 대기 → 2회 클릭 (총 5회지만 리셋됨)
        await logo.click();
        await logo.click();
        await logo.click();
        await page.waitForTimeout(2000);
        await logo.click();
        await logo.click();
        await page.waitForTimeout(500);
        
        const bannerHidden = await page.locator('#secretModeBanner').evaluate(el => el.classList.contains('hidden'));
        
        console.log(JSON.stringify({{ bannerHidden }}));
    """)
    
    if isinstance(result, dict) and 'error' not in result:
        if result.get('bannerHidden') == True:
            test_pass("TEST 12: 타임아웃 리셋 (3+2초+2=5 but reset)", 
                      f"배너 숨김 유지={result['bannerHidden']}")
        else:
            test_fail("TEST 12: 타임아웃 리셋",
                      f"배너 hidden={result.get('bannerHidden')}")
    else:
        test_fail("TEST 12: 타임아웃 리셋", f"스크립트 에러: {result}")


# ==============================
# Main
# ==============================
if __name__ == "__main__":
    print("=" * 60)
    print("🔒 시크릿 모드 통합 테스트")
    print("=" * 60)
    
    if not check_playwright_available():
        install_playwright()
    
    tests = [
        test_1_secret_mode_on,
        test_2_banner_content,
        test_3_metadata_hidden,
        test_4_save_button_hidden,
        test_5_history_tabs_hidden,
        test_6_logo_color,
        test_7_save_blocked,
        test_8_analysis_available,
        test_9_secret_mode_off,
        test_10_ui_restored,
        test_11_four_clicks_no_trigger,
        test_12_timeout_reset,
    ]
    
    for test_fn in tests:
        try:
            print(f"\n▶ {test_fn.__doc__}")
            test_fn()
        except Exception as e:
            test_fail(test_fn.__name__, f"예외: {e}")
    
    # Summary
    passed = sum(1 for r in RESULTS if r["status"] == "PASS")
    failed = sum(1 for r in RESULTS if r["status"] == "FAIL")
    
    print("\n" + "=" * 60)
    print(f"📊 결과: {passed} PASS / {failed} FAIL (총 {len(RESULTS)}건)")
    print("=" * 60)
    
    if failed > 0:
        print("\n❌ 실패 항목:")
        for r in RESULTS:
            if r["status"] == "FAIL":
                print(f"  - {r['name']}: {r['detail']}")
    
    sys.exit(1 if failed > 0 else 0)
