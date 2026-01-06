import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageContainer from "../components/PageContainer.jsx";

import { deleteDiaryById, fetchDiaryById } from "../lib/api.js";
import {
  fetchDiaryPhotos,
  fetchDiaryLikes,
  likeDiary,
  unlikeDiary,
  fetchDiaryComments,
  createDiaryComment,
  deleteDiaryComment,
} from "../lib/api.js";
import { getGuestUserId } from "../lib/auth.js";

function formatDate(dateLike) {
  if (!dateLike) return "";
  const d = new Date(dateLike);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd}`;
}

// 지도 섹션 대신 링크 대체
function openMapLink(place) {
  const q = encodeURIComponent(place || "");
  return {
    kakao: `https://map.kakao.com/link/search/${q}`,
    naver: `https://map.naver.com/v5/search/${q}`,
    google: `https://www.google.com/maps/search/?api=1&query=${q}`,
  };
}

export default function DiaryDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const myUserId = getGuestUserId();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [photos, setPhotos] = useState([]);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerSrc, setViewerSrc] = useState("");

  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);

  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

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

  useEffect(() => {
    if (!viewerOpen) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setViewerOpen(false);
        setViewerSrc("");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [viewerOpen]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await fetchDiaryPhotos(id);
        if (alive) setPhotos(list);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetchDiaryLikes(id);
        if (!alive) return;
        setLikeCount(r.like_count);
        setLiked(r.liked);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await fetchDiaryComments(id);
        if (alive) setComments(list);
      } catch (e) {
        console.error(e);
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

  if (loading) return <div style={{ padding: 24 }}>불러오는 중...</div>;

  if (err || !data) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ color: "crimson" }}>{err || "데이터 없음"}</div>
        <button onClick={() => nav(-1)} style={ui.btnOutline}>
          뒤로가기
        </button>
      </div>
    );
  }

  return (
    <PageContainer>
      <button onClick={() => nav(-1)} style={ui.btnOutline}>
        ← 뒤로
      </button>

      <h1 style={{ margin: "12px 0 0" }}>기록 상세</h1>

      <div style={ui.card}>
        <div style={{ fontSize: 22, fontWeight: 900 }}>
          {data.team_home}
          {data.team_away ? (
            <>
              {" "}
              <span style={{ color: "#777", fontWeight: 700 }}>vs</span>{" "}
              {data.team_away}
            </>
          ) : null}

          {data.result !== "unknown" && (
            <div style={{ marginTop: 10, fontSize: 14, fontWeight: 900 }}>
              결과:{" "}
              <span style={ui.resultPill(data.result)}>
                {data.result === "win" && "승"}
                {data.result === "lose" && "패"}
                {data.result === "draw" && "무"}
              </span>
              {data.score_home !== null && data.score_away !== null && (
                <>
                  {" "}
                  · {data.score_home} : {data.score_away}
                </>
              )}
            </div>
          )}

          {photos.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontWeight: 900, marginBottom: 8 }}>사진</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {photos.map((p) => (
                  <img
                    key={p.id}
                    src={encodeURI(p.url)}
                    alt=""
                    onClick={() => {
                      setViewerSrc(encodeURI(p.url));
                      setViewerOpen(true);
                    }}
                    style={ui.photoThumb}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: 8, color: "#666" }}>
          {formatDate(data.game_date)} · {data.venue_name}
        </div>

        <div style={{ marginTop: 12, fontWeight: 800 }}>{data.one_liner}</div>

        <div style={{ marginTop: 10, fontSize: 12, color: "#666" }}>
          공개범위: <b>{data.visibility}</b>
        </div>
      </div>

      {/* 장소 링크 */}
      <div style={{ marginTop: 14 }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>장소</div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a
            href={openMapLink(data.venue_name).naver}
            target="_blank"
            rel="noreferrer"
            style={ui.linkBtn}
            onMouseEnter={(e) =>
              Object.assign(e.currentTarget.style, mapHover.naver)
            }
            onMouseLeave={(e) =>
              Object.assign(e.currentTarget.style, ui.linkBtn)
            }
          >
            📍 네이버지도
          </a>

          <a
            href={openMapLink(data.venue_name).kakao}
            target="_blank"
            rel="noreferrer"
            style={ui.linkBtn}
            onMouseEnter={(e) =>
              Object.assign(e.currentTarget.style, mapHover.kakao)
            }
            onMouseLeave={(e) =>
              Object.assign(e.currentTarget.style, ui.linkBtn)
            }
          >
            📍 카카오맵
          </a>

          <a
            href={openMapLink(data.venue_name).google}
            target="_blank"
            rel="noreferrer"
            style={ui.linkBtn}
            onMouseEnter={(e) =>
              Object.assign(e.currentTarget.style, mapHover.google)
            }
            onMouseLeave={(e) =>
              Object.assign(e.currentTarget.style, ui.linkBtn)
            }
          >
            📍 구글맵
          </a>
        </div>
      </div>

      {/* 좋아요 */}
      <div style={ui.row}>
        <div style={{ fontSize: 13, fontWeight: 900, color: "#555" }}>
          작성자: {data.nickname ?? "?"}
        </div>

        <button
          type="button"
          onClick={async () => {
            try {
              const r = liked ? await unlikeDiary(id) : await likeDiary(id);
              setLiked(r.liked);
              setLikeCount(r.like_count);
            } catch (e) {
              console.error(e);
              alert("좋아요 처리 실패");
            }
          }}
          style={ui.likeBtn(liked)}
        >
          {liked ? "♥" : "♡"} 좋아요 {likeCount}
        </button>
      </div>

      {/* 수정/삭제 */}
      <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
        <button onClick={() => nav(`/write/${id}`)} style={ui.editBtn}>
          수정
        </button>
      </div>

      <div style={{ marginTop: 18 }}>
        <button
          onClick={onDelete}
          disabled={deleting}
          style={ui.btnDanger(deleting)}
        >
          {deleting ? "삭제 중..." : "삭제"}
        </button>
      </div>

      {/* 댓글 */}
      <div style={{ marginTop: 18 }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>
          댓글 {comments.length}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="댓글을 입력하세요 (최대 300자)"
            style={ui.input}
          />
          <button
            type="button"
            disabled={commentLoading}
            onClick={async () => {
              const text = commentText.trim();
              if (!text) return;
              if (text.length > 300) return alert("댓글은 300자 이하입니다.");

              setCommentLoading(true);
              try {
                const created = await createDiaryComment(id, text);
                setComments((prev) => [...prev, created]);
                setCommentText("");
              } catch (e) {
                console.error(e);
                alert("댓글 작성 실패");
              } finally {
                setCommentLoading(false);
              }
            }}
            style={ui.primaryBtn(commentLoading)}
          >
            {commentLoading ? "등록중" : "등록"}
          </button>
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          {comments.map((c) => (
            <div key={c.id} style={ui.commentCard}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ fontWeight: 900 }}>{c.nickname ?? "unknown"}</div>
                <div style={{ fontSize: 12, color: "#777", fontWeight: 700 }}>
                  {new Date(c.created_at).toLocaleString()}
                </div>

                {myUserId && Number(c.user_id) === Number(myUserId) && (
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = window.confirm("이 댓글을 삭제할까요?");
                      if (!ok) return;
                      try {
                        await deleteDiaryComment(id, c.id);
                        setComments((prev) =>
                          prev.filter((x) => x.id !== c.id)
                        );
                      } catch (e) {
                        console.error(e);
                        alert("댓글 삭제 실패");
                      }
                    }}
                    style={ui.btnGhostDanger}
                  >
                    삭제
                  </button>
                )}
              </div>

              <div style={{ marginTop: 6, fontWeight: 700 }}>{c.content}</div>
            </div>
          ))}
        </div>
      </div>

      {viewerOpen && (
        <div
          onClick={() => {
            setViewerOpen(false);
            setViewerSrc("");
          }}
          style={ui.viewerBackdrop}
        >
          <img
            src={viewerSrc}
            alt=""
            onClick={(e) => e.stopPropagation()}
            style={ui.viewerImage}
          />

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setViewerOpen(false);
              setViewerSrc("");
            }}
            style={ui.viewerClose}
          >
            ✕
          </button>
        </div>
      )}
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

  btnOutline: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 900,
    color: "#111",
  },

  row: {
    marginTop: 10,
    display: "flex",
    alignItems: "center",
    gap: 10,
  },

  btnDanger: (disabled) => ({
    width: "100%",
    padding: "12px 12px",
    borderRadius: 12,
    border: "none",
    background: "#dc2626",
    color: "#fff",
    fontSize: 16,
    fontWeight: 900,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.7 : 1,
  }),

  btnGhostDanger: {
    marginLeft: "auto",
    border: "none",
    background: "transparent",
    color: "#dc2626",
    fontWeight: 900,
    cursor: "pointer",
  },

  likeBtn: (liked) => ({
    marginLeft: "auto",
    padding: "8px 12px",
    borderRadius: 999,
    border: "1px solid #e5e7eb",
    background: liked ? "#111" : "#fff",
    color: liked ? "#fff" : "#111",
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: liked ? "0 6px 16px rgba(0,0,0,0.10)" : "none",
  }),

  editBtn: {
    flex: 1,
    padding: "12px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: "#fff",
    fontWeight: 900,
    cursor: "pointer",
  },

  linkBtn: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: "#fff",
    fontWeight: 900,
    color: "#111",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  },

  input: {
    flex: 1,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    outline: "none",
    fontWeight: 800,
    background: "#fff",
  },

  primaryBtn: (disabled) => ({
    padding: "10px 12px",
    borderRadius: 12,
    border: "none",
    background: "#111",
    color: "#fff",
    fontWeight: 900,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.7 : 1,
    whiteSpace: "nowrap",
  }),

  commentCard: {
    border: "1px solid #eee",
    borderRadius: 16,
    padding: 12,
    background: "#fff",
  },

  resultPill: (r) => ({
    display: "inline-flex",
    alignItems: "center",
    padding: "2px 8px",
    borderRadius: 999,
    fontWeight: 900,
    ...(resultChip[r] ?? {}),
  }),

  photoThumb: {
    width: 120,
    height: 120,
    objectFit: "cover",
    borderRadius: 14,
    cursor: "zoom-in",
  },

  viewerBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.75)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    zIndex: 9999,
  },

  viewerImage: {
    maxWidth: "95vw",
    maxHeight: "85vh",
    objectFit: "contain",
    borderRadius: 14,
    background: "#000",
  },

  viewerClose: {
    position: "fixed",
    top: 14,
    right: 14,
    border: "none",
    borderRadius: 999,
    padding: "10px 12px",
    fontWeight: 900,
    background: "rgba(255,255,255,0.15)",
    color: "#fff",
    cursor: "pointer",
  },
};

const resultChip = {
  win: {
    color: "#2563eb",
    background: "rgba(37,99,235,0.10)",
    border: "1px solid rgba(37,99,235,0.25)",
  },
  lose: {
    color: "#dc2626",
    background: "rgba(220,38,38,0.10)",
    border: "1px solid rgba(220,38,38,0.25)",
  },
  draw: {
    color: "#6b7280",
    background: "rgba(107,114,128,0.12)",
    border: "1px solid rgba(107,114,128,0.22)",
  },
};

const mapHover = {
  kakao: {
    background: "#fee500",
    border: "1px solid #fee500",
    color: "#000",
  },
  naver: {
    background: "#03c75a",
    border: "1px solid #03c75a",
    color: "#fff",
  },
  google: {
    background: "#f29900",
    border: "1px solid #f29900",
    color: "#fff",
  },
};
