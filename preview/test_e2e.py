#!/usr/bin/env python3
"""
JRI 검사 시스템 - 사용자 관점 E2E 단위 테스트 (10개 케이스)

실제 사용자가 브라우저에서 하는 흐름을 API 레벨에서 시뮬레이션합니다.
"""
import requests
import json
import sys
import time
from urllib.parse import urlencode, quote

BASE = "http://localhost:8080"
API = f"{BASE}/jri-api/inspections"
MES = f"{BASE}/jri-api/mes/send-result"
HEALTH = f"{BASE}/jri-api/health"

passed = 0
failed = 0
results = []

def test(name, func):
    global passed, failed
    print(f"\n{'='*70}")
    print(f"  CASE {len(results)+1}: {name}")
    print(f"{'='*70}")
    try:
        func()
        passed += 1
        results.append(("PASS", name))
        print(f"  ✅ PASS")
    except AssertionError as e:
        failed += 1
        results.append(("FAIL", name, str(e)))
        print(f"  ❌ FAIL: {e}")
    except Exception as e:
        failed += 1
        results.append(("ERROR", name, str(e)))
        print(f"  💥 ERROR: {e}")


# ────────────────────────────────────────────────────────
# CASE 1: 사용자가 URL로 접속 → 화면이 뜨고 파라미터가 채워지는지
# ────────────────────────────────────────────────────────
def case1_url_access():
    """사용자가 MES에서 URL 클릭 → 화면 정상 로딩"""
    params = {
        'IND_BCD': '26228J0039',
        'LOT_NO': '6228J30035',
        'MATNR': 'H3SM1240',
        'MATNR_NM': 'PS필름1240',
        'USERID': 'inspector01',
        'USERNM': '김철수',
    }
    # 1) 단일 슬래시 URL
    r = requests.get(f"{BASE}/", params=params, timeout=10)
    assert r.status_code == 200, f"단일 슬래시 HTTP {r.status_code}"
    assert 'text/html' in r.headers.get('Content-Type', ''), "HTML이 아님"
    assert '지분 검사' in r.text or 'Jumbo Roll' in r.text, "검사 페이지 아님"
    print(f"    단일 슬래시: HTTP {r.status_code}, HTML 페이지 정상")

    # 2) 더블 슬래시 URL (MES 시스템 호환)
    url = f"{BASE}//?{urlencode(params)}"
    r2 = requests.get(url, timeout=10)
    assert r2.status_code == 200, f"더블 슬래시 HTTP {r2.status_code}"
    print(f"    더블 슬래시: HTTP {r2.status_code}, 정상 (크래시 없음)")

    # 3) 한글 파라미터 인코딩 확인
    assert 'indBcdInput' in r.text, "바코드 입력 필드 없음"
    assert 'operatorNmInput' in r.text, "검사자명 입력 필드 없음"
    print(f"    입력 필드 존재 확인: indBcdInput, operatorNmInput ✔")

test("URL 접속 (단일/더블 슬래시, 한글 파라미터)", case1_url_access)


# ────────────────────────────────────────────────────────
# CASE 2: 김철수가 처음으로 검사 결과 저장 (INSERT)
# ────────────────────────────────────────────────────────
def case2_first_insert():
    """김철수 - 바코드 26228J0039 첫 검사 → INSERT"""
    payload = {
        "indBcd": "26228J0039", "lotnr": "6228J30035", "matnr": "H3SM1240",
        "matnrNm": "PS필름1240",
        "operatorId": "inspector01", "operatorNm": "김철수",
        "inspectedAt": "2026-04-06T09:00:00.000Z",
        "thresholdMax": 115, "totalCount": 42, "coverageRatio": 0.0265,
        "densityCount": 15, "densityRatio": 0.012,
        "sizeUniformityScore": 0.85, "distributionUniformityScore": 0.72,
        "meanSize": 12.5, "stdSize": 3.2,
        "autoCount": 40, "manualCount": 2, "removedAutoCount": 0,
        "bucketUpTo3": 10, "bucketUpTo5": 15, "bucketUpTo7": 12, "bucketOver7": 5,
        "quadrantTopLeft": 12, "quadrantTopRight": 10,
        "quadrantBottomLeft": 11, "quadrantBottomRight": 9,
        "objectPixelCount": 5200, "totalPixels": 196000,
        "manualAddedCount": 2, "manualRemovedCount": 0,
    }
    r = requests.post(API, json=payload, timeout=10)
    d = r.json()
    assert r.status_code == 201, f"HTTP {r.status_code}"
    assert d['_action'] == 'INSERT', f"action={d['_action']}"
    assert d['isUpdate'] == False, "isUpdate가 True"
    assert d['indBcdSeq'] == '1', f"indBcdSeq={d['indBcdSeq']} (expected 1)"
    assert d['matnrNm'] == 'PS필름1240', f"matnrNm={d.get('matnrNm')}"
    assert d['operatorNm'] == '김철수', f"operatorNm={d.get('operatorNm')}"
    assert d['totalCount'] == 42, f"totalCount={d['totalCount']}"
    assert d['bucketUpTo3'] == 10, f"bucketUpTo3={d.get('bucketUpTo3')}"
    print(f"    INSERT 성공: seq={d['seq']}, indBcdSeq={d['indBcdSeq']}")
    print(f"    matnrNm={d['matnrNm']}, operatorNm={d['operatorNm']}")
    print(f"    totalCount={d['totalCount']}, coverage={d['coverageRatio']}")
    # 글로벌에 ID 저장
    global case2_id, case2_seq
    case2_id = d['id']
    case2_seq = d['seq']

