import { useNavigate } from "react-router-dom";
import PageContainer from "../components/PageContainer.jsx";
import { useState } from "react";
import { registerUser } from "../lib/api.js";
import { saveAuth } from "../lib/auth.js";

export default function RegisterPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    setErr("");
    const e = email.trim().toLowerCase();
    const n = nickname.trim();
    const p = password;

    if (!e) return setErr("이메일을 입력해주세요.");
    if (!n) return setErr("닉네임을 입력해주세요.");
    if (!p) return setErr("비밀번호를 입력해주세요.");
    if (p.length < 6) return setErr("비밀번호는 6자 이상으로 설정해주세요.");

    setLoading(true);

    try {
      const data = await registerUser({ email: e, password: p, nickname: n });
      saveAuth(data);
      nav("/", { replace: true });
    } catch (e) {
      setErr("회원가입 실패: " + String(e.message ?? e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer>
      <div style={ui.headerRow}>
        <h1 style={{ margin: 0, fontSize: 20 }}>회원가입</h1>
        <button onClick={() => nav(-1)} style={ui.btnOutline}>
          ← 뒤로
        </button>
      </div>

      <div style={{ marginTop: 14, ...ui.card }}>
        <label style={ui.label}>닉네임</label>
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="닉네임"
          style={ui.input}
        />

        <div style={{ height: 10 }} />

        <label style={ui.label}>이메일</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="example@email.com"
          style={ui.input}
        />

        <div style={{ height: 10 }} />

        <label style={ui.label}>비밀번호</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호"
          style={ui.input}
        />

        <div style={{ height: 10 }} />

        {/* <label style={ui.label}>비밀번호 확인</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호"
          style={ui.input}
        /> */}

        {err && (
          <div style={{ marginTop: 10, color: "crimson", fontWeight: 800 }}>
            {err}
          </div>
        )}

        <button
          onClick={submit}
          disabled={loading}
          style={ui.primaryBtn(loading)}
        >
          {loading ? "가입 중..." : "가입하기"}
        </button>

        <div style={ui.footerRow}>
          <button
            type="button"
            onClick={() => nav("/login")}
            style={{ ...ui.btnOutline, width: "100%", marginTop: 10 }}
            disabled={loading}
          >
            이미 계정이 있어요 (로그인)
          </button>
        </div>
      </div>
    </PageContainer>
  );
}

const ui = {
  headerRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
  },

  card: {
    border: "1px solid #eee",
    borderRadius: 18,
    padding: 16,
    background: "#fff",
    boxShadow: "0 10px 28px rgba(0,0,0,0.05)",
  },

  desc: {
    fontSize: 13,
    color: "#666",
    fontWeight: 800,
    marginBottom: 12,
    lineHeight: 1.4,
  },

  label: {
    display: "block",
    fontWeight: 900,
    marginBottom: 6,
    color: "#111",
    fontSize: 13,
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 12px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    outline: "none",
    background: "#fff",
    fontWeight: 800,
  },

  primaryBtn: (disabled) => ({
    marginTop: 14,
    width: "100%",
    padding: "12px 12px",
    borderRadius: 12,
    border: "none",
    background: "#111",
    color: "#fff",
    fontSize: 16,
    fontWeight: 900,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.7 : 1,
  }),

  btnOutline: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 900,
    color: "#111",
    marginLeft: "auto",
  },

  footerRow: {
    marginTop: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },

  footerText: {
    fontSize: 13,
    color: "#666",
    fontWeight: 800,
  },

  linkBtn: {
    border: "none",
    background: "transparent",
    fontWeight: 900,
    cursor: "pointer",
    color: "#111",
  },
};
