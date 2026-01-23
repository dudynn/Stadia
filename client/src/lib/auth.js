const LS_KEY = "stadia_user_v1";

// { user: {id, nickname, email?, mode}, token }
export function loadAuth() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveAuth(auth) {
  localStorage.setItem(LS_KEY, JSON.stringify(auth));
}

export function clearAuth() {
  localStorage.removeItem(LS_KEY);
}

export function getCurrentUser() {
  return loadAuth()?.user ?? null;
}

export function getCurrentUserId() {
  const u = getCurrentUser();
  return u?.id ?? null;
}

export function getToken() {
  return loadAuth()?.token ?? null;
}

/* userId만 편하게 */
export function getGuestUserId() {
  const u = loadGuestUser();
  return u?.id ?? null;
}

/* { id, nickname } 저장
 ** 내부는 saveAuth로 */
export function saveGuestUser(user) {
  // users: { id, nickname } 들어오던 것 --> guest 형태로 래핑 저장
  saveAuth({
    user: { id: String(user.id), nickname: user.nickname, mode: "guest" },
    token: loadAuth()?.token ?? null,
  });
}

/* { id, nickname } 불러오기 */
export function loadGuestUser() {
  const u = getCurrentUser();
  if (!u?.id) return null;
  return { id: u.id, nickname: u.nickname };
}

/* 로그아웃 (게스트 초기화) */
export function clearGuestUser() {
  clearAuth();
}

export function isLoggedInAccount() {
  const u = getCurrentUser();
  return u?.mode === "account";
}