test("김철수 첫 검사 INSERT (26228J0039)", case2_first_insert)


# ────────────────────────────────────────────────────────
# CASE 3: check-exists 확인 (저장 전 사전 체크)
# ────────────────────────────────────────────────────────
def case3_check_exists():
    """동일 자재+LOT+바코드로 check-exists → 존재 확인"""
    r = requests.get(f"{API}/check-exists", params={
        'matnr': 'H3SM1240', 'lotnr': '6228J30035', 'indBcd': '26228J0039'
    }, timeout=10)
    d = r.json()
    assert r.status_code == 200, f"HTTP {r.status_code}"
    assert d['exists'] == True, "exists가 False"
    assert 'record' in d, "record 필드 없음"
    assert d['record']['indBcdSeq'] == '1', f"indBcdSeq={d['record']['indBcdSeq']}"
    assert d['record']['id'] == case2_id, "id 불일치"
    print(f"    exists=True, indBcdSeq={d['record']['indBcdSeq']}, totalCount={d['record']['totalCount']}")

    # 존재하지 않는 조합
    r2 = requests.get(f"{API}/check-exists", params={
        'matnr': 'XXXXXX', 'lotnr': '000000', 'indBcd': '000000'
    }, timeout=10)
    d2 = r2.json()
    assert d2['exists'] == False, "존재하지 않는 조합인데 exists=True"
    print(f"    미존재 조합: exists=False ✔")

    # 파라미터 누락
    r3 = requests.get(f"{API}/check-exists", params={'matnr': 'H3SM1240'}, timeout=10)
    d3 = r3.json()
    assert d3['exists'] == False, "파라미터 누락인데 exists=True"
    print(f"    파라미터 누락: exists=False ✔")

test("check-exists 사전 체크 (존재/미존재/파라미터 누락)", case3_check_exists)


# ────────────────────────────────────────────────────────
# CASE 4: 이민수가 같은 바코드 재검사 → UPDATE + 차수 증가
# ────────────────────────────────────────────────────────
def case4_reinspect_update():
    """이민수 - 동일 바코드 재검사 → UPDATE, 차수 1→2"""
    payload = {
        "indBcd": "26228J0039", "lotnr": "6228J30035", "matnr": "H3SM1240",
        "matnrNm": "PS필름1240",
        "operatorId": "inspector03", "operatorNm": "이민수",
        "inspectedAt": "2026-04-06T10:30:00.000Z",
        "thresholdMax": 120, "totalCount": 55, "coverageRatio": 0.035,
        "densityCount": 20, "densityRatio": 0.018,
        "autoCount": 52, "manualCount": 3, "removedAutoCount": 1,
        "bucketUpTo3": 12, "bucketUpTo5": 18, "bucketUpTo7": 15, "bucketOver7": 10,
        "quadrantTopLeft": 15, "quadrantTopRight": 13,
        "quadrantBottomLeft": 14, "quadrantBottomRight": 13,
        "objectPixelCount": 7800, "totalPixels": 196000,
        "manualAddedCount": 3, "manualRemovedCount": 1,
    }
    r = requests.post(API, json=payload, timeout=10)
    d = r.json()
    assert r.status_code == 200, f"HTTP {r.status_code}"
    assert d['_action'] == 'UPDATE', f"action={d['_action']}"
    assert d['isUpdate'] == True, "isUpdate가 False"
    assert d['indBcdSeq'] == '2', f"차수={d['indBcdSeq']} (expected 2)"
    assert d['seq'] == case2_seq, f"seq 변경됨: {d['seq']} (expected {case2_seq})"
    assert d['totalCount'] == 55, f"totalCount 갱신 안됨: {d['totalCount']}"
    assert d['operatorNm'] == '이민수', f"operatorNm={d.get('operatorNm')}"
    assert d['thresholdMax'] == 120, f"thresholdMax 갱신 안됨"
    print(f"    UPDATE 성공: seq={d['seq']}(유지), 차수={d['indBcdSeq']}")
    print(f"    검사자 변경: 김철수→이민수, totalCount: 42→{d['totalCount']}")

