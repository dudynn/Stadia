const LS_KEY = "stadia_user_v1";

/* { id, nickname } 저장 */
export function saveGuestUser(user) {
  localStorage.setItem(LS_KEY, JSON.stringify(user));
}

/* { id, nickname } 불러오기 */
export function loadGuestUser() {
  const raw = localStorage.getItem(LS_KEY);

  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/* 로그아웃 (게스트 초기화) */
export function clearGuestUser() {
  localStorage.removeItem(LS_KEY);
}

/* userId만 편하게 */
export function getGuestUserId() {
  const u = loadGuestUser();
  return u?.id ?? null;
}
