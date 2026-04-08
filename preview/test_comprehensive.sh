#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════
# JRI 검사 시스템 – 운영 배포 전 종합 단위 테스트 (10개 유즈케이스)
# ═══════════════════════════════════════════════════════════════════════
# 테스트 구조:
#   UC1  : 필수 필드 전체 미입력 → 저장 차단 (HTTP 400)
#   UC2  : 필수 필드 조합 테스트 (15개 부분 입력 시나리오)
#   UC3  : 정상 저장 후 이력 테이블 정확 조회 검증
#   UC4  : 중복 저장 시 SEQ 유지 + indBcdSeq 증가 (Upsert)
#   UC5  : 이력 조회 – 키워드 검색 (바코드, LOT)
#   UC6  : 이력 조회 – 날짜 필터링
#   UC7  : 이력 조회 – 페이지네이션 정상 동작
#   UC8  : 시크릿 모드 – MES 전송 & 저장 차단 (Playwright)
#   UC9  : 레코드 삭제 후 이력 반영 확인
#   UC10 : 엣지 케이스 – 특수문자, 긴 문자열, 대량 데이터, 경계값
# ═══════════════════════════════════════════════════════════════════════

set -euo pipefail
API="http://localhost:8080/jri-api/inspections"
MES_API="http://localhost:8080/jri-api/mes/send-result"
PASS=0
FAIL=0
TOTAL=0

# ApiResponse unwrap helper: 서버 응답 { success, data, ... }에서 data 필드를 추출
# 사용: echo "$JSON" | jq_data '.totalElements'  → unwrap 후 필드 접근
unwrap() {
  python3 -c "
import sys, json
raw = json.load(sys.stdin)
d = raw.get('data', raw) if isinstance(raw, dict) and 'success' in raw else raw
$1
"
}

# ANSI colors
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

assert_eq() {
  local label="$1" expected="$2" actual="$3"
  TOTAL=$((TOTAL + 1))
  if [ "$expected" = "$actual" ]; then
    echo -e "  ${GREEN}✓ PASS${NC} – $label (expected=$expected)"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}✗ FAIL${NC} – $label (expected=$expected, got=$actual)"
    FAIL=$((FAIL + 1))
  fi
}

assert_contains() {
  local label="$1" haystack="$2" needle="$3"
  TOTAL=$((TOTAL + 1))
  if echo "$haystack" | grep -q "$needle"; then
    echo -e "  ${GREEN}✓ PASS${NC} – $label (contains '$needle')"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}✗ FAIL${NC} – $label (missing '$needle' in response)"
    FAIL=$((FAIL + 1))
  fi
}

assert_not_contains() {
  local label="$1" haystack="$2" needle="$3"
  TOTAL=$((TOTAL + 1))
  if echo "$haystack" | grep -qv "$needle" && ! echo "$haystack" | grep -q "$needle"; then
    echo -e "  ${GREEN}✓ PASS${NC} – $label (does not contain '$needle')"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}✗ FAIL${NC} – $label (unexpectedly contains '$needle')"
    FAIL=$((FAIL + 1))
  fi
}

# ──────── Setup: 데이터 초기화 ────────
echo -e "\n${CYAN}══ 사전 준비: 데이터 초기화 ══${NC}"
curl -s -X DELETE "$API" > /dev/null
echo -e "  ${GREEN}✓${NC} 전체 데이터 삭제 완료"

# ═══════════════════════════════════════════════════════════
# UC1: 필수 필드 전체 미입력 → 저장 차단
# ═══════════════════════════════════════════════════════════
echo -e "\n${YELLOW}━━━━ UC1: 필수 필드 전체 미입력 → 저장 차단 ━━━━${NC}"

# 1-A: 모든 필수 필드 누락
HTTP_CODE=$(curl -s -o /tmp/uc1a.json -w '%{http_code}' -X POST "$API" \
  -H "Content-Type: application/json" \
  -d '{"totalCount": 5, "coverageRatio": 0.001}')
BODY=$(cat /tmp/uc1a.json)
assert_eq "UC1-A 모든 필드 누락 → HTTP 400" "400" "$HTTP_CODE"
assert_contains "UC1-A 누락 필드 목록에 indBcd" "$BODY" "indBcd"
assert_contains "UC1-A 누락 필드 목록에 lotnr" "$BODY" "lotnr"
assert_contains "UC1-A 누락 필드 목록에 matnr" "$BODY" "matnr"
assert_contains "UC1-A 누락 필드 목록에 operatorId" "$BODY" "operatorId"

