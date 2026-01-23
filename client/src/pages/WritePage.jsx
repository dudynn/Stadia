import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageContainer from "../components/PageContainer.jsx";

import {
  createDiary,
  fetchDiaryById,
  updateDiary,
  fetchDiaryPhotos,
  deleteDiaryPhoto,
  uploadDiaryPhotos,
} from "../lib/api.js";

import {
  BASEBALL_TEAMS,
  V_LEAGUE_MEN,
  V_LEAGUE_WOMEN,
} from "../constants/team.js";

import {
  BASEBALL_STADIUM,
  V_MEN_STADIUM,
  V_WOMEN_STADIUM,
} from "../constants/stadium.js";

function todayYYYYMMDD() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toYYYYMMDD(dateLike) {
  if (!dateLike) return "";

  const s = String(dateLike);

  // 이미 YYYY-MM-DD면 그대로 (이건 안전)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // ISO(…Z / …+09:00 등)면 "slice" 하지 말고 Date로 파싱해서 로컬 날짜로 조립
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return ""; // 파싱 실패 방어

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function WritePage() {
  const nav = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [sport, setSport] = useState("baseball");

  // 공개 범위
  const [visibility, setVisibility] = useState("public"); // private | public

  // 야구
  const [baseballHome, setBaseballHome] = useState(BASEBALL_TEAMS[0]);
  const [baseballAway, setBaseballAway] = useState(BASEBALL_TEAMS[1]);

  // 배구: 경기 구분 + VS
  const [vGender, setVGender] = useState("male"); // "male" | "female"
  const [vHome, setVHome] = useState(V_LEAGUE_MEN[0]);
  const [vAway, setVAway] = useState(V_LEAGUE_MEN[1] ?? V_LEAGUE_MEN[0]);

  const [gameDate, setGameDate] = useState(todayYYYYMMDD());
  const [venueName, setVenueName] = useState("");
  const [oneLiner, setOneLiner] = useState("");

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  // 장소: 목록/직접 입력 모드
  const [stadiumMode, setStadiumMode] = useState("select"); // "select" | "custom"
  const [stadiumSelect, setStadiumSelect] = useState("");

  // 경기 결과
  const [result, setResult] = useState("unknown");
  const [scoreHome, setScoreHome] = useState("");
  const [scoreAway, setScoreAway] = useState("");

  // 사진
  const [existingPhotos, setExistingPhotos] = useState([]); // [{id, url, ...}]
  const [newFiles, setNewFiles] = useState([]); // File[]
  const [newPreviews, setNewPreviews] = useState([]); // string[]

  // 배구 팀 목록
  const vTeams = vGender === "male" ? V_LEAGUE_MEN : V_LEAGUE_WOMEN;

  // 종목/배구 남녀에 따른 경기장 리스트
  const stadiumList = useMemo(() => {
    if (sport === "baseball") return BASEBALL_STADIUM;
    return vGender === "male" ? V_MEN_STADIUM : V_WOMEN_STADIUM;
  }, [sport, vGender]);

  // vGender 바뀌면 해당 리그 팀 목록으로 초기화
  useEffect(() => {
    if (sport !== "volleyball") return;
    const list = vGender === "male" ? V_LEAGUE_MEN : V_LEAGUE_WOMEN;
    setVHome(list[0]);
    setVAway(list[1] ?? list[0]);
  }, [vGender, sport]);

  // (신규 작성) 종목/배구남녀 바뀌면 경기장 기본값 자동 선택
  useEffect(() => {
    if (isEdit) return; // 수정 중이면 기존 값 유지
    const first = stadiumList[0] ?? "";
    setStadiumMode("select");
    setStadiumSelect(first);
    setVenueName(first);
  }, [stadiumList, isEdit]);

  // 수정 모드: 기존 사진 불러오기
  useEffect(() => {
    if (!isEdit) return;

    let alive = true;
    (async () => {
      try {
        const list = await fetchDiaryPhotos(id);
        if (alive) setExistingPhotos(list);
      } catch (e) {
        console.error(e);
      }
    })();

    return () => {
      alive = false;
    };
  }, [isEdit, id]);

  // 메모리 누수 방지 (previews cleanup)
  useEffect(() => {
    return () => {
      newPreviews.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [newPreviews]);

  // 수정 모드: 기존 기록 불러와서 state 채우기 + 장소 모드 자동 판단
  useEffect(() => {
    if (!isEdit) return;

    let alive = true;

    (async () => {
      try {
        setErr("");
        const d = await fetchDiaryById(id);
        if (!alive) return;

        // 먼저 sport/vGender부터 맞춰야 stadiumList가 올바르게 계산됨
        setSport(d.sport);

        setGameDate(toYYYYMMDD(d.game_date));
        setOneLiner(d.one_liner ?? "");

        setVisibility(d.visibility ?? "private");

        if (d.sport === "baseball") {
          setBaseballHome(d.team_home);
          setBaseballAway(d.team_away ?? d.team_home);
        } else {
          const isMale =
            V_LEAGUE_MEN.includes(d.team_home) ||
            V_LEAGUE_MEN.includes(d.team_away);
          setVGender(isMale ? "male" : "female");
          setVHome(d.team_home);
          setVAway(d.team_away ?? d.team_home);
        }

        // 경기 결과
        setResult(d.result ?? "unknown");
        setScoreHome(d.score_home ?? "");
        setScoreAway(d.score_away ?? "");

        // 장소 값 먼저 넣고,
        const v = d.venue_name ?? "";
        setVenueName(v);

        // stadiumList 기준으로 select/custom 자동 결정
        // (주의) 이 useEffect는 stadiumList가 바뀌면 한 번 더 실행되게 아래 dependency에 stadiumList 넣음
        const isInList = stadiumList.includes(v);
        setStadiumMode(isInList ? "select" : "custom");
        setStadiumSelect(isInList ? v : "");
      } catch (e) {
        console.error(e);
        setErr("기존 기록을 불러오지 못했습니다.");
      }
    })();

    return () => {
      alive = false;
    };
    // stadiumList 포함해야 sport/vGender 세팅 후 리스트가 바뀌었을 때 장소 모드 판정이 맞음
  }, [isEdit, id, stadiumList]);

  // 저장할 팀 계산
  const computedTeams = useMemo(() => {
    if (sport === "baseball") {
      return {
        team_home: baseballHome,
        team_away: baseballAway === baseballHome ? null : baseballAway,
      };
    }
    return {
      team_home: vHome,
      team_away: vAway === vHome ? null : vAway,
    };
  }, [sport, baseballHome, baseballAway, vHome, vAway]);

  const uploadIfAny = async (diaryId) => {
    if (!newFiles.length) return;

    const fd = new FormData();
    newFiles.forEach((f) => fd.append("photos", f));

    await uploadDiaryPhotos(diaryId, fd);

    // 업로드 후 상태 정리 + 기존사진 재조회
    setNewFiles([]);
    setNewPreviews([]);
    const list = await fetchDiaryPhotos(diaryId);
    setExistingPhotos(list);
  };

  const onSubmit = async () => {
    setErr("");

    if (!gameDate) return setErr("날짜를 선택해주세요.");
    if (!venueName.trim()) return setErr("장소를 입력해주세요.");
    if (!oneLiner.trim()) return setErr("한 줄 소감을 입력해주세요.");
    if (oneLiner.trim().length > 120)
      return setErr("한 줄 소감은 120자 이하입니다.");

    // 같은 팀 방지
    if (sport === "baseball" && baseballHome === baseballAway) {
      return setErr("야구는 홈/원정 팀을 다르게 선택해주세요.");
    }
    if (sport === "volleyball" && vHome === vAway) {
      return setErr("배구는 홈/원정 팀을 다르게 선택해주세요.");
    }

    setSaving(true);
    try {
      const payload = {
        sport,
        ...computedTeams,
        game_date: gameDate,
        venue_name: venueName.trim(),
        one_liner: oneLiner.trim(),
        visibility,
        result,
        score_home: scoreHome === "" ? null : Number(scoreHome),
        score_away: scoreAway === "" ? null : Number(scoreAway),
      };

      if (isEdit) {
        await updateDiary(id, payload);
        await uploadIfAny(id);
        nav(`/diary/${id}`, { replace: true });
      } else {
        const created = await createDiary(payload);
        await uploadIfAny(created.id);
        nav("/", { replace: true });
      }
    } catch (e) {
      console.error(e);
      setErr("저장에 실패했습니다. 서버/DB 상태를 확인해주세요.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer>
      <h1 style={{ margin: 0 }}>{isEdit ? "기록 수정" : "기록 작성"}</h1>

      <div style={ui.card}>
        <label style={ui.label}>공개 범위</label>

        <div style={ui.segWrap}>
          <button
            type="button"
            onClick={() => setVisibility("private")}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: 12,
              border: visibility === "private" ? "none" : "1px solid #ddd",
              background: visibility === "private" ? "#111" : "#fff",
              color: visibility === "private" ? "#fff" : "#111",
              fontWeight: 800,
            }}
          >
            비공개
          </button>

          <button
            type="button"
            onClick={() => setVisibility("public")}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: 12,
              border: visibility === "public" ? "none" : "1px solid #ddd",
              background: visibility === "public" ? "#111" : "#fff",
              color: visibility === "public" ? "#fff" : "#111",
              fontWeight: 800,
            }}
          >
            공개
          </button>
        </div>
      </div>

      <div style={ui.card}>
        <label style={ui.label}>종목</label>
        <select
          value={sport}
          onChange={(e) => setSport(e.target.value)}
          style={ui.select}
        >
          <option value="baseball">야구</option>
          <option value="volleyball">배구</option>
        </select>
      </div>

      {sport === "baseball" ? (
        <div style={ui.card}>
          <label style={ui.label}>팀 선택</label>

          <div style={ui.haRow}>
            <span style={ui.haTagHome}>HOME</span>
            <span style={ui.haTagAway}>AWAY</span>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <select
              value={baseballHome}
              onChange={(e) => setBaseballHome(e.target.value)}
              style={ui.select}
            >
              {BASEBALL_TEAMS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <div
              style={{ alignSelf: "center", color: "#777", fontWeight: 800 }}
            >
              vs
            </div>

            <select
              value={baseballAway}
              onChange={(e) => setBaseballAway(e.target.value)}
              style={ui.select}
            >
              {BASEBALL_TEAMS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <div style={ui.card}>
          <label style={ui.label}>배구 경기 구분</label>

          <div style={ui.segWrap}>
            <button
              type="button"
              onClick={() => setVGender("male")}
              style={ui.segBtn(vGender === "male")}
            >
              남자배구
            </button>
            <button
              type="button"
              onClick={() => setVGender("female")}
              style={ui.segBtn(vGender === "female")}
            >
              여자배구
            </button>
          </div>

          <div style={{ marginTop: 14 }}>
            <label style={ui.label}>팀 선택</label>

            <div style={ui.haRow}>
              <span style={ui.haTagHome}>HOME</span>
              <span style={ui.haTagAway}>AWAY</span>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <select
                value={vHome}
                onChange={(e) => setVHome(e.target.value)}
                style={ui.select}
              >
                {vTeams.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              <div
                style={{ alignSelf: "center", color: "#777", fontWeight: 800 }}
              >
                vs
              </div>

              <select
                value={vAway}
                onChange={(e) => setVAway(e.target.value)}
                style={ui.select}
              >
                {vTeams.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      <div style={ui.card}>
        <label style={ui.label}>날짜</label>
        <input
          type="date"
          value={gameDate}
          onChange={(e) => setGameDate(e.target.value)}
          style={ui.input}
        />
      </div>

      {/* 경기 결과 */}
      <div style={ui.card}>
        <label style={ui.label}>경기 결과</label>

        <div style={{ display: "flex", gap: 8 }}>
          {["win", "lose", "draw", "unknown"].map((r) => {
            const isActive = result === r;
            const s = resultBtnStyle[r];

            return (
              <button
                key={r}
                type="button"
                onClick={() => setResult(r)}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: 10,
                  fontWeight: 800,
                  cursor: "pointer",
                  border: isActive ? "none" : `1px solid ${s.inactiveBorder}`,
                  background: isActive ? s.activeBg : "#fff",
                  color: isActive ? s.activeColor : s.inactiveColor,
                  transition: "all 0.15s ease",
                }}
              >
                {r === "win" && "승"}
                {r === "lose" && "패"}
                {r === "draw" && "무"}
                {r === "unknown" && "모름"}
              </button>
            );
          })}
        </div>
      </div>

      <div style={ui.card}>
        <label style={ui.label}>스코어</label>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            type="number"
            value={scoreHome}
            onChange={(e) => setScoreHome(e.target.value)}
            placeholder="HOME"
            style={ui.input}
          />

          <input
            type="number"
            value={scoreAway}
            onChange={(e) => setScoreAway(e.target.value)}
            placeholder="AWAY"
            style={ui.input}
          />
        </div>
      </div>

      {/* 장소: 목록/직접입력 */}
      <div style={ui.card}>
        <label style={ui.label}>장소</label>

        <div style={ui.segWrap}>
          <button
            type="button"
            onClick={() => {
              const first = stadiumList[0] ?? "";
              setStadiumMode("select");
              setStadiumSelect(first);
              setVenueName(first);
            }}
            style={ui.segBtn(stadiumMode === "select")}
          >
            목록에서 선택
          </button>
          <button
            type="button"
            onClick={() => {
              setStadiumMode("custom");
              setStadiumSelect("");
              setVenueName("");
            }}
            style={ui.segBtn(stadiumMode === "custom")}
          >
            직접 입력
          </button>
        </div>

        {stadiumMode === "select" ? (
          <select
            value={stadiumSelect}
            onChange={(e) => {
              setStadiumSelect(e.target.value);
              setVenueName(e.target.value);
            }}
            style={ui.select}
          >
            {stadiumList.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        ) : (
          <input
            value={venueName}
            onChange={(e) => setVenueName(e.target.value)}
            style={ui.input}
          />
        )}
      </div>

      <div style={ui.card}>
        <label style={ui.label}>한 줄 소감</label>
        <input
          value={oneLiner}
          onChange={(e) => setOneLiner(e.target.value)}
          placeholder="120자 이하"
          style={ui.input}
        />
      </div>

      <div style={ui.card}>
        <label style={ui.label}>사진 (최대 3장)</label>

        {/* 기존 사진 (수정 모드) */}
        {isEdit && existingPhotos.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>기존 사진</div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {existingPhotos.map((p) => (
                <div key={p.id} style={{ position: "relative" }}>
                  <img
                    src={encodeURI(p.url)}
                    alt=""
                    style={{
                      width: 90,
                      height: 90,
                      objectFit: "cover",
                      borderRadius: 12,
                    }}
                  />

                  <button
                    type="button"
                    onClick={async () => {
                      const ok = window.confirm("이 사진을 삭제할까요?");
                      if (!ok) return;

                      try {
                        await deleteDiaryPhoto(id, p.id);
                        setExistingPhotos((prev) =>
                          prev.filter((x) => x.id !== p.id)
                        );
                      } catch (e) {
                        console.error(e);
                        alert("사진 삭제 실패");
                      }
                    }}
                    style={{
                      position: "absolute",
                      top: 6,
                      right: 6,
                      border: "none",
                      borderRadius: 999,
                      padding: "4px 8px",
                      fontSize: 12,
                      fontWeight: 900,
                      background: "rgba(0,0,0,0.75)",
                      color: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 새 사진 선택 */}
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => {
            const files = Array.from(e.target.files || []);

            const remain = 3 - existingPhotos.length;
            if (remain <= 0) {
              alert(
                "이미 사진이 3장 등록되어 있습니다. 먼저 삭제 후 추가하세요."
              );
              e.target.value = "";
              return;
            }

            if (files.length > remain) {
              alert(
                `현재 ${existingPhotos.length}장 등록됨. ${remain}장까지만 추가 가능!`
              );
              e.target.value = "";
              return;
            }

            setNewFiles(files);
            setNewPreviews(files.map((f) => URL.createObjectURL(f)));
          }}
        />

        {/* 새 사진 미리보기 */}
        {newPreviews.length > 0 && (
          <div
            style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}
          >
            {newPreviews.map((src) => (
              <img
                key={src}
                src={src}
                alt=""
                style={{
                  width: 90,
                  height: 90,
                  objectFit: "cover",
                  borderRadius: 12,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {err && <div style={{ marginTop: 12, color: "crimson" }}>{err}</div>}

      <button
        onClick={onSubmit}
        disabled={saving}
        style={ui.primaryBtn(saving)}
      >
        {saving ? "저장 중..." : isEdit ? "수정 저장" : "저장하기"}
      </button>
    </PageContainer>
  );
}

const ui = {
  card: {
    border: "1px solid #eee",
    borderRadius: 18,
    padding: 16,
    marginTop: 12,
    background: "#fff",
    boxShadow: "0 10px 28px rgba(0,0,0,0.05)",
  },

  label: { display: "block", fontWeight: 900, marginBottom: 6, color: "#111" },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    outline: "none",
    background: "#fff",
    fontWeight: 800,
  },

  select: {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: "#fff",
    fontWeight: 800,
  },

  // 세그먼트 래퍼
  segWrap: {
    display: "inline-flex",
    width: "100%",
    border: "1px solid #eee",
    background: "#f6f6f6",
    borderRadius: 999,
    padding: 4,
    gap: 4,
  },

  // 세그먼트 버튼
  segBtn: (active) => ({
    flex: 1,
    border: "none",
    borderRadius: 999,
    padding: "10px 12px",
    fontSize: 13,
    fontWeight: 900,
    cursor: "pointer",
    background: active ? "#111" : "transparent",
    color: active ? "#fff" : "#444",
    boxShadow: active ? "0 6px 16px rgba(0,0,0,0.10)" : "none",
  }),

  // 메인 CTA
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

  // 홈/원정 태그
  haRow: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 8,
    padding: "0 6px",
  },
  haTagHome: {
    fontSize: 10,
    fontWeight: 900,
    color: "#fff",
    letterSpacing: "0.6px",
    background: "#111",
    border: "1px solid #111",
    padding: "4px 10px",
    borderRadius: 999,
  },
  haTagAway: {
    fontSize: 10,
    fontWeight: 900,
    color: "#111",
    letterSpacing: "0.6px",
    background: "#f3f4f6",
    border: "1px solid #e5e7eb",
    padding: "4px 10px",
    borderRadius: 999,
  },
};

// 결과 버튼 전용(승/패/무/모름) - HomePage의 resultStyle 톤
const resultBtnStyle = {
  win: {
    activeBg: "#2563eb",
    activeColor: "#fff",
    inactiveBorder: "rgba(37,99,235,0.25)",
    inactiveColor: "#2563eb",
  },
  lose: {
    activeBg: "#dc2626",
    activeColor: "#fff",
    inactiveBorder: "rgba(220,38,38,0.25)",
    inactiveColor: "#dc2626",
  },
  draw: {
    activeBg: "#6b7280",
    activeColor: "#fff",
    inactiveBorder: "rgba(107,114,128,0.25)",
    inactiveColor: "#6b7280",
  },
  unknown: {
    activeBg: "#111",
    activeColor: "#fff",
    inactiveBorder: "#e5e7eb",
    inactiveColor: "#111",
  },
};
