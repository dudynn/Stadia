# Stadia Diary

야구 · 배구 경기 직관 기록을 남기고
친구들과 **공유 · 소통할 수 있는 모바일 웹 기반 기록 서비스**입니다.

경기 결과, 사진, 한 줄 소감을 기록하고
공개 피드를 통해 다른 사용자의 직관 기록을 보고
좋아요와 댓글로 소통할 수 있습니다.

> 개인 프로젝트 (기획 · 프론트엔드 · 백엔드 · DB 설계 모두 단독 구현)

---

## 프로젝트 소개

- 경기 직관 후 기억이 점점 흐려지는 경험에서 출발한 개인 프로젝트
- 메모 앱보다 **경기 기록에 특화된 구조**로 남기고 싶어 직접 구현
- 실제 사용을 전제로 모바일 웹 UX 중심으로 설계

---

## 주요 기능

### 기록 관리 (CRUD)

- 직관 기록 생성 / 조회 / 수정 / 삭제
- 야구 / 배구 종목 분리
- 공개 / 비공개 설정

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

### 경기 결과 관리

- 승 / 패 / 무 결과 입력
- 홈 / 어웨이 스코어 기록
- 상세 페이지 및 카드 UI에 결과 표시

### 이미지 첨부

- 경기 사진 최대 3장 업로드
- 상세 페이지 썸네일 + 원본 확대 뷰어
- 수정 페이지에서 사진 삭제 / 추가 가능

## 공유 및 소셜 기능

- 공개 피드에서 다른 사용자 기록 열람
- 작성자 닉네임 표시
- 좋아요 (중복 방지)
- 댓글 작성 / 삭제

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

| 컬럼명     | 설명                  |
| ---------- | --------------------- |
| id         | 기록 ID               |
| user_id    | 사용자 ID             |
| sport      | baseball / volleyball |
| team_home  | 홈 팀                 |
| team_away  | 원정 팀               |
| game_date  | 경기 날짜             |
| venue_name | 경기장                |
| one_liner  | 한 줄 소감            |
| visibility | 공개 범위             |
| created_at | 생성 시각             |
| updated_at | 수정 시각             |

### likes 테이블

| 컬럼명     | 설명        |
| ---------- | ----------- |
| diary_id   | 기록 ID     |
| user_id    | 사용자 ID   |
| created_id | 좋아요 시각 |

- (diary_id, user_id) UNIQUE 제약으로 중복 방지

### comments 테이블

| 컬럼명    | 설명              |
| --------- | ----------------- |
| id        | 댓글 ID           |
| diary_id  | 기록 ID           |
| user_id   | 작성자            |
| content   | 댓글 내용 (300자) |
| create_at | 작성 시각         |

### diary_photos 테이블

| 컬럼명    | 설명        |
| --------- | ----------- |
| id        | 사진 ID     |
| diary_id  | 기록 ID     |
| url       | 이미지 경로 |
| create_at | 업로드 시각 |

---

## API 구조

- `POST /api/diaries` : 기록 생성
- `GET /api/diaries` : 내 기록 목록 조회
- `GET /api/diaries/:id` : 기록 상세
- `PUT /api/diaries/:id` : 기록 수정
- `DELETE /api/diaries/:id` : 기록 삭제

### 소셜 기능 API

- `POST /api/diaries/:id/likes`
- `DELETE /api/diaries/:id/likes`
- `GET /api/diaries/:id/comments`
- `POST /api/diaries/:id/comments`
- `DELETE /api/diaries/:id/comments/:commentId`

### 이미지 API

- `POST /api/diaries/:id/photos`
- `GET /api/diaries/:id/photos`
- `DELETE /api/diaries/:id/photos/:photoId`

---

## 1주차 트러블슈팅 경험

### 수정 / 삭제 시 500 에러 발생

- 원인: `req.db.query`, `db.query` 혼용
- 해결: `pool.query` 단일 사용으로 통일

### 날짜 입력 에러

- ISO 문자열 → `<input type="date">` 형식 불일치
- 해결: `yyyy-MM-dd` 포맷으로 변환 처리

### 배구 경기 구조 문제

- 초기 설계에서 응원팀 선택과 경기 기록 구조 혼재
- 해결: 남자/여자 리그 선택 후 HOME/AWAY 경기 구조로 재설계

## 2주차 트러블슈팅 경험

### 공개 피드가 보이지 않는 문제

- 원인: visibility 기본값이 private
- 해결: 공개 / 내 기록 필터 분리 + UI에서 명확히 분리

### 좋아요 중복 이슈

- 원인: 중복 insert 가능 구조
- 해결: (diary_id, user_id) UNIQUE 제약 + ON CONFLICT DO NOTHING

### 이미지 미표시 문제

- 원인: DB 컬럼명(url)과 프론트 사용명(photo_url) 불일치
- 해결: API 응답 구조 통일

---

## UI / UX 포인트

- 모바일 웹 기준 카드 UI
- HOME / AWAY 시각적 구분 태그
- Select + Segment Button 혼합 UI
- 작성 후 → 홈 이동 / 수정 후 → 상세 페이지 복귀

---

## 향후 개선 예정

- 전체적인 UX/UI 수정 및 개선
- 댓글 실시간 반영 UX 개선
- 사용자 프로필 페이지
- 마이페이지 통계 시각화

---

## 프로젝트 상태

- ✔️ 직관 기록 CRUD (생성 / 조회 / 수정 / 삭제) 완료
- ✔️ 야구 / 배구 종목 분리 및 경기 구조 설계 완료
- ✔️ 경기 결과(승 · 패 · 무 / 스코어) 기록 기능 구현
- ✔️ 이미지 업로드 및 확대 뷰어 기능 구현
- ✔️ 공개 / 비공개 기록 분리 및 공개 피드 제공
- ✔️ 다중 사용자 환경에서 닉네임 기반 기록 공유
- ✔️ 좋아요 / 댓글 기능 1차 구현 완료
- 🟡 UX 개선 및 정렬/통계 기능 고도화 예정
- 🟡 지도 기능(KakaoMap) 보완 예정