test("이민수 재검사 UPDATE (동일 바코드, 차수 1→2)", case4_reinspect_update)


# ────────────────────────────────────────────────────────
# CASE 5: 김철수가 같은 LOT에서 다른 바코드 검사 → 새 INSERT
# ────────────────────────────────────────────────────────
def case5_same_lot_diff_barcode():
    """김철수 - 같은 LOT, 다른 바코드 → 새 INSERT"""
    payload = {
        "indBcd": "26228J0041", "lotnr": "6228J30035", "matnr": "H3SM1240",
        "matnrNm": "PS필름1240",
        "operatorId": "inspector01", "operatorNm": "김철수",
        "inspectedAt": "2026-04-06T11:00:00.000Z",
        "thresholdMax": 115, "totalCount": 38, "coverageRatio": 0.022,
        "autoCount": 36, "manualCount": 2,
        "bucketUpTo3": 8, "bucketUpTo5": 12, "bucketUpTo7": 10, "bucketOver7": 8,
        "quadrantTopLeft": 10, "quadrantTopRight": 9,
        "quadrantBottomLeft": 10, "quadrantBottomRight": 9,
        "objectPixelCount": 4500, "totalPixels": 196000,
    }
    r = requests.post(API, json=payload, timeout=10)
    d = r.json()
    assert r.status_code == 201, f"HTTP {r.status_code}"
    assert d['_action'] == 'INSERT', f"action={d['_action']}"
    assert d['indBcdSeq'] == '1', f"새 바코드인데 indBcdSeq={d['indBcdSeq']}"
    assert d['seq'] != case2_seq, f"seq가 이전과 동일: {d['seq']}"
    print(f"    INSERT 성공: seq={d['seq']}(새 번호), indBcdSeq={d['indBcdSeq']}")
    print(f"    바코드 26228J0041 (같은 LOT, 다른 바코드)")

test("같은 LOT 다른 바코드 INSERT (26228J0041)", case5_same_lot_diff_barcode)


# ────────────────────────────────────────────────────────
# CASE 6: 완전히 다른 자재+LOT+바코드+검사자
# ────────────────────────────────────────────────────────
def case6_different_material():
    """박영희 - 완전히 다른 자재/LOT/바코드 → INSERT"""
    payload = {
        "indBcd": "26315K0012", "lotnr": "6315K20087", "matnr": "H5PE0860",
        "matnrNm": "PE보호필름0860",
        "operatorId": "inspector02", "operatorNm": "박영희",
        "inspectedAt": "2026-04-06T13:00:00.000Z",
        "thresholdMax": 110, "totalCount": 67, "coverageRatio": 0.048,
        "densityCount": 30, "densityRatio": 0.025,
        "autoCount": 65, "manualCount": 2,
        "bucketUpTo3": 20, "bucketUpTo5": 22, "bucketUpTo7": 15, "bucketOver7": 10,
        "quadrantTopLeft": 18, "quadrantTopRight": 16,
        "quadrantBottomLeft": 17, "quadrantBottomRight": 16,
        "objectPixelCount": 9500, "totalPixels": 250000,
    }
    r = requests.post(API, json=payload, timeout=10)
    d = r.json()
    assert r.status_code == 201, f"HTTP {r.status_code}"
    assert d['_action'] == 'INSERT', f"action={d['_action']}"
    assert d['indBcdSeq'] == '1', f"indBcdSeq={d['indBcdSeq']}"
    assert d['matnrNm'] == 'PE보호필름0860', f"matnrNm={d.get('matnrNm')}"
    assert d['operatorNm'] == '박영희', f"operatorNm={d.get('operatorNm')}"
    print(f"    INSERT 성공: 자재={d['matnr']}, LOT={d['lotnr']}")
    print(f"    검사자: 박영희, totalCount={d['totalCount']}")
    global case6_id
    case6_id = d['id']