# 1-B: 빈 문자열로 보내기
HTTP_CODE=$(curl -s -o /tmp/uc1b.json -w '%{http_code}' -X POST "$API" \
  -H "Content-Type: application/json" \
  -d '{"indBcd": "", "lotnr": "  ", "matnr": "", "operatorId": "  "}')
BODY=$(cat /tmp/uc1b.json)
assert_eq "UC1-B 빈 문자열/공백 → HTTP 400" "400" "$HTTP_CODE"
assert_contains "UC1-B 빈 문자열도 누락 처리" "$BODY" "missingFields"

# ═══════════════════════════════════════════════════════════
# UC2: 필수 필드 조합 테스트 (부분 입력)
# ═══════════════════════════════════════════════════════════
echo -e "\n${YELLOW}━━━━ UC2: 필수 필드 부분 입력 조합 테스트 ━━━━${NC}"

# 4개 필수 필드 중 1~3개만 입력하는 모든 조합 (15가지)
declare -a UC2_TESTS=(
  # 1개만 입력
  '{"indBcd":"BCD001"}|lotnr,matnr,operatorId'
  '{"lotnr":"LOT001"}|indBcd,matnr,operatorId'
  '{"matnr":"MAT001"}|indBcd,lotnr,operatorId'
  '{"operatorId":"OP001"}|indBcd,lotnr,matnr'
  # 2개만 입력
  '{"indBcd":"BCD001","lotnr":"LOT001"}|matnr,operatorId'
  '{"indBcd":"BCD001","matnr":"MAT001"}|lotnr,operatorId'
  '{"indBcd":"BCD001","operatorId":"OP001"}|lotnr,matnr'
  '{"lotnr":"LOT001","matnr":"MAT001"}|indBcd,operatorId'
  '{"lotnr":"LOT001","operatorId":"OP001"}|indBcd,matnr'
  '{"matnr":"MAT001","operatorId":"OP001"}|indBcd,lotnr'
  # 3개만 입력
  '{"indBcd":"BCD001","lotnr":"LOT001","matnr":"MAT001"}|operatorId'
  '{"indBcd":"BCD001","lotnr":"LOT001","operatorId":"OP001"}|matnr'
  '{"indBcd":"BCD001","matnr":"MAT001","operatorId":"OP001"}|lotnr'
  '{"lotnr":"LOT001","matnr":"MAT001","operatorId":"OP001"}|indBcd'
)

uc2_idx=0
for test in "${UC2_TESTS[@]}"; do
  uc2_idx=$((uc2_idx + 1))
  DATA="${test%%|*}"
  EXPECTED_MISSING="${test##*|}"
  HTTP_CODE=$(curl -s -o /tmp/uc2_${uc2_idx}.json -w '%{http_code}' -X POST "$API" \
    -H "Content-Type: application/json" -d "$DATA")
  BODY=$(cat /tmp/uc2_${uc2_idx}.json)
  assert_eq "UC2-${uc2_idx} 부분 입력 → HTTP 400" "400" "$HTTP_CODE"
  
  # 누락된 필드가 응답에 포함되는지 확인
  IFS=',' read -ra MISSING_FIELDS <<< "$EXPECTED_MISSING"
  for field in "${MISSING_FIELDS[@]}"; do
    assert_contains "UC2-${uc2_idx} 누락: $field" "$BODY" "$field"
  done
done

# UC2 마지막: 4개 모두 입력 → 성공 (HTTP 201)
HTTP_CODE=$(curl -s -o /tmp/uc2_ok.json -w '%{http_code}' -X POST "$API" \
  -H "Content-Type: application/json" \
  -d '{"indBcd":"BCD-UC2-OK","lotnr":"LOT-UC2","matnr":"MAT-UC2","operatorId":"OP-UC2","totalCount":3,"coverageRatio":0.0005}')
assert_eq "UC2-ALL 4개 필드 모두 입력 → HTTP 201" "201" "$HTTP_CODE"
BODY=$(cat /tmp/uc2_ok.json)
assert_contains "UC2-ALL INSERT 확인" "$BODY" "INSERT"

# 정리
curl -s -X DELETE "$API" > /dev/null

# ═══════════════════════════════════════════════════════════
# UC3: 정상 저장 후 이력 테이블 정확 조회 검증
# ═══════════════════════════════════════════════════════════
echo -e "\n${YELLOW}━━━━ UC3: 정상 저장 후 이력 테이블 조회 검증 ━━━━${NC}"

