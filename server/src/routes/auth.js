import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const JWT_EXPIRES_IN = "14d";

function signToken(user) {
  return jwt.sign(
    { userId: String(user.id), nickname: user.nickname },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
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
 * body: { email, password, nickname?, guestUserId? }
 *
 * guestUserId가 있으면 "그 user_id를 계정으로 승격"
 * 없으면 새 계정 유저 생성
 */
router.post("/register", async (req, res, next) => {
  const client = await pool.connect();
  try {
    const email = String(req.body?.email ?? "")
      .trim()
      .toLowerCase();
    const password = String(req.body?.password ?? "");
    const nickname = String(req.body?.nickname ?? "").trim();
    const guestUserId = req.body?.guestUserId
      ? Number(req.body.guestUserId)
      : null;

    if (!email || !password)
      return res.status(400).json({ message: "email/password required" });
    if (password.length < 6)
      return res.status(400).json({ message: "password too short (min 6)" });

    const exists = await client.query(`SELECT id FROM users WHERE email = $1`, [
      email,
    ]);
    if (exists.rows.length)
      return res.status(409).json({ message: "email already exists" });

    const hash = await bcrypt.hash(password, 10);

    await client.query("BEGIN");

    let user;

    if (guestUserId) {
      // 게스트를 계정으로 승격
      const g = await client.query(
        `SELECT id, nickname, is_guest FROM users WHERE id = $1`,
        [guestUserId]
      );
      if (!g.rows.length) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "guest not found" });
      }
      if (g.rows[0].is_guest !== true) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "not a guest user" });
      }

      const finalNick = nickname || g.rows[0].nickname;

      const u = await client.query(
        `UPDATE users
         SET email = $1,
             password_hash = $2,
             is_guest = false,
             nickname = $3
         WHERE id = $4
         RETURNING id, nickname, is_guest`,
        [email, hash, finalNick, guestUserId]
      );
      user = u.rows[0];
    } else {
      // 새 계정 생성
      const finalNick = nickname || email.split("@")[0];
      const u = await client.query(
        `INSERT INTO users (nickname, email, password_hash, is_guest)
         VALUES ($1, $2, $3, false)
         RETURNING id, nickname, is_guest`,
        [finalNick, email, hash]
      );
      user = u.rows[0];
    }

    await client.query("COMMIT");

    const token = signToken(user);
    return res.json({
      user: { id: String(user.id), nickname: user.nickname, mode: "account" },
      token,
    });
  } catch (e) {
    try {
      await pool.query("ROLLBACK");
    } catch {}
    next(e);
  } finally {
    client.release();
  }
});

/**
 * POST /api/auth/login
 * body: { email, password, guestUserId?, merge?: boolean }
 *
 * - 기본: 계정 로그인
 * - merge=true + guestUserId 있으면
 *   게스트 데이터를 계정으로 합치기
 */
router.post("/login", async (req, res, next) => {
  const client = await pool.connect();
  try {
    const email = String(req.body?.email ?? "")
      .trim()
      .toLowerCase();
    const password = String(req.body?.password ?? "");
    const guestUserId = req.body?.guestUserId
      ? Number(req.body.guestUserId)
      : null;
    const merge = Boolean(req.body?.merge);

    if (!email || !password)
      return res.status(400).json({ message: "email/password required" });

    const r = await client.query(
      `SELECT id, nickname, password_hash, is_guest
       FROM users
       WHERE email = $1`,
      [email]
    );
    if (!r.rows.length)
      return res.status(401).json({ message: "invalid credentials" });

    const user = r.rows[0];
    if (!user.password_hash)
      return res.status(401).json({ message: "invalid credentials" });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ message: "invalid credentials" });

    // merge: 게스트 기록을 계정으로 옮기기 (로그인 시 선택)
    if (merge && guestUserId && Number(user.id) !== guestUserId) {
      await client.query("BEGIN");

      // 1) diaries/comments는 단순 user_id 업데이트
      await client.query(`UPDATE diaries SET user_id = $1 WHERE user_id = $2`, [
        user.id,
        guestUserId,
      ]);
      await client.query(
        `UPDATE comments SET user_id = $1 WHERE user_id = $2`,
        [user.id, guestUserId]
      );

      // 2) favorites는 (user_id, sport, gender) 유니크면 충돌 가능 -> upsert 후 guest꺼 삭제
      await client.query(
        `
        INSERT INTO favorites (user_id, sport, gender, team_code, updated_at)
        SELECT $1, sport, gender, team_code, NOW()
        FROM favorites
        WHERE user_id = $2
        ON CONFLICT (user_id, sport, gender)
        DO UPDATE SET team_code = EXCLUDED.team_code, updated_at = NOW()
        `,
        [user.id, guestUserId]
      );
      await client.query(`DELETE FROM favorites WHERE user_id = $1`, [
        guestUserId,
      ]);

      // 3) likes는 (user_id, diary_id) 유니크 가능 -> 먼저 중복 제거 후 업데이트
      //    (계정이 이미 같은 diary에 like 있으면 guest꺼 삭제)
      await client.query(
        `
        DELETE FROM likes g
        USING likes a
        WHERE g.user_id = $1 AND a.user_id = $2 AND g.diary_id = a.diary_id
        `,
        [guestUserId, user.id]
      );
      await client.query(`UPDATE likes SET user_id = $1 WHERE user_id = $2`, [
        user.id,
        guestUserId,
      ]);

      // 4) 게스트 유저는 남겨도 되지만, 깔끔하게 삭제
      await client.query(`DELETE FROM users WHERE id = $1`, [guestUserId]);

      await client.query("COMMIT");
    }

    const token = signToken(user);

    return res.json({
      user: { id: String(user.id), nickname: user.nickname, mode: "account" },
      token,
    });
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    next(e);
  } finally {
    client.release();
  }
});

export default router;
