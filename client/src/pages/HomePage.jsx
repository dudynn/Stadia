import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchMyDiaries, fetchDiaries } from "../lib/api.js";
import PageContainer from "../components/PageContainer.jsx";

function fmtDate(dateLike) {
  if (!dateLike) return "";
  const d = new Date(dateLike);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd}`;
}

function Badge({ children, variant }) {
  const styles = {
    baseball: {
      background: "#96CDFF",
      border: "1px solid #C7DBFF",
      color: "black",
    },
    volleyball: {
      background: "#84D2F6",
      border: "1px solid #C7DBFF",
      color: "black",
    },
  };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 800,
        ...styles[variant],
      }}
    >
      {children}
    </span>
  );
}

function VsBlock({ left, right }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <div style={{ flex: 1, fontSize: 22, fontWeight: 900, lineHeight: 1.15 }}>
        {left}
      </div>

      <div style={{ width: 46, textAlign: "center" }}>
        <div style={{ fontSize: 12, fontWeight: 900, color: "#888" }}>VS</div>
        <div
          style={{
            marginTop: 2,
            height: 2,
            background: "#eee",
            borderRadius: 999,
          }}
        />
      </div>

      <div
        style={{
          flex: 1,
          fontSize: 22,
          fontWeight: 900,
          lineHeight: 1.15,
          textAlign: "right",
        }}
      >
        {right ?? "-"}
      </div>
    </div>
  );
}

function DiaryCard({ d, onClick }) {
  const isBaseball = d.sport === "baseball";

  return (
    <div onClick={onClick} style={cardWrap}>
      {/* 상단 메타 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <Badge variant={isBaseball ? "baseball" : "volleyball"}>
          {isBaseball ? "⚾️ 야구" : "🏐 배구"}
        </Badge>

        <div style={{ fontSize: 12, color: "#777", fontWeight: 700 }}>
          {fmtDate(d.game_date)}
        </div>
      </div>

      {/* 중앙 VS */}
      <div style={{ marginTop: 12 }}>
        <VsBlock left={d.team_home} right={d.team_away} />
      </div>

      {/* 경기 결과 */}
      {d.result !== "unknown" && (
        <div
          style={{
            marginTop: 6,
            fontSize: 13,
            fontWeight: 800,
            ...resultStyle[d.result],
          }}
        >
          {d.result === "win" && "승"}
          {d.result === "lose" && "패"}
          {d.result === "draw" && "무"}
          {d.score_home != null && d.score_away != null && (
            <>
              {" "}
              · {d.score_home}:{d.score_away}
            </>
          )}
        </div>
      )}

      {/* 하단 장소/소감 */}
      <div
        style={{ marginTop: 12, color: "#666", fontSize: 13, fontWeight: 700 }}
      >
        {d.venue_name}
      </div>

      <div style={{ marginTop: 10, fontSize: 16, fontWeight: 900 }}>
        {d.one_liner}
      </div>

      {/* 우측 하단 화살표 */}
      <div
        style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}
      >
        <div style={{ fontSize: 12, color: "#888", fontWeight: 800 }}>
          자세히 →
        </div>
      </div>

      {/* 닉네임/좋아요 수 표시 */}
      <div
        style={{ marginTop: 10, fontSize: 12, color: "#666", fontWeight: 800 }}
      >
        {d.nickname ? `${d.nickname} · ` : ""}♥ {d.like_count ?? 0}
      </div>
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();

  const [sport, setSport] = useState("baseball");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [feed, setFeed] = useState("public"); // "mine" | "public"

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr("");

        const data =
          feed === "mine"
            ? await fetchMyDiaries({ sport }) // 내 기록: public/private 전부
            : await fetchDiaries({ sport, visibility: "public" }); // 공개 피드만

        if (alive) setItems(data);
      } catch (e) {
        console.error(e);
        if (alive) setErr("직관 기록을 불러오지 못했습니다.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [sport, feed]);

  return (
    <PageContainer>
      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <h1 style={{ marginTop: 15, fontSize: 20, flex: 1 }}>Stadia Diary</h1>

        {/* 탭 느낌 (select 대신 버튼형) */}
        <div style={tabWrap}>
          <button
            onClick={() => setSport("baseball")}
            style={tabBtn(sport === "baseball")}
          >
            야구
          </button>
          <button
            onClick={() => setSport("volleyball")}
            style={tabBtn(sport === "volleyball")}
          >
            배구
          </button>
        </div>

        {/* 공개 범위 필터 */}
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() => setFeed("mine")}
            style={tabBtn(feed === "mine")}
          >
            내 기록
          </button>
          <button
            onClick={() => setFeed("public")}
            style={tabBtn(feed === "public")}
          >
            공개 피드
          </button>
        </div>
      </div>

      {/* 리스트 */}
      <div style={{ marginTop: 16 }}>
        {loading ? (
          <div style={{ color: "#666" }}>불러오는 중...</div>
        ) : err ? (
          <div style={{ color: "crimson" }}>{err}</div>
        ) : items.length === 0 ? (
          <div style={{ color: "#666" }}>
            아직 기록이 없습니다. 아래 + 버튼으로 첫 직관을 남겨보세요!
          </div>
        ) : (
          items.map((d) => (
            <DiaryCard
              key={d.id}
              d={d}
              onClick={() => navigate(`/diary/${d.id}`)}
            />
          ))
        )}
      </div>
    </PageContainer>
  );
}

const cardWrap = {
  border: "1px solid #eee",
  borderRadius: 18,
  padding: 16,
  marginBottom: 12,
  background: "#fff",
  cursor: "pointer",
  boxShadow: "0 10px 28px rgba(0,0,0,0.05)",
};

const tabWrap = {
  display: "inline-flex",
  border: "1px solid #eee",
  background: "#f6f6f6",
  borderRadius: 999,
  padding: 4,
  gap: 4,
};

const tabBtn = (active) => ({
  border: "none",
  borderRadius: 999,
  padding: "8px 12px",
  fontSize: 13,
  fontWeight: 900,
  cursor: "pointer",
  background: active ? "#111" : "transparent",
  color: active ? "#fff" : "#444",
  boxShadow: active ? "0 6px 16px rgba(0,0,0,0.10)" : "none",
});

const resultStyle = {
  win: {
    color: "#2563eb",
    background: "rgba(37,99,235,0.10)",
    border: "1px solid rgba(37,99,235,0.25)",
    padding: "3px 10px",
    borderRadius: 999,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  },

  lose: {
    color: "#dc2626",
    background: "rgba(220,38,38,0.10)",
    border: "1px solid rgba(220,38,38,0.25)",
    padding: "3px 10px",
    borderRadius: 999,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  },

  draw: {
    color: "#6b7280",
    background: "rgba(107,114,128,0.12)",
    border: "1px solid rgba(107,114,128,0.22)",
    padding: "3px 10px",
    borderRadius: 999,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  },
};
