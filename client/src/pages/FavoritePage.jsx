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

  // 초기 선택값
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

        // 기존 저장된 값이 있으면 화면에 반영
        const b = pickExisting(favs, { sport: "baseball", gender: "none" });
        const m = pickExisting(favs, { sport: "volleyball", gender: "male" });
        const w = pickExisting(favs, { sport: "volleyball", gender: "female" });

        if (!alive) return;

        if (b) setBaseballTeam(b);
        if (m) setMenTeam(m === "none" ? "없음" : m); // 혹시 DB에 none 저장했을 경우
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
      // 1) 야구 저장(항상 1개)
      await saveFavorite({
        sport: "baseball",
        gender: "none",
        team_code: baseballTeam,
      });

      // 2) 배구 남/여는 "없음" 선택 가능
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
      // 저장 후 마이페이지로 보내도 되고, 여기서 머물러도 됨
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
      <h1 style={{ margin: 0 }}>응원팀 설정</h1>

      {loading ? (
        <div style={{ marginTop: 14 }}>불러오는 중...</div>
      ) : (
        <>
          <section style={{ marginTop: 16 }}>
            <div style={styles.sectionTitle}>야구</div>
            <div style={{ marginTop: 8 }}>
              <select
                value={baseballTeam}
                onChange={(e) => setBaseballTeam(e.target.value)}
                style={styles.select}
              >
                {BASEBALL_TEAMS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div style={styles.hint}>10개 팀 중 1개 선택</div>
          </section>

          <section style={{ marginTop: 22 }}>
            <div style={styles.sectionTitle}>배구</div>

            <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={styles.subTitle}>남자배구</div>
                <select
                  value={menTeam}
                  onChange={(e) => setMenTeam(e.target.value)}
                  style={styles.select}
                >
                  {V_LEAGUE_MEN.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ flex: 1 }}>
                <div style={styles.subTitle}>여자배구</div>
                <select
                  value={womenTeam}
                  onChange={(e) => setWomenTeam(e.target.value)}
                  style={styles.select}
                >
                  {V_LEAGUE_WOMEN.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={styles.hint}>남/여 각각 선택 가능합니다.</div>
          </section>

          <section
            style={{
              marginTop: 18,
              padding: 14,
              border: "1px solid #eee",
              borderRadius: 14,
            }}
          >
            <div style={{ fontWeight: 900, marginBottom: 8 }}>미리보기</div>
            <div style={{ color: "#444" }}>
              야구: <b>{preview.baseball}</b>
            </div>
            <div style={{ color: "#444", marginTop: 6 }}>
              배구(남): <b>{preview.volleyball.men}</b>
            </div>
            <div style={{ color: "#444", marginTop: 6 }}>
              배구(여): <b>{preview.volleyball.women}</b>
            </div>
          </section>

          {err && <div style={{ marginTop: 12, color: "crimson" }}>{err}</div>}
          {msg && <div style={{ marginTop: 12, color: "green" }}>{msg}</div>}

          <button
            onClick={onSave}
            disabled={saving}
            style={{
              marginTop: 16,
              width: "100%",
              padding: "12px 12px",
              borderRadius: 12,
              border: "none",
              background: "#111",
              color: "#fff",
              fontSize: 16,
              fontWeight: 900,
              cursor: "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "저장 중..." : "저장하기"}
          </button>
        </>
      )}
    </PageContainer>
  );
}

const styles = {
  sectionTitle: { fontSize: 18, fontWeight: 900 },
  subTitle: { fontSize: 13, fontWeight: 800, color: "#444", marginBottom: 6 },
  hint: { marginTop: 8, fontSize: 12, color: "#666" },
  select: {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #ddd",
    background: "#fff",
  },
};
