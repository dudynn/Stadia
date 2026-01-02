import express from "express";
import cors from "cors";
import { pool } from "./db.js";
import userRouter from "./routes/users.js";
import diariesRouter from "./routes/diaries.js";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());

// uploads 폴더 정적 서빙 (URL: /uploads/파일명)
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// 라우터로만 운영 (중복 라우트 제거)
app.use("/api/users", userRouter);
app.use("/api/diaries", diariesRouter);

// DB 연결 확인
app.get("/api/health", async (req, res) => {
  const result = await pool.query("SELECT now() as now");
  res.json({ ok: true, now: result.rows[0].now });
});

// 에러 핸들러 (diaries에서 next(e) 타면 여기로 올라옴)
app.use((err, req, res, next) => {
  console.error("Unhandled error: ", err);
  res.status(500).json({
    message: "internal server error",
    detail: String(err?.message ?? err),
  });
});

// // 게스트 유저 생성
// app.post("/api/users/guest", async (req, res) => {
//   const { nickname } = req.body;

//   if (!nickname || nickname.length > 30) {
//     return res.status(400).json({ message: "닉네임이 너무 깁니다." });
//   }

//   const result = await pool.query(
//     "INSERT INTO users(nickname) VALUES($1) RETURNING id, nickname, created_at",
//     [nickname.trim()]
//   );

//   res.status(201).json(result.rows[0]);
// });

// // 응원팀 저장
// app.put("/api/users/:id/favorites", async (req, res) => {
//   const userId = Number(req.params.id);
//   const { sport, team_code, gender } = req.body;

//   if (!["baseball", "volleyball"].includes(sport)) {
//     return res.status(400).json({ message: "존재하지 않는 스포츠입니다." });
//   }

//   if (!team_code) {
//     return res.status(400).json({ mesage: "Team Code가 존재하지 않습니다." });
//   }

//   const g = gender ?? null;

//   // 기존 row 삭제 후 insert
//   await pool.query(
//     `DELETE FROM favorites
//      WHERE user_id=$1 AND sport=$2 AND (gender IS NOT DISTINCT FROM $3)`,
//     [userId, sport, g]
//   );

//   const result = await pool.query(
//     `INSERT INTO favorites(user_id, sport, team_code, gender)
//      VALUES($1,$2,$3,$4)
//      RETURNING user_id, sport, team_code, gender, updated_at`,
//     [userId, sport, team_code, g]
//   );

//   res.json(result.rows[0]);
// });

// // 직관 기록 생성
// app.post("/api/diaries", async (req, res) => {
//   const {
//     user_id,
//     sport,
//     team_home,
//     team_away,
//     game_date,
//     venue_name,
//     venue_lat,
//     venue_lng,
//     one_liner,
//     visibility,
//   } = req.body;

//   if (
//     !user_id ||
//     !sport ||
//     !team_home ||
//     !game_date ||
//     !venue_name ||
//     !one_liner
//   ) {
//     return res.status(400).json({ message: "required field missing" });
//   }

//   const result = await pool.query(
//     `
//     INSERT INTO diaries
//       (user_id, sport, team_home, team_away, game_date,
//        venue_name, venue_lat, venue_lng, one_liner, visibility)
//     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
//     RETURNING *
//     `,
//     [
//       user_id,
//       sport,
//       team_home,
//       team_away ?? null,
//       game_date,
//       venue_name,
//       venue_lat ?? null,
//       venue_lng ?? null,
//       one_liner,
//       visibility ?? "private",
//     ]
//   );

//   res.status(201).json(result.rows[0]);
// });

// // 리스트
// app.get("/api/diaries", async (req, res) => {
//   const { userId, sport, visibility } = req.query;

//   const conditions = [];
//   const values = [];

//   if (userId) {
//     values.push(userId);
//     conditions.push(`user_id = $${values.length}`);
//   }
//   if (sport) {
//     values.push(sport);
//     conditions.push(`sport = $${values.length}`);
//   }
//   if (visibility) {
//     values.push(visibility);
//     conditions.push(`visibility = $${values.length}`);
//   }

//   const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

//   const result = await pool.query(
//     `
//     SELECT *
//     FROM diaries
//     ${where}
//     ORDER BY game_date DESC, created_at DESC
//     `,
//     values
//   );

//   res.json(result.rows);
// });

// // 상세
// app.get("/api/diaries/:id", async (req, res) => {
//   const result = await pool.query("SELECT * FROM diaries WHERE id = $1", [
//     req.params.id,
//   ]);

//   if (!result.rows.length) {
//     return res.status(404).json({ message: "not found" });
//   }

//   res.json(result.rows[0]);
// });

// // 수정
// app.put("/api/diaries/:id", async (req, res) => {
//   const {
//     team_home,
//     team_away,
//     game_date,
//     venue_name,
//     venue_lat,
//     venue_lng,
//     one_liner,
//     visibility,
//   } = req.body;

//   const result = await pool.query(
//     `
//     UPDATE diaries SET
//       team_home = $1,
//       team_away = $2,
//       game_date = $3,
//       venue_name = $4,
//       venue_lat = $5,
//       venue_lng = $6,
//       one_liner = $7,
//       visibility = $8,
//       updated_at = now()
//     WHERE id = $9
//     RETURNING *
//     `,
//     [
//       team_home,
//       team_away ?? null,
//       game_date,
//       venue_name,
//       venue_lat ?? null,
//       venue_lng ?? null,
//       one_liner,
//       visibility,
//       req.params.id,
//     ]
//   );

//   res.json(result.rows[0]);
// });

// // 삭제
// app.delete("/api/diaries/:id", async (req, res) => {
//   await pool.query("DELETE FROM diaries WHERE id = $1", [req.params.id]);
//   res.status(204).send();
// });

app.listen(process.env.PORT || 4000, () => {
  console.log(`Server is running on http:${process.env.PORT || 4000}`);
});

export default app;
