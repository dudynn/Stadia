# Stadia Diary

야구 · 배구 경기 직관 기록을 남길 수 있는 **모바일 웹 기반 개인 기록 서비스**입니다.  
관람 날짜, 홈/어웨이 팀, 경기장, 한 줄 소감을 간단하게 저장하고 다시 확인할 수 있습니다.

> 개인 프로젝트 (기획 · 프론트엔드 · 백엔드 · DB 설계 전부 단독 구현)

---

## 프로젝트 소개

- 경기 직관 후 기억이 점점 흐려지는 경험에서 출발한 개인 프로젝트
- 메모 앱보다 **경기 기록에 특화된 구조**로 남기고 싶어 직접 구현
- 실제 사용을 전제로 모바일 웹 UX 중심으로 설계

---

## 주요 기능

### 기록 관리 (CRUD)
- 직관 기록 생성 / 조회 / 수정 / 삭제
- 야구 / 배구 종목 분리 관리

### 팀 선택 UX
- **야구**: HOME vs AWAY 팀 선택
- **배구**: 남자 / 여자 리그 선택 → HOME vs AWAY 팀 선택

### 장소 관리
- 종목/리그에 따라 경기장 목록 자동 변경
- 목록 선택 또는 직접 입력 병행 지원

### 기록 내용
- 날짜 선택 (YYYY-MM-DD)
- 경기장
- 한 줄 소감 (120자 제한)

---

## 기술 스택

### Frontend
- React
- Vite
- React Router
- CSS-in-JS (inline style)

### Backend
- Node.js
- Express

### Database
- PostgreSQL

### 기타
- REST API 설계
- Kakao Map API (연동 예정)

---

## DB 구조

### diaries 테이블
| 컬럼명                  | 설명                   |
|-----------------------|-----------------------|
| id                    | 기록 ID                |
| user_id               | 사용자 ID               |
| sport                 | baseball / volleyball |
| team_home             | 홈 팀                  |
| team_away             | 원정 팀                |
| game_date             | 경기 날짜               |
| venue_name            | 경기장                 |
| one_liner             | 한 줄 소감              |
| visibility            | 공개 범위               |
| created_at            | 생성 시각               |
| updated_at            | 수정 시각               |

---

## API 구조

- `POST /api/diaries` : 기록 생성
- `GET /api/diaries` : 내 기록 목록 조회
- `GET /api/diaries/:id` : 기록 상세
- `PUT /api/diaries/:id` : 기록 수정
- `DELETE /api/diaries/:id` : 기록 삭제

---

## 트러블슈팅 경험

### 수정 / 삭제 시 500 에러 발생
- 원인: `req.db.query`, `db.query` 혼용
- 해결: `pool.query` 단일 사용으로 통일

### 날짜 입력 에러
- ISO 문자열 → `<input type="date">` 형식 불일치
- 해결: `yyyy-MM-dd` 포맷으로 변환 처리

### 배구 경기 구조 문제
- 초기 설계에서 응원팀 선택과 경기 기록 구조 혼재
- 해결: 남자/여자 리그 선택 후 HOME/AWAY 경기 구조로 재설계

---

## UI / UX 포인트

- 모바일 웹 기준 카드 UI
- HOME / AWAY 시각적 구분 태그
- Select + Segment Button 혼합 UI
- 작성 후 → 홈 이동 / 수정 후 → 상세 페이지 복귀

---

## 향후 개선 예정

- 경기 결과 (승/패, 스코어) 추가
- 이미지 2~3장 첨부 기능
- 공개 범위 필터링
- 좋아요 / 댓글
- 마이페이지 통계 (총 직관 횟수, 팀 비율)
- Kakao Map API 실제 적용

---

## 프로젝트 상태

✔️ 기록 생성 / 조회 / 수정 / 삭제 정상 동작  
✔️ 홈 / 상세 페이지 UI 구현 완료  
🟡 지도 기능은 API 설정 후 보완 예정
