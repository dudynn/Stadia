import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const JWT_EXPIRES_IN = "14d";

function signToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");

  return jwt.sign({ userId: String(user.id) }, secret, { expiresIn: "30d" });
}

/**
 * POST /api/auth/guest
 * body: { nickname }
 * 게스트 유저 생성
 */
router.post("/guest", async (req, res, next) => {
  try {
    const nickname = String(req.body?.nickname ?? "").trim();
    if (!nickname)
      return res.status(400).json({ message: "nickname required" });
    if (nickname.length > 30)
      return res.status(400).json({ message: "nickname too long" });

    const r = await pool.query(
      `INSERT INTO users (nickname, is_guest)
       VALUES ($1, true)
       RETURNING id, nickname, is_guest`,
      [nickname]
    );

    const user = r.rows[0];
    const token = signToken(user);

    return res.json({
      user: { id: String(user.id), nickname: user.nickname, mode: "guest" },
      token,
    });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/auth/register
 * body: { email, password, nickname }
 * return: { user, token }
 */
router.post("/register", async (req, res, next) => {
  try {
    const email = String(req.body?.email ?? "")
      .trim()
      .toLowerCase();
    const password = String(req.body?.password ?? "");
    const nickname = String(req.body?.nickname ?? "").trim();

    if (!email) return res.status(400).json({ message: "email is required" });
    if (!password)
      return res.status(400).json({ message: "password is required" });
    if (!nickname)
      return res.status(400).json({ message: "nickname is required" });

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "password must be at least 6 chars" });
    }
    if (nickname.length > 30) {
      return res.status(400).json({ message: "nickname must be <= 30 chars" });
    }

    // 중복 이메일 체크
    const exists = await pool.query(`SELECT id FROM users WHERE email = $1`, [
      email,
    ]);
    if (exists.rows.length) {
      return res.status(409).json({ message: "email already exists" });
    }

    const hash = await bcrypt.hash(password, 10);

    const q = `
      INSERT INTO users (email, password_hash, nickname, mode, created_at)
      VALUES ($1, $2, $3, 'user', NOW())
      RETURNING id, email, nickname, mode;
    `;
    const r = await pool.query(q, [email, hash, nickname]);

    const user = r.rows[0];
    const token = signToken(user);

    return res.status(201).json({
      user: {
        id: String(user.id),
        email: user.email,
        nickname: user.nickname,
        mode: user.mode,
      },
      token,
    });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/auth/login
 * body: { email, password }
 * return: { user, token }
 */
router.post("/login", async (req, res, next) => {
  try {
    const email = String(req.body?.email ?? "")
      .trim()
      .toLowerCase();
    const password = String(req.body?.password ?? "");

    if (!email) return res.status(400).json({ message: "email is required" });
    if (!password)
      return res.status(400).json({ message: "password is required" });

    const r = await pool.query(
      `SELECT id, email, nickname, mode, password_hash FROM users WHERE email = $1`,
      [email]
    );
    const u = r.rows[0];
    if (!u || !u.password_hash) {
      return res.status(401).json({ message: "invalid email or password" });
    }

    const ok = await bcrypt.compare(password, u.password_hash);
    if (!ok)
      return res.status(401).json({ message: "invalid email or password" });

    const token = signToken(u);

    return res.json({
      user: {
        id: String(u.id),
        email: u.email,
        nickname: u.nickname,
        mode: u.mode,
      },
      token,
    });
  } catch (e) {
    next(e);
  }
});

export default router;
