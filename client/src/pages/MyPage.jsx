import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  loadGuestUser,
  clearGuestUser,
  getCurrentUser,
  clearAuth,
  isLoggedInAccount,
} from "../lib/auth.js";
import { fetchMyFavorites } from "../lib/api.js";
import PageContainer from "../components/PageContainer.jsx";

function labelTeam(team) {
  if (!team || team === "none" || team === "없음") {
    return <span style={{ color: "#999" }}>선택 안 함</span>;
  }
  return <b>{team}</b>;
}

export default function MyPage() {
  const nav = useNavigate();
  const user = loadGuestUser();

  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const isAccount = isLoggedInAccount();

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const data = await fetchMyFavorites();
        if (alive) setFavorites(data);
      } catch (e) {
        console.error(e);
        if (alive) setErr("응원팀 정보를 불러오지 못했습니다.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const baseball = favorites.find(
    (f) => f.sport === "baseball" && f.gender === "none",
  );

  const volleyballMen = favorites.find(
    (f) => f.sport === "volleyball" && f.gender === "male",
  );

  const volleyballWomen = favorites.find(
    (f) => f.sport === "volleyball" && f.gender === "female",
  );

  const onLogout = () => {
    const ok = window.confirm("로그아웃 할까요?");
    if (!ok) return;

    clearAuth();
    nav("/", { replace: true });
    window.location.reload();
  };

  const onResetGuest = () => {
    const ok = window.confirm("게스트 닉네임을 다시 설정할까요?");
    if (!ok) return;

    clearAuth();
    nav("/", { replace: true });
    window.confirm.reload();
  };

  return (
    <PageContainer>
      {/* 프로필 영역 */}
      <div style={profileCard}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, color: "#666" }}>닉네임</div>
            <div style={{ fontSize: 24, fontWeight: 900 }}>
              {user?.nickname ?? "-"}
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: "#777" }}>
              모드: <b>{isAccount ? "회원" : "게스트"}</b>
            </div>
          </div>

          {/* 로그아웃 버튼 */}
          <button onClick={onLogout} style={logoutBtn}>
            로그아웃
          </button>
        </div>
      </div>

      {/* 응원팀 */}
      <div style={{ marginTop: 20 }}>
        <h2 style={{ marginBottom: 10 }}>내 응원팀</h2>

        {loading ? (
          <div>불러오는 중...</div>
        ) : err ? (
          <div style={{ color: "crimson" }}>{err}</div>
        ) : (
          <>
            <div style={teamCard}>
              <div style={teamTitle}>⚾ 야구</div>
              <div>{labelTeam(baseball?.team_code)}</div>
            </div>

            <div style={teamCard}>
              <div style={teamTitle}>🏐 배구</div>
              <div style={{ marginTop: 6 }}>
                남자배구: {labelTeam(volleyballMen?.team_code)}
              </div>
              <div style={{ marginTop: 4 }}>
                여자배구: {labelTeam(volleyballWomen?.team_code)}
              </div>
            </div>

            <Link to="/favorite" style={{ textDecoration: "none" }}>
              <div style={editButton}>응원팀 변경하기 →</div>
            </Link>
          </>
        )}
      </div>

      {/* 기타 */}
      <div style={{ marginTop: 24, display: "grid", gap: 10 }}>
        {/* 게스트일 때만 노출 */}
        {!isAccount && (
          <button onClick={onResetGuest} style={resetBtn}>
            게스트 닉네임 다시 설정하기
          </button>
        )}
      </div>
    </PageContainer>
  );
}

const profileCard = {
  marginTop: 30,
  border: "1px solid #eee",
  borderRadius: 16,
  padding: 16,
  background: "#fff",
};

const teamCard = {
  border: "1px solid #eee",
  borderRadius: 16,
  padding: 16,
  marginBottom: 12,
  background: "#fff",
};

const teamTitle = {
  fontSize: 16,
  fontWeight: 900,
  marginBottom: 6,
};

const editButton = {
  marginTop: 10,
  padding: "12px 14px",
  borderRadius: 14,
  background: "#111",
  color: "#fff",
  fontWeight: 800,
  textAlign: "center",
};

const logoutBtn = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  background: "#fff",
  cursor: "pointer",
  fontWeight: 900,
};

const resetBtn = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #ddd",
  background: "#fff",
  cursor: "pointer",
};
