import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { deleteDiaryById, fetchDiaryById } from "../lib/api.js";
import KakaoMapByKeyword from "../components/KakaoMapByKeyword.jsx";
import PageContainer from "../components/PageContainer.jsx";

function formatDate(dateLike) {
  if (!dateLike) return "";
  const d = new Date(dateLike);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd}`;
}

export default function DiaryDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr("");
        const d = await fetchDiaryById(id);
        if (alive) setData(d);
      } catch (e) {
        console.error(e);
        if (alive) setErr("기록을 불러오지 못했습니다.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [id]);

  const onDelete = async () => {
    const ok = window.confirm("이 기록을 삭제할까요?");
    if (!ok) return;

    setDeleting(true);
    try {
      await deleteDiaryById(id);
      nav("/", { replace: true });
    } catch (e) {
      alert("삭제에 실패했습니다.");
      console.error(e);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 24 }}>불러오는 중...</div>;
  }

  if (err || !data) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ color: "crimson" }}>{err || "데이터 없음"}</div>
        <button onClick={() => nav(-1)} style={btnOutline}>
          뒤로가기
        </button>
      </div>
    );
  }

  return (
    <PageContainer>
      <button onClick={() => nav(-1)} style={btnOutline}>
        ← 뒤로
      </button>

      <h1 style={{ margin: "12px 0 0" }}>기록 상세</h1>

      <div style={card}>
        <div style={{ fontSize: 22, fontWeight: 900 }}>
          {data.team_home}
          {data.team_away ? (
            <>
              {" "}
              <span style={{ color: "#777", fontWeight: 700 }}>vs</span>{" "}
              {data.team_away}
            </>
          ) : null}
        </div>

        <div style={{ marginTop: 8, color: "#666" }}>
          {formatDate(data.game_date)} · {data.venue_name}
        </div>

        <div style={{ marginTop: 12, fontWeight: 800 }}>{data.one_liner}</div>

        <div style={{ marginTop: 10, fontSize: 12, color: "#666" }}>
          공개범위: <b>{data.visibility}</b>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>지도</div>
        <KakaoMapByKeyword keyword={data.venue_name} />
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
        <button onClick={() => nav(`/write/${id}`)} style={styles.edit}>
          수정
        </button>
      </div>

      <div style={{ marginTop: 18 }}>
        <button onClick={onDelete} disabled={deleting} style={btnDanger}>
          {deleting ? "삭제 중..." : "삭제"}
        </button>
      </div>
    </PageContainer>
  );
}

const card = {
  border: "1px solid #eee",
  borderRadius: 18,
  padding: 16,
  marginTop: 12,
  background: "#fff",
};

const btnOutline = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #ddd",
  background: "#fff",
  cursor: "pointer",
};

const btnDanger = {
  width: "100%",
  padding: "12px 12px",
  borderRadius: 12,
  border: "none",
  background: "crimson",
  color: "#fff",
  fontSize: 16,
  fontWeight: 900,
  cursor: "pointer",
};

const styles = {
  edit: {
    flex: 1,
    padding: "12px",
    borderRadius: 12,
    border: "1px solid #ddd",
    background: "#fff",
    fontWeight: 700,
  },
};
