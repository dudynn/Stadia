import express from "express";
import { pool } from "../db.js";

const router = express.Router();

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
    if (one_liner.length > 120) {
      return res.status(400).json({ message: "one_liner too long (<=120)" });
    }

    const vis = visibility ?? "private";

    const result = await pool.query(
      `
      INSERT INTO diaries
        (user_id, sport, team_home, team_away, game_date, venue_name, one_liner, visibility)
      VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *
      `,
      [
        String(user_id),
        sport,
        team_home,
        team_away ?? null,
        game_date,
        venue_name,
        one_liner,
        vis,
      ]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
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
      values.push(userId);
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

    const result = await pool.query(
      `
      SELECT *
      FROM diaries
      ${where}
      ORDER BY game_date DESC, created_at DESC
      `,
      values
    );

    return res.json(result.rows);
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
    const result = await pool.query("SELECT * FROM diaries WHERE id=$1", [id]);

    if (!result.rows.length)
      return res.status(404).json({ message: "not found" });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "internal server error" });
  }
});

/**
 * PUT /api/diaries/:id
 * 수정
 */
// router.put("/:id", async (req, res) => {
//   try {
//     const id = Number(req.params.id);
//     const {
//       sport,
//       team_home,
//       team_away,
//       game_date,
//       venue_name,
//       one_liner,
//       visibility,
//     } = req.body;

//     if (!id) return res.status(400).json({ error: "invalid id" });

//     // 최소 검증
//     if (!sport || !team_home || !game_date || !venue_name || !one_liner) {
//       return res.status(400).json({ error: "missing fields" });
//     }

//     const result = await pool.query(
//       `
//       UPDATE diaries SET
//         team_home = $1,
//         team_away = $2,
//         game_date = $3,
//         venue_name = $4,
//         one_liner = $5,
//         visibility = $6,
//         updated_at = now()
//       WHERE id = $7
//       RETURNING *
//       `,
//       [
//         team_home,
//         team_away ?? null,
//         game_date,
//         venue_name,
//         one_liner,
//         visibility ?? "private",
//         id,
//       ]
//     );

//     const params = [
//       sport,
//       team_home,
//       team_away ?? null,
//       game_date,
//       venue_name,
//       one_liner,
//       visibility ?? null,
//       id,
//     ];

//     const { rows } = await req.db.query(result, params);
//     if (!rows.length) return res.status(404).json({ error: "not found" });
//     res.json(rows[0]);
//   } catch (e) {
//     console.error(e);
//     res.status(500).send(String(e));
//   }
// });
router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const {
      sport,
      team_home,
      team_away,
      game_date,
      venue_name,
      one_liner,
      visibility,
    } = req.body;

    if (!id) return res.status(400).json({ error: "invalid id" });

    if (!sport || !team_home || !game_date || !venue_name || !one_liner) {
      return res.status(400).json({ error: "missing fields" });
    }

    const result = await pool.query(
      `
      UPDATE diaries SET
        sport = $1,
        team_home = $2,
        team_away = $3,
        game_date = $4,
        venue_name = $5,
        one_liner = $6,
        visibility = $7,
        updated_at = now()
      WHERE id = $8
      RETURNING *
      `,
      [
        sport,
        team_home,
        team_away ?? null,
        game_date,
        venue_name,
        one_liner,
        visibility ?? "private",
        id,
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "not found" });
    }

    return res.json(result.rows[0]);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "internal server error" });
  }
});

/**
 * DELETE /api/diaries/:id
 */
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "invalid id" });

    const result = await pool.query(
      "DELETE FROM diaries WHERE id = $1 RETURNING id",
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "not found" });
    }

    return res.json({ ok: true, id: String(result.rows[0].id) });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "delete failed" });
  }
});

export default router;