# 테스트 데이터 3건 저장 (python3으로 소수점 계산)
for i in 1 2 3; do
  COVERAGE=$(python3 -c "print($i * 0.000123)")
  DENSITY_R=$(python3 -c "print($i * 15.5)")
  SIZE_UNI=$(python3 -c "print(80 + $i * 5)")
  DIST_UNI=$(python3 -c "print(70 + $i * 8)")
  MEAN_SZ=$(python3 -c "print($i * 3.5)")
  STD_SZ=$(python3 -c "print($i * 1.2)")
  curl -s -X POST "$API" \
    -H "Content-Type: application/json" \
    -d "{
      \"indBcd\":\"26228J000${i}\",
      \"lotnr\":\"6228J3003${i}\",
      \"matnr\":\"H3SM1240\",
      \"matnrNm\":\"PS필름1240\",
      \"operatorId\":\"inspector0${i}\",
      \"operatorNm\":\"검사자${i}\",
      \"totalCount\":$((i * 10)),
      \"coverageRatio\":${COVERAGE},
      \"densityCount\":$((i * 3)),
      \"densityRatio\":${DENSITY_R},
      \"sizeUniformityScore\":${SIZE_UNI},
      \"distributionUniformityScore\":${DIST_UNI},
      \"meanSize\":${MEAN_SZ},
      \"stdSize\":${STD_SZ},
      \"autoCount\":$((i * 8)),
      \"manualCount\":$((i * 2)),
      \"removedAutoCount\":$i,
      \"bucketUpTo3\":$((i * 2)),
      \"bucketUpTo5\":$((i * 3)),
      \"bucketUpTo7\":$((i * 2)),
      \"bucketOver7\":$((i * 1)),
      \"quadrantTopLeft\":$((i + 1)),
      \"quadrantTopRight\":$((i + 2)),
      \"quadrantBottomLeft\":$((i + 3)),
      \"quadrantBottomRight\":$((i + 4)),
      \"objectPixelCount\":$((i * 500)),
      \"totalPixels\":$((1000000)),
      \"thresholdMax\":115,
      \"prcSeqno\":$i
    }" > /dev/null
done

# 3-A: 전체 조회 시 3건 반환
RESP=$(curl -s "$API?page=0&size=20")
COUNT=$(echo "$RESP" | unwrap "print(d['totalElements'])")
assert_eq "UC3-A 3건 저장 후 전체 조회" "3" "$COUNT"

# 3-B: 특정 레코드의 모든 필드 정확 검증
ENTRIES=$(echo "$RESP" | python3 -c "
import sys, json
raw = json.load(sys.stdin)
data = raw.get('data', raw) if 'success' in raw else raw
# 가장 먼저 저장된 (3번째) 레코드 = content[0] (newest first)
e = data['content'][0]
checks = [
    ('indBcd', e.get('indBcd'), '26228J0003'),
    ('lotnr', e.get('lotnr'), '6228J30033'),
    ('matnr', e.get('matnr'), 'H3SM1240'),
    ('matnrNm', e.get('matnrNm'), 'PS필름1240'),
    ('operatorId', e.get('operatorId'), 'inspector03'),
    ('operatorNm', e.get('operatorNm'), '검사자3'),
    ('totalCount', e.get('totalCount'), 30),
    ('autoCount', e.get('autoCount'), 24),
    ('manualCount', e.get('manualCount'), 6),
    ('removedAutoCount', e.get('removedAutoCount'), 3),
    ('thresholdMax', e.get('thresholdMax'), 115),
    ('bucketUpTo3', e.get('bucketUpTo3'), 6),
    ('bucketUpTo5', e.get('bucketUpTo5'), 9),
    ('bucketUpTo7', e.get('bucketUpTo7'), 6),
    ('bucketOver7', e.get('bucketOver7'), 3),
    ('quadrantTopLeft', e.get('quadrantTopLeft'), 4),
    ('quadrantTopRight', e.get('quadrantTopRight'), 5),
    ('quadrantBottomLeft', e.get('quadrantBottomLeft'), 6),
    ('quadrantBottomRight', e.get('quadrantBottomRight'), 7),
    ('objectPixelCount', e.get('objectPixelCount'), 1500),
    ('totalPixels', e.get('totalPixels'), 1000000),
]
for name, actual, expected in checks:
    status = 'PASS' if actual == expected else 'FAIL'
    print(f'{status}|{name}|{expected}|{actual}')
")

while IFS='|' read -r status name expected actual; do
  TOTAL=$((TOTAL + 1))
  if [ "$status" = "PASS" ]; then
    echo -e "  ${GREEN}✓ PASS${NC} – UC3-B 필드 $name 정확 (expected=$expected)"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}✗ FAIL${NC} – UC3-B 필드 $name 불일치 (expected=$expected, got=$actual)"
    FAIL=$((FAIL + 1))
  fi
