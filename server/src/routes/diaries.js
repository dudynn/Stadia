import express from "express";
import { pool } from "../db.js";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { error } from "console";
import fs from "fs";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, "..", "..", "uploads"); // server/uploads

const uploads = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      fs.mkdirSync(uploadDir, { recursive: true }); // 없으면 생성
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()} - ${Math.random().toString(16).slice(2)}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB 제한
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

    // 필수값 체크
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

    // result 기본값 처리
    const safeResult = result ?? "unknown";

    // 점수는 숫자거나 null만 허용
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
        game_date, // 'YYYY-MM-DD' 형태면 OK
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
 * 사진 업로드
 */
router.post("/:id/photos", uploads.array("photos", 3), async (req, res) => {
  try {
    const diaryId = Number(req.params.id);
    if (!diaryId) return res.status(400).json({ error: "invalid id" });

    const files = req.files ?? [];
    if (!files.length) return res.status(400).json({ error: "no files" });

    // pool 사용
    const inserted = [];

    for (const f of files) {
      const url = `/uploads/${f.filename}`;
      const r = await pool.query(
        "INSERT INTO diary_photos (diary_id, url) VALUES ($1, $2)",
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
      conditions.push(`user_id = $${values.length}`);
    }
    if (sport) {
      values.push(sport);
      conditions.push(`sport = $${values.length}`);
    }
    if (visibility) {
      values.push(visibility);
      conditions.push(`visibility = $${values.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const { rows } = await pool.query(
      `
      SELECT *
      FROM diaries
      ${where}
      ORDER BY game_date DESC, created_at DESC
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
 * 상세
 */
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { rows } = await pool.query("SELECT * FROM diaries WHERE id=$1", [
      id,
    ]);

    if (!rows.length) return res.status(404).json({ message: "not found" });
    return res.json(rows[0]);
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

    // 최소 검증
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

export default router;
