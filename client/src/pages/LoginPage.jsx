import { useNavigate } from "react-router-dom";
import PageContainer from "../components/PageContainer.jsx";
import { useState } from "react";
import { loginUser } from "../lib/api.js";
import { saveAuth } from "../lib/auth.js";

export default function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, SetErr] = useState("");

  const submit = async () => {
    SetErr("");
    const e = email.trim().toLowerCase();
    const p = password;

    if (!e) return SetErr("이메일을 입력해주세요.");
    if (!p) return SetErr("비밀번호를 입력해주세요.");

    setLoading(true);

    try {
      const data = await loginUser({ email: e, password: p });
      saveAuth(data);
      nav("/", { replace: true });
    } catch (e) {
      SetErr("로그인 실패: " + String(e.message ?? e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer>
      <div style={ui.headerRow}>
        <h1 style={{ margin: 0, fontSize: 20 }}>로그인</h1>
        <button onClick={() => nav(-1)} style={ui.btnOutline}>
          ← 뒤로
        </button>
      </div>

      <div style={{ marginTop: 14, ...ui.card }}>
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
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="비밀번호"
          style={ui.input}
        />

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
          {loading ? "로그인 중..." : "로그인"}
        </button>

        <div style={ui.footerRow}>
          <button
            type="button"
            onClick={() => nav("/register")}
            style={{ ...ui.btnOutline, width: "100%", marginTop: 10 }}
            disabled={loading}
          >
            계정이 없습니다 (회원가입)
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