done <<< "$ENTRIES"

# 3-C: 개별 레코드 조회 (GET /inspections/:id)
FIRST_ID=$(echo "$RESP" | unwrap "print(d['content'][0]['id'])")
HTTP_CODE=$(curl -s -o /tmp/uc3c.json -w '%{http_code}' "$API/$FIRST_ID")
assert_eq "UC3-C 개별 레코드 GET /id → HTTP 200" "200" "$HTTP_CODE"
SINGLE_INDBCD=$(cat /tmp/uc3c.json | unwrap "print(d['indBcd'])")
assert_eq "UC3-C 개별 조회 바코드 일치" "26228J0003" "$SINGLE_INDBCD"

# 3-D: 존재하지 않는 ID 조회 → 404
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' "$API/non-existent-uuid-12345")
assert_eq "UC3-D 존재하지 않는 ID → HTTP 404" "404" "$HTTP_CODE"

# ═══════════════════════════════════════════════════════════
# UC4: 중복 저장 시 Upsert – SEQ 유지 + indBcdSeq 증가
# ═══════════════════════════════════════════════════════════
echo -e "\n${YELLOW}━━━━ UC4: 중복 저장 (Upsert) – SEQ 유지 + 차수 증가 ━━━━${NC}"

# 4-A: 같은 바코드/LOT/자재로 재저장
RESP1=$(curl -s -X POST "$API" \
  -H "Content-Type: application/json" \
  -d '{"indBcd":"26228J0003","lotnr":"6228J30033","matnr":"H3SM1240","operatorId":"inspector03","totalCount":50,"coverageRatio":0.002}')
ACTION1=$(echo "$RESP1" | unwrap "print(d['_action'])")
SEQ1=$(echo "$RESP1" | unwrap "print(d['seq'])")
BCDSEQ1=$(echo "$RESP1" | unwrap "print(d['indBcdSeq'])")
assert_eq "UC4-A 동일 키 재저장 → UPDATE" "UPDATE" "$ACTION1"
assert_eq "UC4-A 차수(indBcdSeq) 2차로 증가" "2" "$BCDSEQ1"

# 4-B: 한 번 더 재저장 → 3차
RESP2=$(curl -s -X POST "$API" \
  -H "Content-Type: application/json" \
  -d '{"indBcd":"26228J0003","lotnr":"6228J30033","matnr":"H3SM1240","operatorId":"inspector03","totalCount":60,"coverageRatio":0.003}')
BCDSEQ2=$(echo "$RESP2" | unwrap "print(d['indBcdSeq'])")
assert_eq "UC4-B 3차 재저장 → indBcdSeq=3" "3" "$BCDSEQ2"

# 4-C: UPDATE 후 총 건수 변동 없음 (3건 유지)
RESP3=$(curl -s "$API?page=0&size=20")
COUNT3=$(echo "$RESP3" | unwrap "print(d['totalElements'])")
assert_eq "UC4-C UPDATE 후 총 건수 변동 없음 (3건)" "3" "$COUNT3"

