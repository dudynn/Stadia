import express from "express";
import cors from "cors";
import { pool } from "./db.js";
import userRouter from "./routes/users.js";
import diariesRouter from "./routes/diaries.js";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 4000;

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
  try {
    const result = await pool.query("SELECT now() as now");
    res.json({ ok: true, now: result.rows[0].now });
  } catch (e) {
    next(e);
  }
});

// 에러 핸들러 (diaries에서 next(e) 타면 여기로 올라옴)
app.use((err, req, res, next) => {
  console.error("Unhandled error: ", err);
  res.status(500).json({
    message: "internal server error",
    detail: String(err?.message ?? err),
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

export default app;
