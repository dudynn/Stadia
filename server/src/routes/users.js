import express from "express";
import { pool } from "../db.js";

const router = express.Router();

/**
 * GET /api/users/:id/favorites
 * 응원팀 목록 가져오기
 */

router.get("/:id/favorites", async (req, res) => {
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
});

export default router;