test("다른 자재 INSERT (박영희, H5PE0860)", case6_different_material)


# ────────────────────────────────────────────────────────
# CASE 7: 이력 테이블 조회 (페이징 + 필터)
# ────────────────────────────────────────────────────────
def case7_history_table():
    """이력 테이블: 전체 조회, 바코드 필터, 날짜 필터"""
    # 1) 전체 조회
    r = requests.get(API, params={'page': 0, 'size': 20}, timeout=10)
    d = r.json()
    assert r.status_code == 200, f"HTTP {r.status_code}"
    assert d['totalElements'] == 3, f"전체 건수={d['totalElements']} (expected 3)"
    assert len(d['content']) == 3, f"content 길이={len(d['content'])}"
    assert d['first'] == True, "first=False"
    assert d['last'] == True, "last=False"
    print(f"    전체 조회: {d['totalElements']}건, page={d['number']}")

    # 2) 바코드 필터 (26228J0039)
    r2 = requests.get(API, params={'page': 0, 'size': 20, 'indBcd': '26228J0039'}, timeout=10)
    d2 = r2.json()
    assert d2['totalElements'] == 1, f"바코드 필터 결과={d2['totalElements']} (expected 1)"
    assert d2['content'][0]['indBcd'] == '26228J0039', "바코드 불일치"
    print(f"    바코드 필터(26228J0039): {d2['totalElements']}건 ✔")

    # 3) 날짜 범위 필터
    r3 = requests.get(API, params={
        'page': 0, 'size': 20, 'dateFrom': '2026-04-06', 'dateTo': '2026-04-06'
    }, timeout=10)
    d3 = r3.json()
    assert d3['totalElements'] == 3, f"날짜 필터 결과={d3['totalElements']} (expected 3)"
    print(f"    날짜 필터(2026-04-06): {d3['totalElements']}건 ✔")

    # 4) 날짜 + 바코드 복합 필터
    r4 = requests.get(API, params={
        'page': 0, 'size': 20, 'indBcd': '26315K', 'dateFrom': '2026-04-06', 'dateTo': '2026-04-06'
    }, timeout=10)
    d4 = r4.json()
    assert d4['totalElements'] == 1, f"복합 필터 결과={d4['totalElements']} (expected 1)"
    print(f"    복합 필터(26315K + 날짜): {d4['totalElements']}건 ✔")

    # 5) 결과 없는 날짜
    r5 = requests.get(API, params={
        'page': 0, 'size': 20, 'dateFrom': '2025-01-01', 'dateTo': '2025-01-01'
    }, timeout=10)
    d5 = r5.json()
    assert d5['totalElements'] == 0, f"빈 날짜 결과={d5['totalElements']}"
    print(f"    결과 없는 날짜(2025-01-01): {d5['totalElements']}건 ✔")

test("이력 테이블 조회 (전체/바코드/날짜/복합/빈 결과)", case7_history_table)


