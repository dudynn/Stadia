import express from "express";
import { pool } from "../db.js";

const router = express.Router();

/**
 * POST /api/users/guest
 * 게스트 유저 생성 (닉네임 저장)
 * body: { nickname: String }
 * return: { user: { id, nickname, mode }, token: null }
 */
router.post("/guest", async (req, res, next) => {
  try {
    const nickname = String(req.body?.nickname ?? "").trim();

    if (!nickname) {
      return res.status(400).json({ message: "nickname is required" });
    }
    if (nickname.length > 30) {
      return res.status(400).json({ message: "nickname must be <= 30 chars" });
    }

    const q = `
      INSERT INTO users (nickname, created_at)
      VALUES ($1, NOW())
      RETURNING id, nickname;
    `;

    const result = await pool.query(q, [nickname]);
    const userRow = result.rows[0];

    return res.status(201).json({
      user: {
        id: String(userRow.id),
        nickname: userRow.nickname,
        mode: "guest",
      },
      token: null,
    });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/users/:id/favorites
 * 응원팀 목록 가져오기
 */
router.get("/:id/favorites", async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    if (!userId) {
      return res.status(400).json({ message: "invalid user id" });
    }

    const result = await pool.query(
      `SELECT user_id, sport, gender, team_code, updated_at
       FROM favorites
       WHERE user_id = $1
       ORDER BY sport, gender`,
      [userId]
    );

    res.json(result.rows);
  } catch (e) {
    next(e);
  }
});

/**
 * PUT /api/users/:id/favorites
 * 응원팀 저장 (업서트)
 * body: { sport, gender, team_code }
 */
router.put("/:id/favorites", async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    const { sport, gender, team_code } = req.body ?? {};

    if (!userId) return res.status(400).json({ message: "invalid user id" });
    if (!sport || !gender || team_code == null) {
      return res.status(400).json({ message: "missing fields" });
    }

    const q = `
      INSERT INTO favorites (user_id, sport, gender, team_code, updated_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (user_id, sport, gender)
      DO UPDATE SET team_code = EXCLUDED.team_code, updated_at = NOW()
      RETURNING user_id, sport, gender, team_code, updated_at;
    `;

    const result = await pool.query(q, [userId, sport, gender, team_code]);
    return res.json(result.rows[0]);
  } catch (e) {
    next(e);
  }
});

export default router;
