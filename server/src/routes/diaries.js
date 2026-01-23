import express from "express";
import { pool } from "../db.js";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { error } from "console";
import fs from "fs";

const router = express.Router();

const uploadDir = path.join(process.cwd(), "uploads");

fs.mkdirSync(uploadDir, { recursive: true });

const uploads = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const safe = `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`;
      cb(null, safe);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

/**
 * POST /api/diaries
 * 기록 생성
 */
router.post("/", async (req, res) => {
  try {
    const {
      user_id,
      sport,
      team_home,
      team_away,
      game_date,
      venue_name,
      one_liner,
      visibility,
      result,
      score_home,
      score_away,
    } = req.body;

    if (
      !user_id ||
      !sport ||
      !team_home ||
      !game_date ||
      !venue_name ||
      !one_liner
    ) {
      return res.status(400).json({ message: "required field missing" });
    }
    if (!["baseball", "volleyball"].includes(sport)) {
      return res.status(400).json({ message: "sport invalid" });
    }
    if (String(one_liner).length > 120) {
      return res.status(400).json({ message: "one_liner too long (<=120)" });
    }

    const safeResult = result ?? "unknown";
    const safeScoreHome =
      score_home === "" || score_home === undefined ? null : Number(score_home);
    const safeScoreAway =
      score_away === "" || score_away === undefined ? null : Number(score_away);

    if (safeScoreHome !== null && Number.isNaN(safeScoreHome)) {
      return res.status(400).json({ message: "score_home must be number" });
    }
    if (safeScoreAway !== null && Number.isNaN(safeScoreAway)) {
      return res.status(400).json({ message: "score_away must be number" });
    }

    const vis = visibility ?? "private";

    const { rows } = await pool.query(
      `
      INSERT INTO diaries
        (user_id, sport, team_home, team_away, game_date, venue_name, one_liner, visibility, result, score_home, score_away)
      VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *
      `,
      [
        Number(user_id),
        sport,
        team_home,
        team_away ?? null,
        game_date,
        venue_name,
        one_liner,
        vis,
        safeResult,
        safeScoreHome,
        safeScoreAway,
      ]
    );

    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "internal server error" });
  }
});

/**
 * POST /api/diaries/:id/photos
 * 사진 업로드 (최대 3장)
 */
router.post("/:id/photos", uploads.array("photos", 3), async (req, res) => {
  try {
    const diaryId = Number(req.params.id);
    if (!diaryId) return res.status(400).json({ error: "invalid id" });

    const files = req.files ?? [];
    if (!files.length) return res.status(400).json({ error: "no files" });

    const inserted = [];

    for (const f of files) {
      const url = `/uploads/${f.filename}`;
      const r = await pool.query(
        "INSERT INTO diary_photos (diary_id, url) VALUES ($1, $2) RETURNING *",
        [diaryId, url]
      );
      inserted.push(r.rows[0]);
    }

    return res.status(201).json(inserted);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "upload failed" });
  }
});

/**
 * 좋아요 누르기
 */
router.post("/:id/likes", async (req, res) => {
  try {
    const diaryId = Number(req.params.id);
    const { user_id } = req.body;

    if (!diaryId || !user_id) {
      return res.status(400).json({ message: "invalid diaryId or user_id" });
    }

    await pool.query(
      `
      INSERT INTO likes (diary_id, user_id)
      VALUES ($1, $2)
      ON CONFLICT (diary_id, user_id) DO NOTHING
      `,
      [diaryId, Number(user_id)]
    );

    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS like_count FROM likes WHERE diary_id=$1`,
      [diaryId]
    );

    return res.json({
      ok: true,
      like_count: rows[0].like_count,
      my_liked: true,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "internal server error" });
  }
});

/**
 * GET /api/diaries?userId=1&sport=baseball
 * 내 기록 리스트
 */
router.get("/", async (req, res) => {
  try {
    const { userId, sport, visibility } = req.query;

    const conditions = [];
    const values = [];

    if (userId) {
      values.push(Number(userId));
      conditions.push(`d.user_id = $${values.length}`);
    }
    if (sport) {
      values.push(sport);
      conditions.push(`d.sport = $${values.length}`);
    }
    if (visibility) {
      values.push(visibility);
      conditions.push(`d.visibility = $${values.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const { rows } = await pool.query(
      `
      SELECT
        d.*,
        u.nickname,
        COALESCE(lc.like_count, 0) AS like_count
      FROM diaries d
      JOIN users u ON u.id = d.user_id
      LEFT JOIN (
        SELECT diary_id, COUNT(*)::int AS like_count
        FROM likes
        GROUP BY diary_id
      ) lc ON lc.diary_id = d.id
      ${where}
      ORDER BY d.game_date DESC, d.created_at DESC
      `,
      values
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "internal server error" });
  }
});

/**
 * GET /api/diaries/:id
 * 상세 + photos 같이 내려주기
 */
// router.get("/:id", async (req, res) => {
//   try {
//     const id = Number(req.params.id);
//     if (!id) return res.status(400).json({ message: "invalid id" });