# ────────────────────────────────────────────────────────
# CASE 8: 검색 API 테스트 (바코드/LOT/자재코드)
# ────────────────────────────────────────────────────────
def case8_search():
    """검색: 바코드, LOT, 자재코드별 검색"""
    # 바코드 검색
    r1 = requests.get(f"{API}/search", params={'type': 'indBcd', 'keyword': '26228J'}, timeout=10)
    d1 = r1.json()
    assert d1['totalElements'] == 2, f"바코드 검색={d1['totalElements']} (expected 2: 0039+0041)"
    print(f"    바코드 검색(26228J): {d1['totalElements']}건 ✔")

    # LOT 검색
    r2 = requests.get(f"{API}/search", params={'type': 'lotnr', 'keyword': '6315K'}, timeout=10)
    d2 = r2.json()
    assert d2['totalElements'] == 1, f"LOT 검색={d2['totalElements']} (expected 1)"
    print(f"    LOT 검색(6315K): {d2['totalElements']}건 ✔")

    # 자재코드 검색
    r3 = requests.get(f"{API}/search", params={'type': 'matnr', 'keyword': 'H3SM'}, timeout=10)
    d3 = r3.json()
    assert d3['totalElements'] == 2, f"자재 검색={d3['totalElements']} (expected 2)"
    print(f"    자재코드 검색(H3SM): {d3['totalElements']}건 ✔")

    # 전체 자재 검색
    r4 = requests.get(f"{API}/search", params={'type': 'matnr', 'keyword': 'H'}, timeout=10)
    d4 = r4.json()
    assert d4['totalElements'] == 3, f"전체 자재 검색={d4['totalElements']} (expected 3)"
    print(f"    전체 자재 검색(H): {d4['totalElements']}건 ✔")

    # 없는 키워드
    r5 = requests.get(f"{API}/search", params={'type': 'indBcd', 'keyword': 'ZZZZZ'}, timeout=10)
    d5 = r5.json()
    assert d5['totalElements'] == 0, f"없는 키워드={d5['totalElements']}"
    print(f"    없는 키워드(ZZZZZ): {d5['totalElements']}건 ✔")

test("검색 API (바코드/LOT/자재코드/없는 키워드)", case8_search)


# ────────────────────────────────────────────────────────
# CASE 9: MES 결과 전송 + 단건 조회 + 개별 삭제
# ────────────────────────────────────────────────────────
def case9_mes_and_detail():
    """MES 전송, 단건 조회, 개별 삭제"""
    # 1) MES 결과 전송
    r1 = requests.post(MES, json={"IND_BCD": "26228J0039", "ResultData": 26.5}, timeout=10)
    d1 = r1.json()
    assert r1.status_code == 200, f"MES HTTP {r1.status_code}"
    assert d1['success'] == True, f"MES success={d1['success']}"
    assert 'transmissionId' in d1, "transmissionId 없음"
    assert '26228J0039' in d1['message'], "메시지에 바코드 없음"
    print(f"    MES 전송 성공: {d1['message']}")

    # 2) MES 파라미터 누락
    r1b = requests.post(MES, json={"IND_BCD": "26228J0039"}, timeout=10)
    assert r1b.status_code == 400, f"ResultData 누락인데 HTTP {r1b.status_code}"
    print(f"    MES 파라미터 누락: HTTP {r1b.status_code} ✔")

    # 3) 단건 조회
    r2 = requests.get(f"{API}/{case6_id}", timeout=10)
    d2 = r2.json()
    assert r2.status_code == 200, f"단건 조회 HTTP {r2.status_code}"
    assert d2['id'] == case6_id, "id 불일치"
    assert d2['matnr'] == 'H5PE0860', f"자재 불일치: {d2['matnr']}"
    assert d2['matnrNm'] == 'PE보호필름0860', f"자재명 불일치: {d2.get('matnrNm')}"
    print(f"    단건 조회: id={case6_id[:8]}..., 자재={d2['matnr']}")

    # 4) 없는 ID 조회
    r3 = requests.get(f"{API}/non-existent-id-12345", timeout=10)
    assert r3.status_code == 404, f"없는 ID인데 HTTP {r3.status_code}"
    print(f"    없는 ID 조회: HTTP {r3.status_code} ✔")

    # 5) 개별 삭제
    r4 = requests.delete(f"{API}/{case6_id}", timeout=10)
    d4 = r4.json()
    assert r4.status_code == 200, f"삭제 HTTP {r4.status_code}"
    assert '삭제' in d4['message'], "삭제 메시지 없음"
    print(f"    개별 삭제: {d4['message']}")

    # 6) 삭제 후 조회 → 404
    r5 = requests.get(f"{API}/{case6_id}", timeout=10)
    assert r5.status_code == 404, f"삭제 후인데 HTTP {r5.status_code}"
    print(f"    삭제 후 조회: HTTP {r5.status_code} (Not Found) ✔")

    # 7) 전체 건수 확인 (3→2)
    r6 = requests.get(API, params={'page': 0, 'size': 20}, timeout=10)
    d6 = r6.json()
    assert d6['totalElements'] == 2, f"삭제 후 건수={d6['totalElements']} (expected 2)"
    print(f"    삭제 후 전체 건수: {d6['totalElements']}건 ✔")

test("MES 전송 + 단건 조회 + 개별 삭제", case9_mes_and_detail)


