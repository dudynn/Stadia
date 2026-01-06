import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BASEBALL_TEAMS,
  V_LEAGUE_MEN,
  V_LEAGUE_WOMEN,
} from "../constants/team.js";
import { fetchMyFavorites, saveFavorite } from "../lib/api.js";
import PageContainer from "../components/PageContainer.jsx";

function pickExisting(favorites, { sport, gender }) {
  const found = favorites.find((f) => f.sport === sport && f.gender === gender);
  return found?.team_code ?? null;
}

export default function FavoritePage() {
  const nav = useNavigate();

  const [baseballTeam, setBaseballTeam] = useState(BASEBALL_TEAMS[0]);
  const [menTeam, setMenTeam] = useState("없음");
  const [womenTeam, setWomenTeam] = useState("없음");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr("");
        const favs = await fetchMyFavorites();

        const b = pickExisting(favs, { sport: "baseball", gender: "none" });
        const m = pickExisting(favs, { sport: "volleyball", gender: "male" });
        const w = pickExisting(favs, { sport: "volleyball", gender: "female" });

        if (!alive) return;

        if (b) setBaseballTeam(b);
        if (m) setMenTeam(m === "none" ? "없음" : m);
        if (w) setWomenTeam(w === "none" ? "없음" : w);
      } catch (e) {
        console.error(e);
        if (alive) setErr("기존 응원팀을 불러오지 못했습니다.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const preview = useMemo(() => {
    return {
      baseball: baseballTeam,
      volleyball: { men: menTeam, women: womenTeam },
    };
  }, [baseballTeam, menTeam, womenTeam]);

  const onSave = async () => {
    setErr("");
    setMsg("");
    setSaving(true);

    try {
      await saveFavorite({
        sport: "baseball",
        gender: "none",
        team_code: baseballTeam,
      });

      await saveFavorite({
        sport: "volleyball",
        gender: "male",
        team_code: menTeam === "없음" ? "none" : menTeam,
      });

      await saveFavorite({
        sport: "volleyball",
        gender: "female",
        team_code: womenTeam === "없음" ? "none" : womenTeam,
      });

      setMsg("저장 완료!");
      setTimeout(() => nav("/mypage"), 500);
    } catch (e) {
      console.error(e);
      setErr("저장에 실패했습니다. 서버 상태/라우트 경로를 확인해주세요.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer>
      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <h1 style={{ margin: 0, flex: 1 }}>응원팀 설정</h1>
        <button onClick={() => nav(-1)} style={ui.btnOutline}>
          ← 뒤로
        </button>
      </div>

      {loading ? (
        <div style={{ marginTop: 14, color: "#666", fontWeight: 800 }}>
          불러오는 중...
        </div>
      ) : (
        <>
          {/* 야구 */}
          <div style={{ marginTop: 16, ...ui.card }}>
            <div style={ui.cardTitleRow}>
              <div style={ui.cardTitle}>⚾️ 야구</div>
              <span style={ui.badge}>1개 선택</span>
            </div>

            <div style={{ marginTop: 10 }}>
              <label style={ui.label}>응원팀</label>
              <select
                value={baseballTeam}
                onChange={(e) => setBaseballTeam(e.target.value)}
                style={ui.select}
              >
                {BASEBALL_TEAMS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <div style={ui.hint}>10개 팀 중 1개 선택</div>
            </div>
          </div>

          {/* 배구 */}
          <div style={{ marginTop: 12, ...ui.card }}>
            <div style={ui.cardTitleRow}>
              <div style={ui.cardTitle}>🏐 배구</div>
              <span style={ui.badge}>남/여 각각</span>
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={ui.label}>남자배구</label>
                <select
                  value={menTeam}
                  onChange={(e) => setMenTeam(e.target.value)}
                  style={ui.select}
                >
                  <option value="없음">없음</option>
                  {V_LEAGUE_MEN.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ flex: 1 }}>
                <label style={ui.label}>여자배구</label>
                <select
                  value={womenTeam}
                  onChange={(e) => setWomenTeam(e.target.value)}
                  style={ui.select}
                >
                  <option value="없음">없음</option>
                  {V_LEAGUE_WOMEN.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={ui.hint}>남/여 각각 선택 가능합니다.</div>
          </div>

          {/* 미리보기 */}
          <div style={{ marginTop: 12, ...ui.card }}>
            <div style={ui.cardTitleRow}>
              <div style={ui.cardTitle}>미리보기</div>
              <span style={ui.badgeLight}>저장 전 확인</span>
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              <div style={ui.previewRow}>
                <span style={ui.previewLabel}>야구</span>
                <span style={ui.previewPill}>{preview.baseball}</span>
              </div>

              <div style={ui.previewRow}>
                <span style={ui.previewLabel}>배구(남)</span>
                <span style={ui.previewPill}>{preview.volleyball.men}</span>
              </div>

              <div style={ui.previewRow}>
                <span style={ui.previewLabel}>배구(여)</span>
                <span style={ui.previewPill}>{preview.volleyball.women}</span>
              </div>
            </div>
          </div>

          {/* 메시지 */}
          {err && <div style={{ marginTop: 12, color: "crimson" }}>{err}</div>}
          {msg && (
            <div style={{ marginTop: 12, color: "#16a34a", fontWeight: 900 }}>
              {msg}
            </div>
          )}

          {/* 저장 버튼 */}
          <button
            onClick={onSave}
            disabled={saving}
            style={ui.primaryBtn(saving)}
          >
            {saving ? "저장 중..." : "저장하기"}
          </button>
        </>
      )}
    </PageContainer>
  );
}

const ui = {
  card: {
    border: "1px solid #eee",
    borderRadius: 18,
    padding: 16,
    background: "#fff",
    boxShadow: "0 10px 28px rgba(0,0,0,0.05)",
  },

  cardTitleRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: 900,
    color: "#111",
  },

  badge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    border: "1px solid #e5e7eb",
    background: "#f6f6f6",
    color: "#111",
  },

  badgeLight: {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    border: "1px solid #eee",
    background: "#fafafa",
    color: "#444",
  },

  label: {
    display: "block",
    fontWeight: 900,
    marginBottom: 6,
    color: "#111",
    fontSize: 13,
  },

  hint: {
    marginTop: 8,
    fontSize: 12,
    color: "#666",
    fontWeight: 700,
  },

  select: {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: "#fff",
    fontWeight: 800,
    outline: "none",
  },

  previewRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid #eee",
    background: "#fff",
  },

  previewLabel: {
    fontWeight: 900,
    color: "#444",
    fontSize: 13,
  },

  previewPill: {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 10px",
    borderRadius: 999,
    fontWeight: 900,
    border: "1px solid #e5e7eb",
    background: "#f6f6f6",
    color: "#111",
    maxWidth: "70%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  primaryBtn: (disabled) => ({
    marginTop: 16,
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
  },
};