//     const { rows } = await pool.query(
//       `
//       SELECT
//         d.*,
//         u.nickname,
//         COALESCE(lc.like_count, 0) AS like_count
//       FROM diaries d
//       JOIN users u ON u.id = d.user_id
//       LEFT JOIN (
//         SELECT diary_id, COUNT(*)::int AS like_count
//         FROM likes
//         GROUP BY diary_id
//       ) lc ON lc.diary_id = d.id
//       WHERE d.id = $1
//       `,
//       [id]
//     );

//     if (!rows.length) return res.status(404).json({ message: "not found" });

//     const diary = rows[0];

//     const photoRes = await pool.query(
//       `SELECT id, url FROM diary_photos WHERE diary_id=$1 ORDER BY id ASC`,
//       [id]
//     );

//     return res.json({ ...diary, photos: photoRes.rows });
//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({ message: "internal server error" });
//   }
// });

/**
 * GET /api/diaries/:id?userId=123
 * 상세 + nickname + like_count + my_liked + photos 같이 내려주기
 */
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "invalid id" });

    const userId = req.query.userId ? Number(req.query.userId) : null;

    const { rows } = await pool.query(
      `
      SELECT
        d.*,
        u.nickname,
        COALESCE(lc.like_count, 0) AS like_count,
        CASE
          WHEN $2::bigint IS NULL THEN false
          WHEN ml.diary_id IS NULL THEN false
          ELSE true
        END AS my_liked
      FROM diaries d
      JOIN users u ON u.id = d.user_id
      LEFT JOIN (
        SELECT diary_id, COUNT(*)::int AS like_count
        FROM likes
        GROUP BY diary_id
      ) lc ON lc.diary_id = d.id
      LEFT JOIN (
        SELECT diary_id
        FROM likes
        WHERE user_id = $2
      ) ml ON ml.diary_id = d.id
      WHERE d.id = $1
      `,
      [id, userId]
    );

    if (!rows.length) return res.status(404).json({ message: "not found" });

    const diary = rows[0];

    const photoRes = await pool.query(
      "SELECT * FROM diary_photos WHERE diary_id=$1 ORDER BY id ASC",
      [id]
    );

    return res.json({ ...diary, photos: photoRes.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "internal server error" });
  }
});

/**
 * GET /api/diaries/:id/photos
 * 사진 조회
 */
router.get("/:id/photos", async (req, res) => {
  try {
    const diaryId = Number(req.params.id);
    const r = await pool.query(
      `SELECT * FROM diary_photos WHERE diary_id=$1 ORDER BY id ASC`,
      [diaryId]
    );
    res.json(r.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "failed" });
  }
});

/**
 * GET /api/diaries/:id/likes?userId=123
 * 좋아요 상태 조회 (카운트 + 내가 눌렀는지)
 */
router.get("/:id/likes", async (req, res) => {
  try {
    const diaryId = Number(req.params.id);
    const userId = req.query.userId ? Number(req.query.userId) : null;

    if (!diaryId) {
      return res.status(400).json({ message: "invalid diaryId" });
    }

    const { rows: cntRows } = await pool.query(
      "SELECT COUNT(*)::int AS like_count FROM likes WHERE diary_id=$1",
      [diaryId]
    );

    let liked = false;
    if (userId) {
      const { rowCount } = await pool.query(
        "SELECT 1 FROM likes WHERE diary_id=$1 AND user_id=$2 LIMIT 1",
        [diaryId, userId]
      );
      liked = rowCount > 0;
    }

    return res.json({ like_count: cntRows[0].like_count, liked });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "internal server error" });
  }
});

/**
 * GET /api/diaries/:id/comments
 * 댓글 리스트 (닉네임 포함)
 */
router.get("/:id/comments", async (req, res) => {
  try {
    const diaryId = Number(req.params.id);
    if (!diaryId) return res.status(400).json({ message: "invalid id" });

    const { rows } = await pool.query(
      `
      SELECT
        c.id,
        c.diary_id,
        c.user_id,
        u.nickname,
        c.content,
        c.created_at,
        c.parent_comment_id
      FROM comments c
      JOIN users u ON u.id = c.user_id
      WHERE c.diary_id = $1
      ORDER BY c.created_at ASC
      `,
      [diaryId]
    );

    return res.json(rows);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "internal server error" });
  }
});

/**
 * POST /api/diaries/:id/comments
 * body: { user_id, content }
 */
