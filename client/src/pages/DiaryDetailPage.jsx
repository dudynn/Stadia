import { useEffect, useMemo, useState } from "react";
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

function openMapLink(place) {
  const q = encodeURIComponent(place || "");
  return {
    kakao: `https://map.kakao.com/link/search/${q}`,
    naver: `https://map.naver.com/v5/search/${q}`,
    google: `https://www.google.com/maps/search/?api=1&query=${q}`,
  };
}

// flat -> tree
function buildCommentTree(list) {
  const map = new Map();
  const roots = [];

  list.forEach((c) => {
    map.set(Number(c.id), {
      ...c,
      id: Number(c.id),
      user_id: Number(c.user_id),
      parent_comment_id:
        c.parent_comment_id == null ? null : Number(c.parent_comment_id),
      children: [],
    });
  });

  map.forEach((node) => {
    if (node.parent_comment_id) {
      const parent = map.get(node.parent_comment_id);
      if (parent) parent.children.push(node);
      else roots.push(node);
    } else {
      roots.push(node);
    }
  });

  // 정렬(원하면 바꿔도 됨): 오래된 순
  const sortRecursively = (arr) => {
    arr.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    arr.forEach((n) => sortRecursively(n.children));
  };
  sortRecursively(roots);

  return roots;
}

function CommentNode({
  node,
  depth,
  replyTo,
  replyText,
  setReplyTo,
  setReplyText,
  submitComment,
  myUserId,
  onDeleteComment,
}) {
  const isMine = myUserId && Number(node.user_id) === Number(myUserId);

  return (
    <div style={{ marginLeft: depth * 16 }}>
      <div style={ui.commentCard}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ fontWeight: 900 }}>{node.nickname ?? "unknown"}</div>
          <div style={{ fontSize: 12, color: "#777", fontWeight: 700 }}>
            {new Date(node.created_at).toLocaleString()}
          </div>

          {isMine && (
            <button
              type="button"
              onClick={() => onDeleteComment(node.id)}
              style={ui.btnGhostDanger}
            >
              삭제
            </button>
          )}
        </div>

        <div style={{ marginTop: 6, fontWeight: 700 }}>{node.content}</div>

        <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
          <button
            type="button"
            style={ui.replyBtn}
            onClick={() => {
              setReplyTo(node.id);
              setReplyText("");
            }}
          >
            답글
          </button>

          {replyTo === node.id && (
            <button
              type="button"
              style={ui.replyBtn}
              onClick={() => {
                setReplyTo(null);
                setReplyText("");
              }}
            >
              취소
            </button>
          )}
        </div>

        {replyTo === node.id && (
          <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
            <input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="답글을 입력하세요 (최대 300자)"
              style={ui.input}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitComment({ parentId: node.id });
              }}
            />
            <button
              type="button"
              onClick={() => submitComment({ parentId: node.id })}
              style={ui.primaryBtn(false)}
            >
              등록
            </button>
          </div>
        )}
      </div>

      {node.children?.length > 0 && (
        <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
          {node.children.map((child) => (
            <CommentNode
              key={child.id}
              node={child}
              depth={depth + 1}
              replyTo={replyTo}
              replyText={replyText}
              setReplyTo={setReplyTo}
              setReplyText={setReplyText}
              submitComment={submitComment}
              myUserId={myUserId}
              onDeleteComment={onDeleteComment}
            />
          ))}
        </div>
      )}
    </div>
  );
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

  // reply state (하나만 열리게)
  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState("");

  const commentTree = useMemo(() => buildCommentTree(comments), [comments]);

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

  const submitComment = async ({ parentId = null } = {}) => {
    const text = (parentId ? replyText : commentText).trim();
    if (!text) return;
    if (text.length > 300) return alert("댓글은 300자 이하입니다.");

    setCommentLoading(true);
    try {
      // ✅ parentId 전달
      const created = await createDiaryComment(id, text, parentId);

      setComments((prev) => [...prev, created]);

      if (parentId) {
        setReplyText("");
        setReplyTo(null);
      } else {
        setCommentText("");
      }
    } catch (e) {
      console.error(e);
      alert("댓글 작성 실패");
    } finally {
      setCommentLoading(false);
    }
  };

  const onDeleteComment = async (commentId) => {
    const ok = window.confirm("이 댓글을 삭제할까요?");
    if (!ok) return;

    try {
      await deleteDiaryComment(id, commentId);
      setComments((prev) =>
        prev.filter((x) => Number(x.id) !== Number(commentId)),
      );

      // 답글 입력창이 삭제된 댓글에 열려있으면 닫기
      if (Number(replyTo) === Number(commentId)) {
        setReplyTo(null);
        setReplyText("");
      }
    } catch (e) {
      console.error(e);
      alert("댓글 삭제 실패");
    }
  };

  const onDeleteDiary = async () => {
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
            style={ui.linkBtnNaver}
          >
            📍 네이버지도
          </a>
          <a
            href={openMapLink(data.venue_name).kakao}
            target="_blank"
            rel="noreferrer"
            style={ui.linkBtnKakao}
          >
            📍 카카오맵
          </a>
          <a
            href={openMapLink(data.venue_name).google}
            target="_blank"
            rel="noreferrer"
            style={ui.linkBtnGoogle}
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
          onClick={onDeleteDiary}
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

        {/* 최상위 댓글 입력 */}
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
            onClick={() => submitComment()}
            style={ui.primaryBtn(commentLoading)}
          >
            {commentLoading ? "등록 중" : "등록"}
          </button>
        </div>

        {/* 트리 렌더 */}
        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          {commentTree.length === 0 ? (
            <div style={{ color: "#666", fontWeight: 700 }}>
              아직 댓글이 없어요. 첫 댓글을 남겨보세요!
            </div>
          ) : (
            commentTree.map((node) => (
              <CommentNode
                key={node.id}
                node={node}
                depth={0}
                replyTo={replyTo}
                replyText={replyText}
                setReplyTo={setReplyTo}
                setReplyText={setReplyText}
                submitComment={submitComment}
                myUserId={myUserId}
                onDeleteComment={onDeleteComment}
              />
            ))
          )}
        </div>
      </div>

      {/* 사진 뷰어 */}
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
    marginTop: 20,
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

  linkBtnNaver: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    fontWeight: 900,
    color: "#fff",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: "#3bca56",
  },

  linkBtnKakao: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    fontWeight: 900,
    color: "#4174ff",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: "#f4e400",
  },

  linkBtnGoogle: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: "#fff",
    fontWeight: 900,
    color: "#df3732",
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

  replyBtn: {
    border: "1px solid #e5e7eb",
    background: "#fff",
    borderRadius: 999,
    padding: "6px 10px",
    fontWeight: 900,
    cursor: "pointer",
    color: "#111",
    fontSize: 12,
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
