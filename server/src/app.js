import express from "express";
import cors from "cors";
import path from "path";
import authRouter from "./routes/auth.js";
import { pool } from "./db.js";
import userRouter from "./routes/users.js";
import diariesRouter from "./routes/diaries.js";
import { fileURLToPath } from "url";
import "dotenv/config";

const app = express();
const PORT = process.env.PORT || 4000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CORS: 로컬 + 배포 프론트만 허용
const allowedOrigins = [
  "http://localhost:5173",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // origin이 없는 경우(예: curl, 서버-서버 요청) 허용
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json());

// uploads 폴더 정적 서빙 (URL: /uploads/파일명)
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// 라우터로만 운영 (중복 라우트 제거)
app.use("/api/users", userRouter);
app.use("/api/diaries", diariesRouter);
app.use("/api/auth", authRouter);

// DB 연결 확인
app.get("/api/health", async (req, res, next) => {
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