# ────────────────────────────────────────────────────────
# CASE 10: 3차 재검사 + Health 체크 + 전체 삭제 + 빈 목록
# ────────────────────────────────────────────────────────
def case10_triple_reinspect_and_cleanup():
    """3차 재검사(차수 2→3), Health, 전체 삭제, 빈 목록"""
    # 1) 3차 재검사 (차수 2→3)
    payload = {
        "indBcd": "26228J0039", "lotnr": "6228J30035", "matnr": "H3SM1240",
        "matnrNm": "PS필름1240",
        "operatorId": "inspector01", "operatorNm": "김철수",
        "inspectedAt": "2026-04-06T15:00:00.000Z",
        "thresholdMax": 125, "totalCount": 60, "coverageRatio": 0.042,
        "autoCount": 58, "manualCount": 2,
    }
    r1 = requests.post(API, json=payload, timeout=10)
    d1 = r1.json()
    assert r1.status_code == 200, f"HTTP {r1.status_code}"
    assert d1['_action'] == 'UPDATE', f"action={d1['_action']}"
    assert d1['indBcdSeq'] == '3', f"차수={d1['indBcdSeq']} (expected 3)"
    assert d1['operatorNm'] == '김철수', f"operatorNm={d1.get('operatorNm')}"
    print(f"    3차 재검사: 차수={d1['indBcdSeq']}, 검사자 복귀: 이민수→김철수")

    # 2) check-exists로 차수 확인
    r2 = requests.get(f"{API}/check-exists", params={
        'matnr': 'H3SM1240', 'lotnr': '6228J30035', 'indBcd': '26228J0039'
    }, timeout=10)
    d2 = r2.json()
    assert d2['record']['indBcdSeq'] == '3', f"check-exists 차수={d2['record']['indBcdSeq']}"
    print(f"    check-exists 차수 확인: {d2['record']['indBcdSeq']}차 ✔")

    # 3) Health 체크
    r3 = requests.get(HEALTH, timeout=10)
    d3 = r3.json()
    assert d3['status'] == 'ok', f"health status={d3['status']}"
    assert 'module-jri' in d3['module'], f"module={d3['module']}"
    print(f"    Health: status={d3['status']}, module={d3['module']}")

    # 4) 전체 삭제
    r4 = requests.delete(API, timeout=10)
    d4 = r4.json()
    assert '전체' in d4['message'] and '삭제' in d4['message'], f"메시지: {d4['message']}"
    print(f"    전체 삭제: {d4['message']}")

    # 5) 빈 목록 확인
    r5 = requests.get(API, params={'page': 0, 'size': 20}, timeout=10)
    d5 = r5.json()
    assert d5['totalElements'] == 0, f"전체 삭제 후 건수={d5['totalElements']}"
    assert len(d5['content']) == 0, "content가 비어있지 않음"
    print(f"    빈 목록 확인: {d5['totalElements']}건 ✔")

    # 6) 빈 상태에서 check-exists
    r6 = requests.get(f"{API}/check-exists", params={
        'matnr': 'H3SM1240', 'lotnr': '6228J30035', 'indBcd': '26228J0039'
    }, timeout=10)
    d6 = r6.json()
    assert d6['exists'] == False, "전체 삭제 후인데 exists=True"
    print(f"    전체 삭제 후 check-exists: exists=False ✔")

test("3차 재검사(차수 3) + Health + 전체 삭제 + 빈 목록", case10_triple_reinspect_and_cleanup)


# ────────────────────────────────────────────────────────
# 결과 요약
# ────────────────────────────────────────────────────────
print(f"\n\n{'='*70}")
print(f"  🏁 테스트 결과 요약")
print(f"{'='*70}")
print(f"  전체: {passed + failed}건  |  ✅ PASS: {passed}건  |  ❌ FAIL: {failed}건")
print(f"{'='*70}")
for i, r in enumerate(results):
    status = "✅" if r[0] == "PASS" else "❌"
    reason = f" → {r[2]}" if len(r) > 2 else ""
    print(f"  {i+1:2d}. {status} {r[1]}{reason}")
print(f"{'='*70}")

if failed > 0:
    print(f"\n  ⚠️  {failed}건의 테스트가 실패했습니다.")
    sys.exit(1)
else:
    print(f"\n  🎉 전체 {passed}건 테스트 통과!")
    sys.exit(0)
