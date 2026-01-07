import { useEffect, useState } from "react";
import {
  getCurrentUser,
  loadGuestUser,
  saveAuth,
  saveGuestUser,
} from "../lib/auth";

const API_BASE = import.meta.env.VITE_API_URL;

function apiUrl(path) {
  if (!API_BASE) throw new Error("VITE_API_URL is not set");
  return `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
}

export default function RequireGuest({ onOpenLogin, onOpenRegister }) {
  const [user, setUser] = useState(() => getCurrentUser());
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (user?.nickname) setNickname(user.nickname);
  }, [user]);

  if (user?.id) return null;

  const submit = async () => {
    const name = nickname.trim();

    if (!name) return setErr("닉네임을 입력해주세요!");
    if (name.length > 30) return setErr("닉네임은 30자 이내로 입력해주세요.");

    setLoading(true);
    setErr("");

    try {
      const res = await fetch(apiUrl("/api/users/guest"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: name }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "guest create failed");
      }

      const data = await res.json();
      // data: { user, token }
      saveAuth(data);
      setUser(data.user);
    } catch (e) {
      console.error(e);
      setErr("서버 연결/요청에 실패했습니다. 서버가 켜져 있는지 확인해주세요");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.backdrop}>
      <div style={styles.modal}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>
          닉네임 설정
        </h2>
        <p style={{ marginTop: 8, color: "#555", lineHeight: 1.4 }}>
          닉네임은 처음 한 번만 입력하면 됩니다. 나중에 마이페이지에서 바꿀 수도
          있습니다!
        </p>

        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="닉네임을 입력해주세요!"
          style={styles.input}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !loading) submit();
          }}
          disabled={loading}
          autoFocus
        />

        {err && <div style={styles.error}>{err}</div>}

        <button onClick={submit} style={styles.button} disabled={loading}>
          {loading ? "생성 중..." : "시작하기"}
        </button>

        {/* 추가: 회원가입/로그인 */}
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button
            type="button"
            onClick={onOpenRegister}
            style={styles.outlineBtn}
            disabled={loading}
          >
            회원가입
          </button>

          <button
            type="button"
            onClick={onOpenLogin}
            style={styles.outlineBtn}
            disabled={loading}
          >
            로그인
          </button>
        </div>

        <div style={{ marginTop: 10, fontSize: 12, color: "#777" }}>
          * 지금은 게스트 모드입니다.
        </div>
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: 16,
  },

  modal: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 16,
    background: "#fff",
    padding: 18,
    boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 12px",
    borderRadius: 12,
    border: "1px solid #ddd",
    outline: "none",
    fontSize: 16,
    marginTop: 10,
  },

  button: {
    width: "100%",
    marginTop: 12,
    padding: "12px 12px",
    borderRadius: 12,
    border: "none",
    background: "#111",
    color: "#fff",
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    opacity: 1,
  },

  outlineBtn: {
    flex: 1,
    padding: "10px 12px",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    background: "#fff",
    fontWeight: 900,
    cursor: "pointer",
  },

  error: {
    marginTop: 10,
    color: "crimson",
    fontSize: 13,
  },
};