router.post("/:id/comments", async (req, res) => {
  try {
    const diaryId = Number(req.params.id);
    const userId = Number(req.body.user_id);
    const content = String(req.body.content ?? "").trim();
    const parentCommentId =
      req.body.parent_comment_id == null
        ? null
        : Number(req.body.parent_comment_id);
    const parentId = req.body.parent_comment_id ?? null;

    if (!diaryId || !userId) {
      return res.status(400).json({ message: "invalid id" });
    }
    if (!content) return res.status(400).json({ message: "content required" });
    if (content.length > 300)
      return res.status(400).json({ message: "content too long (<=300)" });

    // parent가 있으면 "같은 diary의 댓글"인지 검증 (중요함)
    if (parentCommentId) {
      const check = await pool.query(
        "SELECT 1 FROM comments WHERE id=$1 AND diary_id=$2",
        [parentCommentId, diaryId]
      );

      if (check.rowCount === 0) {
        return res.status(400).json({ message: "invalid parent_comment_id" });
      }
    }

    const { rows } = await pool.query(
      `
      INSERT INTO comments (diary_id, user_id, content, parent_comment_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id, diary_id, user_id, content, parent_comment_id, created_at
      `,
      [diaryId, userId, content, parentCommentId]
    );

    // nickname 포함해서 내려주기
    const nickRes = await pool.query("SELECT nickname FROM users WHERE id=$1", [
      userId,
    ]);

    return res.status(201).json({
      ...rows[0],
      nickname: nickRes.rows[0]?.nickname ?? "unknown",
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "internal server error" });
  }
});

/**
 * PUT /api/diaries/:id
 * 수정
 */
router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "invalid id" });

    const {
      sport,
      team_home,
      team_away,
      game_date,
      venue_name,
      one_liner,
      visibility,
      result,
      score_home,
      score_away,
    } = req.body;

    if (!sport || !team_home || !game_date || !venue_name || !one_liner) {
      return res.status(400).json({ error: "missing fields" });
    }

    const safeResult = result ?? "unknown";
    const safeScoreHome =
      score_home === "" || score_home === undefined ? null : Number(score_home);
    const safeScoreAway =
      score_away === "" || score_away === undefined ? null : Number(score_away);

    if (safeScoreHome !== null && Number.isNaN(safeScoreHome)) {
      return res.status(400).json({ message: "score_home must be number" });
    }
    if (safeScoreAway !== null && Number.isNaN(safeScoreAway)) {
      return res.status(400).json({ message: "score_away must be number" });
    }

    const vis = visibility ?? "private";

    const { rows } = await pool.query(
      `
      UPDATE diaries SET
        sport = $1,
        team_home = $2,
        team_away = $3,
        game_date = $4,
        venue_name = $5,
        one_liner = $6,
        visibility = $7,
        result = $8,
        score_home = $9,
        score_away = $10,
        updated_at = now()
      WHERE id = $11
      RETURNING *
      `,
      [
        sport,
        team_home,
        team_away ?? null,
        game_date,
        venue_name,
        one_liner,
        vis,
        safeResult,
        safeScoreHome,
        safeScoreAway,
        id,
      ]
    );

    if (!rows.length) return res.status(404).json({ error: "not found" });
    return res.json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "internal server error" });
  }
});

/**
 * DELETE /api/diaries/:id
 * 삭제
 */
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "invalid id" });

    const { rows, rowCount } = await pool.query(
      "DELETE FROM diaries WHERE id = $1 RETURNING id",
      [id]
    );

    if (rowCount === 0) return res.status(404).json({ error: "not found" });
    return res.json({ ok: true, id: String(rows[0].id) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "internal server error" });
  }
});

/**
 * DELETE /api/diaries/:id/photos/:photoId
 * 사진 삭제
 */
router.delete("/:id/photos/:photoId", async (req, res) => {
  try {
    const photoId = Number(req.params.photoId);
    const r = await pool.query(
      `DELETE FROM diary_photos WHERE id=$1 RETURNING id`,
      [photoId]
    );
    if (!r.rowCount) return res.status(404).json({ error: "not found" });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "failed" });
  }
});

/**
 * 좋아요 취소
 */
router.delete("/:id/likes", async (req, res) => {
  try {
    const diaryId = Number(req.params.id);
    const userId = Number(req.query.userId);

    if (!diaryId || !userId) {
      return res.status(400).json({ message: "invalid diaryId or userId" });
    }

    await pool.query(`DELETE FROM likes WHERE diary_id=$1 AND user_id=$2`, [
      diaryId,
      userId,
    ]);

    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS like_count FROM likes WHERE diary_id=$1`,
      [diaryId]
    );

    return res.json({
      ok: true,
      like_count: rows[0].like_count,
      my_liked: false,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "internal server error" });
  }
});

/**
 * DELETE /api/diaries/:id/comments/:commentId?userId=123
 */
router.delete("/:id/comments/:commentId", async (req, res) => {
  try {
    const diaryId = Number(req.params.id);
    const commentId = Number(req.params.commentId);
    const userId = Number(req.query.userId);

    if (!diaryId || !commentId || !userId)
      return res.status(400).json({ message: "invalid id" });

    const r = await pool.query(
      `
      DELETE FROM comments
      WHERE id=$1 AND diary_id=$2 AND user_id=$3
      RETURNING id
      `,
      [commentId, diaryId, userId]
    );

    if (!r.rowCount) {
      return res.status(403).json({ message: "cannot delete" });
    }

    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "internal server error" });
  }
});

export default router;