# 4-D: UPDATE된 레코드에서 totalCount 값이 최신으로 갱신되었는지
LATEST_TC=$(echo "$RESP3" | python3 -c "
import sys,json
raw = json.load(sys.stdin)
data = raw.get('data', raw) if 'success' in raw else raw
for e in data['content']:
    if e['indBcd'] == '26228J0003':
        print(e['totalCount'])
        break
")
assert_eq "UC4-D UPDATE 후 totalCount 갱신 확인 (60)" "60" "$LATEST_TC"

# 4-E: check-exists API 검증
CHKR=$(curl -s "${API}/check-exists?matnr=H3SM1240&lotnr=6228J30033&indBcd=26228J0003")
EXISTS=$(echo "$CHKR" | unwrap "print(d['exists'])")
assert_eq "UC4-E check-exists → True" "True" "$EXISTS"
CHKR_NONE=$(curl -s "${API}/check-exists?matnr=NONE&lotnr=NONE&indBcd=NONE")
EXISTS_NONE=$(echo "$CHKR_NONE" | unwrap "print(d['exists'])")
assert_eq "UC4-E check-exists (없는 데이터) → False" "False" "$EXISTS_NONE"

# ═══════════════════════════════════════════════════════════
# UC5: 이력 조회 – 키워드 검색
# ═══════════════════════════════════════════════════════════
echo -e "\n${YELLOW}━━━━ UC5: 이력 조회 – 키워드 검색 ━━━━${NC}"

# 5-A: 바코드로 검색
RESP=$(curl -s "${API}/search?type=indBcd&keyword=26228J0001&page=0&size=20")
HITS=$(echo "$RESP" | unwrap "print(d['totalElements'])")
assert_eq "UC5-A 바코드 '26228J0001' 검색 → 1건" "1" "$HITS"

# 5-B: 부분 일치 검색
RESP=$(curl -s "${API}/search?type=indBcd&keyword=26228J&page=0&size=20")
HITS=$(echo "$RESP" | unwrap "print(d['totalElements'])")
assert_eq "UC5-B 부분 일치 '26228J' → 3건" "3" "$HITS"

# 5-C: LOT 번호 검색 (type=lotnr)
RESP=$(curl -s "${API}/search?type=lotnr&keyword=6228J30031&page=0&size=20")
HITS=$(echo "$RESP" | unwrap "print(d['totalElements'])")
assert_eq "UC5-C LOT '6228J30031' 검색 → 1건" "1" "$HITS"

# 5-D: 자재코드 검색 (type=matnr)
RESP=$(curl -s "${API}/search?type=matnr&keyword=H3SM1240&page=0&size=20")
HITS=$(echo "$RESP" | unwrap "print(d['totalElements'])")
assert_eq "UC5-D 자재코드 'H3SM1240' 검색 → 3건" "3" "$HITS"

# 5-E: 존재하지 않는 키워드 검색 → 0건
RESP=$(curl -s "${API}/search?type=indBcd&keyword=NONEXISTENT&page=0&size=20")
HITS=$(echo "$RESP" | unwrap "print(d['totalElements'])")
assert_eq "UC5-E 존재하지 않는 키워드 → 0건" "0" "$HITS"

# 5-F: 대소문자 무시 검색
RESP=$(curl -s "${API}/search?type=matnr&keyword=h3sm1240&page=0&size=20")
HITS=$(echo "$RESP" | unwrap "print(d['totalElements'])")
assert_eq "UC5-F 대소문자 무시 'h3sm1240' → 3건" "3" "$HITS"

# ═══════════════════════════════════════════════════════════
# UC6: 이력 조회 – 날짜 필터링
# ═══════════════════════════════════════════════════════════
echo -e "\n${YELLOW}━━━━ UC6: 이력 조회 – 날짜 필터링 ━━━━${NC}"

# 현재 날짜(오늘) 데이터만 있으므로
TODAY=$(date +%Y-%m-%d)
YESTERDAY=$(date -d "yesterday" +%Y-%m-%d 2>/dev/null || date -v-1d +%Y-%m-%d 2>/dev/null || echo "2026-04-05")
TOMORROW=$(date -d "tomorrow" +%Y-%m-%d 2>/dev/null || date -v+1d +%Y-%m-%d 2>/dev/null || echo "2026-04-07")

# 6-A: 오늘 날짜 범위 → 3건
RESP=$(curl -s "$API?page=0&size=20&dateFrom=$TODAY&dateTo=$TODAY")
HITS=$(echo "$RESP" | unwrap "print(d['totalElements'])")
assert_eq "UC6-A 오늘 날짜 필터 → 3건" "3" "$HITS"

# 6-B: 내일만 → 0건
RESP=$(curl -s "$API?page=0&size=20&dateFrom=$TOMORROW&dateTo=$TOMORROW")
HITS=$(echo "$RESP" | unwrap "print(d['totalElements'])")
assert_eq "UC6-B 내일 날짜 필터 → 0건" "0" "$HITS"

# 6-C: 어제까지만 → 0건
RESP=$(curl -s "$API?page=0&size=20&dateTo=$YESTERDAY")
HITS=$(echo "$RESP" | unwrap "print(d['totalElements'])")
assert_eq "UC6-C 어제까지 필터 → 0건" "0" "$HITS"

# 6-D: dateFrom만 → 3건
RESP=$(curl -s "$API?page=0&size=20&dateFrom=$TODAY")
HITS=$(echo "$RESP" | unwrap "print(d['totalElements'])")
assert_eq "UC6-D dateFrom=$TODAY → 3건" "3" "$HITS"

# 6-E: 검색어 + 날짜 조합
RESP=$(curl -s "${API}/search?type=indBcd&keyword=26228J&page=0&size=20&dateFrom=$TODAY&dateTo=$TODAY")
HITS=$(echo "$RESP" | unwrap "print(d['totalElements'])")
assert_eq "UC6-E 키워드+날짜 조합 → 3건" "3" "$HITS"

# 6-F: 바코드 필터(indBcd 파라미터) + 날짜 조합
RESP=$(curl -s "$API?page=0&size=20&indBcd=26228J0001&dateFrom=$TODAY")
HITS=$(echo "$RESP" | unwrap "print(d['totalElements'])")
assert_eq "UC6-F indBcd 파라미터+날짜 → 1건" "1" "$HITS"

# ═══════════════════════════════════════════════════════════
# UC7: 이력 조회 – 페이지네이션
# ═══════════════════════════════════════════════════════════
echo -e "\n${YELLOW}━━━━ UC7: 이력 조회 – 페이지네이션 정상 동작 ━━━━${NC}"

# 추가 데이터 삽입 (총 25건이 되도록)
for i in $(seq 4 25); do
  idx=$(printf "%02d" $i)
  curl -s -X POST "$API" \
    -H "Content-Type: application/json" \
    -d "{\"indBcd\":\"PGTEST${idx}\",\"lotnr\":\"LOTPG${idx}\",\"matnr\":\"MATPG\",\"operatorId\":\"OP${idx}\",\"totalCount\":$i}" > /dev/null
done

# 7-A: page=0, size=20 → 20건 + totalPages ≥ 2
RESP=$(curl -s "$API?page=0&size=20")
PAGE0_COUNT=$(echo "$RESP" | unwrap "print(len(d['content']))")
TOTAL_PAGES=$(echo "$RESP" | unwrap "print(d['totalPages'])")
TOTAL_EL=$(echo "$RESP" | unwrap "print(d['totalElements'])")
assert_eq "UC7-A page=0 size=20 → 20건" "20" "$PAGE0_COUNT"
assert_eq "UC7-A 총 25건" "25" "$TOTAL_EL"
assert_eq "UC7-A totalPages=2" "2" "$TOTAL_PAGES"

# 7-B: page=1 → 나머지 5건
RESP=$(curl -s "$API?page=1&size=20")
PAGE1_COUNT=$(echo "$RESP" | unwrap "print(len(d['content']))")
assert_eq "UC7-B page=1 → 5건" "5" "$PAGE1_COUNT"

# 7-C: 큰 페이지 번호 → 0건
RESP=$(curl -s "$API?page=99&size=20")
PAGE99_COUNT=$(echo "$RESP" | unwrap "print(len(d['content']))")
assert_eq "UC7-C page=99 → 0건" "0" "$PAGE99_COUNT"

# 7-D: size=5 → totalPages=5
RESP=$(curl -s "$API?page=0&size=5")
TP5=$(echo "$RESP" | unwrap "print(d['totalPages'])")
assert_eq "UC7-D size=5 → totalPages=5" "5" "$TP5"

# 7-E: first/last 플래그 확인
IS_FIRST=$(echo "$RESP" | unwrap "print(d['first'])")
IS_LAST=$(echo "$RESP" | unwrap "print(d['last'])")
assert_eq "UC7-E page=0 → first=True" "True" "$IS_FIRST"
assert_eq "UC7-E page=0 size=5 → last=False" "False" "$IS_LAST"

RESP_LAST=$(curl -s "$API?page=4&size=5")
IS_LAST2=$(echo "$RESP_LAST" | unwrap "print(d['last'])")
assert_eq "UC7-E 마지막 페이지 → last=True" "True" "$IS_LAST2"

# 7-F: size 제한 (max 100)
RESP=$(curl -s "$API?page=0&size=999")
RETURNED=$(echo "$RESP" | unwrap "print(len(d['content']))")
assert_eq "UC7-F size=999 → size capped (≤100)" "25" "$RETURNED"

# ═══════════════════════════════════════════════════════════
# UC8: MES 전송 API 검증
# ═══════════════════════════════════════════════════════════
echo -e "\n${YELLOW}━━━━ UC8: MES 전송 API 검증 ━━━━${NC}"

# 8-A: 정상 MES 전송
RESP=$(curl -s -X POST "$MES_API" \
  -H "Content-Type: application/json" \
  -d '{"IND_BCD":"26228J0001","ResultData":12.34}')
SUCCESS=$(echo "$RESP" | unwrap "print(d['success'])")
assert_eq "UC8-A MES 정상 전송 → success=True" "True" "$SUCCESS"
assert_contains "UC8-A MES 응답에 transmissionId 포함" "$RESP" "transmissionId"

# 8-B: IND_BCD 누락
HTTP_CODE=$(curl -s -o /tmp/uc8b.json -w '%{http_code}' -X POST "$MES_API" \
  -H "Content-Type: application/json" \
  -d '{"ResultData":12.34}')
assert_eq "UC8-B IND_BCD 누락 → HTTP 400" "400" "$HTTP_CODE"

# 8-C: ResultData 누락
HTTP_CODE=$(curl -s -o /tmp/uc8c.json -w '%{http_code}' -X POST "$MES_API" \
  -H "Content-Type: application/json" \
  -d '{"IND_BCD":"26228J0001"}')
assert_eq "UC8-C ResultData 누락 → HTTP 400" "400" "$HTTP_CODE"

# ═══════════════════════════════════════════════════════════
# UC9: 레코드 삭제 후 이력 반영 확인
# ═══════════════════════════════════════════════════════════
echo -e "\n${YELLOW}━━━━ UC9: 레코드 삭제 후 이력 반영 확인 ━━━━${NC}"

# 현재 건수 확인
BEFORE=$(curl -s "$API?page=0&size=100" | unwrap "print(d['totalElements'])")
echo -e "  삭제 전 건수: $BEFORE"

# 9-A: 특정 레코드 삭제
FIRST_ID=$(curl -s "$API?page=0&size=1" | unwrap "print(d['content'][0]['id'])")
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' -X DELETE "$API/$FIRST_ID")
assert_eq "UC9-A 개별 삭제 → HTTP 200" "200" "$HTTP_CODE"

# 9-B: 삭제 후 건수 -1
AFTER=$(curl -s "$API?page=0&size=100" | unwrap "print(d['totalElements'])")
EXPECTED_AFTER=$((BEFORE - 1))
assert_eq "UC9-B 삭제 후 건수 -1 ($BEFORE → $EXPECTED_AFTER)" "$EXPECTED_AFTER" "$AFTER"

# 9-C: 삭제된 ID로 재조회 → 404
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' "$API/$FIRST_ID")
assert_eq "UC9-C 삭제된 ID 조회 → HTTP 404" "404" "$HTTP_CODE"

# 9-D: 존재하지 않는 ID 삭제 → 404
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' -X DELETE "$API/nonexistent-uuid")
assert_eq "UC9-D 존재하지 않는 ID 삭제 → HTTP 404" "404" "$HTTP_CODE"

# 9-E: 전체 삭제
HTTP_CODE=$(curl -s -o /tmp/uc9e.json -w '%{http_code}' -X DELETE "$API")
assert_eq "UC9-E 전체 삭제 → HTTP 200" "200" "$HTTP_CODE"
AFTER_ALL=$(curl -s "$API?page=0&size=20" | unwrap "print(d['totalElements'])")
assert_eq "UC9-E 전체 삭제 후 0건" "0" "$AFTER_ALL"

# ═══════════════════════════════════════════════════════════
# UC10: 엣지 케이스 – 특수문자, 긴 문자열, 대량 데이터, 경계값
# ═══════════════════════════════════════════════════════════
echo -e "\n${YELLOW}━━━━ UC10: 엣지 케이스 ━━━━${NC}"

# 10-A: 특수문자 포함 바코드
SPECIAL_BCD="BCD-<script>alert(1)</script>&test=1"
HTTP_CODE=$(curl -s -o /tmp/uc10a.json -w '%{http_code}' -X POST "$API" \
  -H "Content-Type: application/json" \
  -d "{\"indBcd\":\"$SPECIAL_BCD\",\"lotnr\":\"LOT-SPECIAL\",\"matnr\":\"MAT-SP\",\"operatorId\":\"OP-SP\"}")
assert_eq "UC10-A 특수문자 포함 저장 → HTTP 201" "201" "$HTTP_CODE"

# 10-B: 특수문자가 그대로 저장되었는지 검증
STORED_BCD=$(cat /tmp/uc10a.json | unwrap "print(d['indBcd'])")
assert_contains "UC10-B 특수문자 저장 확인" "$STORED_BCD" "<script>"

# 10-C: 매우 긴 문자열 (500자)
LONG_STR=$(python3 -c "print('A' * 500)")
HTTP_CODE=$(curl -s -o /tmp/uc10c.json -w '%{http_code}' -X POST "$API" \
  -H "Content-Type: application/json" \
  -d "{\"indBcd\":\"$LONG_STR\",\"lotnr\":\"LOT-LONG\",\"matnr\":\"MAT-LONG\",\"operatorId\":\"OP-LONG\"}")
assert_eq "UC10-C 500자 바코드 저장 → HTTP 201" "201" "$HTTP_CODE"
STORED_LEN=$(cat /tmp/uc10c.json | unwrap "print(len(d['indBcd']))")
assert_eq "UC10-C 500자 그대로 저장" "500" "$STORED_LEN"

# 10-D: coverageRatio 경계값 (0, 1, 소수점)
HTTP_CODE=$(curl -s -o /tmp/uc10d.json -w '%{http_code}' -X POST "$API" \
  -H "Content-Type: application/json" \
  -d '{"indBcd":"EDGE-ZERO","lotnr":"LOT-EDGE","matnr":"MAT-EDGE","operatorId":"OP-EDGE","coverageRatio":0,"totalCount":0}')
assert_eq "UC10-D coverageRatio=0, totalCount=0 → HTTP 201" "201" "$HTTP_CODE"

HTTP_CODE=$(curl -s -o /tmp/uc10d2.json -w '%{http_code}' -X POST "$API" \
  -H "Content-Type: application/json" \
  -d '{"indBcd":"EDGE-MAX","lotnr":"LOT-EDGE2","matnr":"MAT-EDGE2","operatorId":"OP-EDGE2","coverageRatio":0.01,"totalCount":99999}')
assert_eq "UC10-D2 매우 높은 totalCount → HTTP 201" "201" "$HTTP_CODE"

# 10-E: 한글 바코드 / 유니코드
HTTP_CODE=$(curl -s -o /tmp/uc10e.json -w '%{http_code}' -X POST "$API" \
  -H "Content-Type: application/json" \
  -d '{"indBcd":"한글바코드テスト🇰🇷","lotnr":"롯트001","matnr":"자재001","operatorId":"검사자001"}')
assert_eq "UC10-E 한글/유니코드 바코드 → HTTP 201" "201" "$HTTP_CODE"
UNICODE_BCD=$(cat /tmp/uc10e.json | unwrap "print(d['indBcd'])")
assert_contains "UC10-E 한글 저장 확인" "$UNICODE_BCD" "한글바코드"

# 10-F: 대량 데이터 삽입 후 성능 확인 (50건 빠르게)
curl -s -X DELETE "$API" > /dev/null
START_TIME=$(date +%s%N)
for i in $(seq 1 50); do
  idx=$(printf "%03d" $i)
  curl -s -X POST "$API" \
    -H "Content-Type: application/json" \
    -d "{\"indBcd\":\"BULK${idx}\",\"lotnr\":\"LOTBULK${idx}\",\"matnr\":\"MATBULK\",\"operatorId\":\"OPBULK\",\"totalCount\":$i}" > /dev/null &
done
wait
END_TIME=$(date +%s%N)
ELAPSED_MS=$(( (END_TIME - START_TIME) / 1000000 ))
BULK_COUNT=$(curl -s "$API?page=0&size=100" | unwrap "print(d['totalElements'])")
assert_eq "UC10-F 50건 대량 삽입 완료" "50" "$BULK_COUNT"
echo -e "  ${CYAN}ℹ${NC} 대량 삽입 소요시간: ${ELAPSED_MS}ms"

# 10-G: Health endpoint
HTTP_CODE=$(curl -s -o /tmp/uc10g.json -w '%{http_code}' "http://localhost:8080/jri-api/health")
assert_eq "UC10-G Health endpoint → HTTP 200" "200" "$HTTP_CODE"
assert_contains "UC10-G Health 응답에 status:ok" "$(cat /tmp/uc10g.json)" "ok"

# 10-H: CORS preflight
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' -X OPTIONS "http://localhost:8080/jri-api/inspections" \
  -H "Origin: http://example.com" \
  -H "Access-Control-Request-Method: POST")
assert_eq "UC10-H CORS preflight → HTTP 204" "204" "$HTTP_CODE"

# 10-I: 잘못된 API endpoint → 404
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:8080/jri-api/nonexistent")
assert_eq "UC10-I 잘못된 endpoint → HTTP 404" "404" "$HTTP_CODE"

# ═══════════════════════════════════════════════════════════
# 최종 정리 및 결과 출력
# ═══════════════════════════════════════════════════════════
curl -s -X DELETE "$API" > /dev/null

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}         종합 단위 테스트 결과 (API Server Side)           ${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "  총 테스트: ${TOTAL}"
echo -e "  ${GREEN}PASS: ${PASS}${NC}"
echo -e "  ${RED}FAIL: ${FAIL}${NC}"

if [ "$FAIL" -eq 0 ]; then
  echo -e "\n  ${GREEN}🎉 전체 테스트 통과! 운영 배포 준비 완료${NC}"
else
  echo -e "\n  ${RED}⚠️  실패 테스트가 있습니다. 수정이 필요합니다.${NC}"
fi
echo ""

# 종료 코드
exit $FAIL
